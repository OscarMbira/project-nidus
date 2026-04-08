-- =====================================================
-- v296: Grant SELECT on resources table for Dependency Map
-- =====================================================
-- Fixes "permission denied for table resources" when loading
-- the Dependency Map (inter_project_dependencies embeds
-- required_resource from resources).
-- =====================================================

GRANT SELECT ON resources TO authenticated;

-- If RLS is enabled on resources, allow authenticated to read
DO $$
BEGIN
  IF (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.resources'::regclass) THEN
    DROP POLICY IF EXISTS policy_resources_select_authenticated ON resources;
    CREATE POLICY policy_resources_select_authenticated ON resources
      FOR SELECT TO authenticated
      USING (is_deleted = FALSE);
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
END $$;
