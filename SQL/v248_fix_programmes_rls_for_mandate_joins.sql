-- =============================================================================
-- v248: Fix Programmes RLS for Mandate Joins
-- Purpose: Allow authenticated users to read basic programme info when joining
--          from other tables (like project_mandates)
-- Date: 2026-01-26
-- =============================================================================
--
-- Issue: When loading mandates, the join to programmes fails with
--        "permission denied for table programmes" because the RLS policy
--        requires users to be programme members, owners, or PMO admins.
--
-- Solution: Add a simple SELECT policy that allows all authenticated users
--           to read non-deleted programmes for reference purposes.
-- =============================================================================

-- First, drop the existing restrictive select policy
DROP POLICY IF EXISTS policy_programmes_select ON programmes;

-- Create a new, simpler SELECT policy that allows all authenticated users
-- to read programme basic info (for joins and references)
CREATE POLICY policy_programmes_select ON programmes
    FOR SELECT
    TO authenticated
    USING (is_deleted = FALSE);

-- The existing policies for INSERT, UPDATE, and the PMO admin ALL policy
-- remain unchanged to maintain proper write access controls.

-- =============================================================================
-- Verification query (run manually to test):
-- SELECT id, programme_name, programme_code FROM programmes WHERE is_deleted = FALSE LIMIT 5;
-- =============================================================================

-- Log success
DO $$
BEGIN
  RAISE NOTICE 'Successfully updated programmes RLS policy to allow authenticated users to read programme data';
END $$;
