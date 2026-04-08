-- =============================================
-- v250: Constraint Categories and Mandate Constraints Tables
-- Version: v250
-- Date: 2026-01-26
-- Description: Creates structured constraint management for project mandates
-- =============================================

-- =============================================
-- 1. CONSTRAINT CATEGORIES LOOKUP TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS constraint_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  value_type VARCHAR(20) NOT NULL CHECK (value_type IN ('numeric', 'text', 'dropdown', 'date')),
  supports_operands BOOLEAN DEFAULT FALSE,
  unit_options JSONB,
  operand_options JSONB,
  dropdown_options JSONB,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_constraint_categories_code ON constraint_categories(code);
CREATE INDEX IF NOT EXISTS idx_constraint_categories_active ON constraint_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_constraint_categories_display_order ON constraint_categories(display_order);

-- Grant permissions
GRANT SELECT ON constraint_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mandate_constraints TO authenticated;

-- Enable RLS
ALTER TABLE constraint_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandate_constraints ENABLE ROW LEVEL SECURITY;

-- RLS Policies for constraint_categories (read-only for all authenticated users)
DROP POLICY IF EXISTS "constraint_categories_select_policy" ON constraint_categories;
CREATE POLICY "constraint_categories_select_policy" ON constraint_categories
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Only admins can modify constraint categories
DROP POLICY IF EXISTS "constraint_categories_insert_policy" ON constraint_categories;
CREATE POLICY "constraint_categories_insert_policy" ON constraint_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN users u ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND r.role_name IN ('System Admin', 'PMO Admin', 'pmo_admin', 'system_admin')
      AND ur.is_active = TRUE
      AND ur.is_deleted = FALSE
    )
  );

DROP POLICY IF EXISTS "constraint_categories_update_policy" ON constraint_categories;
CREATE POLICY "constraint_categories_update_policy" ON constraint_categories
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN users u ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND r.role_name IN ('System Admin', 'PMO Admin', 'pmo_admin', 'system_admin')
      AND ur.is_active = TRUE
      AND ur.is_deleted = FALSE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN users u ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND r.role_name IN ('System Admin', 'PMO Admin', 'pmo_admin', 'system_admin')
      AND ur.is_active = TRUE
      AND ur.is_deleted = FALSE
    )
  );

DROP POLICY IF EXISTS "constraint_categories_delete_policy" ON constraint_categories;
CREATE POLICY "constraint_categories_delete_policy" ON constraint_categories
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN users u ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND r.role_name IN ('System Admin', 'PMO Admin', 'pmo_admin', 'system_admin')
      AND ur.is_active = TRUE
      AND ur.is_deleted = FALSE
    )
  );

-- =============================================
-- 2. SEED CONSTRAINT CATEGORIES DATA
-- =============================================

INSERT INTO constraint_categories (code, name, description, value_type, supports_operands, unit_options, operand_options, dropdown_options, display_order) VALUES
-- Core Constraints
('C01', 'Cost', 'Budget limits, funding caps, cost overruns', 'numeric', true,
  '["$", "£", "€", "ZAR", "AUD", "CAD"]'::jsonb,
  '["=", "<", "<=", ">", ">=", "between"]'::jsonb,
  NULL, 1),
('C02', 'Time', 'Schedule, milestones, deadlines', 'numeric', true,
  '["days", "weeks", "months", "years"]'::jsonb,
  '["=", "<", "<=", ">", ">=", "between"]'::jsonb,
  NULL, 2),
('C03', 'Scope', 'Deliverables, features, boundaries', 'text', false, NULL, NULL, NULL, 3),

-- Extended Constraints
('C04', 'Quality', 'Acceptance criteria, standards, defects', 'numeric', true,
  '["%", "score", "defects per 1000"]'::jsonb,
  '["=", "<", "<=", ">", ">=", "between"]'::jsonb,
  NULL, 4),
('C05', 'Risk', 'Risk appetite, exposure, uncertainty', 'dropdown', false,
  NULL, NULL,
  '["Very Low", "Low", "Medium", "High", "Very High"]'::jsonb, 5),
