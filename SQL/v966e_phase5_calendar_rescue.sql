-- ============================================================================
-- v966e: Core PM Menu Rationalisation — Phase 5: Calendar — rescue orphaned schedule calendar
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 5.
-- projectprd/v966_core_pm_menu_rationalisation_PRD.md decision 6.
--
-- Decision 6 names the schedule calendar (working days/holidays/exceptions) as canonical.
-- Its two menu rows are pm_project_calendar (/platform/projects/:id/schedule/calendar, 4 role
-- grants) and pm_project_calendar_exceptions (same route + /exceptions, 4 role grants) — both
-- were deliberately EXCLUDED from v966a's (Phase 0) dead-generation deletion specifically
-- because they carry real grants (see v966a header). However their DB parent, `pm_schedule_
-- group`, WAS deactivated by v966a (it was 0-grant dead scaffolding) — leaving these two rows
-- structurally orphaned (attached to an inactive parent) even though they themselves remain
-- active and granted. This SQL re-parents them under the live plat_grp_pm_projects group
-- (Projects, under plat_sec_universal) so they render again — no route or grant changes.
--
-- The plan's fuller Phase 5 ask (retire the generic team calendar `/platform/calendar` and the
-- v963 Universal Calendar into this one) is deliberately NOT done here — the plan itself
-- requires first verifying "what, if anything, those two offered that the schedule calendar
-- doesn't (e.g. org-wide non-project events)" before retiring either, and that verification
-- (comparing three live calendar implementations feature-by-feature) needs interactive/manual
-- testing this SQL-only pass can't safely perform. Deferred to a follow-up with that
-- verification done first, per the plan's own caution.
-- ============================================================================

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_projects' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    updated_at = NOW()
WHERE menu_code IN ('pm_project_calendar', 'pm_project_calendar_exceptions')
  AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966e_phase5_calendar_rescue.sql applied successfully'; END $$;
