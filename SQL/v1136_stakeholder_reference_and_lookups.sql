-- =============================================================================
-- v1136: Stakeholder reference ID Generation, and add-missing lookups
-- (renamed from v1135 to resolve a filename collision with unrelated concurrent
-- work — content unchanged)
-- Platform public.stakeholders and Simulator sim.practice_stakeholder_register
--
-- 1) A blank stakeholder_reference is assigned by Admin ID Generation
--    (STK-YYYY-### on Platform, SSTK-YYYY-### on Simulator).
--    Numbers run for the whole table. A per-project counter would reissue
--    STK-YYYY-001, which admin.generated_ids rejects as a duplicate.
--    A reference the user typed is kept.
-- 2) Title, organisation, and department can be added from the stakeholder form:
--      title        → public.professional_roles (role code is required)
--      organisation → public.stakeholder_organisations
--      department   → public.okr_departments
-- Run in Supabase after v919 and v643.
-- =============================================================================

-- ── ID Generation ────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_stakeholders_admin_display_id ON public.stakeholders;
CREATE TRIGGER trg_stakeholders_admin_display_id
  AFTER INSERT ON public.stakeholders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_apply_admin_display_id('public.stakeholders', 'stakeholder_reference');

DROP TRIGGER IF EXISTS trg_sim_stakeholders_admin_display_id ON sim.practice_stakeholder_register;
CREATE TRIGGER trg_sim_stakeholders_admin_display_id
  AFTER INSERT ON sim.practice_stakeholder_register
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.practice_stakeholder_register', 'stakeholder_reference');

DO $$
DECLARE
  r RECORD;
  v_admin UUID;
  v_rule_id UUID;
  v_ref TEXT;
  v_year TEXT := to_char(CURRENT_DATE, 'YYYY');
  v_max BIGINT;
  v_col_max BIGINT;
BEGIN
  SELECT id INTO v_admin
  FROM admin.admin_users
  WHERE activation_status = 'active'
  ORDER BY CASE WHEN role = 'super_admin' THEN 0 ELSE 1 END, created_at
  LIMIT 1;

  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No active admin user found. Activate an admin user, then re-run this script.';
  END IF;

  FOR r IN
    SELECT *
    FROM (
      VALUES
        ('public.stakeholders'::text, 'STK'::varchar, 'Stakeholder references (Platform)'::text, 3),
        ('sim.practice_stakeholder_register'::text, 'SSTK'::varchar, 'Stakeholder references (Simulator)'::text, 3)
    ) AS t(target_table, table_abbreviation, table_description, num_digits)
  LOOP
    SELECT id INTO v_rule_id
    FROM admin.id_generation_rules
    WHERE admin.normalize_id_generation_target_table(target_table)
        = admin.normalize_id_generation_target_table(r.target_table)
    LIMIT 1;

    IF v_rule_id IS NOT NULL THEN
      -- Empty scope clears a previously saved per-project counter.
      PERFORM admin.update_id_generation_rule(
        v_rule_id, r.target_table, r.table_abbreviation, r.table_description,
        '-', '', 'uppercase', 'numeric', 0, r.num_digits, '', 1, TRUE, v_admin,
        'sequential', TRUE, 'YYYY', ''
      );
    ELSE
      PERFORM admin.create_id_generation_rule(
        r.target_table, r.table_abbreviation, r.table_description,
        '-', '', 'uppercase', 'numeric', 0, r.num_digits, '', 1, TRUE, v_admin,
        'sequential', TRUE, 'YYYY', NULL
      );
    END IF;

    SELECT id INTO v_rule_id
    FROM admin.id_generation_rules
    WHERE admin.normalize_id_generation_target_table(target_table)
        = admin.normalize_id_generation_target_table(r.target_table)
    LIMIT 1;

    SELECT COALESCE(MAX(substring(g.display_id FROM '[0-9]+$')::bigint), 0)
    INTO v_max
    FROM admin.generated_ids g
    WHERE g.target_table = r.target_table
      AND g.display_id ~ ('^' || r.table_abbreviation || '-' || v_year || '-[0-9]+$');

    v_col_max := 0;
    IF r.target_table = 'public.stakeholders' THEN
      SELECT COALESCE(MAX(substring(s.stakeholder_reference FROM '[0-9]+$')::bigint), 0)
      INTO v_col_max
      FROM public.stakeholders s
      WHERE s.stakeholder_reference ~ ('^' || r.table_abbreviation || '-' || v_year || '-[0-9]+$');
    ELSE
      SELECT COALESCE(MAX(substring(s.stakeholder_reference FROM '[0-9]+$')::bigint), 0)
      INTO v_col_max
      FROM sim.practice_stakeholder_register s
      WHERE s.stakeholder_reference ~ ('^' || r.table_abbreviation || '-' || v_year || '-[0-9]+$');
    END IF;

    v_max := GREATEST(v_max, v_col_max);

    IF v_max > 0 THEN
      INSERT INTO admin.id_generation_sequences (rule_id, scope_value, period_key, current_value)
      VALUES (v_rule_id, NULL, v_year, v_max)
      ON CONFLICT ON CONSTRAINT uq_id_generation_sequences_rule_scope_period
      DO UPDATE SET
        current_value = GREATEST(admin.id_generation_sequences.current_value, EXCLUDED.current_value),
        updated_at = NOW();
    END IF;
  END LOOP;

  FOR r IN
    SELECT id
    FROM public.stakeholders
    WHERE COALESCE(is_deleted, FALSE) = FALSE
      AND (stakeholder_reference IS NULL OR btrim(stakeholder_reference) = '')
    ORDER BY created_at NULLS LAST, id
  LOOP
    v_ref := admin.generate_display_id('public.stakeholders', r.id);
    IF v_ref IS NOT NULL AND btrim(v_ref) <> '' THEN
      UPDATE public.stakeholders
      SET stakeholder_reference = v_ref
      WHERE id = r.id;
    END IF;
  END LOOP;

  FOR r IN
    SELECT id
    FROM sim.practice_stakeholder_register
    WHERE COALESCE(is_deleted, FALSE) = FALSE
      AND (stakeholder_reference IS NULL OR btrim(stakeholder_reference) = '')
    ORDER BY created_at NULLS LAST, id
  LOOP
    v_ref := admin.generate_display_id('sim.practice_stakeholder_register', r.id);
    IF v_ref IS NOT NULL AND btrim(v_ref) <> '' THEN
      UPDATE sim.practice_stakeholder_register
      SET stakeholder_reference = v_ref
      WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- ── Organisation names used on stakeholders ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.stakeholder_organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  organisation_name TEXT NOT NULL,
  organisation_name_key TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stakeholder_organisations_name_len CHECK (char_length(btrim(organisation_name)) BETWEEN 1 AND 200)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_stakeholder_organisations_name
  ON public.stakeholder_organisations (account_id, organisation_name_key)
  WHERE is_deleted = FALSE;

