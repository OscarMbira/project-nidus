-- ============================================================================
-- v409: Meetings, AI transcripts, summaries, extractions (Platform + Simulator)
-- Prerequisites: v408_communication_tables.sql, issues, risks, tasks, projects,
-- sim.simulation_runs, sim.practice_issues, sim.practice_risks, sim.practice_tasks
-- ============================================================================

-- ============================================================================
-- PLATFORM
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.comm_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.comm_channels(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  meeting_type VARCHAR(20) NOT NULL DEFAULT 'video' CHECK (meeting_type IN ('video', 'audio', 'scheduled')),
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'ended', 'cancelled')),
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  agora_channel_name VARCHAR(200),
  recording_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  recording_url TEXT,
  ai_processing_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (ai_processing_status IN ('pending', 'transcribing', 'summarising', 'completed', 'failed')),
  organised_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_meetings_account ON public.comm_meetings(account_id);
CREATE INDEX IF NOT EXISTS idx_comm_meetings_project ON public.comm_meetings(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comm_meetings_status ON public.comm_meetings(status);

CREATE TABLE IF NOT EXISTS public.comm_meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.comm_meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invite_status VARCHAR(20) NOT NULL DEFAULT 'invited' CHECK (invite_status IN ('invited', 'accepted', 'declined', 'tentative')),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  duration_mins INT,
  UNIQUE (meeting_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.comm_meeting_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.comm_meetings(id) ON DELETE CASCADE,
  segment_index INT NOT NULL,
  speaker_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  speaker_label VARCHAR(50),
  start_time_sec NUMERIC(10,2),
  end_time_sec NUMERIC(10,2),
  text TEXT NOT NULL,
  confidence NUMERIC(4,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_meeting_transcripts_meeting ON public.comm_meeting_transcripts(meeting_id, segment_index);

CREATE TABLE IF NOT EXISTS public.comm_meeting_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.comm_meetings(id) ON DELETE CASCADE UNIQUE,
  summary_text TEXT,
  key_decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  topics_discussed JSONB NOT NULL DEFAULT '[]'::jsonb,
  sentiment VARCHAR(20),
  ai_model_used VARCHAR(100),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.comm_meeting_extracted_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.comm_meetings(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES public.issues(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ai_extracted_title TEXT NOT NULL,
  ai_extracted_desc TEXT,
  ai_confidence NUMERIC(4,3),
  suggested_priority VARCHAR(20),
  suggested_category VARCHAR(50),
  source_quote TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'enriched', 'created')),
  enriched_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_extracted_issues_meeting ON public.comm_meeting_extracted_issues(meeting_id);
CREATE INDEX IF NOT EXISTS idx_comm_extracted_issues_project ON public.comm_meeting_extracted_issues(project_id);

CREATE TABLE IF NOT EXISTS public.comm_meeting_extracted_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.comm_meetings(id) ON DELETE CASCADE,
  risk_id UUID REFERENCES public.risks(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ai_extracted_title TEXT NOT NULL,
  ai_extracted_desc TEXT,
  ai_confidence NUMERIC(4,3),
  suggested_probability VARCHAR(20),
  suggested_impact VARCHAR(20),
  suggested_category VARCHAR(50),
  suggested_response VARCHAR(30),
  source_quote TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'enriched', 'created')),
  enriched_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.comm_meeting_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.comm_meetings(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  assigned_to_name TEXT,
  assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  due_date DATE,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'converted_to_task', 'completed', 'dismissed')),
  source_quote TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_action_items_meeting ON public.comm_meeting_action_items(meeting_id);

-- ============================================================================
-- SIMULATOR (simulation_run_id replaces project_id where applicable)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sim.comm_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES sim.comm_channels(id) ON DELETE SET NULL,
  simulation_run_id UUID REFERENCES sim.simulation_runs(id) ON DELETE SET NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  meeting_type VARCHAR(20) NOT NULL DEFAULT 'video' CHECK (meeting_type IN ('video', 'audio', 'scheduled')),
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'ended', 'cancelled')),
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  agora_channel_name VARCHAR(200),
  recording_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  recording_url TEXT,
  ai_processing_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (ai_processing_status IN ('pending', 'transcribing', 'summarising', 'completed', 'failed')),
  organised_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sim_comm_meetings_run ON sim.comm_meetings(simulation_run_id) WHERE simulation_run_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS sim.comm_meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES sim.comm_meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invite_status VARCHAR(20) NOT NULL DEFAULT 'invited' CHECK (invite_status IN ('invited', 'accepted', 'declined', 'tentative')),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  duration_mins INT,
  UNIQUE (meeting_id, user_id)
);

