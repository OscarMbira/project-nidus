-- ============================================================================
-- v1476: My Approvals, Meeting Follow-ups, Approvals History — menus, grants, placements, tabs
-- ============================================================================
-- PRD projectprd/v1343_project_administrator_support_role_PRD.md amendment A4 (rules 70 / 75).
-- Prerequisites: v1449–v1463 (consolidated menus), v1471 (support key), v1475 (history function).
--
-- 1. Catalogue (Platform + Simulator):
--      plat_pm_my_approvals        /platform/my-approvals                       (beside My Tasks)
--      plat_pm_meeting_follow_ups  /platform/meeting-follow-ups                 (beside My Tasks)
--      plat_pm_approvals_history   /platform/approvals-history                  (beside Governance Meetings)
--      sim_pm_my_approvals / sim_pm_meeting_follow_ups / sim_pm_approvals_history
--        /simulator/practice-projects/...  (consolidated sidebar only: is_visible = FALSE)
-- 2. Grants: every role that can open My Tasks gets My Approvals and Meeting Follow-ups; every
--    role that can open Governance Meetings or Stage Gates gets Approvals History (both apps).
-- 3. Placements: for every role menu that places My Tasks / Governance Meetings, the new page
--    sits at the same place. Simulator pages: Home / Risks, Changes & Governance for every role
--    menu that already has Simulator pages.
-- 4. Tabs (v1341 slot tab strip, Platform):
--      Governance   = Stage Gates · Meetings · Approvals History   (one entry, Risks & Governance)
--      My Work      = My Tasks · Meeting Follow-ups                (inside the My Work sub-menu)
--      Messages     = Comms Hub · Channels · Direct · Meeting Summaries (inside Communications)
-- Idempotent.
-- ============================================================================

-- ── 1. Catalogue ──────────────────────────────────────────────────────────────────────
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), v.menu_code, v.label, v.description, v.route_path,
       (SELECT p.parent_menu_id FROM public.menu_items p WHERE p.menu_code = v.beside_code AND COALESCE(p.is_deleted, FALSE) = FALSE LIMIT 1),
       COALESCE((SELECT p.menu_level FROM public.menu_items p WHERE p.menu_code = v.beside_code AND COALESCE(p.is_deleted, FALSE) = FALSE LIMIT 1), 2),
       v.sort_order, 'universal', v.icon, TRUE, v.visible, NOW(), NOW()
FROM (VALUES
  ('plat_pm_my_approvals', 'My Approvals', 'Timesheet entries you flagged and documents waiting for your review or signature (v1343).',
   '/platform/my-approvals', 'plat_pm_my_tasks', 31, 'clipboard-check', TRUE),
  ('plat_pm_meeting_follow_ups', 'Meeting Follow-ups', 'Meeting action items assigned to you (v1343).',
   '/platform/meeting-follow-ups', 'plat_pm_my_tasks', 32, 'list-todo', TRUE),
  ('plat_pm_approvals_history', 'Approvals History', 'Decisions taken on this project''s records, read-only (v1343).',
   '/platform/approvals-history', 'plat_pm_gov_meetings', 95, 'history', TRUE),
  ('sim_pm_my_approvals', 'My Approvals', 'Timesheet flags and documents waiting for your review on this practice project (v1343).',
   '/simulator/practice-projects/my-approvals', NULL, 31, 'clipboard-check', FALSE),
  ('sim_pm_meeting_follow_ups', 'Meeting Follow-ups', 'Meeting action items assigned to you (v1343).',
   '/simulator/practice-projects/meeting-follow-ups', NULL, 32, 'list-todo', FALSE),
  ('sim_pm_approvals_history', 'Approvals History', 'Decisions taken on this practice project''s records, read-only (v1343).',
   '/simulator/practice-projects/approvals-history', NULL, 95, 'history', FALSE)
) AS v(menu_code, label, description, route_path, beside_code, sort_order, icon, visible)
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items m WHERE m.menu_code = v.menu_code);

