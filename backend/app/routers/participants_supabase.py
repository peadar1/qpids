"""Participants router using Supabase"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from typing import List, Dict
from .. import schemas
from .. import crud_supabase as crud
from ..supabase_client import get_supabase_admin
from ..dependencies_supabase import get_current_matcher, get_current_participant

router = APIRouter(
    prefix="/api/events/{event_id}/participants",
    tags=["participants"]
)

@router.post("/register", response_model=schemas.ParticipantResponse, status_code=status.HTTP_201_CREATED)
def register_participant(
    event_id: str,
    participant: schemas.ParticipantRegister,
    current_user: Dict = Depends(get_current_participant),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Register a participant for an event.

    This endpoint requires authentication. The registration is linked to the
    participant's account.

    Args:
        event_id: UUID of the event to register for.
        participant: Registration data.
        current_user: Current participant user (authentication required).
        supabase: Supabase client instance.

    Returns:
        Created participant registration.

    Raises:
        HTTPException: 401 if not authenticated, 404 if event not found, 409 if duplicate.
    """
    # Verify event exists
    event = crud.get_event_by_id(supabase, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    # Check if email is already registered for this event (efficient count query)
    if crud.participant_email_exists(supabase, event_id, participant.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email is already registered for this event"
        )

    # Create participant and link to authenticated user
    participant_data = participant.model_dump()
    participant_data['participant_user_id'] = current_user['id']
    db_participant = crud.create_participant(supabase, event_id, participant_data)
    return db_participant


@router.get("", response_model=List[schemas.ParticipantListResponse])
def get_participants(
    event_id: str,
    current_matcher: Dict = Depends(get_current_matcher),
    supabase: Client = Depends(get_supabase_admin)
):
    """Get all participants for an event (requires auth)."""
    # Verify event access
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

    participants = crud.get_event_participants(supabase, event_id)

    # Extract gender and interested_in from form_answers for each participant
    for p in participants:
        if p.get('form_answers'):
            p['gender'] = p['form_answers'].get('gender')
            p['interested_in'] = p['form_answers'].get('interested_in')

    return participants


@router.get("/{participant_id}", response_model=schemas.ParticipantResponse)
def get_participant(
    event_id: str,
    participant_id: str,
    current_matcher: Dict = Depends(get_current_matcher),
    supabase: Client = Depends(get_supabase_admin)
):
    """Get a specific participant by ID."""
    # Verify event access
    event = crud.get_event_by_id(supabase, event_id)
    if not event or event['creator_id'] != current_matcher['id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this event"
        )

    participant = crud.get_participant_by_id(supabase, participant_id)
    if not participant or participant['event_id'] != event_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not found"
        )

    # Extract gender and interested_in from form_answers
    if participant.get('form_answers'):
        participant['gender'] = participant['form_answers'].get('gender')
        participant['interested_in'] = participant['form_answers'].get('interested_in')

    return participant


@router.put("/{participant_id}", response_model=schemas.ParticipantResponse)
def update_participant(
    event_id: str,
    participant_id: str,
    participant_update: schemas.ParticipantUpdate,
    current_matcher: Dict = Depends(get_current_matcher),
    supabase: Client = Depends(get_supabase_admin)
):
    """Update a participant."""
    # Verify event access
    event = crud.get_event_by_id(supabase, event_id)
    if not event or event['creator_id'] != current_matcher['id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this event"
        )

    participant = crud.get_participant_by_id(supabase, participant_id)
    if not participant or participant['event_id'] != event_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not found"
        )

    participant_data = participant_update.model_dump(exclude_unset=True)
    updated_participant = crud.update_participant(supabase, participant_id, participant_data)
    return updated_participant


@router.delete("/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_participant(
    event_id: str,
    participant_id: str,
    current_matcher: Dict = Depends(get_current_matcher),
    supabase: Client = Depends(get_supabase_admin)
):
    """Delete a participant."""
    # Verify event access
    event = crud.get_event_by_id(supabase, event_id)
    if not event or event['creator_id'] != current_matcher['id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this event"
        )

    participant = crud.get_participant_by_id(supabase, participant_id)
    if not participant or participant['event_id'] != event_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not found"
        )

    crud.delete_participant(supabase, participant_id)
    return None
