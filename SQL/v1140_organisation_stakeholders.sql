-- =============================================================================
-- v1140: Organisation stakeholders
-- A stakeholder with no project is stored for the organisation and listed on
-- every project in that organisation. A project can remove them locally
-- without deleting them for the other projects.
-- Schemas: public.stakeholders, sim.practice_stakeholder_register
-- =============================================================================

ALTER TABLE public.stakeholders
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.stakeholders.account_id IS
  'Organisation this stakeholder belongs to. Required when project_id is null so the stakeholder appears on every project in that organisation.';

COMMENT ON COLUMN public.stakeholders.project_id IS
  'Project this stakeholder is assigned to. NULL means they belong to the organisation (account_id) and appear on every project until a project removes them.';

UPDATE public.stakeholders s
SET account_id = p.account_id
FROM public.projects p
WHERE s.project_id = p.id
  AND s.account_id IS NULL
  AND p.account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stakeholders_account_unassigned
  ON public.stakeholders (account_id)
  WHERE is_deleted = FALSE AND project_id IS NULL AND account_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.trg_stakeholders_set_account_from_project()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.project_id IS NOT NULL AND NEW.account_id IS NULL THEN
    SELECT p.account_id INTO NEW.account_id
    FROM public.projects p
    WHERE p.id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stakeholders_set_account_from_project ON public.stakeholders;
CREATE TRIGGER trg_stakeholders_set_account_from_project
  BEFORE INSERT OR UPDATE OF project_id, account_id ON public.stakeholders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_stakeholders_set_account_from_project();

CREATE TABLE IF NOT EXISTS public.stakeholder_project_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id UUID NOT NULL REFERENCES public.stakeholders(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  excluded_by UUID REFERENCES public.users(id),
  excluded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_stakeholder_project_exclusions UNIQUE (stakeholder_id, project_id)
);

COMMENT ON TABLE public.stakeholder_project_exclusions IS
  'Hides an organisation stakeholder from one project. The stakeholder stays on the organisation''s other projects.';

CREATE INDEX IF NOT EXISTS idx_stakeholder_project_exclusions_project
  ON public.stakeholder_project_exclusions (project_id);

ALTER TABLE public.stakeholder_project_exclusions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stakeholder_project_exclusions_select ON public.stakeholder_project_exclusions;
CREATE POLICY stakeholder_project_exclusions_select
  ON public.stakeholder_project_exclusions
  FOR SELECT TO authenticated
  USING (TRUE);

GRANT SELECT ON public.stakeholder_project_exclusions TO authenticated;

