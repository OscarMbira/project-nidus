-- ================================================
-- File: v10_validation_tests.sql
-- Description: Comprehensive database validation tests
-- Version: 1.0
-- Date: 2025-11-15
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v09 must be run first (all tables, views, policies must exist)

-- Purpose:
-- Validates that all database objects were created correctly:
-- 1. Tables (28 core tables)
-- 2. Triggers (100+ triggers)
-- 3. Indexes (80+ indexes)
-- 4. Views (12 views)
-- 5. RLS Policies (80+ policies)
-- 6. Foreign Keys
-- 7. Functions

-- ================================================
-- VALIDATION TEST SUITE
-- ================================================

DO $$
DECLARE
    v_table_count INTEGER;
    v_trigger_count INTEGER;
    v_index_count INTEGER;
    v_view_count INTEGER;
    v_policy_count INTEGER;
    v_function_count INTEGER;
    v_fk_count INTEGER;
    v_rls_enabled_count INTEGER;

    v_expected_tables INTEGER := 28;
    v_expected_triggers INTEGER := 56;  -- 2 per table minimum (before insert, before update)
    v_expected_views INTEGER := 12;
    v_expected_functions INTEGER := 5;  -- From v01

    v_pass_count INTEGER := 0;
    v_fail_count INTEGER := 0;
    v_test_name TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'DATABASE VALIDATION TEST SUITE';
    RAISE NOTICE 'Project Nidus - Multi-Methodology PM System';
    RAISE NOTICE 'Date: %', NOW();
    RAISE NOTICE '================================================';
    RAISE NOTICE '';

    -- ================================================
    -- TEST 1: Verify All Tables Exist
    -- ================================================
    v_test_name := 'Tables Exist';
    RAISE NOTICE 'TEST 1: Verify All Tables Exist';
    RAISE NOTICE '----------------------------------------';

    SELECT COUNT(*)
    INTO v_table_count
    FROM database_tables
    WHERE is_deleted = FALSE
      AND table_category IN ('system', 'user', 'project', 'config');

    RAISE NOTICE 'Expected Tables: %', v_expected_tables;
    RAISE NOTICE 'Actual Tables:   %', v_table_count;

    IF v_table_count = v_expected_tables THEN
        RAISE NOTICE 'Result: ✓ PASS';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'Result: ✗ FAIL - Expected %, got %', v_expected_tables, v_table_count;
        v_fail_count := v_fail_count + 1;
    END IF;
    RAISE NOTICE '';

    -- ================================================
    -- TEST 2: Verify All Tables in PostgreSQL
    -- ================================================
    v_test_name := 'PostgreSQL Tables';
    RAISE NOTICE 'TEST 2: Verify All Tables in PostgreSQL';
    RAISE NOTICE '----------------------------------------';

    SELECT COUNT(*)
    INTO v_table_count
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
          -- System Core Tables (8)
          'database_tables', 'audit_trails', 'session_logs', 'system_settings',
          'email_templates', 'notifications', 'activity_logs', 'error_logs',
          -- User & Access Tables (7)
          'users', 'roles', 'permissions', 'user_roles', 'role_permissions',
          'user_preferences', 'user_projects',
          -- Project Core Tables (8)
          'project_statuses', 'project_types', 'projects', 'project_methodologies',
          'project_configurations', 'project_phases', 'teams', 'team_members',
          -- Configuration Tables (5)
          'methodologies', 'workflows', 'menu_items', 'role_menu_items',
          'user_menu_preferences'
      );

    RAISE NOTICE 'Expected Tables: %', v_expected_tables;
    RAISE NOTICE 'Actual Tables:   %', v_table_count;

    IF v_table_count = v_expected_tables THEN
        RAISE NOTICE 'Result: ✓ PASS';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'Result: ✗ FAIL - Expected %, got %', v_expected_tables, v_table_count;
        v_fail_count := v_fail_count + 1;
    END IF;
    RAISE NOTICE '';

    -- ================================================
    -- TEST 3: Verify All Triggers Exist
    -- ================================================
    v_test_name := 'Triggers Exist';
    RAISE NOTICE 'TEST 3: Verify All Triggers Exist';
    RAISE NOTICE '----------------------------------------';

    SELECT COUNT(*)
    INTO v_trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND NOT t.tgisinternal;

    RAISE NOTICE 'Expected Triggers (minimum): %', v_expected_triggers;
    RAISE NOTICE 'Actual Triggers:             %', v_trigger_count;

    IF v_trigger_count >= v_expected_triggers THEN
        RAISE NOTICE 'Result: ✓ PASS';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'Result: ✗ FAIL - Expected at least %, got %', v_expected_triggers, v_trigger_count;
        v_fail_count := v_fail_count + 1;
    END IF;
    RAISE NOTICE '';

    -- ================================================
    -- TEST 4: Verify All Views Exist
    -- ================================================
    v_test_name := 'Views Exist';
    RAISE NOTICE 'TEST 4: Verify All Views Exist';
    RAISE NOTICE '----------------------------------------';

    SELECT COUNT(*)
    INTO v_view_count
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname LIKE 'v\_%';

    RAISE NOTICE 'Expected Views: %', v_expected_views;
    RAISE NOTICE 'Actual Views:   %', v_view_count;

    IF v_view_count = v_expected_views THEN
        RAISE NOTICE 'Result: ✓ PASS';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'Result: ✗ FAIL - Expected %, got %', v_expected_views, v_view_count;
        v_fail_count := v_fail_count + 1;
    END IF;
    RAISE NOTICE '';

    -- ================================================
    -- TEST 5: Verify All Functions Exist
    -- ================================================
    v_test_name := 'Functions Exist';
    RAISE NOTICE 'TEST 5: Verify All Functions Exist';
    RAISE NOTICE '----------------------------------------';

    SELECT COUNT(*)
    INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
          'trigger_set_created_fields',
          'trigger_update_audit_fields',
          'soft_delete_record',
          'restore_deleted_record',
          'get_table_row_count'
      );

    RAISE NOTICE 'Expected Functions: %', v_expected_functions;
    RAISE NOTICE 'Actual Functions:   %', v_function_count;

    IF v_function_count = v_expected_functions THEN
        RAISE NOTICE 'Result: ✓ PASS';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'Result: ✗ FAIL - Expected %, got %', v_expected_functions, v_function_count;
        v_fail_count := v_fail_count + 1;
    END IF;
    RAISE NOTICE '';

    -- ================================================
    -- TEST 6: Verify RLS Enabled on All Tables
    -- ================================================
    v_test_name := 'RLS Enabled';
    RAISE NOTICE 'TEST 6: Verify RLS Enabled on All Tables';
    RAISE NOTICE '----------------------------------------';

    SELECT COUNT(*)
    INTO v_rls_enabled_count
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = TRUE
      AND c.relname IN (
          -- System Core Tables (8)
          'database_tables', 'audit_trails', 'session_logs', 'system_settings',
          'email_templates', 'notifications', 'activity_logs', 'error_logs',
          -- User & Access Tables (7)
          'users', 'roles', 'permissions', 'user_roles', 'role_permissions',
          'user_preferences', 'user_projects',
          -- Project Core Tables (8)
          'project_statuses', 'project_types', 'projects', 'project_methodologies',
          'project_configurations', 'project_phases', 'teams', 'team_members',
          -- Configuration Tables (5)
          'methodologies', 'workflows', 'menu_items', 'role_menu_items',
          'user_menu_preferences'
      );

    RAISE NOTICE 'Expected Tables with RLS: %', v_expected_tables;
    RAISE NOTICE 'Actual Tables with RLS:   %', v_rls_enabled_count;

    IF v_rls_enabled_count = v_expected_tables THEN
        RAISE NOTICE 'Result: ✓ PASS';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'Result: ✗ FAIL - Expected %, got %', v_expected_tables, v_rls_enabled_count;
        v_fail_count := v_fail_count + 1;
    END IF;
    RAISE NOTICE '';

    -- ================================================
    -- TEST 7: Verify RLS Policies Exist
    -- ================================================
    v_test_name := 'RLS Policies';
    RAISE NOTICE 'TEST 7: Verify RLS Policies Exist';
    RAISE NOTICE '----------------------------------------';

    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public';

    RAISE NOTICE 'Expected Policies (minimum): 56';  -- At least 2 per table (admin + user)
    RAISE NOTICE 'Actual Policies:             %', v_policy_count;

    IF v_policy_count >= 56 THEN
        RAISE NOTICE 'Result: ✓ PASS';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'Result: ✗ FAIL - Expected at least 56, got %', v_policy_count;
        v_fail_count := v_fail_count + 1;
    END IF;
    RAISE NOTICE '';

    -- ================================================
    -- TEST 8: Verify Indexes Exist
    -- ================================================
    v_test_name := 'Indexes Exist';
    RAISE NOTICE 'TEST 8: Verify Indexes Exist';
    RAISE NOTICE '----------------------------------------';

    SELECT COUNT(*)
    INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public';

    RAISE NOTICE 'Expected Indexes (minimum): 80';
    RAISE NOTICE 'Actual Indexes:             %', v_index_count;

    IF v_index_count >= 80 THEN
        RAISE NOTICE 'Result: ✓ PASS';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'Result: ✗ FAIL - Expected at least 80, got %', v_index_count;
        v_fail_count := v_fail_count + 1;
    END IF;
    RAISE NOTICE '';

    -- ================================================
    -- TEST 9: Verify Foreign Key Constraints
    -- ================================================
    v_test_name := 'Foreign Keys';
    RAISE NOTICE 'TEST 9: Verify Foreign Key Constraints';
    RAISE NOTICE '----------------------------------------';

    SELECT COUNT(*)
    INTO v_fk_count
    FROM pg_constraint
    WHERE contype = 'f'
      AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

    RAISE NOTICE 'Expected Foreign Keys (minimum): 40';
    RAISE NOTICE 'Actual Foreign Keys:             %', v_fk_count;

    IF v_fk_count >= 40 THEN
        RAISE NOTICE 'Result: ✓ PASS';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'Result: ✗ FAIL - Expected at least 40, got %', v_fk_count;
        v_fail_count := v_fail_count + 1;
    END IF;
    RAISE NOTICE '';

    -- ================================================
    -- TEST 10: Verify All Tables Have Audit Fields
    -- ================================================
    v_test_name := 'Audit Fields';
    RAISE NOTICE 'TEST 10: Verify All Tables Have Audit Fields';
    RAISE NOTICE '----------------------------------------';

    -- Check if all tables have the 8 required audit fields
    SELECT COUNT(*)
    INTO v_table_count
    FROM (
        SELECT
            t.tablename,
            COUNT(c.column_name) AS audit_field_count
        FROM pg_tables t
        LEFT JOIN information_schema.columns c ON
            c.table_schema = t.schemaname
            AND c.table_name = t.tablename
            AND c.column_name IN (
                'created_at', 'created_by', 'updated_at', 'updated_by',
                'is_deleted', 'deleted_at', 'deleted_by', 'row_version'
            )
        WHERE t.schemaname = 'public'
          AND t.tablename IN (
              'database_tables', 'audit_trails', 'session_logs', 'system_settings',
              'email_templates', 'notifications', 'activity_logs', 'error_logs',
              'users', 'roles', 'permissions', 'user_roles', 'role_permissions',
              'user_preferences', 'user_projects',
              'project_statuses', 'project_types', 'projects', 'project_methodologies',
              'project_configurations', 'project_phases', 'teams', 'team_members',
              'methodologies', 'workflows', 'menu_items', 'role_menu_items',
              'user_menu_preferences'
          )
        GROUP BY t.tablename
        HAVING COUNT(c.column_name) = 8
    ) AS tables_with_audit_fields;

    RAISE NOTICE 'Expected Tables with Audit Fields: %', v_expected_tables;
    RAISE NOTICE 'Actual Tables with Audit Fields:   %', v_table_count;

    IF v_table_count = v_expected_tables THEN
        RAISE NOTICE 'Result: ✓ PASS';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'Result: ✗ FAIL - Expected %, got %', v_expected_tables, v_table_count;
        v_fail_count := v_fail_count + 1;
    END IF;
    RAISE NOTICE '';

    -- ================================================
    -- TEST SUMMARY
    -- ================================================
    RAISE NOTICE '================================================';
    RAISE NOTICE 'TEST SUMMARY';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total Tests:  %', (v_pass_count + v_fail_count);
    RAISE NOTICE 'Passed:       % ✓', v_pass_count;
    RAISE NOTICE 'Failed:       % ✗', v_fail_count;
    RAISE NOTICE '';

    IF v_fail_count = 0 THEN
        RAISE NOTICE 'OVERALL RESULT: ✓✓✓ ALL TESTS PASSED ✓✓✓';
    ELSE
        RAISE NOTICE 'OVERALL RESULT: ✗✗✗ SOME TESTS FAILED ✗✗✗';
    END IF;

    RAISE NOTICE '================================================';
    RAISE NOTICE '';

