-- ============================================================================
-- v1115: Assumptions Register — Admin ID Generation on assumption_code
-- ============================================================================
-- This script ensures the Admin ID rules (same result as
-- E:\project-nidus-admin\SQL\v222_assumptions_id_generation_seed.sql) and then
-- assigns codes. New and existing blank assumption_code values become
-- ASM-YYYY-### (Platform) or SASM-YYYY-### (Simulator), numbered per project.
-- SASM is used because SAM is already an active abbreviation on another table.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_assumptions_admin_display_id ON public.assumptions;
CREATE TRIGGER trg_assumptions_admin_display_id
  AFTER INSERT ON public.assumptions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_apply_admin_display_id('public.assumptions', 'assumption_code');

ALTER TABLE sim.assumptions
  ADD COLUMN IF NOT EXISTS assumption_code VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sim_assumptions_code_unique
  ON sim.assumptions (project_id, assumption_code)
  WHERE is_deleted = FALSE AND assumption_code IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sim_assumptions_admin_display_id ON sim.assumptions;
CREATE TRIGGER trg_sim_assumptions_admin_display_id
  AFTER INSERT ON sim.assumptions
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.assumptions', 'assumption_code');

DO $$
DECLARE
  r RECORD;
  v_admin UUID;
  v_rule_id UUID;
  v_ref TEXT;
BEGIN
  SELECT id INTO v_admin
  FROM admin.admin_users
  WHERE activation_status = 'active'
  ORDER BY CASE WHEN role = 'super_admin' THEN 0 ELSE 1 END, created_at
  LIMIT 1;

  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No active admin user found. Activate an admin user, then re-run this script.';
  END IF;

  FOR r IN
    SELECT *
    FROM (
      VALUES
        ('public.assumptions'::text, 'ASM'::varchar, 'Assumption references (Platform)'::text, 'project_id'::text, 3),
        ('sim.assumptions'::text, 'SASM'::varchar, 'Assumption references (Simulator)'::text, 'project_id'::text, 3)
    ) AS t(target_table, table_abbreviation, table_description, scope_column, num_digits)
  LOOP
    SELECT id INTO v_rule_id
    FROM admin.id_generation_rules
    WHERE admin.normalize_id_generation_target_table(target_table)
        = admin.normalize_id_generation_target_table(r.target_table)
    LIMIT 1;

    IF v_rule_id IS NOT NULL THEN
      PERFORM admin.update_id_generation_rule(
        v_rule_id, r.target_table, r.table_abbreviation, r.table_description,
        '-', '', 'uppercase', 'numeric', 0, r.num_digits, '', 1, TRUE, v_admin,
        'sequential', TRUE, 'YYYY', r.scope_column
      );
    ELSE
      PERFORM admin.create_id_generation_rule(
        r.target_table, r.table_abbreviation, r.table_description,
        '-', '', 'uppercase', 'numeric', 0, r.num_digits, '', 1, TRUE, v_admin,
        'sequential', TRUE, 'YYYY', r.scope_column
      );
    END IF;
  END LOOP;

  FOR r IN
    SELECT id
    FROM public.assumptions
    WHERE COALESCE(is_deleted, FALSE) = FALSE
      AND (assumption_code IS NULL OR btrim(assumption_code) = '')
    ORDER BY created_at NULLS LAST, id
  LOOP
    v_ref := admin.generate_display_id('public.assumptions', r.id);
    IF v_ref IS NOT NULL AND btrim(v_ref) <> '' THEN
      UPDATE public.assumptions
      SET assumption_code = v_ref
      WHERE id = r.id;
    END IF;
  END LOOP;

  FOR r IN
    SELECT id
    FROM sim.assumptions
    WHERE COALESCE(is_deleted, FALSE) = FALSE
      AND (assumption_code IS NULL OR btrim(assumption_code) = '')
    ORDER BY created_at NULLS LAST, id
  LOOP
    v_ref := admin.generate_display_id('sim.assumptions', r.id);
    IF v_ref IS NOT NULL AND btrim(v_ref) <> '' THEN
      UPDATE sim.assumptions
      SET assumption_code = v_ref
      WHERE id = r.id;
    END IF;
  END LOOP;
END $$;
