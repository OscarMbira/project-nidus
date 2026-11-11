-- ============================================================================
-- v1314: Register custom fields — optional settings (default value, min/max, allowed characters)
-- ============================================================================
-- Amendment to v1311 (projectplan/v1311_local_register_custom_fields_plan.md, Amendment B).
-- When a user creates a custom field they may now set, depending on the type:
--   * Default value (all types; dates may default to 'today'; dropdown defaults are option labels)
--   * Min / max value (Number), earliest / latest date (Date)
--   * Min / max length (Text, Notes, Link; per item for Multi-value list)
--   * Min / max number of items (Multi-value list, Multi-select)
--   * Allowed characters (Text, Notes, Multi-value list): any / letters / digits / letters+digits /
--     reference (letters, digits . _ / -) / a custom list of characters
-- Everything is stored in LDE's validation_rules (min, max, minLength, maxLength, pattern and
-- patternMessage are LDE's own keys; defaultValue, minDate, maxDate, minItems, maxItems and
-- allowedCharacters are new), so PMO admins can review and change them on the LDE Validation
-- Rules page. The allowed-characters pattern is always built by public.lr_cf_build_rules, never
-- taken from the client.
--
--   * public.lr_cf_slug / lr_cf_num / lr_cf_count / lr_cf_date / lr_cf_build_rules (pure helpers)
--   * <schema>.lr_cf_field_json now also returns 'rules' (validation_rules without 'required')
--   * <schema>.local_register_add_custom_field gains p_rules JSONB and p_name TEXT (old 6-argument
--     version dropped). p_name is the short field name (internal code + duplicate check); p_label is
--     what users see (defaults to the name). Both are checked against existing labels and names.
--   * <schema>.local_register_custom_field_library also returns each field's name
-- Prerequisites: v1311, v1312. Idempotent.
-- ============================================================================

DROP FUNCTION IF EXISTS public.local_register_add_custom_field(UUID, UUID, TEXT, TEXT, JSONB, BOOLEAN);
DROP FUNCTION IF EXISTS sim.local_register_add_custom_field(UUID, UUID, TEXT, TEXT, JSONB, BOOLEAN);

-- ── Helpers (public; pure, used by both public.* and sim.* add functions) ───────────

