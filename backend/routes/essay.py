from datetime import datetime, timezone
import os
from fastapi import APIRouter, HTTPException, Request
from pymongo import MongoClient
from pathlib import Path
from models.essay_models import EssayRequest, EssayResponse
from services.essay_service import predict_score_and_explain
from services.auth_service import decode_token, get_user_by_username

router = APIRouter()

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

async def _user_from_bearer(request: Request) -> tuple[str | None, str | None]:
    token = _extract_token(request)
    try:
        payload = decode_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
    user_id = payload.get("userId")
    username = payload.get("sub")
    full_name = None
    if username:
        user_doc = await get_user_by_username(username)
        if user_doc:
            full_name = user_doc.get("full_name") or user_doc.get("name")
    return user_id, full_name

def _get_logs_col(request: Request):
    logs = getattr(request.app.state, "logs_col", None)
    if logs is not None:
        return logs
    uri = os.getenv("MONGODB_URI")
    dbname = os.getenv("DB_NAME", "brainbuddy")
    client = MongoClient(uri, connect=True)
    request.app.state.db = client[dbname]
    request.app.state.logs_col = request.app.state.db["activity_logs"]
    return request.app.state.logs_col

def _get_storage_root(request: Request) -> Path:
    root = getattr(request.app.state, "storage_root", None)
    if root is not None:
        return root
    p = Path(os.getenv("STORAGE_ROOT", "./uploads")).resolve()
    (p / "images").mkdir(parents=True, exist_ok=True)
    (p / "pdfs").mkdir(parents=True, exist_ok=True)
    request.app.state.storage_root = p
    return p

@router.post("/analyze", response_model=EssayResponse)
async def analyze_essay(request: Request, payload: EssayRequest):
    essay = (payload.essay or "").strip()
    if not essay:
        raise HTTPException(status_code=400, detail="Essay text is required.")
    user_id, name = await _user_from_bearer(request)
    result = predict_score_and_explain(essay)
    logs = _get_logs_col(request)
    _get_storage_root(request)
    logs.insert_one({
        "user_id": user_id,
        "name": name,
        "data": {"type": "essay", "text": essay},
        "output": {
            "predicted_score": result["predicted_score"],
            "explanation": result["explanation"],
        },
        "datetime": datetime.now(timezone.utc).isoformat(),
    })
    return result
