-- Migration: v116_migrate_existing_users.sql
-- Description: Migrate existing users to new organisation-based registration system
-- Author: Claude AI
-- Date: 2025-12-11
-- Dependencies: Requires v109-v115 to be applied first
-- IMPORTANT: Run this AFTER deploying all other migrations (v109-v115)

-- ============================================================================
-- STEP 1: Identify and Report Orphaned Users
-- ============================================================================

DO $$
DECLARE
    v_orphaned_users_count INTEGER;
    v_orphaned_projects_count INTEGER;
BEGIN
    -- Count users without organisations
    SELECT COUNT(*)
    INTO v_orphaned_users_count
    FROM users u
    LEFT JOIN accounts a ON u.id = a.owner_user_id
    WHERE a.id IS NULL;

    -- Count projects without accounts
    SELECT COUNT(*)
    INTO v_orphaned_projects_count
    FROM projects p
    WHERE p.account_id IS NULL;

    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Migration v116: Existing User Migration Report';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Users without organisations: %', v_orphaned_users_count;
    RAISE NOTICE 'Projects without accounts: %', v_orphaned_projects_count;
    RAISE NOTICE '=================================================================';
END $$;

-- ============================================================================
-- STEP 2: Create Default Organisations for Users Without One
-- ============================================================================

-- Insert organisations for users who don't have one
INSERT INTO accounts (
    owner_user_id,
    account_name,
    account_type,
    is_active,
    organisation_verified,
    verified_at,
    created_at,
    updated_at
)
SELECT
    u.id AS owner_user_id,
    COALESCE(
        NULLIF(u.full_name, ''),
        NULLIF(u.first_name || ' ' || u.last_name, ' '),
        u.email,
        'My Organisation'
    ) AS account_name,
    'individual' AS account_type,
    TRUE AS is_active,
    TRUE AS organisation_verified, -- Auto-verify for existing users
    NOW() AS verified_at,
    COALESCE(u.created_at, NOW()) AS created_at,
    NOW() AS updated_at
FROM users u
LEFT JOIN accounts a ON u.id = a.owner_user_id
WHERE a.id IS NULL
AND u.id IS NOT NULL;

-- Report how many organisations were created
DO $$
DECLARE
    v_created_count INTEGER;
BEGIN
    GET DIAGNOSTICS v_created_count = ROW_COUNT;
    RAISE NOTICE 'Created % default organisations for existing users', v_created_count;
END $$;

-- ============================================================================
-- STEP 3: Update Existing Projects to Set Project Mode
-- ============================================================================

-- Mark all existing projects as 'paid' (assumption: existing projects are paid)
UPDATE projects
SET
    project_mode = 'paid',
    updated_at = NOW()
WHERE project_mode IS NULL;

-- Report how many projects were updated
DO $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Marked % existing projects as paid mode', v_updated_count;
END $$;

-- ============================================================================
-- STEP 4: Link Existing Projects to Accounts
-- ============================================================================

-- Link projects to accounts based on project_manager_user_id
UPDATE projects p
SET
    account_id = a.id,
    updated_at = NOW()
FROM accounts a
INNER JOIN users u ON a.owner_user_id = u.id
WHERE p.project_manager_user_id = u.id
AND p.account_id IS NULL;

-- Report how many projects were linked
DO $$
DECLARE
    v_linked_count INTEGER;
BEGIN
    GET DIAGNOSTICS v_linked_count = ROW_COUNT;
    RAISE NOTICE 'Linked % existing projects to accounts', v_linked_count;
END $$;

-- ============================================================================
-- STEP 5: Set Member Limits for Existing Projects
-- ============================================================================

-- Set default member limit for projects that don't have one
UPDATE projects
SET
    member_limit = 20,
    updated_at = NOW()
WHERE (member_limit IS NULL OR member_limit = 0)
AND project_mode = 'paid';

-- ============================================================================
-- STEP 6: Mark Accounts with Paid Projects
-- ============================================================================

-- Update accounts to reflect that they have paid projects
UPDATE accounts a
SET
    has_paid_project = TRUE,
    updated_at = NOW()
FROM (
    SELECT DISTINCT p.account_id
    FROM projects p
    WHERE p.project_mode = 'paid'
    AND p.account_id IS NOT NULL
) AS paid_projects
WHERE a.id = paid_projects.account_id;

-- Report how many accounts were updated
DO $$
DECLARE
    v_accounts_count INTEGER;
BEGIN
    GET DIAGNOSTICS v_accounts_count = ROW_COUNT;
    RAISE NOTICE 'Marked % accounts as having paid projects', v_accounts_count;
END $$;

-- ============================================================================
-- STEP 7: Link Existing Subscriptions to Projects (if applicable)
-- ============================================================================

