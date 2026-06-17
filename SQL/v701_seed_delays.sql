-- =============================================================================
-- v701: Seed Data â€“ Delay Register (6 delays) + Delay Templates (5 templates)
-- Prerequisites: v696 (demo project must exist).
-- Covers: Infrastructure/technical, Regulatory, Vendor, Internal delays.
-- Column mapping from v444_project_delays.sql schema.
--
-- delay_category valid values: weather|resource|technical|external_dependency|
--   change_request|regulatory|financial|risk_materialised|stakeholder|other
-- source_type valid values: manual|from_template|auto_issue|auto_risk|auto_defect
-- status valid values: identified|under_review|approved|resolved|closed
-- =============================================================================

DO $$
DECLARE
  v_project_id UUID;
  v_account_id UUID;
  v_user_id    UUID;
BEGIN

  SELECT id INTO v_project_id
  FROM public.projects
  WHERE project_code = 'EDP-2024' AND COALESCE(is_deleted, false) = false LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE NOTICE 'v701: Demo project not found â€“ run v696 first. Skipping.';
    RETURN;
  END IF;

  SELECT account_id INTO v_account_id FROM public.projects WHERE id = v_project_id;

  SELECT id INTO v_user_id
  FROM public.users WHERE COALESCE(is_deleted, false) = false LIMIT 1;

  -- Set auth.uid() so audit triggers get a real user ID
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', (
      SELECT auth_user_id::text FROM public.users WHERE id = v_user_id AND auth_user_id IS NOT NULL LIMIT 1
    ))::text, true);


  -- â”€â”€â”€ PART A: Delay Register â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  INSERT INTO public.project_delays (
    id, project_id, organisation_id,
    delay_reference, title, description,
    delay_category, delay_cause, responsible_party,
    severity, status,
    impact_schedule_days, impact_cost,
    impact_scope,
    identified_date,
    original_baseline_date, revised_forecast_date,
    resolution_plan,
    source_type,
    created_by, is_deleted, created_at, updated_at
  )
  SELECT
    gen_random_uuid(), v_project_id, v_account_id,
    d.delay_ref, d.title, d.description,
    d.category, d.cause, d.responsible_party,
    d.severity, d.status,
    d.schedule_days, d.cost_impact,
    d.scope_impact,
    CURRENT_DATE - (d.identified_days_ago || ' days')::interval,
    CURRENT_DATE - (d.baseline_offset     || ' days')::interval,
    CURRENT_DATE + (d.revised_offset      || ' days')::interval,
    d.resolution_plan,
    'manual',
    v_user_id, false, NOW(), NOW()
  FROM (VALUES
    -- (delay_ref, title, description, category, cause, responsible_party,
    --  severity, status, schedule_days, cost_impact, scope_impact,
    --  identified_days_ago, baseline_offset, revised_offset, resolution_plan)
    ('DEL-001',
     'Cloud Infrastructure Provisioning Delay',
     'Azure environment provisioning for Stage 3 was delayed by 18 working days due to a public cloud capacity constraint in the UK South region. The DevOps team could not spin up required VM instances to the agreed specification.',
     'technical', 'cloud-capacity-constraint', 'Microsoft Azure (Vendor)',
     'high', 'identified',
     18, 22500,
     'Parallel work on components requiring cloud infrastructure blocked; integration testing start delayed',
     28, 45, 14,
     'Azure capacity confirmed in UK West region as alternative; migration of workloads to UK West approved; additional networking configuration required'),

    ('DEL-002',
     'FCA Regulatory Approval for Customer Data Processing Agreement',
     'The Financial Conduct Authority review of the new customer data processing agreement took 6 weeks longer than the 4-week SLA indicated in pre-engagement. The agreement is a prerequisite for UAT on the payments module.',
     'regulatory', 'regulator-review-delay', 'Financial Conduct Authority',
     'critical', 'resolved',
     30, 0,
     'UAT on payments module delayed; risk of missing contractual go-live milestone with two major clients',
     60, 90, -5,
     'FCA approval received. Payments UAT commenced 30 days late. Programme Director approved 3-week parallel working arrangement to compress schedule.'),

    ('DEL-003',
     'Mobile Platform Vendor â€“ Sprint 8 Deliverable Not Met',
     'The mobile platform vendor failed to deliver the offline synchronisation module as committed in Sprint 8. The vendor cited internal resourcing issues. The deliverable was 12 working days late.',
     'other', 'supplier-performance', 'TechMobile Solutions Ltd',
     'high', 'resolved',
     12, 15000,
     'Mobile app go-live for field teams delayed; interim paper-based process extended',
     40, 55, -8,
     'Deliverable received. SLA penalty clause invoked (Â£8K credit applied). Additional testing days procured from vendor at no cost. Lessons raised (LES-003 referenced).'),

    ('DEL-004',
     'Internal Sign-Off Bottleneck â€“ Finance Director Approvals',
     'Three separate project decisions requiring Finance Director sign-off were queued for 14 working days due to competing executive priorities during the annual budget cycle.',
     'stakeholder', 'governance-bottleneck', 'Finance Directorate',
     'medium', 'resolved',
     14, 8000,
     'Stage Gate 3 entry delayed; team unproductive time while awaiting decisions',
     45, 50, -2,
     'All three decisions resolved. Governance protocol updated to allow Programme Director to approve up to Â£50K without Finance Director queue when AD is in budget cycle.'),

    ('DEL-005',
     'Requirements Rework Following Late Stakeholder Review',
     'A key stakeholder (VP Operations) who was not included in Stage 1 requirements workshops reviewed the functional design specification in Stage 2 and identified 8 requirements that conflicted with the new operational model.',
     'stakeholder', 'scope-rework', 'Programme Governance',
     'high', 'under_review',
     20, 28000,
     '8 user stories re-designed; 2 completed sprints partially reworked; test cases updated',
     10, 25, 15,
     'Rework 60% complete. Stakeholder RACI updated to mandate VP Operations review at all future Stage Gate reviews. PID updated to reflect revised scope.'),

    ('DEL-006',
     'Data Centre Power Outage â€“ 4-Hour Production Environment Interruption',
     'An unplanned power interruption at the co-location data centre used for the pre-production environment caused 4 hours of downtime during a planned end-to-end test execution day.',
     'technical', 'infrastructure-failure', 'DataVault Co-Location Ltd',
     'low', 'resolved',
     1, 500,
     'Minor; 2 test cycles rerun the following day',
     5, 5, -3,
     'Environment restored. Data centre provider issued RCA and provided 1-month hosting credit. UPS upgrade confirmed for facility by end of quarter.')

  ) AS d(delay_ref, title, description, category, cause, responsible_party,
         severity, status, schedule_days, cost_impact, scope_impact,
         identified_days_ago, baseline_offset, revised_offset, resolution_plan)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.project_delays
    WHERE project_id = v_project_id AND delay_reference = d.delay_ref
  );

  -- â”€â”€â”€ PART B: Delay Templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  -- Column mapping: name (not template_name), organisation_id (not account_id),
  -- delay_cause (not typical_cause), default_severity (not typical_severity),
  -- resolution_plan_template (not resolution_guidance). No is_active column.

  INSERT INTO public.delay_templates (
    id, organisation_id,
    name,
    delay_category, delay_cause, responsible_party,
    default_severity,
    resolution_plan_template,
    status,
    created_by, created_at, updated_at
  )
  SELECT
    gen_random_uuid(), v_account_id,
    t.name,
    t.category, t.cause, t.responsible_party,
    t.severity,
    t.resolution_template,
    'active',
    v_user_id, NOW(), NOW()
  FROM (VALUES
    ('Cloud / Infrastructure Provisioning Delay',
     'technical', 'cloud-capacity-constraint', 'Cloud/Infrastructure Vendor',
     'high',
     '1. Raise formal delay notification with vendor within 24 hours. 2. Assess alternative regions or providers. 3. Identify workstream tasks that can proceed without the blocked infrastructure. 4. Update schedule baseline and notify Programme Director. 5. Invoke SLA clause if delay exceeds contractual tolerance.'),

    ('Regulatory or Compliance Approval Delay',
     'regulatory', 'regulator-review-delay', 'Regulatory Authority / Legal',
     'critical',
     '1. Contact regulator/legal with a formal chase within 5 days of SLA breach. 2. Escalate to Programme Director if delay exceeds 10 days. 3. Assess whether other workstreams can proceed in parallel. 4. Review project timeline and prepare a compressed schedule option for board. 5. Document all communications for audit trail.'),

    ('Third-Party Vendor Deliverable Late',
     'other', 'supplier-performance', 'Third-Party Supplier',
     'high',
     '1. Issue formal notice of delay to vendor within 24 hours of missed date. 2. Review contract for SLA penalties and invoke where applicable. 3. Demand a revised delivery commitment with daily progress updates. 4. Assess contingency options (in-house build, alternative supplier). 5. Log delay and supplier performance issue in project records for future procurement reference.'),

    ('Internal Decision / Approval Bottleneck',
     'stakeholder', 'governance-bottleneck', 'Internal Governance / Executive',
     'medium',
     '1. Re-submit decision request with clear business impact of delay stated in financial and schedule terms. 2. Escalate to Programme Sponsor if no response within agreed SLA. 3. Explore whether a delegated authority framework can be applied. 4. Document delay and its cause in programme risk register. 5. Propose governance improvement in next lessons log review.'),

    ('Requirements Rework Due to Late Stakeholder Input',
     'stakeholder', 'scope-rework', 'Programme Governance / Stakeholder Management',
     'high',
     '1. Log rework as a formal delay and raise a change request if scope boundary is affected. 2. Identify all downstream artefacts requiring update. 3. Brief the Programme Board on impact before proceeding with rework. 4. Update the stakeholder engagement plan to prevent recurrence. 5. Conduct a root cause review and record findings in lessons log.')

  ) AS t(name, category, cause, responsible_party, severity, resolution_template)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.delay_templates
    WHERE organisation_id = v_account_id AND name = t.name
  );

  RAISE NOTICE 'v701: Delay register and templates seed complete for project %.', v_project_id;

END $$;
