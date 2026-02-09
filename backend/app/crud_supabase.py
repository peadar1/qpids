"""Supabase CRUD operations"""
import logging
from supabase import Client
from postgrest.exceptions import APIError
from typing import List, Optional, Dict, Any
from datetime import datetime
from . import auth

logger = logging.getLogger(__name__)

# ===================================
# MATCHER OPERATIONS
# ===================================

def get_matcher_by_email(supabase: Client, email: str) -> Optional[Dict]:
    """Get a matcher by email."""
    try:
        response = supabase.table('matchers').select('*').eq('email', email).single().execute()
        return response.data
    except APIError as e:
        # No row found or other API error
        logger.debug(f"Matcher not found for email {email}: {e}")
        return None


def get_matcher_by_id(supabase: Client, matcher_id: str) -> Optional[Dict]:
    """Get a matcher by ID."""
    try:
        response = supabase.table('matchers').select('*').eq('id', matcher_id).single().execute()
        return response.data
    except APIError as e:
        logger.debug(f"Matcher not found for id {matcher_id}: {e}")
        return None


def create_matcher(supabase: Client, matcher_data: Dict) -> Dict:
    """Create a new matcher."""
    hashed_password = auth.hash_password(matcher_data['password'])

    matcher_insert = {
        'name': matcher_data['name'],
        'email': matcher_data['email'],
        'password_hash': hashed_password
    }

    supabase.table('matchers').insert(matcher_insert).execute()
    # Return the created matcher with all fields
    return get_matcher_by_email(supabase, matcher_data['email'])


def authenticate_matcher(supabase: Client, email: str, password: str) -> Optional[Dict]:
    """Authenticate a matcher by email and password."""
    matcher = get_matcher_by_email(supabase, email)
    if not matcher:
        return None
    if not auth.verify_password(password, matcher['password_hash']):
        return None
    return matcher


# ===================================
# VENUE OPERATIONS
# ===================================

def get_venue_by_id(supabase: Client, venue_id: str) -> Optional[Dict]:
    """Get a venue by ID."""
    try:
        response = supabase.table('venues').select('*').eq('id', venue_id).single().execute()
        return response.data
    except APIError as e:
        logger.debug(f"Venue not found for id {venue_id}: {e}")
        return None


def get_event_venues(supabase: Client, event_id: str) -> List[Dict]:
    """Get all venues for an event, ordered by name."""
    response = supabase.table('venues').select('*').eq(
        'event_id', event_id
    ).order('name').execute()
    return response.data


def create_venue(supabase: Client, event_id: str, venue_data: Dict) -> Dict:
    """Create a new venue."""
    # Prepare venue data
    venue_insert = {
        'event_id': event_id,
        'name': venue_data['name'],
        'address': venue_data.get('address'),
        'total_capacity': venue_data['total_capacity'],
        'available_slots': venue_data['total_capacity'],  # Initially all slots available
        'min_age': venue_data['min_age'],
        'is_active': True
    }

    supabase.table('venues').insert(venue_insert).execute()
    # Get the created venue with all fields
    return supabase.table('venues').select('*').eq('event_id', event_id).eq('name', venue_data['name']).order('created_at', desc=True).limit(1).execute().data[0]


def update_venue(supabase: Client, venue_id: str, venue_update: Dict) -> Optional[Dict]:
    """Update a venue."""
    # Get current venue to calculate available_slots
    current_venue = get_venue_by_id(supabase, venue_id)
    if not current_venue:
        return None

    update_data = {k: v for k, v in venue_update.items() if v is not None}

    # If total_capacity is updated, adjust available_slots proportionally
    if 'total_capacity' in update_data:
        old_capacity = current_venue['total_capacity']
        new_capacity = update_data['total_capacity']
        used_slots = old_capacity - current_venue['available_slots']
        update_data['available_slots'] = max(0, new_capacity - used_slots)

    supabase.table('venues').update(update_data).eq('id', venue_id).execute()
    return get_venue_by_id(supabase, venue_id)


def delete_venue(supabase: Client, venue_id: str) -> bool:
    """Delete a venue (soft delete if has matches)."""
    # Check if venue has matches assigned
    matches_response = supabase.table('matches').select('id', count='exact').eq(
        'venue_id', venue_id
    ).execute()

    if matches_response.count > 0:
        # Just deactivate instead of deleting
        supabase.table('venues').update({'is_active': False}).eq('id', venue_id).execute()
        return True

    # No matches, safe to delete
    supabase.table('venues').delete().eq('id', venue_id).execute()
    return True


