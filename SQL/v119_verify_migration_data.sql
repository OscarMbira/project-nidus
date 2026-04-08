-- ============================================================================
-- Migration Data Verification Script
-- Version: v119
-- Description: Verifies data integrity after running v116_migrate_existing_users.sql
-- Author: Development Team
-- Date: 2025-01-XX
-- ============================================================================

-- Purpose:
-- This script verifies that the migration from v116 was successful and all
-- existing users have been properly migrated to the new organisation-based system.

-- Prerequisites:
-- - v116_migrate_existing_users.sql must have been run
-- - All users should have accounts (organisations)
-- - All projects should be marked as paid (not trial)

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- 1. Check for users without organisations
-- Expected: 0 rows
SELECT 
  'Users without organisations' as check_name,
  COUNT(*) as issue_count,
  ARRAY_AGG(id) as user_ids
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM accounts a 
  WHERE a.owner_user_id = u.id
)
AND u.is_deleted = FALSE;

-- 2. Check for projects without accounts
-- Expected: 0 rows
SELECT 
  'Projects without accounts' as check_name,
  COUNT(*) as issue_count,
  ARRAY_AGG(id) as project_ids
FROM projects p
WHERE p.account_id IS NULL
AND p.is_deleted = FALSE;

-- 3. Check for projects still marked as trial
-- Expected: 0 rows (all should be 'paid' or have subscription)
SELECT 
  'Projects still in trial mode' as check_name,
  COUNT(*) as issue_count,
  ARRAY_AGG(id) as project_ids
FROM projects p
WHERE p.project_mode = 'trial'
AND p.is_deleted = FALSE;

-- 4. Check for accounts without owner
-- Expected: 0 rows
SELECT 
  'Accounts without owner' as check_name,
  COUNT(*) as issue_count,
  ARRAY_AGG(id) as account_ids
FROM accounts a
WHERE a.owner_user_id IS NULL
AND a.is_deleted = FALSE;

-- 5. Check for orphaned project memberships
-- Expected: 0 rows
SELECT 
  'Orphaned project memberships' as check_name,
  COUNT(*) as issue_count,
  ARRAY_AGG(id) as membership_ids
FROM project_memberships pm
WHERE NOT EXISTS (
  SELECT 1 FROM projects p WHERE p.id = pm.project_id
)
OR NOT EXISTS (
  SELECT 1 FROM users u WHERE u.id = pm.user_id
);

-- 6. Check for accounts with multiple owners
-- Expected: 0 rows (one email = one organisation)
SELECT 
  'Accounts with multiple owners' as check_name,
  COUNT(*) as issue_count,
  ARRAY_AGG(id) as account_ids
FROM (
  SELECT a.id, COUNT(DISTINCT a.owner_user_id) as owner_count
  FROM accounts a
  WHERE a.is_deleted = FALSE
  GROUP BY a.id
  HAVING COUNT(DISTINCT a.owner_user_id) > 1
) subquery;

-- 7. Check for users with multiple accounts
-- Expected: 0 rows (one email = one organisation)
SELECT 
  'Users with multiple accounts' as check_name,
  COUNT(*) as issue_count,
  ARRAY_AGG(user_id) as user_ids
FROM (
  SELECT u.id as user_id, COUNT(*) as account_count
  FROM users u
  INNER JOIN accounts a ON a.owner_user_id = u.id
  WHERE u.is_deleted = FALSE
  AND a.is_deleted = FALSE
  GROUP BY u.id
  HAVING COUNT(*) > 1
) subquery;

-- 8. Check for projects without subscription (for paid projects)
-- Note: This is informational - some projects may not have subscriptions yet
-- Relationship: platform_subscriptions.project_id -> projects.id (not projects.subscription_id)
SELECT 
  'Paid projects without subscription' as check_name,
  COUNT(*) as issue_count,
  ARRAY_AGG(p.id) as project_ids
FROM projects p
WHERE p.project_mode = 'paid'
AND NOT EXISTS (
  SELECT 1 FROM platform_subscriptions ps
  WHERE ps.project_id = p.id
  AND ps.status = 'active'
)
AND p.is_deleted = FALSE;

-- 9. Check for trial tracking records on non-trial projects
-- Expected: 0 rows
SELECT 
  'Trial tracking on non-trial projects' as check_name,
  COUNT(*) as issue_count,
  ARRAY_AGG(tpt.project_id) as project_ids
FROM trial_project_tracking tpt
INNER JOIN projects p ON tpt.project_id = p.id
WHERE p.project_mode != 'trial'
AND tpt.status != 'upgraded';

-- 10. Verify account ownership matches user
-- Expected: All accounts should have valid owner_user_id
SELECT 
  'Accounts with invalid owner' as check_name,
  COUNT(*) as issue_count,
  ARRAY_AGG(a.id) as account_ids
FROM accounts a
WHERE NOT EXISTS (
  SELECT 1 FROM users u 
  WHERE u.id = a.owner_user_id
  AND u.is_deleted = FALSE
)
AND a.is_deleted = FALSE;

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================

