-- =============================================================================
-- v888: Seed Lessons Reports sample rows for SEED334-* projects (Platform)
-- Purpose: Populate public.lessons_reports so the Lessons Log → Lessons Reports
--          widget shows sample entries instead of "No reports created yet"
--          (Velocity Freight SEED334-PRJ-08 and siblings).
-- Prerequisites: v203/v204 (lessons_reports + RLS), v886 (RLS recursion fix),
--   v756b (admin display-ID trigger on report_reference), v169 (lessons_logs),
--   v334 / portfolio SEED334 projects.
-- Idempotent: skips a project that already has non-deleted reports. A project
--   with lessons_learned rows but no lessons_logs header yet (that header isn't
--   required for lessons_learned itself) gets one created via the existing
--   create_lessons_log_for_project() RPC, same as the app's own "create log" flow.
-- Display IDs: report_reference left '' so trg_lessons_reports_admin_display_id
--   assigns the real reference via admin.generate_display_id — do not hand-mint
--   references (rule 16.2).
-- UI note: Select the project in the header (e.g. SEED334-PRJ-08 / Velocity
--   Freight) and open Controls & Registers → Lessons Log.
-- =============================================================================

DO $$
DECLARE
  v_project    RECORD;
  v_log_id     UUID;
  v_user_id    UUID;
  v_auth_uid   UUID;
  v_name       TEXT;
  v_count      INTEGER;
  v_seeded     INTEGER := 0;
