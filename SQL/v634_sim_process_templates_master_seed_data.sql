-- =============================================================================
-- v634_sim_process_templates_master_seed_data.sql
-- Simulator (sim schema) parity — master templates for all 24 v629 process template tables.
-- Prerequisites: v629_process_templates_new_tables.sql, v632_process_templates_nullable_project_for_masters.sql
-- Idempotent: reference_code LIKE 'SEED634-%'
-- =============================================================================

DO $$
DECLARE
  v_created_by   UUID;
  v_qcl_id       UUID;
  v_pcl_id       UUID;
BEGIN
  SELECT pp.user_id INTO v_created_by
  FROM sim.practice_projects pp
  INNER JOIN auth.users au ON au.id = pp.user_id
  WHERE pp.user_id IS NOT NULL
  ORDER BY pp.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_created_by IS NULL THEN
    SELECT u.auth_user_id INTO v_created_by
    FROM public.users u
    INNER JOIN auth.users au ON au.id = u.auth_user_id
    WHERE COALESCE(u.is_deleted, FALSE) = FALSE
    ORDER BY u.created_at ASC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_created_by IS NULL THEN
    SELECT au.id INTO v_created_by
    FROM auth.users au
    ORDER BY au.created_at ASC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_created_by IS NULL THEN
    RAISE NOTICE 'v634: No valid auth.users row — skip sim process template master seed.';
    RETURN;
  END IF;

  DELETE FROM sim.quality_checklist_items
  WHERE checklist_id IN (SELECT id FROM sim.quality_checklists WHERE reference_code LIKE 'SEED634-%');

  DELETE FROM sim.project_closure_checklist_items
  WHERE checklist_id IN (SELECT id FROM sim.project_closure_checklists WHERE reference_code LIKE 'SEED634-%');

  DELETE FROM sim.project_charters WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.assumption_logs WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.project_management_plans WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.requirements_management_plans WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.requirements_documentation WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.wbs_dictionary_entries WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.activity_attributes WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.activity_resource_requirements WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.resource_breakdown_structure WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.activity_duration_estimates WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.cost_management_plans WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.activity_cost_estimates WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.cost_baselines WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.resource_management_plans WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.procurement_management_plans WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.stakeholder_engagement_plans WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.quality_checklists WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.team_performance_assessments WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.make_or_buy_decisions WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.variance_analysis_reports WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.evm_status_reports WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.scope_acceptance_forms WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.project_closure_checklists WHERE reference_code LIKE 'SEED634-%';
  DELETE FROM sim.contract_closure_documents WHERE reference_code LIKE 'SEED634-%';

  INSERT INTO sim.project_charters (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by
  ) VALUES (
    'SEED634-PCH-001', 'Project Charter Master Template',
    'Standard PMBOK project charter for authorising a new project or phase.',
    '{"seed_marker":"SEED634","template_slug":"project-charter","pmbok_group":"initiating","sections":["Purpose","High-Level Requirements","Project Objectives","Success Criteria","High-Level Risks","Summary Milestone Schedule","Summary Budget","Project Approval Requirements"],"notes":"PMO master template scaffold for Project Charter Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO sim.assumption_logs (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by
  ) VALUES (
    'SEED634-ASM-001', 'Assumption Log Master Template',
    'Register assumptions, constraints, and their impact throughout the project lifecycle.',
    '{"seed_marker":"SEED634","template_slug":"assumption-log","pmbok_group":"initiating","sections":["Assumption ID","Description","Category","Impact if Invalid","Owner","Status","Review Date"],"notes":"PMO master template scaffold for Assumption Log Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO sim.project_management_plans (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by
  ) VALUES (
    'SEED634-PMP-001', 'Project Management Plan Master Template',
    'Integrates subsidiary management plans and baselines for the project.',
    '{"seed_marker":"SEED634","template_slug":"project-management-plan","pmbok_group":"planning","sections":["Introduction","Subordinate Plans","Baselines","Configuration Management","Change Control","Performance Measurement"],"notes":"PMO master template scaffold for Project Management Plan Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO sim.requirements_management_plans (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by
  ) VALUES (
    'SEED634-RMP-001', 'Requirements Management Plan Master Template',
    'Defines how requirements will be analysed, documented, and managed.',
    '{"seed_marker":"SEED634","template_slug":"requirements-management-plan","pmbok_group":"planning","sections":["Scope","Roles","Traceability Approach","Workflow","Configuration","Metrics"],"notes":"PMO master template scaffold for Requirements Management Plan Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO sim.requirements_documentation (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by
  ) VALUES (
    'SEED634-RDOC-001', 'Requirements Documentation Master Template',
    'Structured capture of business, stakeholder, solution, and transition requirements.',
    '{"seed_marker":"SEED634","template_slug":"requirements-documentation","pmbok_group":"planning","sections":["Business Requirements","Stakeholder Requirements","Solution Requirements","Functional Requirements","Non-Functional Requirements","Transition Requirements"],"notes":"PMO master template scaffold for Requirements Documentation Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO sim.wbs_dictionary_entries (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by, wbs_node_id
  ) VALUES (
    'SEED634-WBS-D-001', 'WBS Dictionary Master Template',
    'Template for describing WBS elements including work, deliverables, and acceptance criteria.',
    '{"seed_marker":"SEED634","template_slug":"wbs-dictionary","pmbok_group":"planning","sections":["WBS Code","Description","Assumptions","Constraints","Responsible Organisation","Milestones","Deliverables","Acceptance Criteria"],"notes":"PMO master template scaffold for WBS Dictionary Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by, NULL
  );

  INSERT INTO sim.activity_attributes (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by, activity_id
  ) VALUES (
    'SEED634-AA-001', 'Activity Attributes Master Template',
    'Standard attributes to document for schedule activities.',
    '{"seed_marker":"SEED634","template_slug":"activity-attributes","pmbok_group":"planning","sections":["Activity ID","Activity Name","Activity Type","Predecessors","Successors","Logical Relationships","Leads and Lags","Resource Requirements"],"notes":"PMO master template scaffold for Activity Attributes Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by, NULL
  );

  INSERT INTO sim.activity_resource_requirements (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by, activity_id
  ) VALUES (
    'SEED634-ARR-001', 'Activity Resource Requirements Master Template',
    'Documents types and quantities of resources required for activities.',
    '{"seed_marker":"SEED634","template_slug":"activity-resource-requirements","pmbok_group":"planning","sections":["Activity Reference","Resource Type","Skill Level","Quantity","Location","Duration","Notes"],"notes":"PMO master template scaffold for Activity Resource Requirements Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by, NULL
  );

  INSERT INTO sim.resource_breakdown_structure (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by
  ) VALUES (
    'SEED634-RBS-001', 'Resource Breakdown Structure Master Template',
    'Hierarchical representation of project resources by category.',
    '{"seed_marker":"SEED634","template_slug":"resource-breakdown-structure","pmbok_group":"planning","sections":["RBS Code","Resource Category","Description","Organisational Unit","Availability","Cost Rate"],"notes":"PMO master template scaffold for Resource Breakdown Structure Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO sim.activity_duration_estimates (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by, activity_id
  ) VALUES (
    'SEED634-ADE-001', 'Activity Duration Estimates Master Template',
    'Template for documenting duration estimates and supporting rationale.',
    '{"seed_marker":"SEED634","template_slug":"activity-duration-estimates","pmbok_group":"planning","sections":["Activity Reference","Estimate Type","Optimistic","Most Likely","Pessimistic","Expected Duration","Assumptions","Constraints"],"notes":"PMO master template scaffold for Activity Duration Estimates Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by, NULL
  );

  INSERT INTO sim.cost_management_plans (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by
  ) VALUES (
    'SEED634-CMP-001', 'Cost Management Plan Master Template',
    'Defines how project costs will be planned, structured, and controlled.',
    '{"seed_marker":"SEED634","template_slug":"cost-management-plan","pmbok_group":"planning","sections":["Units of Measure","Precision","Organisational Procedures","Reporting","Variance Thresholds","Performance Measurement"],"notes":"PMO master template scaffold for Cost Management Plan Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO sim.activity_cost_estimates (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by, activity_id
  ) VALUES (
    'SEED634-ACE-001', 'Activity Cost Estimates Master Template',
    'Template for quantifying cost of scheduled activities.',
    '{"seed_marker":"SEED634","template_slug":"activity-cost-estimates","pmbok_group":"planning","sections":["Activity Reference","Resource Costs","Material Costs","Other Direct Costs","Contingency","Total Estimate","Basis of Estimate"],"notes":"PMO master template scaffold for Activity Cost Estimates Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by, NULL
  );

  INSERT INTO sim.cost_baselines (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by
  ) VALUES (
    'SEED634-CBL-001', 'Cost Baseline Master Template',
    'Approved time-phased budget used as basis for comparison.',
    '{"seed_marker":"SEED634","template_slug":"cost-baseline","pmbok_group":"planning","sections":["Baseline Version","Funding Requirements","Control Accounts","Work Package Budgets","Management Reserve","Approval Record"],"notes":"PMO master template scaffold for Cost Baseline Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO sim.resource_management_plans (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by
  ) VALUES (
    'SEED634-RMP2-001', 'Resource Management Plan Master Template',
    'Defines how physical and team resources will be estimated, acquired, and managed.',
    '{"seed_marker":"SEED634","template_slug":"resource-management-plan","pmbok_group":"planning","sections":["Identification","Acquisition","Roles and Responsibilities","Training","Release Criteria","Performance Control"],"notes":"PMO master template scaffold for Resource Management Plan Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO sim.procurement_management_plans (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by
  ) VALUES (
    'SEED634-PRCMP-001', 'Procurement Management Plan Master Template',
    'Documents procurement decisions, approach, and contract types.',
    '{"seed_marker":"SEED634","template_slug":"procurement-management-plan","pmbok_group":"planning","sections":["Make-or-Buy Decisions","Contract Types","Procurement Documents","Source Selection","Contract Change Control","Performance Monitoring"],"notes":"PMO master template scaffold for Procurement Management Plan Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO sim.stakeholder_engagement_plans (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by
  ) VALUES (
    'SEED634-SEP-001', 'Stakeholder Engagement Plan Master Template',
    'Strategy for engaging stakeholders throughout the project.',
    '{"seed_marker":"SEED634","template_slug":"stakeholder-engagement-plan","pmbok_group":"planning","sections":["Stakeholder Register Reference","Engagement Levels","Engagement Actions","Communication Requirements","Monitoring Approach"],"notes":"PMO master template scaffold for Stakeholder Engagement Plan Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO sim.quality_checklists (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by
  ) VALUES (
    'SEED634-QCL-001', 'Quality Checklist Master Template',
    'Standard quality verification checklist for deliverables and work packages.',
    '{"seed_marker":"SEED634","template_slug":"quality-checklists","pmbok_group":"executing","sections":["Deliverable Reference","Quality Standards","Inspection Steps","Acceptance Criteria","Sign-off"],"notes":"PMO master template scaffold for Quality Checklist Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  ) RETURNING id INTO v_qcl_id;
  INSERT INTO sim.quality_checklist_items (checklist_id, item_order, item_text) VALUES (v_qcl_id, 1, 'Deliverable meets documented acceptance criteria');
  INSERT INTO sim.quality_checklist_items (checklist_id, item_order, item_text) VALUES (v_qcl_id, 2, 'Quality standards and metrics verified');
  INSERT INTO sim.quality_checklist_items (checklist_id, item_order, item_text) VALUES (v_qcl_id, 3, 'Inspection or review completed');
  INSERT INTO sim.quality_checklist_items (checklist_id, item_order, item_text) VALUES (v_qcl_id, 4, 'Non-conformances identified and resolved');
  INSERT INTO sim.quality_checklist_items (checklist_id, item_order, item_text) VALUES (v_qcl_id, 5, 'Required approvals and sign-off obtained');

  INSERT INTO sim.team_performance_assessments (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by
  ) VALUES (
    'SEED634-TPA-001', 'Team Performance Assessment Master Template',
    'Template for evaluating team performance against project objectives.',
    '{"seed_marker":"SEED634","template_slug":"team-performance-assessment","pmbok_group":"executing","sections":["Assessment Period","Team Objectives","Performance Indicators","Observations","Improvement Actions","Acknowledgement"],"notes":"PMO master template scaffold for Team Performance Assessment Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO sim.make_or_buy_decisions (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by
  ) VALUES (
    'SEED634-MOB-001', 'Make-or-Buy Decision Log Master Template',
    'Records make-or-buy analysis and decisions for project deliverables.',
    '{"seed_marker":"SEED634","template_slug":"make-or-buy-decision","pmbok_group":"executing","sections":["Item or Deliverable","Make Option Analysis","Buy Option Analysis","Decision","Rationale","Decision Date","Approver"],"notes":"PMO master template scaffold for Make-or-Buy Decision Log Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO sim.variance_analysis_reports (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by
  ) VALUES (
    'SEED634-VAR-001', 'Variance Analysis Report Master Template',
    'Template for reporting schedule, cost, and scope variances.',
    '{"seed_marker":"SEED634","template_slug":"variance-analysis-report","pmbok_group":"monitoring-controlling","sections":["Reporting Period","Baseline Reference","Schedule Variance","Cost Variance","Scope Variance","Root Causes","Corrective Actions"],"notes":"PMO master template scaffold for Variance Analysis Report Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO sim.evm_status_reports (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by
  ) VALUES (
    'SEED634-EVM-001', 'Earned Value Status Report Master Template',
    'Standard EVM performance report (PV, EV, AC, CPI, SPI, EAC, ETC).',
    '{"seed_marker":"SEED634","template_slug":"evm-status-report","pmbok_group":"monitoring-controlling","sections":["Control Account","Planned Value (PV)","Earned Value (EV)","Actual Cost (AC)","CPI / SPI","EAC / ETC","Variance Narrative"],"notes":"PMO master template scaffold for Earned Value Status Report Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO sim.scope_acceptance_forms (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by
  ) VALUES (
    'SEED634-SAF-001', 'Scope Validation / Deliverable Acceptance Master Template',
    'Formal acceptance of completed deliverables against scope baseline.',
    '{"seed_marker":"SEED634","template_slug":"scope-acceptance-form","pmbok_group":"monitoring-controlling","sections":["Deliverable ID","Description","Acceptance Criteria","Verification Method","Acceptance Decision","Accepted By","Acceptance Date"],"notes":"PMO master template scaffold for Scope Validation / Deliverable Acceptance Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  INSERT INTO sim.project_closure_checklists (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by
  ) VALUES (
    'SEED634-PCL-001', 'Project Closure Checklist Master Template',
    'Checklist for completing all closing activities before formal project closure.',
    '{"seed_marker":"SEED634","template_slug":"project-closure-checklist","pmbok_group":"closing","sections":["Deliverable Acceptance","Financial Closure","Procurement Closure","Lessons Learned","Resource Release","Archive"],"notes":"PMO master template scaffold for Project Closure Checklist Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  ) RETURNING id INTO v_pcl_id;
  INSERT INTO sim.project_closure_checklist_items (checklist_id, item_order, item_text) VALUES (v_pcl_id, 1, 'All deliverables formally accepted');
  INSERT INTO sim.project_closure_checklist_items (checklist_id, item_order, item_text) VALUES (v_pcl_id, 2, 'Final invoices and payments processed');
  INSERT INTO sim.project_closure_checklist_items (checklist_id, item_order, item_text) VALUES (v_pcl_id, 3, 'Contracts and procurements closed');
  INSERT INTO sim.project_closure_checklist_items (checklist_id, item_order, item_text) VALUES (v_pcl_id, 4, 'Lessons learned captured and shared');
  INSERT INTO sim.project_closure_checklist_items (checklist_id, item_order, item_text) VALUES (v_pcl_id, 5, 'Project resources released');
  INSERT INTO sim.project_closure_checklist_items (checklist_id, item_order, item_text) VALUES (v_pcl_id, 6, 'Project records archived');
  INSERT INTO sim.project_closure_checklist_items (checklist_id, item_order, item_text) VALUES (v_pcl_id, 7, 'Formal closure approval obtained');

  INSERT INTO sim.contract_closure_documents (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by
  ) VALUES (
    'SEED634-CCD-001', 'Contract Closure Document Master Template',
    'Documents completion of contractual obligations and final settlement.',
    '{"seed_marker":"SEED634","template_slug":"contract-closure-document","pmbok_group":"closing","sections":["Contract Reference","Vendor / Supplier","Deliverables Status","Final Payments","Open Issues","Release of Claims","Closure Approval"],"notes":"PMO master template scaffold for Contract Closure Document Master Template. Copy to a project workspace and customise."}'::jsonb,
    'active', TRUE, NULL, v_created_by
  );

  RAISE NOTICE 'v634: Seeded % sim process template masters.', 24;
END $$;
