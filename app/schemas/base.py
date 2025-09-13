from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, Extra
from pydantic import ConfigDict
from typing import Optional, List, Dict, Any
from decimal import Decimal

class BaseSchema(BaseModel):
    # Pydantic v2 uses `model_config` instead of `Config` (v1).
    # Use `from_attributes` so ORM models can be parsed from SQLAlchemy objects.
    # Allow extra fields so frontend can send fields like `description`, `points`,
    # or legacy keys without FastAPI rejecting the whole payload with 422.
    model_config = ConfigDict(from_attributes=True, extra=Extra.allow)

# Common fields for create/update operations
class CourseBase(BaseSchema):
    title: str = Field(..., min_length=1, max_length=255)
    subtitle: Optional[str] = Field(None, max_length=255)
    description: str = Field(..., min_length=1, max_length=10000)
    category: str = Field(..., min_length=1, max_length=100)
    language: str = Field(..., min_length=1, max_length=50)
    level: str = Field(..., pattern=r"^(beginner|intermediate|advanced)$")
    price: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    thumbnail_url: Optional[str] = Field(None, max_length=1000)
    promo_video_url: Optional[str] = Field(None, max_length=1000)
    is_published: bool = False

class LessonBase(BaseSchema):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1, max_length=10000)
    video_url: Optional[str] = Field(None, max_length=1000)
    duration_seconds: Optional[int] = Field(None, gt=0)
    is_preview: bool = False

class QuizBase(BaseSchema):
    title: str = Field(..., min_length=1, max_length=255)
    questions: List[Dict[str, Any]] = Field(..., min_items=1)

class ReviewBase(BaseSchema):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=1000)
