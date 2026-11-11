-- ============================================================================
-- v1407: Banking & Financial Services sidebar order — Change Management and Training after Testing
-- ============================================================================
-- PRD v1339 decision D1 (approved 2026-11-11). The two new sections (v1403, v1405) sit after
-- Testing & Assurance and before Cutover. The later sections move down two places:
--   600 Banking Transformation · 601 Core Banking · 602 Data Migration · 603 Testing & Assurance
--   604 Change Management (new) · 605 Training (new)
--   606 Cutover (was 604) · 607 Operational Readiness (was 605) · 608 Go-Live (was 606) · 609 Hypercare (was 607)
-- Only these Banking section headers change. Register menus inside each section keep their order.
-- Run after v1403 and v1405. Idempotent.
-- ============================================================================

UPDATE public.menu_items m
SET sort_order = v.sort_order, updated_at = NOW()
FROM (VALUES
  ('fin_cat_change_management', 604),
  ('fin_cat_training', 605),
  ('fin_cat_cutover', 606),
  ('fin_cat_operational_readiness', 607),
  ('fin_cat_go_live', 608),
  ('fin_cat_hypercare', 609)
) AS v(menu_code, sort_order)
WHERE m.menu_code = v.menu_code;

-- Check: Banking sections in sidebar order.
SELECT sort_order, menu_code, menu_label
FROM public.menu_items
WHERE menu_code LIKE 'fin_cat_%' AND COALESCE(is_deleted, FALSE) = FALSE
ORDER BY sort_order;
