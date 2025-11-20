-- ================================================
-- File: v01_extensions_and_functions.sql
-- Description: PostgreSQL extensions and trigger functions for audit trail automation
-- Version: 1.0
-- Date: 2025-11-15
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - PostgreSQL 15 or higher
-- - Supabase environment with auth schema

-- Purpose:
-- This file creates the foundational extensions and trigger functions
-- required by all tables in Project Nidus. These functions automate
-- the maintenance of audit fields (created_at, created_by, updated_at, etc.)

-- ================================================
-- SECTION 1: EXTENSIONS
-- ================================================

-- Enable UUID generation extension
-- Required for uuid_generate_v4() function used in all tables
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

COMMENT ON EXTENSION "uuid-ossp" IS 'Provides UUID generation functions for secure primary keys';

-- ================================================
-- SECTION 2: TRIGGER FUNCTIONS FOR AUDIT FIELDS
-- ================================================

-- ------------------------------------------------
-- FUNCTION: trigger_set_created_fields()
-- Purpose: Automatically set created_at, created_by, and initial updated_at on INSERT
-- Usage: Called by BEFORE INSERT triggers on all tables
-- ------------------------------------------------

-- Drop existing function if exists (for re-running script)
DROP FUNCTION IF EXISTS trigger_set_created_fields() CASCADE;

CREATE OR REPLACE FUNCTION trigger_set_created_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Set created timestamp to current time
    NEW.created_at := NOW();

    -- Set created_by to current authenticated user from Supabase auth
    -- Will be NULL if no user is authenticated (system operations)
    NEW.created_by := auth.uid();

    -- Initialize updated_at to same as created_at
    -- This ensures updated_at is never NULL
    NEW.updated_at := NOW();

    -- Note: updated_by is NOT set here - it will be NULL until first update
    -- This allows us to distinguish between "never updated" (NULL) and "updated by someone"

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, auth;

-- Add function comment
COMMENT ON FUNCTION trigger_set_created_fields() IS
'Trigger function that automatically sets created_at, created_by, and initial updated_at fields on INSERT. Used by BEFORE INSERT triggers on all tables.';

-- ------------------------------------------------
-- FUNCTION: trigger_update_audit_fields()
-- Purpose: Automatically update updated_at and updated_by on UPDATE, protect created fields
-- Usage: Called by BEFORE UPDATE triggers on all tables
-- ------------------------------------------------

-- Drop existing function if exists (for re-running script)
DROP FUNCTION IF EXISTS trigger_update_audit_fields() CASCADE;

CREATE OR REPLACE FUNCTION trigger_update_audit_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Always update the updated_at timestamp to current time
    NEW.updated_at := NOW();

    -- Set updated_by to current authenticated user from Supabase auth
    -- Will be NULL if no user is authenticated (system operations)
    NEW.updated_by := auth.uid();

    -- IMPORTANT: Prevent modification of created fields
    -- These should NEVER change after record creation
    -- This protects against application bugs or malicious attempts to change history
    NEW.created_at := OLD.created_at;
    NEW.created_by := OLD.created_by;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, auth;

-- Add function comment
COMMENT ON FUNCTION trigger_update_audit_fields() IS
'Trigger function that automatically updates updated_at and updated_by fields on UPDATE, and protects created fields from modification. Used by BEFORE UPDATE triggers on all tables.';

-- ================================================
-- SECTION 3: SOFT DELETE UTILITY FUNCTIONS
-- ================================================

-- ------------------------------------------------
-- FUNCTION: soft_delete_record()
-- Purpose: Soft delete a record by setting is_deleted = TRUE and audit fields
-- Usage: SELECT soft_delete_record('table_name', 'record-uuid');
-- Returns: BOOLEAN - TRUE if record was deleted, FALSE if not found or already deleted
-- ------------------------------------------------

-- Drop existing function if exists (for re-running script)
DROP FUNCTION IF EXISTS soft_delete_record(TEXT, UUID) CASCADE;

