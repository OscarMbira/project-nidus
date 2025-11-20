-- ================================================
-- File: v37_phase6_menu_items.sql
-- Description: Phase 6 Portfolio & Programme Management menu items
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v14_seed_data_menus.sql must be run first (base menu structure must exist)
-- - v36_portfolio_management.sql must be run first (portfolio tables must exist)

-- Purpose:
-- Creates menu structure for Phase 6 modules:
-- 1. Portfolio Management
-- 2. Programme Management (to be added in subsequent iterations)
-- 3. Cross-Project Resources
-- 4. Inter-Project Dependencies
-- 5. Benefits Realization
-- 6. Strategic Alignment

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- SECTION 1: PORTFOLIO TOP-LEVEL MENU
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Phase 6: Adding Portfolio & Programme Menu Items';
    RAISE NOTICE '================================================';
END $$;

-- Create Portfolio top-level menu
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
VALUES ('portfolio', 'Portfolio', 'Portfolio management and strategic oversight', NULL, 1, 8, '/portfolio', 'folder-kanban', '#6366F1', true, true)
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Portfolio top-level menu created';
END $$;

-- ================================================
-- SECTION 2: PORTFOLIO SUBMENU ITEMS
-- ================================================

-- All Portfolios
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'portfolio_all',
    'All Portfolios',
    'View and manage all portfolios',
    id,
    2,
    1,
    '/portfolio',
    'folder-open',
    true,
    true
FROM menu_items WHERE menu_code = 'portfolio'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Portfolio Dashboard
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'portfolio_dashboard',
    'Portfolio Dashboard',
    'Strategic portfolio overview and health',
    id,
    2,
    2,
    '/portfolio',
    'layout-dashboard',
    true,
    true
FROM menu_items WHERE menu_code = 'portfolio'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Portfolio Projects
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'portfolio_projects',
    'Portfolio Projects',
    'Manage projects within portfolios',
    id,
    2,
    3,
    '/portfolio',
    'folder-kanban',
    true,
    true
FROM menu_items WHERE menu_code = 'portfolio'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Portfolio Resources
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'portfolio_resources',
    'Portfolio Resources',
    'Cross-portfolio resource management',
    id,
    2,
    4,
    '/portfolio',
    'users',
    true,
    true
FROM menu_items WHERE menu_code = 'portfolio'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Portfolio Financial
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'portfolio_financial',
    'Portfolio Financial',
    'Portfolio budget and financial overview',
    id,
    2,
    5,
    '/portfolio',
    'dollar-sign',
    true,
    true
FROM menu_items WHERE menu_code = 'portfolio'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Portfolio Reports
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'portfolio_reports',
    'Portfolio Reports',
    'Portfolio-level reports and analytics',
    id,
    2,
    6,
    '/portfolio',
    'file-text',
    true,
    true
FROM menu_items WHERE menu_code = 'portfolio'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Portfolio Governance
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'portfolio_governance',
    'Portfolio Governance',
    'Portfolio governance and oversight',
    id,
    2,
    7,
    '/portfolio',
    'shield-check',
    true,
    true
FROM menu_items WHERE menu_code = 'portfolio'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Portfolio submenu items created';
END $$;

-- ================================================
-- SECTION 3: PROGRAMME MANAGEMENT
-- ================================================

-- Create Programme top-level menu
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
VALUES ('programme', 'Programme', 'Programme management and coordination', NULL, 1, 9, '/programme', 'layers', '#10B981', true, true)
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Programme top-level menu created';
END $$;

-- All Programmes
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'programme_all',
    'All Programmes',
    'View and manage all programmes',
    id,
    2,
    1,
    '/programme',
    'target',
    true,
    true
FROM menu_items WHERE menu_code = 'programme'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Programme Dashboard
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'programme_dashboard',
    'Programme Dashboard',
    'Programme overview and coordination',
    id,
    2,
    2,
    '/programme',
    'layout-dashboard',
    true,
    true