CREATE OR REPLACE FUNCTION public.exclude_stakeholder_from_project(
  p_stakeholder_id UUID,
  p_project_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_stakeholder_account UUID;
  v_stakeholder_project UUID;
  v_project_account UUID;
  v_allowed BOOLEAN := FALSE;
BEGIN
  SELECT u.id INTO v_user
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
    AND COALESCE(u.is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to remove a stakeholder from a project.';
  END IF;

  SELECT s.account_id, s.project_id
  INTO v_stakeholder_account, v_stakeholder_project
  FROM public.stakeholders s
  WHERE s.id = p_stakeholder_id
    AND COALESCE(s.is_deleted, FALSE) = FALSE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stakeholder not found.';
  END IF;

  IF v_stakeholder_project IS NOT NULL THEN
    RAISE EXCEPTION 'This stakeholder belongs to one project. Delete that project record instead of removing them from the organisation.';
  END IF;

  SELECT p.account_id INTO v_project_account
  FROM public.projects p
  WHERE p.id = p_project_id
    AND COALESCE(p.is_deleted, FALSE) = FALSE;

  IF v_project_account IS NULL OR v_stakeholder_account IS DISTINCT FROM v_project_account THEN
    RAISE EXCEPTION 'This stakeholder is not part of this organisation.';
  END IF;

  v_allowed := EXISTS (
    SELECT 1
    FROM public.project_memberships pm
    WHERE pm.project_id = p_project_id
      AND pm.user_id = v_user
      AND COALESCE(pm.is_active, TRUE) = TRUE
  );

  IF NOT v_allowed THEN
    v_allowed := EXISTS (
      SELECT 1
      FROM public.accounts a
      WHERE a.id = v_project_account
        AND a.owner_user_id = v_user
        AND COALESCE(a.is_deleted, FALSE) = FALSE
    );
  END IF;

  IF NOT v_allowed THEN
    v_allowed := EXISTS (
      SELECT 1
      FROM public.project_memberships pm
      JOIN public.projects p ON p.id = pm.project_id
      JOIN public.project_roles pr ON pr.id = pm.project_role_id
      WHERE pm.user_id = v_user
        AND COALESCE(pm.is_active, TRUE) = TRUE
        AND p.account_id = v_project_account
        AND COALESCE(p.is_deleted, FALSE) = FALSE
        AND pr.role_name IN ('pmo_admin', 'pmo', 'programme_manager', 'portfolio_manager')
    );
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'You can remove this stakeholder only from a project you work on.';
  END IF;

  INSERT INTO public.stakeholder_project_exclusions (stakeholder_id, project_id, excluded_by)
  VALUES (p_stakeholder_id, p_project_id, v_user)
  ON CONFLICT (stakeholder_id, project_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.exclude_stakeholder_from_project(UUID, UUID) IS
  'Removes an organisation stakeholder from one project. PMO, the account owner, and project members (PM, team manager, team member) may do this for their project.';

GRANT EXECUTE ON FUNCTION public.exclude_stakeholder_from_project(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_stakeholders_list(
  p_project_id uuid DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_stakeholder_type text DEFAULT NULL,
  p_stakeholder_status text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS SETOF public.stakeholders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.*
  FROM public.stakeholders s
  LEFT JOIN public.projects proj ON proj.id = p_project_id
  WHERE COALESCE(s.is_deleted, FALSE) = FALSE
    AND (
      p_project_id IS NULL
      OR s.project_id = p_project_id
      OR (
        s.project_id IS NULL
        AND s.account_id IS NOT NULL
        AND proj.account_id IS NOT NULL
        AND s.account_id = proj.account_id
        AND NOT EXISTS (
          SELECT 1
          FROM public.stakeholder_project_exclusions e
          WHERE e.stakeholder_id = s.id
            AND e.project_id = p_project_id
        )
      )
    )
    AND (p_stakeholder_type IS NULL OR p_stakeholder_type = '' OR s.stakeholder_type = p_stakeholder_type)
    AND (p_stakeholder_status IS NULL OR p_stakeholder_status = '' OR s.stakeholder_status = p_stakeholder_status)
    AND (
      p_search IS NULL OR p_search = ''
      OR s.stakeholder_name ILIKE '%' || p_search || '%'
      OR s.stakeholder_reference ILIKE '%' || p_search || '%'
      OR s.stakeholder_organization ILIKE '%' || p_search || '%'
    )
  ORDER BY s.stakeholder_name ASC
  LIMIT COALESCE(NULLIF(p_limit, 0), 500);
$$;

-- Simulator practice register: same idea, scoped to the practice user.
ALTER TABLE sim.practice_stakeholder_register
  ALTER COLUMN practice_project_id DROP NOT NULL;

COMMENT ON COLUMN sim.practice_stakeholder_register.practice_project_id IS
  'Practice project this stakeholder is assigned to. NULL means they appear on every practice project for this user until a project removes them.';

CREATE TABLE IF NOT EXISTS sim.practice_stakeholder_project_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_stakeholder_id UUID NOT NULL REFERENCES sim.practice_stakeholder_register(id) ON DELETE CASCADE,
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  excluded_by UUID,
  excluded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_practice_stakeholder_project_exclusions UNIQUE (practice_stakeholder_id, practice_project_id)
);

ALTER TABLE sim.practice_stakeholder_project_exclusions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS practice_stakeholder_project_exclusions_owner ON sim.practice_stakeholder_project_exclusions;
CREATE POLICY practice_stakeholder_project_exclusions_owner
  ON sim.practice_stakeholder_project_exclusions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM sim.practice_stakeholder_register r
      WHERE r.id = practice_stakeholder_id
        AND r.user_id = sim.get_current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM sim.practice_stakeholder_register r
      WHERE r.id = practice_stakeholder_id
        AND r.user_id = sim.get_current_user_id()
    )
  );

GRANT SELECT, INSERT, DELETE ON sim.practice_stakeholder_project_exclusions TO authenticated;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('stakeholder_project_exclusions', 'Projects that have removed an organisation-wide stakeholder from their own register', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();
