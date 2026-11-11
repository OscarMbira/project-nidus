-- ============================================================================
-- v1375: Register engine for the Data Migration Runbook (Platform public + Simulator sim)
-- ============================================================================
-- PRD: projectprd/v1337_cbs_data_migration_runbook_PRD.md · Plan: projectplan/v1337_cbs_data_migration_runbook_plan.md
-- Requires v1332 (field types), v1336/v1337 (templates), v1346 (visible_when). Idempotent.
--   1. Field types: 'datetime' (stored as UTC ISO text, shown in the organisation time zone) and
--      'record_ref' (link to records of another register; dropdown_options[0] = { value: <register_key>,
--      label, multiple?, show_fields? }; value = [{ id, label }]).
--   2. local_register_fields.calculation JSONB — calculated fields worked out when the record is saved:
--      { op: difference|percent|minutes_between|per_second, …inputs, decimals?, display?: duration|percent }.
--   3. local_registers.behaviour JSONB — register-level behaviour read by the app:
--      { type: 'runbook' | 'runbook_steps' | 'runbook_progress', template_children?: [{ register_key, field_key }] }.
--   4. Templates: saving a record as a template also keeps the records of behaviour.template_children
--      that point at it (the reference becomes the {{parent}} token); creating from the template
--      replaces {{parent}} / {{parent_label}} with the new record.
-- ============================================================================

BEGIN;

-- Take every table lock up front, in the order the app reads them (registers before fields), so a
-- live page reading the registers cannot deadlock with this change (first run hit 40P01). If the
-- locks are not free within 15 seconds the run stops cleanly — just run it again.
SET LOCAL lock_timeout = '15s';
LOCK TABLE public.local_registers, public.local_register_fields,
           sim.local_registers, sim.local_register_fields IN ACCESS EXCLUSIVE MODE;

-- ── 1. Field types ───────────────────────────────────────────────────────────
ALTER TABLE public.local_register_fields DROP CONSTRAINT IF EXISTS chk_local_register_fields_field_type;
ALTER TABLE public.local_register_fields
  ADD CONSTRAINT chk_local_register_fields_field_type CHECK (field_type IN
    ('text', 'long_text', 'multi_line', 'number', 'date', 'dropdown', 'multi_select', 'boolean', 'user_picker', 'currency', 'table',
     'linked_records', 'datetime', 'record_ref'));

ALTER TABLE sim.local_register_fields DROP CONSTRAINT IF EXISTS chk_sim_local_register_fields_field_type;
ALTER TABLE sim.local_register_fields
  ADD CONSTRAINT chk_sim_local_register_fields_field_type CHECK (field_type IN
    ('text', 'long_text', 'multi_line', 'number', 'date', 'dropdown', 'multi_select', 'boolean', 'user_picker', 'currency', 'table',
     'linked_records', 'datetime', 'record_ref'));

-- ── 2. Calculated fields ─────────────────────────────────────────────────────
ALTER TABLE public.local_register_fields ADD COLUMN IF NOT EXISTS calculation JSONB;
ALTER TABLE sim.local_register_fields ADD COLUMN IF NOT EXISTS calculation JSONB;
COMMENT ON COLUMN public.local_register_fields.calculation IS
  'v1375: calculated field rule, worked out by the app on save — { op: difference|percent|minutes_between|per_second, inputs…, decimals?, display? }';
COMMENT ON COLUMN sim.local_register_fields.calculation IS
  'v1375: calculated field rule, worked out by the app on save — { op: difference|percent|minutes_between|per_second, inputs…, decimals?, display? }';

-- ── 3. Register behaviour ────────────────────────────────────────────────────
ALTER TABLE public.local_registers ADD COLUMN IF NOT EXISTS behaviour JSONB;
ALTER TABLE sim.local_registers ADD COLUMN IF NOT EXISTS behaviour JSONB;
COMMENT ON COLUMN public.local_registers.behaviour IS
  'v1375: register behaviour — { type: runbook|runbook_steps|runbook_progress, template_children?: [{ register_key, field_key }] }';
COMMENT ON COLUMN sim.local_registers.behaviour IS
  'v1375: register behaviour — { type: runbook|runbook_steps|runbook_progress, template_children?: [{ register_key, field_key }] }';

