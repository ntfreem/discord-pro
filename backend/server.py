from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Depends, Header, Response, Cookie, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
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

DISCORD_CLIENT_ID = os.environ.get("DISCORD_CLIENT_ID", "")
DISCORD_CLIENT_SECRET = os.environ.get("DISCORD_CLIENT_SECRET", "")
DISCORD_REDIRECT_URI = os.environ.get("DISCORD_REDIRECT_URI", "")
DISCORD_BOT_TOKEN = os.environ.get("DISCORD_BOT_TOKEN", "")
DISCORD_BOT_PERMISSIONS = 68608 | 67108864  # View Channels + Send Messages + Read Message History + Change Nickname


async def get_discord_credentials():
    """Read Discord app credentials from DB first, fall back to .env"""
    creds = await db.discord_app_config.find_one({"_id": "discord_app"}) or {}
    return {
        "client_id": creds.get("client_id") or DISCORD_CLIENT_ID,
        "client_secret": creds.get("client_secret") or DISCORD_CLIENT_SECRET,
        "redirect_uri": creds.get("redirect_uri") or DISCORD_REDIRECT_URI,
        "bot_token": creds.get("bot_token") or DISCORD_BOT_TOKEN,
    }

mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

app = FastAPI()
api_router = APIRouter(prefix="/api")

llm_sessions: Dict[str, LlmChat] = {}

# Per-instance Discord bot tracking
# Guild-to-instance mapping for shared token routing
guild_instance_map: Dict[str, str] = {}  # {guild_id: instance_id}

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


