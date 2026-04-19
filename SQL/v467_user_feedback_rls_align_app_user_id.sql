-- v467: Align user_feedback RLS with public.users(id) vs auth.uid()
-- Date: 2026-04-19
-- Problem: user_feedback.user_id REFERENCES public.users(id). App users use users.id
--   (PK) linked via users.auth_user_id = auth.uid(). Old policies used auth.uid() = user_id,
--   which never matches real rows. Inserts failed or behaved inconsistently.
-- Fix: Policies compare against the app user row for the current auth session.

DROP POLICY IF EXISTS user_feedback_select ON public.user_feedback;
DROP POLICY IF EXISTS user_feedback_insert ON public.user_feedback;
DROP POLICY IF EXISTS user_feedback_update ON public.user_feedback;

CREATE POLICY user_feedback_select ON public.user_feedback
  FOR SELECT
  USING (
    user_id IN (
      SELECT u.id FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND COALESCE(u.is_deleted, FALSE) = FALSE
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id IN (
        SELECT u.id FROM public.users u
        WHERE u.auth_user_id = auth.uid()
          AND COALESCE(u.is_deleted, FALSE) = FALSE
      )
        AND r.role_name = 'system_admin'
        AND COALESCE(ur.is_active, TRUE) = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
    )
  );

CREATE POLICY user_feedback_insert ON public.user_feedback
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT u.id FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND COALESCE(u.is_deleted, FALSE) = FALSE
    )
    OR user_id IS NULL
  );

CREATE POLICY user_feedback_update ON public.user_feedback
  FOR UPDATE
  USING (
    (
      user_id IN (
        SELECT u.id FROM public.users u
        WHERE u.auth_user_id = auth.uid()
          AND COALESCE(u.is_deleted, FALSE) = FALSE
      )
      AND status = 'new'
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id IN (
        SELECT u.id FROM public.users u
        WHERE u.auth_user_id = auth.uid()
          AND COALESCE(u.is_deleted, FALSE) = FALSE
      )
        AND r.role_name = 'system_admin'
        AND COALESCE(ur.is_active, TRUE) = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
    )
  );

COMMENT ON TABLE public.user_feedback IS 'General user feedback; user_id is public.users.id (app profile), not auth uid.';