-- ── 4. Templates (public) ────────────────────────────────────────────────────
-- Internal (v1375): replace a template's child rows. Linked-records sources: every record of the
-- linked register in the project (as v1337). Record-reference children (the parent register's
-- behaviour.template_children = [{ register_key, field_key }]): only records whose field_key points at
-- p_record_id; that reference is stored as the {{parent}} token so a new record can be substituted.
CREATE OR REPLACE FUNCTION public.local_register_template_snapshot_children(
  p_template_id UUID, p_register_key TEXT, p_project_id UUID, p_account_id UUID, p_record_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_reg   RECORD;
  v_link  JSONB;
  v_src   RECORD;
  v_n     INT;
  v_count INT := 0;
  v_token JSONB := '[{"id": "{{parent}}", "label": "{{parent_label}}"}]'::jsonb;
BEGIN
  DELETE FROM public.local_register_template_children WHERE template_id = p_template_id;
  SELECT * INTO v_reg FROM public.local_register_template_register(p_register_key, p_account_id);
  IF v_reg.register_id IS NULL OR p_project_id IS NULL THEN
    RETURN 0;
  END IF;
  FOR v_link IN SELECT value FROM jsonb_array_elements(COALESCE(v_reg.fields_linked, '[]'::jsonb)) LOOP
    SELECT * INTO v_src FROM public.local_register_template_register(v_link ->> 'source', p_account_id);
    CONTINUE WHEN v_src.register_id IS NULL;
    INSERT INTO public.local_register_template_children (template_id, link_field_key, register_key, sort_order, title, description, status, field_values)
    SELECT p_template_id, v_link ->> 'field_key', v_link ->> 'source',
           v_count + ROW_NUMBER() OVER (ORDER BY r.display_id NULLS LAST, r.created_at),
           r.title, r.description, r.status, r.field_values
    FROM public.local_register_records r
    WHERE r.register_id = v_src.register_id AND r.record_project_id = p_project_id AND r.is_deleted = FALSE;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_count := v_count + v_n;
  END LOOP;

  IF p_record_id IS NOT NULL THEN
    FOR v_link IN
      SELECT value FROM public.local_registers lr, jsonb_array_elements(COALESCE(lr.behaviour -> 'template_children', '[]'::jsonb))
      WHERE lr.id = v_reg.register_id
    LOOP
      SELECT * INTO v_src FROM public.local_register_template_register(v_link ->> 'register_key', p_account_id);
      CONTINUE WHEN v_src.register_id IS NULL;
      INSERT INTO public.local_register_template_children (template_id, link_field_key, register_key, sort_order, title, description, status, field_values)
      SELECT p_template_id, v_link ->> 'field_key', v_link ->> 'register_key',
             v_count + ROW_NUMBER() OVER (ORDER BY (r.field_values ->> 'sequence') ~ '^[0-9.]+$' DESC,
                                                   CASE WHEN (r.field_values ->> 'sequence') ~ '^[0-9.]+$' THEN (r.field_values ->> 'sequence')::numeric END,
                                                   r.created_at),
             r.title, r.description, r.status, jsonb_set(r.field_values, ARRAY[v_link ->> 'field_key'], v_token)
      FROM public.local_register_records r
      WHERE r.register_id = v_src.register_id AND r.record_project_id = p_project_id AND r.is_deleted = FALSE
        AND r.field_values -> (v_link ->> 'field_key') @> jsonb_build_array(jsonb_build_object('id', p_record_id::text));
      GET DIAGNOSTICS v_n = ROW_COUNT;
      v_count := v_count + v_n;
    END LOOP;
  END IF;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.local_register_template_snapshot_children(UUID, TEXT, UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;

-- The v1337 4-argument form stays for any caller that has no record (no reference children).
CREATE OR REPLACE FUNCTION public.local_register_template_snapshot_children(p_template_id UUID, p_register_key TEXT, p_project_id UUID, p_account_id UUID)
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$ SELECT public.local_register_template_snapshot_children(p_template_id, p_register_key, p_project_id, p_account_id, NULL::uuid); $$;
REVOKE ALL ON FUNCTION public.local_register_template_snapshot_children(UUID, TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.local_register_template_save(
  p_record_id UUID, p_name TEXT, p_description TEXT DEFAULT NULL, p_template_id UUID DEFAULT NULL, p_account_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user    UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_rec     RECORD;
  v_key     TEXT;
  v_account UUID;
  v_status  TEXT;
  v_id      UUID;
BEGIN
  IF btrim(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'Give the template a name.';
  END IF;
  IF NOT public.auth_user_can_access_local_register_record(p_record_id) THEN
    RAISE EXCEPTION 'You do not have access to this record.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_rec FROM public.local_register_records WHERE id = p_record_id;
  SELECT lr.register_key, lr.status_workflow -> 0 ->> 'key' INTO v_key, v_status
  FROM public.local_registers lr
  WHERE lr.id = v_rec.register_id;
  v_account := COALESCE(v_rec.account_id, p_account_id);
  IF NOT public.auth_user_can_manage_register_templates(v_account) THEN
    RAISE EXCEPTION 'Only a PMO Admin or Project Manager can save templates.' USING ERRCODE = '42501';
  END IF;

  IF p_template_id IS NULL THEN
    INSERT INTO public.local_register_templates (register_key, template_scope, account_id, name, description, version, record_title,
                      record_description, record_status, field_values, created_by, updated_by)
    VALUES (v_key, 'organisation', v_account, btrim(p_name), NULLIF(btrim(COALESCE(p_description, '')), ''), 1, v_rec.title,
            v_rec.description, v_status, v_rec.field_values, v_user, v_user)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.local_register_templates
    SET name = btrim(p_name), description = NULLIF(btrim(COALESCE(p_description, '')), ''), version = version + 1,
        record_title = v_rec.title, record_description = v_rec.description, field_values = v_rec.field_values,
        updated_by = v_user, updated_at = NOW()
    WHERE id = p_template_id AND template_scope = 'organisation' AND account_id = v_account AND register_key = v_key
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'That template cannot be replaced from this record.';
    END IF;
    DELETE FROM public.local_register_template_attachments WHERE template_id = v_id;
  END IF;

  PERFORM public.local_register_template_snapshot_children(v_id, v_key, v_rec.record_project_id, v_account, v_rec.id);
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.local_register_template_save(UUID, TEXT, TEXT, UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.local_register_template_create_record(
  p_template_id UUID, p_project_id UUID, p_title TEXT DEFAULT NULL, p_account_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user     UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_t        RECORD;
  v_reg      RECORD;
  v_creg     RECORD;
  v_child    RECORD;
  v_account  UUID;
  v_record   UUID;
  v_existing UUID;
  v_status   TEXT;
  v_count    INT := 0;
  v_files    JSONB;
  v_label    TEXT;
  v_fv       JSONB;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Please sign in again.' USING ERRCODE = '42501';
  END IF;

  SELECT id, register_key, template_scope, account_id, version, record_title, record_description, field_values, 'public' AS src
    INTO v_t
    FROM public.local_register_templates WHERE id = p_template_id AND is_archived = FALSE;
  IF v_t.id IS NULL THEN
    RAISE EXCEPTION 'This template is no longer available.';
  END IF;
  IF v_t.template_scope = 'organisation' AND NOT public.user_has_access_to_account(v_t.account_id) THEN
    RAISE EXCEPTION 'This template is no longer available.' USING ERRCODE = '42501';
  END IF;
  IF p_project_id IS NULL OR NOT public.has_local_register_scope_access(auth.uid(), 'project', NULL, NULL, p_project_id) THEN
    RAISE EXCEPTION 'You do not have access to this project.' USING ERRCODE = '42501';
  END IF;

  v_account := (SELECT account_id FROM public.projects WHERE id = p_project_id);
  SELECT * INTO v_reg FROM public.local_register_template_register(v_t.register_key, v_account);
  IF v_reg.register_id IS NULL THEN
    RAISE EXCEPTION 'The register for this template is not available.';
  END IF;

  IF v_reg.one_record_per_project THEN
    SELECT id INTO v_existing FROM public.local_register_records
    WHERE register_id = v_reg.register_id AND record_project_id = p_project_id AND is_deleted = FALSE
    LIMIT 1;
    IF v_existing IS NOT NULL THEN
      RAISE EXCEPTION 'This project already has a % — open it instead.', v_reg.label
        USING ERRCODE = 'P0001', DETAIL = v_existing::text;
    END IF;
  END IF;

  v_status := COALESCE(v_reg.status_workflow -> 0 ->> 'key', 'draft');
  INSERT INTO public.local_register_records (register_id, title, description, status, owner_user_id, field_values,
                    record_project_id, account_id, created_by, updated_by,
                    created_from_template_id, created_from_template_version)
  VALUES (v_reg.register_id, COALESCE(NULLIF(btrim(p_title), ''), v_t.record_title), v_t.record_description,
          v_status, v_user, v_t.field_values, p_project_id, v_account, v_user, v_user, v_t.id, v_t.version)
  RETURNING id INTO v_record;

  -- v1375: child records may point back at the new record ({{parent}} / {{parent_label}} tokens).
  SELECT CASE WHEN COALESCE(display_id, '') <> '' THEN display_id || ' – ' || title ELSE title END
    INTO v_label FROM public.local_register_records WHERE id = v_record;
  v_label := to_jsonb(COALESCE(v_label, ''))::text;
  v_label := substr(v_label, 2, length(v_label) - 2);

  FOR v_child IN
    SELECT * FROM public.local_register_template_children WHERE template_id = v_t.id ORDER BY sort_order
  LOOP
    SELECT * INTO v_creg FROM public.local_register_template_register(v_child.register_key, v_account);
    CONTINUE WHEN v_creg.register_id IS NULL;
    v_fv := replace(replace(COALESCE(v_child.field_values, '{}'::jsonb)::text, '{{parent}}', v_record::text), '{{parent_label}}', v_label)::jsonb;
    v_status := CASE
      WHEN v_child.status IS NOT NULL AND COALESCE(v_creg.status_workflow, '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('key', v_child.status))
        THEN v_child.status
      ELSE COALESCE(v_creg.status_workflow -> 0 ->> 'key', 'draft')
    END;
    INSERT INTO public.local_register_records (register_id, title, description, status, owner_user_id, field_values,
                      record_project_id, account_id, created_by, updated_by,
                      created_from_template_id, created_from_template_version)
    VALUES (v_creg.register_id, v_child.title, v_child.description, v_status, v_user, v_fv,
            p_project_id, v_account, v_user, v_user, v_t.id, v_t.version);
    v_count := v_count + 1;
  END LOOP;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'annexure_title', a.annexure_title, 'storage_bucket', a.storage_bucket, 'storage_path', a.storage_path,
           'file_name', a.file_name, 'mime_type', a.mime_type, 'file_size', a.file_size) ORDER BY a.sort_order), '[]'::jsonb)
    INTO v_files
    FROM public.local_register_template_attachments a
    WHERE a.template_id = v_t.id;

  RETURN jsonb_build_object('record_id', v_record, 'children', v_count, 'attachments', v_files);
END;
$$;
GRANT EXECUTE ON FUNCTION public.local_register_template_create_record(UUID, UUID, TEXT, UUID) TO authenticated;

-- ── 4. Templates (sim) ───────────────────────────────────────────────────────
-- Internal (v1375): replace a template's child rows. Linked-records sources: every record of the
-- linked register in the project (as v1337). Record-reference children (the parent register's
-- behaviour.template_children = [{ register_key, field_key }]): only records whose field_key points at
-- p_record_id; that reference is stored as the {{parent}} token so a new record can be substituted.
CREATE OR REPLACE FUNCTION sim.local_register_template_snapshot_children(
  p_template_id UUID, p_register_key TEXT, p_project_id UUID, p_account_id UUID, p_record_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_reg   RECORD;
  v_link  JSONB;
  v_src   RECORD;
  v_n     INT;
  v_count INT := 0;
  v_token JSONB := '[{"id": "{{parent}}", "label": "{{parent_label}}"}]'::jsonb;
BEGIN
  DELETE FROM sim.local_register_template_children WHERE template_id = p_template_id;
  SELECT * INTO v_reg FROM sim.local_register_template_register(p_register_key);
  IF v_reg.register_id IS NULL OR p_project_id IS NULL THEN
    RETURN 0;
  END IF;
  FOR v_link IN SELECT value FROM jsonb_array_elements(COALESCE(v_reg.fields_linked, '[]'::jsonb)) LOOP
    SELECT * INTO v_src FROM sim.local_register_template_register(v_link ->> 'source');
    CONTINUE WHEN v_src.register_id IS NULL;
    INSERT INTO sim.local_register_template_children (template_id, link_field_key, register_key, sort_order, title, description, status, field_values)
    SELECT p_template_id, v_link ->> 'field_key', v_link ->> 'source',
           v_count + ROW_NUMBER() OVER (ORDER BY r.display_id NULLS LAST, r.created_at),
           r.title, r.description, r.status, r.field_values
    FROM sim.local_register_records r
    WHERE r.register_id = v_src.register_id AND r.record_project_id = p_project_id AND r.is_deleted = FALSE;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_count := v_count + v_n;
  END LOOP;

  IF p_record_id IS NOT NULL THEN
    FOR v_link IN
      SELECT value FROM (SELECT behaviour FROM public.local_registers WHERE id = v_reg.register_id AND v_reg.is_system
                         UNION ALL SELECT behaviour FROM sim.local_registers WHERE id = v_reg.register_id AND NOT v_reg.is_system) lr,
                        jsonb_array_elements(COALESCE(lr.behaviour -> 'template_children', '[]'::jsonb))
    LOOP
      SELECT * INTO v_src FROM sim.local_register_template_register(v_link ->> 'register_key');
      CONTINUE WHEN v_src.register_id IS NULL;
      INSERT INTO sim.local_register_template_children (template_id, link_field_key, register_key, sort_order, title, description, status, field_values)
      SELECT p_template_id, v_link ->> 'field_key', v_link ->> 'register_key',
             v_count + ROW_NUMBER() OVER (ORDER BY (r.field_values ->> 'sequence') ~ '^[0-9.]+$' DESC,
                                                   CASE WHEN (r.field_values ->> 'sequence') ~ '^[0-9.]+$' THEN (r.field_values ->> 'sequence')::numeric END,
                                                   r.created_at),
             r.title, r.description, r.status, jsonb_set(r.field_values, ARRAY[v_link ->> 'field_key'], v_token)
      FROM sim.local_register_records r
      WHERE r.register_id = v_src.register_id AND r.record_project_id = p_project_id AND r.is_deleted = FALSE
        AND r.field_values -> (v_link ->> 'field_key') @> jsonb_build_array(jsonb_build_object('id', p_record_id::text));
      GET DIAGNOSTICS v_n = ROW_COUNT;
      v_count := v_count + v_n;
    END LOOP;
  END IF;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION sim.local_register_template_snapshot_children(UUID, TEXT, UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;

-- The v1337 4-argument form stays for any caller that has no record (no reference children).
CREATE OR REPLACE FUNCTION sim.local_register_template_snapshot_children(p_template_id UUID, p_register_key TEXT, p_project_id UUID, p_account_id UUID)
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$ SELECT sim.local_register_template_snapshot_children(p_template_id, p_register_key, p_project_id, p_account_id, NULL::uuid); $$;
REVOKE ALL ON FUNCTION sim.local_register_template_snapshot_children(UUID, TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION sim.local_register_template_save(
  p_record_id UUID, p_name TEXT, p_description TEXT DEFAULT NULL, p_template_id UUID DEFAULT NULL, p_account_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_user    UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_rec     RECORD;
  v_key     TEXT;
  v_account UUID;
  v_status  TEXT;
  v_id      UUID;
BEGIN
  IF btrim(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'Give the template a name.';
  END IF;
  IF NOT sim.auth_user_can_access_local_register_record(p_record_id) THEN
    RAISE EXCEPTION 'You do not have access to this record.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_rec FROM sim.local_register_records WHERE id = p_record_id;
  SELECT lr.register_key, lr.status_workflow -> 0 ->> 'key' INTO v_key, v_status
  FROM (SELECT id, register_key, status_workflow FROM public.local_registers WHERE v_rec.is_system_register
          UNION ALL SELECT id, register_key, status_workflow FROM sim.local_registers WHERE NOT v_rec.is_system_register) lr
  WHERE lr.id = v_rec.register_id;
  v_account := p_account_id;
  IF NOT sim.auth_user_can_manage_register_templates(v_account) THEN
    RAISE EXCEPTION 'Only a PMO Admin or Project Manager can save templates.' USING ERRCODE = '42501';
  END IF;

  IF p_template_id IS NULL THEN
    INSERT INTO sim.local_register_templates (register_key, template_scope, account_id, name, description, version, record_title,
                      record_description, record_status, field_values, created_by, updated_by)
    VALUES (v_key, 'organisation', v_account, btrim(p_name), NULLIF(btrim(COALESCE(p_description, '')), ''), 1, v_rec.title,
            v_rec.description, v_status, v_rec.field_values, v_user, v_user)
    RETURNING id INTO v_id;
  ELSE
    UPDATE sim.local_register_templates
    SET name = btrim(p_name), description = NULLIF(btrim(COALESCE(p_description, '')), ''), version = version + 1,
        record_title = v_rec.title, record_description = v_rec.description, field_values = v_rec.field_values,
        updated_by = v_user, updated_at = NOW()
    WHERE id = p_template_id AND template_scope = 'organisation' AND account_id = v_account AND register_key = v_key
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'That template cannot be replaced from this record.';
    END IF;
    DELETE FROM sim.local_register_template_attachments WHERE template_id = v_id;
  END IF;

  PERFORM sim.local_register_template_snapshot_children(v_id, v_key, v_rec.record_project_id, v_account, v_rec.id);
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION sim.local_register_template_save(UUID, TEXT, TEXT, UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION sim.local_register_template_create_record(
  p_template_id UUID, p_project_id UUID, p_title TEXT DEFAULT NULL, p_account_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_user     UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_t        RECORD;
  v_reg      RECORD;
  v_creg     RECORD;
  v_child    RECORD;
  v_account  UUID;
  v_record   UUID;
  v_existing UUID;
  v_status   TEXT;
  v_count    INT := 0;
  v_files    JSONB;
  v_label    TEXT;
  v_fv       JSONB;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Please sign in again.' USING ERRCODE = '42501';
  END IF;

  SELECT id, register_key, template_scope, account_id, version, record_title, record_description, field_values, 'sim' AS src
    INTO v_t
    FROM sim.local_register_templates WHERE id = p_template_id AND is_archived = FALSE;
  IF v_t.id IS NULL THEN
    SELECT id, register_key, template_scope, account_id, version, record_title, record_description, field_values, 'public' AS src
      INTO v_t
      FROM public.local_register_templates WHERE id = p_template_id AND is_archived = FALSE AND template_scope = 'system';
  END IF;
  IF v_t.id IS NULL THEN
    RAISE EXCEPTION 'This template is no longer available.';
  END IF;
  IF v_t.template_scope = 'organisation' AND NOT public.user_has_access_to_account(v_t.account_id) THEN
    RAISE EXCEPTION 'This template is no longer available.' USING ERRCODE = '42501';
  END IF;
  IF p_project_id IS NULL OR NOT sim.has_local_register_scope_access(auth.uid(), 'project', NULL, NULL, p_project_id) THEN
    RAISE EXCEPTION 'You do not have access to this project.' USING ERRCODE = '42501';
  END IF;

  v_account := COALESCE(p_account_id, v_t.account_id);
  SELECT * INTO v_reg FROM sim.local_register_template_register(v_t.register_key);
  IF v_reg.register_id IS NULL THEN
    RAISE EXCEPTION 'The register for this template is not available.';
  END IF;

  IF v_reg.one_record_per_project THEN
    SELECT id INTO v_existing FROM sim.local_register_records
    WHERE register_id = v_reg.register_id AND record_project_id = p_project_id AND is_deleted = FALSE
    LIMIT 1;
    IF v_existing IS NOT NULL THEN
      RAISE EXCEPTION 'This project already has a % — open it instead.', v_reg.label
        USING ERRCODE = 'P0001', DETAIL = v_existing::text;
    END IF;
  END IF;

  v_status := COALESCE(v_reg.status_workflow -> 0 ->> 'key', 'draft');
  INSERT INTO sim.local_register_records (register_id, is_system_register, title, description, status, owner_user_id, field_values,
                    record_project_id, created_by, updated_by,
                    created_from_template_id, created_from_template_version)
  VALUES (v_reg.register_id, v_reg.is_system, COALESCE(NULLIF(btrim(p_title), ''), v_t.record_title), v_t.record_description,
          v_status, v_user, v_t.field_values, p_project_id, v_user, v_user, v_t.id, v_t.version)
  RETURNING id INTO v_record;

  -- v1375: child records may point back at the new record ({{parent}} / {{parent_label}} tokens).
  SELECT CASE WHEN COALESCE(display_id, '') <> '' THEN display_id || ' – ' || title ELSE title END
    INTO v_label FROM sim.local_register_records WHERE id = v_record;
  v_label := to_jsonb(COALESCE(v_label, ''))::text;
  v_label := substr(v_label, 2, length(v_label) - 2);

  FOR v_child IN
    SELECT * FROM sim.local_register_template_children WHERE template_id = v_t.id AND v_t.src = 'sim'
    UNION ALL
    SELECT * FROM public.local_register_template_children WHERE template_id = v_t.id AND v_t.src = 'public'
    ORDER BY sort_order
  LOOP
    SELECT * INTO v_creg FROM sim.local_register_template_register(v_child.register_key);
    CONTINUE WHEN v_creg.register_id IS NULL;
    v_fv := replace(replace(COALESCE(v_child.field_values, '{}'::jsonb)::text, '{{parent}}', v_record::text), '{{parent_label}}', v_label)::jsonb;
    v_status := CASE
      WHEN v_child.status IS NOT NULL AND COALESCE(v_creg.status_workflow, '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('key', v_child.status))
        THEN v_child.status
      ELSE COALESCE(v_creg.status_workflow -> 0 ->> 'key', 'draft')
    END;
    INSERT INTO sim.local_register_records (register_id, is_system_register, title, description, status, owner_user_id, field_values,
                      record_project_id, created_by, updated_by,
                      created_from_template_id, created_from_template_version)
    VALUES (v_creg.register_id, v_creg.is_system, v_child.title, v_child.description, v_status, v_user, v_fv,
            p_project_id, v_user, v_user, v_t.id, v_t.version);
    v_count := v_count + 1;
  END LOOP;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'annexure_title', a.annexure_title, 'storage_bucket', a.storage_bucket, 'storage_path', a.storage_path,
           'file_name', a.file_name, 'mime_type', a.mime_type, 'file_size', a.file_size) ORDER BY a.sort_order), '[]'::jsonb)
    INTO v_files
    FROM (SELECT * FROM sim.local_register_template_attachments WHERE template_id = v_t.id AND v_t.src = 'sim'
          UNION ALL
          SELECT * FROM public.local_register_template_attachments WHERE template_id = v_t.id AND v_t.src = 'public') a
    ;

  RETURN jsonb_build_object('record_id', v_record, 'children', v_count, 'attachments', v_files);
END;
$$;
GRANT EXECUTE ON FUNCTION sim.local_register_template_create_record(UUID, UUID, TEXT, UUID) TO authenticated;

COMMIT;

-- Check: both new field types allowed, the two columns exist, the 5-argument snapshot exists in both schemas.
SELECT
  (SELECT count(*) FROM information_schema.columns WHERE table_schema IN ('public', 'sim') AND table_name = 'local_register_fields' AND column_name = 'calculation') AS calculation_columns,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema IN ('public', 'sim') AND table_name = 'local_registers' AND column_name = 'behaviour') AS behaviour_columns,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'local_register_template_snapshot_children' AND p.pronargs = 5) AS snapshot_5_arg,
  (SELECT count(*) FROM pg_constraint WHERE conname IN ('chk_local_register_fields_field_type', 'chk_sim_local_register_fields_field_type')
    AND pg_get_constraintdef(oid) LIKE '%record_ref%') AS type_constraints;