CREATE TABLE IF NOT EXISTS sim.comm_meeting_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES sim.comm_meetings(id) ON DELETE CASCADE,
  segment_index INT NOT NULL,
  speaker_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  speaker_label VARCHAR(50),
  start_time_sec NUMERIC(10,2),
  end_time_sec NUMERIC(10,2),
  text TEXT NOT NULL,
  confidence NUMERIC(4,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim.comm_meeting_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES sim.comm_meetings(id) ON DELETE CASCADE UNIQUE,
  summary_text TEXT,
  key_decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  topics_discussed JSONB NOT NULL DEFAULT '[]'::jsonb,
  sentiment VARCHAR(20),
  ai_model_used VARCHAR(100),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.comm_meeting_extracted_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES sim.comm_meetings(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES sim.practice_issues(id) ON DELETE SET NULL,
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  ai_extracted_title TEXT NOT NULL,
  ai_extracted_desc TEXT,
  ai_confidence NUMERIC(4,3),
  suggested_priority VARCHAR(20),
  suggested_category VARCHAR(50),
  source_quote TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'enriched', 'created')),
  enriched_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim.comm_meeting_extracted_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES sim.comm_meetings(id) ON DELETE CASCADE,
  risk_id UUID REFERENCES sim.practice_risks(id) ON DELETE SET NULL,
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  ai_extracted_title TEXT NOT NULL,
  ai_extracted_desc TEXT,
  ai_confidence NUMERIC(4,3),
  suggested_probability VARCHAR(20),
  suggested_impact VARCHAR(20),
  suggested_category VARCHAR(50),
  suggested_response VARCHAR(30),
  source_quote TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'enriched', 'created')),
  enriched_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim.comm_meeting_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES sim.comm_meetings(id) ON DELETE CASCADE,
  task_id UUID REFERENCES sim.practice_tasks(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  assigned_to_name TEXT,
  assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  due_date DATE,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'converted_to_task', 'completed', 'dismissed')),
  source_quote TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- RLS — public (meetings: account + project access or participant)
-- ============================================================================
ALTER TABLE public.comm_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comm_meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comm_meeting_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comm_meeting_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comm_meeting_extracted_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comm_meeting_extracted_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comm_meeting_action_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comm_meetings_select ON public.comm_meetings;
CREATE POLICY comm_meetings_select ON public.comm_meetings
  FOR SELECT TO authenticated
  USING (
    public.user_has_access_to_account(account_id)
    AND (
      EXISTS (
        SELECT 1 FROM public.comm_meeting_participants p
        WHERE p.meeting_id = comm_meetings.id AND p.user_id = public.comm_current_user_id()
      )
      OR (project_id IS NOT NULL AND public.auth_user_can_access_project(project_id))
      OR organised_by = public.comm_current_user_id()
    )
  );

DROP POLICY IF EXISTS comm_meetings_mutate ON public.comm_meetings;
CREATE POLICY comm_meetings_mutate ON public.comm_meetings
  FOR ALL TO authenticated
  USING (
    public.user_has_access_to_account(account_id)
    AND (
      organised_by = public.comm_current_user_id()
      OR (project_id IS NOT NULL AND public.auth_user_can_access_project(project_id))
    )
  )
  WITH CHECK (
    public.user_has_access_to_account(account_id)
    AND organised_by = public.comm_current_user_id()
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
          EXISTS (SELECT 1 FROM public.comm_meeting_participants p WHERE p.meeting_id = m.id AND p.user_id = public.comm_current_user_id())
          OR (m.project_id IS NOT NULL AND public.auth_user_can_access_project(m.project_id))
        )
    )
  );

DROP POLICY IF EXISTS comm_meeting_participants_mutate ON public.comm_meeting_participants;
CREATE POLICY comm_meeting_participants_mutate ON public.comm_meeting_participants
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.comm_meetings m
      WHERE m.id = comm_meeting_participants.meeting_id
        AND m.organised_by = public.comm_current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.comm_meetings m
      WHERE m.id = comm_meeting_participants.meeting_id
        AND m.organised_by = public.comm_current_user_id()
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
          EXISTS (SELECT 1 FROM public.comm_meeting_participants p WHERE p.meeting_id = m.id AND p.user_id = public.comm_current_user_id())
          OR (m.project_id IS NOT NULL AND public.auth_user_can_access_project(m.project_id))
        )
    )
  );