ALTER TABLE public.stakeholder_organisations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.stakeholder_organisations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stakeholder_organisations TO service_role;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('stakeholder_organisations', 'Organisation names that can be selected on a stakeholder', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ── Who may add a lookup value ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.stakeholder_lookup_caller_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
    AND COALESCE(u.is_deleted, FALSE) = FALSE
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.user_can_maintain_stakeholder_lookups(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
BEGIN
  v_user := public.stakeholder_lookup_caller_id();
  IF v_user IS NULL OR p_account_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.id = p_account_id
      AND a.owner_user_id = v_user
      AND COALESCE(a.is_deleted, FALSE) = FALSE
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.project_memberships pm
    JOIN public.projects p ON p.id = pm.project_id
    WHERE pm.user_id = v_user
      AND pm.is_active = TRUE
      AND p.account_id = p_account_id
      AND COALESCE(p.is_deleted, FALSE) = FALSE
  );
END;
$$;

DROP POLICY IF EXISTS policy_stakeholder_organisations_select ON public.stakeholder_organisations;
CREATE POLICY policy_stakeholder_organisations_select
  ON public.stakeholder_organisations
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND public.user_can_maintain_stakeholder_lookups(account_id)
  );

DROP POLICY IF EXISTS policy_okr_departments_account_read ON public.okr_departments;
CREATE POLICY policy_okr_departments_account_read
  ON public.okr_departments
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND public.user_can_maintain_stakeholder_lookups(account_id)
  );

-- ── Add a professional title (role code is required) ─────────────────────────

