# Import all models here for Alembic autogenerate support
from app.db.base import Base  # noqa: F401

from app.models.user import User, UserRole  # noqa: F401
from app.models.course import Course, CourseLevel  # noqa: F401
from app.models.lesson import Lesson  # noqa: F401
# Quiz model removed
from app.models.enrollment import Enrollment  # noqa: F401
from app.models.lesson_completion import LessonCompletion  # noqa: F401
from app.models.review import Review  # noqa: F401
