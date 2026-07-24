-- =============================================================================
-- v787: Platform + Simulator Structured/Agile process-template masters
-- Companion to v786 (forms). Sources: Admin v189c + v191e
-- Plan: projectplan/v786_platform_sim_methodology_form_seed_parity_plan.md (follow-up)
-- Idempotent: reference_code SEED787-* upsert by reference_code
-- Prerequisites: process document tables (v629/v632), accounts, auth.users
-- =============================================================================

DO $$
DECLARE
  v_account_id UUID;
  v_created_by UUID;
  v_id UUID;
BEGIN
  SELECT a.id INTO v_account_id
  FROM public.accounts a
  WHERE COALESCE(a.is_deleted, FALSE) = FALSE
  ORDER BY a.created_at NULLS LAST, a.id
  LIMIT 1;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'v787: no active public.accounts row — cannot seed process masters';
  END IF;

  SELECT u.id INTO v_created_by FROM auth.users u ORDER BY u.created_at NULLS LAST LIMIT 1;
  -- created_by may be NULL on some environments; columns often allow NULL


  -- Quality Management Strategy (Structured) → public.project_management_plans
  SELECT id INTO v_id FROM public.project_management_plans
  WHERE reference_code = 'SEED787-seed_pt_str_quality_strategy' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.project_management_plans (
      id, account_id, reference_code, title, description, document_data,
      status, is_master, project_id, created_by, is_deleted
    ) VALUES (
      '21b8f5d6-f98f-42e3-8b67-4d9cff5a7f65'::uuid, v_account_id, 'SEED787-seed_pt_str_quality_strategy', 'Quality Management Strategy (Structured)', 'Structured Initiating — quality management strategy (process guidance).',
      '{"purpose":"Define how quality will be managed on the project.","owner_role":"Project Manager / Quality Assurance","review_cadence":"Each stage boundary","sample_notes":"Keep aligned with corporate quality standards.","introduction":"Introduction — scope and objectives of quality management for the project.","quality_management_system":"Quality management system — standards, methods, and tools to be applied.","quality_planning":"Quality planning — how quality requirements are identified and planned.","quality_control":"Quality control — inspection, testing, and review activities.","quality_assurance":"Quality assurance — independent checks and audit approach.","project_quality_records":"Project quality records — what records are kept and where.","reporting":"Reporting — how quality performance is reported and escalated."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE public.project_management_plans SET
      title = 'Quality Management Strategy (Structured)',
      description = 'Structured Initiating — quality management strategy (process guidance).',
      document_data = '{"purpose":"Define how quality will be managed on the project.","owner_role":"Project Manager / Quality Assurance","review_cadence":"Each stage boundary","sample_notes":"Keep aligned with corporate quality standards.","introduction":"Introduction — scope and objectives of quality management for the project.","quality_management_system":"Quality management system — standards, methods, and tools to be applied.","quality_planning":"Quality planning — how quality requirements are identified and planned.","quality_control":"Quality control — inspection, testing, and review activities.","quality_assurance":"Quality assurance — independent checks and audit approach.","project_quality_records":"Project quality records — what records are kept and where.","reporting":"Reporting — how quality performance is reported and escalated."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Risk Management Strategy (Structured) → public.project_management_plans
  SELECT id INTO v_id FROM public.project_management_plans
  WHERE reference_code = 'SEED787-seed_pt_str_risk_strategy' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.project_management_plans (
      id, account_id, reference_code, title, description, document_data,
      status, is_master, project_id, created_by, is_deleted
    ) VALUES (
      'e32c94cb-11d7-4812-8003-07ba7a055ceb'::uuid, v_account_id, 'SEED787-seed_pt_str_risk_strategy', 'Risk Management Strategy (Structured)', 'Structured Initiating — risk management strategy (process guidance).',
      '{"purpose":"Define how risk will be identified, assessed, and controlled.","owner_role":"Project Manager / Risk Owner","review_cadence":"Fortnightly risk review","sample_notes":"Escalate risks that threaten stage or project tolerances.","introduction":"Introduction — purpose and scope of risk management.","risk_management_procedure":"Risk management procedure — overall approach and workflow.","risk_identification":"Risk identification — techniques and triggers.","risk_assessment":"Risk assessment — evaluation criteria and scoring method.","risk_response_planning":"Risk response planning — response types and selection criteria.","risk_monitoring_and_control":"Risk monitoring and control — review frequency and ownership.","tools_and_techniques":"Tools and techniques — registers, workshops, checklists used.","risk_categories":"Risk categories — taxonomy used on this project.","probability_impact_scales":"Probability and impact scales — definitions for each level.","proximity":"Proximity — how timing / nearness of risk is assessed.","risk_budget":"Risk budget — contingency and risk allowance approach.","roles_and_responsibilities":"Roles and responsibilities — who identifies, owns, and escalates risks.","risk_register_approach":"Risk register — format, maintenance, and version control.","reporting":"Reporting — risk reporting cadence and escalation thresholds."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE public.project_management_plans SET
      title = 'Risk Management Strategy (Structured)',
      description = 'Structured Initiating — risk management strategy (process guidance).',
      document_data = '{"purpose":"Define how risk will be identified, assessed, and controlled.","owner_role":"Project Manager / Risk Owner","review_cadence":"Fortnightly risk review","sample_notes":"Escalate risks that threaten stage or project tolerances.","introduction":"Introduction — purpose and scope of risk management.","risk_management_procedure":"Risk management procedure — overall approach and workflow.","risk_identification":"Risk identification — techniques and triggers.","risk_assessment":"Risk assessment — evaluation criteria and scoring method.","risk_response_planning":"Risk response planning — response types and selection criteria.","risk_monitoring_and_control":"Risk monitoring and control — review frequency and ownership.","tools_and_techniques":"Tools and techniques — registers, workshops, checklists used.","risk_categories":"Risk categories — taxonomy used on this project.","probability_impact_scales":"Probability and impact scales — definitions for each level.","proximity":"Proximity — how timing / nearness of risk is assessed.","risk_budget":"Risk budget — contingency and risk allowance approach.","roles_and_responsibilities":"Roles and responsibilities — who identifies, owns, and escalates risks.","risk_register_approach":"Risk register — format, maintenance, and version control.","reporting":"Reporting — risk reporting cadence and escalation thresholds."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Configuration Management Strategy (Structured) → public.project_management_plans
  SELECT id INTO v_id FROM public.project_management_plans
  WHERE reference_code = 'SEED787-seed_pt_str_config_strategy' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.project_management_plans (
      id, account_id, reference_code, title, description, document_data,
      status, is_master, project_id, created_by, is_deleted
    ) VALUES (
      'fb53717f-224d-4604-8894-873c3f2a3c2a'::uuid, v_account_id, 'SEED787-seed_pt_str_config_strategy', 'Configuration Management Strategy (Structured)', 'Structured Initiating — configuration management strategy (process guidance).',
      '{"purpose":"Define how configuration items are identified, controlled, and audited.","owner_role":"Configuration Librarian / Project Manager","review_cadence":"Each stage boundary / release","sample_notes":"Baselines require formal approval before change.","introduction":"Introduction — purpose and scope of configuration management.","configuration_management_procedure":"Configuration management procedure — overall workflow.","configuration_identification":"Configuration identification — naming, baselines, and versioning.","configuration_change_control":"Configuration change control — authorisation and approval levels.","configuration_status_accounting":"Configuration status accounting — status tracking approach.","configuration_audits":"Configuration audits — verification and compliance checks.","tools_and_techniques":"Tools and techniques — CM tools, repositories, and libraries.","issue_and_change_control":"Issue and change control — linkage to issue register and change requests.","roles_and_responsibilities":"Roles and responsibilities — CM roles and accountabilities."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE public.project_management_plans SET
      title = 'Configuration Management Strategy (Structured)',
      description = 'Structured Initiating — configuration management strategy (process guidance).',
      document_data = '{"purpose":"Define how configuration items are identified, controlled, and audited.","owner_role":"Configuration Librarian / Project Manager","review_cadence":"Each stage boundary / release","sample_notes":"Baselines require formal approval before change.","introduction":"Introduction — purpose and scope of configuration management.","configuration_management_procedure":"Configuration management procedure — overall workflow.","configuration_identification":"Configuration identification — naming, baselines, and versioning.","configuration_change_control":"Configuration change control — authorisation and approval levels.","configuration_status_accounting":"Configuration status accounting — status tracking approach.","configuration_audits":"Configuration audits — verification and compliance checks.","tools_and_techniques":"Tools and techniques — CM tools, repositories, and libraries.","issue_and_change_control":"Issue and change control — linkage to issue register and change requests.","roles_and_responsibilities":"Roles and responsibilities — CM roles and accountabilities."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Communication Management Strategy (Structured) → public.project_management_plans
  SELECT id INTO v_id FROM public.project_management_plans
  WHERE reference_code = 'SEED787-seed_pt_str_comms_strategy' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.project_management_plans (
      id, account_id, reference_code, title, description, document_data,
      status, is_master, project_id, created_by, is_deleted
    ) VALUES (
      'c45bcf56-d572-4346-81f3-96f70a891dda'::uuid, v_account_id, 'SEED787-seed_pt_str_comms_strategy', 'Communication Management Strategy (Structured)', 'Structured Initiating — communication management strategy (process guidance).',
      '{"purpose":"Define how project information is planned, distributed, and reported.","owner_role":"Project Manager / Communications Lead","review_cadence":"Monthly / each stage boundary","sample_notes":"Align channels with stakeholder information needs.","introduction":"Introduction — purpose and scope of communication management.","communication_procedure":"Communication procedure — overall approach to project communications.","communication_planning":"Communication planning — analysis of information needs.","information_distribution":"Information distribution — channels, formats, and timing.","performance_reporting":"Performance reporting — status, highlight, and exception reporting.","stakeholder_engagement":"Stakeholder engagement — engagement approach and responsibilities.","communication_channels":"Communication channels — meetings, portals, email, reports.","roles_and_responsibilities":"Roles and responsibilities — who communicates what to whom."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE public.project_management_plans SET
      title = 'Communication Management Strategy (Structured)',
      description = 'Structured Initiating — communication management strategy (process guidance).',
      document_data = '{"purpose":"Define how project information is planned, distributed, and reported.","owner_role":"Project Manager / Communications Lead","review_cadence":"Monthly / each stage boundary","sample_notes":"Align channels with stakeholder information needs.","introduction":"Introduction — purpose and scope of communication management.","communication_procedure":"Communication procedure — overall approach to project communications.","communication_planning":"Communication planning — analysis of information needs.","information_distribution":"Information distribution — channels, formats, and timing.","performance_reporting":"Performance reporting — status, highlight, and exception reporting.","stakeholder_engagement":"Stakeholder engagement — engagement approach and responsibilities.","communication_channels":"Communication channels — meetings, portals, email, reports.","roles_and_responsibilities":"Roles and responsibilities — who communicates what to whom."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Definition of Done (Agile) → public.scope_acceptance_forms
  SELECT id INTO v_id FROM public.scope_acceptance_forms
  WHERE reference_code = 'SEED787-seed_pt_agile_dod' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.scope_acceptance_forms (
      id, account_id, reference_code, title, description, document_data,
      status, is_master, project_id, created_by, is_deleted
    ) VALUES (
      '14a4f9b4-fb0f-4207-8642-7518e58cdd96'::uuid, v_account_id, 'SEED787-seed_pt_agile_dod', 'Definition of Done (Agile)', 'Agile Release — definition of done (process guidance).',
      '{"purpose":"Define the shared quality bar for calling work done.","owner_role":"Team / Quality Lead","review_cadence":"Each retrospective; update when quality gaps appear","sample_notes":"Keep DoD short enough to verify every item.","introduction":"Introduction — why a shared Definition of Done exists for this team.","coding_standards":"Coding standards — style, reviews, and static checks required.","testing":"Testing — unit, integration, and exploratory expectations.","documentation":"Documentation — release notes, help text, and runbooks when needed.","non_functional":"Non-functional — performance, accessibility, and security checks.","peer_review":"Peer review — who must approve and what evidence is required.","environment":"Environment — which environments must pass before done.","acceptance":"Acceptance — Product Owner or stakeholder confirmation rules.","exceptions":"Exceptions — how temporary waivers are recorded and closed."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE public.scope_acceptance_forms SET
      title = 'Definition of Done (Agile)',
      description = 'Agile Release — definition of done (process guidance).',
      document_data = '{"purpose":"Define the shared quality bar for calling work done.","owner_role":"Team / Quality Lead","review_cadence":"Each retrospective; update when quality gaps appear","sample_notes":"Keep DoD short enough to verify every item.","introduction":"Introduction — why a shared Definition of Done exists for this team.","coding_standards":"Coding standards — style, reviews, and static checks required.","testing":"Testing — unit, integration, and exploratory expectations.","documentation":"Documentation — release notes, help text, and runbooks when needed.","non_functional":"Non-functional — performance, accessibility, and security checks.","peer_review":"Peer review — who must approve and what evidence is required.","environment":"Environment — which environments must pass before done.","acceptance":"Acceptance — Product Owner or stakeholder confirmation rules.","exceptions":"Exceptions — how temporary waivers are recorded and closed."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Definition of Ready (Agile) → public.requirements_management_plans
  SELECT id INTO v_id FROM public.requirements_management_plans
  WHERE reference_code = 'SEED787-seed_pt_agile_dor' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.requirements_management_plans (
      id, account_id, reference_code, title, description, document_data,
      status, is_master, project_id, created_by, is_deleted
    ) VALUES (
      '13113f74-1eb3-4381-88d3-a244a964f8cd'::uuid, v_account_id, 'SEED787-seed_pt_agile_dor', 'Definition of Ready (Agile)', 'Agile Backlog — definition of ready (process guidance).',
      '{"purpose":"Define entry criteria so items are ready for sprint planning.","owner_role":"Product Owner / Team","review_cadence":"Each backlog refinement","sample_notes":"Reject items that fail DoR rather than forcing them into a sprint.","introduction":"Introduction — purpose of Definition of Ready for this backlog.","clarity":"Clarity — title, description, and value are understood by the team.","acceptance_criteria":"Acceptance criteria — testable conditions exist before planning.","dependencies":"Dependencies — known dependencies identified or removed.","sizing":"Sizing — item is estimated or time-boxed appropriately.","priority":"Priority — relative priority is set by the Product Owner.","design_assets":"Design / assets — required mockups or data are available.","risks":"Risks — known risks noted with mitigation or spike if needed.","checklist":"Checklist — team DoR checklist items are complete."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE public.requirements_management_plans SET
      title = 'Definition of Ready (Agile)',
      description = 'Agile Backlog — definition of ready (process guidance).',
      document_data = '{"purpose":"Define entry criteria so items are ready for sprint planning.","owner_role":"Product Owner / Team","review_cadence":"Each backlog refinement","sample_notes":"Reject items that fail DoR rather than forcing them into a sprint.","introduction":"Introduction — purpose of Definition of Ready for this backlog.","clarity":"Clarity — title, description, and value are understood by the team.","acceptance_criteria":"Acceptance criteria — testable conditions exist before planning.","dependencies":"Dependencies — known dependencies identified or removed.","sizing":"Sizing — item is estimated or time-boxed appropriately.","priority":"Priority — relative priority is set by the Product Owner.","design_assets":"Design / assets — required mockups or data are available.","risks":"Risks — known risks noted with mitigation or spike if needed.","checklist":"Checklist — team DoR checklist items are complete."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Backlog Management Approach (Agile) → public.requirements_documentation
  SELECT id INTO v_id FROM public.requirements_documentation
  WHERE reference_code = 'SEED787-seed_pt_agile_backlog_approach' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.requirements_documentation (
      id, account_id, reference_code, title, description, document_data,
      status, is_master, project_id, created_by, is_deleted
    ) VALUES (
      'e38d419e-40c7-4f6d-8b45-103fb239b025'::uuid, v_account_id, 'SEED787-seed_pt_agile_backlog_approach', 'Backlog Management Approach (Agile)', 'Agile Backlog — backlog management approach.',
      '{"purpose":"Describe how the product backlog is ordered, refined, and owned.","owner_role":"Product Owner","review_cadence":"Quarterly or when product strategy changes","sample_notes":"Keep one ordered backlog; avoid shadow lists.","introduction":"Introduction — scope of backlog management for this product.","ownership":"Ownership — who prioritises and who may add items.","ordering":"Ordering — factors used to sequence work (value, risk, cost of delay).","refinement_cadence":"Refinement cadence — how often and how long sessions run.","item_types":"Item types — stories, bugs, spikes, enablers and when to use each.","estimation":"Estimation — relative sizing approach and who participates.","readiness":"Readiness — how Definition of Ready is applied before planning.","transparency":"Transparency — where the backlog lives and who can view it.","escalation":"Escalation — how conflicting priorities are resolved."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE public.requirements_documentation SET
      title = 'Backlog Management Approach (Agile)',
      description = 'Agile Backlog — backlog management approach.',
      document_data = '{"purpose":"Describe how the product backlog is ordered, refined, and owned.","owner_role":"Product Owner","review_cadence":"Quarterly or when product strategy changes","sample_notes":"Keep one ordered backlog; avoid shadow lists.","introduction":"Introduction — scope of backlog management for this product.","ownership":"Ownership — who prioritises and who may add items.","ordering":"Ordering — factors used to sequence work (value, risk, cost of delay).","refinement_cadence":"Refinement cadence — how often and how long sessions run.","item_types":"Item types — stories, bugs, spikes, enablers and when to use each.","estimation":"Estimation — relative sizing approach and who participates.","readiness":"Readiness — how Definition of Ready is applied before planning.","transparency":"Transparency — where the backlog lives and who can view it.","escalation":"Escalation — how conflicting priorities are resolved."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Sprint Cadence Guide (Agile) → public.project_management_plans
  SELECT id INTO v_id FROM public.project_management_plans
  WHERE reference_code = 'SEED787-seed_pt_agile_cadence' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.project_management_plans (
      id, account_id, reference_code, title, description, document_data,
      status, is_master, project_id, created_by, is_deleted
    ) VALUES (
      '500bfb65-0d00-425b-8362-317194e9c5df'::uuid, v_account_id, 'SEED787-seed_pt_agile_cadence', 'Sprint Cadence Guide (Agile)', 'Agile Sprint Planning — sprint cadence guide.',
      '{"purpose":"Describe the recurring sprint events, time-boxes, and roles.","owner_role":"Scrum Master / Team","review_cadence":"Each retrospective","sample_notes":"Protect time-boxes; adjust length only by team agreement.","introduction":"Introduction — sprint length and calendar for this team.","planning":"Planning — purpose, time-box, and required attendees.","daily_sync":"Daily sync — purpose, time-box, and focus on the sprint goal.","review":"Review — demo expectations and stakeholder invitations.","retrospective":"Retrospective — format options and action follow-up.","roles":"Roles — Product Owner, Scrum Master, and team responsibilities at each event.","artefacts":"Artefacts — which forms/logs are updated after each event.","interruptions":"Interruptions — how mid-sprint requests are handled."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE public.project_management_plans SET
      title = 'Sprint Cadence Guide (Agile)',
      description = 'Agile Sprint Planning — sprint cadence guide.',
      document_data = '{"purpose":"Describe the recurring sprint events, time-boxes, and roles.","owner_role":"Scrum Master / Team","review_cadence":"Each retrospective","sample_notes":"Protect time-boxes; adjust length only by team agreement.","introduction":"Introduction — sprint length and calendar for this team.","planning":"Planning — purpose, time-box, and required attendees.","daily_sync":"Daily sync — purpose, time-box, and focus on the sprint goal.","review":"Review — demo expectations and stakeholder invitations.","retrospective":"Retrospective — format options and action follow-up.","roles":"Roles — Product Owner, Scrum Master, and team responsibilities at each event.","artefacts":"Artefacts — which forms/logs are updated after each event.","interruptions":"Interruptions — how mid-sprint requests are handled."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Release / Deployment Approach (Agile) → public.project_closure_checklists
  SELECT id INTO v_id FROM public.project_closure_checklists
  WHERE reference_code = 'SEED787-seed_pt_agile_release_approach' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.project_closure_checklists (
      id, account_id, reference_code, title, description, document_data,
      status, is_master, project_id, created_by, is_deleted
    ) VALUES (
      '5fac7315-d79e-4252-8b82-ae5f1d07dc50'::uuid, v_account_id, 'SEED787-seed_pt_agile_release_approach', 'Release / Deployment Approach (Agile)', 'Agile Release — release and deployment approach.',
      '{"purpose":"Describe how increments are released, gated, and rolled back if needed.","owner_role":"Release Manager / Team","review_cadence":"Each major release; update after incidents","sample_notes":"Align gates with Definition of Done and ops checklists.","introduction":"Introduction — release philosophy (continuous vs scheduled).","environments":"Environments — promotion path from build to production.","quality_gates":"Quality gates — tests, security, and approvals required.","communications":"Communications — who is notified and when.","rollback_policy":"Rollback policy — triggers, owners, and verification.","hotfixes":"Hotfixes — accelerated path for production defects.","evidence":"Evidence — what is stored for audit and learning.","ownership":"Ownership — RACI for go/no-go and deployment steps."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE public.project_closure_checklists SET
      title = 'Release / Deployment Approach (Agile)',
      description = 'Agile Release — release and deployment approach.',
      document_data = '{"purpose":"Describe how increments are released, gated, and rolled back if needed.","owner_role":"Release Manager / Team","review_cadence":"Each major release; update after incidents","sample_notes":"Align gates with Definition of Done and ops checklists.","introduction":"Introduction — release philosophy (continuous vs scheduled).","environments":"Environments — promotion path from build to production.","quality_gates":"Quality gates — tests, security, and approvals required.","communications":"Communications — who is notified and when.","rollback_policy":"Rollback policy — triggers, owners, and verification.","hotfixes":"Hotfixes — accelerated path for production defects.","evidence":"Evidence — what is stored for audit and learning.","ownership":"Ownership — RACI for go/no-go and deployment steps."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Daily Stand-up Notes (Agile) → public.team_performance_assessments
  SELECT id INTO v_id FROM public.team_performance_assessments
  WHERE reference_code = 'SEED787-seed_pt_agile_standup_notes' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.team_performance_assessments (
      id, account_id, reference_code, title, description, document_data,
      status, is_master, project_id, created_by, is_deleted
    ) VALUES (
      'befafb2a-85a0-472b-8318-609a13f0b08b'::uuid, v_account_id, 'SEED787-seed_pt_agile_standup_notes', 'Daily Stand-up Notes (Agile)', 'Master for capturing daily stand-up outcomes during sprint execution.',
      '{"purpose":"Record yesterday / today / impediments for the sprint team.","owner_role":"Scrum Master","review_cadence":"Daily during sprint","sample_notes":"Keep entries short; escalate blockers same day.","introduction":"Daily sync notes supporting the sprint goal.","yesterday":"What was completed since the last sync.","today":"What will be worked on toward the sprint goal.","impediments":"Blockers raised and owners assigned.","board_health":"WIP, blocked cards, and forecast notes.","escalations":"Items needing help outside the team."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE public.team_performance_assessments SET
      title = 'Daily Stand-up Notes (Agile)',
      description = 'Master for capturing daily stand-up outcomes during sprint execution.',
      document_data = '{"purpose":"Record yesterday / today / impediments for the sprint team.","owner_role":"Scrum Master","review_cadence":"Daily during sprint","sample_notes":"Keep entries short; escalate blockers same day.","introduction":"Daily sync notes supporting the sprint goal.","yesterday":"What was completed since the last sync.","today":"What will be worked on toward the sprint goal.","impediments":"Blockers raised and owners assigned.","board_health":"WIP, blocked cards, and forecast notes.","escalations":"Items needing help outside the team."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Impediment Log (Agile) → public.variance_analysis_reports
  SELECT id INTO v_id FROM public.variance_analysis_reports
  WHERE reference_code = 'SEED787-seed_pt_agile_impediment_log' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.variance_analysis_reports (
      id, account_id, reference_code, title, description, document_data,
      status, is_master, project_id, created_by, is_deleted
    ) VALUES (
      '25ddb9e7-bf4d-448d-8c12-33bb1e535fa2'::uuid, v_account_id, 'SEED787-seed_pt_agile_impediment_log', 'Impediment Log (Agile)', 'Master impediment register used during sprint execution.',
      '{"purpose":"Track impediments, owners, and resolution dates.","owner_role":"Scrum Master","review_cadence":"Daily stand-up","sample_notes":"Close impediments with evidence of removal.","introduction":"Living log of blockers affecting sprint delivery.","identification":"How impediments are raised and classified.","ownership":"Who owns removal and escalation paths.","tracking":"Status values and target dates.","resolution":"Evidence required before closing.","reporting":"How impediments are summarised to stakeholders."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE public.variance_analysis_reports SET
      title = 'Impediment Log (Agile)',
      description = 'Master impediment register used during sprint execution.',
      document_data = '{"purpose":"Track impediments, owners, and resolution dates.","owner_role":"Scrum Master","review_cadence":"Daily stand-up","sample_notes":"Close impediments with evidence of removal.","introduction":"Living log of blockers affecting sprint delivery.","identification":"How impediments are raised and classified.","ownership":"Who owns removal and escalation paths.","tracking":"Status values and target dates.","resolution":"Evidence required before closing.","reporting":"How impediments are summarised to stakeholders."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Product Backlog Refinement Notes (Agile) → public.requirements_documentation
  SELECT id INTO v_id FROM public.requirements_documentation
  WHERE reference_code = 'SEED787-seed_pt_agile_backlog_refinement' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.requirements_documentation (
      id, account_id, reference_code, title, description, document_data,
      status, is_master, project_id, created_by, is_deleted
    ) VALUES (
      'f1626d52-cd8f-421d-8f33-4e1453ff57d9'::uuid, v_account_id, 'SEED787-seed_pt_agile_backlog_refinement', 'Product Backlog Refinement Notes (Agile)', 'Master for backlog refinement sessions.',
      '{"purpose":"Capture refined stories, estimates, and readiness decisions.","owner_role":"Product Owner / Team","review_cadence":"Each refinement session","sample_notes":"Exit with clear ready / not-ready decisions.","introduction":"Session notes for backlog refinement.","preparation":"What Product Owner prepares before the session.","activities":"Splitting, clarifying, and estimating activities.","readiness":"How Definition of Ready is applied.","outputs":"Updated items, estimates, and open questions.","follow_up":"Actions after the session."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE public.requirements_documentation SET
      title = 'Product Backlog Refinement Notes (Agile)',
      description = 'Master for backlog refinement sessions.',
      document_data = '{"purpose":"Capture refined stories, estimates, and readiness decisions.","owner_role":"Product Owner / Team","review_cadence":"Each refinement session","sample_notes":"Exit with clear ready / not-ready decisions.","introduction":"Session notes for backlog refinement.","preparation":"What Product Owner prepares before the session.","activities":"Splitting, clarifying, and estimating activities.","readiness":"How Definition of Ready is applied.","outputs":"Updated items, estimates, and open questions.","follow_up":"Actions after the session."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'sim') THEN

  -- Quality Management Strategy (Structured) → sim.project_management_plans
  SELECT id INTO v_id FROM sim.project_management_plans
  WHERE reference_code = 'SEED787-seed_pt_str_quality_strategy' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO sim.project_management_plans (
      id, reference_code, title, description, document_data,
      status, is_master, practice_project_id, created_by, is_deleted
    ) VALUES (
      '21b8f5d6-f98f-42e3-8b67-4d9cff5a7f65'::uuid, 'SEED787-seed_pt_str_quality_strategy', 'Quality Management Strategy (Structured)', 'Structured Initiating — quality management strategy (process guidance).',
      '{"purpose":"Define how quality will be managed on the project.","owner_role":"Project Manager / Quality Assurance","review_cadence":"Each stage boundary","sample_notes":"Keep aligned with corporate quality standards.","introduction":"Introduction — scope and objectives of quality management for the project.","quality_management_system":"Quality management system — standards, methods, and tools to be applied.","quality_planning":"Quality planning — how quality requirements are identified and planned.","quality_control":"Quality control — inspection, testing, and review activities.","quality_assurance":"Quality assurance — independent checks and audit approach.","project_quality_records":"Project quality records — what records are kept and where.","reporting":"Reporting — how quality performance is reported and escalated."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE sim.project_management_plans SET
      title = 'Quality Management Strategy (Structured)',
      description = 'Structured Initiating — quality management strategy (process guidance).',
      document_data = '{"purpose":"Define how quality will be managed on the project.","owner_role":"Project Manager / Quality Assurance","review_cadence":"Each stage boundary","sample_notes":"Keep aligned with corporate quality standards.","introduction":"Introduction — scope and objectives of quality management for the project.","quality_management_system":"Quality management system — standards, methods, and tools to be applied.","quality_planning":"Quality planning — how quality requirements are identified and planned.","quality_control":"Quality control — inspection, testing, and review activities.","quality_assurance":"Quality assurance — independent checks and audit approach.","project_quality_records":"Project quality records — what records are kept and where.","reporting":"Reporting — how quality performance is reported and escalated."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Risk Management Strategy (Structured) → sim.project_management_plans
  SELECT id INTO v_id FROM sim.project_management_plans
  WHERE reference_code = 'SEED787-seed_pt_str_risk_strategy' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO sim.project_management_plans (
      id, reference_code, title, description, document_data,
      status, is_master, practice_project_id, created_by, is_deleted
    ) VALUES (
      'e32c94cb-11d7-4812-8003-07ba7a055ceb'::uuid, 'SEED787-seed_pt_str_risk_strategy', 'Risk Management Strategy (Structured)', 'Structured Initiating — risk management strategy (process guidance).',
      '{"purpose":"Define how risk will be identified, assessed, and controlled.","owner_role":"Project Manager / Risk Owner","review_cadence":"Fortnightly risk review","sample_notes":"Escalate risks that threaten stage or project tolerances.","introduction":"Introduction — purpose and scope of risk management.","risk_management_procedure":"Risk management procedure — overall approach and workflow.","risk_identification":"Risk identification — techniques and triggers.","risk_assessment":"Risk assessment — evaluation criteria and scoring method.","risk_response_planning":"Risk response planning — response types and selection criteria.","risk_monitoring_and_control":"Risk monitoring and control — review frequency and ownership.","tools_and_techniques":"Tools and techniques — registers, workshops, checklists used.","risk_categories":"Risk categories — taxonomy used on this project.","probability_impact_scales":"Probability and impact scales — definitions for each level.","proximity":"Proximity — how timing / nearness of risk is assessed.","risk_budget":"Risk budget — contingency and risk allowance approach.","roles_and_responsibilities":"Roles and responsibilities — who identifies, owns, and escalates risks.","risk_register_approach":"Risk register — format, maintenance, and version control.","reporting":"Reporting — risk reporting cadence and escalation thresholds."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE sim.project_management_plans SET
      title = 'Risk Management Strategy (Structured)',
      description = 'Structured Initiating — risk management strategy (process guidance).',
      document_data = '{"purpose":"Define how risk will be identified, assessed, and controlled.","owner_role":"Project Manager / Risk Owner","review_cadence":"Fortnightly risk review","sample_notes":"Escalate risks that threaten stage or project tolerances.","introduction":"Introduction — purpose and scope of risk management.","risk_management_procedure":"Risk management procedure — overall approach and workflow.","risk_identification":"Risk identification — techniques and triggers.","risk_assessment":"Risk assessment — evaluation criteria and scoring method.","risk_response_planning":"Risk response planning — response types and selection criteria.","risk_monitoring_and_control":"Risk monitoring and control — review frequency and ownership.","tools_and_techniques":"Tools and techniques — registers, workshops, checklists used.","risk_categories":"Risk categories — taxonomy used on this project.","probability_impact_scales":"Probability and impact scales — definitions for each level.","proximity":"Proximity — how timing / nearness of risk is assessed.","risk_budget":"Risk budget — contingency and risk allowance approach.","roles_and_responsibilities":"Roles and responsibilities — who identifies, owns, and escalates risks.","risk_register_approach":"Risk register — format, maintenance, and version control.","reporting":"Reporting — risk reporting cadence and escalation thresholds."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Configuration Management Strategy (Structured) → sim.project_management_plans
  SELECT id INTO v_id FROM sim.project_management_plans
  WHERE reference_code = 'SEED787-seed_pt_str_config_strategy' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO sim.project_management_plans (
      id, reference_code, title, description, document_data,
      status, is_master, practice_project_id, created_by, is_deleted
    ) VALUES (
      'fb53717f-224d-4604-8894-873c3f2a3c2a'::uuid, 'SEED787-seed_pt_str_config_strategy', 'Configuration Management Strategy (Structured)', 'Structured Initiating — configuration management strategy (process guidance).',
      '{"purpose":"Define how configuration items are identified, controlled, and audited.","owner_role":"Configuration Librarian / Project Manager","review_cadence":"Each stage boundary / release","sample_notes":"Baselines require formal approval before change.","introduction":"Introduction — purpose and scope of configuration management.","configuration_management_procedure":"Configuration management procedure — overall workflow.","configuration_identification":"Configuration identification — naming, baselines, and versioning.","configuration_change_control":"Configuration change control — authorisation and approval levels.","configuration_status_accounting":"Configuration status accounting — status tracking approach.","configuration_audits":"Configuration audits — verification and compliance checks.","tools_and_techniques":"Tools and techniques — CM tools, repositories, and libraries.","issue_and_change_control":"Issue and change control — linkage to issue register and change requests.","roles_and_responsibilities":"Roles and responsibilities — CM roles and accountabilities."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE sim.project_management_plans SET
      title = 'Configuration Management Strategy (Structured)',
      description = 'Structured Initiating — configuration management strategy (process guidance).',
      document_data = '{"purpose":"Define how configuration items are identified, controlled, and audited.","owner_role":"Configuration Librarian / Project Manager","review_cadence":"Each stage boundary / release","sample_notes":"Baselines require formal approval before change.","introduction":"Introduction — purpose and scope of configuration management.","configuration_management_procedure":"Configuration management procedure — overall workflow.","configuration_identification":"Configuration identification — naming, baselines, and versioning.","configuration_change_control":"Configuration change control — authorisation and approval levels.","configuration_status_accounting":"Configuration status accounting — status tracking approach.","configuration_audits":"Configuration audits — verification and compliance checks.","tools_and_techniques":"Tools and techniques — CM tools, repositories, and libraries.","issue_and_change_control":"Issue and change control — linkage to issue register and change requests.","roles_and_responsibilities":"Roles and responsibilities — CM roles and accountabilities."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Communication Management Strategy (Structured) → sim.project_management_plans
  SELECT id INTO v_id FROM sim.project_management_plans
  WHERE reference_code = 'SEED787-seed_pt_str_comms_strategy' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO sim.project_management_plans (
      id, reference_code, title, description, document_data,
      status, is_master, practice_project_id, created_by, is_deleted
    ) VALUES (
      'c45bcf56-d572-4346-81f3-96f70a891dda'::uuid, 'SEED787-seed_pt_str_comms_strategy', 'Communication Management Strategy (Structured)', 'Structured Initiating — communication management strategy (process guidance).',
      '{"purpose":"Define how project information is planned, distributed, and reported.","owner_role":"Project Manager / Communications Lead","review_cadence":"Monthly / each stage boundary","sample_notes":"Align channels with stakeholder information needs.","introduction":"Introduction — purpose and scope of communication management.","communication_procedure":"Communication procedure — overall approach to project communications.","communication_planning":"Communication planning — analysis of information needs.","information_distribution":"Information distribution — channels, formats, and timing.","performance_reporting":"Performance reporting — status, highlight, and exception reporting.","stakeholder_engagement":"Stakeholder engagement — engagement approach and responsibilities.","communication_channels":"Communication channels — meetings, portals, email, reports.","roles_and_responsibilities":"Roles and responsibilities — who communicates what to whom."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE sim.project_management_plans SET
      title = 'Communication Management Strategy (Structured)',
      description = 'Structured Initiating — communication management strategy (process guidance).',
      document_data = '{"purpose":"Define how project information is planned, distributed, and reported.","owner_role":"Project Manager / Communications Lead","review_cadence":"Monthly / each stage boundary","sample_notes":"Align channels with stakeholder information needs.","introduction":"Introduction — purpose and scope of communication management.","communication_procedure":"Communication procedure — overall approach to project communications.","communication_planning":"Communication planning — analysis of information needs.","information_distribution":"Information distribution — channels, formats, and timing.","performance_reporting":"Performance reporting — status, highlight, and exception reporting.","stakeholder_engagement":"Stakeholder engagement — engagement approach and responsibilities.","communication_channels":"Communication channels — meetings, portals, email, reports.","roles_and_responsibilities":"Roles and responsibilities — who communicates what to whom."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Definition of Done (Agile) → sim.scope_acceptance_forms
  SELECT id INTO v_id FROM sim.scope_acceptance_forms
  WHERE reference_code = 'SEED787-seed_pt_agile_dod' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO sim.scope_acceptance_forms (
      id, reference_code, title, description, document_data,
      status, is_master, practice_project_id, created_by, is_deleted
    ) VALUES (
      '14a4f9b4-fb0f-4207-8642-7518e58cdd96'::uuid, 'SEED787-seed_pt_agile_dod', 'Definition of Done (Agile)', 'Agile Release — definition of done (process guidance).',
      '{"purpose":"Define the shared quality bar for calling work done.","owner_role":"Team / Quality Lead","review_cadence":"Each retrospective; update when quality gaps appear","sample_notes":"Keep DoD short enough to verify every item.","introduction":"Introduction — why a shared Definition of Done exists for this team.","coding_standards":"Coding standards — style, reviews, and static checks required.","testing":"Testing — unit, integration, and exploratory expectations.","documentation":"Documentation — release notes, help text, and runbooks when needed.","non_functional":"Non-functional — performance, accessibility, and security checks.","peer_review":"Peer review — who must approve and what evidence is required.","environment":"Environment — which environments must pass before done.","acceptance":"Acceptance — Product Owner or stakeholder confirmation rules.","exceptions":"Exceptions — how temporary waivers are recorded and closed."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE sim.scope_acceptance_forms SET
      title = 'Definition of Done (Agile)',
      description = 'Agile Release — definition of done (process guidance).',
      document_data = '{"purpose":"Define the shared quality bar for calling work done.","owner_role":"Team / Quality Lead","review_cadence":"Each retrospective; update when quality gaps appear","sample_notes":"Keep DoD short enough to verify every item.","introduction":"Introduction — why a shared Definition of Done exists for this team.","coding_standards":"Coding standards — style, reviews, and static checks required.","testing":"Testing — unit, integration, and exploratory expectations.","documentation":"Documentation — release notes, help text, and runbooks when needed.","non_functional":"Non-functional — performance, accessibility, and security checks.","peer_review":"Peer review — who must approve and what evidence is required.","environment":"Environment — which environments must pass before done.","acceptance":"Acceptance — Product Owner or stakeholder confirmation rules.","exceptions":"Exceptions — how temporary waivers are recorded and closed."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Definition of Ready (Agile) → sim.requirements_management_plans
  SELECT id INTO v_id FROM sim.requirements_management_plans
  WHERE reference_code = 'SEED787-seed_pt_agile_dor' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO sim.requirements_management_plans (
      id, reference_code, title, description, document_data,
      status, is_master, practice_project_id, created_by, is_deleted
    ) VALUES (
      '13113f74-1eb3-4381-88d3-a244a964f8cd'::uuid, 'SEED787-seed_pt_agile_dor', 'Definition of Ready (Agile)', 'Agile Backlog — definition of ready (process guidance).',
      '{"purpose":"Define entry criteria so items are ready for sprint planning.","owner_role":"Product Owner / Team","review_cadence":"Each backlog refinement","sample_notes":"Reject items that fail DoR rather than forcing them into a sprint.","introduction":"Introduction — purpose of Definition of Ready for this backlog.","clarity":"Clarity — title, description, and value are understood by the team.","acceptance_criteria":"Acceptance criteria — testable conditions exist before planning.","dependencies":"Dependencies — known dependencies identified or removed.","sizing":"Sizing — item is estimated or time-boxed appropriately.","priority":"Priority — relative priority is set by the Product Owner.","design_assets":"Design / assets — required mockups or data are available.","risks":"Risks — known risks noted with mitigation or spike if needed.","checklist":"Checklist — team DoR checklist items are complete."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE sim.requirements_management_plans SET
      title = 'Definition of Ready (Agile)',
      description = 'Agile Backlog — definition of ready (process guidance).',
      document_data = '{"purpose":"Define entry criteria so items are ready for sprint planning.","owner_role":"Product Owner / Team","review_cadence":"Each backlog refinement","sample_notes":"Reject items that fail DoR rather than forcing them into a sprint.","introduction":"Introduction — purpose of Definition of Ready for this backlog.","clarity":"Clarity — title, description, and value are understood by the team.","acceptance_criteria":"Acceptance criteria — testable conditions exist before planning.","dependencies":"Dependencies — known dependencies identified or removed.","sizing":"Sizing — item is estimated or time-boxed appropriately.","priority":"Priority — relative priority is set by the Product Owner.","design_assets":"Design / assets — required mockups or data are available.","risks":"Risks — known risks noted with mitigation or spike if needed.","checklist":"Checklist — team DoR checklist items are complete."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Backlog Management Approach (Agile) → sim.requirements_documentation
  SELECT id INTO v_id FROM sim.requirements_documentation
  WHERE reference_code = 'SEED787-seed_pt_agile_backlog_approach' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO sim.requirements_documentation (
      id, reference_code, title, description, document_data,
      status, is_master, practice_project_id, created_by, is_deleted
    ) VALUES (
      'e38d419e-40c7-4f6d-8b45-103fb239b025'::uuid, 'SEED787-seed_pt_agile_backlog_approach', 'Backlog Management Approach (Agile)', 'Agile Backlog — backlog management approach.',
      '{"purpose":"Describe how the product backlog is ordered, refined, and owned.","owner_role":"Product Owner","review_cadence":"Quarterly or when product strategy changes","sample_notes":"Keep one ordered backlog; avoid shadow lists.","introduction":"Introduction — scope of backlog management for this product.","ownership":"Ownership — who prioritises and who may add items.","ordering":"Ordering — factors used to sequence work (value, risk, cost of delay).","refinement_cadence":"Refinement cadence — how often and how long sessions run.","item_types":"Item types — stories, bugs, spikes, enablers and when to use each.","estimation":"Estimation — relative sizing approach and who participates.","readiness":"Readiness — how Definition of Ready is applied before planning.","transparency":"Transparency — where the backlog lives and who can view it.","escalation":"Escalation — how conflicting priorities are resolved."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE sim.requirements_documentation SET
      title = 'Backlog Management Approach (Agile)',
      description = 'Agile Backlog — backlog management approach.',
      document_data = '{"purpose":"Describe how the product backlog is ordered, refined, and owned.","owner_role":"Product Owner","review_cadence":"Quarterly or when product strategy changes","sample_notes":"Keep one ordered backlog; avoid shadow lists.","introduction":"Introduction — scope of backlog management for this product.","ownership":"Ownership — who prioritises and who may add items.","ordering":"Ordering — factors used to sequence work (value, risk, cost of delay).","refinement_cadence":"Refinement cadence — how often and how long sessions run.","item_types":"Item types — stories, bugs, spikes, enablers and when to use each.","estimation":"Estimation — relative sizing approach and who participates.","readiness":"Readiness — how Definition of Ready is applied before planning.","transparency":"Transparency — where the backlog lives and who can view it.","escalation":"Escalation — how conflicting priorities are resolved."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Sprint Cadence Guide (Agile) → sim.project_management_plans
  SELECT id INTO v_id FROM sim.project_management_plans
  WHERE reference_code = 'SEED787-seed_pt_agile_cadence' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO sim.project_management_plans (
      id, reference_code, title, description, document_data,
      status, is_master, practice_project_id, created_by, is_deleted
    ) VALUES (
      '500bfb65-0d00-425b-8362-317194e9c5df'::uuid, 'SEED787-seed_pt_agile_cadence', 'Sprint Cadence Guide (Agile)', 'Agile Sprint Planning — sprint cadence guide.',
      '{"purpose":"Describe the recurring sprint events, time-boxes, and roles.","owner_role":"Scrum Master / Team","review_cadence":"Each retrospective","sample_notes":"Protect time-boxes; adjust length only by team agreement.","introduction":"Introduction — sprint length and calendar for this team.","planning":"Planning — purpose, time-box, and required attendees.","daily_sync":"Daily sync — purpose, time-box, and focus on the sprint goal.","review":"Review — demo expectations and stakeholder invitations.","retrospective":"Retrospective — format options and action follow-up.","roles":"Roles — Product Owner, Scrum Master, and team responsibilities at each event.","artefacts":"Artefacts — which forms/logs are updated after each event.","interruptions":"Interruptions — how mid-sprint requests are handled."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE sim.project_management_plans SET
      title = 'Sprint Cadence Guide (Agile)',
      description = 'Agile Sprint Planning — sprint cadence guide.',
      document_data = '{"purpose":"Describe the recurring sprint events, time-boxes, and roles.","owner_role":"Scrum Master / Team","review_cadence":"Each retrospective","sample_notes":"Protect time-boxes; adjust length only by team agreement.","introduction":"Introduction — sprint length and calendar for this team.","planning":"Planning — purpose, time-box, and required attendees.","daily_sync":"Daily sync — purpose, time-box, and focus on the sprint goal.","review":"Review — demo expectations and stakeholder invitations.","retrospective":"Retrospective — format options and action follow-up.","roles":"Roles — Product Owner, Scrum Master, and team responsibilities at each event.","artefacts":"Artefacts — which forms/logs are updated after each event.","interruptions":"Interruptions — how mid-sprint requests are handled."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Release / Deployment Approach (Agile) → sim.project_closure_checklists
  SELECT id INTO v_id FROM sim.project_closure_checklists
  WHERE reference_code = 'SEED787-seed_pt_agile_release_approach' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO sim.project_closure_checklists (
      id, reference_code, title, description, document_data,
      status, is_master, practice_project_id, created_by, is_deleted
    ) VALUES (
      '5fac7315-d79e-4252-8b82-ae5f1d07dc50'::uuid, 'SEED787-seed_pt_agile_release_approach', 'Release / Deployment Approach (Agile)', 'Agile Release — release and deployment approach.',
      '{"purpose":"Describe how increments are released, gated, and rolled back if needed.","owner_role":"Release Manager / Team","review_cadence":"Each major release; update after incidents","sample_notes":"Align gates with Definition of Done and ops checklists.","introduction":"Introduction — release philosophy (continuous vs scheduled).","environments":"Environments — promotion path from build to production.","quality_gates":"Quality gates — tests, security, and approvals required.","communications":"Communications — who is notified and when.","rollback_policy":"Rollback policy — triggers, owners, and verification.","hotfixes":"Hotfixes — accelerated path for production defects.","evidence":"Evidence — what is stored for audit and learning.","ownership":"Ownership — RACI for go/no-go and deployment steps."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE sim.project_closure_checklists SET
      title = 'Release / Deployment Approach (Agile)',
      description = 'Agile Release — release and deployment approach.',
      document_data = '{"purpose":"Describe how increments are released, gated, and rolled back if needed.","owner_role":"Release Manager / Team","review_cadence":"Each major release; update after incidents","sample_notes":"Align gates with Definition of Done and ops checklists.","introduction":"Introduction — release philosophy (continuous vs scheduled).","environments":"Environments — promotion path from build to production.","quality_gates":"Quality gates — tests, security, and approvals required.","communications":"Communications — who is notified and when.","rollback_policy":"Rollback policy — triggers, owners, and verification.","hotfixes":"Hotfixes — accelerated path for production defects.","evidence":"Evidence — what is stored for audit and learning.","ownership":"Ownership — RACI for go/no-go and deployment steps."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Daily Stand-up Notes (Agile) → sim.team_performance_assessments
  SELECT id INTO v_id FROM sim.team_performance_assessments
  WHERE reference_code = 'SEED787-seed_pt_agile_standup_notes' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO sim.team_performance_assessments (
      id, reference_code, title, description, document_data,
      status, is_master, practice_project_id, created_by, is_deleted
    ) VALUES (
      'befafb2a-85a0-472b-8318-609a13f0b08b'::uuid, 'SEED787-seed_pt_agile_standup_notes', 'Daily Stand-up Notes (Agile)', 'Master for capturing daily stand-up outcomes during sprint execution.',
      '{"purpose":"Record yesterday / today / impediments for the sprint team.","owner_role":"Scrum Master","review_cadence":"Daily during sprint","sample_notes":"Keep entries short; escalate blockers same day.","introduction":"Daily sync notes supporting the sprint goal.","yesterday":"What was completed since the last sync.","today":"What will be worked on toward the sprint goal.","impediments":"Blockers raised and owners assigned.","board_health":"WIP, blocked cards, and forecast notes.","escalations":"Items needing help outside the team."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE sim.team_performance_assessments SET
      title = 'Daily Stand-up Notes (Agile)',
      description = 'Master for capturing daily stand-up outcomes during sprint execution.',
      document_data = '{"purpose":"Record yesterday / today / impediments for the sprint team.","owner_role":"Scrum Master","review_cadence":"Daily during sprint","sample_notes":"Keep entries short; escalate blockers same day.","introduction":"Daily sync notes supporting the sprint goal.","yesterday":"What was completed since the last sync.","today":"What will be worked on toward the sprint goal.","impediments":"Blockers raised and owners assigned.","board_health":"WIP, blocked cards, and forecast notes.","escalations":"Items needing help outside the team."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Impediment Log (Agile) → sim.variance_analysis_reports
  SELECT id INTO v_id FROM sim.variance_analysis_reports
  WHERE reference_code = 'SEED787-seed_pt_agile_impediment_log' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO sim.variance_analysis_reports (
      id, reference_code, title, description, document_data,
      status, is_master, practice_project_id, created_by, is_deleted
    ) VALUES (
      '25ddb9e7-bf4d-448d-8c12-33bb1e535fa2'::uuid, 'SEED787-seed_pt_agile_impediment_log', 'Impediment Log (Agile)', 'Master impediment register used during sprint execution.',
      '{"purpose":"Track impediments, owners, and resolution dates.","owner_role":"Scrum Master","review_cadence":"Daily stand-up","sample_notes":"Close impediments with evidence of removal.","introduction":"Living log of blockers affecting sprint delivery.","identification":"How impediments are raised and classified.","ownership":"Who owns removal and escalation paths.","tracking":"Status values and target dates.","resolution":"Evidence required before closing.","reporting":"How impediments are summarised to stakeholders."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE sim.variance_analysis_reports SET
      title = 'Impediment Log (Agile)',
      description = 'Master impediment register used during sprint execution.',
      document_data = '{"purpose":"Track impediments, owners, and resolution dates.","owner_role":"Scrum Master","review_cadence":"Daily stand-up","sample_notes":"Close impediments with evidence of removal.","introduction":"Living log of blockers affecting sprint delivery.","identification":"How impediments are raised and classified.","ownership":"Who owns removal and escalation paths.","tracking":"Status values and target dates.","resolution":"Evidence required before closing.","reporting":"How impediments are summarised to stakeholders."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;


  -- Product Backlog Refinement Notes (Agile) → sim.requirements_documentation
  SELECT id INTO v_id FROM sim.requirements_documentation
  WHERE reference_code = 'SEED787-seed_pt_agile_backlog_refinement' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO sim.requirements_documentation (
      id, reference_code, title, description, document_data,
      status, is_master, practice_project_id, created_by, is_deleted
    ) VALUES (
      'f1626d52-cd8f-421d-8f33-4e1453ff57d9'::uuid, 'SEED787-seed_pt_agile_backlog_refinement', 'Product Backlog Refinement Notes (Agile)', 'Master for backlog refinement sessions.',
      '{"purpose":"Capture refined stories, estimates, and readiness decisions.","owner_role":"Product Owner / Team","review_cadence":"Each refinement session","sample_notes":"Exit with clear ready / not-ready decisions.","introduction":"Session notes for backlog refinement.","preparation":"What Product Owner prepares before the session.","activities":"Splitting, clarifying, and estimating activities.","readiness":"How Definition of Ready is applied.","outputs":"Updated items, estimates, and open questions.","follow_up":"Actions after the session."}'::jsonb, 'active', TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE sim.requirements_documentation SET
      title = 'Product Backlog Refinement Notes (Agile)',
      description = 'Master for backlog refinement sessions.',
      document_data = '{"purpose":"Capture refined stories, estimates, and readiness decisions.","owner_role":"Product Owner / Team","review_cadence":"Each refinement session","sample_notes":"Exit with clear ready / not-ready decisions.","introduction":"Session notes for backlog refinement.","preparation":"What Product Owner prepares before the session.","activities":"Splitting, clarifying, and estimating activities.","readiness":"How Definition of Ready is applied.","outputs":"Updated items, estimates, and open questions.","follow_up":"Actions after the session."}'::jsonb,
      status = 'active',
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;

  END IF;

  RAISE NOTICE 'v787_structured_agile_process_template_seeds.sql applied (% masters)', 12;
END $$;
