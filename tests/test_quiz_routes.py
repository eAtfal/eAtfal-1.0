import pytest
from httpx import AsyncClient
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.course import Course, CourseLevel


@pytest.fixture
async def instructor(test_db):
    user = User(
        email="quiz_instructor@example.com",
        full_name="Quiz Instructor",
        hashed_password=get_password_hash("instrpass"),
        role=UserRole.INSTRUCTOR
    )
    test_db.add(user)
    await test_db.commit()
    return user


@pytest.fixture
async def student(test_db):
    user = User(
        email="quiz_student@example.com",
        full_name="Quiz Student",
        hashed_password=get_password_hash("studpass"),
        role=UserRole.STUDENT
    )
    test_db.add(user)
    await test_db.commit()
    return user


@pytest.fixture
async def course(test_db, instructor: User):
    course = Course(
        instructor_id=instructor.id,
        title="Quiz Course",
        description="Course for quizzes",
        category="Testing",
        language="English",
        level=CourseLevel.BEGINNER,
        is_published=True
    )
    test_db.add(course)
    await test_db.commit()
    return course


async def test_create_quiz_for_course(client: AsyncClient, instructor: User, course: Course):
    # login as instructor
    resp = await client.post(
        "/api/v1/auth/login",
        data={"username": instructor.email, "password": "instrpass"}
    )
    token = resp.json()["access_token"]

    quiz_payload = {
        "title": "Sample Quiz",
        "description": "A short sample",
        "questions": [
            {
                "text": "What is 2+2?",
                "points": 1.0,
                "multiple_correct": False,
                "options": [
                    {"text": "3", "is_correct": False},
                    {"text": "4", "is_correct": True}
                ]
            }
        ]
    }

    response = await client.post(
        f"/api/v1/courses/{course.id}/quizzes",
        headers={"Authorization": f"Bearer {token}"},
        json=quiz_payload
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Sample Quiz"
    assert data["course_id"] == course.id
    assert len(data["questions"]) == 1


async def test_start_attempt_without_enrollment(client: AsyncClient, student: User, course: Course):
    # login as student
    resp = await client.post(
        "/api/v1/auth/login",
        data={"username": student.email, "password": "studpass"}
    )
    token = resp.json()["access_token"]

    # Create a quiz as instructor to ensure it exists
    # We create directly through DB to simplify test setup
    from app.models.quiz import Quiz
    quiz = Quiz(
        title="Locked Quiz",
        course_id=course.id,
        published=True
    )
    test_db = client.app.state._test_db_session
    test_db.add(quiz)
    await test_db.commit()
    await test_db.refresh(quiz)

    # student tries to start attempt without enrollment
    response = await client.post(
        f"/api/v1/quizzes/{quiz.id}/attempts",
        headers={"Authorization": f"Bearer {token}"},
        json={}
    )
    assert response.status_code == 403