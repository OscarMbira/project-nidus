// v1345 slice 4, wave 4l — product-based planning field help (source for SQL/v1539):
// project product description, product descriptions, work package products / acceptance / reporting, product status account.
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word that means "inside" (SQL editor trap).
import fs from 'node:fs'
const DF = 'Dates show as {date_format}.'
const t = (key, title, purpose, ex, fmt = null, extra = null) => [key, title, purpose, [ex], fmt, extra]
const d = (key, title, purpose) => [key, title, purpose, ['{example_date}'], DF]

const PPD = 'public.project_product_descriptions.'
const PD = 'public.product_descriptions.'

// Fields shared by the project product description and a product description.
const describe = (P, what) => [
  t(P + 'product_title', 'Product title', `The name of the ${what}.`, what === 'project’s main product' ? 'New customer portal' : 'Portal login page'),
  t(P + 'purpose', 'Purpose', `Why the ${what} is needed and who will use it.`, 'Lets customers manage their accounts online without calling the branch.'),
  t(P + 'development_skills_required', 'Development skills required', `The skills needed to build the ${what}.`, 'Web design; security testing; accessibility review'),
  t(P + 'resource_areas', 'Resource areas', 'The teams or suppliers who provide those skills.', 'Digital team; external testing supplier'),
  t(P + 'acceptance_method', 'Acceptance method', `How the ${what} will be accepted.`, 'Signed acceptance certificate after user acceptance testing'),
  t(P + 'acceptance_responsibilities', 'Acceptance responsibilities', 'Who accepts the product, and what each of them signs off.', 'Senior User accepts usability; Head of IT Security accepts security.'),
  t(P + 'handover_arrangements', 'Handover arrangements', 'How the product passes to the people who will run it.', 'Handed to the service desk after two weeks of support.'),
  t(P + 'phased_handover', 'Phased handover planned', 'Tick if the product is handed over in parts rather than all at once.', 'Ticked'),
  t(P + 'author_id', 'Author', 'The person who wrote this description.', 'Project Manager'),
  t(P + 'owner_id', 'Owner', 'The person accountable for the product.', 'Senior User'),
  t(P + 'client_id', 'Client', 'The person or group the product is delivered to.', 'Head of Customer Service'),
]

// Acceptance criteria fields shared by project product descriptions and product descriptions.
const criteria = (P) => [
  t(P + 'criteria_title', 'Criterion title', 'A short name for the acceptance criterion.', 'Page load time'),
  t(P + 'criteria_description', 'Description', 'What must be true for the product to be accepted.', 'Every page loads in under 2 seconds on a normal connection.'),
  t(P + 'criteria_category', 'Category', 'The kind of criterion.', 'Performance'),
  t(P + 'stakeholder_group', 'Stakeholder group', 'The group that cares most about this criterion.', 'Customers'),
  t(P + 'priority', 'Priority', 'How important the criterion is.', 'Must have'),
  t(P + 'measurement_method', 'Measurement method', 'How the criterion will be measured.', 'Automated load test of 20 key pages'),
  t(P + 'target_value', 'Target value', 'The value that counts as a pass.', '2'),
  t(P + 'unit_of_measure', 'Unit of measure', 'The unit the target is measured in.', 'Seconds'),
  t(P + 'tolerance_lower', 'Lower tolerance', 'The lowest value that is still acceptable.', '0'),
  t(P + 'tolerance_upper', 'Upper tolerance', 'The highest value that is still acceptable.', '2.5'),
  t(P + 'is_provable_in_project', 'Can be proven during the project', 'Tick if the criterion can be checked before the project closes. If not, give a proxy measure.', 'Ticked'),
  t(P + 'proxy_measure', 'Proxy measure', 'What you will check instead when the criterion itself can only be proven after the project.', 'Test users rate the portal 4 out of 5 or better.'),
  t(P + 'validation_notes', 'Validation notes', 'How the criterion was checked as measurable and realistic.', 'Agreed with the Senior User at the stage review.'),
]

const skills = (P) => [
  t(P + 'skill_name', 'Skill name', 'The skill needed.', 'Accessibility testing'),
  t(P + 'skill_description', 'Skill description', 'What the skill involves.', 'Testing pages with screen readers and keyboard only.'),
  t(P + 'skill_category', 'Skill category', 'The kind of skill.', 'Testing'),
  t(P + 'proficiency_level', 'Proficiency level', 'How skilled the person must be.', 'Advanced'),
  t(P + 'required_for', 'Required for', 'The part of the work that needs the skill.', 'User acceptance testing'),
  t(P + 'resource_area', 'Resource area', 'The team or supplier expected to provide it.', 'External testing supplier'),
  t(P + 'is_critical', 'Critical skill', 'Tick if the product cannot be built without this skill.', 'Ticked'),
]

