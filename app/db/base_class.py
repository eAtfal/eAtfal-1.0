		
# Base class and session
from app.db.base import Base, get_db

# Import all models here for Alembic autogenerate support (after Base definition)
from app.models.user import User, UserRole
from app.models.course import Course, CourseLevel
from app.models.lesson import Lesson
from app.models.enrollment import Enrollment
from app.models.lesson_completion import LessonCompletion
from app.models.review import Review
