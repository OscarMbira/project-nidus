-- ============================================================================
-- v1496: Register custom fields — help required when a field is created (v1345 slice 1b, CF-D1/CF-D2)
-- ============================================================================
-- local_register_add_custom_field (public + sim) gains p_help_purpose, p_help_example (required) and
-- p_help_format (optional), saves them on the new custom_field_definitions row, and refuses a field
-- without purpose or example. lr_cf_field_json returns the help so register forms show it in the
-- ⓘ popover. Function bodies are v1314's, changed only for help and to use plain assignments
-- instead of the query forms the Supabase editor misreads (editor trap). The old 8-argument versions are dropped first so the
-- API keeps a single function to call.
-- Prerequisites: v1314, v1494. Idempotent.
-- ============================================================================

DROP FUNCTION IF EXISTS public.local_register_add_custom_field(UUID, UUID, TEXT, TEXT, JSONB, BOOLEAN, JSONB, TEXT);
DROP FUNCTION IF EXISTS sim.local_register_add_custom_field(UUID, UUID, TEXT, TEXT, JSONB, BOOLEAN, JSONB, TEXT);

-- ── Platform ──
CREATE OR REPLACE FUNCTION public.lr_cf_field_json(p_definition_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', d.id,
    'label', d.label,
    'field_type', d.field_type,
    'help_purpose', d.help_purpose,
    'help_example', d.help_example,
    'help_format', d.help_format,
    'required', COALESCE((d.validation_rules ->> 'required')::boolean, FALSE),
    'rules', COALESCE(d.validation_rules, '{}'::jsonb) - 'required',
    'options', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('value', o.option_value, 'label', o.option_label)
                       ORDER BY o.sort_order, o.option_label)
      FROM public.custom_field_options o
      WHERE o.field_definition_id = d.id AND COALESCE(o.is_active, TRUE)
    ), '[]'::jsonb)
  )
  FROM public.custom_field_definitions d
  WHERE d.id = p_definition_id;
$$;

