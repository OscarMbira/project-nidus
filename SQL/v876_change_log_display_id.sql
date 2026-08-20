-- =============================================================================
-- v876: change_log.display_id — human-readable Log ID (Admin ID Generation)
-- Purpose: Replace opaque UUID in the Change Log list with codes like CLG-0001.
-- Prerequisites:
--   - public.trg_apply_admin_display_id / sim.trg_apply_admin_display_id (v756)
--   - Admin rule seed: E:\project-nidus-admin\SQL\v205_change_log_id_generation_seed.sql
--     (apply Admin seed BEFORE or together with this backfill for new codes)
-- Idempotent: ADD COLUMN IF NOT EXISTS; triggers DROP/CREATE; backfill only blanks.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Platform: public.change_log
-- ---------------------------------------------------------------------------
ALTER TABLE public.change_log
  ADD COLUMN IF NOT EXISTS display_id VARCHAR(50);

COMMENT ON COLUMN public.change_log.display_id IS
  'v876: Admin-generated Log ID (e.g. CLG-0001). Blank on insert → AFTER INSERT trigger.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_change_log_display_id_active
  ON public.change_log (display_id)
  WHERE display_id IS NOT NULL AND BTRIM(display_id) <> ''
    AND COALESCE(is_deleted, false) = false;

DROP TRIGGER IF EXISTS trg_change_log_admin_display_id ON public.change_log;
CREATE TRIGGER trg_change_log_admin_display_id
  AFTER INSERT ON public.change_log
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_apply_admin_display_id('public.change_log', 'display_id');

-- ---------------------------------------------------------------------------
-- Simulator: sim.practice_change_log (parity)
-- ---------------------------------------------------------------------------
ALTER TABLE sim.practice_change_log
  ADD COLUMN IF NOT EXISTS display_id VARCHAR(50);

COMMENT ON COLUMN sim.practice_change_log.display_id IS
  'v876: Admin-generated practice Log ID (e.g. SCLG-0001).';

CREATE UNIQUE INDEX IF NOT EXISTS uq_practice_change_log_display_id
  ON sim.practice_change_log (display_id)
  WHERE display_id IS NOT NULL AND BTRIM(display_id) <> '';

DROP TRIGGER IF EXISTS trg_practice_change_log_admin_display_id ON sim.practice_change_log;
CREATE TRIGGER trg_practice_change_log_admin_display_id
  AFTER INSERT ON sim.practice_change_log
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.practice_change_log', 'display_id');

-- Ensure registry rows exist (ID Generation table picker)
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('change_log', 'Change request lifecycle audit log entries', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ---------------------------------------------------------------------------
-- Backfill existing blank display_id values (requires Admin rule)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_code TEXT;
  n INT := 0;
BEGIN
  FOR r IN
    SELECT id
    FROM public.change_log
    WHERE COALESCE(BTRIM(display_id), '') = ''
    ORDER BY COALESCE(log_date, created_at) ASC NULLS LAST, id ASC
  LOOP
    BEGIN
      v_code := admin.generate_display_id('public.change_log', r.id);
      IF v_code IS NOT NULL AND BTRIM(v_code) <> '' THEN
        UPDATE public.change_log
        SET display_id = v_code
        WHERE id = r.id;
        n := n + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'v876: skip change_log % — %', r.id, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'v876: backfilled % public.change_log display_id value(s)', n;

  n := 0;
  FOR r IN
    SELECT id
    FROM sim.practice_change_log
    WHERE COALESCE(BTRIM(display_id), '') = ''
    ORDER BY COALESCE(log_date, created_at) ASC NULLS LAST, id ASC
  LOOP
    BEGIN
      v_code := admin.generate_display_id('sim.practice_change_log', r.id);
      IF v_code IS NOT NULL AND BTRIM(v_code) <> '' THEN
        UPDATE sim.practice_change_log
        SET display_id = v_code
        WHERE id = r.id;
        n := n + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'v876: skip practice_change_log % — %', r.id, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'v876: backfilled % sim.practice_change_log display_id value(s)', n;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'v876_change_log_display_id.sql applied — run Admin v205 ID rule seed if backfill skipped';
END $$;
