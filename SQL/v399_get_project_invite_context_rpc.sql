-- ============================================================================
-- v399: RPC get_project_invite_context — bypass table RLS for invite/seat reads
-- Version: v399
-- Description:
--   Direct REST GETs to project_invitations / project_seat_allocations can return
--   403 when RLS policies do not match (e.g. PMO without per-project user_roles).
--   This SECURITY DEFINER function authorizes the caller, then reads rows with
--   row_security disabled so PostgREST is not required to evaluate broken policies.
-- Prerequisites: v85 (tables, calculate_project_seat_usage), project_memberships
-- PostgreSQL 15+ (Supabase)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_project_invite_context(
  p_project_id uuid,
  p_invitation_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_auth uuid := auth.uid();
  v_ok boolean;
  v_inv jsonb;
  v_seat jsonb;
BEGIN
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      INNER JOIN roles r ON r.id = ur.role_id
      INNER JOIN users u ON u.id = ur.user_id
      WHERE u.auth_user_id = v_auth
        AND r.role_name = 'pmo_admin'
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      INNER JOIN users u ON u.id = ur.user_id
      WHERE u.auth_user_id = v_auth
        AND ur.project_id = p_project_id
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
    )
    OR EXISTS (
      SELECT 1
      FROM project_memberships pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE u.auth_user_id = v_auth
        AND pm.project_id = p_project_id
        AND COALESCE(pm.is_active, TRUE) = TRUE
    )
  ) INTO v_ok;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(
    (
      SELECT jsonb_agg(
        (to_jsonb(pi) || jsonb_build_object(
          'invited_by', jsonb_build_object(
            'full_name', ub.full_name,
            'email', ub.email
          ),
          'role', jsonb_build_object(
            'role_display_name', ro.role_display_name,
            'role_name', ro.role_name
          )
        ))
        ORDER BY pi.created_at DESC
      )
      FROM project_invitations pi
      LEFT JOIN users ub ON ub.id = pi.invited_by_user_id
      LEFT JOIN roles ro ON ro.id = pi.role_id
      WHERE pi.project_id = p_project_id
        AND COALESCE(pi.is_deleted, FALSE) = FALSE
        AND (p_invitation_status IS NULL OR pi.invitation_status = p_invitation_status)
    ),
    '[]'::jsonb
  ) INTO v_inv;

  PERFORM calculate_project_seat_usage(p_project_id);

  SELECT row_to_json(psa)::jsonb
  INTO v_seat
  FROM project_seat_allocations psa
  WHERE psa.project_id = p_project_id
  LIMIT 1;

  RETURN jsonb_build_object(
    'invitations', COALESCE(v_inv, '[]'::jsonb),
    'seat_allocation', v_seat
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_project_invite_context(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_project_invite_context(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_invite_context(uuid, text) TO service_role;

COMMENT ON FUNCTION public.get_project_invite_context(uuid, text) IS
  'Returns pending (or all) invitations and seat_allocation row for a project; bypasses RLS after auth.';

DO $$
BEGIN
  RAISE NOTICE 'v399_get_project_invite_context_rpc.sql applied';
END $$;
