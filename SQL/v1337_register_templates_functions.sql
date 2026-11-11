-- ============================================================================
-- v1337: Register record templates — functions (Platform public + Simulator sim)
-- ============================================================================
-- PRD: projectprd/v1336_register_document_templates_cbs_dmsd_PRD.md. Requires v1336.
--   *_template_create_record(template, project, title?, account?) → record + child records
--       (status reset to the register's first status, sign-off empty, provenance set); refuses a
--       second record in the project when the register is one_record_per_project; returns the
--       annexure files for the client to copy into the new record.
--   *_template_save(record, name, description?, template?, account?) → organisation template from a
--       record (+ the linked registers' records in the same project); replaces when template given.
--   *_template_customise(template, name, account) → organisation copy of a system/own template.
--   *_template_update / *_template_archive / *_template_add_attachment.
-- Organisation template writes: PMO Admin tier or a Project / Programme / Portfolio Manager of the
-- organisation (auth_user_can_manage_register_templates). Simulator also uses public system
-- templates; its organisation templates live in sim. Idempotent (CREATE OR REPLACE).
-- ============================================================================

-- ═════════════════════════════════════════════════════════════════════════════
-- PUBLIC
-- ═════════════════════════════════════════════════════════════════════════════

-- Internal: register for a key — the system definition first, else the organisation's own.
CREATE OR REPLACE FUNCTION public.local_register_template_register(p_register_key TEXT, p_account_id UUID)
RETURNS TABLE (register_id UUID, is_system BOOLEAN, label TEXT, status_workflow JSONB, one_record_per_project BOOLEAN, fields_linked JSONB)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT lr.id, lr.is_system_defined, lr.label::text, lr.status_workflow, lr.one_record_per_project,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('field_key', f.field_key, 'source', f.dropdown_options -> 0 ->> 'value'))
              FROM public.local_register_fields f WHERE f.register_id = lr.id AND f.field_type = 'linked_records'), '[]'::jsonb)
  FROM public.local_registers lr
  WHERE lr.register_key = p_register_key
    AND lr.is_deleted = FALSE
    AND (lr.is_system_defined = TRUE OR lr.account_id = p_account_id)
  ORDER BY lr.is_system_defined DESC
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.local_register_template_register(TEXT, UUID) FROM PUBLIC, anon, authenticated;

