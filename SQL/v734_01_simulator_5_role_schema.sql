-- v734_01: Five-role simulator persona schema updates
-- Prerequisites: sim schema (v66)

-- Expand scenario target_role to v734 five personas (+ legacy values during migration)
ALTER TABLE sim.scenarios DROP CONSTRAINT IF EXISTS scenarios_target_role_check;
ALTER TABLE sim.scenarios ADD CONSTRAINT scenarios_target_role_check
  CHECK (target_role IN (
    'project_manager',
    'programme_manager',
    'portfolio_manager',
    'pmo_analyst',
    'project_coordinator',
    -- legacy (deprecated, retained for existing rows)
    'team_lead',
    'team_member'
  )) NOT VALID;

-- Validate after data review; safe on empty dev DBs
ALTER TABLE sim.scenarios VALIDATE CONSTRAINT scenarios_target_role_check;

ALTER TABLE sim.simulation_runs
  ADD COLUMN IF NOT EXISTS selected_role VARCHAR(50);

ALTER TABLE sim.simulation_runs DROP CONSTRAINT IF EXISTS simulation_runs_selected_role_check;
ALTER TABLE sim.simulation_runs ADD CONSTRAINT simulation_runs_selected_role_check
  CHECK (selected_role IS NULL OR selected_role IN (
    'project_manager',
    'programme_manager',
    'portfolio_manager',
    'pmo_analyst',
    'project_coordinator'
  ));

ALTER TABLE sim.user_progress DROP CONSTRAINT IF EXISTS user_progress_preferred_role_check;
ALTER TABLE sim.user_progress ADD CONSTRAINT user_progress_preferred_role_check
  CHECK (preferred_role IS NULL OR preferred_role IN (
    'project_manager',
    'programme_manager',
    'portfolio_manager',
    'pmo_analyst',
    'project_coordinator',
    'team_lead',
    'team_member'
  ));

CREATE TABLE IF NOT EXISTS sim.role_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id VARCHAR(50) NOT NULL,
  competency_key VARCHAR(100) NOT NULL,
  competency_label VARCHAR(200) NOT NULL,
  weight NUMERIC(5,2) NOT NULL DEFAULT 1.0 CHECK (weight > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (role_id, competency_key)
);

CREATE INDEX IF NOT EXISTS idx_role_competencies_role ON sim.role_competencies(role_id, sort_order);

ALTER TABLE sim.role_competencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS role_competencies_read ON sim.role_competencies;
CREATE POLICY role_competencies_read ON sim.role_competencies
  FOR SELECT TO authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS role_competencies_admin ON sim.role_competencies;
CREATE POLICY role_competencies_admin ON sim.role_competencies
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE sim.module_scores
  ADD COLUMN IF NOT EXISTS competency_key VARCHAR(100);

ALTER TABLE sim.npc_event_templates
  ADD COLUMN IF NOT EXISTS applicable_user_roles JSONB DEFAULT '[]'::jsonb;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.role_competencies', 'Competency framework weightings per simulator practice role', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();
