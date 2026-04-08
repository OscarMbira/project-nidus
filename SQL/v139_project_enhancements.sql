-- =====================================================
-- v139: Project Enhancements Tables
-- =====================================================
-- Description: Additional tables for enhanced project management
-- Created: 2025-12-17
-- Dependencies: Existing projects table
-- Note: account_id columns are optional and will be populated if projects.account_id exists
-- =====================================================

-- Project Milestones Table
CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_name VARCHAR(255) NOT NULL,
  milestone_description TEXT,
  milestone_type VARCHAR(50) DEFAULT 'delivery', -- delivery, approval, review, payment
  target_date DATE NOT NULL,
  actual_date DATE,
  status VARCHAR(50) DEFAULT 'planned', -- planned, in_progress, achieved, missed, cancelled
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  responsible_user_id UUID,
  dependencies TEXT[], -- Array of dependent milestone IDs
  deliverables TEXT[], -- Array of expected deliverables
  is_critical BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ensure required columns exist (in case table was created without them previously)
DO $$
BEGIN
  -- Add target_date if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'project_milestones'
      AND column_name = 'target_date'
  ) THEN
    ALTER TABLE project_milestones ADD COLUMN target_date DATE;
  END IF;
  
  -- Add status if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'project_milestones'
      AND column_name = 'status'
  ) THEN
    ALTER TABLE project_milestones ADD COLUMN status VARCHAR(50) DEFAULT 'planned';
  END IF;
END $$;

-- Project Budgets Table
CREATE TABLE IF NOT EXISTS project_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  budget_category VARCHAR(100) NOT NULL, -- labor, materials, equipment, services, contingency
  planned_amount DECIMAL(15,2) DEFAULT 0.00,
  actual_amount DECIMAL(15,2) DEFAULT 0.00,
  committed_amount DECIMAL(15,2) DEFAULT 0.00,
  forecast_amount DECIMAL(15,2) DEFAULT 0.00,
  currency_code VARCHAR(3) DEFAULT 'USD',
  budget_period VARCHAR(50), -- annual, quarterly, monthly, one-time
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Project Baselines Table
CREATE TABLE IF NOT EXISTS project_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  baseline_name VARCHAR(255) NOT NULL,
  baseline_type VARCHAR(50) DEFAULT 'schedule', -- schedule, cost, scope, performance
  baseline_date DATE NOT NULL,
  baseline_data JSONB NOT NULL, -- Stores snapshot of project data
  approved_by UUID,
  approval_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  comments TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project Activity Log Table
CREATE TABLE IF NOT EXISTS project_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL, -- created, updated, deleted, completed, assigned, etc.
  entity_type VARCHAR(50) NOT NULL, -- project, task, risk, issue, document, etc.
  entity_id UUID,
  description TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  user_id UUID,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project Logs Table
CREATE TABLE IF NOT EXISTS project_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  log_type VARCHAR(50) DEFAULT 'general', -- general, decision, issue, risk, change
  log_title VARCHAR(255) NOT NULL,
  log_description TEXT NOT NULL,
  log_date DATE DEFAULT CURRENT_DATE,
  severity VARCHAR(20) DEFAULT 'info', -- info, warning, error, critical
  tags TEXT[],
  attachments JSONB,
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Project Archives Table
CREATE TABLE IF NOT EXISTS project_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  archive_reason VARCHAR(255),
  archive_date TIMESTAMP DEFAULT NOW(),
  archived_by UUID NOT NULL,
  project_data JSONB NOT NULL, -- Complete snapshot of project and related data
  can_restore BOOLEAN DEFAULT true,
  restoration_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ====================================
-- Indexes for Performance
-- ====================================
CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_target_date ON project_milestones(target_date);
CREATE INDEX IF NOT EXISTS idx_project_milestones_status ON project_milestones(status);

CREATE INDEX IF NOT EXISTS idx_project_budgets_project_id ON project_budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_project_budgets_category ON project_budgets(budget_category);

CREATE INDEX IF NOT EXISTS idx_project_baselines_project_id ON project_baselines(project_id);
CREATE INDEX IF NOT EXISTS idx_project_baselines_active ON project_baselines(is_active);

CREATE INDEX IF NOT EXISTS idx_project_activity_log_project_id ON project_activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_log_entity ON project_activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_log_created_at ON project_activity_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_logs_project_id ON project_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_logs_type ON project_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_project_logs_date ON project_logs(log_date DESC);

CREATE INDEX IF NOT EXISTS idx_project_archives_project_id ON project_archives(project_id);

-- ====================================
-- RLS Policies
-- ====================================

