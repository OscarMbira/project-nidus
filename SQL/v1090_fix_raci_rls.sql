-- =============================================================================
-- v1090: Fix RACI RLS (raci_matrices / raci_rows / raci_assignments)
-- Prerequisites: v644 (tables + broken parent policy), v963k (child policies)
--
-- Symptom: SEED334-PRJ-08 RACI rows exist in DB (verification query OK) but
-- /pm/resources/raci shows "No RACI matrices yet." for authenticated PMs.
--
-- Root cause (same class as v884 / v1059 / v1086):
--   Policies used user_projects.user_id = auth.uid(), but user_projects.user_id
--   is public.users.id — never matches. SELECT returns empty under RLS.
--
-- Fix: membership via get_user_id_from_auth(), project_memberships, named
-- owner/PM, account owner. Idempotent — safe to re-run.
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.raci_matrices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raci_rows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raci_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raci_matrices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raci_rows TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raci_assignments TO service_role;

ALTER TABLE public.raci_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raci_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raci_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_raci_matrices_project ON public.raci_matrices;
DROP POLICY IF EXISTS policy_raci_matrices ON public.raci_matrices;
DROP POLICY IF EXISTS policy_raci_rows ON public.raci_rows;
DROP POLICY IF EXISTS policy_raci_assignments ON public.raci_assignments;

-- Shared visibility: project member / named PM / owner / account owner
CREATE POLICY policy_raci_matrices ON public.raci_matrices
  FOR ALL TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND (
      EXISTS (
        SELECT 1 FROM public.user_projects up
        WHERE up.project_id = raci_matrices.project_id
          AND up.user_id = public.get_user_id_from_auth(auth.uid())
          AND COALESCE(up.is_deleted, FALSE) = FALSE
      )
      OR EXISTS (
        SELECT 1 FROM public.project_memberships pm
        WHERE pm.project_id = raci_matrices.project_id
          AND pm.user_id = public.get_user_id_from_auth(auth.uid())
          AND COALESCE(pm.is_active, TRUE) = TRUE
      )
      OR EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.accounts a ON a.id = p.account_id AND COALESCE(a.is_deleted, FALSE) = FALSE
        WHERE p.id = raci_matrices.project_id
          AND COALESCE(p.is_deleted, FALSE) = FALSE
          AND a.owner_user_id = public.get_user_id_from_auth(auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = raci_matrices.project_id
          AND COALESCE(p.is_deleted, FALSE) = FALSE
          AND (
            p.owner_user_id = public.get_user_id_from_auth(auth.uid())
            OR p.project_manager_user_id = public.get_user_id_from_auth(auth.uid())
          )
      )
      OR public.is_project_manager(auth.uid(), raci_matrices.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = raci_matrices.project_id
        AND up.user_id = public.get_user_id_from_auth(auth.uid())
        AND COALESCE(up.is_deleted, FALSE) = FALSE
    )
    OR EXISTS (
      SELECT 1 FROM public.project_memberships pm
      WHERE pm.project_id = raci_matrices.project_id
        AND pm.user_id = public.get_user_id_from_auth(auth.uid())
        AND COALESCE(pm.is_active, TRUE) = TRUE
    )
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = raci_matrices.project_id
        AND COALESCE(p.is_deleted, FALSE) = FALSE
        AND (
          p.owner_user_id = public.get_user_id_from_auth(auth.uid())
          OR p.project_manager_user_id = public.get_user_id_from_auth(auth.uid())
        )
    )
    OR public.is_project_manager(auth.uid(), raci_matrices.project_id)
  );

