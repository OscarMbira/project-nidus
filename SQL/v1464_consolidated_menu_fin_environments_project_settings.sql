-- ============================================================================
-- v1464: Consolidated role menus — Banking "Environments" register back beside Environments
-- PRD/plan: projectprd/v1341 / projectplan/v1341 (owner report 2026-11-14)
--
-- Owner report: after the menus were consolidated, Project Setup › Project Settings › Environments
-- opened the simple core page (Name / Description / Active). The full Environments form — hosting
-- model, IP address, host name, cloud setup, cloud compliance, database, access (v1307, v1346) —
-- is the Banking & Financial Services register "Environments" (fin_reg_fin_core_banking_environments).
-- v1450 placed its whole group (Core Banking) in Scope & Requirements, so that form was no longer
-- next to the other Environments pages.
--
-- Fix (placements only, no form or data change): place the Banking Environments register under
-- Project Settings, beside the core Environments page and the Information Technology
-- Environments, for every role menu that already shows the Information Technology Environments
-- there (pm, team, programme, portfolio and any other key with that placement). The engine takes
-- a separately placed page out of its group, so Core Banking keeps its other four registers.
-- Industry filtering is unchanged: it shows only on Banking & Financial Services projects.
-- Idempotent. Run after v1463.
-- ============================================================================

INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order, scope)
SELECT fin.id, p.placement_key, p.section_code, p.parent_menu_item_id, NULL, 52, p.scope
FROM public.menu_item_placements p
JOIN public.menu_items ict ON ict.id = p.menu_item_id AND ict.menu_code = 'ict_cat_environments'
JOIN public.menu_items fin ON fin.menu_code = 'fin_reg_fin_core_banking_environments'
                          AND COALESCE(fin.is_deleted, FALSE) = FALSE
WHERE p.is_active = TRUE
  AND p.parent_menu_item_id IS NOT NULL
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET
  section_code = EXCLUDED.section_code,
  parent_menu_item_id = EXCLUDED.parent_menu_item_id,
  slot_key = NULL,
  sort_order = EXCLUDED.sort_order,
  scope = EXCLUDED.scope,
  is_active = TRUE,
  updated_at = NOW();

-- The v1449 trigger bumps menu_placement_version, so sidebars pick this up at the next load.

-- Check: one row per role menu, under Project Settings.
SELECT p.placement_key, p.section_code, par.menu_code AS parent, p.sort_order
FROM public.menu_item_placements p
JOIN public.menu_items mi ON mi.id = p.menu_item_id
LEFT JOIN public.menu_items par ON par.id = p.parent_menu_item_id
WHERE mi.menu_code = 'fin_reg_fin_core_banking_environments' AND p.is_active = TRUE
ORDER BY p.placement_key;
