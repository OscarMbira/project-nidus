-- ============================================================================
-- v1478: Restore PMO Project Setup after v1477 (empty section regression)
-- ============================================================================
-- After v1477 moved Mandate/Brief Approvals out of project_setup, PMO Admin sidebars lost
-- the Project Setup section entirely. Those Approvals had been the only *leaves* rendering
-- there (via the default_section safety-net). The placed category shells
-- (pmo-cat-projects, pmo-cat-initiation, …) resolve with zero children in
-- buildConsolidatedMenu and are dropped, so the section hid.
--
-- §6.8 (Consolidated_Role_Menus_Proposal): PMO Project Setup = Projects list only
-- (open a project → PM menu). Place the All Projects leaf; deactivate the empty shells
-- for pmo_oversight / project_setup so we do not rely on them. Approvals stay in
-- risks_governance (v1477).
-- Idempotent. Run after v1477.
-- ============================================================================

-- 1) All Projects under Project Setup (PMO twin first; PM twin only if PMO twin missing)
INSERT INTO public.menu_item_placements (
  menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order, scope
)
SELECT mi.id, 'pmo_oversight', 'project_setup', NULL, NULL, 10, 'organisation'
FROM public.menu_items mi
WHERE mi.menu_code = 'plat_all_projects'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET
  section_code = 'project_setup',
  parent_menu_item_id = NULL,
  slot_key = NULL,
  sort_order = 10,
  scope = EXCLUDED.scope,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO public.menu_item_placements (
  menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order, scope
)
SELECT mi.id, 'pmo_oversight', 'project_setup', NULL, NULL, 10, 'organisation'
FROM public.menu_items mi
WHERE mi.menu_code = 'plat_pm_all_projects'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM public.menu_items x
    WHERE x.menu_code = 'plat_all_projects' AND COALESCE(x.is_deleted, FALSE) = FALSE
  )
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET
  section_code = 'project_setup',
  parent_menu_item_id = NULL,
  slot_key = NULL,
  sort_order = 10,
  scope = EXCLUDED.scope,
  is_active = TRUE,
  updated_at = NOW();

-- Avoid duplicate All Projects if both twins somehow got placed
UPDATE public.menu_item_placements p
SET is_active = FALSE, updated_at = NOW()
FROM public.menu_items mi
WHERE p.menu_item_id = mi.id
  AND p.placement_key = 'pmo_oversight'
  AND p.section_code = 'project_setup'
  AND mi.menu_code = 'plat_pm_all_projects'
  AND EXISTS (
    SELECT 1
    FROM public.menu_item_placements p2
    JOIN public.menu_items mi2 ON mi2.id = p2.menu_item_id
    WHERE p2.placement_key = 'pmo_oversight'
      AND p2.is_active = TRUE
      AND p2.section_code = 'project_setup'
      AND mi2.menu_code = 'plat_all_projects'
  );

-- 2) Empty category shells no longer pretend to fill Project Setup for PMO
UPDATE public.menu_item_placements p
SET is_active = FALSE, updated_at = NOW()
FROM public.menu_items mi
WHERE p.menu_item_id = mi.id
  AND p.placement_key = 'pmo_oversight'
  AND p.section_code = 'project_setup'
  AND mi.menu_code IN (
    'pmo-cat-projects',
    'pmo-cat-project-oversight',
    'pmo-cat-project-oversight-group',
    'pmo-cat-initiation',
    'sim_pmo_cat_initiation'
  );

-- Check: Project Setup for pmo_oversight should list All Projects; Approvals stay elsewhere
SELECT mi.menu_code, mi.menu_label, mi.route_path, p.section_code, p.sort_order, p.is_active
FROM public.menu_item_placements p
JOIN public.menu_items mi ON mi.id = p.menu_item_id
WHERE p.placement_key = 'pmo_oversight'
  AND p.section_code = 'project_setup'
ORDER BY p.is_active DESC, p.sort_order, mi.menu_code;

DO $$
BEGIN
  RAISE NOTICE 'v1478: PMO Project Setup restored with All Projects; empty pmo-cat-* shells deactivated.';
END $$;
