-- =============================================================================
-- v471: programme_projects — SELECT RLS + grants (dashboard & assignments)
-- Purpose: v37 enabled RLS on programme_projects but defined no policies, so
--          authenticated SELECT returned no rows (breaks executive summary and
--          any client that reads programme–project links).
-- Mirrors: v278 portfolio_projects (SELECT / INSERT / UPDATE for authenticated).
-- Database: PostgreSQL 15+ (Supabase public schema)
-- =============================================================================

DROP POLICY IF EXISTS policy_programme_projects_select ON programme_projects;
DROP POLICY IF EXISTS policy_programme_projects_insert ON programme_projects;
DROP POLICY IF EXISTS policy_programme_projects_update ON programme_projects;

ALTER TABLE programme_projects ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON programme_projects TO authenticated;

CREATE POLICY policy_programme_projects_select ON programme_projects
    FOR SELECT
    TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_programme_projects_insert ON programme_projects
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_programme_projects_update ON programme_projects
    FOR UPDATE
    TO authenticated
    USING (is_deleted = FALSE);

COMMENT ON POLICY policy_programme_projects_select ON programme_projects IS
  'v471: Allow authenticated users to read non-deleted programme–project links (dashboard, PMO UI).';