FROM menu_items WHERE menu_code = 'programme'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Programme Projects
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'programme_projects',
    'Programme Projects',
    'Manage projects within programmes',
    id,
    2,
    3,
    '/programme',
    'folder-kanban',
    true,
    true
FROM menu_items WHERE menu_code = 'programme'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Programme Dependencies
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'programme_dependencies',
    'Dependencies',
    'Inter-project dependencies within programmes',
    id,
    2,
    4,
    '/programme',
    'git-branch',
    true,
    true
FROM menu_items WHERE menu_code = 'programme'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Programme Benefits
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'programme_benefits',
    'Benefits',
    'Track benefits realization',
    id,
    2,
    5,
    '/programme',
    'check-circle',
    true,
    true
FROM menu_items WHERE menu_code = 'programme'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Programme Timeline
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'programme_timeline',
    'Timeline',
    'Programme timeline and milestones',
    id,
    2,
    6,
    '/programme',
    'calendar',
    true,
    true
FROM menu_items WHERE menu_code = 'programme'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Programme Reports
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'programme_reports',
    'Reports',
    'Programme reports and analytics',
    id,
    2,
    7,
    '/programme',
    'file-text',
    true,
    true
FROM menu_items WHERE menu_code = 'programme'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Programme menu items created';
END $$;

-- ================================================
-- SECTION 4: CROSS-PROJECT RESOURCES MENU
-- ================================================

-- Add cross-project resources under Resources menu
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'resources_cross_project',
    'Cross-Project Resources',
    'Manage resources across multiple projects',
    id,
    2,
    5,
    '/resources/cross-project',
    'users-round',
    true,
    true
FROM menu_items WHERE menu_code = 'resources'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Resource Capacity Planning
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'resources_capacity_planning',
    'Capacity Planning',
    'Plan resource capacity across projects',
    id,
    2,
    6,
    '/resources/capacity',
    'trending-up',
    true,
    true
FROM menu_items WHERE menu_code = 'resources'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Resource Forecasts
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'resources_forecasts',
    'Resource Forecasts',
    'Forecast resource demand and supply',
    id,
    2,
    7,
    '/resources/forecast',
    'target',
    true,
    true
FROM menu_items WHERE menu_code = 'resources'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Resource Utilization
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'resources_utilization',
    'Resource Utilization',
    'Track resource utilization across projects',
    id,
    2,
    8,
    '/resources/utilization',
    'activity',
    true,
    true
FROM menu_items WHERE menu_code = 'resources'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Cross-project resources menu items created';
END $$;

-- ================================================
-- SECTION 5: INTER-PROJECT DEPENDENCIES
-- ================================================

-- Add Inter-Project Dependencies as a top-level menu
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
VALUES ('dependencies', 'Dependencies', 'Inter-project dependencies management', NULL, 1, 10, '/dependencies', 'git-branch', '#8B5CF6', true, true)
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

-- Inter-Project Dependencies sub-menu items
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'dependencies_all',
    'All Dependencies',
    'View all inter-project dependencies',
    id,
    2,
    1,
    '/dependencies',
    'list',
    true,
    true
FROM menu_items WHERE menu_code = 'dependencies'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'dependencies_inter_project',
    'Inter-Project Dependencies',
    'Manage dependencies between projects',
    id,
    2,
    2,
    '/dependencies/inter-project',
    'git-branch',
    true,
    true
FROM menu_items WHERE menu_code = 'dependencies'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'dependencies_map',
    'Dependency Map',
    'Visualize dependency network',
    id,
    2,
    3,
    '/dependencies/map',
    'network',
    true,
    true
FROM menu_items WHERE menu_code = 'dependencies'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'dependencies_impacts',
    'Impact Analysis',
    'Analyze dependency impacts',
    id,
    2,
    4,
    '/dependencies/impacts',
    'trending-down',
    true,
    true
