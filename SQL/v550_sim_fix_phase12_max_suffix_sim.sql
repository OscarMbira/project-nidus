-- v550: Fix sim.phase12_max_suffix_sim dynamic FROM clause (Phase 12 / v528)
--
-- Bug: format('%I', ('sim.' || p_table)::regclass) yielded a single identifier "sim.scenarios",
--      so PostgreSQL treated it as one relation name (42P01: relation "sim.scenarios" does not exist).
-- Safe fix: qualify schema as literal sim. and pass only the table name through %I.
--
-- Apply after v528 if inserts into sim.scenarios hit trg_scenarios_set_code errors.

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

DO $$ BEGIN RAISE NOTICE 'v550_sim_fix_phase12_max_suffix_sim.sql applied'; END $$;
