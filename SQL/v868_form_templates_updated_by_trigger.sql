-- =============================================================================
-- v868: Auto-set form_templates.updated_by from auth.uid() on write
-- Why Audit "Updated by" stays blank while "Last updated" has a time:
--   updated_at is written by app patches / link updates; updated_by was often
--   omitted (and v867 column may be present but still NULL on older rows).
-- Fix: BEFORE INSERT OR UPDATE trigger fills updated_by from auth.uid();
--      re-backfill NULL updated_by from created_by.
-- Prerequisites: v867_form_templates_updated_by.sql (column) — also ADD IF NOT EXISTS here.
-- =============================================================================

ALTER TABLE public.form_templates
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE sim.form_templates
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.trg_form_templates_set_updated_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, auth
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.updated_by := auth.uid();
    IF TG_OP = 'INSERT' AND NEW.created_by IS NULL THEN
      NEW.created_by := auth.uid();
    END IF;
  END IF;
  NEW.updated_at := COALESCE(NEW.updated_at, NOW());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION sim.trg_form_templates_set_updated_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public, pg_catalog, auth
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.updated_by := auth.uid();
    IF TG_OP = 'INSERT' AND NEW.created_by IS NULL THEN
      NEW.created_by := auth.uid();
    END IF;
  END IF;
  NEW.updated_at := COALESCE(NEW.updated_at, NOW());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_form_templates_set_updated_by ON public.form_templates;
CREATE TRIGGER trg_form_templates_set_updated_by
  BEFORE INSERT OR UPDATE ON public.form_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_form_templates_set_updated_by();

DROP TRIGGER IF EXISTS trg_sim_form_templates_set_updated_by ON sim.form_templates;
CREATE TRIGGER trg_sim_form_templates_set_updated_by
  BEFORE INSERT OR UPDATE ON sim.form_templates
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_form_templates_set_updated_by();

COMMENT ON FUNCTION public.trg_form_templates_set_updated_by() IS
  'Sets form_templates.updated_by (and created_by on insert when blank) from auth.uid() so Audit Updated by stays in sync with Last updated.';

-- Historical rows: prefer created_by when updated_by was never written.
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
  RAISE NOTICE 'v868_form_templates_updated_by_trigger.sql applied';
END $$;
