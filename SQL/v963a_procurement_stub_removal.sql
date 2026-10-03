-- ============================================================================
-- v963a: PMIS Core Gap Closure — Phase 1: Procurement stub removal
-- ============================================================================
-- projectplan/v963_pmis_core_gap_closure_plan.md Phase 1.
-- Decision (PRD v963 d.2): Procurement (Vendors/Purchase Requests/Purchase Orders/Contracts/
-- Vendor Ratings/Invoices) is explicitly out of scope for this PMIS — belongs in a dedicated
-- procurement/ERP system. The sidebar's existing "Procurement" section
-- (pmo_section_procurement_mgmt/pmo_section_procurement parent, from v661) is a live bug today:
-- all 5 children route to the same generic stub page pointed at the `vendors` table regardless
-- of which link is clicked. Deactivate rather than delete — the underlying tables
-- (vendors/purchase_requests/purchase_orders/purchase_order_lines/contracts/
-- contract_milestones/vendor_ratings/invoices, from v644) are left untouched for a possible
-- future initiative.
--
-- Explicitly NOT touched: the separate, real, working RFP feature — 'procurement' (v265) parent
-- + 'proc_rfp_register'/'proc_rfp_create'/'proc_rfp_drafts' children. That is a different,
-- pre-existing top-level menu row from a different migration and stays fully active.
-- ============================================================================

DO $$
DECLARE
  v_deactivated_count INT := 0;
BEGIN
  -- Deactivate the 5 broken stub children (covers both canonical and legacy-alias menu_codes
  -- from v661's own defensive lookups).
  UPDATE public.menu_items
  SET is_visible = FALSE, is_active = FALSE, updated_at = NOW()
  WHERE menu_code IN (
    'pmo_vendor_register', 'pmo_procurement_vendors',
    'pmo_purchase_requests', 'pmo_procurement_requests',
    'pmo_purchase_orders', 'pmo_procurement_orders',
    'pmo_contracts', 'pmo_procurement_contracts',
    'pmo_invoice_tracking', 'pmo_procurement_invoices'
  )
  AND COALESCE(is_deleted, FALSE) = FALSE;
  GET DIAGNOSTICS v_deactivated_count = ROW_COUNT;

  -- Deactivate the parent section itself — but only if it has no remaining active children
  -- (defensive: never hide a parent that still has something legitimate under it).
  UPDATE public.menu_items p
  SET is_visible = FALSE, is_active = FALSE, updated_at = NOW()
  WHERE p.menu_code IN ('pmo_section_procurement_mgmt', 'pmo_section_procurement')
    AND COALESCE(p.is_deleted, FALSE) = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM public.menu_items c
      WHERE c.parent_menu_id = p.id
        AND COALESCE(c.is_deleted, FALSE) = FALSE
        AND c.is_active = TRUE
    );

  RAISE NOTICE 'v963a: deactivated % procurement stub menu_items rows (children); parent deactivated only if no active children remained', v_deactivated_count;
END $$;

-- Mirror on Simulator sidebar if an equivalent section was ever seeded there (defensive —
-- no-ops cleanly if these codes were never created for sim).
UPDATE public.menu_items
SET is_visible = FALSE, is_active = FALSE, updated_at = NOW()
WHERE menu_code IN (
  'sim_pmo_procurement_vendors', 'sim_pmo_procurement_requests',
  'sim_pmo_procurement_orders', 'sim_pmo_procurement_contracts',
  'sim_pmo_procurement_invoices'
)
AND COALESCE(is_deleted, FALSE) = FALSE;
