from datetime import datetime, timezone
import os
from typing import Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from pymongo import MongoClient
from pathlib import Path
from services.auth_service import decode_token, get_user_by_username
from services.llm_client import flash_25

router = APIRouter()

class StudyPlanRequest(BaseModel):
    subject: str

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

async def _user_from_bearer(request: Request) -> tuple[Optional[str], Optional[str], Optional[str], Optional[int]]:
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
    class_from_token = None
    try:
        v = payload.get("classStd") or payload.get("class_std") or payload.get("grade")
        if v is not None:
            import re
            m = re.search(r"\d+", str(v))
            if m:
                class_from_token = int(m.group())
    except Exception:
        pass
    return user_id, full_name, username, class_from_token

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

def _fetch_class_std(db, user_id: Optional[str], username: Optional[str], token_class: Optional[int]) -> int:
    if token_class is not None:
        return token_class
    or_terms = []
    if user_id:
        or_terms += [
            {"user_id": user_id},
            {"userId": user_id},
            {"userid": user_id},
            {"linked_user_id": user_id},
        ]
    if username:
        or_terms += [
            {"username": username},
            {"user_name": username},
            {"email": username},
        ]
    if not or_terms:
        raise HTTPException(status_code=400, detail="no user identity")
    doc = db["student_links"].find_one({"$or": or_terms})
    if not doc:
        raise HTTPException(status_code=404, detail="student link not found")
    val = (
        doc.get("class_std")
        or doc.get("classStd")
        or doc.get("class")
        or doc.get("grade_level")
        or doc.get("grade")
        or doc.get("std")
    )
    if val is None:
        raise HTTPException(status_code=400, detail="class_std missing")
    try:
        import re
        m = re.search(r"\d+", str(val))
        if not m:
            raise ValueError("no digit")
        return int(m.group())
    except Exception:
        raise HTTPException(status_code=400, detail="invalid class_std")

def _validate_subject(subject: str, class_std: int) -> str:
    s = subject.strip().lower()
    group = {"english", "maths", "science", "socialstudies", "social studies", "coding"}
    if (5 <= class_std <= 7 or 8 <= class_std <= 10) and s in group:
        return "socialstudies" if s == "social studies" else s
    raise HTTPException(status_code=400, detail="invalid subject for class_std")

def _make_plan(class_std: int, subject: str) -> str:
    prompt = f"""
Generate a 4-week study plan for a student in class {class_std} for the subject "{subject}".
Constraints:
- 6 days per week, 60–90 minutes per day.
- Mix concept learning, worked examples, active recall, spaced revision, and weekly mini-tests.
- Use simple language for the student's level.
- Output format:
Week 1:
- Day 1: ...
- Day 2: ...
Week 2:
Week 3:
Week 4:
Tailor the topics to class {class_std} {subject}.
"""
    resp = flash_25.generate_content(prompt)
    return (resp.text or "").strip()

@router.post("/plan")
async def make_study_plan(request: Request, body: StudyPlanRequest):
    user_id, name, username, token_class = await _user_from_bearer(request)
    db, logs = _get_db_and_logs(request)
    _ensure_storage(request)
    class_std = _fetch_class_std(db, user_id, username, token_class)
    subject = _validate_subject(body.subject, class_std)
    plan = _make_plan(class_std, subject)
    if not plan:
        raise HTTPException(status_code=500, detail="plan generation failed")
    logs.insert_one({
        "user_id": user_id,
        "name": name,
        "data": {"type": "study_plan", "subject": subject, "class_std": class_std},
        "output": {"plan": plan},
        "datetime": datetime.now(timezone.utc).isoformat(),
    })
    return {"class_std": class_std, "subject": subject, "plan": plan}
