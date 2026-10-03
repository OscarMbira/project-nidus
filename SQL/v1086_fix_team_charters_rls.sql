-- =============================================================================
-- v1086: Fix team_charters RLS (membership + PM write access)
-- Prerequisites: v628c (table + original RLS)
--
-- Symptom: Create Team Charter fails with
--   "new row violates row-level security policy for table 'team_charters'"
-- and SELECT can 403 / return empty for valid project members.
--
-- Root cause (same class as v884 / v1059):
--   1) Policies compared user_projects.user_id = auth.uid(), but
--      user_projects.user_id is public.users.id — never matches.
--   2) INSERT/UPDATE also required a global user_roles row with
--      role_name IN ('project_manager','team_lead','team_manager'). Real PMs
--      are usually project_role = 'Project Manager' / is_project_manager() /
--      projects.project_manager_user_id — so WITH CHECK always failed.
--
-- SELECT: any project member (user_projects / project_memberships), named
--         owner/PM, or account owner — same family as project_decisions (v884).
-- INSERT/UPDATE: PM / Team Lead / Team Manager (project membership role,
--         is_project_manager, named PM, or matching user_roles).
-- Soft-delete stays UPDATE (is_deleted); FOR DELETE kept for hard deletes.
-- Idempotent — safe to re-run.
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_charters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_charters TO service_role;

ALTER TABLE public.team_charters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_charters_select" ON public.team_charters;
DROP POLICY IF EXISTS "team_charters_insert" ON public.team_charters;
DROP POLICY IF EXISTS "team_charters_update" ON public.team_charters;
DROP POLICY IF EXISTS "team_charters_delete" ON public.team_charters;

-- Any project member / owner / named PM can view
CREATE POLICY "team_charters_select" ON public.team_charters
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_deleted, false) = false
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_projects up
        WHERE up.project_id = team_charters.project_id
          AND up.user_id = public.get_user_id_from_auth(auth.uid())
          AND COALESCE(up.is_deleted, FALSE) = FALSE
      )
      OR EXISTS (
        SELECT 1
        FROM public.project_memberships pm
        WHERE pm.project_id = team_charters.project_id
          AND pm.user_id = public.get_user_id_from_auth(auth.uid())
          AND COALESCE(pm.is_active, TRUE) = TRUE
      )
      OR EXISTS (
        SELECT 1
        FROM public.projects p
        JOIN public.accounts a ON a.id = p.account_id AND COALESCE(a.is_deleted, FALSE) = FALSE
        WHERE p.id = team_charters.project_id
          AND COALESCE(p.is_deleted, FALSE) = FALSE
          AND a.owner_user_id = public.get_user_id_from_auth(auth.uid())
      )
      OR EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = team_charters.project_id
          AND COALESCE(p.is_deleted, FALSE) = FALSE
          AND (
            p.owner_user_id = public.get_user_id_from_auth(auth.uid())
            OR p.project_manager_user_id = public.get_user_id_from_auth(auth.uid())
          )
      )
    )
  );

-- Helper predicate: caller may write the charter for this project
-- (inlined in INSERT/UPDATE/DELETE — no SECURITY DEFINER helper needed)

