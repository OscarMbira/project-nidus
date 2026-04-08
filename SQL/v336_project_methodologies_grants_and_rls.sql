-- =============================================================================
-- v336: project_methodologies — GRANT + RLS aligned with projects (v104)
-- =============================================================================
-- Fixes: "permission denied for table project_methodologies" on project detail
--        and embedded PostgREST selects.
--
-- Causes addressed:
--   1) Table may lack GRANT to `authenticated` (v104 granted `projects` only).
--   2) Legacy policies (v09) used user_projects.user_id = auth.uid(), but
--      user_projects.user_id references public.users.id, not auth.users.id.
--
-- Prerequisites: public.get_user_id_from_auth(UUID) from v104 (or equivalent).
-- Database: PostgreSQL 15+ (Supabase public schema)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_user_id_from_auth'
  ) THEN
    RAISE EXCEPTION 'v336: create public.get_user_id_from_auth first (see SQL/v104_fix_projects_rls_recursion.sql)';
  END IF;
END $$;

-- Privileges (Supabase roles)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_methodologies TO authenticated;
GRANT ALL ON public.project_methodologies TO service_role;

ALTER TABLE public.project_methodologies ENABLE ROW LEVEL SECURITY;

-- Drop legacy v09-style policies (names from v09_rls_policies.sql)
DROP POLICY IF EXISTS policy_project_methodologies_member_read ON public.project_methodologies;
DROP POLICY IF EXISTS policy_project_methodologies_owner_all ON public.project_methodologies;
DROP POLICY IF EXISTS policy_project_methodologies_admin_all ON public.project_methodologies;

-- Optional re-runs
DROP POLICY IF EXISTS project_methodologies_select_via_projects ON public.project_methodologies;
DROP POLICY IF EXISTS project_methodologies_modify_via_projects ON public.project_methodologies;
DROP POLICY IF EXISTS project_methodologies_insert_via_projects ON public.project_methodologies;
DROP POLICY IF EXISTS project_methodologies_update_via_projects ON public.project_methodologies;
DROP POLICY IF EXISTS project_methodologies_delete_via_projects ON public.project_methodologies;
DROP POLICY IF EXISTS project_methodologies_system_admin ON public.project_methodologies;

-- SELECT: any project row the user can already read (projects RLS applies inside EXISTS)
CREATE POLICY project_methodologies_select_via_projects
  ON public.project_methodologies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_methodologies.project_id
        AND COALESCE(p.is_deleted, FALSE) = FALSE
    )
  );

-- INSERT/UPDATE/DELETE: match v104-style project edit rights (split from FOR ALL to avoid SELECT overlap)
CREATE POLICY project_methodologies_insert_via_projects
  ON public.project_methodologies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_methodologies.project_id
        AND COALESCE(p.is_deleted, FALSE) = FALSE
        AND (
          p.owner_user_id = get_user_id_from_auth(auth.uid())
          OR p.project_manager_user_id = get_user_id_from_auth(auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.accounts a
            WHERE a.id = p.account_id
              AND a.owner_user_id = get_user_id_from_auth(auth.uid())
              AND COALESCE(a.is_deleted, FALSE) = FALSE
          )
          OR EXISTS (
            SELECT 1
            FROM public.user_projects up
            WHERE up.project_id = p.id
              AND up.user_id = get_user_id_from_auth(auth.uid())
              AND COALESCE(up.is_deleted, FALSE) = FALSE
              AND up.access_level IN ('owner', 'admin')
          )
        )
    )
  );

CREATE POLICY project_methodologies_update_via_projects
  ON public.project_methodologies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_methodologies.project_id
        AND COALESCE(p.is_deleted, FALSE) = FALSE
        AND (
          p.owner_user_id = get_user_id_from_auth(auth.uid())
          OR p.project_manager_user_id = get_user_id_from_auth(auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.accounts a
            WHERE a.id = p.account_id
              AND a.owner_user_id = get_user_id_from_auth(auth.uid())
              AND COALESCE(a.is_deleted, FALSE) = FALSE
          )
          OR EXISTS (
            SELECT 1
            FROM public.user_projects up
            WHERE up.project_id = p.id
              AND up.user_id = get_user_id_from_auth(auth.uid())
              AND COALESCE(up.is_deleted, FALSE) = FALSE
              AND up.access_level IN ('owner', 'admin')
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_methodologies.project_id
        AND COALESCE(p.is_deleted, FALSE) = FALSE
        AND (
          p.owner_user_id = get_user_id_from_auth(auth.uid())
          OR p.project_manager_user_id = get_user_id_from_auth(auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.accounts a
            WHERE a.id = p.account_id
              AND a.owner_user_id = get_user_id_from_auth(auth.uid())
              AND COALESCE(a.is_deleted, FALSE) = FALSE
          )
          OR EXISTS (
            SELECT 1
            FROM public.user_projects up
            WHERE up.project_id = p.id
              AND up.user_id = get_user_id_from_auth(auth.uid())
              AND COALESCE(up.is_deleted, FALSE) = FALSE
              AND up.access_level IN ('owner', 'admin')
          )
        )
    )
  );

CREATE POLICY project_methodologies_delete_via_projects
  ON public.project_methodologies
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_methodologies.project_id
        AND COALESCE(p.is_deleted, FALSE) = FALSE
        AND (
          p.owner_user_id = get_user_id_from_auth(auth.uid())
          OR p.project_manager_user_id = get_user_id_from_auth(auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.accounts a
            WHERE a.id = p.account_id
              AND a.owner_user_id = get_user_id_from_auth(auth.uid())
              AND COALESCE(a.is_deleted, FALSE) = FALSE
          )
          OR EXISTS (
            SELECT 1
            FROM public.user_projects up
            WHERE up.project_id = p.id
              AND up.user_id = get_user_id_from_auth(auth.uid())
              AND COALESCE(up.is_deleted, FALSE) = FALSE
              AND up.access_level IN ('owner', 'admin')
          )
        )
    )
  );

-- System Admin (internal users.id, not auth uid)
CREATE POLICY project_methodologies_system_admin
  ON public.project_methodologies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      JOIN public.users u ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      JOIN public.users u ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
    )
  );

COMMENT ON POLICY project_methodologies_select_via_projects ON public.project_methodologies IS
  'v336: Read methodology rows when the parent project is visible under projects RLS.';

COMMENT ON POLICY project_methodologies_insert_via_projects ON public.project_methodologies IS
  'v336: Insert methodology when user can manage project (owner/manager/account owner/user_projects admin).';
