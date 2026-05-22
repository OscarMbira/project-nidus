-- =============================================================================
-- v592_get_sent_invitations_rpc.sql
-- RPC: list invitations sent by current user (PM) or org-wide (PMO)
-- Prerequisites: v591, is_user_pmo_admin, user_has_access_to_account
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_sent_invitations_by_user(
  p_scope text DEFAULT 'pm',
  p_status text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_auth uuid := auth.uid();
  v_user_id uuid;
  v_result jsonb;
BEGIN
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT u.id INTO v_user_id
  FROM users u
  WHERE u.auth_user_id = v_auth
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User record not found' USING ERRCODE = '28000';
  END IF;

  IF lower(trim(COALESCE(p_scope, 'pm'))) NOT IN ('pm', 'pmo') THEN
    RAISE EXCEPTION 'Invalid scope' USING ERRCODE = '22023';
  END IF;

  IF lower(trim(p_scope)) = 'pmo' AND NOT public.is_user_pmo_admin(v_auth) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(
    jsonb_agg(row_data ORDER BY sent_at DESC),
    '[]'::jsonb
  )
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', pi.id,
      'entity_type', pi.entity_type,
      'project_id', pi.project_id,
      'portfolio_id', pi.portfolio_id,
      'programme_id', pi.programme_id,
      'entity_name', CASE pi.entity_type
        WHEN 'project' THEN (SELECT pr.project_name FROM projects pr WHERE pr.id = pi.project_id)
        WHEN 'portfolio' THEN (SELECT pf.portfolio_name FROM portfolios pf WHERE pf.id = pi.portfolio_id)
        WHEN 'programme' THEN (SELECT pg.programme_name FROM programmes pg WHERE pg.id = pi.programme_id)
        ELSE NULL
      END,
      'invited_email', pi.invited_email,
      'invited_first_name', pi.invited_first_name,
      'invited_last_name', pi.invited_last_name,
      'invitation_status', pi.invitation_status,
      'invitation_sent_at', pi.invitation_sent_at,
      'invitation_expires_at', pi.invitation_expires_at,
      'invitation_message', pi.invitation_message,
      'invited_by_user_id', pi.invited_by_user_id,
      'inviter_display_name', COALESCE(ub.full_name, ub.email),
      'role_display_name', COALESCE(ro.role_display_name, ro.role_name),
      'role_name', ro.role_name,
      'sent_at', pi.invitation_sent_at
    ) AS row_data,
    pi.invitation_sent_at AS sent_at
    FROM project_invitations pi
    LEFT JOIN users ub ON ub.id = pi.invited_by_user_id
    LEFT JOIN roles ro ON ro.id = pi.role_id
    WHERE COALESCE(pi.is_deleted, FALSE) = FALSE
      AND (p_status IS NULL OR pi.invitation_status = p_status)
      AND (p_entity_type IS NULL OR pi.entity_type = p_entity_type)
      AND (p_date_from IS NULL OR pi.invitation_sent_at >= p_date_from)
      AND (p_date_to IS NULL OR pi.invitation_sent_at <= p_date_to)
      AND (
        (
          lower(trim(p_scope)) = 'pm'
          AND pi.invited_by_user_id = v_user_id
          AND pi.entity_type = 'project'
        )
        OR (
          lower(trim(p_scope)) = 'pmo'
          AND public.is_user_pmo_admin(v_auth)
          AND (
            (pi.entity_type = 'project' AND EXISTS (
              SELECT 1 FROM projects p
              WHERE p.id = pi.project_id
                AND public.user_has_access_to_account(p.account_id)
            ))
            OR (pi.entity_type = 'portfolio' AND EXISTS (
              SELECT 1
              FROM portfolio_projects pp
              JOIN projects p ON p.id = pp.project_id
              WHERE pp.portfolio_id = pi.portfolio_id
                AND COALESCE(pp.is_deleted, FALSE) = FALSE
                AND public.user_has_access_to_account(p.account_id)
              LIMIT 1
            ))
            OR (pi.entity_type = 'programme' AND EXISTS (
              SELECT 1
              FROM programme_projects prp
              JOIN projects p ON p.id = prp.project_id
              WHERE prp.programme_id = pi.programme_id
                AND COALESCE(prp.is_deleted, FALSE) = FALSE
                AND public.user_has_access_to_account(p.account_id)
              LIMIT 1
            ))
          )
        )
      )
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_sent_invitations_by_user(text, text, text, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sent_invitations_by_user(text, text, text, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sent_invitations_by_user(text, text, text, timestamptz, timestamptz) TO service_role;

COMMENT ON FUNCTION public.get_sent_invitations_by_user(text, text, text, timestamptz, timestamptz) IS
  'Invitation tracker: PM sees project invitations they sent; PMO sees org-scoped portfolio/programme/project invitations.';

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'v592_get_sent_invitations_rpc.sql applied';
END $$;