async def send_reset_email(to_email: str, code: str):
    """Send password reset code via Resend. Falls back to console log if key not set."""
    if not resend.api_key:
        print(f"\n{'='*50}\nMOCK RESET EMAIL\nTo: {to_email}\nCode: {code}\n{'='*50}\n")
        return
    try:
        html = f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#111;color:#fff;padding:32px;border-radius:8px">
          <h2 style="margin:0 0 8px;font-size:22px">BridgeBot</h2>
          <p style="color:#a1a1aa;margin:0 0 28px;font-size:14px">Password Reset</p>
          <p style="font-size:14px;margin:0 0 16px">Your password reset code is:</p>
          <div style="background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:20px;text-align:center;margin-bottom:24px">
            <span style="font-family:monospace;font-size:32px;font-weight:700;letter-spacing:0.4em;color:#fff">{code}</span>
          </div>
          <p style="color:#a1a1aa;font-size:13px;margin:0">This code expires in 15 minutes. If you didn't request a reset, ignore this email.</p>
        </div>
        """
        params = {
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": "Reset your BridgeBot password",
            "html": html,
        }
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Password reset email sent to {to_email}")
    except Exception as e:
        logger.error(f"Resend error (reset): {e}")
        print(f"\n{'='*50}\nFALLBACK RESET EMAIL\nTo: {to_email}\nCode: {code}\n{'='*50}\n")




class UserRegister(BaseModel):
    email: str
    password: str
    username: str

class UserLogin(BaseModel):
    email_or_username: str
    password: str

class VerifyEmailBody(BaseModel):
    email: str
    code: str

class ResendCodeBody(BaseModel):
    email: str

class ForgotPasswordBody(BaseModel):
    email: str

class ResetPasswordBody(BaseModel):
    email: str
    code: str
    new_password: str

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
    priority: Optional[int] = 0

class URLEntry(BaseModel):
    url: str
    title: Optional[str] = None
    priority: Optional[int] = 0
    auth_username: Optional[str] = None
    auth_password: Optional[str] = None

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None
    instance_id: Optional[str] = None

class ApproveBody(BaseModel):
    approved: bool = True

class DiscordConfigUpdate(BaseModel):
    bot_token: Optional[str] = None
    is_active: Optional[bool] = None
    listen_mode: Optional[str] = None          # mention_only | all_channels | specific_channels
    monitored_channel_ids: Optional[List[str]] = None
    reply_style: Optional[str] = None          # natural | with_mention
    staff_role_name: Optional[str] = None      # role name for human takeover detection
    handoff_cooldown_minutes: Optional[int] = None  # minutes before bot re-engages after staff reply
    handoff_followup_message: Optional[str] = None  # message bot sends when re-engaging
    passive_mode: Optional[bool] = None        # if True, only reply when bot can answer from KB (skip small-talk)


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
        # Load ALL active sources for this instance, sorted by priority
        all_sources = await db.knowledge_sources.find(
            {"is_active": True, "instance_id": instance_id}, {"_id": 0}
        ).sort([("priority", -1), ("created_at", -1)]).to_list(100)

        if not all_sources:
            return "__NO_KB__"  # Signal: no knowledge base configured at all

        chunks = []
        total_chars = 0
        for r in all_sources:
            title = r.get("title", "Unknown")
            content = r.get("content", "")[:1200]
            pri = r.get("priority", 0)
            pri_label = " [PRIORITY: HIGH]" if pri >= 2 else (" [PRIORITY: MEDIUM]" if pri == 1 else "")
            chunk = f"[{title}]{pri_label}\n{content}"
            # Stay within ~30K chars to leave room for the rest of the prompt
            if total_chars + len(chunk) > 30000:
                break
            chunks.append(chunk)
            total_chars += len(chunk)
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


def build_system_prompt(bot_config: dict, knowledge_context: str = "", tone_examples: str = "", passive_mode: bool = False, allow_skip: bool = False) -> str:
    name = bot_config.get("name", "Assistant")
    persona = bot_config.get("persona", "You are a helpful, friendly assistant.")
    custom_instructions = bot_config.get("custom_instructions", "")
    tone_instructions = bot_config.get("tone_instructions", "")

    parts = [f"You are {name}. {persona}"]

    if knowledge_context == "__NO_KB__":
        parts.append(
            "IMPORTANT — NO KNOWLEDGE BASE CONFIGURED:\n"
            "This bot instance does not have any knowledge base entries configured yet.\n"
            "You MUST NOT answer questions using your general knowledge.\n"
            "For ANY question, respond with something like:\n"
            "\"I don't have any knowledge base configured yet. Please check back later "
            "or contact the administrator to set up my knowledge base.\"\n"
            "Be polite and brief. Do not attempt to answer the question."
        )
    elif knowledge_context:
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
            "KNOWLEDGE BASE RESULT: No matching entries were found for the user's query.\n\n"
            "IMPORTANT — KNOWLEDGE GATE PROTOCOL:\n"
            "You must NOT answer the question directly from your general knowledge without the user's explicit permission.\n"
            "Instead, respond with something like:\n"
            "\"I couldn't find anything about that in my knowledge base. "
            "Would you like me to expand the search and answer using my general knowledge?\"\n\n"
            "Then wait for the user's response and follow these rules:\n"
            "- If they say YES (yes, sure, go ahead, please, ok, expand, etc.) → answer the original question using your general knowledge.\n"
            "- If they say NO (no, never mind, don't bother, skip, etc.) → acknowledge politely and offer to help with something else.\n"
            "- If they ask a completely different question → treat it as a new query and apply the knowledge gate protocol again.\n"
            "Keep your ask short and natural — one sentence is enough."
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

    if passive_mode and allow_skip:
        parts.append(
            "PASSIVE MODE — STAY SILENT WHEN UNCERTAIN:\n"
            "You are monitoring a busy channel. You must NOT respond to small talk, statements, "
            "greetings, opinions, jokes, or off-topic chatter.\n"
            "ONLY respond when ALL of the following are true:\n"
            "  1. The message is clearly a question or a request for help, AND\n"
            "  2. The KNOWLEDGE BASE above contains enough information for you to give a useful, "
            "     accurate answer.\n"
            "If either condition is not met, output exactly this single token and nothing else: [SKIP]\n"
            "Do not explain. Do not greet. Do not apologize. Just output [SKIP] on its own.\n"
            "When you do answer, answer normally — do not mention this passive mode."
        )

    return "\n\n".join(parts)


async def call_claude(session_id: str, user_message: str, system_prompt: str,
                      instance_id: str = "default", platform: str = "web") -> str:
    api_key = os.environ.get("CLAUDE_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")

    primary_model = "claude-opus-4-5-20251101"
    fallback_model = "claude-sonnet-4-5-20251101"
    max_retries = 2
    retry_count = 0
    used_fallback = False
    last_error = None  # noqa: F841
    error_type = None

    async def _attempt(model: str) -> str:
        nonlocal retry_count
        key = f"{session_id}_{instance_id}_{model}"
        if key not in llm_sessions:
            llm_sessions[key] = LlmChat(
                api_key=api_key,
                session_id=key,
                system_message=system_prompt
            ).with_model("anthropic", model)
        return await llm_sessions[key].send_message(UserMessage(text=user_message))

    # Try primary model with retries
    for attempt in range(max_retries + 1):
        try:
            result = await _attempt(primary_model)
            await _log_llm_usage(instance_id, session_id, platform, primary_model,
                                 primary_model, True, retry_count, False, None)
            return result
        except Exception as e:
            last_error = e  # noqa: F841
            err_str = str(e).lower()
            error_type = ("rate_limit" if "rate" in err_str or "429" in err_str
                          else "balance" if "credit" in err_str or "balance" in err_str or "payment" in err_str
                          else "timeout" if "timeout" in err_str or "timed out" in err_str
                          else "unknown")
            if attempt < max_retries:
                retry_count += 1
                logger.warning(f"Claude Opus attempt {attempt+1} failed ({error_type}), retrying...")
                await asyncio.sleep(1.5 ** attempt)  # 1s, 1.5s backoff
            else:
                logger.error(f"Claude Opus exhausted retries: {e}")

    # Fallback to Sonnet
    try:
        used_fallback = True  # noqa: F841
        result = await _attempt(fallback_model)
        logger.info(f"Fallback to {fallback_model} succeeded for session {session_id}")
        await _log_llm_usage(instance_id, session_id, platform, fallback_model,
                             primary_model, True, retry_count, True, error_type)
        return result
    except Exception as e:
        logger.error(f"Fallback model also failed: {e}")
        await _log_llm_usage(instance_id, session_id, platform, fallback_model,
                             primary_model, False, retry_count, True, error_type)
        raise HTTPException(status_code=500, detail="AI service temporarily unavailable. Please try again in a moment.")


async def _log_llm_usage(instance_id: str, session_id: str, platform: str,
                          model_used: str, model_attempted: str, success: bool,
                          retry_count: int, used_fallback: bool, error_type: str):
    try:
        await db.llm_usage.insert_one({
            "id": str(uuid.uuid4()),
            "instance_id": instance_id,
            "session_id": session_id,
            "platform": platform,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "model_attempted": model_attempted,
            "model_used": model_used,
            "success": success,
            "retry_count": retry_count,
            "used_fallback": used_fallback,
            "error_type": error_type,
        })
    except Exception as e:
        logger.warning(f"Failed to log LLM usage: {e}")


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

# Shared client and handoff state
_shared_discord_client = None
_shared_discord_task = None
_handoff_channels: Dict[str, datetime] = {}  # {channel_id: last_staff_timestamp}


async def _resolve_instance_for_guild(guild_id: str) -> Optional[str]:
    """Find which instance owns this guild."""
    if guild_id in guild_instance_map:
        return guild_instance_map[guild_id]
    config = await db.discord_config.find_one({"guild_id": guild_id, "is_active": True}, {"_id": 0})
    if config:
        iid = config.get("instance_id")
        guild_instance_map[guild_id] = iid
        return iid
    return None


async def _sync_guild_nickname(token: str, guild_id: str, name: str):
    """Set bot nickname in a specific guild. Safe — never raises."""
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.patch(
                f"https://discord.com/api/v10/guilds/{guild_id}/members/@me",
                headers={"Authorization": f"Bot {token}"},
                json={"nick": name}
            ) as resp:
                if resp.status == 200:
                    logger.info(f"Nickname synced to '{name}' in guild {guild_id}")
                elif resp.status == 429:
                    logger.warning(f"Rate limited syncing nickname to guild {guild_id}")
                else:
                    body = await resp.text()
                    logger.warning(f"Nickname sync failed in guild {guild_id} ({resp.status}): {body}")
    except Exception as e:
        logger.warning(f"Nickname sync exception for guild {guild_id}: {e}")


async def start_shared_discord_bot(token: str):
    """Start a single shared Discord client that routes messages to the correct instance."""
    global _shared_discord_client

    try:
        import discord
        intents = discord.Intents.default()
        intents.message_content = True
        intents.members = True
        _shared_discord_client = discord.Client(intents=intents)

        @_shared_discord_client.event
        async def on_ready():
            logger.info(f"Shared Discord bot online: {_shared_discord_client.user}")
            # Build guild→instance map first (critical for message routing)
            active_configs = await db.discord_config.find({"is_active": True}, {"_id": 0}).to_list(50)
            for cfg in active_configs:
                iid = cfg.get("instance_id")
                gid = cfg.get("guild_id")
                if iid and gid:
                    guild_instance_map[gid] = iid
            logger.info(f"Guild map built: {len(guild_instance_map)} guilds mapped")
            # Sync nicknames separately — failures must not break message handling
            for cfg in active_configs:
                iid = cfg.get("instance_id")
                gid = cfg.get("guild_id")
                if iid and gid:
                    try:
                        bot_config = await db.bot_config.find_one({"instance_id": iid}, {"_id": 0})
                        name = (bot_config or {}).get("name", "").strip()
                        if name:
                            await _sync_guild_nickname(token, gid, name)
                    except Exception as e:
                        logger.warning(f"Nickname sync failed for instance {iid[:12]}: {e}")

        @_shared_discord_client.event
        async def on_message(message):
            if message.author.bot:
                return
            is_dm = isinstance(message.channel, discord.DMChannel)
            if is_dm:
                first_cfg = await db.discord_config.find_one({"is_active": True}, {"_id": 0})
                instance_id = (first_cfg or {}).get("instance_id", "default")
            else:
                guild_id = str(message.guild.id) if message.guild else None
                if not guild_id:
                    return
                instance_id = await _resolve_instance_for_guild(guild_id)
                if not instance_id:
                    return
            live_cfg = await db.discord_config.find_one({"instance_id": instance_id}, {"_id": 0}) or {}
            listen_mode = live_cfg.get("listen_mode", "mention_only")
            monitored_ids = set(live_cfg.get("monitored_channel_ids") or [])
            reply_style = live_cfg.get("reply_style", "natural")
            staff_role_name = (live_cfg.get("staff_role_name") or "").strip().lower()
            # Normalize: remove extra spaces and special chars for fuzzy matching
            staff_role_normalized = "".join(staff_role_name.split()).replace("-", "").replace("_", "")
            cooldown_minutes = live_cfg.get("handoff_cooldown_minutes", 15) or 15
            followup_msg = live_cfg.get("handoff_followup_message") or "Is there anything else I can help with?"
            if not live_cfg.get("is_active", True):
                return
            channel_id = str(message.channel.id)
            logger.info(f"[MSG] from={message.author.name} instance={instance_id[:12]} staff_role_cfg='{staff_role_name}' mode={listen_mode}")
            if message.content.strip().lower() == "!bot resume":
                if channel_id in _handoff_channels:
                    del _handoff_channels[channel_id]
                    await message.channel.send("I'm back! How can I help?")
                return
            is_staff = False
            if staff_role_name and not is_dm and message.guild:
                try:
                    import aiohttp
                    async with aiohttp.ClientSession() as http_session:
                        member_url = f"https://discord.com/api/v10/guilds/{message.guild.id}/members/{message.author.id}"
                        async with http_session.get(
                            member_url,
                            headers={"Authorization": f"Bot {token}"}
                        ) as member_resp:
                            logger.info(f"[ROLE CHECK] user={message.author.name} guild={message.guild.id} member_api_status={member_resp.status}")
                            if member_resp.status == 200:
                                member_data = await member_resp.json()
                                member_role_ids = set(member_data.get("roles", []))
                                logger.info(f"[ROLE CHECK] user={message.author.name} role_ids={member_role_ids}")
                                async with http_session.get(
                                    f"https://discord.com/api/v10/guilds/{message.guild.id}/roles",
                                    headers={"Authorization": f"Bot {token}"}
                                ) as roles_resp:
                                    if roles_resp.status == 200:
                                        guild_roles = await roles_resp.json()
                                        role_names = {r["id"]: r["name"] for r in guild_roles}
                                        logger.info(f"[ROLE CHECK] guild_roles={role_names} looking_for='{staff_role_name}'")
                                        user_role_names = [role_names.get(rid, "?") for rid in member_role_ids]
                                        logger.info(f"[ROLE CHECK] user_role_names={user_role_names}")
                                        for role in guild_roles:
                                            role_name_lower = role["name"].lower()
                                            role_normalized = "".join(role_name_lower.split()).replace("-", "").replace("_", "")
                                            if role["id"] in member_role_ids and (role_name_lower == staff_role_name or role_normalized == staff_role_normalized):
                                                is_staff = True
                                                logger.info(f"[ROLE CHECK] MATCH FOUND: role='{role['name']}' config='{staff_role_name}'")
                                                break
                                        if not is_staff:
                                            logger.info(f"[ROLE CHECK] NO MATCH for '{staff_role_name}' in user roles {user_role_names}")
                                    else:
                                        logger.warning(f"[ROLE CHECK] Guild roles fetch failed: {roles_resp.status}")
                            else:
                                body = await member_resp.text()
                                logger.warning(f"[ROLE CHECK] Member fetch failed ({member_resp.status}): {body}")
                except Exception as e:
                    logger.warning(f"[ROLE CHECK] Exception: {e}")
            if is_staff and not is_dm:
                _handoff_channels[channel_id] = datetime.now(timezone.utc)
                logger.info(f"Human takeover: '{message.author.name}' has role '{staff_role_name}' in channel {channel_id}")
                return
            if not is_staff and staff_role_name and not is_dm:
                logger.debug(f"User '{message.author.name}' does NOT have role '{staff_role_name}' — bot will respond")
            if channel_id in _handoff_channels:
                elapsed = (datetime.now(timezone.utc) - _handoff_channels[channel_id]).total_seconds() / 60.0
                if elapsed < cooldown_minutes:
                    if is_staff:
                        # Staff still active — refresh timer, stay silent
                        _handoff_channels[channel_id] = datetime.now(timezone.utc)
                        return
                    # Non-staff message during handoff — clear and let bot respond to this message
                    del _handoff_channels[channel_id]
                    logger.info(f"Handoff cleared in channel {channel_id} — non-staff message received")
                else:
                    del _handoff_channels[channel_id]
                    try:
                        await message.channel.send(followup_msg)
                    except Exception:
                        pass
            is_mentioned = (_shared_discord_client.user in message.mentions if _shared_discord_client.user else False)
            if is_dm:
                should_respond = True
            elif listen_mode == "mention_only":
                should_respond = is_mentioned
            elif listen_mode == "all_channels":
                should_respond = True
            elif listen_mode == "specific_channels":
                should_respond = (str(message.channel.id) in monitored_ids) or is_mentioned
            else:
                should_respond = is_mentioned
            if not should_respond:
                return
            user_text = message.content.strip()
            if _shared_discord_client.user:
                user_text = user_text.replace(f"<@{_shared_discord_client.user.id}>", "").strip()
                user_text = user_text.replace(f"<@!{_shared_discord_client.user.id}>", "").strip()
            if not user_text:
                return
            session_id = f"discord_{message.author.id}"
            try:
                bot_config = await db.bot_config.find_one({"instance_id": instance_id}, {"_id": 0}) or {}
                knowledge = await search_knowledge(user_text, instance_id)
                if knowledge == "__NO_KB__":
                    bot_name = bot_config.get("name", "I")
                    response = f"I don't have any knowledge base configured yet. Please check back later or contact the administrator to set up my knowledge base."
                else:
                    tone = await get_tone_examples_text(instance_id, bot_config)
                    passive_mode = bool(live_cfg.get("passive_mode", False))
                    # In passive mode, allow the LLM to skip unless the user @mentioned the bot or DM'd it
                    allow_skip = passive_mode and not is_mentioned and not is_dm
                    system_prompt = build_system_prompt(bot_config, knowledge, tone, passive_mode=passive_mode, allow_skip=allow_skip)
                    async with message.channel.typing():
                        response = await call_claude(session_id, user_text, system_prompt, instance_id=instance_id, platform="discord")
                    # Passive mode: detect [SKIP] sentinel and stay silent
                    if allow_skip and response and response.strip().upper().startswith("[SKIP]"):
                        logger.info(f"[PASSIVE] instance={instance_id[:12]} channel={channel_id} — skipped (no confident answer)")
                        return
                await save_conversation(session_id=session_id, user_message=user_text, bot_response=response, platform="discord", instance_id=instance_id, metadata={"username": str(message.author.name), "user_id": str(message.author.id)})
                if reply_style == "with_mention" and not is_dm:
                    response = f"{message.author.mention} {response}"
                if len(response) > 1990:
                    for i in range(0, len(response), 1990):
                        await message.channel.send(response[i:i+1990])
                else:
                    await message.channel.send(response)
            except Exception as e:
                logger.error(f"Discord message error (instance={instance_id}): {e}")
                await message.channel.send("Sorry, I encountered an error. Please try again.")

        await _shared_discord_client.start(token)
    except asyncio.CancelledError:
        logger.info("Shared Discord bot task cancelled")
    except Exception as e:
        logger.error(f"Discord bot startup error: {e}")
    finally:
        _shared_discord_client = None


# ==================== STARTUP / SHUTDOWN ====================

@app.on_event("startup")
async def startup_event():
    try:
        await db.knowledge_sources.create_index([("title", "text"), ("content", "text")])
        await db.knowledge_sources.create_index([("instance_id", 1)])
        await db.conversations.create_index([("session_id", 1)])
        await db.conversations.create_index([("created_at", -1)])
        await db.conversations.create_index([("instance_id", 1)])
        await db.bot_config.create_index([("instance_id", 1)])
        await db.bot_instances.create_index([("id", 1)])
        await db.llm_usage.create_index([("instance_id", 1)])
        await db.llm_usage.create_index([("timestamp", -1)])
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
            "username": "administrator",
            "hashed_password": hashed_pw,
            "is_verified": True,
            "verification_code": None,
            "role": "superadmin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Seeded admin: {ADMIN_EMAIL}")
    else:
        # Ensure existing admin has username
        await db.users.update_one(
            {"email": ADMIN_EMAIL, "username": {"$exists": False}},
            {"$set": {"username": "administrator"}}
        )

    # Migrate single-tenant data to multi-tenant if needed
    # (updates any existing docs that lack instance_id — safe to run on every startup)
    first_instance = await db.bot_instances.find_one({}, {"id": 1})
    if first_instance:
        migrate_id = first_instance["id"]
        for col in [db.bot_config, db.knowledge_sources, db.conversations, db.discord_config]:
            await col.update_many({"instance_id": {"$exists": False}}, {"$set": {"instance_id": migrate_id}})

    # Start shared Discord bot (one client, routes to all instances by guild)
    global _shared_discord_task
    app_creds = await get_discord_credentials()
    bot_token = app_creds.get("bot_token")
    # Build guild→instance map
    active_configs = await db.discord_config.find({"is_active": True}, {"_id": 0}).to_list(50)
    for cfg in active_configs:
        gid = cfg.get("guild_id")
        iid = cfg.get("instance_id")
        if gid and iid:
            guild_instance_map[gid] = iid
        # Use per-instance token if available, otherwise app token
        if not bot_token:
            bot_token = cfg.get("bot_token")
    if bot_token:
        _shared_discord_task = asyncio.create_task(start_shared_discord_bot(bot_token))
        logger.info(f"Starting shared Discord bot ({len(active_configs)} active instances)")


@app.on_event("shutdown")
async def shutdown_event():
    global _shared_discord_client, _shared_discord_task
    if _shared_discord_client:
        try:
            await _shared_discord_client.close()
        except Exception:
            pass
    if _shared_discord_task:
        _shared_discord_task.cancel()
    mongo_client.close()


# ==================== AUTH ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "BridgeBot API", "version": "2.0.0"}


@api_router.post("/auth/register")
async def register(body: UserRegister):
    if not body.email or not body.password or not body.username:
        raise HTTPException(status_code=400, detail="Email, username, and password required")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    username_lower = body.username.strip().lower()
    if not username_lower:
        raise HTTPException(status_code=400, detail="Username cannot be empty")
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await db.users.find_one({"username": username_lower}):
        raise HTTPException(status_code=400, detail="Username already taken")
    code = str(secrets.randbelow(900000) + 100000)
    expiry = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    hashed_pw = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    user_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": user_id,
        "email": body.email.lower(),
        "username": username_lower,
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
    identifier = body.email_or_username.strip().lower()
    # Try email first, then username
    user = await db.users.find_one({"email": identifier})
    if not user:
        user = await db.users.find_one({"username": identifier})
    if not user or not bcrypt.checkpw(body.password.encode(), user["hashed_password"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
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
        "user": {"id": user["id"], "email": user["email"], "role": user["role"], "username": user.get("username", "")},
        "instances": instances
    }


@api_router.post("/auth/logout")
async def logout_user(response: Response):
    response.delete_cookie(key="bf_access_token", path="/")
    return {"success": True}


@api_router.post("/auth/forgot-password")
async def forgot_password(body: ForgotPasswordBody):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    # Always return success to avoid revealing whether an email is registered
    if user and user.get("is_verified"):
        code = str(secrets.randbelow(900000) + 100000)
        expires = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
        await db.users.update_one(
            {"email": email},
            {"$set": {"reset_code": code, "reset_code_expires": expires}}
        )
        await send_reset_email(email, code)
    return {"message": "If that email is registered, a reset code has been sent."}


@api_router.post("/auth/reset-password")
async def reset_password(body: ResetPasswordBody):
    email = body.email.lower().strip()
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user = await db.users.find_one({"email": email})
    if not user or not user.get("reset_code") or user.get("reset_code") != body.code:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")
    expires_str = user.get("reset_code_expires", "")
    if expires_str and datetime.fromisoformat(expires_str) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset code has expired. Request a new one.")
    hashed = bcrypt.hashpw(body.new_password.encode(), bcrypt.gensalt()).decode()
    await db.users.update_one(
        {"email": email},
        {"$set": {"hashed_password": hashed}, "$unset": {"reset_code": "", "reset_code_expires": ""}}
    )
    return {"message": "Password reset successful. You can now log in."}


@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one(
        {"id": current_user["id"]},
        {"_id": 0, "hashed_password": 0, "verification_code": 0,
         "verification_code_expiry": 0, "reset_code": 0, "reset_code_expires": 0}
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

@api_router.get("/admin/users")
async def list_all_users(current_user: dict = Depends(require_admin)):
    """Return all registered users with their assigned instances."""
    users = await db.users.find(
        {},
        {"_id": 0, "hashed_password": 0, "verification_code": 0,
         "verification_code_expiry": 0, "reset_code": 0, "reset_code_expires": 0}
    ).to_list(1000)
    instances = await db.bot_instances.find(
        {}, {"_id": 0, "id": 1, "name": 1, "assigned_user_ids": 1}
    ).to_list(100)
    user_instance_map = {}
    for inst in instances:
        for uid in inst.get("assigned_user_ids", []):
            user_instance_map.setdefault(uid, []).append({"id": inst["id"], "name": inst["name"]})
    for user in users:
        user["assigned_instances"] = user_instance_map.get(user["id"], [])
    return users


@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    """Delete a user (admin only). Cannot delete yourself."""
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("role") == "superadmin":
        raise HTTPException(status_code=400, detail="Cannot delete admin accounts")
    # Remove user from all instance assignments
    await db.bot_instances.update_many(
        {"assigned_user_ids": user_id},
        {"$pull": {"assigned_user_ids": user_id}}
    )
    # Delete user
    await db.users.delete_one({"id": user_id})
    return {"success": True, "message": f"User {user.get('email', '')} deleted"}


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




# ==================== CHAT (PUBLIC) ====================

@api_router.post("/chat/send")
async def send_chat_message(body: ChatMessage):
    session_id = body.session_id or str(uuid.uuid4())
    instance_id = body.instance_id or "default"
    bot_config = await db.bot_config.find_one({"instance_id": instance_id}, {"_id": 0}) or {}
    knowledge = await search_knowledge(body.message, instance_id)
    if knowledge == "__NO_KB__":
        response = "I don't have any knowledge base configured yet. Please check back later or contact the administrator to set up my knowledge base."
    else:
        tone = await get_tone_examples_text(instance_id, bot_config)
        system_prompt = build_system_prompt(bot_config, knowledge, tone)
        response = await call_claude(session_id, body.message, system_prompt,
                                    instance_id=instance_id, platform="web")
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
    ).sort([("priority", -1), ("created_at", -1)]).to_list(200)
    return sources


@api_router.post("/knowledge/sources/faq")
async def add_faq(entry: FAQEntry, instance_id: str = Depends(get_instance_access)):
    doc = {
        "id": str(uuid.uuid4()), "type": "faq", "title": entry.title,
        "content": entry.content, "tags": entry.tags or [],
        "instance_id": instance_id, "priority": entry.priority or 0,
        "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.knowledge_sources.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.post("/knowledge/sources/url")
async def scrape_url_source(entry: URLEntry, instance_id: str = Depends(get_instance_access)):
    try:
        auth = None
        if entry.auth_username and entry.auth_password:
            auth = httpx.BasicAuth(entry.auth_username, entry.auth_password)
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }
        resp = None
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=30.0, follow_redirects=True, auth=auth) as http:
                    resp = await http.get(entry.url, headers=headers)
                    if resp.status_code == 429:
                        wait = int(resp.headers.get("Retry-After", 5 * (attempt + 1)))
                        logger.warning(f"Rate limited on {entry.url}, waiting {wait}s (attempt {attempt+1}/3)")
                        import asyncio
                        await asyncio.sleep(wait)
                        continue
                    resp.raise_for_status()
                    break
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429 and attempt < 2:
                    import asyncio
                    await asyncio.sleep(5 * (attempt + 1))
                    continue
                raise
        if resp is None or resp.status_code == 429:
            raise HTTPException(status_code=429, detail="Website is rate limiting requests. Try again in a few minutes.")
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
            "priority": entry.priority or 0,
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
    priority: int = Form(0),
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
            "priority": priority,
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


class PriorityUpdate(BaseModel):
    priority: int

class SourceUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    url: Optional[str] = None
    priority: Optional[int] = None

@api_router.patch("/knowledge/sources/{source_id}/priority")
async def update_source_priority(source_id: str, body: PriorityUpdate, instance_id: str = Depends(get_instance_access)):
    result = await db.knowledge_sources.update_one(
        {"id": source_id, "instance_id": instance_id},
        {"$set": {"priority": body.priority}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Source not found")
    return {"success": True, "priority": body.priority}


@api_router.put("/knowledge/sources/{source_id}")
async def update_source(source_id: str, body: SourceUpdate, instance_id: str = Depends(get_instance_access)):
    source = await db.knowledge_sources.find_one({"id": source_id, "instance_id": instance_id}, {"_id": 0})
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    update = {k: v for k, v in body.dict().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.knowledge_sources.update_one({"id": source_id, "instance_id": instance_id}, {"$set": update})
    updated = await db.knowledge_sources.find_one({"id": source_id}, {"_id": 0})
    return updated


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


@api_router.get("/analytics/llm-usage")
async def analytics_llm_usage(instance_id: str = Depends(get_instance_access)):
    """API usage, retry attempts, fallbacks and error breakdown for the selected instance."""
    q = {"instance_id": instance_id}
    now = datetime.now(timezone.utc)

    total = await db.llm_usage.count_documents(q)
    successful = await db.llm_usage.count_documents({**q, "success": True})
    failed = await db.llm_usage.count_documents({**q, "success": False})
    fallbacks = await db.llm_usage.count_documents({**q, "used_fallback": True})

    # Sum retry_count across all docs
    pipeline_retries = [
        {"$match": q},
        {"$group": {"_id": None, "total_retries": {"$sum": "$retry_count"}}}
    ]
    retry_res = await db.llm_usage.aggregate(pipeline_retries).to_list(1)
    total_retries = retry_res[0]["total_retries"] if retry_res else 0

    # Error type breakdown
    pipeline_errors = [
        {"$match": {**q, "success": False, "error_type": {"$ne": None}}},
        {"$group": {"_id": "$error_type", "count": {"$sum": 1}}}
    ]
    error_docs = await db.llm_usage.aggregate(pipeline_errors).to_list(20)
    error_breakdown = {d["_id"]: d["count"] for d in error_docs}

    # Daily breakdown — last 7 days
    daily = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        day_q = {**q, "timestamp": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}}
        calls = await db.llm_usage.count_documents(day_q)
        errors = await db.llm_usage.count_documents({**day_q, "success": False})
        retries_pipeline = [
            {"$match": day_q},
            {"$group": {"_id": None, "total": {"$sum": "$retry_count"}}}
        ]
        r = await db.llm_usage.aggregate(retries_pipeline).to_list(1)
        daily.append({
            "date": day_start.strftime("%m/%d"),
            "calls": calls,
            "errors": errors,
            "retries": r[0]["total"] if r else 0,
        })

    return {
        "total_calls": total,
        "successful_calls": successful,
        "failed_calls": failed,
        "retry_attempts": total_retries,
        "fallback_used": fallbacks,
        "success_rate": round((successful / total * 100), 1) if total else 100.0,
        "error_breakdown": error_breakdown,
        "daily": daily,
    }


# ==================== DISCORD (PROTECTED) ====================


@api_router.get("/discord/app-config")
async def get_discord_app_config(current_user: dict = Depends(require_admin)):
    """Get Discord app credentials (admin only). Secrets are masked."""
    creds = await get_discord_credentials()
    raw = await db.discord_app_config.find_one({"_id": "discord_app"}) or {}
    return {
        "client_id": creds["client_id"],
        "client_secret": ("***" + creds["client_secret"][-4:]) if len(creds.get("client_secret", "")) > 4 else ("***" if creds.get("client_secret") else ""),
        "redirect_uri": creds["redirect_uri"],
        "bot_token": ("***" + creds["bot_token"][-4:]) if len(creds.get("bot_token", "")) > 4 else ("***" if creds.get("bot_token") else ""),
        "has_client_id": bool(creds["client_id"]),
        "has_client_secret": bool(creds["client_secret"]),
        "has_redirect_uri": bool(creds["redirect_uri"]),
        "has_bot_token": bool(creds["bot_token"]),
        "updated_at": raw.get("updated_at"),
    }


class DiscordAppConfigUpdate(BaseModel):
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    redirect_uri: Optional[str] = None
    bot_token: Optional[str] = None

@api_router.put("/discord/app-config")
async def update_discord_app_config(body: DiscordAppConfigUpdate, current_user: dict = Depends(require_admin)):
    """Update Discord app credentials (admin only). Stored in DB."""
    update = {k: v.strip() for k, v in body.dict().items() if v is not None and v.strip()}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.discord_app_config.update_one(
        {"_id": "discord_app"}, {"$set": update}, upsert=True
    )
    return {"success": True, "message": "Discord credentials updated"}


@api_router.get("/discord/app-config/connections")
async def list_discord_connections(current_user: dict = Depends(require_admin)):
    """List every instance currently mapped to a Discord guild. Used by Discord App Setup to
    preview the impact of clearing app credentials."""
    rows = await db.discord_config.find({"guild_id": {"$exists": True, "$ne": ""}}).to_list(length=None)
    out = []
    for r in rows:
        inst = await db.bot_instances.find_one({"id": r.get("instance_id")})
        out.append({
            "instance_id": r.get("instance_id"),
            "instance_name": (inst or {}).get("name") or "(deleted instance)",
            "guild_id": r.get("guild_id"),
            "guild_name": r.get("guild_name") or "",
        })
    return {"connections": out, "count": len(out)}


@api_router.delete("/discord/app-config")
async def clear_discord_app_config(
    clear_connections: bool = False,
    current_user: dict = Depends(require_admin),
):
    """Clear the Discord App credentials (admin only).
    If clear_connections=true, also wipe every instance ↔ guild mapping in discord_config."""
    await db.discord_app_config.delete_one({"_id": "discord_app"})
    connections_cleared = 0
    if clear_connections:
        result = await db.discord_config.update_many(
            {"guild_id": {"$exists": True, "$ne": ""}},
            {"$unset": {"guild_id": "", "guild_name": ""}},
        )
        connections_cleared = result.modified_count
    # Stop the running shared bot so the new token (when configured) takes effect cleanly.
    global _shared_discord_task
    try:
        if _shared_discord_task and not _shared_discord_task.done():
            _shared_discord_task.cancel()
    except Exception:
        pass
    _shared_discord_task = None
    return {
        "success": True,
        "message": "Discord app credentials cleared",
        "connections_cleared": connections_cleared,
    }


@api_router.get("/discord/oauth-url")
async def get_discord_oauth_url(instance_id: str = Depends(get_instance_access)):
    """Generate Discord OAuth2 URL to invite the bot to a server."""
    creds = await get_discord_credentials()
    if not creds["client_id"]:
        raise HTTPException(status_code=400, detail="Discord Client ID not configured")
    if not creds["redirect_uri"]:
        raise HTTPException(status_code=400, detail="Discord Redirect URI not configured")
    from urllib.parse import urlencode
    params = {
        "client_id": creds["client_id"],
        "permissions": str(DISCORD_BOT_PERMISSIONS),
        "scope": "bot",
        "redirect_uri": creds["redirect_uri"],
        "response_type": "code",
        "state": instance_id,
    }
    url = f"https://discord.com/oauth2/authorize?{urlencode(params)}"
    return {"url": url}


@api_router.get("/discord/callback")
async def discord_oauth_callback(
    request: Request,
    code: str = None,
    guild_id: str = None,
    state: str = None,
    error: str = None,
    error_description: str = None,
):
    """Handle Discord OAuth2 callback after bot is invited to a server."""
    creds = await get_discord_credentials()
    redirect_uri = creds["redirect_uri"]
    frontend_base = redirect_uri.replace("/api/discord/callback", "") if redirect_uri else ""

    if error:
        logger.warning(f"Discord OAuth error: {error} - {error_description}")
        return RedirectResponse(url=f"{frontend_base}/admin/discord?oauth=error&reason={error}")

    if not code:
        return RedirectResponse(url=f"{frontend_base}/admin/discord?oauth=error&reason=no_code")

    instance_id = state or "default"

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://discord.com/api/oauth2/token",
                data={
                    "client_id": creds["client_id"],
                    "client_secret": creds["client_secret"],
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if resp.status_code != 200:
                logger.error(f"Discord token exchange failed: {resp.status_code} {resp.text}")
                return RedirectResponse(url=f"{frontend_base}/admin/discord?oauth=error&reason=token_exchange_failed")

            data = resp.json()
            guild = data.get("guild", {})
            bot_info = data.get("bot", {})

            update_fields = {
                "oauth_connected": True,
                "guild_id": guild.get("id", guild_id or ""),
                "guild_name": guild.get("name", ""),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "instance_id": instance_id,
                "is_active": True,
            }

            # If the token exchange returned a bot token, save it
            if bot_info.get("token"):
                update_fields["bot_token"] = bot_info["token"]

            await db.discord_config.update_one(
                {"instance_id": instance_id},
                {"$set": update_fields},
                upsert=True,
            )

            logger.info(f"Discord OAuth success: bot invited to guild {guild.get('name', 'unknown')}")

            # Auto-start/restart the shared bot and update guild mapping
            config = await db.discord_config.find_one({"instance_id": instance_id}, {"_id": 0})
            app_creds = await get_discord_credentials()
            bot_token = (config or {}).get("bot_token") or app_creds["bot_token"]
            if bot_token:
                guild_instance_map[guild.get("id", "")] = instance_id
                global _shared_discord_client, _shared_discord_task
                if _shared_discord_client:
                    try:
                        await _shared_discord_client.close()
                    except Exception:
                        pass
                if _shared_discord_task:
                    _shared_discord_task.cancel()
                _shared_discord_task = asyncio.create_task(start_shared_discord_bot(bot_token))

            return RedirectResponse(
                url=f"{frontend_base}/admin/discord?oauth=success&guild={guild.get('name', '')}"
            )

    except Exception as e:
        logger.error(f"Discord OAuth callback error: {e}")
        return RedirectResponse(url=f"{frontend_base}/admin/discord?oauth=error&reason=server_error")


@api_router.post("/discord/sync-name")
async def sync_discord_name(instance_id: str = Depends(get_instance_access)):
    """Push the bot_config name to Discord as the bot's nickname in connected guilds."""
    import aiohttp
    config = await db.discord_config.find_one({"instance_id": instance_id}, {"_id": 0})
    app_creds = await get_discord_credentials()
    token = (config or {}).get("bot_token") or app_creds["bot_token"]
    if not token:
        raise HTTPException(status_code=400, detail="Bot token not configured")
    bot_config = await db.bot_config.find_one({"instance_id": instance_id}, {"_id": 0})
    name = (bot_config or {}).get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Bot name not set. Configure it in Bot Settings first.")
    headers = {"Authorization": f"Bot {token}"}
    results = []
    async with aiohttp.ClientSession() as session:
        # Set nickname in the connected guild for this instance only
        guild_id = (config or {}).get("guild_id")
        if guild_id:
            async with session.patch(
                f"https://discord.com/api/v10/guilds/{guild_id}/members/@me",
                headers=headers,
                json={"nick": name}
            ) as resp:
                if resp.status == 200:
                    results.append(f"Server nickname set to '{name}'")
                    logger.info(f"Discord guild nickname updated to '{name}' in guild {guild_id}")
                else:
                    body = await resp.json()
                    err = body.get("message", "unknown error")
                    logger.warning(f"Guild nickname update failed ({resp.status}): {err}")
                    if resp.status == 403:
                        results.append("Missing 'Change Nickname' permission in server — re-invite the bot to fix this")
                    else:
                        results.append(f"Guild nickname failed: {err}")
        else:
            results.append("No guild connected for this instance. Invite the bot to a server first.")

    if not results:
        raise HTTPException(status_code=400, detail="No guilds found to update nickname")
    return {"success": True, "message": " | ".join(results)}


