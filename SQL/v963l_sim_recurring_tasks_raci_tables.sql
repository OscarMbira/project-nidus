-- =============================================================================
-- v963l_sim_recurring_tasks_raci_tables.sql
-- v963 PMIS Core Gap Closure — Phase 11 (Recurring Tasks, GAP-08) and Phase 12
-- (RACI Matrix, GAP-10) Simulator (sim schema) mirrors of public.recurring_task_*
-- and public.raci_* (SQL/v644_pmis_gap_tables_tier2.sql). Fixes the Simulator
-- routes that already exist in PmisGapRoutes.jsx but query sim tables that never
-- existed (RecurringTasksPageSim, RaciPageSim x4 routes).
--
-- Column shape mirrors the public tables exactly, except the project reference
-- uses sim's own practice_project_id/sim.practice_projects convention (there is
-- no sim.projects table) and member references point at auth.users(id) directly
-- (sim.practice_project_memberships.user_id stores auth.uid() directly, NOT
-- public.users.id/sim.get_current_user_id() — confirmed against
-- apps/simulator/src/services/sim/simProjectMembershipService.js. sim.get_current_
-- user_id() returns public.users.id via auth_user_id lookup, a DIFFERENT id space;
-- reusing it here would silently break access checks, so this file defines its own
-- auth.uid()-based helper rather than reusing sim.auth_user_can_access_practice_
-- project() from v520, whose internal semantics were not re-verified here).
--
-- Prerequisites: v66 (sim schema core), sim.practice_projects (v80),
--                 sim.practice_project_memberships (v242/v389), sim.update_updated_at()
-- PostgreSQL 15+ (Supabase). Idempotent.
-- =============================================================================

