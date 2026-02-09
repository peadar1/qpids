# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Qpids Matcher** is a full-stack web application for managing dating and matchmaking events. The platform is adaptable for both college/university events and general public events. Event organizers ("matchers") create events, manage participant registrations via customizable forms, and create matches between participants.

### Target Audience
- College/university dating events (student organizations, campus events)
- General public matchmaking events (speed dating, singles mixers)



## Two-Portal Architecture

The application uses a dual-portal architecture:

1. **Organizer Portal** (`/organizer/*`) - For event organizers/matchers
   - Create and manage events
   - Track participant registrations
   - Create matches between participants
   - Manage venues

2. **Participant Portal** (`/find/*`) - For event participants
   - Browse public events
   - Access private events via codes
   - View registered events
   - View matches

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI 0.103.2, Python 3.11+ |
| Database | Supabase (PostgreSQL) |
| Auth | JWT (python-jose) + bcrypt + Supabase Auth (OAuth) |
| Frontend | React 19, Vite 7, Tailwind CSS 4 |
| Icons | Lucide React |
| Deployment | Render (backend) + Vercel (frontend) |

## Development Commands

### Backend (FastAPI + Supabase)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload          # Start dev server on http://127.0.0.1:8000

# Run tests
pytest                                  # Run unit tests
pytest -v                              # Verbose output
pytest --cov=app                       # With coverage report

# Database migrations (run in Supabase SQL Editor)
# See backend/migrations/ for SQL files
```

### Frontend (React 19 + Vite)
```bash
cd frontend
npm install
npm run dev      # Start dev server on http://localhost:5173
npm run build    # Production build
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Architecture

### Backend Structure (`backend/app/`)
- `main.py` - FastAPI app with CORS middleware, includes all routers prefixed with `/api/`
- `auth.py` - JWT token creation/validation using python-jose, bcrypt password hashing
- `supabase_client.py` - Supabase admin client (bypasses RLS for server operations)
- `crud_supabase.py` - All database operations organized by entity
- `schemas.py` - Pydantic models with validation (Base/Create/Update/Response pattern per entity)
- `dependencies_supabase.py` - Auth dependencies for both matchers and participants
- `routers/` - API endpoints:
  - **Organizer routes:**
    - `auth_supabase.py` - Matcher signup, login
    - `events_supabase.py` - Event CRUD + public endpoints
    - `participants_supabase.py` - Participant management (organizer view)
    - `venues_supabase.py` - Venue management
    - `form_questions_supabase.py` - Form builder endpoints
    - `matches_supabase.py` - Match creation & management
  - **Participant routes:**
    - `participant_auth.py` - Participant signup, login (email + OAuth callback)
    - `events_public.py` - Public event browsing, access codes, my-events, my-matches

### Frontend Structure (`frontend/src/`)

#### Route Structure
```
/                           - Landing page (portal selection)
/organizer/*               - Organizer portal
  /login, /signup          - Organizer authentication
  /dashboard               - Overview with stats
  /events                  - Event list
  /events/create           - New event wizard
  /events/:id              - Event detail
  /events/:eventId/form    - Form builder
  /events/:eventId/participants - Participant list
  /events/:eventId/venues  - Venue management
  /events/:eventId/matches - Match creation
/find/*                    - Participant portal
  /login                   - Participant login (Google OAuth + email)
  /browse                  - Browse public events
  /code                    - Enter private event code
  /my-events               - Registered events (auth required)
  /my-matches              - View matches (auth required)
/events/:eventId/register  - Event registration page (participant auth required)
/auth/callback             - OAuth callback handler
```

#### Key Files
- `App.jsx` - Dual-portal route configuration with React Router
- `context/AuthContext.jsx` - Organizer auth state (custom JWT)
- `context/ParticipantAuthContext.jsx` - Participant auth state (Supabase Auth + custom JWT)
- `services/api.js` - Axios instance with typed API objects
- `services/supabase.js` - Supabase client for OAuth
- `components/organizer/` - Organizer-specific components (Header, ProtectedRoute)
- `components/participant/` - Participant-specific components (ProtectedRoute)
- `pages/organizer/` - Organizer login/signup pages
- `pages/participant/` - Participant portal pages
- `pages/` - Shared pages (Dashboard, Events, etc.)

### Authentication Flows

#### Organizer Authentication
1. Organizer signs up/logs in via `/api/auth/signup` or `/api/auth/login`
2. Backend returns custom JWT token + matcher data
3. Frontend stores token in localStorage (`token` key)
4. Protected routes use `get_current_matcher` dependency

#### Participant Authentication (Hybrid Token Pattern)

