-- =============================================================================
-- v878: Seed delays + requirements for ALL SEED334-* projects
-- Why: v877 only seeded SEED334-PRJ-07 (Cedar Trust). The Requirements Register
--   menu uses /platform/scope/requirements and the header project selector
--   (e.g. SEED334-PRJ-08) — users saw an empty list on other SEED334 projects.
-- Idempotent: skips a project that already has non-deleted delays / requirements.
-- Prerequisites: v877 (table ensure) or v357; v444 delays; v334 projects.
-- =============================================================================

DO $$
DECLARE
  v_project    RECORD;
  v_user_id    UUID;
  v_auth_uid   UUID;
  v_delay_n    INTEGER;
  v_req_n      INTEGER;
  v_projects_d INTEGER := 0;
  v_projects_r INTEGER := 0;
BEGIN

  FOR v_project IN
    SELECT id, account_id, project_code, owner_user_id, project_name
    FROM public.projects
    WHERE COALESCE(is_deleted, false) = false
      AND project_code LIKE 'SEED334-PRJ-%'
    ORDER BY project_code
  LOOP

    v_user_id := v_project.owner_user_id;

    IF v_user_id IS NULL THEN
      SELECT pm.user_id INTO v_user_id
      FROM public.project_memberships pm
      WHERE pm.project_id = v_project.id
        AND COALESCE(pm.is_active, true) = true
      LIMIT 1;
    END IF;

    IF v_user_id IS NULL THEN
      SELECT id INTO v_user_id
      FROM public.users
      WHERE COALESCE(is_deleted, false) = false
      LIMIT 1;
    END IF;

    IF v_user_id IS NULL THEN
      RAISE NOTICE 'v878: no user for % — skip', v_project.project_code;
      CONTINUE;
    END IF;

    SELECT auth_user_id INTO v_auth_uid FROM public.users WHERE id = v_user_id LIMIT 1;
    IF v_auth_uid IS NOT NULL THEN
      PERFORM set_config(
        'request.jwt.claims',
        json_build_object('sub', v_auth_uid::text)::text,
        true
      );
    END IF;

    -- ----- Delays -----
    SELECT COUNT(*) INTO v_delay_n
    FROM public.project_delays
    WHERE project_id = v_project.id AND COALESCE(is_deleted, false) = false;

    IF v_delay_n = 0 AND v_project.account_id IS NOT NULL THEN
      INSERT INTO public.project_delays (
        project_id, organisation_id,
        delay_reference, title, description,
        delay_category, delay_cause, responsible_party,
        severity, status,
        impact_schedule_days, impact_cost, impact_scope,
        identified_date, original_baseline_date, revised_forecast_date,
        resolution_plan, source_type,
        created_by, is_deleted, is_draft, created_at, updated_at
      ) VALUES
        (v_project.id, v_project.account_id, NULL,
         'External dependency slip — integration partner',
         'Partner environment was not ready for the planned integration test window on ' || COALESCE(v_project.project_name, v_project.project_code) || '.',
         'external_dependency', 'partner-readiness', 'Integration Partner',
         'high', 'under_review',
         10, 25000, 'Integration test start delayed',
         CURRENT_DATE - 14, CURRENT_DATE - 40, CURRENT_DATE + 7,
         'Re-book partner window; run stubs on project staging meantime.',
         'manual', v_user_id, false, false, NOW() - INTERVAL '14 days', NOW() - INTERVAL '2 days'),

        (v_project.id, v_project.account_id, NULL,
         'Key resource unavailable during sprint',
         'Lead developer leave overlapped a critical delivery sprint for ' || COALESCE(v_project.project_name, v_project.project_code) || '.',
         'resource', 'leave-coverage', 'Delivery Team',
         'medium', 'identified',
         5, 8000, 'Feature completion slipped one sprint',
         CURRENT_DATE - 7, CURRENT_DATE - 20, CURRENT_DATE + 14,
         'Backfill from bench; descope non-critical stories.',
         'manual', v_user_id, false, false, NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day'),

        (v_project.id, v_project.account_id, NULL,
         'Technical defect rework on critical path',
         'Severity-1 defect in a shared component forced unplanned rework on ' || COALESCE(v_project.project_name, v_project.project_code) || '.',
         'technical', 'defect-rework', 'QA / Engineering',
         'high', 'approved',
         8, 15000, 'Release candidate delayed',
         CURRENT_DATE - 21, CURRENT_DATE - 35, CURRENT_DATE + 3,
         'Hotfix merged; regression pack completed.',
         'manual', v_user_id, false, false, NOW() - INTERVAL '21 days', NOW() - INTERVAL '5 days'),

        (v_project.id, v_project.account_id, NULL,
         'Stakeholder review cycle longer than planned',
         'Sign-off reviews took longer than the baseline two-week cadence.',
         'stakeholder', 'review-cycle', 'Business Sponsors',
         'low', 'resolved',
         4, 0, 'Decision gate delayed; subsequent tasks compressed',
         CURRENT_DATE - 40, CURRENT_DATE - 55, CURRENT_DATE - 20,
         'Review checklist shortened; standing weekly decision slot booked.',
         'manual', v_user_id, false, false, NOW() - INTERVAL '40 days', NOW() - INTERVAL '20 days');

      v_projects_d := v_projects_d + 1;
    END IF;

    -- ----- Requirements -----
    IF to_regclass('public.requirements_register') IS NULL THEN
      RAISE NOTICE 'v878: requirements_register missing — run v877 first. Skip requirements for %.', v_project.project_code;
      CONTINUE;
    END IF;

    SELECT COUNT(*) INTO v_req_n
    FROM public.requirements_register
    WHERE project_id = v_project.id AND COALESCE(is_deleted, false) = false;

    IF v_req_n = 0 THEN
      INSERT INTO public.requirements_register (
        project_id, requirement_code, name, description,
        category, priority, status,
        acceptance_criteria, traceability_tag, version,
        created_by, updated_by, is_deleted, created_at, updated_at
      ) VALUES
        (v_project.id,
         'REQ-' || REPLACE(v_project.project_code, 'SEED334-PRJ-', 'P') || '-001',
         'Core delivery capability for ' || COALESCE(v_project.project_name, v_project.project_code),
         'System shall deliver the primary business capability defined in the project brief.',
         'business', 'must', 'approved',
         'Accepted in UAT by product owner with no severity-1 defects open.',
         'BUS-CORE', '1.0',
         v_user_id, v_user_id, false, NOW() - INTERVAL '30 days', NOW() - INTERVAL '10 days'),

        (v_project.id,
         'REQ-' || REPLACE(v_project.project_code, 'SEED334-PRJ-', 'P') || '-002',
         'Role-based access control',
         'Access to project functions shall be restricted by assigned project role.',
         'non_functional', 'must', 'approved',
         'Unauthorised roles cannot access restricted screens; audit log records denials.',
         'SEC-RBAC', '1.0',
         v_user_id, v_user_id, false, NOW() - INTERVAL '28 days', NOW() - INTERVAL '8 days'),

        (v_project.id,
         'REQ-' || REPLACE(v_project.project_code, 'SEED334-PRJ-', 'P') || '-003',
         'Operational reporting extract',
         'Users shall export operational registers to Excel/CSV for the current filters.',
         'functional', 'should', 'draft',
         'Export matches on-screen filtered set; completes within 30 seconds for ≤5k rows.',
         'RPT-EXPORT', '0.8',
         v_user_id, v_user_id, false, NOW() - INTERVAL '12 days', NOW() - INTERVAL '3 days'),

        (v_project.id,
         'REQ-' || REPLACE(v_project.project_code, 'SEED334-PRJ-', 'P') || '-004',
         'Audit trail of material changes',
         'Material create/update/delete events shall be attributable to a user and timestamp.',
         'regulatory', 'must', 'approved',
         'Audit records retained per organisation policy; display ID preferred in UI.',
         'COMP-AUDIT', '1.0',
         v_user_id, v_user_id, false, NOW() - INTERVAL '25 days', NOW() - INTERVAL '6 days'),

        (v_project.id,
         'REQ-' || REPLACE(v_project.project_code, 'SEED334-PRJ-', 'P') || '-005',
         'Mobile-responsive PWA access',
         'Primary registers shall be usable on tablet/phone via the PWA shell.',
         'technical', 'should', 'implemented',
         'Critical flows usable at 375px width without horizontal page scroll.',
         'UX-PWA', '1.1',
         v_user_id, v_user_id, false, NOW() - INTERVAL '45 days', NOW() - INTERVAL '15 days');

      v_projects_r := v_projects_r + 1;
    END IF;

  END LOOP;

  RAISE NOTICE 'v878: seeded delays for % project(s), requirements for % project(s) (SEED334-PRJ-%%).',
    v_projects_d, v_projects_r;

END $$;
