// v1345 slice 4, wave 4m — management strategies and plans field help (source for SQL/v1541):
// configuration, communication, quality and risk management strategies (and their methods, records, reports,
// roles, standards, tools), project plan and stage plan sections, stage plan products.
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word that means "inside" (SQL editor trap).
import fs from 'node:fs'
const DF = 'Dates show as {date_format}.'
const t = (key, title, purpose, ex, fmt = null, extra = null) => [key, title, purpose, [ex], fmt, extra]
const d = (key, title, purpose) => [key, title, purpose, ['{example_date}'], DF]

// Common to every management strategy.
const strategy = (P, area, ex) => [
  t(P + 'purpose', 'Purpose', `Why this ${area} management strategy exists and what it covers.`, ex.purpose),
  t(P + 'objectives', 'Objectives', `What good ${area} management should achieve on this project.`, ex.objectives),
  t(P + 'scope', 'Scope', `Which parts of the project and its products the strategy applies to.`, 'All project products and both suppliers'),
  t(P + 'strategy_responsibility', 'Strategy responsibility', 'Who owns and maintains this strategy.', 'Project Manager, with Project Assurance review'),
  t(P + 'variance_from_corporate', 'Variance from corporate standards', 'Any way this project departs from the organisation’s usual standards.', ex.variance),
  t(P + 'variance_justification', 'Variance justification', 'Why the variance is needed and who agreed it.', 'Agreed with the PMO because the supplier works to its own standard.'),
]
const docRoles = (P) => [
  t(P + 'author_id', 'Author', 'The person who wrote this document.', 'Project Manager'),
  t(P + 'owner_id', 'Owner', 'The person accountable for keeping it up to date.', 'Project Manager'),
  t(P + 'client_id', 'Client', 'The person or group it is written for.', 'Project Executive'),
]
const standards = (P, area) => [
  t(P + 'standard_name', 'Standard name', `A ${area} standard the project follows.`, area === 'risk' ? 'Company risk scoring guide' : 'Corporate writing style guide'),
  t(P + 'standard_type', 'Standard type', 'The kind of standard.', 'Internal policy'),
  t(P + 'standard_description', 'Description', 'What the standard says, in short.', area === 'risk' ? 'Scores risks from 1 to 5 for impact and likelihood.' : 'Plain English; no jargon; one idea per paragraph.'),
  t(P + 'applicability', 'Applicability', 'Where and when the standard applies.', 'All project reports and announcements'),
  t(P + 'compliance_level', 'Compliance level', 'Whether the standard must be followed or is only recommended.', 'Mandatory'),
  t(P + 'template_reference', 'Template reference', 'The template that applies the standard in practice.', 'TPL-REP-01'),
  t(P + 'external_link', 'External link', 'A link to the full standard, if it is published.', 'https://intranet.company.example/standards/style'),
]

const CFG = 'public.configuration_management_strategies.'
const CMS = 'public.communication_management_strategies.'
const QMS = 'public.quality_management_strategies.'
const RMS = 'public.risk_management_strategies.'
const PP = 'public.project_plans.'
const SP = 'public.stage_plans.'