DROP POLICY IF EXISTS comm_meeting_transcripts_insert ON public.comm_meeting_transcripts;
CREATE POLICY comm_meeting_transcripts_insert ON public.comm_meeting_transcripts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.comm_meetings m
      WHERE m.id = comm_meeting_transcripts.meeting_id
        AND m.organised_by = public.comm_current_user_id()
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
          EXISTS (SELECT 1 FROM public.comm_meeting_participants p WHERE p.meeting_id = m.id AND p.user_id = public.comm_current_user_id())
          OR (m.project_id IS NOT NULL AND public.auth_user_can_access_project(m.project_id))
        )
    )
  );

DROP POLICY IF EXISTS comm_meeting_summaries_mutate ON public.comm_meeting_summaries;
CREATE POLICY comm_meeting_summaries_mutate ON public.comm_meeting_summaries
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.comm_meetings m
      WHERE m.id = comm_meeting_summaries.meeting_id
        AND m.organised_by = public.comm_current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.comm_meetings m
      WHERE m.id = comm_meeting_summaries.meeting_id
        AND m.organised_by = public.comm_current_user_id()
    )
  );

DROP POLICY IF EXISTS comm_extracted_issues_select ON public.comm_meeting_extracted_issues;
CREATE POLICY comm_extracted_issues_select ON public.comm_meeting_extracted_issues
  FOR SELECT TO authenticated
  USING (
    public.auth_user_can_access_project(project_id)
  );

DROP POLICY IF EXISTS comm_extracted_issues_insert ON public.comm_meeting_extracted_issues;
CREATE POLICY comm_extracted_issues_insert ON public.comm_meeting_extracted_issues
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_user_can_access_project(project_id)
    AND EXISTS (
      SELECT 1 FROM public.comm_meetings m
      WHERE m.id = comm_meeting_extracted_issues.meeting_id
        AND m.organised_by = public.comm_current_user_id()
    )
  );

DROP POLICY IF EXISTS comm_extracted_issues_update ON public.comm_meeting_extracted_issues;
CREATE POLICY comm_extracted_issues_update ON public.comm_meeting_extracted_issues
  FOR UPDATE TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS comm_extracted_risks_select ON public.comm_meeting_extracted_risks;
CREATE POLICY comm_extracted_risks_select ON public.comm_meeting_extracted_risks
  FOR SELECT TO authenticated
  USING (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS comm_extracted_risks_insert ON public.comm_meeting_extracted_risks;
CREATE POLICY comm_extracted_risks_insert ON public.comm_meeting_extracted_risks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_user_can_access_project(project_id)
    AND EXISTS (
      SELECT 1 FROM public.comm_meetings m
      WHERE m.id = comm_meeting_extracted_risks.meeting_id
        AND m.organised_by = public.comm_current_user_id()
    )
  );

DROP POLICY IF EXISTS comm_extracted_risks_update ON public.comm_meeting_extracted_risks;
CREATE POLICY comm_extracted_risks_update ON public.comm_meeting_extracted_risks
  FOR UPDATE TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS comm_action_items_select ON public.comm_meeting_action_items;
CREATE POLICY comm_action_items_select ON public.comm_meeting_action_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.comm_meetings m
      WHERE m.id = comm_meeting_action_items.meeting_id
        AND public.user_has_access_to_account(m.account_id)
        AND (
          EXISTS (SELECT 1 FROM public.comm_meeting_participants p WHERE p.meeting_id = m.id AND p.user_id = public.comm_current_user_id())
          OR (m.project_id IS NOT NULL AND public.auth_user_can_access_project(m.project_id))
        )
    )
  );

DROP POLICY IF EXISTS comm_action_items_mutate ON public.comm_meeting_action_items;
CREATE POLICY comm_action_items_mutate ON public.comm_meeting_action_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.comm_meetings m
      WHERE m.id = comm_meeting_action_items.meeting_id
        AND m.organised_by = public.comm_current_user_id()
    )
  );

