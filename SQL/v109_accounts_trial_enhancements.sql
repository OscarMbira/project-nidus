-- Migration: v109_accounts_trial_enhancements.sql
-- Description: Add trial and organisation verification fields to accounts table
-- Author: Claude AI
-- Date: 2025-12-11
-- Dependencies: Requires existing accounts table

-- Add new columns to accounts table for trial tracking and organisation verification
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS has_trial_project BOOLEAN DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS has_paid_project BOOLEAN DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS organisation_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- Add comments to document the new columns
COMMENT ON COLUMN accounts.has_trial_project IS 'Indicates if organisation has created a trial project (only one allowed)';
COMMENT ON COLUMN accounts.has_paid_project IS 'Indicates if organisation has any paid projects';
COMMENT ON COLUMN accounts.organisation_verified IS 'Indicates if organisation email has been verified';
COMMENT ON COLUMN accounts.verification_token IS 'Token used for organisation email verification';
COMMENT ON COLUMN accounts.verification_token_expires_at IS 'Expiration timestamp for verification token (24 hours)';
COMMENT ON COLUMN accounts.verified_at IS 'Timestamp when organisation was verified';

-- Create index for verification token lookup (for fast verification)
CREATE INDEX IF NOT EXISTS idx_accounts_verification_token ON accounts(verification_token)
WHERE verification_token IS NOT NULL;

-- Create index for trial/paid project tracking
CREATE INDEX IF NOT EXISTS idx_accounts_trial_status ON accounts(has_trial_project, has_paid_project)
WHERE is_active = TRUE;

-- Update existing accounts to be verified (migration for existing users)
UPDATE accounts
SET
    organisation_verified = TRUE,
    verified_at = COALESCE(verified_at, created_at)
WHERE organisation_verified IS NULL OR organisation_verified = FALSE;

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration v109 completed: Added trial tracking and verification fields to accounts table';
END $$;
