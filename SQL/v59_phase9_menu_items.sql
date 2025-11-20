-- =====================================================================================
-- Phase 9: Polish & Optimization Module
-- Version: v59
-- Feature: Phase 9 Menu Items
-- Description: Menu items for help system, video tutorials, and user guides
-- Author: Development Team
-- Date: 2025-01-XX
-- =====================================================================================

-- Prerequisites:
-- - v01 through v58 must be run first
-- - v14_seed_data_menus.sql must be run first (menu_items table must exist)
-- - v12_seed_data_rbac.sql must be run first (roles must exist)

-- =====================================================================================
-- SECTION 1: HELP TOP-LEVEL MENU
-- =====================================================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Phase 9: Adding Help System Menu Items';
    RAISE NOTICE '================================================';
END $$;

-- Help Parent Menu (top-level)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
VALUES ('help', 'Help', 'Help center and documentation', NULL, 1, 99, '/help', 'help-circle', '#6366F1', true, true)
ON CONFLICT (menu_code) DO UPDATE SET 
    menu_label = EXCLUDED.menu_label, 
    sort_order = EXCLUDED.sort_order, 
    updated_at = NOW();

-- =====================================================================================
-- SECTION 2: HELP SUBMENU ITEMS
-- =====================================================================================

-- Help Center
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'help_center', 'Help Center', 'Browse help articles and documentation', id, 2, 1, '/help', 'book-open', true, true
FROM menu_items WHERE menu_code = 'help' AND parent_menu_id IS NULL
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Video Tutorials
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'video_tutorials', 'Video Tutorials', 'Video tutorials and walkthroughs', id, 2, 2, '/help/tutorials', 'video', true, true
FROM menu_items WHERE menu_code = 'help' AND parent_menu_id IS NULL
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- User Guides
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'user_guides', 'User Guides', 'Comprehensive user documentation', id, 2, 3, '/help/guides', 'file-text', true, true
FROM menu_items WHERE menu_code = 'help' AND parent_menu_id IS NULL
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- FAQ
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'faq', 'FAQ', 'Frequently asked questions', id, 2, 4, '/help/faq', 'message-circle', true, true
FROM menu_items WHERE menu_code = 'help' AND parent_menu_id IS NULL
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Contact Support
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'contact_support', 'Contact Support', 'Get help from support team', id, 2, 5, '/help/contact', 'mail', true, true
FROM menu_items WHERE menu_code = 'help' AND parent_menu_id IS NULL
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- =====================================================================================
-- SECTION 3: SETTINGS ENHANCEMENTS (Add to existing Settings menu)
-- =====================================================================================

-- Preferences (add to Settings if Settings menu exists)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'preferences', 'Preferences', 'User preferences and settings', id, 2, 1, '/settings/preferences', 'settings', true, true
FROM menu_items WHERE menu_code = 'settings' AND parent_menu_id IS NULL
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Accessibility Settings (add to Settings)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'accessibility_settings', 'Accessibility Settings', 'Accessibility preferences and options', id, 2, 6, '/settings/accessibility', 'eye', true, true
FROM menu_items WHERE menu_code = 'settings' AND parent_menu_id IS NULL
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Performance Settings (add to Settings - Admin only)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'performance_settings', 'Performance Settings', 'Performance optimization options', id, 2, 7, '/admin/performance', 'gauge', true, true
FROM menu_items WHERE menu_code = 'settings' AND parent_menu_id IS NULL
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Feedback (add to Settings)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'feedback', 'Feedback', 'Submit feedback and suggestions', id, 2, 8, '/settings/feedback', 'message-square', true, true
FROM menu_items WHERE menu_code = 'settings' AND parent_menu_id IS NULL
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- =====================================================================================
-- SECTION 4: ADMIN HELP MANAGEMENT MENU
-- =====================================================================================

