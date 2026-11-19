-- ============================================================================
-- v1481: Project Mandate — assumptions and outline risks (v1344, slice 2)
-- ============================================================================
-- PRD projectprd/v1344_project_setup_forms_fields_audit_seed_PRD.md story 14 / D7: the mandate
-- should record its assumptions and an outline of known risks. No existing column holds them
-- (constraints, scope, interfaces, quality fields already exist and are now all editable).
-- Both columns hold one item per line, like the other mandate list fields.
-- Platform (public.project_mandates) and Simulator (sim.project_mandates).
-- Idempotent.
-- ============================================================================

ALTER TABLE public.project_mandates ADD COLUMN IF NOT EXISTS assumptions TEXT;
ALTER TABLE public.project_mandates ADD COLUMN IF NOT EXISTS outline_risks TEXT;
ALTER TABLE sim.project_mandates ADD COLUMN IF NOT EXISTS assumptions TEXT;
ALTER TABLE sim.project_mandates ADD COLUMN IF NOT EXISTS outline_risks TEXT;

COMMENT ON COLUMN public.project_mandates.assumptions IS 'v1481: assumptions the mandate is based on, one per line.';
COMMENT ON COLUMN public.project_mandates.outline_risks IS 'v1481: known risks / issues at mandate stage, one per line.';
COMMENT ON COLUMN sim.project_mandates.assumptions IS 'v1481: assumptions the mandate is based on, one per line.';
COMMENT ON COLUMN sim.project_mandates.outline_risks IS 'v1481: known risks / issues at mandate stage, one per line.';

NOTIFY pgrst, 'reload schema';