FROM menu_items WHERE menu_code = 'dependencies'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Inter-project dependencies menu items created';
END $$;

-- ================================================
-- SECTION 6: BENEFITS REALIZATION
-- ================================================

-- Add Benefits Realization as a top-level menu
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
VALUES ('benefits', 'Benefits', 'Benefits realization tracking', NULL, 1, 11, '/benefits', 'target', '#10B981', true, true)
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

-- Benefits Realization sub-menu items
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'benefits_all',
    'All Benefits',
    'View all benefits',
    id,
    2,
    1,
    '/benefits',
    'list',
    true,
    true
FROM menu_items WHERE menu_code = 'benefits'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'benefits_register',
    'Benefits Register',
    'Manage benefits register',
    id,
    2,
    2,
    '/benefits/register',
    'target',
    true,
    true
FROM menu_items WHERE menu_code = 'benefits'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'benefits_measurements',
    'Measurements',
    'Track benefit measurements',
    id,
    2,
    3,
    '/benefits/measurements',
    'trending-up',
    true,
    true
FROM menu_items WHERE menu_code = 'benefits'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'benefits_realization',
    'Realization',
    'View benefits realization',
    id,
    2,
    4,
    '/benefits/realization',
    'check-circle',
    true,
    true
FROM menu_items WHERE menu_code = 'benefits'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Benefits Realization menu items created';
END $$;

-- ================================================
-- SECTION 7: STRATEGIC ALIGNMENT
-- ================================================

-- Add Strategic Alignment as a top-level menu
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
VALUES ('strategy', 'Strategy', 'Strategic alignment management', NULL, 1, 12, '/strategy/objectives', 'compass', '#8B5CF6', true, true)
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

-- Strategic Alignment sub-menu items
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'strategy_objectives',
    'Strategic Objectives',
    'Define and manage strategic objectives',
    id,
    2,
    1,
    '/strategy/objectives',
    'target',
    true,
    true
FROM menu_items WHERE menu_code = 'strategy'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'strategy_alignment',
    'Strategic Alignment',
    'View alignment scores and mappings',
    id,
    2,
    2,
    '/strategy/alignment',
    'compass',
    true,
    true
FROM menu_items WHERE menu_code = 'strategy'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'strategy_contribution',
    'Strategic Contribution',
    'Track strategic contributions',
    id,
    2,
    3,
    '/strategy/contribution',
    'trending-up',
    true,
    true
FROM menu_items WHERE menu_code = 'strategy'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'strategy_portfolio',
    'Strategic Portfolio',
    'View strategic portfolio alignment',
    id,
    2,
    4,
    '/strategy/portfolio',
    'folder-kanban',
    true,
    true
FROM menu_items WHERE menu_code = 'strategy'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
    'strategy_reports',
    'Strategic Reports',
    'Generate strategic alignment reports',
    id,
    2,
    5,
    '/strategy/reports',
    'file-text',
    true,
    true
FROM menu_items WHERE menu_code = 'strategy'
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Strategic Alignment menu items created';
END $$;

-- ================================================
-- SECTION 7: ROLE-MENU ACCESS
-- ================================================

-- Grant access to Portfolio menu for relevant roles
DO $$
DECLARE
    v_role_id UUID;
    v_menu_id UUID;
