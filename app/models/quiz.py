from __future__ import annotations
from datetime import datetime
from typing import List, TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from .course import Course
    from .user import User


class Quiz(Base):
    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("course.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    allow_retry: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    course = relationship("app.models.course.Course", back_populates="quizzes")
    questions: Mapped[List["Question"]] = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")
    attempts: Mapped[List["QuizAttempt"]] = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")


class Question(Base):
    id: Mapped[int] = mapped_column(primary_key=True)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quiz.id"), nullable=False)
    text: Mapped[str] = mapped_column(String(2000), nullable=False)
    # Map to DB column named 'order' (legacy migration uses 'order')
    order_index: Mapped[int] = mapped_column('order', Integer, default=0, nullable=False)

    quiz = relationship("Quiz", back_populates="questions")
    options: Mapped[List["Option"]] = relationship("Option", back_populates="question", cascade="all, delete-orphan")


class Option(Base):
    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("question.id"), nullable=False)
    text: Mapped[str] = mapped_column(String(1000), nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Map to DB column named 'order' (legacy migration uses 'order')
    order_index: Mapped[int] = mapped_column('order', Integer, default=0, nullable=False)

    question = relationship("Question", back_populates="options")


class QuizAttempt(Base):
    id: Mapped[int] = mapped_column(primary_key=True)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quiz.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Track when the attempt was started (DB requires non-null)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    quiz = relationship("Quiz", back_populates="attempts")
    answers: Mapped[List["UserAnswer"]] = relationship("UserAnswer", back_populates="attempt", cascade="all, delete-orphan")


class UserAnswer(Base):
    __tablename__ = 'attemptanswer'
    id: Mapped[int] = mapped_column(primary_key=True)
    attempt_id: Mapped[int] = mapped_column(ForeignKey("quizattempt.id"), nullable=False)
    question_id: Mapped[int] = mapped_column(ForeignKey("question.id"), nullable=False)
    # legacy schema stores selected option ids as a JSON array in column 'selected_option_ids'
    selected_option_ids: Mapped[list] = mapped_column(JSON, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    attempt = relationship("QuizAttempt", back_populates="answers")
