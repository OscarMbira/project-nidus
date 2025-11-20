-- ================================================
-- File: v36_phase5_menu_items.sql
-- Description: Phase 5 Governance & Reporting menu items
-- Version: 1.0
-- Date: 2025-01-17
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v14_seed_data_menus.sql must be run first (base menu structure must exist)
-- - v28-v35 SQL files must be run first (all Phase 5 tables must exist)

-- Purpose:
-- Creates menu structure for Phase 5 modules:
-- 1. Directing a Project (DP)
-- 2. Managing Stage Boundaries (SB)
-- 3. Closing a Project (CP)
-- 4. Change Management
-- 5. Quality Management
-- 6. Report Builder
-- 7. Analytics & Metrics
-- 8. Stakeholder Management

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- SECTION 1: GOVERNANCE TOP-LEVEL MENU
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Phase 5: Adding Governance & Reporting Menu Items';
    RAISE NOTICE '================================================';
END $$;

-- Create Governance top-level menu (if it doesn't exist)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
VALUES ('governance', 'Governance', 'Project governance and oversight', NULL, 1, 7, '/governance', 'shield-check', '#7C3AED', true, true)
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Governance top-level menu created';
END $$;

-- ================================================
-- SECTION 2: GOVERNANCE SUBMENU ITEMS
-- ================================================

-- Directing a Project
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'governance_directing',
    'Directing a Project',
    'Project board governance and oversight',
    id,
    2,
    1,
    '/projects/:projectId/structured/directing',
    'users-gear',
    true,
    true
FROM menu_items WHERE menu_code = 'governance'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Managing Stage Boundaries
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'governance_stage_boundaries',
    'Managing Stage Boundaries',
    'Stage gate management and transitions',
    id,
    2,
    2,
    '/projects/:projectId/structured/stage-boundaries',
    'door-open',
    true,
    true
FROM menu_items WHERE menu_code = 'governance'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Closing a Project
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'governance_closing',
    'Closing a Project',
    'Project closure and lessons learned',
    id,
    2,
    3,
    '/projects/:projectId/structured/closing',
    'folder-check',
    true,
    true
FROM menu_items WHERE menu_code = 'governance'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Change Management (submenu under governance)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'governance_change_management',
    'Change Management',
    'Change control and approval workflow',
    id,
    2,
    4,
    '/change-management',
    'refresh-cw',
    true,
    true
FROM menu_items WHERE menu_code = 'governance'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Change Requests
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'change_requests',
    'Change Requests',
    'View and manage change requests',
    id,
    3,
    1,
    '/change-management/requests',
    'file-edit',
    true,
    true
FROM menu_items WHERE menu_code = 'governance_change_management'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Change Board
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'change_board',
    'Change Board',
    'Change approval board dashboard',
    id,
    3,
    2,
    '/change-management/board',
    'users',
    true,
    true
FROM menu_items WHERE menu_code = 'governance_change_management'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Change Log
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'change_log',
    'Change Log',
    'Audit trail of all change activities',
    id,
    3,
    3,
    '/change-management/log',
    'history',
    true,
    true
FROM menu_items WHERE menu_code = 'governance_change_management'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Quality Management (Top-level menu)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
VALUES ('quality', 'Quality', 'Quality management and assurance', NULL, 1, 13, '/quality-management', 'shield-check', '#8B5CF6', true, true)
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

-- Quality Management submenu items
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'quality_register',
    'Quality Register',
    'Quality register and deliverables',
    id,
    2,
    1,
    '/quality-management',
    'file-text',
    true,
    true
FROM menu_items WHERE menu_code = 'quality'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'quality_reviews',
    'Quality Reviews',
    'Plan and manage quality reviews',
    id,
    2,
    2,
    '/quality-management/reviews',
    'check-circle',
    true,
    true
FROM menu_items WHERE menu_code = 'quality'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'quality_inspections',
    'Quality Inspections',
    'Record quality inspection results',
    id,
    2,
    3,
    '/quality-management/inspections',
    'search',
    true,
    true
FROM menu_items WHERE menu_code = 'quality'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'quality_reports',
    'Quality Reports',
    'Generate quality management reports',
    id,
    2,
    4,
    '/quality-management/reports',
    'file-text',
    true,
    true
FROM menu_items WHERE menu_code = 'quality'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

-- Also add Quality Management under Governance (for project-specific context)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'governance_quality_management',
    'Quality Management',
    'Quality assurance and defect tracking',
    id,
    2,
    5,
    '/quality-management',
    'badge-check',
    true,
    true
FROM menu_items WHERE menu_code = 'governance'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Governance submenu items created';
END $$;

-- ================================================
-- SECTION 3: ENHANCED REPORTING TOP-LEVEL MENU UPDATE
-- ================================================

-- Update existing Reports menu or create if doesn't exist
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
VALUES ('reports', 'Reports & Analytics', 'Reports, analytics, and insights', NULL, 1, 5, '/reports', 'chart-bar', '#EC4899', true, true)
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    updated_at = NOW();

-- ================================================
-- SECTION 4: ENHANCED REPORTING SUBMENU ITEMS
-- ================================================

-- Report Builder
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'reports_builder',
    'Report Builder',
    'Create custom reports with visual designer',
    id,
    2,
    1,
    '/reports/builder',
    'layout-dashboard',
    true,
    true
FROM menu_items WHERE menu_code = 'reports'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Analytics Dashboard
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'reports_analytics',
    'Executive Dashboard',
    'Executive analytics and KPIs overview',
    id,
    2,
    2,
    '/analytics',
    'chart-line',
    true,
    true
FROM menu_items WHERE menu_code = 'reports'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- KPI Management
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'reports_kpis',
    'KPI Management',
    'Track and manage Key Performance Indicators',
    id,
    2,
    3,
    '/analytics/kpis',
    'target',
    true,
    true
FROM menu_items WHERE menu_code = 'reports'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Project Health Analytics
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'reports_project_health',
    'Project Health',
    'Project health metrics and diagnostics',
    id,
    2,
    4,
    '/analytics/project-health',
    'heart-pulse',
    true,
    true
FROM menu_items WHERE menu_code = 'reports'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Portfolio Analytics
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'reports_portfolio_analytics',
    'Portfolio Analytics',
    'Portfolio-level analytics and insights',
    id,
    2,
    5,
    '/analytics/portfolio',
    'trending-up',
    true,
    true
FROM menu_items WHERE menu_code = 'reports'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Analytics Trends
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'reports_trends',
    'Trends Analysis',
    'Time-series trends and forecasting',
    id,
    2,
    6,
    '/analytics/trends',
    'trending-up',
    true,
    true
FROM menu_items WHERE menu_code = 'reports'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Scheduled Reports
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'reports_scheduled',
    'Scheduled Reports',
    'Manage automated report schedules',
    id,
    2,
    4,
    '/reports/scheduled',
    'clock',
    true,
    true
FROM menu_items WHERE menu_code = 'reports'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Report Templates
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'reports_templates',
    'Report Templates',
    'Browse and manage report templates',
    id,
    2,
    5,
    '/reports/templates',
    'clipboard-list',
    true,
    true
FROM menu_items WHERE menu_code = 'reports'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Reports & Analytics submenu items created';
END $$;

-- ================================================
-- SECTION 5: STAKEHOLDER MANAGEMENT
-- ================================================

-- Stakeholder Management (Top-level menu)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
VALUES ('stakeholders', 'Stakeholders', 'Stakeholder management and engagement', NULL, 1, 14, '/stakeholders', 'users', '#10B981', true, true)
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

-- Also add Stakeholders submenu under Projects (for project-specific context)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'projects_stakeholders',
    'Stakeholder Management',
    'Stakeholder register, analysis, and engagement',
    id,
    2,
    6,
    '/stakeholders',
    'user-circle',
    true,
    true
FROM menu_items WHERE menu_code = 'projects'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Stakeholder Management menu items created';
END $$;

-- ================================================
-- SECTION 6: REGISTER TABLES IN DATABASE_TABLES
-- ================================================

-- Register governance menu in database_tables
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('project_boards', 'Project boards for governance oversight', false, true),
  ('board_members', 'Project board member assignments', false, true),
  ('board_meetings', 'Project board meeting records', false, true),
  ('board_meeting_attendees', 'Board meeting attendance tracking', false, true),
  ('project_authorizations', 'Project authorization records from board', false, true),
  ('ad_hoc_direction', 'Ad hoc direction requests and responses', false, true),
  ('board_decisions', 'Board decisions and resolutions', false, true),
  ('end_stage_reports', 'End of stage assessment reports', false, true),
  ('exception_plans', 'Exception plans for tolerance breaches', false, true),
  ('next_stage_plans', 'Plans for upcoming project stages', false, true),
  ('stage_boundary_approvals', 'Stage gate approval records', false, true),
  ('project_closures', 'Project closure documentation', false, true),
  ('end_project_reports', 'End of project assessment reports', false, true),
  ('lessons_learned', 'Lessons learned from projects', false, true),
  ('follow_on_actions', 'Post-project follow-on actions', false, true),
  ('project_handover', 'Project handover documentation', false, true),
  ('closure_approvals', 'Project closure approval records', false, true),
  ('change_board', 'Change control boards', false, true),
  ('change_board_members', 'Change board member assignments', false, true),
  ('change_requests', 'Change request submissions', false, true),
  ('change_assessments', 'Change impact assessments', false, true),
  ('change_approvals', 'Change approval decisions', false, true),
  ('change_implementations', 'Change implementation tracking', false, true),
  ('change_log', 'Change management audit log', false, true),
  ('quality_register', 'Quality register for tracking', false, true),
  ('quality_criteria', 'Quality acceptance criteria', false, true),
  ('quality_reviews', 'Quality review records', false, true),
  ('quality_defects', 'Quality defect tracking', false, true),
  ('quality_metrics', 'Quality measurement metrics', false, true),
  ('quality_audits', 'Quality audit records', false, true),
  ('quality_improvements', 'Quality improvement actions', false, true),
  ('report_categories', 'Report category definitions', false, true),
  ('report_templates', 'Reusable report templates', false, true),
  ('report_definitions', 'Custom report definitions', false, true),
  ('report_schedules', 'Report scheduling configuration', false, true),
  ('report_executions', 'Report execution history', false, true),
  ('report_shares', 'Report sharing permissions', false, true),
  ('report_favorites', 'User favorite reports', false, true),
  ('kpi_definitions', 'Key performance indicator definitions', false, true),
  ('kpi_targets', 'KPI target values and thresholds', false, true),
  ('kpi_actuals', 'Actual KPI measurements', false, true),
  ('kpi_alerts', 'KPI threshold alert configuration', false, true),
  ('analytics_snapshots', 'Point-in-time analytics snapshots', false, true),
  ('dashboard_configurations', 'Custom dashboard layouts', false, true),
  ('dashboard_widgets', 'Dashboard widget configurations', false, true),
  ('stakeholders', 'Project stakeholder register', false, true),
  ('stakeholder_analysis', 'Stakeholder power/interest analysis', false, true),
  ('stakeholder_engagement', 'Stakeholder engagement planning', false, true),
  ('communication_plans', 'Stakeholder communication plans', false, true),
  ('stakeholder_communications', 'Communication execution log', false, true),
  ('stakeholder_feedback', 'Stakeholder feedback tracking', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Phase 5 tables registered in database_tables';
END $$;

-- ================================================
-- SECTION 7: ROLE-MENU ACCESS (OPTIONAL)
-- ================================================

-- Grant access to all roles for now (can be customized later)
DO $$
DECLARE
    v_role_id UUID;
    v_menu_id UUID;
BEGIN
    -- Grant access to governance menu for Project Manager role
    SELECT id INTO v_role_id FROM roles WHERE role_name = 'project_manager' LIMIT 1;

    IF v_role_id IS NOT NULL THEN
        FOR v_menu_id IN
            SELECT id FROM menu_items
            WHERE menu_code IN (
                'governance',
                'governance_directing',
                'governance_stage_boundaries',
                'governance_closing',
                'governance_change_management',
                'governance_quality_management',
                'quality',
                'quality_register',
                'quality_reviews',
                'quality_inspections',
                'quality_reports',
                'stakeholders',
                'projects_stakeholders',
                'governance_change_management',
                'change_requests',
                'change_board',
                'change_log',
                'reports_builder',
                'reports_analytics',
                'reports_kpis',
                'reports_project_health',
                'reports_portfolio_analytics',
                'reports_trends',
                'reports_scheduled',
                'reports_templates'
            )
        LOOP
            INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
            VALUES (v_role_id, v_menu_id, true, true, true)
            ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
                can_view = EXCLUDED.can_view,
                can_use = EXCLUDED.can_use,
                is_active = EXCLUDED.is_active,
                updated_at = NOW();
        END LOOP;

        RAISE NOTICE 'Role-menu access granted to Project Manager role';
    END IF;
END $$;

-- ================================================
-- COMPLETION MESSAGE
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Phase 5 Menu Items Created Successfully';
    RAISE NOTICE 'Total Items: 20+ menu items added/updated';
    RAISE NOTICE '  - 1 Governance top-level menu';
    RAISE NOTICE '  - 5 Governance submenu items';
    RAISE NOTICE '  - 1 Quality top-level menu';
    RAISE NOTICE '  - 3 Quality submenu items';
    RAISE NOTICE '  - 1 Stakeholder top-level menu';
    RAISE NOTICE '  - 5 Reports & Analytics submenu items (including KPI Management)';
    RAISE NOTICE '  - 51+ tables registered in database_tables';
    RAISE NOTICE '================================================';
END $$;
