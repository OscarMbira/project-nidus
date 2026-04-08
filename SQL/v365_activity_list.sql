-- ============================================================================
-- v365: Activity list + duration estimation (PMBOK 5.7, 5.9)
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  wbs_node_id UUID REFERENCES wbs_nodes(id) ON DELETE SET NULL,
  activity_code VARCHAR(100),
  name VARCHAR(500) NOT NULL,
  description TEXT,
  is_milestone BOOLEAN DEFAULT FALSE,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  estimation_technique VARCHAR(50) CHECK (estimation_technique IN (
    'expert_judgement', 'analogous', 'parametric', 'three_point', 'pert', 'other'
  )),
  optimistic_duration NUMERIC(14,4),
  most_likely_duration NUMERIC(14,4),
  pessimistic_duration NUMERIC(14,4),
  expected_duration NUMERIC(14,4) GENERATED ALWAYS AS (
    CASE
      WHEN optimistic_duration IS NOT NULL AND most_likely_duration IS NOT NULL AND pessimistic_duration IS NOT NULL
      THEN (optimistic_duration + (4 * most_likely_duration) + pessimistic_duration) / 6
      ELSE NULL
    END
  ) STORED,
  standard_deviation NUMERIC(14,4) GENERATED ALWAYS AS (
    CASE
      WHEN optimistic_duration IS NOT NULL AND pessimistic_duration IS NOT NULL
      THEN (pessimistic_duration - optimistic_duration) / 6
      ELSE NULL
    END
  ) STORED,
  duration_unit VARCHAR(20) DEFAULT 'days' CHECK (duration_unit IN ('hours', 'days', 'weeks')),
  basis_of_estimate TEXT,
  resource_requirements TEXT,
  constraints TEXT,
  assumptions TEXT,
  status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'in_progress', 'completed', 'on_hold'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_activity_list_project ON activity_list(project_id) WHERE is_deleted = FALSE;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('activity_list', 'Scheduled activities with duration estimation', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, updated_at = NOW();
