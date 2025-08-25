import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

import certifi
from bson import ObjectId
from dotenv import load_dotenv
from jose import jwt, JWTError
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from passlib.context import CryptContext
from passlib.exc import UnknownHashError
from typing_extensions import Annotated
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from uuid import uuid4

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME")
JWT_SECRET = os.getenv("SECRET_KEY")
JWT_ALG = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

_client = AsyncIOMotorClient(MONGO_URI, tlsCAFile=certifi.where()) if MONGO_URI.startswith("mongodb+srv") else AsyncIOMotorClient(MONGO_URI)
db: AsyncIOMotorDatabase = _client[DB_NAME]
users_coll = db.get_collection("users")
counters_coll = db.get_collection("counters")
student_links_coll = db.get_collection("student_links")

pwd_context = CryptContext(
    schemes=["bcrypt", "pbkdf2_sha256", "argon2", "sha256_crypt"],
    deprecated="auto",
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed or not isinstance(hashed, str):
        return False
    try:
        return pwd_context.verify(plain, hashed)
    except UnknownHashError:
        return False


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=6, max_length=128)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None


class UserUpdateSelf(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None


class UserAdminUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    isActive: Optional[bool] = None
    roles: Optional[List[str]] = None


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    userId: str
    username: str
    full_name: str
    email: str
    createdAt: datetime
    updatedAt: datetime
    isActive: bool = True
    roles: List[str] = []


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- INPUT/OUTPUT for student link ----------
ClassStd = Annotated[int, Field(ge=5, le=10)]  # 5..10 inclusive

class StudentEmailLinkIn(BaseModel):
    email: EmailStr
    class_std: ClassStd

class StudentEmailLinkOut(BaseModel):
    id: str
    userId: str
    full_name: str
    email: EmailStr
    class_std: int
    createdAt: datetime
    updatedAt: datetime
# -------------------------------------------------


async def _next_series_value(series_name: str = "user_series") -> int:
    res = await counters_coll.find_one_and_update(
        {"_id": series_name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return res["seq"]


def _coerce_dt(val: Any, fallback: Optional[datetime] = None) -> datetime:
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except Exception:
            pass
    return fallback or datetime.utcnow()


def _doc_to_public(doc: Dict[str, Any]) -> Dict[str, Any]:
    _id = doc.get("_id") or doc.get("id")
    created = doc.get("createdAt") or doc.get("created_at")
    if not created and isinstance(_id, ObjectId):
        created = getattr(_id, "generation_time", None)
    created = _coerce_dt(created, datetime.utcnow())
    updated = _coerce_dt(doc.get("updatedAt") or doc.get("updated_at") or created, created)
    user_id = doc.get("userId") or doc.get("user_id") or ""
    username = doc.get("username") or ""
    full_name = doc.get("full_name") or doc.get("name") or ""
    email = doc.get("email") or ""
    roles = doc.get("roles")
    if not roles:
        role_single = doc.get("role")
        roles = [str(role_single)] if role_single else []
    if "isActive" in doc:
        is_active = bool(doc.get("isActive"))
    else:
        is_active = not bool(doc.get("disabled", False))
    return {
        "id": str(_id) if _id else "",
        "userId": user_id,
        "username": username,
        "full_name": full_name,
        "email": email,
        "createdAt": created,
        "updatedAt": updated,
        "isActive": is_active,
        "roles": roles or [],
    }


def _ensure_indexes_started():
    users_coll.create_index("username", unique=True)
    users_coll.create_index("userId", unique=True)
    users_coll.create_index("user_id", unique=True)
    student_links_coll.create_index("userId", unique=True)
    student_links_coll.create_index("email")

_ensure_indexes_started()


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}")


def issue_access_token_for_user(user_doc: Dict[str, Any]) -> str:
    payload = {
        "sub": user_doc.get("username"),
        "userId": user_doc.get("userId"),
    }
    return create_access_token(payload)


async def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    return await users_coll.find_one({"username": username})


async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    try:
        oid = ObjectId(user_id)
    except Exception:
        return None
    return await users_coll.find_one({"_id": oid})


async def create_user(payload: UserCreate) -> Dict[str, Any]:
    existing_username = await users_coll.find_one({"username": payload.username})
    if existing_username:
        raise ValueError("Username already exists")
    existing_email = await users_coll.find_one({"email": payload.email})
    if existing_email:
        raise ValueError("Email already exists")
    now = datetime.utcnow()
    user_doc = {
        "username": payload.username,
        "hashed_password": hash_password(payload.password),
        "email": payload.email or "",
        "full_name": payload.full_name or "",
        "userId": str(uuid4()),
        "createdAt": now,
        "updatedAt": now,
        "isActive": True,
        "roles": ["user"],
    }
    ins = await users_coll.insert_one(user_doc)
    user_doc["_id"] = ins.inserted_id
    return _doc_to_public(user_doc)

async def list_users() -> List[Dict[str, Any]]:
    cur = users_coll.find({})
    users: List[Dict[str, Any]] = []
    async for doc in cur:
        users.append(_doc_to_public(doc))
    return users


async def update_me(username: str, payload: UserUpdateSelf) -> Dict[str, Any]:
    updates: Dict[str, Any] = {}
    if payload.email is not None:
        updates["email"] = payload.email
    if payload.full_name is not None:
        updates["full_name"] = payload.full_name
    if not updates:
        doc = await get_user_by_username(username)
        if not doc:
            raise ValueError("User not found")
        return _doc_to_public(doc)
    updates["updatedAt"] = datetime.utcnow()
    res = await users_coll.find_one_and_update(
        {"username": username},
        {"$set": updates},
        return_document=True,
    )
    if not res:
        raise ValueError("User not found")
    return _doc_to_public(res)

async def admin_update_user(user_id: str, payload: UserAdminUpdate) -> Dict[str, Any]:
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise ValueError("Invalid user id")
    updates: Dict[str, Any] = {}
    if payload.email is not None:
        updates["email"] = payload.email
    if payload.full_name is not None:
        updates["full_name"] = payload.full_name
    if payload.isActive is not None:
        updates["isActive"] = bool(payload.isActive)
    if payload.roles is not None:
        updates["roles"] = [str(r) for r in payload.roles]
    if not updates:
        doc = await users_coll.find_one({"_id": oid})
        if not doc:
            raise ValueError("User not found")
        return _doc_to_public(doc)
    updates["updatedAt"] = datetime.utcnow()
    res = await users_coll.find_one_and_update(
        {"_id": oid},
        {"$set": updates},
        return_document=True,
    )
    if not res:
        raise ValueError("User not found")
    return _doc_to_public(res)

async def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    doc = await users_coll.find_one({"username": username})
    if not doc:
        return None
    stored = doc.get("hashed_password", "")
    if verify_password(password, stored):
        if pwd_context.needs_update(stored):
            new_hash = hash_password(password)
            await users_coll.update_one({"_id": doc["_id"]}, {"$set": {"hashed_password": new_hash}})
        return _doc_to_public(doc)
    if stored and stored == password:
        new_hash = hash_password(password)
        await users_coll.update_one({"_id": doc["_id"]}, {"$set": {"hashed_password": new_hash}})
        doc = await users_coll.find_one({"_id": doc["_id"]})
        return _doc_to_public(doc)
    return None

async def ping() -> bool:
    try:
        await db.command("ping")
        return True
    except Exception:
        return False

# -------- store email + class_std for student link --------
async def link_student_email_for_user(username: str, email: str, class_std: int) -> Dict[str, Any]:
    # defense in depth (Pydantic already validates)
    if not isinstance(class_std, int) or not (5 <= class_std <= 10):
        raise ValueError("class_std must be an integer between 5 and 10")

    user_doc = await get_user_by_username(username)
    if not user_doc:
        raise ValueError("User not found")

    now = datetime.utcnow()
    user_id = user_doc.get("userId") or user_doc.get("user_id") or ""
    full_name = user_doc.get("full_name") or user_doc.get("name") or ""

    res = await student_links_coll.find_one_and_update(
        {"userId": user_id},
        {
            "$setOnInsert": {"createdAt": now},
            "$set": {
                "email": email,
                "class_std": class_std,
                "full_name": full_name,
                "userId": user_id,
                "updatedAt": now,
            },
        },
        upsert=True,
        return_document=True,
    )

    return {
        "id": str(res.get("_id")) if res and res.get("_id") else "",
        "userId": user_id,
        "full_name": full_name,
        "email": email,
        "class_std": class_std,
        "createdAt": res.get("createdAt", now) if res else now,
        "updatedAt": res.get("updatedAt", now) if res else now,
    }


async def get_linked_email_for_username(username: str) -> Optional[str]:
    user_doc = await get_user_by_username(username)
    if not user_doc:
        return None
    user_id = user_doc.get("userId") or user_doc.get("user_id") or ""
    if not user_id:
        return None
    link = await student_links_coll.find_one({"userId": user_id})
    if not link:
        return None
    return link.get("email") or None
