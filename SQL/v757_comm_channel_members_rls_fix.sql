-- ============================================================================
-- v757: Fix infinite recursion in comm_channel_members RLS policies
-- PostgreSQL 15+ / Supabase
-- Symptom: "Infinite recursion detected in policy for relation comm_channel_members"
-- Cause: policies on comm_channel_members queried comm_channel_members under RLS.
-- Fix: use SECURITY DEFINER helpers with row_security = off (Platform + Simulator).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.comm_user_is_channel_admin(p_channel_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.comm_channel_members m
    WHERE m.channel_id = p_channel_id
      AND m.user_id = p_user_id
      AND m.role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.comm_user_can_post_in_channel(p_channel_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.comm_channel_members m
    WHERE m.channel_id = p_channel_id
      AND m.user_id = p_user_id
      AND m.role <> 'readonly'
  );
$$;

CREATE OR REPLACE FUNCTION public.comm_user_can_manage_channel_members(p_channel_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.comm_channels c
    WHERE c.id = p_channel_id
      AND (
        c.created_by = p_user_id
        OR EXISTS (
          SELECT 1
          FROM public.comm_channel_members m
          WHERE m.channel_id = p_channel_id
            AND m.user_id = p_user_id
            AND m.role IN ('owner', 'admin')
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.comm_user_is_channel_admin_sim(p_channel_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, sim
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM sim.comm_channel_members m
    WHERE m.channel_id = p_channel_id
      AND m.user_id = p_user_id
      AND m.role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.comm_user_can_post_in_channel_sim(p_channel_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, sim
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM sim.comm_channel_members m
    WHERE m.channel_id = p_channel_id
      AND m.user_id = p_user_id
      AND m.role <> 'readonly'
  );
$$;

CREATE OR REPLACE FUNCTION public.comm_user_can_manage_channel_members_sim(p_channel_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, sim
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM sim.comm_channels c
    WHERE c.id = p_channel_id
      AND (
        c.created_by = p_user_id
        OR EXISTS (
          SELECT 1
          FROM sim.comm_channel_members m
          WHERE m.channel_id = p_channel_id
            AND m.user_id = p_user_id
            AND m.role IN ('owner', 'admin')
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- public schema policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS comm_channels_select_member ON public.comm_channels;
CREATE POLICY comm_channels_select_member ON public.comm_channels
  FOR SELECT TO authenticated
  USING (
    public.user_has_access_to_account(account_id)
    AND public.comm_user_is_channel_member(id, public.comm_current_user_id())
  );

DROP POLICY IF EXISTS comm_channels_update ON public.comm_channels;
CREATE POLICY comm_channels_update ON public.comm_channels
  FOR UPDATE TO authenticated
  USING (
    public.comm_user_is_channel_admin(id, public.comm_current_user_id())
  )
  WITH CHECK (
    public.user_has_access_to_account(account_id)
  );

DROP POLICY IF EXISTS comm_channel_members_select ON public.comm_channel_members;
CREATE POLICY comm_channel_members_select ON public.comm_channel_members
  FOR SELECT TO authenticated
  USING (
    public.comm_user_is_channel_member(channel_id, public.comm_current_user_id())
  );

DROP POLICY IF EXISTS comm_channel_members_insert ON public.comm_channel_members;
CREATE POLICY comm_channel_members_insert ON public.comm_channel_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.comm_channels c
      WHERE c.id = comm_channel_members.channel_id
        AND public.user_has_access_to_account(c.account_id)
    )
    AND public.comm_user_can_manage_channel_members(channel_id, public.comm_current_user_id())
  );

DROP POLICY IF EXISTS comm_channel_members_update ON public.comm_channel_members;
CREATE POLICY comm_channel_members_update ON public.comm_channel_members
  FOR UPDATE TO authenticated
  USING (
    public.comm_user_is_channel_admin(channel_id, public.comm_current_user_id())
  );

DROP POLICY IF EXISTS comm_channel_members_delete ON public.comm_channel_members;
CREATE POLICY comm_channel_members_delete ON public.comm_channel_members
  FOR DELETE TO authenticated
  USING (
    public.comm_user_is_channel_admin(channel_id, public.comm_current_user_id())
  );

DROP POLICY IF EXISTS comm_messages_insert ON public.comm_messages;
CREATE POLICY comm_messages_insert ON public.comm_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.comm_user_can_post_in_channel(channel_id, public.comm_current_user_id())
    AND sender_id = public.comm_current_user_id()
  );

DROP POLICY IF EXISTS comm_messages_update_own ON public.comm_messages;
CREATE POLICY comm_messages_update_own ON public.comm_messages
  FOR UPDATE TO authenticated
  USING (
    public.comm_user_is_channel_member(channel_id, public.comm_current_user_id())
    AND (
      sender_id = public.comm_current_user_id()
      OR public.comm_user_is_channel_admin(channel_id, public.comm_current_user_id())
    )
  )
  WITH CHECK (
    public.comm_user_is_channel_member(channel_id, public.comm_current_user_id())
  );

-- ---------------------------------------------------------------------------
-- sim schema policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS sim_comm_channels_select ON sim.comm_channels;
CREATE POLICY sim_comm_channels_select ON sim.comm_channels
  FOR SELECT TO authenticated
  USING (
    public.user_has_access_to_account(account_id)
    AND (
      (simulation_run_id IS NOT NULL AND public.sim_auth_user_owns_run(simulation_run_id))
      OR public.comm_user_is_channel_member_sim(id, public.comm_current_user_id())
    )
  );

DROP POLICY IF EXISTS sim_comm_channels_update ON sim.comm_channels;
CREATE POLICY sim_comm_channels_update ON sim.comm_channels
  FOR UPDATE TO authenticated
  USING (
    public.comm_user_is_channel_admin_sim(id, public.comm_current_user_id())
  );

DROP POLICY IF EXISTS sim_comm_members_select ON sim.comm_channel_members;
CREATE POLICY sim_comm_members_select ON sim.comm_channel_members
  FOR SELECT TO authenticated
  USING (
    public.comm_user_is_channel_member_sim(channel_id, public.comm_current_user_id())
  );

DROP POLICY IF EXISTS sim_comm_members_insert ON sim.comm_channel_members;
CREATE POLICY sim_comm_members_insert ON sim.comm_channel_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM sim.comm_channels c
      WHERE c.id = sim.comm_channel_members.channel_id
        AND public.user_has_access_to_account(c.account_id)
    )
    AND public.comm_user_can_manage_channel_members_sim(channel_id, public.comm_current_user_id())
  );

DROP POLICY IF EXISTS sim_comm_members_update ON sim.comm_channel_members;
CREATE POLICY sim_comm_members_update ON sim.comm_channel_members
  FOR UPDATE TO authenticated
  USING (
    public.comm_user_is_channel_admin_sim(channel_id, public.comm_current_user_id())
  );

DROP POLICY IF EXISTS sim_comm_members_delete ON sim.comm_channel_members;
CREATE POLICY sim_comm_members_delete ON sim.comm_channel_members
  FOR DELETE TO authenticated
  USING (
    public.comm_user_is_channel_admin_sim(channel_id, public.comm_current_user_id())
  );

DROP POLICY IF EXISTS sim_comm_messages_insert ON sim.comm_messages;
CREATE POLICY sim_comm_messages_insert ON sim.comm_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.comm_user_can_post_in_channel_sim(channel_id, public.comm_current_user_id())
    AND sender_id = public.comm_current_user_id()
  );

DROP POLICY IF EXISTS sim_comm_messages_update ON sim.comm_messages;
CREATE POLICY sim_comm_messages_update ON sim.comm_messages
  FOR UPDATE TO authenticated
  USING (
    public.comm_user_is_channel_member_sim(channel_id, public.comm_current_user_id())
    AND (
      sender_id = public.comm_current_user_id()
      OR public.comm_user_is_channel_admin_sim(channel_id, public.comm_current_user_id())
    )
  )
  WITH CHECK (
    public.comm_user_is_channel_member_sim(channel_id, public.comm_current_user_id())
  );

GRANT EXECUTE ON FUNCTION public.comm_user_is_channel_admin(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.comm_user_can_post_in_channel(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.comm_user_can_manage_channel_members(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.comm_user_is_channel_admin_sim(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.comm_user_can_post_in_channel_sim(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.comm_user_can_manage_channel_members_sim(UUID, UUID) TO authenticated, service_role;

DO $$
BEGIN
  RAISE NOTICE 'v757_comm_channel_members_rls_fix.sql applied';
END $$;
