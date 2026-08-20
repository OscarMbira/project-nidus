-- =============================================================================
-- v859: create_draft_form_instance RPC + harden form_instances RLS
-- Symptom: POST /form_instances still 403 after v858 for some PMs (membership
--          helper edge cases / RETURNING+SELECT timing / missing apply).
-- Fix:
--   1) Drop & recreate form_instances policies (idempotent, all names).
--   2) SECURITY DEFINER RPC that checks project access then inserts draft.
-- Client should prefer the RPC; direct INSERT still works when v858 policies apply.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Ensure grants + wipe unknown/legacy policies on form_instances
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_instances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_instance_values TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_instance_rows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_version_history TO authenticated;
GRANT SELECT ON public.form_templates TO authenticated;
GRANT SELECT ON public.form_template_versions TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'form_instances'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.form_instances', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.form_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_form_instances_select
  ON public.form_instances FOR SELECT TO authenticated
  USING (public.auth_user_can_access_project(project_id));

CREATE POLICY policy_form_instances_insert
  ON public.form_instances FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_can_access_project(project_id));

CREATE POLICY policy_form_instances_update
  ON public.form_instances FOR UPDATE TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

CREATE POLICY policy_form_instances_delete
  ON public.form_instances FOR DELETE TO authenticated
  USING (public.auth_user_can_access_project(project_id));

-- Templates catalog (needed for template lookup before create)
DROP POLICY IF EXISTS policy_form_templates_select ON public.form_templates;
CREATE POLICY policy_form_templates_select
  ON public.form_templates FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS policy_form_template_versions_select ON public.form_template_versions;
CREATE POLICY policy_form_template_versions_select
  ON public.form_template_versions FOR SELECT TO authenticated
  USING (true);

-- Child tables (values / rows / history) — recreate if missing
DROP POLICY IF EXISTS policy_form_instance_values_all ON public.form_instance_values;
CREATE POLICY policy_form_instance_values_all
  ON public.form_instance_values FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.form_instances fi
      WHERE fi.id = form_instance_id
        AND public.auth_user_can_access_project(fi.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.form_instances fi
      WHERE fi.id = form_instance_id
        AND public.auth_user_can_access_project(fi.project_id)
    )
  );

DROP POLICY IF EXISTS policy_form_instance_rows_all ON public.form_instance_rows;
CREATE POLICY policy_form_instance_rows_all
  ON public.form_instance_rows FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.form_instances fi
      WHERE fi.id = form_instance_id
        AND public.auth_user_can_access_project(fi.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.form_instances fi
      WHERE fi.id = form_instance_id
        AND public.auth_user_can_access_project(fi.project_id)
    )
  );

