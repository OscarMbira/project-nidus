-- ============================================================================
-- v1345 slice 3 wave 3e — project initiation document (PID) field help (Platform PID + Simulator practice PID)
-- ============================================================================
-- Generated from scripts/field-help-content/pid.mjs by scripts/field-help-content/build-sql.mjs (v1345 slice 2).
-- 74 help entries, module_code 'project_pid'. Register keys fall back to the common
-- register:*:<field_key> help when a register has no entry of its own (S2-D1).
-- Examples follow CLAUDE.md rule 77. Drafted by Claude for owner sample review (G-D5).
-- Idempotent: re-running refreshes the text. Prerequisites: v1490.
-- ============================================================================

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.project_initiation_documents.pid_title', 'PID title', 'A clear title for the project initiation document.', '- Dubai Branch Network Refresh – PID', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.pid_description', 'PID description', 'A short summary of what this document covers.', '- How the branch network refresh will be run, controlled and delivered.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.project_background', 'Project background', 'The context of the project: what has led to it and why now.', '- Teller system support ends next year; account opening takes up to 3 days.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.project_justification', 'Project justification', 'Why the project is worth doing, usually summarised from the business case.', '- Saves 400,000 a year for a one-off cost of 1,200,000; pays back in 30 months.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.version_number', 'Version number', 'The version of this PID. Raise it each time the document is reissued.', '- 1.0', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.release', 'Release', 'Which release or issue of the PID this is, if your organisation tracks releases.', '- Baseline for board approval', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.document_ref', 'Document reference', 'The reference used in your document management system, if different.', '- DOC-PMO-0518', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.project_definition', 'Project definition', 'What the project is, in a few sentences: its purpose, size and main products.', '- A 9-month project to replace the teller system in 12 Dubai branches and train branch staff.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.project_scope', 'Project scope', 'What the project will deliver and the work it covers.', '- New account opening system in all Dubai branches, staff training and updated procedures.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.exclusions', 'Exclusions', 'What the project will not deliver, so nobody assumes it will.', '- Card processing; branches outside Dubai.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.dependencies', 'Dependencies', 'Things outside the project that it relies on, in summary. Detailed dependencies go in the dependencies section.', '- Network upgrade by the infrastructure programme.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.success_criteria', 'Success criteria', 'How the project’s success will be judged.', '- All branches live by the end of Q3; account opening under 20 minutes.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.project_outcomes', 'Project outcomes', 'The changes the business will see once the project’s products are in use.', '- Customers open accounts in one visit.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.expected_benefits', 'Expected benefits', 'The measurable improvements the project should bring.', '- 15% lower branch running costs; higher customer satisfaction scores.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.project_approach', 'Project approach', 'How the project will deliver its products, in outline.', '- Configure the group platform, pilot in two branches, then roll out in three waves.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.development_approach', 'Development approach', 'How the solution will be built or configured.', '- Configure the existing group platform; no custom code.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.configuration_management_approach', 'Configuration management approach', 'How versions of products and documents are controlled, so everyone uses the right one.', '- All documents kept in the project library with version numbers; changes logged by Project Support.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.procurement_approach', 'Procurement approach', 'How suppliers and goods will be bought.', '- Use the existing group framework agreement with Example Software Ltd.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.quality_approach', 'Quality approach', 'How quality will be planned, checked and assured.', '- Each product reviewed by a team lead; acceptance testing by branch staff before rollout.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.risk_approach', 'Risk approach', 'How risks will be found, assessed, recorded and managed.', '- Risks reviewed weekly by the team and monthly by the board; high risks escalated within 2 days.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.communication_approach', 'Communication approach', 'How, when and to whom project information will be shared.', '- Monthly newsletter to all branches; fortnightly update to the board.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.change_control_approach', 'Change control approach', 'How requests to change the project are raised, assessed and decided.', '- Changes logged in the change register; the board decides on any change over 10,000.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.control_mechanisms', 'Control mechanisms', 'The ways the project is kept on track: reports, reviews and approvals.', '- Highlight reports every two weeks; stage gate review at the end of each stage.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.monitoring_and_control', 'Monitoring and control', 'How progress, cost and risk are tracked against the plan.', '- Weekly progress review against the schedule; monthly cost review with Finance.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.stage_boundary_reviews', 'Stage boundary reviews', 'When and how the board reviews the project between stages.', '- Board review at the end of design, pilot and each rollout wave.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.timeline_summary', 'Timeline summary', 'The main phases and dates, in a few lines.', '- Design: 2 months; pilot: 2 months; rollout: 5 months.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.project_plan_summary', 'Project plan summary', 'The stages, major products and timing for the whole project.', '- Three stages: design, pilot, rollout. Go-live for all branches by the end of Q3.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.stage_plan_summary', 'Current stage plan summary', 'What the current stage delivers and when.', '- Design stage: process maps and system configuration signed off by week 8.', NULL, NULL, 'project_pid'),
  ('public.project_initiation_documents.budget_summary', 'Budget summary', 'The project budget in outline, including contingency.', '- 1,200,000 including 150,000 contingency.', 'Amounts show in {currency}.', NULL, 'project_pid'),
  ('public.pid_objectives.objective_title', 'Objective title', 'A short name for the objective.', '- Same-day account opening', NULL, NULL, 'project_pid'),
  ('public.pid_objectives.objective_description', 'Objective description', 'What the objective is, stated so it can be checked.', '- All 12 Dubai branches open accounts within one visit by the end of Q3.', NULL, NULL, 'project_pid'),
  ('public.pid_objectives.objective_category', 'Category', 'The kind of objective.', '- Business', NULL, NULL, 'project_pid'),
  ('public.pid_objectives.priority', 'Priority', 'How essential the objective is: must, should, could or won’t have this time.', '- Must Have', NULL, NULL, 'project_pid'),
  ('public.pid_objectives.success_criteria', 'Success criteria', 'How you will know the objective has been met.', '- 9 out of 10 accounts opened in under 20 minutes.', NULL, NULL, 'project_pid'),
  ('public.pid_objectives.measurement_method', 'Measurement method', 'How the result will be measured.', '- Account opening times from the branch system report.', NULL, NULL, 'project_pid'),
  ('public.pid_objectives.target_value', 'Target value', 'The level to reach, with its unit.', '- 20 minutes', NULL, NULL, 'project_pid'),
  ('public.pid_dependencies.dependency_type', 'Type', 'The kind of dependency.', '- Technical', NULL, NULL, 'project_pid'),
  ('public.pid_dependencies.dependency_status', 'Status', 'Whether the dependency is in place, pending, at risk or not met.', '- At risk', NULL, NULL, 'project_pid'),
  ('public.pid_dependencies.dependency_name', 'Name', 'A short name for the dependency.', '- Branch network upgrade', NULL, NULL, 'project_pid'),
  ('public.pid_dependencies.dependency_description', 'Description', 'What the project depends on, and why.', '- Branches need faster network links before the new system can run.', NULL, NULL, 'project_pid'),
  ('public.pid_dependencies.dependency_owner', 'Owner', 'Who is responsible for delivering the dependency.', '- Infrastructure Programme Manager', NULL, NULL, 'project_pid'),
  ('public.pid_dependencies.expected_date', 'Expected date', 'When the dependency is expected to be in place.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'project_pid'),
  ('public.pid_dependencies.dependency_impact', 'Impact', 'What happens to the project if the dependency is late or not met.', '- Rollout to the remaining branches is delayed.', NULL, NULL, 'project_pid'),
  ('public.pid_dependencies.mitigation_plan', 'Mitigation', 'What will be done to reduce that impact.', '- Pilot in the two branches already upgraded.', NULL, NULL, 'project_pid'),
  ('public.pid_reporting_arrangements.report_type', 'Report type', 'Which project report this arrangement is for.', '- Highlight report', NULL, NULL, 'project_pid'),
  ('public.pid_reporting_arrangements.report_format', 'Format', 'How the report is given.', '- Written', NULL, NULL, 'project_pid'),
  ('public.pid_reporting_arrangements.report_frequency', 'Frequency', 'How often the report is produced.', '- Every two weeks', NULL, NULL, 'project_pid'),
  ('public.pid_reporting_arrangements.report_owner', 'Report owner', 'Who prepares the report.', '- Project Manager', NULL, NULL, 'project_pid'),
  ('public.pid_reporting_arrangements.report_recipients', 'Recipients', 'Who receives the report.', E'- Project board\n- Head of Retail Banking', NULL, NULL, 'project_pid'),
  ('public.pid_reporting_arrangements.report_template', 'Template', 'The template the report follows.', '- PMO highlight report template v3', NULL, NULL, 'project_pid'),
  ('public.pid_reporting_arrangements.report_description', 'Description', 'What the report covers.', '- Progress this period, next steps, issues and risks needing board attention.', NULL, NULL, 'project_pid'),
  ('public.pid_team_structure.role_name', 'Role name', 'The name of the role in the project team.', '- Branch Change Lead', NULL, NULL, 'project_pid'),
  ('public.pid_team_structure.role_type', 'Role type', 'Where the role sits in the project organisation.', '- Team Management', NULL, NULL, 'project_pid'),
  ('public.pid_team_structure.role_description', 'Role description', 'What the role is for.', '- Leads branch staff training and process changes.', NULL, NULL, 'project_pid'),
  ('public.pid_team_structure.assigned_user_id', 'Assign to user', 'The person in the system who fills the role, if decided.', '- Branch Operations Manager', NULL, NULL, 'project_pid'),
  ('public.pid_team_structure.assigned_user_name', 'User name (if external)', 'The name of someone outside the system who fills the role.', '- Consultant, Example Consulting Ltd', NULL, NULL, 'project_pid'),
  ('public.pid_team_structure.responsibilities', 'Responsibilities', 'What the role is responsible for.', '- Plan training; sign off branch readiness.', NULL, NULL, 'project_pid'),
  ('public.pid_team_structure.authority_level', 'Authority level', 'What the role may decide or approve without escalating.', '- Can approve branch process changes up to 10,000', NULL, NULL, 'project_pid'),
  ('public.pid_interfaces.interface_name', 'Interface name', 'A short name for the interface.', '- Identity verification service', NULL, NULL, 'project_pid'),
  ('public.pid_interfaces.interface_type', 'Interface type', 'Who or what the interface is with.', '- Supplier', NULL, NULL, 'project_pid'),
  ('public.pid_interfaces.external_entity', 'External entity', 'The organisation, team or system on the other side.', '- Example Identity Services Ltd', NULL, NULL, 'project_pid'),
  ('public.pid_interfaces.description', 'Description', 'What passes across the interface and why it matters.', '- Checks customer identity documents during account opening.', NULL, NULL, 'project_pid'),
  ('public.pid_tolerances.tolerance_type', 'Tolerance type', 'What the tolerance limits: time, cost, quality, scope, risk or benefits.', '- Cost', NULL, NULL, 'project_pid'),
  ('public.pid_tolerances.baseline_value', 'Baseline value', 'The planned value the tolerance is measured from.', '- 1,200,000', NULL, NULL, 'project_pid'),
  ('public.pid_tolerances.upper_tolerance', 'Upper tolerance (+)', 'How far above the baseline is allowed before escalation.', '- 5%', NULL, NULL, 'project_pid'),
  ('public.pid_tolerances.lower_tolerance', 'Lower tolerance (−)', 'How far below the baseline is allowed before escalation.', '- 10%', NULL, NULL, 'project_pid'),
  ('public.pid_tolerances.description', 'Description', 'The tolerance in plain words.', '- The project may spend up to 5% over budget without board approval.', NULL, NULL, 'project_pid'),
  ('sim.practice_project_initiation_documents.tolerance_time', 'Time tolerance', 'How much the schedule may slip before escalation.', '- 2 weeks', NULL, NULL, 'project_pid'),
  ('sim.practice_project_initiation_documents.tolerance_cost', 'Cost tolerance', 'How far over budget the project may go before escalation.', '- 10%', NULL, NULL, 'project_pid'),
  ('sim.practice_project_initiation_documents.tolerance_scope', 'Scope tolerance', 'How much the scope may change without escalation.', '- The training pack may be simplified', NULL, NULL, 'project_pid'),
  ('sim.practice_project_initiation_documents.tolerance_quality', 'Quality tolerance', 'The quality limits the project must stay within.', '- 95% of records complete', NULL, NULL, 'project_pid'),
  ('sim.practice_project_initiation_documents.reporting_arrangements', 'Reporting arrangements', 'Which reports are produced, how often and for whom.', '- Highlight report to the board every two weeks; end-stage report at each stage end.', NULL, NULL, 'project_pid'),
  ('sim.practice_project_initiation_documents.interfaces', 'Interfaces', 'Other projects, systems or teams this project must work with.', E'- Core banking system\n- Identity verification service', NULL, NULL, 'project_pid'),
  ('sim.practice_project_initiation_documents.project_objectives', 'Objectives', 'What the project must achieve, each stated so it can be checked.', '- All branches open accounts same day by the end of Q3', NULL, NULL, 'project_pid')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title,
  purpose = EXCLUDED.purpose,
  examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes,
  extra_notes = EXCLUDED.extra_notes,
  module_code = EXCLUDED.module_code,
  is_active = TRUE;

-- Simulator keys read the Platform help (PRD G-D3).
INSERT INTO public.field_help_aliases (alias_key, help_key)
VALUES
  ('sim.practice_project_initiation_documents.pid_title', 'public.project_initiation_documents.pid_title'),
  ('sim.practice_project_initiation_documents.pid_description', 'public.project_initiation_documents.pid_description'),
  ('sim.practice_project_initiation_documents.project_definition', 'public.project_initiation_documents.project_definition'),
  ('sim.practice_project_initiation_documents.project_scope', 'public.project_initiation_documents.project_scope'),
  ('sim.practice_project_initiation_documents.exclusions', 'public.project_initiation_documents.exclusions'),
  ('sim.practice_project_initiation_documents.project_approach', 'public.project_initiation_documents.project_approach'),
  ('sim.practice_project_initiation_documents.quality_approach', 'public.project_initiation_documents.quality_approach'),
  ('sim.practice_project_initiation_documents.risk_approach', 'public.project_initiation_documents.risk_approach'),
  ('sim.practice_project_initiation_documents.change_control_approach', 'public.project_initiation_documents.change_control_approach'),
  ('sim.practice_project_initiation_documents.communication_approach', 'public.project_initiation_documents.communication_approach'),
  ('sim.practice_project_initiation_documents.monitoring_and_control', 'public.project_initiation_documents.monitoring_and_control'),
  ('sim.practice_project_initiation_documents.project_plan_summary', 'public.project_initiation_documents.project_plan_summary'),
  ('sim.practice_project_initiation_documents.stage_plan_summary', 'public.project_initiation_documents.stage_plan_summary')
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;

-- Check: entries written by this file
SELECT count(*) AS help_entries FROM public.field_help WHERE module_code = 'project_pid' AND is_active;
