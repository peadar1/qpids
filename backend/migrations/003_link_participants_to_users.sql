-- Migration: Link participants to participant_users
-- Description: Adds participant_user_id to participants table for authenticated registration
-- Run this migration in your Supabase SQL Editor

-- Add participant_user_id column (nullable to maintain backward compatibility)
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS participant_user_id UUID REFERENCES participant_users(id) ON DELETE SET NULL;

-- Create index for faster lookups by participant_user_id
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(participant_user_id);
