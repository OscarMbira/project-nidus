-- ============================================================================
-- v1027: Ensure project_initiation_documents link columns have FKs
-- ============================================================================
-- PostgREST embeds (e.g. business_case:business_case_id(...)) require a real
-- foreign key. Some environments have the UUID columns without the constraint,
-- which yields HTTP 400: "Could not find a relationship between
-- 'project_initiation_documents' and 'business_case_id' in the schema cache".
--
-- The Platform/Simulator PID services now avoid those embeds; this migration
-- still restores FKs so referential integrity and future embeds work.
-- ============================================================================

-- Helper: add FK only when the column exists, target table exists, and no FK
-- already covers that column.

-- business_case_id → business_cases
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_initiation_documents' AND column_name = 'business_case_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'business_cases'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
    WHERE n.nspname = 'public'
      AND t.relname = 'project_initiation_documents'
      AND c.contype = 'f'
      AND a.attname = 'business_case_id'
  ) THEN
    ALTER TABLE public.project_initiation_documents
      ADD CONSTRAINT project_initiation_documents_business_case_id_fkey
      FOREIGN KEY (business_case_id) REFERENCES public.business_cases(id) ON DELETE SET NULL;
  END IF;
END $$;

-- project_brief_id → project_briefs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_initiation_documents' AND column_name = 'project_brief_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'project_briefs'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
    WHERE n.nspname = 'public'
      AND t.relname = 'project_initiation_documents'
      AND c.contype = 'f'
      AND a.attname = 'project_brief_id'
  ) THEN
    ALTER TABLE public.project_initiation_documents
      ADD CONSTRAINT project_initiation_documents_project_brief_id_fkey
      FOREIGN KEY (project_brief_id) REFERENCES public.project_briefs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- project_mandate_id → project_mandates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_initiation_documents' AND column_name = 'project_mandate_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'project_mandates'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
    WHERE n.nspname = 'public'
      AND t.relname = 'project_initiation_documents'
      AND c.contype = 'f'
      AND a.attname = 'project_mandate_id'
  ) THEN
    ALTER TABLE public.project_initiation_documents
      ADD CONSTRAINT project_initiation_documents_project_mandate_id_fkey
      FOREIGN KEY (project_mandate_id) REFERENCES public.project_mandates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- project_product_description_id → project_product_descriptions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'project_initiation_documents'
      AND column_name = 'project_product_description_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'project_product_descriptions'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
    WHERE n.nspname = 'public'
      AND t.relname = 'project_initiation_documents'
      AND c.contype = 'f'
      AND a.attname = 'project_product_description_id'
  ) THEN
    ALTER TABLE public.project_initiation_documents
      ADD CONSTRAINT project_initiation_documents_project_product_description_id_fkey
      FOREIGN KEY (project_product_description_id)
      REFERENCES public.project_product_descriptions(id) ON DELETE SET NULL;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
