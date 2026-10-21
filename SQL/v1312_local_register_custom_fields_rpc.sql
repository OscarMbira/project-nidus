-- ============================================================================
-- v1312: Organisation custom fields on Local Registers — RPCs (public + sim)
-- ============================================================================
-- PRD: projectprd/v1311_local_register_custom_fields_PRD.md (D2, D3, D6, D9, D12, D14)
--
-- Non-admin users create/attach organisation custom fields ONLY through these SECURITY DEFINER
-- functions. LDE's table RLS (account-wide definitions = PMO admin only, v516/v846) is NOT
-- widened (rule 42). Every function checks:
--   * the caller belongs to p_account_id            (public.user_has_access_to_account)
--   * the register is usable by that organisation   (system-defined, or owned by the account)
-- and the write functions additionally check the duplicate name and the configured limit.
--
--   <schema>.local_register_custom_fields(register, account)        -> {fields, used, limit, can_manage}
--   <schema>.local_register_custom_field_library(register, account) -> organisation field library
--   <schema>.local_register_add_custom_field(register, account, label, type, options, required)
--        -> {status:'created', field} | {status:'duplicate', existing:{id,label}}
--   <schema>.local_register_attach_custom_field(register, account, definition)
--        -> {status:'attached'|'already_attached', field}
-- Errors use readable messages; the limit error starts with 'CUSTOM_FIELD_LIMIT_REACHED'.
--
-- Simulator (sim.*): definitions/screens/map/audit in sim.*; registers are either
-- system-defined (public.local_registers) or member-created (sim.local_registers).
-- Prerequisite: v1311. Idempotent (CREATE OR REPLACE).
-- ============================================================================

-- ════════════════════════════════ PUBLIC (Platform) ════════════════════════════════

CREATE OR REPLACE FUNCTION public.lr_cf_assert_register_access(p_register_id UUID, p_account_id UUID)
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label  TEXT;
  v_system BOOLEAN;
  v_owner  UUID;
BEGIN
  IF p_account_id IS NULL OR NOT public.user_has_access_to_account(p_account_id) THEN
    RAISE EXCEPTION 'You do not belong to this organisation' USING ERRCODE = '42501';
  END IF;
  SELECT label, is_system_defined, account_id INTO v_label, v_system, v_owner
  FROM public.local_registers
  WHERE id = p_register_id AND is_active;
  IF v_label IS NULL THEN
    RAISE EXCEPTION 'Register not found';
  END IF;
  IF NOT v_system AND v_owner IS DISTINCT FROM p_account_id THEN
    RAISE EXCEPTION 'This register belongs to another organisation' USING ERRCODE = '42501';
  END IF;
  RETURN v_label;
END;
$$;

