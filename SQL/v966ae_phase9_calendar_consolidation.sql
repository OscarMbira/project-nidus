-- ============================================================================
-- v966ae: Core PM Menu Rationalisation — Phase 9: Calendar consolidation (2 clusters)
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9 / Phase 5's deferred bullet
-- ("Retiring the generic team calendar / v963 Universal Calendar into the schedule calendar --
-- not attempted, needs a live feature-by-feature comparison"). User decision this run: dedupe
-- the two GENERIC calendar duplicate clusters into one canonical row each (this file). This is
-- NOT the same as Phase 5's still-deferred "retire the generic calendar into the project-scoped
-- schedule calendar" question -- that is a cross-feature merge (generic org calendar vs.
-- project-scoped schedule calendar) still left open; this file only collapses same-route,
-- same-feature duplicate menu rows pointing at the SAME page.
--
-- ── Cluster A: route /platform/calendar ──────────────────────────────────────────────────────
-- Fresh live query confirms 4 live (non-deleted) rows share this exact route:
--   - plat_pm_calendar   (12 grants) -- correctly labeled "Calendar", parent plat_sec_universal.
--     KEEPER (broadest, correctly labeled).
--   - plat_pm_leave_cal  (12 grants) -- mislabeled "Leave Calendar" but renders the identical
--     generic calendar page (same route, same component) -- LOSER.
--   - plat_tm_calendar   (5 grants) -- Team Management track duplicate -- LOSER.
--   - plat_tm_team_calendar (5 grants) -- Team Management track duplicate -- LOSER.
-- (A 5th row, platform_section_*-generation platform_calendar, is already is_deleted=true from
-- Phase 0/v966a -- excluded automatically by the COALESCE(is_deleted, FALSE) = FALSE guards
-- below, not part of this consolidation.)
-- Grant counts all confirmed live via PostgREST this session -- exactly match the brief's
-- estimates (12/12/5/5), no correction needed.
--
-- 3 losers combined -- per the v966d lesson (ON CONFLICT DO UPDATE cannot affect the same row
-- twice within one INSERT), role_id is deduped in a subquery before joining to the single
-- keeper row, so a role granted on more than one loser only contributes one output row.
--
-- ── Cluster B: route /platform/tasks/calendar ────────────────────────────────────────────────
-- Fresh live query confirms 4 live (non-deleted) rows share this exact route:
--   - plat_pm_task_calendar (12 grants) -- correctly labeled "Task Calendar" -- KEEPER.
--   - plat_tm_task_calendar (5 grants) -- Team Management track duplicate -- LOSER.
--   - mkt_reuse_calendar / mkt_reuse_campaign_schedule -- Marketing INDUSTRY PACK rows (v930-era
--     industry-pack menu generation). Deliberately NOT touched: industry packs (taxonomy §4-15)
--     are explicitly out of scope for this PRD (see PRD "explicitly out of scope" section) --
--     left exactly as-is even though they happen to share this route.
-- (3 dead platform_section_*/tm_section_*/pm_*-generation rows at this same route --
-- tasks_calendar, tm_task_calendar, pm_tasks_calendar -- are already is_deleted=true from Phase
-- 0, excluded automatically, not part of this consolidation.)
-- ============================================================================

-- ── Cluster A: migrate unique grants from the 3 losers onto plat_pm_calendar ─────────────────

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.role_id, keeper.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM (
  SELECT DISTINCT src.role_id
  FROM public.role_menu_items src
  JOIN public.menu_items loser ON loser.id = src.menu_item_id
    AND loser.menu_code IN ('plat_pm_leave_cal', 'plat_tm_calendar', 'plat_tm_team_calendar')
  WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
) r
JOIN public.menu_items keeper ON keeper.menu_code = 'plat_pm_calendar' AND COALESCE(keeper.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

UPDATE public.menu_items SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code IN ('plat_pm_leave_cal', 'plat_tm_calendar', 'plat_tm_team_calendar')
  AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.role_menu_items rmi SET is_active = FALSE, updated_at = NOW()
FROM public.menu_items mi
WHERE rmi.menu_item_id = mi.id
  AND mi.menu_code IN ('plat_pm_leave_cal', 'plat_tm_calendar', 'plat_tm_team_calendar')
  AND COALESCE(rmi.is_deleted, FALSE) = FALSE;

-- ── Cluster B: migrate the 1 loser's unique grants onto plat_pm_task_calendar ────────────────

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, keeper.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items loser ON loser.id = src.menu_item_id AND loser.menu_code = 'plat_tm_task_calendar'
JOIN public.menu_items keeper ON keeper.menu_code = 'plat_pm_task_calendar' AND COALESCE(keeper.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

UPDATE public.menu_items SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code = 'plat_tm_task_calendar' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.role_menu_items rmi SET is_active = FALSE, updated_at = NOW()
FROM public.menu_items mi
WHERE rmi.menu_item_id = mi.id AND mi.menu_code = 'plat_tm_task_calendar' AND COALESCE(rmi.is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966ae_phase9_calendar_consolidation.sql applied successfully'; END $$;
