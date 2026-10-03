-- ============================================================================
-- v963w: Project Calendar (PMIS Core Gap Closure — Phase 4)
-- projectplan/v963_pmis_core_gap_closure_plan.md / projectprd/v963_pmis_core_gap_closure_PRD.md
-- One working-days config record per project (project_calendars) plus a dated exceptions list
-- (project_calendar_exceptions — holidays and other non-standard working/non-working days).
-- Mirrors to the sim schema (practice_project_id, no per-row created_by/updated_by — ownership
-- is via sim.practice_projects.user_id, matching v369_sim_pm_planning_tables.sql convention).
-- ============================================================================

-- ── Platform (public schema) ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,

  monday BOOLEAN NOT NULL DEFAULT TRUE,
  tuesday BOOLEAN NOT NULL DEFAULT TRUE,
  wednesday BOOLEAN NOT NULL DEFAULT TRUE,
  thursday BOOLEAN NOT NULL DEFAULT TRUE,
  friday BOOLEAN NOT NULL DEFAULT TRUE,
  saturday BOOLEAN NOT NULL DEFAULT FALSE,
  sunday BOOLEAN NOT NULL DEFAULT FALSE,

  hours_per_day NUMERIC(4,2) NOT NULL DEFAULT 8,
  timezone VARCHAR(100),
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_project_calendars_project ON public.project_calendars(project_id) WHERE is_deleted = FALSE;

DROP TRIGGER IF EXISTS trg_project_calendars_updated_at ON public.project_calendars;
CREATE TRIGGER trg_project_calendars_updated_at
  BEFORE UPDATE ON public.project_calendars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.project_calendar_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  calendar_id UUID REFERENCES public.project_calendars(id) ON DELETE CASCADE,

  exception_date DATE NOT NULL,
  exception_type VARCHAR(50) NOT NULL DEFAULT 'holiday'
    CHECK (exception_type IN ('holiday', 'other')),
  -- FALSE (default) = this date is NOT a working day (a holiday, or an "other" non-working
  -- override). TRUE = this date IS a working day despite otherwise being off the standard
  -- pattern (e.g. weekend work) — lets 'other' cover both directions with one flag.
  is_working_day BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id),

  CONSTRAINT uq_project_calendar_exceptions_project_date UNIQUE (project_id, exception_date)
);

CREATE INDEX IF NOT EXISTS idx_project_calendar_exceptions_project ON public.project_calendar_exceptions(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_calendar_exceptions_calendar ON public.project_calendar_exceptions(calendar_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_calendar_exceptions_date ON public.project_calendar_exceptions(exception_date) WHERE is_deleted = FALSE;

DROP TRIGGER IF EXISTS trg_project_calendar_exceptions_updated_at ON public.project_calendar_exceptions;
CREATE TRIGGER trg_project_calendar_exceptions_updated_at
  BEFORE UPDATE ON public.project_calendar_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ── Simulator (sim schema) ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.project_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL UNIQUE REFERENCES sim.practice_projects(id) ON DELETE CASCADE,

  monday BOOLEAN NOT NULL DEFAULT TRUE,
  tuesday BOOLEAN NOT NULL DEFAULT TRUE,
  wednesday BOOLEAN NOT NULL DEFAULT TRUE,
  thursday BOOLEAN NOT NULL DEFAULT TRUE,
  friday BOOLEAN NOT NULL DEFAULT TRUE,
  saturday BOOLEAN NOT NULL DEFAULT FALSE,
  sunday BOOLEAN NOT NULL DEFAULT FALSE,

  hours_per_day NUMERIC(4,2) NOT NULL DEFAULT 8,
  timezone VARCHAR(100),
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sim_project_calendars_practice_project ON sim.project_calendars(practice_project_id) WHERE is_deleted = FALSE;

DROP TRIGGER IF EXISTS trg_sim_project_calendars_updated_at ON sim.project_calendars;
CREATE TRIGGER trg_sim_project_calendars_updated_at
  BEFORE UPDATE ON sim.project_calendars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS sim.project_calendar_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  calendar_id UUID REFERENCES sim.project_calendars(id) ON DELETE CASCADE,

  exception_date DATE NOT NULL,
  exception_type VARCHAR(50) NOT NULL DEFAULT 'holiday'
    CHECK (exception_type IN ('holiday', 'other')),
  is_working_day BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

  CONSTRAINT uq_sim_project_calendar_exceptions_project_date UNIQUE (practice_project_id, exception_date)
);

CREATE INDEX IF NOT EXISTS idx_sim_project_calendar_exceptions_practice_project ON sim.project_calendar_exceptions(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_project_calendar_exceptions_calendar ON sim.project_calendar_exceptions(calendar_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_project_calendar_exceptions_date ON sim.project_calendar_exceptions(exception_date) WHERE is_deleted = FALSE;

DROP TRIGGER IF EXISTS trg_sim_project_calendar_exceptions_updated_at ON sim.project_calendar_exceptions;
CREATE TRIGGER trg_sim_project_calendar_exceptions_updated_at
  BEFORE UPDATE ON sim.project_calendar_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ── database_tables registry ────────────────────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('project_calendars', 'Per-project working-days calendar configuration (Platform)', false, true),
  ('project_calendar_exceptions', 'Per-project calendar exceptions — holidays and other non-standard working/non-working days (Platform)', false, true),
  ('sim.project_calendars', 'Per-practice-project working-days calendar configuration (Simulator)', false, true),
  ('sim.project_calendar_exceptions', 'Per-practice-project calendar exceptions (Simulator)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v963w_project_calendar_tables.sql applied'; END $$;
