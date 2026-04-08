-- ============================================================================
-- Fix get_user_accounts Ambiguous Column Reference
-- Version: v94
-- Date: 2025-12-09
-- Purpose: Fix ambiguous account_id column reference in get_user_accounts function
-- ============================================================================

-- Prerequisites:
-- - v87_unified_auth_functions.sql must have been run
-- - v90_rename_pm_to_platform.sql must have been run (pm_subscriptions -> platform_subscriptions)

-- Purpose:
-- Fix the "column reference 'account_id' is ambiguous" error (code 42702)
-- by fully qualifying all account_id references with table aliases

-- ============================================================================
-- FIX: get_user_accounts function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_accounts(p_auth_user_id UUID)
RETURNS TABLE (
    account_id UUID,
    account_code VARCHAR,
    account_name VARCHAR,
    is_owner BOOLEAN,
    project_count BIGINT,
    total_members BIGINT,
    subscription_status VARCHAR,
    created_at TIMESTAMP
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get internal user ID
    SELECT id INTO v_user_id
    FROM users
    WHERE auth_user_id = p_auth_user_id;

    RETURN QUERY
    -- Accounts user owns
    SELECT
        a.id as account_id,
        a.account_code,
        a.account_name,
        TRUE as is_owner,
        (SELECT COUNT(*) FROM projects p_count WHERE p_count.account_id = a.id AND p_count.is_deleted = FALSE) as project_count,
        (
            SELECT COUNT(DISTINCT ur.user_id)
            FROM projects p
            INNER JOIN user_roles ur ON ur.project_id = p.id
            WHERE p.account_id = a.id
            AND p.is_deleted = FALSE
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
        ) as total_members,
        (
            SELECT ps.status
            FROM platform_subscriptions ps
            WHERE ps.account_id = a.id
            ORDER BY ps.created_at DESC
            LIMIT 1
        ) as subscription_status,
        a.created_at
    FROM accounts a
    WHERE a.owner_user_id = v_user_id
    AND a.is_deleted = FALSE

    UNION

    -- Accounts user is a member of (but doesn't own)
    SELECT DISTINCT
        a.id as account_id,
        a.account_code,
        a.account_name,
        FALSE as is_owner,
        (SELECT COUNT(*) FROM projects p_count2 WHERE p_count2.account_id = a.id AND p_count2.is_deleted = FALSE) as project_count,
        (
            SELECT COUNT(DISTINCT ur2.user_id)
            FROM projects p2
            INNER JOIN user_roles ur2 ON ur2.project_id = p2.id
            WHERE p2.account_id = a.id
            AND p2.is_deleted = FALSE
            AND ur2.is_active = TRUE
            AND ur2.is_deleted = FALSE
        ) as total_members,
        (
            SELECT ps2.status
            FROM platform_subscriptions ps2
            WHERE ps2.account_id = a.id
            ORDER BY ps2.created_at DESC
            LIMIT 1
        ) as subscription_status,
        a.created_at
    FROM accounts a
    INNER JOIN projects p ON p.account_id = a.id
    INNER JOIN user_roles ur ON ur.project_id = p.id
    WHERE ur.user_id = v_user_id
    AND a.owner_user_id != v_user_id
    AND ur.is_active = TRUE
    AND ur.is_deleted = FALSE
    AND p.is_deleted = FALSE
    AND a.is_deleted = FALSE

    ORDER BY is_owner DESC, created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_accounts(UUID) IS 'Returns accounts user owns or is a member of. Fixed ambiguous account_id references.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

