-- ============================================================================
-- v966al: Core PM Menu Rationalisation — Governance > Meetings (content-gap investigation item 5)
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md, Part A item 5 of the follow-up content-
-- gap pass (Governance's remaining sub-leaves: Stage Gates, Meetings — status was "unclear, needs
-- investigation" in every prior run).
--
-- MEETINGS — found live, wired mechanically. A real, fully-built Comms Hub / Meetings feature
-- exists (apps/platform/src/pages/comms/{MeetingList,MeetingDetail,MeetingSchedule,MeetingRoom,
-- MeetingSummaryView,MeetingExtractionReview}.jsx), routed at platformRoutes.jsx:1379
-- (`comms/meetings`, inside the `platform/*` prefix -> live path `/platform/comms/meetings`,
-- rendering MeetingList). Two live, active menu_items rows already reference this concept, and
-- they are a genuine same-page duplicate pair (Pattern-B, same mechanics as Risk Register/Work
-- Packages/Calendar consolidations earlier in this initiative):
--   - plat_tm_meetings ("Meetings", 6 grants, methodology='universal', parent plat_grp_tm_comms /
--     "Communications" under the Team Management track) -- STALE route_path stored as
--     `/platform/meetings`, which is NOT a registered route anywhere (confirmed via grep of
--     apps/platform/src/routes/*.jsx) -- same class of dead-link bug already found and fixed for
--     Timesheets (v966ag) and plat_pm_quality_testing (v966r, flagged not fixed there).
--   - pmo-comms-meetings ("Meetings", 3 grants, methodology='universal', parent_menu_id = NULL,
--     i.e. a root orphan today) -- route_path `/platform/comms/meetings` IS the correct, live,
--     registered route.
-- Fresh live grant check: pmo-comms-meetings' 3 roles are a strict subset of plat_tm_meetings' 6
-- roles (no unique grants to migrate) -- same "loser's grants already a subset of keeper's" outcome
-- as v966ae's Cluster B.
--
-- METHODOLOGY CHECK (the systemic Structured-track-lock risk that blocks Stage Gates/Closure
-- Report elsewhere in this pass does NOT apply here): both rows are methodology='universal', and
-- plat_tm_meetings' current parent chain (plat_grp_tm_comms -> plat_sec_team_section, itself a
-- LEGACY_CATEGORY_SHELL_CODE) is a ROLE-axis (Team Management) shell, not a methodology-axis
-- (Structured/Agile) one -- confirmed via packages/config/src/pmoMenuHierarchyUtils.js:
-- plat_grp_tm_comms survives today as a "childful orphan" (v946 rule, promoted to its own
-- top-level category with its 3 children -- Messages/Direct Messages/Meetings -- intact, since it
-- has 3 real DB children), so Meetings currently renders fine, just nested one level under a
-- generic "Communications" bucket instead of Governance. Re-parenting Meetings alone (still a
-- childless leaf, but now given a REAL DB parent, plat_pm_governance, itself already a normal,
-- non-shell, non-track-locked PM_CATEGORY_DEFS row used successfully by v966k/v966u/v966ab) nests
-- it as an ordinary child via buildHierarchy -- it never re-enters orphan/inference classification
-- at all, exactly the same safe mechanism already used for Decision Log / Approvals / Actions.
-- plat_grp_tm_comms keeps its other 2 children (Messages, Direct Messages) after this move, so it
-- stays childful and continues rendering correctly as its own category -- no group-goes-empty
-- side effect (unlike some earlier Phase 9 moves).
--
-- Grants: plat_tm_meetings keeps its own existing 6 grants (same-id re-parent, no migration
-- needed, per the standing Phase 9 no-migration-for-same-id-reparent pattern). pmo-comms-meetings'
-- 3 grants are migrated defensively first (WHERE NOT EXISTS guarded, even though live data shows
-- them already a full subset -- protects against any drift between investigation and run time)
-- before it is deactivated.
--
-- STAGE GATES (the other Governance sub-leaf this item covers) is NOT included in this file --
-- see the plan file's Part A item 5 write-up for why: a real, live, well-built page/route DOES
-- exist (plat_pm_s_stage_gates, "Stage Gate Reviews", /platform/stage-gates, 18 grants), but it is
-- methodology='structured' and lives inside plat_grp_pm_gov_standards, one of the same 4
-- Structured-track-locked groups (plat_grp_pm_pre_project/plat_grp_pm_proj_controls/
-- plat_grp_pm_del_reporting/plat_grp_pm_gov_standards) already extensively documented in Phase 9's
-- "systemic blocker" finding for Business Case/Mandate/Brief/PID/End Project Report. Re-parenting
-- it into the universal plat_pm_governance group would silently broaden its visibility to
-- Agile-track users, the exact regression risk PRD decision 12 was created to avoid. Flagged for
-- user confirmation, not silently decided either way -- see plan file.
--
-- Dedupe-collision check: pmoMenuSemanticDedupe.js has an `email:meetings` key
-- (/meetings|comms\/meetings|plat_email_meetings|pmo_comms_meetings/) but it is scoped to the PMO
-- layout's "Email & Notifications" bucket dedup, not the PM layout this file changes -- confirmed
-- via reading the surrounding function, unrelated to this move. No plat_pm_* orphan row competes
-- for this route either.
-- ============================================================================

-- ── Step 1: migrate pmo-comms-meetings' grants onto plat_tm_meetings (defensive; live data shows
--    them already a full subset) ────────────────────────────────────────────────────────────────

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, keeper.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items loser ON loser.id = src.menu_item_id AND loser.menu_code = 'pmo-comms-meetings'
JOIN public.menu_items keeper ON keeper.menu_code = 'plat_tm_meetings' AND COALESCE(keeper.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

UPDATE public.menu_items SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code = 'pmo-comms-meetings' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.role_menu_items rmi SET is_active = FALSE, updated_at = NOW()
FROM public.menu_items mi
WHERE rmi.menu_item_id = mi.id AND mi.menu_code = 'pmo-comms-meetings' AND COALESCE(rmi.is_deleted, FALSE) = FALSE;

-- ── Step 2: re-parent the keeper into Governance, fix its stale route_path ──────────────────────
-- Same-id re-parent (no grant migration for this step -- Step 1 already handled the loser's
-- grants). Label is already "Meetings" -- no relabel needed.

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_governance' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 50,
    route_path = '/platform/comms/meetings',
    updated_at = NOW()
WHERE menu_code = 'plat_tm_meetings' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966al_phase9_governance_meetings.sql applied successfully'; END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path, parent_menu_id, is_active
--   FROM public.menu_items WHERE menu_code IN ('plat_tm_meetings', 'pmo-comms-meetings');
--   -- expect plat_tm_meetings active, parent = plat_pm_governance's id, route '/platform/comms/meetings';
--   -- pmo-comms-meetings inactive.
--   SELECT count(*) FROM public.role_menu_items rmi JOIN public.menu_items mi ON mi.id = rmi.menu_item_id
--   WHERE mi.menu_code = 'plat_tm_meetings' AND rmi.can_view AND rmi.is_active AND NOT COALESCE(rmi.is_deleted, FALSE);
--   -- expect 6 (unchanged from before this file ran).
