-- ============================================================================
-- v525_platform_add_missing_code_columns.sql
-- Phase 12 — Add missing code columns + immediate back-fill (Platform)
-- ============================================================================

-- teams.team_code (TEAM-NNNN global)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS team_code VARCHAR(50);
WITH mx AS (
  SELECT COALESCE(MAX(
    CASE WHEN team_code ~ '^TEAM-[0-9]+$' THEN SUBSTRING(team_code FROM 6)::INT END
  ), 0) AS n FROM teams
),
ranked AS (
  SELECT t.id, ROW_NUMBER() OVER (ORDER BY t.created_at NULLS LAST, t.id) AS rn
  FROM teams t
  WHERE COALESCE(TRIM(t.team_code), '') = '' AND COALESCE(t.is_deleted, FALSE) = FALSE
)
UPDATE teams t
SET team_code = 'TEAM-' || LPAD((mx.n + ranked.rn)::TEXT, 4, '0')
FROM mx, ranked WHERE t.id = ranked.id;

-- test_cases.case_code (TC-NNNN globally UNIQUE per plan)
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS case_code VARCHAR(50);
UPDATE test_cases tc
SET case_code = COALESCE(NULLIF(TRIM(tc.case_code), ''), NULLIF(TRIM(tc.test_case_ref), ''))
WHERE COALESCE(TRIM(tc.case_code), '') = '';
WITH mx AS (
  SELECT COALESCE(MAX(
    CASE WHEN case_code ~ '^TC-[0-9]+$' THEN SUBSTRING(case_code FROM 4)::INT END
  ), 0) AS n FROM test_cases
),
ranked AS (
  SELECT tc.id, ROW_NUMBER() OVER (ORDER BY tc.created_at NULLS LAST, tc.id) AS rn
  FROM test_cases tc
  WHERE COALESCE(TRIM(tc.case_code), '') = '' AND COALESCE(tc.is_deleted, FALSE) = FALSE
)
UPDATE test_cases tc
SET case_code = 'TC-' || LPAD((mx.n + ranked.rn)::TEXT, 4, '0')
FROM mx, ranked WHERE tc.id = ranked.id;

-- daily_log_entries.entry_code (scoped by daily_log → project via daily_logs)
ALTER TABLE daily_log_entries ADD COLUMN IF NOT EXISTS entry_code VARCHAR(50);
WITH logs AS (
  SELECT dle.id,
         dl.project_id,
         ROW_NUMBER() OVER (PARTITION BY dl.project_id ORDER BY dle.created_at NULLS LAST, dle.id) AS rn
  FROM daily_log_entries dle
  JOIN daily_logs dl ON dl.id = dle.daily_log_id
  WHERE COALESCE(TRIM(dle.entry_code), '') = '' AND COALESCE(dle.is_deleted, FALSE) = FALSE
),
mxp AS (
  SELECT dl.project_id,
         COALESCE(MAX(
           CASE WHEN dle.entry_code ~ '^LOG-[0-9]+$' THEN SUBSTRING(dle.entry_code FROM 5)::INT END
         ), 0) AS n
  FROM daily_log_entries dle
  JOIN daily_logs dl ON dl.id = dle.daily_log_id
  GROUP BY dl.project_id
)
UPDATE daily_log_entries dle
SET entry_code = 'LOG-' || LPAD((COALESCE(mxp.n, 0) + logs.rn)::TEXT, 4, '0')
FROM logs
LEFT JOIN mxp ON mxp.project_id = logs.project_id
WHERE dle.id = logs.id;

-- stage_plans.plan_code (short SP-NNNN per project)
ALTER TABLE stage_plans ADD COLUMN IF NOT EXISTS plan_code VARCHAR(50);
WITH ranked AS (
  SELECT sp.id, sp.project_id, ROW_NUMBER() OVER (PARTITION BY sp.project_id ORDER BY sp.created_at NULLS LAST, sp.id) AS rn
  FROM stage_plans sp
  WHERE COALESCE(TRIM(sp.plan_code), '') = '' AND COALESCE(sp.is_deleted, FALSE) = FALSE
),
mxp AS (
  SELECT sp.project_id,
         COALESCE(MAX(CASE WHEN plan_code ~ '^SP-[0-9]+$' THEN SUBSTRING(plan_code FROM 4)::INT END), 0) AS n
  FROM stage_plans sp GROUP BY sp.project_id
)
UPDATE stage_plans sp
SET plan_code = 'SP-' || LPAD((COALESCE(mxp.n, 0) + ranked.rn)::TEXT, 4, '0')
FROM ranked
LEFT JOIN mxp ON mxp.project_id = ranked.project_id
WHERE sp.id = ranked.id;

-- comm_meetings.meeting_code (MTG-NNNN per account)
ALTER TABLE comm_meetings ADD COLUMN IF NOT EXISTS meeting_code VARCHAR(50);
WITH ranked AS (
  SELECT m.id, m.account_id, ROW_NUMBER() OVER (PARTITION BY m.account_id ORDER BY m.created_at NULLS LAST, m.id) AS rn
  FROM comm_meetings m
  WHERE COALESCE(TRIM(m.meeting_code), '') = ''
),
mxa AS (
  SELECT m.account_id,
         COALESCE(MAX(CASE WHEN meeting_code ~ '^MTG-[0-9]+$' THEN SUBSTRING(meeting_code FROM 5)::INT END), 0) AS n
  FROM comm_meetings m GROUP BY m.account_id
)
UPDATE comm_meetings m
SET meeting_code = 'MTG-' || LPAD((COALESCE(mxa.n, 0) + ranked.rn)::TEXT, 4, '0')
FROM ranked
LEFT JOIN mxa ON mxa.account_id = ranked.account_id
WHERE m.id = ranked.id;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('teams', 'Team definitions within projects (Phase 12 codes)', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v525_platform_add_missing_code_columns.sql applied'; END $$;
