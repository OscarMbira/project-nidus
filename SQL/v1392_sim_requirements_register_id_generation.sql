-- ============================================================================
-- v1392: Simulator requirement codes from Admin ID Generation (sim.requirements_register)
-- ============================================================================
-- PRD / plan v1338 (samples D11, rule 16.2). public.requirements_register already gets its code from
-- Admin ID Generation (v887 + Admin v206). The Simulator table now does the same: a blank
-- requirement_code is filled after insert from the rule seeded by Admin
-- E:\project-nidus-admin\SQL\v245_sim_requirements_register_id_generation_seed.sql (run that first).
-- Existing Simulator requirements with a blank code are given one, oldest first.
-- Prerequisites: v369, v756 (sim.trg_apply_admin_display_id), Admin v245. Idempotent.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_sim_requirements_register_admin_display_id ON sim.requirements_register;
CREATE TRIGGER trg_sim_requirements_register_admin_display_id
  AFTER INSERT ON sim.requirements_register
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.requirements_register', 'requirement_code');

DO $$
DECLARE
  r RECORD;
  v_count INT := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin.id_generation_rules WHERE target_table = 'sim.requirements_register') THEN
    RAISE NOTICE 'v1392: no Admin rule for sim.requirements_register yet — run Admin v245, then re-run this file to fill blank codes';
    RETURN;
  END IF;
  FOR r IN
    SELECT id FROM sim.requirements_register
    WHERE requirement_code IS NULL OR btrim(requirement_code) = ''
    ORDER BY created_at, id
  LOOP
    UPDATE sim.requirements_register
    SET requirement_code = admin.generate_display_id('sim.requirements_register', r.id)
    WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'v1392: % Simulator requirements given a code', v_count;
END $$;