-- Project Milestones RLS
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view milestones in projects they have access to"
  ON project_milestones FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM user_projects
      WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND is_deleted = FALSE
    )
    OR
    project_id IN (
      SELECT id FROM projects
      WHERE owner_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND is_deleted = FALSE
    )
  );

CREATE POLICY "Users can create milestones in projects they manage"
  ON project_milestones FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM user_projects
      WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND access_level IN ('owner', 'admin')
        AND is_deleted = FALSE
    )
    OR
    project_id IN (
      SELECT id FROM projects
      WHERE owner_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND is_deleted = FALSE
    )
  );

CREATE POLICY "Users can update milestones in projects they manage"
  ON project_milestones FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM user_projects
      WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND access_level IN ('owner', 'admin')
        AND is_deleted = FALSE
    )
    OR
    project_id IN (
      SELECT id FROM projects
      WHERE owner_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND is_deleted = FALSE
    )
  );

-- Project Budgets RLS
ALTER TABLE project_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budgets in projects they have access to"
  ON project_budgets FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM user_projects
      WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND is_deleted = FALSE
    )
    OR
    project_id IN (
      SELECT id FROM projects
      WHERE owner_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND is_deleted = FALSE
    )
  );

CREATE POLICY "Users can manage budgets in projects they manage"
  ON project_budgets FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM user_projects
      WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND access_level IN ('owner', 'admin')
        AND is_deleted = FALSE
    )
    OR
    project_id IN (
      SELECT id FROM projects
      WHERE owner_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND is_deleted = FALSE
    )
  );

-- Project Baselines RLS
ALTER TABLE project_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view baselines in projects they have access to"
  ON project_baselines FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM user_projects
      WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND is_deleted = FALSE
    )
    OR
    project_id IN (
      SELECT id FROM projects
      WHERE owner_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND is_deleted = FALSE
    )
  );

-- Project Activity Log RLS
ALTER TABLE project_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity in projects they have access to"
  ON project_activity_log FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM user_projects
      WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND is_deleted = FALSE
    )
    OR
    project_id IN (
      SELECT id FROM projects
      WHERE owner_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND is_deleted = FALSE
    )
    OR project_id IS NULL
  );

CREATE POLICY "System can insert activity logs"
  ON project_activity_log FOR INSERT
  WITH CHECK (true);

-- Project Logs RLS
ALTER TABLE project_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs in projects they have access to"
  ON project_logs FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM user_projects
      WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND is_deleted = FALSE
    )
    OR
    project_id IN (
      SELECT id FROM projects
      WHERE owner_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND is_deleted = FALSE
    )
  );

CREATE POLICY "Users can manage logs in projects they manage"
  ON project_logs FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM user_projects
      WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND access_level IN ('owner', 'admin')
        AND is_deleted = FALSE
    )
    OR
    project_id IN (
      SELECT id FROM projects
      WHERE owner_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND is_deleted = FALSE
    )
  );

-- Project Archives RLS
ALTER TABLE project_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view archives in projects they have access to"
  ON project_archives FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM user_projects
      WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND is_deleted = FALSE
    )
    OR
    project_id IN (
      SELECT id FROM projects
      WHERE owner_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND is_deleted = FALSE
    )
  );

-- ====================================
-- Triggers
-- ====================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_enhancements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_milestones_updated_at
  BEFORE UPDATE ON project_milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_project_enhancements_updated_at();

CREATE TRIGGER project_budgets_updated_at
  BEFORE UPDATE ON project_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_project_enhancements_updated_at();

CREATE TRIGGER project_logs_updated_at
  BEFORE UPDATE ON project_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_project_enhancements_updated_at();

-- ====================================
-- Register tables in database_tables registry
-- ====================================
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('project_milestones', 'Project milestones and key deliverable dates', false, true),
  ('project_budgets', 'Project budget tracking by category', false, true),
  ('project_baselines', 'Project baseline snapshots for performance measurement', false, true),
  ('project_activity_log', 'Audit trail of all project-related activities', true, true),
  ('project_logs', 'Project decision and event logs', false, true),
  ('project_archives', 'Archived project data for completed/cancelled projects', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON project_milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_budgets TO authenticated;
GRANT SELECT, INSERT ON project_baselines TO authenticated;
GRANT SELECT, INSERT ON project_activity_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_logs TO authenticated;
GRANT SELECT, INSERT ON project_archives TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ v139: Project enhancement tables created successfully';
  RAISE NOTICE '   - project_milestones';
  RAISE NOTICE '   - project_budgets';
  RAISE NOTICE '   - project_baselines';
  RAISE NOTICE '   - project_activity_log';
  RAISE NOTICE '   - project_logs';
  RAISE NOTICE '   - project_archives';
END $$;
