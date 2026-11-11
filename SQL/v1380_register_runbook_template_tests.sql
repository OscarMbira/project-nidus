-- ============================================================================
-- v1380 tests: runbook templates — {{parent}} substitution and record-reference children (v1375),
-- Platform schema. Run in the Supabase SQL editor AFTER v1375, v1376 and v1378. Everything the tests
-- create is rolled back (sub-transaction cancelled at the end); only the results are returned.
-- PRD: projectprd/v1337_cbs_data_migration_runbook_PRD.md · Plan: projectplan/v1337_cbs_data_migration_runbook_plan.md (5.1)
--
-- Needs one live project with an active member who has a sign-in account; otherwise SKIPPED.
--
--   R1  creating a runbook from the system template creates every step
--   R2  every step's Runbook reference points at the new runbook (no {{parent}} left)
--   R3  the reference label is the new runbook's display ID – title (no {{parent_label}} left)
--   R4  steps keep their run order, window and step type from the template
--   R5  snapshot (5 arguments) keeps only steps that point at the record, as the {{parent}} token
--   R6  snapshot (4 arguments, no record) keeps no reference children
-- ============================================================================

CREATE OR REPLACE FUNCTION public.v1380_run_tests()
RETURNS TABLE (test TEXT, result TEXT, detail TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_template CONSTANT UUID := '00000000-0000-4000-b337-000000000001';
  v_project  UUID;
  v_account  UUID;
  v_user     UUID;
  v_auth     UUID;
  v_result   JSONB;
  v_record   UUID;
  v_rec      public.local_register_records;
  v_expected INT;
  v_count    INT;
  v_bad      INT;
  v_label    TEXT;
  v_org_tpl  UUID;
  v_results  JSONB := '[]'::jsonb;
BEGIN
  SELECT pm.project_id, u.id, u.auth_user_id INTO v_project, v_user, v_auth
  FROM public.project_memberships pm
  JOIN public.users u ON u.id = pm.user_id AND u.auth_user_id IS NOT NULL
  JOIN public.projects p ON p.id = pm.project_id
  WHERE pm.is_active = TRUE
  ORDER BY (p.project_code = 'SEED334-PRJ-08') DESC, pm.project_id
  LIMIT 1;
  IF v_project IS NULL THEN
    RETURN QUERY SELECT 'R0 test data'::text, 'SKIPPED'::text, 'no project with an active member'::text;
    RETURN;
  END IF;
  SELECT count(*) INTO v_expected FROM public.local_register_template_children WHERE template_id = v_template;
  IF v_expected = 0 THEN
    RETURN QUERY SELECT 'R0 template'::text, 'SKIPPED'::text, 'run v1378 first'::text;
    RETURN;
  END IF;
  SELECT account_id INTO v_account FROM public.projects WHERE id = v_project;

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth, 'role', 'authenticated')::text, TRUE);
    v_result := public.local_register_template_create_record(v_template, v_project, 'v1380 test runbook', NULL);
    v_record := (v_result ->> 'record_id')::uuid;
    SELECT * INTO v_rec FROM public.local_register_records WHERE id = v_record;

    SELECT count(*) INTO v_count FROM public.local_register_records s
    WHERE s.record_project_id = v_project AND s.is_deleted = FALSE
      AND s.field_values -> 'runbook' @> jsonb_build_array(jsonb_build_object('id', v_record::text));
    v_results := v_results || jsonb_build_object('t', 'R1 every step created',
      'p', (v_result ->> 'children')::int = v_expected AND v_count = v_expected,
      'd', format('children %s, linked %s, template %s', v_result ->> 'children', v_count, v_expected));

    SELECT count(*) INTO v_bad FROM public.local_register_records s
    WHERE s.created_from_template_id = v_template AND s.record_project_id = v_project AND s.id <> v_record
      AND s.created_at >= v_rec.created_at AND s.field_values::text LIKE '%{{parent%';
    v_results := v_results || jsonb_build_object('t', 'R2 no {{parent}} token left', 'p', v_bad = 0, 'd', v_bad || ' steps with a token');

    SELECT s.field_values -> 'runbook' -> 0 ->> 'label' INTO v_label FROM public.local_register_records s
    WHERE s.field_values -> 'runbook' @> jsonb_build_array(jsonb_build_object('id', v_record::text)) LIMIT 1;
    v_results := v_results || jsonb_build_object('t', 'R3 label is display ID – title',
      'p', v_label = CASE WHEN COALESCE(v_rec.display_id, '') <> '' THEN v_rec.display_id || ' – ' || v_rec.title ELSE v_rec.title END,
      'd', v_label);

    SELECT count(*) INTO v_bad
    FROM public.local_register_template_children c
    WHERE c.template_id = v_template
      AND NOT EXISTS (
        SELECT 1 FROM public.local_register_records s
        WHERE s.field_values -> 'runbook' @> jsonb_build_array(jsonb_build_object('id', v_record::text))
          AND s.title = c.title
          AND s.field_values ->> 'sequence' = c.field_values ->> 'sequence'
          AND s.field_values ->> 'window' = c.field_values ->> 'window'
          AND s.field_values ->> 'step_type' = c.field_values ->> 'step_type');
    v_results := v_results || jsonb_build_object('t', 'R4 order, window and type kept', 'p', v_bad = 0, 'd', v_bad || ' template steps without a match');

    INSERT INTO public.local_register_templates (register_key, template_scope, account_id, name, version, record_title,
                                                 record_status, field_values, created_by, updated_by)
    VALUES ('fin_migration_runbook', 'organisation', v_account, 'v1380 test template', 1, v_rec.title, 'planned',
            v_rec.field_values, v_user, v_user)
    RETURNING id INTO v_org_tpl;

    v_count := public.local_register_template_snapshot_children(v_org_tpl, 'fin_migration_runbook', v_project, v_account, v_record);
    SELECT count(*) INTO v_bad FROM public.local_register_template_children c
    WHERE c.template_id = v_org_tpl AND c.field_values -> 'runbook' <> '[{"id": "{{parent}}", "label": "{{parent_label}}"}]'::jsonb;
    v_results := v_results || jsonb_build_object('t', 'R5 snapshot keeps this runbook''s steps as {{parent}}',
      'p', v_count = v_expected AND v_bad = 0, 'd', format('%s children, %s without the token', v_count, v_bad));

    v_count := public.local_register_template_snapshot_children(v_org_tpl, 'fin_migration_runbook', v_project, v_account);
    v_results := v_results || jsonb_build_object('t', 'R6 4-argument snapshot keeps no reference children', 'p', v_count = 0, 'd', v_count || ' children');

    RAISE EXCEPTION 'v1380_rollback';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'v1380_rollback' THEN
      v_results := v_results || jsonb_build_object('t', 'R9 unexpected error', 'p', FALSE, 'd', SQLERRM);
    END IF;
  END;

  PERFORM set_config('request.jwt.claims', '', TRUE);
  RETURN QUERY
  SELECT e ->> 't', CASE WHEN (e ->> 'p')::boolean THEN 'PASS' ELSE 'FAIL' END, e ->> 'd'
  FROM jsonb_array_elements(v_results) e
  ORDER BY 1;
END;
$$;

SELECT * FROM public.v1380_run_tests();
DROP FUNCTION public.v1380_run_tests();
