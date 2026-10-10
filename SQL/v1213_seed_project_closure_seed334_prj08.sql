-- =============================================================================
-- v1213: Seed Project Closure sample data for SEED334-PRJ-08 (Velocity Freight) ONLY
--
-- Sidebar leaves and what this file inserts:
--   Lessons Log            lessons_learned                          10 rows
--   Outstanding Items      follow_on_actions                        10 rows
--   Archive                project_archive_items                    10 rows
--   Closure Report lists   end-project-report child tables          10 rows each
--                          (objectives, benefits review, team,
--                           quality records, product approvals,
--                           off-specifications, report lessons,
--                           report follow-on links, distribution)
--   Closure Checklist      project_closures                         1 row
--   Final Acceptance       same project_closures row                (fields)
--   Benefits Transition    same project_closures row                (status)
--   Handover               project_handover                         1 row
--                          plus 10 checklist lines when the
--                          checklist_items column exists
--   Closing a Project      the hub — no table of its own
--   Closure Report header  end_project_reports                      1 row
--
-- One closure, one handover, and one end-project report per project is how
-- those screens load data (unique project / maybeSingle). A second row would
-- make the hub fail to open.
--
-- Idempotent: fixed hex-only UUIDs, ON CONFLICT (id) DO NOTHING.
-- Existing closure / handover / report rows are left as they are.
-- Display IDs (lesson_reference, log_reference, document_ref) are left blank
-- so the Admin ID Generation triggers assign them.
-- Run this yourself in the Supabase SQL editor. Do not expect the app to run it.
--
-- The end-project-report insert also creates quality-check rows. Those rows
-- use trigger_update_audit_fields(), which assigned updated_by / created_by
-- even when the table has no such column (and read OLD on INSERT). This file
-- replaces that function first so the seed can finish. Re-run the whole file.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trigger_update_audit_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, auth
AS $$
DECLARE
    v_internal_user_id UUID;
BEGIN
    IF to_jsonb(NEW) ? 'updated_at' THEN
        NEW.updated_at := NOW();
    END IF;

    IF auth.uid() IS NOT NULL THEN
        SELECT id INTO v_internal_user_id
        FROM users
        WHERE auth_user_id = auth.uid()
          AND is_deleted = false
        LIMIT 1;
    END IF;

    IF to_jsonb(NEW) ? 'updated_by' THEN
        NEW.updated_by := v_internal_user_id;
    END IF;

    -- INSERT has no OLD row. Only preserve created_* on UPDATE, and only
    -- when that column exists on the table being written.
    IF TG_OP = 'UPDATE' THEN
        IF to_jsonb(OLD) ? 'created_at' THEN
            NEW.created_at := OLD.created_at;
        END IF;
        IF to_jsonb(OLD) ? 'created_by' THEN
            NEW.created_by := OLD.created_by;
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$;

