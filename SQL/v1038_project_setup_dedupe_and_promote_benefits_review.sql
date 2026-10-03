-- ============================================================================
-- v1038: Project Setup cleanup — dedupe stale Structured-track leftovers, promote
-- Benefits Review Plans to universal
-- ============================================================================
-- Follow-up to v981 (which promoted Mandate/Brief/Business Case/PID/Governance Framework from
-- the Structured track into a universal "Project Setup" group). Live audit found v981 never
-- deactivated the OLD, pre-v981 originals it was superseding — both generations were left
-- active simultaneously, so a Structured-track project shows BOTH "Initiation Hub" (with stale
-- v681-era Mandates/Briefs/Business Cases) AND "Project Setup" (with the correct, already-fixed
-- v981-era versions) at once:
--
--   plat_s_mandates       "Project Mandates" /pmo/mandates             (Initiation Hub, Structured)
--   plat_pm_s_mandate     "Project Mandate"  /pmo/mandates             (Project Setup, universal)
--   -- IDENTICAL route_path — same page, shown twice.
--
--   plat_s_briefs         "Project Briefs"  /platform/brief            (Initiation Hub, Structured)
--   plat_pm_s_brief       "Project Brief"   /pm/initiation/project-brief (Project Setup, universal)
--
--   plat_s_business_cases "Business Cases" /pmo/initiation/business-case (Initiation Hub, Structured)
--   plat_pm_s_business_case "Business Case" /pm/initiation/business-case (Project Setup, universal)
--   -- Confirmed (by reading the actual page components, not just the routes) that
--   -- BusinessCaseListPage.jsx (/pmo/initiation/business-case) and
--   -- PMInitiationBusinessCase.jsx (/pm/initiation/business-case) both render the exact same
--   -- BusinessCaseList component with a different basePath — a true duplicate, not two
--   -- features. The Structured-track copy's PMO-prefixed route is also the same shape as the
--   -- ORIGINAL stale-route bug this session started with (a PM-layout item pointing at a
--   -- PMO-only-gated route redirects to /pm/dashboard) — this duplicate is likely broken for
--   -- PM users today, not just redundant.
--
-- plat_s_pids was already fully migrated to Project Setup by an earlier pass (no duplicate;
-- confirmed live — it has zero remaining children under Initiation Hub).
--
-- plat_s_benefits_review "Benefits Review Plans" (/pm/initiation/benefits-review-plan) has NO
-- universal counterpart — v981 deliberately didn't touch it. Per this session's methodology-
-- architecture discussion: benefits tracking is no more Structured-specific than a Business
-- Case is (every methodology delivers against SOME promised benefit), so it's promoted here
-- alongside the dedupe, using the exact same re-parent pattern as v981 (same id, no grant
-- migration needed — role_menu_items is keyed by menu_item_id).
--
-- Once all 4 of Initiation Hub's real children are gone (3 deactivated as duplicates, 1
-- promoted out), the group itself is deactivated too — an empty group renders nothing anyway,
-- but leaving it live and pointless invites the same confusion again later. Pre-Project &
-- Initiation (plat_grp_pm_pre_project, the OTHER Structured-track group v981 emptied out by the
-- same promotion) is deactivated too, guarded by a live "has zero active children" check so this
-- migration can never silently hide a group that still has real content.
-- ============================================================================

-- ── 1. Promote Benefits Review Plans (same id, no grant migration — matches v981's pattern) ───

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_setup' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 2,
    methodology = 'universal',
    sort_order = 60,
    updated_at = NOW()
WHERE menu_code = 'plat_s_benefits_review' AND COALESCE(is_deleted, FALSE) = FALSE;

-- ── 2. Deactivate the 3 stale, pre-v981 Structured-track duplicates ────────────────────────────

UPDATE public.menu_items
SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code IN ('plat_s_mandates', 'plat_s_briefs', 'plat_s_business_cases')
  AND COALESCE(is_deleted, FALSE) = FALSE;

-- ── 3. Deactivate Initiation Hub — guarded: only if it now has zero active children ────────────

UPDATE public.menu_items parent
SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE parent.menu_code = 'plat_grp_initiation'
  AND COALESCE(parent.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM public.menu_items child
    WHERE child.parent_menu_id = parent.id
      AND COALESCE(child.is_deleted, FALSE) = FALSE
      AND child.is_active = TRUE
  );

-- ── 4. Deactivate Pre-Project & Initiation — same guard (v981 already emptied it out) ─────────

UPDATE public.menu_items parent
SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE parent.menu_code = 'plat_grp_pm_pre_project'
  AND COALESCE(parent.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM public.menu_items child
    WHERE child.parent_menu_id = parent.id
      AND COALESCE(child.is_deleted, FALSE) = FALSE
      AND child.is_active = TRUE
  );

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1038: Benefits Review Plans promoted to Project Setup; 3 stale Structured-track duplicates + any now-empty parent groups deactivated';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path, is_active, is_visible,
--     (SELECT menu_code FROM public.menu_items p WHERE p.id = m.parent_menu_id) AS parent_code
--   FROM public.menu_items m
--   WHERE menu_code IN (
--     'plat_grp_initiation', 'plat_grp_pm_pre_project', 'plat_pm_project_setup',
--     'plat_s_mandates', 'plat_s_briefs', 'plat_s_business_cases', 'plat_s_benefits_review'
--   )
--   ORDER BY parent_code, menu_code;
--   -- expect: plat_grp_initiation and plat_grp_pm_pre_project both is_active=false (if they had
--   -- no other undiscovered children); the 3 duplicates is_active=false; plat_s_benefits_review
--   -- is_active=true with parent_code = plat_pm_project_setup.