# ===================================
# EVENT OPERATIONS
# ===================================

def get_event_by_id(supabase: Client, event_id: str) -> Optional[Dict]:
    """Get an event by ID."""
    try:
        response = supabase.table('events').select('*').eq('id', event_id).single().execute()
        return response.data
    except APIError as e:
        logger.debug(f"Event not found for id {event_id}: {e}")
        return None


def get_matcher_events(supabase: Client, matcher_id: str) -> List[Dict]:
    """Get all events for a matcher."""
    response = supabase.table('events').select('*').eq(
        'creator_id', matcher_id
    ).order('created_at', desc=True).execute()
    return response.data


def get_event_counts(supabase: Client, event_ids: List[str]) -> Dict[str, Dict[str, int]]:
    """Get participant and match counts for multiple events efficiently."""
    if not event_ids:
        return {}

    counts = {eid: {'participant_count': 0, 'match_count': 0} for eid in event_ids}

    # Get participant counts
    for event_id in event_ids:
        p_response = supabase.table('participants').select('id', count='exact').eq('event_id', event_id).execute()
        counts[event_id]['participant_count'] = p_response.count or 0

    # Get match counts
    for event_id in event_ids:
        m_response = supabase.table('matches').select('id', count='exact').eq('event_id', event_id).execute()
        counts[event_id]['match_count'] = m_response.count or 0

    return counts


def create_event(supabase: Client, event_data: Dict, creator_id: str) -> Dict:
    """Create a new event."""
    # Convert date to string if it's a date object
    event_date = event_data['event_date']
    if hasattr(event_date, 'isoformat'):
        event_date = event_date.isoformat()

    event_insert = {
        'name': event_data['name'],
        'description': event_data.get('description'),
        'event_date': event_date,
        'creator_id': creator_id,
        'status': event_data.get('status', 'setup'),
        'settings': event_data.get('settings')
    }

    supabase.table('events').insert(event_insert).execute()
    # Get the created event with all fields
    return supabase.table('events').select('*').eq('creator_id', creator_id).eq('name', event_data['name']).order('created_at', desc=True).limit(1).execute().data[0]


def update_event(supabase: Client, event_id: str, event_update: Dict) -> Optional[Dict]:
    """Update an event."""
    update_data = {}
    for k, v in event_update.items():
        if v is not None:
            # Convert date objects to ISO format strings
            if hasattr(v, 'isoformat'):
                v = v.isoformat()
            update_data[k] = v

    supabase.table('events').update(update_data).eq('id', event_id).execute()
    return get_event_by_id(supabase, event_id)


def delete_event(supabase: Client, event_id: str) -> bool:
    """Delete an event (cascades to related data via foreign keys)."""
    supabase.table('events').delete().eq('id', event_id).execute()
    return True


# ===================================
# PARTICIPANT OPERATIONS
# ===================================

def get_participant_by_id(supabase: Client, participant_id: str) -> Optional[Dict]:
    """Get a participant by ID."""
    try:
        response = supabase.table('participants').select('*').eq('id', participant_id).single().execute()
        return response.data
    except APIError as e:
        logger.debug(f"Participant not found for id {participant_id}: {e}")
        return None


def get_event_participants(supabase: Client, event_id: str) -> List[Dict]:
    """Get all participants for an event."""
    response = supabase.table('participants').select('*').eq(
        'event_id', event_id
    ).order('created_at', desc=True).execute()
    return response.data


def participant_email_exists(supabase: Client, event_id: str, email: str) -> bool:
    """Check if a participant with given email exists in an event (case-insensitive)."""
    response = supabase.table('participants').select('id', count='exact').eq(
        'event_id', event_id
    ).ilike('email', email).execute()
    return (response.count or 0) > 0


def create_participant(supabase: Client, event_id: str, participant_data: Dict) -> Dict:
    """Create a new participant."""
    # Store gender and interested_in in form_answers if provided
    form_answers = participant_data.get('form_answers', {})
    if 'gender' in participant_data:
        form_answers['gender'] = participant_data['gender']
    if 'interested_in' in participant_data:
        form_answers['interested_in'] = participant_data['interested_in']

    participant_insert = {
        'event_id': event_id,
        'name': participant_data['name'],
        'email': participant_data['email'],
        'phone_number': participant_data.get('phone'),
        'age': participant_data.get('age'),
        'form_answers': form_answers,
        'status': 'registered'
    }

    supabase.table('participants').insert(participant_insert).execute()
    # Get the created participant with all fields
    return supabase.table('participants').select('*').eq('event_id', event_id).eq('email', participant_data['email']).order('created_at', desc=True).limit(1).execute().data[0]


