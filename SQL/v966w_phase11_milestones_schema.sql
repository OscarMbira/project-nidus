-- ============================================================================
-- v966w: Core PM Menu Rationalisation — Phase 11: Milestone Register (schema)
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 11.
-- projectprd/v966_core_pm_menu_rationalisation_PRD.md decision 5: build a real Milestone
-- Register capability, not deferred to a separate PRD.
--
-- No milestone-register capability exists anywhere in the codebase today (confirmed by two
-- prior audits) — "milestone" only appears as an is_milestone flag on public.activity_list rows
-- (v365) and as a milestone_date/milestone_name concept sourced from ganttService.js's
-- fetchProjectMilestones() (used by PMDashboard.jsx's existing "Upcoming Deadlines" widget).
-- Neither is a real register: activity_list's flag is a scheduling attribute on an Activity, not
-- an independently trackable milestone record with its own target/forecast/actual dates and a
-- slippage lifecycle. This file creates that missing register as a genuinely new table, additive
-- to (not replacing) the existing activity_list flag or ganttService's dashboard read.
--
-- No display_id / Admin ID Generation wiring (rule 16.2) — this is a project-scoped internal
-- register with no natural human-readable reference column of its own (unlike, say, an issue or
-- change request that gets referenced in external correspondence). Same call already made for
-- Assumptions (SQL/v963b) and Cost Actuals/unified Approvals in the v963 PRD — the UUID-in-URL
-- exception in rule 16.3 applies; a display_id would be pure ceremony for a register whose rows
-- are only ever opened from inside their own project's Planning menu.
--
-- Status vocabulary (per the plan's own Phase 11 brief): planned (default) / at_risk / achieved /
-- missed / slipped. target_date is the baseline/agreed date; forecast_date is the current
-- best-estimate date (defaults to target_date until revised); actual_date is set once the
-- milestone is actually reached (normally paired with status = 'achieved').
--
-- Prerequisites: public.projects/users (core), sim.practice_projects (v80).
-- ============================================================================

-- ── 1. public.milestones ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.milestones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_name    VARCHAR(200) NOT NULL,
  description       TEXT,
  target_date       DATE NOT NULL,
  forecast_date     DATE,
  actual_date       DATE,
  status            VARCHAR(20) NOT NULL DEFAULT 'planned'
                      CHECK (status IN ('planned', 'at_risk', 'achieved', 'missed', 'slipped')),
  owner_user_id     UUID REFERENCES public.users(id),
  sequence_order    INTEGER NOT NULL DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES public.users(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES public.users(id),
  is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,
  deleted_by        UUID REFERENCES public.users(id)
);

COMMENT ON TABLE public.milestones IS
  'v966w (Phase 11): project-scoped Milestone Register — target/forecast/actual dates and a '
  'planned/at_risk/achieved/missed/slipped lifecycle. Distinct from activity_list.is_milestone '
  '(a scheduling flag on an Activity) and ganttService.fetchProjectMilestones() (the dashboard''s '
  'existing "Upcoming Deadlines" read) — additive, not a replacement for either.';

CREATE INDEX IF NOT EXISTS idx_milestones_project ON public.milestones(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_milestones_status ON public.milestones(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_milestones_target_date ON public.milestones(target_date) WHERE is_deleted = FALSE;

-- ── 2. sim.milestones (Platform-Simulator parity, rule 34.1) ───────────────────

CREATE TABLE IF NOT EXISTS sim.milestones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  milestone_name    VARCHAR(200) NOT NULL,
  description       TEXT,
  target_date       DATE NOT NULL,
  forecast_date     DATE,
  actual_date       DATE,
  status            VARCHAR(20) NOT NULL DEFAULT 'planned'
                      CHECK (status IN ('planned', 'at_risk', 'achieved', 'missed', 'slipped')),
  owner_user_id     UUID REFERENCES public.users(id),
  sequence_order    INTEGER NOT NULL DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES public.users(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES public.users(id),
  is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,
  deleted_by        UUID REFERENCES public.users(id)
);

COMMENT ON TABLE sim.milestones IS
  'v966w (Phase 11): Simulator mirror of public.milestones, scoped to sim.practice_projects.';

CREATE INDEX IF NOT EXISTS idx_sim_milestones_project ON sim.milestones(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_milestones_status ON sim.milestones(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_milestones_target_date ON sim.milestones(target_date) WHERE is_deleted = FALSE;

-- ── 3. database_tables registry ─────────────────────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('milestones', 'Milestone Register (Phase 11, v966w): project milestones with target/forecast/actual dates and a planned/at_risk/achieved/missed/slipped lifecycle.', false, true),
  ('sim.milestones', 'Milestone Register (Simulator mirror, Phase 11, v966w): same shape as public.milestones, scoped to sim.practice_projects.', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v966w_phase11_milestones_schema.sql applied successfully'; END $$;
