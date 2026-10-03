-- =============================================================================
-- v973: Seed Data — Project Closure group (Core PM sidebar).
-- Covers: "Closing a Project" (public.project_closures — 0 rows system-wide).
-- Lessons Log (public.lessons_learned) already has 30 rows for the anchor seed
-- projects — skipped, matching the "Template Library was already populated"
-- precedent.
-- Prerequisites: v305 (anchor projects), v30 (project_closures), v963z
-- (benefits_transition_status / archived_at columns).
-- Idempotent: fixed hex-only UUIDs + ON CONFLICT (id) DO NOTHING. Safe to re-run.
-- Display IDs: closure_reference is a plain optional text field with no admin
--   display-id trigger wired — left NULL.
-- =============================================================================

DO $$
DECLARE
  v_proj_erp UUID; -- SEED-PP-03 ERP Phase 1 (an in-flight, not-yet-closed project)
  v_proj_leg UUID; -- SEED-IND-05 Independent Legacy Decommission (a natural closure candidate)
  v_user_id  UUID;
  v_auth_uid UUID;
BEGIN

  SELECT id INTO v_proj_erp FROM public.projects WHERE project_code = 'SEED-PP-03' AND COALESCE(is_deleted, false) = false LIMIT 1;
  SELECT id INTO v_proj_leg FROM public.projects WHERE project_code = 'SEED-IND-05' AND COALESCE(is_deleted, false) = false LIMIT 1;

  IF v_proj_erp IS NULL OR v_proj_leg IS NULL THEN
    RAISE NOTICE 'v973: One or more anchor seed projects (SEED-PP-03, SEED-IND-05) not found — run v305 first. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_user_id FROM public.users WHERE COALESCE(is_deleted, false) = false LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v973: No user available to attribute seed rows. Skipping.';
    RETURN;
  END IF;

  SELECT auth_user_id INTO v_auth_uid FROM public.users WHERE id = v_user_id LIMIT 1;
  IF v_auth_uid IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_uid::text)::text, true);
  END IF;

  -- ---------------------------------------------------------------------------
  -- CLOSING A PROJECT (public.project_closures) — one in-progress, one completed
  -- ---------------------------------------------------------------------------
  INSERT INTO public.project_closures (
    id, project_id, closure_type, closure_reason,
    closure_initiated_date, planned_closure_date,
    closure_status, closure_phase,
    project_objectives_met, project_success_rating, overall_performance_summary,
    benefits_realized, deliverables_completed, deliverables_total, deliverables_acceptance_status,
    final_budget, final_actual_cost,
    resources_released, all_documentation_archived, closure_checklist_completed,
    checklist_completion_percentage, benefits_transition_status,
    prepared_by, notes,
    created_by, is_deleted, created_at, updated_at
  ) VALUES
    ('97300001-9c01-4a01-9c01-534433340001', v_proj_erp, 'normal-completion', NULL,
     CURRENT_DATE - 5, CURRENT_DATE + INTERVAL '20 days',
     'in-progress', 'closure-preparation',
     NULL, NULL, NULL,
     false, 4, 6, 'partial',
     650000, 610000,
     false, false, false,
     45, 'not_started',
     v_user_id, 'Closure activities started early to align with the planned Phase 2 kick-off.',
     v_user_id, false, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),

    ('97300001-9c01-4a01-9c01-534433340002', v_proj_leg, 'normal-completion', 'All target legacy systems successfully decommissioned.',
     CURRENT_DATE - 20, CURRENT_DATE - 5,
     'completed', 'closed',
     true, 8, 'Legacy decommission completed on schedule and under budget with no data loss incidents.',
     true, 5, 5, 'full',
     180000, 165000,
     true, true, true,
     100, 'complete',
     v_user_id, 'Formal closure sign-off obtained from IT Operations and Compliance.',
     v_user_id, false, NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'v973: Project Closure seed complete (project_closures) for SEED-PP-03 and SEED-IND-05.';

END $$;
