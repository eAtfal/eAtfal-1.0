from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.models.user import User
from app.models.lesson_completion import LessonCompletion
from app.models.quiz import QuizAttempt

router = APIRouter(tags=["leaderboard"])


@router.get("/leaderboard/global")
async def global_leaderboard(db: AsyncSession = Depends(get_db)) -> List[dict]:
    """
    Return players with computed points sorted desc.

    Points:
    - Lesson completion: +10 points each
    - Quiz pass: +20 points each (pass defined as score/total >= 0.5)
    """

    # Aggregate lesson completions per user
    lesson_q = select(LessonCompletion.user_id, func.count(LessonCompletion.id).label("lessons"))
    lesson_q = lesson_q.group_by(LessonCompletion.user_id)
    lesson_res = await db.execute(lesson_q)
    lessons_by_user = {row.user_id: row.lessons for row in lesson_res.fetchall()}

    # Aggregate quiz attempts per user where pass threshold met
    # Protect against division by zero: only consider attempts with total > 0
    pass_q = select(QuizAttempt.user_id, func.count(QuizAttempt.id).label("passes")).where(QuizAttempt.total > 0).where((QuizAttempt.score * 1.0) / QuizAttempt.total >= 0.5)
    pass_q = pass_q.group_by(QuizAttempt.user_id)
    pass_res = await db.execute(pass_q)
    passes_by_user = {row.user_id: row.passes for row in pass_res.fetchall()}

    # Only include users who have activity (lesson completions or passing quiz attempts)
    active_user_ids = set(list(lessons_by_user.keys()) + list(passes_by_user.keys()))

    players = []
    if active_user_ids:
        users_res = await db.execute(select(User).where(User.id.in_(active_user_ids)))
        users = users_res.scalars().all()

        for u in users:
            lessons = lessons_by_user.get(u.id, 0)
            passes = passes_by_user.get(u.id, 0)
            points = lessons * 10 + passes * 20
            players.append({
                "id": u.id,
                "nickname": u.full_name,
                "avatarUrl": None,
                "points": points,
            })

    # Sort descending by points, then by nickname
    players.sort(key=lambda p: (-p["points"], p["nickname"]))
    return players
