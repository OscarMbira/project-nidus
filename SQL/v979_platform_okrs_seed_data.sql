-- =============================================================================
-- v979: Seed Data — Platform section: Strategy & OKRs group (all 4 leaves:
-- OKR Dashboard, Objectives & Key Results, Alignment Map, OKR Check-ins — all
-- render the same underlying okr_cycles/objectives/key_results data).
-- public.okr_cycles / public.objectives / public.key_results all had 0 rows
-- system-wide.
-- Prerequisites: v643 (OKR tables, PMIS gap tier 1).
-- Idempotent: fixed hex-only UUIDs + ON CONFLICT (id) DO NOTHING. Safe to re-run.
-- Display IDs: okr_cycles.cycle_code is a plain required text field with no
--   admin display-id trigger wired — hand-assigned SEED-* code.
-- Scope note: OKRs are account-level (not project-scoped — no project_id
--   column), so this seed attaches to an existing accounts row rather than a
--   specific anchor project.
-- =============================================================================

DO $$
DECLARE
  v_account_id UUID;
  v_user_id    UUID;
  v_auth_uid   UUID;

  v_cycle UUID := '97900001-0c01-4a01-9c01-534433340001';
  v_obj1  UUID := '97900002-0b01-4a01-9c01-534433340001';
  v_obj2  UUID := '97900002-0b01-4a01-9c01-534433340002';
BEGIN

  SELECT id INTO v_account_id FROM public.accounts LIMIT 1;
  IF v_account_id IS NULL THEN
    RAISE NOTICE 'v979: No accounts row found — OKR tables are account-scoped. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_user_id FROM public.users WHERE COALESCE(is_deleted, false) = false LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v979: No user available to attribute seed rows. Skipping.';
    RETURN;
  END IF;

  SELECT auth_user_id INTO v_auth_uid FROM public.users WHERE id = v_user_id LIMIT 1;
  IF v_auth_uid IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_uid::text)::text, true);
  END IF;

  -- NOTE (2026-08-24): okr_cycles.created_by and objectives.owner_user_id/created_by all
  -- REFERENCE auth.users(id), not public.users(id) (v643_pmis_gap_tables_tier1.sql) — using
  -- v_user_id (a public.users.id) would violate the FK. Switched to v_auth_uid throughout,
  -- same fix as v978's team_charters (created_by REFERENCES auth.users(id) there too).

  -- ---------------------------------------------------------------------------
  -- OKR CYCLE (public.okr_cycles)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.okr_cycles (
    id, account_id, cycle_name, cycle_code, period_type, start_date, end_date,
    status, created_by, is_deleted, created_at, updated_at
  ) VALUES
    (v_cycle, v_account_id, 'Q3 Delivery Excellence Cycle', 'SEED-OKR-Q3', 'quarter',
     CURRENT_DATE - 45, CURRENT_DATE + INTERVAL '45 days',
     'active', v_auth_uid, false, NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days')
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- OBJECTIVES (public.objectives)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.objectives (
    id, account_id, cycle_id, owner_user_id, objective_title, objective_description,
    scope_level, health_status, progress_pct,
    created_by, is_deleted, created_at, updated_at
  ) VALUES
    (v_obj1, v_account_id, v_cycle, v_auth_uid,
     'Improve on-time delivery across active seed projects',
     'Raise the proportion of milestones delivered on or before their baseline date across the active project portfolio.',
     'organisation', 'on_track', 62,
     v_auth_uid, false, NOW() - INTERVAL '45 days', NOW() - INTERVAL '5 days'),

    (v_obj2, v_account_id, v_cycle, v_auth_uid,
     'Reduce open high-severity defects at go-live',
     'Cut the number of open high/critical severity defects carried into go-live across projects in the UAT phase.',
     'organisation', 'at_risk', 40,
     v_auth_uid, false, NOW() - INTERVAL '40 days', NOW() - INTERVAL '3 days')
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- KEY RESULTS (public.key_results)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.key_results (
    id, objective_id, kr_title, kr_description, target_value, current_value,
    baseline_value, unit_label, health_status, progress_pct, sort_order,
    is_deleted, created_at, updated_at
  ) VALUES
    ('97900003-2201-4a01-9c01-534433340001', v_obj1, 'On-time milestone percentage',
     'Percentage of milestones delivered on or before their baseline date.',
     90, 76, 65, '%', 'on_track', 68, 1,
     false, NOW() - INTERVAL '45 days', NOW() - INTERVAL '5 days'),

    ('97900003-2201-4a01-9c01-534433340002', v_obj1, 'Average schedule variance',
     'Average schedule variance (days) across active projects, lower is better.',
     0, 3, 8, 'days', 'on_track', 56, 2,
     false, NOW() - INTERVAL '45 days', NOW() - INTERVAL '5 days'),

    ('97900003-2201-4a01-9c01-534433340003', v_obj2, 'Open high/critical defects at go-live',
     'Count of open high or critical severity defects at the point of go-live decision.',
     0, 3, 8, 'count', 'at_risk', 45, 1,
     false, NOW() - INTERVAL '40 days', NOW() - INTERVAL '3 days')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'v979: Platform Strategy & OKRs seed complete (cycle, objectives, key results).';

END $$;