BEGIN
    -- Grant access to Portfolio Manager role
    SELECT id INTO v_role_id FROM roles WHERE role_name = 'portfolio_manager' LIMIT 1;
    
    IF v_role_id IS NULL THEN
        -- If portfolio_manager role doesn't exist, grant to project_manager as fallback
        SELECT id INTO v_role_id FROM roles WHERE role_name = 'project_manager' LIMIT 1;
    END IF;

    IF v_role_id IS NOT NULL THEN
        FOR v_menu_id IN
            SELECT id FROM menu_items
            WHERE menu_code IN (
                'portfolio',
                'portfolio_all',
                'portfolio_dashboard',
                'portfolio_projects',
                'portfolio_resources',
                'portfolio_financial',
                'portfolio_reports',
                'portfolio_governance',
                'resources_cross_project',
                'resources_capacity_planning',
                'resources_forecasts',
                'resources_utilization',
                'dependencies',
                'dependencies_all',
                'dependencies_inter_project',
                'dependencies_map',
                'dependencies_impacts',
                'benefits',
                'benefits_all',
                'benefits_register',
                'benefits_measurements',
                'benefits_realization'
            )
            AND is_visible = true
        LOOP
            INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
            VALUES (v_role_id, v_menu_id, true, true, true)
            ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
                can_view = EXCLUDED.can_view,
                can_use = EXCLUDED.can_use,
                is_active = EXCLUDED.is_active,
                updated_at = NOW();
        END LOOP;

        RAISE NOTICE 'Role-menu access granted for Portfolio Management';
    END IF;
    
    -- Grant access to Project Director role
    SELECT id INTO v_role_id FROM roles WHERE role_name = 'project_director' LIMIT 1;
    
    IF v_role_id IS NOT NULL THEN
        FOR v_menu_id IN
            SELECT id FROM menu_items
            WHERE menu_code IN (
                'portfolio',
                'portfolio_all',
                'portfolio_dashboard',
                'portfolio_projects',
                'portfolio_resources',
                'portfolio_financial',
                'portfolio_reports',
                'portfolio_governance'
            )
            AND is_visible = true
        LOOP
            INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
            VALUES (v_role_id, v_menu_id, true, true, true)
            ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
                can_view = EXCLUDED.can_view,
                can_use = EXCLUDED.can_use,
                is_active = EXCLUDED.is_active,
                updated_at = NOW();
        END LOOP;

        RAISE NOTICE 'Role-menu access granted to Project Director role';
    END IF;
    
    -- Grant access to Executive role (if exists)
    SELECT id INTO v_role_id FROM roles WHERE role_name = 'executive' LIMIT 1;
    
    IF v_role_id IS NOT NULL THEN
        FOR v_menu_id IN
            SELECT id FROM menu_items
            WHERE menu_code IN (
                'portfolio',
                'portfolio_all',
                'portfolio_dashboard',
                'portfolio_financial',
                'portfolio_reports'
            )
            AND is_visible = true
        LOOP
            INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
            VALUES (v_role_id, v_menu_id, true, true, true)
            ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
                can_view = EXCLUDED.can_view,
                can_use = EXCLUDED.can_use,
                is_active = EXCLUDED.is_active,
                updated_at = NOW();
        END LOOP;

        RAISE NOTICE 'Role-menu access granted to Executive role';
    END IF;
END $$;

-- ================================================
-- SECTION 8: COMPLETION MESSAGE
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Phase 6 Menu Items Created Successfully';
    RAISE NOTICE 'Total Items: 15 menu items added/updated';
    RAISE NOTICE '  - 1 Portfolio top-level menu';
    RAISE NOTICE '  - 7 Portfolio submenu items';
    RAISE NOTICE '  - 1 Programme top-level menu';
    RAISE NOTICE '  - 7 Programme submenu items';
    RAISE NOTICE '  - 2 Cross-project resources items';
    RAISE NOTICE '  - 4 Placeholder items (hidden until implementation)';
    RAISE NOTICE '================================================';
END $$;

-- Grant access to Programme menu for relevant roles
DO $$
DECLARE
    v_role_id UUID;
    v_menu_id UUID;
