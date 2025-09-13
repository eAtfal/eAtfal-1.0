
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.routes import api_router
import traceback
import sqlite3
import os
import asyncio
import sys
import logging

logging.getLogger("sqlalchemy.engine").setLevel(logging.CRITICAL)

if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

app = FastAPI(
    title="Course Platform API",
    description="API for a Coursera-like online learning platform",
    version="1.0.0",
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the Course Platform API",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }


# Global exception handler to ensure CORS headers are always present on errors.
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log full traceback to stdout/stderr so server logs include the error
    traceback.print_exc()

    # Determine a sensible Access-Control-Allow-Origin value
    origin = settings.CORS_ORIGINS[0] if settings.CORS_ORIGINS else "*"

    headers = {
        "Access-Control-Allow-Origin": origin,
        # Mirror the allow_credentials flag used in CORSMiddleware
        "Access-Control-Allow-Credentials": "true"
    }

    # Return a minimal JSON response; frontend can inspect the body or network tab
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"}, headers=headers)