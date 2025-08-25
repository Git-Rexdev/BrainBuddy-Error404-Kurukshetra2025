from typing import List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from services.auth_service import (
    UserCreate,
    UserUpdateSelf,
    UserAdminUpdate,
    UserPublic,
    TokenOut,
    create_user,
    authenticate_user,
    create_access_token,
    decode_token,
    list_users,
    update_me,
    admin_update_user,
    get_user_by_username,
    StudentEmailLinkIn,
    StudentEmailLinkOut,
    link_student_email_for_user,
    get_linked_email_for_username,
)

router = APIRouter(prefix="", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

def _doc_to_user_public(doc: Dict[str, Any]) -> Dict[str, Any]:
    from datetime import datetime
    from bson import ObjectId
    _id = doc.get("id") or doc.get("_id")
    if isinstance(_id, ObjectId):
        id_str = str(_id)
        gen_time = getattr(_id, "generation_time", None)
    else:
        id_str = str(_id) if _id else ""
        gen_time = None
    created = doc.get("createdAt") or doc.get("created_at") or gen_time or datetime.utcnow()
    updated = doc.get("updatedAt") or doc.get("updated_at") or created
    user_id = doc.get("userId") or doc.get("user_id") or ""
    full_name = doc.get("full_name") or doc.get("name") or ""
    roles = doc.get("roles")
    if not roles:
        single = doc.get("role")
        roles = [str(single)] if single else []
    if "isActive" in doc:
        is_active = bool(doc.get("isActive"))
    else:
        is_active = not bool(doc.get("disabled", False))
    return {
        "id": doc.get("id") or id_str,
        "userId": user_id,
        "username": doc.get("username") or "",
        "full_name": full_name,
        "email": doc.get("email") or "",
        "createdAt": created,
        "updatedAt": updated,
        "isActive": is_active,
        "roles": roles or [],
    }

def ensure_admin(user_doc: Dict[str, Any]) -> None:
    roles = user_doc.get("roles", []) or []
    if "admin" not in [str(r).lower() for r in roles]:
        raise HTTPException(status_code=403, detail="Admin access required")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    doc = await get_user_by_username(sub)
    if not doc:
        raise HTTPException(status_code=401, detail="User not found")
    if doc.get("isActive") is False or doc.get("disabled") is True:
        raise HTTPException(status_code=403, detail="User is inactive")
    return _doc_to_user_public(doc)

@router.post("/register", response_model=UserPublic)
async def register(payload: UserCreate):
    try:
        doc = await create_user(payload)
        return doc
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/token", response_model=TokenOut)
async def login(form: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form.username, form.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    token = create_access_token(data={"sub": user["username"], "userId": user["userId"]})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", response_model=UserPublic)
async def me(current: Dict[str, Any] = Depends(get_current_user)):
    linked = await get_linked_email_for_username(current["username"])
    if linked:
        current = {**current, "email": linked}
    return current

@router.put("/me", response_model=UserPublic)
async def me_update(payload: UserUpdateSelf, current: Dict[str, Any] = Depends(get_current_user)):
    updated = await update_me(current["username"], payload)
    return updated

@router.get("/users", response_model=List[UserPublic])
async def users_list(current: Dict[str, Any] = Depends(get_current_user)):
    ensure_admin(current)
    docs = await list_users()
    return docs

@router.put("/users/{user_id}", response_model=UserPublic)
async def users_update(user_id: str, payload: UserAdminUpdate, current: Dict[str, Any] = Depends(get_current_user)):
    ensure_admin(current)
    try:
        updated = await admin_update_user(user_id, payload)
        return updated
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() or "invalid user id" in str(e).lower() else 400
        raise HTTPException(status_code=status_code, detail=str(e))

@router.post("/students/link", response_model=StudentEmailLinkOut)
async def link_student_profile(payload: StudentEmailLinkIn, current: Dict[str, Any] = Depends(get_current_user)):

    try:
        doc = await link_student_email_for_user(
            current["username"],
            payload.email,
            payload.class_std,
        )
        return doc
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
