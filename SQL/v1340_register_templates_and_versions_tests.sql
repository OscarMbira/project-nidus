-- ============================================================================
-- v1340 tests: register templates (v1336/v1337), one record per project + versions (v1339)
-- ============================================================================
-- Run in the Supabase SQL editor AFTER v1336–v1339. Everything the tests create is rolled back;
-- only the result table is shown. Uses its own test registers (not the real strategy register).
-- Needs one live project with an active member who has a sign-in account; otherwise SKIPPED.
--
--   T1  New from template: record + child record, first status, provenance, annexure list
--   T2  a second record in the same project is refused (function message)
--   T3  …and refused by the database for any other insert path
--   T4  a save that changes values writes a version (old → new) and content_version 2
--   T5  a save with no change writes no version
--   T6  history rows cannot be changed by clients (no UPDATE grant)
--   T7  Save as template: allowed only for PMO Admin / PM; when allowed, children are captured
--   T8  Customise a system template into an organisation template (children + annexure rows)
--   T9  a non-member cannot create a record from a template
-- Runs as a temporary function (the editor may use several connections); dropped at the end.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.v1340_run_tests()
RETURNS TABLE (test TEXT, result TEXT, detail TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_project   UUID;
  v_account   UUID;
  v_user      UUID;
  v_auth      UUID;
  v_auth_out  UUID;
  v_parent    UUID;
  v_child     UUID;
  v_tpl       UUID;
  v_tpl2      UUID;
  v_out       JSONB;
  v_record    UUID;
  v_rec       public.local_register_records;
  v_count     INT;
  v_err       TEXT;
  v_can       BOOLEAN;
  v_results   JSONB := '[]'::jsonb;
BEGIN
  SELECT pm.project_id, u.id, u.auth_user_id INTO v_project, v_user, v_auth
  FROM public.project_memberships pm
  JOIN public.users u ON u.id = pm.user_id AND u.auth_user_id IS NOT NULL
  JOIN public.projects p ON p.id = pm.project_id AND p.account_id IS NOT NULL
  WHERE pm.is_active = TRUE
  LIMIT 1;
  IF v_project IS NULL THEN
    RETURN QUERY SELECT 'T0 test data'::text, 'SKIPPED'::text, 'no project with an active member'::text;
    RETURN;
  END IF;
  SELECT account_id INTO v_account FROM public.projects WHERE id = v_project;
  SELECT u.auth_user_id INTO v_auth_out
  FROM public.users u
  WHERE u.auth_user_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.project_memberships pm WHERE pm.project_id = v_project AND pm.user_id = u.id AND pm.is_active)
    AND NOT public.is_pmo_admin_tier(u.auth_user_id)
  LIMIT 1;

  BEGIN -- sub-transaction, rolled back at the end
    INSERT INTO public.local_registers (register_key, label, scope_level, account_id, is_system_defined, status_workflow,
                                        one_record_per_project, versioned)
    VALUES ('v1340_child', 'v1340 Child', 'project', v_account, TRUE,
            '[{"key":"in_scope","label":"In Scope"},{"key":"done","label":"Done"}]'::jsonb, FALSE, FALSE)
    RETURNING id INTO v_child;
    INSERT INTO public.local_registers (register_key, label, scope_level, account_id, is_system_defined, status_workflow,
                                        one_record_per_project, versioned)
    VALUES ('v1340_parent', 'v1340 Strategy', 'project', v_account, TRUE,
            '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'::jsonb, TRUE, TRUE)
    RETURNING id INTO v_parent;
    INSERT INTO public.local_register_fields (register_id, field_key, field_label, field_type, display_order, dropdown_options)
    VALUES (v_parent, 'purpose', 'Purpose', 'long_text', 1, NULL),
           (v_parent, 'details', 'Details', 'linked_records', 2, '[{"value":"v1340_child","label":"Child"}]'::jsonb);

    INSERT INTO public.local_register_templates (register_key, template_scope, name, record_title, record_status, field_values)
    VALUES ('v1340_parent', 'system', 'v1340 template', 'Strategy for [Bank Name]', 'approved', '{"purpose":"Move [Legacy Core System] data"}'::jsonb)
    RETURNING id INTO v_tpl;
    INSERT INTO public.local_register_template_children (template_id, link_field_key, register_key, sort_order, title, status, field_values)
    VALUES (v_tpl, 'details', 'v1340_child', 1, 'Customers', 'done', '{"rules":"All active customers"}'::jsonb);
    INSERT INTO public.local_register_template_attachments (template_id, sort_order, annexure_title, storage_path, file_name, mime_type, file_size)
    VALUES (v_tpl, 1, 'Cutover timeline', 'system/' || v_tpl || '/timeline.png', 'timeline.png', 'image/png', 10);

    -- T1
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth, 'role', 'authenticated')::text, TRUE);
    v_out := public.local_register_template_create_record(v_tpl, v_project, NULL, NULL);
    v_record := (v_out ->> 'record_id')::uuid;
    SELECT * INTO v_rec FROM public.local_register_records WHERE id = v_record;
    SELECT COUNT(*) INTO v_count FROM public.local_register_records WHERE register_id = v_child AND record_project_id = v_project AND status = 'done';
    v_results := v_results || jsonb_build_object('t', 'T1 New from template',
      'p', v_rec.status = 'draft' AND v_rec.title = 'Strategy for [Bank Name]' AND v_rec.created_from_template_id = v_tpl
           AND v_rec.field_values ->> 'purpose' = 'Move [Legacy Core System] data' AND v_count = 1
           AND jsonb_array_length(v_out -> 'attachments') = 1,
      'd', v_out::text);

    -- T2
    BEGIN
      PERFORM public.local_register_template_create_record(v_tpl, v_project, 'Second', NULL); v_err := NULL;
    EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
    v_results := v_results || jsonb_build_object('t', 'T2 second record refused (function)', 'p', v_err LIKE 'This project already has a%', 'd', v_err);

    -- T3
    BEGIN
      INSERT INTO public.local_register_records (register_id, title, status, record_project_id, account_id)
      VALUES (v_parent, 'Direct', 'draft', v_project, v_account); v_err := NULL;
    EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
    v_results := v_results || jsonb_build_object('t', 'T3 second record refused (database)', 'p', v_err LIKE 'This project already has a%', 'd', v_err);

    -- T4
    UPDATE public.local_register_records SET field_values = field_values || '{"purpose":"Move core data"}'::jsonb, title = 'Strategy v2'
    WHERE id = v_record;
    SELECT * INTO v_rec FROM public.local_register_records WHERE id = v_record;
    SELECT COUNT(*) INTO v_count FROM public.local_register_record_versions
    WHERE record_id = v_record AND version_number = 2
      AND changes -> 'fv:purpose' ->> 'old' = 'Move [Legacy Core System] data'
      AND changes -> 'fv:purpose' ->> 'new' = 'Move core data'
      AND changes -> 'title' ->> 'new' = 'Strategy v2';
    v_results := v_results || jsonb_build_object('t', 'T4 save writes a version', 'p', v_rec.content_version = 2 AND v_count = 1,
      'd', v_rec.content_version || ' / ' || v_count);

    -- T5
    UPDATE public.local_register_records SET title = 'Strategy v2' WHERE id = v_record;
    SELECT COUNT(*) INTO v_count FROM public.local_register_record_versions WHERE record_id = v_record;
    v_results := v_results || jsonb_build_object('t', 'T5 no change, no version', 'p', v_count = 1, 'd', v_count::text);

    -- T6
    v_results := v_results || jsonb_build_object('t', 'T6 history read-only to clients',
      'p', NOT has_table_privilege('authenticated', 'public.local_register_record_versions', 'UPDATE')
           AND NOT has_table_privilege('authenticated', 'public.local_register_record_versions', 'DELETE')
           AND NOT has_table_privilege('authenticated', 'public.local_register_record_versions', 'INSERT'),
      'd', 'grants checked');

    -- T7
    v_can := public.auth_user_can_manage_register_templates(v_account);
    BEGIN
      v_tpl2 := public.local_register_template_save(v_record, 'Our strategy', 'Org copy', NULL, NULL); v_err := NULL;
    EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; v_tpl2 := NULL; END;
    SELECT COUNT(*) INTO v_count FROM public.local_register_template_children WHERE template_id = v_tpl2;
    v_results := v_results || jsonb_build_object('t', 'T7 save as template follows the role rule',
      'p', CASE WHEN v_can THEN v_tpl2 IS NOT NULL AND v_count = 1 ELSE v_err LIKE 'Only a PMO Admin%' END,
      'd', 'can_manage=' || v_can || ' / ' || COALESCE(v_err, 'children ' || v_count));

    -- T8
    IF v_can THEN
      v_tpl2 := public.local_register_template_customise(v_tpl, 'Customised', v_account);
      SELECT COUNT(*) INTO v_count FROM public.local_register_template_children WHERE template_id = v_tpl2;
      v_results := v_results || jsonb_build_object('t', 'T8 customise system template',
        'p', v_count = 1 AND EXISTS (SELECT 1 FROM public.local_register_template_attachments WHERE template_id = v_tpl2)
             AND EXISTS (SELECT 1 FROM public.local_register_templates WHERE id = v_tpl2 AND template_scope = 'organisation' AND source_template_id = v_tpl),
        'd', 'children ' || v_count);
    END IF;

    -- T9
    IF v_auth_out IS NOT NULL THEN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_out, 'role', 'authenticated')::text, TRUE);
      BEGIN
        PERFORM public.local_register_template_create_record(v_tpl, v_project, 'Other', NULL); v_err := NULL;
      EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
      v_results := v_results || jsonb_build_object('t', 'T9 non-member refused', 'p', v_err LIKE 'You do not have access%', 'd', v_err);
    END IF;

    RAISE EXCEPTION 'v1340_rollback';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'v1340_rollback' THEN
      v_results := v_results || jsonb_build_object('t', 'T99 unexpected error', 'p', FALSE, 'd', SQLERRM);
    END IF;
  END;

  PERFORM set_config('request.jwt.claims', '', TRUE);
  RETURN QUERY
  SELECT e ->> 't', CASE WHEN (e ->> 'p')::boolean THEN 'PASS' ELSE 'FAIL' END, e ->> 'd'
  FROM jsonb_array_elements(v_results) e
  ORDER BY 1;
END;
$$;

SELECT * FROM public.v1340_run_tests();
DROP FUNCTION public.v1340_run_tests();
