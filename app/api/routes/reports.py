from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user, get_current_active_superuser
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.lesson import Lesson
from app.models.lesson_completion import LessonCompletion
from app.models.quiz import Quiz, QuizAttempt
from app.models.user import User
from app.schemas.reports import (
    CourseEnrollmentReportItem,
    CompletionRateReportItem,
    DropoffReportItem,
    AvgTimeReportItem,
    QuizPerformanceItem,
    LeaderboardItem,
)

router = APIRouter()


@router.get("/admin/reports/enrollments", response_model=List[CourseEnrollmentReportItem])
async def course_enrollment_report(db: AsyncSession = Depends(get_db), _=Depends(get_current_active_superuser)):
    q = select(Course.id, Course.title, func.count(Enrollment.id).label("enrollments")).join(Enrollment, Enrollment.course_id == Course.id, isouter=True).group_by(Course.id)
    res = await db.execute(q)
    return [CourseEnrollmentReportItem(course_id=r.id, title=r.title, enrollments=int(r.enrollments or 0)) for r in res.fetchall()]


@router.get("/admin/reports/completion", response_model=List[CompletionRateReportItem])
async def completion_rate_report(db: AsyncSession = Depends(get_db), _=Depends(get_current_active_superuser)):
    # For each course: compute total lessons and completed lessons by all enrolled users as percentage
    total_lessons_sq = select(func.count(Lesson.id)).where(Lesson.course_id == Course.id).scalar_subquery()

    completed_sq = (
        select(func.count(LessonCompletion.id))
        .join(Lesson, Lesson.id == LessonCompletion.lesson_id)
        .where(Lesson.course_id == Course.id)
        .scalar_subquery()
    )

    q = select(Course.id, Course.title, total_lessons_sq.label("total_lessons"), completed_sq.label("completed_count"))
    res = await db.execute(q)
    out = []
    for r in res.fetchall():
        total = int(r.total_lessons or 0)
        completed = int(r.completed_count or 0)
        percent = round((completed / (total or 1)) * 100, 2) if total > 0 else 0.0
        out.append(CompletionRateReportItem(course_id=r.id, title=r.title, total_lessons=total, completed=completed, percent_complete=percent))
    return out


@router.get("/admin/reports/dropoffs", response_model=List[DropoffReportItem])
async def dropoff_points_report(db: AsyncSession = Depends(get_db), _=Depends(get_current_active_superuser)):
    # Drop-off defined as lessons with the fewest completions relative to others in same course
    q = select(Lesson.id, Lesson.course_id, Lesson.title, func.count(LessonCompletion.id).label("completions")).outerjoin(LessonCompletion, LessonCompletion.lesson_id == Lesson.id).group_by(Lesson.id)
    res = await db.execute(q)
    rows = res.fetchall()
    # Map course -> list of lessons with completion counts, then compute lowest per course
    from collections import defaultdict
    courses = defaultdict(list)
    for r in rows:
        courses[r.course_id].append((r.id, r.title, int(r.completions or 0)))

    out = []
    for course_id, lessons in courses.items():
        # find lesson(s) with minimum completions
        min_c = min(l[2] for l in lessons)
        for lid, title, comp in lessons:
            if comp == min_c:
                out.append(DropoffReportItem(course_id=course_id, lesson_id=lid, lesson_title=title, completions=comp))
    return out


@router.get("/admin/reports/average-time", response_model=List[AvgTimeReportItem])
async def avg_time_report(db: AsyncSession = Depends(get_db), _=Depends(get_current_active_superuser)):
    # Use Lesson.duration_seconds as proxy for time; compute average per course and per lesson
    # Average per course
    course_q = select(Course.id, Course.title, func.avg(Lesson.duration_seconds).label("avg_seconds")).join(Lesson, Lesson.course_id == Course.id).group_by(Course.id)
    res = await db.execute(course_q)
    out = [AvgTimeReportItem(scope="course", id=r.id, title=r.title, avg_seconds=float(r.avg_seconds or 0.0)) for r in res.fetchall()]
    # Average per lesson
    lesson_q = select(Lesson.id, Lesson.title, Lesson.course_id, Lesson.duration_seconds)
    lres = await db.execute(lesson_q)
    for r in lres.fetchall():
        out.append(AvgTimeReportItem(scope="lesson", id=r.id, title=r.title, course_id=r.course_id, avg_seconds=float(r.duration_seconds or 0.0)))
    return out


@router.get("/admin/reports/quiz-performance", response_model=List[QuizPerformanceItem])
async def quiz_performance_report(db: AsyncSession = Depends(get_db), _=Depends(get_current_active_superuser)):
    q = select(Quiz.id, Quiz.course_id, Quiz.title, func.avg((QuizAttempt.score * 1.0) / (func.nullif(QuizAttempt.total, 0))).label("avg_pct"), func.count(QuizAttempt.id).label("attempts"))
    q = q.join(QuizAttempt, QuizAttempt.quiz_id == Quiz.id, isouter=True).group_by(Quiz.id)
    res = await db.execute(q)
    out = []
    for r in res.fetchall():
        avg_pct = float(r.avg_pct or 0.0)
        attempts = int(r.attempts or 0)
        pass_rate_q = select(func.count(QuizAttempt.id)).where(QuizAttempt.quiz_id == r.id, QuizAttempt.total > 0, (QuizAttempt.score * 1.0) / QuizAttempt.total >= 0.5)
        pass_res = await db.execute(pass_rate_q)
        passes = int(pass_res.scalar() or 0)
        pass_rate = round((passes / (attempts or 1)) * 100, 2) if attempts > 0 else 0.0
        out.append(QuizPerformanceItem(quiz_id=r.id, course_id=r.course_id, title=r.title, average_score_percent=round(avg_pct * 100, 2), attempts=attempts, pass_rate_percent=pass_rate))
    return out


@router.get("/admin/reports/leaderboard", response_model=List[LeaderboardItem])
async def admin_leaderboard(db: AsyncSession = Depends(get_db), _=Depends(get_current_active_superuser)):
    # Reuse leaderboard logic: compute points by activity
    lesson_q = select(LessonCompletion.user_id, func.count(LessonCompletion.id).label("lessons")).group_by(LessonCompletion.user_id)
    lres = await db.execute(lesson_q)
    lessons_by_user = {r.user_id: r.lessons for r in lres.fetchall()}

    pass_q = select(QuizAttempt.user_id, func.count(QuizAttempt.id).label("passes")).where(QuizAttempt.total > 0).where((QuizAttempt.score * 1.0) / QuizAttempt.total >= 0.5).group_by(QuizAttempt.user_id)
    pres = await db.execute(pass_q)
    passes_by_user = {r.user_id: r.passes for r in pres.fetchall()}

    users_res = await db.execute(select(User))
    users = users_res.scalars().all()
    players = []
    for u in users:
        lessons = lessons_by_user.get(u.id, 0)
        passes = passes_by_user.get(u.id, 0)
        points = lessons * 10 + passes * 20
        players.append(LeaderboardItem(user_id=u.id, full_name=u.full_name, points=points))
    players.sort(key=lambda p: (-p.points, p.full_name))
    return players