@api_router.get("/discord/channels")
async def get_discord_channels(instance_id: str = Depends(get_instance_access)):
    """Fetch text channels from this instance's connected guild only."""
    import aiohttp
    config = await db.discord_config.find_one({"instance_id": instance_id}, {"_id": 0})
    app_creds = await get_discord_credentials()
    token = (config or {}).get("bot_token") or app_creds["bot_token"]
    if not token:
        raise HTTPException(status_code=400, detail="Bot token not configured. Save your token first.")
    guild_id = (config or {}).get("guild_id")
    if not guild_id:
        raise HTTPException(status_code=400, detail="No Discord server connected to this instance. Invite the bot first.")
    headers = {"Authorization": f"Bot {token}"}
    all_channels = []
    try:
        async with aiohttp.ClientSession() as session:
            # Fetch guild name
            guild_name = (config or {}).get("guild_name", "Server")
            async with session.get(
                f"https://discord.com/api/v10/guilds/{guild_id}/channels", headers=headers
            ) as resp:
                if resp.status == 401:
                    raise HTTPException(status_code=400, detail="Invalid bot token")
                if resp.status != 200:
                    raise HTTPException(status_code=400, detail="Failed to fetch channels from Discord")
                channels = await resp.json()
                for c in channels:
                    if c.get("type") == 0:  # GUILD_TEXT only
                        all_channels.append({
                            "id": str(c["id"]),
                            "name": c["name"],
                            "guild_id": guild_id,
                            "guild_name": guild_name,
                        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Discord channel fetch error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch channels from Discord")
    return all_channels


@api_router.get("/discord/config")
async def get_discord_config(instance_id: str = Depends(get_instance_access)):
    config = await db.discord_config.find_one({"instance_id": instance_id}, {"_id": 0})
    app_creds = await get_discord_credentials()
    if config:
        token = config.get("bot_token", "")
        has_token = bool(token or app_creds["bot_token"])
        if token:
            config["bot_token_display"] = token[:8] + "..." + token[-4:] if len(token) > 12 else "***"
        elif app_creds["bot_token"]:
            config["bot_token_display"] = "Configured via app settings"
        config["has_bot_token"] = has_token
        config.pop("bot_token", None)
        config.pop("oauth_access_token", None)
    else:
        config = {"is_active": False, "has_bot_token": bool(app_creds["bot_token"]), "oauth_connected": False}
    config["oauth_enabled"] = bool(app_creds["client_id"])
    return config


@api_router.put("/discord/config")
async def update_discord_config(body: DiscordConfigUpdate, instance_id: str = Depends(get_instance_access)):
    update = {k: v for k, v in body.dict().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    update["instance_id"] = instance_id
    await db.discord_config.update_one({"instance_id": instance_id}, {"$set": update}, upsert=True)
    return {"success": True}


@api_router.post("/discord/restart")
async def restart_discord_bot_endpoint(instance_id: str = Depends(get_instance_access)):
    global _shared_discord_client, _shared_discord_task
    # Restart the shared bot (reconnects and re-syncs all guilds)
    if _shared_discord_client:
        try:
            await _shared_discord_client.close()
        except Exception:
            pass
    if _shared_discord_task:
        _shared_discord_task.cancel()
    app_creds = await get_discord_credentials()
    config = await db.discord_config.find_one({"instance_id": instance_id}, {"_id": 0})
    token = (config or {}).get("bot_token") or app_creds["bot_token"]
    if not token:
        raise HTTPException(status_code=400, detail="Discord bot token not configured")
    # Update guild mapping for this instance
    guild_id = (config or {}).get("guild_id")
    if guild_id:
        guild_instance_map[guild_id] = instance_id
    _shared_discord_task = asyncio.create_task(start_shared_discord_bot(token))
    return {"success": True, "message": "Discord bot restarting..."}


@api_router.get("/discord/status")
async def get_discord_status(instance_id: str = Depends(get_instance_access)):
    if _shared_discord_client and _shared_discord_client.is_ready():
        config = await db.discord_config.find_one({"instance_id": instance_id}, {"_id": 0})
        guild_id = (config or {}).get("guild_id")
        display_name = None
        if guild_id:
            guild = _shared_discord_client.get_guild(int(guild_id))
            if guild and guild.me:
                display_name = guild.me.nick or guild.me.display_name
        # If no guild nickname found, show the bot_config name for this instance
        if not display_name:
            bot_config = await db.bot_config.find_one({"instance_id": instance_id}, {"_id": 0})
            display_name = (bot_config or {}).get("name") or str(_shared_discord_client.user)
        return {"status": "online", "bot_name": display_name}
    return {"status": "offline", "bot_name": None}


@api_router.post("/discord/rename-global")
async def rename_global_bot(current_user: dict = Depends(require_admin)):
    """Rename the Discord bot's global username (admin only). Limit: 2 per hour."""
    import aiohttp
    from fastapi import Body
    body = await db.discord_app_config.find_one({"_id": "discord_app"}) or {}
    # Read name from request
    from starlette.requests import Request
    return {"error": "Use the direct endpoint with name parameter"}


@api_router.post("/discord/rename-global/{new_name}")
async def rename_global_bot_name(new_name: str, current_user: dict = Depends(require_admin)):
    """Rename the Discord bot's global username (admin only). Limit: 2 per hour."""
    import aiohttp
    if len(new_name) < 2 or len(new_name) > 32:
        raise HTTPException(status_code=400, detail="Name must be 2-32 characters")
    app_creds = await get_discord_credentials()
    bot_token = app_creds.get("bot_token")
    if not bot_token:
        raise HTTPException(status_code=400, detail="No bot token configured")
    async with aiohttp.ClientSession() as session:
        async with session.patch(
            "https://discord.com/api/v10/users/@me",
            headers={"Authorization": f"Bot {bot_token}"},
            json={"username": new_name}
        ) as resp:
            body = await resp.json()
            if resp.status == 200:
                return {"success": True, "new_username": body.get("username"), "discriminator": body.get("discriminator")}
            elif resp.status == 429:
                retry_after = body.get("retry_after", "unknown")
                raise HTTPException(status_code=429, detail=f"Rate limited. Try again in {retry_after} seconds. Discord allows 2 name changes per hour.")
            else:
                raise HTTPException(status_code=400, detail=body.get("message", "Discord API error"))


@api_router.get("/discord/debug-roles")
async def debug_discord_roles(instance_id: str = Depends(get_instance_access)):
    """Debug endpoint: check role detection for this instance's guild."""
    import aiohttp
    config = await db.discord_config.find_one({"instance_id": instance_id}, {"_id": 0})
    if not config:
        return {"error": "No discord config for this instance"}
    guild_id = config.get("guild_id")
    staff_role_name = (config.get("staff_role_name") or "").strip().lower()
    app_creds = await get_discord_credentials()
    # Try both token sources
    env_token = DISCORD_BOT_TOKEN
    db_token = app_creds.get("bot_token", "")
    # Use whichever is available
    bot_token = db_token or env_token
    result = {
        "guild_id": guild_id,
        "staff_role_name_config": config.get("staff_role_name"),
        "staff_role_name_lowered": staff_role_name,
        "token_source": "db" if db_token else ("env" if env_token else "none"),
        "token_length": len(bot_token),
        "shared_client_ready": _shared_discord_client is not None and _shared_discord_client.is_ready() if _shared_discord_client else False,
    }
    if not bot_token:
        result["error"] = "No bot token available"
        return result
    if not guild_id:
        result["error"] = "No guild_id configured"
        return result
    try:
        async with aiohttp.ClientSession() as session:
            # Fetch guild roles
            async with session.get(
                f"https://discord.com/api/v10/guilds/{guild_id}/roles",
                headers={"Authorization": f"Bot {bot_token}"}
            ) as resp:
                result["roles_api_status"] = resp.status
                if resp.status == 200:
                    roles = await resp.json()
                    result["guild_roles"] = [{"id": r["id"], "name": r["name"]} for r in roles if r["name"] != "@everyone"]
                    matching = [r for r in roles if r["name"].lower() == staff_role_name]
                    result["matching_roles"] = matching
                else:
                    body = await resp.text()
                    result["roles_error"] = body
            # Fetch guild members (first 10)
            async with session.get(
                f"https://discord.com/api/v10/guilds/{guild_id}/members?limit=10",
                headers={"Authorization": f"Bot {bot_token}"}
            ) as resp:
                result["members_api_status"] = resp.status
                if resp.status == 200:
                    members = await resp.json()
                    result["members"] = []
                    for m in members:
                        user = m.get("user", {})
                        result["members"].append({
                            "username": user.get("username"),
                            "id": user.get("id"),
                            "role_ids": m.get("roles", []),
                            "is_bot": user.get("bot", False),
                        })
                else:
                    body = await resp.text()
                    result["members_error"] = body
    except Exception as e:
        result["exception"] = str(e)
    return result



# ==================== APP SETUP ====================

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
