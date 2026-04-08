-- =============================================================================
-- v319: Stakeholder Relationships (Platform + Simulator)
-- Purpose: Inter-stakeholder relationship types for a project.
-- Tables: public.stakeholder_relationships, sim.practice_stakeholder_relationships
-- Safe to re-run: CREATE IF NOT EXISTS, DROP POLICY IF EXISTS
-- =============================================================================

-- =============================================================================
-- Platform: public.stakeholder_relationships
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.stakeholder_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  from_stakeholder_id UUID NOT NULL REFERENCES public.stakeholders(id) ON DELETE CASCADE,
  to_stakeholder_id UUID NOT NULL REFERENCES public.stakeholders(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'influences', 'collaborates-with', 'conflicts-with', 'reports-to',
    'advises', 'depends-on'
  )),
  relationship_strength SMALLINT CHECK (relationship_strength IS NULL OR (relationship_strength >= 1 AND relationship_strength <= 5)),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  UNIQUE(project_id, from_stakeholder_id, to_stakeholder_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_stakeholder_relationships_project
  ON public.stakeholder_relationships(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_relationships_from
  ON public.stakeholder_relationships(from_stakeholder_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_relationships_to
  ON public.stakeholder_relationships(to_stakeholder_id) WHERE is_deleted = FALSE;

ALTER TABLE public.stakeholder_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stakeholder_relationships_select" ON public.stakeholder_relationships;
CREATE POLICY "stakeholder_relationships_select" ON public.stakeholder_relationships
  FOR SELECT TO authenticated USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "stakeholder_relationships_insert" ON public.stakeholder_relationships;
CREATE POLICY "stakeholder_relationships_insert" ON public.stakeholder_relationships
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "stakeholder_relationships_update" ON public.stakeholder_relationships;
CREATE POLICY "stakeholder_relationships_update" ON public.stakeholder_relationships
  FOR UPDATE TO authenticated USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "stakeholder_relationships_delete" ON public.stakeholder_relationships;
CREATE POLICY "stakeholder_relationships_delete" ON public.stakeholder_relationships
  FOR DELETE TO authenticated USING (is_deleted = FALSE);

GRANT SELECT, INSERT, UPDATE ON public.stakeholder_relationships TO authenticated;

-- =============================================================================
-- Simulator: sim.practice_stakeholder_relationships
-- =============================================================================
CREATE TABLE IF NOT EXISTS sim.practice_stakeholder_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  from_stakeholder_id UUID NOT NULL REFERENCES sim.practice_stakeholder_register(id) ON DELETE CASCADE,
  to_stakeholder_id UUID NOT NULL REFERENCES sim.practice_stakeholder_register(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'influences', 'collaborates-with', 'conflicts-with', 'reports-to',
    'advises', 'depends-on'
  )),
  relationship_strength SMALLINT CHECK (relationship_strength IS NULL OR (relationship_strength >= 1 AND relationship_strength <= 5)),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  UNIQUE(practice_project_id, from_stakeholder_id, to_stakeholder_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_sim_practice_stakeholder_relationships_project
  ON sim.practice_stakeholder_relationships(practice_project_id) WHERE is_deleted = FALSE;

ALTER TABLE sim.practice_stakeholder_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "practice_stakeholder_relationships_select" ON sim.practice_stakeholder_relationships;
CREATE POLICY "practice_stakeholder_relationships_select" ON sim.practice_stakeholder_relationships
  FOR SELECT TO authenticated USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "practice_stakeholder_relationships_insert" ON sim.practice_stakeholder_relationships;
CREATE POLICY "practice_stakeholder_relationships_insert" ON sim.practice_stakeholder_relationships
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "practice_stakeholder_relationships_update" ON sim.practice_stakeholder_relationships;
CREATE POLICY "practice_stakeholder_relationships_update" ON sim.practice_stakeholder_relationships
  FOR UPDATE TO authenticated USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "practice_stakeholder_relationships_delete" ON sim.practice_stakeholder_relationships;
CREATE POLICY "practice_stakeholder_relationships_delete" ON sim.practice_stakeholder_relationships
  FOR DELETE TO authenticated USING (is_deleted = FALSE);

GRANT SELECT, INSERT, UPDATE ON sim.practice_stakeholder_relationships TO authenticated;

-- =============================================================================
-- Register in database_tables
-- =============================================================================
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('stakeholder_relationships', 'Inter-stakeholder relationships per project (type, strength)', false, true),
  ('sim.practice_stakeholder_relationships', 'Simulator practice stakeholder relationships', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();
