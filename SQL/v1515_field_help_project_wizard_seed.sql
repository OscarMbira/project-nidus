-- ============================================================================
-- v1345 slice 3 wave 3a — project wizard field help (Create / Edit / View, both apps)
-- ============================================================================
-- Generated from scripts/field-help-content/project_wizard.mjs by scripts/field-help-content/build-sql.mjs (v1345 slice 2).
-- 60 help entries, module_code 'project_wizard'. Register keys fall back to the common
-- register:*:<field_key> help when a register has no entry of its own (S2-D1).
-- Examples follow CLAUDE.md rule 77. Drafted by Claude for owner sample review (G-D5).
-- Idempotent: re-running refreshes the text. Prerequisites: v1490.
-- ============================================================================

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.projects.project_code', 'Project code', 'A short code that identifies the project in lists and reports. Leave it blank and the system creates one.', '- PRJ-2027-014', NULL, NULL, 'project_wizard'),
  ('public.projects.project_name', 'Project name', 'A clear name people will recognise.', '- Dubai Branch Network Refresh', NULL, NULL, 'project_wizard'),
  ('public.projects.project_description', 'Project description', 'A few sentences on what the project is and why it is needed.', '- Replace the ageing teller system in all Dubai branches with the group platform, so branches can open accounts in one visit.', NULL, NULL, 'project_wizard'),
  ('public.projects.project_type_id', 'Project type', 'The kind of project. Your organisation sets the list.', '- Technology implementation', NULL, NULL, 'project_wizard'),
  ('public.projects.project_status_id', 'Status', 'Where the project is in its life. New projects usually start as a proposal or in initiation.', '- Initiation', NULL, NULL, 'project_wizard'),
  ('public.projects.industries', 'Industry / sector', 'The industries this project belongs to. Tick all that apply and mark one as primary; the primary one sets the default industry menus.', '- Banking (primary) and Technology', NULL, NULL, 'project_wizard'),
  ('public.projects.success_criteria', 'Success criteria', 'How you will judge whether the project succeeded.', E'- All 12 branches live by the end of March\n- Account opening takes under 20 minutes', 'One item per line.', NULL, 'project_wizard'),
  ('public.projects.project_classification', 'Classification', 'How central the project is to strategy compared with routine work.', '- Strategic', NULL, NULL, 'project_wizard'),
  ('public.projects.project_objectives', 'Objectives', 'What the project will achieve, each stated so it can be checked.', E'- Move all branch accounts to the new platform with no data loss\n- Train every teller before go-live', 'One item per line.', NULL, 'project_wizard'),
  ('public.projects.priority', 'Priority', 'How important the project is compared with other projects.', '- High', NULL, NULL, 'project_wizard'),
  ('public.projects.billing_type', 'Billing type', 'How the project’s work is charged.', '- Fixed price', NULL, 'Time and material projects also get a planned against actual comparison on the Work Plan tab.', 'project_wizard'),
  ('public.projects.project_manager_user_id', 'Project manager', 'The person who runs the project day to day and has full rights on it.', '- Senior Project Manager', NULL, 'Only a PMO Admin can change it.', 'project_wizard'),
  ('public.projects.start_date', 'Start date', 'When the project starts.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'project_wizard'),
  ('public.projects.end_date', 'End date', 'When the project is planned to finish. It must be after the start date.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'project_wizard'),
  ('public.projects.executive_name', 'Project executive / sponsor', 'The senior person who owns the business case and is accountable for the project’s success.', '- Chief Operating Officer', NULL, 'Needed before the project can be authorised.', 'project_wizard'),
  ('public.projects.board_required', 'Project board required', 'Whether a project board will oversee the project. Larger or riskier projects usually need one.', '- Yes – board required', NULL, NULL, 'project_wizard'),
  ('public.projects.funding_authority_name', 'Funding authority', 'The person or body that approves the money for the project.', '- Chief Financial Officer', NULL, NULL, 'project_wizard'),
  ('public.projects.approving_authority_name', 'Approving authority', 'The person or body that formally approves the project to go ahead.', '- Investment Committee', NULL, NULL, 'project_wizard'),
  ('public.projects.benefit_owner_name', 'Benefit owner', 'The person accountable for making sure the expected benefits are actually achieved.', '- Head of Retail Banking', NULL, NULL, 'project_wizard'),
  ('public.projects.business_objective', 'Business objective / problem statement', 'The business problem the project solves, or the opportunity it takes.', '- Branch customers wait up to 3 days for a new account because the teller system cannot check identity online.', NULL, NULL, 'project_wizard'),
  ('public.projects.strategic_alignment', 'Strategic alignment', 'Which organisational goals or strategies the project supports.', '- Supports the 2027 strategy goal to make every service available in one visit or online.', NULL, NULL, 'project_wizard'),
  ('public.projects.expected_benefits_summary', 'Expected benefits (high level)', 'The main benefits expected, in a sentence or two. Detailed benefits go in the benefits register.', '- Faster account opening, 15% lower branch running costs, and higher customer satisfaction scores.', NULL, NULL, 'project_wizard'),
  ('public.projects.delivery_methodology', 'Delivery methodology', 'The overall way the project will be delivered.', '- Hybrid', NULL, NULL, 'project_wizard'),
  ('public.projects.lifecycle_template', 'Lifecycle template', 'The set of stages the project follows, from your organisation’s templates.', '- Standard technology lifecycle', NULL, NULL, 'project_wizard'),
  ('public.projects.stage_model', 'Stage model', 'Whether the stages are fixed in advance or can be adapted as the project goes.', '- Fixed (predefined stages)', NULL, NULL, 'project_wizard'),
  ('public.projects.stage_gate_enforcement', 'Stage gate enforcement', 'Whether each stage must be approved before the next can start (hard gate), or approval is only advised (soft gate).', '- Required (hard gate)', NULL, NULL, 'project_wizard'),
  ('public.projects.tolerance_time_days', 'Time tolerance (days)', 'How many days the project may slip before it must be escalated to the board.', '- 10', NULL, NULL, 'project_wizard'),
  ('public.projects.tolerance_cost_percentage', 'Cost tolerance (%)', 'How far over budget, as a percentage, the project may go before it must be escalated.', '- 5', 'A percentage from 0 to 100.', NULL, 'project_wizard'),
  ('public.projects.tolerance_scope_description', 'Scope tolerance', 'How much the scope may change without escalation.', '- Minor changes to reports are allowed; any new branch or product must be escalated.', NULL, NULL, 'project_wizard'),
  ('public.projects.tolerance_quality_description', 'Quality tolerance', 'The quality limits the project must stay within.', '- No critical defects at go-live; up to 10 minor defects allowed.', NULL, NULL, 'project_wizard'),
  ('public.projects.tolerance_risk_description', 'Risk tolerance', 'The level of risk the project may carry before escalation.', '- Any risk rated high or above must be escalated within 2 days.', NULL, NULL, 'project_wizard'),
  ('public.projects.tolerance_benefits_description', 'Benefits tolerance', 'How far the expected benefits may fall before escalation.', '- Escalate if forecast savings fall more than 10% below the business case.', NULL, NULL, 'project_wizard'),
  ('public.projects.budget_currency', 'Currency', 'The currency the project budget is held in.', '- GBP', NULL, NULL, 'project_wizard'),
  ('public.projects.budget_type', 'Budget type', 'Whether the spend is capital (creates an asset), operational (running costs), or both.', '- Mixed (CapEx + OpEx)', NULL, NULL, 'project_wizard'),
  ('public.projects.budget_categories', 'Budget categories', 'The budget broken down by category, such as staff, suppliers and hardware.', E'- Staff costs – 400,000\n- Supplier services – 650,000', 'Amounts show in {currency}.', NULL, 'project_wizard'),
  ('public.projects.budget_approval_status', 'Budget approval status', 'Whether the budget has been approved yet.', '- Pending approval', NULL, NULL, 'project_wizard'),
  ('public.projects.initial_risk_rating', 'Initial risk rating', 'Your first view of how risky the project is overall.', '- Medium risk', NULL, NULL, 'project_wizard'),
  ('public.projects.complexity_rating', 'Complexity rating', 'How complex the project is, considering size, technology and number of teams.', '- High complexity', NULL, NULL, 'project_wizard'),
  ('public.projects.delivery_complexity', 'Delivery complexity', 'Whether one team or supplier delivers the work, or several.', '- Multiple vendors / teams', NULL, NULL, 'project_wizard'),
  ('public.projects.regulatory_impact', 'Regulatory / compliance impact', 'Whether laws or regulators affect the project, for example data protection or banking rules.', '- Yes – has regulatory impact', NULL, NULL, 'project_wizard'),
  ('public.projects.data_sensitivity', 'Data sensitivity level', 'The most sensitive kind of data the project will handle.', '- Confidential', NULL, NULL, 'project_wizard'),
  ('public.projects.estimated_effort', 'Estimated effort', 'A rough size of the project in time and people.', '- Medium (3–6 months, 5–15 people)', NULL, NULL, 'project_wizard'),
  ('public.projects.external_vendors_required', 'External vendors required', 'Whether outside suppliers are needed.', '- Yes – external vendors needed', NULL, NULL, 'project_wizard'),
  ('public.projects.key_skills_required', 'Key skills required', 'Specialist skills the project needs.', '- Data migration, branch process design, change management', NULL, NULL, 'project_wizard'),
  ('public.projects.mandate_status', 'Mandate status', 'Where the project mandate document stands.', '- Approved', NULL, NULL, 'project_wizard'),
  ('public.projects.business_case_status', 'Business case status', 'Where the business case document stands.', '- Draft', NULL, NULL, 'project_wizard'),
  ('public.projects.brief_status', 'Project brief status', 'Where the project brief document stands.', '- Not yet created', NULL, NULL, 'project_wizard'),
  ('public.projects.pid_status', 'PID status', 'Where the project initiation document stands.', '- Not yet created', NULL, NULL, 'project_wizard'),
  ('public.projects.benefits_review_plan_status', 'Benefits review plan status', 'Where the benefits review plan stands.', '- Not yet created', NULL, NULL, 'project_wizard'),
  ('public.projects.funding_approval_status', 'Funding approval document status', 'Where the document approving the project’s funding stands.', '- Draft', NULL, NULL, 'project_wizard'),
  ('public.projects.rfp_reference', 'RFP reference', 'The reference of the request for proposal, if suppliers were invited to bid.', '- RFP-2027-006', NULL, NULL, 'project_wizard'),
  ('public.projects.document_repository_url', 'Document repository URL', 'The link to the folder where the project’s documents are kept.', '- https://documents.company.example/projects/PRJ-2027-014', NULL, NULL, 'project_wizard'),
  ('public.projects.portfolio_id', 'Portfolio assignment', 'The portfolio this project belongs to, if any. Search by code or name.', '- Retail Transformation Portfolio', NULL, NULL, 'project_wizard'),
  ('public.projects.programme_id', 'Programme assignment', 'The programme this project is part of, if any. Search by code or name.', '- Branch Modernisation Programme', NULL, NULL, 'project_wizard'),
  ('public.projects.project_constraints', 'Constraints', 'Known limits on how the project can be delivered: dates, money, people, technology or rules.', E'- Go-live must be outside the year-end freeze\n- Budget capped at 1,500,000', 'One item per line.', NULL, 'project_wizard'),
  ('public.projects.project_assumptions', 'Assumptions', 'Things you believe are true but have not yet confirmed. Check them as the project goes.', E'- The supplier team stays available until go-live\n- Branches can close early for one Saturday each', 'One item per line.', NULL, 'project_wizard'),
  ('public.projects.key_deliverables', 'Deliverables', 'The main outputs the project will hand over.', E'- Configured branch platform\n- Trained branch staff\n- Updated branch procedures', 'One item per line.', NULL, 'project_wizard'),
  ('public.projects.wizard_stakeholders', 'Stakeholders', 'People or groups affected by, or able to influence, the project. Capture them now; full details go in the stakeholder register later.', E'- Head of Retail Banking – Example Bank – sponsor side\n- Branch Manager, Dubai main branch', NULL, NULL, 'project_wizard'),
  ('public.projects.wizard_milestones', 'Main milestones', 'The key dates the project is working towards. Detailed planning comes later.', E'- Pilot branch live – {example_date}\n- All branches live – {example_date}', NULL, NULL, 'project_wizard'),
  ('public.projects.required_approvals', 'Approvals', 'Sign-offs the project needs: who or which body approves, and what.', E'- Steering Committee – go-live date\n- Chief Information Security Officer – security design', 'One item per line.', NULL, 'project_wizard')
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
  ('sim.practice_projects.project_name', 'public.projects.project_name'),
  ('sim.practice_projects.project_description', 'public.projects.project_description'),
  ('sim.practice_projects.project_type_id', 'public.projects.project_type_id'),
  ('sim.practice_projects.status_id', 'public.projects.project_status_id'),
  ('sim.practice_projects.planned_start_date', 'public.projects.start_date'),
  ('sim.practice_projects.planned_end_date', 'public.projects.end_date'),
  ('sim.practice_projects.industries', 'public.projects.industries')
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;

-- Check: entries written by this file
SELECT count(*) AS help_entries FROM public.field_help WHERE module_code = 'project_wizard' AND is_active;
