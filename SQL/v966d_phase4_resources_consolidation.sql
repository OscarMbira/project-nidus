-- ============================================================================
-- v966d: Core PM Menu Rationalisation — Phase 4: Resources consolidation
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 4.
--
-- Scope actually completed in this pass (see plan file Phase 4 notes for what was deferred
-- and why):
--   1. Work Packages — 4 rows shared one route (/pm/delivery/work-packages, confirmed
--      registered: apps/platform/src/routes/platformRoutes.jsx -> <PMDeliveryWorkPackages/>).
--      Canonical: plat_pm_s_work_packages (12 grants, broadest of the 4). The other 3
--      (plat_tl_work_packages 4 grants, plat_tm_s_work_packages_ro 5 grants,
--      plat_tm_work_packages 5 grants) are deactivated; their grants not already on the
--      canonical row (pm_team_manager, pm_team_member) are migrated first.
--   2. Capacity — canonical plat_pm_capacity (/platform/resources/capacity, confirmed
--      registered, 12 grants). plat_tl_capacity (same route, Team Management track, 4 grants)
--      is the duplicate; its one unique grant (pm_team_manager) is migrated first.
--
-- Deliberately NOT done in this pass (deferred, see plan file):
--   - Timesheets/Approvals retarget: fresh verification found NEITHER
--     platform_timesheet_approval_settings (/platform/timesheets/settings) NOR
--     pmo_timesheet_approval_settings (/pmo/settings/timesheet-approvals) is a registered
--     route anywhere in apps/platform/src/routes/ — both are dead links today. Merging grants
--     between two non-functional routes would accomplish nothing; this needs an actual page
--     built/wired first (Phase 13 territory: "verify... only extend where a real gap is
--     confirmed"), not a menu consolidation. platform_timesheet_approval_settings is left
--     exactly as Phase 0 (v966a) left it — active, untouched, excluded from that deletion pass.
--   - Assignments regroup (project-users/manager-assignments/appointments -> one menu entry):
--     needs a UX decision about which of several existing distinct pages becomes the anchor,
--     not just a grant migration — left for a follow-up pass with that decision made explicit.
-- ============================================================================

-- ── Work Packages ────────────────────────────────────────────────────────────────
-- 3 loser rows combined via IN(...) — a role granted on more than one of the 3 would otherwise
-- produce duplicate (role_id, keeper.id) pairs in the same INSERT, which ON CONFLICT DO UPDATE
-- cannot handle ("cannot affect row a second time"). Dedupe role_id in a subquery before
-- joining to the single keeper row, so each role contributes at most one output row here.

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.role_id, keeper.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM (
  SELECT DISTINCT src.role_id
  FROM public.role_menu_items src
  JOIN public.menu_items loser ON loser.id = src.menu_item_id
    AND loser.menu_code IN ('plat_tl_work_packages', 'plat_tm_s_work_packages_ro', 'plat_tm_work_packages')
  WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
) r
JOIN public.menu_items keeper ON keeper.menu_code = 'plat_pm_s_work_packages' AND COALESCE(keeper.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

UPDATE public.menu_items SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code IN ('plat_tl_work_packages', 'plat_tm_s_work_packages_ro', 'plat_tm_work_packages')
  AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.role_menu_items rmi SET is_active = FALSE, updated_at = NOW()
FROM public.menu_items mi
WHERE rmi.menu_item_id = mi.id
  AND mi.menu_code IN ('plat_tl_work_packages', 'plat_tm_s_work_packages_ro', 'plat_tm_work_packages')
  AND COALESCE(rmi.is_deleted, FALSE) = FALSE;

-- ── Capacity ─────────────────────────────────────────────────────────────────────

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, keeper.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items loser ON loser.id = src.menu_item_id AND loser.menu_code = 'plat_tl_capacity'
JOIN public.menu_items keeper ON keeper.menu_code = 'plat_pm_capacity' AND COALESCE(keeper.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

UPDATE public.menu_items SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code = 'plat_tl_capacity' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.role_menu_items rmi SET is_active = FALSE, updated_at = NOW()
FROM public.menu_items mi
WHERE rmi.menu_item_id = mi.id AND mi.menu_code = 'plat_tl_capacity' AND COALESCE(rmi.is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966d_phase4_resources_consolidation.sql applied successfully'; END $$;
