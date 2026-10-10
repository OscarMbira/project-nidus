-- =============================================================================
-- v1226: Fix infinite RLS recursion on comm_meeting_participants (42P17)
-- Prerequisites: v408 (comm_current_user_id), v409 (meeting tables and policies)
--
-- Meeting Calendar error:
--   infinite recursion detected in policy for relation "comm_meeting_participants"
--
-- Root cause (v409):
--   comm_meetings_select reads comm_meeting_participants
--   comm_meeting_participants_select reads comm_meetings AND comm_meeting_participants
--   The same loop exists on sim.comm_meetings / sim.comm_meeting_participants.
--
-- Fix: membership checks go through SECURITY DEFINER helpers (row_security off),
-- matching comm_user_is_channel_member (v408). Policies keep the same access rules.
-- Idempotent — safe to re-run.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.comm_user_is_meeting_participant(p_meeting_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.comm_meeting_participants p
    WHERE p.meeting_id = p_meeting_id
      AND p.user_id = p_user_id
  );
$$;

COMMENT ON FUNCTION public.comm_user_is_meeting_participant(UUID, UUID) IS
  'v1226: TRUE if p_user_id is on the meeting. SECURITY DEFINER + row_security off so meeting policies do not recurse into comm_meeting_participants.';

CREATE OR REPLACE FUNCTION public.comm_user_is_meeting_participant_sim(p_meeting_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, sim
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM sim.comm_meeting_participants p
    WHERE p.meeting_id = p_meeting_id
      AND p.user_id = p_user_id
  );
$$;

COMMENT ON FUNCTION public.comm_user_is_meeting_participant_sim(UUID, UUID) IS
  'v1226: Simulator twin of comm_user_is_meeting_participant. SECURITY DEFINER + row_security off.';

GRANT EXECUTE ON FUNCTION public.comm_user_is_meeting_participant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.comm_user_is_meeting_participant(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.comm_user_is_meeting_participant_sim(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.comm_user_is_meeting_participant_sim(UUID, UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- Platform
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS comm_meetings_select ON public.comm_meetings;
CREATE POLICY comm_meetings_select ON public.comm_meetings
  FOR SELECT TO authenticated
  USING (
    public.user_has_access_to_account(account_id)
    AND (
      public.comm_user_is_meeting_participant(id, public.comm_current_user_id())
      OR (project_id IS NOT NULL AND public.auth_user_can_access_project(project_id))
      OR organised_by = public.comm_current_user_id()
    )
  );

DROP POLICY IF EXISTS comm_meeting_participants_select ON public.comm_meeting_participants;
CREATE POLICY comm_meeting_participants_select ON public.comm_meeting_participants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.comm_meetings m
      WHERE m.id = comm_meeting_participants.meeting_id
        AND public.user_has_access_to_account(m.account_id)
        AND (
          public.comm_user_is_meeting_participant(m.id, public.comm_current_user_id())
          OR (m.project_id IS NOT NULL AND public.auth_user_can_access_project(m.project_id))
        )
    )
  );

DROP POLICY IF EXISTS comm_meeting_transcripts_select ON public.comm_meeting_transcripts;
CREATE POLICY comm_meeting_transcripts_select ON public.comm_meeting_transcripts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.comm_meetings m
      WHERE m.id = comm_meeting_transcripts.meeting_id
        AND public.user_has_access_to_account(m.account_id)
        AND (
          public.comm_user_is_meeting_participant(m.id, public.comm_current_user_id())
          OR (m.project_id IS NOT NULL AND public.auth_user_can_access_project(m.project_id))
        )
    )
  );

DROP POLICY IF EXISTS comm_meeting_summaries_select ON public.comm_meeting_summaries;
CREATE POLICY comm_meeting_summaries_select ON public.comm_meeting_summaries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.comm_meetings m
      WHERE m.id = comm_meeting_summaries.meeting_id
        AND public.user_has_access_to_account(m.account_id)
        AND (
          public.comm_user_is_meeting_participant(m.id, public.comm_current_user_id())
          OR (m.project_id IS NOT NULL AND public.auth_user_can_access_project(m.project_id))
        )
    )
  );

DROP POLICY IF EXISTS comm_action_items_select ON public.comm_meeting_action_items;
CREATE POLICY comm_action_items_select ON public.comm_meeting_action_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.comm_meetings m
      WHERE m.id = comm_meeting_action_items.meeting_id
        AND public.user_has_access_to_account(m.account_id)
        AND (
          public.comm_user_is_meeting_participant(m.id, public.comm_current_user_id())
          OR (m.project_id IS NOT NULL AND public.auth_user_can_access_project(m.project_id))
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Simulator
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS sim_comm_meetings_select ON sim.comm_meetings;
CREATE POLICY sim_comm_meetings_select ON sim.comm_meetings
  FOR SELECT TO authenticated
  USING (
    public.user_has_access_to_account(account_id)
    AND (
      (simulation_run_id IS NOT NULL AND public.sim_auth_user_owns_run(simulation_run_id))
      OR public.comm_user_is_meeting_participant_sim(id, public.comm_current_user_id())
      OR organised_by = public.comm_current_user_id()
    )
  );
