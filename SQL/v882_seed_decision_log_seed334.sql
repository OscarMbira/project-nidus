-- =============================================================================
-- v882: Seed Decision Log sample rows for SEED334-* projects (Platform)
-- Purpose: Populate public.project_decisions so Controls → Knowledge & Governance
--          → Decision Log shows sample entries (page was empty for Velocity Freight
--          SEED334-PRJ-08 and siblings when no rows existed).
-- Prerequisites: v628d (project_decisions), v334 / portfolio SEED334 projects
-- Idempotent: skips a project that already has non-deleted decisions.
-- Display IDs: decision_reference left '' so trg_project_decisions_ref assigns
--   DEC-YYYY-NNNN — do not hand-mint references (rule 16.2 / local trigger path).
-- UI note: Select the project in the header (e.g. SEED334-PRJ-08 / Velocity Freight).
--   If the UI stays empty after seed, apply v884 (project_decisions RLS fix).
-- =============================================================================

DO $$
DECLARE
  v_project  RECORD;
  v_user_id  UUID;
  v_auth_uid UUID;
  v_name     TEXT;
  v_count    INTEGER;
  v_seeded   INTEGER := 0;
BEGIN

  FOR v_project IN
    SELECT id, project_code, owner_user_id, project_name
    FROM public.projects
    WHERE COALESCE(is_deleted, false) = false
      AND project_code LIKE 'SEED334-PRJ-%'
    ORDER BY project_code
  LOOP

    SELECT COUNT(*) INTO v_count
    FROM public.project_decisions
    WHERE project_id = v_project.id
      AND COALESCE(is_deleted, false) = false;

    IF v_count > 0 THEN
      RAISE NOTICE 'v882: % already has % decision(s) — skip', v_project.project_code, v_count;
      CONTINUE;
    END IF;

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
      RAISE NOTICE 'v882: no user for % — skip', v_project.project_code;
      CONTINUE;
    END IF;

    SELECT auth_user_id,
           COALESCE(NULLIF(TRIM(full_name), ''), NULLIF(TRIM(email), ''), 'Project Lead')
      INTO v_auth_uid, v_name
    FROM public.users
    WHERE id = v_user_id
    LIMIT 1;

    IF v_auth_uid IS NULL THEN
      RAISE NOTICE 'v882: user % has no auth_user_id for % — skip', v_user_id, v_project.project_code;
      CONTINUE;
    END IF;

    PERFORM set_config(
      'request.jwt.claims',
      json_build_object('sub', v_auth_uid::text)::text,
      true
    );

    INSERT INTO public.project_decisions (
      project_id,
      decision_reference, decision_title, description,
      decision_date, decided_by, decided_by_name,
      category, status, priority,
      rationale, impact, alternatives_considered, review_date,
      created_by, updated_by, is_deleted, created_at, updated_at
    ) VALUES
      (
        v_project.id,
        '',
        'Adopt staged go-live for ' || COALESCE(v_project.project_name, v_project.project_code),
        'Board decision to release capability in two waves rather than a single big-bang cutover.',
        CURRENT_DATE - 45,
        v_auth_uid,
        v_name,
        'delivery',
        'approved',
        'high',
        'Reduces operational risk and allows lessons from wave 1 to inform wave 2.',
        'Schedule extended by two weeks; support roster split across waves; communication plan updated.',
        'Single big-bang cutover; postpone go-live until full regression passes.',
        CURRENT_DATE + 30,
        v_auth_uid,
        v_auth_uid,
        false,
        NOW() - INTERVAL '45 days',
        NOW() - INTERVAL '40 days'
      ),
      (
        v_project.id,
        '',
        'Select primary integration approach for external data feeds',
        'Choose between vendor-managed connector and in-house API gateway for inbound operational feeds.',
        CURRENT_DATE - 28,
        v_auth_uid,
        v_name,
        'technical',
        'approved',
        'critical',
        'Vendor connector meets SLA and reduces build effort; gateway retained as a fallback path.',
        'Budget shift to subscription; two developer sprints reallocated from custom gateway work.',
        'Build custom API gateway; defer integration until next stage.',
        CURRENT_DATE + 60,
        v_auth_uid,
        v_auth_uid,
        false,
        NOW() - INTERVAL '28 days',
        NOW() - INTERVAL '20 days'
      ),
      (
        v_project.id,
        '',
        'Defer optional analytics dashboard to stage 2',
        'Optional executive analytics pack moved out of the current stage to protect critical path.',
        CURRENT_DATE - 14,
        v_auth_uid,
        v_name,
        'scope',
        'deferred',
        'medium',
        'Core transactional flows must complete before presentation-layer polish.',
        'Stage 1 scope reduced; stakeholder expectation reset via change notice.',
        'Keep dashboard in stage 1 with reduced metrics; cancel dashboard entirely.',
        CURRENT_DATE + 90,
        v_auth_uid,
        v_auth_uid,
        false,
        NOW() - INTERVAL '14 days',
        NOW() - INTERVAL '10 days'
      ),
      (
        v_project.id,
        '',
        'Approve weekend cutover window for production migration',
        'Authorise Saturday 22:00–Sunday 06:00 maintenance window for production data migration.',
        CURRENT_DATE - 7,
        v_auth_uid,
        v_name,
        'operations',
        'proposed',
        'high',
        'Lowest traffic window; ops and vendor support confirmed available.',
        'Customer communications required; on-call rota confirmed; rollback plan mandatory.',
        'Weekday overnight window; split migration across two nights.',
        CURRENT_DATE + 14,
        v_auth_uid,
        v_auth_uid,
        false,
        NOW() - INTERVAL '7 days',
        NOW() - INTERVAL '2 days'
      ),
      (
        v_project.id,
        '',
        'Reject proposal to skip penetration testing before go-live',
        'Security exception request to waive pen-test was reviewed and rejected.',
        CURRENT_DATE - 3,
        v_auth_uid,
        v_name,
        'governance',
        'rejected',
        'critical',
        'Residual risk exceeds organisational tolerance for externally facing services.',
        'Go-live remains gated on completed pen-test and remediation of critical findings.',
        'Time-boxed pen-test with risk acceptance for medium findings only.',
        NULL,
        v_auth_uid,
        v_auth_uid,
        false,
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '1 day'
      );

    v_seeded := v_seeded + 1;
    RAISE NOTICE 'v882: seeded Decision Log for %', v_project.project_code;
  END LOOP;

  RAISE NOTICE 'v882: completed — seeded % SEED334 project(s)', v_seeded;
END $$;
