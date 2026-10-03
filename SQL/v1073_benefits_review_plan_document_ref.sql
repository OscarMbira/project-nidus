-- ============================================================================
-- v1073: Benefits Review Plan — ensure document_ref (record ID) is always set
-- ============================================================================
-- Seeds (e.g. v834) often insert without document_ref, so the list REFERENCE
-- column appears empty. Wire Admin ID Generation on document_ref and backfill
-- existing blank rows.
--
-- Companion Admin seed: E:\project-nidus-admin\SQL\v221_benefits_review_plans_id_generation_seed.sql
-- ============================================================================

-- AFTER INSERT: assign document_ref via Admin ID Generation when blank
DROP TRIGGER IF EXISTS trg_benefits_review_plans_admin_display_id ON public.benefits_review_plans;
CREATE TRIGGER trg_benefits_review_plans_admin_display_id
  AFTER INSERT ON public.benefits_review_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_apply_admin_display_id('public.benefits_review_plans', 'document_ref');

-- Backfill blank / whitespace-only references
DO $$
DECLARE
  r RECORD;
  v_ref TEXT;
  v_has_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'admin' AND p.proname = 'generate_display_id'
  ) INTO v_has_admin;

  FOR r IN
    SELECT id
    FROM public.benefits_review_plans
    WHERE is_deleted = false
      AND (document_ref IS NULL OR btrim(document_ref) = '')
    ORDER BY created_at NULLS LAST, id
  LOOP
    IF v_has_admin THEN
      BEGIN
        v_ref := admin.generate_display_id('public.benefits_review_plans', r.id);
      EXCEPTION WHEN OTHERS THEN
        v_ref := NULL;
      END;
    END IF;

    IF v_ref IS NULL OR btrim(v_ref) = '' THEN
      -- Fallback if Admin rule not yet applied: stable short code from UUID
      v_ref := 'BRP-' || upper(substr(replace(r.id::text, '-', ''), 1, 8));
    END IF;

    UPDATE public.benefits_review_plans
    SET document_ref = v_ref,
        updated_at = COALESCE(updated_at, NOW())
    WHERE id = r.id;
  END LOOP;
END $$;

-- Practice mirror: add document_ref if missing, then trigger + backfill
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sim' AND table_name = 'practice_benefits_review_plans'
  ) THEN
    ALTER TABLE sim.practice_benefits_review_plans
      ADD COLUMN IF NOT EXISTS document_ref VARCHAR(100);

    DROP TRIGGER IF EXISTS trg_practice_benefits_review_plans_admin_display_id
      ON sim.practice_benefits_review_plans;
    CREATE TRIGGER trg_practice_benefits_review_plans_admin_display_id
      AFTER INSERT ON sim.practice_benefits_review_plans
      FOR EACH ROW
      EXECUTE FUNCTION sim.trg_apply_admin_display_id(
        'sim.practice_benefits_review_plans',
        'document_ref'
      );
  END IF;
END $$;

DO $$
DECLARE
  r RECORD;
  v_ref TEXT;
  v_has_admin BOOLEAN;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sim' AND table_name = 'practice_benefits_review_plans'
  ) THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'admin' AND p.proname = 'generate_display_id'
  ) INTO v_has_admin;

  FOR r IN
    SELECT id
    FROM sim.practice_benefits_review_plans
    WHERE COALESCE(is_deleted, false) = false
      AND (document_ref IS NULL OR btrim(document_ref) = '')
    ORDER BY created_at NULLS LAST, id
  LOOP
    IF v_has_admin THEN
      BEGIN
        v_ref := admin.generate_display_id('sim.practice_benefits_review_plans', r.id);
      EXCEPTION WHEN OTHERS THEN
        v_ref := NULL;
      END;
    END IF;

    IF v_ref IS NULL OR btrim(v_ref) = '' THEN
      v_ref := 'SBRP-' || upper(substr(replace(r.id::text, '-', ''), 1, 8));
    END IF;

    UPDATE sim.practice_benefits_review_plans
    SET document_ref = v_ref
    WHERE id = r.id;
  END LOOP;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'v1073: benefits_review_plans.document_ref trigger + backfill applied';
END $$;
