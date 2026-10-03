-- =============================================================================
-- v978: Seed Data — Teams group (Core PM sidebar): Team Charter leaf only.
-- public.team_charters had 0 rows system-wide.
-- Other Teams leaves, not seeded here:
--   - All Teams / My Team -> computed from public.project_memberships, which
--     SQL/v971 (Resources group) already populated for the anchor projects.
--   - Skill Matrix (menu route_path '/platform/resources/skills') -> no
--     matching <Route> found anywhere in apps/platform/src/routes/** or
--     packages/modules/** — the sidebar leaf appears unwired (dead link),
--     same pattern as "Scenario Planning" flagged in v970. No live table/page
--     to seed.
--   - Leave Calendar -> the live menu_items row for this leaf has
--     is_visible = false (confirmed via a direct query of the DB), so it is
--     not currently reachable in the sidebar at all — skipped.
--   - Manage Roles -> organisation-level custom role configuration (admin/
--     config surface), not a per-project demo register — out of scope for
--     this data-seed pass.
-- Prerequisites: v305 (anchor projects), v971 (project_memberships), team
--                charter table migration (public.team_charters).
-- Idempotent: fixed hex-only UUIDs + ON CONFLICT (id) DO NOTHING. Safe to re-run.
-- Display IDs: no reference/display-id column on team_charters.
-- CORRECTED 2026-08-24: version_number is INTEGER NOT NULL (was '1.0', a text/decimal literal
--   -- ERROR 22P02). Also, team_charters.created_by/updated_by REFERENCE auth.users(id), NOT
--   public.users(id) like every other seed table in this batch -- v_user_id (a public.users.id)
--   would have violated the FK the moment the version_number fix let the INSERT proceed further;
--   switched to v_auth_uid (already fetched, just unused by this file until now).
-- =============================================================================

DO $$
DECLARE
  v_proj_dw UUID; -- SEED-PP-01 Digital Workspace Rollout
  v_proj_bi UUID; -- SEED-PP-02 BI Platform Implementation
  v_user_id UUID;
  v_auth_uid UUID;
BEGIN

  SELECT id INTO v_proj_dw FROM public.projects WHERE project_code = 'SEED-PP-01' AND COALESCE(is_deleted, false) = false LIMIT 1;
  SELECT id INTO v_proj_bi FROM public.projects WHERE project_code = 'SEED-PP-02' AND COALESCE(is_deleted, false) = false LIMIT 1;

  IF v_proj_dw IS NULL OR v_proj_bi IS NULL THEN
    RAISE NOTICE 'v978: Anchor seed projects (SEED-PP-01/02) not found — run v305 first. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_user_id FROM public.users WHERE COALESCE(is_deleted, false) = false LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v978: No user available to attribute seed rows. Skipping.';
    RETURN;
  END IF;

  SELECT auth_user_id INTO v_auth_uid FROM public.users WHERE id = v_user_id LIMIT 1;
  IF v_auth_uid IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_uid::text)::text, true);
  END IF;

  INSERT INTO public.team_charters (
    id, project_id, title, purpose, objectives, values, ways_of_working, norms,
    communication_plan, version_number, status, created_by, created_at, updated_at
  ) VALUES
    ('97800001-7c01-4a01-9c01-534433340001', v_proj_dw, 'Digital Workspace Rollout Team Charter',
     'Establish shared ways of working for the cross-functional rollout team across IT, Regional Ops, and Change Management.',
     'Deliver wave 1 and wave 2 rollout on schedule; keep helpdesk ticket volume within agreed thresholds; maintain staff satisfaction above 80%.',
     'Transparency, proactive communication, and no-blame incident reviews.',
     'Daily 15-minute stand-up at 09:00; weekly steering committee prep on Thursdays; async updates via the project daily log.',
     'Raise blockers within 24 hours; all decisions logged in the Decision Log; no silent scope changes.',
     'Weekly status email to stakeholders; monthly steering committee briefing; ad-hoc updates for high-severity issues.',
     1, 'active', v_auth_uid, NOW() - INTERVAL '95 days', NOW() - INTERVAL '95 days'),

    ('97800001-7c01-4a01-9c01-534433340002', v_proj_bi, 'BI Platform Implementation Team Charter',
     'Align the BI delivery team on shared expectations for data quality, testing rigor, and stakeholder communication.',
     'Achieve UAT sign-off with zero critical defects; deliver month-end reporting cycle under 4 working days.',
     'Data accuracy first; peer review on all report definitions; document every data lineage decision.',
     'Bi-weekly sprint reviews; async Slack-style updates for defect triage; dedicated UAT support office hours.',
     'All defects logged with reproducible steps; no report published without peer sign-off.',
     'Weekly accuracy validation snapshot to the Finance Director; go/no-go review 2 weeks before go-live.',
     1, 'active', v_auth_uid, NOW() - INTERVAL '100 days', NOW() - INTERVAL '100 days')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'v978: Teams (Team Charter) seed complete for SEED-PP-01/02.';

END $$;