('C06', 'Benefits', 'ROI, value delivery, strategic outcomes', 'numeric', true,
  '["$", "%", "score", "units"]'::jsonb,
  '["=", "<", "<=", ">", ">=", "between"]'::jsonb,
  NULL, 6),

-- Resource & Capability Constraints
('C07', 'Resources', 'Skills, availability, key-person dependency', 'numeric', true,
  '["FTE", "headcount", "hours", "days"]'::jsonb,
  '["=", "<", "<=", ">", ">=", "between"]'::jsonb,
  NULL, 7),
('C08', 'Capacity', 'Workload, infrastructure limits', 'numeric', true,
  '["%", "units", "hours", "GB", "TB"]'::jsonb,
  '["=", "<", "<=", ">", ">=", "between"]'::jsonb,
  NULL, 8),
('C09', 'Technology', 'Legacy systems, tool compatibility', 'text', false, NULL, NULL, NULL, 9),

-- Governance & Compliance Constraints
('C10', 'Governance', 'Approval layers, authority levels', 'text', false, NULL, NULL, NULL, 10),
('C11', 'Compliance', 'Legal, regulatory, audit requirements', 'text', false, NULL, NULL, NULL, 11),
('C12', 'Contractual', 'SLAs, penalties, vendor terms', 'text', false, NULL, NULL, NULL, 12),

-- Environmental & Organisational Constraints
('C13', 'Stakeholders', 'Conflicting interests, availability', 'text', false, NULL, NULL, NULL, 13),
('C14', 'Culture', 'Change resistance, risk tolerance', 'text', false, NULL, NULL, NULL, 14),
('C15', 'External Environment', 'Market, suppliers, economy', 'text', false, NULL, NULL, NULL, 15),

-- Information & Data Constraints
('C16', 'Communication', 'Reporting, information flow', 'text', false, NULL, NULL, NULL, 16),
('C17', 'Data', 'Quality, migration readiness, security', 'text', false, NULL, NULL, NULL, 17)

ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  value_type = EXCLUDED.value_type,
  supports_operands = EXCLUDED.supports_operands,
  unit_options = EXCLUDED.unit_options,
  operand_options = EXCLUDED.operand_options,
  dropdown_options = EXCLUDED.dropdown_options,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- =============================================
-- 3. MANDATE CONSTRAINTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS mandate_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id UUID NOT NULL REFERENCES project_mandates(id) ON DELETE CASCADE,
  constraint_category_id UUID NOT NULL REFERENCES constraint_categories(id),
  operand VARCHAR(10) CHECK (operand IN ('=', '<', '<=', '>', '>=', 'between') OR operand IS NULL),
  value_numeric DECIMAL(15,2),
  value_min DECIMAL(15,2),
  value_max DECIMAL(15,2),
  value_text TEXT,
  value_date DATE,
  unit VARCHAR(50),
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure range values are valid when using 'between' operand
  CONSTRAINT valid_range CHECK (
    operand != 'between' OR (value_min IS NOT NULL AND value_max IS NOT NULL AND value_min <= value_max)
  )
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_mandate_constraints_mandate_id ON mandate_constraints(mandate_id);
CREATE INDEX IF NOT EXISTS idx_mandate_constraints_category_id ON mandate_constraints(constraint_category_id);
CREATE INDEX IF NOT EXISTS idx_mandate_constraints_active ON mandate_constraints(is_active);

-- Grant permissions BEFORE enabling RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON mandate_constraints TO authenticated;

-- Enable RLS
ALTER TABLE mandate_constraints ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mandate_constraints
DROP POLICY IF EXISTS "mandate_constraints_select_policy" ON mandate_constraints;
CREATE POLICY "mandate_constraints_select_policy" ON mandate_constraints
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_mandates pm
      WHERE pm.id = mandate_constraints.mandate_id
    )
  );