const derivations = (P) => [
  t(P + 'derivation_type', 'Derivation type', 'What the product is based on.', 'Existing product'),
  t(P + 'derivation_title', 'Derivation title', 'The name of the source.', 'Current online banking site'),
  t(P + 'derivation_description', 'Description', 'How the product draws on that source.', 'Reuses the login and account summary screens.'),
  t(P + 'derivation_reference', 'Reference', 'A document or record number for the source.', 'ARCH-2026-014'),
  t(P + 'mandate_id', 'Project mandate', 'The project mandate this derivation comes from, if any.', 'Customer portal mandate'),
]

export const MODULE = 'product_planning'
export const ROWS = [
  // Project product description
  ...describe(PPD, 'project’s main product'),
  t(PPD + 'composition', 'Composition', 'The main parts that make up the product.', 'Login; account summary; payments; messages'),
  t(PPD + 'derivation', 'Derivation', 'What the product is based on or replaces.', 'Replaces the current online banking site.'),
  t(PPD + 'customer_quality_expectations', 'Customer quality expectations', 'The quality the customer expects, in their own words.', 'Fast, easy to use on a phone, and always available.'),
  t(PPD + 'quality_characteristics', 'Quality characteristics', 'The measurable qualities that meet those expectations.', 'Availability 99.9%; pages load in under 2 seconds'),
  t(PPD + 'quality_management_system', 'Quality management system', 'The organisation’s quality system the product must follow.', 'Company quality manual, version 4'),
  t(PPD + 'applicable_standards', 'Applicable standards', 'Standards the product must meet.', 'WCAG 2.2 AA; ISO 27001'),
  t(PPD + 'satisfaction_targets', 'Satisfaction targets', 'The customer satisfaction levels to aim for.', '80% of users rate it good or better'),
  t(PPD + 'project_quality_tolerances', 'Project quality tolerances', 'How far quality may vary before it must be escalated.', 'Availability may fall to 99.5% in the first month.'),
  // Product description (adds links)
  ...describe(PD, 'product'),
  t(PD + 'product_deliverable_id', 'Product deliverable', 'The deliverable this description is for.', 'Portal login page'),
  t(PD + 'ppd_composition_item_id', 'Project product part', 'The part of the project’s main product this one belongs to.', 'Login'),
  t(PD + 'configuration_item_id', 'Configuration item', 'The configuration item that tracks versions of this product.', 'CI-0042'),

  // Acceptance criteria
  ...criteria('public.ppd_acceptance_criteria.'),
  ...criteria('public.pd_acceptance_criteria.'),
  t('public.pd_acceptance_criteria.acceptance_status', 'Acceptance status', 'Whether the criterion has been met.', 'Met'),
  t('public.pd_acceptance_criteria.is_measurable', 'Validated as measurable', 'Tick once you have confirmed the criterion can be measured.', 'Ticked'),
  t('public.pd_acceptance_criteria.is_realistic', 'Validated as realistic', 'Tick once you have confirmed the target can be achieved.', 'Ticked'),

  // Composition
  t('public.ppd_composition_items.product_name', 'Product name', 'A part of the project’s main product.', 'Payments'),
  t('public.ppd_composition_items.product_description', 'Product description', 'What this part is.', 'Pay bills and transfer money between accounts.'),
  t('public.ppd_composition_items.product_type', 'Product type', 'The kind of product.', 'Software'),
  t('public.ppd_composition_items.planned_delivery_stage', 'Planned delivery stage', 'The stage in which this part should be delivered.', 'Stage 3'),
  t('public.ppd_composition_items.linked_product_id', 'Product deliverable', 'The deliverable record for this part, if one exists.', 'Payments module'),
  t('public.ppd_composition_items.product_description_id', 'Product description', 'The detailed product description for this part, if one exists.', 'Payments module description'),
  t('public.ppd_composition_items.is_mandatory', 'Mandatory', 'Tick if the project must deliver this part.', 'Ticked'),
  t('public.pd_composition_items.sub_product_name', 'Sub-product name', 'A part that makes up this product.', 'Password reset screen'),
  t('public.pd_composition_items.sub_product_type', 'Sub-product type', 'The kind of part.', 'Screen'),
  t('public.pd_composition_items.sub_product_description', 'Description', 'What the part is.', 'Lets customers reset a forgotten password.'),
  t('public.pd_composition_items.linked_product_description_id', 'Product description', 'The product description for this part, if one exists.', 'Password reset description'),
  t('public.pd_composition_items.linked_product_deliverable_id', 'Product deliverable', 'The deliverable record for this part, if one exists.', 'Password reset screen'),
  t('public.pd_composition_items.is_mandatory', 'Mandatory', 'Tick if the part must be delivered.', 'Ticked'),

  // Derivations
  ...derivations('public.ppd_derivations.'),
  ...derivations('public.pd_derivations.'),
  t('public.pd_derivations.linked_ppd_id', 'Project product description', 'The project product description this product comes from.', 'New customer portal'),
  t('public.pd_derivations.linked_ppd_composition_item_id', 'Project product part', 'The part of the project’s main product it comes from.', 'Login'),

  // Responsibilities
  t('public.ppd_acceptance_responsibilities.role_name', 'Role name', 'The role that accepts the product, or part of it.', 'Senior User'),
  t('public.ppd_acceptance_responsibilities.role_category', 'Role category', 'The kind of role.', 'Customer'),
  t('public.ppd_acceptance_responsibilities.authority_level', 'Authority level', 'How much the role can decide on acceptance.', 'Final sign-off'),
  t('public.ppd_acceptance_responsibilities.user_id', 'Assign to user', 'The person who holds the role, if known.', 'Head of Customer Service'),
  t('public.ppd_acceptance_responsibilities.user_name', 'User name (if external)', 'The name or role of someone outside the system.', 'Supplier Quality Manager'),
  t('public.ppd_acceptance_responsibilities.acceptance_scope', 'Acceptance scope', 'What this role accepts.', 'Usability and accessibility'),
  t('public.ppd_acceptance_responsibilities.criteria_ids', 'Acceptance criteria', 'Tick the criteria this role signs off.', 'Page load time; accessibility'),
  t('public.pd_acceptance_responsibilities.responsibility_type', 'Responsibility type', 'What the role does in acceptance.', 'Accepter'),
  t('public.pd_acceptance_responsibilities.assigned_to_id', 'Assigned to', 'The person who holds the role.', 'Head of IT Security'),
  t('public.pd_acceptance_responsibilities.role_name', 'Role name', 'The role that accepts the product.', 'Security Approver'),
  t('public.pd_acceptance_responsibilities.role_description', 'Role description', 'What the role checks before accepting.', 'Confirms the security tests passed.'),
  t('public.pd_acceptance_responsibilities.acceptance_criteria_ids', 'Acceptance criteria', 'Tick the criteria this role accepts.', 'Penetration test passed'),

  // Skills
  ...skills('public.ppd_skills_required.'),
  ...skills('public.pd_skills_required.'),

  // Distribution
  t('public.pd_distribution.recipient_id', 'Recipient', 'The team member who receives this product description.', 'Team Manager'),
  t('public.pd_distribution.recipient_name', 'Recipient name', 'The name or role of a recipient who is not in the system.', 'Supplier Project Lead'),
  t('public.pd_distribution.recipient_title', 'Recipient title', 'The recipient’s job title.', 'Team Manager'),
  d('public.pd_distribution.date_of_issue', 'Date of issue', 'When this version was sent to them.'),

  // Work package products
  t('public.wp_products.product_name', 'Product name', 'A product the team must deliver in this work package.', 'Portal login page'),
  t('public.wp_products.product_type', 'Product type', 'The kind of product.', 'Software'),
  t('public.wp_products.product_description', 'Product description', 'What the product is.', 'Login page with two-step sign-in.'),
  t('public.wp_products.linked_product_deliverable_id', 'Product deliverable', 'The deliverable record for this product, if one exists.', 'Portal login page'),
  t('public.wp_products.linked_product_description_id', 'Product description', 'The product description to build it to, if one exists.', 'Portal login page description'),
  t('public.wp_products.quality_criteria', 'Quality criteria', 'The quality checks the product must pass.', 'Passes the accessibility review'),
  t('public.wp_products.acceptance_criteria', 'Acceptance criteria', 'What must be true for the product to be accepted.', 'Signed off by the Senior User'),
  t('public.wp_products.delivery_status', 'Delivery status', 'Where delivery of the product stands.', 'In progress'),
  d('public.wp_products.delivery_date', 'Delivery date', 'When the product was or will be delivered.'),
  d('public.wp_products.acceptance_date', 'Acceptance date', 'When the product was accepted.'),

  // Work package acceptance criteria
  t('public.wp_acceptance_criteria.criteria_title', 'Criterion title', 'A short name for what must be true to accept the work package.', 'All products signed off'),
  t('public.wp_acceptance_criteria.criteria_description', 'Description', 'The criterion in full.', 'Every product in the work package has a signed acceptance record.'),
  t('public.wp_acceptance_criteria.criteria_category', 'Category', 'The kind of criterion.', 'Completion'),
  t('public.wp_acceptance_criteria.acceptance_status', 'Acceptance status', 'Whether the criterion has been met.', 'Pending'),
  t('public.wp_acceptance_criteria.acceptance_method', 'Acceptance method', 'How it will be checked.', 'Review of sign-off records'),
  t('public.wp_acceptance_criteria.acceptance_responsible', 'Acceptance responsible', 'Who checks it.', 'Project Manager'),
  d('public.wp_acceptance_criteria.acceptance_date', 'Acceptance date', 'When it was accepted.'),
  t('public.wp_acceptance_criteria.acceptance_result', 'Acceptance result', 'The outcome of the check.', 'Accepted'),

  // Work package reporting arrangements
  t('public.wp_reporting_arrangements.report_type', 'Report type', 'The report the team must send.', 'Checkpoint report'),
  t('public.wp_reporting_arrangements.report_format', 'Report format', 'How the report is given.', 'Written report'),
  t('public.wp_reporting_arrangements.report_frequency', 'Report frequency', 'How often it is sent.', 'Weekly'),
  t('public.wp_reporting_arrangements.report_recipients', 'Report recipients', 'Who receives it.', 'Project Manager; Project Assurance'),
  t('public.wp_reporting_arrangements.report_owner', 'Report owner', 'Who writes and sends it.', 'Team Manager'),
  t('public.wp_reporting_arrangements.report_template', 'Report template', 'The template to use.', 'Checkpoint report template'),
  t('public.wp_reporting_arrangements.report_description', 'Report description', 'What the report must cover.', 'Progress, issues, and products completed this week.'),

  // Product status account
  t('public.product_status_accounts.product_name', 'Product name', 'The product this status account reports on.', 'Portal login page'),
  d('public.product_status_accounts.report_date', 'Report date', 'The date the status is reported as at.'),
  t('public.product_status_accounts.product_reference', 'Product reference', 'The product’s reference or ID.', 'PRD-0042'),
  t('public.product_status_accounts.product_type', 'Product type', 'The kind of product.', 'Software'),
  t('public.product_status_accounts.product_deliverable_id', 'Product deliverable', 'The deliverable record for this product.', 'Portal login page'),
  t('public.product_status_accounts.product_description_id', 'Product description', 'The product description it is built to.', 'Portal login page description'),
  t('public.product_status_accounts.current_status', 'Status', 'Where the product stands now.', 'In development'),
  t('public.product_status_accounts.status_notes', 'Status notes', 'Anything that explains the status.', 'Waiting for the security review slot.'),
  t('public.product_status_accounts.progress_percentage', 'Progress (%)', 'How far the product is towards completion.', '60', 'A whole number from 0 to 100.'),
  t('public.product_status_accounts.progress_indicator', 'Progress indicator', 'A quick rating of progress.', 'Amber'),
  t('public.product_status_accounts.progress_notes', 'Progress notes', 'What has moved since the last report.', 'Design approved; build half done.'),
  d('public.product_status_accounts.planned_start_date', 'Planned start date', 'When work on the product was planned to start.'),
  d('public.product_status_accounts.actual_start_date', 'Actual start date', 'When work actually started.'),
  d('public.product_status_accounts.planned_completion_date', 'Planned completion date', 'When it was planned to finish.'),
  d('public.product_status_accounts.forecast_completion_date', 'Forecast completion date', 'When it is now expected to finish.'),
  d('public.product_status_accounts.actual_completion_date', 'Actual completion date', 'When it actually finished.'),
  t('public.product_status_accounts.status_summary', 'Overall status summary', 'A short summary of the product’s position.', 'On track except for the security review, which is a week late.'),
  t('public.product_status_accounts.key_achievements', 'Key achievements', 'What has been completed.', 'Design approved; login screens built'),
  t('public.product_status_accounts.next_milestones', 'Next milestones', 'What comes next and when.', 'Security review; user acceptance testing'),
  t('public.product_status_accounts.risks_and_issues', 'Risks and issues', 'Risks or issues affecting the product.', 'Security review slot may slip again.'),
  t('public.product_status_accounts.actions_required', 'Actions required', 'Actions needed to keep it on track, and by whom.', 'Project Manager to book a second review slot.'),
]

// The Simulator copies of these components read the Platform help.
const twin = JSON.parse(fs.readFileSync(new URL('./_twin_aliases_pbp.json', import.meta.url), 'utf8'))
const seeded = new Set(ROWS.map((r) => r[0]))
export const ALIASES = twin.filter(([, p]) => seeded.has(p))
