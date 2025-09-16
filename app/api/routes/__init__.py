
from fastapi import APIRouter
from app.api.routes import auth, courses, lessons, enrollments, reviews, users, certificates, quizzes, leaderboard, reports

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(courses.router, prefix="/courses", tags=["courses"])
api_router.include_router(lessons.router, prefix="/courses", tags=["lessons"])
api_router.include_router(users.router, prefix="", tags=["users"])
api_router.include_router(enrollments.router, prefix="", tags=["enrollments"])
api_router.include_router(reviews.router, prefix="", tags=["reviews"])
api_router.include_router(certificates.router, prefix="", tags=["certificates"])
api_router.include_router(quizzes.router, prefix="", tags=["quizzes"])
api_router.include_router(leaderboard.router, prefix="", tags=["leaderboard"])
api_router.include_router(reports.router, prefix="", tags=["reports"])
