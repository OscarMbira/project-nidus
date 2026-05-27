-- =============================================================================
-- v636_initiation_business_justification_seed_data.sql
-- Seed: Initiation & Business Justification sidebar section (Platform / public)
--   • Business Case
--   • Project Brief
--   • Benefits Review Plan
-- Prerequisites: accounts, users, projects (≥1; ≥2 recommended for multiple briefs),
--                programmes (optional), v260, v163, v186 migrations applied
-- Idempotent: markers SEED636-BC-*, SEED636-PB-*, SEED636-BRP-* — deleted and re-inserted
-- PostgreSQL 15+ / Supabase
-- =============================================================================

DO $$
DECLARE
  v_user_id      UUID;
  v_programme_id UUID;
  v_proj1        UUID;
  v_proj2        UUID;
  v_proj3        UUID;
  v_bc1          UUID;
  v_bc2          UUID;
  v_bc3          UUID;
  v_pb1          UUID;
  v_pb2          UUID;
  v_brp1         UUID;
  v_brp2         UUID;
BEGIN
  SELECT u.id INTO v_user_id
  FROM public.users u
  WHERE COALESCE(u.is_deleted, FALSE) = FALSE
  ORDER BY u.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v636: No public.users row — skip initiation seed.';
    RETURN;
  END IF;

  SELECT p.id INTO v_proj1
  FROM public.projects p
  WHERE COALESCE(p.is_deleted, FALSE) = FALSE
  ORDER BY p.created_at ASC NULLS LAST
  LIMIT 1 OFFSET 0;

  SELECT p.id INTO v_proj2
  FROM public.projects p
  WHERE COALESCE(p.is_deleted, FALSE) = FALSE
  ORDER BY p.created_at ASC NULLS LAST
  LIMIT 1 OFFSET 1;

  SELECT p.id INTO v_proj3
  FROM public.projects p
  WHERE COALESCE(p.is_deleted, FALSE) = FALSE
  ORDER BY p.created_at ASC NULLS LAST
  LIMIT 1 OFFSET 2;

  SELECT pg.id INTO v_programme_id
  FROM public.programmes pg
  WHERE COALESCE(pg.is_deleted, FALSE) = FALSE
  ORDER BY pg.created_at ASC NULLS LAST
  LIMIT 1;

  -- ── Remove prior seed rows (children first) ───────────────────────────────
  DELETE FROM public.benefits_review_plan_resources
  WHERE review_plan_id IN (
    SELECT id FROM public.benefits_review_plans WHERE document_ref LIKE 'SEED636-BRP-%'
  );

  DELETE FROM public.benefits_review_plan_revisions
  WHERE review_plan_id IN (
    SELECT id FROM public.benefits_review_plans WHERE document_ref LIKE 'SEED636-BRP-%'
  );

  DELETE FROM public.benefits_review_plans WHERE document_ref LIKE 'SEED636-BRP-%';

  DELETE FROM public.brief_objectives
  WHERE brief_id IN (SELECT id FROM public.project_briefs WHERE brief_reference LIKE 'SEED636-PB-%');

  DELETE FROM public.project_briefs WHERE brief_reference LIKE 'SEED636-PB-%';

  DELETE FROM public.business_case_options
  WHERE business_case_id IN (SELECT id FROM public.business_cases WHERE case_reference LIKE 'SEED636-BC-%');

  DELETE FROM public.business_case_benefits
  WHERE business_case_id IN (SELECT id FROM public.business_cases WHERE case_reference LIKE 'SEED636-BC-%');

  DELETE FROM public.business_case_dis_benefits
  WHERE business_case_id IN (SELECT id FROM public.business_cases WHERE case_reference LIKE 'SEED636-BC-%');

  DELETE FROM public.business_case_revisions
  WHERE business_case_id IN (SELECT id FROM public.business_cases WHERE case_reference LIKE 'SEED636-BC-%');

  DELETE FROM public.business_cases WHERE case_reference LIKE 'SEED636-BC-%';

  -- ── Business Cases (3 statuses) ───────────────────────────────────────────
  INSERT INTO public.business_cases (
    case_reference, case_title, document_status, version_number, created_date,
    programme_id, project_id, created_by, updated_by,
    executive_summary, strategic_alignment, reasons_for_project, problem_statement,
    recommended_option, option_justification,
    timescale_description, start_date, end_date,
    estimated_development_cost, estimated_ongoing_cost, funding_source,
    npv, roi_percentage, payback_period_months, overall_risk_rating, major_risks
  ) VALUES (
    'SEED636-BC-001',
    'Programme Business Case — Enterprise Digital Modernisation',
    'draft', '1.0', CURRENT_DATE,
    v_programme_id, NULL, v_user_id, v_user_id,
    'Consolidate legacy platforms into a single cloud-native delivery stack to reduce operational cost and improve time-to-market.',
    'Supports the organisation 3-year digital strategy pillar: resilient, data-driven operations.',
    'Current systems are fragmented, expensive to maintain, and block new product launches.',
    'Manual handoffs between finance, operations, and customer channels add 6–8 weeks to change delivery.',
    'do_something',
    'Full modernisation delivers acceptable ROI within 24 months while meeting regulatory obligations.',
    '18-month phased delivery with two stage boundaries.', CURRENT_DATE + 30, CURRENT_DATE + 548,
    1250000.00, 320000.00, 'Capital programme budget',
    890000.00, 18.5, 22, 'medium',
    'Integration complexity, vendor dependency, and change saturation across business units.'
  ) RETURNING id INTO v_bc1;

  INSERT INTO public.business_cases (
    case_reference, case_title, document_status, version_number, created_date,
    programme_id, project_id, created_by, updated_by,
    executive_summary, reasons_for_project, recommended_option,
    estimated_development_cost, estimated_ongoing_cost, overall_risk_rating
  ) VALUES (
    'SEED636-BC-002',
    'Project Business Case — Customer Portal Redesign',
    'submitted', '1.1', CURRENT_DATE,
    v_programme_id, v_proj1, v_user_id, v_user_id,
    'Replace the ageing customer portal with a responsive, self-service experience integrated to CRM and billing.',
    'Customer satisfaction scores lag competitors; support call volume is 35% above target.',
    'do_something',
    420000.00, 85000.00, 'low'
  ) RETURNING id INTO v_bc2;

  INSERT INTO public.business_cases (
    case_reference, case_title, document_status, version_number, created_date,
    project_id, created_by, updated_by,
    executive_summary, reasons_for_project, recommended_option,
    estimated_development_cost, estimated_ongoing_cost, overall_risk_rating,
    npv, roi_percentage
  ) VALUES (
    'SEED636-BC-003',
    'Project Business Case — Data Warehouse Migration',
    'approved', '2.0', CURRENT_DATE - 14,
    COALESCE(v_proj2, v_proj1), v_user_id, v_user_id,
    'Migrate analytics workloads to a governed cloud warehouse with certified datasets for PMO reporting.',
    'Reporting teams spend 40% of effort reconciling spreadsheets; audit findings noted weak lineage.',
    'do_something',
    680000.00, 120000.00, 'medium',
    540000.00, 14.2
  ) RETURNING id INTO v_bc3;

  -- Options for BC-001
  INSERT INTO public.business_case_options (
    business_case_id, option_number, option_type, option_title, description,
    estimated_cost, advantages, disadvantages, is_recommended, display_order, created_by
  ) VALUES
    (v_bc1, 1, 'do_nothing', 'Do Nothing', 'Retain current platforms and absorb rising maintenance costs.', 0,
     'No migration risk', 'Costs continue to rise; strategy goals missed', FALSE, 1, v_user_id),
    (v_bc1, 2, 'do_minimum', 'Do Minimum', 'Patch critical systems only; defer full integration.', 450000.00,
     'Lower upfront spend', 'Technical debt remains; limited benefit realisation', FALSE, 2, v_user_id),
    (v_bc1, 3, 'do_something', 'Do Something — Full Programme', 'Phased cloud migration with standardised integration layer.', 1570000.00,
     'Best long-term ROI; aligns to strategy', 'Higher initial investment and change impact', TRUE, 3, v_user_id);

  INSERT INTO public.business_case_benefits (
    business_case_id, benefit_description, benefit_type, measurement_method,
    target_value, benefit_owner, display_order, created_by
  ) VALUES
    (v_bc3, 'Reduce manual reporting effort by 30%', 'operational', 'Hours saved per month vs baseline', '30%', 'PMO Analytics Lead', 1, v_user_id),
    (v_bc3, 'Single source of truth for portfolio KPIs', 'strategic', 'Dashboard adoption and data quality score', '95% certified datasets', 'Head of PMO', 2, v_user_id);

  INSERT INTO public.business_case_dis_benefits (
    business_case_id, dis_benefit_description, impact_description, mitigation, display_order, created_by
  ) VALUES
    (v_bc3, 'Temporary duplication of reporting during parallel run', 'Teams maintain two reporting paths for one quarter', 'Dedicated transition team and cutover plan', 1, v_user_id);

  -- ── Project Briefs (requires distinct projects) ───────────────────────────
  IF v_proj1 IS NOT NULL THEN
    INSERT INTO public.project_briefs (
      project_id, brief_reference, version_number, document_status, created_date,
      author_id, owner_id, created_by, updated_by,
      background, project_objectives, desired_outcomes, project_scope, scope_exclusions,
      constraints, assumptions, outline_business_case_summary, business_option_selected,
      product_description, project_approach_description, delivery_approach, lessons_learned_reviewed
    ) VALUES (
      v_proj1, 'SEED636-PB-001', '1.0', 'draft', CURRENT_DATE,
      v_user_id, v_user_id, v_user_id, v_user_id,
      'Customer portal refresh initiated after mandate approval for improved digital engagement.',
      'Launch responsive portal MVP within 9 months; reduce support tickets by 20%; achieve CSAT ≥ 4.2/5.',
      'Customers complete top 10 journeys without agent assistance; NPS improves by 8 points.',
      'UX redesign, authentication upgrade, self-service billing and case management.',
      'Legacy back-office replacement; native mobile apps (phase 2).',
      'Fixed delivery window aligned to regulatory marketing window; capped vendor spend.',
      'CRM APIs remain stable; test environments available from month 1.',
      'Investment justified by support cost reduction and retention uplift — aligns to BC-002.',
      'do_something',
      'Responsive web portal integrated to CRM, billing, and knowledge base.',
      'Agile delivery with fortnightly releases; vendor-led UX, in-house integration squad.',
      'contracted', TRUE
    ) RETURNING id INTO v_pb1;

    INSERT INTO public.brief_objectives (
      brief_id, objective_text, objective_type, is_specific, is_measurable, is_achievable, is_realistic, is_time_bound,
      target_value, target_date, display_order
    ) VALUES
      (v_pb1, 'Reduce average support handling time for portal-related tickets by 20%', 'benefit', TRUE, TRUE, TRUE, TRUE, TRUE, '20%', CURRENT_DATE + 270, 1),
      (v_pb1, 'Deliver MVP portal go-live no later than Q4', 'time', TRUE, TRUE, TRUE, TRUE, TRUE, 'Go-live', CURRENT_DATE + 270, 2);
  END IF;

  IF v_proj2 IS NOT NULL AND v_proj2 IS DISTINCT FROM v_proj1 THEN
    INSERT INTO public.project_briefs (
      project_id, brief_reference, version_number, document_status, created_date,
      author_id, owner_id, created_by, updated_by,
      background, project_objectives, project_scope, outline_business_case_summary,
      business_option_selected, product_description, project_approach_description, delivery_approach
    ) VALUES (
      v_proj2, 'SEED636-PB-002', '1.2', 'under_review', CURRENT_DATE - 7,
      v_user_id, v_user_id, v_user_id, v_user_id,
      'Analytics modernisation brief following approved data warehouse business case.',
      'Establish governed datasets for portfolio, financial, and benefits reporting within 12 months.',
      'Ingestion pipelines, semantic layer, PMO dashboards, data quality rules.',
      'Approved business case SEED636-BC-003 — migration to cloud warehouse.',
      'do_something',
      'Certified datasets, PMO executive dashboards, and self-service explorer for programme managers.',
      'Phased migration by domain; platform team plus embedded analysts.',
      'hybrid'
    ) RETURNING id INTO v_pb2;
  END IF;

  -- ── Benefits Review Plans ─────────────────────────────────────────────────
  INSERT INTO public.benefits_review_plans (
    document_ref, version_number, plan_title, plan_date, status,
    project_id, programme_id, business_case_id,
    author_user_id, owner_user_id, created_by, updated_by,
    scope_description, accountability_description, measurement_approach,
    measurement_timing_rationale, resources_description,
    estimated_review_effort_hours, performance_review_approach, performance_review_frequency,
    baseline_measures_description, dis_benefits_included, dis_benefits_description
  ) VALUES (
    'SEED636-BRP-001', '1.0', 'Benefits Review Plan — Customer Portal Redesign', CURRENT_DATE, 'draft',
    v_proj1, v_programme_id, v_bc2,
    v_user_id, v_user_id, v_user_id, v_user_id,
    'Covers operational and customer experience benefits linked to the portal redesign business case.',
    'Benefits Owner: Product Director; Measurement Lead: Business Analyst; Assurance: PMO.',
    'Mix of leading indicators (task completion, CSAT) and lagging indicators (support volume, retention).',
    'Monthly during rollout; quarterly for 12 months post go-live to capture adoption curve.',
    '0.5 FTE Business Analyst, CRM reporting access, survey tooling.',
    120.00,
    'Stage-gate reviews at MVP, go-live +90 days, and +12 months.',
    'monthly',
    'Baseline support volumes and CSAT captured from last 6 months of operations data.',
    TRUE, 'Temporary duplicate handling during parallel portal operation for one sprint cycle.'
  ) RETURNING id INTO v_brp1;

  INSERT INTO public.benefits_review_plans (
    document_ref, version_number, plan_title, plan_date, status,
    project_id, business_case_id,
    author_user_id, owner_user_id, created_by, updated_by,
    scope_description, measurement_approach, performance_review_frequency,
    performance_review_approach, baseline_measures_description
  ) VALUES (
    'SEED636-BRP-002', '1.0', 'Benefits Review Plan — Data Warehouse Migration', CURRENT_DATE - 7, 'approved',
    COALESCE(v_proj2, v_proj1), v_bc3,
    v_user_id, v_user_id, v_user_id, v_user_id,
    'Tracks reporting efficiency, data quality, and portfolio decision-making benefits from the warehouse programme.',
    'Automated dashboard metrics plus quarterly benefits realisation workshops with PMO.',
    'quarterly',
    'Benefits Realisation Review at stage end, project closure, and +6 months post closure.',
    'Baseline: hours spent on manual reconciliation; number of uncertified datasets in use.'
  ) RETURNING id INTO v_brp2;

  INSERT INTO public.benefits_review_plan_resources (
    review_plan_id, resource_type, resource_name, resource_description,
    estimated_effort_hours, estimated_cost, availability_confirmed, created_by
  ) VALUES
    (v_brp1, 'person', 'Benefits Analyst', 'Part-time analyst for measurement and reporting', 80.00, NULL, TRUE, v_user_id),
    (v_brp1, 'tool', 'Survey Platform', 'Customer satisfaction pulse surveys', NULL, 12000.00, TRUE, v_user_id),
    (v_brp2, 'person', 'PMO Benefits Lead', 'Owns benefits realisation reviews and PMO reporting', 40.00, NULL, TRUE, v_user_id);

  INSERT INTO public.benefits_review_plan_revisions (
    review_plan_id, revision_number, revision_date, summary_of_changes, revised_by_user_id, created_by
  ) VALUES
    (v_brp2, '1.0', CURRENT_DATE - 7, 'Initial approved version — seeded for Initiation & Business Justification demo.', v_user_id, v_user_id);

  RAISE NOTICE 'v636: Seeded initiation documents — BC: 3, PB: %, BRP: 2.',
    (SELECT COUNT(*) FROM public.project_briefs WHERE brief_reference LIKE 'SEED636-PB-%');
END $$;
