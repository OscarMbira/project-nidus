-- ============================================================================
-- v1282: Import Mapper — saved column mappings (PRD D26, story 34; plan SQL #11)
--
--   <schema>.import_column_mappings: a confirmed mapping from a source file's columns to a
--   bulk-upload template's fields, saved per organisation, template and source "signature"
--   (the file's normalised headers). Offered automatically when the same headers appear again.
--     mapping      {"<source header>": "<template field key>" | null}
--     conversions  {"<template field key>": {"<source value, lower case>": "<template value>"}}
--   Anyone in the organisation can use and save mappings (they hold column names only, no data).
--
-- Prerequisites: v1016 (auth_user_can_access_account). Idempotent.
-- After running: re-run SQL/v1251_planner_table_wall.sql (new public table, CLAUDE.md rule 6).
-- ============================================================================

DO $$
DECLARE s TEXT;
BEGIN
  FOREACH s IN ARRAY ARRAY['public', 'sim'] LOOP
    EXECUTE format($t$
      CREATE TABLE IF NOT EXISTS %1$I.import_column_mappings (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id        UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
        target_template   TEXT NOT NULL CHECK (target_template ~ '^[a-z][a-z0-9_]{1,62}$'),
        source_signature  TEXT NOT NULL CHECK (char_length(source_signature) BETWEEN 4 AND 128),
        source_headers    TEXT[] NOT NULL DEFAULT '{}',
        mapping           JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(mapping) = 'object'),
        conversions       JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(conversions) = 'object'),
        use_count         INTEGER NOT NULL DEFAULT 0,
        last_used_at      TIMESTAMPTZ,
        created_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (account_id, target_template, source_signature)
      )$t$, s);
    EXECUTE format('ALTER TABLE %1$I.import_column_mappings ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('DROP POLICY IF EXISTS import_column_mappings_select ON %1$I.import_column_mappings', s);
    EXECUTE format('CREATE POLICY import_column_mappings_select ON %1$I.import_column_mappings FOR SELECT TO authenticated
                    USING (public.auth_user_can_access_account(account_id))', s);
    EXECUTE format('DROP POLICY IF EXISTS import_column_mappings_insert ON %1$I.import_column_mappings', s);
    EXECUTE format('CREATE POLICY import_column_mappings_insert ON %1$I.import_column_mappings FOR INSERT TO authenticated
                    WITH CHECK (public.auth_user_can_access_account(account_id))', s);
    EXECUTE format('DROP POLICY IF EXISTS import_column_mappings_update ON %1$I.import_column_mappings', s);
    EXECUTE format('CREATE POLICY import_column_mappings_update ON %1$I.import_column_mappings FOR UPDATE TO authenticated
                    USING (public.auth_user_can_access_account(account_id)) WITH CHECK (public.auth_user_can_access_account(account_id))', s);
    EXECUTE format('DROP POLICY IF EXISTS import_column_mappings_delete ON %1$I.import_column_mappings', s);
    EXECUTE format('CREATE POLICY import_column_mappings_delete ON %1$I.import_column_mappings FOR DELETE TO authenticated
                    USING (public.auth_user_can_access_account(account_id))', s);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %1$I.import_column_mappings TO authenticated', s);
    EXECUTE format('GRANT ALL ON %1$I.import_column_mappings TO service_role', s);
  END LOOP;
END $$;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('import_column_mappings', 'Saved Import Mapper column mappings per organisation, bulk-upload template and source file layout (v1282)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'v1282_import_column_mappings.sql completed — re-run v1251_planner_table_wall.sql'; END $$;
