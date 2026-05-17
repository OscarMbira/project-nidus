-- ============================================================================
-- v574: Simulator — practice_stage_plans table (sim schema)
-- Adds project-scoped stage plans to the Simulator, mirroring the Platform
-- stage_plans table in the public schema.
-- Prerequisites: v400 (sim schema), practice_project_plans, practice_projects
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.practice_stage_plans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  practice_plan_id    UUID REFERENCES sim.practice_project_plans(id) ON DELETE SET NULL,
  user_id             UUID NOT NULL REFERENCES sim.users(id),
  stage_number        INT  NOT NULL DEFAULT 1,
  stage_title         TEXT NOT NULL,
  stage_objectives    TEXT,
  planned_start_date  DATE,
  planned_end_date    DATE,
  actual_start_date   DATE,
  actual_end_date     DATE,
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'active', 'completed', 'on_hold')),
  resources_required  TEXT,
  tolerance_time      TEXT,
  tolerance_cost      TEXT,
  tolerance_scope     TEXT,
  approval_notes      TEXT,
  version             TEXT NOT NULL DEFAULT '1.0',
  is_on_hold          BOOLEAN DEFAULT FALSE,
  on_hold_reason      TEXT,
  is_deleted          BOOLEAN DEFAULT FALSE,
  created_by          UUID REFERENCES sim.users(id),
  updated_by          UUID REFERENCES sim.users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast project lookups
CREATE INDEX IF NOT EXISTS idx_psp_project ON sim.practice_stage_plans(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_psp_plan ON sim.practice_stage_plans(practice_plan_id) WHERE is_deleted = FALSE;

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE sim.practice_stage_plans ENABLE ROW LEVEL SECURITY;

-- Users can only see their own practice stage plans
CREATE POLICY "sim_psp_select_own" ON sim.practice_stage_plans
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM sim.users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "sim_psp_insert_own" ON sim.practice_stage_plans
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM sim.users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "sim_psp_update_own" ON sim.practice_stage_plans
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM sim.users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "sim_psp_delete_own" ON sim.practice_stage_plans
  FOR DELETE USING (
    user_id IN (
      SELECT id FROM sim.users WHERE auth_user_id = auth.uid()
    )
  );

-- ── Register in database_tables ───────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES (
  'sim.practice_stage_plans',
  'Simulator stage plans scoped to practice projects — mirrors platform stage_plans in the sim schema',
  false,
  true
)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();

-- ── Verify ───────────────────────────────────────────────────────────────────
SELECT
  table_schema,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c
   WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'sim'
  AND table_name   = 'practice_stage_plans';