UPDATE public.menu_items
SET default_section_code = CASE WHEN menu_code LIKE '%approvals_history' THEN 'risks_governance' ELSE 'home' END,
    updated_at = NOW()
WHERE menu_code IN ('plat_pm_my_approvals', 'plat_pm_meeting_follow_ups', 'plat_pm_approvals_history',
                    'sim_pm_my_approvals', 'sim_pm_meeting_follow_ups', 'sim_pm_approvals_history')
  AND default_section_code IS NULL;

-- ── 2. Grants (roles that can open the matching area) ─────────────────────────────────
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT DISTINCT ON (g.role_id, n.id) gen_random_uuid(), g.role_id, n.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items g
JOIN public.menu_items src ON src.id = g.menu_item_id
JOIN (VALUES
  ('plat_pm_my_tasks', 'plat_pm_my_approvals'), ('plat_pm_my_tasks', 'plat_pm_meeting_follow_ups'),
  ('plat_pm_my_tasks', 'sim_pm_my_approvals'), ('plat_pm_my_tasks', 'sim_pm_meeting_follow_ups'),
  ('plat_pm_gov_meetings', 'plat_pm_approvals_history'), ('plat_pm_gov_stage_gates', 'plat_pm_approvals_history'),
  ('plat_pm_gov_meetings', 'sim_pm_approvals_history'), ('plat_pm_gov_stage_gates', 'sim_pm_approvals_history')
) AS m(source_code, new_code) ON m.source_code = src.menu_code
JOIN public.menu_items n ON n.menu_code = m.new_code AND COALESCE(n.is_deleted, FALSE) = FALSE
WHERE g.can_view = TRUE AND g.is_active = TRUE AND COALESCE(g.is_deleted, FALSE) = FALSE
ORDER BY g.role_id, n.id
ON CONFLICT (role_id, menu_item_id) DO UPDATE
SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- ── 3a. Platform placements: beside My Tasks / Governance Meetings, per role menu ──────
INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order, scope)
SELECT n.id, p.placement_key, p.section_code, p.parent_menu_item_id, NULL, p.sort_order + m.offset_by, p.scope
FROM public.menu_item_placements p
JOIN public.menu_items src ON src.id = p.menu_item_id
JOIN (VALUES
  ('plat_pm_my_tasks', 'plat_pm_meeting_follow_ups', 1),
  ('plat_pm_gov_meetings', 'plat_pm_approvals_history', 1)
) AS m(source_code, new_code, offset_by) ON m.source_code = src.menu_code
JOIN public.menu_items n ON n.menu_code = m.new_code AND COALESCE(n.is_deleted, FALSE) = FALSE
WHERE p.is_active = TRUE
ON CONFLICT (menu_item_id, placement_key) DO NOTHING;

-- My Approvals: a Home page of its own (not inside the My Work sub-menu)
INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order, scope)
SELECT DISTINCT ON (p.placement_key) n.id, p.placement_key, 'home', NULL, NULL, 33, p.scope
FROM public.menu_item_placements p
JOIN public.menu_items src ON src.id = p.menu_item_id AND src.menu_code = 'plat_pm_my_tasks'
JOIN public.menu_items n ON n.menu_code = 'plat_pm_my_approvals' AND COALESCE(n.is_deleted, FALSE) = FALSE
WHERE p.is_active = TRUE
ORDER BY p.placement_key
ON CONFLICT (menu_item_id, placement_key) DO NOTHING;

-- ── 3b. Simulator placements: every role menu that already has Simulator pages ─────────
INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order, scope)
SELECT n.id, k.placement_key, v.section_code, NULL, NULL, v.sort_order, 'project'
FROM (SELECT DISTINCT p.placement_key
      FROM public.menu_item_placements p JOIN public.menu_items mi ON mi.id = p.menu_item_id
      WHERE p.is_active = TRUE AND mi.menu_code LIKE 'sim\_%') k
