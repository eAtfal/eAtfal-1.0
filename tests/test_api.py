import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.course import Course, CourseLevel

@pytest.fixture
async def test_user(test_db: AsyncSession) -> User:
    user = User(
        email="test@example.com",
        full_name="Test User",
        hashed_password=get_password_hash("testpass123"),
        role=UserRole.STUDENT
    )
    test_db.add(user)
    await test_db.commit()
    return user

@pytest.fixture
async def test_instructor(test_db: AsyncSession) -> User:
    instructor = User(
        email="instructor@example.com",
        full_name="Test Instructor",
        hashed_password=get_password_hash("instructorpass123"),
        role=UserRole.INSTRUCTOR
    )
    test_db.add(instructor)
    await test_db.commit()
    return instructor

@pytest.fixture
async def test_course(test_db: AsyncSession, test_instructor: User) -> Course:
    course = Course(
        instructor_id=test_instructor.id,
        title="Test Course",
        description="Test Description",
        category="Test",
        language="English",
        level=CourseLevel.BEGINNER,
        is_published=True
    )
    test_db.add(course)
    await test_db.commit()
    return course

async def test_create_user(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "NewPass123",
            "full_name": "New User"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["full_name"] == "New User"
    assert "id" in data

async def test_login(client: AsyncClient, test_user: User):
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": test_user.email,
            "password": "testpass123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

async def test_create_course(client: AsyncClient, test_instructor: User):
    # First login as instructor
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": test_instructor.email,
            "password": "instructorpass123"
        }
    )
    token = response.json()["access_token"]
    
    # Create course
    response = await client.post(
        "/api/v1/courses",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "New Course",
            "description": "Course Description",
            "category": "Programming",
            "language": "English",
            "level": "beginner",
            "price": None,
            "is_published": False
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "New Course"
    assert data["instructor_id"] == test_instructor.id

async def test_enroll_course(
    client: AsyncClient,
    test_user: User,
    test_course: Course
):
    # Login as student
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": test_user.email,
            "password": "testpass123"
        }
    )
    token = response.json()["access_token"]
    
    # Enroll in course
    response = await client.post(
        f"/api/v1/courses/{test_course.id}/enroll",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["course_id"] == test_course.id
    assert data["user_id"] == test_user.id
