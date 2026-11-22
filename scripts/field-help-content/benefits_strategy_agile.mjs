// v1345 slice 4, wave 4n — benefits, strategy / OKR, OPA / EEF, ITTO, scope, delays, constraints, Kanban / Scrum,
// templates and the form template builder (source for SQL/v1545).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word that means "inside" (SQL editor trap).
import fs from 'node:fs'
const DF = 'Dates show as {date_format}.'
const AM = 'Amounts show in {currency}.'
const t = (key, title, purpose, ex, fmt = null, extra = null) => [key, title, purpose, [ex], fmt, extra]
const d = (key, title, purpose) => [key, title, purpose, ['{example_date}'], DF]

// ---------- Form template builder (fields people define on a form) ----------
const FT = 'public.form_template_fields.'
const formBuilder = [
  t(FT + 'template_code', 'Template code', 'A short unique code for the form template.', 'F-RISK-01'),
  t(FT + 'template_name', 'Name', 'The name project managers see when they pick this form.', 'Site visit report'),
  t(FT + 'process_group', 'Process group', 'The stage of the project the form belongs to.', 'Monitoring and controlling'),
  t(FT + 'is_active', 'Active', 'Tick to publish the form so project managers can use it.', 'Ticked'),
  t(FT + 'section_key', 'Section key', 'A short code for the section, used behind the scenes.', 'site_details'),
  t(FT + 'section_title', 'Section title', 'The heading people see above this group of fields.', 'Site details'),
  t(FT + 'field_key', 'Field key', 'A short unique code for the field, used behind the scenes and in exports.', 'visit_date', 'Lower case letters, numbers and underscores.'),
  t(FT + 'label', 'Label', 'The field name people see on the form.', 'Date of visit'),
  t(FT + 'field_type', 'Type', 'The kind of answer: text, number, date, a list, a file and so on.', 'Date'),
  t(FT + 'is_required', 'Required', 'Tick if the form cannot be submitted without this field.', 'Ticked'),
  t(FT + 'min_length', 'Min', 'The fewest characters (or lowest number) allowed.', '10'),
  t(FT + 'max_length', 'Max', 'The most characters (or highest number) allowed.', '500'),
  t(FT + 'options', 'Options', 'The choices people can pick from, one per line.', 'Sunny; Cloudy; Raining'),
  t(FT + 'accept', 'Accepted files', 'Which files people may upload: images only, or any file.', 'Images only'),
  t(FT + 'max_files', 'Max files', 'The most files that can be attached to this field.', '5'),
  t(FT + 'guidance', 'Guidance', 'Help shown next to the field, on screen and in offline copies of the form.', 'Use the date you were on site, not the report date.'),
  t(FT + 'default_value', 'Sample / example', 'A sample answer that pre-fills the field and appears in Plain exports.', 'Weather was dry; access road open.'),
]

// ---------- Strategic objectives ----------
const SO = 'public.strategic_objectives.'
const objectives = [
  t(SO + 'objective_code', 'Objective code', 'A short unique code for the strategic objective.', 'SO-01'),
  t(SO + 'objective_name', 'Objective name', 'The name of the objective.', 'Grow online sales'),
  t(SO + 'objective_description', 'Description', 'What the objective is about.', 'Increase the share of sales made online.'),
  t(SO + 'portfolio_id', 'Portfolio', 'The portfolio that owns this objective.', 'Retail Transformation Portfolio'),
  t(SO + 'parent_objective_id', 'Parent objective', 'The higher-level objective this one supports, if any.', 'Become the customer’s first choice'),
  t(SO + 'objective_owner_user_id', 'Objective owner', 'The person accountable for the objective.', 'Head of Digital'),
  t(SO + 'objective_category', 'Category', 'The kind of objective.', 'Financial'),
  t(SO + 'objective_type', 'Type', 'Whether the objective is about growth, cost, risk, compliance and so on.', 'Growth'),
  t(SO + 'objective_level', 'Level', 'Where the objective sits: organisation, portfolio or programme.', 'Portfolio'),
  t(SO + 'priority', 'Priority', 'How important the objective is compared with others.', 'High'),
  t(SO + 'objective_status', 'Status', 'Where the objective stands.', 'On track'),
  t(SO + 'strategic_impact', 'Strategic impact', 'How much the objective moves the organisation’s strategy.', 'High'),
  t(SO + 'measurement_unit', 'Measurement unit', 'The unit progress is measured in.', '% of sales'),
  t(SO + 'baseline_value', 'Baseline value', 'The value when the objective was set.', '20'),
  t(SO + 'target_value', 'Target value', 'The value that means the objective is met.', '35'),
  t(SO + 'current_value', 'Current value', 'The latest measured value.', '26'),
  t(SO + 'success_criteria', 'Success criteria', 'How you will know the objective is achieved.', '35% of sales online for two quarters in a row.'),
  t(SO + 'strategic_importance', 'Strategic importance (%)', 'How much this objective counts in the overall strategy.', '25', 'A whole number from 0 to 100.'),
  t(SO + 'objective_weight', 'Objective weight (%)', 'The weight used when scoring how projects contribute.', '30', 'A whole number from 0 to 100.'),
  d(SO + 'objective_start_date', 'Start date', 'When work on the objective starts.'),
  d(SO + 'objective_target_date', 'Target date', 'When the objective should be met.'),
  d(SO + 'objective_completion_date', 'Completion date', 'When the objective was actually met.'),
]

