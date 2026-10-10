-- =============================================================================
-- v1229: Approve/Reject must not require account_id on the record table.
--
-- public.process_authoriser_decision selected account_id and project_id from
-- the governed table (for example project_decisions). Tables that only store
-- project_id then fail with: column "account_id" does not exist.
--
-- Resolve project_id when that column exists, and account_id from the table
-- or, when it does not, from public.projects. Skip the live-status transition
-- when the table has no record_status column.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.process_authoriser_decision(
  p_request_id UUID,
  p_decision TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.record_authorisation_requests;
  cfg JSONB;
  rec_account UUID;
  rec_project UUID;
  level_mode TEXT;
  level_done BOOLEAN;
  max_level INTEGER;
  approved_levels INTEGER;
  v_decision TEXT := lower(trim(COALESCE(p_decision, '')));
  has_account BOOLEAN;
  has_project BOOLEAN;
  has_record_status BOOLEAN;
BEGIN
  SELECT * INTO req FROM public.record_authorisation_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  IF v_decision IN ('reject', 'rejected') THEN
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

  SELECT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = req.table_name
      AND a.attname = 'account_id'
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) INTO has_account;

  SELECT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = req.table_name
      AND a.attname = 'project_id'
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) INTO has_project;

  IF has_account AND has_project THEN
    EXECUTE format('SELECT account_id, project_id FROM public.%I WHERE id = $1', req.table_name)
      INTO rec_account, rec_project
      USING req.record_id;
  ELSIF has_project THEN
    EXECUTE format('SELECT project_id FROM public.%I WHERE id = $1', req.table_name)
      INTO rec_project
      USING req.record_id;
  ELSIF has_account THEN
    EXECUTE format('SELECT account_id FROM public.%I WHERE id = $1', req.table_name)
      INTO rec_account
      USING req.record_id;
  END IF;

  IF rec_account IS NULL AND rec_project IS NOT NULL THEN
    SELECT p.account_id INTO rec_account
    FROM public.projects p
    WHERE p.id = rec_project;
  END IF;

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

    SELECT EXISTS (
      SELECT 1
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = req.table_name
        AND a.attname = 'record_status'
        AND a.attnum > 0
        AND NOT a.attisdropped
    ) INTO has_record_status;

    IF approved_levels >= max_level AND has_record_status THEN
      PERFORM public.transition_record_status(
        req.table_name,
        req.record_id,
        'validate',
        COALESCE(NULLIF(trim(p_notes), ''), 'Approved by authoriser')
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'approved');
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_authoriser_decision(UUID, TEXT, TEXT) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE 'v1229: process_authoriser_decision resolves account from the project when the record table has no account_id';
END $$;
