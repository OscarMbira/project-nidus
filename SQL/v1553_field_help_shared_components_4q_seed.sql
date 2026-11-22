-- ============================================================================
-- v1345 wave 4q — shared-package screens
-- ============================================================================
-- Generated from scripts/field-help-content/shared_components_4q.mjs by scripts/field-help-content/build-sql.mjs (v1345 slice 2).
-- 38 help entries, module_code 'shared_components'. Register keys fall back to the common
-- register:*:<field_key> help when a register has no entry of its own (S2-D1).
-- Examples follow CLAUDE.md rule 77. Drafted by Claude for owner sample review (G-D5).
-- Idempotent: re-running refreshes the text. Prerequisites: v1490, v1491.
-- ============================================================================

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.form_templates.name', 'Form name', 'The name people see when they choose this form. Say what the form is for.', '- Supplier site visit checklist', NULL, NULL, 'shared_components'),
  ('public.ai_plan_requests.industry_template', 'Industry template', 'The industry the plan follows. The draft uses that industry’s usual phases and deliverables.', '- Construction', NULL, NULL, 'shared_components'),
  ('public.ai_plan_requests.description', 'Describe the plan you need', 'What the project delivers, its rough length and any fixed dates. The more you say, the closer the first draft.', '- A 6-month office move for 120 staff, with a go-live weekend in March and IT cutover the week before.', NULL, 'The draft is a starting point — review every task before you use it.', 'shared_components'),
  ('public.schedule_baselines.approval_notes', 'Why are you approving it?', 'Your reason for approving this baseline. It is kept with the approval for audit.', '- Steering committee approved the re-plan on 10 Oct after change request CR-0012.', NULL, NULL, 'shared_components'),
  ('public.subscription_cancellations.details', 'Additional details', 'Anything that would help us understand why you are cancelling.', '- We moved our projects to a tool our parent company already uses.', NULL, NULL, 'shared_components'),
  ('public.local_register_custom_fields.field_key', 'Field name', 'A short internal name for the field, used in exports and integrations. Lower case, no spaces.', '- supplier_rating', 'Letters, numbers and underscores only.', NULL, 'shared_components'),
  ('public.local_register_custom_fields.field_label', 'Label', 'The label people see on the form and in lists.', '- Supplier rating', NULL, NULL, 'shared_components'),
  ('public.local_register_custom_fields.field_type', 'Field type', 'What kind of value the field holds. It decides the input people get (text box, date, dropdown …).', '- Dropdown', NULL, NULL, 'shared_components'),
  ('public.local_register_custom_fields.dropdown_options', 'Dropdown values', 'The choices people can pick from, one per line.', E'- Gold\nSilver\nBronze', NULL, NULL, 'shared_components'),
  ('public.record_authorisation_requests.notes', 'Justification', 'Why you are approving, rejecting or requesting this change. It is kept with the decision.', '- Budget increase agreed at the 3 March board; within the sponsor’s delegated limit.', NULL, NULL, 'shared_components'),
  ('public.record_holds.hold_reason', 'Reason for hold', 'Why this record is being put on hold, so you or a colleague can pick it up later.', '- Waiting for the supplier’s revised quote.', NULL, NULL, 'shared_components'),
  ('public.custom_field_settings.default_value', 'Default value', 'The value a new record starts with. People can still change it.', '- Medium', NULL, NULL, 'shared_components'),
  ('public.custom_field_settings.allowed_characters', 'Allowed characters', 'Which characters people may type in this field.', '- Letters and numbers', NULL, NULL, 'shared_components'),
  ('public.custom_field_settings.allowed_characters_custom', 'Characters allowed', 'The exact characters people may type when you choose your own set.', '- ABCDEFGHJKLMNPRSTUVWXYZ0123456789-', NULL, NULL, 'shared_components'),
  ('public.field_help_definitions.purpose', 'What is this field for?', 'One or two sentences that tell people what to enter and why. Shown when they open the field’s help.', '- The supplier’s overall rating from the last quarterly review.', NULL, NULL, 'shared_components'),
  ('public.field_help_definitions.example', 'Example of a good value', 'A realistic example of a good answer.', '- Gold', NULL, NULL, 'shared_components'),
  ('public.field_help_definitions.format', 'Format', 'Any rule about how to write the value, if there is one.', '- One word: Gold, Silver or Bronze.', NULL, NULL, 'shared_components'),
  ('public.requirements.verification_method', 'Verification method', 'How you will prove the requirement is met.', '- Test', NULL, NULL, 'shared_components'),
  ('public.requirements.owner', 'Owner', 'The person or role responsible for the requirement.', '- Head of Finance', NULL, NULL, 'shared_components'),
  ('public.requirements.nfr_area', 'Non-functional area', 'Which quality the requirement is about, for non-functional requirements.', '- Performance', NULL, NULL, 'shared_components'),
  ('public.requirements.rationale', 'Rationale', 'Why the requirement exists — the need or rule behind it.', '- Branch staff must serve a customer within 2 minutes during the lunchtime peak.', NULL, NULL, 'shared_components'),
  ('public.tier_field_customisations.field_code', 'Code', 'A short internal code for the field at this level. Lower case, no spaces.', '- funding_source', 'Letters, numbers and underscores only.', NULL, 'shared_components'),
  ('public.tier_field_customisations.field_label', 'Label', 'The label people see on forms at this level.', '- Funding source', NULL, NULL, 'shared_components'),
  ('public.tier_field_customisations.field_type', 'Type', 'What kind of value the field holds.', '- Text', NULL, NULL, 'shared_components'),
  ('public.ai_saved_reports.name', 'Report name', 'A name for this saved answer, so you can find and run it again.', '- Open high risks by project', NULL, NULL, 'shared_components'),
  ('public.report_templates.name', 'Report name', 'The name people see in the list of saved reports.', '- Overdue actions by owner', NULL, NULL, 'shared_components'),
  ('public.report_templates.description', 'Description', 'What the report shows and who it is for.', '- Actions past their due date, grouped by owner, for the weekly PMO call.', NULL, NULL, 'shared_components'),
  ('public.report_layouts.name', 'Layout name', 'The name of this report layout.', '- Monthly highlight report', NULL, NULL, 'shared_components'),
  ('public.report_layouts.status', 'Status', 'Draft layouts are not used yet; published layouts are used when reports are written.', '- Published', NULL, NULL, 'shared_components'),
  ('public.report_layouts.tier', 'Applies to', 'Whether the layout is for the whole organisation or one project.', '- The whole organisation', NULL, NULL, 'shared_components'),
  ('public.report_layouts.project_id', 'Project', 'The project this layout is for, when it applies to one project only.', '- The project it is for', NULL, NULL, 'shared_components'),
  ('public.report_layouts.description', 'Description', 'When to use this layout.', '- Use for monthly reports to the steering committee.', NULL, NULL, 'shared_components'),
  ('public.report_layouts.section_instruction', 'Instruction', 'Guidance for this section: what it should cover and how long it should be.', '- Two or three sentences on schedule status, naming any milestone at risk.', NULL, NULL, 'shared_components'),
  ('public.local_register_templates.replace_template_id', 'Save as', 'Save as a new template, or replace one of your organisation’s existing templates for this register.', '- A new template', NULL, NULL, 'shared_components'),
  ('public.runbook_sequence_overrides.reason', 'Reason', 'Why you are starting this step before the earlier ones are finished. It is kept on the runbook for audit.', '- The data team confirmed the extract is ready; the checkpoint call is just a formality.', NULL, NULL, 'shared_components'),
  ('public.timesheet_reminders.period_start', 'From', 'The first day of the timesheet period you are reminding people about.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'shared_components'),
  ('public.timesheet_reminders.period_end', 'To', 'The last day of the timesheet period you are reminding people about.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'shared_components'),
  ('public.timesheet_entry_flags.note', 'Note', 'Anything that helps the person fix the flagged time.', '- Please split the 9 hours on Tuesday between design and testing.', NULL, NULL, 'shared_components')
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
  ('sim.form_templates.name', 'public.form_templates.name')
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;

-- Check: entries written by this file
SELECT count(*) AS help_entries FROM public.field_help WHERE module_code = 'shared_components' AND is_active;
