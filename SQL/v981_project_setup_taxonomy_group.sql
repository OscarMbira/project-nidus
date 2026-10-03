-- ============================================================================
-- v981: Build "Project Setup" as a real, universal top-level taxonomy group
-- ============================================================================
-- Reverses PRD decision 12's "leave it out" resolution for Project Setup specifically
-- (Scope & Deliverables, Closure Report, and Stage Gates are UNAFFECTED by this file and
-- remain deliberately out of scope) -- the user found the omission caused real findability
-- problems and explicitly chose, after being shown the tradeoff, to accept the minor
-- methodology-visibility broadening this requires (PRD decision 16).
--
-- Re-parents 5 existing, already-live, already-granted leaves out of the Structured-track-
-- wrapped groups they currently sit in (plat_grp_pm_pre_project, plat_grp_gov_standards) into
-- a brand-new, universal, top-level plat_pm_project_setup group:
--   - plat_pm_s_mandate      "Project Mandate"       /pmo/mandates                (structured -> universal)
--   - plat_pm_s_brief        "Project Brief"         /platform/brief              (structured -> universal)
--   - plat_pm_s_business_case "Business Case"        /pmo/initiation/business-case (structured -> universal)
--   - plat_pm_s_gov_framework "Governance Framework" /platform/governance/framework (structured -> universal)
--   - plat_s_pids            "Project Initiation Documents (PIDs)" /platform/initiation/pids (structured -> universal)
--
-- Same-id re-parent for all 5 -- role_menu_items grants are keyed by menu_item_id, so no grant
-- migration is needed (identical pattern to every other Phase 9 re-parent in this initiative).
-- The new plat_pm_project_setup root itself needs no role_menu_items row of its own -- its
-- visibility as a category is derived purely from whether it has any visible children for a
-- given role (same structural pattern as plat_pm_raid/plat_pm_governance/etc.).
--
-- METHODOLOGY: each leaf's own `methodology` column is updated structured -> universal. Per this
-- session's earlier investigation, a leaf's own methodology value is inert for PM-layout
-- filtering purposes (only categoryMethodologyTrack(catId) on a node's own menu_code, checked
-- against TRACK_CHILD_CATEGORY_IDS, controls visibility) -- the REAL unlock is moving these leaves
-- out of plat_grp_pm_pre_project/plat_grp_gov_standards (both members of TRACK_CHILD_CATEGORY_IDS'
-- structured track) into plat_pm_project_setup (a plain, non-track category, so
-- wrapPmoMenuWithMethodologyTracks()/filterMenuTreeByVisibleTracks() never gates it regardless of
-- the org/project's visible-tracks setting). The methodology column update is done anyway for
-- data honesty (avoiding a "universal group, leaves still individually tagged structured" state).
--
-- Dedupe-collision check: pmoMenuSemanticDedupe.js has real semantic keys for mandate/business-
-- case/pid content (init:mandate:*, init:business-case:*, gov:pid), but dedupePmoMenuSiblings()/
-- dedupePmoMenuTree() only compare SIBLINGS under the same parent -- these 5 leaves are moving
-- together into a brand-new, currently-empty group with no other children, and none of the 5
-- share a semantic key with each other, so no collision risk.
--
-- MUST RUN with the matching JS change deployed (plat_pm_project_setup added to
-- PM_CATEGORY_DEFS in packages/config/src/pmoSidebarCategories.js) -- without it the new group
-- would still render (v946's childful-orphan-promotion rule catches any top-level DB root with
-- real children regardless of PM_CATEGORY_DEFS membership), but with a lower-quality fallback
-- label/ordering instead of the intended "Project Setup" label at a sensible position.
--
-- Platform sidebar only -- Simulator's own taxonomy mirror remains deferred to the Phase 14
-- follow-up initiative (PRD decision 15), same as every other Phase 9-shaped group this session.
-- ============================================================================

-- ── 1. Create the new top-level "Project Setup" root ─────────────────────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_project_setup', 'Project Setup',
  'Project initiation artefacts: mandate, brief, business case, PID, and governance framework (taxonomy §3, Project Setup).',
  NULL, NULL, 1, 22, 'universal', 'file-plus', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_project_setup' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- ── 2. Re-parent the 5 leaves (same id, no grant migration, methodology -> universal) ────────

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_setup' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 2,
    methodology = 'universal',
    sort_order = 10,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_s_mandate' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_setup' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 2,
    methodology = 'universal',
    sort_order = 20,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_s_brief' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_setup' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 2,
    methodology = 'universal',
    sort_order = 30,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_s_business_case' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_setup' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 2,
    methodology = 'universal',
    sort_order = 40,
    updated_at = NOW()
WHERE menu_code = 'plat_s_pids' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_setup' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 2,
    methodology = 'universal',
    sort_order = 50,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_s_gov_framework' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v981_project_setup_taxonomy_group.sql applied successfully'; END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, parent_menu_id, methodology, is_active
--   FROM public.menu_items
--   WHERE menu_code IN ('plat_pm_project_setup', 'plat_pm_s_mandate', 'plat_pm_s_brief',
--                        'plat_pm_s_business_case', 'plat_s_pids', 'plat_pm_s_gov_framework');
--   -- expect all 6 active, the 5 leaves' parent_menu_id = plat_pm_project_setup's id,
--   -- methodology = 'universal' on all 5.
