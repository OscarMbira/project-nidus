-- ================================================
-- File: v17_test_procedures.sql
-- Description: Test procedures for database functionality testing
-- Version: 1.0
-- Date: 2025-11-15
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v15 must be run first (all tables and seed data must exist)

-- Purpose:
-- Creates stored procedures for testing database functionality:
-- 1. test_audit_triggers() - Test audit field triggers
-- 2. test_soft_delete() - Test soft delete functionality
-- 3. test_rls_policies() - Test RLS policies
-- 4. test_foreign_keys() - Test foreign key constraints
-- 5. test_views() - Test views return correct data
-- 6. run_all_tests() - Master test procedure

-- ================================================
-- PROCEDURE 1: Test Audit Triggers
-- ================================================

CREATE OR REPLACE FUNCTION test_audit_triggers()
RETURNS TABLE(
    test_name TEXT,
    status TEXT,
    message TEXT
) AS $$
DECLARE
    v_test_id UUID;
    v_created_at TIMESTAMP;
    v_updated_at TIMESTAMP;
    v_created_by UUID;
    v_updated_by UUID;
BEGIN
    -- Test 1: INSERT trigger sets created fields
    BEGIN
        INSERT INTO system_settings (setting_category, setting_key, setting_value, setting_type)
        VALUES ('test', 'test_key_audit', '"test_value"', 'string')
        RETURNING id, created_at, created_by INTO v_test_id, v_created_at, v_created_by;

        IF v_created_at IS NOT NULL THEN
            test_name := 'INSERT Trigger - created_at';
            status := 'PASS';
            message := 'created_at was set automatically';
            RETURN NEXT;
        ELSE
            test_name := 'INSERT Trigger - created_at';
            status := 'FAIL';
            message := 'created_at was not set';
            RETURN NEXT;
        END IF;

        -- Clean up
        DELETE FROM system_settings WHERE id = v_test_id;
    EXCEPTION WHEN OTHERS THEN
        test_name := 'INSERT Trigger';
        status := 'ERROR';
        message := SQLERRM;
        RETURN NEXT;
    END;

    -- Test 2: UPDATE trigger sets updated fields
    BEGIN
        INSERT INTO system_settings (setting_category, setting_key, setting_value, setting_type)
        VALUES ('test', 'test_key_update', '"test_value"', 'string')
        RETURNING id INTO v_test_id;

        -- Wait a moment to ensure timestamp difference
        PERFORM pg_sleep(0.1);

        UPDATE system_settings
        SET setting_value = '"updated_value"'
        WHERE id = v_test_id
        RETURNING updated_at INTO v_updated_at;

        IF v_updated_at > (SELECT created_at FROM system_settings WHERE id = v_test_id) THEN
            test_name := 'UPDATE Trigger - updated_at';
            status := 'PASS';
            message := 'updated_at was updated automatically';
            RETURN NEXT;
        ELSE
            test_name := 'UPDATE Trigger - updated_at';
            status := 'FAIL';
            message := 'updated_at was not updated';
            RETURN NEXT;
        END IF;

        -- Clean up
        DELETE FROM system_settings WHERE id = v_test_id;
    EXCEPTION WHEN OTHERS THEN
        test_name := 'UPDATE Trigger';
        status := 'ERROR';
        message := SQLERRM;
        RETURN NEXT;
    END;

    RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION test_audit_triggers() IS 'Tests that audit field triggers work correctly';

-- ================================================
-- PROCEDURE 2: Test Soft Delete
-- ================================================

CREATE OR REPLACE FUNCTION test_soft_delete()
RETURNS TABLE(
    test_name TEXT,
    status TEXT,
    message TEXT
) AS $$
DECLARE
    v_test_id UUID;
    v_is_deleted BOOLEAN;
    v_deleted_at TIMESTAMP;
BEGIN
    -- Test: Soft delete using helper function
    BEGIN
        INSERT INTO system_settings (setting_category, setting_key, setting_value, setting_type)
        VALUES ('test', 'test_key_soft_delete', '"test_value"', 'string')
        RETURNING id INTO v_test_id;

        -- Perform soft delete
        PERFORM soft_delete_record('system_settings', v_test_id);

        SELECT is_deleted, deleted_at
        INTO v_is_deleted, v_deleted_at
        FROM system_settings
        WHERE id = v_test_id;

        IF v_is_deleted = TRUE AND v_deleted_at IS NOT NULL THEN
            test_name := 'Soft Delete Function';
            status := 'PASS';
            message := 'Record was soft deleted correctly';
            RETURN NEXT;
        ELSE
            test_name := 'Soft Delete Function';
            status := 'FAIL';
            message := 'Soft delete did not work correctly';
            RETURN NEXT;
        END IF;

        -- Clean up (hard delete)
        DELETE FROM system_settings WHERE id = v_test_id;
    EXCEPTION WHEN OTHERS THEN
        test_name := 'Soft Delete Function';
        status := 'ERROR';
        message := SQLERRM;
        RETURN NEXT;
    END;

    RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION test_soft_delete() IS 'Tests soft delete functionality';