CREATE POLICY "team_charters_insert" ON public.team_charters
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_project_manager(auth.uid(), team_charters.project_id)
    OR EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = team_charters.project_id
        AND COALESCE(p.is_deleted, FALSE) = FALSE
        AND (
          p.project_manager_user_id = public.get_user_id_from_auth(auth.uid())
          OR p.owner_user_id = public.get_user_id_from_auth(auth.uid())
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_projects up
      WHERE up.project_id = team_charters.project_id
        AND up.user_id = public.get_user_id_from_auth(auth.uid())
        AND COALESCE(up.is_deleted, FALSE) = FALSE
        AND COALESCE(up.is_active, TRUE) = TRUE
        AND (
          up.access_level IN ('owner', 'admin')
          OR lower(replace(trim(coalesce(up.project_role, '')), '_', ' ')) IN (
            'project manager', 'programme manager', 'team lead', 'team manager'
          )
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = public.get_user_id_from_auth(auth.uid())
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
        AND (
          ur.project_id IS NULL
          OR ur.project_id = team_charters.project_id
        )
        AND lower(trim(coalesce(r.role_name, ''))) IN (
          'project_manager', 'programme_manager', 'pm_project_manager',
          'team_lead', 'pm_team_lead', 'team_manager', 'pm_team_manager'
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.project_id = team_charters.project_id
        AND t.team_lead_user_id = public.get_user_id_from_auth(auth.uid())
        AND COALESCE(t.is_deleted, FALSE) = FALSE
    )
  );

CREATE POLICY "team_charters_update" ON public.team_charters
  FOR UPDATE TO authenticated
  USING (
    public.is_project_manager(auth.uid(), team_charters.project_id)
    OR EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = team_charters.project_id
        AND COALESCE(p.is_deleted, FALSE) = FALSE
        AND (
          p.project_manager_user_id = public.get_user_id_from_auth(auth.uid())
          OR p.owner_user_id = public.get_user_id_from_auth(auth.uid())
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_projects up
      WHERE up.project_id = team_charters.project_id
        AND up.user_id = public.get_user_id_from_auth(auth.uid())
        AND COALESCE(up.is_deleted, FALSE) = FALSE
        AND COALESCE(up.is_active, TRUE) = TRUE
        AND (
          up.access_level IN ('owner', 'admin')
          OR lower(replace(trim(coalesce(up.project_role, '')), '_', ' ')) IN (
            'project manager', 'programme manager', 'team lead', 'team manager'
          )
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = public.get_user_id_from_auth(auth.uid())
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
        AND (
          ur.project_id IS NULL
          OR ur.project_id = team_charters.project_id
        )
        AND lower(trim(coalesce(r.role_name, ''))) IN (
          'project_manager', 'programme_manager', 'pm_project_manager',
          'team_lead', 'pm_team_lead', 'team_manager', 'pm_team_manager'
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.project_id = team_charters.project_id
        AND t.team_lead_user_id = public.get_user_id_from_auth(auth.uid())
        AND COALESCE(t.is_deleted, FALSE) = FALSE
    )
  )
  WITH CHECK (
    public.is_project_manager(auth.uid(), team_charters.project_id)
    OR EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = team_charters.project_id
        AND COALESCE(p.is_deleted, FALSE) = FALSE
        AND (
          p.project_manager_user_id = public.get_user_id_from_auth(auth.uid())
          OR p.owner_user_id = public.get_user_id_from_auth(auth.uid())
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_projects up
      WHERE up.project_id = team_charters.project_id
        AND up.user_id = public.get_user_id_from_auth(auth.uid())
        AND COALESCE(up.is_deleted, FALSE) = FALSE
        AND COALESCE(up.is_active, TRUE) = TRUE
        AND (
          up.access_level IN ('owner', 'admin')
          OR lower(replace(trim(coalesce(up.project_role, '')), '_', ' ')) IN (
            'project manager', 'programme manager', 'team lead', 'team manager'
          )
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = public.get_user_id_from_auth(auth.uid())
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
        AND (
          ur.project_id IS NULL
          OR ur.project_id = team_charters.project_id
        )
        AND lower(trim(coalesce(r.role_name, ''))) IN (
          'project_manager', 'programme_manager', 'pm_project_manager',
          'team_lead', 'pm_team_lead', 'team_manager', 'pm_team_manager'
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.project_id = team_charters.project_id
        AND t.team_lead_user_id = public.get_user_id_from_auth(auth.uid())
        AND COALESCE(t.is_deleted, FALSE) = FALSE
    )
  );

-- Hard delete: named PM / project owner only (soft-delete uses UPDATE)
CREATE POLICY "team_charters_delete" ON public.team_charters
  FOR DELETE TO authenticated
  USING (
    public.is_project_manager(auth.uid(), team_charters.project_id)
    OR EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = team_charters.project_id
        AND COALESCE(p.is_deleted, FALSE) = FALSE
        AND (
          p.project_manager_user_id = public.get_user_id_from_auth(auth.uid())
          OR p.owner_user_id = public.get_user_id_from_auth(auth.uid())
        )
    )
  );

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1086: team_charters RLS fixed (user_id + PM write paths)';
  RAISE NOTICE '================================================';
END $$;
