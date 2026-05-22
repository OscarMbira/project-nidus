-- v628f: Team Communications tables
-- team_messages: real-time in-app team chat (Supabase Realtime)
-- team_calls: video/voice call scheduling and log with external join links

-- ── Platform schema ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.team_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id   uuid        NOT NULL REFERENCES auth.users(id),
  message     text        NOT NULL CHECK (length(trim(message)) > 0),
  message_type text       NOT NULL DEFAULT 'text'
              CHECK (message_type IN ('text', 'system', 'announcement')),
  is_pinned   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  is_deleted  boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_team_messages_project_id ON public.team_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_created_at ON public.team_messages(created_at);

ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

-- All project members can read messages
DROP POLICY IF EXISTS "team_messages_select" ON public.team_messages;
CREATE POLICY "team_messages_select" ON public.team_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = team_messages.project_id
        AND up.user_id    = auth.uid()
        AND up.is_deleted = FALSE
    )
  );

-- All project members can send messages
DROP POLICY IF EXISTS "team_messages_insert" ON public.team_messages;
CREATE POLICY "team_messages_insert" ON public.team_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = team_messages.project_id
        AND up.user_id    = auth.uid()
        AND up.is_deleted = FALSE
    )
  );

-- Only sender can update their own messages
DROP POLICY IF EXISTS "team_messages_update" ON public.team_messages;
CREATE POLICY "team_messages_update" ON public.team_messages
  FOR UPDATE USING (sender_id = auth.uid());

-- Only sender can soft-delete their own messages
DROP POLICY IF EXISTS "team_messages_delete" ON public.team_messages;
CREATE POLICY "team_messages_delete" ON public.team_messages
  FOR DELETE USING (sender_id = auth.uid());

-- Enable Realtime for team_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;

-- ── team_calls ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.team_calls (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organiser_id    uuid        NOT NULL REFERENCES auth.users(id),
  call_type       text        NOT NULL DEFAULT 'video'
                  CHECK (call_type IN ('video', 'voice')),
  title           text        NOT NULL,
  description     text,
  scheduled_at    timestamptz,
  duration_minutes integer,
  join_link       text,
  platform_name   text,
  status          text        NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes           text,
  recording_link  text,
  created_by      uuid        REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  is_deleted      boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_team_calls_project_id ON public.team_calls(project_id);
CREATE INDEX IF NOT EXISTS idx_team_calls_scheduled_at ON public.team_calls(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_team_calls_call_type ON public.team_calls(call_type);

CREATE OR REPLACE FUNCTION public.set_team_calls_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_team_calls_updated_at ON public.team_calls;
CREATE TRIGGER trg_team_calls_updated_at
  BEFORE UPDATE ON public.team_calls
  FOR EACH ROW EXECUTE FUNCTION public.set_team_calls_updated_at();

ALTER TABLE public.team_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_calls_select" ON public.team_calls;
CREATE POLICY "team_calls_select" ON public.team_calls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = team_calls.project_id
        AND up.user_id    = auth.uid()
        AND up.is_deleted = FALSE
    )
  );

DROP POLICY IF EXISTS "team_calls_insert" ON public.team_calls;
CREATE POLICY "team_calls_insert" ON public.team_calls
  FOR INSERT WITH CHECK (
    organiser_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = team_calls.project_id
        AND up.user_id    = auth.uid()
        AND up.is_deleted = FALSE
    )
  );

DROP POLICY IF EXISTS "team_calls_update" ON public.team_calls;
CREATE POLICY "team_calls_update" ON public.team_calls
  FOR UPDATE USING (
    organiser_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.user_projects up
        WHERE up.project_id = team_calls.project_id
          AND up.user_id    = auth.uid()
          AND up.is_deleted = FALSE
      )
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id  = get_user_id_from_auth(auth.uid())
          AND ur.is_active = TRUE
          AND NOT COALESCE(ur.is_deleted, FALSE)
          AND r.role_name IN ('project_manager', 'team_lead', 'team_manager')
      )
    )
  );

DROP POLICY IF EXISTS "team_calls_delete" ON public.team_calls;
CREATE POLICY "team_calls_delete" ON public.team_calls
  FOR DELETE USING (organiser_id = auth.uid());

-- ── Simulator schema ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.team_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL,
  sender_id   uuid        NOT NULL,
  message     text        NOT NULL,
  message_type text       NOT NULL DEFAULT 'text',
  is_pinned   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  is_deleted  boolean     NOT NULL DEFAULT false
);

ALTER TABLE sim.team_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sim_team_messages_all" ON sim.team_messages FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS sim.team_calls (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid        NOT NULL,
  organiser_id    uuid        NOT NULL,
  call_type       text        NOT NULL DEFAULT 'video' CHECK (call_type IN ('video', 'voice')),
  title           text        NOT NULL,
  description     text,
  scheduled_at    timestamptz,
  duration_minutes integer,
  join_link       text,
  platform_name   text,
  status          text        NOT NULL DEFAULT 'scheduled',
  notes           text,
  recording_link  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  is_deleted      boolean     NOT NULL DEFAULT false
);

ALTER TABLE sim.team_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sim_team_calls_all" ON sim.team_calls FOR ALL USING (auth.uid() IS NOT NULL);

-- ── Register in database_tables ───────────────────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('team_messages', 'Real-time project team chat messages per project', false, true),
  ('team_calls', 'Video and voice call scheduling and log with external join links per project', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at        = NOW();
