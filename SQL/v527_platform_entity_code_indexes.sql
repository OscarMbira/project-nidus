-- ============================================================================
-- v527_platform_entity_code_indexes.sql
-- Phase 12 — Resolver-friendly indexes (partial where noted)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_programmes_programme_code_active
  ON programmes (programme_code) WHERE is_deleted = FALSE AND programme_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portfolios_portfolio_code_active
  ON portfolios (portfolio_code) WHERE is_deleted = FALSE AND portfolio_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_change_requests_change_reference_active
  ON change_requests (change_reference) WHERE is_deleted = FALSE AND change_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_risks_risk_code_project
  ON risks (risk_code, project_id) WHERE is_deleted = FALSE AND risk_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_issues_issue_code_project
  ON issues (issue_code, project_id) WHERE is_deleted = FALSE AND issue_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teams_team_code_active
  ON teams (team_code) WHERE is_deleted = FALSE AND team_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_test_cases_case_code_active
  ON test_cases (case_code) WHERE is_deleted = FALSE AND case_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_daily_log_entries_entry_code
  ON daily_log_entries (entry_code) WHERE is_deleted = FALSE AND entry_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stage_plans_plan_code_project
  ON stage_plans (plan_code, project_id) WHERE is_deleted = FALSE AND plan_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comm_meetings_meeting_code_account
  ON comm_meetings (meeting_code, account_id) WHERE meeting_code IS NOT NULL;

DO $$ BEGIN RAISE NOTICE 'v527_platform_entity_code_indexes.sql applied'; END $$;
