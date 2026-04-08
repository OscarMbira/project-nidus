-- ============================================================================
-- Unified Authentication & Permission Functions
-- Version: v87
-- Description: Functions for platform access and permission checking
-- Author: Development Team
-- Date: 2025-11-27
-- ============================================================================

-- Prerequisites:
-- - v03_user_access_tables.sql (users, roles, permissions, user_roles)
-- - v82_pm_subscriptions.sql (pm_subscriptions, user_platform_access)
-- - v84_accounts_and_extensions.sql (accounts)
-- - v85_project_invitations_seats.sql
-- - v86_default_project_roles_seed.sql

-- Purpose:
-- 1. Platform access checking (PM vs Simulator)
-- 2. Project permission validation
-- 3. User's accessible projects
-- 4. Role-based access control helpers

-- ============================================================================
-- FUNCTION: Get user's platform access
-- Description: Returns which platforms user has registered for
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_platforms(p_auth_user_id UUID)
RETURNS TABLE (
    platform VARCHAR,
    has_registered BOOLEAN,
    has_active_subscription BOOLEAN,
    subscription_tier VARCHAR,
    last_access_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        upa.platform,
        upa.has_registered,
        CASE
            WHEN upa.platform = 'platform' OR upa.platform = 'pm' THEN
                EXISTS (
                    SELECT 1 FROM platform_subscriptions ps
                    WHERE ps.user_id = p_auth_user_id
                    AND ps.status IN ('active', 'trialing')
                )
            WHEN upa.platform = 'simulator' THEN
                EXISTS (
                    SELECT 1 FROM sim.simulator_subscriptions ss
                    WHERE ss.user_id = p_auth_user_id
                    AND ss.status IN ('active', 'trialing')
                )
            ELSE FALSE
        END as has_active_subscription,
        CASE
            WHEN upa.platform = 'platform' OR upa.platform = 'pm' THEN
                (SELECT plan_type FROM platform_subscriptions WHERE user_id = p_auth_user_id ORDER BY created_at DESC LIMIT 1)
            WHEN upa.platform = 'simulator' THEN
                (SELECT plan_type FROM sim.simulator_subscriptions WHERE user_id = p_auth_user_id ORDER BY created_at DESC LIMIT 1)
            ELSE NULL
        END as subscription_tier,
        upa.last_access_at
    FROM user_platform_access upa
    WHERE upa.user_id = p_auth_user_id
    AND upa.has_registered = TRUE
    ORDER BY upa.is_primary_platform DESC, upa.last_access_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_platforms(UUID) IS 'Returns platforms user has access to with subscription status';

-- ============================================================================
-- FUNCTION: Check if user has permission in project
-- Description: Validates if user has specific permission in a project
-- ============================================================================

CREATE OR REPLACE FUNCTION has_project_permission(
    p_auth_user_id UUID,
    p_project_id UUID,
    p_permission_code VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN;
    v_user_id UUID;
BEGIN
    -- Get internal user ID from auth user ID
    SELECT id INTO v_user_id
    FROM users
    WHERE auth_user_id = p_auth_user_id;

    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if user has the permission through their project roles
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        INNER JOIN role_permissions rp ON rp.role_id = ur.role_id
        INNER JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = v_user_id
        AND ur.project_id = p_project_id
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
        AND rp.is_active = TRUE
        AND rp.is_deleted = FALSE
        AND p.permission_code = p_permission_code
        AND p.is_active = TRUE
        AND p.is_deleted = FALSE
    ) INTO v_has_permission;

    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION has_project_permission(UUID, UUID, VARCHAR) IS 'Checks if user has specific permission in a project';

-- ============================================================================
-- FUNCTION: Get user's project permissions
-- Description: Returns all permissions user has in a project
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_project_permissions(
    p_auth_user_id UUID,
    p_project_id UUID
)
RETURNS TABLE (
    permission_code VARCHAR,
    permission_name VARCHAR,
    permission_category VARCHAR
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get internal user ID
    SELECT id INTO v_user_id
    FROM users
    WHERE auth_user_id = p_auth_user_id;

    RETURN QUERY
    SELECT DISTINCT
        p.permission_code,
        p.permission_name,
        p.permission_category
    FROM user_roles ur
    INNER JOIN role_permissions rp ON rp.role_id = ur.role_id
    INNER JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = v_user_id
    AND ur.project_id = p_project_id
    AND ur.is_active = TRUE
    AND ur.is_deleted = FALSE
    AND rp.is_active = TRUE
    AND rp.is_deleted = FALSE
    AND p.is_active = TRUE
    AND p.is_deleted = FALSE
    ORDER BY p.permission_category, p.permission_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_project_permissions(UUID, UUID) IS 'Returns all permissions user has in a project';

-- ============================================================================
-- FUNCTION: Get user's accessible projects
-- Description: Returns projects user has access to
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_accessible_projects(p_auth_user_id UUID)
RETURNS TABLE (
    project_id UUID,
    project_code VARCHAR,
    project_name VARCHAR,
    account_id UUID,
    account_name VARCHAR,
    user_role_names TEXT,
    is_project_manager BOOLEAN,
    member_count BIGINT,
    project_status VARCHAR,
    last_accessed_at TIMESTAMP
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get internal user ID
    SELECT id INTO v_user_id
    FROM users
    WHERE auth_user_id = p_auth_user_id;

    RETURN QUERY
    SELECT
        p.id as project_id,
        p.project_code,
        p.project_name,
        p.account_id,
        a.account_name,
        STRING_AGG(DISTINCT r.role_display_name, ', ' ORDER BY r.role_display_name) as user_role_names,
        (p.project_manager_user_id = v_user_id) as is_project_manager,
        (
            SELECT COUNT(DISTINCT ur2.user_id)
            FROM user_roles ur2
            WHERE ur2.project_id = p.id
            AND ur2.is_active = TRUE
            AND ur2.is_deleted = FALSE
        ) as member_count,
        ps.status_name as project_status,
        MAX(ur.updated_at) as last_accessed_at
    FROM projects p
    INNER JOIN user_roles ur ON ur.project_id = p.id
    INNER JOIN roles r ON r.id = ur.role_id
    LEFT JOIN accounts a ON a.id = p.account_id
    LEFT JOIN project_statuses ps ON ps.id = p.status_id
    WHERE ur.user_id = v_user_id
    AND ur.is_active = TRUE
    AND ur.is_deleted = FALSE
    AND p.is_deleted = FALSE
    GROUP BY p.id, p.project_code, p.project_name, p.account_id, a.account_name, p.project_manager_user_id, ps.status_name
    ORDER BY last_accessed_at DESC NULLS LAST, p.project_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_accessible_projects(UUID) IS 'Returns all projects user has access to with role info';

-- ============================================================================
-- FUNCTION: Check if user is account owner
-- Description: Checks if user owns an account
-- ============================================================================

CREATE OR REPLACE FUNCTION is_account_owner(
    p_auth_user_id UUID,
    p_account_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_is_owner BOOLEAN;
BEGIN
    -- Get internal user ID
    SELECT id INTO v_user_id
    FROM users
    WHERE auth_user_id = p_auth_user_id;

    -- Check if user owns the account
    SELECT EXISTS (
        SELECT 1
        FROM accounts
        WHERE id = p_account_id
        AND owner_user_id = v_user_id
        AND is_deleted = FALSE
    ) INTO v_is_owner;

    RETURN v_is_owner;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_account_owner(UUID, UUID) IS 'Checks if user is the owner of an account';

-- ============================================================================
-- FUNCTION: Get user's accounts
-- Description: Returns accounts user owns or is a member of
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

COMMENT ON FUNCTION get_user_accounts(UUID) IS 'Returns accounts user owns or is a member of';

-- ============================================================================
-- FUNCTION: Validate invitation token
-- Description: Checks if invitation token is valid and returns details
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_invitation_token(p_token VARCHAR)
RETURNS TABLE (
    invitation_id UUID,
    project_id UUID,
    project_name VARCHAR,
    invited_email VARCHAR,
    role_name VARCHAR,
    role_display_name VARCHAR,
    invited_by_name VARCHAR,
    is_valid BOOLEAN,
    expires_at TIMESTAMP,
    invitation_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pi.id as invitation_id,
        pi.project_id,
        p.project_name,
        pi.invited_email,
        r.role_name,
        r.role_display_name,
        u.full_name as invited_by_name,
        (
            pi.invitation_status = 'pending'
            AND (pi.invitation_expires_at IS NULL OR pi.invitation_expires_at > NOW())
        ) as is_valid,
        pi.invitation_expires_at as expires_at,
        pi.invitation_message
    FROM project_invitations pi
    INNER JOIN projects p ON p.id = pi.project_id
    INNER JOIN roles r ON r.id = pi.role_id
    INNER JOIN users u ON u.id = pi.invited_by_user_id
    WHERE pi.invitation_token = p_token
    AND pi.is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_invitation_token(VARCHAR) IS 'Validates invitation token and returns invitation details';

-- ============================================================================
-- FUNCTION: Accept project invitation
-- Description: Accepts invitation and creates user role assignment
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_project_invitation(
    p_token VARCHAR,
    p_accepting_user_id UUID -- Internal user ID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_invitation project_invitations%ROWTYPE;
    v_is_valid BOOLEAN;
BEGIN
    -- Get invitation details
    SELECT * INTO v_invitation
    FROM project_invitations
    WHERE invitation_token = p_token
    AND is_deleted = FALSE;

    -- Check if invitation exists
    IF v_invitation.id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Validate invitation
    v_is_valid := (
        v_invitation.invitation_status = 'pending'
        AND (v_invitation.invitation_expires_at IS NULL OR v_invitation.invitation_expires_at > NOW())
    );

    IF NOT v_is_valid THEN
        RETURN FALSE;
    END IF;

    -- Check seat availability
    PERFORM 1 FROM check_seat_availability(v_invitation.project_id)
    WHERE has_available_seats = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No available seats in project';
    END IF;

    -- Create user role assignment
    INSERT INTO user_roles (
        user_id,
        role_id,
        project_id,
        assigned_by,
        is_active
    )
    VALUES (
        p_accepting_user_id,
        v_invitation.role_id,
        v_invitation.project_id,
        v_invitation.invited_by_user_id,
        TRUE
    )
    ON CONFLICT (user_id, role_id, project_id) DO UPDATE
    SET is_active = TRUE,
        is_deleted = FALSE,
        updated_at = NOW();

    -- Update invitation status
    UPDATE project_invitations
    SET invitation_status = 'accepted',
        accepted_at = NOW(),
        accepted_by_user_id = p_accepting_user_id,
        updated_at = NOW()
    WHERE id = v_invitation.id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION accept_project_invitation(VARCHAR, UUID) IS 'Accepts invitation and assigns role to user';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    func_count INTEGER;
BEGIN
    -- Count created functions
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p
    INNER JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'get_user_platforms',
        'has_project_permission',
        'get_user_project_permissions',
        'get_user_accessible_projects',
        'is_account_owner',
        'get_user_accounts',
        'validate_invitation_token',
        'accept_project_invitation'
    );

    IF func_count >= 8 THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE '✓ v87 Migration Successful';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Functions Created: %', func_count;
        RAISE NOTICE '';
        RAISE NOTICE 'Platform Access:';
        RAISE NOTICE '  - get_user_platforms()';
        RAISE NOTICE '';
        RAISE NOTICE 'Permission Checking:';
        RAISE NOTICE '  - has_project_permission()';
        RAISE NOTICE '  - get_user_project_permissions()';
        RAISE NOTICE '';
        RAISE NOTICE 'Project Access:';
        RAISE NOTICE '  - get_user_accessible_projects()';
        RAISE NOTICE '  - get_user_accounts()';
        RAISE NOTICE '  - is_account_owner()';
        RAISE NOTICE '';
        RAISE NOTICE 'Invitations:';
        RAISE NOTICE '  - validate_invitation_token()';
        RAISE NOTICE '  - accept_project_invitation()';
        RAISE NOTICE '========================================';
    ELSE
        RAISE WARNING 'Some functions may not have been created: % of 8', func_count;
    END IF;
END $$;