DROP POLICY IF EXISTS policy_form_version_history_all ON public.form_version_history;
CREATE POLICY policy_form_version_history_all
  ON public.form_version_history FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.form_instances fi
      WHERE fi.id = form_instance_id
        AND public.auth_user_can_access_project(fi.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.form_instances fi
      WHERE fi.id = form_instance_id
        AND public.auth_user_can_access_project(fi.project_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 2) SECURITY DEFINER create RPC (membership-checked; not an RLS bypass)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_draft_form_instance(
  p_project_id UUID,
  p_template_code TEXT,
  p_owner_id UUID DEFAULT NULL
)
RETURNS public.form_instances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_template public.form_templates%ROWTYPE;
  v_version public.form_template_versions%ROWTYPE;
  v_owner UUID;
  v_row public.form_instances%ROWTYPE;
BEGIN
  IF p_project_id IS NULL THEN
    RAISE EXCEPTION 'project_id is required';
  END IF;
  IF NULLIF(btrim(p_template_code), '') IS NULL THEN
    RAISE EXCEPTION 'template_code is required';
  END IF;

  IF NOT public.auth_user_can_access_project(p_project_id) THEN
    RAISE EXCEPTION 'Not allowed to create form instances for this project'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_template
  FROM public.form_templates
  WHERE template_code = btrim(p_template_code)
  LIMIT 1;

  IF v_template.id IS NULL THEN
    RAISE EXCEPTION 'Form template % not found', p_template_code;
  END IF;

  SELECT * INTO v_version
  FROM public.form_template_versions
  WHERE template_id = v_template.id
    AND is_current = TRUE
  LIMIT 1;

  IF v_version.id IS NULL THEN
    RAISE EXCEPTION 'Form template % has no current version', p_template_code;
  END IF;

  v_owner := p_owner_id;
  IF v_owner IS NULL THEN
    SELECT u.id INTO v_owner
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND COALESCE(u.is_deleted, FALSE) = FALSE
    LIMIT 1;
  END IF;

  INSERT INTO public.form_instances (
    project_id,
    template_id,
    template_version_id,
    owner_id,
    status
  ) VALUES (
    p_project_id,
    v_template.id,
    v_version.id,
    v_owner,
    'draft'
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.create_draft_form_instance(UUID, TEXT, UUID) IS
  'Create a draft form_instances row after auth_user_can_access_project check (v859).';

REVOKE ALL ON FUNCTION public.create_draft_form_instance(UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_draft_form_instance(UUID, TEXT, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Simulator twin
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.form_instances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.form_instance_values TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.form_instance_rows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.form_version_history TO authenticated;
GRANT SELECT ON sim.form_templates TO authenticated;
GRANT SELECT ON sim.form_template_versions TO authenticated;
GRANT USAGE ON SCHEMA sim TO authenticated;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'sim' AND tablename = 'form_instances'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON sim.form_instances', r.policyname);
  END LOOP;
END $$;

ALTER TABLE sim.form_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_sim_form_instances_select
  ON sim.form_instances FOR SELECT TO authenticated
  USING (sim.auth_user_can_access_practice_project(project_id));

CREATE POLICY policy_sim_form_instances_insert
  ON sim.form_instances FOR INSERT TO authenticated
  WITH CHECK (sim.auth_user_can_access_practice_project(project_id));

CREATE POLICY policy_sim_form_instances_update
  ON sim.form_instances FOR UPDATE TO authenticated
  USING (sim.auth_user_can_access_practice_project(project_id))
  WITH CHECK (sim.auth_user_can_access_practice_project(project_id));

CREATE POLICY policy_sim_form_instances_delete
  ON sim.form_instances FOR DELETE TO authenticated
  USING (sim.auth_user_can_access_practice_project(project_id));

DROP POLICY IF EXISTS policy_sim_form_templates_select ON sim.form_templates;
CREATE POLICY policy_sim_form_templates_select
  ON sim.form_templates FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS policy_sim_form_template_versions_select ON sim.form_template_versions;
CREATE POLICY policy_sim_form_template_versions_select
  ON sim.form_template_versions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS policy_sim_form_instance_values_all ON sim.form_instance_values;
CREATE POLICY policy_sim_form_instance_values_all
  ON sim.form_instance_values FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.form_instances fi
      WHERE fi.id = form_instance_id
        AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.form_instances fi
      WHERE fi.id = form_instance_id
        AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
  );

DROP POLICY IF EXISTS policy_sim_form_instance_rows_all ON sim.form_instance_rows;
CREATE POLICY policy_sim_form_instance_rows_all
  ON sim.form_instance_rows FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.form_instances fi
      WHERE fi.id = form_instance_id
        AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.form_instances fi
      WHERE fi.id = form_instance_id
        AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
  );

DROP POLICY IF EXISTS policy_sim_form_version_history_all ON sim.form_version_history;
CREATE POLICY policy_sim_form_version_history_all
  ON sim.form_version_history FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.form_instances fi
      WHERE fi.id = form_instance_id
        AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.form_instances fi
      WHERE fi.id = form_instance_id
        AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
  );

CREATE OR REPLACE FUNCTION sim.create_draft_form_instance(
  p_project_id UUID,
  p_template_code TEXT,
  p_owner_id UUID DEFAULT NULL
)
RETURNS sim.form_instances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_template sim.form_templates%ROWTYPE;
  v_version sim.form_template_versions%ROWTYPE;
  v_owner UUID;
  v_row sim.form_instances%ROWTYPE;
BEGIN
  IF p_project_id IS NULL THEN
    RAISE EXCEPTION 'project_id is required';
  END IF;
  IF NULLIF(btrim(p_template_code), '') IS NULL THEN
    RAISE EXCEPTION 'template_code is required';
  END IF;

  IF NOT sim.auth_user_can_access_practice_project(p_project_id) THEN
    RAISE EXCEPTION 'Not allowed to create form instances for this practice project'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_template
  FROM sim.form_templates
  WHERE template_code = btrim(p_template_code)
  LIMIT 1;

  IF v_template.id IS NULL THEN
    RAISE EXCEPTION 'Form template % not found', p_template_code;
  END IF;

  SELECT * INTO v_version
  FROM sim.form_template_versions
  WHERE template_id = v_template.id
    AND is_current = TRUE
  LIMIT 1;

  IF v_version.id IS NULL THEN
    RAISE EXCEPTION 'Form template % has no current version', p_template_code;
  END IF;

  v_owner := p_owner_id;
  IF v_owner IS NULL THEN
    SELECT u.id INTO v_owner
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND COALESCE(u.is_deleted, FALSE) = FALSE
    LIMIT 1;
  END IF;

  INSERT INTO sim.form_instances (
    project_id,
    template_id,
    template_version_id,
    owner_id,
    status
  ) VALUES (
    p_project_id,
    v_template.id,
    v_version.id,
    v_owner,
    'draft'
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION sim.create_draft_form_instance(UUID, TEXT, UUID) IS
  'Create a draft sim.form_instances row after practice-project access check (v859).';

REVOKE ALL ON FUNCTION sim.create_draft_form_instance(UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sim.create_draft_form_instance(UUID, TEXT, UUID) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'v859_create_draft_form_instance_rpc.sql applied';
END $$;
