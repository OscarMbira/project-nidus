-- v1066: Fix RLS recursion/slowness in public.user_has_access_to_account()
--
-- Symptom: uploading a profile picture (v894, private 'user-avatars' storage
-- bucket) times out client-side (withTimeout at 20s) and the network panel
-- shows the underlying storage upload request returning HTTP 544 (Cloudflare
-- gateway timeout) instead of completing quickly.
--
-- Root cause: storage.objects' "Avatar: owner can write their own" policy
-- (v894) calls public.user_has_access_to_account(account_id) in its WITH
-- CHECK clause. That function (last redefined in v737) is SECURITY DEFINER
-- but never disabled row_security, so its five internal EXISTS subqueries
-- against public.accounts / public.organisation_invitations / public.projects
-- / public.user_roles / public.project_memberships / public.user_projects are
-- themselves subject to RLS re-evaluation under the calling (authenticated)
-- role — the same chronic "nested RLS" bug class already fixed for
-- change_requests / project_milestones / organisation_branding (v1016) and
-- 16+ earlier migrations (see auth_user_can_access_project, v841/v406).
--
-- Fix: same body as v737, plus SET row_security = off (matching the proven
-- auth_user_can_access_project() / auth_user_can_access_account() pattern).
-- No permission/behaviour change — only removes the nested-RLS re-evaluation
-- that was causing the pathological slowness.

CREATE OR REPLACE FUNCTION public.user_has_access_to_account(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
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
          FROM public.organisation_invitations oi
          WHERE oi.organisation_id = p_account_id
            AND oi.invitation_status = 'accepted'
            AND COALESCE(oi.is_deleted, FALSE) = FALSE
            AND (
              oi.accepted_by_user_id = v_uid
              OR oi.invited_user_id = v_uid
            )
        )
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
  'v1066: TRUE if current user owns the account, accepted an organisation invitation to it, or is linked via project membership. SET row_security = off added to stop nested reads (accounts/organisation_invitations/projects/user_roles/project_memberships/user_projects) from re-triggering RLS and hanging — same fix pattern as v1016''s auth_user_can_access_account().';

DO $$
BEGIN
  RAISE NOTICE 'v1066_fix_user_has_access_to_account_rls_recursion.sql applied — row_security disabled inside user_has_access_to_account()';
END $$;
