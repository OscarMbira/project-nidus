-- ============================================================================
-- Fix Platform Registration RLS Policy
-- Version: v123
-- Description: Adds database function to allow users to register for platforms
--              without needing service role permissions
-- Author: Claude Code
-- Date: 2025-12-13
-- ============================================================================

-- Issue:
-- The user_platform_access table has RLS policy that only allows INSERT with service role.
-- Frontend registration code tries to insert using user's auth session, causing 403 errors.

-- Solution:
-- Create SECURITY DEFINER function that bypasses RLS and allows users to register themselves

-- ============================================================================
-- FUNCTION: Register User for Platform
-- Description: Allows users to register themselves for a platform (bypasses RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.register_user_for_platform(
    p_platform VARCHAR(20)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_existing_record UUID;
    v_result jsonb;
BEGIN
    -- Get current authenticated user
    v_user_id := auth.uid();

    -- Check if user is authenticated
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;

    -- Validate platform
    IF p_platform NOT IN ('platform', 'simulator', 'admin') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid platform. Must be: platform, simulator, or admin'
        );
    END IF;

    -- Check if record already exists
    SELECT id INTO v_existing_record
    FROM public.user_platform_access
    WHERE user_id = v_user_id
      AND platform = p_platform;

    -- If record exists, update it
    IF v_existing_record IS NOT NULL THEN
        UPDATE public.user_platform_access
        SET
            has_registered = true,
            registration_date = COALESCE(registration_date, NOW()),
            last_access_at = NOW(),
            access_count = access_count + 1,
            updated_at = NOW()
        WHERE id = v_existing_record;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Platform access updated',
            'record_id', v_existing_record,
            'action', 'updated'
        );
    ELSE
        -- Insert new record
        INSERT INTO public.user_platform_access (
            user_id,
            platform,
            has_registered,
            registration_date,
            first_access_at,
            last_access_at,
            access_count
        )
        VALUES (
            v_user_id,
            p_platform,
            true,
            NOW(),
            NOW(),
            NOW(),
            1
        )
        RETURNING id INTO v_existing_record;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Successfully registered for platform',
            'record_id', v_existing_record,
            'action', 'created'
        );
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_detail', SQLSTATE
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.register_user_for_platform(VARCHAR) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.register_user_for_platform(VARCHAR) IS
'Allows authenticated users to register themselves for a platform (bypasses RLS policies). Used during registration flow.';

-- ============================================================================
-- FUNCTION: Check Platform Registration Status
-- Description: Check if user is registered for a specific platform
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_platform_registration(
    p_user_id UUID,
    p_platform VARCHAR(20)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_has_registered BOOLEAN;
    v_registration_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get registration status
    SELECT has_registered, registration_date
    INTO v_has_registered, v_registration_date
    FROM public.user_platform_access
    WHERE user_id = p_user_id
      AND platform = p_platform;

    -- If no record found, user is not registered
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'registered', false,
            'registration_date', null
        );
    END IF;

    RETURN jsonb_build_object(
        'registered', COALESCE(v_has_registered, false),
        'registration_date', v_registration_date
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'registered', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_platform_registration(UUID, VARCHAR) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.check_platform_registration(UUID, VARCHAR) IS
'Checks if a user is registered for a specific platform. Returns registration status and date.';

-- ============================================================================
-- FUNCTION: Get User Platform Access
-- Description: Get all platform access records for a user (bypasses RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_platform_access(
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    platform VARCHAR(20),
    has_registered BOOLEAN,
    registration_date TIMESTAMP WITH TIME ZONE,
    first_access_at TIMESTAMP WITH TIME ZONE,
    last_access_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER,
    is_primary_platform BOOLEAN,
    onboarding_completed BOOLEAN,
    onboarding_step INTEGER,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        upa.id,
        upa.user_id,
        upa.platform,
        upa.has_registered,
        upa.registration_date,
        upa.first_access_at,
        upa.last_access_at,
        upa.access_count,
        upa.is_primary_platform,
        upa.onboarding_completed,
        upa.onboarding_step,
        upa.onboarding_completed_at,
        upa.created_at,
        upa.updated_at
    FROM public.user_platform_access upa
    WHERE upa.user_id = p_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_platform_access(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_user_platform_access(UUID) IS
'Gets all platform access records for a user (bypasses RLS policies). Used during login and platform checks.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test the function (run after user registration)
-- SELECT public.register_user_for_platform('platform');
-- SELECT public.check_platform_registration(auth.uid(), 'platform');

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

-- DROP FUNCTION IF EXISTS public.register_user_for_platform(VARCHAR);
-- DROP FUNCTION IF EXISTS public.check_platform_registration(UUID, VARCHAR);
-- DROP FUNCTION IF EXISTS public.get_user_platform_access(UUID);

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✓ Platform registration RLS fix applied successfully';
    RAISE NOTICE '  - Created function: register_user_for_platform()';
    RAISE NOTICE '  - Created function: check_platform_registration()';
    RAISE NOTICE '  - Created function: get_user_platform_access()';
    RAISE NOTICE '  - Granted execute permissions to authenticated users';
END $$;
