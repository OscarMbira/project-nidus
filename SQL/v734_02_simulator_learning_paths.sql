-- v734_02: Role-specific learning paths
-- Prerequisites: sim schema (v66), v734_01

CREATE TABLE IF NOT EXISTS sim.learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  sequence INTEGER NOT NULL DEFAULT 0,
  modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_hours NUMERIC(6,2) NOT NULL DEFAULT 1.0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_paths_role ON sim.learning_paths(role_id, sequence);

CREATE TABLE IF NOT EXISTS sim.learning_path_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path_id UUID NOT NULL REFERENCES sim.learning_paths(id) ON DELETE CASCADE,
  module_id VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  score NUMERIC(5,2),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, path_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_path_progress_user ON sim.learning_path_progress(user_id, path_id);

ALTER TABLE sim.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.learning_path_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS learning_paths_read ON sim.learning_paths;
CREATE POLICY learning_paths_read ON sim.learning_paths
  FOR SELECT TO authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS learning_path_progress_own ON sim.learning_path_progress;
CREATE POLICY learning_path_progress_own ON sim.learning_path_progress
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.learning_paths', 'Role-specific guided learning journeys in the simulator', false, true),
  ('sim.learning_path_progress', 'Per-user progress through learning path modules', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();
