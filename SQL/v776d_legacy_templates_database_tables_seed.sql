-- =============================================================================
-- v776d: Register legacy template tables in database_tables
-- Prerequisites: v776 + v776f tables exist; database_tables registry
-- =============================================================================

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  (
    'pmo_legacy_document_templates',
    'Uploaded legacy Word/PDF/PowerPoint reference templates (charters, BRDs, status decks)',
    false,
    true
  ),
  (
    'pmo_legacy_structured_lists',
    'Uploaded standalone structured list templates (risk register, RAID, stakeholder, budget)',
    false,
    true
  )
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  is_active = TRUE,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v776d_legacy_templates_database_tables_seed.sql applied';
END $$;
