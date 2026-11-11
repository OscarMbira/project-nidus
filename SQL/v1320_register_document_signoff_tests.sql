-- ============================================================================
-- v1320 tests: register document sign-off (v1318 schema + v1319 functions), Platform schema.
-- Run in the Supabase SQL editor AFTER v1318 and v1319. Everything the tests create is rolled
-- back (they run inside a sub-transaction that is cancelled at the end); only the results remain
-- in the temporary table shown at the bottom.
--
-- Needs one live project with at least two active members who have sign-in accounts. If none
-- exists the run reports SKIPPED instead of failing.
--
--   S1  start: state in_progress, status In Review, slots created in order
--   S2  a locked record cannot be edited; signoff_state cannot be changed directly
--   S3  second signatory cannot sign before the first (turn order)
--   S4  first then second sign → state complete, status Approved
--   S5  restart: unlocked, status Draft, record editable again, round kept as history
--   S6  decline needs a reason; after a decline nobody can sign until restart
--   S7  starting needs a person on every mandatory slot
--   S8  a non-member cannot start sign-off
--   S10 In Review / Approved cannot be set by hand on a document register
-- ============================================================================

-- Runs as a temporary function (no temporary table: the Supabase SQL editor may run statements on
-- different connections). The function is dropped at the end.
CREATE OR REPLACE FUNCTION public.v1320_run_tests()
RETURNS TABLE (test TEXT, result TEXT, detail TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_project  UUID;
  v_account  UUID;
  v_user_a   UUID; v_auth_a UUID;
  v_user_b   UUID; v_auth_b UUID;
  v_auth_c   UUID;
  v_register UUID;
  v_record   UUID;
  v_rec      public.local_register_records;
  v_count    INT;
  v_err      TEXT;
  v_results  JSONB := '[]'::jsonb;
  v_slots    JSONB;
BEGIN
  SELECT pm.project_id INTO v_project
  FROM public.project_memberships pm
  JOIN public.users u ON u.id = pm.user_id AND u.auth_user_id IS NOT NULL
  WHERE pm.is_active = TRUE
  GROUP BY pm.project_id
  HAVING COUNT(DISTINCT pm.user_id) >= 2
  LIMIT 1;

  IF v_project IS NULL THEN
    RETURN QUERY SELECT 'S0 test data'::text, 'SKIPPED'::text, 'no project with two active members'::text;
    RETURN;
  END IF;

  SELECT account_id INTO v_account FROM public.projects WHERE id = v_project;
  SELECT u.id, u.auth_user_id INTO v_user_a, v_auth_a
  FROM public.project_memberships pm JOIN public.users u ON u.id = pm.user_id
  WHERE pm.project_id = v_project AND pm.is_active AND u.auth_user_id IS NOT NULL
  ORDER BY u.id LIMIT 1;
  SELECT u.id, u.auth_user_id INTO v_user_b, v_auth_b
  FROM public.project_memberships pm JOIN public.users u ON u.id = pm.user_id
  WHERE pm.project_id = v_project AND pm.is_active AND u.auth_user_id IS NOT NULL AND u.id <> v_user_a
  ORDER BY u.id LIMIT 1;
  SELECT u.auth_user_id INTO v_auth_c
  FROM public.users u
  WHERE u.auth_user_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.project_memberships pm WHERE pm.project_id = v_project AND pm.user_id = u.id AND pm.is_active)
    AND NOT public.is_pmo_admin_tier(u.auth_user_id)
  LIMIT 1;

  BEGIN  -- sub-transaction: everything below is rolled back at the end
    INSERT INTO public.local_registers (register_key, label, scope_level, scope_project_id, account_id, status_workflow, is_document)
    VALUES ('v1320_test_document', 'v1320 Test Document', 'project', v_project, v_account,
      '[{"key":"draft","label":"Draft"},{"key":"in_review","label":"In Review"},{"key":"approved","label":"Approved"},{"key":"superseded","label":"Superseded"}]'::jsonb,
      TRUE)
    RETURNING id INTO v_register;
    INSERT INTO public.local_register_records (register_id, title, status, record_project_id, account_id)
    VALUES (v_register, 'v1320 test', 'draft', v_project, v_account)
    RETURNING id INTO v_record;

    v_slots := jsonb_build_array(
      jsonb_build_object('role_label', 'Project Manager', 'is_mandatory', TRUE, 'assigned_user_id', v_user_a),
      jsonb_build_object('role_label', 'Sponsor', 'is_mandatory', TRUE, 'assigned_user_id', v_user_b),
      jsonb_build_object('role_label', 'Observer', 'is_mandatory', FALSE, 'assigned_user_id', NULL)
    );

    -- S10 Approved / In Review cannot be set by hand on a document register
    BEGIN
      UPDATE public.local_register_records SET status = 'approved' WHERE id = v_record; v_err := NULL;
    EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
    v_results := v_results || jsonb_build_object('t', 'S10 Approved only via sign-off', 'p', v_err LIKE 'In Review and Approved are set by sign-off%', 'd', v_err);

    -- S7 mandatory slot without a person
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_a, 'role', 'authenticated')::text, TRUE);
    BEGIN
      PERFORM public.local_register_signoff_start(v_record, jsonb_build_array(jsonb_build_object('role_label', 'Sponsor', 'is_mandatory', TRUE)));
      v_err := NULL;
    EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
    v_results := v_results || jsonb_build_object('t', 'S7 mandatory slot needs a person', 'p', v_err LIKE 'Choose a person%', 'd', v_err);

    -- S8 non-member
    IF v_auth_c IS NOT NULL THEN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_c, 'role', 'authenticated')::text, TRUE);
      BEGIN
        PERFORM public.local_register_signoff_start(v_record, v_slots); v_err := NULL;
      EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
      v_results := v_results || jsonb_build_object('t', 'S8 non-member cannot start', 'p', v_err LIKE 'You do not have access%', 'd', v_err);
    END IF;

    -- S1 start
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_a, 'role', 'authenticated')::text, TRUE);
    SELECT COUNT(*) INTO v_count FROM public.local_register_signoff_start(v_record, v_slots);
    SELECT * INTO v_rec FROM public.local_register_records WHERE id = v_record;
    v_results := v_results || jsonb_build_object('t', 'S1 start locks and sets In Review',
      'p', v_count = 3 AND v_rec.signoff_state = 'in_progress' AND v_rec.status = 'in_review',
      'd', v_count || ' / ' || v_rec.signoff_state || ' / ' || v_rec.status);

    -- S2 locked edits
    BEGIN
      UPDATE public.local_register_records SET title = 'changed' WHERE id = v_record; v_err := NULL;
    EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
    v_results := v_results || jsonb_build_object('t', 'S2a locked record cannot be edited', 'p', v_err LIKE 'This document is locked%', 'd', v_err);
    BEGIN
      UPDATE public.local_register_records SET signoff_state = 'none' WHERE id = v_record; v_err := NULL;
    EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
    v_results := v_results || jsonb_build_object('t', 'S2b signoff_state not directly changeable', 'p', v_err LIKE 'Sign-off state can only%', 'd', v_err);

    -- S3 turn order
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_b, 'role', 'authenticated')::text, TRUE);
    BEGIN
      PERFORM public.local_register_signoff_sign(v_record, 2, 'platform/' || v_record || '/1/2/signature.png', 'signature.png', 'image/png', 100);
      v_err := NULL;
    EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
    v_results := v_results || jsonb_build_object('t', 'S3 cannot sign out of turn', 'p', v_err LIKE 'It is not your turn%', 'd', v_err);

    -- S4 both sign → Approved
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_a, 'role', 'authenticated')::text, TRUE);
    PERFORM public.local_register_signoff_sign(v_record, 1, 'platform/' || v_record || '/1/1/signature.png', 'signature.png', 'image/png', 100);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_b, 'role', 'authenticated')::text, TRUE);
    PERFORM public.local_register_signoff_sign(v_record, 2, 'platform/' || v_record || '/1/2/signature.png', 'signature.png', 'image/png', 100);
    SELECT * INTO v_rec FROM public.local_register_records WHERE id = v_record;
    v_results := v_results || jsonb_build_object('t', 'S4 all mandatory signed → Approved',
      'p', v_rec.signoff_state = 'complete' AND v_rec.status = 'approved', 'd', v_rec.signoff_state || ' / ' || v_rec.status);

    -- S5 restart
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_a, 'role', 'authenticated')::text, TRUE);
    PERFORM public.local_register_signoff_restart(v_record, 'Scope changed');
    SELECT * INTO v_rec FROM public.local_register_records WHERE id = v_record;
    BEGIN
      UPDATE public.local_register_records SET title = 'v1320 test v2' WHERE id = v_record; v_err := NULL;
    EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
    SELECT COUNT(*) INTO v_count FROM public.local_register_record_signatories WHERE record_id = v_record AND signing_round = 1;
    v_results := v_results || jsonb_build_object('t', 'S5 restart unlocks, Draft, history kept',
      'p', v_rec.signoff_state = 'none' AND v_rec.status = 'draft' AND v_err IS NULL AND v_count = 3,
      'd', v_rec.signoff_state || ' / ' || v_rec.status || ' / ' || COALESCE(v_err, 'editable') || ' / ' || v_count);

    -- S6 decline
    PERFORM public.local_register_signoff_start(v_record, v_slots);
    BEGIN
      PERFORM public.local_register_signoff_decline(v_record, 1, '  '); v_err := NULL;
    EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
    v_results := v_results || jsonb_build_object('t', 'S6a decline needs a reason', 'p', v_err LIKE 'A reason is required%', 'd', v_err);
    PERFORM public.local_register_signoff_decline(v_record, 1, 'Section 4 is incomplete');
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_b, 'role', 'authenticated')::text, TRUE);
    BEGIN
      PERFORM public.local_register_signoff_sign(v_record, 2, 'platform/' || v_record || '/2/2/signature.png', 'signature.png', 'image/png', 100);
      v_err := NULL;
    EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
    SELECT * INTO v_rec FROM public.local_register_records WHERE id = v_record;
    v_results := v_results || jsonb_build_object('t', 'S6b after a decline nobody signs; still locked',
      'p', v_err IS NOT NULL AND v_rec.signoff_state = 'in_progress', 'd', COALESCE(v_err, 'signed!') || ' / ' || v_rec.signoff_state);

    RAISE EXCEPTION 'v1320_rollback';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'v1320_rollback' THEN
      v_results := v_results || jsonb_build_object('t', 'S9 unexpected error', 'p', FALSE, 'd', SQLERRM);
    END IF;
  END;

  PERFORM set_config('request.jwt.claims', '', TRUE);
  RETURN QUERY
  SELECT e ->> 't', CASE WHEN (e ->> 'p')::boolean THEN 'PASS' ELSE 'FAIL' END, e ->> 'd'
  FROM jsonb_array_elements(v_results) e
  ORDER BY 1;
END;
$$;

SELECT * FROM public.v1320_run_tests();
DROP FUNCTION public.v1320_run_tests();
