from datetime import datetime, timezone
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import JSONResponse
from services.doc_extract import extract_text_from_pdf_bytes, extract_text_from_docx_bytes
from services.notes_service import summarize_text
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

@router.post("/summarize")
async def summarize(request: Request, file: UploadFile = File(...)):
    user_id, name = await _user_from_bearer(request)
    raw = await file.read()
    storage_root: Path = request.app.state.storage_root
    pdfs_dir = storage_root / "pdfs"
    ext = ("." + file.filename.split(".")[-1].lower()) if "." in file.filename else ""
    new_name = f"{uuid.uuid4().hex}{ext}"
    final_path = pdfs_dir / new_name
    with open(final_path, "wb") as f:
        f.write(raw)
    lower = file.filename.lower()
    if lower.endswith(".pdf"):
        text = extract_text_from_pdf_bytes(raw)
        dtype = "pdf"
    elif lower.endswith(".docx"):
        text = extract_text_from_docx_bytes(raw)
        dtype = "docx"
    else:
        raise HTTPException(status_code=400, detail="Only .pdf or .docx files are supported.")
    if not text or len(text) < 20:
        raise HTTPException(status_code=400, detail="Extracted text is too short or empty.")
    summary = summarize_text(text)
    request.app.state.logs_col.insert_one({
        "user_id": user_id,
        "name": name,
        "data": {"type": dtype, "filename": new_name, "path": str(final_path)},
        "output": {"summary": summary},
        "datetime": datetime.now(timezone.utc).isoformat(),
    })
    return JSONResponse({
        "filename": file.filename,
        "file": {"filename": new_name, "path": str(final_path)},
        "summary": summary,
    })
