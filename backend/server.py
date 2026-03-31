from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Depends, Header, Response, Cookie
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import List, Optional, Dict
from dotenv import load_dotenv
import os
import logging
import asyncio
import uuid
import re
import jwt
import bcrypt
import secrets
from datetime import datetime, timezone, timedelta
from pathlib import Path
import httpx

from emergentintegrations.llm.chat import LlmChat, UserMessage
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ["JWT_SECRET"]  # Required — no hardcoded fallback
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7
ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]

mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

app = FastAPI()
api_router = APIRouter(prefix="/api")

llm_sessions: Dict[str, LlmChat] = {}
discord_task = None
discord_client_instance = None

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

resend.api_key = os.environ.get("RESEND_API_KEY", "")
FROM_EMAIL = "noreply@bridgebot.tech"


async def send_verification_email(to_email: str, code: str):
    """Send verification code email via Resend. Falls back to console log if key not set."""
    if not resend.api_key:
        logger.warning("RESEND_API_KEY not set — printing code to logs")
        print(f"\n{'='*50}\nMOCK EMAIL (no Resend key)\nTo: {to_email}\nCode: {code}\n{'='*50}\n")
        return
    try:
        html = f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#111;color:#fff;padding:32px;border-radius:8px">
          <h2 style="margin:0 0 8px;font-size:22px">BridgeBot</h2>
          <p style="color:#a1a1aa;margin:0 0 28px;font-size:14px">Email Verification</p>
          <p style="font-size:14px;margin:0 0 16px">Your verification code is:</p>
          <div style="background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:20px;text-align:center;margin-bottom:24px">
            <span style="font-family:monospace;font-size:32px;font-weight:700;letter-spacing:0.4em;color:#fff">{code}</span>
          </div>
          <p style="color:#a1a1aa;font-size:13px;margin:0">This code expires in 15 minutes. If you didn't request this, ignore this email.</p>
        </div>
        """
        params = {
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": "Your BridgeBot verification code",
            "html": html,
        }
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Verification email sent to {to_email}")
    except Exception as e:
        logger.error(f"Resend error: {e} — falling back to log")
        print(f"\n{'='*50}\nFALLBACK EMAIL\nTo: {to_email}\nCode: {code}\n{'='*50}\n")


# ==================== MODELS ====================

class UserRegister(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class VerifyEmailBody(BaseModel):
    email: str
    code: str

class ResendCodeBody(BaseModel):
    email: str

class BotInstanceCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class AssignUser(BaseModel):
    user_email: str

class BotConfigUpdate(BaseModel):
    name: Optional[str] = None
    persona: Optional[str] = None
    custom_instructions: Optional[str] = None
    tone_instructions: Optional[str] = None
    manual_tone_examples: Optional[List[dict]] = None

class FAQEntry(BaseModel):
    title: str
    content: str
    tags: Optional[List[str]] = []

class URLEntry(BaseModel):
    url: str
    title: Optional[str] = None

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None
    instance_id: Optional[str] = None

class ApproveBody(BaseModel):
    approved: bool = True

class DiscordConfigUpdate(BaseModel):
    bot_token: Optional[str] = None
    is_active: Optional[bool] = None


# ==================== JWT AUTH HELPERS ====================

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    authorization: Optional[str] = Header(None),
    bf_access_token: Optional[str] = Cookie(None)
) -> dict:
    # Prefer Authorization header (curl/API clients), fall back to httpOnly cookie
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    elif bf_access_token:
        token = bf_access_token
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"id": payload["sub"], "email": payload["email"], "role": payload["role"]}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "superadmin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def _verify_instance_access(x_instance_id: Optional[str], current_user: dict) -> str:
    if not x_instance_id:
        raise HTTPException(status_code=400, detail="X-Instance-ID header required")
    if current_user["role"] == "superadmin":
        return x_instance_id
    instance = await db.bot_instances.find_one({"id": x_instance_id}, {"_id": 0})
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    if current_user["id"] not in instance.get("assigned_user_ids", []):
        raise HTTPException(status_code=403, detail="Access denied to this instance")
    return x_instance_id


async def get_instance_access(
    x_instance_id: Optional[str] = Header(None, alias="X-Instance-ID"),
    current_user: dict = Depends(get_current_user)
) -> str:
    return await _verify_instance_access(x_instance_id, current_user)


# ==================== KNOWLEDGE / TONE HELPERS ====================

async def search_knowledge(query: str, instance_id: str, limit: int = 5) -> str:
    try:
        results = await db.knowledge_sources.find(
            {"$text": {"$search": query}, "is_active": True, "instance_id": instance_id},
            {"score": {"$meta": "textScore"}, "_id": 0}
        ).sort([("score", {"$meta": "textScore"})]).limit(limit).to_list(limit)

        if not results:
            results = await db.knowledge_sources.find(
                {"is_active": True, "instance_id": instance_id}, {"_id": 0}
            ).sort("created_at", -1).limit(3).to_list(3)

        if not results:
            return ""

        chunks = []
        for r in results:
            title = r.get("title", "Unknown")
            content = r.get("content", "")[:800]
            chunks.append(f"[{title}]\n{content}")
        return "\n\n".join(chunks)
    except Exception as e:
        logger.warning(f"Knowledge search: {e}")
        return ""


async def get_tone_examples_text(instance_id: str, bot_config: dict = None) -> str:
    parts = []
    if bot_config:
        manual = bot_config.get("manual_tone_examples", []) or []
        for ex in manual[:3]:
            if ex.get("user_msg") and ex.get("bot_msg"):
                label = ex.get("label", "")
                header = f"[{label}]" if label else "[Crafted Example]"
                parts.append(f"{header}\nUSER: {ex['user_msg']}\nASSISTANT: {ex['bot_msg']}")
    try:
        examples = await db.conversations.find(
            {"is_approved_for_training": True, "instance_id": instance_id}, {"messages": 1, "_id": 0}
        ).limit(3).to_list(3)
        for ex in examples:
            msgs = ex.get("messages", [])[:6]
            if msgs:
                text = "\n".join([f"{m['role'].upper()}: {m['content'][:400]}" for m in msgs])
                parts.append(text)
    except Exception as e:
        logger.warning(f"Tone examples: {e}")
    if not parts:
        return ""
    return "\n\n---\n\n".join(parts[:5])


def build_system_prompt(bot_config: dict, knowledge_context: str = "", tone_examples: str = "") -> str:
    name = bot_config.get("name", "Assistant")
    persona = bot_config.get("persona", "You are a helpful, friendly assistant.")
    custom_instructions = bot_config.get("custom_instructions", "")
    tone_instructions = bot_config.get("tone_instructions", "")

    parts = [f"You are {name}. {persona}"]

    if knowledge_context:
        parts.append(
            "KNOWLEDGE BASE — AUTHORITATIVE SOURCE:\n"
            "The following information is verified and accurate. When a user's question is answered by "
            "this knowledge base, respond with full confidence. State facts directly. "
            "DO NOT use hedging phrases like 'I think', 'I believe', 'I'm not sure', 'you may want to verify', "
            "or 'I cannot confirm' when the answer is present here. Treat this as ground truth.\n"
            "If a question is NOT covered by this knowledge base, acknowledge that clearly and offer "
            "to help with what you do know.\n\n"
            f"{knowledge_context}"
        )
    else:
        parts.append(
            "KNOWLEDGE BASE: No specific knowledge found for this query. "
            "Answer based on your general knowledge and be transparent if you are uncertain."
        )

    if tone_examples:
        tone_header = "COMMUNICATION STYLE — MATCH THIS PRECISELY"
        if tone_instructions:
            tone_header += f"\nTone guide: {tone_instructions}"
        parts.append(
            f"{tone_header}\n"
            "Study these examples carefully. Mirror the exact vocabulary, sentence length, "
            f"formality level, and energy from these exchanges:\n\n{tone_examples}"
        )
    elif tone_instructions:
        parts.append(f"COMMUNICATION STYLE:\n{tone_instructions}")

    if custom_instructions:
        parts.append(f"ADDITIONAL INSTRUCTIONS:\n{custom_instructions}")

    return "\n\n".join(parts)


async def call_claude(session_id: str, user_message: str, system_prompt: str) -> str:
    api_key = os.environ.get("CLAUDE_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    try:
        if session_id not in llm_sessions:
            chat = LlmChat(
                api_key=api_key,
                session_id=session_id,
                system_message=system_prompt
            ).with_model("anthropic", "claude-opus-4-5-20251101")
            llm_sessions[session_id] = chat
        chat = llm_sessions[session_id]
        response = await chat.send_message(UserMessage(text=user_message))
        return response
    except Exception as e:
        logger.error(f"Claude API error: {e}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


async def save_conversation(session_id: str, user_message: str, bot_response: str,
                            platform: str = "web", metadata: dict = None, instance_id: str = "default"):
    timestamp = datetime.now(timezone.utc).isoformat()
    new_messages = [
        {"role": "user", "content": user_message, "timestamp": timestamp},
        {"role": "assistant", "content": bot_response, "timestamp": timestamp}
    ]
    existing = await db.conversations.find_one({"session_id": session_id})
    if existing:
        await db.conversations.update_one(
            {"session_id": session_id},
            {"$push": {"messages": {"$each": new_messages}}, "$set": {"updated_at": timestamp}}
        )
    else:
        await db.conversations.insert_one({
            "session_id": session_id, "platform": platform,
            "instance_id": instance_id,
            "messages": new_messages, "is_approved_for_training": False,
            "created_at": timestamp, "updated_at": timestamp,
            "metadata": metadata or {}
        })


# ==================== DISCORD BOT ====================

async def start_discord_bot(token: str, instance_id: str = "default"):
    global discord_client_instance
    try:
        import discord
        intents = discord.Intents.default()
        intents.message_content = True
        discord_client_instance = discord.Client(intents=intents)

        @discord_client_instance.event
        async def on_ready():
            logger.info(f"Discord bot online: {discord_client_instance.user}")

        @discord_client_instance.event
        async def on_message(message):
            if message.author.bot:
                return
            is_dm = isinstance(message.channel, discord.DMChannel)
            is_mentioned = (discord_client_instance.user in message.mentions
                            if discord_client_instance.user else False)
            if not is_dm and not is_mentioned:
                return

            user_text = message.content
            if discord_client_instance.user:
                user_text = user_text.replace(f"<@{discord_client_instance.user.id}>", "").strip()
            if not user_text:
                return

            session_id = f"discord_{message.author.id}"
            try:
                bot_config = await db.bot_config.find_one({"instance_id": instance_id}, {"_id": 0}) or {}
                knowledge = await search_knowledge(user_text, instance_id)
                tone = await get_tone_examples_text(instance_id, bot_config)
                system_prompt = build_system_prompt(bot_config, knowledge, tone)
                async with message.channel.typing():
                    response = await call_claude(session_id, user_text, system_prompt)
                await save_conversation(
                    session_id=session_id, user_message=user_text, bot_response=response,
                    platform="discord", instance_id=instance_id,
                    metadata={"username": str(message.author.name), "user_id": str(message.author.id)}
                )
                if len(response) > 1990:
                    for i in range(0, len(response), 1990):
                        await message.reply(response[i:i+1990])
                else:
                    await message.reply(response)
            except Exception as e:
                logger.error(f"Discord message error: {e}")
                await message.reply("Sorry, I encountered an error. Please try again.")

        await discord_client_instance.start(token)
    except Exception as e:
        logger.error(f"Discord bot startup error: {e}")
        discord_client_instance = None


# ==================== STARTUP / SHUTDOWN ====================

@app.on_event("startup")
async def startup_event():
    global discord_task
    try:
        await db.knowledge_sources.create_index([("title", "text"), ("content", "text")])
        await db.knowledge_sources.create_index([("instance_id", 1)])
        await db.conversations.create_index([("session_id", 1)])
        await db.conversations.create_index([("created_at", -1)])
        await db.conversations.create_index([("instance_id", 1)])
        await db.bot_config.create_index([("instance_id", 1)])
        await db.bot_instances.create_index([("id", 1)])
        await db.users.create_index([("email", 1)], unique=True)
        await db.users.create_index([("id", 1)])
    except Exception as e:
        logger.warning(f"Index creation: {e}")

    # Seed admin user
    if not await db.users.find_one({"email": ADMIN_EMAIL}):
        hashed_pw = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL,
            "hashed_password": hashed_pw,
            "is_verified": True,
            "verification_code": None,
            "role": "superadmin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Seeded admin: {ADMIN_EMAIL}")

    # Migrate single-tenant data to multi-tenant if needed
    # (updates any existing docs that lack instance_id — safe to run on every startup)
    first_instance = await db.bot_instances.find_one({}, {"id": 1})
    if first_instance:
        migrate_id = first_instance["id"]
        for col in [db.bot_config, db.knowledge_sources, db.conversations, db.discord_config]:
            await col.update_many({"instance_id": {"$exists": False}}, {"$set": {"instance_id": migrate_id}})

    discord_config = await db.discord_config.find_one({"is_active": True}, {"_id": 0})
    if discord_config and discord_config.get("bot_token"):
        iid = discord_config.get("instance_id", "default")
        discord_task = asyncio.create_task(start_discord_bot(discord_config["bot_token"], iid))


@app.on_event("shutdown")
async def shutdown_event():
    global discord_task, discord_client_instance
    if discord_client_instance:
        try:
            await discord_client_instance.close()
        except Exception:
            pass
    if discord_task:
        discord_task.cancel()
    mongo_client.close()


# ==================== AUTH ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "BridgeBot API", "version": "2.0.0"}


@api_router.post("/auth/register")
async def register(body: UserRegister):
    if not body.email or not body.password:
        raise HTTPException(status_code=400, detail="Email and password required")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(status_code=400, detail="Email already registered")
    code = str(secrets.randbelow(900000) + 100000)
    expiry = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    hashed_pw = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    user_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": user_id,
        "email": body.email.lower(),
        "hashed_password": hashed_pw,
        "is_verified": False,
        "verification_code": code,
        "verification_code_expiry": expiry,
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    await send_verification_email(body.email, code)
    return {"message": "Verification code sent to your email."}


@api_router.post("/auth/resend-code")
async def resend_code(body: ResendCodeBody):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or user.get("is_verified"):
        return {"message": "If this email is registered and unverified, a new code has been sent"}
    code = str(secrets.randbelow(900000) + 100000)
    expiry = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    await db.users.update_one(
        {"email": body.email.lower()},
        {"$set": {"verification_code": code, "verification_code_expiry": expiry}}
    )
    await send_verification_email(body.email, code)
    return {"message": "New verification code sent"}


@api_router.post("/auth/verify")
async def verify_email(body: VerifyEmailBody):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("is_verified"):
        return {"message": "Email already verified"}
    if user.get("verification_code") != body.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    expiry_str = user.get("verification_code_expiry")
    if expiry_str and datetime.fromisoformat(expiry_str) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Code expired. Request a new one.")
    await db.users.update_one(
        {"email": body.email.lower()},
        {"$set": {"is_verified": True, "verification_code": None, "verification_code_expiry": None}}
    )
    return {"message": "Email verified successfully"}


@api_router.post("/auth/login")
async def login(body: UserLogin, response: Response):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not bcrypt.checkpw(body.password.encode(), user["hashed_password"].encode()):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("is_verified"):
        raise HTTPException(status_code=403, detail="Email not verified. Check your email for the verification code.")
    token = create_access_token(user["id"], user["email"], user["role"])
    # Set httpOnly cookie — JS cannot read this, protecting against XSS token theft
    response.set_cookie(
        key="bf_access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=True,
        max_age=JWT_EXPIRY_DAYS * 24 * 60 * 60,
        path="/",
    )
    if user["role"] == "superadmin":
        instances = await db.bot_instances.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    else:
        instances = await db.bot_instances.find(
            {"assigned_user_ids": user["id"]}, {"_id": 0, "id": 1, "name": 1}
        ).to_list(100)
        if not instances:
            raise HTTPException(
                status_code=403,
                detail="No instances assigned to your account. Contact your admin."
            )
    return {
        "token": token,  # Kept for curl/API client use — frontend uses cookie
        "user": {"id": user["id"], "email": user["email"], "role": user["role"]},
        "instances": instances
    }


@api_router.post("/auth/logout")
async def logout_user(response: Response):
    response.delete_cookie(key="bf_access_token", path="/")
    return {"success": True}


@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one(
        {"id": current_user["id"]},
        {"_id": 0, "hashed_password": 0, "verification_code": 0, "verification_code_expiry": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if current_user["role"] == "superadmin":
        instances = await db.bot_instances.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    else:
        instances = await db.bot_instances.find(
            {"assigned_user_ids": current_user["id"]}, {"_id": 0, "id": 1, "name": 1}
        ).to_list(100)
    return {**user, "instances": instances}


# ==================== INSTANCE MANAGEMENT (SUPERADMIN) ====================

@api_router.get("/admin/instances")
async def list_instances(current_user: dict = Depends(require_admin)):
    instances = await db.bot_instances.find({}, {"_id": 0}).to_list(100)
    # Batch user lookup — single query instead of N+1
    all_user_ids = set()
    for inst in instances:
        all_user_ids.update(inst.get("assigned_user_ids", []))
    if all_user_ids:
        users_list = await db.users.find(
            {"id": {"$in": list(all_user_ids)}},
            {"_id": 0, "id": 1, "email": 1, "is_verified": 1}
        ).to_list(1000)
        user_map = {u["id"]: u for u in users_list}
    else:
        user_map = {}
    for inst in instances:
        inst["assigned_users"] = [
            user_map[uid] for uid in inst.get("assigned_user_ids", []) if uid in user_map
        ]
    return instances


@api_router.post("/admin/instances")
async def create_instance(body: BotInstanceCreate, current_user: dict = Depends(require_admin)):
    instance_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    instance = {
        "id": instance_id,
        "name": body.name,
        "description": body.description or "",
        "created_by": current_user["email"],
        "assigned_user_ids": [],
        "created_at": now
    }
    await db.bot_instances.insert_one(instance)
    instance.pop("_id", None)
    await db.bot_config.insert_one({
        "instance_id": instance_id,
        "name": body.name,
        "persona": "You are a helpful, friendly, and knowledgeable assistant. Provide clear, accurate answers based on available information. Be concise but thorough.",
        "custom_instructions": "",
        "tone_instructions": "",
        "manual_tone_examples": [],
        "created_at": now
    })
    return instance


@api_router.put("/admin/instances/{instance_id}")
async def update_instance(instance_id: str, body: BotInstanceCreate, current_user: dict = Depends(require_admin)):
    result = await db.bot_instances.update_one(
        {"id": instance_id},
        {"$set": {"name": body.name, "description": body.description or "",
                  "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Instance not found")
    return {"success": True}


@api_router.delete("/admin/instances/{instance_id}")
async def delete_instance(instance_id: str, current_user: dict = Depends(require_admin)):
    result = await db.bot_instances.delete_one({"id": instance_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Instance not found")
    for col in [db.bot_config, db.knowledge_sources, db.conversations, db.discord_config]:
        await col.delete_many({"instance_id": instance_id})
    return {"success": True}


@api_router.post("/admin/instances/{instance_id}/assign-user")
async def assign_user(instance_id: str, body: AssignUser, current_user: dict = Depends(require_admin)):
    instance = await db.bot_instances.find_one({"id": instance_id})
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    user = await db.users.find_one({"email": body.user_email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail=f"User '{body.user_email}' not found. They must register first.")
    await db.bot_instances.update_one(
        {"id": instance_id},
        {"$addToSet": {"assigned_user_ids": user["id"]}}
    )
    return {"success": True, "user": {"id": user["id"], "email": user["email"]}}


@api_router.delete("/admin/instances/{instance_id}/unassign-user/{user_id}")
async def unassign_user(instance_id: str, user_id: str, current_user: dict = Depends(require_admin)):
    result = await db.bot_instances.update_one(
        {"id": instance_id},
        {"$pull": {"assigned_user_ids": user_id}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Instance not found")
    return {"success": True}


@api_router.get("/admin/users")
async def list_users(current_user: dict = Depends(require_admin)):
    users = await db.users.find(
        {},
        {"_id": 0, "hashed_password": 0, "verification_code": 0, "verification_code_expiry": 0}
    ).to_list(500)
    return users


# ==================== CHAT (PUBLIC) ====================

@api_router.post("/chat/send")
async def send_chat_message(body: ChatMessage):
    session_id = body.session_id or str(uuid.uuid4())
    instance_id = body.instance_id or "default"
    # Try to find actual instance by id or fall back to first instance
    bot_config = await db.bot_config.find_one({"instance_id": instance_id}, {"_id": 0})
    if not bot_config:
        first_instance = await db.bot_instances.find_one({}, {"id": 1})
        if first_instance:
            instance_id = first_instance["id"]
            bot_config = await db.bot_config.find_one({"instance_id": instance_id}, {"_id": 0}) or {}
        else:
            bot_config = {}
    knowledge = await search_knowledge(body.message, instance_id)
    tone = await get_tone_examples_text(instance_id, bot_config)
    system_prompt = build_system_prompt(bot_config, knowledge, tone)
    response = await call_claude(session_id, body.message, system_prompt)
    await save_conversation(session_id, body.message, response, platform="web", instance_id=instance_id)
    return {"response": response, "session_id": session_id}


@api_router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    conv = await db.conversations.find_one({"session_id": session_id}, {"_id": 0})
    return conv or {"messages": [], "session_id": session_id}


# ==================== BOT CONFIG (PROTECTED) ====================

@api_router.get("/admin/bot-config")
async def get_bot_config(instance_id: str = Depends(get_instance_access)):
    config = await db.bot_config.find_one({"instance_id": instance_id}, {"_id": 0})
    return config or {}


@api_router.put("/admin/bot-config")
async def update_bot_config(body: BotConfigUpdate, instance_id: str = Depends(get_instance_access)):
    update_data = {}
    for k, v in body.dict().items():
        if v is not None:
            update_data[k] = v
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.bot_config.update_one({"instance_id": instance_id}, {"$set": update_data}, upsert=True)
    return await db.bot_config.find_one({"instance_id": instance_id}, {"_id": 0})


# ==================== KNOWLEDGE SOURCES (PROTECTED) ====================

@api_router.get("/knowledge/sources")
async def get_knowledge_sources(instance_id: str = Depends(get_instance_access)):
    sources = await db.knowledge_sources.find(
        {"instance_id": instance_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return sources


@api_router.post("/knowledge/sources/faq")
async def add_faq(entry: FAQEntry, instance_id: str = Depends(get_instance_access)):
    doc = {
        "id": str(uuid.uuid4()), "type": "faq", "title": entry.title,
        "content": entry.content, "tags": entry.tags or [],
        "instance_id": instance_id,
        "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.knowledge_sources.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.post("/knowledge/sources/url")
async def scrape_url_source(entry: URLEntry, instance_id: str = Depends(get_instance_access)):
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as http:
            resp = await http.get(entry.url, headers={"User-Agent": "Mozilla/5.0 (BridgeBot/1.0)"})
            resp.raise_for_status()
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript"]):
            tag.decompose()
        text = soup.get_text(separator="\n", strip=True)
        text = re.sub(r'\n{3,}', '\n\n', text).strip()[:6000]
        title = entry.title or (soup.title.string.strip() if soup.title and soup.title.string else entry.url)
        doc = {
            "id": str(uuid.uuid4()), "type": "url", "title": str(title)[:150],
            "content": text, "url": entry.url, "instance_id": instance_id,
            "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.knowledge_sources.insert_one(doc)
        doc.pop("_id", None)
        return doc
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"URL scraping failed: {str(e)}")


@api_router.post("/knowledge/sources/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    x_instance_id: Optional[str] = Header(None, alias="X-Instance-ID"),
    authorization: Optional[str] = Header(None)
):
    current_user = await get_current_user(authorization)
    instance_id = await _verify_instance_access(x_instance_id, current_user)
    try:
        content_bytes = await file.read()
        filename = file.filename or ""
        text = ""
        if filename.lower().endswith(".txt"):
            text = content_bytes.decode("utf-8", errors="ignore")
        elif filename.lower().endswith(".pdf"):
            try:
                import io
                import PyPDF2
                reader = PyPDF2.PdfReader(io.BytesIO(content_bytes))
                text = "\n".join([page.extract_text() or "" for page in reader.pages])
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"PDF parse error: {str(e)}")
        else:
            raise HTTPException(status_code=400, detail="Only .txt and .pdf files are supported")
        text = re.sub(r'\n{3,}', '\n\n', text).strip()[:6000]
        doc = {
            "id": str(uuid.uuid4()), "type": "document", "title": title or filename,
            "content": text, "filename": filename, "instance_id": instance_id,
            "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.knowledge_sources.insert_one(doc)
        doc.pop("_id", None)
        return doc
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/knowledge/sources/{source_id}")
async def delete_source(source_id: str, instance_id: str = Depends(get_instance_access)):
    result = await db.knowledge_sources.delete_one({"id": source_id, "instance_id": instance_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Source not found")
    return {"success": True}


@api_router.patch("/knowledge/sources/{source_id}/toggle")
async def toggle_source(source_id: str, instance_id: str = Depends(get_instance_access)):
    source = await db.knowledge_sources.find_one({"id": source_id, "instance_id": instance_id}, {"_id": 0})
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    new_status = not source.get("is_active", True)
    await db.knowledge_sources.update_one({"id": source_id}, {"$set": {"is_active": new_status}})
    return {"is_active": new_status}


# ==================== CONVERSATIONS (PROTECTED) ====================

@api_router.get("/conversations")
async def get_conversations(
    platform: Optional[str] = None, approved: Optional[bool] = None,
    page: int = 1, limit: int = 20,
    instance_id: str = Depends(get_instance_access)
):
    query = {"instance_id": instance_id}
    if platform:
        query["platform"] = platform
    if approved is not None:
        query["is_approved_for_training"] = approved
    skip = (page - 1) * limit
    total = await db.conversations.count_documents(query)
    convs = await db.conversations.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"conversations": convs, "total": total, "page": page, "limit": limit}


@api_router.get("/conversations/{session_id}")
async def get_conversation(session_id: str, instance_id: str = Depends(get_instance_access)):
    conv = await db.conversations.find_one({"session_id": session_id, "instance_id": instance_id}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Not found")
    return conv


@api_router.patch("/conversations/{session_id}/approve")
async def approve_conversation(session_id: str, body: ApproveBody,
                                instance_id: str = Depends(get_instance_access)):
    result = await db.conversations.update_one(
        {"session_id": session_id, "instance_id": instance_id},
        {"$set": {"is_approved_for_training": body.approved}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"success": True, "is_approved_for_training": body.approved}


@api_router.delete("/conversations/{session_id}")
async def delete_conversation(session_id: str, instance_id: str = Depends(get_instance_access)):
    llm_sessions.pop(session_id, None)
    result = await db.conversations.delete_one({"session_id": session_id, "instance_id": instance_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"success": True}


# ==================== ANALYTICS (PROTECTED) ====================

@api_router.get("/analytics/overview")
async def analytics_overview(instance_id: str = Depends(get_instance_access)):
    q = {"instance_id": instance_id}
    total_convs = await db.conversations.count_documents(q)
    approved_training = await db.conversations.count_documents({**q, "is_approved_for_training": True})
    knowledge_count = await db.knowledge_sources.count_documents({"is_active": True, "instance_id": instance_id})
    pipeline = [
        {"$match": q},
        {"$project": {"msg_count": {"$size": {"$ifNull": ["$messages", []]}}}},
        {"$group": {"_id": None, "total": {"$sum": "$msg_count"}}}
    ]
    msg_result = await db.conversations.aggregate(pipeline).to_list(1)
    total_messages = msg_result[0]["total"] if msg_result else 0
    web_count = await db.conversations.count_documents({**q, "platform": "web"})
    discord_count = await db.conversations.count_documents({**q, "platform": "discord"})
    return {
        "total_conversations": total_convs, "total_messages": total_messages,
        "approved_for_training": approved_training, "knowledge_sources": knowledge_count,
        "platform_breakdown": {"web": web_count, "discord": discord_count}
    }


@api_router.get("/analytics/daily")
async def analytics_daily(instance_id: str = Depends(get_instance_access)):
    now = datetime.now(timezone.utc)
    days = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        base_q = {
            "instance_id": instance_id,
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        }
        count = await db.conversations.count_documents(base_q)
        pipeline = [
            {"$match": base_q},
            {"$project": {"msg_count": {"$size": {"$ifNull": ["$messages", []]}}}},
            {"$group": {"_id": None, "total": {"$sum": "$msg_count"}}}
        ]
        msg_res = await db.conversations.aggregate(pipeline).to_list(1)
        msg_count = msg_res[0]["total"] if msg_res else 0
        days.append({"date": day_start.strftime("%m/%d"), "conversations": count, "messages": msg_count})
    return days


# ==================== DISCORD (PROTECTED) ====================

@api_router.get("/discord/config")
async def get_discord_config(instance_id: str = Depends(get_instance_access)):
    config = await db.discord_config.find_one({"instance_id": instance_id}, {"_id": 0})
    if config:
        token = config.get("bot_token", "")
        if token:
            config["bot_token_display"] = token[:8] + "..." + token[-4:] if len(token) > 12 else "***"
        config.pop("bot_token", None)
    return config or {"is_active": False}


@api_router.put("/discord/config")
async def update_discord_config(body: DiscordConfigUpdate, instance_id: str = Depends(get_instance_access)):
    update = {k: v for k, v in body.dict().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    update["instance_id"] = instance_id
    await db.discord_config.update_one({"instance_id": instance_id}, {"$set": update}, upsert=True)
    return {"success": True}


@api_router.post("/discord/restart")
async def restart_discord_bot(instance_id: str = Depends(get_instance_access)):
    global discord_task, discord_client_instance
    if discord_client_instance:
        try:
            await discord_client_instance.close()
        except Exception:
            pass
        discord_client_instance = None
    if discord_task:
        discord_task.cancel()
        discord_task = None
    config = await db.discord_config.find_one({"instance_id": instance_id}, {"_id": 0})
    if not config or not config.get("bot_token"):
        raise HTTPException(status_code=400, detail="Discord bot token not configured")
    discord_task = asyncio.create_task(start_discord_bot(config["bot_token"], instance_id))
    return {"success": True, "message": "Discord bot starting..."}


@api_router.get("/discord/status")
async def get_discord_status(instance_id: str = Depends(get_instance_access)):
    global discord_client_instance
    if discord_client_instance and discord_client_instance.is_ready():
        return {"status": "online", "bot_name": str(discord_client_instance.user)}
    return {"status": "offline", "bot_name": None}


# ==================== APP SETUP ====================

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
