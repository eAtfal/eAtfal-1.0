from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from app.api.deps import get_current_active_user
from app.api.role_checker import RoleChecker
from app.db.base import get_db
from app.models.user import User, UserRole
from app.models.course import Course
from app.models.lesson import Lesson
from app.models.enrollment import Enrollment
from app.schemas.lesson import (
    Lesson as LessonSchema,
    LessonCreate,
    LessonUpdate,
    LessonOrderUpdate
)

router = APIRouter()

@router.get("/{course_id}/lessons", response_model=List[LessonSchema])
async def list_course_lessons(
    db: Annotated[AsyncSession, Depends(get_db)],
    course_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)] = None
) -> List[Lesson]:
    # Check if course exists and is published
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check if user is enrolled or lesson is preview
    if not course.is_published and (current_user is None or (current_user.id != course.instructor_id and current_user.role != UserRole.ADMIN)):
        raise HTTPException(status_code=403, detail="Course not published")
    
    if current_user:
        result = await db.execute(
            select(Enrollment)
            .where(
                Enrollment.course_id == course_id,
                Enrollment.user_id == current_user.id
            )
        )
        enrollment = result.scalar_one_or_none()
        if not enrollment and current_user.id != course.instructor_id and current_user.role != UserRole.ADMIN:
            # Only return preview lessons for non-enrolled users
            query = select(Lesson).where(
                Lesson.course_id == course_id,
                Lesson.is_preview == True
            )
        else:
            query = select(Lesson).where(Lesson.course_id == course_id)
    else:
        query = select(Lesson).where(
            Lesson.course_id == course_id,
            Lesson.is_preview == True
        )
    
    query = query.order_by(Lesson.order_index)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/{course_id}/lessons", response_model=LessonSchema)
async def create_lesson(
    db: Annotated[AsyncSession, Depends(get_db)],
    course_id: int,
    lesson_in: LessonCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    allowed: Annotated[bool, Depends(RoleChecker([UserRole.ADMIN, UserRole.INSTRUCTOR]))]
) -> Lesson:
    # Check if course exists and user has permission
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if current_user.id != course.instructor_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Get the max order_index
    result = await db.execute(
        select(func.max(Lesson.order_index))
        .where(Lesson.course_id == course_id)
    )
    max_order = result.scalar_one_or_none() or -1
    
    # Create lesson with next order_index. Ensure we don't pass order_index twice
    lesson_data = lesson_in.model_dump(exclude_unset=True)
    # Remove any order_index provided by the client so server controls ordering
    lesson_data.pop('order_index', None)
    lesson_data['order_index'] = max_order + 1

    db_lesson = Lesson(
        **lesson_data,
        course_id=course_id,
    )
    db.add(db_lesson)
    await db.commit()
    await db.refresh(db_lesson)
    return db_lesson

@router.put("/lessons/{lesson_id}", response_model=LessonSchema)
async def update_lesson(
    db: Annotated[AsyncSession, Depends(get_db)],
    lesson_id: int,
    lesson_in: LessonUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    allowed: Annotated[bool, Depends(RoleChecker([UserRole.ADMIN, UserRole.INSTRUCTOR]))]
) -> Lesson:
    result = await db.execute(
        select(Lesson).where(Lesson.id == lesson_id)
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    result = await db.execute(select(Course).where(Course.id == lesson.course_id))
    course = result.scalar_one_or_none()
    if current_user.id != course.instructor_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    for field, value in lesson_in.model_dump(exclude_unset=True).items():
        setattr(lesson, field, value)
    
    await db.commit()
    await db.refresh(lesson)
    return lesson

@router.patch("/{course_id}/lessons/reorder")
async def reorder_lessons(
    db: Annotated[AsyncSession, Depends(get_db)],
    course_id: int,
    lesson_orders: List[LessonOrderUpdate],
    current_user: Annotated[User, Depends(get_current_active_user)],
    allowed: Annotated[bool, Depends(RoleChecker([UserRole.ADMIN, UserRole.INSTRUCTOR]))]
) -> dict:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if current_user.id != course.instructor_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Verify all lessons exist and belong to this course
    for order in lesson_orders:
        result = await db.execute(
            select(Lesson).where(
                Lesson.id == order.lesson_id,
                Lesson.course_id == course_id
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=404,
                detail=f"Lesson {order.lesson_id} not found in this course"
            )
    
    # Update order indices
    for order in lesson_orders:
        result = await db.execute(
            select(Lesson).where(Lesson.id == order.lesson_id)
        )
        lesson = result.scalar_one_or_none()
        lesson.order_index = order.order_index
    
    await db.commit()
    return {"ok": True}

@router.get("/{course_id}/lessons/{lesson_id}", response_model=LessonSchema)
async def get_lesson(
    db: Annotated[AsyncSession, Depends(get_db)],
    course_id: int,
    lesson_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)] = None
) -> Lesson:
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Ensure the lesson belongs to the requested course (route consistency)
    if lesson.course_id != course_id:
        raise HTTPException(status_code=404, detail="Lesson not found in this course")

    result = await db.execute(select(Course).where(Course.id == lesson.course_id))
    course = result.scalar_one_or_none()
    
    if not course.is_published and (current_user is None or (current_user.id != course.instructor_id and current_user.role != UserRole.ADMIN)):
        raise HTTPException(status_code=403, detail="Course not published")
    
    if not lesson.is_preview:
        if not current_user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        result = await db.execute(
            select(Enrollment)
            .where(
                Enrollment.course_id == course.id,
                Enrollment.user_id == current_user.id
            )
        )
        enrollment = result.scalar_one_or_none()
        if not enrollment and current_user.id != course.instructor_id and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=403,
                detail="Must be enrolled to access this lesson"
            )
    
    return lesson
