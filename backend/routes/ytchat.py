import os, re, asyncio
from datetime import datetime, timezone
from typing import Optional
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from pymongo import MongoClient
from services.auth_service import decode_token, get_user_by_username
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import OpenAIEmbeddings
from langchain_core.runnables import RunnableParallel, RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

router = APIRouter()

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.3)
embeddings = OpenAIEmbeddings(model='text-embedding-3-small')
CHAIN_CACHE = {}

class LoadVideoRequest(BaseModel):
    video_url: str

class AskQuestionRequest(BaseModel):
    video_id: str
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
    uri = os.getenv("MONGODB_URI")
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

def _get_video_id(url: str) -> Optional[str]:
    m = re.search(r"v=([^&]+)", url)
    if m: return m.group(1)
    m = re.search(r"youtu\.be/([^?]+)", url)
    if m: return m.group(1)
    return None

def _get_transcript(video_id: str) -> str:
    try:
        fetched = YouTubeTranscriptApi().fetch(video_id, languages=["en"])
        data = fetched.to_raw_data()
        return " ".join(chunk["text"] for chunk in data)
    except TranscriptsDisabled:
        raise HTTPException(status_code=400, detail="Transcripts are disabled for this video.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch transcript: {e}")

def _is_study_related(transcript: str) -> bool:
    snippet = transcript[:2000]
    prompt = f'You are a content classifier. Classify if the text is educational/study-related content for students preparing for school subjects. Respond with only "YES" or "NO".\n\nTEXT: "{snippet}"\n\nAnswer:'
    try:
        resp = llm.invoke(prompt)
        ans = resp.content if hasattr(resp, "content") else str(resp)
        return "YES" in ans.upper()
    except Exception:
        return False

def _create_rag_chain(transcript: str):
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = splitter.create_documents([transcript])
    if not chunks:
        return None
    vs = FAISS.from_documents(chunks, embeddings)
    retriever = vs.as_retriever(search_type="similarity", search_kwargs={"k": 4})
    prompt_template = """
You are a helpful assistant.
Answer the user's question based only on the following context.
If the context does not contain the answer, say you don't know.

Context:
{context}

Question:
{question}
"""
    prompt = PromptTemplate(template=prompt_template, input_variables=["context", "question"])
    def _fmt(docs): return "\n\n".join(doc.page_content for doc in docs)
    return RunnableParallel({"context": retriever | _fmt, "question": RunnablePassthrough()}) | prompt | llm | StrOutputParser()

@router.post("/load")
async def load_video(request: Request, body: LoadVideoRequest):
    user_id, name, _ = await _user_from_bearer(request)
    db, logs = _get_db_and_logs(request)
    _ensure_storage(request)
    vid = _get_video_id(body.video_url)
    if not vid:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    if vid in CHAIN_CACHE:
        logs.insert_one({
            "user_id": user_id,
            "name": name,
            "data": {"type": "yt_chat", "action": "load_video", "video_id": vid, "url": body.video_url, "cached": True},
            "output": {"status": "ready"},
            "datetime": datetime.now(timezone.utc).isoformat(),
        })
        return {"status": "success", "video_id": vid, "message": "Video already loaded and ready."}
    transcript = await asyncio.to_thread(_get_transcript, vid)
    ok = await asyncio.to_thread(_is_study_related, transcript)
    if not ok:
        raise HTTPException(status_code=400, detail="This video is not study-related")
    chain = await asyncio.to_thread(_create_rag_chain, transcript)
    if not chain:
        raise HTTPException(status_code=500, detail="Failed to process transcript")
    CHAIN_CACHE[vid] = chain
    logs.insert_one({
        "user_id": user_id,
        "name": name,
        "data": {"type": "yt_chat", "action": "load_video", "video_id": vid, "url": body.video_url, "cached": False},
        "output": {"status": "ready"},
        "datetime": datetime.now(timezone.utc).isoformat(),
    })
    return {"status": "success", "video_id": vid, "message": "Video processed and is ready for questions."}

@router.post("/ask")
async def ask_question(request: Request, body: AskQuestionRequest):
    user_id, name, _ = await _user_from_bearer(request)
    db, logs = _get_db_and_logs(request)
    if body.video_id not in CHAIN_CACHE:
        raise HTTPException(status_code=404, detail="Video not loaded")
    chain = CHAIN_CACHE[body.video_id]
    agg = []
    async def gen():
        async for chunk in chain.astream(body.question):
            s = str(chunk)
            agg.append(s)
            yield s
        try:
            logs.insert_one({
                "user_id": user_id,
                "name": name,
                "data": {"type": "yt_chat", "action": "ask_question", "video_id": body.video_id, "question": body.question},
                "output": {"answer": "".join(agg)[:5000]},
                "datetime": datetime.now(timezone.utc).isoformat(),
            })
        except Exception:
            pass
    return StreamingResponse(gen(), media_type="text/plain")
