-- ============================================================================
-- v1049: Add "Procurement" top-level PM category (taxonomy §3) + its leaves
-- ============================================================================
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 Procurement: Procurement Plan /
-- Vendors / Contracts / Purchase Requests / Deliverables / Vendor Performance / Contract Closure.
-- This top-level category did not exist anywhere in the PM sidebar before this file.
--
-- Audit findings (2026-09-11), per leaf:
--   Procurement Plan   — already fully served by the generic Process Templates document system
--                         (packages/config's PROCESS_TEMPLATES 'procurement-management-plan'
--                         entry, kind:'new', table procurement_management_plans, v629) at
--                         /pm/process-templates/t/procurement-management-plan. Menu-only, no new
--                         code.
--   Contract Closure   — same generic system, 'contract-closure-document' entry (table
--                         contract_closure_documents, v629) at
--                         /pm/process-templates/t/contract-closure-document. Not requested this
--                         round — can be wired the same way later with zero new code.
--   Deliverables       — SKIPPED deliberately: "Deliverable Register" (public.deliverable_register,
--                         v1025) already has a full, working List+Form page wired under Scope &
--                         Deliverables (plat_pm_sd_deliverable_register, SQL/v1024, route
--                         /platform/deliverable-register). Adding a second sidebar entry for the
--                         SAME route would recreate the exact "true content duplicate" bug class
--                         already found and fixed 5+ times this session (Knowledge & Resources,
--                         ITTO, Governance Decisions, etc.) — a project's deliverables are one
--                         register, not two. Left solely under Scope & Deliverables.
--   Vendors            — genuinely missing: public.vendors (v644) had a DB table and a
--                         pmisGapManifest.js GAP-12 entry, but no page/route was ever built,
--                         unlike this gap's siblings (GAP-01, 03, 06-11, 13-25, all converted to
--                         real CRUD per their own v963 Phase comments). Built this file's
--                         companion code change: VendorListPage.jsx + VendorDetailPage.jsx,
--                         registered at /pm/procurement/vendors(/...) in PmisGapRoutes.jsx —
--                         resolves to /platform/pm/procurement/vendors (nested under the shell's
--                         <Route path="platform/*">, same resolution rule fixed for Governance in
--                         SQL/v1047 and for OKR in SQL/v1048).
--   Vendor Performance — same story: public.vendor_ratings (v644) had a table, no UI. Built
--                         VendorPerformanceListPage.jsx + VendorRatingForm.jsx, registered at
--                         /pm/procurement/performance(/...).
--   Contracts /
--   Purchase Requests  — NOT requested this round (contracts, purchase_requests tables already
--                         exist from v644; same "build real CRUD" treatment as Vendors is the
--                         natural follow-up when asked for).
-- ============================================================================

-- ── Step 1: create the new "Procurement" top-level PM category row ──────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_procurement', 'Procurement',
  'Procurement plan, vendors, and vendor performance for this project (taxonomy §3).',
  NULL,
  (SELECT parent_menu_id FROM public.menu_items
     WHERE menu_code = 'plat_pm_governance' AND COALESCE(is_deleted, FALSE) = FALSE),
  2, 125, 'universal', 'shopping-cart', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_procurement' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- ── Step 2: leaves ────────────────────────────────────────────────────────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), v.mc, v.ml, v.md, v.rp,
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_procurement' AND COALESCE(is_deleted, FALSE) = FALSE),
  (SELECT menu_level + 1 FROM public.menu_items WHERE menu_code = 'plat_pm_procurement' AND COALESCE(is_deleted, FALSE) = FALSE),
  v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('plat_pm_proc_plan',        'Procurement Plan',    'The project''s procurement management plan.', '/pm/process-templates/t/procurement-management-plan', 10, 'file-text'),
  ('plat_pm_proc_vendors',     'Vendors',              'Vendor register for this organisation.',       '/platform/pm/procurement/vendors',                     20, 'truck'),
  ('plat_pm_proc_performance', 'Vendor Performance',   'Vendor performance ratings.',                  '/platform/pm/procurement/performance',                 30, 'star')
) AS v(mc, ml, md, rp, so, ic)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = v.mc AND COALESCE(is_deleted, FALSE) = FALSE
);

-- ── Step 3: grants — same roles already granted the sibling "Governance" top-level category ──

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_governance'
JOIN public.menu_items dst ON dst.menu_code IN ('plat_pm_procurement', 'plat_pm_proc_plan', 'plat_pm_proc_vendors', 'plat_pm_proc_performance')
  AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1049: Procurement top-level category + Procurement Plan/Vendors/Vendor Performance added';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path, parent_menu_id, is_active FROM public.menu_items
--   WHERE menu_code IN ('plat_pm_procurement','plat_pm_proc_plan','plat_pm_proc_vendors','plat_pm_proc_performance');
--   SELECT count(*) FROM public.role_menu_items rmi JOIN public.menu_items mi ON mi.id = rmi.menu_item_id
--   WHERE mi.menu_code = 'plat_pm_procurement' AND rmi.can_view AND rmi.is_active;
