-- Migration: Create unified users table with role-based access
-- Run this migration in your Supabase SQL Editor

-- Unified users table with role-based access
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_auth_id UUID UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    date_of_birth DATE,
    roles TEXT[] NOT NULL DEFAULT ARRAY['participant']::TEXT[],
    profile_data JSONB DEFAULT '{}',
    -- Migration tracking (to link back to legacy tables)
    legacy_matcher_id UUID,
    legacy_participant_user_id UUID,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    -- Constraints
    CONSTRAINT valid_roles CHECK (roles <@ ARRAY['participant', 'matcher']::TEXT[])
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_supabase_auth_id ON users(supabase_auth_id);
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN(roles);

-- Updated_at trigger (reuse existing function if available, otherwise create it)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own data
CREATE POLICY "Users can view own data" ON users FOR SELECT
    USING (auth.uid() = supabase_auth_id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users FOR UPDATE
    USING (auth.uid() = supabase_auth_id);

-- Service role has full access (for backend operations)
CREATE POLICY "Service role has full access" ON users FOR ALL
    USING (auth.role() = 'service_role');

-- Add owner_user_id column to events table for future use
ALTER TABLE events ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id);
