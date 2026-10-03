-- =============================================================================
-- v1157: Friendly engagement-plan IDs (EPL-YYYY-### / SEPL-YYYY-###).
--        Edit links use this reference instead of the UUID.
-- Prerequisite: v1136 (Admin ID Generation helpers).
-- =============================================================================

ALTER TABLE public.stakeholder_engagement
  ADD COLUMN IF NOT EXISTS engagement_reference VARCHAR(100);

ALTER TABLE sim.practice_engagement_plans
  ADD COLUMN IF NOT EXISTS engagement_reference VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS uq_stakeholder_engagement_reference
  ON public.stakeholder_engagement (lower(engagement_reference))
  WHERE is_deleted = FALSE AND engagement_reference IS NOT NULL AND btrim(engagement_reference) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_practice_engagement_plans_reference
  ON sim.practice_engagement_plans (lower(engagement_reference))
  WHERE is_deleted = FALSE AND engagement_reference IS NOT NULL AND btrim(engagement_reference) <> '';

DROP TRIGGER IF EXISTS trg_stakeholder_engagement_admin_display_id ON public.stakeholder_engagement;
CREATE TRIGGER trg_stakeholder_engagement_admin_display_id
  AFTER INSERT ON public.stakeholder_engagement
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_apply_admin_display_id('public.stakeholder_engagement', 'engagement_reference');

DROP TRIGGER IF EXISTS trg_sim_practice_engagement_plans_admin_display_id ON sim.practice_engagement_plans;
CREATE TRIGGER trg_sim_practice_engagement_plans_admin_display_id
  AFTER INSERT ON sim.practice_engagement_plans
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.practice_engagement_plans', 'engagement_reference');

DO $$
DECLARE
  r RECORD;
  v_admin UUID;
  v_rule_id UUID;
  v_ref TEXT;
  v_year TEXT := to_char(CURRENT_DATE, 'YYYY');
  v_max BIGINT;
  v_col_max BIGINT;
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
        ('public.stakeholder_engagement'::text, 'EPL'::varchar, 'Engagement plan references (Platform)'::text, 3),
        ('sim.practice_engagement_plans'::text, 'SEPL'::varchar, 'Engagement plan references (Simulator)'::text, 3)
    ) AS t(target_table, table_abbreviation, table_description, num_digits)
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
        'sequential', TRUE, 'YYYY', ''
      );
    ELSE
      PERFORM admin.create_id_generation_rule(
        r.target_table, r.table_abbreviation, r.table_description,
        '-', '', 'uppercase', 'numeric', 0, r.num_digits, '', 1, TRUE, v_admin,
        'sequential', TRUE, 'YYYY', NULL
      );
    END IF;

    SELECT id INTO v_rule_id
    FROM admin.id_generation_rules
    WHERE admin.normalize_id_generation_target_table(target_table)
        = admin.normalize_id_generation_target_table(r.target_table)
    LIMIT 1;

    SELECT COALESCE(MAX(substring(g.display_id FROM '[0-9]+$')::bigint), 0)
    INTO v_max
    FROM admin.generated_ids g
    WHERE g.target_table = r.target_table
      AND g.display_id ~ ('^' || r.table_abbreviation || '-' || v_year || '-[0-9]+$');

    v_col_max := 0;
    IF r.target_table = 'public.stakeholder_engagement' THEN
      SELECT COALESCE(MAX(substring(s.engagement_reference FROM '[0-9]+$')::bigint), 0)
      INTO v_col_max
      FROM public.stakeholder_engagement s
      WHERE s.engagement_reference ~ ('^' || r.table_abbreviation || '-' || v_year || '-[0-9]+$');
    ELSE
      SELECT COALESCE(MAX(substring(s.engagement_reference FROM '[0-9]+$')::bigint), 0)
      INTO v_col_max
      FROM sim.practice_engagement_plans s
      WHERE s.engagement_reference ~ ('^' || r.table_abbreviation || '-' || v_year || '-[0-9]+$');
    END IF;

    v_max := GREATEST(v_max, v_col_max);

    IF v_max > 0 THEN
      INSERT INTO admin.id_generation_sequences (rule_id, scope_value, period_key, current_value)
      VALUES (v_rule_id, NULL, v_year, v_max)
      ON CONFLICT ON CONSTRAINT uq_id_generation_sequences_rule_scope_period
      DO UPDATE SET
        current_value = GREATEST(admin.id_generation_sequences.current_value, EXCLUDED.current_value),
        updated_at = NOW();
    END IF;
  END LOOP;

  FOR r IN
    SELECT id
    FROM public.stakeholder_engagement
    WHERE COALESCE(is_deleted, FALSE) = FALSE
      AND (engagement_reference IS NULL OR btrim(engagement_reference) = '')
    ORDER BY created_at NULLS LAST, id
  LOOP
    v_ref := admin.generate_display_id('public.stakeholder_engagement', r.id);
    IF v_ref IS NOT NULL AND btrim(v_ref) <> '' THEN
      UPDATE public.stakeholder_engagement
      SET engagement_reference = v_ref
      WHERE id = r.id;
    END IF;
  END LOOP;

  FOR r IN
    SELECT id
    FROM sim.practice_engagement_plans
    WHERE COALESCE(is_deleted, FALSE) = FALSE
      AND (engagement_reference IS NULL OR btrim(engagement_reference) = '')
    ORDER BY created_at NULLS LAST, id
  LOOP
    v_ref := admin.generate_display_id('sim.practice_engagement_plans', r.id);
    IF v_ref IS NOT NULL AND btrim(v_ref) <> '' THEN
      UPDATE sim.practice_engagement_plans
      SET engagement_reference = v_ref
      WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
