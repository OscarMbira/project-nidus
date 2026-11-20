-- ============================================================================
-- v1490r: Rollback of v1490 / v1491 (field-level contextual help, v1345)
-- Drops the help, alias and event tables (and their seed rows) and the registry rows.
-- Only run to undo v1345 slice 1. The app shows plain labels again when the tables are gone.
-- ============================================================================
DROP TABLE IF EXISTS sim.field_help_events;
DROP TABLE IF EXISTS public.field_help_events;
DROP TABLE IF EXISTS public.field_help_aliases;
DROP TABLE IF EXISTS public.field_help;
DROP FUNCTION IF EXISTS public.trg_field_help_touch();
DELETE FROM public.database_tables
WHERE table_name IN ('field_help', 'field_help_aliases', 'field_help_events', 'sim.field_help_events');
