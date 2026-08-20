-- =============================================================================
-- v838: Fix governance strategy display IDs (RMS / QMS / CMS)
--
-- Symptom: RMS (and QMS/CMS) pages show references like
--   RMS-2026-42A1E47AE1BF4EA3A78CED278270458D
-- instead of Admin ID Generation sequential IDs (RMS-2026-001).
--
-- Cause: v834 / v836 demo seeds hand-minted
--   PREFIX-YYYY- + project UUID with hyphens stripped.
-- That non-empty value caused trg_apply_admin_display_id to skip
-- admin.generate_display_id().
--
-- Also: create_rms_for_project / create_qms_for_project / create_cms_for_project
-- still called generate_*_reference() functions dropped by v756b.
--
-- Fix:
--   1) Backfill hex-suffix seed references via admin.generate_display_id
--   2) Rewrite create_*_for_project to insert '' and let the AFTER INSERT
--      admin display-ID trigger assign the real reference (same pattern as v823/v830)
--
-- Apply after: v756b, Admin sequential rules seed (v156), v834/v836.
-- Idempotent: only rewrites rows matching the seed hex pattern.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Backfill bad seed-style references
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_row RECORD;
  v_display TEXT;
  v_n INTEGER := 0;
  v_rule_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM admin.id_generation_rules r
    WHERE admin.normalize_id_generation_target_table(r.target_table)
      = admin.normalize_id_generation_target_table('public.risk_management_strategies')
      AND COALESCE(r.is_active, TRUE) = TRUE
  ) INTO v_rule_exists;

  IF NOT v_rule_exists THEN
    RAISE NOTICE 'v838: no active id_generation_rule for public.risk_management_strategies — skipping RMS backfill';
  ELSE
    FOR v_row IN
      SELECT id, rms_reference
      FROM public.risk_management_strategies
      WHERE rms_reference ~ '^RMS-[0-9]{4}-[A-Fa-f0-9]{20,}$'
      ORDER BY created_at NULLS LAST, id
    LOOP
      -- Drop any accidental generated_ids row that stored the hex-style value
      DELETE FROM admin.generated_ids
      WHERE target_table IN ('public.risk_management_strategies', 'risk_management_strategies')
        AND record_id = v_row.id
        AND display_id ~ '^RMS-[0-9]{4}-[A-Fa-f0-9]{20,}$';

      v_display := admin.generate_display_id('public.risk_management_strategies', v_row.id);
      UPDATE public.risk_management_strategies
      SET rms_reference = v_display, updated_at = NOW()
      WHERE id = v_row.id;
      v_n := v_n + 1;
    END LOOP;
    RAISE NOTICE 'v838: backfilled % risk_management_strategies.rms_reference value(s)', v_n;
  END IF;
END $$;

DO $$
DECLARE
  v_row RECORD;
  v_display TEXT;
  v_n INTEGER := 0;
  v_rule_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM admin.id_generation_rules r
    WHERE admin.normalize_id_generation_target_table(r.target_table)
      = admin.normalize_id_generation_target_table('public.quality_management_strategies')
      AND COALESCE(r.is_active, TRUE) = TRUE
  ) INTO v_rule_exists;

  IF NOT v_rule_exists THEN
    RAISE NOTICE 'v838: no active id_generation_rule for public.quality_management_strategies — skipping QMS backfill';
  ELSE
    FOR v_row IN
      SELECT id, qms_reference
      FROM public.quality_management_strategies
      WHERE qms_reference ~ '^QMS-[0-9]{4}-[A-Fa-f0-9]{20,}$'
      ORDER BY created_at NULLS LAST, id
    LOOP
      DELETE FROM admin.generated_ids
      WHERE target_table IN ('public.quality_management_strategies', 'quality_management_strategies')
        AND record_id = v_row.id
        AND display_id ~ '^QMS-[0-9]{4}-[A-Fa-f0-9]{20,}$';

      v_display := admin.generate_display_id('public.quality_management_strategies', v_row.id);
      UPDATE public.quality_management_strategies
      SET qms_reference = v_display, updated_at = NOW()
      WHERE id = v_row.id;
      v_n := v_n + 1;
    END LOOP;
    RAISE NOTICE 'v838: backfilled % quality_management_strategies.qms_reference value(s)', v_n;
  END IF;
END $$;

