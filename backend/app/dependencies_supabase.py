"""Dependencies for Supabase authentication"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from . import auth
from . import crud_supabase as crud
from .supabase_client import get_supabase_admin, get_supabase_anon
from typing import Dict, Tuple, Optional

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
        # Try as Supabase Auth token - use anon client for auth verification
        try:
            # Use anon client for verifying user tokens (not service role)
            supabase_anon = get_supabase_anon()
            user_response = supabase_anon.auth.get_user(token)
            if not user_response or not user_response.user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            supabase_auth_id = user_response.user.id
            # Use admin client for database operations (bypasses RLS)
            participant_user = crud.get_participant_user_by_supabase_auth_id(supabase, supabase_auth_id)

            # If no participant user exists yet, create one from Supabase Auth data
            if not participant_user:
                user_metadata = user_response.user.user_metadata or {}
                participant_user = crud.create_participant_user(supabase, {
                    'email': user_response.user.email,
                    'name': user_metadata.get('full_name') or user_metadata.get('name') or user_response.user.email.split('@')[0],
                    'supabase_auth_id': supabase_auth_id,
                    'profile_data': user_metadata
                })
        except HTTPException:
            raise
        except Exception as e:
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
            # Try Supabase Auth token - use anon client for verification
            supabase_anon = get_supabase_anon()
            user_response = supabase_anon.auth.get_user(token)
            if user_response and user_response.user:
                return crud.get_participant_user_by_supabase_auth_id(supabase, user_response.user.id)
    except Exception:
        pass

    return None