-- Attempt to link existing subscriptions to projects where possible
-- This is a best-effort migration - some subscriptions may not be linkable
-- Note: projects table uses status_id (foreign key), not status column
UPDATE platform_subscriptions s
SET
    project_id = p.id,
    updated_at = NOW()
FROM projects p
INNER JOIN accounts a ON p.account_id = a.id
WHERE s.account_id = a.id
AND s.project_id IS NULL
AND s.status = 'active'
AND p.project_mode = 'paid'
AND p.is_deleted = FALSE
AND p.is_archived = FALSE
-- Link to the first active paid project for this account
AND p.id = (
    SELECT p2.id
    FROM projects p2
    WHERE p2.account_id = a.id
    AND p2.project_mode = 'paid'
    AND p2.is_deleted = FALSE
    AND p2.is_archived = FALSE
    ORDER BY p2.created_at ASC
    LIMIT 1
);

-- ============================================================================
-- STEP 8: Data Integrity Checks
-- ============================================================================

DO $$
DECLARE
    v_orphaned_users INTEGER;
    v_orphaned_projects INTEGER;
    v_unverified_orgs INTEGER;
    v_projects_no_mode INTEGER;
BEGIN
    -- Check for remaining orphaned users
    SELECT COUNT(*) INTO v_orphaned_users
    FROM users u
    LEFT JOIN accounts a ON u.id = a.owner_user_id
    WHERE a.id IS NULL;

    -- Check for remaining orphaned projects
    SELECT COUNT(*) INTO v_orphaned_projects
    FROM projects p
    WHERE p.account_id IS NULL;

    -- Check for unverified organisations (should be 0 after migration)
    SELECT COUNT(*) INTO v_unverified_orgs
    FROM accounts
    WHERE organisation_verified = FALSE;

    -- Check for projects without mode
    SELECT COUNT(*) INTO v_projects_no_mode
    FROM projects
    WHERE project_mode IS NULL;

    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Post-Migration Data Integrity Report:';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Remaining orphaned users: %', v_orphaned_users;
    RAISE NOTICE 'Remaining orphaned projects: %', v_orphaned_projects;
    RAISE NOTICE 'Unverified organisations: %', v_unverified_orgs;
    RAISE NOTICE 'Projects without mode: %', v_projects_no_mode;
    RAISE NOTICE '=================================================================';

    -- Raise warnings if issues found
    IF v_orphaned_users > 0 THEN
        RAISE WARNING 'Found % users still without organisations - manual review recommended', v_orphaned_users;
    END IF;

    IF v_orphaned_projects > 0 THEN
        RAISE WARNING 'Found % projects still without accounts - manual review recommended', v_orphaned_projects;
    END IF;

    IF v_projects_no_mode > 0 THEN
        RAISE WARNING 'Found % projects without project_mode - manual review recommended', v_projects_no_mode;
    END IF;
END $$;

-- ============================================================================
-- STEP 9: Create Summary Report
-- ============================================================================

DO $$
DECLARE
    v_total_users INTEGER;
    v_total_accounts INTEGER;
    v_total_projects INTEGER;
    v_trial_projects INTEGER;
    v_paid_projects INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_users FROM users;
    SELECT COUNT(*) INTO v_total_accounts FROM accounts;
    SELECT COUNT(*) INTO v_total_projects FROM projects;
    SELECT COUNT(*) INTO v_trial_projects FROM projects WHERE project_mode = 'trial';
    SELECT COUNT(*) INTO v_paid_projects FROM projects WHERE project_mode = 'paid';

    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Migration v116 Completion Summary:';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Total users: %', v_total_users;
    RAISE NOTICE 'Total accounts (organisations): %', v_total_accounts;
    RAISE NOTICE 'Total projects: %', v_total_projects;
    RAISE NOTICE '  - Trial projects: %', v_trial_projects;
    RAISE NOTICE '  - Paid projects: %', v_paid_projects;
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Migration v116 completed successfully!';
    RAISE NOTICE '=================================================================';
END $$;

-- ============================================================================
-- OPTIONAL: Create View for Migration Audit
-- ============================================================================

CREATE OR REPLACE VIEW migration_audit_v116 AS
SELECT
    'Users without organisations' AS check_type,
    COUNT(*) AS count
FROM users u
LEFT JOIN accounts a ON u.id = a.owner_user_id
WHERE a.id IS NULL

UNION ALL

SELECT
    'Projects without accounts' AS check_type,
    COUNT(*) AS count
FROM projects p
WHERE p.account_id IS NULL

UNION ALL

SELECT
    'Projects without mode' AS check_type,
    COUNT(*) AS count
FROM projects
WHERE project_mode IS NULL

UNION ALL

SELECT
    'Unverified organisations' AS check_type,
    COUNT(*) AS count
FROM accounts
WHERE organisation_verified = FALSE;

COMMENT ON VIEW migration_audit_v116 IS 'Audit view to check data integrity after v116 migration';
