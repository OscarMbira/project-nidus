-- =============================================================================
-- v977: Seed Data — Projects group: My Daily Log leaf only.
-- public.daily_logs / public.daily_log_entries had 0 rows for the anchor
-- seed projects (12 daily_log_entries exist system-wide, tied to a different,
-- non-anchor project). All other Projects group leaves (My Projects, All
-- Projects, Create Project, Archives/On Hold, Manage Members) are already
-- populated by the existing 20 SQL/v305 seed projects — skipped.
-- Prerequisites: v305 (anchor projects), v166 (daily_logs/daily_log_entries).
-- Idempotent: fixed hex-only UUIDs + ON CONFLICT (id) DO NOTHING. Safe to re-run.
-- Display IDs (CORRECTED 2026-08-24): daily_logs.log_reference is UNIQUE NOT NULL.
--   generate_log_reference() (v166) does NOT exist live (ERROR 42883) — confirmed only one
--   existing daily_logs row (log_reference = 'DL-2026-001'), so nothing here actually depends
--   on that function working. Hand-assigned two DL-YYYY-NNN-format values instead, distinct
--   from the existing row and from each other. daily_log_entries.entry_code has no trigger of
--   its own visible in v166; left NULL so it stays consistent with existing rows if a trigger
--   exists, otherwise the app assigns it on next edit.
-- =============================================================================

DO $$
DECLARE
  v_proj_dw UUID; -- SEED-PP-01 Digital Workspace Rollout
  v_proj_bi UUID; -- SEED-PP-02 BI Platform Implementation
  v_user_id UUID;
  v_auth_uid UUID;

  v_log_dw UUID := '97700001-d101-4a01-9c01-534433340001';
  v_log_bi UUID := '97700001-d101-4a01-9c01-534433340002';
BEGIN

  SELECT id INTO v_proj_dw FROM public.projects WHERE project_code = 'SEED-PP-01' AND COALESCE(is_deleted, false) = false LIMIT 1;
  SELECT id INTO v_proj_bi FROM public.projects WHERE project_code = 'SEED-PP-02' AND COALESCE(is_deleted, false) = false LIMIT 1;

  IF v_proj_dw IS NULL OR v_proj_bi IS NULL THEN
    RAISE NOTICE 'v977: Anchor seed projects (SEED-PP-01/02) not found — run v305 first. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_user_id FROM public.users WHERE COALESCE(is_deleted, false) = false LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v977: No user available to attribute seed rows. Skipping.';
    RETURN;
  END IF;

  SELECT auth_user_id INTO v_auth_uid FROM public.users WHERE id = v_user_id LIMIT 1;
  IF v_auth_uid IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_uid::text)::text, true);
  END IF;

  -- ---------------------------------------------------------------------------
  -- DAILY LOG PARENT ROWS (public.daily_logs)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.daily_logs (
    id, project_id, log_reference, created_by, visibility, is_active, created_at, updated_at
  ) VALUES
    (v_log_dw, v_proj_dw, 'DL-2026-900', v_user_id, 'team', true, NOW() - INTERVAL '20 days', NOW() - INTERVAL '1 day'),
    (v_log_bi, v_proj_bi, 'DL-2026-901', v_user_id, 'team', true, NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days')
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- DAILY LOG ENTRIES (public.daily_log_entries)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.daily_log_entries (
    id, daily_log_id, entry_number, entry_date, entry_type, description,
    person_responsible_id, target_date, status, priority, tags,
    created_by, created_at, updated_at
  ) VALUES
    ('97700002-de01-4a01-9c01-534433340001', v_log_dw, 1, CURRENT_DATE - 10, 'event',
     'Wave 1 device provisioning completed for all HQ floors ahead of schedule.',
     v_user_id, NULL, 'completed', 'medium', ARRAY['rollout', 'wave1'],
     v_user_id, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),

    ('97700002-de01-4a01-9c01-534433340002', v_log_dw, 2, CURRENT_DATE - 3, 'problem',
     'Wave 2 hardware delivery running behind vendor commitment; tracked as DLY-001 on the Delay Register.',
     v_user_id, CURRENT_DATE + INTERVAL '10 days', 'open', 'high', ARRAY['hardware', 'wave2'],
     v_user_id, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

    ('97700002-de01-4a01-9c01-534433340003', v_log_bi, 1, CURRENT_DATE - 5, 'decision',
     'Confirmed shared Power BI Premium capacity model for all business units (see Decision Log).',
     v_user_id, NULL, 'completed', 'low', ARRAY['licensing'],
     v_user_id, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'v977: Projects (Daily Log) seed complete for SEED-PP-01/02.';

END $$;
