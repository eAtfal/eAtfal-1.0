from typing import Optional
from pydantic import BaseModel


class CourseEnrollmentReportItem(BaseModel):
    course_id: int
    title: str
    enrollments: int


class CompletionRateReportItem(BaseModel):
    course_id: int
    title: str
    total_lessons: int
    completed: Optional[int] = 0
    percent_complete: float


class DropoffReportItem(BaseModel):
    course_id: int
    # type: 'lesson' or 'quiz'
    type: str = 'lesson'
    # generic item id (lesson_id or quiz_id)
    item_id: int
    title: str
    completions: int


class AvgTimeReportItem(BaseModel):
    scope: str  # 'course' or 'lesson'
    id: int
    title: str
    course_id: Optional[int] = None
    avg_seconds: float


class QuizPerformanceItem(BaseModel):
    quiz_id: int
    course_id: int
    title: str
    average_score_percent: float
    attempts: int
    pass_rate_percent: float


class LeaderboardItem(BaseModel):
    user_id: int
    full_name: str
    points: int
