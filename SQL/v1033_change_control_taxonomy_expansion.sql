-- ============================================================================
-- v1033: Change Control taxonomy expansion (Platform PM sidebar)
-- ============================================================================
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3, Change Control branch:
-- Change Requests (New/Open/Approved/Rejected/Implemented), Change Assessment (7 impact
-- dimensions), Change Decisions (Pending/Approved/Rejected/Deferred), Change Implementation
-- (Actions/Baseline Updates/Communication/Verification).
--
-- Live audit found the sidebar's Change Control group only had 1 child (Change Log,
-- v966j/v966c) despite a COMPLETE, mature backend + frontend already existing but never
-- routed anywhere:
--   - ChangeManagement.jsx (hub: Dashboard/Requests/Settings tabs, uses usePlatformProjectId())
--   - ChangeRequestDetail.jsx (per-request: Details/Impact/Assessment/.../Change Log/Audit tabs)
--   - ChangeAssessmentForm.jsx: scope/schedule/cost/resource/risk/quality/benefits_impact_level
--     fields — exactly the taxonomy's 7 Change Assessment sub-items
--   - change_approvals table (decision: pending/approved/rejected/deferred/escalated) and
--     change_implementations table (verified/verification_notes, implementation_plan, status)
--     had zero UI surface until this migration's companion frontend change added Decisions and
--     Implementation tabs to ChangeRequestDetail.jsx, reusing changeManagementService.js's
--     already-existing fetchChangeApprovals/createChangeApproval/fetchChangeImplementation/
--     createChangeImplementation functions.
--
-- This migration only adds the missing "Change Requests" leaf (covers Requests + Assessment +
-- Decisions + Implementation, all as tabs within the hub -> detail flow) — no separate leaves
-- for Assessment/Decisions/Implementation, same "facets of one record, not a register" reasoning
-- used for Governance/Business Case/RAID elsewhere in this taxonomy pass.
-- ============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_change_requests', 'Change Requests',
  'Change requests with impact assessment, decisions, and implementation tracking (taxonomy §3, Change Control).',
  '/platform/change-requests',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_change_control' AND COALESCE(is_deleted, FALSE) = FALSE),
  (SELECT menu_level FROM public.menu_items WHERE menu_code = 'plat_pm_change_log' AND COALESCE(is_deleted, FALSE) = FALSE),
  5, 'universal', 'file-plus', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_change_requests' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Nudge Change Log to sort after Change Requests (Requests is the primary entry point).
UPDATE public.menu_items SET sort_order = 10, updated_at = NOW()
WHERE menu_code = 'plat_pm_change_log' AND COALESCE(is_deleted, FALSE) = FALSE;

-- Grants: copy from the existing Change Log leaf (same audience).
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_change_log'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_change_requests' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1033: Change Requests leaf added to Change Control group';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path, sort_order FROM public.menu_items
--   WHERE menu_code IN ('plat_pm_change_control', 'plat_pm_change_requests', 'plat_pm_change_log')
--   ORDER BY sort_order;
