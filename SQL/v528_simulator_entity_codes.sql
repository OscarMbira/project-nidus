-- ============================================================================
-- v528_simulator_entity_codes.sql
-- Phase 12 — Simulator (sim): codes, back-fill, triggers, indexes
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
ALTER TABLE sim.scenarios ADD COLUMN IF NOT EXISTS scenario_code VARCHAR(50);
ALTER TABLE sim.simulation_runs ADD COLUMN IF NOT EXISTS run_code VARCHAR(50);
ALTER TABLE sim.practice_projects ADD COLUMN IF NOT EXISTS practice_code VARCHAR(50);
ALTER TABLE sim.ai_events ADD COLUMN IF NOT EXISTS event_code VARCHAR(50);
ALTER TABLE sim.certificates ADD COLUMN IF NOT EXISTS cert_code VARCHAR(50);

-- ---------------------------------------------------------------------------
-- Back-fill
-- ---------------------------------------------------------------------------
WITH mx AS (
  SELECT COALESCE(MAX(
    CASE WHEN scenario_code ~ '^SCN-[0-9]+$' THEN SUBSTRING(scenario_code FROM 5)::INT END
  ), 0) AS n FROM sim.scenarios
),
ranked AS (
  SELECT s.id, ROW_NUMBER() OVER (ORDER BY s.created_at NULLS LAST, s.id) AS rn
  FROM sim.scenarios s
  WHERE COALESCE(TRIM(s.scenario_code), '') = ''
)
UPDATE sim.scenarios s
SET scenario_code = 'SCN-' || LPAD((mx.n + ranked.rn)::TEXT, 4, '0')
FROM mx, ranked WHERE s.id = ranked.id;

WITH mx AS (
  SELECT COALESCE(MAX(
    CASE WHEN run_code ~ '^RUN-[0-9]+$' THEN SUBSTRING(run_code FROM 5)::INT END
  ), 0) AS n FROM sim.simulation_runs
),
ranked AS (
  SELECT r.id, ROW_NUMBER() OVER (ORDER BY r.created_at NULLS LAST, r.id) AS rn
  FROM sim.simulation_runs r
  WHERE COALESCE(TRIM(r.run_code), '') = ''
)
UPDATE sim.simulation_runs r
SET run_code = 'RUN-' || LPAD((mx.n + ranked.rn)::TEXT, 4, '0')
FROM mx, ranked WHERE r.id = ranked.id;

WITH mx AS (
  SELECT GREATEST(
    COALESCE(MAX(CASE WHEN practice_code ~ '^PP-[0-9]+$' THEN SUBSTRING(practice_code FROM 4)::INT END), 0),
    COALESCE(MAX(CASE WHEN project_code ~ '^PP-[0-9]+$' THEN SUBSTRING(project_code FROM 4)::INT END), 0)
  ) AS n FROM sim.practice_projects
),
ranked AS (
  SELECT p.id, ROW_NUMBER() OVER (ORDER BY p.created_at NULLS LAST, p.id) AS rn
  FROM sim.practice_projects p
  WHERE COALESCE(TRIM(p.practice_code), '') = ''
)
UPDATE sim.practice_projects p
SET practice_code = 'PP-' || LPAD((mx.n + ranked.rn)::TEXT, 4, '0')
FROM mx, ranked WHERE p.id = ranked.id;

WITH ranked AS (
  SELECT e.id, e.run_id,
         ROW_NUMBER() OVER (PARTITION BY e.run_id ORDER BY e.created_at NULLS LAST, e.id) AS rn
  FROM sim.ai_events e
  WHERE COALESCE(TRIM(e.event_code), '') = ''
),
mxr AS (
  SELECT e.run_id,
         COALESCE(MAX(
           CASE WHEN e.event_code ~ '^EVT-[0-9]+$' THEN SUBSTRING(e.event_code FROM 5)::INT END
         ), 0) AS n
  FROM sim.ai_events e
  GROUP BY e.run_id
)
UPDATE sim.ai_events e
SET event_code = 'EVT-' || LPAD((COALESCE(mxr.n, 0) + ranked.rn)::TEXT, 4, '0')
FROM ranked
LEFT JOIN mxr ON mxr.run_id = ranked.run_id
WHERE e.id = ranked.id;

WITH mx AS (
  SELECT COALESCE(MAX(
    CASE WHEN cert_code ~ '^CERT-[0-9]+$' THEN SUBSTRING(cert_code FROM 6)::INT END
  ), 0) AS n FROM sim.certificates
),
ranked AS (
  SELECT c.id, ROW_NUMBER() OVER (ORDER BY c.created_at NULLS LAST, c.id) AS rn
  FROM sim.certificates c
  WHERE COALESCE(TRIM(c.cert_code), '') = ''
)
UPDATE sim.certificates c
SET cert_code = 'CERT-' || LPAD((mx.n + ranked.rn)::TEXT, 4, '0')
FROM mx, ranked WHERE c.id = ranked.id;

-- ---------------------------------------------------------------------------
-- Trigger helpers (reuse public.phase12_max_suffix_global where table is in public;
-- inline max for sim schema tables)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sim.phase12_max_suffix_sim(p_table text, p_col text, p_prefix text)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_max int;
  v_re text := '^' || p_prefix || '-[0-9]+$';
  v_from int := length(p_prefix) + 2;
