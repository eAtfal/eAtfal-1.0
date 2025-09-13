from datetime import datetime
from typing import Optional
from pydantic import Field

from app.schemas.base import BaseSchema, ReviewBase

class ReviewCreate(ReviewBase):
    pass

class ReviewUpdate(ReviewBase):
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=1000)

class ReviewInDBBase(ReviewBase):
    id: int
    user_id: int
    course_id: int
    created_at: datetime
    updated_at: datetime

class Review(ReviewInDBBase):
    pass