END $$;

-- ================================================
-- DETAILED DIAGNOSTICS
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'DETAILED DIAGNOSTICS';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
END $$;

-- ================================================
-- List All Tables by Category
-- ================================================
DO $$
BEGIN
    RAISE NOTICE 'TABLES BY CATEGORY:';
    RAISE NOTICE '----------------------------------------';
END $$;

SELECT
    table_category,
    COUNT(*) AS table_count,
    STRING_AGG(table_name, ', ' ORDER BY table_name) AS tables
FROM database_tables
WHERE is_deleted = FALSE
GROUP BY table_category
ORDER BY table_category;

-- ================================================
-- List All Views
-- ================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'VIEWS:';
    RAISE NOTICE '----------------------------------------';
END $$;

SELECT viewname
FROM pg_views
WHERE schemaname = 'public'
  AND viewname LIKE 'v\_%'
ORDER BY viewname;

-- ================================================
-- List All Functions
-- ================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'FUNCTIONS:';
    RAISE NOTICE '----------------------------------------';
END $$;

SELECT p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- ================================================
-- RLS Policy Count by Table
-- ================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'RLS POLICIES BY TABLE:';
    RAISE NOTICE '----------------------------------------';
END $$;

SELECT
    tablename,
    COUNT(*) AS policy_count,
    STRING_AGG(policyname, ', ' ORDER BY policyname) AS policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ================================================
-- Tables Missing RLS (Should be none)
-- ================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'TABLES MISSING RLS (Should be empty):';
    RAISE NOTICE '----------------------------------------';
END $$;

SELECT c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = FALSE
  AND c.relname NOT LIKE 'pg_%'
  AND c.relname NOT LIKE 'sql_%'
ORDER BY c.relname;

-- ================================================
-- Index Count by Table
-- ================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'INDEX COUNT BY TABLE:';
    RAISE NOTICE '----------------------------------------';
END $$;

SELECT
    tablename,
    COUNT(*) AS index_count
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ================================================
-- Foreign Key Relationships
-- ================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'FOREIGN KEY RELATIONSHIPS:';
    RAISE NOTICE '----------------------------------------';
END $$;

SELECT
    tc.table_name AS from_table,
    kcu.column_name AS from_column,
    ccu.table_name AS to_table,
    ccu.column_name AS to_column,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ================================================
-- END OF VALIDATION TESTS
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v10_validation_tests.sql completed';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
END $$;

-- Next Steps:
-- If all tests pass, proceed to v11_seed_data_system.sql
-- If any tests fail, review and fix the issues before proceeding