// ---------- Benefits ----------
const BE = 'public.benefits.'
const benefits = [
  t(BE + 'benefit_code', 'Benefit code', 'A short unique code for the benefit.', 'BEN-004'),
  t(BE + 'benefit_name', 'Benefit name', 'The name of the benefit.', 'Faster order picking'),
  t(BE + 'benefit_description', 'Description', 'What will be better, for whom.', 'Pickers spend less time walking between shelves.'),
  t(BE + 'portfolio_id', 'Portfolio', 'The portfolio the benefit belongs to, if any.', 'Retail Transformation Portfolio'),
  t(BE + 'programme_id', 'Programme', 'The programme the benefit belongs to, if any.', 'Branch Modernisation Programme'),
  t(BE + 'project_id', 'Project', 'The project that delivers the benefit, if any.', 'Warehouse Upgrade'),
  t(BE + 'benefit_category', 'Category', 'The kind of benefit.', 'Efficiency'),
  t(BE + 'benefit_type', 'Type', 'Whether the benefit can be counted in money, measured another way, or not measured.', 'Cashable'),
  t(BE + 'benefit_status', 'Status', 'Where the benefit stands.', 'Being realised'),
  t(BE + 'measurement_unit', 'Measurement unit', 'The unit the benefit is measured in.', 'Minutes per order'),
  t(BE + 'tracking_frequency', 'Tracking frequency', 'How often the benefit is measured.', 'Monthly'),
  t(BE + 'benefit_owner_user_id', 'Benefit owner', 'The person accountable for making the benefit happen.', 'Head of Operations'),
  t(BE + 'baseline_value', 'Baseline value', 'The value before the change.', '12'),
  t(BE + 'target_value', 'Target value', 'The value you aim for.', '9'),
  t(BE + 'current_value', 'Current value', 'The latest measured value.', '10.5'),
  t(BE + 'realized_value', 'Realised value', 'The improvement achieved so far, in the measurement unit.', '1.5'),
  t(BE + 'estimated_value', 'Estimated value', 'The money the benefit is expected to be worth.', '250,000', AM),
  t(BE + 'realized_value_currency', 'Realised value (money)', 'The money the benefit has been worth so far.', '90,000', AM),
  t(BE + 'value_currency', 'Currency', 'The currency of the money values.', 'GBP'),
  t(BE + 'realization_probability', 'Realisation probability (%)', 'How likely the benefit is to be achieved.', '80', 'A whole number from 0 to 100.'),
  d(BE + 'expected_realization_date', 'Expected realisation date', 'When the benefit should be achieved.'),
  d(BE + 'actual_realization_date', 'Actual realisation date', 'When the benefit was actually achieved.'),
]