DO $$
DECLARE
  v_project_id   UUID;
  v_project_code TEXT := 'SEED334-PRJ-08';
  v_user_id      UUID;
  v_auth_uid     UUID;
  v_log_id       UUID;
  v_closure_id   UUID;
  v_handover_id  UUID;
  v_report_id    UUID;
  v_users        UUID[];
  v_user_count   INT;
  i              INT;
  v_id           UUID;
  v_lesson_titles TEXT[] := ARRAY[
    'Peak-season route exceptions',
    'Carrier onboarding lead time',
    'Dock appointment accuracy',
    'Fuel surcharge change control',
    'Customer notification timing',
    'Warehouse scan compliance',
    'Night dispatch handover',
    'Service-level early warning',
    'Consignment weight data quality',
    'Benefit tracking after go-live'
  ];
  v_action_titles TEXT[] := ARRAY[
    'Train the night shift on the carrier portal',
    'Close the remaining dock-slot defects',
    'Hand the warranty pack to operations',
    'Confirm residual benefit measures with finance',
    'Archive the signed acceptance pack',
    'Transfer the monitoring dashboards',
    'Resolve open customs documentation',
    'Hold the 30-day hypercare review',
    'Move rate-card ownership to operations',
    'Close outstanding customer concessions'
  ];
  v_archive_titles TEXT[] := ARRAY[
    'Signed delivery acceptance pack',
    'Open risk register at closure',
    'Approved scope changes',
    'End project report draft',
    'Benefits realization workbook',
    'Project board minutes',
    'Carrier contract file',
    'Issue log extract',
    'Hypercare runbook',
    'Customer concession letters'
  ];
  v_archive_categories TEXT[] := ARRAY[
    'document', 'raid', 'change', 'report', 'benefits',
    'governance', 'document', 'raid', 'other', 'change'
  ];
  v_areas TEXT[] := ARRAY[
    'time', 'cost', 'quality', 'scope', 'benefits',
    'risk', 'time', 'cost', 'quality', 'scope'
  ];
  v_benefit_types TEXT[] := ARRAY[
    'achieved', 'residual', 'expected_net', 'not_achieved', 'achieved',
    'residual', 'expected_net', 'achieved', 'residual', 'not_achieved'
  ];
  v_perf_types TEXT[] := ARRAY[
    'recognition', 'achievement', 'improvement', 'observation', 'recognition',
    'achievement', 'improvement', 'observation', 'recognition', 'achievement'
  ];
  v_quality_types TEXT[] := ARRAY[
    'review', 'inspection', 'test', 'audit', 'walkthrough',
    'review', 'inspection', 'test', 'audit', 'other'
  ];
  v_off_types TEXT[] := ARRAY[
    'missing_product', 'non_conforming', 'partial_delivery', 'quality_deviation', 'non_conforming',
    'partial_delivery', 'quality_deviation', 'missing_product', 'non_conforming', 'partial_delivery'
  ];
  v_lesson_types TEXT[] := ARRAY[
    'what_went_well', 'what_went_badly', 'recommendation', 'what_went_well', 'what_went_badly',
    'recommendation', 'what_went_well', 'what_went_badly', 'recommendation', 'what_went_well'
  ];
