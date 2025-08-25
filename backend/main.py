import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pymongo import MongoClient

from routes.auth import router as auth_router
from routes.doubt import router as doubt_router
from routes.essay import router as essay_router
from routes.notes import router as notes_router
from routes.study import router as study_router
from routes.ytchat import router as ytchat_router
from routes.aitutor import router as aitutor_router
from routes.educhat import router as edu_router

load_dotenv()

API_TITLE = "BrainBuddy AIO API"
API_DESC = "All models & Functions under 1 API"
API_VERSION = "3.7.5"
API_PREFIX = os.getenv("API_PREFIX", "").rstrip("/")

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME   = os.getenv("DB_NAME")
STORAGE_ROOT = Path(os.getenv("STORAGE_ROOT", "storage")).resolve()

def _cors_origins() -> list[str]:
    raw = os.getenv("CORS_ALLOW_ORIGINS", "*")
    return [o.strip() for o in raw.split(",")] if raw else ["*"]

app = FastAPI(title=API_TITLE, version=API_VERSION, description=API_DESC)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def _startup():
    client = MongoClient(MONGO_URI, connect=True)
    app.state.db = client[DB_NAME]
    app.state.logs_col = app.state.db["activity_logs"]

    (STORAGE_ROOT / "images").mkdir(parents=True, exist_ok=True)
    (STORAGE_ROOT / "pdfs").mkdir(parents=True, exist_ok=True)
    app.state.storage_root = STORAGE_ROOT

app.include_router(auth_router,  prefix=f"{API_PREFIX}/auth",  tags=["Auth"])
app.include_router(doubt_router, prefix=f"{API_PREFIX}/doubt", tags=["Doubt Solver"])
app.include_router(essay_router, prefix=f"{API_PREFIX}/essay", tags=["Essay Grader"])
app.include_router(notes_router, prefix=f"{API_PREFIX}/notes", tags=["Notes Summarizer"])
app.include_router(study_router, prefix=f"{API_PREFIX}/study", tags=["Study Planner"])
app.include_router(ytchat_router, prefix=f"{API_PREFIX}/ytchat", tags=["YouTube Transcript Generator"])
app.include_router(aitutor_router, prefix=f"{API_PREFIX}/aitutor", tags=["AI Powered Adaptive Tutor"])
app.include_router(edu_router, prefix=f"{API_PREFIX}/educhat", tags=["Edu Chat"])

@app.get(f"{API_PREFIX or ''}/")
def root():
    return {
        "status": "ok",
        "title": API_TITLE,
        "version": API_VERSION,
        "routes": {
            "auth":  f"{API_PREFIX}/auth",
            "doubt": f"{API_PREFIX}/doubt/solve",
            "essay": f"{API_PREFIX}/essay/analyze",
            "notes": f"{API_PREFIX}/notes/summarize",
            "study": f"{API_PREFIX}/study/plan",
            "ytchat": f"{API_PREFIX}/ytchat/load",
            "ytchat": f"{API_PREFIX}/ytchat/ask",
            "aitutor":f"{API_PREFIX}/aitutor/ask",
            "educhat":f"{API_PREFIX}/educhat/chat",
            "health": f"{API_PREFIX}/healthz"
        },
    }

@app.get(f"{API_PREFIX}/healthz")
def healthz():
    return {"status": "healthy"}
