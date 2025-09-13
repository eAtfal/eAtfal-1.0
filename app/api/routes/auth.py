from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import create_access_token, verify_password, get_password_hash
from app.core.config import settings
from app.db.base import get_db
from app.models.user import User, UserRole
from app.schemas.user import User as UserSchema, UserCreate, Token
from app.api.deps import get_current_active_user

router = APIRouter(tags=["auth"])

@router.post("/login", response_model=Token)
async def login(
    db: Annotated[AsyncSession, Depends(get_db)],
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Token:
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.full_name,
            "role": user.role.value,
            "is_admin": user.role == UserRole.ADMIN
        }
    }

@router.post("/register", response_model=Token)
async def register(
    db: Annotated[AsyncSession, Depends(get_db)],
    email: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...)
):
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists."
        )
    
    db_user = User(
        email=email,
        full_name=full_name,
        hashed_password=get_password_hash(password),
        role=UserRole.STUDENT
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(db_user.id), expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "name": db_user.full_name,
            "is_admin": db_user.role == UserRole.ADMIN
        }
    }

@router.get("/me")
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.full_name,
        "is_admin": current_user.role == UserRole.ADMIN
    }
