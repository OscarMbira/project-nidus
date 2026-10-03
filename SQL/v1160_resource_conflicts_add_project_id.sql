-- =============================================================================
-- v1160: Add missing project_id to resource_conflicts (fixes Resource Conflicts
--        / Cross-Project Resources pages: "Could not find a relationship between
--        'resource_conflicts' and 'project_id' in the schema cache")
-- =============================================================================
-- resource_conflicts was created in v27_resource_planning.sql with only
-- resource_id (no project context). v38_cross_project_resources.sql later
-- added portfolio_id and programme_id for cross-project scoping but missed
-- project_id — an oversight, since the app's service layer
-- (crossResourceService.js getResourceConflicts) has always queried/filtered
-- by project_id and embedded `project:project_id(...)`, which PostgREST can
-- only resolve once the column + FK actually exist. This was never caught
-- because the page consuming it (ResourceConflicts.jsx / CrossProjectResources
-- Quick Links) was never wired into routing until now (see v1158).
--
-- Mirrors the exact pattern v38 used for portfolio_id/programme_id.
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'resource_conflicts'
        AND column_name = 'project_id'
    ) THEN
        ALTER TABLE public.resource_conflicts
        ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_resource_conflicts_project
        ON public.resource_conflicts(project_id) WHERE is_deleted = false;
    END IF;

    RAISE NOTICE 'Added project_id to resource_conflicts';
END $$;
