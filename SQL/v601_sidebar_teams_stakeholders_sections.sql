-- =============================================================================
-- v601_sidebar_teams_stakeholders_sections.sql
-- Platform sidebar: split People & Stakeholders into Teams + Stakeholders sections
-- UI grouping is applied in src/hooks/useMenu.js (PMO category revamp).
-- This file adds optional DB section codes for role_menu_items parity.
-- Prerequisites: v510 (platform_people_stakeholders), v302 (stakeholders submenu)
-- =============================================================================

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
VALUES
  (
    'platform_teams',
    'Teams',
    'Team membership, assignments, and invitations',
    NULL,
    1,
    81,
    NULL,
    'users',
    TRUE,
    TRUE
  ),
  (
    'platform_stakeholders',
    'Stakeholders',
    'Stakeholder register, engagement, and communications',
    NULL,
    1,
    82,
    '/platform/stakeholders',
    'users-2',
    TRUE,
    TRUE
  )
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  sort_order = EXCLUDED.sort_order,
  route_path = EXCLUDED.route_path,
  menu_icon = EXCLUDED.menu_icon,
  is_visible = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- Legacy combined section remains for backward-compatible role grants; UI no longer groups under it.
UPDATE public.menu_items
SET
  menu_label = 'People & Stakeholders (legacy)',
  is_active = TRUE,
  updated_at = NOW()
WHERE menu_code = 'platform_people_stakeholders';

INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, mi.id, TRUE, TRUE, TRUE, FALSE
FROM public.roles r
JOIN public.menu_items mi ON mi.menu_code IN ('platform_teams', 'platform_stakeholders')
WHERE COALESCE(mi.is_active, TRUE) = TRUE
  AND r.role_name IN (
    'system_admin',
    'System Admin',
    'super_admin',
    'PMO Admin',
    'pmo_admin',
    'project_manager',
    'Project Manager',
    'team_manager',
    'team_lead',
    'Team Manager',
    'Team Lead',
    'team_member',
    'pm_team_member',
    'Team Member'
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v601_sidebar_teams_stakeholders_sections.sql applied'; END $$;
