-- ============================================================================
-- v357: Requirements register + traceability matrix (PMBOK 5.3)
-- Prerequisites: projects, users, stakeholders
-- ============================================================================

CREATE TABLE IF NOT EXISTS requirements_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requirement_code VARCHAR(100),
  name VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(50) CHECK (category IN ('business', 'functional', 'non_functional', 'technical', 'regulatory', 'other')),
  source_stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE SET NULL,
  priority VARCHAR(20) CHECK (priority IN ('must', 'should', 'could', 'wont')),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'deferred', 'rejected', 'implemented')),
  acceptance_criteria TEXT,
  traceability_tag VARCHAR(200),
  version VARCHAR(50) DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_requirements_register_project ON requirements_register(project_id) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS requirements_traceability_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES requirements_register(id) ON DELETE CASCADE,
  wbs_node_id UUID,
  deliverable_description TEXT,
  linked_test_id UUID,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_req_trace_requirement ON requirements_traceability_matrix(requirement_id) WHERE is_deleted = FALSE;

COMMENT ON TABLE requirements_register IS 'Collect Requirements (5.3) — project requirements register';
COMMENT ON TABLE requirements_traceability_matrix IS 'Requirements ↔ WBS / deliverables / tests traceability';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('requirements_register', 'Project requirements register', false, true),
  ('requirements_traceability_matrix', 'Traceability links for requirements', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();
