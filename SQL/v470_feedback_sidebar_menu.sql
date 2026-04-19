-- ================================================
-- File: v470_feedback_sidebar_menu.sql
-- Description: Add Feedback menu item to Platform sidebar
-- Version: 1.0
-- Date: 2026-04-19
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================
--
-- Purpose:
-- Inserts a top-level "Feedback" sidebar menu item for the Platform system.
-- Uses menu_code 'platform_feedback' (not 'support') so the sidebar filter
-- does not suppress it.  Route: /platform/feedback
-- ================================================

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
    'platform_feedback',
    'Feedback',
    'Submit feedback, bug reports, and feature requests',
    NULL,
    1,
    95,
    '/platform/feedback',
    'message-square',
    '#6366F1',
    TRUE,
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM menu_items WHERE menu_code = 'platform_feedback'
);