BEGIN
  SELECT id INTO v_project_id
  FROM public.projects
  WHERE project_code = v_project_code
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'v1213: project % not found', v_project_code;
  END IF;

  SELECT owner_user_id INTO v_user_id FROM public.projects WHERE id = v_project_id;
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  END IF;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'v1213: no user available to attribute seed rows';
  END IF;

  SELECT auth_user_id INTO v_auth_uid FROM public.users WHERE id = v_user_id LIMIT 1;
  IF v_auth_uid IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_uid::text)::text, true);
  END IF;

  SELECT ARRAY(
    SELECT up.user_id
    FROM public.user_projects up
    WHERE up.project_id = v_project_id
      AND COALESCE(up.is_deleted, FALSE) = FALSE
    LIMIT 10
  ) INTO v_users;
  IF v_users IS NULL OR COALESCE(array_length(v_users, 1), 0) = 0 THEN
    v_users := ARRAY[v_user_id];
  END IF;
  v_user_count := array_length(v_users, 1);

  -- Lessons log header (one per project). Reference left blank for ID generation.
  SELECT id INTO v_log_id
  FROM public.lessons_logs
  WHERE project_id = v_project_id
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_log_id IS NULL THEN
    v_log_id := 'c12130e1-5d01-4a01-9c01-534433340801';
    INSERT INTO public.lessons_logs (
      id, project_id, log_reference, version_number,
      author_id, owner_id, update_process, is_active,
      created_by, is_deleted
    ) VALUES (
      v_log_id, v_project_id, '', '1.0',
      v_user_id, v_user_id,
      'Lessons are logged during delivery and reviewed again at closure.',
      TRUE, v_user_id, FALSE
    )
    ON CONFLICT (id) DO NOTHING;

    SELECT id INTO v_log_id
    FROM public.lessons_logs
    WHERE project_id = v_project_id
      AND COALESCE(is_deleted, FALSE) = FALSE
    LIMIT 1;
  END IF;

  -- 10 lessons
  FOR i IN 1..10 LOOP
    v_id := ('c1213011-5d01-4a01-9c01-5344333408' || lpad(to_hex(i), 2, '0'))::uuid;
    INSERT INTO public.lessons_learned (
      id, project_id, lessons_log_id, lesson_reference, lesson_title, lesson_date,
      lesson_category, lesson_type, lesson_scope, effect_type, status, priority,
      situation_description, what_happened, why_it_happened, impact_description,
      lesson_learned, recommendations, event_description, cause_description,
      early_warning_indicators, related_product_name, tags,
      contributed_by, created_by, is_deleted
    ) VALUES (
      v_id, v_project_id, v_log_id, NULL, v_lesson_titles[i], CURRENT_DATE - (11 - i),
      (ARRAY['process','people','planning','execution','quality','risk','stakeholder','technology','process','quality'])[i],
      (ARRAY['success','challenge','improvement-opportunity','best-practice','challenge','success','improvement-opportunity','challenge','success','best-practice'])[i],
      'project'::public.lesson_scope_type,
      (ARRAY['negative','positive','neutral','positive','negative','positive','neutral','negative','positive','neutral'])[i]::public.effect_type_enum,
      'logged',
      (ARRAY['high','medium','medium','high','critical','medium','low','high','medium','high'])[i]::public.lesson_priority_enum,
      'Velocity Freight, project ' || v_project_code || '. This note was captured while the route, dock, and carrier work was still in delivery.',
      'The team saw "' || v_lesson_titles[i] || '" affect live freight movements. It was discussed in the weekly delivery review and written up so the same pattern is not rediscovered at the next site.',
      'The cause sat in the handoff between planning, the carrier, and the warehouse rather than in a single missed task.',
      'Collections and deliveries slipped, and the operations team spent extra time explaining the variance to the customer.',
      'Log "' || v_lesson_titles[i] || '" as soon as the pattern repeats twice, and name an owner before the next peak week.',
      'Agree the corrective step in the same review that logs the lesson, and check it again at the 30-day hypercare meeting.',
      'The team saw "' || v_lesson_titles[i] || '" affect live freight movements. It was discussed in the weekly delivery review and written up so the same pattern is not rediscovered at the next site.',
      'The cause sat in the handoff between planning, the carrier, and the warehouse rather than in a single missed task.',
      'Repeated same-day re-plans. Customer calls before the status update. Scan failures on the same lane.',
      (ARRAY['Route plan','Carrier pack','Dock schedule','Rate card','Customer alerts','Scan process','Dispatch rota','Service report','Consignment file','Benefits pack'])[i],
      ARRAY['freight', 'closure'],
      v_user_id, v_user_id, FALSE
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- One closure record: checklist, final acceptance, and benefits transition
  SELECT id INTO v_closure_id
  FROM public.project_closures
  WHERE project_id = v_project_id
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_closure_id IS NULL THEN
    v_closure_id := 'c1213001-5d01-4a01-9c01-534433340801';
    INSERT INTO public.project_closures (
      id, project_id, closure_type, closure_reason,
      closure_initiated_date, planned_closure_date,
      closure_status, closure_phase,
      project_objectives_met, project_success_rating, overall_performance_summary,
      benefits_realized, benefits_realization_summary,
      deliverables_completed, deliverables_total, deliverables_acceptance_status,
      outstanding_deliverables, board_approval_date,
      final_budget, final_actual_cost, financial_accounts_closed,
      resources_released, all_documentation_archived,
      closure_checklist_completed, checklist_completion_percentage,
      benefits_transition_status,
      prepared_by, notes, created_by, is_deleted
    ) VALUES (
      v_closure_id, v_project_id, 'planned',
      'Velocity Freight has finished the agreed delivery scope and is moving into hypercare with operations.',
      CURRENT_DATE - 14, CURRENT_DATE + 21,
      'in-progress', 'handover',
      TRUE, 4,
      'Routes, dock scheduling, and carrier onboarding are in live use. A short list of concessions and training items remains open.',
      FALSE,
      'The on-time delivery benefit is being measured. Finance still needs the first full month of actuals before the benefit can be marked realized.',
      8, 10, 'partially-accepted',
      E'Night-shift carrier portal training\nTwo dock-slot defects\nCustoms document pack',
      NULL,
      1250000, 1185000, FALSE,
      FALSE, FALSE,
      FALSE, 70,
      'in_progress',
      v_user_id,
      'Checklist, final acceptance, and benefits transition for SEED334-PRJ-08.',
      v_user_id, FALSE
    )
    ON CONFLICT (id) DO NOTHING;

    SELECT id INTO v_closure_id
    FROM public.project_closures
    WHERE project_id = v_project_id
      AND COALESCE(is_deleted, FALSE) = FALSE
    LIMIT 1;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_closures' AND column_name = 'performance_summary'
  ) THEN
    UPDATE public.project_closures
    SET performance_summary = overall_performance_summary
    WHERE id = v_closure_id
      AND (performance_summary IS NULL OR btrim(performance_summary) = '');
  END IF;

  -- 10 outstanding follow-on actions
  FOR i IN 1..10 LOOP
    v_id := ('c1213021-5d01-4a01-9c01-5344333408' || lpad(to_hex(i), 2, '0'))::uuid;
    INSERT INTO public.follow_on_actions (
      id, project_id, project_closure_id,
      action_title, action_description, action_category,
      action_rationale, expected_outcome,
      assigned_to_user_id, assigned_to_role,
      recommended_start_date, recommended_completion_date,
      priority, status, progress_percentage,
      transition_to_operations, notes,
      created_by, is_deleted
    ) VALUES (
      v_id, v_project_id, v_closure_id,
      v_action_titles[i],
      'Outstanding closure item ' || i || ' for Velocity Freight: ' || v_action_titles[i] || '.',
      (ARRAY['training','support','documentation','benefits-realization','documentation','maintenance','other','support','enhancement','other'])[i],
      'Left open at closure so operations can finish it during hypercare.',
      'Item closed and accepted by the operations owner.',
      v_users[1 + ((i - 1) % v_user_count)],
      'Operations lead',
      CURRENT_DATE + i,
      CURRENT_DATE + 14 + i,
      (ARRAY['high','medium','medium','high','low','medium','high','medium','medium','urgent'])[i],
      (ARRAY['approved','in-progress','recommended','approved','in-progress','recommended','approved','in-progress','recommended','approved'])[i],
      (ARRAY[20, 40, 0, 10, 60, 0, 30, 15, 0, 50])[i],
      TRUE,
      'Seeded for the Outstanding Items list on SEED334-PRJ-08.',
      v_user_id, FALSE
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- One handover. The screen loads a single row per project.
  SELECT id INTO v_handover_id
  FROM public.project_handover
  WHERE project_id = v_project_id
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_handover_id IS NULL THEN
    v_handover_id := 'c1213031-5d01-4a01-9c01-534433340801';
    INSERT INTO public.project_handover (
      id, project_id, project_closure_id,
      handover_title, handover_date, handover_type, handover_status,
      handover_to_department, handed_over_by,
      documentation_complete, training_provided,
      knowledge_transfer_sessions_count,
      support_period_days, support_level,
      ongoing_responsibilities, notes,
      handover_checklist_completed,
      created_by, is_deleted
    ) VALUES (
      v_handover_id, v_project_id, v_closure_id,
      'Velocity Freight handover to operations',
      CURRENT_DATE - 2, 'operations', 'in-progress',
      'Freight operations', v_user_id,
      TRUE, TRUE, 3,
      30, 'limited-support',
      'Operations owns the daily route plan, dock appointments, and carrier portal. The project team stays on hypercare for 30 days.',
      'Hypercare contact is the project owner. Escalations follow the existing freight duty manager rota.',
      FALSE,
      v_user_id, FALSE
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_handover' AND column_name = 'support_arrangements'
  ) THEN
    EXECUTE
      'UPDATE public.project_handover
       SET support_arrangements = $1
       WHERE id = $2 AND (support_arrangements IS NULL OR btrim(support_arrangements) = '''')'
    USING '30-day hypercare. Duty manager takes calls after handover. Project owner remains the escalation contact.', v_handover_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_handover' AND column_name = 'training_complete'
  ) THEN
    EXECUTE 'UPDATE public.project_handover SET training_complete = TRUE WHERE id = $1 AND training_complete IS NOT TRUE'
    USING v_handover_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_handover' AND column_name = 'knowledge_transfer_complete'
  ) THEN
    EXECUTE 'UPDATE public.project_handover SET knowledge_transfer_complete = TRUE WHERE id = $1 AND knowledge_transfer_complete IS NOT TRUE'
    USING v_handover_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_handover' AND column_name = 'checklist_items'
  ) THEN
    EXECUTE
      'UPDATE public.project_handover
       SET checklist_items = $1::jsonb
       WHERE id = $2 AND checklist_items IS NULL'
    USING '[
      {"item":"Route plans handed over","completed":true},
      {"item":"Dock appointment rules handed over","completed":true},
      {"item":"Carrier portal access transferred","completed":true},
      {"item":"Night-shift training completed","completed":false},
      {"item":"Warranty and support contacts listed","completed":true},
      {"item":"Monitoring dashboards transferred","completed":false},
      {"item":"Rate card owner named","completed":false},
      {"item":"Customs document pack filed","completed":false},
      {"item":"Customer concession log handed over","completed":true},
      {"item":"Hypercare rota agreed","completed":true}
    ]', v_handover_id;
  END IF;

  -- One end project report
  SELECT id INTO v_report_id
  FROM public.end_project_reports
  WHERE project_id = v_project_id
    AND COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY created_at
  LIMIT 1;

  IF v_report_id IS NULL THEN
    v_report_id := 'c1213041-5d01-4a01-9c01-534433340801';
    INSERT INTO public.end_project_reports (
      id, project_id, project_closure_id,
      report_title, report_date, document_ref,
      executive_summary, project_managers_report,
      original_objectives, objectives_achieved,
      approval_status, closure_type,
      author_id, owner_id, prepared_by, created_by, is_deleted
    ) VALUES (
      v_report_id, v_project_id, v_closure_id,
      'Velocity Freight end project report', CURRENT_DATE, NULL,
      'Velocity Freight delivered the route, dock, and carrier scope now used by operations. Hypercare items remain open and are listed as follow-on actions.',
      'The project met the delivery date agreed with the board. Cost finished inside the approved budget. Two concessions and the night-shift training remain with operations.',
      'Stand up route planning, dock scheduling, and carrier onboarding for the freight network.',
      'Route planning and dock scheduling are live. Carrier onboarding is live for the contracted carriers, with night-shift training still open.',
      'draft', 'normal',
      v_user_id, v_user_id, v_user_id, v_user_id, FALSE
    )
    ON CONFLICT (id) DO NOTHING;

    SELECT id INTO v_report_id
    FROM public.end_project_reports
    WHERE project_id = v_project_id
      AND COALESCE(is_deleted, FALSE) = FALSE
    ORDER BY created_at
    LIMIT 1;
  END IF;

  FOR i IN 1..10 LOOP
    v_id := ('c1213061-5d01-4a01-9c01-5344333408' || lpad(to_hex(i), 2, '0'))::uuid;
    INSERT INTO public.end_project_report_objectives_review (
      id, end_project_report_id, objective_area, objective_description,
      original_target, actual_value, within_tolerance, performance_rating,
      display_order
    )
    SELECT
      v_id, v_report_id, v_areas[i]::public.epr_objective_area_enum,
      'Velocity Freight objective review ' || i || ' (' || v_areas[i] || ').',
      'Target agreed at project start',
      'Result recorded at closure',
      i <> 4,
      (ARRAY['met','met','exceeded','partially_met','met','met','exceeded','met','partially_met','met'])[i]::public.epr_performance_rating_enum,
      i
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.end_project_report_objectives_review existing
      WHERE existing.end_project_report_id = v_report_id
        AND existing.objective_area = v_areas[i]::public.epr_objective_area_enum
    )
    ON CONFLICT (id) DO NOTHING;

    v_id := ('c1213071-5d01-4a01-9c01-5344333408' || lpad(to_hex(i), 2, '0'))::uuid;
    INSERT INTO public.end_project_report_business_case_review (
      id, end_project_report_id, benefit_description, benefit_type,
      original_target_value, actual_value, measurement_unit,
      is_post_project, display_order
    ) VALUES (
      v_id, v_report_id,
      'Benefit line ' || i || ' for Velocity Freight on-time delivery and cost per consignment.',
      v_benefit_types[i]::public.epr_benefit_type_enum,
      100000 + (i * 5000), 90000 + (i * 4500), 'USD',
      v_benefit_types[i] IN ('residual', 'expected_net'),
      i
    )
    ON CONFLICT (id) DO NOTHING;

    v_id := ('c1213081-5d01-4a01-9c01-5344333408' || lpad(to_hex(i), 2, '0'))::uuid;
    INSERT INTO public.end_project_report_team_performance (
      id, end_project_report_id, team_member_id, team_name, role,
      performance_type, performance_description, display_order
    ) VALUES (
      v_id, v_report_id, v_users[1 + ((i - 1) % v_user_count)],
      'Velocity Freight delivery team',
      (ARRAY['Project manager','Dispatch lead','Warehouse lead','Carrier lead','Finance partner','Test lead','Operations owner','Planner','Analyst','Customer lead'])[i],
      v_perf_types[i]::public.epr_performance_type_enum,
      'Contribution ' || i || ' recorded for the closure report.',
      i
    )
    ON CONFLICT (id) DO NOTHING;

    v_id := ('c1213091-5d01-4a01-9c01-5344333408' || lpad(to_hex(i), 2, '0'))::uuid;
    INSERT INTO public.end_project_report_quality_records (
      id, end_project_report_id, activity_name, activity_type,
      product_name, planned_date, actual_date, status, result,
      findings_summary, display_order
    ) VALUES (
      v_id, v_report_id,
      'Quality activity ' || i,
      v_quality_types[i]::public.epr_quality_activity_type_enum,
      (ARRAY['Route plan','Dock schedule','Carrier pack','Scan process','Alerts','Rate card','Dashboard','Customs pack','Consignment file','Benefits pack'])[i],
      CURRENT_DATE - 30 + i, CURRENT_DATE - 20 + i,
      'completed', 'passed',
      'Checked during closure preparation.',
      i
    )
    ON CONFLICT (id) DO NOTHING;

    v_id := ('c12130a1-5d01-4a01-9c01-5344333408' || lpad(to_hex(i), 2, '0'))::uuid;
    INSERT INTO public.end_project_report_approval_records (
      id, end_project_report_id, product_name, product_description,
      approval_status, approver_id, approver_name, approval_date, display_order
    ) VALUES (
      v_id, v_report_id,
      (ARRAY['Route plan','Dock schedule','Carrier pack','Scan process','Customer alerts','Rate card','Dashboard','Customs pack','Consignment file','Hypercare runbook'])[i],
      'Acceptance record ' || i || ' for Velocity Freight.',
      (ARRAY['approved','approved','conditionally_approved','approved','pending','approved','approved','conditionally_approved','approved','deferred'])[i]::public.epr_product_approval_status_enum,
      v_user_id, 'Project owner', CURRENT_DATE - i, i
    )
    ON CONFLICT (id) DO NOTHING;

    v_id := ('c12130b1-5d01-4a01-9c01-5344333408' || lpad(to_hex(i), 2, '0'))::uuid;
    INSERT INTO public.end_project_report_off_specifications (
      id, end_project_report_id, off_spec_type, product_name,
      original_requirement, actual_delivery, deviation_description,
      concession_granted, display_order
    ) VALUES (
      v_id, v_report_id, v_off_types[i]::public.epr_off_spec_type_enum,
      'Deliverable ' || i,
      'Delivered to the agreed freight specification.',
      'Delivered with the variance noted at closure.',
      'Variance ' || i || ' accepted for hypercare follow-up.',
      i IN (3, 8),
      i
    )
    ON CONFLICT (id) DO NOTHING;

    v_id := ('c12130c1-5d01-4a01-9c01-5344333408' || lpad(to_hex(i), 2, '0'))::uuid;
    INSERT INTO public.end_project_report_lessons (
      id, end_project_report_id, lesson_type, category,
      title, description, impact, recommendation, display_order
    ) VALUES (
      v_id, v_report_id,
      v_lesson_types[i]::public.epr_lesson_type_enum,
      (ARRAY['process','people','planning','execution','quality','risk','stakeholder','technology','process','quality'])[i]::public.epr_lesson_category_enum,
      v_lesson_titles[i],
      'Report lesson ' || i || ': ' || v_lesson_titles[i] || '.',
      (ARRAY['medium','high','low','medium','high','critical','medium','high','medium','low'])[i]::public.epr_lesson_impact_enum,
      'Carry this into the next freight project.',
      i
    )
    ON CONFLICT (id) DO NOTHING;

    v_id := ('c12130d1-5d01-4a01-9c01-5344333408' || lpad(to_hex(i), 2, '0'))::uuid;
    INSERT INTO public.end_project_report_follow_on_actions (
      id, end_project_report_id,
      follow_on_action_id, source_type, recommended_recipient, notes, display_order
    ) VALUES (
      v_id, v_report_id,
      ('c1213021-5d01-4a01-9c01-5344333408' || lpad(to_hex(i), 2, '0'))::uuid,
      (ARRAY['open_issue','unfinished_work','recommendation','other','open_risk','recommendation','open_issue','unfinished_work','other','recommendation'])[i]::public.epr_follow_on_source_type_enum,
      'Freight operations',
      'Linked from the Outstanding Items list.',
      i
    )
    ON CONFLICT (id) DO NOTHING;

    v_id := ('c12130f1-5d01-4a01-9c01-5344333408' || lpad(to_hex(i), 2, '0'))::uuid;
    INSERT INTO public.end_project_report_distribution (
      id, end_project_report_id, recipient_id, recipient_name, recipient_title,
      date_of_issue, version_distributed, distribution_status
    ) VALUES (
      v_id, v_report_id,
      v_users[1 + ((i - 1) % v_user_count)],
      'Distribution recipient ' || i,
      (ARRAY['Project board','Operations','Finance','Warehouse','Carrier desk','PMO','Customer lead','Dispatch','Quality','Audit'])[i],
      CURRENT_DATE, '1.0',
      (ARRAY['sent','read','acknowledged','sent','read','sent','acknowledged','sent','read','sent'])[i]::public.epr_distribution_status_enum
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- 10 archive items
  FOR i IN 1..10 LOOP
    v_id := ('c1213051-5d01-4a01-9c01-5344333408' || lpad(to_hex(i), 2, '0'))::uuid;
    INSERT INTO public.project_archive_items (
      id, project_id, title, category, archived_date, archived_by, notes, created_by, is_deleted
    ) VALUES (
      v_id, v_project_id, v_archive_titles[i], v_archive_categories[i],
      CURRENT_DATE - (10 - i), v_user_id,
      'Archived for Velocity Freight closure reference.',
      v_user_id, FALSE
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'v1213: Project Closure seed applied for %', v_project_code;
END $$;

SELECT 'lessons_learned' AS register, COUNT(*) AS rows
FROM public.lessons_learned l
JOIN public.projects p ON p.id = l.project_id
WHERE p.project_code = 'SEED334-PRJ-08' AND COALESCE(l.is_deleted, FALSE) = FALSE
UNION ALL
SELECT 'follow_on_actions', COUNT(*)
FROM public.follow_on_actions a
JOIN public.projects p ON p.id = a.project_id
WHERE p.project_code = 'SEED334-PRJ-08' AND COALESCE(a.is_deleted, FALSE) = FALSE
UNION ALL
SELECT 'project_archive_items', COUNT(*)
FROM public.project_archive_items a
JOIN public.projects p ON p.id = a.project_id
WHERE p.project_code = 'SEED334-PRJ-08' AND COALESCE(a.is_deleted, FALSE) = FALSE
UNION ALL
SELECT 'project_closures', COUNT(*)
FROM public.project_closures c
JOIN public.projects p ON p.id = c.project_id
WHERE p.project_code = 'SEED334-PRJ-08' AND COALESCE(c.is_deleted, FALSE) = FALSE
UNION ALL
SELECT 'project_handover', COUNT(*)
FROM public.project_handover h
JOIN public.projects p ON p.id = h.project_id
WHERE p.project_code = 'SEED334-PRJ-08' AND COALESCE(h.is_deleted, FALSE) = FALSE
UNION ALL
SELECT 'end_project_reports', COUNT(*)
FROM public.end_project_reports r
JOIN public.projects p ON p.id = r.project_id
WHERE p.project_code = 'SEED334-PRJ-08' AND COALESCE(r.is_deleted, FALSE) = FALSE;