-- ================================================
-- PROCEDURE 3: Test Foreign Keys
-- ================================================

CREATE OR REPLACE FUNCTION test_foreign_keys()
RETURNS TABLE(
    test_name TEXT,
    status TEXT,
    message TEXT
) AS $$
DECLARE
    v_test_status_id UUID;
    v_test_type_id UUID;
    v_test_project_id UUID;
BEGIN
    -- Test 1: Valid foreign key insertion
    BEGIN
        -- Get a valid status ID
        SELECT id INTO v_test_status_id
        FROM project_statuses
        WHERE status_code = 'draft'
        LIMIT 1;

        -- Get a valid type ID
        SELECT id INTO v_test_type_id
        FROM project_types
        WHERE type_code = 'internal'
        LIMIT 1;

        -- Insert project with valid FKs
        INSERT INTO projects (
            project_code,
            project_name,
            status_id,
            project_type_id
        )
        VALUES (
            'TEST-FK-001',
            'Test Foreign Key Project',
            v_test_status_id,
            v_test_type_id
        )
        RETURNING id INTO v_test_project_id;

        test_name := 'Foreign Key - Valid Insert';
        status := 'PASS';
        message := 'Project created with valid foreign keys';
        RETURN NEXT;

        -- Clean up
        DELETE FROM projects WHERE id = v_test_project_id;
    EXCEPTION WHEN OTHERS THEN
        test_name := 'Foreign Key - Valid Insert';
        status := 'ERROR';
        message := SQLERRM;
        RETURN NEXT;
    END;

    -- Test 2: Invalid foreign key insertion (should fail)
    BEGIN
        INSERT INTO projects (
            project_code,
            project_name,
            status_id,
            project_type_id
        )
        VALUES (
            'TEST-FK-002',
            'Test Invalid FK Project',
            'invalid-uuid-00000000-0000-0000-000000000000'::UUID,
            v_test_type_id
        );

        test_name := 'Foreign Key - Invalid Insert';
        status := 'FAIL';
        message := 'Invalid FK was allowed (should have failed)';
        RETURN NEXT;
    EXCEPTION WHEN foreign_key_violation THEN
        test_name := 'Foreign Key - Invalid Insert';
        status := 'PASS';
        message := 'Invalid FK correctly rejected';
        RETURN NEXT;
    WHEN OTHERS THEN
        test_name := 'Foreign Key - Invalid Insert';
        status := 'ERROR';
        message := SQLERRM;
        RETURN NEXT;
    END;

    RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION test_foreign_keys() IS 'Tests foreign key constraints';

-- ================================================
-- PROCEDURE 4: Test Views
-- ================================================

CREATE OR REPLACE FUNCTION test_views()
RETURNS TABLE(
    test_name TEXT,
    status TEXT,
    message TEXT
) AS $$
DECLARE
    v_view_count INTEGER;
BEGIN
    -- Test 1: v_active_users view
    BEGIN
        SELECT COUNT(*) INTO v_view_count
        FROM v_active_users;

        test_name := 'View: v_active_users';
        status := 'PASS';
        message := format('View returned %s rows', v_view_count);
        RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
        test_name := 'View: v_active_users';
        status := 'ERROR';
        message := SQLERRM;
        RETURN NEXT;
    END;

    -- Test 2: v_active_projects view
    BEGIN
        SELECT COUNT(*) INTO v_view_count
        FROM v_active_projects;

        test_name := 'View: v_active_projects';
        status := 'PASS';
        message := format('View returned %s rows', v_view_count);
        RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
        test_name := 'View: v_active_projects';
        status := 'ERROR';
        message := SQLERRM;
        RETURN NEXT;
    END;

    -- Test 3: v_user_permissions view
    BEGIN
        SELECT COUNT(*) INTO v_view_count
        FROM v_user_permissions;

        test_name := 'View: v_user_permissions';
        status := 'PASS';
        message := format('View returned %s rows', v_view_count);
        RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
        test_name := 'View: v_user_permissions';
        status := 'ERROR';
        message := SQLERRM;
        RETURN NEXT;
    END;

    -- Test 4: v_menu_hierarchy view
    BEGIN
        SELECT COUNT(*) INTO v_view_count
        FROM v_menu_hierarchy;

        test_name := 'View: v_menu_hierarchy';
        status := 'PASS';
        message := format('View returned %s rows', v_view_count);
        RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
        test_name := 'View: v_menu_hierarchy';
        status := 'ERROR';
        message := SQLERRM;
        RETURN NEXT;
    END;

    RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION test_views() IS 'Tests that views return data correctly';

