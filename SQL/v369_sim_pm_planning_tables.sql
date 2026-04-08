-- ============================================================================
-- v369–v380 (combined): Simulator PM planning tables (sim schema)
-- Parity with public scope/schedule planning. practice_project_id → sim.practice_projects
-- Date: 2026-03-31
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.scope_management_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  scope_definition_approach TEXT,
  change_control_process TEXT,
  scope_validation_method TEXT,
  deliverable_acceptance_process TEXT,
  roles_responsibilities TEXT,
  wbs_maintenance_process TEXT,
  scope_baseline_info TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  version VARCHAR(50) DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.requirements_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  requirement_code VARCHAR(100),
  name VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  source_stakeholder_id UUID,
  priority VARCHAR(20),
  status VARCHAR(50) DEFAULT 'draft',
  acceptance_criteria TEXT,
  traceability_tag VARCHAR(200),
  version VARCHAR(50) DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.requirements_traceability_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES sim.requirements_register(id) ON DELETE CASCADE,
  wbs_node_id UUID,
  deliverable_description TEXT,
  linked_test_id UUID,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.scope_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  project_description TEXT,
  product_scope_description TEXT,
  in_scope TEXT[] DEFAULT '{}',
  out_of_scope TEXT[] DEFAULT '{}',
  key_deliverables TEXT[] DEFAULT '{}',
  acceptance_criteria TEXT[] DEFAULT '{}',
  constraints TEXT[] DEFAULT '{}',
  assumptions TEXT[] DEFAULT '{}',
  exclusions TEXT[] DEFAULT '{}',
  revision_history JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) DEFAULT 'draft',
  version VARCHAR(50) DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.wbs_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES sim.wbs_nodes(id) ON DELETE SET NULL,
  wbs_code VARCHAR(100),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  level_num INTEGER DEFAULT 1 CHECK (level_num >= 1 AND level_num <= 20),
  work_package_id UUID REFERENCES sim.practice_work_packages(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.schedule_management_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
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
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.activity_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  wbs_node_id UUID REFERENCES sim.wbs_nodes(id) ON DELETE SET NULL,
  activity_code VARCHAR(100),
  name VARCHAR(500) NOT NULL,
  description TEXT,
  is_milestone BOOLEAN DEFAULT FALSE,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  estimation_technique VARCHAR(50),
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
  duration_unit VARCHAR(20) DEFAULT 'days',
  basis_of_estimate TEXT,
  resource_requirements TEXT,
  constraints TEXT,
  assumptions TEXT,
  status VARCHAR(50) DEFAULT 'not_started',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.activity_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  predecessor_activity_id UUID NOT NULL REFERENCES sim.activity_list(id) ON DELETE CASCADE,
  successor_activity_id UUID NOT NULL REFERENCES sim.activity_list(id) ON DELETE CASCADE,
  dependency_type VARCHAR(5) NOT NULL DEFAULT 'FS',
  lag_days NUMERIC(10,2) DEFAULT 0,
  dependency_category VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  CONSTRAINT sim_activity_dep_distinct CHECK (predecessor_activity_id <> successor_activity_id)
);

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('sim.scope_management_plans', 'Simulator scope management plans', false, true, 'simulation'),
  ('sim.requirements_register', 'Simulator requirements register', false, true, 'simulation'),
  ('sim.requirements_traceability_matrix', 'Simulator requirements traceability', false, true, 'simulation'),
  ('sim.scope_statements', 'Simulator scope statements', false, true, 'simulation'),
  ('sim.wbs_nodes', 'Simulator WBS nodes', false, true, 'simulation'),
  ('sim.schedule_management_plans', 'Simulator schedule management plans', false, true, 'simulation'),
  ('sim.activity_list', 'Simulator activity list', false, true, 'simulation'),
  ('sim.activity_dependencies', 'Simulator activity dependencies', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();
