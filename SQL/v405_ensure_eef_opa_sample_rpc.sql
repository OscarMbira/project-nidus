-- ============================================================================
-- v405: RPC — load sample EEF & OPA for current user's organisation (one account)
-- Prerequisites: v400, v403 recommended, v404 optional
-- Security: SECURITY DEFINER; requires auth.uid() and user_has_access_to_account.
-- Idempotent: only inserts when that account has zero EEF or zero OPA rows respectively.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ensure_eef_opa_sample_for_account(p_account_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator      UUID := auth.uid();
  v_cat_culture  UUID;
  v_cat_gov      UUID;
  v_cat_market   UUID;
  v_cat_reg      UUID;
  v_cat_infra    UUID;
  v_opa_tpl      UUID;
  v_opa_proc     UUID;
  v_opa_pol      UUID;
  v_opa_know     UUID;
  v_eef_count    INTEGER;
  v_opa_count    INTEGER;
  v_eef_added    INTEGER := 0;
  v_opa_added    INTEGER := 0;
  v_sim_eef      INTEGER;
  v_sim_opa      INTEGER;
BEGIN
  IF v_creator IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.id = p_account_id AND COALESCE(a.is_deleted, FALSE) = FALSE
  ) THEN
    RETURN json_build_object('success', false, 'error', 'account_not_found');
  END IF;

  IF NOT public.user_has_access_to_account(p_account_id) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT id INTO v_cat_culture FROM public.eef_categories WHERE organisation_id IS NULL AND code = 'culture' LIMIT 1;
  SELECT id INTO v_cat_gov FROM public.eef_categories WHERE organisation_id IS NULL AND code = 'governance' LIMIT 1;
  SELECT id INTO v_cat_market FROM public.eef_categories WHERE organisation_id IS NULL AND code = 'market' LIMIT 1;
  SELECT id INTO v_cat_reg FROM public.eef_categories WHERE organisation_id IS NULL AND code = 'regulatory' LIMIT 1;
  SELECT id INTO v_cat_infra FROM public.eef_categories WHERE organisation_id IS NULL AND code = 'infrastructure' LIMIT 1;

  SELECT id INTO v_opa_tpl FROM public.opa_categories WHERE organisation_id IS NULL AND code = 'templates' LIMIT 1;
  SELECT id INTO v_opa_proc FROM public.opa_categories WHERE organisation_id IS NULL AND code = 'processes' LIMIT 1;
  SELECT id INTO v_opa_pol FROM public.opa_categories WHERE organisation_id IS NULL AND code = 'policies' LIMIT 1;
  SELECT id INTO v_opa_know FROM public.opa_categories WHERE organisation_id IS NULL AND code = 'knowledge' LIMIT 1;

  SELECT COUNT(*) INTO v_eef_count FROM public.enterprise_environment_factors WHERE organisation_id = p_account_id;
  SELECT COUNT(*) INTO v_opa_count FROM public.organisational_process_assets WHERE organisation_id = p_account_id;

  IF v_eef_count = 0 THEN
    INSERT INTO public.enterprise_environment_factors (
      title, description, category_id, eef_type, impact_level, impact_direction,
      source_reference, status, notes, is_on_hold, organisation_id, created_by
    ) VALUES
      (
        'Organisational culture, structure, and governance',
        'Shared values, norms, reporting lines, and decision-making style that shape how projects are authorised, staffed, and governed.',
        v_cat_culture, 'internal', 'high', 'neutral',
        'PMBOK — Enterprise Environmental Factors',
        'active',
        'Treat as baseline context for stakeholder engagement and escalation paths.',
        FALSE, p_account_id, v_creator
      ),
      (
        'Geographic distribution of facilities and resources',
        'Office locations, time zones, remote/hybrid norms, and collaboration constraints affecting scheduling and communication.',
        v_cat_infra, 'internal', 'medium', 'neutral',
        NULL,
        'active',
        NULL,
        FALSE, p_account_id, v_creator
      ),
      (
        'Information technology infrastructure',
        'Corporate network, identity systems, approved tooling, and integration constraints for scheduling, documentation, and reporting.',
        v_cat_infra, 'internal', 'high', 'positive',
        NULL,
        'active',
        'Includes mandated platforms (e.g. document control, PMIS).',
        FALSE, p_account_id, v_creator
      ),
      (
        'Human resource policies and employee relations',
        'Hiring lead times, competency frameworks, training budgets, and labour agreements affecting team availability and skills.',
        v_cat_gov, 'internal', 'medium', 'neutral',
        NULL,
        'active',
        NULL,
        FALSE, p_account_id, v_creator
      ),
      (
        'Marketplace conditions',
        'Customer demand, supplier capacity, competitive dynamics, and pricing pressure influencing scope, risk, and benefits.',
        v_cat_market, 'external', 'high', 'neutral',
        NULL,
        'active',
        'Review at stage gates when business case assumptions change.',
        FALSE, p_account_id, v_creator
      ),
      (
        'Legal and regulatory environment',
        'Statutory, industry, and contractual obligations (data protection, safety, financial reporting) imposing compliance constraints.',
        v_cat_reg, 'external', 'high', 'negative',
        'Organisation compliance register (reference)',
        'active',
        'Non-compliance can stop delivery; link to organisational policies.',
        FALSE, p_account_id, v_creator
      ),
      (
        'Commercial databases and academic research',
        'Licensed benchmarks, cost databases, and research used for estimating, risk analysis, and options appraisal.',
        v_cat_market, 'external', 'medium', 'positive',
        NULL,
        'under_review',
        'Confirm licence coverage before use in client-facing deliverables.',
        TRUE, p_account_id, v_creator
      ),
      (
        'Physical environment and sustainability constraints',
        'Climate, site access, environmental permits, and corporate sustainability targets affecting delivery methods and reporting.',
        v_cat_reg, 'external', 'medium', 'neutral',
        NULL,
        'active',
        NULL,
        FALSE, p_account_id, v_creator
      );
    GET DIAGNOSTICS v_eef_added = ROW_COUNT;

    UPDATE public.enterprise_environment_factors
    SET on_hold_reason = 'Pending licence confirmation'
    WHERE organisation_id = p_account_id
      AND title = 'Commercial databases and academic research'
      AND is_on_hold = TRUE;
  END IF;

  IF v_opa_count = 0 THEN
    INSERT INTO public.organisational_process_assets (
      title, description, category_id, opa_type, version, status,
      effective_date, document_reference, tags, notes,
      is_on_hold, organisation_id, created_by
    ) VALUES
      (
        'Project charter template',
        'Standard charter sections: purpose, measurable objectives, high-level requirements, assumptions, constraints, stakeholders, approval.',
        v_opa_tpl, 'template', '1.2', 'active',
        CURRENT_DATE,
        'intranet:/templates/project-charter-v1.2.docx',
        ARRAY['initiating', 'governance', 'approval'],
        'Aligns with organisational stage-gate criteria.',
        FALSE, p_account_id, v_creator
      ),
      (
        'Integrated change control procedure',
        'Steps to log, assess, decide, and implement changes across scope, schedule, cost, and baselines with a single change board.',
        v_opa_proc, 'procedure', '3.0', 'active',
        CURRENT_DATE - 30,
        'intranet:/procedures/integrated-change-control',
        ARRAY['change', 'baseline', 'ccb'],
        'Use for all capital and strategic projects.',
        FALSE, p_account_id, v_creator
      ),
      (
        'Risk register and response planning guideline',
        'Defines risk categories, scoring scales, owner assignment, and expected monetary value / qualitative thresholds.',
        v_opa_proc, 'guideline', '2.1', 'active',
        CURRENT_DATE - 60,
        'intranet:/guidelines/risk-management',
        ARRAY['risk', 'raid'],
        NULL,
        FALSE, p_account_id, v_creator
      ),
      (
        'Information security and data classification policy',
        'Mandatory handling rules for confidential, personal, and regulated data in project artefacts and supplier engagements.',
        v_opa_pol, 'policy', '2025-Q4', 'active',
        CURRENT_DATE - 90,
        'intranet:/policies/info-security',
        ARRAY['security', 'compliance', 'gdpr'],
        NULL,
        FALSE, p_account_id, v_creator
      ),
      (
        'Lessons learned repository — submission standard',
        'What to capture at phase end and project closure; fields for context, recommendation, and reusable artefacts.',
        v_opa_know, 'lessons_learned', '1.0', 'active',
        CURRENT_DATE - 14,
        'intranet:/knowledge/lessons-learned',
        ARRAY['closure', 'continuous improvement'],
        'Link outcomes to OPA updates where applicable.',
        FALSE, p_account_id, v_creator
      ),
      (
        'Financial authorisation limits matrix',
        'Delegation of financial approval by role and amount; used when approving vendors and change orders.',
        v_opa_pol, 'standard', 'FY26', 'active',
        CURRENT_DATE,
        'intranet:/finance/delegation-matrix',
        ARRAY['finance', 'procurement'],
        NULL,
        FALSE, p_account_id, v_creator
      ),
      (
        'Stakeholder communication plan template',
        'Audience, message, channel, frequency, and owner for programme and project communications.',
        v_opa_tpl, 'template', '1.0', 'draft',
        NULL,
        'intranet:/templates/stakeholder-comms-plan',
        ARRAY['communications', 'stakeholders'],
        'Draft pending PMO review.',
        TRUE, p_account_id, v_creator
      ),
      (
        'Historical estimating benchmarks — IT delivery',
        'Anonymised effort and duration ranges by work package type for similar past projects (internal use).',
        v_opa_know, 'historical_info', '2024', 'archived',
        CURRENT_DATE - 400,
        'intranet:/archive/estimating-benchmarks-it-2024',
        ARRAY['estimating', 'benchmark'],
        'Superseded by 2025 pack; retained for trend analysis.',
        FALSE, p_account_id, v_creator
      );
    GET DIAGNOSTICS v_opa_added = ROW_COUNT;

    UPDATE public.organisational_process_assets
    SET on_hold_reason = 'Awaiting PMO sign-off'
    WHERE organisation_id = p_account_id
      AND title = 'Stakeholder communication plan template'
      AND is_on_hold = TRUE;
  END IF;

  SELECT COUNT(*) INTO v_sim_eef FROM sim.enterprise_environment_factors WHERE organisation_id = p_account_id;
  SELECT COUNT(*) INTO v_sim_opa FROM sim.organisational_process_assets WHERE organisation_id = p_account_id;

  IF v_sim_eef = 0 AND EXISTS (SELECT 1 FROM public.enterprise_environment_factors WHERE organisation_id = p_account_id LIMIT 1) THEN
    INSERT INTO sim.enterprise_environment_factors (
      title, description, category_id, eef_type, impact_level, impact_direction,
      source_reference, status, notes, is_on_hold, on_hold_reason, organisation_id, created_by
    )
    SELECT
      e.title, e.description, c_sim.id, e.eef_type, e.impact_level, e.impact_direction,
      e.source_reference, e.status, e.notes, e.is_on_hold, e.on_hold_reason, p_account_id, v_creator
    FROM public.enterprise_environment_factors e
    LEFT JOIN sim.eef_categories c_sim
      ON c_sim.organisation_id IS NULL
      AND c_sim.code = (SELECT ec.code FROM public.eef_categories ec WHERE ec.id = e.category_id LIMIT 1)
    WHERE e.organisation_id = p_account_id;
  END IF;

  IF v_sim_opa = 0 AND EXISTS (SELECT 1 FROM public.organisational_process_assets WHERE organisation_id = p_account_id LIMIT 1) THEN
    INSERT INTO sim.organisational_process_assets (
      title, description, category_id, opa_type, version, status,
      effective_date, expiry_date, document_reference, tags, notes,
      is_on_hold, on_hold_reason, organisation_id, created_by
    )
    SELECT
      o.title, o.description, c_sim.id, o.opa_type, o.version, o.status,
      o.effective_date, o.expiry_date, o.document_reference, o.tags, o.notes,
      o.is_on_hold, o.on_hold_reason, p_account_id, v_creator
    FROM public.organisational_process_assets o
    LEFT JOIN sim.opa_categories c_sim
      ON c_sim.organisation_id IS NULL
      AND c_sim.code = (SELECT oc.code FROM public.opa_categories oc WHERE oc.id = o.category_id LIMIT 1)
    WHERE o.organisation_id = p_account_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'eef_rows_inserted', COALESCE(v_eef_added, 0),
    'opa_rows_inserted', COALESCE(v_opa_added, 0)
  );
END;
$$;

COMMENT ON FUNCTION public.ensure_eef_opa_sample_for_account(UUID) IS
  'Inserts standard sample EEF/OPA rows for one account if empty; mirrors to sim. Caller must have org access.';

GRANT EXECUTE ON FUNCTION public.ensure_eef_opa_sample_for_account(UUID) TO authenticated;
