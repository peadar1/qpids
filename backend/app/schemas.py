from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator, model_validator
from typing import Optional, List
from datetime import datetime, date
from enum import Enum


class EventStatus(str, Enum):
    setup = "setup"
    registration_open = "registration_open"
    matching_in_progress = "matching_in_progress"
    completed = "completed"
    cancelled = "cancelled"

# ==================== MATCHER SCHEMAS ====================

class MatcherBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr

class MatcherCreate(MatcherBase):
    password: str = Field(..., min_length=8, max_length=100)

class MatcherLogin(BaseModel):
    email: EmailStr
    password: str

class MatcherResponse(MatcherBase):
    id: str  # UUID from Supabase
    created_at: datetime
    last_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    matcher: MatcherResponse

# Alias for compatibility
class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    matcher: MatcherResponse

# ==================== EVENT SCHEMAS ====================

class EventBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    event_date: date

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    event_date: Optional[date] = None
    status: Optional[EventStatus] = None
    settings: Optional[dict] = None

class EventResponse(EventBase):
    id: str  # UUID from Supabase
    creator_id: str  # UUID from Supabase
    status: str
    settings: Optional[dict] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class EventListResponse(BaseModel):
    id: str  # UUID from Supabase
    name: str
    event_date: date
    status: str
    created_at: datetime
    participant_count: int = 0
    match_count: int = 0

    model_config = ConfigDict(from_attributes=True)

# Public event response (limited info for participants)
class EventPublicResponse(BaseModel):
    id: str  # UUID from Supabase
    name: str
    description: Optional[str] = None
    event_date: date
    status: str
    settings: Optional[dict] = None  # Include settings for form configuration

    model_config = ConfigDict(from_attributes=True)

# ==================== PARTICIPANT SCHEMAS ====================

class ParticipantBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    age: Optional[int] = Field(None, ge=18, le=100)
    gender: Optional[str] = Field(None, pattern="^(male|female|non_binary|other)$")
    interested_in: Optional[str] = Field(None, pattern="^(male|female|everyone)$")

# For public registration (no auth required)
class ParticipantRegister(ParticipantBase):
    form_answers: Optional[dict] = {}  # Custom question answers

# For creating participant (admin)
class ParticipantCreate(ParticipantBase):
    form_answers: Optional[dict] = {}

# For updating participant
class ParticipantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    age: Optional[int] = Field(None, ge=18, le=100)
    gender: Optional[str] = Field(None, pattern="^(male|female|non_binary|other)$")
    interested_in: Optional[str] = Field(None, pattern="^(male|female|everyone)$")
    status: Optional[str] = Field(None, pattern="^(registered|matched|withdrawn|waitlisted)$")
    form_answers: Optional[dict] = None

class ParticipantResponse(BaseModel):
    id: str  # UUID from Supabase
    event_id: str  # UUID from Supabase
    name: str
    email: str
    phone: Optional[str] = Field(None, validation_alias='phone_number')
    age: Optional[int] = None
    gender: Optional[str] = None
    interested_in: Optional[str] = None
    form_answers: Optional[dict] = None
    status: str
    is_verified: Optional[bool] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @classmethod
    def model_validate(cls, obj):
        # Extract gender and interested_in from form_answers if not present
        if isinstance(obj, dict):
            form_answers = obj.get('form_answers', {})
            if form_answers:
                if 'gender' not in obj or obj['gender'] is None:
                    obj['gender'] = form_answers.get('gender')
                if 'interested_in' not in obj or obj['interested_in'] is None:
                    obj['interested_in'] = form_answers.get('interested_in')
        return super().model_validate(obj)

class ParticipantListResponse(BaseModel):
    id: str  # UUID from Supabase
    name: str
    email: str
    age: Optional[int] = None
    gender: Optional[str] = None
    interested_in: Optional[str] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ==================== VENUE SCHEMAS ====================

class VenueBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    address: Optional[str] = None
    total_capacity: int = Field(..., ge=1)
    min_age: int = Field(..., ge=18, le=21)

class VenueCreate(VenueBase):
    pass

class VenueUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    address: Optional[str] = None
    total_capacity: Optional[int] = Field(None, ge=1)
    min_age: Optional[int] = Field(None, ge=18, le=21)
    is_active: Optional[bool] = None

class VenueResponse(VenueBase):
    id: str  # UUID from Supabase
    event_id: str  # UUID from Supabase
    available_slots: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# ==================== FORM QUESTION SCHEMAS ====================

class FormQuestionBase(BaseModel):
    question_key: str = Field(..., min_length=1, max_length=50)
    question_text: str = Field(..., min_length=1, max_length=500)
    question_type: str = Field(..., pattern="^(text|textarea|select|multi_select|checkbox|radio|number|email|phone|date)$")
    options: Optional[List[str]] = None
    is_required: bool = True
    is_active: bool = True

class FormQuestionCreate(FormQuestionBase):
    display_order: Optional[int] = None

    @model_validator(mode='after')
    def validate_options_for_select_types(self):
        """Ensure select/radio/checkbox types have at least 2 options."""
        select_types = {'select', 'multi_select', 'radio', 'checkbox'}
        if self.question_type in select_types:
            if not self.options or len(self.options) < 2:
                raise ValueError(f'Question type "{self.question_type}" requires at least 2 options')
        return self

class FormQuestionUpdate(BaseModel):
    question_key: Optional[str] = Field(None, min_length=1, max_length=50)
    question_text: Optional[str] = Field(None, min_length=1, max_length=500)
    question_type: Optional[str] = Field(None, pattern="^(text|textarea|select|multi_select|checkbox|radio|number|email|phone|date)$")
    options: Optional[List[str]] = None
    is_required: Optional[bool] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None

