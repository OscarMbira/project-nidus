-- ============================================================================
-- v1452: Consolidated role menus — audit query (read-only, Slice 4 / Slice 14)
-- PRD/plan: projectprd/v1341 / projectplan/v1341_consolidated_role_menus_plan.md (story 26)
--
-- Changes nothing. Run before turning any organisation's switch on, and after any menu change
-- (rule 75). Five result sets:
--   A. pages a role is granted that have no placement for that role's key, no placed ancestor and
--      no default section — they would be missing from the consolidated sidebar
--   B. shared slots with no placed member
--   C. sections with more than 12 placed entries for a key (a slot counts once); industry entries
--      group automatically (D14), so only core counts over 12 need attention
--   D. placements that point at deleted / inactive menu items
--   E. Simulator placements and routes, for scripts/check-sim-placement-routes.mjs (R8)
-- Simulator placements whose route is not mounted are checked by scripts/check-sim-placement-routes.mjs
-- (routes live in code, not in the database).
-- ============================================================================

-- A. Granted pages that would be missing, per placement key
WITH RECURSIVE role_keys(role_name, placement_key) AS (
  VALUES
    ('project_manager', 'pm'), ('pm_project_manager', 'pm'),
    ('team_manager', 'team'), ('pm_team_manager', 'team'), ('team_lead', 'team'),
    ('team_member', 'team_member'),
    ('programme_manager', 'programme'), ('portfolio_manager', 'portfolio'),
    ('pmo_admin', 'pmo_oversight'), ('account_owner', 'pmo_oversight'), ('org_admin', 'pmo_oversight'),
    ('executive', 'executive'), ('project_sponsor', 'sponsor'), ('project_board_member', 'board'),
    ('project_assurance', 'assurance'), ('quality_assurance', 'qa'), ('change_authority', 'change_authority'),
    ('stakeholder', 'stakeholder'), ('viewer', 'viewer')
),
granted AS (
  SELECT DISTINCT rk.placement_key, rmi.menu_item_id
  FROM public.role_menu_items rmi
  JOIN public.roles r ON r.id = rmi.role_id AND r.account_id IS NULL AND COALESCE(r.is_active, TRUE)
  JOIN role_keys rk ON rk.role_name = lower(r.role_name)
  WHERE rmi.can_view = TRUE AND rmi.is_active = TRUE AND COALESCE(rmi.is_deleted, FALSE) = FALSE
),
chain AS (
  SELECT g.placement_key, g.menu_item_id AS item_id, mi.id AS node_id, mi.parent_menu_id, 0 AS depth
  FROM granted g JOIN public.menu_items mi ON mi.id = g.menu_item_id
  UNION ALL
  SELECT c.placement_key, c.item_id, p.id, p.parent_menu_id, c.depth + 1
  FROM chain c JOIN public.menu_items p ON p.id = c.parent_menu_id
  WHERE c.depth < 12
),
covered AS (
  SELECT DISTINCT c.placement_key, c.item_id
  FROM chain c
  LEFT JOIN public.menu_item_placements pl
    ON pl.menu_item_id = c.node_id AND pl.placement_key = c.placement_key AND pl.is_active = TRUE
  JOIN public.menu_items n ON n.id = c.node_id
  -- Compact menus (Team Member, governance profiles) show only placed pages: a default section
  -- does not count for them (engine useDefaults = false).
  WHERE pl.id IS NOT NULL
     OR (n.default_section_code IS NOT NULL
         AND c.placement_key NOT IN ('team_member', 'executive', 'sponsor', 'board', 'assurance', 'qa',
                                     'change_authority', 'stakeholder', 'viewer'))
),
gaps AS (
  SELECT g.placement_key, mi.menu_code, mi.menu_label, mi.route_path
  FROM granted g
  JOIN public.menu_items mi ON mi.id = g.menu_item_id
  WHERE mi.is_active = TRUE AND mi.is_visible = TRUE AND COALESCE(mi.is_deleted, FALSE) = FALSE
    AND mi.route_path IS NOT NULL
    AND mi.menu_code NOT LIKE 'pln\_%'
    AND NOT EXISTS (SELECT 1 FROM covered cv WHERE cv.placement_key = g.placement_key AND cv.item_id = g.menu_item_id)
    -- Story 23: compact menus (Team Member, governance profiles) leave industry pages out unless
    -- placed for them on purpose — not a gap.
    AND NOT (
      g.placement_key IN ('team_member', 'executive', 'sponsor', 'board', 'assurance', 'qa',
                          'change_authority', 'stakeholder', 'viewer')
      AND EXISTS (SELECT 1 FROM public.industry_pack_menu_items ipmi WHERE ipmi.menu_item_id = mi.id)
    )
)
-- Summary first (one row per role with its gap count), then every gap.
SELECT 'A_summary' AS check_name, placement_key, count(*)::text AS menu_code, NULL::text AS menu_label, NULL::text AS route_path
FROM gaps GROUP BY placement_key
UNION ALL
SELECT 'A_unplaced_granted_page', placement_key, menu_code, menu_label, route_path
FROM gaps
ORDER BY 1, 2, 3;