// ---------- OPA / EEF ----------
const OPA = 'public.organisational_process_assets.'
const EEF = 'public.enterprise_environment_factors.'
const hold = (P) => [
  t(P + 'is_on_hold', 'On hold', 'Tick to put this record on hold in the draft queue.', 'Ticked'),
  t(P + 'on_hold_reason', 'On-hold reason', 'Why the record is on hold.', 'Waiting for the legal review.'),
]
const opa = [
  t(OPA + 'category_id', 'Category', 'The group this process asset belongs to.', 'Templates'),
  t(OPA + 'opa_type', 'OPA type', 'The kind of process asset: a policy, procedure, template, lessons learned and so on.', 'Template'),
  t(OPA + 'status', 'Status', 'Whether the asset is in use.', 'Active'),
  t(OPA + 'version', 'Version', 'The version of the asset.', '2.1'),
  t(OPA + 'document_reference', 'Document reference', 'A link or path to the document.', 'https://intranet.company.example/pmo/risk-template'),
  d(OPA + 'effective_date', 'Effective date', 'When the asset starts to apply.'),
  d(OPA + 'expiry_date', 'Expiry date', 'When the asset stops applying or must be reviewed.'),
  t(OPA + 'tags', 'Tags', 'Short words to find the asset, separated by commas or semicolons.', 'risk, template'),
  t(OPA + 'related_project_id', 'Related project', 'A project the asset came from or applies to, if any.', 'Warehouse Upgrade'),
  t(OPA + 'notes', 'Notes', 'Anything else about the asset.', 'Replaces the 2024 version.'),
  ...hold(OPA),
]
const eef = [
  t(EEF + 'title', 'Title', 'A short name for the environmental factor.', 'New data protection law'),
  t(EEF + 'description', 'Description', 'What the factor is and how it affects projects.', 'Customer data must stay in the country from next year.'),
  t(EEF + 'category_id', 'Category', 'The group this factor belongs to.', 'Legal and regulatory'),
  t(EEF + 'eef_type', 'EEF type', 'Whether the factor comes from inside or outside the organisation.', 'External'),
  t(EEF + 'status', 'Status', 'Whether the factor still applies.', 'Active'),
  t(EEF + 'impact_level', 'Impact level', 'How strongly the factor affects projects.', 'High'),
  t(EEF + 'impact_direction', 'Impact direction', 'Whether the factor helps, hinders or is neutral.', 'Negative'),
  t(EEF + 'related_project_id', 'Related project', 'A project the factor mainly affects, if any.', 'Customer Portal'),
  t(EEF + 'source_reference', 'Source / reference', 'Where the information comes from.', 'Regulator guidance note 12'),
  t(EEF + 'notes', 'Notes', 'Anything else about the factor.', 'Legal team to confirm the start date.'),
  ...hold(EEF),
]

// ---------- Delays ----------
const DL = 'public.project_delays.'
const delays = [
  t(DL + 'title', 'Title', 'A short name for the delay.', 'Racking delivered late'),
  t(DL + 'delay_category', 'Category', 'The kind of delay.', 'Supplier'),
  t(DL + 'responsible_party', 'Responsible party', 'Who caused or owns the delay.', 'Racking supplier'),
  d(DL + 'identified_date', 'Identified date', 'When the delay was first noticed.'),
  t(DL + 'severity', 'Severity', 'How serious the delay is.', 'High'),
  t(DL + 'tailoring_notes', 'Tailoring notes', 'How the standard delay process was adjusted for this case.', 'Weekly review instead of daily.'),
  d(DL + 'original_baseline_date', 'Original baseline date', 'The date in the approved plan.'),
  d(DL + 'revised_forecast_date', 'Revised forecast date', 'The date now expected.'),
  t(DL + 'resolution_plan', 'Resolution plan', 'The steps to recover from the delay.', 'Agree a new date; hire extra installers for week 6.'),
  t(DL + 'resolution_owner_id', 'Resolution owner', 'The person who leads the recovery.', 'Project Manager'),
  d(DL + 'resolution_target_date', 'Resolution target date', 'When the recovery should be complete.'),
  t(DL + 'status', 'Status', 'Where the delay stands.', 'Being resolved'),
]

