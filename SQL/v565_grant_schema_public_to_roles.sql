-- ============================================================================
-- v565: Grant USAGE on schema public to service_role, authenticated, anon
--
-- Root cause:
--   Edge Function receives "permission denied for schema public" (PG code 42501)
--   when querying via direct PostgREST REST call with the service role key.
--   PostgreSQL requires USAGE on a schema before any object inside it can be
--   accessed, regardless of table-level GRANTs or RLS bypass (BYPASSRLS).
--
--   In a standard Supabase project these grants exist by default, but they can
--   be missing when the project schema was initialised manually or certain
--   migration scripts ran ALTER DEFAULT PRIVILEGES in a way that skipped them.
--
-- Safe to run multiple times (GRANT is idempotent).
-- ============================================================================

-- Schema-level access
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Ensure service_role can read/write all existing tables
GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES  IN SCHEMA public TO service_role;

-- Ensure authenticated can read/write all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE                        ON ALL ROUTINES  IN SCHEMA public TO authenticated;

-- Ensure anon can execute public functions (needed for auth flows)
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO anon;

-- Set default privileges so future tables/sequences/functions are covered too
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON ROUTINES  TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT                  ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE                        ON ROUTINES  TO authenticated;

-- Verify
DO $$
DECLARE
  v_has_service_role boolean;
  v_has_authenticated boolean;
BEGIN
  SELECT has_schema_privilege('service_role',  'public', 'USAGE') INTO v_has_service_role;
  SELECT has_schema_privilege('authenticated', 'public', 'USAGE') INTO v_has_authenticated;
  RAISE NOTICE 'v565: service_role USAGE on public = %, authenticated USAGE on public = %',
               v_has_service_role, v_has_authenticated;
END $$;
