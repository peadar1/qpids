"""Participant authentication router using Supabase Auth and email/password fallback."""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from typing import Dict
from .. import schemas, auth
from .. import crud_supabase as crud
from ..supabase_client import get_supabase_admin
from ..dependencies_supabase import get_current_participant

router = APIRouter(
    prefix="/api/participant-auth",
    tags=["participant-auth"]
)


@router.post("/signup", response_model=schemas.ParticipantTokenResponse, status_code=status.HTTP_201_CREATED)
def signup(
    user_data: schemas.ParticipantUserCreate,
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Register a new participant user with email and password.

    This endpoint creates a participant user account using email/password
    authentication (as opposed to OAuth). The password is hashed before storage.

    Args:
        user_data: Participant registration data including email, name, and password.
        supabase: Supabase client instance.

    Returns:
        JWT token and participant user data.

    Raises:
        HTTPException: 400 if email already registered or password missing.
    """
    # Check if email already exists
    existing_user = crud.get_participant_user_by_email(supabase, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Require password for email/password signup
    if not user_data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required for email signup"
        )

    # Hash the password and store it in profile_data
    hashed_password = auth.hash_password(user_data.password)
    profile_data = user_data.profile_data or {}
    profile_data['password_hash'] = hashed_password

    # Create new participant user
    user_dict = user_data.model_dump(exclude={'password'})
    user_dict['profile_data'] = profile_data
    db_user = crud.create_participant_user(supabase, user_dict)

    # Create JWT token with participant type identifier
    token = auth.create_access_token(data={
        "sub": db_user['email'],
        "type": "participant"
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "participant_user": db_user
    }


@router.post("/login", response_model=schemas.ParticipantTokenResponse)
def login(
    credentials: schemas.ParticipantUserLogin,
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Login with email and password.

    Authenticates a participant user using email and password.

    Args:
        credentials: Email and password.
        supabase: Supabase client instance.

    Returns:
        JWT token and participant user data.

    Raises:
        HTTPException: 401 if credentials are invalid.
    """
    # Get participant user by email
    user = crud.get_participant_user_by_email(supabase, credentials.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password from profile_data
    profile_data = user.get('profile_data', {})
    password_hash = profile_data.get('password_hash')

    if not password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account uses OAuth login. Please sign in with Google.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not auth.verify_password(credentials.password, password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create JWT token with participant type identifier
    token = auth.create_access_token(data={
        "sub": user['email'],
        "type": "participant"
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "participant_user": user
    }


@router.post("/callback")
def oauth_callback(
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Handle OAuth callback from Supabase Auth.

    This endpoint is called after successful OAuth authentication.
    The frontend should include the Supabase access token in the
    Authorization header. This endpoint will create or retrieve
    the participant user and return a custom JWT.

    Note: The actual OAuth flow is handled by Supabase Auth on the frontend.
    This endpoint converts a Supabase Auth session to our custom JWT system.

    Args:
        supabase: Supabase client instance.

    Returns:
        Custom JWT token and participant user data.
    """
    # This endpoint expects the Supabase Auth token in the header
    # The get_current_participant dependency will handle token validation
    # and user creation/retrieval
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Use the Authorization header with your Supabase Auth token. "
               "The /me endpoint will create your account if needed."
    )


@router.get("/me", response_model=schemas.ParticipantUserResponse)
def get_me(
    current_user: Dict = Depends(get_current_participant)
):
    """
    Get the current authenticated participant user's profile.

    This endpoint returns the participant user data for the authenticated user.
    If using a Supabase Auth token and no participant_user exists yet,
    one will be created automatically.

    Args:
        current_user: Current participant user from authentication.

    Returns:
        Participant user profile data.
    """
    return current_user


@router.put("/me", response_model=schemas.ParticipantUserResponse)
def update_me(
    user_update: schemas.ParticipantUserUpdate,
    current_user: Dict = Depends(get_current_participant),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Update the current authenticated participant user's profile.

    Args:
        user_update: Fields to update.
        current_user: Current participant user from authentication.
        supabase: Supabase client instance.

    Returns:
        Updated participant user profile data.
    """
    update_data = user_update.model_dump(exclude_unset=True)
    updated_user = crud.update_participant_user(supabase, current_user['id'], update_data)
    return updated_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    current_user: Dict = Depends(get_current_participant),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Delete the current authenticated participant user's account.

    This will delete the participant user account but preserve any
    event registrations (they will become unlinked).

    Args:
        current_user: Current participant user from authentication.
        supabase: Supabase client instance.
    """
    crud.delete_participant_user(supabase, current_user['id'])
    return None