// ---------- Requirements, traceability, scope ----------
const RQ = 'public.requirements_register.'
const scope = [
  t(RQ + 'requirement_code', 'Code', 'A short unique code for the requirement.', 'REQ-014'),
  t(RQ + 'version', 'Version', 'The version of the requirement.', '1.1'),
  t(RQ + 'name', 'Name', 'A short name for the requirement.', 'Scan every pallet on arrival'),
  t(RQ + 'description', 'Description', 'The requirement in full.', 'Each pallet is scanned at the dock door and its location recorded.'),
  t(RQ + 'category', 'Category', 'The kind of requirement.', 'Functional'),
  t(RQ + 'priority', 'Priority (MoSCoW)', 'Must have, Should have, Could have or Won’t have this time.', 'Must have'),
  t(RQ + 'source_stakeholder_id', 'Source stakeholder', 'The stakeholder who asked for the requirement.', 'Head of Operations'),
  t(RQ + 'status', 'Status', 'Where the requirement stands.', 'Approved'),
  t(RQ + 'acceptance_criteria', 'Acceptance criteria', 'What must be true for the requirement to be met.', '99% of pallets scanned in the pilot week.'),
  t(RQ + 'traceability_tag', 'Traceability tag', 'A tag that links the requirement to designs, tests and deliverables.', 'WH-SCAN'),
  t('public.requirements_traceability_matrix.requirement_id', 'Requirement', 'The requirement this line traces.', 'REQ-014 Scan every pallet'),
  t('public.requirements_traceability_matrix.wbs_node_id', 'WBS node', 'The part of the work breakdown that delivers it.', '2.3 Scanning system'),
  t('public.requirements_traceability_matrix.deliverable_description', 'Deliverable description', 'The deliverable that meets the requirement.', 'Dock scanners installed and tested'),
  t('public.requirements_traceability_matrix.status', 'Status', 'Whether the requirement is covered yet.', 'Covered'),
  t('public.scope_statements.project_description', 'Project description', 'A short summary of the project.', 'Upgrade the main warehouse to scan and track every pallet.'),
  t('public.scope_statements.product_scope_description', 'Product scope description', 'What the finished product will include.', 'Racking, scanners, a tracking system and trained staff.'),
  t('public.scope_statements.status', 'Status', 'Where the scope statement stands.', 'Approved'),
  t('public.scope_statements.version', 'Version', 'The version of the scope statement.', '1.2'),
  t('public.scope_management_plans.scope_definition_approach', 'Scope definition approach', 'How scope will be worked out and agreed.', 'Workshops with users, then a signed scope statement.'),
  t('public.scope_management_plans.change_control_process', 'Change control process', 'How changes to scope are requested and decided.', 'Change requests to the weekly change board.'),
  t('public.scope_management_plans.scope_validation_method', 'Scope validation method', 'How finished work is checked against scope.', 'Senior User signs each deliverable.'),
  t('public.scope_management_plans.deliverable_acceptance_process', 'Deliverable acceptance process', 'How deliverables are formally accepted.', 'Acceptance certificate after site test.'),
  t('public.scope_management_plans.roles_responsibilities', 'Roles and responsibilities', 'Who does what in managing scope.', 'Project Manager owns the baseline; board approves changes.'),
  t('public.scope_management_plans.wbs_maintenance_process', 'WBS maintenance process', 'How the work breakdown is kept up to date.', 'Updated after each approved change.'),
  t('public.scope_management_plans.scope_baseline_info', 'Scope baseline', 'Where the approved scope baseline is kept and which version applies.', 'Baseline v1.2, approved 3 March.'),
  t('public.scope_management_plans.status', 'Status', 'Where the plan stands.', 'Approved'),
  t('public.scope_management_plans.version', 'Version', 'The version of the plan.', '1.0'),
]

// ---------- ITTO ----------
const itto = (P, what) => [
  t(P + 'name', 'Name', `A name for this ${what}.`, 'Develop project charter'),
  t(P + 'process_group', 'Process group', 'The group of processes it belongs to.', 'Initiating'),
  t(P + 'knowledge_area', 'Knowledge area', 'The area of project management it covers.', 'Integration'),
  t(P + 'description', 'Description', 'What the process takes in, does and produces.', 'Uses the business case to produce the charter.'),
  t(P + 'tags', 'Tags', 'Short words to find it, separated by commas.', 'charter, initiation'),
  t(P + 'is_draft', 'Save as draft', 'Tick to keep it on hold in the draft queue.', 'Ticked'),
  t(P + 'status', 'Status', 'Whether it is in use.', 'Active'),
  d(P + 'draft_expires_at', 'Draft expiry', 'When the draft is removed if no one finishes it.'),
]
const ittoRows = [
  ...itto('public.project_ittos.', 'project process (inputs, tools and techniques, outputs)'),
  t('public.project_ittos.tailoring_notes', 'Tailoring notes', 'How the process was adjusted for this project.', 'Charter kept to two pages for this small project.'),
  ...itto('public.itto_templates.', 'process template (inputs, tools and techniques, outputs)'),
]

