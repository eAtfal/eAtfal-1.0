from typing import List, Optional
from pydantic import Field
from app.schemas.base import BaseSchema
from datetime import datetime


class OptionCreate(BaseSchema):
    text: str = Field(..., min_length=1, max_length=1000)
    is_correct: bool = False


class QuestionCreate(BaseSchema):
    text: str = Field(..., min_length=1, max_length=2000)
    order_index: int = 0
    options: List[OptionCreate]


class QuizCreate(BaseSchema):
    title: str = Field(..., min_length=1, max_length=255)
    allow_retry: Optional[bool] = False
    questions: Optional[List[QuestionCreate]] = None


class Option(BaseSchema):
    id: int
    text: str
    is_correct: bool


# Public option (no is_correct) returned to students
class OptionPublic(BaseSchema):
    id: int
    text: str


class Question(BaseSchema):
    id: int
    text: str
    order_index: int
    options: List[Option]


class QuestionPublic(BaseSchema):
    id: int
    text: str
    order_index: int
    options: List[OptionPublic]


class Quiz(BaseSchema):
    id: int
    title: str
    course_id: int
    allow_retry: bool
    questions: List[Question] = []
    created_at: datetime


# Public quiz schema for students (no is_correct on options)
class QuizPublic(BaseSchema):
    id: int
    title: str
    course_id: int
    allow_retry: bool
    questions: List[QuestionPublic] = []
    created_at: datetime


class SubmitAnswer(BaseSchema):
    question_id: int
    selected_option_id: Optional[int]


class QuizSubmission(BaseSchema):
    answers: List[SubmitAnswer]


class SubmitAnswerOut(BaseSchema):
    question_id: int
    selected_option_id: Optional[int]
    is_correct: Optional[bool] = None
    correct_option_id: Optional[int] = None


class QuizAttempt(BaseSchema):
    id: int
    quiz_id: int
    user_id: int
    score: int
    total: int
    started_at: datetime
    created_at: datetime
    answers: List[SubmitAnswerOut] = []
