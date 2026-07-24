-- =============================================================================
-- v776: Legacy document templates (Track B) + domain CHECK extensions
-- Plan: projectplan/v775_legacy_template_upload_plan.md (implemented as v776;
--       v775 SQL was already used for ICT industry seed)
-- Prerequisites: v764 / v764c (pm_template_nodes), v774 (multi-document index)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Extend domain CHECKs (public + sim)
-- -----------------------------------------------------------------------------
ALTER TABLE public.pm_template_nodes
  DROP CONSTRAINT IF EXISTS chk_pm_template_nodes_domain;
ALTER TABLE public.pm_template_nodes
  ADD CONSTRAINT chk_pm_template_nodes_domain CHECK (
    domain IN (
      'fields', 'form_template', 'industry_plan', 'opa', 'process_template',
      'legacy_document', 'structured_list'
    )
  );

ALTER TABLE public.pm_template_entity_assignment
  DROP CONSTRAINT IF EXISTS chk_pm_template_entity_assignment_domain;
ALTER TABLE public.pm_template_entity_assignment
  ADD CONSTRAINT chk_pm_template_entity_assignment_domain CHECK (
    domain IN (
      'fields', 'form_template', 'industry_plan', 'opa', 'process_template',
      'legacy_document', 'structured_list'
    )
  );

ALTER TABLE sim.pm_template_nodes
  DROP CONSTRAINT IF EXISTS chk_sim_pm_template_nodes_domain;
ALTER TABLE sim.pm_template_nodes
  ADD CONSTRAINT chk_sim_pm_template_nodes_domain CHECK (
    domain IN (
      'fields', 'form_template', 'industry_plan', 'opa', 'process_template',
      'legacy_document', 'structured_list'
    )
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'sim'
      AND table_name = 'pm_template_entity_assignment'
      AND constraint_name = 'chk_sim_pm_template_entity_assignment_domain'
  ) THEN
    ALTER TABLE sim.pm_template_entity_assignment
      DROP CONSTRAINT chk_sim_pm_template_entity_assignment_domain;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sim' AND table_name = 'pm_template_entity_assignment'
  ) THEN
    ALTER TABLE sim.pm_template_entity_assignment
      DROP CONSTRAINT IF EXISTS chk_pm_template_entity_assignment_domain;
    ALTER TABLE sim.pm_template_entity_assignment
      ADD CONSTRAINT chk_sim_pm_template_entity_assignment_domain CHECK (
        domain IN (
          'fields', 'form_template', 'industry_plan', 'opa', 'process_template',
          'legacy_document', 'structured_list'
        )
      );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2) public.pmo_legacy_document_templates (Track B masters)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pmo_legacy_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  doc_category TEXT NOT NULL DEFAULT 'other',
  original_filename TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'legacy-templates',
  storage_path TEXT NOT NULL,
  file_size BIGINT NULL,
  mime_type TEXT NULL,
  extracted_text TEXT NULL,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(extracted_text, ''))
  ) STORED,
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  pm_template_node_id UUID NULL REFERENCES public.pm_template_nodes(id) ON DELETE SET NULL,
  global_template_id UUID NULL,
  is_system_synced BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_pldt_doc_category CHECK (
    doc_category IN ('charter', 'brd', 'status_report', 'other')
  ),
  CONSTRAINT chk_pldt_status CHECK (
    status IN ('draft', 'published', 'archived')
  ),
  CONSTRAINT chk_pldt_version CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_pldt_account ON public.pmo_legacy_document_templates (account_id);
CREATE INDEX IF NOT EXISTS idx_pldt_category ON public.pmo_legacy_document_templates (doc_category);
CREATE INDEX IF NOT EXISTS idx_pldt_status ON public.pmo_legacy_document_templates (status);
CREATE INDEX IF NOT EXISTS idx_pldt_node ON public.pmo_legacy_document_templates (pm_template_node_id);
CREATE INDEX IF NOT EXISTS idx_pldt_search ON public.pmo_legacy_document_templates USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_pldt_global ON public.pmo_legacy_document_templates (global_template_id)
  WHERE global_template_id IS NOT NULL;

COMMENT ON TABLE public.pmo_legacy_document_templates IS
  'Track B: uploaded legacy Word/PDF/PowerPoint reference templates (charters, BRDs, decks).';

-- -----------------------------------------------------------------------------
-- 3) sim mirror (Platform–Simulator parity)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sim.pmo_legacy_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  title TEXT NOT NULL,
  doc_category TEXT NOT NULL DEFAULT 'other',
  original_filename TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'legacy-templates',
  storage_path TEXT NOT NULL,
  file_size BIGINT NULL,
  mime_type TEXT NULL,
  extracted_text TEXT NULL,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(extracted_text, ''))
  ) STORED,
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  pm_template_node_id UUID NULL,
  global_template_id UUID NULL,
  is_system_synced BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sim_pldt_doc_category CHECK (
    doc_category IN ('charter', 'brd', 'status_report', 'other')
  ),
  CONSTRAINT chk_sim_pldt_status CHECK (
    status IN ('draft', 'published', 'archived')
  ),
  CONSTRAINT chk_sim_pldt_version CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_sim_pldt_account ON sim.pmo_legacy_document_templates (account_id);
CREATE INDEX IF NOT EXISTS idx_sim_pldt_search ON sim.pmo_legacy_document_templates USING GIN (search_vector);

DO $$
BEGIN
  RAISE NOTICE 'v776_legacy_document_templates_tables.sql applied';
END $$;
