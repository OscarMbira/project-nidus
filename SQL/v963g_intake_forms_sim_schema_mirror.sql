-- =============================================================================
-- v963g_intake_forms_sim_schema_mirror.sql
-- v963 PMIS Core Gap Closure — Phase 9 (GAP-06 Intake Forms): sim schema mirror.
-- Mirrors public.intake_forms / intake_form_fields / intake_form_submissions /
-- intake_form_submission_data (SQL/v644) into the sim schema. The public schema's project
-- link (`project_id`) becomes `practice_project_id` here, referencing sim.practice_projects
-- (SQL/v80) — the Simulator's practice-PM project entity, per the naming convention used by
-- every other sim project-scoped table (see SQL/v461_sim_planning_tables.sql).
-- Prerequisites: v66 (sim.update_updated_at), v80 (sim.practice_projects), public.accounts,
-- public.is_user_pmo_admin.
-- No seed data.
-- =============================================================================

CREATE TABLE IF NOT EXISTS sim.intake_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  practice_project_id UUID REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  form_name VARCHAR(255) NOT NULL,
  form_code VARCHAR(80) NOT NULL,
  public_token VARCHAR(64) NOT NULL,
  target_entity_type VARCHAR(40) NOT NULL DEFAULT 'issue',
  branding_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  active_from DATE,
  active_to DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_sim_intake_forms_code UNIQUE (account_id, form_code),
  CONSTRAINT uq_sim_intake_forms_token UNIQUE (public_token)
);

CREATE TABLE IF NOT EXISTS sim.intake_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES sim.intake_forms(id) ON DELETE CASCADE,
  field_key VARCHAR(80) NOT NULL,
  field_label VARCHAR(255) NOT NULL,
  field_type VARCHAR(40) NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  field_options JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_sim_intake_form_fields UNIQUE (form_id, field_key)
);

CREATE TABLE IF NOT EXISTS sim.intake_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES sim.intake_forms(id) ON DELETE CASCADE,
  submitter_name VARCHAR(255),
  submitter_email VARCHAR(255),
  submission_status VARCHAR(30) NOT NULL DEFAULT 'received'
    CHECK (submission_status IN ('received', 'processing', 'created', 'rejected', 'spam')),
  created_entity_type VARCHAR(40),
  created_entity_id UUID,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.intake_form_submission_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES sim.intake_form_submissions(id) ON DELETE CASCADE,
  field_id UUID REFERENCES sim.intake_form_fields(id) ON DELETE SET NULL,
  field_key VARCHAR(80) NOT NULL,
  field_value TEXT,
  value_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sim_intake_forms_practice_project ON sim.intake_forms (practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_intake_form_fields_form ON sim.intake_form_fields (form_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_intake_form_submissions_form ON sim.intake_form_submissions (form_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_intake_form_submission_data_submission ON sim.intake_form_submission_data (submission_id);

-- ── Triggers ─────────────────────────────────────────────────────────────────

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['intake_forms', 'intake_form_fields', 'intake_form_submissions', 'intake_form_submission_data']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sim_%s_updated_at ON sim.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_sim_%s_updated_at BEFORE UPDATE ON sim.%I FOR EACH ROW EXECUTE FUNCTION sim.update_updated_at()', t, t);
  END LOOP;
END $$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- A form is visible/editable to the owner of its linked practice project, or (for
-- account-level forms with no linked project) to a PMO admin. Children resolve through their
-- parent form. This is stricter-but-correct compared to the public schema's v644 policy, which
-- has a gap for project_id IS NULL forms on the top-level table (see intake_form_fields'
-- narrower fix there) — not touched here since this file only adds the sim mirror.

ALTER TABLE sim.intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.intake_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.intake_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.intake_form_submission_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_sim_intake_forms ON sim.intake_forms;
CREATE POLICY policy_sim_intake_forms ON sim.intake_forms FOR ALL TO authenticated
  USING (
    (practice_project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM sim.practice_projects pp WHERE pp.id = intake_forms.practice_project_id AND pp.user_id = auth.uid()
    ))
    OR (practice_project_id IS NULL AND public.is_user_pmo_admin(auth.uid()))
  )
  WITH CHECK (
    (practice_project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM sim.practice_projects pp WHERE pp.id = intake_forms.practice_project_id AND pp.user_id = auth.uid()
    ))
    OR (practice_project_id IS NULL AND public.is_user_pmo_admin(auth.uid()))
  );

DROP POLICY IF EXISTS policy_sim_intake_form_fields ON sim.intake_form_fields;
CREATE POLICY policy_sim_intake_form_fields ON sim.intake_form_fields FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.intake_forms f
    WHERE f.id = intake_form_fields.form_id
      AND (
        (f.practice_project_id IS NOT NULL AND EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = f.practice_project_id AND pp.user_id = auth.uid()))
        OR (f.practice_project_id IS NULL AND public.is_user_pmo_admin(auth.uid()))
      )
  ));

DROP POLICY IF EXISTS policy_sim_intake_form_submissions ON sim.intake_form_submissions;
CREATE POLICY policy_sim_intake_form_submissions ON sim.intake_form_submissions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.intake_forms f
    WHERE f.id = intake_form_submissions.form_id
      AND (
        (f.practice_project_id IS NOT NULL AND EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = f.practice_project_id AND pp.user_id = auth.uid()))
        OR (f.practice_project_id IS NULL AND public.is_user_pmo_admin(auth.uid()))
      )
  ));

DROP POLICY IF EXISTS policy_sim_intake_form_submission_data ON sim.intake_form_submission_data;
CREATE POLICY policy_sim_intake_form_submission_data ON sim.intake_form_submission_data FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.intake_form_submissions s
    JOIN sim.intake_forms f ON f.id = s.form_id
    WHERE s.id = intake_form_submission_data.submission_id
      AND (
        (f.practice_project_id IS NOT NULL AND EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = f.practice_project_id AND pp.user_id = auth.uid()))
        OR (f.practice_project_id IS NULL AND public.is_user_pmo_admin(auth.uid()))
      )
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON sim.intake_forms, sim.intake_form_fields, sim.intake_form_submissions, sim.intake_form_submission_data TO authenticated;

-- ── database_tables registry ────────────────────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.intake_forms', 'Simulator public intake form definitions (GAP-06 sim mirror)', false, true),
  ('sim.intake_form_fields', 'Fields per Simulator intake form (GAP-06 sim mirror)', false, true),
  ('sim.intake_form_submissions', 'Simulator external form submissions (GAP-06 sim mirror)', false, true),
  ('sim.intake_form_submission_data', 'Field values per Simulator submission (GAP-06 sim mirror)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v963g_intake_forms_sim_schema_mirror.sql completed'; END $$;