CREATE OR REPLACE FUNCTION public.lr_cf_screen_id(p_register_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM public.system_screens s
  JOIN public.system_modules m ON m.id = s.module_id
  WHERE m.module_code = 'local_registers' AND s.screen_code = 'local_register:' || p_register_id::text;
$$;

CREATE OR REPLACE FUNCTION public.lr_cf_ensure_screen(p_register_id UUID, p_label TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_screen UUID;
BEGIN
  INSERT INTO public.system_screens (module_id, screen_code, screen_name, entity_type, route_hint)
  SELECT m.id, 'local_register:' || p_register_id::text, left(p_label, 200), 'local_register_record',
         '/platform/local-registers/' || p_register_id::text
  FROM public.system_modules m
  WHERE m.module_code = 'local_registers'
  ON CONFLICT (module_id, screen_code) DO UPDATE SET screen_name = EXCLUDED.screen_name, is_active = TRUE
  RETURNING id INTO v_screen;
  IF v_screen IS NULL THEN
    RAISE EXCEPTION 'Local registers module missing — run SQL v1311 first';
  END IF;
  RETURN v_screen;
END;
$$;

CREATE OR REPLACE FUNCTION public.lr_cf_used_count(p_screen_id UUID, p_account_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.custom_field_screen_map m
  JOIN public.custom_field_definitions d ON d.id = m.field_definition_id
  WHERE m.screen_id = p_screen_id
    AND d.account_id = p_account_id
    AND d.workflow_status = 'published'
    AND NOT COALESCE(d.is_deleted, FALSE);
$$;

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

CREATE OR REPLACE FUNCTION public.local_register_custom_fields(p_register_id UUID, p_account_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_screen UUID;
  v_limit  INTEGER;
  v_fields JSONB := '[]'::jsonb;
BEGIN
  IF p_account_id IS NULL OR NOT public.user_has_access_to_account(p_account_id) THEN
    RETURN jsonb_build_object('fields', '[]'::jsonb, 'used', 0, 'limit', 0, 'can_manage', FALSE);
  END IF;
  v_limit := public.local_register_custom_field_limit(p_account_id);
  v_screen := public.lr_cf_screen_id(p_register_id);
  IF v_screen IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(public.lr_cf_field_json(d.id) ORDER BY m.created_at, d.label), '[]'::jsonb)
    INTO v_fields
    FROM public.custom_field_screen_map m
    JOIN public.custom_field_definitions d ON d.id = m.field_definition_id
    WHERE m.screen_id = v_screen
      AND d.account_id = p_account_id
      AND d.workflow_status = 'published'
      AND NOT COALESCE(d.is_deleted, FALSE);
  END IF;
  RETURN jsonb_build_object(
    'fields', v_fields,
    'used', jsonb_array_length(v_fields),
    'limit', v_limit,
    -- Same rule as LDE's edit RLS (v516/v520), so the "Manage fields" link only shows when it works.
    'can_manage', public.is_pmo_admin_user()
  );
END;
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
  p_required    BOOLEAN DEFAULT FALSE
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
BEGIN
  v_reg_label := public.lr_cf_assert_register_access(p_register_id, p_account_id);

  IF length(v_label) < 2 OR length(v_label) > 120 THEN
    RAISE EXCEPTION 'Field name must be 2 to 120 characters';
  END IF;
  IF p_field_type IS NULL OR p_field_type NOT IN
     ('text', 'long_text', 'number', 'date', 'boolean', 'url', 'dropdown', 'multi_select', 'multi_line') THEN
    RAISE EXCEPTION 'Unsupported field type';
  END IF;
  IF p_field_type IN ('dropdown', 'multi_select')
     AND COALESCE(jsonb_array_length(NULLIF(p_options, 'null'::jsonb)), 0) = 0 THEN
    RAISE EXCEPTION 'Add at least one option for a dropdown field';
  END IF;

  v_norm := lower(regexp_replace(v_label, '[^a-zA-Z0-9]+', '', 'g'));
  IF v_norm = '' THEN
    RAISE EXCEPTION 'Field name must contain letters or numbers';
  END IF;

  -- One writer per organisation at a time, so two users cannot create the same name together.
  PERFORM pg_advisory_xact_lock(hashtext('lr_cf:' || p_account_id::text));

  SELECT d.id, d.label INTO v_existing
  FROM public.custom_field_definitions d
  WHERE d.account_id = p_account_id
    AND NOT COALESCE(d.is_deleted, FALSE)
    AND d.workflow_status <> 'deprecated'
    AND lower(regexp_replace(d.label, '[^a-zA-Z0-9]+', '', 'g')) = v_norm
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

  v_base := 'lr_' || left(btrim(lower(regexp_replace(v_label, '[^a-zA-Z0-9]+', '_', 'g')), '_'), 100);
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
     jsonb_build_object('required', COALESCE(p_required, FALSE)), TRUE,
     jsonb_build_object('source', 'local_register', 'created_on_register', p_register_id), v_user, v_user)
  RETURNING id INTO v_def;

  IF p_field_type IN ('dropdown', 'multi_select') THEN
    INSERT INTO public.custom_field_options (field_definition_id, option_value, option_label, sort_order)
    SELECT v_def, opt.value, opt.label, opt.sort_order
    FROM (
      SELECT DISTINCT ON (slug)
             slug AS value, left(lbl, 500) AS label, ord::int AS sort_order
      FROM (
        SELECT btrim(t.lbl) AS lbl, t.ord,
               left(btrim(lower(regexp_replace(btrim(t.lbl), '[^a-zA-Z0-9]+', '_', 'g')), '_'), 480) AS slug
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
                             'label', v_label, 'field_type', p_field_type, 'required', COALESCE(p_required, FALSE)));

  RETURN jsonb_build_object('status', 'created', 'field', public.lr_cf_field_json(v_def));
END;
$$;

CREATE OR REPLACE FUNCTION public.local_register_attach_custom_field(
  p_register_id   UUID,
  p_account_id    UUID,
  p_definition_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg_label TEXT;
  v_screen    UUID;
  v_user      UUID := public.current_internal_user_id();
BEGIN
  v_reg_label := public.lr_cf_assert_register_access(p_register_id, p_account_id);

  IF NOT EXISTS (SELECT 1 FROM public.custom_field_definitions d
                 WHERE d.id = p_definition_id AND d.account_id = p_account_id
                   AND d.workflow_status = 'published' AND NOT COALESCE(d.is_deleted, FALSE)) THEN
    RAISE EXCEPTION 'Custom field not found for your organisation';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('lr_cf:' || p_account_id::text));
  v_screen := public.lr_cf_ensure_screen(p_register_id, v_reg_label);

  IF EXISTS (SELECT 1 FROM public.custom_field_screen_map WHERE field_definition_id = p_definition_id AND screen_id = v_screen) THEN
    RETURN jsonb_build_object('status', 'already_attached', 'field', public.lr_cf_field_json(p_definition_id));
  END IF;
  IF public.lr_cf_used_count(v_screen, p_account_id) >= public.local_register_custom_field_limit(p_account_id) THEN
    RAISE EXCEPTION 'CUSTOM_FIELD_LIMIT_REACHED: your organisation already has % custom fields on this register',
      public.local_register_custom_field_limit(p_account_id);
  END IF;

  INSERT INTO public.custom_field_screen_map (field_definition_id, screen_id) VALUES (p_definition_id, v_screen);
  INSERT INTO public.custom_field_audit_log (account_id, actor_user_id, action_type, entity_table, entity_id, payload)
  VALUES (p_account_id, v_user, 'screen_map_changed', 'custom_field_screen_map', p_definition_id,
          jsonb_build_object('source', 'local_register', 'action', 'attached', 'register_id', p_register_id, 'register', v_reg_label));

  RETURN jsonb_build_object('status', 'attached', 'field', public.lr_cf_field_json(p_definition_id));
END;
$$;

REVOKE ALL ON FUNCTION public.lr_cf_assert_register_access(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lr_cf_ensure_screen(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lr_cf_used_count(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lr_cf_screen_id(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lr_cf_field_json(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.local_register_custom_fields(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.local_register_custom_field_library(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.local_register_add_custom_field(UUID, UUID, TEXT, TEXT, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.local_register_attach_custom_field(UUID, UUID, UUID) TO authenticated;

-- ═══════════════════════════════════ SIM (Simulator) ═══════════════════════════════════

CREATE OR REPLACE FUNCTION sim.lr_cf_assert_register_access(p_register_id UUID, p_account_id UUID)
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = sim, public
AS $$
DECLARE
  v_label TEXT;
  v_owner UUID;
BEGIN
  IF p_account_id IS NULL OR NOT public.user_has_access_to_account(p_account_id) THEN
    RAISE EXCEPTION 'You do not belong to this organisation' USING ERRCODE = '42501';
  END IF;
  -- Member-created Simulator register …
  SELECT label, account_id INTO v_label, v_owner
  FROM sim.local_registers
  WHERE id = p_register_id AND is_active AND NOT COALESCE(is_deleted, FALSE);
  IF v_label IS NOT NULL THEN
    IF v_owner IS DISTINCT FROM p_account_id THEN
      RAISE EXCEPTION 'This register belongs to another organisation' USING ERRCODE = '42501';
    END IF;
    RETURN v_label;
  END IF;
  -- … or a shared system-defined register (public.local_registers).
  SELECT label INTO v_label
  FROM public.local_registers
  WHERE id = p_register_id AND is_active AND is_system_defined;
  IF v_label IS NULL THEN
    RAISE EXCEPTION 'Register not found';
  END IF;
  RETURN v_label;
END;
$$;

CREATE OR REPLACE FUNCTION sim.lr_cf_screen_id(p_register_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = sim, public
AS $$
  SELECT s.id
  FROM sim.system_screens s
  JOIN sim.system_modules m ON m.id = s.module_id
  WHERE m.module_code = 'local_registers' AND s.screen_code = 'local_register:' || p_register_id::text;
$$;

CREATE OR REPLACE FUNCTION sim.lr_cf_ensure_screen(p_register_id UUID, p_label TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = sim, public
AS $$
DECLARE
  v_screen UUID;
BEGIN
  INSERT INTO sim.system_screens (module_id, screen_code, screen_name, entity_type, route_hint)
  SELECT m.id, 'local_register:' || p_register_id::text, left(p_label, 200), 'local_register_record',
         '/simulator/local-registers/' || p_register_id::text
  FROM sim.system_modules m
  WHERE m.module_code = 'local_registers'
  ON CONFLICT (module_id, screen_code) DO UPDATE SET screen_name = EXCLUDED.screen_name, is_active = TRUE
  RETURNING id INTO v_screen;
  IF v_screen IS NULL THEN
    RAISE EXCEPTION 'Local registers module missing — run SQL v1311 first';
  END IF;
  RETURN v_screen;
END;
$$;

CREATE OR REPLACE FUNCTION sim.lr_cf_used_count(p_screen_id UUID, p_account_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = sim, public
AS $$
  SELECT COUNT(*)::int
  FROM sim.custom_field_screen_map m
  JOIN sim.custom_field_definitions d ON d.id = m.field_definition_id
  WHERE m.screen_id = p_screen_id
    AND d.account_id = p_account_id
    AND d.workflow_status = 'published'
    AND NOT COALESCE(d.is_deleted, FALSE);
$$;

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

CREATE OR REPLACE FUNCTION sim.local_register_custom_fields(p_register_id UUID, p_account_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = sim, public
AS $$
DECLARE
  v_screen UUID;
  v_limit  INTEGER;
  v_fields JSONB := '[]'::jsonb;
BEGIN
  IF p_account_id IS NULL OR NOT public.user_has_access_to_account(p_account_id) THEN
    RETURN jsonb_build_object('fields', '[]'::jsonb, 'used', 0, 'limit', 0, 'can_manage', FALSE);
  END IF;
  v_limit := public.local_register_custom_field_limit(p_account_id);
  v_screen := sim.lr_cf_screen_id(p_register_id);
  IF v_screen IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(sim.lr_cf_field_json(d.id) ORDER BY m.created_at, d.label), '[]'::jsonb)
    INTO v_fields
    FROM sim.custom_field_screen_map m
    JOIN sim.custom_field_definitions d ON d.id = m.field_definition_id
    WHERE m.screen_id = v_screen
      AND d.account_id = p_account_id
      AND d.workflow_status = 'published'
      AND NOT COALESCE(d.is_deleted, FALSE);
  END IF;
  RETURN jsonb_build_object(
    'fields', v_fields,
    'used', jsonb_array_length(v_fields),
    'limit', v_limit,
    -- Same rule as LDE's edit RLS (v516/v520), so the "Manage fields" link only shows when it works.
    'can_manage', public.is_pmo_admin_user()
  );
END;
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
  p_required    BOOLEAN DEFAULT FALSE
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
BEGIN
  v_reg_label := sim.lr_cf_assert_register_access(p_register_id, p_account_id);

  IF length(v_label) < 2 OR length(v_label) > 120 THEN
    RAISE EXCEPTION 'Field name must be 2 to 120 characters';
  END IF;
  IF p_field_type IS NULL OR p_field_type NOT IN
     ('text', 'long_text', 'number', 'date', 'boolean', 'url', 'dropdown', 'multi_select', 'multi_line') THEN
    RAISE EXCEPTION 'Unsupported field type';
  END IF;
  IF p_field_type IN ('dropdown', 'multi_select')
     AND COALESCE(jsonb_array_length(NULLIF(p_options, 'null'::jsonb)), 0) = 0 THEN
    RAISE EXCEPTION 'Add at least one option for a dropdown field';
  END IF;

  v_norm := lower(regexp_replace(v_label, '[^a-zA-Z0-9]+', '', 'g'));
  IF v_norm = '' THEN
    RAISE EXCEPTION 'Field name must contain letters or numbers';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('sim_lr_cf:' || p_account_id::text));

  SELECT d.id, d.label INTO v_existing
  FROM sim.custom_field_definitions d
  WHERE d.account_id = p_account_id
    AND NOT COALESCE(d.is_deleted, FALSE)
    AND d.workflow_status <> 'deprecated'
    AND lower(regexp_replace(d.label, '[^a-zA-Z0-9]+', '', 'g')) = v_norm
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

  v_base := 'lr_' || left(btrim(lower(regexp_replace(v_label, '[^a-zA-Z0-9]+', '_', 'g')), '_'), 100);
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
     jsonb_build_object('required', COALESCE(p_required, FALSE)), TRUE,
     jsonb_build_object('source', 'local_register', 'created_on_register', p_register_id), v_user, v_user)
  RETURNING id INTO v_def;

  IF p_field_type IN ('dropdown', 'multi_select') THEN
    INSERT INTO sim.custom_field_options (field_definition_id, option_value, option_label, sort_order)
    SELECT v_def, opt.value, opt.label, opt.sort_order
    FROM (
      SELECT DISTINCT ON (slug)
             slug AS value, left(lbl, 500) AS label, ord::int AS sort_order
      FROM (
        SELECT btrim(t.lbl) AS lbl, t.ord,
               left(btrim(lower(regexp_replace(btrim(t.lbl), '[^a-zA-Z0-9]+', '_', 'g')), '_'), 480) AS slug
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
                             'label', v_label, 'field_type', p_field_type, 'required', COALESCE(p_required, FALSE)));

  RETURN jsonb_build_object('status', 'created', 'field', sim.lr_cf_field_json(v_def));
END;
$$;

CREATE OR REPLACE FUNCTION sim.local_register_attach_custom_field(
  p_register_id   UUID,
  p_account_id    UUID,
  p_definition_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = sim, public
AS $$
DECLARE
  v_reg_label TEXT;
  v_screen    UUID;
  v_user      UUID := public.current_internal_user_id();
BEGIN
  v_reg_label := sim.lr_cf_assert_register_access(p_register_id, p_account_id);

  IF NOT EXISTS (SELECT 1 FROM sim.custom_field_definitions d
                 WHERE d.id = p_definition_id AND d.account_id = p_account_id
                   AND d.workflow_status = 'published' AND NOT COALESCE(d.is_deleted, FALSE)) THEN
    RAISE EXCEPTION 'Custom field not found for your organisation';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('sim_lr_cf:' || p_account_id::text));
  v_screen := sim.lr_cf_ensure_screen(p_register_id, v_reg_label);

  IF EXISTS (SELECT 1 FROM sim.custom_field_screen_map WHERE field_definition_id = p_definition_id AND screen_id = v_screen) THEN
    RETURN jsonb_build_object('status', 'already_attached', 'field', sim.lr_cf_field_json(p_definition_id));
  END IF;
  IF sim.lr_cf_used_count(v_screen, p_account_id) >= public.local_register_custom_field_limit(p_account_id) THEN
    RAISE EXCEPTION 'CUSTOM_FIELD_LIMIT_REACHED: your organisation already has % custom fields on this register',
      public.local_register_custom_field_limit(p_account_id);
  END IF;

  INSERT INTO sim.custom_field_screen_map (field_definition_id, screen_id) VALUES (p_definition_id, v_screen);
  INSERT INTO sim.custom_field_audit_log (account_id, actor_user_id, action_type, entity_table, entity_id, payload)
  VALUES (p_account_id, v_user, 'screen_map_changed', 'custom_field_screen_map', p_definition_id,
          jsonb_build_object('source', 'local_register', 'action', 'attached', 'register_id', p_register_id, 'register', v_reg_label));

  RETURN jsonb_build_object('status', 'attached', 'field', sim.lr_cf_field_json(p_definition_id));
END;
$$;

REVOKE ALL ON FUNCTION sim.lr_cf_assert_register_access(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION sim.lr_cf_ensure_screen(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION sim.lr_cf_used_count(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION sim.lr_cf_screen_id(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION sim.lr_cf_field_json(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION sim.local_register_custom_fields(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sim.local_register_custom_field_library(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sim.local_register_add_custom_field(UUID, UUID, TEXT, TEXT, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION sim.local_register_attach_custom_field(UUID, UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'v1312: register custom-field RPCs installed (public + sim)';
END $$;