export const MODULE = 'strategies_plans'
export const ROWS = [
  // Configuration management strategy
  ...strategy(CFG, 'configuration', { purpose: 'Sets how project products are identified, versioned and controlled.', objectives: 'Every product has one current version and a clear change history.', variance: 'Uses the supplier’s version control tool instead of ours.' }),
  t(CFG + 'configuration_planning_approach', 'Configuration planning approach', 'How you decide which products are tracked and how they are named.', 'Each product gets a code such as CI-0042 when it is first planned.'),
  t(CFG + 'configuration_control_approach', 'Configuration control approach', 'How changes to a tracked product are requested, approved and recorded.', 'Changes go through the change log; only the librarian updates the master copy.'),
  t(CFG + 'configuration_assurance_approach', 'Configuration assurance approach', 'How you check the records match the real products.', 'Quarterly audit of the configuration item records.'),
  t(CFG + 'corporate_configuration_policy_reference', 'Corporate configuration policy reference', 'The organisation’s policy this strategy follows.', 'POL-CFG-02'),

  // Communication management strategy (planning / control / assurance already seeded)
  ...strategy(CMS, 'communication', { purpose: 'Sets how the project shares information with stakeholders.', objectives: 'Every stakeholder group hears about changes before they happen.', variance: 'Weekly updates instead of the usual monthly ones.' }).filter((r) => !['variance_from_corporate', 'variance_justification'].some((c) => r[0].endsWith(c))),

  // Quality management strategy
  ...strategy(QMS, 'quality', { purpose: 'Sets how the project makes sure its products meet the agreed quality.', objectives: 'Products pass review first time; no critical defects at go-live.', variance: 'Peer review replaces formal inspection for small documents.' }),
  t(QMS + 'quality_planning_approach', 'Quality planning approach', 'How quality criteria and checks are planned for each product.', 'Quality criteria agreed in each product description before work starts.'),
  t(QMS + 'quality_control_approach', 'Quality control approach', 'How products are checked against their quality criteria.', 'Peer review for documents; testing for software.'),
  t(QMS + 'quality_assurance_approach', 'Quality assurance approach', 'How someone independent checks that quality management is working.', 'The PMO quality lead reviews the quality register each stage.'),
  t(QMS + 'customer_qms_reference', 'Customer QMS reference', 'The customer’s quality management system, if it applies.', 'Customer quality manual v3'),
  t(QMS + 'supplier_qms_reference', 'Supplier QMS reference', 'The supplier’s quality management system, if it applies.', 'Supplier ISO 9001 certificate'),
  t(QMS + 'corporate_quality_policy_reference', 'Corporate quality policy reference', 'The organisation’s quality policy this strategy follows.', 'POL-QUA-01'),
  t(QMS + 'programme_quality_policy_reference', 'Programme quality policy reference', 'The programme’s quality policy, if the project is part of one.', 'Branch Modernisation quality policy'),
  ...docRoles(QMS),

  // Risk management strategy
  ...strategy(RMS, 'risk', { purpose: 'Sets how the project finds, assesses and handles risks.', objectives: 'Every significant risk has an owner and a response.', variance: 'Risks are reviewed weekly instead of monthly.' }),
  t(RMS + 'risk_identification_approach', 'Risk identification approach', 'How risks are found.', 'Workshops at the start of each stage; anyone can raise a risk at any time.'),
  t(RMS + 'risk_assessment_approach', 'Risk assessment approach', 'How risks are scored and ranked.', 'Impact and likelihood scored 1 to 5; score above 12 is high.'),
  t(RMS + 'risk_response_approach', 'Risk response approach', 'How responses are chosen and agreed.', 'Owner proposes a response; Project Manager approves.'),
  t(RMS + 'risk_monitoring_approach', 'Risk monitoring approach', 'How risks are tracked over time.', 'Risk register reviewed at every weekly team meeting.'),
  t(RMS + 'customer_risk_standards_reference', 'Customer risk standards reference', 'The customer’s risk standards, if they apply.', 'Customer risk guide v2'),
  t(RMS + 'supplier_risk_standards_reference', 'Supplier risk standards reference', 'The supplier’s risk standards, if they apply.', 'Supplier risk procedure SP-07'),
  t(RMS + 'corporate_risk_policy_reference', 'Corporate risk policy reference', 'The organisation’s risk policy this strategy follows.', 'POL-RSK-01'),
  t(RMS + 'programme_risk_policy_reference', 'Programme risk policy reference', 'The programme’s risk policy, if the project is part of one.', 'Branch Modernisation risk policy'),
  ...docRoles(RMS),
  t('public.rms_approvals.approver_id', 'Approvers', 'Tick the people who must approve this risk management strategy.', 'Project Executive; Project Assurance'),

  // Communication strategy detail forms
  t('public.cms_communication_methods.method_name', 'Method name', 'A way the project communicates.', 'Monthly town hall'),
  t('public.cms_communication_methods.method_type', 'Method type', 'How much say the audience has, from informing them to letting them decide.', 'Consult'),
  t('public.cms_communication_methods.method_description', 'Description', 'What the method involves.', 'A one-hour session with questions from staff.'),
  t('public.cms_communication_methods.when_to_use', 'When to use', 'The situations the method suits.', 'Before a change that affects many staff'),
  t('public.cms_communication_methods.entry_criteria', 'Entry criteria', 'What must be ready before using the method.', 'Key messages approved by the sponsor'),
  t('public.cms_communication_methods.exit_criteria', 'Exit criteria', 'What shows the method has done its job.', 'Questions answered and published within a week'),
  t('public.cms_communication_methods.required_participants', 'Required participants', 'Who must take part.', 'Project Executive; Project Manager'),
  t('public.cms_communication_methods.documentation_required', 'Documentation required', 'What must be recorded.', 'Slides and a summary of questions asked'),
  t('public.cms_communication_methods.is_mandatory', 'Mandatory method', 'Tick if the project must use this method.', 'Ticked'),
  t('public.cms_communication_records.record_name', 'Record name', 'A communication record the project keeps.', 'Stakeholder email log'),
  t('public.cms_communication_records.record_type', 'Record type', 'The kind of record.', 'Log'),
  t('public.cms_communication_records.record_description', 'Description', 'What the record holds.', 'Every formal email sent to stakeholders.'),
  t('public.cms_communication_records.record_purpose', 'Purpose', 'Why the record is kept.', 'Proves what was communicated and when.'),
  t('public.cms_communication_records.storage_location', 'Storage location', 'Where the record is kept.', 'Project document library'),
  t('public.cms_communication_records.retention_period', 'Retention period', 'How long the record is kept.', '7 years'),
  t('public.cms_communication_records.access_control', 'Access control', 'Who may see or change the record.', 'Project team read; Project Manager edit'),
  t('public.cms_communication_records.format_requirements', 'Format requirements', 'Any format the record must follow.', 'Spreadsheet with date, audience and subject'),
  t('public.cms_communication_records.is_mandatory', 'Mandatory record', 'Tick if the project must keep this record.', 'Ticked'),
  t('public.cms_reports.report_name', 'Report name', 'A report used to communicate.', 'Monthly stakeholder update'),
  t('public.cms_reports.report_type', 'Report type', 'The kind of report.', 'Newsletter'),
  t('public.cms_reports.report_description', 'Description', 'What the report contains.', 'Progress, upcoming changes and contacts.'),
  t('public.cms_reports.report_purpose', 'Purpose', 'Why the report is produced.', 'Keeps affected staff informed.'),
  t('public.cms_reports.frequency', 'Frequency', 'How often it is sent.', 'Monthly'),
  t('public.cms_reports.distribution_method', 'Distribution method', 'How it reaches people.', 'Email and intranet page'),
  t('public.cms_reports.target_audience', 'Target audience', 'Who it is for.', 'All branch staff'),
  t('public.cms_reports.content_outline', 'Content outline', 'The sections the report always has.', 'Highlights; what changes next month; who to contact'),
  t('public.cms_roles_responsibilities.role_name', 'Role name', 'A role in project communication.', 'Communications Lead'),
  t('public.cms_roles_responsibilities.role_type', 'Role type', 'The kind of role.', 'Project role'),
  t('public.cms_roles_responsibilities.role_description', 'Description', 'What the role does.', 'Plans and sends all stakeholder messages.'),
  t('public.cms_roles_responsibilities.responsibilities', 'Responsibilities', 'The tasks the role is accountable for.', 'Approves messages; keeps the email log'),
  t('public.cms_roles_responsibilities.assigned_user_id', 'Assigned user', 'The person who holds the role.', 'Communications Lead'),
  t('public.cms_roles_responsibilities.authority_level', 'Authority level', 'What the role may decide alone.', 'May send routine updates without approval'),
  t('public.cms_roles_responsibilities.required_skills', 'Required skills', 'The skills the role needs.', 'Clear writing; stakeholder management'),
  ...standards('public.cms_communication_standards.', 'communication'),
  t('public.cms_tools_technologies.tool_name', 'Tool name', 'A tool used to communicate.', 'Company intranet'),
  t('public.cms_tools_technologies.tool_type', 'Tool type', 'The kind of tool.', 'Web platform'),
  t('public.cms_tools_technologies.tool_description', 'Description', 'What the tool does.', 'Publishes news pages to all staff.'),
  t('public.cms_tools_technologies.tool_purpose', 'Purpose', 'What the project uses it for.', 'Monthly project news'),
  t('public.cms_tools_technologies.applicable_to', 'Applicable to', 'Which audiences or messages it suits.', 'All internal staff'),
  t('public.cms_tools_technologies.proficiency_required', 'Proficiency required', 'How skilled users must be.', 'Basic'),
  t('public.cms_tools_technologies.cost', 'Cost', 'What using the tool costs, if anything.', 'Included in the company licence'),
  t('public.cms_tools_technologies.license_required', 'Licence required', 'Tick if a licence is needed to use the tool.', 'Ticked'),
  t('public.cms_tools_technologies.license_info', 'Licence information', 'Licence details, such as type and renewal date.', 'Company-wide licence, renewed each April'),
  t('public.cms_tools_technologies.external_link', 'External link', 'A link to the tool or its guide.', 'https://intranet.company.example'),

  // Risk strategy detail forms
  t('public.rms_identification_methods.method_name', 'Method name', 'A way the project finds risks.', 'Risk workshop'),
  t('public.rms_identification_methods.method_type', 'Method type', 'The kind of method.', 'Workshop'),
  t('public.rms_identification_methods.method_description', 'Description', 'How the method works.', 'Team reviews the plan and lists what could go wrong.'),
  t('public.rms_identification_methods.when_to_use', 'When to use', 'When the method is used.', 'Start of each stage'),
  t('public.rms_identification_methods.participants_required', 'Required participants', 'Who must take part.', 'Project Manager; Team Managers; Project Assurance'),
  t('public.rms_identification_methods.frequency', 'Frequency', 'How often it is used.', 'Each stage'),
  t('public.rms_identification_methods.documentation_required', 'Documentation required', 'What must be recorded.', 'New risks added to the risk register'),
  t('public.rms_identification_methods.is_mandatory', 'Mandatory method', 'Tick if the project must use this method.', 'Ticked'),
  t('public.rms_risk_standards.standard_code', 'Standard code', 'A short code for the standard.', 'RSK-STD-01'),
  ...standards('public.rms_risk_standards.', 'risk'),

  // Project plan
  t(PP + 'plan_title', 'Plan title', 'The name of the project plan.', 'Warehouse Upgrade project plan'),
  t(PP + 'plan_description', 'Plan description', 'A short summary of the plan.', 'Three stages from design to go-live.'),
  t(PP + 'plan_purpose', 'Plan purpose', 'What the plan is for.', 'Shows how and when the project will deliver its products.'),
  t(PP + 'plan_scope', 'Plan scope', 'What the plan covers.', 'All work from design approval to handover.'),
  t(PP + 'pid_id', 'PID', 'The project initiation document this plan belongs to.', 'Warehouse Upgrade PID'),
  t(PP + 'business_case_id', 'Business case', 'The business case the plan supports.', 'Warehouse Upgrade business case'),
  t(PP + 'project_product_description_id', 'Project product description', 'The description of the main product the plan delivers.', 'Upgraded warehouse'),
  t(PP + 'author_id', 'Author', 'The person who wrote the plan.', 'Project Manager'),
  t(PP + 'owner_id', 'Owner', 'The person accountable for the plan.', 'Project Manager'),
  t(PP + 'planning_approach', 'Planning approach', 'How the plan was built.', 'Product-based planning, then a schedule per stage.'),
  t(PP + 'planning_assumptions', 'Planning assumptions', 'What the plan takes as true.', 'Racking supplier delivers in May.'),
  t(PP + 'planning_constraints', 'Planning constraints', 'Limits the plan must respect.', 'No work during the December peak.'),
  t(PP + 'planning_principles', 'Planning principles', 'Rules followed when planning.', 'No task longer than two weeks.'),
  t(PP + 'risk_management_strategy_id', 'Risk management strategy', 'The risk strategy that applies to this plan.', 'Warehouse Upgrade risk strategy'),
  t(PP + 'risk_summary', 'Risk summary', 'The main risks to the plan.', 'Late supplier delivery; staff availability in summer.'),
  t(PP + 'key_risks', 'Key risks (JSON)', 'The key risks as a JSON list.', '[{"risk": "Late delivery", "impact": "High"}]', null, 'The text must stay valid JSON.'),

  // Stage plan
  t(SP + 'stage_name', 'Stage name', 'The name of the stage.', 'Stage 2 — Build'),
  t(SP + 'stage_number', 'Stage number', 'Where the stage comes in order.', '2'),
  t(SP + 'stage_description', 'Stage description', 'What happens in the stage.', 'Install racking and the new scanning system.'),
  t(SP + 'stage_objectives', 'Stage objectives', 'What the stage must achieve.', 'Racking installed and scanners tested.'),
  t(SP + 'plan_title', 'Plan title', 'The name of the stage plan.', 'Stage 2 plan'),
  t(SP + 'plan_purpose', 'Plan purpose', 'What the stage plan is for.', 'Controls day-to-day work in the build stage.'),
  t(SP + 'plan_scope', 'Plan scope', 'What the stage plan covers.', 'All build and test work up to the stage review.'),
  t(SP + 'project_plan_id', 'Project plan', 'The project plan this stage plan sits under.', 'Warehouse Upgrade project plan'),
  t(SP + 'stage_boundary_id', 'Stage boundary', 'The stage boundary that closes this stage.', 'End of Stage 2 review'),
  t(SP + 'author_id', 'Author', 'The person who wrote the stage plan.', 'Project Manager'),
  t(SP + 'owner_id', 'Owner', 'The person who manages the stage.', 'Stage Manager'),
  t(SP + 'products_summary', 'Products summary', 'The products the stage delivers.', 'Racking; scanners; trained staff'),
  t(SP + 'acceptance_criteria', 'Acceptance criteria', 'What must be true to accept the stage’s products.', 'All scanners pass the site test.'),
  t(SP + 'risk_summary', 'Stage risk summary', 'The main risks to this stage.', 'Racking delivery may slip.'),
  t(SP + 'key_risks', 'Key risks (JSON)', 'The key stage risks as a JSON list.', '[{"risk": "Late racking", "impact": "Medium"}]', null, 'The text must stay valid JSON.'),
  t(SP + 'quality_summary', 'Quality summary', 'How quality will be checked in this stage.', 'Site tests for scanners; inspection of racking.'),
  t(SP + 'quality_gates', 'Quality gates (JSON)', 'The quality checkpoints as a JSON list.', '[{"gate": "Racking inspection", "when": "Week 6"}]', null, 'The text must stay valid JSON.'),

  // Stage plan products
  t('public.stage_plan_products.product_name', 'Product name', 'A product the stage delivers.', 'Installed racking'),
  t('public.stage_plan_products.product_type', 'Product type', 'The kind of product.', 'Equipment'),
  d('public.stage_plan_products.planned_completion_date', 'Planned completion date', 'When the product should be finished.'),
  t('public.stage_plan_products.linked_work_package_id', 'Work package', 'The work package that builds this product.', 'Racking installation'),
  t('public.stage_plan_products.linked_ppd_composition_item_id', 'Project product part', 'The part of the project’s main product this belongs to.', 'Storage area'),
  t('public.stage_plan_products.product_description', 'Description', 'What the product is.', 'Racking for 2,000 pallet spaces.'),
  t('public.stage_plan_products.acceptance_criteria', 'Acceptance criteria', 'What must be true to accept it.', 'Passes the load test and safety inspection.'),
]

const twin = JSON.parse(fs.readFileSync(new URL('./_twin_aliases_strat.json', import.meta.url), 'utf8'))
const seeded = new Set(ROWS.map((r) => r[0]))
export const ALIASES = twin.filter(([, p]) => seeded.has(p))
