-- Migration: Migrate existing OAuth participant_users to unified users table
-- Run this migration in your Supabase SQL Editor AFTER 005_create_unified_users.sql

-- Migrate existing OAuth participant_users (those with supabase_auth_id)
-- Email/password users without supabase_auth_id cannot be migrated automatically
-- as they don't have Supabase Auth accounts
INSERT INTO users (
    supabase_auth_id,
    email,
    name,
    phone_number,
    date_of_birth,
    roles,
    profile_data,
    legacy_participant_user_id,
    created_at
)
SELECT
    pu.supabase_auth_id,
    pu.email,
    pu.name,
    pu.phone_number,
    pu.date_of_birth,
    ARRAY['participant']::TEXT[],
    -- Remove password_hash from profile_data if present
    COALESCE(pu.profile_data, '{}')::JSONB - 'password_hash',
    pu.id,
    pu.created_at
FROM participant_users pu
WHERE pu.supabase_auth_id IS NOT NULL
ON CONFLICT (supabase_auth_id) DO NOTHING;

-- Note: Existing matchers will need to sign in with Google OAuth
-- using the same email address to get linked to their events.
-- The backend will create a user record and add the 'matcher' role
-- when they upgrade via the /api/auth/upgrade-to-matcher endpoint.
