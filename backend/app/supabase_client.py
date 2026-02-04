"""Supabase client configuration for backend"""
from supabase import create_client, Client
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

# Validate configuration
if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError(
        "Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file"
    )

if not SUPABASE_ANON_KEY:
    raise ValueError(
        "Missing SUPABASE_ANON_KEY. Please set it in .env file (required for OAuth token verification)"
    )


def get_supabase_admin() -> Client:
    """Get Supabase admin client (service role)
    
    Creates a fresh client per request to avoid stale connections.
    """
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def get_supabase_anon() -> Client:
    """Get Supabase anon client (public role)
    
    Creates a fresh client per request to avoid stale connections.
    """
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)