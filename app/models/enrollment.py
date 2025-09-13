from __future__ import annotations
from sqlalchemy import ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.db.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .user import User
    from .course import Course
    from .lesson import Lesson

class Enrollment(Base):
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    course_id: Mapped[int] = mapped_column(ForeignKey("course.id"), nullable=False)
    last_lesson_id: Mapped[int] = mapped_column(ForeignKey("lesson.id"), nullable=True)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user: Mapped["User"] = relationship("app.models.user.User", back_populates="enrollments")
    course: Mapped["Course"] = relationship("app.models.course.Course", back_populates="enrollments")
    last_lesson: Mapped["Lesson"] = relationship("app.models.lesson.Lesson")