-- ============================================================================
-- RLS — sim
-- ============================================================================
ALTER TABLE sim.comm_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.comm_meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.comm_meeting_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.comm_meeting_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.comm_meeting_extracted_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.comm_meeting_extracted_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.comm_meeting_action_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_comm_meetings_select ON sim.comm_meetings;
CREATE POLICY sim_comm_meetings_select ON sim.comm_meetings
  FOR SELECT TO authenticated
  USING (
    public.user_has_access_to_account(account_id)
    AND (
      (simulation_run_id IS NOT NULL AND public.sim_auth_user_owns_run(simulation_run_id))
      OR EXISTS (
        SELECT 1 FROM sim.comm_meeting_participants p
        WHERE p.meeting_id = sim.comm_meetings.id AND p.user_id = public.comm_current_user_id()
      )
      OR organised_by = public.comm_current_user_id()
    )
  );

DROP POLICY IF EXISTS sim_comm_meetings_mutate ON sim.comm_meetings;
CREATE POLICY sim_comm_meetings_mutate ON sim.comm_meetings
  FOR ALL TO authenticated
  USING (
    public.user_has_access_to_account(account_id)
    AND (simulation_run_id IS NULL OR public.sim_auth_user_owns_run(simulation_run_id))
    AND organised_by = public.comm_current_user_id()
  )
  WITH CHECK (
    public.user_has_access_to_account(account_id)
    AND (simulation_run_id IS NULL OR public.sim_auth_user_owns_run(simulation_run_id))
    AND organised_by = public.comm_current_user_id()
  );

DROP POLICY IF EXISTS sim_meeting_participants_all ON sim.comm_meeting_participants;
CREATE POLICY sim_meeting_participants_all ON sim.comm_meeting_participants
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.comm_meetings m
      WHERE m.id = sim.comm_meeting_participants.meeting_id
        AND m.organised_by = public.comm_current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.comm_meetings m
      WHERE m.id = sim.comm_meeting_participants.meeting_id
        AND m.organised_by = public.comm_current_user_id()
    )
  );

DROP POLICY IF EXISTS sim_meeting_transcripts_all ON sim.comm_meeting_transcripts;
CREATE POLICY sim_meeting_transcripts_all ON sim.comm_meeting_transcripts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.comm_meetings m
      WHERE m.id = sim.comm_meeting_transcripts.meeting_id
        AND (m.organised_by = public.comm_current_user_id() OR public.sim_auth_user_owns_run(m.simulation_run_id))
    )
  );

DROP POLICY IF EXISTS sim_meeting_summaries_all ON sim.comm_meeting_summaries;
CREATE POLICY sim_meeting_summaries_all ON sim.comm_meeting_summaries
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.comm_meetings m
      WHERE m.id = sim.comm_meeting_summaries.meeting_id
        AND (m.organised_by = public.comm_current_user_id() OR public.sim_auth_user_owns_run(m.simulation_run_id))
    )
  );

DROP POLICY IF EXISTS sim_extracted_issues_select ON sim.comm_meeting_extracted_issues;
CREATE POLICY sim_extracted_issues_select ON sim.comm_meeting_extracted_issues
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = sim.comm_meeting_extracted_issues.practice_project_id
        AND public.sim_auth_user_owns_run(pp.simulation_run_id)
    )
  );

DROP POLICY IF EXISTS sim_extracted_issues_insert ON sim.comm_meeting_extracted_issues;
CREATE POLICY sim_extracted_issues_insert ON sim.comm_meeting_extracted_issues
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      INNER JOIN sim.comm_meetings m ON m.id = meeting_id
      WHERE pp.id = practice_project_id
        AND public.sim_auth_user_owns_run(pp.simulation_run_id)
        AND m.organised_by = public.comm_current_user_id()
    )
  );

DROP POLICY IF EXISTS sim_extracted_issues_update ON sim.comm_meeting_extracted_issues;
CREATE POLICY sim_extracted_issues_update ON sim.comm_meeting_extracted_issues
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = sim.comm_meeting_extracted_issues.practice_project_id
        AND public.sim_auth_user_owns_run(pp.simulation_run_id)
    )
  );

DROP POLICY IF EXISTS sim_extracted_risks_select ON sim.comm_meeting_extracted_risks;
CREATE POLICY sim_extracted_risks_select ON sim.comm_meeting_extracted_risks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = sim.comm_meeting_extracted_risks.practice_project_id
        AND public.sim_auth_user_owns_run(pp.simulation_run_id)
    )
  );

