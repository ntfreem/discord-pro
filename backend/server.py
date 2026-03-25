from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
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
from datetime import datetime, timezone, timedelta
from pathlib import Path
import httpx

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

app = FastAPI()
api_router = APIRouter(prefix="/api")

llm_sessions: Dict[str, LlmChat] = {}
discord_task = None
discord_client_instance = None

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ==================== MODELS ====================

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

class ApproveBody(BaseModel):
    approved: bool = True

class DiscordConfigUpdate(BaseModel):
    bot_token: Optional[str] = None
    is_active: Optional[bool] = None


# ==================== HELPERS ====================

async def search_knowledge(query: str, limit: int = 5) -> str:
    try:
        results = await db.knowledge_sources.find(
            {"$text": {"$search": query}, "is_active": True},
            {"score": {"$meta": "textScore"}, "_id": 0}
        ).sort([("score", {"$meta": "textScore"})]).limit(limit).to_list(limit)

        if not results:
            results = await db.knowledge_sources.find(
                {"is_active": True}, {"_id": 0}
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


async def get_tone_examples_text(bot_config: dict = None) -> str:
    parts = []

    # 1. Manual tone examples (highest priority — directly crafted by admin)
    if bot_config:
        manual = bot_config.get("manual_tone_examples", []) or []
        for ex in manual[:3]:
            if ex.get("user_msg") and ex.get("bot_msg"):
                label = ex.get("label", "")
                header = f"[{label}]" if label else "[Crafted Example]"
                parts.append(f"{header}\nUSER: {ex['user_msg']}\nASSISTANT: {ex['bot_msg']}")

    # 2. Approved conversations from training
    try:
        examples = await db.conversations.find(
            {"is_approved_for_training": True}, {"messages": 1, "_id": 0}
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
            "formality level, and energy from these exchanges:\n\n"
            f"{tone_examples}"
        )
    elif tone_instructions:
        parts.append(f"COMMUNICATION STYLE:\n{tone_instructions}")

    if custom_instructions:
        parts.append(f"ADDITIONAL INSTRUCTIONS:\n{custom_instructions}")

    return "\n\n".join(parts)


async def call_claude(session_id: str, user_message: str, system_prompt: str) -> str:
    api_key = os.environ.get("EMERGENT_LLM_KEY", "")
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
                            platform: str = "web", metadata: dict = None):
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
            "messages": new_messages, "is_approved_for_training": False,
            "created_at": timestamp, "updated_at": timestamp,
            "metadata": metadata or {}
        })


# ==================== DISCORD BOT ====================

