-- ============================================================================
-- v403: EEF/OPA RLS — align account access + project read with real membership
-- Prerequisites: v400 (user_has_access_to_account), v104 (projects RLS), project_memberships, user_projects
-- Problem: user_has_access_to_account only checked user_roles; many users exist
--          only in project_memberships / user_projects → 403 on EEF/OPA/categories.
--          projects SELECT (v104) omitted members → 403 on project embed + dropdowns.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Extend org access helper (used by EEF/OPA RLS on public + sim)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_access_to_account(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM public.users WHERE auth_user_id = auth.uid();
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.accounts a
    WHERE a.id = p_account_id
      AND COALESCE(a.is_deleted, FALSE) = FALSE
      AND (
        a.owner_user_id = v_uid
        OR EXISTS (
          SELECT 1
          FROM public.projects p
          INNER JOIN public.user_roles ur ON ur.project_id = p.id
          WHERE p.account_id = p_account_id
            AND COALESCE(p.is_deleted, FALSE) = FALSE
            AND ur.user_id = v_uid
            AND ur.is_active = TRUE
            AND COALESCE(ur.is_deleted, FALSE) = FALSE
        )
        OR EXISTS (
          SELECT 1
          FROM public.projects p
          INNER JOIN public.project_memberships pm ON pm.project_id = p.id
          WHERE p.account_id = p_account_id
            AND COALESCE(p.is_deleted, FALSE) = FALSE
            AND pm.user_id = v_uid
            AND COALESCE(pm.is_active, TRUE) = TRUE
            AND pm.invitation_status = 'accepted'
        )
        OR EXISTS (
          SELECT 1
          FROM public.projects p
          INNER JOIN public.user_projects up ON up.project_id = p.id
          WHERE p.account_id = p_account_id
            AND COALESCE(p.is_deleted, FALSE) = FALSE
            AND up.user_id = v_uid
            AND COALESCE(up.is_deleted, FALSE) = FALSE
            AND COALESCE(up.is_active, TRUE) = TRUE
        )
      )
  );
END;
$$;

COMMENT ON FUNCTION public.user_has_access_to_account(UUID) IS
  'TRUE if current user owns the account or is linked to any non-deleted project under the account via user_roles, project_memberships (accepted), or user_projects.';

-- ---------------------------------------------------------------------------
-- 2) Allow project SELECT for members (v104 only had owner / PM / account owner)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS projects_select_project_member ON public.projects;
CREATE POLICY projects_select_project_member
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND (
      EXISTS (
        SELECT 1
        FROM public.project_memberships pm
        INNER JOIN public.users u ON u.id = pm.user_id
        WHERE pm.project_id = projects.id
          AND u.auth_user_id = auth.uid()
          AND COALESCE(pm.is_active, TRUE) = TRUE
          AND pm.invitation_status = 'accepted'
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_projects up
        INNER JOIN public.users u ON u.id = up.user_id
        WHERE up.project_id = projects.id
          AND u.auth_user_id = auth.uid()
          AND COALESCE(up.is_deleted, FALSE) = FALSE
          AND COALESCE(up.is_active, TRUE) = TRUE
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        INNER JOIN public.users u ON u.id = ur.user_id
        WHERE ur.project_id = projects.id
          AND u.auth_user_id = auth.uid()
          AND ur.is_active = TRUE
          AND COALESCE(ur.is_deleted, FALSE) = FALSE
      )
    )
  );

COMMENT ON POLICY projects_select_project_member ON public.projects IS
  'v403: Project team can read project row (membership / user_projects / user_roles).';