def update_participant(supabase: Client, participant_id: str, participant_update: Dict) -> Optional[Dict]:
    """Update a participant."""
    update_data = {}
    for k, v in participant_update.items():
        if v is not None:
            # Convert date objects to ISO format strings
            if hasattr(v, 'isoformat'):
                v = v.isoformat()
            # Map 'phone' to 'phone_number' for database column
            if k == 'phone':
                update_data['phone_number'] = v
            else:
                update_data[k] = v

    supabase.table('participants').update(update_data).eq('id', participant_id).execute()
    return get_participant_by_id(supabase, participant_id)


def delete_participant(supabase: Client, participant_id: str) -> bool:
    """Delete a participant."""
    supabase.table('participants').delete().eq('id', participant_id).execute()
    return True


# ===================================
# FORM QUESTION OPERATIONS
# ===================================

def get_form_question_by_id(supabase: Client, question_id: str) -> Optional[Dict]:
    """Get a form question by ID."""
    try:
        response = supabase.table('form_questions').select('*').eq('id', question_id).single().execute()
        return response.data
    except APIError as e:
        logger.debug(f"Form question not found for id {question_id}: {e}")
        return None


def get_event_form_questions(supabase: Client, event_id: str, active_only: bool = False) -> List[Dict]:
    """Get all form questions for an event."""
    query = supabase.table('form_questions').select('*').eq('event_id', event_id)

    if active_only:
        query = query.eq('is_active', True)

    response = query.order('display_order').execute()
    return response.data


def create_form_question(supabase: Client, event_id: str, question_data: Dict) -> Dict:
    """Create a new form question."""
    # Get max display_order for this event
    max_order_response = supabase.table('form_questions').select('display_order').eq(
        'event_id', event_id
    ).order('display_order', desc=True).limit(1).execute()

    next_order = 1
    if max_order_response.data:
        next_order = max_order_response.data[0]['display_order'] + 1

    question_insert = {
        'event_id': event_id,
        'question_key': question_data['question_key'],
        'question_text': question_data['question_text'],
        'question_type': question_data['question_type'],
        'options': question_data.get('options'),
        'is_required': question_data.get('is_required', True),
        'is_active': question_data.get('is_active', True),
        'is_standard': False,
        'display_order': question_data.get('display_order', next_order)
    }

    supabase.table('form_questions').insert(question_insert).execute()
    # Get the created question with all fields
    return supabase.table('form_questions').select('*').eq('event_id', event_id).eq('question_key', question_data['question_key']).order('created_at', desc=True).limit(1).execute().data[0]


def update_form_question(supabase: Client, question_id: str, question_update: Dict) -> Optional[Dict]:
    """Update a form question."""
    update_data = {k: v for k, v in question_update.items() if v is not None}

    supabase.table('form_questions').update(update_data).eq('id', question_id).execute()
    return get_form_question_by_id(supabase, question_id)


def delete_form_question(supabase: Client, question_id: str) -> bool:
    """Delete a form question."""
    supabase.table('form_questions').delete().eq('id', question_id).execute()
    return True


def reorder_form_questions(supabase: Client, questions: List[Dict]) -> bool:
    """Reorder form questions."""
    for question in questions:
        supabase.table('form_questions').update({
            'display_order': question['display_order']
        }).eq('id', question['id']).execute()
    return True


# ===================================
# MATCH OPERATIONS
# ===================================

def get_match_by_id(supabase: Client, match_id: str) -> Optional[Dict]:
    """Get a match by ID."""
    try:
        response = supabase.table('matches').select('*').eq('id', match_id).single().execute()
        return response.data
    except APIError as e:
        logger.debug(f"Match not found for id {match_id}: {e}")
        return None


def get_event_matches(supabase: Client, event_id: str) -> List[Dict]:
    """Get all matches for an event."""
    response = supabase.table('matches').select('*').eq(
        'event_id', event_id
    ).order('created_at', desc=True).execute()
    return response.data