CREATE POLICY policy_raci_rows ON public.raci_rows
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.raci_matrices m
      WHERE m.id = raci_rows.matrix_id
        AND COALESCE(m.is_deleted, FALSE) = FALSE
        AND (
          EXISTS (
            SELECT 1 FROM public.user_projects up
            WHERE up.project_id = m.project_id
              AND up.user_id = public.get_user_id_from_auth(auth.uid())
              AND COALESCE(up.is_deleted, FALSE) = FALSE
          )
          OR EXISTS (
            SELECT 1 FROM public.project_memberships pm
            WHERE pm.project_id = m.project_id
              AND pm.user_id = public.get_user_id_from_auth(auth.uid())
              AND COALESCE(pm.is_active, TRUE) = TRUE
          )
          OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = m.project_id
              AND COALESCE(p.is_deleted, FALSE) = FALSE
              AND (
                p.owner_user_id = public.get_user_id_from_auth(auth.uid())
                OR p.project_manager_user_id = public.get_user_id_from_auth(auth.uid())
              )
          )
          OR public.is_project_manager(auth.uid(), m.project_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.raci_matrices m
      WHERE m.id = raci_rows.matrix_id
        AND (
          EXISTS (
            SELECT 1 FROM public.user_projects up
            WHERE up.project_id = m.project_id
              AND up.user_id = public.get_user_id_from_auth(auth.uid())
              AND COALESCE(up.is_deleted, FALSE) = FALSE
          )
          OR EXISTS (
            SELECT 1 FROM public.project_memberships pm
            WHERE pm.project_id = m.project_id
              AND pm.user_id = public.get_user_id_from_auth(auth.uid())
              AND COALESCE(pm.is_active, TRUE) = TRUE
          )
          OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = m.project_id
              AND COALESCE(p.is_deleted, FALSE) = FALSE
              AND (
                p.owner_user_id = public.get_user_id_from_auth(auth.uid())
                OR p.project_manager_user_id = public.get_user_id_from_auth(auth.uid())
              )
          )
          OR public.is_project_manager(auth.uid(), m.project_id)
        )
    )
  );

CREATE POLICY policy_raci_assignments ON public.raci_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.raci_rows r
      JOIN public.raci_matrices m ON m.id = r.matrix_id
      WHERE r.id = raci_assignments.row_id
        AND COALESCE(m.is_deleted, FALSE) = FALSE
        AND (
          EXISTS (
            SELECT 1 FROM public.user_projects up
            WHERE up.project_id = m.project_id
              AND up.user_id = public.get_user_id_from_auth(auth.uid())
              AND COALESCE(up.is_deleted, FALSE) = FALSE
          )
          OR EXISTS (
            SELECT 1 FROM public.project_memberships pm
            WHERE pm.project_id = m.project_id
              AND pm.user_id = public.get_user_id_from_auth(auth.uid())
              AND COALESCE(pm.is_active, TRUE) = TRUE
          )
          OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = m.project_id
              AND COALESCE(p.is_deleted, FALSE) = FALSE
              AND (
                p.owner_user_id = public.get_user_id_from_auth(auth.uid())
                OR p.project_manager_user_id = public.get_user_id_from_auth(auth.uid())
              )
          )
          OR public.is_project_manager(auth.uid(), m.project_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.raci_rows r
      JOIN public.raci_matrices m ON m.id = r.matrix_id
      WHERE r.id = raci_assignments.row_id
        AND (
          EXISTS (
            SELECT 1 FROM public.user_projects up
            WHERE up.project_id = m.project_id
              AND up.user_id = public.get_user_id_from_auth(auth.uid())
              AND COALESCE(up.is_deleted, FALSE) = FALSE
          )
          OR EXISTS (
            SELECT 1 FROM public.project_memberships pm
            WHERE pm.project_id = m.project_id
              AND pm.user_id = public.get_user_id_from_auth(auth.uid())
              AND COALESCE(pm.is_active, TRUE) = TRUE
          )
          OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = m.project_id
              AND COALESCE(p.is_deleted, FALSE) = FALSE
              AND (
                p.owner_user_id = public.get_user_id_from_auth(auth.uid())
                OR p.project_manager_user_id = public.get_user_id_from_auth(auth.uid())
              )
          )
          OR public.is_project_manager(auth.uid(), m.project_id)
        )
    )
  );

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1090: raci_matrices/rows/assignments RLS fixed (user_id mapping)';
  RAISE NOTICE '================================================';
END $$;
