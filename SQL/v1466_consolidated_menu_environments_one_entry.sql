-- ============================================================================
-- v1466: Consolidated role menus — one "Environments" entry under Project Settings
-- PRD/plan: projectprd/v1341 (D23) / projectplan/v1341 (owner report 2026-11-14)
--
-- Owner report: on a Banking + Information Technology project, Project Settings showed three
-- items called "Environments" (the core page, the Banking register and the IT group with its own
-- "Environments" register inside). Not user-friendly.
--
-- Fix (D23 shared slot, now allowed inside a sub-menu by the engine):
--   1. The "environments" slot (switched off by v1462) is on again for the Platform.
--   2. The core page and the Banking register join the slot where they sit under Project Settings.
--   3. The IT register itself (not its one-page group) joins the slot; the IT group's own
--      placement is switched off, so the IT "Environments › Environments" double level goes.
-- Result: one "Environments" under Project Settings. On an industry project the page shows tabs —
-- Environments · Banking & Financial Services · Information Technology (the industry's name when
-- the page names are the same). A project with no industry still gets the core page only.
-- Placements only; no form or record changes. Idempotent. Run after v1465.
-- ============================================================================

-- 1. Slot on again (Platform)
UPDATE public.menu_slots
   SET is_active = TRUE, updated_at = NOW()
 WHERE slot_key = 'environments' AND app = 'platform' AND is_active = FALSE;

-- 2. Core page and Banking register: join the slot where they are under a parent (Project Settings)
UPDATE public.menu_item_placements p
   SET slot_key = 'environments', updated_at = NOW()
  FROM public.menu_items mi
 WHERE mi.id = p.menu_item_id
   AND mi.menu_code IN ('plat_pm_testing_environments', 'fin_reg_fin_core_banking_environments')
   AND p.is_active = TRUE
   AND p.parent_menu_item_id IS NOT NULL
   AND p.slot_key IS DISTINCT FROM 'environments';

-- 3. IT register in the slot, at the IT group's place, for every key that places the IT group
INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order, scope)
SELECT reg.id, p.placement_key, p.section_code, p.parent_menu_item_id, 'environments', 55, p.scope
FROM public.menu_item_placements p
JOIN public.menu_items grp ON grp.id = p.menu_item_id AND grp.menu_code = 'ict_cat_environments'
JOIN public.menu_items reg ON reg.menu_code = 'ict_reg_ict_environments' AND COALESCE(reg.is_deleted, FALSE) = FALSE
WHERE p.is_active = TRUE
  AND p.parent_menu_item_id IS NOT NULL
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET
  section_code = EXCLUDED.section_code,
  parent_menu_item_id = EXCLUDED.parent_menu_item_id,
  slot_key = 'environments',
  sort_order = EXCLUDED.sort_order,
  scope = EXCLUDED.scope,
  is_active = TRUE,
  updated_at = NOW();

UPDATE public.menu_item_placements p
   SET is_active = FALSE, updated_at = NOW()
  FROM public.menu_items grp
 WHERE grp.id = p.menu_item_id
   AND grp.menu_code = 'ict_cat_environments'
   AND p.is_active = TRUE
   AND EXISTS (
     SELECT 1 FROM public.menu_item_placements r
     JOIN public.menu_items reg ON reg.id = r.menu_item_id AND reg.menu_code = 'ict_reg_ict_environments'
     WHERE r.placement_key = p.placement_key AND r.is_active = TRUE AND r.slot_key = 'environments'
   );

-- The v1449 trigger bumps menu_placement_version, so sidebars pick this up at the next load.

-- Check: the slot members per role menu (expect 3 rows for pm; team has no core page)
SELECT p.placement_key, mi.menu_code, par.menu_code AS parent, p.slot_key, p.sort_order
FROM public.menu_item_placements p
JOIN public.menu_items mi ON mi.id = p.menu_item_id
LEFT JOIN public.menu_items par ON par.id = p.parent_menu_item_id
WHERE p.is_active = TRUE AND p.slot_key = 'environments'
ORDER BY p.placement_key, p.sort_order;
