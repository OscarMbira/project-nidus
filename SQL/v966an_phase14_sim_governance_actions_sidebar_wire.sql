-- ============================================================================
-- v966an: Core PM Menu Rationalisation — Phase 14: Simulator sidebar wire for Governance Action
-- Register
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 14.
--
-- Phase 12 (SQL/v966z/aa/ab) built the unified Governance Action Register for BOTH apps
-- (sim.unified_governance_actions_v view, apps/simulator/src/services/governanceActionService.js,
-- GovernanceActionsRegisterPage routed in apps/simulator/src/routes/simulatorRoutes.jsx at
-- `simulator/pmo/governance-actions/register`) but only wired a Platform sidebar entry (v966ab,
-- under plat_pm_governance) -- Simulator's sidebar wiring was explicitly deferred to Phase 14.
--
-- Unlike Milestones (v966am, a PM-scope leaf), Governance Actions' Simulator route is PMO-scoped
-- (`/simulator/pmo/governance-actions/register`, mirroring Simulator's own existing Approvals
-- register route shape exactly per Phase 12's own write-up) -- so it belongs in the Practice PMO
-- sidebar (useSimMenu('pmo')), not the Practice PM sidebar. Confirmed via apps/simulator/src/
-- hooks/useMenu.js's applySimulatorMenuTransform: `isSimNode()` for scope='pmo' matches on
-- `route_path` starting with `/simulator/pmo`, independent of menu_code prefix.
--
-- SIMULATOR PMO LAYOUT ARCHITECTURE (same finding as v966am's header, PMO side): SIM_PMO_
-- CATEGORY_DEFS' 10 buckets (packages/config/src/pmoMenuHierarchyUtils.js) are also synthetic
-- JS-only shells with no real menu_items row of their own -- every SIM PMO-layout leaf is placed
-- via inferSimPmoCategoryId()'s route/label regex on ORPHAN nodes (parent_menu_id = NULL). This is
-- the SAME mechanism Simulator's existing "Approvals Register" row already uses successfully today
-- (sim_unified_approvals_register, menu_code as-is, parent_menu_id = NULL, route
-- `/simulator/pmo/approvals/register`, label "Approvals Register" -- its label text matches
-- inferSimPmoCategoryId's `/workflow|authorisation|approval/` regex, landing it correctly under
-- "Practice Workflows & Governance", the closest Simulator equivalent to Platform's dedicated
-- Governance group).
--
-- "Governance Actions Register" as a label does NOT match any existing inferSimPmoCategoryId
-- regex branch (the existing `/practice governance|communication management/` branch requires
-- those exact phrases, not a bare "governance" substring) -- it would silently fall through to the
-- generic default bucket (sim_pmo_cat_project_delivery), which is not a clean semantic fit and
-- would separate it from its natural sibling "Approvals Register". A single small, precedented
-- regex-branch addition (same size/class of change as the Capacity/Resource-Directory/Timesheets
-- fixes already made 3 times earlier in this initiative -- v966n/v966t/v966ag) was made instead to
-- packages/config/src/pmoMenuHierarchyUtils.js's inferSimPmoCategoryId(): a `/governance action/`
-- match routes to 'sim_pmo_cat_workflows', the same bucket Approvals Register already lands in --
-- this mirrors Platform's own placement (Governance Actions nested under the Governance group,
-- alongside Approvals) as closely as Simulator's existing architecture allows, without inventing
-- any new top-level category. This is NOT a full taxonomy mirror (see v966am's header for why that
-- is out of scope) -- it is one narrow, targeted classification fix for one new leaf, the same
-- pattern already used repeatedly and safely in this initiative.
--
-- Grants copied from the direct PMO sibling sim_unified_approvals_register (7 live grants, freshly
-- re-verified) -- same grant-copy-from-sibling pattern used throughout this initiative.
--
-- SIDEBAR_CACHE_VERSION in apps/simulator/src/utils/menuCacheUtils.js bumped in the same deploy as
-- this file + v966am + the inferSimPmoCategoryId regex addition, so a cached Simulator sidebar
-- picks up all 3 changes together (same discipline as every Platform-side Phase 9/11/12 bump).
-- ============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'sim_governance_actions_register', 'Governance Actions Register',
  'Unified read-only rollup of practice Issue and Lesson actions (Phase 12/14, v966aa/v966an). Practice Quality actions are omitted -- no sim-side Quality-action equivalent table exists (see v966aa header).',
  '/simulator/pmo/governance-actions/register',
  NULL,
  2, 30, 'universal', 'list-todo', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_governance_actions_register' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'sim_unified_approvals_register'
JOIN public.menu_items dst ON dst.menu_code = 'sim_governance_actions_register' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v966an_phase14_sim_governance_actions_sidebar_wire.sql applied successfully'; END $$;

-- MUST RUN with the matching JS change deployed (inferSimPmoCategoryId's new `/governance action/`
-- branch in packages/config/src/pmoMenuHierarchyUtils.js) -- otherwise this row still renders,
-- just under the generic sim_pmo_cat_project_delivery default bucket instead of alongside
-- Approvals Register under Practice Workflows & Governance.
--
-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path, parent_menu_id, is_active
--   FROM public.menu_items WHERE menu_code = 'sim_governance_actions_register';
--   SELECT count(*) FROM public.role_menu_items rmi JOIN public.menu_items mi ON mi.id = rmi.menu_item_id
--   WHERE mi.menu_code = 'sim_governance_actions_register' AND rmi.can_view AND rmi.is_active AND NOT COALESCE(rmi.is_deleted, FALSE);
--   -- expect 7 (matches sim_unified_approvals_register's live grant count as of this run).
