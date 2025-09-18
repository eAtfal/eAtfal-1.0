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
    q = select(Course.id, Course.title, func.count(Enrollment.id).label("enrollments")).join(Enrollment, Enrollment.course_id == Course.id, isouter=True).where(Course.is_published == True).group_by(Course.id)
    res = await db.execute(q)
    return [CourseEnrollmentReportItem(course_id=r.id, title=r.title, enrollments=int(r.enrollments or 0)) for r in res.fetchall()]


@router.get("/admin/reports/completion", response_model=List[CompletionRateReportItem])
async def completion_rate_report(db: AsyncSession = Depends(get_db), _=Depends(get_current_active_superuser)):
    # For each course: compute total lessons and completed lessons by all enrolled users as percentage
    total_lessons_sq = select(func.count(Lesson.id)).where(Lesson.course_id == Course.id).scalar_subquery()
    # Count distinct (user_id, lesson_id) completions by enrolled users only to avoid double-counting and exclude outsiders
    # Subquery: distinct user-lesson completions where the user is enrolled in the course
    completed_distinct_subq = (
        select(LessonCompletion.user_id, LessonCompletion.lesson_id)
        .join(Lesson, Lesson.id == LessonCompletion.lesson_id)
        .join(Enrollment, (Enrollment.course_id == Lesson.course_id) & (Enrollment.user_id == LessonCompletion.user_id))
        .where(Lesson.course_id == Course.id)
        .distinct()
        .subquery()
    )
    distinct_completions_sq = select(func.count()).select_from(completed_distinct_subq).scalar_subquery()

    # Also ensure the course has lessons and enrollments before showing completion stats
    enrollments_sq = select(func.count(Enrollment.id)).where(Enrollment.course_id == Course.id).scalar_subquery()

    q = select(Course.id, Course.title, total_lessons_sq.label("total_lessons"), distinct_completions_sq.label("completed_count"), enrollments_sq.label("enrollments_count")).where(Course.is_published == True).where(total_lessons_sq > 0).where(enrollments_sq > 0)
    res = await db.execute(q)
    out = []
    for r in res.fetchall():
        total = int(r.total_lessons or 0)
        completed = int(r.completed_count or 0)
        enrollments = int(r.enrollments_count or 0)
        # percent = fraction of possible lesson completions completed by enrolled users
        if total > 0 and enrollments > 0:
            percent = round((completed / (total * enrollments)) * 100, 2)
        else:
            percent = 0.0
        out.append(CompletionRateReportItem(course_id=r.id, title=r.title, total_lessons=total, completed=completed, percent_complete=percent))
    return out


@router.get("/admin/reports/dropoffs", response_model=List[DropoffReportItem])
async def dropoff_points_report(db: AsyncSession = Depends(get_db), _=Depends(get_current_active_superuser)):
    # Drop-off defined as lessons with the fewest completions relative to others in same course
    # Count distinct enrolled users who completed each lesson to avoid double-counting repeat logs
    # Only consider lessons that belong to an existing course (join Course)
    # First: lesson completion counts (distinct enrolled users who completed the lesson)
    lesson_q = (
        select(Lesson.id.label('item_id'), Lesson.course_id, Lesson.title.label('title'), func.count(func.distinct(LessonCompletion.user_id)).label('completions'))
        .join(Course, Course.id == Lesson.course_id)
        .where(Course.is_published == True)
        .outerjoin(LessonCompletion, LessonCompletion.lesson_id == Lesson.id)
        .outerjoin(Enrollment, (Enrollment.course_id == Lesson.course_id) & (Enrollment.user_id == LessonCompletion.user_id))
        .group_by(Lesson.id)
    )
    lres = await db.execute(lesson_q)
    lesson_rows = lres.fetchall()

    # Second: quiz attempt counts (count distinct users or attempts) — treat quizzes as potential drop-offs
    quiz_q = (
        select(Quiz.id.label('item_id'), Quiz.course_id, Quiz.title.label('title'), func.count(func.distinct(QuizAttempt.user_id)).label('completions'))
        .join(Course, Course.id == Quiz.course_id)
        .where(Course.is_published == True)
        .outerjoin(QuizAttempt, QuizAttempt.quiz_id == Quiz.id)
        .group_by(Quiz.id)
    )
    qres = await db.execute(quiz_q)
    quiz_rows = qres.fetchall()

    from collections import defaultdict
    courses = defaultdict(list)

    for r in lesson_rows:
        courses[r.course_id].append({'type': 'lesson', 'item_id': int(r.item_id), 'title': r.title, 'completions': int(r.completions or 0)})
    for r in quiz_rows:
        courses[r.course_id].append({'type': 'quiz', 'item_id': int(r.item_id), 'title': r.title, 'completions': int(r.completions or 0)})

    out = []
    for course_id, items in courses.items():
        if not items:
            continue
        min_c = min(it['completions'] for it in items)
        for it in items:
            if it['completions'] == min_c:
                out.append(DropoffReportItem(course_id=course_id, type=it['type'], item_id=it['item_id'], title=it['title'], completions=it['completions']))
    return out


