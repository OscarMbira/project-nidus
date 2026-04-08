-- ============================================================================
-- Add Unique Constraints for Organisation Names
-- Version: v124
-- Description: Ensures organisation names and legal company names are unique
-- Author: Claude Code
-- Date: 2025-12-13
-- ============================================================================

-- Purpose:
-- Prevent duplicate organisation names and legal company names in the system
-- This ensures each organisation has a unique identity

-- Fields to make unique:
-- 1. account_name (Organisation Name) - User-facing organisation name
-- 2. company_name (Legal Company Name) - Legal/registered company name

-- ============================================================================
-- ADD UNIQUE CONSTRAINTS
-- ============================================================================

-- Add unique constraint to account_name (Organisation Name)
-- Only enforce uniqueness for active (non-deleted) records
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_account_name_unique
    ON accounts(LOWER(account_name))
    WHERE is_deleted = FALSE;

COMMENT ON INDEX idx_accounts_account_name_unique IS
'Ensures organisation names are unique (case-insensitive) for active accounts';

-- Add unique constraint to company_name (Legal Company Name)
-- Only enforce uniqueness for active (non-deleted) records
-- Allow NULL values (company_name is optional)
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_company_name_unique
    ON accounts(LOWER(company_name))
    WHERE is_deleted = FALSE AND company_name IS NOT NULL;

COMMENT ON INDEX idx_accounts_company_name_unique IS
'Ensures legal company names are unique (case-insensitive) for active accounts';

-- ============================================================================
-- HELPER FUNCTION: Check Organisation Name Availability
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_organisation_name_availability(
    p_account_name VARCHAR(200),
    p_exclude_account_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_exists BOOLEAN;
    v_existing_id UUID;
BEGIN
    -- Check if account_name already exists (case-insensitive)
    SELECT EXISTS (
        SELECT 1
        FROM accounts
        WHERE LOWER(account_name) = LOWER(p_account_name)
          AND is_deleted = FALSE
          AND (p_exclude_account_id IS NULL OR id != p_exclude_account_id)
    ) INTO v_exists;

    IF v_exists THEN
        -- Get the existing account ID for reference
        SELECT id INTO v_existing_id
        FROM accounts
        WHERE LOWER(account_name) = LOWER(p_account_name)
          AND is_deleted = FALSE
          AND (p_exclude_account_id IS NULL OR id != p_exclude_account_id)
        LIMIT 1;

        RETURN jsonb_build_object(
            'available', false,
            'message', 'This organisation name is already taken',
            'existing_account_id', v_existing_id
        );
    END IF;

    RETURN jsonb_build_object(
        'available', true,
        'message', 'Organisation name is available'
    );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_organisation_name_availability(VARCHAR, UUID) TO authenticated;

COMMENT ON FUNCTION public.check_organisation_name_availability(VARCHAR, UUID) IS
'Checks if an organisation name is available (not already in use)';

-- ============================================================================
-- HELPER FUNCTION: Check Legal Company Name Availability
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_company_name_availability(
    p_company_name VARCHAR(200),
    p_exclude_account_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_exists BOOLEAN;
    v_existing_id UUID;
BEGIN
    -- If company name is NULL or empty, it's always available
    IF p_company_name IS NULL OR TRIM(p_company_name) = '' THEN
        RETURN jsonb_build_object(
            'available', true,
            'message', 'Company name is optional'
        );
    END IF;

    -- Check if company_name already exists (case-insensitive)
    SELECT EXISTS (
        SELECT 1
        FROM accounts
        WHERE LOWER(company_name) = LOWER(p_company_name)
          AND is_deleted = FALSE
          AND company_name IS NOT NULL
          AND (p_exclude_account_id IS NULL OR id != p_exclude_account_id)
    ) INTO v_exists;

    IF v_exists THEN
        -- Get the existing account ID for reference
        SELECT id INTO v_existing_id
        FROM accounts
        WHERE LOWER(company_name) = LOWER(p_company_name)
          AND is_deleted = FALSE
          AND company_name IS NOT NULL
          AND (p_exclude_account_id IS NULL OR id != p_exclude_account_id)
        LIMIT 1;

        RETURN jsonb_build_object(
            'available', false,
            'message', 'This legal company name is already registered',
            'existing_account_id', v_existing_id
        );
    END IF;

    RETURN jsonb_build_object(
        'available', true,
        'message', 'Legal company name is available'
    );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_company_name_availability(VARCHAR, UUID) TO authenticated;

COMMENT ON FUNCTION public.check_company_name_availability(VARCHAR, UUID) IS
'Checks if a legal company name is available (not already registered)';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test organisation name availability
-- SELECT public.check_organisation_name_availability('Acme Corporation');

-- Test company name availability
-- SELECT public.check_company_name_availability('Acme Corporation Ltd');

-- Check existing duplicates (run before applying unique constraints)
-- SELECT account_name, COUNT(*) as count
-- FROM accounts
-- WHERE is_deleted = FALSE
-- GROUP BY LOWER(account_name)
-- HAVING COUNT(*) > 1;

-- SELECT company_name, COUNT(*) as count
-- FROM accounts
-- WHERE is_deleted = FALSE AND company_name IS NOT NULL
-- GROUP BY LOWER(company_name)
-- HAVING COUNT(*) > 1;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

-- DROP INDEX IF EXISTS idx_accounts_account_name_unique;
-- DROP INDEX IF EXISTS idx_accounts_company_name_unique;
-- DROP FUNCTION IF EXISTS public.check_organisation_name_availability(VARCHAR, UUID);
-- DROP FUNCTION IF EXISTS public.check_company_name_availability(VARCHAR, UUID);

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✓ Organisation name uniqueness constraints applied successfully';
    RAISE NOTICE '  - Created unique index: idx_accounts_account_name_unique';
    RAISE NOTICE '  - Created unique index: idx_accounts_company_name_unique';
    RAISE NOTICE '  - Created function: check_organisation_name_availability()';
    RAISE NOTICE '  - Created function: check_company_name_availability()';
    RAISE NOTICE '  - Granted execute permissions to authenticated users';
    RAISE NOTICE '';
    RAISE NOTICE '⚠ NOTE: Check for existing duplicates before enforcing uniqueness:';
    RAISE NOTICE '  Run the verification queries in this file to identify any duplicates';
END $$;
