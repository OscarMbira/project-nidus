-- ============================================================================
-- v359: Scope statements (Process Guide 5.4)
-- ============================================================================

CREATE TABLE IF NOT EXISTS scope_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
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
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_scope_statements_project ON scope_statements(project_id) WHERE is_deleted = FALSE;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('scope_statements', 'Formal project scope statement', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, updated_at = NOW();
