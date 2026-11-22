// v1345 slice 4, wave 4q — shared-package screens (packages/ui, packages/planning, packages/shared, PMO modules).
// These components render in Platform, Simulator and (where used) Planner, so their keys are public.* and read by
// every app. Simulator copies of the PMO module pages use sim.* keys aliased to these rows.
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word that means "inside" (SQL editor trap).
const t = (key, title, purpose, ex, fmt = null, extra = null) => [key, title, purpose, [ex], fmt, extra]

export const MODULE = 'shared_components'
export const ROWS = [
  // PMO: blank organisational form
  t('public.form_templates.name', 'Form name', 'The name people see when they choose this form. Say what the form is for.', 'Supplier site visit checklist'),
  // AI plan generator
  t('public.ai_plan_requests.industry_template', 'Industry template', 'The industry the plan follows. The draft uses that industry’s usual phases and deliverables.', 'Construction'),
  t('public.ai_plan_requests.description', 'Describe the plan you need', 'What the project delivers, its rough length and any fixed dates. The more you say, the closer the first draft.', 'A 6-month office move for 120 staff, with a go-live weekend in March and IT cutover the week before.', null, 'The draft is a starting point — review every task before you use it.'),
  // Baselines
  t('public.schedule_baselines.approval_notes', 'Why are you approving it?', 'Your reason for approving this baseline. It is kept with the approval for audit.', 'Steering committee approved the re-plan on 10 Oct after change request CR-0012.'),
  // Subscription cancellation
  t('public.subscription_cancellations.details', 'Additional details', 'Anything that would help us understand why you are cancelling.', 'We moved our projects to a tool our parent company already uses.'),
  // Register custom fields (add field panel)
  t('public.local_register_custom_fields.field_key', 'Field name', 'A short internal name for the field, used in exports and integrations. Lower case, no spaces.', 'supplier_rating', 'Letters, numbers and underscores only.'),
  t('public.local_register_custom_fields.field_label', 'Label', 'The label people see on the form and in lists.', 'Supplier rating'),
  t('public.local_register_custom_fields.field_type', 'Field type', 'What kind of value the field holds. It decides the input people get (text box, date, dropdown …).', 'Dropdown'),
  t('public.local_register_custom_fields.dropdown_options', 'Dropdown values', 'The choices people can pick from, one per line.', 'Gold\nSilver\nBronze'),
  // Authorisation / hold
  t('public.record_authorisation_requests.notes', 'Justification', 'Why you are approving, rejecting or requesting this change. It is kept with the decision.', 'Budget increase agreed at the 3 March board; within the sponsor’s delegated limit.'),
  t('public.record_holds.hold_reason', 'Reason for hold', 'Why this record is being put on hold, so you or a colleague can pick it up later.', 'Waiting for the supplier’s revised quote.'),
  // Custom field settings
  t('public.custom_field_settings.default_value', 'Default value', 'The value a new record starts with. People can still change it.', 'Medium'),
  t('public.custom_field_settings.allowed_characters', 'Allowed characters', 'Which characters people may type in this field.', 'Letters and numbers'),
  t('public.custom_field_settings.allowed_characters_custom', 'Characters allowed', 'The exact characters people may type when you choose your own set.', 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789-'),
  // Help for user-defined fields (FieldHelpInputs)
  t('public.field_help_definitions.purpose', 'What is this field for?', 'One or two sentences that tell people what to enter and why. Shown when they open the field’s help.', 'The supplier’s overall rating from the last quarterly review.'),
  t('public.field_help_definitions.example', 'Example of a good value', 'A realistic example of a good answer.', 'Gold'),
  t('public.field_help_definitions.format', 'Format', 'Any rule about how to write the value, if there is one.', 'One word: Gold, Silver or Bronze.'),
  // Requirements extras
  t('public.requirements.verification_method', 'Verification method', 'How you will prove the requirement is met.', 'Test'),
  t('public.requirements.owner', 'Owner', 'The person or role responsible for the requirement.', 'Head of Finance'),
  t('public.requirements.nfr_area', 'Non-functional area', 'Which quality the requirement is about, for non-functional requirements.', 'Performance'),
  t('public.requirements.rationale', 'Rationale', 'Why the requirement exists — the need or rule behind it.', 'Branch staff must serve a customer within 2 minutes during the lunchtime peak.'),
  // Tier field customisation
  t('public.tier_field_customisations.field_code', 'Code', 'A short internal code for the field at this level. Lower case, no spaces.', 'funding_source', 'Letters, numbers and underscores only.'),
  t('public.tier_field_customisations.field_label', 'Label', 'The label people see on forms at this level.', 'Funding source'),
  t('public.tier_field_customisations.field_type', 'Type', 'What kind of value the field holds.', 'Text'),
  // Ask Nidus / reports
  t('public.ai_saved_reports.name', 'Report name', 'A name for this saved answer, so you can find and run it again.', 'Open high risks by project'),
  t('public.report_templates.name', 'Report name', 'The name people see in the list of saved reports.', 'Overdue actions by owner'),
  t('public.report_templates.description', 'Description', 'What the report shows and who it is for.', 'Actions past their due date, grouped by owner, for the weekly PMO call.'),
  t('public.report_layouts.name', 'Layout name', 'The name of this report layout.', 'Monthly highlight report'),
  t('public.report_layouts.status', 'Status', 'Draft layouts are not used yet; published layouts are used when reports are written.', 'Published'),
  t('public.report_layouts.tier', 'Applies to', 'Whether the layout is for the whole organisation or one project.', 'The whole organisation'),
  t('public.report_layouts.project_id', 'Project', 'The project this layout is for, when it applies to one project only.', 'The project it is for'),
  t('public.report_layouts.description', 'Description', 'When to use this layout.', 'Use for monthly reports to the steering committee.'),
  t('public.report_layouts.section_instruction', 'Instruction', 'Guidance for this section: what it should cover and how long it should be.', 'Two or three sentences on schedule status, naming any milestone at risk.'),
  // Register templates
  t('public.local_register_templates.replace_template_id', 'Save as', 'Save as a new template, or replace one of your organisation’s existing templates for this register.', 'A new template'),
  // Runbook sequence override
  t('public.runbook_sequence_overrides.reason', 'Reason', 'Why you are starting this step before the earlier ones are finished. It is kept on the runbook for audit.', 'The data team confirmed the extract is ready; the checkpoint call is just a formality.'),
  // Timesheets
  t('public.timesheet_reminders.period_start', 'From', 'The first day of the timesheet period you are reminding people about.', '{example_date}', 'Dates show as {date_format}.'),
  t('public.timesheet_reminders.period_end', 'To', 'The last day of the timesheet period you are reminding people about.', '{example_date}', 'Dates show as {date_format}.'),
  t('public.timesheet_entry_flags.note', 'Note', 'Anything that helps the person fix the flagged time.', 'Please split the 9 hours on Tuesday between design and testing.'),
]

export const ALIASES = [
  ['sim.form_templates.name', 'public.form_templates.name'],
]
