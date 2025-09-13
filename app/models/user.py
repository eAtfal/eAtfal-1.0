from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import List, TYPE_CHECKING

from sqlalchemy import String, Enum as SQLEnum, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from .course import Course
    from .enrollment import Enrollment
    from .lesson_completion import LessonCompletion
    from .review import Review

class UserRole(str, Enum):
    STUDENT = "student"
    INSTRUCTOR = "instructor"
    ADMIN = "admin"

class User(Base):
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), nullable=False, default=UserRole.STUDENT)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    # Use fully-qualified class paths to avoid import-order resolution errors
    courses: Mapped[List[Course]] = relationship("app.models.course.Course", back_populates="instructor")
    enrollments: Mapped[List[Enrollment]] = relationship("app.models.enrollment.Enrollment", back_populates="user")
    lesson_completions: Mapped[List[LessonCompletion]] = relationship("app.models.lesson_completion.LessonCompletion", back_populates="user")
    reviews: Mapped[List[Review]] = relationship("app.models.review.Review", back_populates="user")
