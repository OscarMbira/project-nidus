-- ============================================================================
-- v966ab: Core PM Menu Rationalisation — Phase 12: Governance Action Register (sidebar wire)
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 12.
--
-- Wires the new Governance Action Register (SQL/v966z/v966aa) into the sidebar as "Actions",
-- nested under the "Governance" taxonomy group (plat_pm_governance, created by SQL/v966k,
-- extended with the Approvals fold-in by SQL/v966u) alongside Decision Log / Pending My Approval
-- / My Submitted Records / Approval Chains. Same pattern as every other Phase 9/11/12 leaf:
-- `WHERE NOT EXISTS` guard on the INSERT, grants copied from the direct Governance sibling
-- plat_pm_s_decision_log (Decision Log, 18 roles) — same grant-copy precedent used by
-- v966m/v966v/v966y.
--
-- MUST RUN AFTER v966k (relies on plat_pm_governance already existing) and v966z/v966aa (the
-- views this menu item points at). Route is a flat /platform/governance-actions path — this is a
-- global cross-project rollup (same shape as the existing Approvals register at
-- /pmo/approvals/register), not project-scoped, so no ?projectId= convention applies here.
--
-- Platform sidebar only — same Simulator-deferral rationale as v966y (Phase 14 has not yet
-- rebuilt a Simulator-side plat_pm_governance-equivalent taxonomy group to nest this under).
-- Simulator's Governance Actions CRUD-equivalent capability (the read-only register page) is
-- still built for parity (rule 34.1) — see apps/simulator/src/pages/governanceActions/* — just
-- not yet reachable from the Simulator sidebar's own menu tree.
-- ============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_governance_actions', 'Actions',
  'Unified Governance Action Register: a read-only rollup of Quality, Issue, and Lesson actions (Phase 12, v966z).',
  '/platform/governance-actions',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_governance' AND COALESCE(is_deleted, FALSE) = FALSE),
  3, 20, 'universal', 'list-todo', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_governance_actions' AND COALESCE(is_deleted, FALSE) = FALSE
)
AND EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_governance' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Copy grants from plat_pm_s_decision_log (the direct Governance sibling) onto the new row.

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_s_decision_log'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_governance_actions' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v966ab_phase12_governance_actions_sidebar_wire.sql applied successfully'; END $$;