-- ── GAP-08: Recurring Tasks ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.recurring_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  template_name VARCHAR(255) NOT NULL,
  entity_type VARCHAR(40) NOT NULL DEFAULT 'task',
  recurrence_pattern VARCHAR(40) NOT NULL,
  recurrence_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  end_condition VARCHAR(30) NOT NULL DEFAULT 'never'
    CHECK (end_condition IN ('never', 'after_count', 'until_date')),
  max_occurrences INTEGER,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.recurring_task_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES sim.recurring_task_templates(id) ON DELETE CASCADE,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  timezone VARCHAR(60) NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim.recurring_task_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES sim.recurring_task_templates(id) ON DELETE CASCADE,
  scheduled_for DATE NOT NULL,
  generated_entity_type VARCHAR(40),
  generated_entity_id UUID,
  instance_status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (instance_status IN ('pending', 'created', 'skipped', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── GAP-10: RACI Matrix ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.raci_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  matrix_name VARCHAR(255) NOT NULL,
  matrix_version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.raci_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id UUID NOT NULL REFERENCES sim.raci_matrices(id) ON DELETE CASCADE,
  deliverable_name VARCHAR(500) NOT NULL,
  linked_entity_type VARCHAR(40),
  linked_entity_id UUID,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.raci_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id UUID NOT NULL REFERENCES sim.raci_rows(id) ON DELETE CASCADE,
  member_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raci_role CHAR(1) NOT NULL CHECK (raci_role IN ('R', 'A', 'C', 'I')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_sim_raci_assignments UNIQUE (row_id, member_user_id, raci_role)
);

-- ── Triggers ───────────────────────────────────────────────────────────────────

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'recurring_task_templates', 'recurring_task_schedules', 'recurring_task_instances',
    'raci_matrices', 'raci_rows', 'raci_assignments'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON sim.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON sim.%I FOR EACH ROW EXECUTE FUNCTION sim.update_updated_at()', t, t);
  END LOOP;
END $$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Own helper (auth.uid()-based) — see header note on why this doesn't reuse
-- sim.auth_user_can_access_practice_project() from v520.

CREATE OR REPLACE FUNCTION sim.pmis_gap_can_access_practice_project(p_practice_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sim.practice_projects pp
    WHERE pp.id = p_practice_project_id
      AND COALESCE(pp.is_deleted, FALSE) = FALSE
      AND (
        pp.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id
            AND m.user_id = auth.uid()
            AND COALESCE(m.is_active, TRUE) = TRUE
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION sim.pmis_gap_can_access_practice_project(UUID) TO authenticated;

ALTER TABLE sim.recurring_task_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_recurring_task_templates ON sim.recurring_task_templates;
CREATE POLICY policy_sim_recurring_task_templates ON sim.recurring_task_templates FOR ALL TO authenticated
  USING (sim.pmis_gap_can_access_practice_project(practice_project_id))
  WITH CHECK (sim.pmis_gap_can_access_practice_project(practice_project_id));

ALTER TABLE sim.recurring_task_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_recurring_task_schedules ON sim.recurring_task_schedules;
CREATE POLICY policy_sim_recurring_task_schedules ON sim.recurring_task_schedules FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.recurring_task_templates t
    WHERE t.id = recurring_task_schedules.template_id
      AND sim.pmis_gap_can_access_practice_project(t.practice_project_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sim.recurring_task_templates t
    WHERE t.id = recurring_task_schedules.template_id
      AND sim.pmis_gap_can_access_practice_project(t.practice_project_id)
  ));

ALTER TABLE sim.recurring_task_instances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_recurring_task_instances ON sim.recurring_task_instances;
CREATE POLICY policy_sim_recurring_task_instances ON sim.recurring_task_instances FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.recurring_task_templates t
    WHERE t.id = recurring_task_instances.template_id
      AND sim.pmis_gap_can_access_practice_project(t.practice_project_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sim.recurring_task_templates t
    WHERE t.id = recurring_task_instances.template_id
      AND sim.pmis_gap_can_access_practice_project(t.practice_project_id)
  ));

ALTER TABLE sim.raci_matrices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_raci_matrices ON sim.raci_matrices;
CREATE POLICY policy_sim_raci_matrices ON sim.raci_matrices FOR ALL TO authenticated
  USING (sim.pmis_gap_can_access_practice_project(practice_project_id))
  WITH CHECK (sim.pmis_gap_can_access_practice_project(practice_project_id));

ALTER TABLE sim.raci_rows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_raci_rows ON sim.raci_rows;
CREATE POLICY policy_sim_raci_rows ON sim.raci_rows FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.raci_matrices m
    WHERE m.id = raci_rows.matrix_id AND sim.pmis_gap_can_access_practice_project(m.practice_project_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sim.raci_matrices m
    WHERE m.id = raci_rows.matrix_id AND sim.pmis_gap_can_access_practice_project(m.practice_project_id)
  ));

ALTER TABLE sim.raci_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_raci_assignments ON sim.raci_assignments;
CREATE POLICY policy_sim_raci_assignments ON sim.raci_assignments FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.raci_rows r
    JOIN sim.raci_matrices m ON m.id = r.matrix_id
    WHERE r.id = raci_assignments.row_id AND sim.pmis_gap_can_access_practice_project(m.practice_project_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sim.raci_rows r
    JOIN sim.raci_matrices m ON m.id = r.matrix_id
    WHERE r.id = raci_assignments.row_id AND sim.pmis_gap_can_access_practice_project(m.practice_project_id)
  ));

-- ── Registry ─────────────────────────────────────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('sim.recurring_task_templates', 'Recurring task definitions — simulator (GAP-08)', false, true, 'simulation'),
  ('sim.recurring_task_schedules', 'Schedule config for recurring tasks — simulator (GAP-08)', false, true, 'simulation'),
  ('sim.recurring_task_instances', 'Generated recurring task instances — simulator (GAP-08)', false, true, 'simulation'),
  ('sim.raci_matrices', 'RACI matrix per practice project — simulator (GAP-10)', false, true, 'simulation'),
  ('sim.raci_rows', 'RACI deliverable rows — simulator (GAP-10)', false, true, 'simulation'),
  ('sim.raci_assignments', 'RACI R/A/C/I assignments — simulator (GAP-10)', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  table_category = EXCLUDED.table_category,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v963l_sim_recurring_tasks_raci_tables.sql completed'; END $$;