CREATE OR REPLACE FUNCTION public.local_register_add_custom_field(
  p_register_id UUID,
  p_account_id  UUID,
  p_label       TEXT,
  p_field_type  TEXT,
  p_options     JSONB DEFAULT '[]'::jsonb,
  p_required    BOOLEAN DEFAULT FALSE,
  p_rules       JSONB DEFAULT '{}'::jsonb,
  p_name        TEXT DEFAULT NULL,
  p_help_purpose TEXT DEFAULT NULL,
  p_help_example TEXT DEFAULT NULL,
  p_help_format  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg_label TEXT;
  v_label     TEXT := btrim(regexp_replace(COALESCE(p_label, ''), '\s+', ' ', 'g'));
  v_norm      TEXT;
  v_existing_id    UUID;
  v_existing_label TEXT;
  v_screen    UUID;
  v_user      UUID := public.current_internal_user_id();
  v_code      TEXT;
  v_base      TEXT;
  v_n         INTEGER := 1;
  v_def       UUID := gen_random_uuid();
  v_rules     JSONB;
  -- Field name (internal code + duplicate check); the label is what users see. Name defaults to the label.
  v_name      TEXT := btrim(regexp_replace(COALESCE(NULLIF(btrim(p_name), ''), p_label, ''), '\s+', ' ', 'g'));
  v_norm_name TEXT;
BEGIN
  v_reg_label := public.lr_cf_assert_register_access(p_register_id, p_account_id);

  IF length(v_label) < 2 OR length(v_label) > 120 THEN
    RAISE EXCEPTION 'Field label must be 2 to 120 characters';
  END IF;
  -- v1345 slice 1b (CF-D2): purpose and example are required
  IF COALESCE(btrim(p_help_purpose), '') = '' OR COALESCE(btrim(p_help_example), '') = '' THEN
    RAISE EXCEPTION 'Help is required for field "%": add what the field is for (purpose) and an example value.', v_label
      USING ERRCODE = 'check_violation';
  END IF;
  IF p_field_type IS NULL OR p_field_type NOT IN
     ('text', 'long_text', 'number', 'date', 'boolean', 'url', 'dropdown', 'multi_select', 'multi_line') THEN
    RAISE EXCEPTION 'Unsupported field type';
  END IF;
  IF p_field_type IN ('dropdown', 'multi_select')
     AND COALESCE(jsonb_array_length(NULLIF(p_options, 'null'::jsonb)), 0) = 0 THEN
    RAISE EXCEPTION 'Add at least one option for a dropdown field';
  END IF;

  -- Optional settings (default value, ranges, allowed characters) — validated and normalised here.
  v_rules := public.lr_cf_build_rules(p_field_type, p_required, p_rules, p_options);

  v_norm := lower(regexp_replace(v_label, '[^a-zA-Z0-9]+', '', 'g'));
  v_norm_name := lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '', 'g'));
  IF v_norm = '' OR v_norm_name = '' THEN
    RAISE EXCEPTION 'Field name and label must contain letters or numbers';
  END IF;
  IF length(v_name) < 2 OR length(v_name) > 80 THEN
    RAISE EXCEPTION 'Field name must be 2 to 80 characters';
  END IF;

  -- One writer per organisation at a time, so two users cannot create the same name together.
  PERFORM pg_advisory_xact_lock(hashtext('lr_cf:' || p_account_id::text));

  v_existing_id := (
    SELECT d.id
    FROM public.custom_field_definitions d
    WHERE d.account_id = p_account_id
      AND NOT COALESCE(d.is_deleted, FALSE)
      AND d.workflow_status <> 'deprecated'
      AND (lower(regexp_replace(d.label, '[^a-zA-Z0-9]+', '', 'g')) IN (v_norm, v_norm_name)
           OR lower(regexp_replace(regexp_replace(d.field_code, '^lr_', ''), '[^a-zA-Z0-9]+', '', 'g')) IN (v_norm, v_norm_name))
    LIMIT 1);
  v_existing_label := (SELECT d.label FROM public.custom_field_definitions d WHERE d.id = v_existing_id);
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'duplicate',
                              'existing', jsonb_build_object('id', v_existing_id, 'label', v_existing_label));
  END IF;

  v_screen := public.lr_cf_ensure_screen(p_register_id, v_reg_label);
  IF public.lr_cf_used_count(v_screen, p_account_id) >= public.local_register_custom_field_limit(p_account_id) THEN
    RAISE EXCEPTION 'CUSTOM_FIELD_LIMIT_REACHED: your organisation already has % custom fields on this register',
      public.local_register_custom_field_limit(p_account_id);
  END IF;

  v_base := 'lr_' || left(btrim(lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '_', 'g')), '_'), 100);
  v_code := v_base;
  WHILE EXISTS (SELECT 1 FROM public.custom_field_definitions WHERE account_id = p_account_id AND field_code = v_code) LOOP
    v_n := v_n + 1;
    v_code := v_base || '_' || v_n;
  END LOOP;

  INSERT INTO public.custom_field_definitions
    (id, account_id, field_code, label, field_type, workflow_status, validation_rules, include_in_export,
     field_metadata, created_by, updated_by, help_purpose, help_example, help_format)
  VALUES
    (v_def, p_account_id, v_code, v_label, p_field_type, 'published',
     v_rules, TRUE,
     jsonb_build_object('source', 'local_register', 'created_on_register', p_register_id, 'field_name', v_name), v_user, v_user,
     btrim(p_help_purpose), btrim(p_help_example), NULLIF(btrim(COALESCE(p_help_format, '')), ''));

  IF p_field_type IN ('dropdown', 'multi_select') THEN
    INSERT INTO public.custom_field_options (field_definition_id, option_value, option_label, sort_order)
    SELECT v_def, opt.value, opt.label, opt.sort_order
    FROM (
      SELECT DISTINCT ON (slug)
             slug AS value, left(lbl, 500) AS label, ord::int AS sort_order
      FROM (
        SELECT btrim(t.lbl) AS lbl, t.ord,
               public.lr_cf_slug(t.lbl) AS slug
        FROM jsonb_array_elements_text(p_options) WITH ORDINALITY AS t(lbl, ord)
      ) raw
      WHERE lbl <> '' AND slug <> ''
      ORDER BY slug, ord
    ) opt
    ORDER BY opt.sort_order;
  END IF;

  INSERT INTO public.custom_field_screen_map (field_definition_id, screen_id) VALUES (v_def, v_screen);

  INSERT INTO public.custom_field_audit_log (account_id, actor_user_id, action_type, entity_table, entity_id, payload)
  VALUES (p_account_id, v_user, 'definition_created', 'custom_field_definitions', v_def,
          jsonb_build_object('source', 'local_register', 'register_id', p_register_id, 'register', v_reg_label,
                             'label', v_label, 'field_type', p_field_type, 'rules', v_rules));

  RETURN jsonb_build_object('status', 'created', 'field', public.lr_cf_field_json(v_def));