CREATE OR REPLACE FUNCTION soft_delete_record(
    p_table_name TEXT,
    p_record_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_rows_affected INTEGER;
BEGIN
    -- Perform soft delete by updating is_deleted flag and audit fields
    -- Only affects records that are not already deleted
    EXECUTE format(
        'UPDATE %I SET
            is_deleted = TRUE,
            deleted_at = NOW(),
            deleted_by = auth.uid()
         WHERE id = $1
           AND is_deleted = FALSE',
        p_table_name
    ) USING p_record_id;

    -- Get number of rows affected
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    -- Return TRUE if a record was deleted, FALSE otherwise
    RETURN v_rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, auth;

-- Add function comment
COMMENT ON FUNCTION soft_delete_record(TEXT, UUID) IS
'Soft deletes a record by setting is_deleted=TRUE and audit fields (deleted_at, deleted_by). Returns TRUE if successful, FALSE if record not found or already deleted. Example: SELECT soft_delete_record(''projects'', ''uuid-here'');';

-- ------------------------------------------------
-- FUNCTION: restore_deleted_record()
-- Purpose: Restore a soft-deleted record by setting is_deleted = FALSE
-- Usage: SELECT restore_deleted_record('table_name', 'record-uuid');
-- Returns: BOOLEAN - TRUE if record was restored, FALSE if not found or not deleted
-- ------------------------------------------------

-- Drop existing function if exists (for re-running script)
DROP FUNCTION IF EXISTS restore_deleted_record(TEXT, UUID) CASCADE;

CREATE OR REPLACE FUNCTION restore_deleted_record(
    p_table_name TEXT,
    p_record_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_rows_affected INTEGER;
BEGIN
    -- Restore soft-deleted record by clearing is_deleted flag and audit fields
    -- Only affects records that are currently deleted
    EXECUTE format(
        'UPDATE %I SET
            is_deleted = FALSE,
            deleted_at = NULL,
            deleted_by = NULL
         WHERE id = $1
           AND is_deleted = TRUE',
        p_table_name
    ) USING p_record_id;

    -- Get number of rows affected
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    -- Return TRUE if a record was restored, FALSE otherwise
    RETURN v_rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, auth;

-- Add function comment
COMMENT ON FUNCTION restore_deleted_record(TEXT, UUID) IS
'Restores a soft-deleted record by setting is_deleted=FALSE and clearing deleted_at and deleted_by. Returns TRUE if successful, FALSE if record not found or not deleted. Example: SELECT restore_deleted_record(''projects'', ''uuid-here'');';

-- ================================================
-- SECTION 4: UTILITY FUNCTIONS
-- ================================================

-- ------------------------------------------------
-- FUNCTION: get_table_row_count()
-- Purpose: Get estimated or exact row count for a table
-- Usage: SELECT get_table_row_count('table_name', false);
-- Parameters:
--   p_table_name: Name of the table
--   p_exact: TRUE for exact count (slow), FALSE for estimate (fast)
-- Returns: BIGINT - Number of rows
-- ------------------------------------------------

-- Drop existing function if exists (for re-running script)
DROP FUNCTION IF EXISTS get_table_row_count(TEXT, BOOLEAN) CASCADE;

CREATE OR REPLACE FUNCTION get_table_row_count(
    p_table_name TEXT,
    p_exact BOOLEAN DEFAULT FALSE
)
RETURNS BIGINT AS $$
DECLARE
    v_row_count BIGINT;
BEGIN
    IF p_exact THEN
        -- Exact count (slow for large tables)
        EXECUTE format('SELECT COUNT(*) FROM %I', p_table_name)
        INTO v_row_count;
    ELSE
        -- Estimated count from statistics (fast)
        SELECT reltuples::BIGINT
        INTO v_row_count
        FROM pg_class
        WHERE relname = p_table_name
          AND relkind = 'r';

        -- If no estimate available, fall back to exact count
        IF v_row_count IS NULL THEN
            EXECUTE format('SELECT COUNT(*) FROM %I', p_table_name)
            INTO v_row_count;
        END IF;
    END IF;

    RETURN COALESCE(v_row_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, auth;

-- Add function comment
COMMENT ON FUNCTION get_table_row_count(TEXT, BOOLEAN) IS
'Returns row count for a table. Use p_exact=FALSE for fast estimate, p_exact=TRUE for exact count (slow on large tables). Example: SELECT get_table_row_count(''projects'', false);';

-- ================================================
-- SECTION 5: VERIFICATION
-- ================================================

-- Verify extensions are installed
DO $$
BEGIN
    -- Check uuid-ossp extension
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
        RAISE EXCEPTION 'Extension uuid-ossp not installed';
    END IF;

    RAISE NOTICE 'Extension uuid-ossp: OK';
END $$;

-- Verify functions are created
DO $$
BEGIN
    -- Check trigger functions
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trigger_set_created_fields') THEN
        RAISE EXCEPTION 'Function trigger_set_created_fields not created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trigger_update_audit_fields') THEN
        RAISE EXCEPTION 'Function trigger_update_audit_fields not created';
    END IF;

    -- Check utility functions
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'soft_delete_record') THEN
        RAISE EXCEPTION 'Function soft_delete_record not created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'restore_deleted_record') THEN
        RAISE EXCEPTION 'Function restore_deleted_record not created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_table_row_count') THEN
        RAISE EXCEPTION 'Function get_table_row_count not created';
    END IF;

    RAISE NOTICE 'All trigger functions: OK';
    RAISE NOTICE 'All utility functions: OK';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v01_extensions_and_functions.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

-- Next Steps:
-- 1. Run v02_system_core_tables.sql to create system tables
-- 2. Run v03_user_access_tables.sql to create user and access management tables
-- 3. Run v04_project_core_tables.sql to create project tables
-- 4. Run v05_configuration_menu_tables.sql to create configuration tables
-- 5. Run v06_indexes.sql to create indexes
-- 6. Run v07_constraints.sql to create additional constraints
-- 7. Run v08_views.sql to create views
-- 8. Run v09_rls_policies.sql to create Row Level Security policies
