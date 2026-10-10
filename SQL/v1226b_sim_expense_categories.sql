-- ============================================================================
-- v1226b: Expense Categories lookup (Simulator) — sim.expense_categories
-- Mirrors v1226a. Prerequisites: public.users, public.is_pmo_admin_user (v258)
-- Part of v1226 itemized expense claims initiative
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.expense_categories (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code          VARCHAR(50) UNIQUE NOT NULL,
  category_name          VARCHAR(100) NOT NULL,
  category_description   TEXT,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             UUID REFERENCES public.users(id),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by             UUID REFERENCES public.users(id),
  deleted_at             TIMESTAMPTZ,
  deleted_by             UUID REFERENCES public.users(id)
);

COMMENT ON TABLE sim.expense_categories IS
  'v1226: Simulator mirror of public.expense_categories, scoped to the practice hierarchy.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_sim_expense_categories_code_unique
  ON sim.expense_categories(category_code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_expense_categories_active
  ON sim.expense_categories(is_active) WHERE is_deleted = FALSE;

ALTER TABLE sim.expense_categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.expense_categories TO authenticated;
GRANT ALL ON sim.expense_categories TO service_role;

DROP POLICY IF EXISTS policy_sim_expense_categories_read ON sim.expense_categories;
CREATE POLICY policy_sim_expense_categories_read ON sim.expense_categories
  FOR SELECT TO authenticated
  USING (is_deleted = FALSE);

DROP POLICY IF EXISTS policy_sim_expense_categories_pmo_admin_all ON sim.expense_categories;
CREATE POLICY policy_sim_expense_categories_pmo_admin_all ON sim.expense_categories
  FOR ALL TO authenticated
  USING (public.is_pmo_admin_user())
  WITH CHECK (public.is_pmo_admin_user());

INSERT INTO sim.expense_categories (category_code, category_name, category_description)
VALUES
  ('travel', 'Travel', 'Flights, trains, taxis, mileage'),
  ('meals', 'Meals', 'Meals and client entertainment'),
  ('accommodation', 'Accommodation', 'Hotels and lodging'),
  ('supplies', 'Supplies', 'Office and consumable supplies'),
  ('equipment', 'Equipment', 'Hardware and physical equipment'),
  ('software', 'Software', 'Software licences and subscriptions'),
  ('training', 'Training', 'Courses, certifications, conferences'),
  ('other', 'Other', 'Anything not covered by another category')
ON CONFLICT (category_code) DO NOTHING;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.expense_categories', 'Lookup table for expense claim line-item categories (Simulator, v1226)', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();
