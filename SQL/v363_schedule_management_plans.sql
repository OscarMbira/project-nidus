-- ============================================================================
-- v363: Schedule management plans (PMBOK 5.6)
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedule_management_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scheduling_methodology TEXT,
  scheduling_tool TEXT,
  level_of_accuracy TEXT,
  units_of_measure TEXT,
  control_thresholds JSONB DEFAULT '{}'::jsonb,
  reporting_formats TEXT,
  schedule_model_maintenance TEXT,
  variance_thresholds JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'draft',
  version VARCHAR(50) DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_schedule_mgmt_plans_project ON schedule_management_plans(project_id) WHERE is_deleted = FALSE;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('schedule_management_plans', 'Schedule management approach per project', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, updated_at = NOW();
