-- ============================================================================
-- v414: sim.practice_project_statuses / sim.practice_project_types — GRANT + RLS
-- Date: 2026-04-09
--
-- Problem:
--   Platform PMO "Manager assignments" imports simManagerAssignmentService to add
--   Simulator practice assignment counts into the workload total. That path queries
--   sim.practice_project_statuses (lookup/reference data from v227).
--   v242 enabled RLS on many sim.practice_* tables but did NOT include these two
--   lookup tables, so they often have no GRANT to authenticated and/or RLS enabled
--   elsewhere with no SELECT policy → 403 / "permission denied for table".
--
-- Fix:
--   GRANT USAGE on schema sim, GRANT SELECT on both tables, ENABLE ROW LEVEL SECURITY,
--   and permissive SELECT policies for authenticated users (reference data).
-- Prerequisites: v227 (tables), sim schema exists
-- ============================================================================

-- Schema usage (required for REST to resolve sim.*)
GRANT USAGE ON SCHEMA sim TO authenticated;
GRANT USAGE ON SCHEMA sim TO anon;

-- Table privileges
GRANT SELECT ON sim.practice_project_statuses TO authenticated;
GRANT SELECT ON sim.practice_project_types TO authenticated;
GRANT ALL ON sim.practice_project_statuses TO service_role;
GRANT ALL ON sim.practice_project_types TO service_role;

-- RLS: reference/lookup — readable by any authenticated user (dropdowns + manager counts).
-- USAGE: simManagerAssignmentService loads all status rows then filters terminal codes in JS;
--        UI dropdowns often filter is_active in the query — permissive SELECT avoids hiding rows.
ALTER TABLE sim.practice_project_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_project_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "practice_project_statuses_authenticated_select" ON sim.practice_project_statuses;
CREATE POLICY "practice_project_statuses_authenticated_select"
  ON sim.practice_project_statuses
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "practice_project_types_authenticated_select" ON sim.practice_project_types;
CREATE POLICY "practice_project_types_authenticated_select"
  ON sim.practice_project_types
  FOR SELECT
  TO authenticated
  USING (TRUE);

COMMENT ON POLICY "practice_project_statuses_authenticated_select" ON sim.practice_project_statuses IS
  'Read-only lookup for practice project statuses (Platform manager workload + Simulator UI).';

COMMENT ON POLICY "practice_project_types_authenticated_select" ON sim.practice_project_types IS
  'Read-only lookup for practice project types (Simulator UI).';
