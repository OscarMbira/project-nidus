-- =============================================================================
-- v867: form_templates.updated_by (Platform + Simulator)
-- Audit details "Updated by" for form template content rows. Matches created_by
-- (auth.users id) used by form_templates RLS (v809 / v839).
-- =============================================================================

ALTER TABLE public.form_templates
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE sim.form_templates
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.form_templates.updated_by IS
  'Auth user id of the last editor (Audit details Updated by).';
COMMENT ON COLUMN sim.form_templates.updated_by IS
  'Auth user id of the last editor (Audit details Updated by).';

UPDATE public.form_templates
SET updated_by = created_by
WHERE updated_by IS NULL
  AND created_by IS NOT NULL;

UPDATE sim.form_templates
SET updated_by = created_by
WHERE updated_by IS NULL
  AND created_by IS NOT NULL;

DO $$
BEGIN
  RAISE NOTICE 'v867_form_templates_updated_by.sql applied';
END $$;
