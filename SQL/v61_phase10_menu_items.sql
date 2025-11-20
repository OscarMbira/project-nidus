-- ================================================
-- File: v61_phase10_menu_items.sql
-- Description: Phase 10 menu items for Launch & Support
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Purpose:
-- Adds menu items for Phase 10 features:
-- - Support menu (Help Center, Contact Support, Submit Feedback, Feature Requests)
-- - Admin enhancements (Monitoring Dashboard, Feedback Analysis, Feature Requests Management)

-- ================================================
-- SUPPORT MENU (Parent)
-- ================================================

-- Insert Support parent menu if not exists
INSERT INTO menu_items (
    menu_code,
    menu_label,
    menu_description,
    parent_menu_id,
    menu_level,
    sort_order,
    route_path,
    menu_icon,
    menu_color,
    is_visible,
    is_active
)
SELECT 
    'support',
    'Support',
    'Get help and support',
    NULL,
    1,
    100,
    NULL,
    'help-circle',
    '#6366F1',
    TRUE,
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM menu_items WHERE menu_code = 'support' AND parent_menu_id IS NULL
);

-- Get Support parent menu ID
DO $$
DECLARE
    v_support_menu_id UUID;
BEGIN
    SELECT id INTO v_support_menu_id
    FROM menu_items
    WHERE menu_code = 'support' AND parent_menu_id IS NULL
    LIMIT 1;

    -- Help Center (already exists in Phase 9, update if needed)
    INSERT INTO menu_items (
        menu_code,
        menu_label,
        menu_description,
        parent_menu_id,
        menu_level,
        sort_order,
        route_path,
        menu_icon,
        menu_color,
        is_visible,
        is_active
    )
    SELECT 
        'support_help_center',
        'Help Center',
        'Browse help articles and guides',
        v_support_menu_id,
        2,
        10,
        '/help',
        'book-open',
        '#6366F1',
        TRUE,
        TRUE
    WHERE NOT EXISTS (
        SELECT 1 FROM menu_items WHERE menu_code = 'support_help_center'
    )
    ON CONFLICT DO NOTHING;

    -- Contact Support
    INSERT INTO menu_items (
        menu_code,
        menu_label,
        menu_description,
        parent_menu_id,
        menu_level,
        sort_order,
        route_path,
        menu_icon,
        menu_color,
        is_visible,
        is_active
    )
    SELECT 
        'support_contact',
        'Contact Support',
        'Get help from our support team',
        v_support_menu_id,
        2,
        20,
        '/help/contact',
        'mail',
        '#6366F1',
        TRUE,
        TRUE
    WHERE NOT EXISTS (
        SELECT 1 FROM menu_items WHERE menu_code = 'support_contact'
    )
    ON CONFLICT DO NOTHING;

    -- Submit Feedback
    INSERT INTO menu_items (
        menu_code,
        menu_label,
        menu_description,
        parent_menu_id,
        menu_level,
        sort_order,
        route_path,
        menu_icon,
        menu_color,
        is_visible,
        is_active
    )
    SELECT 
        'support_feedback',
        'Submit Feedback',
        'Share your feedback and suggestions',
        v_support_menu_id,
        2,
        30,
        '/support/feedback',
        'message-square',
        '#6366F1',
        TRUE,
        TRUE
    WHERE NOT EXISTS (
        SELECT 1 FROM menu_items WHERE menu_code = 'support_feedback'
    )
    ON CONFLICT DO NOTHING;

    -- Feature Requests
    INSERT INTO menu_items (
        menu_code,
        menu_label,
        menu_description,
        parent_menu_id,
        menu_level,
        sort_order,
        route_path,
        menu_icon,
        menu_color,
        is_visible,
        is_active
    )
    SELECT 
        'support_feature_requests',
        'Feature Requests',
        'Request new features and vote on ideas',
        v_support_menu_id,
        2,
        40,
        '/support/feature-requests',
        'lightbulb',
        '#6366F1',
        TRUE,
        TRUE
    WHERE NOT EXISTS (
        SELECT 1 FROM menu_items WHERE menu_code = 'support_feature_requests'
    )
    ON CONFLICT DO NOTHING;
END $$;

-- ================================================
-- ADMIN ENHANCEMENTS
-- ================================================

-- Get Administration parent menu ID
DO $$
DECLARE
    v_admin_menu_id UUID;
