-- ============================================================================
-- v1564: Reminder Lead Times page — menu catalogue rows, grants, placement and field help
--        (v1352 Slice 1, 1.3a / D7). Platform + Simulator.
-- PRD:  projectprd/v1352_background_jobs_PRD.md     Plan: projectplan/v1352_background_jobs_plan.md
--
-- Catalogue (rule 75 step 2), same convention as the Timesheet Settings leaves (v1173c / v1173e):
--   pmo-admin-reminder-lead-times   /platform/pmo-admin/reminder-lead-times   under pmo-cat-admin
--   sim_pmo_reminder_lead_times     /simulator/pmo/reminder-lead-times        under sim_pmo_cat_admin
-- Grants: PMO Admin, System Admin, Account Owner (the RPCs only let PMO Admins / the account owner save).
-- Placement (rule 75 step 3): both parents are placed in the 'organisation' section for the PMO
-- placement keys (v1459 / v1454) and carry their pages as a sub-menu, so the new leaves are covered by
-- their parent; default_section_code = 'organisation' is the safety net.
-- Field help (rule 76): public.reminder_lead_time_settings.lead_days + the Simulator alias.
-- Prerequisites: v1562, v727 (pmo-cat-admin), v909 (sim_pmo_cat_admin), v1449 (menu sections),
-- v1490 (field_help). Idempotent.
-- ============================================================================

-- ── 1. Platform leaf ─────────────────────────────────────────────────────────
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'pmo-admin-reminder-lead-times', 'Reminder Lead Times',
       'How many days before a review, due date or sign-off people get their reminder',
       '/platform/pmo-admin/reminder-lead-times',
       (SELECT id FROM public.menu_items WHERE menu_code = 'pmo-cat-admin' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 99, 'universal', 'bell', TRUE, TRUE, NOW(), NOW()
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_icon = EXCLUDED.menu_icon,
  sort_order = EXCLUDED.sort_order,
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- ── 2. Simulator leaf ────────────────────────────────────────────────────────
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'sim_pmo_reminder_lead_times', 'Reminder Lead Times',
       'How many days before a review, due date or sign-off people get their reminder (practice projects)',
       '/simulator/pmo/reminder-lead-times',
       (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pmo_cat_admin' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 99, 'universal', 'bell', TRUE, TRUE, NOW(), NOW()
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_icon = EXCLUDED.menu_icon,
  sort_order = EXCLUDED.sort_order,
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- ── 3. Grants ────────────────────────────────────────────────────────────────
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code IN ('pmo-admin-reminder-lead-times', 'sim_pmo_reminder_lead_times')
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN ('pmo_admin', 'system_admin', 'account_owner')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- ── 4. Placement safety net (rule 75) ────────────────────────────────────────
UPDATE public.menu_items
   SET default_section_code = 'organisation'
 WHERE menu_code IN ('pmo-admin-reminder-lead-times', 'sim_pmo_reminder_lead_times')
   AND default_section_code IS DISTINCT FROM 'organisation';

-- ── 5. Field help (rule 76; examples follow rule 77) ─────────────────────────
INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.reminder_lead_time_settings.lead_days', 'Lead time (days)',
   'How many days before the date people get their reminder for this kind of item. Leave it empty to use the default shown beside it. A second reminder follows once if the date passes.',
   '- 3 (a reminder three days before a risk review)
- 0 (a reminder on the day itself)',
   'Whole days, 0 to 365.',
   'Reminders appear in the bell. Email comes once a day as a digest, which people can switch off in Notification Preferences.',
   'background_jobs')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title,
  purpose = EXCLUDED.purpose,
  examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes,
  extra_notes = EXCLUDED.extra_notes,
  module_code = EXCLUDED.module_code,
  is_active = TRUE;

-- Simulator key reads the Platform help.
INSERT INTO public.field_help_aliases (alias_key, help_key)
VALUES
  ('sim.reminder_lead_time_settings.lead_days', 'public.reminder_lead_time_settings.lead_days')
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;

-- ── Check ────────────────────────────────────────────────────────────────────
SELECT mi.menu_code, mi.route_path, p.menu_code AS parent, mi.default_section_code,
       (SELECT count(*) FROM public.role_menu_items rmi WHERE rmi.menu_item_id = mi.id AND rmi.is_active) AS grants
  FROM public.menu_items mi
  LEFT JOIN public.menu_items p ON p.id = mi.parent_menu_id
 WHERE mi.menu_code IN ('pmo-admin-reminder-lead-times', 'sim_pmo_reminder_lead_times')
 ORDER BY mi.menu_code;