CREATE OR REPLACE FUNCTION public.add_stakeholder_professional_role(p_label TEXT, p_code TEXT)
RETURNS TABLE (role_label TEXT, role_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label TEXT := btrim(COALESCE(p_label, ''));
  v_code TEXT := lower(btrim(COALESCE(p_code, '')));
  v_user UUID;
BEGIN
  v_user := public.stakeholder_lookup_caller_id();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in before adding a title';
  END IF;
  IF v_label = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;
  IF v_code = '' THEN
    RAISE EXCEPTION 'Role code is required';
  END IF;
  IF char_length(v_label) > 150 THEN
    RAISE EXCEPTION 'Title must be 150 characters or fewer';
  END IF;
  IF char_length(v_code) > 50 OR v_code !~ '^[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'Role code must be 50 characters or fewer and use letters, numbers, and underscores';
  END IF;

  INSERT INTO public.professional_roles (role_code, role_label, display_order, is_active, created_by)
  VALUES (v_code, v_label, 1000, TRUE, v_user)
  ON CONFLICT (role_code) DO UPDATE SET
    role_label = EXCLUDED.role_label,
    is_active = TRUE,
    updated_at = NOW(),
    updated_by = v_user
  WHERE public.professional_roles.role_label = EXCLUDED.role_label
     OR lower(public.professional_roles.role_label) = lower(EXCLUDED.role_label);

  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.professional_roles pr WHERE pr.role_code = v_code) THEN
      RAISE EXCEPTION 'Role code "%" is already used. Choose a different code.', v_code;
    END IF;
  END IF;

  RETURN QUERY
  SELECT pr.role_label::TEXT, pr.role_code::TEXT
  FROM public.professional_roles pr
  WHERE pr.role_code = v_code;
END;
$$;

-- ── Add an organisation name ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.add_stakeholder_organisation(p_account_id UUID, p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT := btrim(COALESCE(p_name, ''));
  v_user UUID;
BEGIN
  IF NOT public.user_can_maintain_stakeholder_lookups(p_account_id) THEN
    RAISE EXCEPTION 'Choose a project in this organisation before adding an organisation name';
  END IF;
  IF v_name = '' OR char_length(v_name) > 200 THEN
    RAISE EXCEPTION 'Organisation name is required and must be 200 characters or fewer';
  END IF;
  v_user := public.stakeholder_lookup_caller_id();

  INSERT INTO public.stakeholder_organisations (account_id, organisation_name, organisation_name_key, created_by)
  VALUES (p_account_id, v_name, lower(v_name), v_user)
  ON CONFLICT (account_id, organisation_name_key) WHERE is_deleted = FALSE
  DO UPDATE SET updated_at = NOW()
  RETURNING organisation_name INTO v_name;

  RETURN v_name;
END;
$$;

-- ── Add a department ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.add_stakeholder_department(p_account_id UUID, p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT := btrim(COALESCE(p_name, ''));
BEGIN
  IF NOT public.user_can_maintain_stakeholder_lookups(p_account_id) THEN
    RAISE EXCEPTION 'Choose a project in this organisation before adding a department';
  END IF;
  IF v_name = '' OR char_length(v_name) > 120 THEN
    RAISE EXCEPTION 'Department name is required and must be 120 characters or fewer';
  END IF;

  SELECT d.department_name INTO v_name
  FROM public.okr_departments d
  WHERE d.account_id = p_account_id
    AND lower(btrim(d.department_name)) = lower(v_name)
    AND COALESCE(d.is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_name IS NULL THEN
    INSERT INTO public.okr_departments (account_id, department_name)
    VALUES (p_account_id, btrim(p_name))
    RETURNING department_name INTO v_name;
  END IF;

  RETURN v_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.stakeholder_lookup_caller_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_maintain_stakeholder_lookups(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_stakeholder_professional_role(TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_stakeholder_organisation(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_stakeholder_department(UUID, TEXT) TO authenticated, service_role;

-- Seed organisation names already stored on stakeholders and contacts.
INSERT INTO public.stakeholder_organisations (account_id, organisation_name, organisation_name_key)
SELECT DISTINCT p.account_id, btrim(s.stakeholder_organization), lower(btrim(s.stakeholder_organization))
FROM public.stakeholders s
JOIN public.projects p ON p.id = s.project_id
WHERE p.account_id IS NOT NULL
  AND COALESCE(s.is_deleted, FALSE) = FALSE
  AND btrim(COALESCE(s.stakeholder_organization, '')) <> ''
ON CONFLICT (account_id, organisation_name_key) WHERE is_deleted = FALSE
DO NOTHING;

INSERT INTO public.stakeholder_organisations (account_id, organisation_name, organisation_name_key)
SELECT DISTINCT p.account_id, btrim(c.organisation), lower(btrim(c.organisation))
FROM public.project_contacts c
JOIN public.projects p ON p.id = c.project_id
WHERE p.account_id IS NOT NULL
  AND COALESCE(c.is_deleted, FALSE) = FALSE
  AND btrim(COALESCE(c.organisation, '')) <> ''
ON CONFLICT (account_id, organisation_name_key) WHERE is_deleted = FALSE
DO NOTHING;
