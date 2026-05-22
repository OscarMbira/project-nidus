-- =============================================================================
-- v603: Stakeholder Assessment Matrix (Platform + Simulator)
-- SEAM: Current (C) and Desired (D) engagement levels per stakeholder per project.
-- Plan: projectplan/v603_Stakeholder_Assessment_Matrix_CRUD_Plan.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Platform: public.stakeholder_assessment_matrix
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stakeholder_assessment_matrix (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES public.stakeholders(id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_level VARCHAR(50) NOT NULL DEFAULT 'neutral'
    CHECK (current_level IN ('unaware', 'resistant', 'neutral', 'supportive', 'leading')),
  desired_level VARCHAR(50) NOT NULL DEFAULT 'supportive'
    CHECK (desired_level IN ('unaware', 'resistant', 'neutral', 'supportive', 'leading')),
  gap_summary TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stakeholder_assessment_matrix_project_stakeholder_active
  ON public.stakeholder_assessment_matrix(project_id, stakeholder_id)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_stakeholder_assessment_matrix_project
  ON public.stakeholder_assessment_matrix(project_id) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_stakeholder_assessment_matrix_stakeholder
  ON public.stakeholder_assessment_matrix(stakeholder_id) WHERE is_deleted = FALSE;

DROP TRIGGER IF EXISTS trg_stakeholder_assessment_matrix_updated_at ON public.stakeholder_assessment_matrix;
CREATE TRIGGER trg_stakeholder_assessment_matrix_updated_at
  BEFORE UPDATE ON public.stakeholder_assessment_matrix
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.stakeholder_assessment_matrix ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stakeholder_assessment_matrix_select" ON public.stakeholder_assessment_matrix;
CREATE POLICY "stakeholder_assessment_matrix_select" ON public.stakeholder_assessment_matrix
  FOR SELECT TO authenticated USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "stakeholder_assessment_matrix_insert" ON public.stakeholder_assessment_matrix;
CREATE POLICY "stakeholder_assessment_matrix_insert" ON public.stakeholder_assessment_matrix
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "stakeholder_assessment_matrix_update" ON public.stakeholder_assessment_matrix;
CREATE POLICY "stakeholder_assessment_matrix_update" ON public.stakeholder_assessment_matrix
  FOR UPDATE TO authenticated USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "stakeholder_assessment_matrix_delete" ON public.stakeholder_assessment_matrix;
CREATE POLICY "stakeholder_assessment_matrix_delete" ON public.stakeholder_assessment_matrix
  FOR DELETE TO authenticated USING (is_deleted = FALSE);

GRANT SELECT, INSERT, UPDATE ON public.stakeholder_assessment_matrix TO authenticated;

-- -----------------------------------------------------------------------------
-- Simulator: sim.practice_stakeholder_assessment_matrix
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sim.practice_stakeholder_assessment_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  practice_stakeholder_id UUID NOT NULL REFERENCES sim.practice_stakeholder_register(id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_level VARCHAR(50) NOT NULL DEFAULT 'neutral'
    CHECK (current_level IN ('unaware', 'resistant', 'neutral', 'supportive', 'leading')),
  desired_level VARCHAR(50) NOT NULL DEFAULT 'supportive'
    CHECK (desired_level IN ('unaware', 'resistant', 'neutral', 'supportive', 'leading')),
  gap_summary TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sim_practice_sam_project_stakeholder_active
  ON sim.practice_stakeholder_assessment_matrix(practice_project_id, practice_stakeholder_id)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_sim_practice_sam_project
  ON sim.practice_stakeholder_assessment_matrix(practice_project_id) WHERE is_deleted = FALSE;

ALTER TABLE sim.practice_stakeholder_assessment_matrix ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "practice_stakeholder_assessment_matrix_select" ON sim.practice_stakeholder_assessment_matrix;
CREATE POLICY "practice_stakeholder_assessment_matrix_select" ON sim.practice_stakeholder_assessment_matrix
  FOR SELECT TO authenticated USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "practice_stakeholder_assessment_matrix_insert" ON sim.practice_stakeholder_assessment_matrix;
CREATE POLICY "practice_stakeholder_assessment_matrix_insert" ON sim.practice_stakeholder_assessment_matrix
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "practice_stakeholder_assessment_matrix_update" ON sim.practice_stakeholder_assessment_matrix;
CREATE POLICY "practice_stakeholder_assessment_matrix_update" ON sim.practice_stakeholder_assessment_matrix
  FOR UPDATE TO authenticated USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "practice_stakeholder_assessment_matrix_delete" ON sim.practice_stakeholder_assessment_matrix;
CREATE POLICY "practice_stakeholder_assessment_matrix_delete" ON sim.practice_stakeholder_assessment_matrix
  FOR DELETE TO authenticated USING (is_deleted = FALSE);

GRANT SELECT, INSERT, UPDATE ON sim.practice_stakeholder_assessment_matrix TO authenticated;

-- Register tables
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('stakeholder_assessment_matrix', 'Stakeholder Engagement Assessment Matrix (C/D levels) per project stakeholder', false, true),
  ('practice_stakeholder_assessment_matrix', 'Simulator practice SEAM assessment rows per practice stakeholder', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
