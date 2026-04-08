-- ============================================================================
-- v408: Communications — core tables (Platform public + Simulator sim)
-- PostgreSQL 15+ / Supabase. Prerequisites: accounts, projects, users,
-- user_has_access_to_account (v403+), auth_user_can_access_project (v406+),
-- sim.simulation_runs, sim_auth_user_owns_run (v406+).
-- ============================================================================

-- Current user row in public.users (for RLS)
CREATE OR REPLACE FUNCTION public.comm_current_user_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

COMMENT ON FUNCTION public.comm_current_user_id() IS
  'Returns public.users.id for the authenticated user, or NULL.';

-- NOTE: comm_user_is_channel_member* functions are defined AFTER all comm_* tables exist
-- (PostgreSQL validates SQL function bodies at CREATE time).

-- ============================================================================
-- PLATFORM: comm_channels
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.comm_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_type VARCHAR(20) NOT NULL CHECK (channel_type IN ('direct', 'group', 'project', 'announcement')),
  name VARCHAR(100),
  description TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_channels_one_project
  ON public.comm_channels (project_id)
  WHERE channel_type = 'project' AND project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comm_channels_account ON public.comm_channels(account_id) WHERE COALESCE(is_archived, FALSE) = FALSE;
CREATE INDEX IF NOT EXISTS idx_comm_channels_project ON public.comm_channels(project_id) WHERE project_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.comm_channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.comm_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'readonly')),
  is_muted BOOLEAN NOT NULL DEFAULT FALSE,
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comm_channel_members_user ON public.comm_channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_comm_channel_members_channel ON public.comm_channel_members(channel_id);

CREATE TABLE IF NOT EXISTS public.comm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.comm_channels(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.comm_messages(id) ON DELETE SET NULL,
  content TEXT,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system', 'call_event')),
  is_edited BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_messages_channel_created ON public.comm_messages(channel_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.comm_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.comm_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.comm_message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.comm_messages(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SIMULATOR: mirror tables (simulation_run_id instead of project_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sim.comm_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_type VARCHAR(20) NOT NULL CHECK (channel_type IN ('direct', 'group', 'project', 'announcement')),
  name VARCHAR(100),
  description TEXT,
  simulation_run_id UUID REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_comm_channels_one_run
  ON sim.comm_channels (simulation_run_id)
  WHERE channel_type = 'project' AND simulation_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sim_comm_channels_account ON sim.comm_channels(account_id) WHERE COALESCE(is_archived, FALSE) = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_comm_channels_run ON sim.comm_channels(simulation_run_id) WHERE simulation_run_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS sim.comm_channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES sim.comm_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'readonly')),
  is_muted BOOLEAN NOT NULL DEFAULT FALSE,
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sim_comm_channel_members_user ON sim.comm_channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_sim_comm_channel_members_ch ON sim.comm_channel_members(channel_id);

CREATE TABLE IF NOT EXISTS sim.comm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES sim.comm_channels(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES sim.comm_messages(id) ON DELETE SET NULL,
  content TEXT,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system', 'call_event')),
  is_edited BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sim_comm_messages_ch_created ON sim.comm_messages(channel_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sim.comm_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES sim.comm_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS sim.comm_message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES sim.comm_messages(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Membership helpers (must run after public + sim comm_channel_members exist)
CREATE OR REPLACE FUNCTION public.comm_user_is_channel_member(p_channel_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.comm_channel_members m
    WHERE m.channel_id = p_channel_id AND m.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.comm_user_is_channel_member_sim(p_channel_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, sim
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sim.comm_channel_members m
    WHERE m.channel_id = p_channel_id AND m.user_id = p_user_id
  );
$$;

-- ============================================================================
-- RLS — public
-- ============================================================================
ALTER TABLE public.comm_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comm_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comm_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comm_message_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comm_channels_select_member ON public.comm_channels;
CREATE POLICY comm_channels_select_member ON public.comm_channels
  FOR SELECT TO authenticated
  USING (
    public.user_has_access_to_account(account_id)
    AND EXISTS (
      SELECT 1 FROM public.comm_channel_members m
      WHERE m.channel_id = comm_channels.id AND m.user_id = public.comm_current_user_id()
    )
  );

DROP POLICY IF EXISTS comm_channels_insert ON public.comm_channels;
CREATE POLICY comm_channels_insert ON public.comm_channels
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_access_to_account(account_id)
    AND created_by = public.comm_current_user_id()
  );

DROP POLICY IF EXISTS comm_channels_update ON public.comm_channels;
CREATE POLICY comm_channels_update ON public.comm_channels
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.comm_channel_members m
      WHERE m.channel_id = comm_channels.id
        AND m.user_id = public.comm_current_user_id()
        AND m.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    public.user_has_access_to_account(account_id)
  );

DROP POLICY IF EXISTS comm_channel_members_select ON public.comm_channel_members;
CREATE POLICY comm_channel_members_select ON public.comm_channel_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.comm_channel_members m2
      WHERE m2.channel_id = comm_channel_members.channel_id
        AND m2.user_id = public.comm_current_user_id()
    )
  );

DROP POLICY IF EXISTS comm_channel_members_insert ON public.comm_channel_members;
CREATE POLICY comm_channel_members_insert ON public.comm_channel_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.comm_channels c
      WHERE c.id = comm_channel_members.channel_id
        AND public.user_has_access_to_account(c.account_id)
        AND (
          c.created_by = public.comm_current_user_id()
          OR EXISTS (
            SELECT 1 FROM public.comm_channel_members m
            WHERE m.channel_id = c.id
              AND m.user_id = public.comm_current_user_id()
              AND m.role IN ('owner', 'admin')
          )
        )
    )
  );