class FormQuestionResponse(FormQuestionBase):
    id: str  # UUID from Supabase
    event_id: str  # UUID from Supabase
    is_standard: bool
    display_order: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class FormQuestionReorderItem(BaseModel):
    id: str  # UUID from Supabase
    display_order: int

class FormQuestionReorder(BaseModel):
    questions: List[FormQuestionReorderItem]

# ==================== MATCH SCHEMAS ====================

class MatchBase(BaseModel):
    participant1_id: str  # UUID from Supabase
    participant2_id: str  # UUID from Supabase
    compatibility_score: int = Field(..., ge=0, le=100)
    venue_id: Optional[str] = None  # UUID from Supabase
    notes: Optional[str] = None

class MatchCreate(MatchBase):
    @model_validator(mode='after')
    def validate_different_participants(self):
        """Prevent matching a participant with themselves."""
        if self.participant1_id == self.participant2_id:
            raise ValueError('Cannot match a participant with themselves')
        return self

class MatchUpdate(BaseModel):
    compatibility_score: Optional[int] = Field(None, ge=0, le=100)
    status: Optional[str] = None
    venue_id: Optional[str] = None  # UUID from Supabase
    notes: Optional[str] = None

class ParticipantMinimal(BaseModel):
    id: str  # UUID from Supabase
    name: str
    age: int
    gender: str

    model_config = ConfigDict(from_attributes=True)

class MatchResponse(BaseModel):
    id: str  # UUID from Supabase
    event_id: str  # UUID from Supabase
    participant1_id: str  # UUID from Supabase
    participant2_id: str  # UUID from Supabase
    compatibility_score: int
    status: str
    venue_id: Optional[str] = None  # UUID from Supabase
    matched_by: str  # UUID from Supabase
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ==================== EVENT VISIBILITY ====================

class EventVisibility(str, Enum):
    public = "public"
    private = "private"


# ==================== PARTICIPANT USER SCHEMAS ====================

class ParticipantUserBase(BaseModel):
    """Base schema for participant user accounts."""
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=20)
    date_of_birth: Optional[date] = None


class ParticipantUserCreate(ParticipantUserBase):
    """Schema for creating a participant user account."""
    supabase_auth_id: Optional[str] = None  # For OAuth users
    password: Optional[str] = Field(None, min_length=8, max_length=100)  # For email/password users
    profile_data: Optional[dict] = {}


class ParticipantUserUpdate(BaseModel):
    """Schema for updating a participant user account."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=20)
    date_of_birth: Optional[date] = None
    profile_data: Optional[dict] = None


class ParticipantUserResponse(ParticipantUserBase):
    """Response schema for participant user accounts."""
    id: str  # UUID from Supabase
    supabase_auth_id: Optional[str] = None
    profile_data: Optional[dict] = {}
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ParticipantUserLogin(BaseModel):
    """Schema for participant email/password login."""
    email: EmailStr
    password: str


class ParticipantTokenResponse(BaseModel):
    """Token response for participant authentication."""
    access_token: str
    token_type: str = "bearer"
    participant_user: ParticipantUserResponse


# ==================== PUBLIC EVENT BROWSING SCHEMAS ====================

class EventBrowseResponse(BaseModel):
    """Response schema for public event browsing."""
    id: str  # UUID from Supabase
    name: str
    description: Optional[str] = None
    event_date: date
    status: str
    visibility: str
    location: Optional[str] = None
    area: Optional[str] = None
    participant_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class EventAccessCodeRequest(BaseModel):
    """Request schema for accessing a private event via code."""
    access_code: str = Field(..., min_length=1, max_length=20)


class EventAccessCodeResponse(BaseModel):
    """Response schema for access code validation."""
    event_id: str
    event_name: str
    valid: bool


# ==================== PARTICIPANT MATCH VIEW SCHEMAS ====================

class ParticipantMatchView(BaseModel):
    """Schema for viewing a match from a participant's perspective."""
    id: str  # Match UUID
    event_id: str
    event_name: str
    match_name: str  # Name of the person they're matched with
    match_email: Optional[str] = None  # Email (if sharing is enabled)
    match_phone: Optional[str] = None  # Phone (if sharing is enabled)
    compatibility_score: int
    status: str
    venue_name: Optional[str] = None
    venue_address: Optional[str] = None
    matched_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ParticipantEventView(BaseModel):
    """Schema for viewing an event from a participant's perspective."""
    id: str  # Participant registration UUID
    event_id: str
    event_name: str
    event_date: date
    event_status: str
    registration_status: str
    registered_at: datetime
    match_count: int = 0

    model_config = ConfigDict(from_attributes=True)


# ==================== EXTENDED EVENT SCHEMAS ====================

class EventCreateExtended(EventCreate):
    """Extended event creation with visibility options."""
    visibility: Optional[EventVisibility] = EventVisibility.private
    access_code: Optional[str] = Field(None, max_length=20)
    location: Optional[str] = Field(None, max_length=255)
    area: Optional[str] = Field(None, max_length=100)


class EventUpdateExtended(EventUpdate):
    """Extended event update with visibility options."""
    visibility: Optional[EventVisibility] = None
    access_code: Optional[str] = Field(None, max_length=20)
    location: Optional[str] = Field(None, max_length=255)
    area: Optional[str] = Field(None, max_length=100)


class EventResponseExtended(EventResponse):
    """Extended event response with visibility fields."""
    visibility: str = "private"
    access_code: Optional[str] = None
    location: Optional[str] = None
    area: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)