CROSS JOIN (VALUES
  ('sim_pm_my_approvals', 'home', 33),
  ('sim_pm_meeting_follow_ups', 'home', 34),
  ('sim_pm_approvals_history', 'risks_governance', 95)
) AS v(menu_code, section_code, sort_order)
JOIN public.menu_items n ON n.menu_code = v.menu_code AND COALESCE(n.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_item_id, placement_key) DO NOTHING;

-- ── 4. Tab strips (Platform slots) ────────────────────────────────────────────────────
INSERT INTO public.menu_slots (app, slot_key, label, section_code, sort_order)
VALUES
  ('platform', 'governance', 'Governance', 'risks_governance', 50),
  ('platform', 'my_work_items', 'My Work', 'home', 30),
  ('platform', 'messages', 'Messages', 'home', 40)
ON CONFLICT (app, slot_key) DO UPDATE SET is_active = TRUE, updated_at = NOW();

-- Governance: Stage Gates · Meetings · Approvals History (top-level members, one entry)
UPDATE public.menu_item_placements p
SET slot_key = 'governance', updated_at = NOW()
FROM public.menu_items mi
WHERE mi.id = p.menu_item_id AND p.is_active = TRUE
  AND mi.menu_code IN ('plat_pm_gov_stage_gates', 'plat_pm_gov_meetings', 'plat_pm_approvals_history')
  AND p.slot_key IS DISTINCT FROM 'governance';

-- My Work: My Tasks · Meeting Follow-ups (both inside the My Work sub-menu, v1463)
UPDATE public.menu_item_placements p
SET slot_key = 'my_work_items', updated_at = NOW()
FROM public.menu_items mi
WHERE mi.id = p.menu_item_id AND p.is_active = TRUE
  AND mi.menu_code IN ('plat_pm_my_tasks', 'plat_pm_meeting_follow_ups')
  AND p.slot_key IS DISTINCT FROM 'my_work_items';

-- Messages: the four message pages, placed inside Communications for each role menu that has it
INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order, scope)
SELECT c.id, p.placement_key, p.section_code, p.menu_item_id, 'messages', v.sort_order, p.scope
FROM public.menu_item_placements p
JOIN public.menu_items grp ON grp.id = p.menu_item_id AND grp.menu_code = 'plat_pm_communications'
CROSS JOIN (VALUES
  ('plat_pm_comms_hub', 10), ('plat_pm_comms_messages', 20), ('plat_pm_comms_direct', 30), ('plat_pm_comms_summaries', 40)
) AS v(menu_code, sort_order)
JOIN public.menu_items c ON c.menu_code = v.menu_code AND COALESCE(c.is_deleted, FALSE) = FALSE AND c.is_active = TRUE
WHERE p.is_active = TRUE
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET
  section_code = EXCLUDED.section_code, parent_menu_item_id = EXCLUDED.parent_menu_item_id,
  slot_key = 'messages', sort_order = EXCLUDED.sort_order, is_active = TRUE, updated_at = NOW();

-- Placement writes bump menu_placement_version (v1449 trigger).

-- Check: new items, grants, placements per key, slot members.
SELECT 'items' AS check_name, mi.menu_code AS detail, mi.route_path AS extra, mi.is_visible::text AS more
FROM public.menu_items mi
WHERE mi.menu_code IN ('plat_pm_my_approvals', 'plat_pm_meeting_follow_ups', 'plat_pm_approvals_history',
                       'sim_pm_my_approvals', 'sim_pm_meeting_follow_ups', 'sim_pm_approvals_history')
UNION ALL
SELECT 'slot_members', p.slot_key, p.placement_key, string_agg(mi.menu_code, ', ' ORDER BY p.sort_order)
FROM public.menu_item_placements p JOIN public.menu_items mi ON mi.id = p.menu_item_id
WHERE p.is_active = TRUE AND p.slot_key IN ('governance', 'my_work_items', 'messages') AND p.placement_key IN ('pm', 'support')
GROUP BY p.slot_key, p.placement_key
ORDER BY 1, 2, 3;