def create_match(supabase: Client, event_id: str, match_data: Dict, matcher_id: str) -> Dict:
    """Create a new match."""
    match_insert = {
        'event_id': event_id,
        'participant1_id': match_data['participant1_id'],
        'participant2_id': match_data['participant2_id'],
        'compatibility_score': match_data['compatibility_score'],
        'venue_id': match_data.get('venue_id'),
        'matched_by': matcher_id,
        'status': 'pending',
        'notes': match_data.get('notes')
    }

    supabase.table('matches').insert(match_insert).execute()
    # Get the created match with all fields
    return supabase.table('matches').select('*').eq('event_id', event_id).eq('participant1_id', match_data['participant1_id']).eq('participant2_id', match_data['participant2_id']).order('created_at', desc=True).limit(1).execute().data[0]


def update_match(supabase: Client, match_id: str, match_update: Dict) -> Optional[Dict]:
    """Update a match."""
    update_data = {k: v for k, v in match_update.items() if v is not None}

    supabase.table('matches').update(update_data).eq('id', match_id).execute()
    return get_match_by_id(supabase, match_id)


def delete_match(supabase: Client, match_id: str) -> bool:
    """Delete a match."""
    supabase.table('matches').delete().eq('id', match_id).execute()
    return True


# ===================================
# PARTICIPANT USER OPERATIONS
# ===================================

def get_participant_user_by_id(supabase: Client, user_id: str) -> Optional[Dict]:
    """
    Get a participant user by ID.

    Args:
        supabase: Supabase client instance.
        user_id: The UUID of the participant user.

    Returns:
        Participant user data as a dictionary, or None if not found.
    """
    try:
        response = supabase.table('participant_users').select('*').eq('id', user_id).single().execute()
        return response.data
    except APIError as e:
        logger.debug(f"Participant user not found for id {user_id}: {e}")
        return None


def get_participant_user_by_email(supabase: Client, email: str) -> Optional[Dict]:
    """
    Get a participant user by email.

    Args:
        supabase: Supabase client instance.
        email: Email address to look up.

    Returns:
        Participant user data as a dictionary, or None if not found.
    """
    try:
        response = supabase.table('participant_users').select('*').ilike('email', email).single().execute()
        return response.data
    except APIError as e:
        logger.debug(f"Participant user not found for email {email}: {e}")
        return None


def get_participant_user_by_supabase_auth_id(supabase: Client, auth_id: str) -> Optional[Dict]:
    """
    Get a participant user by Supabase Auth ID.

    Args:
        supabase: Supabase client instance.
        auth_id: Supabase Auth user ID.

    Returns:
        Participant user data as a dictionary, or None if not found.
    """
    try:
        response = supabase.table('participant_users').select('*').eq('supabase_auth_id', auth_id).single().execute()
        return response.data
    except APIError as e:
        logger.debug(f"Participant user not found for supabase_auth_id {auth_id}: {e}")
        return None


def create_participant_user(supabase: Client, user_data: Dict) -> Dict:
    """
    Create a new participant user.

    Args:
        supabase: Supabase client instance.
        user_data: Dictionary containing user data (email, name, etc.).

    Returns:
        The created participant user data.
    """
    # Convert date_of_birth to string if it's a date object
    date_of_birth = user_data.get('date_of_birth')
    if date_of_birth and hasattr(date_of_birth, 'isoformat'):
        date_of_birth = date_of_birth.isoformat()

    user_insert = {
        'email': user_data['email'],
        'name': user_data['name'],
        'phone_number': user_data.get('phone_number'),
        'date_of_birth': date_of_birth,
        'profile_data': user_data.get('profile_data', {}),
        'supabase_auth_id': user_data.get('supabase_auth_id')
    }

    supabase.table('participant_users').insert(user_insert).execute()
    return get_participant_user_by_email(supabase, user_data['email'])


def update_participant_user(supabase: Client, user_id: str, user_update: Dict) -> Optional[Dict]:
    """
    Update a participant user.

    Args:
        supabase: Supabase client instance.
        user_id: UUID of the participant user to update.
        user_update: Dictionary containing fields to update.

    Returns:
        Updated participant user data, or None if not found.
    """
    update_data = {}
    for k, v in user_update.items():
        if v is not None:
            if hasattr(v, 'isoformat'):
                v = v.isoformat()
            update_data[k] = v

    supabase.table('participant_users').update(update_data).eq('id', user_id).execute()
    return get_participant_user_by_id(supabase, user_id)


def delete_participant_user(supabase: Client, user_id: str) -> bool:
    """
    Delete a participant user.

    Args:
        supabase: Supabase client instance.
        user_id: UUID of the participant user to delete.

    Returns:
        True if deletion was successful.
    """
    supabase.table('participant_users').delete().eq('id', user_id).execute()
    return True


