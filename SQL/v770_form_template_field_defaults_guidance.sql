-- =============================================================================
-- v770: Add guidance_text to form template field defaults (Platform + Simulator)
-- Guidance = instructional help (does not pre-fill instances by itself).
-- default_value = sample / org default that pre-fills new form instances.
-- Prerequisites: v761
-- =============================================================================

ALTER TABLE public.form_template_field_defaults
    ADD COLUMN IF NOT EXISTS guidance_text TEXT NULL;

ALTER TABLE sim.form_template_field_defaults
    ADD COLUMN IF NOT EXISTS guidance_text TEXT NULL;

COMMENT ON COLUMN public.form_template_field_defaults.guidance_text IS
    'Instructional help shown to users; separate from default_value sample pre-fill.';
COMMENT ON COLUMN sim.form_template_field_defaults.guidance_text IS
    'Instructional help shown to users; separate from default_value sample pre-fill.';

DO $$
BEGIN
  RAISE NOTICE 'v770_form_template_field_defaults_guidance.sql applied';
END $$;
