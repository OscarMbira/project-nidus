-- ============================================================================
-- v966f: Core PM Menu Rationalisation — Phase 6: wire already-built, unlinked pages
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 6.
-- projectprd/v966_core_pm_menu_rationalisation_PRD.md user story 3.
--
-- Scope completed in this pass (each route was individually confirmed registered in
-- apps/platform/src/routes/ before wiring — see per-item note):
--
--   1. RACI Matrix (GAP-10) — route /platform/planning/raci, confirmed registered in
--      apps/platform/src/modules/pmis-gaps/routes/PmisGapRoutes.jsx (-> <RaciListPage/>).
--      The existing menu_items row `platform_raci_matrix` already has this exact route but was
--      deactivated by v966a (Phase 0) as part of the dead `platform_section_*` generation (it
--      had 0 grants at the time, correctly identified as dead). Reactivated here, re-parented
--      under the live Teams group (plat_grp_pm_teams, under plat_sec_universal), and granted
--      the same role set as its new sibling plat_pm_skill_matrix (Skill Matrix, 12 roles) —
--      matching PRD user story 3's target location intent ("Project Team > RACI") as closely as
--      the current live tree allows; Phase 9's full taxonomy rebuild will move it to its exact
--      "Project Setup > Project Team" home once that group exists.
--   2. Team Charter — route /platform/team-charter, confirmed registered in
--      apps/platform/src/routes/platformRoutes.jsx (-> <TeamCharterPage/>). Already reachable
--      today via `plat_tl_charter` under the Team Management track (plat_grp_tl_team, 4 role
--      grants: account_owner/pm_team_manager/pmo_admin/system_admin) — but not from the live
--      Universal/PM tree most users see (PRD user story 3's complaint). Re-parented under
--      plat_grp_pm_teams and its grants broadened to the same 12-role set as plat_pm_skill_
--      matrix (additive only — its original 4 roles are a subset already covered by that set,
--      confirmed by fresh query, so no grant is lost).
--   3. S-Curve & Baselines (GAP-14) — route /pm/planning/s-curve, confirmed registered
--      (renders the same <SCurvePage/> as /platform/planning/s-curve and /pmo/planning/s-curve,
--      all three registered in PmisGapRoutes.jsx). Existing row `plat_pm_a_scurve` already has
--      12 role grants but lives under the Agile-track-only plat_grp_pm_planning_tools group
--      (plat_sec_agile). Per decision/plan text ("baselining is methodology-neutral"),
--      re-parented under plat_grp_pm_reporting (Reporting & Analytics, live Universal tree) and
--      its `methodology` column changed from 'agile' to 'universal' to match. No grant changes
--      — it keeps its existing 12 roles as-is.
--
-- Deliberately NOT done in this pass (deferred — see plan file Phase 6 notes):
--   - Scope Statement / WBS Builder / Activity Register-Gantt / Schedule Management Plan /
--     Quality Reviews / Testing Centre dashboard / Executive Dashboard: each needs either a
--     route-param-substitution check (`:id` stored on the dead menu row vs `:projectId` in the
--     actual registered route — unconfirmed whether the app's menu-click navigation
--     substitutes correctly) or a same-vs-different-page verification (Testing Centre's
--     `/platform/testing-centre` vs the already-live `plat_pm_quality_testing` at
--     `/platform/testing/dashboard` — unclear if these are the same feature under two paths or
--     two different pages) that this pass didn't have a safe way to confirm. Left for Phase 13
--     ("verify... only extend where a real gap is confirmed") or a dedicated follow-up.
--   - Executive Dashboard: confirmed intentionally orphaned (audit §2.3 — explicitly excluded
--     from the PM sidebar by code, "org-wide executive page, not a project-scoped sidebar
--     child"). Not a gap; left untouched.
-- ============================================================================

-- ── 1. RACI Matrix — reactivate + re-parent + grant ─────────────────────────────

UPDATE public.menu_items
SET is_active = TRUE,
    is_visible = TRUE,
    parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_teams' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 200,
    updated_at = NOW()
WHERE menu_code = 'platform_raci_matrix' AND COALESCE(is_deleted, FALSE) = FALSE;

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_skill_matrix'
JOIN public.menu_items dst ON dst.menu_code = 'platform_raci_matrix' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- ── 2. Team Charter — re-parent + broaden grants (additive) ────────────────────

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_teams' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 210,
    updated_at = NOW()
WHERE menu_code = 'plat_tl_charter' AND COALESCE(is_deleted, FALSE) = FALSE;

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_skill_matrix'
JOIN public.menu_items dst ON dst.menu_code = 'plat_tl_charter' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- ── 3. S-Curve & Baselines — re-parent to methodology-neutral home ─────────────

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_reporting' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    methodology = 'universal',
    sort_order = 100,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_a_scurve' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966f_phase6_wire_unlinked_pages.sql applied successfully'; END $$;
