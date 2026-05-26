-- =============================================================================
-- v633_process_templates_master_seed_data.sql
-- PMO organisation master templates for all 24 v629 process template tables.
-- Prerequisites: v629_process_templates_new_tables.sql, v632_process_templates_nullable_project_for_masters.sql
-- Idempotent: reference_code LIKE 'SEED633-%' — deleted and re-inserted on each run.
-- PostgreSQL 15+ / Supabase public schema
-- =============================================================================

DO $$
DECLARE
  v_account_id   UUID;
  v_created_by   UUID;
  v_qcl_id       UUID;
  v_pcl_id       UUID;
BEGIN
  SELECT a.id INTO v_account_id
  FROM public.accounts a
  WHERE COALESCE(a.is_deleted, FALSE) = FALSE
  ORDER BY a.created_at ASC NULLS LAST
  LIMIT 1;

  SELECT u.auth_user_id INTO v_created_by
  FROM public.users u
  INNER JOIN auth.users au ON au.id = u.auth_user_id
  WHERE COALESCE(u.is_deleted, FALSE) = FALSE
  ORDER BY u.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_created_by IS NULL THEN
    SELECT au.id INTO v_created_by
    FROM auth.users au
    ORDER BY au.created_at ASC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_account_id IS NULL OR v_created_by IS NULL THEN
    RAISE NOTICE 'v633: No account or valid auth.users row — skip process template master seed.';
    RETURN;
  END IF;

  -- Remove prior seed rows (child items first)
  DELETE FROM public.quality_checklist_items
  WHERE checklist_id IN (SELECT id FROM public.quality_checklists WHERE reference_code LIKE 'SEED633-%');

  DELETE FROM public.project_closure_checklist_items
  WHERE checklist_id IN (SELECT id FROM public.project_closure_checklists WHERE reference_code LIKE 'SEED633-%');

  DELETE FROM public.project_charters WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.assumption_logs WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.project_management_plans WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.requirements_management_plans WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.requirements_documentation WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.wbs_dictionary_entries WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.activity_attributes WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.activity_resource_requirements WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.resource_breakdown_structure WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.activity_duration_estimates WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.cost_management_plans WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.activity_cost_estimates WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.cost_baselines WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.resource_management_plans WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.procurement_management_plans WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.stakeholder_engagement_plans WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.quality_checklists WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.team_performance_assessments WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.make_or_buy_decisions WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.variance_analysis_reports WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.evm_status_reports WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.scope_acceptance_forms WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.project_closure_checklists WHERE reference_code LIKE 'SEED633-%';
  DELETE FROM public.contract_closure_documents WHERE reference_code LIKE 'SEED633-%';

  INSERT INTO public.project_charters (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by
  ) VALUES (
    v_account_id, 'SEED633-PCH-001', 'Project Charter Master Template',
    'Standard PMBOK project charter for authorising a new project or phase.',
    '{"seed_marker":"SEED633","template_slug":"project-charter","pmbok_group":"initiating","sections":["Purpose","High-Level Requirements","Project Objectives","Success Criteria","High-Level Risks","Summary Milestone Schedule","Summary Budget","Project Approval Requirements"],"notes":"PMO master template scaffold for Project Charter Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO public.assumption_logs (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by
  ) VALUES (
    v_account_id, 'SEED633-ASM-001', 'Assumption Log Master Template',
    'Register assumptions, constraints, and their impact throughout the project lifecycle.',
    '{"seed_marker":"SEED633","template_slug":"assumption-log","pmbok_group":"initiating","sections":["Assumption ID","Description","Category","Impact if Invalid","Owner","Status","Review Date"],"notes":"PMO master template scaffold for Assumption Log Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO public.project_management_plans (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by
  ) VALUES (
    v_account_id, 'SEED633-PMP-001', 'Project Management Plan Master Template',
    'Integrates subsidiary management plans and baselines for the project.',
    '{"seed_marker":"SEED633","template_slug":"project-management-plan","pmbok_group":"planning","sections":["Introduction","Subordinate Plans","Baselines","Configuration Management","Change Control","Performance Measurement"],"notes":"PMO master template scaffold for Project Management Plan Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO public.requirements_management_plans (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by
  ) VALUES (
    v_account_id, 'SEED633-RMP-001', 'Requirements Management Plan Master Template',
    'Defines how requirements will be analysed, documented, and managed.',
    '{"seed_marker":"SEED633","template_slug":"requirements-management-plan","pmbok_group":"planning","sections":["Scope","Roles","Traceability Approach","Workflow","Configuration","Metrics"],"notes":"PMO master template scaffold for Requirements Management Plan Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO public.requirements_documentation (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by
  ) VALUES (
    v_account_id, 'SEED633-RDOC-001', 'Requirements Documentation Master Template',
    'Structured capture of business, stakeholder, solution, and transition requirements.',
    '{"seed_marker":"SEED633","template_slug":"requirements-documentation","pmbok_group":"planning","sections":["Business Requirements","Stakeholder Requirements","Solution Requirements","Functional Requirements","Non-Functional Requirements","Transition Requirements"],"notes":"PMO master template scaffold for Requirements Documentation Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO public.wbs_dictionary_entries (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by, wbs_node_id
  ) VALUES (
    v_account_id, 'SEED633-WBS-D-001', 'WBS Dictionary Master Template',
    'Template for describing WBS elements including work, deliverables, and acceptance criteria.',
    '{"seed_marker":"SEED633","template_slug":"wbs-dictionary","pmbok_group":"planning","sections":["WBS Code","Description","Assumptions","Constraints","Responsible Organisation","Milestones","Deliverables","Acceptance Criteria"],"notes":"PMO master template scaffold for WBS Dictionary Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by, NULL
  );

  INSERT INTO public.activity_attributes (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by, activity_id
  ) VALUES (
    v_account_id, 'SEED633-AA-001', 'Activity Attributes Master Template',
    'Standard attributes to document for schedule activities.',
    '{"seed_marker":"SEED633","template_slug":"activity-attributes","pmbok_group":"planning","sections":["Activity ID","Activity Name","Activity Type","Predecessors","Successors","Logical Relationships","Leads and Lags","Resource Requirements"],"notes":"PMO master template scaffold for Activity Attributes Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by, NULL
  );

  INSERT INTO public.activity_resource_requirements (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by, activity_id
  ) VALUES (
    v_account_id, 'SEED633-ARR-001', 'Activity Resource Requirements Master Template',
    'Documents types and quantities of resources required for activities.',
    '{"seed_marker":"SEED633","template_slug":"activity-resource-requirements","pmbok_group":"planning","sections":["Activity Reference","Resource Type","Skill Level","Quantity","Location","Duration","Notes"],"notes":"PMO master template scaffold for Activity Resource Requirements Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by, NULL
  );

  INSERT INTO public.resource_breakdown_structure (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by
  ) VALUES (
    v_account_id, 'SEED633-RBS-001', 'Resource Breakdown Structure Master Template',
    'Hierarchical representation of project resources by category.',
    '{"seed_marker":"SEED633","template_slug":"resource-breakdown-structure","pmbok_group":"planning","sections":["RBS Code","Resource Category","Description","Organisational Unit","Availability","Cost Rate"],"notes":"PMO master template scaffold for Resource Breakdown Structure Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO public.activity_duration_estimates (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by, activity_id
  ) VALUES (
    v_account_id, 'SEED633-ADE-001', 'Activity Duration Estimates Master Template',
    'Template for documenting duration estimates and supporting rationale.',
    '{"seed_marker":"SEED633","template_slug":"activity-duration-estimates","pmbok_group":"planning","sections":["Activity Reference","Estimate Type","Optimistic","Most Likely","Pessimistic","Expected Duration","Assumptions","Constraints"],"notes":"PMO master template scaffold for Activity Duration Estimates Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by, NULL
  );

  INSERT INTO public.cost_management_plans (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by
  ) VALUES (
    v_account_id, 'SEED633-CMP-001', 'Cost Management Plan Master Template',
    'Defines how project costs will be planned, structured, and controlled.',
    '{"seed_marker":"SEED633","template_slug":"cost-management-plan","pmbok_group":"planning","sections":["Units of Measure","Precision","Organisational Procedures","Reporting","Variance Thresholds","Performance Measurement"],"notes":"PMO master template scaffold for Cost Management Plan Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO public.activity_cost_estimates (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by, activity_id
  ) VALUES (
    v_account_id, 'SEED633-ACE-001', 'Activity Cost Estimates Master Template',
    'Template for quantifying cost of scheduled activities.',
    '{"seed_marker":"SEED633","template_slug":"activity-cost-estimates","pmbok_group":"planning","sections":["Activity Reference","Resource Costs","Material Costs","Other Direct Costs","Contingency","Total Estimate","Basis of Estimate"],"notes":"PMO master template scaffold for Activity Cost Estimates Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by, NULL
  );

  INSERT INTO public.cost_baselines (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by
  ) VALUES (
    v_account_id, 'SEED633-CBL-001', 'Cost Baseline Master Template',
    'Approved time-phased budget used as basis for comparison.',
    '{"seed_marker":"SEED633","template_slug":"cost-baseline","pmbok_group":"planning","sections":["Baseline Version","Funding Requirements","Control Accounts","Work Package Budgets","Management Reserve","Approval Record"],"notes":"PMO master template scaffold for Cost Baseline Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO public.resource_management_plans (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by
  ) VALUES (
    v_account_id, 'SEED633-RMP2-001', 'Resource Management Plan Master Template',
    'Defines how physical and team resources will be estimated, acquired, and managed.',
    '{"seed_marker":"SEED633","template_slug":"resource-management-plan","pmbok_group":"planning","sections":["Identification","Acquisition","Roles and Responsibilities","Training","Release Criteria","Performance Control"],"notes":"PMO master template scaffold for Resource Management Plan Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO public.procurement_management_plans (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by
  ) VALUES (
    v_account_id, 'SEED633-PRCMP-001', 'Procurement Management Plan Master Template',
    'Documents procurement decisions, approach, and contract types.',
    '{"seed_marker":"SEED633","template_slug":"procurement-management-plan","pmbok_group":"planning","sections":["Make-or-Buy Decisions","Contract Types","Procurement Documents","Source Selection","Contract Change Control","Performance Monitoring"],"notes":"PMO master template scaffold for Procurement Management Plan Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO public.stakeholder_engagement_plans (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by
  ) VALUES (
    v_account_id, 'SEED633-SEP-001', 'Stakeholder Engagement Plan Master Template',
    'Strategy for engaging stakeholders throughout the project.',
    '{"seed_marker":"SEED633","template_slug":"stakeholder-engagement-plan","pmbok_group":"planning","sections":["Stakeholder Register Reference","Engagement Levels","Engagement Actions","Communication Requirements","Monitoring Approach"],"notes":"PMO master template scaffold for Stakeholder Engagement Plan Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO public.quality_checklists (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by
  ) VALUES (
    v_account_id, 'SEED633-QCL-001', 'Quality Checklist Master Template',
    'Standard quality verification checklist for deliverables and work packages.',
    '{"seed_marker":"SEED633","template_slug":"quality-checklists","pmbok_group":"executing","sections":["Deliverable Reference","Quality Standards","Inspection Steps","Acceptance Criteria","Sign-off"],"notes":"PMO master template scaffold for Quality Checklist Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  ) RETURNING id INTO v_qcl_id;
  INSERT INTO public.quality_checklist_items (checklist_id, item_order, item_text) VALUES (v_qcl_id, 1, 'Deliverable meets documented acceptance criteria');
  INSERT INTO public.quality_checklist_items (checklist_id, item_order, item_text) VALUES (v_qcl_id, 2, 'Quality standards and metrics verified');
  INSERT INTO public.quality_checklist_items (checklist_id, item_order, item_text) VALUES (v_qcl_id, 3, 'Inspection or review completed');
  INSERT INTO public.quality_checklist_items (checklist_id, item_order, item_text) VALUES (v_qcl_id, 4, 'Non-conformances identified and resolved');
  INSERT INTO public.quality_checklist_items (checklist_id, item_order, item_text) VALUES (v_qcl_id, 5, 'Required approvals and sign-off obtained');

  INSERT INTO public.team_performance_assessments (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by
  ) VALUES (
    v_account_id, 'SEED633-TPA-001', 'Team Performance Assessment Master Template',
    'Template for evaluating team performance against project objectives.',
    '{"seed_marker":"SEED633","template_slug":"team-performance-assessment","pmbok_group":"executing","sections":["Assessment Period","Team Objectives","Performance Indicators","Observations","Improvement Actions","Acknowledgement"],"notes":"PMO master template scaffold for Team Performance Assessment Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO public.make_or_buy_decisions (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by
  ) VALUES (
    v_account_id, 'SEED633-MOB-001', 'Make-or-Buy Decision Log Master Template',
    'Records make-or-buy analysis and decisions for project deliverables.',
    '{"seed_marker":"SEED633","template_slug":"make-or-buy-decision","pmbok_group":"executing","sections":["Item or Deliverable","Make Option Analysis","Buy Option Analysis","Decision","Rationale","Decision Date","Approver"],"notes":"PMO master template scaffold for Make-or-Buy Decision Log Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO public.variance_analysis_reports (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by
  ) VALUES (
    v_account_id, 'SEED633-VAR-001', 'Variance Analysis Report Master Template',
    'Template for reporting schedule, cost, and scope variances.',
    '{"seed_marker":"SEED633","template_slug":"variance-analysis-report","pmbok_group":"monitoring-controlling","sections":["Reporting Period","Baseline Reference","Schedule Variance","Cost Variance","Scope Variance","Root Causes","Corrective Actions"],"notes":"PMO master template scaffold for Variance Analysis Report Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO public.evm_status_reports (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by
  ) VALUES (
    v_account_id, 'SEED633-EVM-001', 'Earned Value Status Report Master Template',
    'Standard EVM performance report (PV, EV, AC, CPI, SPI, EAC, ETC).',
    '{"seed_marker":"SEED633","template_slug":"evm-status-report","pmbok_group":"monitoring-controlling","sections":["Control Account","Planned Value (PV)","Earned Value (EV)","Actual Cost (AC)","CPI / SPI","EAC / ETC","Variance Narrative"],"notes":"PMO master template scaffold for Earned Value Status Report Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO public.scope_acceptance_forms (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by
  ) VALUES (
    v_account_id, 'SEED633-SAF-001', 'Scope Validation / Deliverable Acceptance Master Template',
    'Formal acceptance of completed deliverables against scope baseline.',
    '{"seed_marker":"SEED633","template_slug":"scope-acceptance-form","pmbok_group":"monitoring-controlling","sections":["Deliverable ID","Description","Acceptance Criteria","Verification Method","Acceptance Decision","Accepted By","Acceptance Date"],"notes":"PMO master template scaffold for Scope Validation / Deliverable Acceptance Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO public.project_closure_checklists (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by
  ) VALUES (
    v_account_id, 'SEED633-PCL-001', 'Project Closure Checklist Master Template',
    'Checklist for completing all closing activities before formal project closure.',
    '{"seed_marker":"SEED633","template_slug":"project-closure-checklist","pmbok_group":"closing","sections":["Deliverable Acceptance","Financial Closure","Procurement Closure","Lessons Learned","Resource Release","Archive"],"notes":"PMO master template scaffold for Project Closure Checklist Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  ) RETURNING id INTO v_pcl_id;
  INSERT INTO public.project_closure_checklist_items (checklist_id, item_order, item_text) VALUES (v_pcl_id, 1, 'All deliverables formally accepted');
  INSERT INTO public.project_closure_checklist_items (checklist_id, item_order, item_text) VALUES (v_pcl_id, 2, 'Final invoices and payments processed');
  INSERT INTO public.project_closure_checklist_items (checklist_id, item_order, item_text) VALUES (v_pcl_id, 3, 'Contracts and procurements closed');
  INSERT INTO public.project_closure_checklist_items (checklist_id, item_order, item_text) VALUES (v_pcl_id, 4, 'Lessons learned captured and shared');
  INSERT INTO public.project_closure_checklist_items (checklist_id, item_order, item_text) VALUES (v_pcl_id, 5, 'Project resources released');
  INSERT INTO public.project_closure_checklist_items (checklist_id, item_order, item_text) VALUES (v_pcl_id, 6, 'Project records archived');
  INSERT INTO public.project_closure_checklist_items (checklist_id, item_order, item_text) VALUES (v_pcl_id, 7, 'Formal closure approval obtained');

  INSERT INTO public.contract_closure_documents (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by
  ) VALUES (
    v_account_id, 'SEED633-CCD-001', 'Contract Closure Document Master Template',
    'Documents completion of contractual obligations and final settlement.',
    '{"seed_marker":"SEED633","template_slug":"contract-closure-document","pmbok_group":"closing","sections":["Contract Reference","Vendor / Supplier","Deliverables Status","Final Payments","Open Issues","Release of Claims","Closure Approval"],"notes":"PMO master template scaffold for Contract Closure Document Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  RAISE NOTICE 'v633: Seeded % process template masters.', 24;
END $$;
