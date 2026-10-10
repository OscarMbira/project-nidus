-- =============================================================================
-- v1230: Store public.users.id in authorised_by, not the login id.
--
-- transition_record_status wrote auth.uid() into authorised_by.
-- project_decisions.authorised_by references public.users(id), so Approve
-- failed with project_decisions_authorised_by_fkey.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.transition_record_status(
  p_table_name TEXT,
  p_record_id UUID,
  p_operation TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_status TEXT;
  root_id UUID;
  new_status TEXT;
  v_user_id UUID;
  has_authorised_by BOOLEAN;
BEGIN
  SELECT u.id INTO v_user_id
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
     OR u.id = auth.uid()
  ORDER BY CASE WHEN u.auth_user_id = auth.uid() THEN 0 ELSE 1 END
  LIMIT 1;

  EXECUTE format(
    'SELECT record_status, root_record_id FROM public.%I WHERE id = $1',
    p_table_name
  )
  INTO cur_status, root_id
  USING p_record_id;

  new_status := CASE p_operation
    WHEN 'validate' THEN 'live'
    WHEN 'delete' THEN NULL
    WHEN 'archive' THEN 'archived'
    WHEN 'restore' THEN 'live'
    ELSE cur_status
  END;

  IF p_operation = 'delete' THEN
    EXECUTE format(
      'DELETE FROM public.%I WHERE id = $1 AND record_status = ''unauthorised''',
      p_table_name
    )
    USING p_record_id;
    PERFORM public.lifecycle_log_transition(
      p_table_name, p_record_id, root_id, cur_status, 'deleted', 'delete', v_user_id, p_notes
    );
    RETURN jsonb_build_object('success', true, 'status', 'deleted');
  END IF;

  IF p_operation = 'validate' THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = p_table_name
        AND a.attname = 'authorised_by'
        AND a.attnum > 0
        AND NOT a.attisdropped
    ) INTO has_authorised_by;

    IF has_authorised_by THEN
      EXECUTE format(
        'UPDATE public.%I
         SET record_status = ''live'',
             authorised_by = $2,
             authorised_at = NOW()
         WHERE id = $1',
        p_table_name
      )
      USING p_record_id, v_user_id;
    ELSE
      EXECUTE format(
        'UPDATE public.%I SET record_status = ''live'' WHERE id = $1',
        p_table_name
      )
      USING p_record_id;
    END IF;
  ELSE
    EXECUTE format(
      'UPDATE public.%I SET record_status = $2 WHERE id = $1',
      p_table_name
    )
    USING p_record_id, new_status;
  END IF;

  PERFORM public.lifecycle_log_transition(
    p_table_name, p_record_id, root_id, cur_status, new_status, p_operation, v_user_id, p_notes
  );
  RETURN jsonb_build_object('success', true, 'status', new_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_record_status(TEXT, UUID, TEXT, TEXT) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE 'v1230: transition_record_status writes public.users.id into authorised_by';
END $$;