DROP POLICY IF EXISTS comm_channel_members_update ON public.comm_channel_members;
CREATE POLICY comm_channel_members_update ON public.comm_channel_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.comm_channel_members m2
      WHERE m2.channel_id = comm_channel_members.channel_id
        AND m2.user_id = public.comm_current_user_id()
        AND m2.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS comm_channel_members_delete ON public.comm_channel_members;
CREATE POLICY comm_channel_members_delete ON public.comm_channel_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.comm_channel_members m2
      WHERE m2.channel_id = comm_channel_members.channel_id
        AND m2.user_id = public.comm_current_user_id()
        AND m2.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS comm_messages_select ON public.comm_messages;
CREATE POLICY comm_messages_select ON public.comm_messages
  FOR SELECT TO authenticated
  USING (
    public.comm_user_is_channel_member(channel_id, public.comm_current_user_id())
  );

DROP POLICY IF EXISTS comm_messages_insert ON public.comm_messages;
CREATE POLICY comm_messages_insert ON public.comm_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.comm_user_is_channel_member(channel_id, public.comm_current_user_id())
    AND sender_id = public.comm_current_user_id()
    AND EXISTS (
      SELECT 1 FROM public.comm_channel_members m
      WHERE m.channel_id = comm_messages.channel_id
        AND m.user_id = public.comm_current_user_id()
        AND m.role <> 'readonly'
    )
  );

DROP POLICY IF EXISTS comm_messages_update_own ON public.comm_messages;
CREATE POLICY comm_messages_update_own ON public.comm_messages
  FOR UPDATE TO authenticated
  USING (
    public.comm_user_is_channel_member(channel_id, public.comm_current_user_id())
    AND (sender_id = public.comm_current_user_id() OR EXISTS (
      SELECT 1 FROM public.comm_channel_members m
      WHERE m.channel_id = comm_messages.channel_id
        AND m.user_id = public.comm_current_user_id()
        AND m.role IN ('owner', 'admin')
    ))
  )
  WITH CHECK (public.comm_user_is_channel_member(channel_id, public.comm_current_user_id()));

DROP POLICY IF EXISTS comm_reactions_all ON public.comm_message_reactions;
CREATE POLICY comm_reactions_all ON public.comm_message_reactions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.comm_messages msg
      WHERE msg.id = comm_message_reactions.message_id
        AND public.comm_user_is_channel_member(msg.channel_id, public.comm_current_user_id())
    )
  )
  WITH CHECK (
    user_id = public.comm_current_user_id()
    AND EXISTS (
      SELECT 1 FROM public.comm_messages msg
      WHERE msg.id = comm_message_reactions.message_id
        AND public.comm_user_is_channel_member(msg.channel_id, public.comm_current_user_id())
    )
  );

DROP POLICY IF EXISTS comm_attachments_all ON public.comm_message_attachments;
CREATE POLICY comm_attachments_all ON public.comm_message_attachments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.comm_messages msg
      WHERE msg.id = comm_message_attachments.message_id
        AND public.comm_user_is_channel_member(msg.channel_id, public.comm_current_user_id())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.comm_messages msg
      WHERE msg.id = comm_message_attachments.message_id
        AND public.comm_user_is_channel_member(msg.channel_id, public.comm_current_user_id())
    )
  );

-- ============================================================================
-- RLS — sim (owner of simulation run or DM/group on account)
-- ============================================================================
ALTER TABLE sim.comm_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.comm_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.comm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.comm_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.comm_message_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_comm_channels_select ON sim.comm_channels;
CREATE POLICY sim_comm_channels_select ON sim.comm_channels
  FOR SELECT TO authenticated
  USING (
    public.user_has_access_to_account(account_id)
    AND (
      (simulation_run_id IS NOT NULL AND public.sim_auth_user_owns_run(simulation_run_id))
      OR EXISTS (
        SELECT 1 FROM sim.comm_channel_members m
        WHERE m.channel_id = sim.comm_channels.id AND m.user_id = public.comm_current_user_id()
      )
    )
  );

DROP POLICY IF EXISTS sim_comm_channels_insert ON sim.comm_channels;
CREATE POLICY sim_comm_channels_insert ON sim.comm_channels
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_access_to_account(account_id)
    AND created_by = public.comm_current_user_id()
    AND (simulation_run_id IS NULL OR public.sim_auth_user_owns_run(simulation_run_id))
  );