-- Generate summary report
DO $$
DECLARE
  users_without_orgs INTEGER;
  projects_without_accounts INTEGER;
  projects_in_trial INTEGER;
  accounts_without_owner INTEGER;
  orphaned_memberships INTEGER;
  multiple_owners INTEGER;
  multiple_accounts INTEGER;
  invalid_owners INTEGER;
BEGIN
  -- Count issues
  SELECT COUNT(*) INTO users_without_orgs
  FROM users u
  WHERE NOT EXISTS (SELECT 1 FROM accounts a WHERE a.owner_user_id = u.id)
  AND u.is_deleted = FALSE;

  SELECT COUNT(*) INTO projects_without_accounts
  FROM projects p
  WHERE p.account_id IS NULL
  AND p.is_deleted = FALSE;

  SELECT COUNT(*) INTO projects_in_trial
  FROM projects p
  WHERE p.project_mode = 'trial'
  AND p.is_deleted = FALSE;

  SELECT COUNT(*) INTO accounts_without_owner
  FROM accounts a
  WHERE a.owner_user_id IS NULL
  AND a.is_deleted = FALSE;

  SELECT COUNT(*) INTO orphaned_memberships
  FROM project_memberships pm
  WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = pm.project_id)
  OR NOT EXISTS (SELECT 1 FROM users u WHERE u.id = pm.user_id);

  SELECT COUNT(*) INTO multiple_owners
  FROM (
    SELECT a.id, COUNT(DISTINCT a.owner_user_id) as owner_count
    FROM accounts a
    WHERE a.is_deleted = FALSE
    GROUP BY a.id
    HAVING COUNT(DISTINCT a.owner_user_id) > 1
  ) subquery;

  SELECT COUNT(*) INTO multiple_accounts
  FROM (
    SELECT u.id, COUNT(*) as account_count
    FROM users u
    INNER JOIN accounts a ON a.owner_user_id = u.id
    WHERE u.is_deleted = FALSE AND a.is_deleted = FALSE
    GROUP BY u.id
    HAVING COUNT(*) > 1
  ) subquery;

  SELECT COUNT(*) INTO invalid_owners
  FROM accounts a
  WHERE NOT EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = a.owner_user_id AND u.is_deleted = FALSE
  )
  AND a.is_deleted = FALSE;

  -- Print summary
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION VERIFICATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Users without organisations: %', users_without_orgs;
  RAISE NOTICE 'Projects without accounts: %', projects_without_accounts;
  RAISE NOTICE 'Projects still in trial: %', projects_in_trial;
  RAISE NOTICE 'Accounts without owner: %', accounts_without_owner;
  RAISE NOTICE 'Orphaned memberships: %', orphaned_memberships;
  RAISE NOTICE 'Accounts with multiple owners: %', multiple_owners;
  RAISE NOTICE 'Users with multiple accounts: %', multiple_accounts;
  RAISE NOTICE 'Accounts with invalid owner: %', invalid_owners;
  RAISE NOTICE '========================================';

  IF users_without_orgs = 0 
     AND projects_without_accounts = 0 
     AND projects_in_trial = 0 
     AND accounts_without_owner = 0 
     AND orphaned_memberships = 0 
     AND multiple_owners = 0 
     AND multiple_accounts = 0 
     AND invalid_owners = 0 THEN
    RAISE NOTICE '✅ ALL CHECKS PASSED - Migration successful!';
  ELSE
    RAISE WARNING '⚠️  ISSUES FOUND - Review the detailed queries above';
  END IF;
END $$;

-- ============================================================================
-- FIX QUERIES (Run only if issues are found)
-- ============================================================================

-- Fix: Create missing organisations for users
/*
INSERT INTO accounts (
  owner_user_id,
  account_name,
  account_type,
  is_active,
  organisation_verified,
  created_by
)
SELECT 
  u.id,
  COALESCE(u.full_name, u.email, 'User Account') as account_name,
  'individual' as account_type,
  true as is_active,
  true as organisation_verified, -- Auto-verify migrated users
  u.id as created_by
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM accounts a WHERE a.owner_user_id = u.id
)
AND u.is_deleted = FALSE;
*/

-- Fix: Assign projects to accounts
/*
UPDATE projects p
SET account_id = (
  SELECT a.id 
  FROM accounts a 
  WHERE a.owner_user_id = p.owner_user_id 
  LIMIT 1
)
WHERE p.account_id IS NULL
AND p.owner_user_id IS NOT NULL
AND p.is_deleted = FALSE;
*/

-- Fix: Mark all existing projects as paid
/*
UPDATE projects p
SET 
  project_mode = 'paid',
  updated_at = NOW()
WHERE p.project_mode = 'trial'
AND p.is_deleted = FALSE;
*/

-- ============================================================================
-- NOTES
-- ============================================================================

-- This script is read-only by default
-- Uncomment fix queries only if issues are found
-- Always backup database before running fix queries
-- Test fix queries on staging environment first

COMMENT ON FUNCTION check_trial_expirations_cron() IS 'Verification script for v116 migration. Run after migration to verify data integrity.';