DROP POLICY IF EXISTS "mandate_constraints_insert_policy" ON mandate_constraints;
CREATE POLICY "mandate_constraints_insert_policy" ON mandate_constraints
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_mandates pm
      WHERE pm.id = mandate_constraints.mandate_id
    )
  );

DROP POLICY IF EXISTS "mandate_constraints_update_policy" ON mandate_constraints;
CREATE POLICY "mandate_constraints_update_policy" ON mandate_constraints
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_mandates pm
      WHERE pm.id = mandate_constraints.mandate_id
    )
  );

DROP POLICY IF EXISTS "mandate_constraints_delete_policy" ON mandate_constraints;
CREATE POLICY "mandate_constraints_delete_policy" ON mandate_constraints
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_mandates pm
      WHERE pm.id = mandate_constraints.mandate_id
    )
  );

-- =============================================
-- 4. UPDATE TRIGGER FOR TIMESTAMPS
-- =============================================

CREATE OR REPLACE FUNCTION update_constraint_categories_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_constraint_categories_timestamp ON constraint_categories;
CREATE TRIGGER trigger_update_constraint_categories_timestamp
  BEFORE UPDATE ON constraint_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_constraint_categories_timestamp();

CREATE OR REPLACE FUNCTION update_mandate_constraints_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mandate_constraints_timestamp ON mandate_constraints;
CREATE TRIGGER trigger_update_mandate_constraints_timestamp
  BEFORE UPDATE ON mandate_constraints
  FOR EACH ROW
  EXECUTE FUNCTION update_mandate_constraints_timestamp();

-- =============================================
-- 5. REGISTER TABLES IN DATABASE_TABLES REGISTRY
-- =============================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('constraint_categories', 'Lookup table for constraint categories with configuration for value types, operands, and units', false, true),
  ('mandate_constraints', 'Structured constraints assigned to project mandates with operands, values, and ranges', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- =============================================
-- 6. HELPER FUNCTION TO GET CONSTRAINTS BY MANDATE
-- =============================================

CREATE OR REPLACE FUNCTION get_mandate_constraints(p_mandate_id UUID)
RETURNS TABLE (
  id UUID,
  mandate_id UUID,
  category_code VARCHAR(10),
  category_name VARCHAR(100),
  value_type VARCHAR(20),
  operand VARCHAR(10),
  value_numeric DECIMAL(15,2),
  value_min DECIMAL(15,2),
  value_max DECIMAL(15,2),
  value_text TEXT,
  value_date DATE,
  unit VARCHAR(50),
  notes TEXT,
  display_order INTEGER,
  formatted_value TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mc.id,
    mc.mandate_id,
    cc.code AS category_code,
    cc.name AS category_name,
    cc.value_type,
    mc.operand,
    mc.value_numeric,
    mc.value_min,
    mc.value_max,
    mc.value_text,
    mc.value_date,
    mc.unit,
    mc.notes,
    mc.display_order,
    CASE
      WHEN cc.value_type = 'numeric' AND mc.operand = 'between' THEN
        COALESCE(mc.unit, '') || ' ' || mc.value_min::TEXT || ' - ' || mc.value_max::TEXT
      WHEN cc.value_type = 'numeric' THEN
        COALESCE(mc.operand, '') || ' ' || COALESCE(mc.unit, '') || mc.value_numeric::TEXT
      WHEN cc.value_type = 'date' THEN
        mc.value_date::TEXT
      WHEN cc.value_type = 'dropdown' THEN
        mc.value_text
      ELSE
        mc.value_text
    END AS formatted_value
  FROM mandate_constraints mc
  JOIN constraint_categories cc ON mc.constraint_category_id = cc.id
  WHERE mc.mandate_id = p_mandate_id
    AND mc.is_active = true
  ORDER BY mc.display_order, cc.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_mandate_constraints(UUID) TO authenticated;

-- =============================================
-- VERIFICATION QUERIES (Comment out in production)
-- =============================================

-- SELECT * FROM constraint_categories ORDER BY display_order;
-- SELECT COUNT(*) as category_count FROM constraint_categories;
