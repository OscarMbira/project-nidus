-- v752: Record lifecycle defer-apply functions (sim schema)
-- PostgreSQL 15+ / Supabase
-- Plan: projectplan/v752_record_lifecycle_defer_apply_plan.md
-- Prerequisites: v750_record_pending_changes_infrastructure.sql, v656_sim_lifecycle_mirror.sql

CREATE OR REPLACE FUNCTION sim.resolve_physical_lifecycle_table(p_table_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_table_name
    WHEN 'risks' THEN 'practice_risks'
    WHEN 'issues' THEN 'practice_issues'
    WHEN 'tasks' THEN 'practice_tasks'
    WHEN 'defects' THEN 'practice_defects'
    WHEN 'business_cases' THEN 'practice_business_cases'
    WHEN 'stage_plans' THEN 'practice_stage_plans'
    WHEN 'highlight_reports' THEN 'practice_highlight_reports'
    WHEN 'exception_reports' THEN 'practice_exception_reports'
    WHEN 'end_stage_reports' THEN 'practice_end_stage_reports'
    WHEN 'lessons_reports' THEN 'practice_lessons_reports'
    WHEN 'project_initiation_documents' THEN 'practice_project_initiation_documents'
    WHEN 'benefits_review_plans' THEN 'practice_benefits_review_plans'
    ELSE p_table_name
  END;
$$;

CREATE OR REPLACE FUNCTION sim.merge_record_pending_changes(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS sim.record_pending_changes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
AS $$
DECLARE
  v_physical TEXT := sim.resolve_physical_lifecycle_table(p_table_name);
  v_pending sim.record_pending_changes%ROWTYPE;
  v_cols_csv TEXT;
BEGIN
  IF to_regclass(format('sim.%I', v_physical)) IS NULL THEN
    RAISE EXCEPTION 'Unknown sim lifecycle table: %', p_table_name;
  END IF;

  SELECT *
  INTO v_pending
  FROM sim.record_pending_changes pc
  WHERE pc.table_name = p_table_name
    AND pc.record_id = p_record_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_pending.proposed_changes IS NULL
     OR v_pending.proposed_changes = '{}'::jsonb
     OR jsonb_typeof(v_pending.proposed_changes) <> 'object' THEN
    DELETE FROM sim.record_pending_changes WHERE id = v_pending.id;
    RETURN v_pending;
  END IF;

  SELECT string_agg(quote_ident(key), ', ' ORDER BY key)
  INTO v_cols_csv
  FROM jsonb_object_keys(v_pending.proposed_changes) AS key;

  IF v_cols_csv IS NOT NULL AND v_cols_csv <> '' THEN
    EXECUTE format(
      'UPDATE sim.%I AS t
       SET (%s) = (SELECT %s FROM jsonb_populate_record(NULL::sim.%I, $1))
       WHERE t.id = $2',
      v_physical,
      v_cols_csv,
      v_cols_csv,
      v_physical
    )
    USING v_pending.proposed_changes, p_record_id;
  END IF;

  DELETE FROM sim.record_pending_changes WHERE id = v_pending.id;
  RETURN v_pending;
END;
$$;

CREATE OR REPLACE FUNCTION sim.get_pending_changes(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
AS $$
DECLARE
  v_physical TEXT := sim.resolve_physical_lifecycle_table(p_table_name);
  v_pending sim.record_pending_changes%ROWTYPE;
  v_row JSONB;
  v_current_values JSONB := '{}'::jsonb;
  v_key TEXT;
BEGIN
  SELECT *
  INTO v_pending
  FROM sim.record_pending_changes pc
  WHERE pc.table_name = p_table_name
    AND pc.record_id = p_record_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  EXECUTE format('SELECT to_jsonb(t) FROM sim.%I t WHERE t.id = $1', v_physical)
  INTO v_row
  USING p_record_id;

  IF v_row IS NOT NULL AND jsonb_typeof(v_pending.proposed_changes) = 'object' THEN
    FOR v_key IN SELECT jsonb_object_keys(v_pending.proposed_changes)
    LOOP
      v_current_values := v_current_values || jsonb_build_object(v_key, v_row->v_key);
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'previous_status', v_pending.previous_status,
    'proposed_changes', v_pending.proposed_changes,
    'current_values', v_current_values,
    'submitted_by', v_pending.submitted_by,
    'submitted_at', v_pending.submitted_at,
    'submission_batch_id', v_pending.submission_batch_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION sim.transition_record_status(
  p_table_name TEXT,
  p_record_id UUID,
  p_operation TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
AS $$
DECLARE
  v_physical TEXT := sim.resolve_physical_lifecycle_table(p_table_name);
  cur_status TEXT;
  root_id UUID;
  new_status TEXT;
  uid UUID := auth.uid();
  v_user_id UUID;
  v_operation TEXT := lower(trim(COALESCE(p_operation, '')));
  v_pending sim.record_pending_changes%ROWTYPE;
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE auth_user_id = uid LIMIT 1;

  EXECUTE format(
    'SELECT record_status, root_record_id FROM sim.%I WHERE id = $1 FOR UPDATE',
    v_physical
  )
  INTO cur_status, root_id
  USING p_record_id;

  IF cur_status IS NULL THEN
    RAISE EXCEPTION 'Record not found: %', p_record_id;
  END IF;

  IF v_operation = 'validate' THEN
    PERFORM sim.merge_record_pending_changes(p_table_name, p_record_id);
    new_status := 'live';
  ELSIF v_operation = 'reject' THEN
    SELECT *
    INTO v_pending
    FROM sim.record_pending_changes pc
    WHERE pc.table_name = p_table_name
      AND pc.record_id = p_record_id
    FOR UPDATE;

    new_status := COALESCE(v_pending.previous_status, 'live');

    IF FOUND THEN
      DELETE FROM sim.record_pending_changes WHERE id = v_pending.id;
    END IF;
  ELSIF v_operation = 'archive' THEN
    new_status := 'archived';
  ELSIF v_operation = 'restore' THEN
    new_status := 'live';
  ELSE
    RAISE EXCEPTION 'Unsupported sim lifecycle operation: %', p_operation;
  END IF;

  IF v_operation = 'validate' THEN
    EXECUTE format(
      'UPDATE sim.%I SET record_status = ''live'', updated_at = NOW() WHERE id = $1',
      v_physical
    )
    USING p_record_id;
  ELSE
    EXECUTE format(
      'UPDATE sim.%I SET record_status = $2, updated_at = NOW() WHERE id = $1',
      v_physical
    )
    USING p_record_id, new_status;
  END IF;

  INSERT INTO sim.record_lifecycle_logs (
    record_type, root_record_id, record_id, table_name, from_status, to_status, operation, performed_by, reason
  ) VALUES (
    p_table_name, COALESCE(root_id, p_record_id), p_record_id, p_table_name,
    cur_status, new_status, v_operation, v_user_id, p_notes
  );

  RETURN jsonb_build_object('success', true, 'status', new_status);
END;
$$;

CREATE OR REPLACE FUNCTION sim.submit_for_authorisation(
  p_table_name TEXT,
  p_record_id UUID,
  p_root_record_id UUID,
  p_submitted_by UUID,
  p_notes TEXT DEFAULT NULL,
  p_proposed_changes JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
AS $$
DECLARE
  v_physical TEXT := sim.resolve_physical_lifecycle_table(p_table_name);
  batch_id UUID := gen_random_uuid();
  rec_account UUID;
  rec_project UUID;
  cfg public.record_lifecycle_config;
  auth_count INTEGER := 0;
  v_current_status TEXT;
  v_has_proposed_changes BOOLEAN;
  v_submitter_user_id UUID;
BEGIN
  EXECUTE format(
    'SELECT record_status FROM sim.%I WHERE id = $1',
    v_physical
  )
  INTO v_current_status
  USING p_record_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Record not found: %', p_record_id;
  END IF;

  SELECT id INTO v_submitter_user_id
  FROM public.users
  WHERE auth_user_id = p_submitted_by
  LIMIT 1;

  SELECT c.account_id, c.project_id
  INTO rec_account, rec_project
  FROM sim.record_lifecycle_config c
  WHERE c.table_name = p_table_name
    AND c.is_active = TRUE
  ORDER BY CASE WHEN c.project_id IS NOT NULL THEN 0 ELSE 1 END
  LIMIT 1;

  SELECT COUNT(*)::INTEGER
  INTO auth_count
  FROM sim.record_authorisers ra
  WHERE ra.table_name = p_table_name
    AND ra.is_active = TRUE;

  SELECT * INTO cfg
  FROM sim.record_lifecycle_config c
  WHERE c.table_name = p_table_name
    AND c.is_active = TRUE
  ORDER BY CASE WHEN c.project_id IS NOT NULL THEN 0 ELSE 1 END
  LIMIT 1;

  v_has_proposed_changes := (
    p_proposed_changes IS NOT NULL
    AND jsonb_typeof(p_proposed_changes) = 'object'
    AND p_proposed_changes <> '{}'::jsonb
  );

  IF v_has_proposed_changes THEN
    UPDATE sim.record_authorisation_requests
    SET status = 'withdrawn',
        decided_at = COALESCE(decided_at, NOW())
    WHERE table_name = p_table_name
      AND record_id = p_record_id
      AND status IN ('waiting', 'pending');

    INSERT INTO sim.record_pending_changes (
      table_name, record_id, root_record_id, submission_batch_id,
      previous_status, proposed_changes, submitted_by, submitted_at
    )
    VALUES (
      p_table_name, p_record_id, COALESCE(p_root_record_id, p_record_id), batch_id,
      v_current_status, p_proposed_changes, v_submitter_user_id, NOW()
    )
    ON CONFLICT (table_name, record_id) DO UPDATE SET
      root_record_id = EXCLUDED.root_record_id,
      submission_batch_id = EXCLUDED.submission_batch_id,
      previous_status = EXCLUDED.previous_status,
      proposed_changes = EXCLUDED.proposed_changes,
      submitted_by = EXCLUDED.submitted_by,
      submitted_at = NOW();
  END IF;

  IF NOT COALESCE(cfg.approval_enabled, TRUE) OR auth_count = 0 THEN
    PERFORM sim.transition_record_status(
      p_table_name,
      p_record_id,
      'validate',
      COALESCE(NULLIF(trim(p_notes), ''), 'Auto-validated (no active authorisers)')
    );
    RETURN batch_id;
  END IF;

  INSERT INTO sim.record_authorisation_requests (
    record_type, table_name, root_record_id, record_id, submission_batch_id,
    submitted_by, authoriser_id, approval_level, role_label, status, submission_notes, activated_at
  )
  SELECT
    p_table_name, p_table_name, COALESCE(p_root_record_id, p_record_id), p_record_id, batch_id,
    v_submitter_user_id, ra.authoriser_user_id, ra.approval_level, ra.role_label,
    CASE WHEN ra.approval_level = 1 THEN 'pending' ELSE 'waiting' END,
    p_notes,
    CASE WHEN ra.approval_level = 1 THEN NOW() ELSE NULL END
  FROM sim.record_authorisers ra
  WHERE ra.table_name = p_table_name
    AND ra.is_active = TRUE;

  EXECUTE format(
    'UPDATE sim.%I SET record_status = ''unauthorised'', updated_at = NOW() WHERE id = $1',
    v_physical
  )
  USING p_record_id;

  INSERT INTO sim.record_lifecycle_logs (
    record_type, root_record_id, record_id, table_name, from_status, to_status, operation, performed_by, reason
  ) VALUES (
    p_table_name, COALESCE(p_root_record_id, p_record_id), p_record_id, p_table_name,
    v_current_status, 'unauthorised', 'submit', v_submitter_user_id, p_notes
  );

  RETURN batch_id;
END;
$$;

CREATE OR REPLACE FUNCTION sim.process_authoriser_decision(
  p_request_id UUID,
  p_decision TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
AS $$
DECLARE
  req sim.record_authorisation_requests;
  v_decision TEXT := lower(trim(COALESCE(p_decision, '')));
  v_transition JSONB;
  max_level INTEGER;
  approved_levels INTEGER;
BEGIN
  SELECT * INTO req FROM sim.record_authorisation_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  IF v_decision IN ('reject', 'rejected') THEN
    UPDATE sim.record_authorisation_requests
    SET status = CASE WHEN id = p_request_id THEN 'rejected' ELSE 'withdrawn' END,
        decision_notes = CASE WHEN id = p_request_id THEN p_notes ELSE decision_notes END,
        decided_at = CASE WHEN id = p_request_id THEN NOW() ELSE decided_at END
    WHERE submission_batch_id = req.submission_batch_id
      AND status IN ('pending', 'waiting');

    v_transition := sim.transition_record_status(
      req.table_name,
      req.record_id,
      'reject',
      COALESCE(NULLIF(trim(p_notes), ''), 'Rejected by authoriser')
    );

    RETURN jsonb_build_object('success', true, 'status', 'rejected', 'transition', v_transition);
  END IF;

  UPDATE sim.record_authorisation_requests
  SET status = 'approved', decision_notes = p_notes, decided_at = NOW()
  WHERE id = p_request_id;

  SELECT MAX(approval_level) INTO max_level
  FROM sim.record_authorisation_requests
  WHERE submission_batch_id = req.submission_batch_id;

  SELECT COUNT(DISTINCT approval_level) INTO approved_levels
  FROM sim.record_authorisation_requests
  WHERE submission_batch_id = req.submission_batch_id
    AND status = 'approved';

  IF approved_levels >= max_level THEN
    v_transition := sim.transition_record_status(
      req.table_name,
      req.record_id,
      'validate',
      COALESCE(NULLIF(trim(p_notes), ''), 'Approved by authoriser')
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'approved', 'transition', v_transition);
END;
$$;

GRANT EXECUTE ON FUNCTION sim.resolve_physical_lifecycle_table(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION sim.merge_record_pending_changes(TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION sim.get_pending_changes(TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION sim.submit_for_authorisation(TEXT, UUID, UUID, UUID, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION sim.process_authoriser_decision(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION sim.transition_record_status(TEXT, UUID, TEXT, TEXT) TO authenticated, service_role;

DO $$ BEGIN RAISE NOTICE 'v752_sim_record_lifecycle_defer_apply_functions.sql completed'; END $$;
