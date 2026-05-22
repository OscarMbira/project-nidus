-- v583: Include PMO / account organisation name on public invitation accept page
-- Run after v87_unified_auth_functions.sql (validate_invitation_token)

DROP FUNCTION IF EXISTS public.validate_invitation_token(VARCHAR);

CREATE OR REPLACE FUNCTION public.validate_invitation_token(p_token VARCHAR)
RETURNS TABLE (
    invitation_id UUID,
    project_id UUID,
    project_name VARCHAR,
    invited_email VARCHAR,
    role_name VARCHAR,
    role_display_name VARCHAR,
    invited_by_name VARCHAR,
    organisation_name TEXT,
    is_valid BOOLEAN,
    expires_at TIMESTAMP,
    invitation_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pi.id AS invitation_id,
        pi.project_id,
        p.project_name,
        pi.invited_email,
        r.role_name,
        r.role_display_name,
        u.full_name AS invited_by_name,
        COALESCE(
            NULLIF(TRIM(a.account_display_name), ''),
            NULLIF(TRIM(a.account_name), ''),
            NULLIF(TRIM(a.company_name), ''),
            ''
        )::TEXT AS organisation_name,
        (
            pi.invitation_status = 'pending'
            AND (pi.invitation_expires_at IS NULL OR pi.invitation_expires_at > NOW())
        ) AS is_valid,
        pi.invitation_expires_at AS expires_at,
        pi.invitation_message
    FROM public.project_invitations pi
    INNER JOIN public.projects p ON p.id = pi.project_id
    INNER JOIN public.roles r ON r.id = pi.role_id
    INNER JOIN public.users u ON u.id = pi.invited_by_user_id
    LEFT JOIN public.accounts a ON a.id = p.account_id AND COALESCE(a.is_deleted, false) = false
    WHERE pi.invitation_token = p_token
      AND pi.is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.validate_invitation_token(VARCHAR) IS
  'Validates project invitation token; returns project, role, inviter, and account organisation name for accept page.';

GRANT EXECUTE ON FUNCTION public.validate_invitation_token(VARCHAR) TO anon, authenticated, service_role;
