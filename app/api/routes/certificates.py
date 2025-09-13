from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi.responses import StreamingResponse
from io import BytesIO
import os

from app.api.deps import get_current_active_user
from app.db.base import get_db
from app.models.user import User
from app.models.enrollment import Enrollment
from app.models.course import Course
from app.models.lesson import Lesson
from app.models.lesson_completion import LessonCompletion

try:
    from PIL import Image, ImageDraw, ImageFont
except Exception:
    Image = None  # Pillow may not be installed in this environment

router = APIRouter()


def _centered_text(draw, text: str, x: int, y: int, font, fill=(0, 0, 0)):
    """Helper to draw centered text at x, y coordinates"""
    bbox = draw.textbbox((0, 0), text, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((x - w / 2, y - h / 2), text, font=font, fill=fill)


@router.get('/courses/{course_id}/certificate')
async def get_certificate(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    """
    Generate a certificate of completion for a course.
    - Verifies enrollment
    - Verifies all lessons completed
    - Renders name + course title onto template
    """
    # ✅ Check enrollment
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.course_id == course_id,
            Enrollment.user_id == current_user.id
        )
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=403, detail='Not enrolled in this course')

    # ✅ Total lessons
    total_lessons = (await db.execute(
        select(func.count(Lesson.id)).where(Lesson.course_id == course_id)
    )).scalar() or 0

    # ✅ Completed lessons
    subq = select(Lesson.id).where(Lesson.course_id == course_id).subquery()
    completed = (await db.execute(
        select(func.count(LessonCompletion.id)).where(
            LessonCompletion.user_id == current_user.id,
            LessonCompletion.lesson_id.in_(select(subq.c.id))
        )
    )).scalar() or 0

    if total_lessons == 0 or completed < total_lessons:
        raise HTTPException(status_code=403, detail='Course not completed yet')

    # ✅ Load course title
    res = await db.execute(select(Course).where(Course.id == course_id))
    course = res.scalar_one_or_none()
    course_title = course.title if course else 'Course'

    # ✅ Certificate template path
    template_path = os.path.abspath("frontend/public/certificate.png")
    if not os.path.exists(template_path):
        raise HTTPException(status_code=500, detail='Certificate template not found')

    if Image is None:
        raise HTTPException(status_code=500, detail='Pillow not installed')

    # ✅ Open image
    img = Image.open(template_path).convert('RGBA')
    draw = ImageDraw.Draw(img)

    # ✅ Fonts (use bundled font if available)
    font_path = os.path.abspath(r"C:\\Users\\Admin\\Documents\\Atfal\\eatfal\\v1.1\\frontend\\public\\great-vibes-font\\GreatVibes-Wmr4.ttf")
    try:
        name_font = ImageFont.truetype(font_path, 148)
        course_font = ImageFont.truetype(font_path, 44)
    except Exception:
        name_font = ImageFont.load_default()
        course_font = ImageFont.load_default()

    # ✅ Draw texts
    width, height = img.size
    fullname = current_user.full_name or "Student"

    _centered_text(draw, fullname, width // 2, int(height * 0.52), name_font, fill=(10, 10, 10))
    # Move course title 15px up to improve vertical spacing
    _centered_text(draw, course_title, width // 2, int(height * 0.68) - 15, course_font, fill=(40, 40, 40))

    # ✅ Output PNG (downloadable)
    buf = BytesIO()
    img = img.convert('RGB')
    img.save(buf, format='PNG')
    buf.seek(0)

    filename = f"certificate_{course_id}.png"
    headers = {
        "Content-Disposition": f"attachment; filename={filename}"
    }
    return StreamingResponse(buf, media_type='image/png', headers=headers)
