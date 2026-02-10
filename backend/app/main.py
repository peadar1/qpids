from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import Optional
import os
import logging

# Configure logging to output to stdout
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
from .routers import (
    auth_supabase as auth,
    events_supabase as events,
    venues_supabase as venues,
    participants_supabase as participants,
    form_questions_supabase as form_questions,
    matches_supabase as matches,
    events_public
)

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Qpids Matcher API",
    description="API for managing dating and matchmaking events",
    version="1.0.0"
)

# Parse CORS_ORIGINS: comma-separated, whitespace-safe, drop empties
cors_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
allowed_origins = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]

# Optional regex for dynamic origins (e.g., Vercel preview deployments)
cors_origin_regex: Optional[str] = os.getenv("CORS_ORIGIN_REGEX") or None

# CORS middleware with configurable origins and optional regex pattern
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers - Organizer/Matcher routes
app.include_router(auth.router)
app.include_router(events.router)
app.include_router(venues.router)
app.include_router(participants.router)
app.include_router(form_questions.router)
app.include_router(matches.router)

# Include routers - Participant portal routes
app.include_router(events_public.router)


@app.get("/")
def read_root():
    return {
        "message": "Welcome to Qpids Matcher API",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/debug/cors")
def debug_cors(request: Request):
    """Debug endpoint to verify CORS configuration."""
    return {
        "request_origin": request.headers.get("origin"),
        "allowed_origins": allowed_origins,
        "origin_regex": cors_origin_regex,
    }
