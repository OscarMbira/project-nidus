-- ================================================
-- File: v158_seed_dropdown_lookup_data.sql
-- Description: Initial seed data for dropdown fields (Project Types, Project Statuses, Methodologies)
-- Version: 1.0
-- Date: 2025-01-27
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - Tables must exist: project_types, project_statuses, methodologies
-- - Trigger functions must exist: trigger_set_created_fields(), trigger_update_audit_fields()

-- Purpose:
-- Populates initial data for dropdown fields that were previously hardcoded:
-- 1. Project Types (10 common project types)
-- 2. Project Statuses (9 common statuses)
-- 3. Methodologies (5 methodologies: Structured PM, Scrum, Kanban, Agile Hybrid, Custom)

-- Note: This script is idempotent and can be run multiple times safely
-- PMO Admins can add/update/delete records via the PMO Admin interface after this migration

-- ================================================
-- SECTION 1: PROJECT TYPES
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Seed Data: Project Types';
    RAISE NOTICE '================================================';
END $$;

INSERT INTO project_types (type_code, type_name, type_description, type_category, type_color, type_icon, is_active, is_deleted)
VALUES
    ('internal', 'Internal Project', 'Internal company projects and initiatives', 'internal', '#3B82F6', 'building', true, false),
    ('client', 'Client Project', 'Client-facing projects and deliverables', 'external', '#10B981', 'user-tie', true, false),
    ('research', 'Research & Development', 'Research and development initiatives', 'innovation', '#8B5CF6', 'flask', true, false),
    ('maintenance', 'Maintenance', 'System and product maintenance projects', 'operations', '#F59E0B', 'wrench', true, false),
    ('strategic', 'Strategic Initiative', 'Strategic company initiatives and programs', 'strategic', '#EF4444', 'chess', true, false),
    ('product', 'Product Development', 'New product development projects', 'innovation', '#EC4899', 'box', true, false),
    ('infrastructure', 'Infrastructure', 'IT infrastructure and platform projects', 'technical', '#6366F1', 'server', true, false),
    ('process', 'Process Improvement', 'Business process improvement projects', 'operational', '#14B8A6', 'chart-line-up', true, false),
    ('marketing', 'Marketing Campaign', 'Marketing and promotional campaigns', 'business', '#F97316', 'megaphone', true, false),
    ('training', 'Training & Development', 'Training and organizational development', 'development', '#06B6D4', 'graduation-cap', true, false)
ON CONFLICT (type_code) DO UPDATE SET
    type_name = EXCLUDED.type_name,
    type_description = EXCLUDED.type_description,
    type_category = EXCLUDED.type_category,
    type_color = EXCLUDED.type_color,
    type_icon = EXCLUDED.type_icon,
    is_active = EXCLUDED.is_active,
    is_deleted = EXCLUDED.is_deleted,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Project types seeded successfully';
    RAISE NOTICE '';
END $$;

-- ================================================
-- SECTION 2: PROJECT STATUSES
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Seed Data: Project Statuses';
    RAISE NOTICE '================================================';
END $$;

INSERT INTO project_statuses (status_code, status_name, status_description, status_color, status_icon, status_order, is_initial_status, is_final_status, is_active_status, is_active, is_deleted)
VALUES
    ('draft', 'Draft', 'Project is being drafted and not yet approved', '#6B7280', 'file-pen', 1, true, false, false, true, false),
    ('planning', 'Planning', 'Project is in planning phase', '#3B82F6', 'clipboard-list', 2, false, false, false, true, false),
    ('active', 'Active', 'Project is active and work is in progress', '#10B981', 'play-circle', 3, false, false, true, true, false),
    ('on_hold', 'On Hold', 'Project is temporarily paused', '#F59E0B', 'pause-circle', 4, false, false, false, true, false),
    ('at_risk', 'At Risk', 'Project is at risk and requires attention', '#EF4444', 'alert-triangle', 5, false, false, true, true, false),
    ('under_review', 'Under Review', 'Project is under review or assessment', '#8B5CF6', 'magnifying-glass', 6, false, false, false, true, false),
    ('completed', 'Completed', 'Project has been completed successfully', '#14B8A6', 'check-circle', 7, false, true, false, true, false),
    ('cancelled', 'Cancelled', 'Project has been cancelled', '#DC2626', 'x-circle', 8, false, true, false, true, false),
    ('closed', 'Closed', 'Project is closed and archived', '#9CA3AF', 'archive', 9, false, true, false, true, false)
