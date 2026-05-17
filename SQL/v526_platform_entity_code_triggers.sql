-- ============================================================================
-- v526_platform_entity_code_triggers.sql
-- Phase 12 — BEFORE INSERT: auto-generate human-readable codes when NULL/blank
-- Prefix format PREFIX-NNNN (4 digits) aligned with v524/v525 back-fill.
-- ============================================================================

-- Replace portfolio year-based INSERT trigger with Phase 12 PORT-NNNN (matches v524).
-- Keep RPC name generate_portfolio_code() for PortfolioForm.jsx — redefine to PORT-NNNN.
DROP TRIGGER IF EXISTS trg_portfolios_code ON portfolios;
DROP FUNCTION IF EXISTS generate_portfolio_code_trigger();

-- ---------------------------------------------------------------------------
-- Helper: max numeric suffix for pattern '^PREFIX-[0-9]+$' (global table scan)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.phase12_max_suffix_global(p_table text, p_col text, p_prefix text)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_max int;
  v_re text := '^' || p_prefix || '-[0-9]+$';
  v_from int := length(p_prefix) + 2;
BEGIN
  EXECUTE format(
    $q$SELECT COALESCE(MAX(
      CASE WHEN %I ~ $1 THEN SUBSTRING(%I FROM $2)::INT END
    ), 0) FROM %I$q$,
    p_col,
    p_col,
    p_table::regclass
  )
  INTO v_max
  USING v_re, v_from;
  RETURN v_max;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_portfolio_code()
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n int;
BEGIN
  SELECT public.phase12_max_suffix_global('portfolios', 'portfolio_code', 'PORT') + 1 INTO n;
  RETURN 'PORT-' || LPAD(n::TEXT, 4, '0');
END;
$$;

COMMENT ON FUNCTION public.generate_portfolio_code() IS
  'Returns next portfolio_code (PORT-NNNN). Used by INSERT trigger and RPC preview.';