# ===================================
# PUBLIC EVENT OPERATIONS
# ===================================

def get_public_events(supabase: Client, area: Optional[str] = None) -> List[Dict]:
    """
    Get all public events, optionally filtered by area.

    Args:
        supabase: Supabase client instance.
        area: Optional area filter.

    Returns:
        List of public events with participant counts.
    """
    query = supabase.table('events').select('*').eq('visibility', 'public').eq('status', 'registration_open')

    if area:
        query = query.ilike('area', f'%{area}%')

    response = query.order('event_date').execute()
    events = response.data

    # Add participant counts
    for event in events:
        p_response = supabase.table('participants').select('id', count='exact').eq('event_id', event['id']).execute()
        event['participant_count'] = p_response.count or 0

    return events


def get_event_by_access_code(supabase: Client, access_code: str) -> Optional[Dict]:
    """
    Get an event by its access code.

    Args:
        supabase: Supabase client instance.
        access_code: The unique access code for the event.

    Returns:
        Event data if found and valid, None otherwise.
    """
    try:
        response = supabase.table('events').select('*').eq('access_code', access_code).single().execute()
        return response.data
    except APIError as e:
        logger.debug(f"Event not found for access code {access_code}: {e}")
        return None


def get_participant_registrations(supabase: Client, participant_user_id: str) -> List[Dict]:
    """
    Get all event registrations for a participant user.

    Args:
        supabase: Supabase client instance.
        participant_user_id: UUID of the participant user.

    Returns:
        List of event registrations with event details.
    """
    response = supabase.table('participants').select('*').eq('participant_user_id', participant_user_id).execute()
    registrations = response.data

    # Enrich with event details and match counts
    for reg in registrations:
        event = get_event_by_id(supabase, reg['event_id'])
        if event:
            reg['event_name'] = event['name']
            reg['event_date'] = event['event_date']
            reg['event_status'] = event['status']

        # Get match count for this participant
        m_response = supabase.table('matches').select('id', count='exact').or_(
            f"participant1_id.eq.{reg['id']},participant2_id.eq.{reg['id']}"
        ).execute()
        reg['match_count'] = m_response.count or 0

    return registrations


def get_participant_matches(supabase: Client, participant_user_id: str) -> List[Dict]:
    """
    Get all matches for a participant user across all events.

    Args:
        supabase: Supabase client instance.
        participant_user_id: UUID of the participant user.

    Returns:
        List of matches with partner details and event info.
    """
    # First get all participant registrations for this user
    reg_response = supabase.table('participants').select('id, event_id, name').eq(
        'participant_user_id', participant_user_id
    ).execute()
    registrations = reg_response.data

    if not registrations:
        return []

    all_matches = []

    for reg in registrations:
        participant_id = reg['id']
        event_id = reg['event_id']

        # Get matches where this participant is either participant1 or participant2
        matches_response = supabase.table('matches').select('*').eq('event_id', event_id).or_(
            f"participant1_id.eq.{participant_id},participant2_id.eq.{participant_id}"
        ).execute()

        for match in matches_response.data:
            # Determine who the matched partner is
            if match['participant1_id'] == participant_id:
                partner_id = match['participant2_id']
            else:
                partner_id = match['participant1_id']

            # Get partner details
            partner = get_participant_by_id(supabase, partner_id)
            if not partner:
                continue

            # Get event details
            event = get_event_by_id(supabase, event_id)
            event_name = event['name'] if event else 'Unknown Event'

            # Get venue details if assigned
            venue_name = None
            venue_address = None
            if match.get('venue_id'):
                venue = get_venue_by_id(supabase, match['venue_id'])
                if venue:
                    venue_name = venue['name']
                    venue_address = venue.get('address')

            all_matches.append({
                'id': match['id'],
                'event_id': event_id,
                'event_name': event_name,
                'match_name': partner['name'],
                'match_email': partner.get('email'),
                'match_phone': partner.get('phone_number'),
                'compatibility_score': match['compatibility_score'],
                'status': match['status'],
                'venue_name': venue_name,
                'venue_address': venue_address,
                'matched_at': match['created_at']
            })

    return all_matches


def link_participant_to_user(supabase: Client, participant_id: str, participant_user_id: str) -> Optional[Dict]:
    """
    Link an existing participant registration to a participant user account.

    Args:
        supabase: Supabase client instance.
        participant_id: UUID of the participant registration.
        participant_user_id: UUID of the participant user account.

    Returns:
        Updated participant data, or None if not found.
    """
    supabase.table('participants').update({
        'participant_user_id': participant_user_id
    }).eq('id', participant_id).execute()
    return get_participant_by_id(supabase, participant_id)