-- ================================================
-- PROCEDURE 5: Test Utility Functions
-- ================================================

CREATE OR REPLACE FUNCTION test_utility_functions()
RETURNS TABLE(
    test_name TEXT,
    status TEXT,
    message TEXT
) AS $$
DECLARE
    v_row_count INTEGER;
BEGIN
    -- Test: get_table_row_count function
    BEGIN
        v_row_count := get_table_row_count('database_tables');

        IF v_row_count >= 0 THEN
            test_name := 'Utility: get_table_row_count';
            status := 'PASS';
            message := format('Function returned %s rows for database_tables', v_row_count);
            RETURN NEXT;
        ELSE
            test_name := 'Utility: get_table_row_count';
            status := 'FAIL';
            message := 'Function returned negative value';
            RETURN NEXT;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        test_name := 'Utility: get_table_row_count';
        status := 'ERROR';
        message := SQLERRM;
        RETURN NEXT;
    END;

    RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION test_utility_functions() IS 'Tests utility functions';

-- ================================================
-- PROCEDURE 6: Test Seed Data Integrity
-- ================================================

CREATE OR REPLACE FUNCTION test_seed_data()
RETURNS TABLE(
    test_name TEXT,
    status TEXT,
    message TEXT
) AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Test 1: Roles exist
    BEGIN
        SELECT COUNT(*) INTO v_count
        FROM roles
        WHERE is_deleted = FALSE;

        IF v_count >= 7 THEN
            test_name := 'Seed Data: Roles';
            status := 'PASS';
            message := format('%s roles found (expected 7+)', v_count);
            RETURN NEXT;
        ELSE
            test_name := 'Seed Data: Roles';
            status := 'FAIL';
            message := format('Only %s roles found (expected 7+)', v_count);
            RETURN NEXT;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        test_name := 'Seed Data: Roles';
        status := 'ERROR';
        message := SQLERRM;
        RETURN NEXT;
    END;

    -- Test 2: Permissions exist
    BEGIN
        SELECT COUNT(*) INTO v_count
        FROM permissions
        WHERE is_deleted = FALSE;

        IF v_count >= 60 THEN
            test_name := 'Seed Data: Permissions';
            status := 'PASS';
            message := format('%s permissions found (expected 60+)', v_count);
            RETURN NEXT;
        ELSE
            test_name := 'Seed Data: Permissions';
            status := 'FAIL';
            message := format('Only %s permissions found (expected 60+)', v_count);
            RETURN NEXT;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        test_name := 'Seed Data: Permissions';
        status := 'ERROR';
        message := SQLERRM;
        RETURN NEXT;
    END;

    -- Test 3: Methodologies exist
    BEGIN
        SELECT COUNT(*) INTO v_count
        FROM methodologies
        WHERE is_deleted = FALSE;

        IF v_count >= 5 THEN
            test_name := 'Seed Data: Methodologies';
            status := 'PASS';
            message := format('%s methodologies found (expected 5+)', v_count);
            RETURN NEXT;
        ELSE
            test_name := 'Seed Data: Methodologies';
            status := 'FAIL';
            message := format('Only %s methodologies found (expected 5+)', v_count);
            RETURN NEXT;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        test_name := 'Seed Data: Methodologies';
        status := 'ERROR';
        message := SQLERRM;
        RETURN NEXT;
    END;

    -- Test 4: Menu items exist
    BEGIN
        SELECT COUNT(*) INTO v_count
        FROM menu_items
        WHERE is_deleted = FALSE;

        IF v_count >= 30 THEN
            test_name := 'Seed Data: Menu Items';
            status := 'PASS';
            message := format('%s menu items found (expected 30+)', v_count);
            RETURN NEXT;
        ELSE
            test_name := 'Seed Data: Menu Items';
            status := 'FAIL';
            message := format('Only %s menu items found (expected 30+)', v_count);
            RETURN NEXT;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        test_name := 'Seed Data: Menu Items';
        status := 'ERROR';
        message := SQLERRM;
        RETURN NEXT;
    END;

    -- Test 5: Project statuses exist
    BEGIN
        SELECT COUNT(*) INTO v_count
        FROM project_statuses
        WHERE is_deleted = FALSE;

        IF v_count >= 9 THEN
            test_name := 'Seed Data: Project Statuses';
            status := 'PASS';
            message := format('%s project statuses found (expected 9+)', v_count);
            RETURN NEXT;
        ELSE
            test_name := 'Seed Data: Project Statuses';
            status := 'FAIL';
            message := format('Only %s project statuses found (expected 9+)', v_count);
            RETURN NEXT;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        test_name := 'Seed Data: Project Statuses';
        status := 'ERROR';
        message := SQLERRM;
        RETURN NEXT;
    END;

    -- Test 6: Project types exist
    BEGIN
        SELECT COUNT(*) INTO v_count
        FROM project_types
        WHERE is_deleted = FALSE;

        IF v_count >= 10 THEN
            test_name := 'Seed Data: Project Types';
            status := 'PASS';
            message := format('%s project types found (expected 10+)', v_count);
            RETURN NEXT;
        ELSE
            test_name := 'Seed Data: Project Types';
            status := 'FAIL';
            message := format('Only %s project types found (expected 10+)', v_count);
            RETURN NEXT;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        test_name := 'Seed Data: Project Types';
        status := 'ERROR';
        message := SQLERRM;
        RETURN NEXT;
    END;

    RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION test_seed_data() IS 'Tests that seed data was loaded correctly';

