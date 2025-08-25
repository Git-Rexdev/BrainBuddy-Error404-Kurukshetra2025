from datetime import datetime, timezone
import os, re
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pymongo import MongoClient
from services.auth_service import decode_token, get_user_by_username
from services.llm_client import flash_25

router = APIRouter()

class ChatRequest(BaseModel):
    question: str

EDU_KEYWORDS = {
    "math","mathematics","algebra","geometry","calculus","trigonometry","probability","statistics",
    "science","physics","chemistry","biology","geology","astronomy",
    "english","grammar","vocabulary","literature","writing","essay","reading","comprehension",
    "history","civics","geography","economics","political","social studies","socialstudies",
    "computer","coding","programming","python","java","c++","algorithms","data structures",
    "study","exam","test","homework","assignment","syllabus","curriculum","revision","notes"
}
EXPLICIT_PATTERNS = re.compile(
    r"\b(18\+|16\+|nsfw|porn|sex|sexual|nude|naked|erotic|fetish|bdsm|incest|rape|bestiality|onlyfans|boobs|penis|vagina|semen|cum|anal|oral|blowjob|handjob|hookup|escort)\b",
    re.IGNORECASE
)

def _extract_token(request: Request) -> str:
    qtok = request.query_params.get("access_token")
    if qtok:
        t = qtok.strip().strip('"').strip("'")
        if t.count(".") == 2:
            return t
    hdr = (request.headers.get("Authorization") or "").strip()
    if not hdr:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    lower = hdr.lower()
    if lower.startswith("bearer ") or lower.startswith("jwt "):
        token = hdr.split(None, 1)[1].strip()
    elif lower.startswith("bearer:"):
        token = hdr.split(":", 1)[1].strip()
    elif "token=" in lower:
        token = hdr.split("=", 1)[1].strip()
    else:
        token = hdr.strip()
    token = token.strip().strip('"').strip("'")
    if token.count(".") != 2:
        raise HTTPException(status_code=401, detail="Invalid token")
    return token

async def _user_from_bearer(request: Request) -> tuple[Optional[str], Optional[str], Optional[str]]:
    token = _extract_token(request)
    try:
        payload = decode_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
    user_id = payload.get("userId") or payload.get("user_id") or payload.get("userid")
    username = payload.get("sub") or payload.get("username") or payload.get("email")
    full_name = None
    if username:
        user_doc = await get_user_by_username(username)
        if user_doc:
            full_name = user_doc.get("full_name") or user_doc.get("name")
    return user_id, full_name, username

def _get_db_and_logs(request: Request):
    db = getattr(request.app.state, "db", None)
    logs = getattr(request.app.state, "logs_col", None)
    if db is not None and logs is not None:
        return db, logs
    uri = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
    dbname = os.getenv("DB_NAME", "brainbuddy")
    client = MongoClient(uri, connect=True)
    request.app.state.db = client[dbname]
    request.app.state.logs_col = request.app.state.db["activity_logs"]
    return request.app.state.db, request.app.state.logs_col

def _ensure_storage(request: Request) -> Path:
    root = getattr(request.app.state, "storage_root", None)
    if root is not None:
        return root
    p = Path(os.getenv("STORAGE_ROOT", "./uploads")).resolve()
    (p / "images").mkdir(parents=True, exist_ok=True)
    (p / "pdfs").mkdir(parents=True, exist_ok=True)
    request.app.state.storage_root = p
    return p

def _is_educational(q: str) -> bool:
    t = q.lower()
    if EXPLICIT_PATTERNS.search(t):
        return False
    hits = sum(1 for w in EDU_KEYWORDS if w in t)
    return hits >= 1

@router.post("/chat")
async def edu_chat(request: Request, body: ChatRequest):
    user_id, name, _ = await _user_from_bearer(request)
    db, logs = _get_db_and_logs(request)
    _ensure_storage(request)
    q = (body.question or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="question is required")
    if not _is_educational(q):
        logs.insert_one({
            "user_id": user_id,
            "name": name,
            "data": {"type": "edu_chat", "question": q},
            "output": {"refused": True, "reason": "non-educational or explicit"},
            "datetime": datetime.now(timezone.utc).isoformat(),
        })
        return JSONResponse(status_code=400, content={"detail": "This chatbot only answers education-related, non-explicit questions."})
    system = (
        "You are an education-only tutor. Answer briefly and clearly for a school audience. "
        "Refuse anything unrelated to school subjects, study skills, or learning help."
    )
    prompt = f"{system}\n\nQuestion: {q}\n\nAnswer:"
    try:
        resp = flash_25.generate_content(prompt)
        answer = (getattr(resp, 'text', None) or str(resp)).strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"model_error: {e}")
    logs.insert_one({
        "user_id": user_id,
        "name": name,
        "data": {"type": "edu_chat", "question": q},
        "output": {"answer": answer},
        "datetime": datetime.now(timezone.utc).isoformat(),
    })
    return {"answer": answer}
