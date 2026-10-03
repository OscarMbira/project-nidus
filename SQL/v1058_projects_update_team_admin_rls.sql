-- ============================================================================
-- v1058: Allow project team owners/admins/PMs to UPDATE projects
-- ============================================================================
-- Project Details save was failing with PostgREST PGRST116
-- ("JSON object requested, multiple (or no) rows returned") because
-- UPDATE … RETURNING matched 0 rows under RLS.
--
-- v104 left projects UPDATE only for:
--   - projects.owner_user_id
--   - projects.project_manager_user_id
--   - account owner (projects_all_account_owner)
-- and dropped the earlier user_projects-based owner/admin FOR ALL policy.
-- Users who manage a project only via user_projects (access_level owner/admin/pm)
-- could still SELECT (via other policies / later grants) but not UPDATE — Save
-- then returned an empty set and .single() surfaced as PGRST116.
--
-- This restores UPDATE for those memberships, using get_user_id_from_auth so
-- user_projects.user_id (public.users.id) is compared correctly — not auth.uid().
-- ============================================================================

DROP POLICY IF EXISTS projects_update_team_admin ON public.projects;

CREATE POLICY projects_update_team_admin
ON public.projects
FOR UPDATE
TO authenticated
USING (
  COALESCE(is_deleted, FALSE) = FALSE
  AND EXISTS (
    SELECT 1
    FROM public.user_projects up
    WHERE up.project_id = projects.id
      AND up.user_id = public.get_user_id_from_auth(auth.uid())
      AND COALESCE(up.is_deleted, FALSE) = FALSE
      AND up.access_level IN ('owner', 'admin', 'pm')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_projects up
    WHERE up.project_id = projects.id
      AND up.user_id = public.get_user_id_from_auth(auth.uid())
      AND COALESCE(up.is_deleted, FALSE) = FALSE
      AND up.access_level IN ('owner', 'admin', 'pm')
  )
);

COMMENT ON POLICY projects_update_team_admin ON public.projects IS
  'v1058: project team members with access_level owner/admin/pm may UPDATE the project row (fixes Project Details Save PGRST116 when only user_projects grants management).';

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1058: projects_update_team_admin policy added';
  RAISE NOTICE '================================================';
END $$;
