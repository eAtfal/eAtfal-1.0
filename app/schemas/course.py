from datetime import datetime
from typing import List, Optional
from pydantic import Field
from app.schemas.base import BaseSchema, CourseBase

class CourseCreate(CourseBase):
    pass

class CourseUpdate(CourseBase):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=1, max_length=10000)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    language: Optional[str] = Field(None, min_length=1, max_length=50)
    level: Optional[str] = Field(None, pattern=r"^(beginner|intermediate|advanced)$")

class CourseInDBBase(CourseBase):
    id: int
    instructor_id: int
    created_at: datetime
    updated_at: datetime
    average_rating: float = Field(..., ge=0, le=5)

class Course(CourseInDBBase):
    pass

class CourseWithStats(Course):
    enrollment_count: int
    lesson_count: int
