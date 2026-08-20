-- ============================================================================
-- v906: Industry Role Catalog — schema (Phase 1 of 4)
-- ============================================================================
-- See projectprd/v906_industry_role_catalog_and_level_restriction_PRD.md and
-- projectplan/v906_industry_role_catalog_and_level_restriction_plan.md.
--
-- 1. New public.industry_categories lookup table (rule 25.1 — DB-driven dropdown
--    data, matches the existing `countries` reference-table convention).
-- 2. Nullable industry_category_id FK on public.project_roles and public.roles,
--    so a built-in role can optionally be tagged with the industry it belongs to.
--    NULL = generic/methodology role (the original 10 + Cross-Industry group).
-- Prerequisites: v902_organisation_custom_roles_schema.sql (account_id columns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.industry_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_industry_categories_name
  ON public.industry_categories (name)
  WHERE is_active = TRUE;

COMMENT ON TABLE public.industry_categories IS
  'Reference list of industries used to tag built-in project_roles templates (v906), so Manage '
  'Roles can filter its role catalog by industry.';

ALTER TABLE public.industry_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_industry_categories_select_all ON public.industry_categories;
CREATE POLICY policy_industry_categories_select_all
  ON public.industry_categories
  FOR SELECT
  TO authenticated, anon
  USING (is_active = TRUE);

GRANT SELECT ON public.industry_categories TO authenticated, anon;
GRANT ALL ON public.industry_categories TO service_role;

ALTER TABLE public.project_roles
  ADD COLUMN IF NOT EXISTS industry_category_id UUID REFERENCES public.industry_categories(id);

ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS industry_category_id UUID REFERENCES public.industry_categories(id);

COMMENT ON COLUMN public.project_roles.industry_category_id IS
  'Optional industry tag for built-in template roles (v906). NULL = generic/methodology role.';
COMMENT ON COLUMN public.roles.industry_category_id IS
  'Optional industry tag mirroring the paired project_roles row (v906). NULL = generic role.';

CREATE INDEX IF NOT EXISTS idx_project_roles_industry_category
  ON public.project_roles(industry_category_id) WHERE industry_category_id IS NOT NULL;

-- Register new table in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('industry_categories', 'Reference list of industries used to tag built-in project role templates', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v906 schema: industry_categories table + industry_category_id columns added';
END $$;