DROP POLICY IF EXISTS sim_extracted_risks_insert ON sim.comm_meeting_extracted_risks;
CREATE POLICY sim_extracted_risks_insert ON sim.comm_meeting_extracted_risks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      INNER JOIN sim.comm_meetings m ON m.id = meeting_id
      WHERE pp.id = practice_project_id
        AND public.sim_auth_user_owns_run(pp.simulation_run_id)
        AND m.organised_by = public.comm_current_user_id()
    )
  );

DROP POLICY IF EXISTS sim_extracted_risks_update ON sim.comm_meeting_extracted_risks;
CREATE POLICY sim_extracted_risks_update ON sim.comm_meeting_extracted_risks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = sim.comm_meeting_extracted_risks.practice_project_id
        AND public.sim_auth_user_owns_run(pp.simulation_run_id)
    )
  );

DROP POLICY IF EXISTS sim_action_items_all ON sim.comm_meeting_action_items;
CREATE POLICY sim_action_items_all ON sim.comm_meeting_action_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.comm_meetings m
      WHERE m.id = sim.comm_meeting_action_items.meeting_id
        AND (m.organised_by = public.comm_current_user_id() OR public.sim_auth_user_owns_run(m.simulation_run_id))
    )
  );

-- ============================================================================
-- Permissions
-- ============================================================================
INSERT INTO permissions (
  permission_code, permission_name, permission_description,
  permission_category, permission_module, permission_type, is_active
)
VALUES
  ('comms.channel.create', 'Create communication channels', 'Create channels and DMs', 'communications', 'comms', 'create', TRUE),
  ('comms.channel.read', 'View communication channels', 'Read channels and messages', 'communications', 'comms', 'read', TRUE),
  ('comms.channel.update', 'Manage communication channels', 'Edit channel settings', 'communications', 'comms', 'update', TRUE),
  ('comms.meeting.create', 'Schedule meetings', 'Create meetings and calls', 'communications', 'comms', 'create', TRUE),
  ('comms.meeting.read', 'View meetings', 'Read meetings and summaries', 'communications', 'comms', 'read', TRUE),
  ('comms.ai.review', 'Review AI extractions', 'Approve/reject AI issues and risks', 'communications', 'comms', 'execute', TRUE)
ON CONFLICT (permission_code) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  permission_description = EXCLUDED.permission_description,
  updated_at = NOW();

INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT r.id, p.id, TRUE
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name IN ('system_admin', 'pmo_admin', 'project_manager', 'team_lead', 'team_member', 'stakeholder', 'viewer')
  AND p.permission_code IN ('comms.channel.read', 'comms.meeting.read')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, updated_at = NOW();

INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT r.id, p.id, TRUE
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name IN ('system_admin', 'pmo_admin', 'project_manager', 'team_lead', 'team_member', 'stakeholder')
  AND p.permission_code IN ('comms.channel.create', 'comms.channel.update', 'comms.meeting.create')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, updated_at = NOW();

INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT r.id, p.id, TRUE
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name IN ('system_admin', 'pmo_admin', 'project_manager', 'team_lead')
  AND p.permission_code = 'comms.ai.review'
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, updated_at = NOW();

INSERT INTO database_tables (table_name, table_description, schema_name, is_system_table, is_active, table_category)
VALUES
  ('comm_meetings', 'Scheduled and ad-hoc meetings (Agora). Sim: sim.comm_meetings.', 'public', FALSE, TRUE, 'communications'),
  ('comm_meeting_participants', 'Meeting invites and join/leave.', 'public', FALSE, TRUE, 'communications'),
  ('comm_meeting_transcripts', 'Whisper transcript segments.', 'public', FALSE, TRUE, 'communications'),
  ('comm_meeting_summaries', 'Gemini AI summaries.', 'public', FALSE, TRUE, 'communications'),
  ('comm_meeting_extracted_issues', 'AI draft issues from meetings.', 'public', FALSE, TRUE, 'communications'),
  ('comm_meeting_extracted_risks', 'AI draft risks from meetings.', 'public', FALSE, TRUE, 'communications'),
  ('comm_meeting_action_items', 'Extracted follow-up actions.', 'public', FALSE, TRUE, 'communications')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v409_meeting_ai_tables.sql applied';
END $$;
