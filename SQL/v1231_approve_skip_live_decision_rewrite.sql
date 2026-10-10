-- =============================================================================
-- v1231: Approving a request must not rewrite a decision that is already live.
--
-- Review Authorisation calls public.process_authoriser_decision. After the
-- request is marked approved, the function calls transition_record_status,
-- which updates public.project_decisions (record_status / authorised_by).
-- That update hits:
--   duplicate key value violates unique constraint
--   "idx_project_decisions_reference_unique"
--
-- Sample decisions are already live. Their decision_reference is already set.
-- Approve should record the authoriser's decision and leave the decision row
-- unchanged unless the row is actually waiting in record_status = 'unauthorised'.
-- A unique-reference failure on that path must not roll back the approval.
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
  v_record_status TEXT;
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
      BEGIN
        EXECUTE format(
          'SELECT record_status FROM public.%I WHERE id = $1',
          req.table_name
        )
        INTO v_record_status
        USING req.record_id;

        -- Already-live records (sample decisions) keep their decision_reference.
        -- Rewriting them is what raises idx_project_decisions_reference_unique.
        IF v_record_status = 'unauthorised' THEN
          PERFORM public.transition_record_status(
            req.table_name,
            req.record_id,
            'validate',
            COALESCE(NULLIF(trim(p_notes), ''), 'Approved by authoriser')
          );
        END IF;
      EXCEPTION
        WHEN unique_violation THEN
          RAISE NOTICE 'v1231: approval kept; lifecycle rewrite skipped (%).', SQLERRM;
      END;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'approved');
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_authoriser_decision(UUID, TEXT, TEXT) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE 'v1231: Approve records the authoriser decision and does not rewrite an already-live decision reference';
END $$;
