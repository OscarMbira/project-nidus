-- ============================================================================
-- v1289: Communications section in the sidebar (Platform + Simulator)
-- ============================================================================
-- Problem: the Comms Hub pages (/platform/comms/*, /simulator/comms/*) are built and routed in
-- both apps, but no PMO, Project Manager, Team Manager, Team Lead or Team Member could see them:
--   * v966a deleted the old comms menu generations (comms_messages, pmo_comms_*, pm_comms_*);
--   * v966al moved Meetings under Governance;
--   * what was left (v410 'comms' rows, v681 plat_grp_tm_comms / plat_tm_messages /
--     plat_tm_direct_msgs) sat outside the Core PM taxonomy, so the sidebar either dropped it or
--     filed it under "Email & Notifications". plat_tm_direct_msgs also pointed at a route that does
--     not exist (/platform/comms/direct-messages).
--
-- Fix (one section, same row in every layout — the sidebar code treats plat_pm_communications /
-- sim_pm_communications as a top-level category for PM, Team and PMO layouts, v1289):
--   Platform  Communications
--               Comms Hub · Channel Messages · Direct Messages · Meeting Summaries · Pending AI Reviews
--             (Meetings stays under Governance → Meetings, as in the menu taxonomy.)
--   Simulator Practice Communications
--               Comms Hub · Channel Messages · Direct Messages · Meetings · Meeting Summaries ·
--               Pending AI Reviews (the Simulator has no Governance → Meetings item)
--   Superseded comms rows are deactivated (not deleted), so nothing shows twice.
--   Grants: PMO Admin / Account Owner / Org & System Admin, Project Manager, Team Manager,
--   Team Lead, Team Member. Pending AI Reviews keeps v410's can_use = FALSE for Team Members
--   (the page itself does not check this flag yet).
--
-- Idempotent; safe to re-run. Rollback: SQL/v1289_communications_menu_section_rollback.sql.
-- No new tables (no database_tables / planner wall changes needed).
-- ============================================================================

-- ── 1. Platform section + pages ─────────────────────────────────────────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
VALUES (
  gen_random_uuid(), 'plat_pm_communications', 'Communications',
  'Team messaging, direct messages, meeting summaries and the AI review queue for meeting follow-ups.',
  NULL, NULL, 1, 117, 'universal', 'message-square', TRUE, TRUE, NOW(), NOW()
)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = NULL,
  parent_menu_id = NULL,
  menu_level = 1,
  sort_order = EXCLUDED.sort_order,
  methodology = 'universal',
  menu_icon = EXCLUDED.menu_icon,
  is_active = TRUE,
  is_visible = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), v.code, v.label, v.descr, v.route,
       (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_communications'),
       2, v.sort_order, 'universal', v.icon, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('plat_pm_comms_hub',            'Comms Hub',          'Overview of channels, messages and meetings',      '/platform/comms',                    10, 'message-square'),
  ('plat_pm_comms_messages',       'Channel Messages',   'Project and team channels',                        '/platform/comms/messages',           20, 'messages-square'),
  ('plat_pm_comms_direct',         'Direct Messages',    'One-to-one conversations',                         '/platform/comms/direct',             30, 'mail'),
  ('plat_pm_comms_summaries',      'Meeting Summaries',  'Meeting summaries and minutes',                    '/platform/comms/meetings/summaries', 40, 'file-text'),
  ('plat_pm_comms_pending_review', 'Pending AI Reviews', 'Approve risks, issues and actions found in meetings', '/platform/comms/pending-review',  50, 'bot')
) AS v(code, label, descr, route, sort_order, icon)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_level = 2,
  sort_order = EXCLUDED.sort_order,
  methodology = 'universal',
  menu_icon = EXCLUDED.menu_icon,
  is_active = TRUE,
  is_visible = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- ── 2. Simulator section + pages (existing v571 rows are reused, so their grants carry over) ──

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
VALUES (
  gen_random_uuid(), 'sim_pm_communications', 'Practice Communications',
  'Practice messaging, meetings, meeting summaries and the AI review queue.',
  NULL, NULL, 1, 85, 'universal', 'message-square', TRUE, TRUE, NOW(), NOW()
)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = NULL,
  parent_menu_id = NULL,
  menu_level = 1,
  sort_order = EXCLUDED.sort_order,
  methodology = 'universal',
  menu_icon = EXCLUDED.menu_icon,
  is_active = TRUE,
  is_visible = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), v.code, v.label, v.descr, v.route,
       (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pm_communications'),
       2, v.sort_order, 'universal', v.icon, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('sim_pm_comms_hub',            'Comms Hub',          'Overview of channels, messages and meetings',         '/simulator/comms',                    10, 'message-square'),
  ('sim_pm_comms_channels',       'Channel Messages',   'Practice project and team channels',                  '/simulator/comms/messages',           20, 'messages-square'),
  ('sim_pm_comms_direct',         'Direct Messages',    'One-to-one conversations',                            '/simulator/comms/direct',             30, 'mail'),
  ('sim_pm_comms_meetings',       'Meetings',           'Upcoming and past practice meetings',                 '/simulator/comms/meetings',           40, 'video'),
  ('sim_pm_comms_summaries',      'Meeting Summaries',  'Meeting summaries and minutes',                       '/simulator/comms/meetings/summaries', 50, 'file-text'),
  ('sim_pm_comms_pending_review', 'Pending AI Reviews', 'Approve risks, issues and actions found in meetings', '/simulator/comms/pending-review',     60, 'bot')
) AS v(code, label, descr, route, sort_order, icon)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_level = 2,
  sort_order = EXCLUDED.sort_order,
  methodology = 'universal',
  menu_icon = EXCLUDED.menu_icon,
  is_active = TRUE,
  is_visible = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- ── 3. Retire superseded comms rows (deactivated, not deleted; grants left in place) ─────────
-- "Schedule Meeting" is a create action, not a page: the Meetings page has its own Schedule button.

-- The NOTICE lists every row this run deactivated (keep it: the rollback file uses the same list).
DO $$
DECLARE
  v_codes TEXT;
BEGIN
WITH retired AS (
UPDATE public.menu_items
SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code IN (
  -- Platform: v410 hub, v568 PM section, v659/v667 PMO section, v681 Team section
  'comms', 'comms_messages', 'comms_direct', 'comms_meetings', 'comms_meetings_new',
  'comms_meeting_summaries', 'comms_pending_review',
  'pm_comms_section', 'pm_comms_hub', 'pm_comms_schedule_meeting', 'pm_comms_meetings',
  'pm_comms_summaries', 'pm_comms_direct', 'pm_comms_channels', 'pm_comms_pending_review',
  'pmo_comms_section', 'pmo_comms_messages', 'pmo_comms_direct', 'pmo_comms_meetings', 'pmo_comms_pending_ai',
  'plat_grp_tm_comms', 'plat_tm_messages', 'plat_tm_direct_msgs',
  -- Simulator: v571 section + schedule action, v659 PMO comms, v682 Team comms
  'sim_comms', 'sim_pm_comms_section', 'sim_pm_comms_schedule_meeting',
  'sim_pmo_comms_messages', 'sim_pmo_comms_direct', 'sim_pmo_comms_meetings', 'sim_pmo_comms_pending_ai',
  'sim_tm_comms'
)
AND is_active = TRUE
RETURNING menu_code
)
SELECT string_agg(menu_code, ', ' ORDER BY menu_code) INTO v_codes FROM retired;
RAISE NOTICE 'v1289: deactivated superseded comms rows: %', COALESCE(v_codes, '(none were active)');
END $$;

-- ── 4. Role grants ───────────────────────────────────────────────────────────────────────────
-- Section rows and pages, for every PMO, PM and Team role that exists. Governance → Meetings
-- (plat_tm_meetings) and its Governance section are granted too, so meetings are reachable.

WITH target_roles AS (
  SELECT id, lower(regexp_replace(trim(role_name), '[[:space:]]+', '_', 'g')) AS role_key
  FROM public.roles
  WHERE COALESCE(is_deleted, FALSE) = FALSE
    AND lower(regexp_replace(trim(role_name), '[[:space:]]+', '_', 'g')) IN (
      'pmo_admin', 'account_owner', 'org_admin', 'system_admin', 'super_admin',
      'project_manager', 'pm_project_manager',
      'team_manager', 'pm_team_manager',
      'team_lead', 'pm_team_lead',
      'team_member', 'pm_team_member'
    )
),
target_items AS (
  SELECT id, menu_code
  FROM public.menu_items
  WHERE COALESCE(is_deleted, FALSE) = FALSE
    AND is_active = TRUE
    AND menu_code IN (
      'plat_pm_communications', 'plat_pm_comms_hub', 'plat_pm_comms_messages', 'plat_pm_comms_direct',
      'plat_pm_comms_summaries', 'plat_pm_comms_pending_review',
      'plat_pm_governance', 'plat_tm_meetings',
      'sim_pm_communications', 'sim_pm_comms_hub', 'sim_pm_comms_channels', 'sim_pm_comms_direct',
      'sim_pm_comms_meetings', 'sim_pm_comms_summaries', 'sim_pm_comms_pending_review'
    )
)
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, is_deleted, created_at, updated_at)
SELECT gen_random_uuid(), r.id, m.id, TRUE,
       -- v410 rule: Team Members get can_use = FALSE on the AI review queue; everything else is usable.
       NOT (m.menu_code IN ('plat_pm_comms_pending_review', 'sim_pm_comms_pending_review')
            AND r.role_key IN ('team_member', 'pm_team_member')),
       TRUE, FALSE, NOW(), NOW()
FROM target_roles r
CROSS JOIN target_items m
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = EXCLUDED.can_use,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- ── 5. Check (read-only): which roles now see each Communications row ────────────────────────
SELECT mi.menu_code, mi.menu_label, mi.route_path, mi.is_active,
       string_agg(r.role_name, ', ' ORDER BY r.role_name) AS granted_roles
FROM public.menu_items mi
LEFT JOIN public.role_menu_items rmi
  ON rmi.menu_item_id = mi.id AND rmi.can_view = TRUE AND rmi.is_active = TRUE AND COALESCE(rmi.is_deleted, FALSE) = FALSE
LEFT JOIN public.roles r ON r.id = rmi.role_id
WHERE mi.menu_code IN (
  'plat_pm_communications', 'plat_pm_comms_hub', 'plat_pm_comms_messages', 'plat_pm_comms_direct',
  'plat_pm_comms_summaries', 'plat_pm_comms_pending_review', 'plat_tm_meetings',
  'sim_pm_communications', 'sim_pm_comms_hub', 'sim_pm_comms_channels', 'sim_pm_comms_direct',
  'sim_pm_comms_meetings', 'sim_pm_comms_summaries', 'sim_pm_comms_pending_review'
)
GROUP BY mi.menu_code, mi.menu_label, mi.route_path, mi.is_active, mi.sort_order
ORDER BY mi.menu_code;
