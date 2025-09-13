# Course Platform API

A FastAPI-based backend for a Coursera-like online learning platform.

## Features

- 🔐 Role-based authentication (Student, Instructor, Admin)
- 📚 Course management with rich content support
- 📝 Lesson creation and ordering
- ✅ Quiz functionality
- 📊 Progress tracking
- ⭐ Course reviews and ratings
- 🎯 Comprehensive API with proper validation

## Tech Stack

- FastAPI (Python 3.10+)
- SQLAlchemy 2.0
- Pydantic v2
- JWT Authentication
- PostgreSQL (production) / SQLite (development)
- Alembic for migrations

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
.\venv\Scripts\activate  # Windows
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Generate a secret key and update .env:
```bash
openssl rand -hex 32  # Copy output to SECRET_KEY in .env
```

5. Initialize the database:
```bash
alembic upgrade head
python -m app.db.init_db  # Creates admin user and demo data
```

6. Run the development server:
```bash
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000

API documentation: http://localhost:8000/docs

## Default Users

After running init_db.py, the following users are created:

Admin:
- Email: admin@example.com
- Password: adminpassword123

Instructor:
- Email: instructor@example.com
- Password: Instructor123!

Student:
- Email: student@example.com
- Password: Student123!

## API Endpoints

### Authentication
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- GET /api/v1/auth/me

### Courses
- GET /api/v1/courses
- GET /api/v1/courses/{course_id}
- POST /api/v1/courses
- PUT /api/v1/courses/{course_id}
- DELETE /api/v1/courses/{course_id}

### Lessons
- GET /api/v1/courses/{course_id}/lessons
- GET /api/v1/lessons/{lesson_id}
- POST /api/v1/courses/{course_id}/lessons
- PUT /api/v1/lessons/{lesson_id}
- PATCH /api/v1/courses/{course_id}/lessons/reorder

### Quizzes
- GET /api/v1/courses/{course_id}/quizzes
- POST /api/v1/lessons/{lesson_id}/quiz
- POST /api/v1/quizzes/{quiz_id}/submit

### Enrollments
- POST /api/v1/courses/{course_id}/enroll
- GET /api/v1/me/enrollments
- POST /api/v1/lessons/{lesson_id}/complete

### Reviews
- GET /api/v1/courses/{course_id}/reviews
- POST /api/v1/courses/{course_id}/reviews
- PUT /api/v1/reviews/{review_id}
- DELETE /api/v1/reviews/{review_id}

## Development

### Code Style
This project uses:
- black for code formatting
- ruff for linting
- mypy for type checking

Run formatting:
```bash
black .
```

### Testing
Run tests with:
```bash
pytest
```

## Database Migrations

Create a new migration:
```bash
alembic revision --autogenerate -m "description"
```

Apply migrations:
```bash
alembic upgrade head
```

## Production Deployment

1. Update .env with production settings
2. Set up PostgreSQL database
3. Set proper CORS origins
4. Use gunicorn with uvicorn workers:
```bash
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker
```

## License

MIT