-- ── Create a record (and its child records) from a template ─────────────────────
-- Returns { record_id, children, attachments: [{ annexure_title, storage_bucket, storage_path,
-- file_name, mime_type, file_size }] } — the client copies the annexure files.
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

  FOR v_child IN
    SELECT * FROM public.local_register_template_children WHERE template_id = v_t.id ORDER BY sort_order
  LOOP
    SELECT * INTO v_creg FROM public.local_register_template_register(v_child.register_key, v_account);
    CONTINUE WHEN v_creg.register_id IS NULL;
    v_status := CASE
      WHEN v_child.status IS NOT NULL AND COALESCE(v_creg.status_workflow, '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('key', v_child.status))
        THEN v_child.status
      ELSE COALESCE(v_creg.status_workflow -> 0 ->> 'key', 'draft')
    END;
    INSERT INTO public.local_register_records (register_id, title, description, status, owner_user_id, field_values,
                      record_project_id, account_id, created_by, updated_by,
                      created_from_template_id, created_from_template_version)
    VALUES (v_creg.register_id, v_child.title, v_child.description, v_status, v_user, v_child.field_values,
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

-- Internal: replace a template's child rows with the records of its linked registers in a project.
CREATE OR REPLACE FUNCTION public.local_register_template_snapshot_children(p_template_id UUID, p_register_key TEXT, p_project_id UUID, p_account_id UUID)
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
  v_count INT := 0;
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
           ROW_NUMBER() OVER (ORDER BY r.display_id NULLS LAST, r.created_at),
           r.title, r.description, r.status, r.field_values
    FROM public.local_register_records r
    WHERE r.register_id = v_src.register_id AND r.record_project_id = p_project_id AND r.is_deleted = FALSE;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END LOOP;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.local_register_template_snapshot_children(UUID, TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated;

-- ── Save a record as an organisation template (new, or replacing an existing one) ─────────
-- The client then copies the record's annexure files and registers them with
-- local_register_template_add_attachment. Returns the template id.
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

  PERFORM public.local_register_template_snapshot_children(v_id, v_key, v_rec.record_project_id, v_account);
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.local_register_template_save(UUID, TEXT, TEXT, UUID, UUID) TO authenticated;

-- ── Customise: copy a system (or own) template into a new organisation template ─────────
CREATE OR REPLACE FUNCTION public.local_register_template_customise(p_template_id UUID, p_name TEXT, p_account_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_t    RECORD;
  v_id   UUID;
BEGIN
  IF NOT public.auth_user_can_manage_register_templates(p_account_id) THEN
    RAISE EXCEPTION 'Only a PMO Admin or Project Manager can customise templates.' USING ERRCODE = '42501';
  END IF;

  SELECT id, register_key, template_scope, account_id, version, record_title, record_description, field_values, 'public' AS src
    INTO v_t
    FROM public.local_register_templates WHERE id = p_template_id AND is_archived = FALSE;
  IF v_t.id IS NULL OR (v_t.template_scope = 'organisation' AND v_t.account_id <> p_account_id) THEN
    RAISE EXCEPTION 'This template is no longer available.';
  END IF;

  INSERT INTO public.local_register_templates (register_key, template_scope, account_id, name, description, version, record_title,
                    record_description, record_status, field_values, source_template_id, created_by, updated_by)
  SELECT register_key, 'organisation', p_account_id, COALESCE(NULLIF(btrim(p_name), ''), name || ' (customised)'), description, 1,
         record_title, record_description, record_status, field_values, id, v_user, v_user
  FROM public.local_register_templates x
  WHERE x.id = v_t.id
  RETURNING id INTO v_id;

  INSERT INTO public.local_register_template_children (template_id, link_field_key, register_key, sort_order, title, description, status, field_values)
  SELECT v_id, link_field_key, register_key, sort_order, title, description, status, field_values
  FROM public.local_register_template_children c
  WHERE c.template_id = v_t.id;

  -- Annexure files are shared with the source template (files are never changed in place).
  INSERT INTO public.local_register_template_attachments (template_id, sort_order, annexure_title, storage_bucket, storage_path, file_name, mime_type, file_size)
  SELECT v_id, sort_order, annexure_title, storage_bucket, storage_path, file_name, mime_type, file_size
  FROM public.local_register_template_attachments a
  WHERE a.template_id = v_t.id;

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.local_register_template_customise(UUID, TEXT, UUID) TO authenticated;

-- ── Edit an organisation template's own fields (template mode form) ────────────────────
CREATE OR REPLACE FUNCTION public.local_register_template_update(
  p_template_id UUID, p_name TEXT, p_description TEXT, p_record_title TEXT, p_record_description TEXT, p_field_values JSONB
)
RETURNS public.local_register_templates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_row public.local_register_templates;
BEGIN
  IF NOT public.auth_user_can_write_register_template(p_template_id) THEN
    RAISE EXCEPTION 'Only a PMO Admin or Project Manager can change this template.' USING ERRCODE = '42501';
  END IF;
  IF btrim(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'Give the template a name.';
  END IF;
  UPDATE public.local_register_templates
  SET name = btrim(p_name), description = NULLIF(btrim(COALESCE(p_description, '')), ''),
      record_title = COALESCE(p_record_title, record_title), record_description = p_record_description,
      field_values = COALESCE(p_field_values, field_values), version = version + 1,
      updated_by = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1), updated_at = NOW()
  WHERE id = p_template_id
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.local_register_template_update(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ── Archive / restore an organisation template ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.local_register_template_archive(p_template_id UUID, p_archived BOOLEAN DEFAULT TRUE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NOT public.auth_user_can_write_register_template(p_template_id) THEN
    RAISE EXCEPTION 'Only a PMO Admin or Project Manager can archive this template.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.local_register_templates SET is_archived = COALESCE(p_archived, TRUE), updated_by = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1), updated_at = NOW()
  WHERE id = p_template_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.local_register_template_archive(UUID, BOOLEAN) TO authenticated;

-- ── Register an annexure file already uploaded to local-register-templates ───────────────
CREATE OR REPLACE FUNCTION public.local_register_template_add_attachment(
  p_template_id UUID, p_title TEXT, p_storage_path TEXT, p_file_name TEXT, p_mime_type TEXT, p_file_size BIGINT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.auth_user_can_write_register_template(p_template_id) THEN
    RAISE EXCEPTION 'Only a PMO Admin or Project Manager can change this template.' USING ERRCODE = '42501';
  END IF;
  IF p_storage_path NOT LIKE 'platform/' || p_template_id::text || '/%' THEN
    RAISE EXCEPTION 'The file was not uploaded to this template.';
  END IF;
  INSERT INTO public.local_register_template_attachments (template_id, sort_order, annexure_title, storage_bucket, storage_path, file_name, mime_type, file_size)
  VALUES (p_template_id,
          COALESCE((SELECT MAX(sort_order) + 1 FROM public.local_register_template_attachments WHERE template_id = p_template_id), 1),
          COALESCE(NULLIF(btrim(p_title), ''), p_file_name), 'local-register-templates', p_storage_path, p_file_name, p_mime_type, p_file_size)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.local_register_template_add_attachment(UUID, TEXT, TEXT, TEXT, TEXT, BIGINT) TO authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- SIM
-- ═════════════════════════════════════════════════════════════════════════════

-- Internal: register for a key — system register (public) first, else the Simulator's own.
CREATE OR REPLACE FUNCTION sim.local_register_template_register(p_register_key TEXT)
RETURNS TABLE (register_id UUID, is_system BOOLEAN, label TEXT, status_workflow JSONB, one_record_per_project BOOLEAN, fields_linked JSONB)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
  (SELECT lr.id, TRUE, lr.label::text, lr.status_workflow, lr.one_record_per_project,
     COALESCE((SELECT jsonb_agg(jsonb_build_object('field_key', f.field_key, 'source', f.dropdown_options -> 0 ->> 'value'))
               FROM public.local_register_fields f WHERE f.register_id = lr.id AND f.field_type = 'linked_records'), '[]'::jsonb)
   FROM public.local_registers lr
   WHERE lr.register_key = p_register_key AND lr.is_system_defined = TRUE AND lr.is_deleted = FALSE
   LIMIT 1)
  UNION ALL
  (SELECT lr.id, FALSE, lr.label::text, lr.status_workflow, lr.one_record_per_project,
     COALESCE((SELECT jsonb_agg(jsonb_build_object('field_key', f.field_key, 'source', f.dropdown_options -> 0 ->> 'value'))
               FROM sim.local_register_fields f WHERE f.register_id = lr.id AND f.field_type = 'linked_records'), '[]'::jsonb)
   FROM sim.local_registers lr
   WHERE lr.register_key = p_register_key AND lr.is_deleted = FALSE
   LIMIT 1)
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION sim.local_register_template_register(TEXT) FROM PUBLIC, anon, authenticated;

-- ── Create a record (and its child records) from a template ─────────────────────
-- Returns { record_id, children, attachments: [{ annexure_title, storage_bucket, storage_path,
-- file_name, mime_type, file_size }] } — the client copies the annexure files.
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

  FOR v_child IN
    SELECT * FROM sim.local_register_template_children WHERE template_id = v_t.id AND v_t.src = 'sim'
    UNION ALL
    SELECT * FROM public.local_register_template_children WHERE template_id = v_t.id AND v_t.src = 'public'
    ORDER BY sort_order
  LOOP
    SELECT * INTO v_creg FROM sim.local_register_template_register(v_child.register_key);
    CONTINUE WHEN v_creg.register_id IS NULL;
    v_status := CASE
      WHEN v_child.status IS NOT NULL AND COALESCE(v_creg.status_workflow, '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('key', v_child.status))
        THEN v_child.status
      ELSE COALESCE(v_creg.status_workflow -> 0 ->> 'key', 'draft')
    END;
    INSERT INTO sim.local_register_records (register_id, is_system_register, title, description, status, owner_user_id, field_values,
                      record_project_id, created_by, updated_by,
                      created_from_template_id, created_from_template_version)
    VALUES (v_creg.register_id, v_creg.is_system, v_child.title, v_child.description, v_status, v_user, v_child.field_values,
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

-- Internal: replace a template's child rows with the records of its linked registers in a project.
CREATE OR REPLACE FUNCTION sim.local_register_template_snapshot_children(p_template_id UUID, p_register_key TEXT, p_project_id UUID, p_account_id UUID)
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
  v_count INT := 0;
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
           ROW_NUMBER() OVER (ORDER BY r.display_id NULLS LAST, r.created_at),
           r.title, r.description, r.status, r.field_values
    FROM sim.local_register_records r
    WHERE r.register_id = v_src.register_id AND r.record_project_id = p_project_id AND r.is_deleted = FALSE;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END LOOP;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION sim.local_register_template_snapshot_children(UUID, TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated;

-- ── Save a record as an organisation template (new, or replacing an existing one) ─────────
-- The client then copies the record's annexure files and registers them with
-- local_register_template_add_attachment. Returns the template id.
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

  PERFORM sim.local_register_template_snapshot_children(v_id, v_key, v_rec.record_project_id, v_account);
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION sim.local_register_template_save(UUID, TEXT, TEXT, UUID, UUID) TO authenticated;

-- ── Customise: copy a system (or own) template into a new organisation template ─────────
CREATE OR REPLACE FUNCTION sim.local_register_template_customise(p_template_id UUID, p_name TEXT, p_account_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_user UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_t    RECORD;
  v_id   UUID;
BEGIN
  IF NOT sim.auth_user_can_manage_register_templates(p_account_id) THEN
    RAISE EXCEPTION 'Only a PMO Admin or Project Manager can customise templates.' USING ERRCODE = '42501';
  END IF;

  SELECT id, register_key, template_scope, account_id, version, record_title, record_description, field_values, 'sim' AS src
    INTO v_t
    FROM sim.local_register_templates WHERE id = p_template_id AND is_archived = FALSE;
  IF v_t.id IS NULL THEN
    SELECT id, register_key, template_scope, account_id, version, record_title, record_description, field_values, 'public' AS src
      INTO v_t
      FROM public.local_register_templates WHERE id = p_template_id AND is_archived = FALSE AND template_scope = 'system';
  END IF;
  IF v_t.id IS NULL OR (v_t.template_scope = 'organisation' AND v_t.account_id <> p_account_id) THEN
    RAISE EXCEPTION 'This template is no longer available.';
  END IF;

  INSERT INTO sim.local_register_templates (register_key, template_scope, account_id, name, description, version, record_title,
                    record_description, record_status, field_values, source_template_id, created_by, updated_by)
  SELECT register_key, 'organisation', p_account_id, COALESCE(NULLIF(btrim(p_name), ''), name || ' (customised)'), description, 1,
         record_title, record_description, record_status, field_values, id, v_user, v_user
  FROM (SELECT * FROM sim.local_register_templates WHERE v_t.src = 'sim' UNION ALL SELECT * FROM public.local_register_templates WHERE v_t.src = 'public') x
  WHERE x.id = v_t.id
  RETURNING id INTO v_id;

  INSERT INTO sim.local_register_template_children (template_id, link_field_key, register_key, sort_order, title, description, status, field_values)
  SELECT v_id, link_field_key, register_key, sort_order, title, description, status, field_values
  FROM (SELECT * FROM sim.local_register_template_children WHERE v_t.src = 'sim' UNION ALL SELECT * FROM public.local_register_template_children WHERE v_t.src = 'public') c
  WHERE c.template_id = v_t.id;

  -- Annexure files are shared with the source template (files are never changed in place).
  INSERT INTO sim.local_register_template_attachments (template_id, sort_order, annexure_title, storage_bucket, storage_path, file_name, mime_type, file_size)
  SELECT v_id, sort_order, annexure_title, storage_bucket, storage_path, file_name, mime_type, file_size
  FROM (SELECT * FROM sim.local_register_template_attachments WHERE v_t.src = 'sim' UNION ALL SELECT * FROM public.local_register_template_attachments WHERE v_t.src = 'public') a
  WHERE a.template_id = v_t.id;

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION sim.local_register_template_customise(UUID, TEXT, UUID) TO authenticated;

-- ── Edit an organisation template's own fields (template mode form) ────────────────────
CREATE OR REPLACE FUNCTION sim.local_register_template_update(
  p_template_id UUID, p_name TEXT, p_description TEXT, p_record_title TEXT, p_record_description TEXT, p_field_values JSONB
)
RETURNS sim.local_register_templates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_row sim.local_register_templates;
BEGIN
  IF NOT sim.auth_user_can_write_register_template(p_template_id) THEN
    RAISE EXCEPTION 'Only a PMO Admin or Project Manager can change this template.' USING ERRCODE = '42501';
  END IF;
  IF btrim(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'Give the template a name.';
  END IF;
  UPDATE sim.local_register_templates
  SET name = btrim(p_name), description = NULLIF(btrim(COALESCE(p_description, '')), ''),
      record_title = COALESCE(p_record_title, record_title), record_description = p_record_description,
      field_values = COALESCE(p_field_values, field_values), version = version + 1,
      updated_by = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1), updated_at = NOW()
  WHERE id = p_template_id
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION sim.local_register_template_update(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ── Archive / restore an organisation template ───────────────────────────────────────
CREATE OR REPLACE FUNCTION sim.local_register_template_archive(p_template_id UUID, p_archived BOOLEAN DEFAULT TRUE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
BEGIN
  IF NOT sim.auth_user_can_write_register_template(p_template_id) THEN
    RAISE EXCEPTION 'Only a PMO Admin or Project Manager can archive this template.' USING ERRCODE = '42501';
  END IF;
  UPDATE sim.local_register_templates SET is_archived = COALESCE(p_archived, TRUE), updated_by = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1), updated_at = NOW()
  WHERE id = p_template_id;
END;
$$;
GRANT EXECUTE ON FUNCTION sim.local_register_template_archive(UUID, BOOLEAN) TO authenticated;

-- ── Register an annexure file already uploaded to local-register-templates ───────────────
CREATE OR REPLACE FUNCTION sim.local_register_template_add_attachment(
  p_template_id UUID, p_title TEXT, p_storage_path TEXT, p_file_name TEXT, p_mime_type TEXT, p_file_size BIGINT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT sim.auth_user_can_write_register_template(p_template_id) THEN
    RAISE EXCEPTION 'Only a PMO Admin or Project Manager can change this template.' USING ERRCODE = '42501';
  END IF;
  IF p_storage_path NOT LIKE 'sim/' || p_template_id::text || '/%' THEN
    RAISE EXCEPTION 'The file was not uploaded to this template.';
  END IF;
  INSERT INTO sim.local_register_template_attachments (template_id, sort_order, annexure_title, storage_bucket, storage_path, file_name, mime_type, file_size)
  VALUES (p_template_id,
          COALESCE((SELECT MAX(sort_order) + 1 FROM sim.local_register_template_attachments WHERE template_id = p_template_id), 1),
          COALESCE(NULLIF(btrim(p_title), ''), p_file_name), 'local-register-templates', p_storage_path, p_file_name, p_mime_type, p_file_size)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION sim.local_register_template_add_attachment(UUID, TEXT, TEXT, TEXT, TEXT, BIGINT) TO authenticated;

NOTIFY pgrst, 'reload schema';
