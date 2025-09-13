from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_active_user, get_current_user_optional
from app.api.role_checker import RoleChecker
from app.db.base import get_db
from app.models.user import User, UserRole
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.lesson import Lesson
from app.models.lesson_completion import LessonCompletion
# Quiz model removed
from app.schemas.course import (
    Course as CourseSchema,
    CourseCreate,
    CourseUpdate,
    CourseWithStats
)

router = APIRouter()

@router.get("", response_model=List[CourseSchema])
async def list_courses(
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    category: str = None,
    level: str = None,
    min_price: float = None,
    max_price: float = None,
    search: str = None,
    order_by: str = Query("newest", pattern=r"^(newest|popularity|rating)$")
) -> List[Course]:
    query = select(Course).where(Course.is_published == True)
    
    if category:
        query = query.where(Course.category == category)
    if level:
        query = query.where(Course.level == level)
    if min_price is not None:
        query = query.where(Course.price >= min_price)
    if max_price is not None:
        query = query.where(Course.price <= max_price)
    if search:
        search_filter = (
            Course.title.ilike(f"%{search}%") |
            Course.description.ilike(f"%{search}%")
        )
        query = query.where(search_filter)
    
    if order_by == "newest":
        query = query.order_by(Course.created_at.desc())
    elif order_by == "popularity":
        subquery = (
            select(Course.id, func.count(Enrollment.id).label("enrollment_count"))
            .outerjoin(Enrollment)
            .group_by(Course.id)
            .subquery()
        )
        query = query.outerjoin(subquery, Course.id == subquery.c.id)
        query = query.order_by(subquery.c.enrollment_count.desc())
    else:  # rating
        query = query.order_by(Course.average_rating.desc())
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=CourseSchema)
async def create_course(
    db: Annotated[AsyncSession, Depends(get_db)],
    course_in: CourseCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    allowed: Annotated[bool, Depends(RoleChecker([UserRole.ADMIN, UserRole.INSTRUCTOR]))]
) -> Course:
    # If an admin creates the course, publish it immediately so it shows in listings.
    course_data = course_in.model_dump()
    if current_user.role == UserRole.ADMIN:
        course_data["is_published"] = True
    db_course = Course(**course_data, instructor_id=current_user.id)
    db.add(db_course)
    await db.commit()
    await db.refresh(db_course)
    return db_course

@router.get("/{course_id}")
async def get_course(
    db: Annotated[AsyncSession, Depends(get_db)],
    course_id: int,
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None
) -> dict:
    # eager-load instructor to avoid lazy-loading from the ORM which can
    # attempt synchronous IO and trigger MissingGreenlet in async contexts
    result = await db.execute(
        select(Course).options(selectinload(Course.instructor)).where(Course.id == course_id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check publication permissions
    if not course.is_published:
        if current_user is None or (current_user.id != course.instructor_id and current_user.role != UserRole.ADMIN):
            raise HTTPException(status_code=403, detail="Course not published")

    # Load lessons for course
    lessons_q = select(Lesson).where(Lesson.course_id == course_id).order_by(Lesson.order_index)
    res = await db.execute(lessons_q)
    lessons = res.scalars().all()
    lesson_ids = [l.id for l in lessons]

    # Completed lessons for current user
    completed_set = set()
    if current_user:
        if lesson_ids:
            res = await db.execute(
                select(LessonCompletion.lesson_id).where(
                    LessonCompletion.user_id == current_user.id,
                    LessonCompletion.lesson_id.in_(lesson_ids)
                )
            )
            completed_set = {row[0] for row in res.fetchall()}

    # ...no quiz functionality...

    # Build lessons payload compatible with frontend expectations
    lessons_payload = []
    for i, l in enumerate(lessons):
        lessons_payload.append({
            "id": l.id,
            "title": l.title,
            "duration": (l.duration_seconds // 60) if l.duration_seconds else 0,
            "index": l.order_index,
            "completed": l.id in completed_set,
        })

    # Compute next_lesson ids for listing (frontend may request specific lesson details separately)
    for idx, lp in enumerate(lessons_payload):
        lp["next_lesson_id"] = lessons_payload[idx + 1]["id"] if idx + 1 < len(lessons_payload) else None

    # Enrollment info
    is_enrolled = False
    completed_lessons = 0
    total_lessons = len(lessons_payload)
    if current_user:
        res = await db.execute(
            select(Enrollment).where(
                Enrollment.course_id == course_id,
                Enrollment.user_id == current_user.id
            )
        )
        enrollment = res.scalar_one_or_none()
        is_enrolled = enrollment is not None
        if is_enrolled:
            # Count completed lessons
            res = await db.execute(
                select(func.count(LessonCompletion.id)).where(
                    LessonCompletion.user_id == current_user.id,
                    LessonCompletion.lesson_id.in_(lesson_ids)
                )
            )
            completed_lessons = res.scalar_one() or 0

    # Total duration in minutes
    total_duration = sum((l.duration_seconds or 0) for l in lessons) // 60

    instructor_name = getattr(course.instructor, 'full_name', None) or getattr(course.instructor, 'email', None)

    payload = {
        "id": course.id,
        "title": course.title,
        "subtitle": course.subtitle,
        "description": course.description,
        "category": course.category,
        "language": course.language,
        "level": course.level.value if hasattr(course.level, 'value') else course.level,
        "price": float(course.price) if course.price is not None else None,
        "image_url": course.thumbnail_url,
        "promo_video_url": course.promo_video_url,
        "is_published": course.is_published,
        "created_at": course.created_at,
        "updated_at": course.updated_at,
        "average_rating": course.average_rating,
        "instructor_name": instructor_name,
        "is_enrolled": is_enrolled,
        "completed_lessons": completed_lessons,
        "total_lessons": total_lessons,
        "total_duration": total_duration,
        "lessons": lessons_payload,
    }

    return payload

@router.put("/{course_id}", response_model=CourseSchema)
async def update_course(
    db: Annotated[AsyncSession, Depends(get_db)],
    course_id: int,
    course_in: CourseUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    allowed: Annotated[bool, Depends(RoleChecker([UserRole.ADMIN, UserRole.INSTRUCTOR]))]
) -> Course:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if current_user.id != course.instructor_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    for field, value in course_in.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    
    await db.commit()
    await db.refresh(course)
    return course

@router.delete("/{course_id}")
async def delete_course(
    db: Annotated[AsyncSession, Depends(get_db)],
    course_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    allowed: Annotated[bool, Depends(RoleChecker([UserRole.ADMIN, UserRole.INSTRUCTOR]))]
) -> dict:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if current_user.id != course.instructor_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    await db.delete(course)
    await db.commit()
    return {"ok": True}
