"""Venues router using Supabase"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from typing import List, Dict
from .. import schemas
from .. import crud_supabase as crud
from ..supabase_client import get_supabase_admin
from ..dependencies_supabase import require_role

router = APIRouter(
    prefix="/api/events/{event_id}/venues",
    tags=["venues"]
)

def verify_event_access(event_id: str, current_user: Dict, supabase: Client):
    """Verify that the current matcher has access to this event."""
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


@router.get("", response_model=List[schemas.VenueResponse])
def get_venues(
    event_id: str,
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Get all venues for an event."""
    verify_event_access(event_id, current_matcher, supabase)
    venues = crud.get_event_venues(supabase, event_id)
    return venues


@router.get("/{venue_id}", response_model=schemas.VenueResponse)
def get_venue(
    event_id: str,
    venue_id: str,
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Get a specific venue."""
    verify_event_access(event_id, current_matcher, supabase)

    venue = crud.get_venue_by_id(supabase, venue_id)
    if not venue or venue['event_id'] != event_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venue not found"
        )

    return venue


@router.post("", response_model=schemas.VenueResponse, status_code=status.HTTP_201_CREATED)
def create_venue(
    event_id: str,
    venue: schemas.VenueCreate,
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Create a new venue for an event."""
    verify_event_access(event_id, current_matcher, supabase)

    venue_data = venue.model_dump()
    db_venue = crud.create_venue(supabase, event_id, venue_data)
    return db_venue


@router.put("/{venue_id}", response_model=schemas.VenueResponse)
def update_venue(
    event_id: str,
    venue_id: str,
    venue_update: schemas.VenueUpdate,
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Update a venue."""
    verify_event_access(event_id, current_matcher, supabase)

    venue = crud.get_venue_by_id(supabase, venue_id)
    if not venue or venue['event_id'] != event_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venue not found"
        )

    venue_data = venue_update.model_dump(exclude_unset=True)
    updated_venue = crud.update_venue(supabase, venue_id, venue_data)
    return updated_venue


@router.delete("/{venue_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_venue(
    event_id: str,
    venue_id: str,
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Delete a venue (soft delete if has matches)."""
    verify_event_access(event_id, current_matcher, supabase)

    venue = crud.get_venue_by_id(supabase, venue_id)
    if not venue or venue['event_id'] != event_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venue not found"
        )

    crud.delete_venue(supabase, venue_id)
    return None
