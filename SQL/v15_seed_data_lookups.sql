-- ================================================
-- File: v15_seed_data_lookups.sql
-- Description: Lookup table seed data (Project Statuses, Types)
-- Version: 1.0
-- Date: 2025-11-15
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v09 must be run first (all tables must exist)

-- Purpose:
-- Creates lookup table data:
-- 1. Project Statuses
-- 2. Project Types

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- SECTION 1: PROJECT STATUSES
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Seed Data: Project Statuses';
    RAISE NOTICE '================================================';
END $$;

INSERT INTO project_statuses (status_code, status_name, status_description, status_color, status_icon, status_order, is_initial_status, is_final_status, is_active_status, is_active)
VALUES
    ('draft', 'Draft', 'Project is being drafted and not yet approved', '#6B7280', 'file-pen', 1, true, false, false, true),
    ('planning', 'Planning', 'Project is in planning phase', '#3B82F6', 'clipboard-list', 2, false, false, false, true),
    ('active', 'Active', 'Project is active and work is in progress', '#10B981', 'play-circle', 3, false, false, true, true),
    ('on_hold', 'On Hold', 'Project is temporarily paused', '#F59E0B', 'pause-circle', 4, false, false, false, true),
    ('at_risk', 'At Risk', 'Project is at risk and requires attention', '#EF4444', 'alert-triangle', 5, false, false, true, true),
    ('under_review', 'Under Review', 'Project is under review or assessment', '#8B5CF6', 'magnifying-glass', 6, false, false, false, true),
    ('completed', 'Completed', 'Project has been completed successfully', '#14B8A6', 'check-circle', 7, false, true, false, true),
    ('cancelled', 'Cancelled', 'Project has been cancelled', '#DC2626', 'x-circle', 8, false, true, false, true),
    ('closed', 'Closed', 'Project is closed and archived', '#9CA3AF', 'archive', 9, false, true, false, true)
ON CONFLICT (status_code) DO UPDATE SET
    status_name = EXCLUDED.status_name,
    status_description = EXCLUDED.status_description,
    status_color = EXCLUDED.status_color,
    status_order = EXCLUDED.status_order,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Project statuses created successfully';
    RAISE NOTICE '';
END $$;

-- ================================================
-- SECTION 2: PROJECT TYPES
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Seed Data: Project Types';
    RAISE NOTICE '================================================';
END $$;

INSERT INTO project_types (type_code, type_name, type_description, type_category, type_color, type_icon, is_active)
VALUES
    ('internal', 'Internal Project', 'Internal company projects and initiatives', 'internal', '#3B82F6', 'building', true),
    ('client', 'Client Project', 'Client-facing projects and deliverables', 'external', '#10B981', 'user-tie', true),
    ('research', 'Research & Development', 'Research and development initiatives', 'innovation', '#8B5CF6', 'flask', true),
    ('maintenance', 'Maintenance', 'System and product maintenance projects', 'operations', '#F59E0B', 'wrench', true),
    ('strategic', 'Strategic Initiative', 'Strategic company initiatives and programs', 'strategic', '#EF4444', 'chess', true),
    ('product', 'Product Development', 'New product development projects', 'innovation', '#EC4899', 'box', true),
    ('infrastructure', 'Infrastructure', 'IT infrastructure and platform projects', 'technical', '#6366F1', 'server', true),
    ('process', 'Process Improvement', 'Business process improvement projects', 'operational', '#14B8A6', 'chart-line-up', true),
    ('marketing', 'Marketing Campaign', 'Marketing and promotional campaigns', 'business', '#F97316', 'megaphone', true),
    ('training', 'Training & Development', 'Training and organizational development', 'development', '#06B6D4', 'graduation-cap', true)
ON CONFLICT (type_code) DO UPDATE SET
    type_name = EXCLUDED.type_name,
    type_description = EXCLUDED.type_description,
    type_color = EXCLUDED.type_color,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Project types created successfully';
    RAISE NOTICE '';
END $$;

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_statuses_count INTEGER;
    v_types_count INTEGER;
    v_status RECORD;
    v_type RECORD;
BEGIN
    -- Count project statuses
    SELECT COUNT(*)
    INTO v_statuses_count
    FROM project_statuses
    WHERE is_deleted = FALSE;

    -- Count project types
    SELECT COUNT(*)
    INTO v_types_count
    FROM project_types
    WHERE is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Lookup Data Seed Data Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Project Statuses: %', v_statuses_count;
    RAISE NOTICE 'Project Types:    %', v_types_count;
    RAISE NOTICE '================================================';

    -- Display status summary
    RAISE NOTICE '';
    RAISE NOTICE 'PROJECT STATUSES:';
    RAISE NOTICE '----------------------------------------';

    FOR v_status IN
        SELECT
            status_name,
            status_color,
            status_order
        FROM project_statuses
        WHERE is_deleted = FALSE
        ORDER BY status_order
    LOOP
        RAISE NOTICE '% - % (Order: %)', v_status.status_name, v_status.status_color, v_status.status_order;
    END LOOP;

    -- Display type summary
    RAISE NOTICE '';
    RAISE NOTICE 'PROJECT TYPES:';
    RAISE NOTICE '----------------------------------------';

    FOR v_type IN
        SELECT
            type_name,
            type_category,
            type_color
        FROM project_types
        WHERE is_deleted = FALSE
        ORDER BY type_name
    LOOP
        RAISE NOTICE '% (%) - %', v_type.type_name, v_type.type_category, v_type.type_color;
    END LOOP;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'v15_seed_data_lookups.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

-- Next Steps:
-- Run v17_test_procedures.sql to create test procedures (optional)
-- Or proceed to application development
