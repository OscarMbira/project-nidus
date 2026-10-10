-- ============================================================================
-- v1226a: Expense Categories lookup (Platform) — public.expense_categories
-- Prerequisites: users, roles, user_roles, database_tables
-- Part of v1226 itemized expense claims initiative
-- (projectprd/v1226_itemized_expense_claims_PRD.md /
--  projectplan/v1226_itemized_expense_claims_plan.md)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.expense_categories (
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

COMMENT ON TABLE public.expense_categories IS
  'v1226: Lookup table for expense claim line-item categories (Travel, Meals, etc).';

CREATE UNIQUE INDEX IF NOT EXISTS idx_expense_categories_code_unique
  ON public.expense_categories(category_code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_expense_categories_active
  ON public.expense_categories(is_active) WHERE is_deleted = FALSE;

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;

DROP POLICY IF EXISTS policy_expense_categories_read ON public.expense_categories;
CREATE POLICY policy_expense_categories_read ON public.expense_categories
  FOR SELECT TO authenticated
  USING (is_deleted = FALSE);

DROP POLICY IF EXISTS policy_expense_categories_pmo_admin_all ON public.expense_categories;
CREATE POLICY policy_expense_categories_pmo_admin_all ON public.expense_categories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      JOIN public.users u ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND r.role_name IN ('pmo_admin', 'system_admin')
        AND ur.is_deleted = FALSE AND ur.is_active = TRUE
        AND r.is_deleted = FALSE AND r.is_active = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      JOIN public.users u ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND r.role_name IN ('pmo_admin', 'system_admin')
        AND ur.is_deleted = FALSE AND ur.is_active = TRUE
        AND r.is_deleted = FALSE AND r.is_active = TRUE
    )
  );

INSERT INTO public.expense_categories (category_code, category_name, category_description)
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
  ('expense_categories', 'Lookup table for expense claim line-item categories (v1226)', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();
