-- ============================================================================
-- v361: WBS nodes (5.5) — hierarchical scope decomposition
-- ============================================================================

CREATE TABLE IF NOT EXISTS wbs_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES wbs_nodes(id) ON DELETE SET NULL,
  wbs_code VARCHAR(100),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  level_num INTEGER DEFAULT 1 CHECK (level_num >= 1 AND level_num <= 20),
  work_package_id UUID REFERENCES work_packages(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_wbs_nodes_project ON wbs_nodes(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_wbs_nodes_parent ON wbs_nodes(parent_id) WHERE is_deleted = FALSE;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('wbs_nodes', 'Work breakdown structure nodes per project', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, updated_at = NOW();
