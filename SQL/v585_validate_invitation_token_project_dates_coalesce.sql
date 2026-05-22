-- v585: Project planned dates on invitation accept (projects + project_plans fallback)
-- Run after v583_validate_invitation_token_organisation.sql (or v584 if already applied)

DROP FUNCTION IF EXISTS public.get_invitation_project_dates(UUID);

CREATE OR REPLACE FUNCTION public.get_invitation_project_dates(p_project_id UUID)
RETURNS TABLE (
    planned_start_date DATE,
    planned_end_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(p.planned_start_date, pp.planned_start_date)::DATE AS planned_start_date,
        COALESCE(p.planned_end_date, pp.planned_end_date)::DATE AS planned_end_date
    FROM public.projects p
    LEFT JOIN public.project_plans pp ON pp.project_id = p.id
    WHERE p.id = p_project_id
      AND COALESCE(p.is_deleted, false) = false
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_invitation_project_dates(UUID) IS
  'Returns planned start/end for a project (projects row, else project_plans) for public invitation UI.';

GRANT EXECUTE ON FUNCTION public.get_invitation_project_dates(UUID) TO anon, authenticated, service_role;

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
    planned_start_date DATE,
    planned_end_date DATE,
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
        COALESCE(p.planned_start_date, pp.planned_start_date)::DATE AS planned_start_date,
        COALESCE(p.planned_end_date, pp.planned_end_date)::DATE AS planned_end_date,
        (
            pi.invitation_status = 'pending'
            AND (pi.invitation_expires_at IS NULL OR pi.invitation_expires_at > NOW())
        ) AS is_valid,
        pi.invitation_expires_at AS expires_at,
        pi.invitation_message
    FROM public.project_invitations pi
    INNER JOIN public.projects p ON p.id = pi.project_id
    LEFT JOIN public.project_plans pp ON pp.project_id = p.id
    INNER JOIN public.roles r ON r.id = pi.role_id
    INNER JOIN public.users u ON u.id = pi.invited_by_user_id
    LEFT JOIN public.accounts a ON a.id = p.account_id AND COALESCE(a.is_deleted, false) = false
    WHERE pi.invitation_token = p_token
      AND pi.is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.validate_invitation_token(VARCHAR) IS
  'Validates invitation token; returns org, inviter, and project planned dates (projects or project_plans).';

GRANT EXECUTE ON FUNCTION public.validate_invitation_token(VARCHAR) TO anon, authenticated, service_role;
