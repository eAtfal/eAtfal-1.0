from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from app.models.user import UserRole
from app.schemas.base import BaseSchema
from datetime import datetime

class UserBase(BaseSchema):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    role: Optional[str] = Field(None, description="User role (admin, instructor, or student)")

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    role: Optional[UserRole] = Field(default=UserRole.STUDENT)

    @validator("password")
    def validate_password(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    password: Optional[str] = Field(None, min_length=8)

class UserInDBBase(UserBase):
    id: int
    role: UserRole
    created_at: datetime

class UserInDB(UserInDBBase):
    hashed_password: str

class User(UserInDBBase):
    pass

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

class TokenPayload(BaseModel):
    sub: str
    exp: Optional[int] = None
