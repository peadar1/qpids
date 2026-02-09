"""Events router using Supabase - core event operations only"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from typing import List, Dict
from .. import schemas
from .. import crud_supabase as crud
from ..supabase_client import get_supabase_admin
from ..dependencies_supabase import require_role

router = APIRouter(
    prefix="/api/events",
    tags=["events"]
)


# ==================== EVENT ROUTES ====================

@router.get("", response_model=List[schemas.EventListResponse])
def get_my_events(
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Get all events for the current matcher."""
    events = crud.get_matcher_events(supabase, current_user['id'])

    if not events:
        return []

    # Get counts for all events efficiently
    event_ids = [event['id'] for event in events]
    counts = crud.get_event_counts(supabase, event_ids)

    # Build response with counts
    result = []
    for event in events:
        event_counts = counts.get(event['id'], {'participant_count': 0, 'match_count': 0})
        event_dict = {
            'id': event['id'],
            'name': event['name'],
            'event_date': event['event_date'],
            'status': event['status'],
            'created_at': event['created_at'],
            'participant_count': event_counts['participant_count'],
            'match_count': event_counts['match_count']
        }
        result.append(event_dict)

    return result


@router.get("/{event_id}", response_model=schemas.EventResponse)
def get_event(
    event_id: str,
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Get a specific event by ID."""
    event = crud.get_event_by_id(supabase, event_id)

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    # Verify access
    if event['creator_id'] != current_user['id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this event"
        )

    return event


# PUBLIC ENDPOINT - No auth required
@router.get("/{event_id}/public", response_model=schemas.EventPublicResponse)
def get_event_public(
    event_id: str,
    supabase: Client = Depends(get_supabase_admin)
):
    """Get public event info for participant registration (no auth required)."""
    event = crud.get_event_by_id(supabase, event_id)

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    return event


@router.post("", response_model=schemas.EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    event: schemas.EventCreate,
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Create a new event."""
    event_data = event.model_dump()
    db_event = crud.create_event(supabase, event_data, current_user['id'])
    return db_event


@router.put("/{event_id}", response_model=schemas.EventResponse)
def update_event(
    event_id: str,
    event_update: schemas.EventUpdate,
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Update an event."""
    event = crud.get_event_by_id(supabase, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    # Verify access
    if event['creator_id'] != current_user['id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this event"
        )

    event_data = event_update.model_dump(exclude_unset=True)
    updated_event = crud.update_event(supabase, event_id, event_data)
    return updated_event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: str,
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Delete an event."""
    event = crud.get_event_by_id(supabase, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    # Verify access
    if event['creator_id'] != current_user['id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this event"
        )

    crud.delete_event(supabase, event_id)
    return None
