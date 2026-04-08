-- =============================================================================
-- v316: Stakeholder Engagement Actions (Platform + Simulator)
-- Purpose: Per-stakeholder engagement action plan with owner, due date, status.
-- Tables: public.stakeholder_engagement_actions, sim.practice_engagement_actions
-- Safe to re-run: CREATE IF NOT EXISTS, DROP POLICY IF EXISTS
-- =============================================================================

-- =============================================================================
-- Platform: public.stakeholder_engagement_actions
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.stakeholder_engagement_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES public.stakeholders(id) ON DELETE CASCADE,
  action_description TEXT NOT NULL,
  owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'completed', 'cancelled')),
  action_type TEXT DEFAULT 'other' CHECK (action_type IN ('meeting', 'email', 'workshop', 'report', 'call', 'other')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  completion_date DATE,
  outcome_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_stakeholder_engagement_actions_project
  ON public.stakeholder_engagement_actions(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_engagement_actions_stakeholder
  ON public.stakeholder_engagement_actions(stakeholder_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_engagement_actions_status
  ON public.stakeholder_engagement_actions(status) WHERE is_deleted = FALSE;

ALTER TABLE public.stakeholder_engagement_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stakeholder_engagement_actions_select" ON public.stakeholder_engagement_actions;
CREATE POLICY "stakeholder_engagement_actions_select" ON public.stakeholder_engagement_actions
  FOR SELECT TO authenticated USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "stakeholder_engagement_actions_insert" ON public.stakeholder_engagement_actions;
CREATE POLICY "stakeholder_engagement_actions_insert" ON public.stakeholder_engagement_actions
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "stakeholder_engagement_actions_update" ON public.stakeholder_engagement_actions;
CREATE POLICY "stakeholder_engagement_actions_update" ON public.stakeholder_engagement_actions
  FOR UPDATE TO authenticated USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "stakeholder_engagement_actions_delete" ON public.stakeholder_engagement_actions;
CREATE POLICY "stakeholder_engagement_actions_delete" ON public.stakeholder_engagement_actions
  FOR DELETE TO authenticated USING (is_deleted = FALSE);

GRANT SELECT, INSERT, UPDATE ON public.stakeholder_engagement_actions TO authenticated;

-- =============================================================================
-- Simulator: sim.practice_engagement_actions
-- =============================================================================
CREATE TABLE IF NOT EXISTS sim.practice_engagement_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  practice_stakeholder_id UUID NOT NULL REFERENCES sim.practice_stakeholder_register(id) ON DELETE CASCADE,
  action_description TEXT NOT NULL,
  owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'completed', 'cancelled')),
  action_type TEXT DEFAULT 'other' CHECK (action_type IN ('meeting', 'email', 'workshop', 'report', 'call', 'other')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  completion_date DATE,
  outcome_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sim_practice_engagement_actions_project
  ON sim.practice_engagement_actions(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_practice_engagement_actions_stakeholder
  ON sim.practice_engagement_actions(practice_stakeholder_id) WHERE is_deleted = FALSE;

ALTER TABLE sim.practice_engagement_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "practice_engagement_actions_select" ON sim.practice_engagement_actions;
CREATE POLICY "practice_engagement_actions_select" ON sim.practice_engagement_actions
  FOR SELECT TO authenticated USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "practice_engagement_actions_insert" ON sim.practice_engagement_actions;
CREATE POLICY "practice_engagement_actions_insert" ON sim.practice_engagement_actions
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "practice_engagement_actions_update" ON sim.practice_engagement_actions;
CREATE POLICY "practice_engagement_actions_update" ON sim.practice_engagement_actions
  FOR UPDATE TO authenticated USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "practice_engagement_actions_delete" ON sim.practice_engagement_actions;
CREATE POLICY "practice_engagement_actions_delete" ON sim.practice_engagement_actions
  FOR DELETE TO authenticated USING (is_deleted = FALSE);

GRANT SELECT, INSERT, UPDATE ON sim.practice_engagement_actions TO authenticated;

-- =============================================================================
-- Register in database_tables
-- =============================================================================
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('stakeholder_engagement_actions', 'Per-stakeholder engagement action items (owner, due date, status)', false, true),
  ('sim.practice_engagement_actions', 'Simulator practice engagement action items', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();