-- Option value / slug — same rule the v1312 add function used for option values.
CREATE OR REPLACE FUNCTION public.lr_cf_slug(p_text TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT left(btrim(lower(regexp_replace(btrim(COALESCE(p_text, '')), '[^a-zA-Z0-9]+', '_', 'g')), '_'), 480);
$$;

-- A number from a JSON value (number or numeric string); NULL when blank. Friendly error otherwise.
CREATE OR REPLACE FUNCTION public.lr_cf_num(p_value JSONB, p_label TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  IF p_value IS NULL OR jsonb_typeof(p_value) = 'null' OR btrim(p_value #>> '{}') = '' THEN
    RETURN NULL;
  END IF;
  RETURN (p_value #>> '{}')::numeric;
EXCEPTION WHEN invalid_text_representation THEN
  RAISE EXCEPTION '% must be a number', p_label;
END;
$$;

-- A whole number from 0 to 100000 from a JSON value; NULL when blank.
CREATE OR REPLACE FUNCTION public.lr_cf_count(p_value JSONB, p_label TEXT)
RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v NUMERIC := public.lr_cf_num(p_value, p_label);
BEGIN
  IF v IS NULL THEN RETURN NULL; END IF;
  IF v < 0 OR v <> trunc(v) OR v > 100000 THEN
    RAISE EXCEPTION '% must be a whole number from 0 to 100000', p_label;
  END IF;
  RETURN v::int;
END;
$$;

-- A YYYY-MM-DD date string from a JSON value; NULL when blank.
CREATE OR REPLACE FUNCTION public.lr_cf_date(p_value JSONB, p_label TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v TEXT := btrim(COALESCE(p_value #>> '{}', ''));
BEGIN
  IF p_value IS NULL OR jsonb_typeof(p_value) = 'null' OR v = '' THEN RETURN NULL; END IF;
  IF v !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION '% must be a date (YYYY-MM-DD)', p_label; END IF;
  RETURN v::date::text;
EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN
  RAISE EXCEPTION '% is not a valid date', p_label;
END;
$$;

/*
 * Validation rules for a new register custom field (LDE validation_rules shape).
 * Input p_rules (all optional): defaultValue, min, max, minLength, maxLength, minDate, maxDate,
 * minItems, maxItems, allowedCharacters ('any'|'letters'|'digits'|'alphanumeric'|'reference'|'custom'),
 * allowedCharactersCustom. Only the keys that fit the field type are kept; the allowed-characters
 * pattern is always built here (never taken from the client). Dropdown defaults are given as option
 * labels and stored as option values (slugs). 'today' is a valid date default.
 */
CREATE OR REPLACE FUNCTION public.lr_cf_build_rules(p_type TEXT, p_required BOOLEAN, p_rules JSONB, p_options JSONB)
RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  r          JSONB := COALESCE(NULLIF(p_rules, 'null'::jsonb), '{}'::jsonb);
  v          JSONB := jsonb_build_object('required', COALESCE(p_required, FALSE));
  d          JSONB;
  v_min      NUMERIC;
  v_max      NUMERIC;
  v_imin     INTEGER;
  v_imax     INTEGER;
  v_dmin     TEXT;
  v_dmax     TEXT;
  v_text     TEXT;
  v_preset   TEXT;
  v_custom   TEXT;
  v_slugs    TEXT[];
  v_defaults TEXT[];
BEGIN
  IF jsonb_typeof(r) <> 'object' THEN RAISE EXCEPTION 'Field settings must be an object'; END IF;
  d := NULLIF(r -> 'defaultValue', 'null'::jsonb);
  IF d IS NOT NULL AND jsonb_typeof(d) = 'string' AND btrim(d #>> '{}') = '' THEN d := NULL; END IF;

  SELECT array_agg(public.lr_cf_slug(x)) INTO v_slugs
  FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(p_options) = 'array' THEN p_options ELSE '[]'::jsonb END) x
  WHERE btrim(x) <> '';

  -- Text-like length (multi-value lists: per item)
  IF p_type IN ('text', 'long_text', 'url', 'multi_line') THEN
    v_imin := public.lr_cf_count(r -> 'minLength', 'Minimum length');
    v_imax := public.lr_cf_count(r -> 'maxLength', 'Maximum length');
    IF v_imin IS NOT NULL AND v_imax IS NOT NULL AND v_imin > v_imax THEN
      RAISE EXCEPTION 'Minimum length cannot be greater than maximum length';
    END IF;
    IF v_imin IS NOT NULL THEN v := v || jsonb_build_object('minLength', v_imin); END IF;
    IF v_imax IS NOT NULL THEN v := v || jsonb_build_object('maxLength', v_imax); END IF;
  END IF;

  -- Allowed characters (pattern built here, never from the client)
  IF p_type IN ('text', 'long_text', 'multi_line') THEN
    v_preset := COALESCE(NULLIF(btrim(r ->> 'allowedCharacters'), ''), 'any');
    IF v_preset NOT IN ('any', 'letters', 'digits', 'alphanumeric', 'reference', 'custom') THEN
      RAISE EXCEPTION 'Unknown allowed-characters choice';
    END IF;
    IF v_preset = 'letters' THEN
      v := v || jsonb_build_object('allowedCharacters', v_preset, 'pattern', '^[A-Za-z\s]*$', 'patternMessage', 'Letters and spaces only');
    ELSIF v_preset = 'digits' THEN
      v := v || jsonb_build_object('allowedCharacters', v_preset, 'pattern', '^[0-9]*$', 'patternMessage', 'Digits only');
    ELSIF v_preset = 'alphanumeric' THEN
      v := v || jsonb_build_object('allowedCharacters', v_preset, 'pattern', '^[A-Za-z0-9\s]*$', 'patternMessage', 'Letters, digits and spaces only');
    ELSIF v_preset = 'reference' THEN
      v := v || jsonb_build_object('allowedCharacters', v_preset, 'pattern', '^[A-Za-z0-9._/-]*$',
                                   'patternMessage', 'Letters, digits and . _ / - only (no spaces)');
    ELSIF v_preset = 'custom' THEN
      v_custom := COALESCE(r ->> 'allowedCharactersCustom', '');
      IF length(v_custom) < 1 OR length(v_custom) > 100 THEN
        RAISE EXCEPTION 'List between 1 and 100 allowed characters';
      END IF;
      -- Escape the characters that are special inside a [ ] class (backslash first).
      v := v || jsonb_build_object(
        'allowedCharacters', v_preset,
        'allowedCharactersCustom', v_custom,
        'pattern', '^[' || replace(replace(replace(replace(v_custom, '\', '\\'), ']', '\]'), '^', '\^'), '-', '\-') || ']*$',
        'patternMessage', 'Only these characters: ' || v_custom);
    END IF;
  END IF;

  -- Number range
  IF p_type = 'number' THEN
    v_min := public.lr_cf_num(r -> 'min', 'Minimum value');
    v_max := public.lr_cf_num(r -> 'max', 'Maximum value');
    IF v_min IS NOT NULL AND v_max IS NOT NULL AND v_min > v_max THEN
      RAISE EXCEPTION 'Minimum value cannot be greater than maximum value';
    END IF;
    IF v_min IS NOT NULL THEN v := v || jsonb_build_object('min', v_min); END IF;
    IF v_max IS NOT NULL THEN v := v || jsonb_build_object('max', v_max); END IF;
  END IF;

  -- Date range
  IF p_type = 'date' THEN
    v_dmin := public.lr_cf_date(r -> 'minDate', 'Earliest date');
    v_dmax := public.lr_cf_date(r -> 'maxDate', 'Latest date');
    IF v_dmin IS NOT NULL AND v_dmax IS NOT NULL AND v_dmin > v_dmax THEN
      RAISE EXCEPTION 'Earliest date cannot be after latest date';
    END IF;
    IF v_dmin IS NOT NULL THEN v := v || jsonb_build_object('minDate', v_dmin); END IF;
    IF v_dmax IS NOT NULL THEN v := v || jsonb_build_object('maxDate', v_dmax); END IF;
  END IF;

  -- Number of items (lists and multi-select)
  IF p_type IN ('multi_line', 'multi_select') THEN
    v_imin := public.lr_cf_count(r -> 'minItems', 'Minimum number of items');
    v_imax := public.lr_cf_count(r -> 'maxItems', 'Maximum number of items');
    IF v_imin IS NOT NULL AND v_imax IS NOT NULL AND v_imin > v_imax THEN
      RAISE EXCEPTION 'Minimum number of items cannot be greater than maximum';
    END IF;
    IF v_imin IS NOT NULL THEN v := v || jsonb_build_object('minItems', v_imin); END IF;
    IF v_imax IS NOT NULL THEN v := v || jsonb_build_object('maxItems', v_imax); END IF;
  END IF;

  -- Default value
  IF d IS NOT NULL THEN
    IF p_type IN ('text', 'long_text', 'url') THEN
      v_text := d #>> '{}';
      IF length(v_text) > 2000 THEN RAISE EXCEPTION 'Default value is too long'; END IF;
      v := v || jsonb_build_object('defaultValue', v_text);
    ELSIF p_type = 'number' THEN
      v_min := public.lr_cf_num(d, 'Default value');
      IF (v ? 'min' AND v_min < (v ->> 'min')::numeric) OR (v ? 'max' AND v_min > (v ->> 'max')::numeric) THEN
        RAISE EXCEPTION 'Default value must be within the minimum and maximum';
      END IF;
      v := v || jsonb_build_object('defaultValue', v_min);
    ELSIF p_type = 'date' THEN
      IF lower(d #>> '{}') = 'today' THEN
        v := v || jsonb_build_object('defaultValue', 'today');
      ELSE
        v_text := public.lr_cf_date(d, 'Default date');
        IF (v ? 'minDate' AND v_text < v ->> 'minDate') OR (v ? 'maxDate' AND v_text > v ->> 'maxDate') THEN
          RAISE EXCEPTION 'Default date must be within the earliest and latest dates';
        END IF;
        v := v || jsonb_build_object('defaultValue', v_text);
      END IF;
    ELSIF p_type = 'boolean' THEN
      IF jsonb_typeof(d) <> 'boolean' THEN RAISE EXCEPTION 'Default value must be Yes or No'; END IF;
      v := v || jsonb_build_object('defaultValue', d);
    ELSIF p_type = 'dropdown' THEN
      v_text := public.lr_cf_slug(d #>> '{}');
      IF NOT (v_text = ANY (COALESCE(v_slugs, ARRAY[]::text[]))) THEN
        RAISE EXCEPTION 'Default value must be one of the options';
      END IF;
      v := v || jsonb_build_object('defaultValue', v_text);
    ELSIF p_type = 'multi_select' THEN
      IF jsonb_typeof(d) <> 'array' THEN RAISE EXCEPTION 'Default values must be a list of options'; END IF;
      SELECT array_agg(DISTINCT public.lr_cf_slug(x)) INTO v_defaults FROM jsonb_array_elements_text(d) x WHERE btrim(x) <> '';
      IF v_defaults IS NOT NULL THEN
        IF NOT (v_defaults <@ COALESCE(v_slugs, ARRAY[]::text[])) THEN
          RAISE EXCEPTION 'Default values must be among the options';
        END IF;
        v := v || jsonb_build_object('defaultValue', to_jsonb(v_defaults));
      END IF;
    ELSIF p_type = 'multi_line' THEN
      v_text := CASE WHEN jsonb_typeof(d) = 'array'
                     THEN (SELECT string_agg(btrim(x), E'\n') FROM jsonb_array_elements_text(d) x WHERE btrim(x) <> '')
                     ELSE d #>> '{}' END;
      IF length(COALESCE(v_text, '')) > 4000 THEN RAISE EXCEPTION 'Default value is too long'; END IF;
      IF COALESCE(btrim(v_text), '') <> '' THEN v := v || jsonb_build_object('defaultValue', v_text); END IF;
    END IF;
  END IF;

  RETURN v;
END;
$$;

-- ════════════════════════════════ PUBLIC (Platform) ════════════════════════════════

CREATE OR REPLACE FUNCTION public.lr_cf_field_json(p_definition_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', d.id,
    'label', d.label,
    'field_type', d.field_type,
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

CREATE OR REPLACE FUNCTION public.local_register_custom_field_library(p_register_id UUID, p_account_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_screen UUID;
BEGIN
  IF p_account_id IS NULL OR NOT public.user_has_access_to_account(p_account_id) THEN
    RETURN '[]'::jsonb;
  END IF;
  v_screen := public.lr_cf_screen_id(p_register_id);
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
             'id', d.id,
             'label', d.label,
             'name', COALESCE(NULLIF(d.field_metadata ->> 'field_name', ''), d.field_code),
             'field_type', d.field_type,
             'attached', EXISTS (SELECT 1 FROM public.custom_field_screen_map m
                                 WHERE m.field_definition_id = d.id AND m.screen_id = v_screen),
             'used_in', (SELECT COUNT(*) FROM public.custom_field_screen_map m2
                         JOIN public.system_screens s2 ON s2.id = m2.screen_id
                         WHERE m2.field_definition_id = d.id)
           ) ORDER BY lower(d.label))
    FROM public.custom_field_definitions d
    WHERE d.account_id = p_account_id
      AND d.workflow_status = 'published'
      AND NOT COALESCE(d.is_deleted, FALSE)
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.local_register_add_custom_field(
  p_register_id UUID,
  p_account_id  UUID,
  p_label       TEXT,
  p_field_type  TEXT,
  p_options     JSONB DEFAULT '[]'::jsonb,
  p_required    BOOLEAN DEFAULT FALSE,
  p_rules       JSONB DEFAULT '{}'::jsonb,
  p_name        TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg_label TEXT;
  v_label     TEXT := btrim(regexp_replace(COALESCE(p_label, ''), '\s+', ' ', 'g'));
  v_norm      TEXT;
  v_existing  RECORD;
  v_screen    UUID;
  v_user      UUID := public.current_internal_user_id();
  v_code      TEXT;
  v_base      TEXT;
  v_n         INTEGER := 1;
  v_def       UUID;
  v_rules     JSONB;
  -- Field name (internal code + duplicate check); the label is what users see. Name defaults to the label.
  v_name      TEXT := btrim(regexp_replace(COALESCE(NULLIF(btrim(p_name), ''), p_label, ''), '\s+', ' ', 'g'));
  v_norm_name TEXT;
BEGIN
  v_reg_label := public.lr_cf_assert_register_access(p_register_id, p_account_id);

  IF length(v_label) < 2 OR length(v_label) > 120 THEN
    RAISE EXCEPTION 'Field label must be 2 to 120 characters';
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

  SELECT d.id, d.label INTO v_existing
  FROM public.custom_field_definitions d
  WHERE d.account_id = p_account_id
    AND NOT COALESCE(d.is_deleted, FALSE)
    AND d.workflow_status <> 'deprecated'
    AND (lower(regexp_replace(d.label, '[^a-zA-Z0-9]+', '', 'g')) IN (v_norm, v_norm_name)
         OR lower(regexp_replace(regexp_replace(d.field_code, '^lr_', ''), '[^a-zA-Z0-9]+', '', 'g')) IN (v_norm, v_norm_name))
  LIMIT 1;
  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'duplicate',
                              'existing', jsonb_build_object('id', v_existing.id, 'label', v_existing.label));
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
    (account_id, field_code, label, field_type, workflow_status, validation_rules, include_in_export,
     field_metadata, created_by, updated_by)
  VALUES
    (p_account_id, v_code, v_label, p_field_type, 'published',
     v_rules, TRUE,
     jsonb_build_object('source', 'local_register', 'created_on_register', p_register_id, 'field_name', v_name), v_user, v_user)
  RETURNING id INTO v_def;

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

-- ═══════════════════════════════════ SIM (Simulator) ═══════════════════════════════════

CREATE OR REPLACE FUNCTION sim.lr_cf_field_json(p_definition_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = sim, public
AS $$
  SELECT jsonb_build_object(
    'id', d.id,
    'label', d.label,
    'field_type', d.field_type,
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

CREATE OR REPLACE FUNCTION sim.local_register_custom_field_library(p_register_id UUID, p_account_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = sim, public
AS $$
DECLARE
  v_screen UUID;
BEGIN
  IF p_account_id IS NULL OR NOT public.user_has_access_to_account(p_account_id) THEN
    RETURN '[]'::jsonb;
  END IF;
  v_screen := sim.lr_cf_screen_id(p_register_id);
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
             'id', d.id,
             'label', d.label,
             'name', COALESCE(NULLIF(d.field_metadata ->> 'field_name', ''), d.field_code),
             'field_type', d.field_type,
             'attached', EXISTS (SELECT 1 FROM sim.custom_field_screen_map m
                                 WHERE m.field_definition_id = d.id AND m.screen_id = v_screen),
             'used_in', (SELECT COUNT(*) FROM sim.custom_field_screen_map m2 WHERE m2.field_definition_id = d.id)
           ) ORDER BY lower(d.label))
    FROM sim.custom_field_definitions d
    WHERE d.account_id = p_account_id
      AND d.workflow_status = 'published'
      AND NOT COALESCE(d.is_deleted, FALSE)
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION sim.local_register_add_custom_field(
  p_register_id UUID,
  p_account_id  UUID,
  p_label       TEXT,
  p_field_type  TEXT,
  p_options     JSONB DEFAULT '[]'::jsonb,
  p_required    BOOLEAN DEFAULT FALSE,
  p_rules       JSONB DEFAULT '{}'::jsonb,
  p_name        TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = sim, public
AS $$
DECLARE
  v_reg_label TEXT;
  v_label     TEXT := btrim(regexp_replace(COALESCE(p_label, ''), '\s+', ' ', 'g'));
  v_norm      TEXT;
  v_existing  RECORD;
  v_screen    UUID;
  v_user      UUID := public.current_internal_user_id();
  v_code      TEXT;
  v_base      TEXT;
  v_n         INTEGER := 1;
  v_def       UUID;
  v_rules     JSONB;
  -- Field name (internal code + duplicate check); the label is what users see. Name defaults to the label.
  v_name      TEXT := btrim(regexp_replace(COALESCE(NULLIF(btrim(p_name), ''), p_label, ''), '\s+', ' ', 'g'));
  v_norm_name TEXT;
BEGIN
  v_reg_label := sim.lr_cf_assert_register_access(p_register_id, p_account_id);

  IF length(v_label) < 2 OR length(v_label) > 120 THEN
    RAISE EXCEPTION 'Field label must be 2 to 120 characters';
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

  SELECT d.id, d.label INTO v_existing
  FROM sim.custom_field_definitions d
  WHERE d.account_id = p_account_id
    AND NOT COALESCE(d.is_deleted, FALSE)
    AND d.workflow_status <> 'deprecated'
    AND (lower(regexp_replace(d.label, '[^a-zA-Z0-9]+', '', 'g')) IN (v_norm, v_norm_name)
         OR lower(regexp_replace(regexp_replace(d.field_code, '^lr_', ''), '[^a-zA-Z0-9]+', '', 'g')) IN (v_norm, v_norm_name))
  LIMIT 1;
  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'duplicate',
                              'existing', jsonb_build_object('id', v_existing.id, 'label', v_existing.label));
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
    (account_id, field_code, label, field_type, workflow_status, validation_rules, include_in_export,
     field_metadata, created_by, updated_by)
  VALUES
    (p_account_id, v_code, v_label, p_field_type, 'published',
     v_rules, TRUE,
     jsonb_build_object('source', 'local_register', 'created_on_register', p_register_id, 'field_name', v_name), v_user, v_user)
  RETURNING id INTO v_def;

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
GRANT EXECUTE ON FUNCTION public.lr_cf_build_rules(TEXT, BOOLEAN, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.local_register_add_custom_field(UUID, UUID, TEXT, TEXT, JSONB, BOOLEAN, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION sim.local_register_add_custom_field(UUID, UUID, TEXT, TEXT, JSONB, BOOLEAN, JSONB, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'v1314: custom-field settings installed (rules for text, number, date, lists; default values)';
END $$;
