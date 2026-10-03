-- =============================================================================
-- v1148: Resource Categories — lightweight, extensible lookup for
--        resources.resource_category / resource_forecasts.resource_category
-- =============================================================================
-- Both columns are free text today (resources.resource_category,
-- resource_forecasts.resource_category — both v27/v38). This adds a small
-- shared lookup so the "Resource Category" field can become a searchable
-- dropdown with an inline "add new category if missing" action, instead of
-- staying an unconstrained text box. Deliberately NOT the system roles
-- catalogue (public.roles / project_roles) — those govern permissions and
-- menu access; this is just resource categorisation and must not be
-- conflated with access control.
-- Prerequisites: v27_resource_planning.sql (resources table exists).
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING.
-- =============================================================================

CREATE TABLE IF NOT EXISTS resource_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name VARCHAR(150) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_resource_categories_name_unique
  ON resource_categories (lower(category_name)) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_resource_categories_active
  ON resource_categories (is_active) WHERE is_deleted = FALSE;

ALTER TABLE resource_categories ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can view and add categories (matches resources'
-- own lack of RLS, and the v1146 fix pattern for this same module — no
-- policy gap this time).
DROP POLICY IF EXISTS resource_categories_select ON resource_categories;
CREATE POLICY resource_categories_select ON resource_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS resource_categories_insert ON resource_categories;
CREATE POLICY resource_categories_insert ON resource_categories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS resource_categories_update ON resource_categories;
CREATE POLICY resource_categories_update ON resource_categories
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS resource_categories_delete ON resource_categories;
CREATE POLICY resource_categories_delete ON resource_categories
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- Seed: role-style categories the user asked for, plus the discipline-style
-- categories already referenced elsewhere in the app (ResourceForecasts.jsx's
-- filter list, and v1145's Velocity Freight seed data) so existing free-text
-- values resolve to a real lookup row.
-- ---------------------------------------------------------------------------
INSERT INTO resource_categories (id, category_name, description) VALUES
  ('11480001-c701-4a01-9c01-534433340001', 'PMO', 'Project Management Office'),
  ('11480001-c701-4a01-9c01-534433340002', 'Project Manager', 'Project Manager (PM)'),
  ('11480001-c701-4a01-9c01-534433340003', 'Team Manager', 'Team Manager'),
  ('11480001-c701-4a01-9c01-534433340004', 'Team Lead', 'Team Lead'),
  ('11480001-c701-4a01-9c01-534433340005', 'Developer', NULL),
  ('11480001-c701-4a01-9c01-534433340006', 'Designer', NULL),
  ('11480001-c701-4a01-9c01-534433340007', 'Business Analyst', NULL),
  ('11480001-c701-4a01-9c01-534433340008', 'QA/Tester', NULL),
  ('11480001-c701-4a01-9c01-534433340009', 'Route Planning', NULL),
  ('11480001-c701-4a01-9c01-534433340010', 'Dispatch', NULL),
  ('11480001-c701-4a01-9c01-534433340011', 'Fleet Operations', NULL),
  ('11480001-c701-4a01-9c01-534433340012', 'Driver Relations', NULL)
ON CONFLICT (id) DO NOTHING;

-- Register in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('resource_categories', 'Extensible lookup of resource/skill categories used by the Resources module (resources, resource_forecasts)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$ BEGIN
  RAISE NOTICE 'v1148: resource_categories table, RLS, and seed data ready.';
END $$;