END;
$$;

-- ── Simulator ──
CREATE OR REPLACE FUNCTION sim.lr_cf_field_json(p_definition_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = sim, public
AS $$
  SELECT jsonb_build_object(
    'id', d.id,
    'label', d.label,
    'field_type', d.field_type,
    'help_purpose', d.help_purpose,
    'help_example', d.help_example,
    'help_format', d.help_format,
    'required', COALESCE((d.validation_rules ->> 'required')::boolean, FALSE),
    'rules', COALESCE(d.validation_rules, '{}'::jsonb) - 'required',
    'options', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('value', o.option_value, 'label', o.option_label)
                       ORDER BY o.sort_order, o.option_label)
      FROM sim.custom_field_options o
      WHERE o.field_definition_id = d.id AND COALESCE(o.is_active, TRUE)
    ), '[]'::jsonb)
  )
  FROM sim.custom_field_definitions d
  WHERE d.id = p_definition_id;
$$;

CREATE OR REPLACE FUNCTION sim.local_register_add_custom_field(
  p_register_id UUID,
  p_account_id  UUID,
  p_label       TEXT,
  p_field_type  TEXT,
  p_options     JSONB DEFAULT '[]'::jsonb,
  p_required    BOOLEAN DEFAULT FALSE,
  p_rules       JSONB DEFAULT '{}'::jsonb,
  p_name        TEXT DEFAULT NULL,
  p_help_purpose TEXT DEFAULT NULL,
  p_help_example TEXT DEFAULT NULL,
  p_help_format  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = sim, public
AS $$
DECLARE
  v_reg_label TEXT;
  v_label     TEXT := btrim(regexp_replace(COALESCE(p_label, ''), '\s+', ' ', 'g'));
  v_norm      TEXT;
  v_existing_id    UUID;
  v_existing_label TEXT;
  v_screen    UUID;
  v_user      UUID := public.current_internal_user_id();
  v_code      TEXT;
  v_base      TEXT;
  v_n         INTEGER := 1;
  v_def       UUID := gen_random_uuid();
  v_rules     JSONB;
  -- Field name (internal code + duplicate check); the label is what users see. Name defaults to the label.
  v_name      TEXT := btrim(regexp_replace(COALESCE(NULLIF(btrim(p_name), ''), p_label, ''), '\s+', ' ', 'g'));
  v_norm_name TEXT;
BEGIN
  v_reg_label := sim.lr_cf_assert_register_access(p_register_id, p_account_id);

  IF length(v_label) < 2 OR length(v_label) > 120 THEN
    RAISE EXCEPTION 'Field label must be 2 to 120 characters';
  END IF;
  -- v1345 slice 1b (CF-D2): purpose and example are required
  IF COALESCE(btrim(p_help_purpose), '') = '' OR COALESCE(btrim(p_help_example), '') = '' THEN
    RAISE EXCEPTION 'Help is required for field "%": add what the field is for (purpose) and an example value.', v_label
      USING ERRCODE = 'check_violation';
  END IF;
  IF p_field_type IS NULL OR p_field_type NOT IN
     ('text', 'long_text', 'number', 'date', 'boolean', 'url', 'dropdown', 'multi_select', 'multi_line') THEN
    RAISE EXCEPTION 'Unsupported field type';
  END IF;
  IF p_field_type IN ('dropdown', 'multi_select')
     AND COALESCE(jsonb_array_length(NULLIF(p_options, 'null'::jsonb)), 0) = 0 THEN
    RAISE EXCEPTION 'Add at least one option for a dropdown field';
  END IF;

  -- Optional settings (default value, ranges, allowed characters) — validated and normalised here.
  v_rules := public.lr_cf_build_rules(p_field_type, p_required, p_rules, p_options);

  v_norm := lower(regexp_replace(v_label, '[^a-zA-Z0-9]+', '', 'g'));
  v_norm_name := lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '', 'g'));
  IF v_norm = '' OR v_norm_name = '' THEN
    RAISE EXCEPTION 'Field name and label must contain letters or numbers';
  END IF;
  IF length(v_name) < 2 OR length(v_name) > 80 THEN
    RAISE EXCEPTION 'Field name must be 2 to 80 characters';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('sim_lr_cf:' || p_account_id::text));

  v_existing_id := (
    SELECT d.id
    FROM sim.custom_field_definitions d
    WHERE d.account_id = p_account_id
      AND NOT COALESCE(d.is_deleted, FALSE)
      AND d.workflow_status <> 'deprecated'
      AND (lower(regexp_replace(d.label, '[^a-zA-Z0-9]+', '', 'g')) IN (v_norm, v_norm_name)
           OR lower(regexp_replace(regexp_replace(d.field_code, '^lr_', ''), '[^a-zA-Z0-9]+', '', 'g')) IN (v_norm, v_norm_name))
    LIMIT 1);
  v_existing_label := (SELECT d.label FROM sim.custom_field_definitions d WHERE d.id = v_existing_id);
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'duplicate',
                              'existing', jsonb_build_object('id', v_existing_id, 'label', v_existing_label));
  END IF;

  v_screen := sim.lr_cf_ensure_screen(p_register_id, v_reg_label);
  IF sim.lr_cf_used_count(v_screen, p_account_id) >= public.local_register_custom_field_limit(p_account_id) THEN
    RAISE EXCEPTION 'CUSTOM_FIELD_LIMIT_REACHED: your organisation already has % custom fields on this register',
      public.local_register_custom_field_limit(p_account_id);
  END IF;

  v_base := 'lr_' || left(btrim(lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '_', 'g')), '_'), 100);
  v_code := v_base;
  WHILE EXISTS (SELECT 1 FROM sim.custom_field_definitions WHERE account_id = p_account_id AND field_code = v_code) LOOP
    v_n := v_n + 1;
    v_code := v_base || '_' || v_n;
  END LOOP;

  INSERT INTO sim.custom_field_definitions
    (id, account_id, field_code, label, field_type, workflow_status, validation_rules, include_in_export,
     field_metadata, created_by, updated_by, help_purpose, help_example, help_format)
  VALUES
    (v_def, p_account_id, v_code, v_label, p_field_type, 'published',
     v_rules, TRUE,
     jsonb_build_object('source', 'local_register', 'created_on_register', p_register_id, 'field_name', v_name), v_user, v_user,
     btrim(p_help_purpose), btrim(p_help_example), NULLIF(btrim(COALESCE(p_help_format, '')), ''));

  IF p_field_type IN ('dropdown', 'multi_select') THEN
    INSERT INTO sim.custom_field_options (field_definition_id, option_value, option_label, sort_order)
    SELECT v_def, opt.value, opt.label, opt.sort_order
    FROM (
      SELECT DISTINCT ON (slug)
             slug AS value, left(lbl, 500) AS label, ord::int AS sort_order
      FROM (
        SELECT btrim(t.lbl) AS lbl, t.ord,
               public.lr_cf_slug(t.lbl) AS slug
        FROM jsonb_array_elements_text(p_options) WITH ORDINALITY AS t(lbl, ord)
      ) raw
      WHERE lbl <> '' AND slug <> ''
      ORDER BY slug, ord
    ) opt
    ORDER BY opt.sort_order;
  END IF;

  INSERT INTO sim.custom_field_screen_map (field_definition_id, screen_id) VALUES (v_def, v_screen);

  INSERT INTO sim.custom_field_audit_log (account_id, actor_user_id, action_type, entity_table, entity_id, payload)
  VALUES (p_account_id, v_user, 'definition_created', 'custom_field_definitions', v_def,
          jsonb_build_object('source', 'local_register', 'register_id', p_register_id, 'register', v_reg_label,
                             'label', v_label, 'field_type', p_field_type, 'rules', v_rules));

  RETURN jsonb_build_object('status', 'created', 'field', sim.lr_cf_field_json(v_def));
END;
$$;

REVOKE ALL ON FUNCTION public.lr_cf_field_json(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION sim.lr_cf_field_json(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.local_register_add_custom_field(UUID, UUID, TEXT, TEXT, JSONB, BOOLEAN, JSONB, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION sim.local_register_add_custom_field(UUID, UUID, TEXT, TEXT, JSONB, BOOLEAN, JSONB, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Check: one version of each function, with the help parameters
SELECT n.nspname AS schema_name, p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'local_register_add_custom_field'
ORDER BY 1;
