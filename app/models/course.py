from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import List, TYPE_CHECKING
from decimal import Decimal

from sqlalchemy import String, Enum as SQLEnum, DateTime, ForeignKey, Numeric, Boolean, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from .user import User
    from .lesson import Lesson
    from .enrollment import Enrollment
    from .review import Review
    from .quiz import Quiz

class CourseLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"

class Course(Base):
    id: Mapped[int] = mapped_column(primary_key=True)
    instructor_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    subtitle: Mapped[str] = mapped_column(String(255), nullable=True)
    description: Mapped[str] = mapped_column(String(10000), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    language: Mapped[str] = mapped_column(String(50), nullable=False)
    level: Mapped[CourseLevel] = mapped_column(SQLEnum(CourseLevel), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=True)
    thumbnail_url: Mapped[str] = mapped_column(String(1000), nullable=True)
    promo_video_url: Mapped[str] = mapped_column(String(1000), nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    average_rating: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    # Relationships
    instructor: Mapped[User] = relationship("app.models.user.User", back_populates="courses")
    lessons: Mapped[List[Lesson]] = relationship("app.models.lesson.Lesson", back_populates="course", cascade="all, delete-orphan")
    enrollments: Mapped[List[Enrollment]] = relationship("app.models.enrollment.Enrollment", back_populates="course", cascade="all, delete-orphan")
    reviews: Mapped[List[Review]] = relationship("app.models.review.Review", back_populates="course", cascade="all, delete-orphan")
    quizzes: Mapped[List[Quiz]] = relationship("app.models.quiz.Quiz", back_populates="course", cascade="all, delete-orphan")
