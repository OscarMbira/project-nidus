-- =============================================================================
-- v611_team_member_appointment_accept_rpc.sql
-- =============================================================================

CREATE OR REPLACE FUNCTION public.accept_team_member_appointment(
  p_appointment_id UUID,
  p_availability_confirmed BOOLEAN DEFAULT NULL,
  p_actual_start_date DATE DEFAULT NULL,
  p_coi_declared BOOLEAN DEFAULT NULL,
  p_coi_detail TEXT DEFAULT NULL,
  p_skills_acknowledged BOOLEAN DEFAULT NULL,
  p_conditions TEXT DEFAULT NULL,
  p_initial_observations TEXT DEFAULT NULL
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
  v_inv public.project_invitations%ROWTYPE;
  v_token VARCHAR;
  v_accepted BOOLEAN;
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
    RAISE EXCEPTION 'Only the appointee may accept' USING ERRCODE = '42501';
  END IF;

  IF v_appt.appointment_status <> 'pending_acceptance' THEN
    RAISE EXCEPTION 'Appointment is not pending acceptance' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.team_member_appointment_records
  SET
    appointment_status = 'active',
    accepted_at = NOW(),
    availability_confirmed = COALESCE(p_availability_confirmed, FALSE),
    actual_start_date = p_actual_start_date,
    conflict_of_interest = COALESCE(p_coi_declared, FALSE),
    coi_detail = NULLIF(trim(COALESCE(p_coi_detail, '')), ''),
    skills_acknowledged = COALESCE(p_skills_acknowledged, FALSE),
    acceptance_conditions = NULLIF(trim(COALESCE(p_conditions, '')), ''),
    initial_observations = NULLIF(trim(COALESCE(p_initial_observations, '')), ''),
    updated_at = NOW()
  WHERE id = p_appointment_id;

  IF v_appt.invitation_id IS NOT NULL THEN
    SELECT * INTO v_inv FROM public.project_invitations
    WHERE id = v_appt.invitation_id AND COALESCE(is_deleted, FALSE) = FALSE;

    IF v_inv.id IS NOT NULL AND v_inv.invitation_status = 'pending' THEN
      v_token := v_inv.invitation_token;
      IF v_token IS NOT NULL THEN
        v_accepted := public.accept_project_invitation(v_token, v_caller_user);
        IF NOT COALESCE(v_accepted, FALSE) THEN
          UPDATE public.project_invitations
          SET invitation_status = 'accepted',
              accepted_at = NOW(),
              accepted_by_user_id = v_caller_user,
              updated_at = NOW()
          WHERE id = v_inv.id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'appointment_id', p_appointment_id, 'appointment_status', 'active');
END;
$$;

REVOKE ALL ON FUNCTION public.accept_team_member_appointment(UUID, BOOLEAN, DATE, BOOLEAN, TEXT, BOOLEAN, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_team_member_appointment(UUID, BOOLEAN, DATE, BOOLEAN, TEXT, BOOLEAN, TEXT, TEXT) TO authenticated;

DO $$ BEGIN RAISE NOTICE 'v611_team_member_appointment_accept_rpc.sql applied'; END $$;