// ---------- Templates ----------
const TL = 'public.template_library.'
const PT = 'public.project_template_copies.'
const templates = [
  t(TL + 'category_id', 'Category', 'The group the template belongs to.', 'Reports'),
  t(TL + 'template_type_code', 'Template type', 'The kind of template.', 'Report'),
  t(TL + 'title', 'Title', 'The name of the template.', 'Monthly status report'),
  t(TL + 'description', 'Description', 'What the template is for.', 'Standard monthly report for project boards.'),
  t(TL + 'purpose', 'Purpose', 'When and why people should use it.', 'Use for every project with a monthly board.'),
  t(TL + 'tags', 'Tags', 'Short words to find the template, separated by commas.', 'report, monthly'),
  t(TL + 'content', 'Content (JSON)', 'The template’s sections and fields in structured form.', '{"sections": ["Summary", "Risks"]}', null, 'The text must stay valid JSON.'),
  t(TL + 'status', 'Status', 'Whether to save the template as a draft or publish it.', 'Published'),
  t(TL + 'version_note', 'Note', 'A note for your records about what changed. Version history is kept for you.', 'Added a risks section.'),
  t(PT + 'project_id', 'Project', 'The project to copy the template for.', 'Warehouse Upgrade'),
  t(PT + 'title', 'Title', 'The name of the project’s copy.', 'Warehouse Upgrade status report'),
  t(PT + 'change_note', 'Change note', 'A note about what you changed in this copy.', 'Removed the budget section.'),
  t(PT + 'content', 'Content (JSON)', 'The copy’s sections and fields in structured form.', '{"sections": ["Summary"]}', null, 'The text must stay valid JSON.'),
  t('public.process_templates.title', 'Title', 'The name of the process template.', 'Stage gate review'),
  t('public.process_templates.description', 'Description', 'What the process covers.', 'Steps to prepare and hold a stage gate review.'),
  t('public.process_templates.notes', 'Notes', 'Anything else people should know.', 'Use the board pack template for the papers.'),
  t('public.process_templates.status', 'Status', 'Whether the template is in use.', 'Active'),
  t('public.process_templates.is_master', 'Master template', 'Tick to save it as a PMO master template that projects copy from.', 'Ticked'),
  t('public.project_opa_copies.source_opa_id', 'Source OPA', 'The organisational process asset this copy is made from.', 'OPA-012 Risk register template'),
  t('public.project_opa_copies.custom_title', 'Custom title', 'A name for the project’s copy.', 'Warehouse risk register template'),
  t('public.project_opa_copies.custom_description', 'Description', 'How the project uses this copy.', 'Adds warehouse safety categories.'),
  t('public.project_opa_copies.version', 'Version', 'The version of the copy.', '1.0'),
  t('public.project_opa_copies.status', 'Status', 'Where the copy stands.', 'Active'),
  t('public.project_opa_copies.notes', 'Notes', 'Anything else about the copy.', 'Reviewed with the safety lead.'),
  t('public.project_opa_copies.is_on_hold', 'Put on hold', 'Tick to keep the copy in the draft queue.', 'Ticked'),
  t('public.invitation_message_templates.is_active', 'Active', 'Tick to use this message for invitations to this role.', 'Ticked'),
  t('public.invitation_message_templates.label', 'Label', 'A name for the message so you can find it.', 'Welcome for team members'),
  t('public.invitation_message_templates.subject', 'Subject line', 'The email subject (kept for future email sending).', 'You’re invited to join {project_name}'),
  t('public.invitation_message_templates.body', 'Message body', 'The text of the invitation. Placeholders are filled when it is sent.', 'Hello, you have been invited to join {project_name} as {role_name}.'),
]

