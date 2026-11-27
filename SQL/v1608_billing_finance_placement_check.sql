-- =============================================================================
-- v1608 — v1359 Slice 1 (gap B5): read-only check of the v1577 billing menu placement.
-- Plan: projectplan/v1359_v1353_to_v1356_gap_closure_plan.md
-- =============================================================================
-- SQL/v1577 placed every menu item whose code contains "_fin_" in the "money_resources" section for the pm,
-- pmo_oversight, programme and portfolio placements. Only ten items are billing ones. This lists any OTHER
-- "_fin_" item that now sits in money_resources for those placements, with the section it had by default, so
-- the owner can see whether v1577 moved anything it should not have. Nothing is changed.
--
-- Result: no rows = v1577 only placed billing items (nothing to fix).
--         rows    = items v1577 may have moved; send the result back and a fix file restores their sections.
-- =============================================================================

SELECT mi.menu_code,
       mi.menu_label,
       pl.placement_key,
       pl.section_code         AS placed_in,
       mi.default_section_code AS default_section,
       pl.updated_at           AS placement_updated_at
  FROM public.menu_item_placements pl
  JOIN public.menu_items mi ON mi.id = pl.menu_item_id
 WHERE mi.menu_code LIKE '%\_fin\_%'
   AND mi.menu_code NOT IN ('plat_fin_clients', 'plat_fin_invoices', 'plat_fin_rates', 'plat_fin_revenue', 'plat_fin_tax',
                            'sim_fin_clients', 'sim_fin_invoices', 'sim_fin_rates', 'sim_fin_revenue', 'sim_fin_tax')
   AND pl.placement_key IN ('pm', 'pmo_oversight', 'programme', 'portfolio')
   AND pl.section_code = 'money_resources'
   AND COALESCE(mi.is_deleted, FALSE) = FALSE
 ORDER BY mi.menu_code, pl.placement_key;
