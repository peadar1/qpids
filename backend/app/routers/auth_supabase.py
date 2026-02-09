"""Unified Auth router using Supabase Auth"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from typing import Dict
from .. import schemas
from .. import crud_supabase as crud
from ..supabase_client import get_supabase_admin
from ..dependencies_supabase import get_current_user, require_role

router = APIRouter(
    prefix="/api/auth",
    tags=["auth"]
)


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: Dict = Depends(get_current_user)):
    """
    Get current user profile.

    Creates user if first login via OAuth. Returns user data with roles.
    This endpoint converts Supabase OAuth tokens to our user system.

    Args:
        current_user: Current user from Supabase Auth.

    Returns:
        User profile data.
    """
    return current_user


@router.put("/me", response_model=schemas.UserResponse)
def update_me(
    updates: schemas.UserUpdate,
    current_user: Dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Update current user profile.

    Args:
        updates: Fields to update (name, phone_number, date_of_birth, profile_data).
        current_user: Current user from authentication.
        supabase: Supabase client instance.

    Returns:
        Updated user profile data.
    """
    update_data = updates.model_dump(exclude_unset=True)
    return crud.update_user(supabase, current_user['id'], update_data)


@router.post("/upgrade-to-matcher", response_model=schemas.UserResponse)
def upgrade_to_matcher(
    current_user: Dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Add matcher role to current user.

    Upgrades a participant to also have matcher privileges,
    allowing them to create and manage events.

    Args:
        current_user: Current user from authentication.
        supabase: Supabase client instance.

    Returns:
        Updated user data with matcher role.

    Raises:
        HTTPException: 400 if user already has matcher role.
    """
    if 'matcher' in current_user.get('roles', []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already a matcher"
        )
    return crud.add_role_to_user(supabase, current_user['id'], 'matcher')


@router.get("/check-matcher", response_model=Dict)
def check_matcher_status(current_user: Dict = Depends(get_current_user)):
    """
    Check if current user has matcher role.

    Args:
        current_user: Current user from authentication.

    Returns:
        Dictionary with is_matcher boolean and user info.
    """
    return {
        "is_matcher": 'matcher' in current_user.get('roles', []),
        "roles": current_user.get('roles', []),
        "user_id": current_user['id'],
        "email": current_user['email']
    }
