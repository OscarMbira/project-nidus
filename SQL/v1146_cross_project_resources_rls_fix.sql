-- =============================================================================
-- v1146: Add missing RLS policies for the v38 Cross-Project Resource Management
--        tables (bug fix, not a new feature)
-- =============================================================================
-- v38_cross_project_resources.sql turned RLS ON for 5 tables but left its only
-- example policy commented out ("customize as needed") — it was never written.
-- With RLS enabled and zero policies, Postgres denies ALL rows to every
-- non-superuser/non-bypassrls role by default: every SELECT silently returns
-- 0 rows, regardless of how much data exists. This is why Resource Plan
-- (resource_forecasts) and Capacity Planning's cross-project panels
-- (cross_project_resource_allocations, resource_capacity_plans) always showed
-- empty, even for v1145's seeded rows — not a seed-data gap, an RLS gap.
--
-- None of these 5 tables carry a reliable per-row tenant boundary of their
-- own (resource_forecasts/resource_capacity_plans have no project_id at all;
-- cross_project_utilization/resource_skills_matching are similarly unscoped).
-- The sibling tables in the same module (resources, resource_assignments,
-- resource_calendar — v27) have no RLS at all, i.e. are already fully open to
-- any authenticated user. To keep this module internally consistent rather
-- than half-locked-down, these 5 tables get the same "any authenticated user"
-- policy shape already used elsewhere in this codebase for similarly
-- unscoped tables (e.g. sim.timesheet_entries: FOR ALL USING (auth.uid() IS
-- NOT NULL)) — not a raw JOIN policy, matching the RLS incident pattern
-- already on file for this codebase (project_memory: RLS row_security=off).
--
-- Idempotent: DROP POLICY IF EXISTS before each CREATE POLICY.
-- =============================================================================

DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'cross_project_resource_allocations',
    'resource_capacity_plans',
    'resource_forecasts',
    'cross_project_utilization',
    'resource_skills_matching'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_table || '_select', v_table);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (auth.uid() IS NOT NULL)',
      v_table || '_select', v_table
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_table || '_insert', v_table);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)',
      v_table || '_insert', v_table
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_table || '_update', v_table);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE USING (auth.uid() IS NOT NULL)',
      v_table || '_update', v_table
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_table || '_delete', v_table);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE USING (auth.uid() IS NOT NULL)',
      v_table || '_delete', v_table
    );
  END LOOP;

  RAISE NOTICE 'v1146: RLS policies created for cross_project_resource_allocations, resource_capacity_plans, resource_forecasts, cross_project_utilization, resource_skills_matching.';
END $$;
