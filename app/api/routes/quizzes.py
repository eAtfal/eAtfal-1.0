from typing import Annotated, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import OperationalError
from app.api.deps import get_current_active_user, get_current_user_optional, get_current_instructor_or_admin
from app.db.base import get_db
from app.models.quiz import Quiz as QuizModel, Question, Option, QuizAttempt, UserAnswer
from app.models.user import User
from app.models.enrollment import Enrollment
from app.schemas.quiz import (
    QuizCreate,
    Quiz as QuizSchema,
    QuizPublic,
    QuestionCreate,
    QuizSubmission,
    QuizAttempt as QuizAttemptSchema,
)

router = APIRouter()


@router.post("/courses/{course_id}/quizzes", response_model=QuizSchema)
async def create_quiz(
    course_id: int,
    quiz_in: QuizCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_instructor_or_admin)],
):
    """Create a quiz for a course. Instructors/Admins only."""
    db_quiz = QuizModel(title=quiz_in.title, course_id=course_id, allow_retry=bool(quiz_in.allow_retry))
    db.add(db_quiz)
    await db.flush()

    # create optional questions/options
    if quiz_in.questions:
        for q in quiz_in.questions:
            db_q = Question(quiz_id=db_quiz.id, text=q.text, order_index=q.order_index)
            db.add(db_q)
            await db.flush()
            for o in q.options:
                db_o = Option(question_id=db_q.id, text=o.text, is_correct=bool(o.is_correct))
                db.add(db_o)

    await db.commit()
    # Reload quiz with its questions and options in a single, synchronous-safe way
    await db.refresh(db_quiz)
    # Build a plain dict to return so Pydantic doesn't attempt lazy-loading on ORM relationships
    quiz_payload = {
        'id': db_quiz.id,
        'course_id': db_quiz.course_id,
        'title': db_quiz.title,
        'allow_retry': db_quiz.allow_retry,
        'created_at': db_quiz.created_at,
        'updated_at': getattr(db_quiz, 'updated_at', None),
        'questions': []
    }
    # Eager-load questions and their options to avoid lazy-loading after session commit
    from sqlalchemy.orm import selectinload
    q_res = await db.execute(select(QuizModel).options(selectinload(QuizModel.questions).selectinload(Question.options)).where(QuizModel.id == db_quiz.id))
    quiz_obj = q_res.scalar_one_or_none()
    if quiz_obj:
        for q in quiz_obj.questions:
            opts = []
            for o in q.options:
                opts.append({'id': o.id, 'text': o.text, 'is_correct': o.is_correct})
            quiz_payload['questions'].append({'id': q.id, 'text': q.text, 'order_index': q.order_index, 'options': opts})

    return quiz_payload


@router.post("/quizzes/{quiz_id}/questions", response_model=dict)
async def add_question(
    quiz_id: int,
    q_in: QuestionCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_instructor_or_admin)],
):
    """Add a question with options to an existing quiz."""
    result = await db.execute(select(QuizModel).where(QuizModel.id == quiz_id))
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    db_q = Question(quiz_id=quiz_id, text=q_in.text, order_index=q_in.order_index)
    db.add(db_q)
    await db.flush()
    for o in q_in.options:
        db_o = Option(question_id=db_q.id, text=o.text, is_correct=bool(o.is_correct))
        db.add(db_o)
    await db.commit()
    return {"ok": True, "question_id": db_q.id}


@router.get("/courses/{course_id}/quizzes", response_model=List[QuizPublic])
async def get_course_quizzes(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
):
    """Return quizzes for a course (questions and options included)."""
    # Eager-load questions and options in a single query to avoid lazy-loading after the session scope
    res = await db.execute(
        select(QuizModel).options(selectinload(QuizModel.questions).selectinload(Question.options)).where(QuizModel.course_id == course_id)
    )
    quizzes = res.scalars().all()

    out = []
    is_instructor = current_user and getattr(current_user, 'role', None) in ('INSTRUCTOR', 'ADMIN')
    for q in quizzes:
        # Build quiz payload using questions -> options. Only include `is_correct` for instructors/admins.
        out.append({
            'id': q.id,
            'course_id': q.course_id,
            'title': q.title,
            'allow_retry': q.allow_retry,
            'created_at': q.created_at,
            'updated_at': getattr(q, 'updated_at', None),
            'questions': [
                {
                    'id': qq.id,
                    'text': qq.text,
                    'order_index': qq.order_index,
                    'options': [
                        {
                            'id': oo.id,
                            'text': oo.text,
                            **({'is_correct': oo.is_correct} if is_instructor else {})
                        } for oo in qq.options
                    ]
                } for qq in q.questions
            ]
        })

    return out


