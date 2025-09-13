from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.deps import get_current_active_user
from app.db.base import get_db
from app.models.user import User
from app.models.course import Course
from app.models.lesson import Lesson
from app.models.quiz import Quiz as QuizModel, QuizAttempt
from app.models.enrollment import Enrollment
from app.models.lesson_completion import LessonCompletion
from app.schemas.enrollment import (
    Enrollment as EnrollmentSchema,
    EnrollmentCreate,
    EnrollmentWithProgress
)

router = APIRouter()

@router.post("/courses/{course_id}/enroll", response_model=EnrollmentSchema)
async def enroll_in_course(
    db: Annotated[AsyncSession, Depends(get_db)],
    course_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> Enrollment:
    # Check if course exists and is published
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if not course.is_published:
        raise HTTPException(status_code=403, detail="Course not published")
    
    # Check if user is already enrolled
    result = await db.execute(
        select(Enrollment)
        .where(
            Enrollment.course_id == course_id,
            Enrollment.user_id == current_user.id
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Already enrolled in this course"
        )
    
    # Create enrollment
    db_enrollment = Enrollment(
        user_id=current_user.id,
        course_id=course_id
    )
    db.add(db_enrollment)
    await db.commit()
    await db.refresh(db_enrollment)
    # Build a plain serializable dict to return. Returning the SQLAlchemy
    # ORM object directly can cause Pydantic to access relationship
    # attributes (like `course`) which may trigger synchronous IO and
    # MissingGreenlet in async contexts. Construct a dict with only
    # the fields the schema expects and a safe nested `course` dict.
    course_data = {
        'instructor_id': getattr(course, 'instructor_id', None),
        'id': getattr(course, 'id', None),
        'title': getattr(course, 'title', None),
        'subtitle': getattr(course, 'subtitle', None),
        'description': getattr(course, 'description', None),
        'category': getattr(course, 'category', None),
        'language': getattr(course, 'language', None),
        'level': getattr(getattr(course, 'level', None), 'value', getattr(course, 'level', None)) if getattr(course, 'level', None) is not None else None,
        'price': float(getattr(course, 'price')) if getattr(course, 'price', None) is not None else None,
        'thumbnail_url': getattr(course, 'thumbnail_url', None),
        'promo_video_url': getattr(course, 'promo_video_url', None),
        'is_published': getattr(course, 'is_published', None),
        'created_at': getattr(course, 'created_at', None),
        'updated_at': getattr(course, 'updated_at', None),
        'average_rating': getattr(course, 'average_rating', None),
    }

    enrollment_data = {
        'id': getattr(db_enrollment, 'id', None),
        'user_id': getattr(db_enrollment, 'user_id', None),
        'course_id': getattr(db_enrollment, 'course_id', None),
        'last_lesson_id': getattr(db_enrollment, 'last_lesson_id', None),
        'enrolled_at': getattr(db_enrollment, 'enrolled_at', None),
        'course': course_data
    }

    return enrollment_data

@router.get("/enrollments/me", response_model=List[EnrollmentWithProgress])
async def get_my_enrollments(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> List[Enrollment]:
    # Get enrollments with progress info
    # Select the Enrollment and its related Course plus aggregated lesson counts
    # Count lessons and completions via aggregation; use correlated scalar subqueries
    total_quizzes_sq = select(func.count(QuizModel.id)).where(QuizModel.course_id == Course.id).scalar_subquery()
    # Count distinct quizzes the user has passed (at least one passing attempt). We treat passing as score >= 50%.
    from sqlalchemy import exists

    # Count distinct quizzes for which the enrolled user has at least one
    # passing attempt (>=50%). Use EXISTS to make the correlation explicit
    # and avoid issues with joins or duplicate rows.
    passing_attempt_exists = (
        select(QuizAttempt.id)
        .where(
            QuizAttempt.quiz_id == QuizModel.id,
            QuizAttempt.user_id == Enrollment.user_id,
            QuizAttempt.total > 0,
            (QuizAttempt.score * 1.0) >= (QuizAttempt.total * 0.5),
        )
        .exists()
    )

    passed_quizzes_sq = (
        select(func.count(QuizModel.id))
        .where(QuizModel.course_id == Course.id, passing_attempt_exists)
        .scalar_subquery()
    )

    query = (
        select(
            Enrollment,
            Course,
            func.count(Lesson.id).label("total_lessons"),
            func.count(LessonCompletion.id).label("completed_lessons"),
            total_quizzes_sq.label("total_quizzes"),
            passed_quizzes_sq.label("passed_quizzes"),
        )
        .join(Course, Enrollment.course_id == Course.id)
        .outerjoin(Lesson, Course.id == Lesson.course_id)
        .outerjoin(
            LessonCompletion,
            (LessonCompletion.lesson_id == Lesson.id) &
            (LessonCompletion.user_id == Enrollment.user_id)
        )
        .where(Enrollment.user_id == current_user.id)
        .group_by(Enrollment.id, Course.id)
    )

    result = await db.execute(query)
    enrollments_with_progress = []
    for enrollment, course, total, completed, total_quizzes, passed_quizzes in result:
        # Recompute passed_quizzes per-enrollment with an explicit correlated count.
        # Some databases/ORM constructs can produce unexpected results with
        # complex scalar subqueries in aggregate queries; a direct count is
        # simple and reliable for a per-enrollment result set.
        pq_res = await db.execute(
            select(func.count(func.distinct(QuizModel.id))).where(
                QuizModel.course_id == course.id,
                QuizAttempt.quiz_id == QuizModel.id,
                QuizAttempt.user_id == enrollment.user_id,
                QuizAttempt.total > 0,
                (QuizAttempt.score * 1.0) >= (QuizAttempt.total * 0.5),
            )
        )
        passed_quizzes_count = int(pq_res.scalar() or 0)
        # Build a plain serializable dict for the course to avoid triggering
        # lazy-loading/IO when Pydantic serializes SQLAlchemy ORM objects.
        course_data = {
            'instructor_id': getattr(course, 'instructor_id', None),
            'id': getattr(course, 'id', None),
            'title': getattr(course, 'title', None),
            'subtitle': getattr(course, 'subtitle', None),
            'description': getattr(course, 'description', None),
            'category': getattr(course, 'category', None),
            'language': getattr(course, 'language', None),
            # If level is an Enum, use its .value (e.g., 'beginner') otherwise fall back to the raw value
            'level': getattr(getattr(course, 'level', None), 'value', getattr(course, 'level', None)) if getattr(course, 'level', None) is not None else None,
            'price': float(getattr(course, 'price')) if getattr(course, 'price', None) is not None else None,
            'thumbnail_url': getattr(course, 'thumbnail_url', None),
            'promo_video_url': getattr(course, 'promo_video_url', None),
            'is_published': getattr(course, 'is_published', None),
            'created_at': getattr(course, 'created_at', None),
            'updated_at': getattr(course, 'updated_at', None),
            'average_rating': getattr(course, 'average_rating', None),
        }

        enrollment_data = {
            'id': getattr(enrollment, 'id', None),
            'course_id': getattr(enrollment, 'course_id', None),
            'user_id': getattr(enrollment, 'user_id', None),
            'last_lesson_id': getattr(enrollment, 'last_lesson_id', None),
            'enrolled_at': getattr(enrollment, 'enrolled_at', None),
            'course': course_data,
            'total_lessons': total or 0,
            'completed_lessons': completed or 0,
            'total_quizzes': int(total_quizzes or 0),
            'passed_quizzes': passed_quizzes_count,
            # Compute percent as (completed lessons + passed quizzes) / (total lessons + total quizzes)
            'percent_complete': round(((completed or 0) + passed_quizzes_count) / (((total or 0) + (int(total_quizzes or 0))) or 1) * 100, 2),
        }

        progress = EnrollmentWithProgress(**enrollment_data)
        enrollments_with_progress.append(progress)

    return enrollments_with_progress

@router.post("/courses/{course_id}/lessons/{lesson_id}/complete")
async def complete_lesson(
    db: Annotated[AsyncSession, Depends(get_db)],
    course_id: int,
    lesson_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> dict:
    # Check if lesson exists
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    if lesson.course_id != course_id:
        raise HTTPException(status_code=404, detail="Lesson not found in this course")
    
    # Check if user is enrolled in the course
    result = await db.execute(
        select(Enrollment)
        .where(
            Enrollment.course_id == lesson.course_id,
            Enrollment.user_id == current_user.id
        )
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(
            status_code=403,
            detail="Must be enrolled to mark lesson as complete"
        )
    
    # Check if already completed
    result = await db.execute(
        select(LessonCompletion)
        .where(
            LessonCompletion.lesson_id == lesson_id,
            LessonCompletion.user_id == current_user.id
        )
    )
    if result.scalar_one_or_none():
        return {"message": "Lesson already completed"}
    
    # Mark lesson as completed
    completion = LessonCompletion(
        user_id=current_user.id,
        lesson_id=lesson_id
    )
    db.add(completion)
    
    # Update enrollment's last_lesson_id
    enrollment.last_lesson_id = lesson_id
    
    await db.commit()
    return {"message": "Lesson marked as completed"}
