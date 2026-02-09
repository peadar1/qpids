"""Matches router using Supabase"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from typing import List, Dict, Set, Tuple
from pydantic import BaseModel
from .. import schemas
from .. import crud_supabase as crud
from ..supabase_client import get_supabase_admin
from ..dependencies_supabase import require_role


class MatchGenerateResponse(BaseModel):
    matches_created: int
    participants_matched: int
    participants_unmatched: int
    message: str

router = APIRouter(
    prefix="/api/events/{event_id}/matches",
    tags=["matches"]
)


@router.get("", response_model=List[schemas.MatchResponse])
def get_matches(
    event_id: str,
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Get all matches for an event."""
    # Verify event access
    event = crud.get_event_by_id(supabase, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    if event['creator_id'] != current_user['id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this event"
        )

    matches = crud.get_event_matches(supabase, event_id)
    return matches


@router.get("/{match_id}", response_model=schemas.MatchResponse)
def get_match(
    event_id: str,
    match_id: str,
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Get a specific match by ID."""
    # Verify event access
    event = crud.get_event_by_id(supabase, event_id)
    if not event or event['creator_id'] != current_user['id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this event"
        )

    match = crud.get_match_by_id(supabase, match_id)
    if not match or match['event_id'] != event_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )

    return match


@router.post("", response_model=schemas.MatchResponse, status_code=status.HTTP_201_CREATED)
def create_match(
    event_id: str,
    match: schemas.MatchCreate,
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Create a new match."""
    # Verify event access
    event = crud.get_event_by_id(supabase, event_id)
    if not event or event['creator_id'] != current_user['id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this event"
        )

    match_data = match.model_dump()
    db_match = crud.create_match(supabase, event_id, match_data, current_user['id'])
    return db_match


@router.put("/{match_id}", response_model=schemas.MatchResponse)
def update_match(
    event_id: str,
    match_id: str,
    match_update: schemas.MatchUpdate,
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Update a match."""
    # Verify event access
    event = crud.get_event_by_id(supabase, event_id)
    if not event or event['creator_id'] != current_user['id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this event"
        )

    match = crud.get_match_by_id(supabase, match_id)
    if not match or match['event_id'] != event_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )

    match_data = match_update.model_dump(exclude_unset=True)
    updated_match = crud.update_match(supabase, match_id, match_data)
    return updated_match


@router.delete("/{match_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_match(
    event_id: str,
    match_id: str,
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Delete a match."""
    # Verify event access
    event = crud.get_event_by_id(supabase, event_id)
    if not event or event['creator_id'] != current_user['id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this event"
        )

    match = crud.get_match_by_id(supabase, match_id)
    if not match or match['event_id'] != event_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )

    crud.delete_match(supabase, match_id)
    return None


# ==================== MATCH GENERATION ====================

def _get_participant_preferences(participant: Dict) -> Tuple[str, str]:
    """Extract gender and interested_in from participant data."""
    form_answers = participant.get('form_answers', {}) or {}
    gender = form_answers.get('gender', '').lower()
    interested_in = form_answers.get('interested_in', '').lower()
    return gender, interested_in


def _is_compatible(p1: Dict, p2: Dict) -> bool:
    """Check if two participants are compatible based on gender preferences."""
    g1, pref1 = _get_participant_preferences(p1)
    g2, pref2 = _get_participant_preferences(p2)

    # If preferences are missing, assume compatible
    if not g1 or not g2 or not pref1 or not pref2:
        return True

    # Normalize gender values
    gender_map = {'male': 'male', 'female': 'female', 'man': 'male', 'woman': 'female'}
    g1 = gender_map.get(g1, g1)
    g2 = gender_map.get(g2, g2)

    # Normalize preference values
    pref_map = {'men': 'male', 'women': 'female', 'male': 'male', 'female': 'female'}
    pref1 = pref_map.get(pref1, pref1)
    pref2 = pref_map.get(pref2, pref2)

    # Check mutual compatibility
    p1_likes_p2 = pref1 == 'everyone' or pref1 == g2
    p2_likes_p1 = pref2 == 'everyone' or pref2 == g1

    return p1_likes_p2 and p2_likes_p1


def _calculate_compatibility_score(p1: Dict, p2: Dict) -> int:
    """Calculate compatibility score based on form answers similarity."""
    score = 50  # Base score

    fa1 = p1.get('form_answers', {}) or {}
    fa2 = p2.get('form_answers', {}) or {}

    # Skip standard fields for comparison
    skip_keys = {'gender', 'interested_in', 'name', 'email', 'phone', 'date_of_birth', 'bio'}

    # Compare custom form answers
    common_keys = set(fa1.keys()) & set(fa2.keys()) - skip_keys
    if common_keys:
        matches = 0
        for key in common_keys:
            v1 = fa1.get(key)
            v2 = fa2.get(key)
            if v1 and v2:
                if isinstance(v1, list) and isinstance(v2, list):
                    # Multi-select: check overlap
                    if set(v1) & set(v2):
                        matches += 1
                elif v1 == v2:
                    matches += 1

        # Add up to 50 points based on answer matches
        if common_keys:
            score += int((matches / len(common_keys)) * 50)

    return min(100, score)


@router.post("/generate", response_model=MatchGenerateResponse)
def generate_matches(
    event_id: str,
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Generate matches for all unmatched participants based on preferences."""
    # Verify event access
    event = crud.get_event_by_id(supabase, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    if event['creator_id'] != current_user['id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this event"
        )

    # Get all participants
    participants = crud.get_event_participants(supabase, event_id)
    if len(participants) < 2:
        return MatchGenerateResponse(
            matches_created=0,
            participants_matched=0,
            participants_unmatched=len(participants),
            message="Need at least 2 participants to generate matches"
        )

    # Get existing matches to avoid duplicates
    existing_matches = crud.get_event_matches(supabase, event_id)
    already_matched: Set[str] = set()
    for m in existing_matches:
        already_matched.add(m['participant1_id'])
        already_matched.add(m['participant2_id'])

    # Filter to only unmatched, registered participants
    unmatched = [
        p for p in participants
        if p['id'] not in already_matched and p.get('status') == 'registered'
    ]

    if len(unmatched) < 2:
        return MatchGenerateResponse(
            matches_created=0,
            participants_matched=0,
            participants_unmatched=len(unmatched),
            message="No eligible participants to match"
        )

    # Generate matches
    matches_created = 0
    matched_ids: Set[str] = set()

    # Simple greedy matching algorithm
    for i, p1 in enumerate(unmatched):
        if p1['id'] in matched_ids:
            continue

        best_match = None
        best_score = -1

        for p2 in unmatched[i + 1:]:
            if p2['id'] in matched_ids:
                continue

            if _is_compatible(p1, p2):
                score = _calculate_compatibility_score(p1, p2)
                if score > best_score:
                    best_score = score
                    best_match = p2

        if best_match:
            # Create the match
            match_data = {
                'participant1_id': p1['id'],
                'participant2_id': best_match['id'],
                'compatibility_score': best_score,
                'notes': 'Auto-generated match'
            }
            crud.create_match(supabase, event_id, match_data, current_user['id'])
            matched_ids.add(p1['id'])
            matched_ids.add(best_match['id'])
            matches_created += 1

    participants_matched = len(matched_ids)
    participants_unmatched = len(unmatched) - participants_matched

    return MatchGenerateResponse(
        matches_created=matches_created,
        participants_matched=participants_matched,
        participants_unmatched=participants_unmatched,
        message=f"Successfully created {matches_created} matches"
    )