BEGIN

  FOR v_project IN
    SELECT id, project_code, project_name, owner_user_id, project_manager_user_id
    FROM public.projects
    WHERE COALESCE(is_deleted, false) = false
      AND project_code LIKE 'SEED334-PRJ-%'
    ORDER BY project_code
  LOOP

    SELECT COUNT(*) INTO v_count
    FROM public.lessons_reports
    WHERE project_id = v_project.id
      AND COALESCE(is_deleted, false) = false;

    IF v_count > 0 THEN
      RAISE NOTICE 'v888: % already has % lessons report(s) — skip', v_project.project_code, v_count;
      CONTINUE;
    END IF;

    -- Prefer a project member with owner/admin access (satisfies the INSERT RLS
    -- policy_lessons_reports_auth_insert check), falling back to owner/PM/any member.
    SELECT up.user_id INTO v_user_id
    FROM public.user_projects up
    WHERE up.project_id = v_project.id
      AND up.access_level IN ('owner', 'admin')
      AND COALESCE(up.is_deleted, false) = false
    LIMIT 1;

    IF v_user_id IS NULL THEN
      v_user_id := COALESCE(v_project.owner_user_id, v_project.project_manager_user_id);
    END IF;

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
      RAISE NOTICE 'v888: no user for % — skip', v_project.project_code;
      CONTINUE;
    END IF;

    SELECT auth_user_id,
           COALESCE(NULLIF(TRIM(full_name), ''), NULLIF(TRIM(email), ''), 'Project Lead')
      INTO v_auth_uid, v_name
    FROM public.users
    WHERE id = v_user_id
    LIMIT 1;

    IF v_auth_uid IS NULL THEN
      RAISE NOTICE 'v888: user % has no auth_user_id for % — skip', v_user_id, v_project.project_code;
      CONTINUE;
    END IF;

    PERFORM set_config(
      'request.jwt.claims',
      json_build_object('sub', v_auth_uid::text)::text,
      true
    );

    SELECT id INTO v_log_id
    FROM public.lessons_logs
    WHERE project_id = v_project.id
      AND COALESCE(is_deleted, false) = false
    LIMIT 1;

    IF v_log_id IS NULL THEN
      v_log_id := public.create_lessons_log_for_project(v_project.id, v_user_id);
      IF v_log_id IS NOT NULL THEN
        RAISE NOTICE 'v888: created lessons_logs header for %', v_project.project_code;
      END IF;
    END IF;

    IF v_log_id IS NULL THEN
      RAISE NOTICE 'v888: could not resolve/create lessons_logs for % — skip', v_project.project_code;
      CONTINUE;
    END IF;

    -- Two separate INSERTs (not one multi-row VALUES): both rows leave report_reference
    -- blank for the AFTER INSERT trigger to fill via admin.generate_display_id(), and a
    -- single statement would try to insert two equal '' values at once, tripping the
    -- UNIQUE constraint before the trigger gets a chance to resolve either of them.
    INSERT INTO public.lessons_reports (
      project_id, lessons_log_id, report_type,
      report_reference, version_no, report_date, report_status,
      author_id, author_name, prepared_by_id, prepared_by_name,
      purpose, context, scope, executive_summary,
      what_went_well_summary, what_did_not_go_well_summary,
      surprises_unexpected_summary, planned_vs_actual_analysis,
      time_performance_review, cost_performance_review, quality_performance_review,
      scope_performance_review, risk_performance_review, benefits_performance_review,
      key_recommendations_summary,
      created_by, updated_by, is_deleted, created_at, updated_at
    ) VALUES
      (
        v_project.id, v_log_id, 'interim',
        '', '1.0', CURRENT_DATE - 60, 'approved',
        v_user_id, v_name, v_user_id, v_name,
        'Summarise lessons captured to date so mid-project process changes can be adopted before closure.',
        'Interim review covering the first delivery stage of ' || COALESCE(v_project.project_name, v_project.project_code) || '.',
        'Lessons logged during planning and the first delivery stage.',
        'Delivery is broadly on track. A small number of process gaps were identified early and have already improved team throughput.',
        E'• Daily stand-ups surfaced integration risks earlier than the weekly cadence used previously\n• Early vendor engagement avoided a two-week procurement delay',
        E'• Initial environment provisioning took longer than estimated due to unclear access request ownership\n• Requirements sign-off was delayed by one sprint pending stakeholder availability',
        'Vendor lead time was shorter than budgeted once the relationship was established directly with the account manager.',
        'Schedule variance is within 5% of baseline; cost tracking slightly favourable due to the avoided procurement delay.',
        'On schedule against the revised baseline; the sprint lost to sign-off delays was absorbed within contingency.',
        'Tracking under budget by approximately 3% at this stage, driven by the avoided procurement delay.',
        'No material quality issues; defect rate from the first two sprints is within target.',
        'No scope changes recorded in this period.',
        'Environment provisioning risk downgraded after ownership was clarified; vendor dependency risk closed.',
        'Benefits realisation tracking has not yet started; too early in delivery to assess.',
        'Assign a named environment-access owner at kick-off; engage key vendors directly rather than through procurement intermediaries.',
        v_user_id, v_user_id, false,
        NOW() - INTERVAL '60 days', NOW() - INTERVAL '55 days'
      );

    INSERT INTO public.lessons_reports (
      project_id, lessons_log_id, report_type,
      report_reference, version_no, report_date, report_status,
      author_id, author_name, prepared_by_id, prepared_by_name,
      purpose, context, scope, executive_summary,
      what_went_well_summary, what_did_not_go_well_summary,
      surprises_unexpected_summary, planned_vs_actual_analysis,
      time_performance_review, cost_performance_review, quality_performance_review,
      scope_performance_review, risk_performance_review, benefits_performance_review,
      key_recommendations_summary,
      created_by, updated_by, is_deleted, created_at, updated_at
    ) VALUES
      (
        v_project.id, v_log_id, 'project',
        '', '1.0', CURRENT_DATE - 5, 'draft',
        v_user_id, v_name, v_user_id, v_name,
        'Capture the full end-of-project lessons for organisational learning ahead of closure sign-off.',
        'End-of-project review for ' || COALESCE(v_project.project_name, v_project.project_code) || ', consolidating lessons across all delivery stages.',
        'All lessons logged across the project lifecycle, from initiation through to closure.',
        'The project delivered its agreed scope with minor schedule slippage in the middle stage, since recovered. Overall stakeholder satisfaction was high.',
        E'• Cross-functional planning workshops at each stage boundary kept scope and schedule aligned\n• Early and direct vendor engagement consistently shortened lead times',
        E'• Unclear ownership of environment access caused a recurring bottleneck across two stages\n• Requirements sign-off cadence needs to be agreed with stakeholders up front, not renegotiated per stage',
        'The team recovered lost schedule faster than expected once the access-ownership issue was resolved, showing the fix had a bigger impact than anticipated.',
        'Final schedule variance was under 4%; cost finished within 2% of the approved budget.',
        'Delivered within the revised schedule after the mid-project recovery plan was applied.',
        'Closed within 2% of approved budget.',
        'No quality gate failures across any stage; all acceptance criteria met at handover.',
        'One scope change (reporting dashboard) was approved and delivered within contingency.',
        'All identified risks were closed or transferred by project closure; no open risks carried forward.',
        'Two of three target benefits are already trending toward plan; the third will be assessed at the post-implementation review.',
        'Standardise the environment-access request process for future projects; agree the requirements sign-off cadence with stakeholders during initiation, not per stage.',
        v_user_id, v_user_id, false,
        NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days'
      );

    v_seeded := v_seeded + 1;
    RAISE NOTICE 'v888: seeded Lessons Reports for %', v_project.project_code;
  END LOOP;

  RAISE NOTICE 'v888: completed — seeded % SEED334 project(s)', v_seeded;
END $$;
