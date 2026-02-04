"""Public events router for participant portal."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from typing import List, Dict, Optional
from .. import schemas
from .. import crud_supabase as crud
from ..supabase_client import get_supabase_admin
from ..dependencies_supabase import get_current_participant

router = APIRouter(
    prefix="/api/public",
    tags=["public-events"]
)


@router.get("/events/browse", response_model=List[schemas.EventBrowseResponse])
def browse_events(
    area: Optional[str] = Query(None, description="Filter events by area/location"),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Browse public events that are open for registration.

    Returns a list of public events with visibility='public' and
    status='registration_open'. Events can optionally be filtered by area.

    Args:
        area: Optional area filter for location-based browsing.
        supabase: Supabase client instance.

    Returns:
        List of public events with basic info and participant counts.
    """
    events = crud.get_public_events(supabase, area)
    return events


@router.post("/events/access-code", response_model=schemas.EventAccessCodeResponse)
def validate_access_code(
    request: schemas.EventAccessCodeRequest,
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Validate a private event access code.

    Checks if the provided access code matches any event and returns
    basic event info if valid.

    Args:
        request: Access code to validate.
        supabase: Supabase client instance.

    Returns:
        Event ID and name if code is valid.

    Raises:
        HTTPException: 404 if access code is invalid.
    """
    event = crud.get_event_by_access_code(supabase, request.access_code)

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid access code"
        )

    # Check if event is accepting registrations
    if event.get('status') != 'registration_open':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This event is not currently accepting registrations"
        )

    return {
        "event_id": event['id'],
        "event_name": event['name'],
        "valid": True
    }


@router.get("/events/my-events", response_model=List[schemas.ParticipantEventView])
def get_my_events(
    current_user: Dict = Depends(get_current_participant),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Get all events the authenticated participant has registered for.

    Returns a list of event registrations with event details and match counts.

    Args:
        current_user: Current participant user from authentication.
        supabase: Supabase client instance.

    Returns:
        List of event registrations with event info.
    """
    registrations = crud.get_participant_registrations(supabase, current_user['id'])

    return [
        {
            "id": reg['id'],
            "event_id": reg['event_id'],
            "event_name": reg.get('event_name', 'Unknown Event'),
            "event_date": reg.get('event_date'),
            "event_status": reg.get('event_status', 'unknown'),
            "registration_status": reg['status'],
            "registered_at": reg['created_at'],
            "match_count": reg.get('match_count', 0)
        }
        for reg in registrations
    ]


@router.get("/events/my-matches", response_model=List[schemas.ParticipantMatchView])
def get_my_matches(
    current_user: Dict = Depends(get_current_participant),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Get all matches for the authenticated participant across all events.

    Returns a list of matches with partner details and venue info.

    Args:
        current_user: Current participant user from authentication.
        supabase: Supabase client instance.

    Returns:
        List of matches with partner and event details.
    """
    matches = crud.get_participant_matches(supabase, current_user['id'])
    return matches


@router.get("/events/{event_id}", response_model=schemas.EventPublicResponse)
def get_public_event(
    event_id: str,
    access_code: Optional[str] = Query(None, description="Access code for private events"),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Get public event details.

    For public events, no access code is required. For private events,
    a valid access code must be provided.

    Args:
        event_id: UUID of the event.
        access_code: Optional access code for private events.
        supabase: Supabase client instance.

    Returns:
        Public event details.

    Raises:
        HTTPException: 404 if event not found, 403 if private and no valid code.
    """
    event = crud.get_event_by_id(supabase, event_id)

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    # Check access for private events
    visibility = event.get('visibility', 'private')
    if visibility == 'private':
        if not access_code or event.get('access_code') != access_code:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This is a private event. Please provide a valid access code."
            )

    return event


@router.post("/events/{event_id}/register", response_model=schemas.ParticipantResponse)
def register_for_event(
    event_id: str,
    participant_data: schemas.ParticipantRegister,
    access_code: Optional[str] = Query(None, description="Access code for private events"),
    current_user: Dict = Depends(get_current_participant),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Register for an event.

    This endpoint requires authentication. The registration is linked to the
    participant's account. For private events, a valid access code must be provided.

    Args:
        event_id: UUID of the event to register for.
        participant_data: Registration data.
        access_code: Optional access code for private events.
        current_user: Current participant user (authentication required).
        supabase: Supabase client instance.

    Returns:
        Created participant registration.

    Raises:
        HTTPException: 401 if not authenticated, various errors for invalid event, etc.
    """
    # Get and validate event
    event = crud.get_event_by_id(supabase, event_id)

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    # Check event status
    if event.get('status') != 'registration_open':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This event is not currently accepting registrations"
        )

    # Check access for private events
    visibility = event.get('visibility', 'private')
    if visibility == 'private':
        if not access_code or event.get('access_code') != access_code:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This is a private event. Please provide a valid access code."
            )

    # Check if email already registered for this event
    if crud.participant_email_exists(supabase, event_id, participant_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email is already registered for this event"
        )

    # Create participant registration
    participant_dict = participant_data.model_dump()

    # Always link to the authenticated participant user account
    participant_dict['participant_user_id'] = current_user['id']

    db_participant = crud.create_participant(supabase, event_id, participant_dict)

    return db_participant


@router.get("/areas", response_model=List[str])
def get_available_areas(
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Get list of distinct areas with public events.

    Returns a list of unique area values from public events
    that can be used for filtering.

    Args:
        supabase: Supabase client instance.

    Returns:
        List of distinct area strings.
    """
    response = supabase.table('events').select('area').eq(
        'visibility', 'public'
    ).eq('status', 'registration_open').not_.is_('area', 'null').execute()

    # Get unique areas
    areas = list(set(event['area'] for event in response.data if event.get('area')))
    areas.sort()

    return areas
