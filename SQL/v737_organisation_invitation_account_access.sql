-- v737: Organisation invitation members — account access for invited PMO admins
-- Run after v736_accept_organisation_invitation.sql

-- ---------------------------------------------------------------------------
-- user_has_access_to_account — include accepted organisation_invitations
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
  'TRUE if current user owns the account, accepted an organisation invitation to it, or is linked via project membership.';

-- ---------------------------------------------------------------------------
-- get_user_accounts — include accounts from accepted organisation invitations
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_accounts(p_auth_user_id UUID)
RETURNS TABLE (
    account_id UUID,
    account_code VARCHAR,
    account_name VARCHAR,
    is_owner BOOLEAN,
    project_count BIGINT,
    total_members BIGINT,
    subscription_status VARCHAR,
    created_at TIMESTAMP
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id
    FROM users
    WHERE auth_user_id = p_auth_user_id;

    RETURN QUERY
    SELECT
        a.id as account_id,
        a.account_code,
        a.account_name,
        TRUE as is_owner,
        (SELECT COUNT(*) FROM projects p_count WHERE p_count.account_id = a.id AND p_count.is_deleted = FALSE) as project_count,
        (
            SELECT COUNT(DISTINCT ur.user_id)
            FROM projects p
            INNER JOIN user_roles ur ON ur.project_id = p.id
            WHERE p.account_id = a.id
            AND p.is_deleted = FALSE
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
        ) as total_members,
        (
            SELECT ps.status
            FROM platform_subscriptions ps
            WHERE ps.account_id = a.id
            ORDER BY ps.created_at DESC
            LIMIT 1
        ) as subscription_status,
        a.created_at
    FROM accounts a
    WHERE a.owner_user_id = v_user_id
    AND a.is_deleted = FALSE

    UNION

    SELECT DISTINCT
        a.id as account_id,
        a.account_code,
        a.account_name,
        FALSE as is_owner,
        (SELECT COUNT(*) FROM projects p_count2 WHERE p_count2.account_id = a.id AND p_count2.is_deleted = FALSE) as project_count,
        (
            SELECT COUNT(DISTINCT ur2.user_id)
            FROM projects p2
            INNER JOIN user_roles ur2 ON ur2.project_id = p2.id
            WHERE p2.account_id = a.id
            AND p2.is_deleted = FALSE
            AND ur2.is_active = TRUE
            AND ur2.is_deleted = FALSE
        ) as total_members,
        (
            SELECT ps2.status
            FROM platform_subscriptions ps2
            WHERE ps2.account_id = a.id
            ORDER BY ps2.created_at DESC
            LIMIT 1
        ) as subscription_status,
        a.created_at
    FROM accounts a
    INNER JOIN organisation_invitations oi ON oi.organisation_id = a.id
    WHERE oi.invitation_status = 'accepted'
      AND COALESCE(oi.is_deleted, FALSE) = FALSE
      AND (oi.accepted_by_user_id = v_user_id OR oi.invited_user_id = v_user_id)
      AND a.owner_user_id IS DISTINCT FROM v_user_id
      AND a.is_deleted = FALSE

    UNION

    SELECT DISTINCT
        a.id as account_id,
        a.account_code,
        a.account_name,
        FALSE as is_owner,
        (SELECT COUNT(*) FROM projects p_count2 WHERE p_count2.account_id = a.id AND p_count2.is_deleted = FALSE) as project_count,
        (
            SELECT COUNT(DISTINCT ur2.user_id)
            FROM projects p2
            INNER JOIN user_roles ur2 ON ur2.project_id = p2.id
            WHERE p2.account_id = a.id
            AND p2.is_deleted = FALSE
            AND ur2.is_active = TRUE
            AND ur2.is_deleted = FALSE
        ) as total_members,
        (
            SELECT ps2.status
            FROM platform_subscriptions ps2
            WHERE ps2.account_id = a.id
            ORDER BY ps2.created_at DESC
            LIMIT 1
        ) as subscription_status,
        a.created_at
    FROM accounts a
    INNER JOIN projects p ON p.account_id = a.id
    INNER JOIN user_roles ur ON ur.project_id = p.id
    WHERE ur.user_id = v_user_id
    AND a.owner_user_id != v_user_id
    AND ur.is_active = TRUE
    AND ur.is_deleted = FALSE
    AND p.is_deleted = FALSE
    AND a.is_deleted = FALSE

    ORDER BY is_owner DESC, created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_user_accounts(UUID) IS
  'Returns accounts user owns, joined via accepted organisation invitation, or project membership.';

GRANT EXECUTE ON FUNCTION public.get_user_accounts(UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'v737_organisation_invitation_account_access.sql applied';
END $$;