-- ---------------------------------------------------------------------------
-- projects.project_code (PRJ-NNNN)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_projects_set_phase12_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE n int;
BEGIN
  IF NEW.project_code IS NULL OR BTRIM(NEW.project_code) = '' THEN
    SELECT public.phase12_max_suffix_global('projects', 'project_code', 'PRJ') + 1 INTO n;
    NEW.project_code := 'PRJ-' || LPAD(n::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_projects_phase12_code ON projects;
CREATE TRIGGER trg_projects_phase12_code
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_projects_set_phase12_code();

-- ---------------------------------------------------------------------------
-- programmes.programme_code (PROG-NNNN)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_programmes_set_phase12_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE n int;
BEGIN
  IF NEW.programme_code IS NULL OR BTRIM(NEW.programme_code) = '' THEN
    SELECT public.phase12_max_suffix_global('programmes', 'programme_code', 'PROG') + 1 INTO n;
    NEW.programme_code := 'PROG-' || LPAD(n::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_programmes_phase12_code ON programmes;
CREATE TRIGGER trg_programmes_phase12_code
  BEFORE INSERT ON programmes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_programmes_set_phase12_code();

-- ---------------------------------------------------------------------------
-- portfolios.portfolio_code (PORT-NNNN)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_portfolios_set_phase12_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.portfolio_code IS NULL OR BTRIM(NEW.portfolio_code) = '' THEN
    NEW.portfolio_code := public.generate_portfolio_code();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_portfolios_code
  BEFORE INSERT ON portfolios
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_portfolios_set_phase12_code();

-- ---------------------------------------------------------------------------
-- change_requests.change_reference (CR-NNNN)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_change_requests_set_phase12_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE n int;
BEGIN
  IF NEW.change_reference IS NULL OR BTRIM(NEW.change_reference) = '' THEN
    SELECT public.phase12_max_suffix_global('change_requests', 'change_reference', 'CR') + 1 INTO n;
    NEW.change_reference := 'CR-' || LPAD(n::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_change_requests_phase12_code ON change_requests;
CREATE TRIGGER trg_change_requests_phase12_code
  BEFORE INSERT ON change_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_change_requests_set_phase12_code();

-- ---------------------------------------------------------------------------
-- risks.risk_code (RISK-NNNN per project_id)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_risks_set_phase12_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE n int;
BEGIN
  IF NEW.risk_code IS NULL OR BTRIM(NEW.risk_code) = '' THEN
    SELECT COALESCE(MAX(
      CASE WHEN risk_code ~ '^RISK-[0-9]+$' THEN SUBSTRING(risk_code FROM 6)::INT END
    ), 0) + 1 INTO n
    FROM risks WHERE project_id = NEW.project_id AND COALESCE(is_deleted, FALSE) = FALSE;
    NEW.risk_code := 'RISK-' || LPAD(n::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_risks_phase12_code ON risks;
CREATE TRIGGER trg_risks_phase12_code
  BEFORE INSERT ON risks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_risks_set_phase12_code();

-- ---------------------------------------------------------------------------
-- issues.issue_code (ISS-NNNN per project_id)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_issues_set_phase12_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE n int;
BEGIN
  IF NEW.issue_code IS NULL OR BTRIM(NEW.issue_code) = '' THEN
    SELECT COALESCE(MAX(
      CASE WHEN issue_code ~ '^ISS-[0-9]+$' THEN SUBSTRING(issue_code FROM 5)::INT END
    ), 0) + 1 INTO n
    FROM issues WHERE project_id = NEW.project_id AND COALESCE(is_deleted, FALSE) = FALSE;
    NEW.issue_code := 'ISS-' || LPAD(n::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_issues_phase12_code ON issues;
CREATE TRIGGER trg_issues_phase12_code
  BEFORE INSERT ON issues
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_issues_set_phase12_code();

-- ---------------------------------------------------------------------------
-- teams.team_code (TEAM-NNNN global)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_teams_set_phase12_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE n int;
BEGIN
  IF NEW.team_code IS NULL OR BTRIM(NEW.team_code) = '' THEN
    SELECT public.phase12_max_suffix_global('teams', 'team_code', 'TEAM') + 1 INTO n;
    NEW.team_code := 'TEAM-' || LPAD(n::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_teams_phase12_code ON teams;
CREATE TRIGGER trg_teams_phase12_code
  BEFORE INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_teams_set_phase12_code();

-- ---------------------------------------------------------------------------
-- test_cases.case_code (TC-NNNN global UNIQUE)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_test_cases_set_phase12_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE n int;
BEGIN
  IF NEW.case_code IS NULL OR BTRIM(NEW.case_code) = '' THEN
    SELECT public.phase12_max_suffix_global('test_cases', 'case_code', 'TC') + 1 INTO n;
    NEW.case_code := 'TC-' || LPAD(n::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_test_cases_phase12_code ON test_cases;
CREATE TRIGGER trg_test_cases_phase12_code
  BEFORE INSERT ON test_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_test_cases_set_phase12_code();

-- ---------------------------------------------------------------------------
-- daily_log_entries.entry_code (LOG-NNNN per project via daily_logs)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_daily_log_entries_set_phase12_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  pid uuid;
  n int;
BEGIN
  IF NEW.entry_code IS NULL OR BTRIM(NEW.entry_code) = '' THEN
    SELECT dl.project_id INTO pid FROM daily_logs dl WHERE dl.id = NEW.daily_log_id;
    IF pid IS NOT NULL THEN
      SELECT COALESCE(MAX(
        CASE WHEN dle.entry_code ~ '^LOG-[0-9]+$' THEN SUBSTRING(dle.entry_code FROM 5)::INT END
      ), 0) + 1 INTO n
      FROM daily_log_entries dle
      JOIN daily_logs dl ON dl.id = dle.daily_log_id
      WHERE dl.project_id = pid AND COALESCE(dle.is_deleted, FALSE) = FALSE;
      NEW.entry_code := 'LOG-' || LPAD(n::TEXT, 4, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_daily_log_entries_phase12_code ON daily_log_entries;
CREATE TRIGGER trg_daily_log_entries_phase12_code
  BEFORE INSERT ON daily_log_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_daily_log_entries_set_phase12_code();

-- ---------------------------------------------------------------------------
-- stage_plans.plan_code (SP-NNNN per project_id)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_stage_plans_set_phase12_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE n int;
BEGIN
  IF NEW.plan_code IS NULL OR BTRIM(NEW.plan_code) = '' THEN
    SELECT COALESCE(MAX(
      CASE WHEN plan_code ~ '^SP-[0-9]+$' THEN SUBSTRING(plan_code FROM 4)::INT END
    ), 0) + 1 INTO n
    FROM stage_plans WHERE project_id = NEW.project_id AND COALESCE(is_deleted, FALSE) = FALSE;
    NEW.plan_code := 'SP-' || LPAD(n::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_stage_plans_phase12_code ON stage_plans;
CREATE TRIGGER trg_stage_plans_phase12_code
  BEFORE INSERT ON stage_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_stage_plans_set_phase12_code();

-- ---------------------------------------------------------------------------
-- comm_meetings.meeting_code (MTG-NNNN per account_id)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_comm_meetings_set_phase12_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE n int;
BEGIN
  IF NEW.meeting_code IS NULL OR BTRIM(NEW.meeting_code) = '' THEN
    SELECT COALESCE(MAX(
      CASE WHEN meeting_code ~ '^MTG-[0-9]+$' THEN SUBSTRING(meeting_code FROM 5)::INT END
    ), 0) + 1 INTO n
    FROM comm_meetings WHERE account_id = NEW.account_id;
    NEW.meeting_code := 'MTG-' || LPAD(n::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_comm_meetings_phase12_code ON comm_meetings;
CREATE TRIGGER trg_comm_meetings_phase12_code
  BEFORE INSERT ON comm_meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_comm_meetings_set_phase12_code();

DO $$ BEGIN RAISE NOTICE 'v526_platform_entity_code_triggers.sql applied'; END $$;
