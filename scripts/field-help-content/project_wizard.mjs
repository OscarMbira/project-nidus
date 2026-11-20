// v1345 slice 3, wave 3a — project wizard (Create / Edit / View) field help (source for SQL/v1515).
// Keys: public.projects.<column>; list-only steps (constraints, assumptions, …) use their step heading.
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies:
// role titles, "Example … Ltd", globally familiar places. Pickers never list people (listOptions={false}).
// Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
const DF = 'Dates show as {date_format}.'
const LINES = 'One item per line.'
const P = 'public.projects.'

export const MODULE = 'project_wizard'
export const ROWS = [
  // ── Project Details ──
  [P + 'project_code', 'Project code', 'A short code that identifies the project in lists and reports. Leave it blank and the system creates one.', ['PRJ-2027-014']],
  [P + 'project_name', 'Project name', 'A clear name people will recognise.', ['Dubai Branch Network Refresh']],
  [P + 'project_description', 'Project description', 'A few sentences on what the project is and why it is needed.', ['Replace the ageing teller system in all Dubai branches with the group platform, so branches can open accounts in one visit.']],
  [P + 'project_type_id', 'Project type', 'The kind of project. Your organisation sets the list.', ['Technology implementation']],
  [P + 'project_status_id', 'Status', 'Where the project is in its life. New projects usually start as a proposal or in initiation.', ['Initiation']],
  [P + 'industries', 'Industry / sector', 'The industries this project belongs to. Tick all that apply and mark one as primary; the primary one sets the default industry menus.', ['Banking (primary) and Technology']],
  [P + 'success_criteria', 'Success criteria', 'How you will judge whether the project succeeded.', ['All 12 branches live by the end of March', 'Account opening takes under 20 minutes'], LINES],
  [P + 'project_classification', 'Classification', 'How central the project is to strategy compared with routine work.', ['Strategic']],
  [P + 'project_objectives', 'Objectives', 'What the project will achieve, each stated so it can be checked.', ['Move all branch accounts to the new platform with no data loss', 'Train every teller before go-live'], LINES],
  [P + 'priority', 'Priority', 'How important the project is compared with other projects.', ['High']],
  [P + 'billing_type', 'Billing type', 'How the project’s work is charged.', ['Fixed price'], null, 'Time and material projects also get a planned against actual comparison on the Work Plan tab.'],
  [P + 'project_manager_user_id', 'Project manager', 'The person who runs the project day to day and has full rights on it.', ['Senior Project Manager'], null, 'Only a PMO Admin can change it.'],
  [P + 'start_date', 'Start date', 'When the project starts.', ['{example_date}'], DF],
  [P + 'end_date', 'End date', 'When the project is planned to finish. It must be after the start date.', ['{example_date}'], DF],

  // ── Governance ──
  [P + 'executive_name', 'Project executive / sponsor', 'The senior person who owns the business case and is accountable for the project’s success.', ['Chief Operating Officer'], null, 'Needed before the project can be authorised.'],
  [P + 'board_required', 'Project board required', 'Whether a project board will oversee the project. Larger or riskier projects usually need one.', ['Yes – board required']],
  [P + 'funding_authority_name', 'Funding authority', 'The person or body that approves the money for the project.', ['Chief Financial Officer']],
  [P + 'approving_authority_name', 'Approving authority', 'The person or body that formally approves the project to go ahead.', ['Investment Committee']],

  // ── Business justification ──
  [P + 'benefit_owner_name', 'Benefit owner', 'The person accountable for making sure the expected benefits are actually achieved.', ['Head of Retail Banking']],
  [P + 'business_objective', 'Business objective / problem statement', 'The business problem the project solves, or the opportunity it takes.', ['Branch customers wait up to 3 days for a new account because the teller system cannot check identity online.']],
  [P + 'strategic_alignment', 'Strategic alignment', 'Which organisational goals or strategies the project supports.', ['Supports the 2027 strategy goal to make every service available in one visit or online.']],
  [P + 'expected_benefits_summary', 'Expected benefits (high level)', 'The main benefits expected, in a sentence or two. Detailed benefits go in the benefits register.', ['Faster account opening, 15% lower branch running costs, and higher customer satisfaction scores.']],

  // ── Delivery ──
  [P + 'delivery_methodology', 'Delivery methodology', 'The overall way the project will be delivered.', ['Hybrid']],
  [P + 'lifecycle_template', 'Lifecycle template', 'The set of stages the project follows, from your organisation’s templates.', ['Standard technology lifecycle']],
  [P + 'stage_model', 'Stage model', 'Whether the stages are fixed in advance or can be adapted as the project goes.', ['Fixed (predefined stages)']],
  [P + 'stage_gate_enforcement', 'Stage gate enforcement', 'Whether each stage must be approved before the next can start (hard gate), or approval is only advised (soft gate).', ['Required (hard gate)']],

  // ── Tolerances ──
  [P + 'tolerance_time_days', 'Time tolerance (days)', 'How many days the project may slip before it must be escalated to the board.', ['10']],
  [P + 'tolerance_cost_percentage', 'Cost tolerance (%)', 'How far over budget, as a percentage, the project may go before it must be escalated.', ['5'], 'A percentage from 0 to 100.'],
  [P + 'tolerance_scope_description', 'Scope tolerance', 'How much the scope may change without escalation.', ['Minor changes to reports are allowed; any new branch or product must be escalated.']],
  [P + 'tolerance_quality_description', 'Quality tolerance', 'The quality limits the project must stay within.', ['No critical defects at go-live; up to 10 minor defects allowed.']],
  [P + 'tolerance_risk_description', 'Risk tolerance', 'The level of risk the project may carry before escalation.', ['Any risk rated high or above must be escalated within 2 days.']],
  [P + 'tolerance_benefits_description', 'Benefits tolerance', 'How far the expected benefits may fall before escalation.', ['Escalate if forecast savings fall more than 10% below the business case.']],

  // ── Financial ──
  [P + 'budget_currency', 'Currency', 'The currency the project budget is held in.', ['GBP']],
  [P + 'budget_type', 'Budget type', 'Whether the spend is capital (creates an asset), operational (running costs), or both.', ['Mixed (CapEx + OpEx)']],
  [P + 'budget_categories', 'Budget categories', 'The budget broken down by category, such as staff, suppliers and hardware.', ['Staff costs – 400,000', 'Supplier services – 650,000'], 'Amounts show in {currency}.'],
  [P + 'budget_approval_status', 'Budget approval status', 'Whether the budget has been approved yet.', ['Pending approval']],

  // ── Risks ──
  [P + 'initial_risk_rating', 'Initial risk rating', 'Your first view of how risky the project is overall.', ['Medium risk']],
  [P + 'complexity_rating', 'Complexity rating', 'How complex the project is, considering size, technology and number of teams.', ['High complexity']],
  [P + 'delivery_complexity', 'Delivery complexity', 'Whether one team or supplier delivers the work, or several.', ['Multiple vendors / teams']],
  [P + 'regulatory_impact', 'Regulatory / compliance impact', 'Whether laws or regulators affect the project, for example data protection or banking rules.', ['Yes – has regulatory impact']],
  [P + 'data_sensitivity', 'Data sensitivity level', 'The most sensitive kind of data the project will handle.', ['Confidential']],

  // ── Resources ──
  [P + 'estimated_effort', 'Estimated effort', 'A rough size of the project in time and people.', ['Medium (3–6 months, 5–15 people)']],
  [P + 'external_vendors_required', 'External vendors required', 'Whether outside suppliers are needed.', ['Yes – external vendors needed']],
  [P + 'key_skills_required', 'Key skills required', 'Specialist skills the project needs.', ['Data migration, branch process design, change management']],

  // ── Documents ──
  [P + 'mandate_status', 'Mandate status', 'Where the project mandate document stands.', ['Approved']],
  [P + 'business_case_status', 'Business case status', 'Where the business case document stands.', ['Draft']],
  [P + 'brief_status', 'Project brief status', 'Where the project brief document stands.', ['Not yet created']],
  [P + 'pid_status', 'PID status', 'Where the project initiation document stands.', ['Not yet created']],
  [P + 'benefits_review_plan_status', 'Benefits review plan status', 'Where the benefits review plan stands.', ['Not yet created']],
  [P + 'funding_approval_status', 'Funding approval document status', 'Where the document approving the project’s funding stands.', ['Draft']],
  [P + 'rfp_reference', 'RFP reference', 'The reference of the request for proposal, if suppliers were invited to bid.', ['RFP-2027-006']],
  [P + 'document_repository_url', 'Document repository URL', 'The link to the folder where the project’s documents are kept.', ['https://documents.company.example/projects/PRJ-2027-014']],

  // ── Portfolio and programme ──
  [P + 'portfolio_id', 'Portfolio assignment', 'The portfolio this project belongs to, if any. Search by code or name.', ['Retail Transformation Portfolio']],
  [P + 'programme_id', 'Programme assignment', 'The programme this project is part of, if any. Search by code or name.', ['Branch Modernisation Programme']],

  // ── List steps (help on the step heading) ──
  [P + 'project_constraints', 'Constraints', 'Known limits on how the project can be delivered: dates, money, people, technology or rules.', ['Go-live must be outside the year-end freeze', 'Budget capped at 1,500,000'], LINES],
  [P + 'project_assumptions', 'Assumptions', 'Things you believe are true but have not yet confirmed. Check them as the project goes.', ['The supplier team stays available until go-live', 'Branches can close early for one Saturday each'], LINES],
  [P + 'key_deliverables', 'Deliverables', 'The main outputs the project will hand over.', ['Configured branch platform', 'Trained branch staff', 'Updated branch procedures'], LINES],
  [P + 'wizard_stakeholders', 'Stakeholders', 'People or groups affected by, or able to influence, the project. Capture them now; full details go in the stakeholder register later.', ['Head of Retail Banking – Example Bank – sponsor side', 'Branch Manager, Dubai main branch']],
  [P + 'wizard_milestones', 'Main milestones', 'The key dates the project is working towards. Detailed planning comes later.', ['Pilot branch live – {example_date}', 'All branches live – {example_date}']],
  [P + 'required_approvals', 'Approvals', 'Sign-offs the project needs: who or which body approves, and what.', ['Steering Committee – go-live date', 'Chief Information Security Officer – security design'], LINES],
]

// Simulator practice project create page (sim.practice_projects) reads the same help.
export const ALIASES = [
  ['sim.practice_projects.project_name', P + 'project_name'],
  ['sim.practice_projects.project_description', P + 'project_description'],
  ['sim.practice_projects.project_type_id', P + 'project_type_id'],
  ['sim.practice_projects.status_id', P + 'project_status_id'],
  ['sim.practice_projects.planned_start_date', P + 'start_date'],
  ['sim.practice_projects.planned_end_date', P + 'end_date'],
  ['sim.practice_projects.industries', P + 'industries'],
]
