-- ============================================================================
-- v1465: Consolidated role menus — moved / hidden industry pages audit (read-only)
-- PRD/plan: projectprd/v1341 / projectplan/v1341 (owner report 2026-11-14, "Environments")
--
-- Changes nothing. Four result sets:
--   A. Industries per project as the new sidebar sees them. A project with no industry shows
--      core pages only (D18); the old sidebar showed every organisation industry instead.
--   B. Every industry page: its old place (industry › group) and its new place in the
--      Project Manager menu (section › sub-menu / shared slot).
--   C. Core and industry pages with the same name (e.g. Environments) and where each sits.
--      "different_place" = the two are not side by side, so a user may open the wrong one.
--   D. Industry groups split by a separate placement of one of their pages (as v1464 did).
-- Set the project code in A (default: the project in the owner's screenshot).
-- ============================================================================

-- A. Industries per project (project_industries first, else projects.industry_category_id)
WITH params(project_code) AS (VALUES ('SEED334-PRJ-08'))
SELECT 'A_project_industries' AS check_name, p.project_code, p.project_name,
       COALESCE(string_agg(DISTINCT ic.name, ', '), ic2.name, '(none — core pages only, D18)') AS industries_shown,
       (SELECT string_agg(DISTINCT c.name, ', ')
          FROM public.account_industries ai JOIN public.industry_categories c ON c.id = ai.industry_category_id
         WHERE ai.account_id = p.account_id) AS organisation_industries
FROM public.projects p
JOIN params ON params.project_code = p.project_code
LEFT JOIN public.project_industries pi ON pi.project_id = p.id
LEFT JOIN public.industry_categories ic ON ic.id = pi.industry_category_id
LEFT JOIN public.industry_categories ic2 ON ic2.id = p.industry_category_id
GROUP BY p.project_code, p.project_name, p.account_id, ic2.name;

-- B. Industry pages: old place vs new place for the Project Manager menu ('pm')
WITH RECURSIVE pack_root AS (
  SELECT mi.id, mi.id AS root_id, ip.pack_name, 0 AS depth
  FROM public.industry_pack_menu_items ipmi
  JOIN public.menu_items mi ON mi.id = ipmi.menu_item_id
  JOIN public.industry_packs ip ON ip.id = ipmi.industry_pack_id
  UNION ALL
  SELECT c.id, r.root_id, r.pack_name, r.depth + 1
  FROM pack_root r JOIN public.menu_items c ON c.parent_menu_id = r.id
  WHERE r.depth < 6 AND COALESCE(c.is_deleted, FALSE) = FALSE
),
pages AS (
  SELECT DISTINCT ON (r.id) r.id, r.pack_name, mi.menu_code, mi.menu_label, mi.route_path, mi.parent_menu_id
  FROM pack_root r JOIN public.menu_items mi ON mi.id = r.id
  WHERE mi.route_path IS NOT NULL AND mi.is_active = TRUE
  ORDER BY r.id, r.depth
),
up AS (  -- walk up to the nearest node with a 'pm' placement
  SELECT pg.id AS page_id, pg.id AS node_id, pg.parent_menu_id, 0 AS depth FROM pages pg
  UNION ALL
  SELECT u.page_id, m.id, m.parent_menu_id, u.depth + 1
  FROM up u JOIN public.menu_items m ON m.id = u.parent_menu_id
  WHERE u.depth < 8
    AND NOT EXISTS (SELECT 1 FROM public.menu_item_placements x
                    WHERE x.menu_item_id = u.node_id AND x.placement_key = 'pm' AND x.is_active = TRUE)
),
placed AS (
  SELECT DISTINCT ON (u.page_id) u.page_id, u.node_id, pl.section_code, pl.slot_key, par.menu_label AS sub_menu
  FROM up u
  JOIN public.menu_item_placements pl ON pl.menu_item_id = u.node_id AND pl.placement_key = 'pm' AND pl.is_active = TRUE
  LEFT JOIN public.menu_items par ON par.id = pl.parent_menu_item_id
  ORDER BY u.page_id, u.depth
)
SELECT 'B_industry_page' AS check_name, pg.pack_name AS industry, old_par.menu_label AS old_group,
       pg.menu_label AS page, pg.menu_code,
       COALESCE(s.label, pl.section_code, '(not placed for pm)') AS new_section,
       COALESCE(sl.label, pl.sub_menu, CASE WHEN pl.node_id <> pg.id THEN nd.menu_label END) AS new_sub_menu_or_slot,
       (pl.node_id = pg.id AND pl.node_id IS NOT NULL) AS placed_on_its_own
FROM pages pg
LEFT JOIN public.menu_items old_par ON old_par.id = pg.parent_menu_id
LEFT JOIN placed pl ON pl.page_id = pg.id
LEFT JOIN public.menu_items nd ON nd.id = pl.node_id
LEFT JOIN public.menu_sections s ON s.section_code = pl.section_code AND s.app = 'platform'
LEFT JOIN public.menu_slots sl ON sl.slot_key = pl.slot_key AND sl.app = 'platform'
WHERE pg.menu_code NOT LIKE 'sim\_%'
ORDER BY 2, 3, 4;

-- C. Same-name core and industry pages (Project Manager menu, Platform)
WITH RECURSIVE ind(id, depth) AS (  -- pack-linked items and everything below them
  SELECT ipmi.menu_item_id, 0 FROM public.industry_pack_menu_items ipmi
  UNION ALL
  SELECT c.id, ind.depth + 1 FROM ind JOIN public.menu_items c ON c.parent_menu_id = ind.id WHERE ind.depth < 6
),
loc AS (
  SELECT mi.id, mi.menu_code, lower(btrim(mi.menu_label)) AS name, mi.menu_label, mi.route_path,
         (mi.id IN (SELECT id FROM ind)) AS is_industry,
         pl.section_code, pl.slot_key, par.menu_label AS sub_menu, ip.menu_label AS group_label,
         gpl.section_code AS group_section, gpl.slot_key AS group_slot, gpar.menu_label AS group_sub_menu
  FROM public.menu_items mi
  LEFT JOIN public.menu_item_placements pl ON pl.menu_item_id = mi.id AND pl.placement_key = 'pm' AND pl.is_active = TRUE
  LEFT JOIN public.menu_items par ON par.id = pl.parent_menu_item_id
  LEFT JOIN public.menu_items ip ON ip.id = mi.parent_menu_id
  LEFT JOIN public.menu_item_placements gpl ON gpl.menu_item_id = mi.parent_menu_id AND gpl.placement_key = 'pm' AND gpl.is_active = TRUE
  LEFT JOIN public.menu_items gpar ON gpar.id = gpl.parent_menu_item_id
  WHERE mi.route_path IS NOT NULL AND mi.is_active = TRUE AND COALESCE(mi.is_deleted, FALSE) = FALSE
    AND mi.menu_code NOT LIKE 'sim\_%'
)
SELECT 'C_same_name' AS check_name, c.menu_label AS page,
       c.menu_code AS core_code, concat_ws(' › ', c.section_code, c.slot_key, c.sub_menu) AS core_place,
       i.menu_code AS industry_code,
       concat_ws(' › ', COALESCE(i.section_code, i.group_section), COALESCE(i.slot_key, i.group_slot),
                 COALESCE(i.sub_menu, i.group_sub_menu, i.group_label)) AS industry_place,
       NOT (COALESCE(i.section_code, i.group_section) IS NOT DISTINCT FROM c.section_code
            AND (COALESCE(i.slot_key, i.group_slot) IS NOT DISTINCT FROM c.slot_key
                 OR COALESCE(i.sub_menu, i.group_sub_menu) IS NOT DISTINCT FROM c.sub_menu)) AS different_place
FROM loc c
JOIN loc i ON i.name = c.name AND i.is_industry AND NOT c.is_industry
WHERE c.section_code IS NOT NULL
ORDER BY different_place DESC, page, industry_code;

-- D. Industry groups with a page placed separately (taken out of the group)
SELECT 'D_split_group' AS check_name, grp.menu_label AS industry_group, gpl.section_code AS group_section,
       mi.menu_label AS page, pl.section_code AS page_section, par.menu_label AS page_sub_menu
FROM public.menu_item_placements pl
JOIN public.menu_items mi ON mi.id = pl.menu_item_id
JOIN public.menu_items grp ON grp.id = mi.parent_menu_id AND grp.menu_code ~ '^[a-z]{3}_cat_'
JOIN public.menu_item_placements gpl ON gpl.menu_item_id = grp.id AND gpl.placement_key = 'pm' AND gpl.is_active = TRUE
LEFT JOIN public.menu_items par ON par.id = pl.parent_menu_item_id
WHERE pl.placement_key = 'pm' AND pl.is_active = TRUE
ORDER BY 2, 4;