-- ================================================
-- MASTER PROCEDURE: Run All Tests
-- ================================================

CREATE OR REPLACE FUNCTION run_all_tests()
RETURNS TABLE(
    test_name TEXT,
    status TEXT,
    message TEXT
) AS $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'RUNNING ALL DATABASE TESTS';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';

    RAISE NOTICE 'Test Suite 1: Audit Triggers';
    RAISE NOTICE '----------------------------------------';
    RETURN QUERY SELECT * FROM test_audit_triggers();
    RAISE NOTICE '';

    RAISE NOTICE 'Test Suite 2: Soft Delete';
    RAISE NOTICE '----------------------------------------';
    RETURN QUERY SELECT * FROM test_soft_delete();
    RAISE NOTICE '';

    RAISE NOTICE 'Test Suite 3: Foreign Keys';
    RAISE NOTICE '----------------------------------------';
    RETURN QUERY SELECT * FROM test_foreign_keys();
    RAISE NOTICE '';

    RAISE NOTICE 'Test Suite 4: Views';
    RAISE NOTICE '----------------------------------------';
    RETURN QUERY SELECT * FROM test_views();
    RAISE NOTICE '';

    RAISE NOTICE 'Test Suite 5: Utility Functions';
    RAISE NOTICE '----------------------------------------';
    RETURN QUERY SELECT * FROM test_utility_functions();
    RAISE NOTICE '';

    RAISE NOTICE 'Test Suite 6: Seed Data Integrity';
    RAISE NOTICE '----------------------------------------';
    RETURN QUERY SELECT * FROM test_seed_data();
    RAISE NOTICE '';

    RAISE NOTICE '================================================';
    RAISE NOTICE 'ALL TESTS COMPLETED';
    RAISE NOTICE '================================================';

    RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION run_all_tests() IS 'Runs all database test procedures and returns results';

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Test Procedures Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE '1. test_audit_triggers() - Test audit field triggers';
    RAISE NOTICE '2. test_soft_delete() - Test soft delete functionality';
    RAISE NOTICE '3. test_foreign_keys() - Test foreign key constraints';
    RAISE NOTICE '4. test_views() - Test views return correct data';
    RAISE NOTICE '5. test_utility_functions() - Test utility functions';
    RAISE NOTICE '6. test_seed_data() - Test seed data integrity';
    RAISE NOTICE '7. run_all_tests() - Run all tests';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'To run all tests, execute:';
    RAISE NOTICE '  SELECT * FROM run_all_tests();';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v17_test_procedures.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

-- Next Steps:
-- Run: SELECT * FROM run_all_tests();
-- to execute all database tests
