-- =============================================================================
-- v884: Fix project_decisions RLS + verify Decision Log seed visibility
-- Prerequisites: v628d (table + broken RLS), v882 (SEED334 decision seed)
--
-- Why Decision Log still looked empty after v882:
--   1) Page Project bar (?projectId=) can differ from the header project
--      (e.g. SEED334-PRJ-27 selected while header shows SEED334-PRJ-08).
--   2) v628d SELECT policy used user_projects.user_id = auth.uid() — but
--      user_projects.user_id is public.users.id, so authenticated users often
--      see ZERO rows even when seeds exist.
--
-- This migration replaces RLS with the membership pattern used by change_log
-- (v483 / v835): users ↔ auth.uid(), user_projects, project_memberships,
-- account owner, project manager.
-- Idempotent — safe to re-run.
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_decisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_decisions TO service_role;

ALTER TABLE public.project_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_decisions_select" ON public.project_decisions;
DROP POLICY IF EXISTS "project_decisions_insert" ON public.project_decisions;
DROP POLICY IF EXISTS "project_decisions_update" ON public.project_decisions;
DROP POLICY IF EXISTS "project_decisions_delete" ON public.project_decisions;

CREATE POLICY "project_decisions_select" ON public.project_decisions
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_deleted, false) = false
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        JOIN public.users u ON ur.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND r.role_name IN ('pmo_admin', 'System Admin', 'PMO Admin', 'admin')
          AND ur.is_active = TRUE
          AND COALESCE(ur.is_deleted, FALSE) = FALSE
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_projects up
        JOIN public.users u ON up.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND up.project_id = project_decisions.project_id
          AND COALESCE(up.is_deleted, FALSE) = FALSE
      )
      OR EXISTS (
        SELECT 1
        FROM public.project_memberships pm
        JOIN public.users u ON pm.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND pm.project_id = project_decisions.project_id
          AND COALESCE(pm.is_active, TRUE) = TRUE
      )
      OR EXISTS (
        SELECT 1
        FROM public.projects p
        JOIN public.accounts a ON a.id = p.account_id AND COALESCE(a.is_deleted, FALSE) = FALSE
        WHERE p.id = project_decisions.project_id
          AND COALESCE(p.is_deleted, FALSE) = FALSE
          AND a.owner_user_id = public.get_user_id_from_auth(auth.uid())
      )
      OR EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = project_decisions.project_id
          AND COALESCE(p.is_deleted, FALSE) = FALSE
          AND (
            p.owner_user_id = public.get_user_id_from_auth(auth.uid())
            OR p.project_manager_user_id = public.get_user_id_from_auth(auth.uid())
          )
      )
    )
  );

CREATE POLICY "project_decisions_insert" ON public.project_decisions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_projects up
      JOIN public.users u ON up.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND up.project_id = project_decisions.project_id
        AND COALESCE(up.is_deleted, FALSE) = FALSE
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_memberships pm
      JOIN public.users u ON pm.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND pm.project_id = project_decisions.project_id
        AND COALESCE(pm.is_active, TRUE) = TRUE
    )
    OR EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_decisions.project_id
        AND COALESCE(p.is_deleted, FALSE) = FALSE
        AND (
          p.owner_user_id = public.get_user_id_from_auth(auth.uid())
          OR p.project_manager_user_id = public.get_user_id_from_auth(auth.uid())
        )
    )
  );

CREATE POLICY "project_decisions_update" ON public.project_decisions
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.project_memberships pm
      JOIN public.users u ON pm.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND pm.project_id = project_decisions.project_id
        AND COALESCE(pm.is_active, TRUE) = TRUE
    )
    OR EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_decisions.project_id
        AND COALESCE(p.is_deleted, FALSE) = FALSE
        AND (
          p.owner_user_id = public.get_user_id_from_auth(auth.uid())
          OR p.project_manager_user_id = public.get_user_id_from_auth(auth.uid())
        )
    )
  );

CREATE POLICY "project_decisions_delete" ON public.project_decisions
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_decisions.project_id
        AND COALESCE(p.is_deleted, FALSE) = FALSE
        AND (
          p.owner_user_id = public.get_user_id_from_auth(auth.uid())
          OR p.project_manager_user_id = public.get_user_id_from_auth(auth.uid())
        )
    )
  );

DO $$
DECLARE
  v_total INTEGER;
  v_p08   INTEGER;
  v_p27   INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM public.project_decisions
  WHERE COALESCE(is_deleted, false) = false;

  SELECT COUNT(*) INTO v_p08
  FROM public.project_decisions d
  JOIN public.projects p ON p.id = d.project_id
  WHERE p.project_code = 'SEED334-PRJ-08'
    AND COALESCE(d.is_deleted, false) = false;

  SELECT COUNT(*) INTO v_p27
  FROM public.project_decisions d
  JOIN public.projects p ON p.id = d.project_id
  WHERE p.project_code = 'SEED334-PRJ-27'
    AND COALESCE(d.is_deleted, false) = false;

  RAISE NOTICE 'v884: project_decisions visible in DB — total=% SEED334-PRJ-08=% SEED334-PRJ-27=%',
    v_total, v_p08, v_p27;

  IF v_total = 0 THEN
    RAISE NOTICE 'v884: no decision rows found — re-run SQL/v882_seed_decision_log_seed334.sql after this RLS fix.';
  END IF;
END $$;
