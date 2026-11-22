// v1345 slice 4, wave 4s — screens that exist in both Platform and Simulator (same file in apps/platform and
// apps/simulator): RFPs, integrations, automation rules, work authorisation, tier form policy, local data
// extensions (custom fields, validation, groups, screen mapping), appointment acceptance, meeting outcomes,
// record lifecycle, register definitions, RACI matrices, resource conflicts, feedback, completed examples,
// risk categories, trial upgrade. Simulator keys alias these rows (ALIASES built from the Simulator keys used).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies: no real
// people, organisations or brands in examples; .example addresses.
// Use the typographic apostrophe (’); never the word that means "inside" (SQL editor trap).
const t = (key, title, purpose, ex, fmt = null, extra = null) => [key, title, purpose, [ex], fmt, extra]

export const MODULE = 'twin_screens'
export const ROWS = [
  // Automation rules
  t('public.automation_rules.rule_name', 'Rule name', 'A short name that says what the rule does.', 'Notify the PM when a high risk is added'),
  t('public.automation_rules.description', 'Description', 'When the rule runs and what it changes, so others understand it.', 'When a risk with impact High or Very High is created, send the project manager an in-app notice.'),
  t('public.automation_rules.category', 'Category', 'Groups similar rules so they are easier to find.', 'Notification'),
  t('public.automation_rules.priority', 'Priority', 'Which rule runs first when several match the same event. 1 runs first.', '5', 'A whole number from 1 to 10.'),
  t('public.automation_rules.trigger_type', 'Trigger type', 'The event that starts the rule.', 'A record is created'),
  t('public.automation_rules.action_type', 'Action type', 'What the rule does when it runs.', 'Send a notification'),
  // Integrations
  t('public.integrations.ms_project_path', 'Schedule file path or URL', 'Where the schedule file sits, so it can be read on each sync.', 'https://files.company.example/projects/office-move.xml'),
  t('public.integrations.auth_method', 'Authentication method', 'How the connection signs in to the other system.', 'API key'),
  t('public.integrations.jira_url', 'Tracker URL', 'The web address of your issue tracker site.', 'https://yourteam.tracker.example'),
  t('public.integrations.username', 'Email or username', 'The account the connection uses to sign in to the other system.', 'integration.user@company.example'),
  t('public.integrations.api_token', 'API token', 'The secret token created in the other system for this connection. It is stored encrypted.', 'Paste the token from the other system', null, 'Use a token for a service account, not a personal one, so the connection keeps working when people leave.'),
  t('public.integrations.repository_url', 'Repository URL', 'The web address of the code repository to link.', 'https://code.company.example/team/office-move'),
  t('public.integrations.access_token', 'Personal access token', 'The secret token created in the code host for this connection. It is stored encrypted.', 'Paste the token from the code host'),
  t('public.integrations.branch', 'Branch', 'The branch to follow. Leave blank for the default branch.', 'main'),
  t('public.integrations.integration_name', 'Integration name', 'A name that tells people what this connection is for.', 'Office move — issue tracker'),
  t('public.integrations.integration_type', 'Integration type', 'Which kind of system you are connecting.', 'Issue tracker'),
  t('public.integrations.description', 'Description', 'What the connection syncs and who looks after it.', 'Syncs open issues every 30 minutes; owned by the PMO analyst.'),
  t('public.integrations.sync_direction', 'Sync direction', 'Whether data comes in, goes out, or both.', 'Import only'),
  t('public.integrations.sync_frequency_minutes', 'Sync frequency (minutes)', 'How often the connection checks for changes.', '30'),
  // Work authorisation
  t('public.work_authorisations.project_id', 'Project', 'The project this work authorisation belongs to.', 'The project the work is for'),
  t('public.work_authorisations.title', 'Title', 'A short name for the work being authorised.', 'Start fit-out of floor 3'),
  t('public.work_authorisations.action_type', 'Action type', 'What the authorisation allows: start, pause, resume or stop the work.', 'Start'),
  t('public.work_authorisations.rationale', 'Rationale', 'Why the work should go ahead now.', 'Design approved and the contractor is mobilised; floor 3 is empty from 1 March.'),
  t('public.work_authorisations.risk_impact_summary', 'Risk / impact summary', 'The main risks of going ahead and what they could affect.', 'Noise may disturb floor 2 staff; works run after 18:00 to limit it.'),
  t('public.work_authorisations.planned_start', 'Planned start', 'When the authorised work is planned to start.', '{example_date}', 'Dates show as {date_format}.'),
  t('public.work_authorisations.planned_end', 'Planned end', 'When the authorised work is planned to finish.', '{example_date}', 'Dates show as {date_format}.'),
  // RFP
  t('public.rfps.rfp_reference', 'RFP code', 'The RFP’s reference. Leave blank and one is created for you.', 'RFP-2026-004'),
  t('public.rfps.rfp_title', 'RFP title', 'A short name for what you are buying.', 'Managed print services for head office'),
  t('public.rfps.rfp_description', 'Description', 'What the RFP covers and the outcome you need.', 'Supply, install and support 40 printers across two floors for three years.'),
  t('public.rfps.category_id', 'Category', 'The kind of purchase, used to group RFPs in reports.', 'IT services'),
  t('public.rfps.original_document_ref', 'Original document reference', 'The reference on the source RFP document, if it came from elsewhere.', 'PROC/2026/017'),
  t('public.rfps.original_issue_date', 'Original issue date', 'When the original RFP document was issued.', '{example_date}', 'Dates show as {date_format}.'),
  t('public.rfps.service_provider_name', 'Provider name', 'The supplier responding to or awarded the RFP.', 'Example Office Services Ltd'),
  t('public.rfps.contract_value', 'Contract value', 'The value of the contract in the currency below.', '{currency} 250,000', 'Type 250k or 1.2m and press Enter to expand it.'),
  t('public.rfps.currency', 'Currency', 'The currency of the contract value.', '{currency}'),
  t('public.rfp_contacts.contact_person', 'Contact person', 'The supplier’s main contact for this RFP.', 'Account Manager'),
  t('public.rfp_contacts.email', 'Email', 'The contact’s email address.', 'account.manager@supplier.example'),
  t('public.rfp_contacts.phone', 'Phone', 'The contact’s office number.', '+44 20 7946 0321'),
  t('public.rfp_contacts.mobile', 'Mobile number', 'The contact’s mobile number.', '+44 7700 900321'),
  t('public.rfp_line_items.item_number', 'S/No', 'The line’s number in the RFP.', '12'),
  t('public.rfp_line_items.reference_number', 'Reference no.', 'The requirement’s reference in the source document.', 'REQ-4.2'),
  t('public.rfp_line_items.scope_entity', 'Scope / entity', 'Which site, team or company the line applies to.', 'Head office'),
  t('public.rfp_line_items.business_area', 'Business area', 'The part of the business that needs this.', 'Finance'),
  t('public.rfp_line_items.description', 'Description', 'The requirement, stated so a supplier can answer it.', 'Printers must support secure pull printing with staff ID cards.'),
  t('public.rfp_line_items.vendor_response', 'Vendor response / comments', 'The supplier’s answer to this line.', 'Fully supported; card readers included in the unit price.'),
  t('public.rfp_line_items.priority', 'Priority', 'How important the line is when comparing suppliers.', 'High'),
  t('public.rfp_line_items.requirement_type', 'Requirement type', 'Whether the line is a function, a quality (performance, security …) or a commercial term.', 'Functional'),
  t('public.rfp_line_items.acceptance_criteria', 'Acceptance criteria', 'How you will check the supplier has met it.', 'A test print from each floor completes with a card tap within 10 seconds.'),
  t('public.rfp_line_items.estimated_effort', 'Estimated effort', 'Roughly how much work the line takes.', '5 days'),
  // Tier form policy
  t('public.tier_form_policies.form_template_id', 'Form template', 'The form this level’s rules apply to.', 'Risk register form'),
  t('public.tier_form_policies.label_override', 'Display name', 'A different label for this field at this level. Leave blank to keep the original.', 'Funding source'),
  t('public.tier_form_policies.type_override', 'Input type', 'A different input for this field at this level, e.g. a dropdown instead of free text.', 'Dropdown'),
  t('public.tier_form_policies.options_override', 'Dropdown options', 'The choices for this field at this level.', 'Capital\nOperating\nGrant'),
  t('public.tier_form_fields.section_key', 'Section', 'The form section the new field appears in.', 'Details'),
  t('public.tier_form_fields.field_key', 'Field key', 'A short internal name for the field. Lower case, no spaces.', 'funding_source', 'Letters, numbers and underscores only.'),
  t('public.tier_form_fields.label', 'Label', 'The label people see on the form.', 'Funding source'),
  t('public.tier_form_fields.field_type', 'Type', 'What kind of value the field holds.', 'Text'),
  t('public.tier_form_fields.min_chars', 'Min characters', 'The shortest answer allowed. Leave blank for no limit.', '10'),
  t('public.tier_form_fields.max_chars', 'Max characters', 'The longest answer allowed. Leave blank for no limit.', '500'),
  t('public.tier_form_fields.options', 'Options', 'The choices people can pick from.', 'Capital\nOperating'),
  t('public.tier_form_fields.accepted_files', 'Accepted files', 'Which file types people may attach.', 'PDF and images'),
  t('public.tier_form_fields.max_files', 'Max files', 'The most files one record may have here.', '5'),
  // Local data extensions (custom fields)
  t('public.custom_field_definitions.field_code', 'Field code', 'A unique internal code for the field. It cannot change once the field is saved.', 'cost_centre', 'Letters, numbers and underscores only.'),
  t('public.custom_field_definitions.label', 'Label', 'The label people see on forms and in lists.', 'Cost centre'),
  t('public.custom_field_definitions.description', 'Description', 'What the field is for, for the people who maintain it.', 'Finance cost centre that pays for the work.'),
  t('public.custom_field_definitions.field_type', 'Type', 'What kind of value the field holds.', 'Dropdown'),
  t('public.custom_field_definitions.workflow_status', 'Workflow status', 'Where the field is in its approval: draft fields are not shown on forms until published.', 'Published'),
  t('public.custom_field_validation_rules.length_range', 'Min / max length', 'The shortest and longest text allowed. Leave either blank for no limit.', 'Min 3, max 50'),
  t('public.custom_field_validation_rules.number_range', 'Min / max (numbers)', 'The smallest and largest number allowed.', 'Min 0, max 100'),
  t('public.custom_field_validation_rules.date_range', 'Earliest / latest date', 'The earliest and latest date allowed.', '{example_date}', 'Dates show as {date_format}.'),
  t('public.custom_field_validation_rules.item_count_range', 'Min / max number of items', 'The fewest and most items people may enter or pick.', 'Min 1, max 5'),
  t('public.custom_field_validation_rules.regex_pattern', 'Allowed characters pattern', 'A pattern the value must match, for codes with a fixed shape.', '^[A-Z]{2}-[0-9]{4}$'),
  t('public.custom_field_validation_rules.pattern_message', 'Pattern message', 'The message people see when their value does not match the pattern.', 'Use two capital letters, a dash and four digits, e.g. CC-1042.'),
  t('public.custom_field_groups.min_rows', 'Min rows', 'The fewest rows a record must have in this group.', '1'),
  t('public.custom_field_groups.max_rows', 'Max rows', 'The most rows a record may have in this group.', '10'),
  t('public.custom_field_screen_map.module_code', 'Module', 'The part of the system whose screens you are adding the field to.', 'Risks'),
  t('public.custom_field_screen_map.screen_code', 'Screen', 'The screen the field appears on.', 'Risk form'),
  t('public.custom_field_screen_map.custom_field_id', 'Published field', 'The published custom field to show on this screen.', 'Cost centre'),
  // Appointment acceptance
  t('public.manager_appointment_records.actual_start_date', 'Actual start date', 'The day you actually start, if it differs from the appointment.', '{example_date}', 'Dates show as {date_format}.'),
  t('public.manager_appointment_records.acceptance_conditions', 'Acceptance conditions', 'Anything you accept the appointment on condition of.', 'Two days a week until my current project closes in April.'),
  t('public.manager_appointment_records.initial_observations', 'Initial observations', 'Your first view of the project or team, for the record.', 'Plan is ambitious; budget has no contingency yet.'),
  t('public.manager_appointment_records.decline_reason', 'Decline reason', 'Why you are declining, so the person appointing you can plan.', 'I am fully committed to the data centre move until June.'),
  t('public.manager_appointment_records.response_note', 'Note for the appointer', 'Anything else the person who appointed you should know.', 'Happy to hand over a short plan review in the first week.'),
  // Meetings
  t('public.comm_meetings.notes', 'Meeting notes', 'Paste the notes when the meeting has no transcript. Actions, risks, issues and decisions are found from them.', 'Agreed: move go-live to 14 March. Action: PMO analyst to update the plan by Friday.'),
  t('public.comm_meeting_items.due_date', 'Due date', 'When the action should be done.', '{example_date}', 'Dates show as {date_format}.'),
  // Record lifecycle
  t('public.record_lifecycle_configs.table_name', 'Table', 'The kind of record these lifecycle rules apply to.', 'Risks'),
  t('public.record_lifecycle_configs.approval_mode', 'Level approval mode', 'Whether one approver at each level is enough, or everyone at that level must approve.', 'Any one at each level'),
  // Registers, RACI, resources, misc
  t('public.local_registers.register_name', 'Register name', 'The name people see in menus and lists.', 'Site access log'),
  t('public.local_registers.description', 'Description', 'What the register records and who uses it.', 'Everyone who enters the site: visitor, host, time in and time out.'),
  t('public.raci_matrices.matrix_name', 'Matrix name', 'A name for this RACI matrix.', 'Go-live weekend RACI'),
  t('public.resource_conflicts.resolution_notes', 'Resolution notes', 'How the clash was resolved, for the record.', 'Moved the analyst’s testing work to the week after; both managers agreed.'),
  t('public.user_feedback.rating', 'Rating', 'How you rate your experience, from 1 (poor) to 5 (excellent).', '4'),
  t('public.form_completed_examples.name', 'Name', 'A name for this worked example so people can pick it.', 'Example — small office move'),
  t('public.form_completed_examples.description', 'Description', 'What the example shows and when it is useful.', 'A filled-in form for a 3-month project with one supplier.'),
  t('public.form_imports.sheet_name', 'Sheet', 'Which sheet of the workbook to read.', 'Sheet1'),
  t('public.form_translations.language_code', 'Target language', 'The language the uploaded translations are for.', 'French'),
  t('public.risk_categories.category_name', 'Name', 'The risk category’s name, as people will see it when they classify a risk.', 'Supplier'),
  t('public.role_skills.role_id', 'Role', 'The role the skill is linked to.', 'Business Analyst'),
  t('public.procurement_management_plans.plan_date', 'Plan date', 'The date of this version of the procurement plan.', '{example_date}', 'Dates show as {date_format}.'),
  t('public.trial_upgrades.team_size', 'Number of team members', 'How many people will use the project. It sets the plan size and price.', '12'),
]

// Simulator copies use sim.<table>.<column> keys; alias each to its public row (this module's or an existing one).
import fs from 'node:fs'
const missingPath = new URL('./_sim_aliases_4s.json', import.meta.url)
export const ALIASES = fs.existsSync(missingPath) ? JSON.parse(fs.readFileSync(missingPath, 'utf8')) : []
