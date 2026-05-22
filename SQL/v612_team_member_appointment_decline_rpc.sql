-- =============================================================================
-- v612_team_member_appointment_decline_rpc.sql
-- =============================================================================

CREATE OR REPLACE FUNCTION public.decline_team_member_appointment(
  p_appointment_id UUID,
  p_decline_reason VARCHAR DEFAULT 'other',
  p_decline_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_caller_auth UUID;
  v_caller_user UUID;
  v_appt public.team_member_appointment_records%ROWTYPE;
  v_reason VARCHAR;
BEGIN
  v_caller_auth := auth.uid();
  IF v_caller_auth IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT id INTO v_caller_user FROM public.users WHERE auth_user_id = v_caller_auth LIMIT 1;
  IF v_caller_user IS NULL THEN
    RAISE EXCEPTION 'User profile not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_appt
  FROM public.team_member_appointment_records
  WHERE id = p_appointment_id AND COALESCE(is_deleted, FALSE) = FALSE
  FOR UPDATE;

  IF v_appt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_appt.appointee_user_id <> v_caller_user THEN
    RAISE EXCEPTION 'Only the appointee may decline' USING ERRCODE = '42501';
  END IF;

  IF v_appt.appointment_status <> 'pending_acceptance' THEN
    RAISE EXCEPTION 'Appointment is not pending acceptance' USING ERRCODE = 'P0001';
  END IF;

  v_reason := lower(trim(COALESCE(p_decline_reason, 'other')));
  IF v_reason NOT IN ('unavailable', 'skills_mismatch', 'conflict_of_interest', 'overloaded', 'other') THEN
    v_reason := 'other';
  END IF;

  UPDATE public.team_member_appointment_records
  SET
    appointment_status = 'declined',
    declined_at = NOW(),
    decline_reason = v_reason,
    decline_note = NULLIF(trim(COALESCE(p_decline_note, '')), ''),
    updated_at = NOW()
  WHERE id = p_appointment_id;

  IF v_appt.invitation_id IS NOT NULL THEN
    UPDATE public.project_invitations
    SET invitation_status = 'declined',
        declined_at = NOW(),
        updated_at = NOW()
    WHERE id = v_appt.invitation_id AND invitation_status = 'pending';
  END IF;

  RETURN jsonb_build_object('success', true, 'appointment_id', p_appointment_id, 'appointment_status', 'declined');
END;
$$;

REVOKE ALL ON FUNCTION public.decline_team_member_appointment(UUID, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decline_team_member_appointment(UUID, VARCHAR, TEXT) TO authenticated;

DO $$ BEGIN RAISE NOTICE 'v612_team_member_appointment_decline_rpc.sql applied'; END $$;
