-- Migration: Create participant_users table
-- Description: Stores authenticated participant accounts (separate from per-event participants registrations)
-- Run this migration in your Supabase SQL Editor

-- Create participant_users table
CREATE TABLE IF NOT EXISTS participant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_auth_id UUID UNIQUE,  -- Links to Supabase Auth (nullable for email/password fallback)
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    date_of_birth DATE,
    profile_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_participant_users_email ON participant_users(email);

-- Create index on supabase_auth_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_participant_users_supabase_auth_id ON participant_users(supabase_auth_id);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_participant_users_updated_at ON participant_users;
CREATE TRIGGER update_participant_users_updated_at
    BEFORE UPDATE ON participant_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE participant_users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own data
CREATE POLICY "Users can view own participant_user data"
ON participant_users FOR SELECT
USING (auth.uid() = supabase_auth_id);

-- RLS Policy: Users can update their own data
CREATE POLICY "Users can update own participant_user data"
ON participant_users FOR UPDATE
USING (auth.uid() = supabase_auth_id);

-- RLS Policy: Allow service role to do anything (for backend operations)
CREATE POLICY "Service role has full access to participant_users"
ON participant_users FOR ALL
USING (auth.role() = 'service_role');
