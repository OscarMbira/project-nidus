-- v654: Record lifecycle database functions (public schema)
-- @see projectplan/v639_Record_Lifecycle_Management_Plan.md

-- ── Config resolution ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_archive_override(
  p_account_id UUID,
  p_table_name TEXT
)
RETURNS public.record_archive_config LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  row public.record_archive_config;
BEGIN
  SELECT * INTO row
  FROM public.record_archive_config
  WHERE account_id = p_account_id
    AND table_name = p_table_name
    AND is_active = TRUE
    AND effective_from <= CURRENT_DATE
    AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
  LIMIT 1;
  RETURN row;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_lifecycle_config(
  p_account_id UUID,
  p_project_id UUID,
  p_table_name TEXT
)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cfg public.record_lifecycle_config;
  override public.record_archive_config;
  result JSONB;
BEGIN
  SELECT * INTO cfg
  FROM public.record_lifecycle_config
  WHERE table_name = p_table_name
    AND is_active = TRUE
    AND (
      (p_project_id IS NOT NULL AND project_id = p_project_id)
      OR (project_id IS NULL AND account_id = p_account_id)
    )
  ORDER BY CASE WHEN project_id IS NOT NULL THEN 0 ELSE 1 END
  LIMIT 1;

  SELECT * INTO override FROM public.get_archive_override(p_account_id, p_table_name);

  result := jsonb_build_object(
    'approvalEnabled', COALESCE(cfg.approval_enabled, TRUE),
    'levelApprovalMode', COALESCE(cfg.level_approval_mode, 'any'),
    'historyRetentionDays', COALESCE(override.history_retention_days, cfg.history_retention_days),
    'autoArchiveEnabled', COALESCE(override.auto_archive_enabled, cfg.auto_archive_enabled, FALSE),
    'archiveRetentionYears', COALESCE(override.archive_retention_years, cfg.archive_retention_years),
    'archiveOverrideReason', override.override_reason,
    'archiveRegulatoryRef', override.regulatory_reference
  );
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_authoriser_count(
  p_account_id UUID,
  p_project_id UUID,
  p_table_name TEXT
)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.record_authorisers ra
  WHERE ra.table_name = p_table_name
    AND ra.is_active = TRUE
    AND (
      (p_project_id IS NOT NULL AND ra.project_id = p_project_id)
      OR (ra.project_id IS NULL AND ra.account_id = p_account_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.get_approval_chain(
  p_account_id UUID,
  p_project_id UUID,
  p_table_name TEXT
)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chain JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'level', ra.approval_level,
      'authoriserUserId', ra.authoriser_user_id,
      'fullName', u.full_name,
      'roleLabel', ra.role_label
    ) ORDER BY ra.approval_level, u.full_name
  ), '[]'::jsonb)
  INTO chain
  FROM public.record_authorisers ra
  JOIN public.users u ON u.id = ra.authoriser_user_id
  WHERE ra.table_name = p_table_name
    AND ra.is_active = TRUE
    AND (
      (p_project_id IS NOT NULL AND ra.project_id = p_project_id)
      OR (ra.project_id IS NULL AND ra.account_id = p_account_id)
    );
  RETURN chain;
END;
$$;

