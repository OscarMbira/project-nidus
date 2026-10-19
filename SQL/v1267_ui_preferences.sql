-- ============================================================================
-- v1267 (feature v1265): per-user screen preferences (e.g. the Plan sheet's column order), kept in the database
-- so they follow the user to any browser or device.
-- PRD: projectprd/v1265_plan_sheet_and_task_classification_PRD.md (story 12a). Idempotent.
--
-- Stored in user_preferences.custom_settings -> 'ui' -> <key>. Read / written only through these
-- SECURITY DEFINER functions, which find the caller's own users row from auth.uid():
-- user_preferences' row policy compares user_id (users.id) with auth.uid() (the auth id), which
-- differ, so direct client access is unreliable.
--
--   public.get_my_ui_preference(key)          → JSONB or NULL
--   public.set_my_ui_preference(key, value)   → JSONB (the saved value); NULL value removes it
-- Keys: letters, digits, '.', '_', '-', ':' (≤ 100 chars). Values ≤ 20 KB.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_ui_preference(p_key TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.custom_settings->'ui'->p_key
  FROM public.user_preferences p
  JOIN public.users u ON u.id = p.user_id
  WHERE u.auth_user_id = auth.uid() AND COALESCE(p.is_deleted, FALSE) = FALSE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.set_my_ui_preference(p_key TEXT, p_value JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_id UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in to save your preferences' USING ERRCODE = '42501'; END IF;
  IF p_key IS NULL OR p_key !~ '^[A-Za-z0-9._:-]{1,100}$' THEN RAISE EXCEPTION 'Invalid preference key'; END IF;
  IF p_value IS NOT NULL AND length(p_value::text) > 20000 THEN RAISE EXCEPTION 'Preference value is too large'; END IF;

  SELECT id INTO v_id FROM public.user_preferences WHERE user_id = v_user AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.user_preferences (user_id, custom_settings)
    VALUES (v_user, jsonb_build_object('ui', jsonb_strip_nulls(jsonb_build_object(p_key, p_value))))
    RETURNING id INTO v_id;
  ELSIF p_value IS NULL THEN
    UPDATE public.user_preferences
       SET custom_settings = jsonb_set(COALESCE(custom_settings, '{}'::jsonb), '{ui}', COALESCE(custom_settings->'ui', '{}'::jsonb) - p_key)
     WHERE id = v_id;
  ELSE
    UPDATE public.user_preferences
       SET custom_settings = jsonb_set(COALESCE(custom_settings, '{}'::jsonb), '{ui}', COALESCE(custom_settings->'ui', '{}'::jsonb) || jsonb_build_object(p_key, p_value))
     WHERE id = v_id;
  END IF;
  RETURN p_value;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_ui_preference(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_my_ui_preference(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_ui_preference(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_ui_preference(TEXT, JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';
