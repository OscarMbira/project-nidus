-- =============================================================================
-- v855: Fix can_create_local_form / auth_user_has_project_manager_role matching
--
-- Symptom (v852 local forms): INSERT into pm_template_nodes fails with
--   "new row violates row-level security policy for table pm_template_nodes"
-- when a Project Manager clicks Create Blank Form.
--
-- Cause: v853 compared project_roles.role_name = 'Project Manager', but the
--   canonical seed (v91) stores role_name = 'project_manager' (display name
--   "Project Manager"). Demo grants (v825) also put PMs on user_projects with
--   project_role = 'Project Manager', which v853 never checked.
--
-- Fix: normalize role names; accept project_memberships + user_projects +
--   named project_manager_user_id. Re-apply safe (CREATE OR REPLACE).
-- Apply after: v853, v853b.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auth_user_has_project_manager_role(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p_project_id IS NOT NULL
    AND (
      -- project_memberships ⋈ project_roles (role_name or display name)
      EXISTS (
        SELECT 1
        FROM public.project_memberships pm
        INNER JOIN public.users u ON u.id = pm.user_id
        INNER JOIN public.project_roles pr ON pr.id = pm.project_role_id
        WHERE pm.project_id = p_project_id
          AND u.auth_user_id = auth.uid()
          AND COALESCE(pm.is_active, TRUE) = TRUE
          AND COALESCE(pr.is_active, TRUE) = TRUE
          AND lower(replace(trim(pr.role_name), ' ', '_')) = 'project_manager'
      )
      -- user_projects.project_role text (v825 and older paths)
      OR EXISTS (
        SELECT 1
        FROM public.user_projects up
        INNER JOIN public.users u ON u.id = up.user_id
        WHERE up.project_id = p_project_id
          AND u.auth_user_id = auth.uid()
          AND COALESCE(up.is_deleted, FALSE) = FALSE
          AND COALESCE(up.is_active, TRUE) = TRUE
          AND lower(replace(trim(up.project_role), ' ', '_')) = 'project_manager'
      )
      -- Named column on projects
      OR EXISTS (
        SELECT 1
        FROM public.projects proj
        INNER JOIN public.users u ON u.id = proj.project_manager_user_id
        WHERE proj.id = p_project_id
          AND COALESCE(proj.is_deleted, FALSE) = FALSE
          AND u.auth_user_id = auth.uid()
      )
      -- Suite role project_manager scoped to this project via user_roles.project_id
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        INNER JOIN public.roles r ON r.id = ur.role_id
        INNER JOIN public.users u ON u.id = ur.user_id
        WHERE ur.project_id = p_project_id
          AND u.auth_user_id = auth.uid()
          AND COALESCE(ur.is_active, TRUE) = TRUE
          AND COALESCE(ur.is_deleted, FALSE) = FALSE
          AND lower(replace(trim(r.role_name), ' ', '_')) = 'project_manager'
      )
    );
$$;

COMMENT ON FUNCTION public.auth_user_has_project_manager_role(UUID) IS
  'TRUE if the user is Project Manager on the project via memberships (project_manager), user_projects, named PM column, or project-scoped suite role (v855).';

-- Keep can_create_local_form body; it already calls the helper above.
-- Re-assert grants after replace.
GRANT EXECUTE ON FUNCTION public.auth_user_has_project_manager_role(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION sim.auth_user_has_project_manager_role(p_practice_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
  SELECT
    p_practice_project_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM sim.practice_project_memberships m
        WHERE m.practice_project_id = p_practice_project_id
          AND COALESCE(m.is_active, TRUE) = TRUE
          AND (
            m.user_id = auth.uid()
            OR m.user_id = sim.get_current_user_id()
          )
          AND lower(replace(trim(m.role_name), ' ', '_')) = 'project_manager'
      )
      OR EXISTS (
        SELECT 1
        FROM sim.practice_projects pp
        LEFT JOIN public.users mgr ON mgr.id = pp.project_manager_user_id
        WHERE pp.id = p_practice_project_id
          AND COALESCE(pp.is_deleted, FALSE) = FALSE
          AND (
            pp.user_id = auth.uid()
            OR pp.user_id = sim.get_current_user_id()
            OR mgr.auth_user_id = auth.uid()
          )
      )
    );
$$;

COMMENT ON FUNCTION sim.auth_user_has_project_manager_role(UUID) IS
  'Simulator: practice-project manager via membership role_name or owner/manager columns (v855).';

GRANT EXECUTE ON FUNCTION sim.auth_user_has_project_manager_role(UUID) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'v855_local_form_pm_role_match_fix.sql applied';
END $$;