-- Help Management (Admin only - under Administration)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'help_management', 'Help Management', 'Manage help articles and content', id, 2, 10, '/admin/help', 'book', true, true
FROM menu_items WHERE menu_code = 'administration' AND parent_menu_id IS NULL
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Performance Dashboard (Admin only - under Administration)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'performance_dashboard', 'Performance Dashboard', 'Performance metrics and monitoring', id, 2, 11, '/admin/performance', 'trending-up', true, true
FROM menu_items WHERE menu_code = 'administration' AND parent_menu_id IS NULL
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- =====================================================================================
-- SECTION 5: ROLE-BASED MENU ACCESS
-- =====================================================================================

-- Help Center - All roles
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use)
SELECT r.id, mi.id, true, true
FROM roles r
CROSS JOIN menu_items mi
WHERE mi.menu_code = 'help_center'
AND r.is_active = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = true, can_use = true, updated_at = NOW();

-- Video Tutorials - All roles
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use)
SELECT r.id, mi.id, true, true
FROM roles r
CROSS JOIN menu_items mi
WHERE mi.menu_code = 'video_tutorials'
AND r.is_active = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = true, can_use = true, updated_at = NOW();

-- User Guides - All roles
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use)
SELECT r.id, mi.id, true, true
FROM roles r
CROSS JOIN menu_items mi
WHERE mi.menu_code = 'user_guides'
AND r.is_active = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = true, can_use = true, updated_at = NOW();

-- FAQ - All roles
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use)
SELECT r.id, mi.id, true, true
FROM roles r
CROSS JOIN menu_items mi
WHERE mi.menu_code = 'faq'
AND r.is_active = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = true, can_use = true, updated_at = NOW();

-- Contact Support - All roles
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use)
SELECT r.id, mi.id, true, true
FROM roles r
CROSS JOIN menu_items mi
WHERE mi.menu_code = 'contact_support'
AND r.is_active = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = true, can_use = true, updated_at = NOW();

-- Preferences - All roles
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use)
SELECT r.id, mi.id, true, true
FROM roles r
CROSS JOIN menu_items mi
WHERE mi.menu_code = 'preferences'
AND r.is_active = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = true, can_use = true, updated_at = NOW();

-- Accessibility Settings - All roles
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use)
SELECT r.id, mi.id, true, true
FROM roles r
CROSS JOIN menu_items mi
WHERE mi.menu_code = 'accessibility_settings'
AND r.is_active = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = true, can_use = true, updated_at = NOW();

-- Feedback - All roles
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use)
SELECT r.id, mi.id, true, true
FROM roles r
CROSS JOIN menu_items mi
WHERE mi.menu_code = 'feedback'
AND r.is_active = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = true, can_use = true, updated_at = NOW();

-- Help Management - Admin only
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use)
SELECT r.id, mi.id, true, true
FROM roles r
CROSS JOIN menu_items mi
WHERE mi.menu_code = 'help_management'
AND r.role_name = 'system_admin'
AND r.is_active = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = true, can_use = true, updated_at = NOW();

-- Performance Dashboard - Admin only
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use)
SELECT r.id, mi.id, true, true
FROM roles r
CROSS JOIN menu_items mi
WHERE mi.menu_code = 'performance_dashboard'
AND r.role_name = 'system_admin'
AND r.is_active = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = true, can_use = true, updated_at = NOW();

-- Performance Settings - Admin only
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use)
SELECT r.id, mi.id, true, true
FROM roles r
CROSS JOIN menu_items mi
WHERE mi.menu_code = 'performance_settings'
AND r.role_name = 'system_admin'
AND r.is_active = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = true, can_use = true, updated_at = NOW();

-- =====================================================================================
-- COMPLETION NOTICE
-- =====================================================================================

DO $$
BEGIN
    RAISE NOTICE 'v59_phase9_menu_items.sql completed successfully';
    RAISE NOTICE 'Help system menu items created';
    RAISE NOTICE 'Settings menu enhancements added';
    RAISE NOTICE 'Admin help management menu added';
    RAISE NOTICE 'Role-based menu access configured';
END $$;