DROP POLICY IF EXISTS sim_comm_channels_update ON sim.comm_channels;
CREATE POLICY sim_comm_channels_update ON sim.comm_channels
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.comm_channel_members m
      WHERE m.channel_id = sim.comm_channels.id
        AND m.user_id = public.comm_current_user_id()
        AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS sim_comm_members_select ON sim.comm_channel_members;
CREATE POLICY sim_comm_members_select ON sim.comm_channel_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.comm_channel_members m2
      WHERE m2.channel_id = sim.comm_channel_members.channel_id
        AND m2.user_id = public.comm_current_user_id()
    )
  );

DROP POLICY IF EXISTS sim_comm_members_insert ON sim.comm_channel_members;
CREATE POLICY sim_comm_members_insert ON sim.comm_channel_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.comm_channels c
      WHERE c.id = sim.comm_channel_members.channel_id
        AND public.user_has_access_to_account(c.account_id)
        AND (
          c.created_by = public.comm_current_user_id()
          OR EXISTS (
            SELECT 1 FROM sim.comm_channel_members m
            WHERE m.channel_id = c.id
              AND m.user_id = public.comm_current_user_id()
              AND m.role IN ('owner', 'admin')
          )
        )
    )
  );

DROP POLICY IF EXISTS sim_comm_members_update ON sim.comm_channel_members;
CREATE POLICY sim_comm_members_update ON sim.comm_channel_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.comm_channel_members m2
      WHERE m2.channel_id = sim.comm_channel_members.channel_id
        AND m2.user_id = public.comm_current_user_id()
        AND m2.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS sim_comm_members_delete ON sim.comm_channel_members;
CREATE POLICY sim_comm_members_delete ON sim.comm_channel_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.comm_channel_members m2
      WHERE m2.channel_id = sim.comm_channel_members.channel_id
        AND m2.user_id = public.comm_current_user_id()
        AND m2.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS sim_comm_messages_select ON sim.comm_messages;
CREATE POLICY sim_comm_messages_select ON sim.comm_messages
  FOR SELECT TO authenticated
  USING (
    public.comm_user_is_channel_member_sim(channel_id, public.comm_current_user_id())
  );

DROP POLICY IF EXISTS sim_comm_messages_insert ON sim.comm_messages;
CREATE POLICY sim_comm_messages_insert ON sim.comm_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.comm_user_is_channel_member_sim(channel_id, public.comm_current_user_id())
    AND sender_id = public.comm_current_user_id()
    AND EXISTS (
      SELECT 1 FROM sim.comm_channel_members m
      WHERE m.channel_id = sim.comm_messages.channel_id
        AND m.user_id = public.comm_current_user_id()
        AND m.role <> 'readonly'
    )
  );

DROP POLICY IF EXISTS sim_comm_messages_update ON sim.comm_messages;
CREATE POLICY sim_comm_messages_update ON sim.comm_messages
  FOR UPDATE TO authenticated
  USING (
    public.comm_user_is_channel_member_sim(channel_id, public.comm_current_user_id())
    AND (sender_id = public.comm_current_user_id() OR EXISTS (
      SELECT 1 FROM sim.comm_channel_members m
      WHERE m.channel_id = sim.comm_messages.channel_id
        AND m.user_id = public.comm_current_user_id()
        AND m.role IN ('owner', 'admin')
    ))
  );

DROP POLICY IF EXISTS sim_comm_reactions_all ON sim.comm_message_reactions;
CREATE POLICY sim_comm_reactions_all ON sim.comm_message_reactions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.comm_messages msg
      WHERE msg.id = sim.comm_message_reactions.message_id
        AND public.comm_user_is_channel_member_sim(msg.channel_id, public.comm_current_user_id())
    )
  )
  WITH CHECK (
    user_id = public.comm_current_user_id()
  );

DROP POLICY IF EXISTS sim_comm_attachments_all ON sim.comm_message_attachments;
CREATE POLICY sim_comm_attachments_all ON sim.comm_message_attachments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.comm_messages msg
      WHERE msg.id = sim.comm_message_attachments.message_id
        AND public.comm_user_is_channel_member_sim(msg.channel_id, public.comm_current_user_id())
    )
  );

-- Realtime: enable in Supabase Dashboard or run if publication exists:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.comm_messages;

INSERT INTO database_tables (table_name, table_description, schema_name, is_system_table, is_active, table_category)
VALUES
  ('comm_channels', 'Chat/call channels (direct, group, project, announcement). Sim: sim.comm_channels.', 'public', FALSE, TRUE, 'communications'),
  ('comm_channel_members', 'Channel membership and roles.', 'public', FALSE, TRUE, 'communications'),
  ('comm_messages', 'Channel messages (Realtime). Sim: sim.comm_messages.', 'public', FALSE, TRUE, 'communications'),
  ('comm_message_reactions', 'Emoji reactions on messages.', 'public', FALSE, TRUE, 'communications'),
  ('comm_message_attachments', 'File attachments metadata (storage bucket comm-attachments).', 'public', FALSE, TRUE, 'communications')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  schema_name = EXCLUDED.schema_name,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v408_communication_tables.sql applied';
END $$;