@router.get("/admin/reports/average-time", response_model=List[AvgTimeReportItem])
async def avg_time_report(db: AsyncSession = Depends(get_db), _=Depends(get_current_active_superuser)):
    # Use Lesson.duration_seconds as proxy for time; compute weighted average per course (weighted by distinct completions per lesson)
    # First, fetch all lessons with their durations
    # Only include lessons for courses that still exist
    lesson_q = select(Lesson.id, Lesson.title, Lesson.course_id, Lesson.duration_seconds).join(Course, Course.id == Lesson.course_id).where(Course.is_published == True)
    lres = await db.execute(lesson_q)
    lessons = lres.fetchall()

    # Fetch completion counts per lesson (distinct enrolled users)
    # Only count completions for lessons that belong to existing courses
    comp_q = (
        select(Lesson.id.label('lesson_id'), func.count(func.distinct(LessonCompletion.user_id)).label('completions'))
        .join(Course, Course.id == Lesson.course_id)
        .where(Course.is_published == True)
        .join(LessonCompletion, LessonCompletion.lesson_id == Lesson.id)
        .join(Enrollment, (Enrollment.course_id == Lesson.course_id) & (Enrollment.user_id == LessonCompletion.user_id))
        .group_by(Lesson.id)
    )
    comp_res = await db.execute(comp_q)
    comp_map = {r.lesson_id: int(r.completions or 0) for r in comp_res.fetchall()}

    # Build per-course aggregation
    from collections import defaultdict
    course_acc = defaultdict(lambda: {'title': None, 'dur_sum': 0.0, 'weight': 0})
    out = []
    for r in lessons:
        dur = float(r.duration_seconds or 0.0)
        out.append(AvgTimeReportItem(scope="lesson", id=r.id, title=r.title, course_id=r.course_id, avg_seconds=dur))
        if dur <= 0:
            continue
        cnt = comp_map.get(r.id, 0)
        if cnt <= 0:
            # if no completions, still include lesson in course average as unweighted or skip; we'll skip here
            continue
        acc = course_acc[r.course_id]
        acc['title'] = acc.get('title') or ''
        acc['dur_sum'] += dur * cnt
        acc['weight'] += cnt

    for cid, acc in course_acc.items():
        avg_seconds = float((acc['dur_sum'] / acc['weight']) if acc['weight'] > 0 else 0.0)
        out.insert(0, AvgTimeReportItem(scope="course", id=cid, title=acc.get('title') or f"Course {cid}", avg_seconds=avg_seconds))
    return out


@router.get("/admin/reports/quiz-performance", response_model=List[QuizPerformanceItem])
async def quiz_performance_report(db: AsyncSession = Depends(get_db), _=Depends(get_current_active_superuser)):
    # Safer approach: iterate quizzes and compute aggregates via scalar subqueries limited to valid attempts (total > 0)
    # Only include quizzes that belong to existing courses
    q = await db.execute(select(Quiz.id, Quiz.course_id, Quiz.title).join(Course, Course.id == Quiz.course_id).where(Course.is_published == True))
    quizzes = q.fetchall()
    out = []
    for r in quizzes:
        quiz_id = r.id
        # count attempts with total > 0
        attempts_q = select(func.count(QuizAttempt.id)).where(QuizAttempt.quiz_id == quiz_id, QuizAttempt.total > 0)
        attempts_res = await db.execute(attempts_q)
        attempts = int(attempts_res.scalar() or 0)

        # average percent over valid attempts
        avg_q = select(func.avg((QuizAttempt.score * 1.0) / QuizAttempt.total)).where(QuizAttempt.quiz_id == quiz_id, QuizAttempt.total > 0)
        avg_res = await db.execute(avg_q)
        avg_pct = float(avg_res.scalar() or 0.0)

        # pass rate among valid attempts (>=50%)
        pass_q = select(func.count(QuizAttempt.id)).where(QuizAttempt.quiz_id == quiz_id, QuizAttempt.total > 0, (QuizAttempt.score * 1.0) / QuizAttempt.total >= 0.5)
        pass_res = await db.execute(pass_q)
        passes = int(pass_res.scalar() or 0)
        pass_rate = round((passes / (attempts or 1)) * 100, 2) if attempts > 0 else 0.0

        out.append(QuizPerformanceItem(quiz_id=quiz_id, course_id=r.course_id, title=r.title, average_score_percent=round(avg_pct * 100, 2), attempts=attempts, pass_rate_percent=pass_rate))
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