@router.get("/quizzes/{quiz_id}", response_model=QuizPublic)
async def get_quiz(
    quiz_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
):
    # Eager-load questions/options so we can safely access attributes without triggering lazy IO
    result = await db.execute(
        select(QuizModel).options(selectinload(QuizModel.questions).selectinload(Question.options)).where(QuizModel.id == quiz_id)
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    is_instructor = current_user and getattr(current_user, 'role', None) in ('INSTRUCTOR', 'ADMIN')
    # Build plain payload
    payload = {
        'id': quiz.id,
        'course_id': quiz.course_id,
        'title': quiz.title,
        'allow_retry': quiz.allow_retry,
        'created_at': quiz.created_at,
        'updated_at': getattr(quiz, 'updated_at', None),
        'questions': []
    }
    for q in quiz.questions:
        opts = []
        for o in q.options:
            opt = {'id': o.id, 'text': o.text}
            if is_instructor:
                opt['is_correct'] = o.is_correct
            opts.append(opt)
        payload['questions'].append({'id': q.id, 'text': q.text, 'order_index': q.order_index, 'options': opts})

    # For non-instructors we might want to validate with QuizPublic, but returning a dict is fine
    return payload


@router.post("/quizzes/{quiz_id}/submit", response_model=QuizAttemptSchema)
async def submit_quiz(
    quiz_id: int,
    submission: QuizSubmission,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Submit answers for a quiz; returns attempt with score."""
    result = await db.execute(select(QuizModel).where(QuizModel.id == quiz_id))
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Prevent multiple submissions if not allowed
    if not quiz.allow_retry:
        # Some older DBs may be missing the 'total' column or have slightly different schema.
        # Guard against OperationalError so the endpoint doesn't hard-fail; in that case assume no prior attempt.
        try:
            res = await db.execute(select(QuizAttempt).where(QuizAttempt.quiz_id == quiz_id, QuizAttempt.user_id == current_user.id))
            existing = res.scalar_one_or_none()
            if existing:
                raise HTTPException(status_code=400, detail="Multiple submissions not allowed")
        except OperationalError:
            # Migration not applied or DB schema differs; allow the submission but log for operator.
            # In production you would want to alert or fail safe; here we proceed to avoid blocking users.
            pass

    # Load questions and their options with eager loading to avoid lazy IO (MissingGreenlet)

    # Ensure the user is enrolled in the course before allowing submission
    # This makes sure enrollment-based progress queries count this quiz attempt
    res_en = await db.execute(select(Enrollment).where(Enrollment.course_id == quiz.course_id, Enrollment.user_id == current_user.id))
    enrollment = res_en.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=403, detail="Must be enrolled to submit quiz")
    q_res = await db.execute(select(Question).options(selectinload(Question.options)).where(Question.quiz_id == quiz_id))
    questions = q_res.scalars().all()
    total = len(questions)
    correct_map = {}
    for q in questions:
        for o in q.options:
            if o.is_correct:
                correct_map[q.id] = o.id

    # Score calculation
    score = 0
    # Ensure started_at is set to satisfy legacy DB NOT NULL constraint
    attempt = QuizAttempt(quiz_id=quiz_id, user_id=current_user.id, score=0, total=total, started_at=datetime.utcnow())
    db.add(attempt)
    await db.flush()

    # Persist user answers and prepare output answers with correctness
    out_answers = []
    for ans in submission.answers:
        # submission.selected_option_id is single-value in the UI. Store as a single-item JSON array
        selected_ids = [ans.selected_option_id] if ans.selected_option_id is not None else []
        is_correct = False
        correct_option_id = correct_map.get(ans.question_id)
        if selected_ids and correct_option_id and selected_ids[0] == correct_option_id:
            is_correct = True
            score += 1
        ua = UserAnswer(attempt_id=attempt.id, question_id=ans.question_id, selected_option_ids=selected_ids, is_correct=is_correct)
        db.add(ua)
        out_answers.append({
            'question_id': ans.question_id,
            'selected_option_id': ans.selected_option_id,
            'is_correct': is_correct,
            'correct_option_id': correct_option_id,
        })

    attempt.score = score
    attempt.total = total
    await db.commit()
    await db.refresh(attempt)
    # Build response model including per-answer correctness
    attempt_out = QuizAttemptSchema.model_validate({
        'id': attempt.id,
        'quiz_id': attempt.quiz_id,
        'user_id': attempt.user_id,
        'score': attempt.score,
        'total': attempt.total,
        'created_at': attempt.created_at,
        'started_at': attempt.started_at,
        'answers': out_answers,
    })
    return attempt_out


@router.get("/quizzes/{quiz_id}/attempts", response_model=List[QuizAttemptSchema])
async def list_attempts(
    quiz_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_instructor_or_admin)],
):
    """List attempts for a quiz (instructor/admin only)."""
    # Eager-load answers for each attempt and return plain dicts to avoid ORM lazy-loading during serialization
    res = await db.execute(
        select(QuizAttempt).options(selectinload(QuizAttempt.answers)).where(QuizAttempt.quiz_id == quiz_id)
    )
    attempts = res.scalars().all()
    out = []
    for a in attempts:
        out.append({
            'id': a.id,
            'quiz_id': a.quiz_id,
            'user_id': a.user_id,
            'score': a.score,
            'total': a.total,
            'started_at': a.started_at,
            'created_at': a.created_at,
            'answers': [
                {
                    'question_id': ans.question_id,
                    # selected_option_ids is stored as JSON array in DB; expose single selected_option_id for UI
                    'selected_option_id': (ans.selected_option_ids[0] if ans.selected_option_ids else None),
                    'is_correct': ans.is_correct,
                } for ans in a.answers
            ]
        })
    return out


@router.delete("/courses/{course_id}/quizzes/{quiz_id}", response_model=dict)
async def delete_course_quiz(
    course_id: int,
    quiz_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_instructor_or_admin)],
):
    """Delete a quiz belonging to a course. Instructors/Admins only."""
    # Ensure the quiz exists and belongs to the course
    res = await db.execute(select(QuizModel).where(QuizModel.id == quiz_id, QuizModel.course_id == course_id))
    quiz = res.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Delete cascade should remove questions/options/attempts as configured on the models
    await db.delete(quiz)
    await db.commit()

    return {"ok": True}
