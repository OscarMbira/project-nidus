-- ============================================================================
-- v1384: Requirements register — owner, rationale, verification method, non-functional area
-- ============================================================================
-- PRD / plan v1338 (IT Requirements Specification), Slice 1 — decisions D4, D5, D5b.
--   * public.requirement_nfr_areas — the 10 non-functional areas (database reference data, rule
--     25.1). area_key is a fixed system slug, not a generated reference (rule 16.2 n/a).
--   * public.requirements_register and sim.requirements_register gain owner_name, rationale,
--     verification_method (test / inspection / demonstration / analysis) and nfr_area_key.
-- The app shows and saves these fields only once this file has run (it checks for the columns).
-- After running: re-run SQL/v1251_planner_table_wall.sql so the new table is walled for Planner
-- sessions (CLAUDE.md database rule 6).
-- Idempotent. RLS on requirements_register is unchanged.
-- ============================================================================

-- ── 1. Non-functional areas (reference data) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.requirement_nfr_areas (
  area_key    TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.requirement_nfr_areas IS
  'v1384: areas used to group non-functional requirements (requirements_register.nfr_area_key) in the Requirements Specification. Read by Platform and Simulator.';

ALTER TABLE public.requirement_nfr_areas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.requirement_nfr_areas FROM anon;
GRANT SELECT ON public.requirement_nfr_areas TO authenticated;
GRANT ALL ON public.requirement_nfr_areas TO service_role;
DROP POLICY IF EXISTS policy_requirement_nfr_areas_select ON public.requirement_nfr_areas;
CREATE POLICY policy_requirement_nfr_areas_select ON public.requirement_nfr_areas
  FOR SELECT TO authenticated
  USING (TRUE);

INSERT INTO public.requirement_nfr_areas (area_key, label, description, sort_order) VALUES
  ('volumes',                 'Volumes',                   'Numbers of records, transactions, users and growth the solution must handle.', 10),
  ('performance',             'Performance',               'Response times, throughput and batch windows.', 20),
  ('security',                'Security',                  'Access control, authentication, encryption and security monitoring.', 30),
  ('migration',               'Migration',                 'Moving existing data and users onto the new solution.', 40),
  ('data_requirements',       'Data Requirements',         'Data quality, ownership, retention and master data.', 50),
  ('data_protection_privacy', 'Data Protection & Privacy', 'Handling of personal data, consent, masking and data residency.', 60),
  ('enquiry_reports',         'Enquiry & Reports',         'Screens, enquiries and reports users and regulators need.', 70),
  ('availability_recovery',   'Availability & Recovery',   'Service hours, availability, backup and recovery objectives.', 80),
  ('usability_accessibility', 'Usability & Accessibility', 'Ease of use, accessibility standards, languages and devices.', 90),
  ('audit_logging',           'Audit & Logging',           'Audit trail, logging, monitoring and evidence for auditors.', 100)
ON CONFLICT (area_key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ── 2. New requirement columns (Platform and Simulator) ─────────────────────────
ALTER TABLE public.requirements_register
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS rationale TEXT,
  ADD COLUMN IF NOT EXISTS verification_method TEXT,
  ADD COLUMN IF NOT EXISTS nfr_area_key TEXT REFERENCES public.requirement_nfr_areas(area_key) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE sim.requirements_register
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS rationale TEXT,
  ADD COLUMN IF NOT EXISTS verification_method TEXT,
  ADD COLUMN IF NOT EXISTS nfr_area_key TEXT REFERENCES public.requirement_nfr_areas(area_key) ON UPDATE CASCADE ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_requirements_register_verification_method') THEN
    ALTER TABLE public.requirements_register
      ADD CONSTRAINT chk_requirements_register_verification_method
      CHECK (verification_method IS NULL OR verification_method IN ('test', 'inspection', 'demonstration', 'analysis'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sim_requirements_register_verification_method') THEN
    ALTER TABLE sim.requirements_register
      ADD CONSTRAINT chk_sim_requirements_register_verification_method
      CHECK (verification_method IS NULL OR verification_method IN ('test', 'inspection', 'demonstration', 'analysis'));
  END IF;
END $$;

COMMENT ON COLUMN public.requirements_register.owner_name IS 'v1384: person accountable for the requirement.';
COMMENT ON COLUMN public.requirements_register.rationale IS 'v1384: why the requirement is needed.';
COMMENT ON COLUMN public.requirements_register.verification_method IS 'v1384: how the requirement will be shown to be met — test, inspection, demonstration or analysis.';
COMMENT ON COLUMN public.requirements_register.nfr_area_key IS 'v1384: non-functional area (requirement_nfr_areas) — used when category = non_functional.';

CREATE INDEX IF NOT EXISTS idx_requirements_register_project_category
  ON public.requirements_register (project_id, category) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_requirements_register_project_category
  ON sim.requirements_register (practice_project_id, category) WHERE is_deleted = FALSE;

-- ── 3. Register the new table ─────────────────────────────────────────────────────
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('requirement_nfr_areas', 'Non-functional requirement areas (Volumes, Performance, Security, …) used to group requirements in the Requirements Specification', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$
DECLARE
  v_areas INT;
BEGIN
  SELECT COUNT(*) INTO v_areas FROM public.requirement_nfr_areas WHERE is_active;
  RAISE NOTICE 'v1384: % non-functional areas (expected 10); requirement columns added to public and sim', v_areas;
END $$;

NOTIFY pgrst, 'reload schema';
