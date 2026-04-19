-- ================================================
-- File: v482_change_log_menu_items.sql
-- Description: Add Change Request Log sidebar menu item (all platform roles)
-- Version: 1.0
-- Date: 2026-04-19
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================
--
-- Purpose:
-- Inserts a "Change Request Log" sidebar menu item accessible by ALL platform
-- roles. Route: /platform/change-log
-- ================================================

-- Step 1: Insert menu item
INSERT INTO public.menu_items (
    menu_code,
    menu_label,
    menu_description,
    parent_menu_id,
    menu_level,
    sort_order,
    route_path,
    menu_icon,
    is_visible,
    is_active
)
VALUES (
    'platform_change_log',
    'Change Request Log',
    'Immutable audit trail of all Change Request (CR) lifecycle events across projects, programmes and portfolios',
    NULL,
    1,
    96,
    '/platform/change-log',
    'FileText',
    TRUE,
    TRUE
)
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label      = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    route_path      = EXCLUDED.route_path,
    menu_icon       = EXCLUDED.menu_icon,
    is_active       = EXCLUDED.is_active,
    updated_at      = NOW();

-- Step 2: Grant access to ALL active platform roles
INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT r.id, mi.id, TRUE, TRUE, TRUE
FROM public.roles r
CROSS JOIN public.menu_items mi
WHERE mi.menu_code = 'platform_change_log'
  AND mi.is_active = TRUE
  AND r.role_name IN (
      'System Admin',
      'PMO Admin',
      'Portfolio Manager',
      'Programme Manager',
      'Project Manager',
      'Team Manager',
      'Team Lead',
      'Team Member',
      'Project Assurance',
      'Quality Assurance',
      'Risk Manager',
      'Stakeholder',
      'Viewer',
      'Auditor',
      'Sponsor',
      'Project Sponsor',
      'Project Board Member'
  )
  AND r.is_active = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view   = TRUE,
    can_use    = TRUE,
    is_active  = TRUE,
    updated_at = NOW();

-- Verification: show what was inserted
SELECT
    r.role_name,
    mi.menu_label,
    mi.route_path,
    rmi.can_view,
    rmi.can_use
FROM public.role_menu_items rmi
JOIN public.roles r ON r.id = rmi.role_id
JOIN public.menu_items mi ON mi.id = rmi.menu_item_id
WHERE mi.menu_code = 'platform_change_log'
ORDER BY r.role_name;
