from datetime import datetime, timezone
import os
from typing import Optional
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from pymongo import MongoClient
from services.auth_service import decode_token, get_user_by_username
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser

router = APIRouter()

class TutorRequest(BaseModel):
    subject: str
    question: str

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

llm = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "gpt-4o-mini-2024-07-18"),
    temperature=0.2,
    max_tokens=300,
    api_key=os.getenv("OPENAI_API_KEY"),
)
parser = StrOutputParser()
TUTOR_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a helpful {subject} tutor.
Your job:
1) Understand the learner’s question.
2) Solve it step-by-step with clear reasoning.
3) State the final answer clearly.
4) Give a brief recap and 1–2 practice questions.

Rules:
- Use simple language appropriate for a maximum 10 grade student.
- If key info is missing, ask a brief clarifying question first, otherwise make a reasonable assumption and say it.
- Use Markdown with short sections and numbered steps.
- For math/science, show formulas where helpful (LaTeX allowed).
- Keep the explanation focused and avoid extra fluff.
"""),
    ("human", """Subject: {subject}
Question: {question}

Respond using this structure:

### Understanding
(brief restatement + plan)

### Step-by-step Solution
(1. … 2. … 3. …)

### Final Answer
(clearly boxed or highlighted)
""")
])
chain = TUTOR_PROMPT | llm | parser
CHAT_HISTORY: dict[str, list[dict[str, str]]] = {}

@router.post("/ask")
async def ask_tutor(request: Request, payload: TutorRequest, conversation_id: str = "default"):
    user_id, name, _ = await _user_from_bearer(request)
    db, logs = _get_db_and_logs(request)
    _ensure_storage(request)
    if conversation_id not in CHAT_HISTORY:
        CHAT_HISTORY[conversation_id] = []
    CHAT_HISTORY[conversation_id].append({"role": "human", "message": payload.question})
    resp = chain.invoke({"subject": payload.subject, "question": payload.question})
    CHAT_HISTORY[conversation_id].append({"role": "ai", "message": resp})
    logs.insert_one({
        "user_id": user_id,
        "name": name,
        "data": {"type": "tutor", "subject": payload.subject, "question": payload.question, "conversation_id": conversation_id},
        "output": {"response": resp},
        "datetime": datetime.now(timezone.utc).isoformat(),
    })
    return {"response": resp, "chat_history": CHAT_HISTORY[conversation_id]}
