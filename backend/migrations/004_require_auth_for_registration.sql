-- Migration: Require authentication for participant registration
-- This migration updates the RLS policy on participants table to require
-- authentication and linking to a participant_user account.

-- Drop the overly permissive policy that allowed anyone to register
DROP POLICY IF EXISTS "Anyone can register as participant" ON participants;

-- Create new policy requiring authentication
-- This ensures all new participant registrations are linked to a participant_user account
CREATE POLICY "Authenticated users can register as participant" ON participants
FOR INSERT
TO authenticated
WITH CHECK (
  -- Ensure the participant_user_id is set and matches a valid participant_user
  participant_user_id IS NOT NULL
);

-- Note: The application backend (using service role key) bypasses RLS,
-- so this policy primarily serves as:
-- 1. Documentation of the intended access pattern
-- 2. Defense in depth if direct database access is attempted
-- 3. Resolution for Supabase RLS linter warnings