async def start_discord_bot(token: str):
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
                bot_config = await db.bot_config.find_one({}, {"_id": 0}) or {}
                knowledge = await search_knowledge(user_text)
                tone = await get_tone_examples_text(bot_config)
                system_prompt = build_system_prompt(bot_config, knowledge, tone)
                async with message.channel.typing():
                    response = await call_claude(session_id, user_text, system_prompt)
                await save_conversation(
                    session_id=session_id, user_message=user_text, bot_response=response,
                    platform="discord",
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
        await db.conversations.create_index([("session_id", 1)])
        await db.conversations.create_index([("created_at", -1)])
    except Exception as e:
        logger.warning(f"Index creation: {e}")

    if not await db.bot_config.find_one({}):
        await db.bot_config.insert_one({
            "name": "BotForge Assistant",
            "persona": "You are a helpful, friendly, and knowledgeable assistant. Provide clear, accurate answers based on available information. Be concise but thorough.",
            "custom_instructions": "",
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    discord_config = await db.discord_config.find_one({}, {"_id": 0})
    if discord_config and discord_config.get("bot_token") and discord_config.get("is_active"):
        discord_task = asyncio.create_task(start_discord_bot(discord_config["bot_token"]))


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


# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "BotForge API", "version": "1.0.0"}


# --- CHAT ---
@api_router.post("/chat/send")
async def send_chat_message(body: ChatMessage):
    session_id = body.session_id or str(uuid.uuid4())
    bot_config = await db.bot_config.find_one({}, {"_id": 0}) or {}
    knowledge = await search_knowledge(body.message)
    tone = await get_tone_examples_text(bot_config)
    system_prompt = build_system_prompt(bot_config, knowledge, tone)
    response = await call_claude(session_id, body.message, system_prompt)
    await save_conversation(session_id, body.message, response, platform="web")
    return {"response": response, "session_id": session_id}


@api_router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    conv = await db.conversations.find_one({"session_id": session_id}, {"_id": 0})
    return conv or {"messages": [], "session_id": session_id}


# --- BOT CONFIG ---
@api_router.get("/admin/bot-config")
async def get_bot_config():
    config = await db.bot_config.find_one({}, {"_id": 0})
    return config or {}


@api_router.put("/admin/bot-config")
async def update_bot_config(body: BotConfigUpdate):
    update_data = {}
    for k, v in body.dict().items():
        if v is not None:  # includes empty lists
            update_data[k] = v
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.bot_config.update_one({}, {"$set": update_data}, upsert=True)
    return await db.bot_config.find_one({}, {"_id": 0})


# --- KNOWLEDGE SOURCES ---
@api_router.get("/knowledge/sources")
async def get_knowledge_sources():
    sources = await db.knowledge_sources.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return sources


@api_router.post("/knowledge/sources/faq")
async def add_faq(entry: FAQEntry):
    doc = {
        "id": str(uuid.uuid4()), "type": "faq", "title": entry.title,
        "content": entry.content, "tags": entry.tags or [],
        "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.knowledge_sources.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.post("/knowledge/sources/url")
async def scrape_url_source(entry: URLEntry):
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as http:
            resp = await http.get(entry.url, headers={"User-Agent": "Mozilla/5.0 (BotForge/1.0)"})
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
            "content": text, "url": entry.url, "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.knowledge_sources.insert_one(doc)
        doc.pop("_id", None)
        return doc
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"URL scraping failed: {str(e)}")


@api_router.post("/knowledge/sources/upload")
async def upload_document(file: UploadFile = File(...), title: str = Form(...)):
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
            "content": text, "filename": filename, "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.knowledge_sources.insert_one(doc)
        doc.pop("_id", None)
        return doc
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/knowledge/sources/{source_id}")
async def delete_source(source_id: str):
    result = await db.knowledge_sources.delete_one({"id": source_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Source not found")
    return {"success": True}


@api_router.patch("/knowledge/sources/{source_id}/toggle")
async def toggle_source(source_id: str):
    source = await db.knowledge_sources.find_one({"id": source_id}, {"_id": 0})
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    new_status = not source.get("is_active", True)
    await db.knowledge_sources.update_one({"id": source_id}, {"$set": {"is_active": new_status}})
    return {"is_active": new_status}


# --- CONVERSATIONS ---
@api_router.get("/conversations")
async def get_conversations(platform: Optional[str] = None, approved: Optional[bool] = None,
                            page: int = 1, limit: int = 20):
    query = {}
    if platform:
        query["platform"] = platform
    if approved is not None:
        query["is_approved_for_training"] = approved
    skip = (page - 1) * limit
    total = await db.conversations.count_documents(query)
    convs = await db.conversations.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"conversations": convs, "total": total, "page": page, "limit": limit}


@api_router.get("/conversations/{session_id}")
async def get_conversation(session_id: str):
    conv = await db.conversations.find_one({"session_id": session_id}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Not found")
    return conv


@api_router.patch("/conversations/{session_id}/approve")
async def approve_conversation(session_id: str, body: ApproveBody):
    result = await db.conversations.update_one(
        {"session_id": session_id},
        {"$set": {"is_approved_for_training": body.approved}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"success": True, "is_approved_for_training": body.approved}


@api_router.delete("/conversations/{session_id}")
async def delete_conversation(session_id: str):
    llm_sessions.pop(session_id, None)
    result = await db.conversations.delete_one({"session_id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"success": True}


# --- ANALYTICS ---
@api_router.get("/analytics/overview")
async def analytics_overview():
    total_convs = await db.conversations.count_documents({})
    approved_training = await db.conversations.count_documents({"is_approved_for_training": True})
    knowledge_count = await db.knowledge_sources.count_documents({"is_active": True})
    pipeline = [
        {"$project": {"msg_count": {"$size": {"$ifNull": ["$messages", []]}}}},
        {"$group": {"_id": None, "total": {"$sum": "$msg_count"}}}
    ]
    msg_result = await db.conversations.aggregate(pipeline).to_list(1)
    total_messages = msg_result[0]["total"] if msg_result else 0
    web_count = await db.conversations.count_documents({"platform": "web"})
    discord_count = await db.conversations.count_documents({"platform": "discord"})
    return {
        "total_conversations": total_convs, "total_messages": total_messages,
        "approved_for_training": approved_training, "knowledge_sources": knowledge_count,
        "platform_breakdown": {"web": web_count, "discord": discord_count}
    }


@api_router.get("/analytics/daily")
async def analytics_daily():
    now = datetime.now(timezone.utc)
    days = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = await db.conversations.count_documents({
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        })
        pipeline = [
            {"$match": {"created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}}},
            {"$project": {"msg_count": {"$size": {"$ifNull": ["$messages", []]}}}},
            {"$group": {"_id": None, "total": {"$sum": "$msg_count"}}}
        ]
        msg_res = await db.conversations.aggregate(pipeline).to_list(1)
        msg_count = msg_res[0]["total"] if msg_res else 0
        days.append({"date": day_start.strftime("%m/%d"), "conversations": count, "messages": msg_count})
    return days


# --- DISCORD ---
@api_router.get("/discord/config")
async def get_discord_config():
    config = await db.discord_config.find_one({}, {"_id": 0})
    if config:
        token = config.get("bot_token", "")
        if token:
            config["bot_token_display"] = token[:8] + "..." + token[-4:] if len(token) > 12 else "***"
        config.pop("bot_token", None)
    return config or {"is_active": False}


@api_router.put("/discord/config")
async def update_discord_config(body: DiscordConfigUpdate):
    update = {k: v for k, v in body.dict().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.discord_config.update_one({}, {"$set": update}, upsert=True)
    return {"success": True}


@api_router.post("/discord/restart")
async def restart_discord_bot():
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
    config = await db.discord_config.find_one({}, {"_id": 0})
    if not config or not config.get("bot_token"):
        raise HTTPException(status_code=400, detail="Discord bot token not configured")
    discord_task = asyncio.create_task(start_discord_bot(config["bot_token"]))
    return {"success": True, "message": "Discord bot starting..."}


@api_router.get("/discord/status")
async def get_discord_status():
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
