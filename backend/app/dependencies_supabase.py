"""Dependencies for Supabase authentication"""
import logging
import httpx
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from . import auth
from . import crud_supabase as crud
from .supabase_client import get_supabase_admin, get_supabase_anon
from typing import Dict, Tuple, Optional

logger = logging.getLogger(__name__)

# Supabase URL for direct API calls
SUPABASE_URL = os.getenv("SUPABASE_URL")


def verify_supabase_token(token: str) -> Optional[Dict]:
    """
    Verify a Supabase Auth JWT token by calling the GoTrue API directly.

    This is a fallback method that doesn't rely on the Supabase Python SDK,
    which may have issues with token verification in certain versions.

    Args:
        token: The Supabase Auth JWT token to verify.

    Returns:
        User data dictionary if token is valid, None otherwise.
    """
    if not SUPABASE_URL:
        print("[AUTH] ERROR: SUPABASE_URL not configured")
        return None

    anon_key = os.getenv("SUPABASE_ANON_KEY", "")
    if not anon_key:
        print("[AUTH] ERROR: SUPABASE_ANON_KEY not configured")
        return None

    try:
        # Call the Supabase Auth /user endpoint directly
        auth_url = f"{SUPABASE_URL}/auth/v1/user"
        print(f"[AUTH] Calling Supabase auth: {auth_url}")
        response = httpx.get(
            auth_url,
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": anon_key
            },
            timeout=10.0
        )

        print(f"[AUTH] Supabase response status: {response.status_code}")
        if response.status_code == 200:
            user_data = response.json()
            print(f"[AUTH] Got user: {user_data.get('email')}")
            return user_data
        else:
            print(f"[AUTH] Supabase auth failed: {response.status_code} - {response.text[:200]}")
            return None
    except Exception as e:
        print(f"[AUTH] Exception calling Supabase: {type(e).__name__}: {str(e)}")
        return None

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)

def get_current_matcher(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_admin)
) -> Dict:
    """Get the current authenticated matcher from JWT token (Supabase version)."""
    token = credentials.credentials

    # Decode token
    payload = auth.decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get matcher email from token
    matcher_email = payload.get("sub")
    if not matcher_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get matcher from Supabase by email
    matcher = crud.get_matcher_by_email(supabase, matcher_email)

    if not matcher:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Matcher not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return matcher


def verify_event_ownership(
    event_id: str,
    current_matcher: Dict = Depends(get_current_matcher),
    supabase: Client = Depends(get_supabase_admin)
) -> Tuple[Dict, Dict]:
    """Verify that the current matcher owns the specified event.

    Returns:
        Tuple of (event, current_matcher) if authorized.

    Raises:
        HTTPException: 404 if event not found, 403 if not authorized.
    """
    event = crud.get_event_by_id(supabase, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    if event['creator_id'] != current_matcher['id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this event"
        )

    return event, current_matcher


def get_current_participant(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_admin)
) -> Dict:
    """
    Get the current authenticated participant user from JWT token.

    This dependency validates the JWT token and retrieves the participant user
    from the database. It supports both custom JWT tokens (for email/password auth)
    and Supabase Auth tokens (for OAuth).

    Args:
        credentials: Bearer token from Authorization header.
        supabase: Supabase client instance.

    Returns:
        Participant user data as a dictionary.

    Raises:
        HTTPException: 401 if token is invalid or participant not found.
    """
    token = credentials.credentials

    # First try to decode as our custom JWT
    payload = auth.decode_access_token(token)

    if payload:
        # Custom JWT token - get participant by email
        participant_email = payload.get("sub")
        user_type = payload.get("type")

        if not participant_email or user_type != "participant":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )

        participant_user = crud.get_participant_user_by_email(supabase, participant_email)
    else:
        # Try as Supabase Auth token - verify using direct API call
        try:
            print(f"[AUTH] Attempting Supabase Auth token verification, token prefix: {token[:20]}...")

            # Use direct API call to verify token (more reliable than SDK)
            user_data = verify_supabase_token(token)

            if not user_data:
                print("[AUTH] Supabase token verification failed - no user data returned")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            supabase_auth_id = user_data.get('id')
            user_email = user_data.get('email')
            user_metadata = user_data.get('user_metadata', {})

            if not supabase_auth_id:
                print("[AUTH] No user ID in Supabase auth response")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token - no user ID",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            print(f"[AUTH] Got Supabase user ID: {supabase_auth_id}, email: {user_email}")
            # Use admin client for database operations (bypasses RLS)
            participant_user = crud.get_participant_user_by_supabase_auth_id(supabase, supabase_auth_id)

            # If no participant user exists yet, create one from Supabase Auth data
            if not participant_user:
                print(f"[AUTH] Creating new participant user for Supabase auth ID: {supabase_auth_id}")
                participant_user = crud.create_participant_user(supabase, {
                    'email': user_email,
                    'name': user_metadata.get('full_name') or user_metadata.get('name') or (user_email.split('@')[0] if user_email else 'User'),
                    'supabase_auth_id': supabase_auth_id,
                    'profile_data': user_metadata
                })
        except HTTPException:
            raise
        except Exception as e:
            print(f"[AUTH] Supabase auth verification failed: {type(e).__name__}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid or expired token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    if not participant_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Participant user not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return participant_user


def get_current_participant_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    supabase: Client = Depends(get_supabase_admin)
) -> Optional[Dict]:
    """
    Optionally get the current authenticated participant user.

    This dependency is similar to get_current_participant but returns None
    instead of raising an exception if no valid token is provided.
    Useful for endpoints that support both authenticated and anonymous access.

    Args:
        credentials: Optional Bearer token from Authorization header.
        supabase: Supabase client instance.

    Returns:
        Participant user data as a dictionary, or None if not authenticated.
    """
    if not credentials:
        return None

    try:
        token = credentials.credentials
        payload = auth.decode_access_token(token)

        if payload:
            participant_email = payload.get("sub")
            user_type = payload.get("type")
            if participant_email and user_type == "participant":
                return crud.get_participant_user_by_email(supabase, participant_email)
        else:
            # Try Supabase Auth token - use direct API call for verification
            user_data = verify_supabase_token(token)
            if user_data and user_data.get('id'):
                return crud.get_participant_user_by_supabase_auth_id(supabase, user_data['id'])
    except Exception:
        pass

    return None