ON CONFLICT (status_code) DO UPDATE SET
    status_name = EXCLUDED.status_name,
    status_description = EXCLUDED.status_description,
    status_color = EXCLUDED.status_color,
    status_icon = EXCLUDED.status_icon,
    status_order = EXCLUDED.status_order,
    is_initial_status = EXCLUDED.is_initial_status,
    is_final_status = EXCLUDED.is_final_status,
    is_active_status = EXCLUDED.is_active_status,
    is_active = EXCLUDED.is_active,
    is_deleted = EXCLUDED.is_deleted,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Project statuses seeded successfully';
    RAISE NOTICE '';
END $$;

-- ================================================
-- SECTION 3: METHODOLOGIES
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Seed Data: Methodologies';
    RAISE NOTICE '================================================';
END $$;

-- Methodology 1: Structured PM (Traditional/Waterfall)
INSERT INTO methodologies (
    methodology_code,
    methodology_name,
    methodology_description,
    methodology_category,
    methodology_icon,
    methodology_color,
    supports_sprints,
    supports_kanban,
    supports_gantt,
    supports_stages,
    is_active,
    is_default,
    is_deleted
)
VALUES (
    'structured_pm',
    'Structured PM',
    'Traditional project management methodology with defined phases and stage-gate process. Ideal for projects with clear requirements and minimal expected changes.',
    'traditional',
    'diagram-project',
    '#1E3A8A',
    false,
    false,
    true,
    true,
    true,
    false,
    false
)
ON CONFLICT (methodology_code) DO UPDATE SET
    methodology_name = EXCLUDED.methodology_name,
    methodology_description = EXCLUDED.methodology_description,
    methodology_category = EXCLUDED.methodology_category,
    methodology_icon = EXCLUDED.methodology_icon,
    methodology_color = EXCLUDED.methodology_color,
    supports_sprints = EXCLUDED.supports_sprints,
    supports_kanban = EXCLUDED.supports_kanban,
    supports_gantt = EXCLUDED.supports_gantt,
    supports_stages = EXCLUDED.supports_stages,
    is_active = EXCLUDED.is_active,
    is_default = EXCLUDED.is_default,
    is_deleted = EXCLUDED.is_deleted,
    updated_at = NOW();

-- Methodology 2: Scrum (Agile)
INSERT INTO methodologies (
    methodology_code,
    methodology_name,
    methodology_description,
    methodology_category,
    methodology_icon,
    methodology_color,
    supports_sprints,
    supports_kanban,
    supports_gantt,
    supports_stages,
    is_active,
    is_default,
    is_deleted
)
VALUES (
    'scrum',
    'Scrum',
    'Agile framework using time-boxed iterations (sprints) with defined roles, events, and artifacts. Emphasizes collaboration, flexibility, and iterative delivery.',
    'agile',
    'users-gear',
    '#059669',
    true,
    false,
    false,
    false,
    true,
    true,  -- Default methodology
    false
)
ON CONFLICT (methodology_code) DO UPDATE SET
    methodology_name = EXCLUDED.methodology_name,
    methodology_description = EXCLUDED.methodology_description,
    methodology_category = EXCLUDED.methodology_category,
    methodology_icon = EXCLUDED.methodology_icon,
    methodology_color = EXCLUDED.methodology_color,
    supports_sprints = EXCLUDED.supports_sprints,
    supports_kanban = EXCLUDED.supports_kanban,
    supports_gantt = EXCLUDED.supports_gantt,
    supports_stages = EXCLUDED.supports_stages,
    is_active = EXCLUDED.is_active,
    is_default = EXCLUDED.is_default,
    is_deleted = EXCLUDED.is_deleted,
    updated_at = NOW();

-- Methodology 3: Kanban (Agile)
INSERT INTO methodologies (
    methodology_code,
    methodology_name,
    methodology_description,
    methodology_category,
    methodology_icon,
    methodology_color,
    supports_sprints,
    supports_kanban,
    supports_gantt,
    supports_stages,
    is_active,
    is_default,
    is_deleted
)
VALUES (
    'kanban',
    'Kanban',
    'Visual workflow management system focused on continuous delivery. Emphasizes workflow visualization, limiting work in progress, and optimizing flow.',
    'agile',
    'columns',
    '#7C3AED',
    false,
    true,
    false,
    false,
    true,
    false,
    false
)
ON CONFLICT (methodology_code) DO UPDATE SET
    methodology_name = EXCLUDED.methodology_name,
    methodology_description = EXCLUDED.methodology_description,
    methodology_category = EXCLUDED.methodology_category,
    methodology_icon = EXCLUDED.methodology_icon,
    methodology_color = EXCLUDED.methodology_color,
    supports_sprints = EXCLUDED.supports_sprints,
    supports_kanban = EXCLUDED.supports_kanban,
    supports_gantt = EXCLUDED.supports_gantt,
    supports_stages = EXCLUDED.supports_stages,
    is_active = EXCLUDED.is_active,
    is_default = EXCLUDED.is_default,
    is_deleted = EXCLUDED.is_deleted,
    updated_at = NOW();