// ---------- Benefits sub-forms ----------
const brp = [
  t('public.benefits_review_plans.scope_description', 'Scope description', 'Which benefits and projects the review plan covers.', 'All benefits of the Warehouse Upgrade project.'),
  t('public.benefits_review_plans.scope_item', 'Scope item', 'One thing the plan covers.', 'Picking time'),
  t('public.benefits_review_plans.scope_item_owner', 'Benefit owner', 'The person accountable for that item.', 'Head of Operations'),
  t('public.benefits_review_plans.measurement_timing_rationale', 'Measurement timing rationale', 'Why benefits are measured at these points.', 'Picking settles three months after go-live.'),
  t('public.benefits_review_plans.measurement_point', 'Measurement point', 'A point at which a benefit is measured.', 'Three months after go-live'),
  t('public.benefits_review_plans.measurement_timing', 'Measurement timing', 'When that measurement happens.', 'End of June'),
  t('public.benefits_review_plan_approvals.approver_id', 'Approvers', 'Tick the people who must approve the plan.', 'Project Executive; Senior User'),
  t('public.benefit_measurements.measurement_date', 'Measurement date', 'When the measurement was taken.', '{example_date}', DF),
  t('public.benefit_measurements.measurement_value', 'Measurement value', 'The value measured, in the benefit’s unit.', '10.5'),
  t('public.benefit_measurements.measurement_type', 'Measurement type', 'Whether this is a baseline, an interim or a final measurement.', 'Interim'),
  t('public.benefit_measurements.data_quality', 'Data quality', 'How reliable the measurement is.', 'Good'),
  t('public.benefit_measurements.notes', 'Notes', 'Anything that explains the value.', 'Measured over a busy week.'),
  t('public.benefit_realization_reports.report_name', 'Report name', 'The name of the benefits realisation report.', 'Q2 benefits report'),
  t('public.benefit_realization_reports.report_description', 'Description', 'What the report covers.', 'Benefits realised in the second quarter.'),
  t('public.benefit_realization_reports.report_type', 'Report type', 'The kind of report.', 'Quarterly'),
  t('public.benefit_realization_reports.report_status', 'Status', 'Where the report stands.', 'Draft'),
  d('public.benefit_realization_reports.report_date', 'Report date', 'The date of the report.'),
  d('public.benefit_realization_reports.report_start_date', 'Period start', 'The first day the report covers.'),
  d('public.benefit_realization_reports.report_end_date', 'Period end', 'The last day the report covers.'),
  t('public.benefit_realization_reports.notes', 'Notes', 'Anything else about the report.', 'Picking benefit ahead of plan.'),
]

// ---------- OKR ----------
const okr = [
  t('public.okr_cycles.cycle_name', 'Cycle name', 'The name of the OKR cycle.', 'Q3 2027'),
  t('public.okr_cycles.cycle_code', 'Cycle code', 'A short unique code for the cycle.', 'OKR-2027-Q3'),
  t('public.okr_cycles.period_type', 'Period type', 'How long the cycle runs.', 'Quarter'),
  t('public.okr_cycles.status', 'Status', 'Where the cycle stands.', 'Active'),
  d('public.okr_cycles.start_date', 'Start date', 'The first day of the cycle.'),
  d('public.okr_cycles.end_date', 'End date', 'The last day of the cycle.'),
  t('public.objectives.cycle_id', 'Cycle', 'The OKR cycle this objective belongs to.', 'Q3 2027'),
  t('public.objectives.title', 'Objective title', 'What you want to achieve, in a few words.', 'Make ordering online effortless'),
  t('public.objectives.description', 'Description', 'Why the objective matters.', 'Most complaints are about the checkout.'),
  t('public.objectives.scope_level', 'Scope', 'Who the objective belongs to: the organisation, a team or a project.', 'Team'),
  t('public.objectives.health_status', 'Health', 'How the objective is going.', 'On track'),
  t('public.objectives.progress_pct', 'Progress %', 'How far the objective is towards done.', '40', 'A whole number from 0 to 100.'),
  t('public.key_results.kr_title', 'Key result title', 'A measurable result that shows the objective is met.', 'Checkout completion rate'),
  t('public.key_results.target_value', 'Target', 'The value to reach.', '85'),
  t('public.key_results.current_value', 'Current', 'The latest value.', '71'),
  t('public.key_results.unit_label', 'Unit', 'The unit of the values.', '%'),
  t('public.key_results.health_status', 'Health', 'How the key result is going.', 'At risk'),
]