Participants can authenticate via two methods, both storing tokens in the same `participant_token` key:

| Method | Token Type | Verification |
|--------|------------|--------------|
| Email/Password | Custom JWT (`type: "participant"`) | Backend decodes JWT directly |
| Google OAuth | Supabase access token | Backend calls Supabase Auth API |

**Email/Password Flow:**
1. POST `/api/participant-auth/signup` or `/login`
2. Backend creates custom JWT with `type: "participant"`
3. Token stored in `localStorage.participant_token`
4. Backend verifies by decoding JWT

**Google OAuth Flow:**
1. Frontend calls `signInWithGoogle()` -> Google redirect
2. Callback to `/auth/callback` -> Supabase session created
3. Supabase access token stored in `localStorage.participant_token`
4. Backend calls Supabase Auth API (`/auth/v1/user`) to verify token
5. If no ParticipantUser exists, backend creates one from Supabase user data

**Security Note:** Password hashes for email/password users are stored server-side in `profile_data` but are stripped from all API responses before returning to the client.

### Data Model

```
Matcher (organizer)
  └── creates Events
        ├── visibility (public/private)
        ├── access_code (for private events)
        ├── location, area (for event discovery)
        ├── Participants (with form_answers JSON, required participant_user_id)
        ├── FormQuestions (custom registration fields)
        ├── Venues (date locations with capacity)
        └── Matches (pairs of participants)

ParticipantUser (authenticated participant account)
  ├── supabase_auth_id (links to Supabase Auth for OAuth)
  ├── email, name, phone_number, date_of_birth
  ├── profile_data (JSON for additional user data; password_hash stored server-side only)
  └── linked to Participants via participant_user_id
```

**Key Relationships:**
- Match links two Participants with a compatibility score and optional Venue
- FormQuestions support 10 types: text, textarea, select, multi_select, checkbox, radio, number, email, phone, date
- Events can be `public` (discoverable) or `private` (access code required)
- Participants MUST be linked to ParticipantUser accounts (authentication required)

**Status Enums:**
- Event: `setup`, `registration_open`, `matching_in_progress`, `completed`, `cancelled`
- Event Visibility: `public`, `private`
- Participant: `registered`, `matched`, `withdrawn`, `waitlisted`
- Match: `pending`, `confirmed`, `cancelled`

## API Conventions

- All routes prefixed with `/api/`
- Protected routes require `Authorization: Bearer <token>` header

### Public Endpoints (no auth)
- `GET /api/events/{id}/public` - Event info for registration
- `GET /api/events/{id}/form-questions/public` - Active form questions
- `GET /api/public/events/browse` - Browse public events
- `POST /api/public/events/access-code` - Validate private event code
- `GET /api/public/events/{id}` - Get event (with optional access_code param)
- `GET /api/public/areas` - Get available areas

### Participant Auth Endpoints
- `POST /api/participant-auth/signup` - Email/password signup
- `POST /api/participant-auth/login` - Email/password login
- `GET /api/participant-auth/me` - Get current participant (also creates from OAuth)
- `PUT /api/participant-auth/me` - Update profile
- `DELETE /api/participant-auth/me` - Delete account
- `GET /api/participant-auth/debug-token` - Debug endpoint for token verification

### Participant Protected Endpoints (requires auth)
- `POST /api/public/events/{id}/register` - Register for event
- `GET /api/public/events/my-events` - Get registered events
- `GET /api/public/events/my-matches` - Get all matches

- Health check: `GET /health`

## Environment Variables

### Backend (.env)
```
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key           # REQUIRED for OAuth token verification
JWT_SECRET_KEY=your_jwt_secret            # Generate with: openssl rand -hex 32
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080         # 7 days
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
# Note: Vercel preview URLs (cupids-*.vercel.app) are allowed via regex pattern in main.py
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://127.0.0.1:8000  # Or production Render URL
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Database Migrations

Migration files are in `backend/migrations/`. Run in order in Supabase SQL Editor:

1. `001_create_participant_users.sql` - ParticipantUser table with RLS policies
2. `002_add_event_visibility_fields.sql` - visibility, access_code, location, area columns
3. `003_link_participants_to_users.sql` - participant_user_id foreign key
4. `004_require_auth_for_registration.sql` - Updated RLS policy requiring authentication

## Deployment

### Backend (Render)
- Configuration in `render.yaml`
- Runtime: Python 3.11
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Required env vars:** SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY, JWT_SECRET_KEY

### Frontend (Vercel)
- Configuration in `vercel.json`
- Build: `npm run build`
- Output: `dist/`
- SPA rewrites configured for client-side routing