-- Methodology 4: Agile Hybrid
INSERT INTO methodologies (
    methodology_code,
    methodology_name,
    methodology_description,
    methodology_category,
    methodology_icon,
    methodology_color,
    supports_sprints,
    supports_kanban,
    supports_gantt,
    supports_stages,
    is_active,
    is_default,
    is_deleted
)
VALUES (
    'agile_hybrid',
    'Agile Hybrid',
    'Flexible agile approach combining elements from multiple methodologies. Allows customization of processes, ceremonies, and workflows to fit project needs.',
    'hybrid',
    'layers',
    '#DC2626',
    true,
    true,
    true,
    true,
    true,
    false,
    false
)
ON CONFLICT (methodology_code) DO UPDATE SET
    methodology_name = EXCLUDED.methodology_name,
    methodology_description = EXCLUDED.methodology_description,
    methodology_category = EXCLUDED.methodology_category,
    methodology_icon = EXCLUDED.methodology_icon,
    methodology_color = EXCLUDED.methodology_color,
    supports_sprints = EXCLUDED.supports_sprints,
    supports_kanban = EXCLUDED.supports_kanban,
    supports_gantt = EXCLUDED.supports_gantt,
    supports_stages = EXCLUDED.supports_stages,
    is_active = EXCLUDED.is_active,
    is_default = EXCLUDED.is_default,
    is_deleted = EXCLUDED.is_deleted,
    updated_at = NOW();

-- Methodology 5: Custom
INSERT INTO methodologies (
    methodology_code,
    methodology_name,
    methodology_description,
    methodology_category,
    methodology_icon,
    methodology_color,
    supports_sprints,
    supports_kanban,
    supports_gantt,
    supports_stages,
    is_active,
    is_default,
    is_deleted
)
VALUES (
    'custom',
    'Custom',
    'Custom project management methodology. Define your own processes, workflows, and practices tailored to your organization.',
    'custom',
    'settings',
    '#6B7280',
    true,
    true,
    true,
    true,
    true,
    false,
    false
)
ON CONFLICT (methodology_code) DO UPDATE SET
    methodology_name = EXCLUDED.methodology_name,
    methodology_description = EXCLUDED.methodology_description,
    methodology_category = EXCLUDED.methodology_category,
    methodology_icon = EXCLUDED.methodology_icon,
    methodology_color = EXCLUDED.methodology_color,
    supports_sprints = EXCLUDED.supports_sprints,
    supports_kanban = EXCLUDED.supports_kanban,
    supports_gantt = EXCLUDED.supports_gantt,
    supports_stages = EXCLUDED.supports_stages,
    is_active = EXCLUDED.is_active,
    is_default = EXCLUDED.is_default,
    is_deleted = EXCLUDED.is_deleted,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Methodologies seeded successfully';
    RAISE NOTICE '';
END $$;

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_types_count INTEGER;
    v_statuses_count INTEGER;
    v_methodologies_count INTEGER;
BEGIN
    -- Count project types
    SELECT COUNT(*)
    INTO v_types_count
    FROM project_types
    WHERE is_deleted = FALSE AND is_active = TRUE;

    -- Count project statuses
    SELECT COUNT(*)
    INTO v_statuses_count
    FROM project_statuses
    WHERE is_deleted = FALSE AND is_active = TRUE;

    -- Count methodologies
    SELECT COUNT(*)
    INTO v_methodologies_count
    FROM methodologies
    WHERE is_deleted = FALSE AND is_active = TRUE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Dropdown Lookup Data Seed Complete';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Project Types:      %', v_types_count;
    RAISE NOTICE 'Project Statuses:   %', v_statuses_count;
    RAISE NOTICE 'Methodologies:      %', v_methodologies_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. PMO Admins can manage these records via PMO Admin interface';
    RAISE NOTICE '2. Verify dropdowns display data correctly in ProjectsCreate page';
    RAISE NOTICE '3. Test CRUD operations for Project Types and Project Statuses';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================
