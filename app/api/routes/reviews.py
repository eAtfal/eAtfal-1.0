from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.deps import get_current_active_user
from app.api.role_checker import RoleChecker
from app.db.base import get_db
from app.models.user import User, UserRole
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.review import Review
from app.schemas.review import (
    Review as ReviewSchema,
    ReviewCreate,
    ReviewUpdate
)

router = APIRouter()

@router.get("/courses/{course_id}/reviews", response_model=List[ReviewSchema])
async def list_course_reviews(
    db: Annotated[AsyncSession, Depends(get_db)],
    course_id: int
) -> List[Review]:
    result = await db.execute(
        select(Review)
        .where(Review.course_id == course_id)
        .order_by(Review.created_at.desc())
    )
    return result.scalars().all()

@router.post("/courses/{course_id}/reviews", response_model=ReviewSchema)
async def create_review(
    db: Annotated[AsyncSession, Depends(get_db)],
    course_id: int,
    review_in: ReviewCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    allowed: Annotated[bool, Depends(RoleChecker([UserRole.STUDENT]))]
) -> Review:
    # Check if enrolled
    result = await db.execute(
        select(Enrollment)
        .where(
            Enrollment.course_id == course_id,
            Enrollment.user_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=403,
            detail="Must be enrolled to review course"
        )
    
    # Check if already reviewed
    result = await db.execute(
        select(Review)
        .where(
            Review.course_id == course_id,
            Review.user_id == current_user.id
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Already reviewed this course"
        )
    
    # Create review
    db_review = Review(
        **review_in.model_dump(),
        user_id=current_user.id,
        course_id=course_id
    )
    db.add(db_review)
    
    # Update course average rating
    await db.flush()
    result = await db.execute(
        select(func.avg(Review.rating))
        .where(Review.course_id == course_id)
    )
    avg_rating = result.scalar_one()
    
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one()
    course.average_rating = round(float(avg_rating), 2)
    
    await db.commit()
    await db.refresh(db_review)
    return db_review

@router.put("/reviews/{review_id}", response_model=ReviewSchema)
async def update_review(
    db: Annotated[AsyncSession, Depends(get_db)],
    review_id: int,
    review_in: ReviewUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    allowed: Annotated[bool, Depends(RoleChecker([UserRole.STUDENT, UserRole.ADMIN]))]
) -> Review:
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if review.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    for field, value in review_in.model_dump(exclude_unset=True).items():
        setattr(review, field, value)
    
    # Update course average rating
    await db.flush()
    result = await db.execute(
        select(func.avg(Review.rating))
        .where(Review.course_id == review.course_id)
    )
    avg_rating = result.scalar_one()
    
    result = await db.execute(select(Course).where(Course.id == review.course_id))
    course = result.scalar_one()
    course.average_rating = round(float(avg_rating), 2)
    
    await db.commit()
    await db.refresh(review)
    return review

@router.delete("/reviews/{review_id}")
async def delete_review(
    db: Annotated[AsyncSession, Depends(get_db)],
    review_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    allowed: Annotated[bool, Depends(RoleChecker([UserRole.STUDENT, UserRole.ADMIN]))]
) -> dict:
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if review.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    course_id = review.course_id
    await db.delete(review)
    
    # Update course average rating
    result = await db.execute(
        select(func.avg(Review.rating))
        .where(Review.course_id == course_id)
    )
    avg_rating = result.scalar_one()
    
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one()
    course.average_rating = round(float(avg_rating or 0), 2)
    
    await db.commit()
    return {"ok": True}
