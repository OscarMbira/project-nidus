-- v578: save_email_configuration_as_admin RPC (see SQL/v578_save_email_configuration_rpc.sql)

CREATE OR REPLACE FUNCTION public.save_email_configuration_as_admin(
  p_config_name        text,
  p_service_provider   text,
  p_from_email         text,
  p_from_name          text DEFAULT NULL,
  p_reply_to_email     text DEFAULT NULL,
  p_api_key            text DEFAULT NULL,
  p_smtp_config        jsonb DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_auth     uuid := auth.uid();
  v_user_id  uuid;
  v_sibling  text;
  v_row      public.email_configurations%ROWTYPE;
BEGIN
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT public.can_manage_email_configurations(v_auth) THEN
    RAISE EXCEPTION 'Forbidden: email configuration admin required'
      USING ERRCODE = '42501';
  END IF;

  SELECT u.id
    INTO v_user_id
    FROM public.users u
   WHERE u.auth_user_id = v_auth
      OR (
        u.auth_user_id IS NULL
        AND u.email = (SELECT email FROM auth.users WHERE id = v_auth LIMIT 1)
      )
   ORDER BY (u.auth_user_id IS NOT NULL) DESC
   LIMIT 1;

  IF p_config_name = 'Primary Resend' THEN
    v_sibling := 'Primary SMTP';
  ELSIF p_config_name = 'Primary SMTP' THEN
    v_sibling := 'Primary Resend';
  ELSE
    RAISE EXCEPTION 'Unsupported config_name: %', p_config_name USING ERRCODE = '22023';
  END IF;

  IF p_from_email IS NULL OR trim(p_from_email) = '' THEN
    RAISE EXCEPTION 'from_email is required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.email_configurations
     SET is_active  = FALSE,
         is_default = FALSE,
         updated_at = now(),
         updated_by = v_user_id
   WHERE config_name = v_sibling
     AND COALESCE(is_deleted, FALSE) = FALSE;

  INSERT INTO public.email_configurations (
    config_name,
    service_provider,
    api_key,
    smtp_config,
    from_email,
    from_name,
    reply_to_email,
    is_active,
    is_default,
    is_deleted,
    created_by,
    updated_by,
    updated_at
  )
  VALUES (
    trim(p_config_name),
    lower(trim(p_service_provider)),
    NULLIF(trim(p_api_key), ''),
    p_smtp_config,
    lower(trim(p_from_email)),
    NULLIF(trim(COALESCE(p_from_name, '')), ''),
    NULLIF(trim(COALESCE(p_reply_to_email, '')), ''),
    TRUE,
    TRUE,
    FALSE,
    v_user_id,
    v_user_id,
    now()
  )
  ON CONFLICT (config_name) DO UPDATE SET
    service_provider = EXCLUDED.service_provider,
    api_key          = COALESCE(NULLIF(EXCLUDED.api_key, ''), email_configurations.api_key),
    smtp_config      = COALESCE(EXCLUDED.smtp_config, email_configurations.smtp_config),
    from_email       = EXCLUDED.from_email,
    from_name        = EXCLUDED.from_name,
    reply_to_email   = EXCLUDED.reply_to_email,
    is_active        = TRUE,
    is_default       = TRUE,
    is_deleted       = FALSE,
    updated_by       = v_user_id,
    updated_at       = now()
  RETURNING * INTO v_row;

  RETURN json_build_object(
    'id',               v_row.id,
    'config_name',      v_row.config_name,
    'service_provider', v_row.service_provider,
    'from_email',       v_row.from_email,
    'from_name',        v_row.from_name,
    'reply_to_email',   v_row.reply_to_email,
    'is_active',        v_row.is_active,
    'is_default',       v_row.is_default,
    'updated_at',       v_row.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_email_configuration_as_admin(
  text, text, text, text, text, text, jsonb
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_email_configuration_as_admin(
  text, text, text, text, text, text, jsonb
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.save_email_configuration_as_admin(
  text, text, text, text, text, text, jsonb
) TO service_role;

COMMENT ON FUNCTION public.save_email_configuration_as_admin(
  text, text, text, text, text, text, jsonb
) IS
  'Upserts Primary Resend or Primary SMTP and deactivates the sibling provider. SECURITY DEFINER; bypasses RLS. v578.';

NOTIFY pgrst, 'reload schema';