DO $$
DECLARE
  v_row RECORD;
  v_display TEXT;
  v_n INTEGER := 0;
  v_rule_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM admin.id_generation_rules r
    WHERE admin.normalize_id_generation_target_table(r.target_table)
      = admin.normalize_id_generation_target_table('public.communication_management_strategies')
      AND COALESCE(r.is_active, TRUE) = TRUE
  ) INTO v_rule_exists;

  IF NOT v_rule_exists THEN
    RAISE NOTICE 'v838: no active id_generation_rule for public.communication_management_strategies — skipping CMS backfill';
  ELSE
    FOR v_row IN
      SELECT id, cms_reference
      FROM public.communication_management_strategies
      WHERE cms_reference ~ '^CMS-[0-9]{4}-[A-Fa-f0-9]{20,}$'
      ORDER BY created_at NULLS LAST, id
    LOOP
      DELETE FROM admin.generated_ids
      WHERE target_table IN ('public.communication_management_strategies', 'communication_management_strategies')
        AND record_id = v_row.id
        AND display_id ~ '^CMS-[0-9]{4}-[A-Fa-f0-9]{20,}$';

      v_display := admin.generate_display_id('public.communication_management_strategies', v_row.id);
      UPDATE public.communication_management_strategies
      SET cms_reference = v_display, updated_at = NOW()
      WHERE id = v_row.id;
      v_n := v_n + 1;
    END LOOP;
    RAISE NOTICE 'v838: backfilled % communication_management_strategies.cms_reference value(s)', v_n;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) create_*_for_project — use admin display-ID trigger (v756b)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_rms_for_project(p_project_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_rms_id UUID;
    v_reference VARCHAR(50);
    v_year INTEGER;
    v_sequence INTEGER;
BEGIN
    SELECT id INTO v_rms_id
    FROM risk_management_strategies
    WHERE project_id = p_project_id
      AND COALESCE(is_deleted, FALSE) = FALSE
    LIMIT 1;

    IF v_rms_id IS NOT NULL THEN
        RETURN v_rms_id;
    END IF;

    -- rms_reference left blank; trg_risk_management_strategies_admin_display_id
    -- (AFTER INSERT) fills it via admin.generate_display_id().
    INSERT INTO risk_management_strategies (
        project_id,
        rms_reference,
        version_number,
        purpose,
        objectives,
        scope,
        risk_identification_approach,
        risk_assessment_approach,
        risk_response_approach,
        risk_monitoring_approach,
        status,
        created_by,
        updated_by
    ) VALUES (
        p_project_id,
        '',
        '1.0',
        'Define risk management approach for this project',
        'Identify, assess, and manage risks effectively throughout the project',
        'All project risks (threats and opportunities)',
        'Risk identification through workshops, reviews, and expert judgment',
        'Risk assessment using probability and impact scales',
        'Risk response through appropriate strategies (avoid, reduce, transfer, accept, exploit, enhance)',
        'Continuous monitoring and review of risks',
        'draft',
        p_user_id,
        p_user_id
    ) RETURNING id INTO v_rms_id;

    SELECT rms_reference INTO v_reference
    FROM risk_management_strategies
    WHERE id = v_rms_id;

    IF v_reference IS NULL OR btrim(v_reference) = '' THEN
        v_year := EXTRACT(YEAR FROM NOW())::INTEGER;
        SELECT COALESCE(MAX(NULLIF(SUBSTRING(rms_reference FROM '[0-9]+$'), '')::INTEGER), 0) + 1
        INTO v_sequence
        FROM risk_management_strategies
        WHERE rms_reference ~ ('^RMS-' || v_year || '-[0-9]+$');

        UPDATE risk_management_strategies
        SET rms_reference = 'RMS-' || v_year || '-' || lpad(v_sequence::TEXT, 3, '0')
        WHERE id = v_rms_id;
    END IF;

    INSERT INTO rms_records (
        rms_id,
        record_name,
        record_type,
        record_description,
        record_purpose,
        storage_location,
        is_mandatory,
        display_order,
        created_by
    ) VALUES (
        v_rms_id,
        'Risk Register',
        'risk_register',
        'Central register of all identified risks and their management',
        'Track all project risks, assessments, responses, and status',
        'Project repository',
        true,
        1,
        p_user_id
    );

    RETURN v_rms_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_rms_for_project(UUID, UUID) IS
  'Creates RMS with default structure; rms_reference from admin display-ID trigger (v838)';

CREATE OR REPLACE FUNCTION create_qms_for_project(p_project_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_qms_id UUID;
    v_reference VARCHAR(50);
    v_year INTEGER;
    v_sequence INTEGER;
BEGIN
    SELECT id INTO v_qms_id
    FROM quality_management_strategies
    WHERE project_id = p_project_id
      AND COALESCE(is_deleted, FALSE) = FALSE
    LIMIT 1;

    IF v_qms_id IS NOT NULL THEN
        RETURN v_qms_id;
    END IF;

    INSERT INTO quality_management_strategies (
        project_id,
        qms_reference,
        version_number,
        purpose,
        objectives,
        scope,
        quality_control_approach,
        quality_assurance_approach,
        status,
        created_by,
        updated_by
    ) VALUES (
        p_project_id,
        '',
        '1.0',
        'Define quality management approach for this project',
        'Ensure project deliverables meet quality expectations',
        'All project deliverables and processes',
        'Quality control through inspections, reviews, and testing',
        'Quality assurance through audits and compliance checks',
        'draft',
        p_user_id,
        p_user_id
    ) RETURNING id INTO v_qms_id;

    SELECT qms_reference INTO v_reference
    FROM quality_management_strategies
    WHERE id = v_qms_id;

    IF v_reference IS NULL OR btrim(v_reference) = '' THEN
        v_year := EXTRACT(YEAR FROM NOW())::INTEGER;
        SELECT COALESCE(MAX(NULLIF(SUBSTRING(qms_reference FROM '[0-9]+$'), '')::INTEGER), 0) + 1
        INTO v_sequence
        FROM quality_management_strategies
        WHERE qms_reference ~ ('^QMS-' || v_year || '-[0-9]+$');

        UPDATE quality_management_strategies
        SET qms_reference = 'QMS-' || v_year || '-' || lpad(v_sequence::TEXT, 3, '0')
        WHERE id = v_qms_id;
    END IF;

    INSERT INTO qms_records (
        qms_id,
        record_name,
        record_type,
        record_description,
        record_purpose,
        storage_location,
        is_mandatory,
        display_order,
        created_by
    ) VALUES (
        v_qms_id,
        'Quality Register',
        'quality_register',
        'Central register of all quality-related activities and results',
        'Track quality activities, inspections, reviews, and outcomes',
        'Project repository',
        true,
        1,
        p_user_id
    );

    RETURN v_qms_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_qms_for_project(UUID, UUID) IS
  'Creates QMS with default structure; qms_reference from admin display-ID trigger (v838)';

CREATE OR REPLACE FUNCTION create_cms_for_project(p_project_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_cms_id UUID;
    v_reference VARCHAR(50);
    v_year INTEGER;
    v_sequence INTEGER;
BEGIN
    SELECT id INTO v_cms_id
    FROM communication_management_strategies
    WHERE project_id = p_project_id
      AND COALESCE(is_deleted, FALSE) = FALSE
    LIMIT 1;

    IF v_cms_id IS NOT NULL THEN
        RETURN v_cms_id;
    END IF;

    INSERT INTO communication_management_strategies (
        project_id,
        cms_reference,
        version_number,
        created_by,
        updated_by,
        status
    ) VALUES (
        p_project_id,
        '',
        '1.0',
        p_user_id,
        p_user_id,
        'draft'
    ) RETURNING id INTO v_cms_id;

    SELECT cms_reference INTO v_reference
    FROM communication_management_strategies
    WHERE id = v_cms_id;

    IF v_reference IS NULL OR btrim(v_reference) = '' THEN
        v_year := EXTRACT(YEAR FROM NOW())::INTEGER;
        SELECT COALESCE(MAX(NULLIF(SUBSTRING(cms_reference FROM '[0-9]+$'), '')::INTEGER), 0) + 1
        INTO v_sequence
        FROM communication_management_strategies
        WHERE cms_reference ~ ('^CMS-' || v_year || '-[0-9]+$');

        UPDATE communication_management_strategies
        SET cms_reference = 'CMS-' || v_year || '-' || lpad(v_sequence::TEXT, 3, '0')
        WHERE id = v_cms_id;
    END IF;

    RETURN v_cms_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_cms_for_project(UUID, UUID) IS
  'Creates CMS with default structure; cms_reference from admin display-ID trigger (v838)';

-- Visibility check (Results grid)
SELECT
  'risk_management_strategies' AS table_name,
  COUNT(*) FILTER (WHERE rms_reference ~ '^RMS-[0-9]{4}-[A-Fa-f0-9]{20,}$') AS hex_style_left,
  COUNT(*) FILTER (WHERE rms_reference ~ '^RMS-[0-9]{4}-[0-9]{1,}$') AS sequential_ok
FROM risk_management_strategies
WHERE COALESCE(is_deleted, FALSE) = FALSE
UNION ALL
SELECT
  'quality_management_strategies',
  COUNT(*) FILTER (WHERE qms_reference ~ '^QMS-[0-9]{4}-[A-Fa-f0-9]{20,}$'),
  COUNT(*) FILTER (WHERE qms_reference ~ '^QMS-[0-9]{4}-[0-9]{1,}$')
FROM quality_management_strategies
WHERE COALESCE(is_deleted, FALSE) = FALSE
UNION ALL
SELECT
  'communication_management_strategies',
  COUNT(*) FILTER (WHERE cms_reference ~ '^CMS-[0-9]{4}-[A-Fa-f0-9]{20,}$'),
  COUNT(*) FILTER (WHERE cms_reference ~ '^CMS-[0-9]{4}-[0-9]{1,}$')
FROM communication_management_strategies
WHERE COALESCE(is_deleted, FALSE) = FALSE;

DO $$
BEGIN
  RAISE NOTICE 'v838_fix_governance_strategy_seed_display_ids.sql applied';
END $$;
