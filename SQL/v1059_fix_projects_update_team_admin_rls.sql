-- ============================================================================
-- v1059: Fix projects UPDATE for real Project Manager memberships
-- ============================================================================
-- Follow-up to v1058. Save on Project Details still failed with
-- "Could not save — you may not have permission to update this project"
-- because v1058 only matched user_projects.access_level IN ('owner','admin','pm').
--
-- Real data (schema v03 + seeds) stores PMs as:
--   access_level = 'member'  (default)
--   project_role = 'Project Manager'
-- and 'pm' is NOT a documented access_level. So v1058 matched almost nobody.
--
-- Meanwhile SELECT works via projects_select_project_member (v403) for ANY
-- user_projects / project_memberships / user_roles link — so the PM can open
-- the page but UPDATE returns 0 rows under RLS.
--
-- This replaces projects_update_team_admin to match:
--   1. projects.project_manager_user_id (named PM column)
--   2. is_project_manager(auth.uid(), project) — project_memberships + project_roles
--   3. user_projects owner/admin OR project_role Project Manager / project_manager
--   4. project-scoped user_roles with a project_manager / programme_manager role
-- ============================================================================

DROP POLICY IF EXISTS projects_update_team_admin ON public.projects;

CREATE POLICY projects_update_team_admin
ON public.projects
FOR UPDATE
TO authenticated
USING (
  COALESCE(is_deleted, FALSE) = FALSE
  AND (
    project_manager_user_id = public.get_user_id_from_auth(auth.uid())
    OR public.is_project_manager(auth.uid(), projects.id)
    OR EXISTS (
      SELECT 1
      FROM public.user_projects up
      WHERE up.project_id = projects.id
        AND up.user_id = public.get_user_id_from_auth(auth.uid())
        AND COALESCE(up.is_deleted, FALSE) = FALSE
        AND COALESCE(up.is_active, TRUE) = TRUE
        AND (
          up.access_level IN ('owner', 'admin')
          OR lower(replace(trim(coalesce(up.project_role, '')), '_', ' ')) IN (
            'project manager', 'programme manager'
          )
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      INNER JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.project_id = projects.id
        AND ur.user_id = public.get_user_id_from_auth(auth.uid())
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
        AND lower(trim(coalesce(r.role_name, ''))) IN (
          'project_manager', 'programme_manager', 'pm_project_manager'
        )
    )
  )
)
WITH CHECK (
  COALESCE(is_deleted, FALSE) = FALSE
  AND (
    project_manager_user_id = public.get_user_id_from_auth(auth.uid())
    OR public.is_project_manager(auth.uid(), projects.id)
    OR EXISTS (
      SELECT 1
      FROM public.user_projects up
      WHERE up.project_id = projects.id
        AND up.user_id = public.get_user_id_from_auth(auth.uid())
        AND COALESCE(up.is_deleted, FALSE) = FALSE
        AND COALESCE(up.is_active, TRUE) = TRUE
        AND (
          up.access_level IN ('owner', 'admin')
          OR lower(replace(trim(coalesce(up.project_role, '')), '_', ' ')) IN (
            'project manager', 'programme manager'
          )
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      INNER JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.project_id = projects.id
        AND ur.user_id = public.get_user_id_from_auth(auth.uid())
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
        AND lower(trim(coalesce(r.role_name, ''))) IN (
          'project_manager', 'programme_manager', 'pm_project_manager'
        )
    )
  )
);

COMMENT ON POLICY projects_update_team_admin ON public.projects IS
  'v1059: named PM, is_project_manager(), user_projects owner/admin or Project Manager role, or project-scoped PM user_roles may UPDATE projects.';

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1059: projects_update_team_admin replaced — matches real PM memberships';
  RAISE NOTICE '================================================';
END $$;
