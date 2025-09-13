from datetime import datetime
from typing import Optional
from pydantic import Field
from app.schemas.base import BaseSchema, LessonBase

class LessonCreate(LessonBase):
    order_index: Optional[int] = None

class LessonUpdate(LessonBase):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=1, max_length=10000)
    video_url: Optional[str] = Field(None, max_length=1000)
    duration_seconds: Optional[int] = Field(None, gt=0)
    is_preview: Optional[bool] = None
    order_index: Optional[int] = None

class LessonInDBBase(LessonBase):
    id: int
    course_id: int
    order_index: int
    created_at: datetime
    updated_at: datetime

class Lesson(LessonInDBBase):
    pass

class LessonOrderUpdate(BaseSchema):
    lesson_id: int
    order_index: int