-- ── Authorisation workflow ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_for_authorisation(
  p_table_name TEXT,
  p_record_id UUID,
  p_root_record_id UUID,
  p_submitted_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  batch_id UUID := gen_random_uuid();
  rec_account UUID;
  rec_project UUID;
  cfg JSONB;
  auth_count INTEGER;
BEGIN
  EXECUTE format('SELECT account_id, project_id FROM public.%I WHERE id = $1', p_table_name)
    INTO rec_account, rec_project USING p_record_id;

  cfg := public.get_lifecycle_config(rec_account, rec_project, p_table_name);
  auth_count := public.get_authoriser_count(rec_account, rec_project, p_table_name);

  IF NOT COALESCE((cfg->>'approvalEnabled')::boolean, TRUE) OR auth_count = 0 THEN
    PERFORM public.transition_record_status(p_table_name, p_record_id, 'validate', p_notes);
    RETURN batch_id;
  END IF;

  INSERT INTO public.record_authorisation_requests (
    record_type, table_name, root_record_id, record_id, submission_batch_id,
    submitted_by, authoriser_id, approval_level, role_label, status, submission_notes, activated_at
  )
  SELECT
    p_table_name, p_table_name, p_root_record_id, p_record_id, batch_id,
    p_submitted_by, ra.authoriser_user_id, ra.approval_level, ra.role_label,
    CASE WHEN ra.approval_level = 1 THEN 'pending' ELSE 'waiting' END,
    p_notes,
    CASE WHEN ra.approval_level = 1 THEN NOW() ELSE NULL END
  FROM public.record_authorisers ra
  WHERE ra.table_name = p_table_name
    AND ra.is_active = TRUE
    AND (
      (rec_project IS NOT NULL AND ra.project_id = rec_project)
      OR (ra.project_id IS NULL AND ra.account_id = rec_account)
    );

  EXECUTE format(
    'UPDATE public.%I SET record_status = ''unauthorised'' WHERE id = $1',
    p_table_name
  ) USING p_record_id;

  INSERT INTO public.record_lifecycle_logs (
    record_type, root_record_id, record_id, table_name, from_status, to_status, operation, performed_by, reason
  ) VALUES (
    p_table_name, p_root_record_id, p_record_id, p_table_name, 'live', 'unauthorised', 'submit', p_submitted_by, p_notes
  );

  RETURN batch_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_approval_progress(p_submission_batch_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  levels JSONB;
  current_level INTEGER;
  next_name TEXT;
  all_complete BOOLEAN;
BEGIN
  SELECT COALESCE(jsonb_agg(level_obj ORDER BY lvl), '[]'::jsonb)
  INTO levels
  FROM (
    SELECT
      r.approval_level AS lvl,
      jsonb_build_object(
        'level', r.approval_level,
        'label', MAX(r.role_label),
        'authorisers', jsonb_agg(jsonb_build_object(
          'name', u.full_name,
          'status', r.status,
          'decidedAt', r.decided_at
        ) ORDER BY u.full_name)
      ) AS level_obj
    FROM public.record_authorisation_requests r
    JOIN public.users u ON u.id = r.authoriser_id
    WHERE r.submission_batch_id = p_submission_batch_id
    GROUP BY r.approval_level
  ) s;

  SELECT MIN(r.approval_level) INTO current_level
  FROM public.record_authorisation_requests r
  WHERE r.submission_batch_id = p_submission_batch_id
    AND r.status IN ('pending', 'waiting');

  SELECT u.full_name INTO next_name
  FROM public.record_authorisation_requests r
  JOIN public.users u ON u.id = r.authoriser_id
  WHERE r.submission_batch_id = p_submission_batch_id
    AND r.status = 'pending'
  ORDER BY r.approval_level, u.full_name
  LIMIT 1;

  SELECT NOT EXISTS (
    SELECT 1 FROM public.record_authorisation_requests r
    WHERE r.submission_batch_id = p_submission_batch_id
      AND r.status NOT IN ('approved', 'withdrawn')
  ) INTO all_complete;

  RETURN jsonb_build_object(
    'levels', levels,
    'currentLevel', current_level,
    'nextApproverName', next_name,
    'allComplete', COALESCE(all_complete, FALSE)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.process_authoriser_decision(
  p_request_id UUID,
  p_decision TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  req public.record_authorisation_requests;
  cfg JSONB;
  rec_account UUID;
  rec_project UUID;
  level_mode TEXT;
  level_done BOOLEAN;
  max_level INTEGER;
  approved_levels INTEGER;
BEGIN
  SELECT * INTO req FROM public.record_authorisation_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  IF p_decision = 'reject' THEN
    UPDATE public.record_authorisation_requests
    SET status = CASE WHEN id = p_request_id THEN 'rejected' ELSE 'withdrawn' END,
        decision_notes = CASE WHEN id = p_request_id THEN p_notes ELSE decision_notes END,
        decided_at = CASE WHEN id = p_request_id THEN NOW() ELSE decided_at END
    WHERE submission_batch_id = req.submission_batch_id
      AND status IN ('pending', 'waiting');
    RETURN jsonb_build_object('success', true, 'status', 'rejected');
  END IF;

  UPDATE public.record_authorisation_requests
  SET status = 'approved', decision_notes = p_notes, decided_at = NOW()
  WHERE id = p_request_id;

  EXECUTE format('SELECT account_id, project_id FROM public.%I WHERE id = $1', req.table_name)
    INTO rec_account, rec_project USING req.record_id;
  cfg := public.get_lifecycle_config(rec_account, rec_project, req.table_name);
  level_mode := COALESCE(cfg->>'levelApprovalMode', 'any');

  IF level_mode = 'all' THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM public.record_authorisation_requests
      WHERE submission_batch_id = req.submission_batch_id
        AND approval_level = req.approval_level
        AND status NOT IN ('approved', 'withdrawn')
    ) INTO level_done;
  ELSE
    level_done := TRUE;
    UPDATE public.record_authorisation_requests
    SET status = 'withdrawn'
    WHERE submission_batch_id = req.submission_batch_id
      AND approval_level = req.approval_level
      AND id <> p_request_id
      AND status = 'pending';
  END IF;

  IF level_done THEN
    UPDATE public.record_authorisation_requests
    SET status = 'pending', activated_at = NOW()
    WHERE submission_batch_id = req.submission_batch_id
      AND approval_level = req.approval_level + 1
      AND status = 'waiting';

    SELECT MAX(approval_level) INTO max_level
    FROM public.record_authorisation_requests
    WHERE submission_batch_id = req.submission_batch_id;

    SELECT COUNT(DISTINCT approval_level) INTO approved_levels
    FROM public.record_authorisation_requests
    WHERE submission_batch_id = req.submission_batch_id
      AND status = 'approved';

    IF approved_levels >= max_level THEN
      PERFORM public.transition_record_status(req.table_name, req.record_id, 'validate', p_notes);
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'approved');
END;
$$;

-- ── Status transitions ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.lifecycle_log_transition(
  p_table_name TEXT,
  p_record_id UUID,
  p_root_record_id UUID,
  p_from TEXT,
  p_to TEXT,
  p_operation TEXT,
  p_user UUID,
  p_reason TEXT DEFAULT NULL,
  p_version INTEGER DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.record_lifecycle_logs (
    record_type, root_record_id, record_id, table_name, from_status, to_status,
    operation, performed_by, reason, version_number
  ) VALUES (
    p_table_name, p_root_record_id, p_record_id, p_table_name, p_from, p_to,
    p_operation, p_user, p_reason, p_version
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_record_status(
  p_table_name TEXT,
  p_record_id UUID,
  p_operation TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cur_status TEXT;
  root_id UUID;
  new_status TEXT;
  uid UUID := auth.uid();
BEGIN
  EXECUTE format('SELECT record_status, root_record_id FROM public.%I WHERE id = $1', p_table_name)
    INTO cur_status, root_id USING p_record_id;

  new_status := CASE p_operation
    WHEN 'validate' THEN 'live'
    WHEN 'delete' THEN NULL
    WHEN 'archive' THEN 'archived'
    WHEN 'restore' THEN 'live'
    ELSE cur_status
  END;

  IF p_operation = 'delete' THEN
    EXECUTE format('DELETE FROM public.%I WHERE id = $1 AND record_status = ''unauthorised''', p_table_name)
      USING p_record_id;
    PERFORM public.lifecycle_log_transition(p_table_name, p_record_id, root_id, cur_status, 'deleted', 'delete', uid, p_notes);
    RETURN jsonb_build_object('success', true, 'status', 'deleted');
  END IF;

  IF p_operation = 'validate' THEN
    EXECUTE format(
      'UPDATE public.%I SET record_status = ''live'', authorised_by = $2, authorised_at = NOW() WHERE id = $1',
      p_table_name
    ) USING p_record_id, uid;
  ELSE
    EXECUTE format('UPDATE public.%I SET record_status = $2 WHERE id = $1', p_table_name)
      USING p_record_id, new_status;
  END IF;

  PERFORM public.lifecycle_log_transition(p_table_name, p_record_id, root_id, cur_status, new_status, p_operation, uid, p_notes);
  RETURN jsonb_build_object('success', true, 'status', new_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_history_record(
  p_table_name TEXT,
  p_record_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  hist_table TEXT := p_table_name || '_history';
  arch_table TEXT := p_table_name || '_archive';
  uid UUID := auth.uid();
BEGIN
  IF to_regclass('public.' || hist_table) IS NULL THEN
    PERFORM public.transition_record_status(p_table_name, p_record_id, 'archive', p_reason);
    RETURN jsonb_build_object('success', true, 'status', 'archived');
  END IF;

  EXECUTE format(
    'INSERT INTO public.%I SELECT t.*, NOW(), $2 FROM public.%I t WHERE t.id = $1',
    arch_table, hist_table
  ) USING p_record_id, uid;

  EXECUTE format('DELETE FROM public.%I WHERE id = $1', hist_table) USING p_record_id;
  RETURN jsonb_build_object('success', true, 'status', 'archived');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_record_lifecycle_chain(
  p_record_type TEXT,
  p_root_record_id UUID
)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  all_view TEXT := p_record_type || '_all';
  chain JSONB;
BEGIN
  IF to_regclass('public.' || all_view) IS NOT NULL THEN
    EXECUTE format(
      'SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.record_version), ''[]''::jsonb) FROM public.%I t WHERE t.root_record_id = $1',
      all_view
    ) INTO chain USING p_root_record_id;
  ELSE
    EXECUTE format(
      'SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.record_version), ''[]''::jsonb) FROM public.%I t WHERE t.root_record_id = $1',
      p_record_type
    ) INTO chain USING p_root_record_id;
  END IF;
  RETURN chain;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_version(
  p_record_type TEXT,
  p_root_record_id UUID
)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  row JSONB;
BEGIN
  IF to_regclass('public.' || p_record_type || '_all') IS NOT NULL THEN
    EXECUTE format(
      $q$SELECT row_to_json(t) FROM public.%I t
        WHERE t.root_record_id = $1
          AND t.record_status IN ('live', 'unauthorised')
        ORDER BY t.record_version DESC LIMIT 1$q$,
      p_record_type || '_all'
    ) INTO row USING p_root_record_id;
  ELSE
    EXECUTE format(
      $q$SELECT row_to_json(t) FROM public.%I t
        WHERE t.root_record_id = $1
          AND t.record_status IN ('live', 'unauthorised')
        ORDER BY t.record_version DESC LIMIT 1$q$,
      p_record_type
    ) INTO row USING p_root_record_id;
  END IF;
  RETURN row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lifecycle_config(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_archive_override(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_authoriser_count(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_approval_chain(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_for_authorisation(TEXT, UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_authoriser_decision(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_approval_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_record_status(TEXT, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_history_record(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_record_lifecycle_chain(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_version(TEXT, UUID) TO authenticated;

DO $$ BEGIN RAISE NOTICE 'v654_lifecycle_functions.sql completed'; END $$;