-- B. Slots with no placed member
SELECT 'B_empty_slot' AS check_name, s.app, s.slot_key, s.label
FROM public.menu_slots s
WHERE s.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.menu_item_placements p
    WHERE p.slot_key = s.slot_key AND p.is_active = TRUE
  )
ORDER BY s.app, s.slot_key;

-- C. Sections with more than 12 core entries for a key, per app (each sidebar is one app's menu).
--    Slots count once, sub-menu children are excluded, and catalogue duplicates of the same page
--    (same route) count once — the sidebar shows them once.
SELECT 'C_section_over_limit' AS check_name, placement_key, app, section_code, count(*) AS core_entries,
       string_agg(label, ' · ' ORDER BY label) AS entries
FROM (
  SELECT DISTINCT p.placement_key,
         CASE WHEN mi.menu_code LIKE 'sim\_%' THEN 'simulator' ELSE 'platform' END AS app,
         p.section_code,
         COALESCE('slot:' || p.slot_key, mi.route_path, mi.menu_code) AS entry,
         COALESCE(s.label, mi.menu_label) AS label
  FROM public.menu_item_placements p
  JOIN public.menu_items mi ON mi.id = p.menu_item_id
  LEFT JOIN public.menu_slots s ON s.slot_key = p.slot_key AND s.app = 'platform'
  WHERE p.is_active = TRUE AND p.parent_menu_item_id IS NULL
    AND (p.slot_key IS NOT NULL OR mi.menu_code !~ '^[a-z]{3}_cat_')
) e
GROUP BY placement_key, app, section_code
HAVING count(*) > 12
ORDER BY placement_key, app, section_code;

-- D. Placements on deleted or inactive menu items
SELECT 'D_placement_on_inactive_item' AS check_name, p.placement_key, mi.menu_code, mi.is_active, mi.is_deleted
FROM public.menu_item_placements p
JOIN public.menu_items mi ON mi.id = p.menu_item_id
WHERE p.is_active = TRUE AND (mi.is_active = FALSE OR COALESCE(mi.is_deleted, FALSE) = TRUE)
ORDER BY p.placement_key, mi.menu_code;

-- E. Simulator placements with their routes — export as CSV and run
--    node scripts/check-sim-placement-routes.mjs <file.csv>   (R8: lists routes not mounted)
SELECT p.placement_key, mi.menu_code, mi.route_path
FROM public.menu_item_placements p
JOIN public.menu_items mi ON mi.id = p.menu_item_id
WHERE p.is_active = TRUE AND mi.menu_code LIKE 'sim\_%' AND mi.route_path IS NOT NULL
ORDER BY p.placement_key, mi.menu_code;
