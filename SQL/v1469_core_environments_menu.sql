-- ============================================================================
-- v1469: One Environments entry in the menus (v1342, slice 5)
-- ============================================================================
-- PRD/plan v1342 (D7: one entry at Project Setup › Project Settings › Environments; the tab-strip
-- slot switched off again). Prerequisites: v1467, v1468.
--
-- 1. Project Settings › Environments (plat_pm_testing_environments) opens the Environments
--    register. The old page address also redirects there in the app (D8).
-- 2. The retired Banking and IT environment pages and the IT Environments group are switched off
--    in the catalogue (they no longer show in any sidebar, consolidated or not), and their
--    placements are switched off.
-- 3. The core entry leaves the "environments" slot; the slot is switched off (both apps), so the
--    sidebar shows one plain "Environments" link with no tab strip. Undoes v1466's slot use.
-- Nothing is deleted. Idempotent. The Simulator has no Environments menu item (practice testing
-- pages link to it), so only the app redirect applies there.
-- ============================================================================

-- 1. Core entry → the register
UPDATE public.menu_items
SET route_path = '/platform/local-registers/00000000-0000-4000-9100-000000000002',
    menu_description = 'The project''s environments: hosting, connection, availability, access and issues (v1342)',
    updated_at = NOW()
WHERE menu_code = 'plat_pm_testing_environments';

-- 1b. Roles that saw an industry Environments page but not the core one (e.g. Team Lead / Team
--     Manager, v1455) keep an Environments entry: the core one, at the same place.
INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order, scope)
SELECT DISTINCT ON (p.placement_key) core.id, p.placement_key, p.section_code, p.parent_menu_item_id, NULL, 50, p.scope
FROM public.menu_item_placements p
JOIN public.menu_items old ON old.id = p.menu_item_id
  AND old.menu_code IN ('fin_reg_fin_core_banking_environments', 'ict_reg_ict_environments', 'ict_cat_environments')
JOIN public.menu_items core ON core.menu_code = 'plat_pm_testing_environments' AND COALESCE(core.is_deleted, FALSE) = FALSE
WHERE p.is_active = TRUE
  AND NOT EXISTS (SELECT 1 FROM public.menu_item_placements c
                  WHERE c.menu_item_id = core.id AND c.placement_key = p.placement_key AND c.is_active = TRUE)
ORDER BY p.placement_key, p.sort_order
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET
  section_code = EXCLUDED.section_code, parent_menu_item_id = EXCLUDED.parent_menu_item_id,
  slot_key = NULL, sort_order = EXCLUDED.sort_order, scope = EXCLUDED.scope, is_active = TRUE, updated_at = NOW();

--     …and the matching view grant (roles granted an industry Environments page, rule 75).
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT DISTINCT ON (src.role_id) gen_random_uuid(), src.role_id, core.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items old ON old.id = src.menu_item_id
  AND old.menu_code IN ('fin_reg_fin_core_banking_environments', 'ict_reg_ict_environments', 'ict_cat_environments')
JOIN public.menu_items core ON core.menu_code = 'plat_pm_testing_environments' AND COALESCE(core.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ORDER BY src.role_id
ON CONFLICT (role_id, menu_item_id) DO UPDATE
SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- 2. Retired pages off (catalogue and placements)
UPDATE public.menu_items
SET is_active = FALSE, updated_at = NOW()
WHERE menu_code IN ('fin_reg_fin_core_banking_environments', 'ict_reg_ict_environments', 'ict_cat_environments')
  AND is_active = TRUE;

UPDATE public.menu_item_placements p
SET is_active = FALSE, updated_at = NOW()
FROM public.menu_items mi
WHERE mi.id = p.menu_item_id
  AND mi.menu_code IN ('fin_reg_fin_core_banking_environments', 'ict_reg_ict_environments', 'ict_cat_environments')
  AND p.is_active = TRUE;

-- 3. Core entry out of the slot; slot off
UPDATE public.menu_item_placements p
SET slot_key = NULL, updated_at = NOW()
FROM public.menu_items mi
WHERE mi.id = p.menu_item_id
  AND mi.menu_code = 'plat_pm_testing_environments'
  AND p.slot_key = 'environments';

UPDATE public.menu_slots
SET is_active = FALSE, updated_at = NOW()
WHERE slot_key = 'environments' AND is_active = TRUE;

-- The v1449 triggers bump menu_placement_version, so sidebars pick this up at the next load.

-- Check: the core entry's route and placements; nothing left in the slot; retired items off.
SELECT 'core_entry' AS check_name, mi.menu_code, mi.route_path, p.placement_key, par.menu_code AS parent, p.slot_key
FROM public.menu_items mi
LEFT JOIN public.menu_item_placements p ON p.menu_item_id = mi.id AND p.is_active = TRUE
LEFT JOIN public.menu_items par ON par.id = p.parent_menu_item_id
WHERE mi.menu_code = 'plat_pm_testing_environments'
UNION ALL
SELECT 'retired_still_on', mi.menu_code, mi.route_path, NULL, NULL, NULL
FROM public.menu_items mi
WHERE mi.menu_code IN ('fin_reg_fin_core_banking_environments', 'ict_reg_ict_environments', 'ict_cat_environments')
  AND mi.is_active = TRUE
ORDER BY 1, 4;
