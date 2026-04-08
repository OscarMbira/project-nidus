-- ============================================================================
-- v404: Sample EEF & OPA seed for ALL accounts missing data
-- Prerequisites: v400, v402 optional (v402 only seeded the single oldest account)
-- Problem: v402 used ORDER BY accounts.created_at ASC LIMIT 1 — users on other
--          organisations saw empty EEF/OPA despite “seed” existing elsewhere.
-- Behaviour: For each non-deleted account with zero EEF rows, inserts the same
--            sample EEF set as v402; same for OPA; then mirrors to sim when empty.
-- Idempotent: skips accounts that already have any EEF or OPA row.
-- ============================================================================

DO $$
DECLARE
  v_org_id       UUID;
  v_creator      UUID;
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
BEGIN
  SELECT u.auth_user_id
  INTO v_creator
  FROM public.users u
  WHERE u.auth_user_id IS NOT NULL
    AND COALESCE(u.is_deleted, FALSE) = FALSE
  ORDER BY u.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_creator IS NULL THEN
    RAISE NOTICE 'v404: No user with auth_user_id — skip.';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = v_creator) THEN
    RAISE NOTICE 'v404: auth.users row missing for creator — skip.';
    RETURN;
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

  FOR v_org_id IN
    SELECT a.id
    FROM public.accounts a
    WHERE COALESCE(a.is_deleted, FALSE) = FALSE
  LOOP
    SELECT COUNT(*) INTO v_eef_count FROM public.enterprise_environment_factors WHERE organisation_id = v_org_id;
    SELECT COUNT(*) INTO v_opa_count FROM public.organisational_process_assets WHERE organisation_id = v_org_id;

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
          FALSE, v_org_id, v_creator
        ),
        (
          'Geographic distribution of facilities and resources',
          'Office locations, time zones, remote/hybrid norms, and collaboration constraints affecting scheduling and communication.',
          v_cat_infra, 'internal', 'medium', 'neutral',
          NULL,
          'active',
          NULL,
          FALSE, v_org_id, v_creator
        ),
        (
          'Information technology infrastructure',
          'Corporate network, identity systems, approved tooling, and integration constraints for scheduling, documentation, and reporting.',
          v_cat_infra, 'internal', 'high', 'positive',
          NULL,
          'active',
          'Includes mandated platforms (e.g. document control, PMIS).',
          FALSE, v_org_id, v_creator
        ),
        (
          'Human resource policies and employee relations',
          'Hiring lead times, competency frameworks, training budgets, and labour agreements affecting team availability and skills.',
          v_cat_gov, 'internal', 'medium', 'neutral',
          NULL,
          'active',
          NULL,
          FALSE, v_org_id, v_creator
        ),
        (
          'Marketplace conditions',
          'Customer demand, supplier capacity, competitive dynamics, and pricing pressure influencing scope, risk, and benefits.',
          v_cat_market, 'external', 'high', 'neutral',
          NULL,
          'active',
          'Review at stage gates when business case assumptions change.',
          FALSE, v_org_id, v_creator
        ),
        (
          'Legal and regulatory environment',
          'Statutory, industry, and contractual obligations (data protection, safety, financial reporting) imposing compliance constraints.',
          v_cat_reg, 'external', 'high', 'negative',
          'Organisation compliance register (reference)',
          'active',
          'Non-compliance can stop delivery; link to organisational policies.',
          FALSE, v_org_id, v_creator
        ),
        (
          'Commercial databases and academic research',
          'Licensed benchmarks, cost databases, and research used for estimating, risk analysis, and options appraisal.',
          v_cat_market, 'external', 'medium', 'positive',
          NULL,
          'under_review',
          'Confirm licence coverage before use in client-facing deliverables.',
          TRUE, v_org_id, v_creator
        ),
        (
          'Physical environment and sustainability constraints',
          'Climate, site access, environmental permits, and corporate sustainability targets affecting delivery methods and reporting.',
          v_cat_reg, 'external', 'medium', 'neutral',
          NULL,
          'active',
          NULL,
          FALSE, v_org_id, v_creator
        );

      UPDATE public.enterprise_environment_factors
      SET on_hold_reason = 'Pending licence confirmation'
      WHERE organisation_id = v_org_id
        AND title = 'Commercial databases and academic research'
        AND is_on_hold = TRUE;

      RAISE NOTICE 'v404: Inserted sample EEF for account %.', v_org_id;
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
          FALSE, v_org_id, v_creator
        ),
        (
          'Integrated change control procedure',
          'Steps to log, assess, decide, and implement changes across scope, schedule, cost, and baselines with a single change board.',
          v_opa_proc, 'procedure', '3.0', 'active',
          CURRENT_DATE - 30,
          'intranet:/procedures/integrated-change-control',
          ARRAY['change', 'baseline', 'ccb'],
          'Use for all capital and strategic projects.',
          FALSE, v_org_id, v_creator
        ),
        (
          'Risk register and response planning guideline',
          'Defines risk categories, scoring scales, owner assignment, and expected monetary value / qualitative thresholds.',
          v_opa_proc, 'guideline', '2.1', 'active',
          CURRENT_DATE - 60,
          'intranet:/guidelines/risk-management',
          ARRAY['risk', 'raid'],
          NULL,
          FALSE, v_org_id, v_creator
        ),
        (
          'Information security and data classification policy',
          'Mandatory handling rules for confidential, personal, and regulated data in project artefacts and supplier engagements.',
          v_opa_pol, 'policy', '2025-Q4', 'active',
          CURRENT_DATE - 90,
          'intranet:/policies/info-security',
          ARRAY['security', 'compliance', 'gdpr'],
          NULL,
          FALSE, v_org_id, v_creator
        ),
        (
          'Lessons learned repository — submission standard',
          'What to capture at phase end and project closure; fields for context, recommendation, and reusable artefacts.',
          v_opa_know, 'lessons_learned', '1.0', 'active',
          CURRENT_DATE - 14,
          'intranet:/knowledge/lessons-learned',
          ARRAY['closure', 'continuous improvement'],
          'Link outcomes to OPA updates where applicable.',
          FALSE, v_org_id, v_creator
        ),
        (
          'Financial authorisation limits matrix',
          'Delegation of financial approval by role and amount; used when approving vendors and change orders.',
          v_opa_pol, 'standard', 'FY26', 'active',
          CURRENT_DATE,
          'intranet:/finance/delegation-matrix',
          ARRAY['finance', 'procurement'],
          NULL,
          FALSE, v_org_id, v_creator
        ),
        (
          'Stakeholder communication plan template',
          'Audience, message, channel, frequency, and owner for programme and project communications.',
          v_opa_tpl, 'template', '1.0', 'draft',
          NULL,
          'intranet:/templates/stakeholder-comms-plan',
          ARRAY['communications', 'stakeholders'],
          'Draft pending PMO review.',
          TRUE, v_org_id, v_creator
        ),
        (
          'Historical estimating benchmarks — IT delivery',
          'Anonymised effort and duration ranges by work package type for similar past projects (internal use).',
          v_opa_know, 'historical_info', '2024', 'archived',
          CURRENT_DATE - 400,
          'intranet:/archive/estimating-benchmarks-it-2024',
          ARRAY['estimating', 'benchmark'],
          'Superseded by 2025 pack; retained for trend analysis.',
          FALSE, v_org_id, v_creator
        );

      UPDATE public.organisational_process_assets
      SET on_hold_reason = 'Awaiting PMO sign-off'
      WHERE organisation_id = v_org_id
        AND title = 'Stakeholder communication plan template'
        AND is_on_hold = TRUE;

      RAISE NOTICE 'v404: Inserted sample OPA for account %.', v_org_id;
    END IF;

    SELECT COUNT(*) INTO v_eef_count FROM sim.enterprise_environment_factors WHERE organisation_id = v_org_id;
    SELECT COUNT(*) INTO v_opa_count FROM sim.organisational_process_assets WHERE organisation_id = v_org_id;

    IF v_eef_count = 0 THEN
      INSERT INTO sim.enterprise_environment_factors (
        title, description, category_id, eef_type, impact_level, impact_direction,
        source_reference, status, notes, is_on_hold, on_hold_reason, organisation_id, created_by
      )
      SELECT
        e.title, e.description, c_sim.id, e.eef_type, e.impact_level, e.impact_direction,
        e.source_reference, e.status, e.notes, e.is_on_hold, e.on_hold_reason, v_org_id, v_creator
      FROM public.enterprise_environment_factors e
      LEFT JOIN sim.eef_categories c_sim
        ON c_sim.organisation_id IS NULL
        AND c_sim.code = (SELECT ec.code FROM public.eef_categories ec WHERE ec.id = e.category_id LIMIT 1)
      WHERE e.organisation_id = v_org_id;

      RAISE NOTICE 'v404: Mirrored EEF to sim for account %.', v_org_id;
    END IF;

    IF v_opa_count = 0 THEN
      INSERT INTO sim.organisational_process_assets (
        title, description, category_id, opa_type, version, status,
        effective_date, expiry_date, document_reference, tags, notes,
        is_on_hold, on_hold_reason, organisation_id, created_by
      )
      SELECT
        o.title, o.description, c_sim.id, o.opa_type, o.version, o.status,
        o.effective_date, o.expiry_date, o.document_reference, o.tags, o.notes,
        o.is_on_hold, o.on_hold_reason, v_org_id, v_creator
      FROM public.organisational_process_assets o
      LEFT JOIN sim.opa_categories c_sim
        ON c_sim.organisation_id IS NULL
        AND c_sim.code = (SELECT oc.code FROM public.opa_categories oc WHERE oc.id = o.category_id LIMIT 1)
      WHERE o.organisation_id = v_org_id;

      RAISE NOTICE 'v404: Mirrored OPA to sim for account %.', v_org_id;
    END IF;
  END LOOP;
END $$;
