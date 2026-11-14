-- ============================================================================
-- v1462: Consolidated role menus — retire the unused "Environments" shared slot
-- PRD/plan: projectprd/v1341 / projectplan/v1341 (audit result B, 2026-11-14)
--
-- Environments (core) and the industry environment pages sit under Project Setup › Project
-- Settings as sub-menu items (v1450 / v1451), not in a shared slot, so the "environments" slot
-- seeded by v1449 has no members (audit B). Marking it inactive keeps the slot list honest; it
-- changes no sidebar. Admin › System › Menu Sections & Slots can turn it back on.
-- Idempotent. Run after v1461.
-- ============================================================================

UPDATE public.menu_slots
   SET is_active = FALSE, updated_at = NOW()
 WHERE slot_key = 'environments'
   AND is_active = TRUE
   AND NOT EXISTS (
     SELECT 1 FROM public.menu_item_placements p WHERE p.slot_key = 'environments' AND p.is_active = TRUE
   );

SELECT app, slot_key, is_active FROM public.menu_slots WHERE slot_key = 'environments' ORDER BY app;
