-- Migration: Add visibility and location fields to events table
-- Description: Enables public/private events with access codes and location-based browsing
-- Run this migration in your Supabase SQL Editor

-- Add visibility column (defaults to 'private' for backward compatibility)
ALTER TABLE events
ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private';

-- Add access_code column for private events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS access_code VARCHAR(20) UNIQUE;

-- Add location fields for event browsing
ALTER TABLE events
ADD COLUMN IF NOT EXISTS location VARCHAR(255);

ALTER TABLE events
ADD COLUMN IF NOT EXISTS area VARCHAR(100);

-- Create index on visibility for filtering public events
CREATE INDEX IF NOT EXISTS idx_events_visibility ON events(visibility);

-- Create index on area for location-based browsing
CREATE INDEX IF NOT EXISTS idx_events_area ON events(area);

-- Create index on access_code for code lookups
CREATE INDEX IF NOT EXISTS idx_events_access_code ON events(access_code);

-- Add check constraint for visibility values
ALTER TABLE events
ADD CONSTRAINT chk_event_visibility
CHECK (visibility IN ('public', 'private'));
