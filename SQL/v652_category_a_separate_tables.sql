-- v652: Category A lifecycle tables — history, archive, _all views (public schema)
-- Keeps existing live table names (risks, issues, …) for backward compatibility.
-- @see projectplan/v639_Record_Lifecycle_Management_Plan.md

CREATE OR REPLACE FUNCTION public.ensure_lifecycle_live_columns(p_table regclass)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  tname text := p_table::text;
BEGIN
  EXECUTE format(
    'ALTER TABLE %s ADD COLUMN IF NOT EXISTS record_status VARCHAR(30) DEFAULT ''live''',
    p_table
  );
  EXECUTE format(
    'ALTER TABLE %s ADD COLUMN IF NOT EXISTS root_record_id UUID',
    p_table
  );
  EXECUTE format(
    'ALTER TABLE %s ADD COLUMN IF NOT EXISTS record_version INTEGER DEFAULT 1',
    p_table
  );
  EXECUTE format(
    'ALTER TABLE %s ADD COLUMN IF NOT EXISTS parent_record_id UUID',
    p_table
  );
  EXECUTE format(
    'ALTER TABLE %s ADD COLUMN IF NOT EXISTS moved_to_history_at TIMESTAMPTZ',
    p_table
  );
  EXECUTE format(
    'ALTER TABLE %s ADD COLUMN IF NOT EXISTS authorised_by UUID REFERENCES public.users(id)',
    p_table
  );
  EXECUTE format(
    'ALTER TABLE %s ADD COLUMN IF NOT EXISTS authorised_at TIMESTAMPTZ',
    p_table
  );
  EXECUTE format(
    'UPDATE %s SET root_record_id = id WHERE root_record_id IS NULL',
    p_table
  );
  EXECUTE format(
    'UPDATE %s SET record_status = ''live'' WHERE record_status IS NULL',
    p_table
  );
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%s_record_status ON %s (record_status)',
    replace(tname, '.', '_'), p_table
  );
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%s_root_record_id ON %s (root_record_id)',
    replace(tname, '_', '_'), p_table
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_lifecycle_category_a(p_base text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  live regclass := to_regclass('public.' || p_base);
  hist text := p_base || '_history';
  arch text := p_base || '_archive';
  allv text := p_base || '_all';
BEGIN
  IF live IS NULL THEN
    RAISE NOTICE 'Skipping % — live table not found', p_base;
    RETURN;
  END IF;

  PERFORM public.ensure_lifecycle_live_columns(live);

  EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I (LIKE public.%I INCLUDING ALL)', hist, p_base);
  EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I (LIKE public.%I INCLUDING ALL)', arch, p_base);

  -- Schema parity: all three tables must share identical columns for _all UNION view
  EXECUTE format(
    'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ',
    p_base
  );
  EXECUTE format(
    'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.users(id)',
    p_base
  );
  EXECUTE format(
    'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ',
    hist
  );
  EXECUTE format(
    'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.users(id)',
    hist
  );
  EXECUTE format(
    'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ',
    arch
  );
  EXECUTE format(
    'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.users(id)',
    arch
  );
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%s_history_root ON public.%I (root_record_id)',
    p_base, hist
  );
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%s_archive_root ON public.%I (root_record_id)',
    p_base, arch
  );

  EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', allv);
  -- record_status is already a column on live/history/archive; do not SELECT *, record_status (duplicate cols)
  EXECUTE format($v$
    CREATE VIEW public.%I AS
      SELECT * FROM public.%I
      UNION ALL
      SELECT * FROM public.%I
      UNION ALL
      SELECT * FROM public.%I
  $v$, allv, p_base, hist, arch);

  INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
  VALUES
    (hist, 'History versions for ' || p_base, false, true),
    (arch, 'Archived versions for ' || p_base, false, true)
  ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
END;
$$;

SELECT public.ensure_lifecycle_category_a('risks');
SELECT public.ensure_lifecycle_category_a('issues');
SELECT public.ensure_lifecycle_category_a('change_requests');
SELECT public.ensure_lifecycle_category_a('tasks');
SELECT public.ensure_lifecycle_category_a('defects');

DO $$ BEGIN RAISE NOTICE 'v652_category_a_separate_tables.sql completed'; END $$;