# ===================================
# UNIFIED USERS OPERATIONS
# ===================================

def get_user_by_id(supabase: Client, user_id: str) -> Optional[Dict]:
    """
    Get a unified user by ID.

    Args:
        supabase: Supabase client instance.
        user_id: The UUID of the user.

    Returns:
        User data as a dictionary, or None if not found.
    """
    try:
        response = supabase.table('users').select('*').eq('id', user_id).single().execute()
        return response.data
    except APIError as e:
        logger.debug(f"User not found for id {user_id}: {e}")
        return None


def get_user_by_supabase_auth_id(supabase: Client, auth_id: str) -> Optional[Dict]:
    """
    Get a unified user by Supabase Auth ID.

    Args:
        supabase: Supabase client instance.
        auth_id: Supabase Auth user ID.

    Returns:
        User data as a dictionary, or None if not found.
    """
    try:
        response = supabase.table('users').select('*').eq('supabase_auth_id', auth_id).single().execute()
        return response.data
    except APIError as e:
        logger.debug(f"User not found for supabase_auth_id {auth_id}: {e}")
        return None


def get_user_by_email(supabase: Client, email: str) -> Optional[Dict]:
    """
    Get a unified user by email.

    Args:
        supabase: Supabase client instance.
        email: Email address to look up (case-insensitive).

    Returns:
        User data as a dictionary, or None if not found.
    """
    try:
        response = supabase.table('users').select('*').ilike('email', email).single().execute()
        return response.data
    except APIError as e:
        logger.debug(f"User not found for email {email}: {e}")
        return None


def create_user(supabase: Client, data: Dict) -> Dict:
    """
    Create a new unified user.

    Args:
        supabase: Supabase client instance.
        data: Dictionary containing user data (supabase_auth_id, email, name, roles, etc.).

    Returns:
        The created user data.
    """
    # Convert date_of_birth to string if it's a date object
    if 'date_of_birth' in data and data['date_of_birth'] and hasattr(data['date_of_birth'], 'isoformat'):
        data['date_of_birth'] = data['date_of_birth'].isoformat()

    supabase.table('users').insert(data).execute()
    return get_user_by_supabase_auth_id(supabase, data['supabase_auth_id'])


def update_user(supabase: Client, user_id: str, data: Dict) -> Dict:
    """
    Update a unified user.

    Args:
        supabase: Supabase client instance.
        user_id: UUID of the user to update.
        data: Dictionary containing fields to update.

    Returns:
        Updated user data.
    """
    update_data = {}
    for k, v in data.items():
        if v is not None:
            if hasattr(v, 'isoformat'):
                v = v.isoformat()
            update_data[k] = v

    supabase.table('users').update(update_data).eq('id', user_id).execute()
    return get_user_by_id(supabase, user_id)


def link_user_to_supabase_auth(supabase: Client, user_id: str, auth_id: str) -> Dict:
    """
    Link an existing user to a Supabase Auth ID.

    Args:
        supabase: Supabase client instance.
        user_id: UUID of the user.
        auth_id: Supabase Auth user ID to link.

    Returns:
        Updated user data.
    """
    supabase.table('users').update({'supabase_auth_id': auth_id}).eq('id', user_id).execute()
    return get_user_by_id(supabase, user_id)


def add_role_to_user(supabase: Client, user_id: str, role: str) -> Dict:
    """
    Add a role to a user's roles array.

    Args:
        supabase: Supabase client instance.
        user_id: UUID of the user.
        role: Role to add ('participant' or 'matcher').

    Returns:
        Updated user data.
    """
    user = get_user_by_id(supabase, user_id)
    if not user:
        raise ValueError(f"User not found: {user_id}")

    current_roles = user.get('roles', [])
    if role not in current_roles:
        new_roles = list(set(current_roles + [role]))
        return update_user(supabase, user_id, {'roles': new_roles})
    return user


def update_user_last_login(supabase: Client, user_id: str) -> Dict:
    """
    Update the last_login timestamp for a user.

    Args:
        supabase: Supabase client instance.
        user_id: UUID of the user.

    Returns:
        Updated user data.
    """
    from datetime import datetime, timezone
    return update_user(supabase, user_id, {'last_login': datetime.now(timezone.utc).isoformat()})
