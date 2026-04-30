-- ============================================================================
-- v367: Activity dependencies / sequencing (Process Guide 5.8)
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  predecessor_activity_id UUID NOT NULL REFERENCES activity_list(id) ON DELETE CASCADE,
  successor_activity_id UUID NOT NULL REFERENCES activity_list(id) ON DELETE CASCADE,
  dependency_type VARCHAR(5) NOT NULL DEFAULT 'FS' CHECK (dependency_type IN ('FS', 'SS', 'FF', 'SF')),
  lag_days NUMERIC(10,2) DEFAULT 0,
  dependency_category VARCHAR(50) CHECK (dependency_category IN (
    'mandatory', 'discretionary', 'external', 'internal', 'other'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  CONSTRAINT activity_dep_distinct CHECK (predecessor_activity_id <> successor_activity_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_deps_project ON activity_dependencies(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_activity_deps_pred ON activity_dependencies(predecessor_activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_deps_succ ON activity_dependencies(successor_activity_id);

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('activity_dependencies', 'Logical relationships between scheduled activities', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, updated_at = NOW();
