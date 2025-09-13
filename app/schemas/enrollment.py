from datetime import datetime
from typing import Optional
from pydantic import Field
from app.schemas.base import BaseSchema, ReviewBase
from app.schemas.course import Course as CourseSchema

class EnrollmentCreate(BaseSchema):
    course_id: int

class EnrollmentInDB(EnrollmentCreate):
    id: int
    user_id: int
    last_lesson_id: Optional[int] = None
    enrolled_at: datetime

class Enrollment(EnrollmentInDB):
    # Include the nested course object when available so clients can render
    # course    information without extra requests.
    course: Optional[CourseSchema] = None

class EnrollmentWithProgress(Enrollment):
    percent_complete: float
    completed_lessons: int
    total_lessons: int
    total_quizzes: int = 0
    passed_quizzes: int = 0

class ReviewCreate(ReviewBase):
    pass

class ReviewUpdate(ReviewBase):
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=1000)

class ReviewInDBBase(ReviewBase):
    id: int
    user_id: int
    course_id: int
    created_at: datetime
    updated_at: datetime

class Review(ReviewInDBBase):
    pass
