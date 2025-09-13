from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.exc import IntegrityError
from app.api.deps import get_db, get_current_active_user
from app.models.enrollment import Enrollment
from app.models.lesson_completion import LessonCompletion
from app.api.role_checker import RoleChecker
from app.models.user import User, UserRole
from app.schemas.user import User as UserSchema, UserCreate, UserUpdate

router = APIRouter(tags=["users"])

@router.get("/users", response_model=List[UserSchema])
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    allowed: Annotated[bool, Depends(RoleChecker([UserRole.ADMIN]))]
) -> List[User]:
    result = await db.execute(select(User))
    return result.scalars().all()


@router.get("/users/{user_id}", response_model=UserSchema)
async def get_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    user_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    allowed: Annotated[bool, Depends(RoleChecker([UserRole.ADMIN]))]
) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/users", response_model=UserSchema)
async def create_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    user_in: UserCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    allowed: Annotated[bool, Depends(RoleChecker([UserRole.ADMIN]))]
) -> User:
    # Validate uniqueness
    existing = await db.execute(select(User).where(User.email == user_in.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A user with this email already exists.")

    from app.core.security import get_password_hash

    # Normalize role input (accept enum or string like 'STUDENT'/'student')
    try:
        if user_in.role is None:
            role = UserRole.STUDENT
        elif isinstance(user_in.role, UserRole):
            role = user_in.role
        else:
            role = UserRole(str(user_in.role).lower())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role value: {user_in.role}")

    db_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role=role
    )

    db.add(db_user)
    try:
        await db.commit()
        await db.refresh(db_user)
        return db_user
    except IntegrityError as ie:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database integrity error; possibly duplicate data.")
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/users/{user_id}", response_model=UserSchema)
async def update_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    user_id: int,
    user_in: UserUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    allowed: Annotated[bool, Depends(RoleChecker([UserRole.ADMIN]))]
) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_in.model_dump(exclude_unset=True)

    # Handle password update separately
    if "password" in update_data and update_data.get("password"):
        from app.core.security import get_password_hash
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))

    # Handle role update (accept enum or string)
    if "role" in update_data:
        try:
            raw = update_data["role"]
            if isinstance(raw, UserRole):
                update_data["role"] = raw
            else:
                update_data["role"] = UserRole(str(raw).lower())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid role value: {update_data['role']}")

    # If email is changing, ensure new email is unique
    if "email" in update_data and update_data["email"] != user.email:
        existing = await db.execute(select(User).where(User.email == update_data["email"]))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="A user with this email already exists.")

    try:
        for field, value in update_data.items():
            setattr(user, field, value)

        await db.commit()
        await db.refresh(user)
        return user
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database integrity error; possibly duplicate data.")
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/users/{user_id}")
async def delete_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    user_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    allowed: Annotated[bool, Depends(RoleChecker([UserRole.ADMIN]))]
) -> dict:
    # Prevent deleting yourself
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        # Delete all enrollments first
        await db.execute(delete(Enrollment).where(Enrollment.user_id == user_id))

        # Delete lesson completions belonging to the user to avoid FK nullification
        await db.execute(delete(LessonCompletion).where(LessonCompletion.user_id == user_id))

        # Now delete the user
        await db.delete(user)
        await db.commit()

        return {"ok": True}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))