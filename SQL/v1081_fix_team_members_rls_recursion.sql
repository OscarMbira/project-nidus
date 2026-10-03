-- =============================================================================
-- v1081: Fix infinite RLS recursion on public.team_members (42P17)
-- =============================================================================
-- Root cause (v09 policy_team_members_member_read):
--   USING (team_id IN (SELECT team_id FROM team_members WHERE ...))
-- That self-query re-enters the same policy → "infinite recursion detected".
--
-- Fix: drop legacy policies; allow access via
--   auth_user_can_access_project(teams.project_id) (SECURITY DEFINER, row_security off)
-- and own-row membership (users.auth_user_id = auth.uid()).
-- =============================================================================

DROP POLICY IF EXISTS policy_team_members_member_read ON public.team_members;
DROP POLICY IF EXISTS policy_team_members_lead_all ON public.team_members;
DROP POLICY IF EXISTS policy_team_members_owner_all ON public.team_members;
DROP POLICY IF EXISTS policy_team_members_admin_all ON public.team_members;
DROP POLICY IF EXISTS team_members_select_access ON public.team_members;
DROP POLICY IF EXISTS team_members_modify_access ON public.team_members;
DROP POLICY IF EXISTS team_members_insert_access ON public.team_members;
DROP POLICY IF EXISTS team_members_update_access ON public.team_members;
DROP POLICY IF EXISTS team_members_delete_access ON public.team_members;
DROP POLICY IF EXISTS team_members_admin_system ON public.team_members;

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- SELECT: own membership row OR access to the team's project
CREATE POLICY team_members_select_access ON public.team_members
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND (
      EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = team_members.user_id
          AND u.auth_user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.teams t
        WHERE t.id = team_members.team_id
          AND COALESCE(t.is_deleted, FALSE) = FALSE
          AND public.auth_user_can_access_project(t.project_id)
      )
    )
  );

-- INSERT / UPDATE / DELETE: project access, or team lead of that team
-- (separate from SELECT so soft-deleted rows stay hidden on read)
CREATE POLICY team_members_insert_access ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_members.team_id
        AND COALESCE(t.is_deleted, FALSE) = FALSE
        AND (
          public.auth_user_can_access_project(t.project_id)
          OR EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.id = t.team_lead_user_id
              AND u.auth_user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY team_members_update_access ON public.team_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_members.team_id
        AND COALESCE(t.is_deleted, FALSE) = FALSE
        AND (
          public.auth_user_can_access_project(t.project_id)
          OR EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.id = t.team_lead_user_id
              AND u.auth_user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_members.team_id
        AND COALESCE(t.is_deleted, FALSE) = FALSE
        AND (
          public.auth_user_can_access_project(t.project_id)
          OR EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.id = t.team_lead_user_id
              AND u.auth_user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY team_members_delete_access ON public.team_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_members.team_id
        AND COALESCE(t.is_deleted, FALSE) = FALSE
        AND (
          public.auth_user_can_access_project(t.project_id)
          OR EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.id = t.team_lead_user_id
              AND u.auth_user_id = auth.uid()
          )
        )
    )
  );

-- System / PMO admins
CREATE POLICY team_members_admin_system ON public.team_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      INNER JOIN public.roles r ON r.id = ur.role_id
      INNER JOIN public.users u ON u.id = ur.user_id
      WHERE u.auth_user_id = auth.uid()
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
        AND COALESCE(ur.is_active, TRUE) = TRUE
        AND COALESCE(r.is_deleted, FALSE) = FALSE
        AND r.role_name IN ('System Admin', 'system_admin', 'PMO Admin', 'pmo_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      INNER JOIN public.roles r ON r.id = ur.role_id
      INNER JOIN public.users u ON u.id = ur.user_id
      WHERE u.auth_user_id = auth.uid()
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
        AND COALESCE(ur.is_active, TRUE) = TRUE
        AND COALESCE(r.is_deleted, FALSE) = FALSE
        AND r.role_name IN ('System Admin', 'system_admin', 'PMO Admin', 'pmo_admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'v1081_fix_team_members_rls_recursion.sql applied — team_members policies no longer self-reference';
END $$;
