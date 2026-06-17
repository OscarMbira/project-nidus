-- =============================================================================
-- v725: Remove duplicate People & Resources menu rows
-- Keeps v671 canonical pmo-people-* codes; hides plat_people_* and platform_teams_* duplicates
-- =============================================================================

UPDATE public.menu_items
SET is_visible = FALSE,
    is_deleted = TRUE,
    updated_at = NOW()
WHERE menu_code IN (
  'plat_people_mgr_assign',
  'plat_people_appt_tracker',
  'plat_people_assign_settings',
  'plat_people_inv_tracker',
  'plat_people_send_inv',
  'plat_people_assign_roles',
  'plat_people_add_users',
  'plat_people_resource_dir',
  'plat_people_team_capacity',
  'platform_teams_manager_assignments',
  'platform_teams_assignment_settings',
  'platform_teams_assign_roles',
  'platform_teams_add_users',
  'platform_teams_send_invites',
  'platform_teams_invitation_tracker',
  'platform_teams_appointment_tracker',
  'platform_teams_directory',
  'platform_teams_workload',
  'pmo_people_assign_roles',
  'pmo_people_add_users',
  'pmo_manager_assignments',
  'pmo_assign_managers',
  'pmo_assignment_settings',
  'pmo_admin_appointment_tracker'
)
AND COALESCE(is_deleted, FALSE) = FALSE;

INSERT INTO public.menu_items (
  id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp,
       (SELECT id FROM public.menu_items WHERE menu_code = 'pmo-cat-teams' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('pmo-people-manager-assignments',  'Manager Assignments',      '/platform/pmo-admin/manager-assignments',         10, 'users'),
  ('pmo-people-appointment-tracker',   'Appointment Tracker',      '/platform/pmo-admin/appointments',                20, 'clipboard-check'),
  ('pmo-people-assignment-settings', 'Assignment Settings',      '/platform/pmo-admin/manager-assignment-settings', 30, 'settings-2'),
  ('pmo-people-invitation-tracker',  'Invitation Tracker',       '/platform/admin/invitation-tracker',              40, 'mail-check'),
  ('pmo-people-send-invites',        'Send Invitations',         '/platform/admin/send-role-invites',               50, 'send'),
  ('pmo-people-assign-roles',        'Assign Roles',             '/platform/admin/assign-roles-to-projects',        60, 'shield'),
  ('pmo-people-add-users',           'Add Users',                '/platform/project-members',                       70, 'users'),
  ('pmo-people-resource-directory',  'Resource Directory',       '/platform/teams/directory',                       80, 'users'),
  ('pmo-people-team-capacity',       'Team Capacity',            '/platform/teams/capacity',                        90, 'bar-chart-3')
) AS v(mc, ml, rp, so, ic)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_icon = EXCLUDED.menu_icon,
  sort_order = EXCLUDED.sort_order,
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.roles r
CROSS JOIN public.menu_items mi
WHERE r.role_name IN ('pmo_admin', 'system_admin', 'account_owner')
  AND mi.menu_code LIKE 'pmo-people-%'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v725_dedupe_people_resources_menus.sql applied'; END $$;