BEGIN
  -- Build sim."table_name" explicitly. Passing ::regclass into format('%I') produced a single
  -- quoted token "sim.scenarios", which is not schema-qualified and breaks lookups (42P01).
  IF p_table NOT IN ('scenarios', 'simulation_runs', 'practice_projects', 'certificates') THEN
    RAISE EXCEPTION 'phase12_max_suffix_sim: unsupported table %', p_table;
  END IF;
  EXECUTE format(
    $q$SELECT COALESCE(MAX(
      CASE WHEN %I ~ $1 THEN SUBSTRING(%I FROM $2)::INT END
    ), 0) FROM sim.%I$q$,
    p_col,
    p_col,
    p_table
  )
  INTO v_max
  USING v_re, v_from;
  RETURN v_max;
END;
$$;

CREATE OR REPLACE FUNCTION sim.trg_scenarios_set_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE n int;
BEGIN
  IF NEW.scenario_code IS NULL OR BTRIM(NEW.scenario_code) = '' THEN
    SELECT sim.phase12_max_suffix_sim('scenarios', 'scenario_code', 'SCN') + 1 INTO n;
    NEW.scenario_code := 'SCN-' || LPAD(n::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sim_scenarios_phase12_code ON sim.scenarios;
CREATE TRIGGER trg_sim_scenarios_phase12_code
  BEFORE INSERT ON sim.scenarios
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_scenarios_set_code();

CREATE OR REPLACE FUNCTION sim.trg_simulation_runs_set_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE n int;
BEGIN
  IF NEW.run_code IS NULL OR BTRIM(NEW.run_code) = '' THEN
    SELECT sim.phase12_max_suffix_sim('simulation_runs', 'run_code', 'RUN') + 1 INTO n;
    NEW.run_code := 'RUN-' || LPAD(n::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sim_simulation_runs_phase12_code ON sim.simulation_runs;
CREATE TRIGGER trg_sim_simulation_runs_phase12_code
  BEFORE INSERT ON sim.simulation_runs
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_simulation_runs_set_code();

CREATE OR REPLACE FUNCTION sim.trg_practice_projects_set_practice_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE n int;
BEGIN
  IF NEW.practice_code IS NULL OR BTRIM(NEW.practice_code) = '' THEN
    SELECT sim.phase12_max_suffix_sim('practice_projects', 'practice_code', 'PP') + 1 INTO n;
    NEW.practice_code := 'PP-' || LPAD(n::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sim_practice_projects_phase12_code ON sim.practice_projects;
CREATE TRIGGER trg_sim_practice_projects_phase12_code
  BEFORE INSERT ON sim.practice_projects
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_practice_projects_set_practice_code();

CREATE OR REPLACE FUNCTION sim.trg_ai_events_set_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE n int;
BEGIN
  IF NEW.event_code IS NULL OR BTRIM(NEW.event_code) = '' THEN
    SELECT COALESCE(MAX(
      CASE WHEN event_code ~ '^EVT-[0-9]+$' THEN SUBSTRING(event_code FROM 5)::INT END
    ), 0) + 1 INTO n
    FROM sim.ai_events WHERE run_id = NEW.run_id;
    NEW.event_code := 'EVT-' || LPAD(n::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sim_ai_events_phase12_code ON sim.ai_events;
CREATE TRIGGER trg_sim_ai_events_phase12_code
  BEFORE INSERT ON sim.ai_events
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_ai_events_set_code();

CREATE OR REPLACE FUNCTION sim.trg_certificates_set_cert_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE n int;
BEGIN
  IF NEW.cert_code IS NULL OR BTRIM(NEW.cert_code) = '' THEN
    SELECT sim.phase12_max_suffix_sim('certificates', 'cert_code', 'CERT') + 1 INTO n;
    NEW.cert_code := 'CERT-' || LPAD(n::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sim_certificates_phase12_code ON sim.certificates;
CREATE TRIGGER trg_sim_certificates_phase12_code
  BEFORE INSERT ON sim.certificates
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_certificates_set_cert_code();

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_scenarios_scenario_code
  ON sim.scenarios (scenario_code) WHERE scenario_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_simulation_runs_run_code
  ON sim.simulation_runs (run_code) WHERE run_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_practice_projects_practice_code
  ON sim.practice_projects (practice_code) WHERE practice_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sim_ai_events_event_code_run
  ON sim.ai_events (event_code, run_id) WHERE event_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_certificates_cert_code
  ON sim.certificates (cert_code) WHERE cert_code IS NOT NULL;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('sim.scenarios', 'PM Simulator scenarios (Phase 12 scenario_code)', false, true, 'simulation'),
  ('sim.simulation_runs', 'Simulation runs (Phase 12 run_code)', false, true, 'simulation'),
  ('sim.practice_projects', 'Practice projects (Phase 12 practice_code)', false, true, 'simulation'),
  ('sim.ai_events', 'Sim AI events (Phase 12 event_code)', false, true, 'simulation'),
  ('sim.certificates', 'Sim certificates (Phase 12 cert_code)', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v528_simulator_entity_codes.sql applied'; END $$;