// ---------- Kanban ----------
const kanban = [
  t('public.kanban_boards.board_name', 'Board name', 'The name of the Kanban board.', 'Warehouse fixes'),
  t('public.kanban_boards.board_description', 'Description', 'What the board is for.', 'Small fixes found during the go-live.'),
  t('public.kanban_boards.board_type', 'Board type', 'The kind of board.', 'Team'),
  t('public.kanban_boards.card_color_scheme', 'Card colour scheme', 'What card colours show: priority, type or owner.', 'Priority'),
  t('public.kanban_boards.show_aging_indicators', 'Show card aging', 'Tick to show how long cards have been in a column.', 'Ticked'),
  t('public.kanban_boards.show_blocked_indicators', 'Show blocked items', 'Tick to highlight cards that are blocked.', 'Ticked'),
  t('public.kanban_boards.allow_card_creation', 'Allow card creation', 'Tick to let people add cards straight on the board.', 'Ticked'),
  t('public.kanban_cards.card_title', 'Card title', 'A short name for the piece of work.', 'Fix label printer'),
  t('public.kanban_cards.card_description', 'Description', 'What needs doing.', 'Printer at dock 2 skips every tenth label.'),
  t('public.kanban_cards.priority', 'Priority', 'How urgent the card is.', 'High'),
  t('public.kanban_cards.card_type', 'Card type', 'The kind of work.', 'Bug'),
  t('public.kanban_cards.assigned_to_user_id', 'Assign to', 'The person who will do the work.', 'Support Engineer'),
  d('public.kanban_cards.due_date', 'Due date', 'When the card should be done.'),
]

// ---------- Scrum ----------
const US = 'public.user_stories.'
const scrum = [
  t(US + 'story_title', 'Story title', 'A short name for the user story.', 'Scan a pallet at the dock'),
  t(US + 'story_as_a', 'As a…', 'Who wants this.', 'Warehouse picker'),
  t(US + 'story_i_want', 'I want…', 'What they want to do.', 'scan a pallet as it arrives'),
  t(US + 'story_so_that', 'So that…', 'Why it helps them.', 'its location is recorded straight away'),
  t(US + 'story_description', 'Description', 'More detail about the story.', 'Works with the handheld scanners already in use.'),
  t(US + 'story_points', 'Story points', 'The team’s estimate of the effort, in points.', '5'),
  t(US + 'priority', 'Priority', 'How important the story is.', 'High'),
  t(US + 'epic_id', 'Epic', 'The larger piece of work this story belongs to.', 'Dock scanning'),
  t(US + 'acceptance_criteria', 'Acceptance criteria', 'What must be true for the story to be done, one per line.', 'Scan records the dock and time'),
  t('public.epics.epic_name', 'Epic name', 'The name of the epic.', 'Dock scanning'),
  t('public.epics.epic_goal', 'Epic goal', 'What the epic should achieve.', 'Every pallet is tracked from arrival.'),
  t('public.epics.epic_description', 'Description', 'More detail about the epic.', 'Scanners, labels and the tracking screen.'),
  t('public.epics.priority', 'Priority', 'How important the epic is.', 'High'),
  t('public.daily_scrum_notes.what_did_i_do_yesterday', 'What did I do yesterday?', 'What you finished since the last stand-up.', 'Finished the label layout.'),
  t('public.daily_scrum_notes.what_will_i_do_today', 'What will I do today?', 'What you plan to work on next.', 'Test labels with the dock printer.'),
  t('public.daily_scrum_notes.any_blockers', 'Any blockers?', 'Anything stopping your progress.', 'Waiting for printer access.'),
  t('public.daily_scrum_notes.additional_notes', 'Additional notes', 'Anything else the team should know.', 'Out tomorrow afternoon.'),
  t('public.sprint_review_feedback.feedback_text', 'Feedback', 'What the stakeholder said about the work shown.', 'The scan screen needs bigger buttons.'),
  t('public.sprint_review_feedback.feedback_type', 'Type', 'The kind of feedback.', 'Change request'),
  t('public.sprint_review_feedback.rating', 'Rating (1–5)', 'How happy the stakeholder was, from 1 (poor) to 5 (excellent).', '4'),
  t('public.sprint_review_feedback.requires_action', 'Requires action', 'Tick if the team must act on this feedback.', 'Ticked'),
  t('public.sprint_review_feedback.action_item_description', 'Action item', 'What the team will do about it.', 'Enlarge the scan buttons next sprint.'),
  t('public.retrospective_items.item_text', 'Item text', 'The point raised in the retrospective.', 'Testing started too late.'),
  t('public.retrospective_items.item_category', 'Category', 'The area the point is about.', 'Process'),
  t('public.retrospective_items.item_type', 'Type', 'Whether it went well, went badly or is an idea.', 'Went badly'),
  t('public.retrospective_action_items.action_description', 'Action description', 'What the team will change.', 'Pair a tester with each developer from day one.'),
  t('public.retrospective_action_items.action_priority', 'Priority', 'How important the action is.', 'High'),
  d('public.retrospective_action_items.target_completion_date', 'Target completion date', 'When the action should be done.'),
  t('public.project_agile_templates.template_type', 'Template type', 'What the template is for, such as a definition of done.', 'Definition of done'),
  t('public.project_agile_templates.auto_apply_to_new_stories', 'Auto-apply to new stories', 'Tick to add these items to every new story.', 'Ticked'),
  t('public.project_agile_templates.items', 'Items', 'The checklist items, one per line.', 'Code reviewed; tests pass; demo given'),
]