BEGIN
    SELECT id INTO v_admin_menu_id
    FROM menu_items
    WHERE menu_code = 'administration' AND parent_menu_id IS NULL
    LIMIT 1;

    -- Monitoring Dashboard (enhance existing if needed)
    INSERT INTO menu_items (
        menu_code,
        menu_label,
        menu_description,
        parent_menu_id,
        menu_level,
        sort_order,
        route_path,
        menu_icon,
        menu_color,
        is_visible,
        is_active
    )
    SELECT 
        'admin_monitoring',
        'Monitoring Dashboard',
        'System monitoring and performance metrics',
        v_admin_menu_id,
        2,
        90,
        '/admin/monitoring',
        'activity',
        '#EF4444',
        TRUE,
        TRUE
    WHERE NOT EXISTS (
        SELECT 1 FROM menu_items WHERE menu_code = 'admin_monitoring'
    )
    ON CONFLICT DO NOTHING;

    -- Feedback Analysis
    INSERT INTO menu_items (
        menu_code,
        menu_label,
        menu_description,
        parent_menu_id,
        menu_level,
        sort_order,
        route_path,
        menu_icon,
        menu_color,
        is_visible,
        is_active
    )
    SELECT 
        'admin_feedback_analysis',
        'Feedback Analysis',
        'Analyze user feedback and satisfaction',
        v_admin_menu_id,
        2,
        100,
        '/admin/feedback/analysis',
        'bar-chart-3',
        '#EF4444',
        TRUE,
        TRUE
    WHERE NOT EXISTS (
        SELECT 1 FROM menu_items WHERE menu_code = 'admin_feedback_analysis'
    )
    ON CONFLICT DO NOTHING;

    -- Feature Requests Management
    INSERT INTO menu_items (
        menu_code,
        menu_label,
        menu_description,
        parent_menu_id,
        menu_level,
        sort_order,
        route_path,
        menu_icon,
        menu_color,
        is_visible,
        is_active
    )
    SELECT 
        'admin_feature_requests',
        'Feature Requests Management',
        'Manage feature requests and roadmap',
        v_admin_menu_id,
        2,
        110,
        '/admin/feature-requests',
        'lightbulb',
        '#EF4444',
        TRUE,
        TRUE
    WHERE NOT EXISTS (
        SELECT 1 FROM menu_items WHERE menu_code = 'admin_feature_requests'
    )
    ON CONFLICT DO NOTHING;

    -- Support Tickets (if applicable)
    INSERT INTO menu_items (
        menu_code,
        menu_label,
        menu_description,
        parent_menu_id,
        menu_level,
        sort_order,
        route_path,
        menu_icon,
        menu_color,
        is_visible,
        is_active
    )
    SELECT 
        'admin_support_tickets',
        'Support Tickets',
        'Manage support tickets and requests',
        v_admin_menu_id,
        2,
        120,
        '/admin/support/tickets',
        'ticket',
        '#EF4444',
        TRUE,
        TRUE
    WHERE NOT EXISTS (
        SELECT 1 FROM menu_items WHERE menu_code = 'admin_support_tickets'
    )
    ON CONFLICT DO NOTHING;
END $$;

-- ================================================
-- ROLE-MENU ACCESS ASSIGNMENTS
-- ================================================

-- Assign Support menu items to all authenticated users
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use)
SELECT 
    r.id,
    mi.id,
    TRUE,
    TRUE
FROM roles r
CROSS JOIN menu_items mi
WHERE mi.menu_code IN (
    'support',
    'support_help_center',
    'support_contact',
    'support_feedback',
    'support_feature_requests'
)
AND r.role_name IN ('system_admin', 'project_manager', 'team_lead', 'team_member')
AND NOT EXISTS (
    SELECT 1 FROM role_menu_items rmi
    WHERE rmi.role_id = r.id AND rmi.menu_item_id = mi.id
)
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = TRUE,
    can_use = TRUE,
    updated_at = NOW();

-- Assign Admin menu items to system_admin only
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use)
SELECT 
    r.id,
    mi.id,
    TRUE,
    TRUE
FROM roles r
CROSS JOIN menu_items mi
WHERE mi.menu_code IN (
    'admin_monitoring',
    'admin_feedback_analysis',
    'admin_feature_requests',
    'admin_support_tickets'
)
AND r.role_name = 'system_admin'
AND NOT EXISTS (
    SELECT 1 FROM role_menu_items rmi
    WHERE rmi.role_id = r.id AND rmi.menu_item_id = mi.id
)
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = TRUE,
    can_use = TRUE,
    updated_at = NOW();

-- Comments
COMMENT ON TABLE menu_items IS 'Phase 10: Added Support menu and admin enhancements';

