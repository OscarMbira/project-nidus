-- ================================================
-- File: v1176_reload_postgrest_schema_cache.sql
-- Description: Force PostgREST to reload its cached schema. v1174 added
--              timesheet_entries.overtime_type_code via ALTER TABLE; Supabase normally
--              auto-reloads PostgREST's schema cache on DDL via an event trigger, but it can
--              lag — causing "Could not find the 'overtime_type_code' column ... in the schema
--              cache" even though the column genuinely exists. This is a cache-only issue, not
--              a data/migration problem.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

NOTIFY pgrst, 'reload schema';