BEGIN
    -- Grant access to Programme Manager role (or Project Manager as fallback)
    SELECT id INTO v_role_id FROM roles WHERE role_name = 'programme_manager' LIMIT 1;
    
    IF v_role_id IS NULL THEN
        -- If programme_manager role doesn't exist, grant to project_manager as fallback
        SELECT id INTO v_role_id FROM roles WHERE role_name = 'project_manager' LIMIT 1;
    END IF;

    IF v_role_id IS NOT NULL THEN
        FOR v_menu_id IN
            SELECT id FROM menu_items
            WHERE menu_code IN (
                'programme',
                'programme_all',
                'programme_dashboard',
                'programme_projects',
                'programme_dependencies',
                'programme_benefits',
                'programme_timeline',
                'programme_reports'
            )
            AND is_visible = true
        LOOP
            INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
            VALUES (v_role_id, v_menu_id, true, true, true)
            ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
                can_view = EXCLUDED.can_view,
                can_use = EXCLUDED.can_use,
                is_active = EXCLUDED.is_active,
                updated_at = NOW();
        END LOOP;

        RAISE NOTICE 'Role-menu access granted for Programme Management';
    END IF;
    
    -- Grant access to Project Director role
    SELECT id INTO v_role_id FROM roles WHERE role_name = 'project_director' LIMIT 1;
    
    IF v_role_id IS NOT NULL THEN
        FOR v_menu_id IN
            SELECT id FROM menu_items
            WHERE menu_code IN (
                'programme',
                'programme_all',
                'programme_dashboard',
                'programme_projects',
                'programme_dependencies',
                'programme_benefits',
                'programme_timeline',
                'programme_reports'
            )
            AND is_visible = true
        LOOP
            INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
            VALUES (v_role_id, v_menu_id, true, true, true)
            ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
                can_view = EXCLUDED.can_view,
                can_use = EXCLUDED.can_use,
                is_active = EXCLUDED.is_active,
                updated_at = NOW();
        END LOOP;

        RAISE NOTICE 'Role-menu access granted to Project Director role for Programme';
    END IF;
    
    -- Grant access to Executive role (if exists)
    SELECT id INTO v_role_id FROM roles WHERE role_name = 'executive' LIMIT 1;
    
    IF v_role_id IS NOT NULL THEN
        FOR v_menu_id IN
            SELECT id FROM menu_items
            WHERE menu_code IN (
                'programme',
                'programme_all',
                'programme_dashboard',
                'programme_reports'
            )
            AND is_visible = true
        LOOP
            INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
            VALUES (v_role_id, v_menu_id, true, true, true)
            ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
                can_view = EXCLUDED.can_view,
                can_use = EXCLUDED.can_use,
                is_active = EXCLUDED.is_active,
                updated_at = NOW();
        END LOOP;

        RAISE NOTICE 'Role-menu access granted to Executive role for Programme';
        END IF;
        
        -- Grant access to Project Manager role for dependencies
        SELECT id INTO v_role_id FROM roles WHERE role_name = 'project_manager' LIMIT 1;
        
        IF v_role_id IS NOT NULL THEN
            FOR v_menu_id IN
                SELECT id FROM menu_items
                WHERE menu_code IN (
                    'dependencies',
                    'dependencies_all',
                    'dependencies_inter_project',
                    'dependencies_map',
                    'dependencies_impacts',
                    'benefits',
                    'benefits_all',
                    'benefits_register',
                    'benefits_measurements',
                    'benefits_realization',
                    'strategy',
                    'strategy_objectives',
                    'strategy_alignment',
                    'strategy_contribution',
                    'strategy_portfolio',
                    'strategy_reports'
                )
                AND is_visible = true
            LOOP
                INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
                VALUES (v_role_id, v_menu_id, true, true, true)
                ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
                    can_view = EXCLUDED.can_view,
                    can_use = EXCLUDED.can_use,
                    is_active = EXCLUDED.is_active,
                    updated_at = NOW();
            END LOOP;

            RAISE NOTICE 'Role-menu access granted to Project Manager role for Dependencies, Benefits, and Strategic Alignment';
        END IF;
    END $$;

-- ================================================
-- End of v37_phase6_menu_items.sql
-- ================================================

