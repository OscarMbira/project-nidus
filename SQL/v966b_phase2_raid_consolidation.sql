-- ============================================================================
-- v966b: Core PM Menu Rationalisation — Phase 2: RAID consolidation
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 2.
-- projectplan/v966_full_three_layout_menu_audit.md §2.4 (Pattern A vs Pattern B duplication).
--
-- Fresh verification (this session, via PostgREST against the live DB) confirmed the audit's
-- Risk Register finding still holds:
--   - plat_pm_risk_reg   (route /pm/controls/risk-register, live PM Controls & Registers tree,
--     under plat_sec_universal) — 23 role grants. CANONICAL — kept as-is, route unchanged.
--   - plat_oversight_risk (route /pmo/oversight/risk-register, PMO Oversight cross-project
--     rollup) — 3 role grants (account_owner/pmo_admin/system_admin). Confirmed via
--     apps/platform/src/routes/platformRoutes.jsx this renders a DIFFERENT component
--     (PMOOversightRiskRegister vs PMControlsRiskRegister) — a deliberate PMO cross-project
--     view, not an accidental duplicate (v879 precedent, audit's "Pattern A"). KEPT, untouched.
--   - plat_tl_controls   (route /platform/risks, "Team Management" track, legacy `<Risks/>`
--     component) — 4 role grants: account_owner, pm_team_manager, pmo_admin, system_admin.
--     This is the genuinely superseded legacy row (Pattern B) — decision 1 (collapse
--     role-track duplication) + decision 2 (prefer the newer /pm/controls/... implementation).
--     Only `pm_team_manager` is NOT already granted on plat_pm_risk_reg — migrated below before
--     deactivating the row, so no role loses visibility (PRD user story 2).
--
-- Issue Register and Change Log were audited too: only plat_pm_issue_log (23 grants) /
-- plat_pm_change_log (23 grants) exist as PM-track rows for those two concepts — no
-- plat_tl_* legacy duplicate was found for either (only Risk Register had one under the Team
-- Management track). plat_oversight_issue / plat_oversight_change are the deliberate PMO
-- Oversight rollups, same Pattern A reasoning — plat_oversight_issue is left untouched here;
-- plat_oversight_change is handled by v966c (Phase 3) per that phase's explicit instruction.
--
-- Dependencies (Phase 2 second bullet): confirmed via fresh query that every existing
-- `dependencies`/`dependencies_*`/`programme_dependencies` menu_items row has ZERO role
-- grants — the /platform/dependencies page (confirmed registered:
-- apps/platform/src/routes/platformRoutes.jsx `<Route path="dependencies" .../>` under the
-- /platform/* prefix, rendering <Dependencies/>) is not reachable from any sidebar today. This
-- is a genuine gap, not a duplicate to remove — wired here as a new leaf under RAID's existing
-- Core Controls group (plat_pm_ctrl_core, sibling of Risk/Issue/Change/Delay/Assumptions),
-- granted with the same role set as plat_pm_risk_reg. A second "Planning > Dependencies" menu
-- location (per the plan's full instruction) is deferred to Phase 9, since no "Planning"
-- top-level discipline group exists in the live tree yet to nest it under.
-- ============================================================================

-- ── Migrate plat_tl_controls' unique grant (pm_team_manager) onto plat_pm_risk_reg ──────────

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, keeper.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items loser ON loser.id = src.menu_item_id AND loser.menu_code = 'plat_tl_controls'
JOIN public.menu_items keeper ON keeper.menu_code = 'plat_pm_risk_reg' AND COALESCE(keeper.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- Deactivate the now-superseded legacy row and its grants (deactivate, not delete — v965 pattern).
UPDATE public.menu_items SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code = 'plat_tl_controls' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.role_menu_items rmi SET is_active = FALSE, updated_at = NOW()
FROM public.menu_items mi
WHERE rmi.menu_item_id = mi.id AND mi.menu_code = 'plat_tl_controls' AND COALESCE(rmi.is_deleted, FALSE) = FALSE;

-- ── Wire Dependency Register (real page, previously reachable by no one) ────────────────────

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'plat_pm_dependencies_reg', 'Dependency Register',
  'Cross-task and cross-project dependency tracking (RAID-adjacent register)',
  '/platform/dependencies',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_ctrl_core' AND COALESCE(is_deleted, FALSE) = FALSE),
  4, 60, 'universal', 'git-branch', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_dependencies_reg' AND COALESCE(is_deleted, FALSE) = FALSE);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_risk_reg'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_dependencies_reg' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v966b_phase2_raid_consolidation.sql applied successfully'; END $$;
