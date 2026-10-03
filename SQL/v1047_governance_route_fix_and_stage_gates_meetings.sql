-- ============================================================================
-- v1047: Fix broken Governance approval routes (sidebar "whole page refresh" bug);
-- add Stage Gates under top-level Governance; move Meeting Calendar there as "Meetings"
-- ============================================================================
-- User report (2026-09-11): clicking Decision Log / Pending My Approval / Actions /
-- My Submitted Records / Approval Chains under top-level Governance caused the WHOLE
-- app to reload, not a normal SPA navigation.
--
-- Root cause found in apps/platform/src/routes/platformRoutes.jsx: RecordLifecycleRouteElements()
-- (record-lifecycle module) registers pmo/authorisation/queue, pm/authorisation/submitted,
-- pmo/authorisation/chains etc. as RELATIVE routes nested inside the single big
-- <Route path="platform/*"> block's own <Routes>. React Router resolves relative child paths
-- against the parent match, so these actually live at /platform/pmo/authorisation/queue,
-- /platform/pm/authorisation/submitted, /platform/pmo/authorisation/chains — NOT the bare
-- /pmo/authorisation/queue etc. that menu_items.route_path stored. Visiting the bare (wrong)
-- path matched nothing and fell through to App.jsx's top-level catch-all
-- (<Route path="*" element={<Navigate to="/" replace />} />), hard-redirecting the whole app to
-- "/" — remounting everything, which is exactly the "whole sidebar refreshing" the user saw.
--
-- Also repointed "Pending My Approval" and "Approval Chains" from the PMO-flavored pages
-- (pmo/authorisation/queue, pmo/authorisation/chains) to the PM-flavored read-only equivalents
-- that already exist in the same route file (pm/authorisation/queue → PendingApprovalsPage,
-- pm/authorisation/chains → ApprovalChainsOverviewPage "Approval Chains (Read-only)") — this is
-- the PM's own Governance sidebar, so the PM-flavored page is the correct destination, matching
-- "My Submitted Records" which was already PM-flavored.
--
-- Separately found and fixed in code (apps/platform/src/routes/platformRoutes.jsx, no SQL
-- needed there — menu_items already stored the correct single-prefixed path): a whole v675 block
-- (Executive Dashboard, Subscription, Organisation Profile, Stage Gates, Governance Framework,
-- Policies & Compliance, Custom Metrics, Workstream Plans — ~14 routes) had the SAME bug in the
-- opposite direction — each was registered with a redundant literal "platform/" prefix inside
-- the same relative-path block, so they resolved to /platform/platform/stage-gates etc. and were
-- unreachable at the /platform/stage-gates URL menu_items always stored. Fixed by removing the
-- redundant prefix so Stage Gates now genuinely resolves at /platform/stage-gates, per taxonomy
-- doc comparison in this same audit (user approved adding it under top-level Governance).
--
-- Also relocates Meeting Calendar (plat_pm_gov_meetings) from Governance Setup to top-level
-- Governance, relabelled "Meetings" — the ongoing meeting cadence belongs with the other
-- ongoing-workflow items (Decision Log, Actions, Approvals), not the one-time setup group.
-- ============================================================================

-- 1. Fix the three broken/mis-pointed approval routes.
UPDATE public.menu_items
SET route_path = '/platform/pm/authorisation/queue', updated_at = NOW()
WHERE menu_code = 'plat_pm_pending_approval' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET route_path = '/platform/pm/authorisation/submitted', updated_at = NOW()
WHERE menu_code = 'plat_pm_submitted' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET route_path = '/platform/pm/authorisation/chains', updated_at = NOW()
WHERE menu_code = 'plat_pm_approval_chains' AND COALESCE(is_deleted, FALSE) = FALSE;

-- 2. Move Meeting Calendar to top-level Governance, relabelled "Meetings".
UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_governance' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = (SELECT menu_level + 1 FROM public.menu_items WHERE menu_code = 'plat_pm_governance' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_label = 'Meetings',
    sort_order = 50,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_gov_meetings' AND COALESCE(is_deleted, FALSE) = FALSE;

-- 3. Add "Stage Gates" as a new leaf under top-level Governance.
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_gov_stage_gates', 'Stage Gates',
  'Stage gate reviews and decisions for this project (taxonomy §3, Governance).',
  '/platform/stage-gates',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_governance' AND COALESCE(is_deleted, FALSE) = FALSE),
  (SELECT menu_level + 1 FROM public.menu_items WHERE menu_code = 'plat_pm_governance' AND COALESCE(is_deleted, FALSE) = FALSE),
  60, 'universal', 'flag', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_gov_stage_gates' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Grant Stage Gates to every role that already has top-level Governance itself granted.
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_governance'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_gov_stage_gates' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1047: Governance approval routes fixed; Meeting Calendar moved to top-level Governance as Meetings; Stage Gates added';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path FROM public.menu_items
--   WHERE menu_code IN ('plat_pm_pending_approval','plat_pm_submitted','plat_pm_approval_chains',
--                        'plat_pm_gov_meetings','plat_pm_gov_stage_gates');
