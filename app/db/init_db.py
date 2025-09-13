import asyncio
from typing import Dict, List
import json
from sqlalchemy import select
from app.db.base import async_session
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.course import Course, CourseLevel
from app.models.lesson import Lesson

async def create_first_admin():
    async with async_session() as db:
        result = await db.execute(select(User).where(User.email == settings.FIRST_ADMIN_EMAIL))
        if not result.scalar_one_or_none():
            admin = User(
                email=settings.FIRST_ADMIN_EMAIL,
                full_name="System Admin",
                hashed_password=get_password_hash(settings.FIRST_ADMIN_PASSWORD),
                role=UserRole.ADMIN
            )
            db.add(admin)
            await db.commit()
            print(f"Created admin user: {settings.FIRST_ADMIN_EMAIL}")

async def create_demo_data():
    # Create a demo instructor
    async with async_session() as db:
        result = await db.execute(select(User).where(User.email == "instructor@example.com"))
        if not result.scalar_one_or_none():
            instructor = User(
                email="instructor@example.com",
                full_name="Demo Instructor",
                hashed_password=get_password_hash("Instructor123!"),
                role=UserRole.INSTRUCTOR
            )
            db.add(instructor)
            await db.flush()
            
            # Create a demo course
            course = Course(
                instructor_id=instructor.id,
                title="Introduction to Python Programming",
                subtitle="Learn Python from scratch",
                description="A comprehensive course covering Python basics to advanced concepts.",
                category="Programming",
                language="English",
                level=CourseLevel.BEGINNER,
                price=None,  # Free course
                thumbnail_url="https://example.com/python-course.jpg",
                is_published=True
            )
            db.add(course)
            await db.flush()
            
            # Create some lessons
            lessons = [
                Lesson(
                    course_id=course.id,
                    title="Getting Started with Python",
                    order_index=0,
                    content="Learn about Python's features and installation.",
                    is_preview=True
                ),
                Lesson(
                    course_id=course.id,
                    title="Variables and Data Types",
                    order_index=1,
                    content="Understanding Python's basic data types and variables.",
                    is_preview=False
                ),
                Lesson(
                    course_id=course.id,
                    title="Control Flow",
                    order_index=2,
                    content="Learn about if statements, loops, and control structures.",
                    is_preview=False
                )
            ]
            for lesson in lessons:
                db.add(lesson)
            
            # Create a demo student
            student = User(
                email="student@example.com",
                full_name="Demo Student",
                hashed_password=get_password_hash("Student123!"),
                role=UserRole.STUDENT
            )
            db.add(student)
            
            await db.commit()
            print("Created demo data with instructor, course, lessons, and student")

async def init_db():
    await create_first_admin()
    await create_demo_data()

if __name__ == "__main__":
    asyncio.run(init_db())
