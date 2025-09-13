from __future__ import annotations
from sqlalchemy import String, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.db.base import Base
from typing import List, TYPE_CHECKING

if TYPE_CHECKING:
    from .course import Course
    from .lesson_completion import LessonCompletion

class Lesson(Base):
    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("course.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(String(10000), nullable=False)
    video_url: Mapped[str] = mapped_column(String(1000), nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=True)
    is_preview: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    course: Mapped["Course"] = relationship("app.models.course.Course", back_populates="lessons")
    completions: Mapped[List["LessonCompletion"]] = relationship("app.models.lesson_completion.LessonCompletion", back_populates="lesson", cascade="all, delete-orphan")
