-- =============================================================================
-- v1010: Project-level industry classification
-- Purpose: Let a project be tagged with ONE of the organisation's already-selected
--          industries (account_industries), captured via the project wizard. Used to
--          narrow project-scoped roles' (pm/tm layout) sidebar industry sections to only
--          the industries of the project(s) they're actually assigned to, instead of
--          showing every industry the organisation has selected (which remains the
--          behaviour for org-wide roles: Account Owner, PMO Admin, Portfolio/Programme
--          Manager). See useMenu.js/useSimMenu.js (fetchMenuFromDB, applyFetchResult) and
--          organisationIndustryService.js (getMenuItemIndustryPackMap,
--          getUserProjectIndustryIds).
-- =============================================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS industry_category_id UUID REFERENCES industry_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_industry_category
  ON projects(industry_category_id)
  WHERE industry_category_id IS NOT NULL;

COMMENT ON COLUMN projects.industry_category_id IS
  'Which of the organisation''s selected industries (account_industries) this project belongs to. Captured via the project wizard''s Project Details step; dropdown is restricted to the account''s own selected industries, not the full industry_categories universe. Nullable — a project need not be classified.';

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1010_add_projects_industry_category.sql completed successfully';
  RAISE NOTICE '================================================';
END $$;
