-- ============================================================================
-- v533: Decline project invitation by token (email link; works without row UPDATE RLS for anon)
-- PostgreSQL 15+ (Supabase)
-- Prerequisites: v388 (accept_project_invitation), project_invitations
-- ============================================================================

CREATE OR REPLACE FUNCTION decline_project_invitation(p_token VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation project_invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_invitation
  FROM project_invitations
  WHERE invitation_token = p_token
    AND is_deleted = FALSE;

  IF v_invitation.id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_invitation.invitation_status <> 'pending' THEN
    RETURN FALSE;
  END IF;

  IF v_invitation.invitation_expires_at IS NOT NULL
     AND v_invitation.invitation_expires_at <= NOW() THEN
    RETURN FALSE;
  END IF;

  UPDATE project_invitations
  SET invitation_status = 'declined',
      declined_at = NOW(),
      updated_at = NOW()
  WHERE id = v_invitation.id;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION decline_project_invitation(VARCHAR) IS
  'Declines a pending, non-expired project invitation using the invitation token (no auth required).';

GRANT EXECUTE ON FUNCTION decline_project_invitation(VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION decline_project_invitation(VARCHAR) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'v533_decline_project_invitation_rpc.sql: decline_project_invitation applied';
END $$;
