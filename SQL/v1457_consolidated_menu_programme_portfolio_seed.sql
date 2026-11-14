-- ============================================================================
-- v1457: Consolidated role menus — Programme Manager and Portfolio Manager placements (Slice 7)
-- PRD/plan: projectprd/v1341 (stories 18, 19, D3) / projectplan/v1341
-- Design source: Documentation/Consolidated_Role_Menus_Proposal.md §6.4, §6.5
--
-- Same nine sections as the Project Manager. Both keys start from the PM placements (their role
-- grants decide which pages actually show) and add their own roll-up areas in Home:
--   'programme' — the programme views (plat_grp_programme)
--   'portfolio' — the portfolio views (plat_grp_portfolio) and oversight (plat_grp_oversight)
-- Outside a project, industry pages do not show (D3): the engine passes no project packs.
-- Roll-up pages the proposal names that do not exist yet (Programme Roadmap, Go-Live Calendar,
-- Capacity & Demand, …) are not built here; they are listed as gaps in the plan Review.
-- Idempotent. Run after v1456.
-- ============================================================================

INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order, scope)
SELECT p.menu_item_id, k.placement_key, p.section_code, p.parent_menu_item_id, p.slot_key, p.sort_order, p.scope
FROM public.menu_item_placements p
CROSS JOIN (VALUES ('programme'), ('portfolio')) AS k(placement_key)
WHERE p.placement_key = 'pm' AND p.is_active = TRUE
ON CONFLICT (menu_item_id, placement_key) DO NOTHING;

INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order)
SELECT mi.id, v.placement_key, v.section_code, NULL, NULL, v.sort_order
FROM (VALUES
  ('plat_grp_programme', 'programme', 'home', 5),
  ('plat_grp_portfolio', 'portfolio', 'home', 5),
  ('plat_grp_oversight', 'portfolio', 'home', 6),
  ('plat_grp_projects',  'portfolio', 'home', 7),
  ('plat_grp_projects',  'programme', 'home', 7)
) AS v(menu_code, placement_key, section_code, sort_order)
JOIN public.menu_items mi ON mi.menu_code = v.menu_code AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET
  section_code = EXCLUDED.section_code, sort_order = EXCLUDED.sort_order, is_active = TRUE, updated_at = NOW();

SELECT placement_key, count(*) AS placements
FROM public.menu_item_placements
WHERE placement_key IN ('programme', 'portfolio')
GROUP BY placement_key ORDER BY placement_key;