// ---------- Constraints ----------
const CR = 'public.constraints_register.'
const constraints = [
  t(CR + 'constraint_text', 'Constraint', 'A limit the project must work within.', 'No work on the shop floor during opening hours.'),
  t(CR + 'category', 'Category', 'The kind of constraint.', 'Schedule'),
  t(CR + 'status', 'Status', 'Whether the constraint still applies.', 'Active'),
  t(CR + 'owner_user_id', 'Owner', 'The person who watches this constraint.', 'Project Manager'),
  d(CR + 'due_date', 'Due date', 'When the constraint should be reviewed or ends.'),
  t(CR + 'impact_severity', 'Impact', 'How much the constraint affects the project.', 'High'),
  t(CR + 'notes', 'Notes', 'Anything else about the constraint.', 'Agreed with the store manager.'),
]

export const MODULE = 'benefits_strategy_agile'
export const ROWS = [
  ...formBuilder, ...objectives, ...benefits, ...opa, ...eef, ...delays, ...scope, ...ittoRows, ...templates, ...brp, ...okr, ...kanban, ...scrum, ...constraints,
  // Simulator-only fields
  t('sim.enterprise_environment_factors.related_simulation_run_id', 'Related simulation run', 'The simulation run this factor applies to, if any.', 'Warehouse scenario — run 3'),
  t('sim.project_template_copies.simulation_run_id', 'Simulation run', 'The simulation run to copy the template for.', 'Warehouse scenario — run 3'),
  t('sim.scenario_constraints.category_id', 'Constraint category', 'What the constraint limits, such as budget or end date.', 'Budget'),
  t('sim.scenario_constraints.operand', 'Comparison', 'How the value is compared: at most, at least or exactly.', 'At most'),
  t('sim.scenario_constraints.value', 'Value', 'The limit itself.', '500,000'),
  t('sim.scenario_constraints.notes', 'Notes', 'Anything that explains the constraint.', 'Set by the scenario’s sponsor.'),
]

// Simulator copies and Simulator-only pages read the Platform help for the same table and column.
const seeded = new Set(ROWS.map((r) => r[0]))
const twin = JSON.parse(fs.readFileSync(new URL('./_twin_aliases_4n.json', import.meta.url), 'utf8'))
const gaps = JSON.parse(fs.readFileSync(new URL('./_sim_gaps_4n.json', import.meta.url), 'utf8'))
const byPublic = gaps.map((k) => [k, k.replace(/^sim\./, 'public.')])
export const ALIASES = [...new Map([...twin, ...byPublic].filter(([s, pub]) => !seeded.has(s) && seeded.has(pub))).entries()]
