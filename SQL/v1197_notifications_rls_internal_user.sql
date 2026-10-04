-- ============================================================================
-- v1197: Notifications RLS uses a SECURITY DEFINER helper for the internal user id
-- ============================================================================
-- notifications.user_id holds public.users.id, but the own-row policies compare it through a
-- subquery on public.users. Under the authenticated role that subquery can return nothing,
-- so an UPDATE (mark as read) matches zero rows and fails silently. The helper runs with
-- row_security off, the same pattern used for other project-scoped policies (v1016/v1086).
-- Run after v137. Safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auth_internal_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET row_security = off
AS $$
    SELECT u.id
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND COALESCE(u.is_deleted, FALSE) = FALSE
    LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.auth_internal_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_internal_user_id() TO authenticated;

DROP POLICY IF EXISTS policy_notifications_own_select ON public.notifications;
CREATE POLICY policy_notifications_own_select
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (user_id = public.auth_internal_user_id());

DROP POLICY IF EXISTS policy_notifications_own_update ON public.notifications;
CREATE POLICY policy_notifications_own_update
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (user_id = public.auth_internal_user_id())
    WITH CHECK (user_id = public.auth_internal_user_id());

NOTIFY pgrst, 'reload schema';
