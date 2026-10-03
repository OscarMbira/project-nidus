-- ============================================================================
-- v1193: Test runs store an environment name from the project catalogue
-- ============================================================================
-- public.test_runs.environment and sim.practice_test_runs.environment were
-- limited to dev/staging/uat/production/other. The run form now lists
-- test_environments / practice_test_environments. Drop that check and the
-- hardcoded 'uat' default so a saved run can use any catalogue name.
-- Run this before saving a test run with an environment such as Performance.
-- ============================================================================

DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'test_runs'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%environment%'
    LOOP
        EXECUTE format('ALTER TABLE public.test_runs DROP CONSTRAINT %I', constraint_name);
    END LOOP;

    FOR constraint_name IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'sim'
          AND rel.relname = 'practice_test_runs'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%environment%'
    LOOP
        EXECUTE format('ALTER TABLE sim.practice_test_runs DROP CONSTRAINT %I', constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.test_runs ALTER COLUMN environment DROP DEFAULT;
ALTER TABLE sim.practice_test_runs ALTER COLUMN environment DROP DEFAULT;
