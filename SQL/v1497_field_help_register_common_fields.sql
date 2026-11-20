-- ============================================================================
-- v1497: Field help — common register fields, wave 1 (v1345 slice 2, S2-D1 / S2-D2)
-- ============================================================================
-- One help entry per common register field key (register:*:<field_key>), used by every register
-- that has the field unless that register gets its own register:<register_key>:<field_key> entry.
-- These 105 keys appear in five or more registers and cover about 1,080 register fields.
-- Text is generic enough for any register that uses the key. Rules (required, allowed values)
-- come from the field definition (G-D7); dates follow the organisation's format (G-D6).
-- Examples follow CLAUDE.md rule 77: role titles, fictional organisations, familiar places.
-- Drafted by Claude for owner sample review (G-D5). Idempotent: re-running refreshes the text.
-- Prerequisite: v1490.
-- ============================================================================

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  -- People
  ('register:*:owner', 'Owner', 'The person accountable for this item: they make sure it is done and keep it up to date.', E'- Head of Finance\n- Cutover Manager', NULL, 'Pick a user from your organisation.', 'registers_common'),
  ('register:*:business_owner', 'Business owner', 'The person in the business who owns the outcome and signs it off.', E'- Head of Retail Operations\n- Finance Director', NULL, 'Pick a user from your organisation.', 'registers_common'),
  ('register:*:document_owner', 'Document owner', 'The person responsible for keeping this document accurate and current.', E'- Programme Manager\n- Test Manager', NULL, NULL, 'registers_common'),
  ('register:*:lead', 'Lead', 'The person leading this piece of work day to day.', E'- Workstream Lead\n- Lead Business Analyst', NULL, NULL, 'registers_common'),
  ('register:*:chair', 'Chair', 'The person who chairs the meeting or board and confirms its decisions.', E'- Project Sponsor\n- Head of Operations', NULL, NULL, 'registers_common'),
  ('register:*:responsible', 'Responsible', 'Who does the work for this item.', E'- Integration Team\n- Site Engineer', NULL, NULL, 'registers_common'),
  ('register:*:raised_by', 'Raised by', 'Who first reported or recorded this item.', E'- Test Analyst\n- Branch Supervisor, London', NULL, NULL, 'registers_common'),
  ('register:*:approved_by', 'Approved by', 'Who gave the approval or made the decision.', E'- Project Board\n- Change Advisory Board', NULL, NULL, 'registers_common'),
  ('register:*:signed_off_by', 'Signed off by', 'The person who formally accepted this item as complete.', E'- Head of Finance\n- Quality Manager', NULL, NULL, 'registers_common'),
  ('register:*:verified_by', 'Verified by', 'The person who checked the result independently of whoever did the work.', E'- Quality Assurance Lead\n- Independent Reviewer', NULL, NULL, 'registers_common'),
  ('register:*:confirmed_by', 'Confirmed by', 'The person who confirmed the information is correct.', E'- Operations Manager\n- Data Owner', NULL, NULL, 'registers_common'),
  ('register:*:signoff_owner', 'Sign-off coordinator', 'The person who gathers the sign-offs and chases outstanding ones.', E'- PMO Analyst\n- Release Manager', NULL, NULL, 'registers_common'),
  ('register:*:assessor', 'Assessor', 'The person or team who carried out the assessment.', E'- Lead Assessor\n- Internal Audit Team', NULL, NULL, 'registers_common'),
  ('register:*:reviewer', 'Reviewer', 'The person who reviewed this item.', E'- Senior Architect\n- Compliance Officer', NULL, NULL, 'registers_common'),
  ('register:*:contractor', 'Contractor', 'The company carrying out the work under contract.', E'- Example Build Ltd\n- Example Electrical Services (Dubai)', NULL, NULL, 'registers_common'),
  ('register:*:company', 'Company', 'The company this item relates to.', E'- Example Freight Ltd\n- Example Bank (Singapore)', NULL, NULL, 'registers_common'),
  ('register:*:approvers', 'Approvers', 'Everyone who must approve, one row each, with their decision.', E'- Head of Finance – Approved\n- Head of IT – Pending', NULL, 'Add one approver per row.', 'registers_common'),

  -- Dates
  ('register:*:due_date', 'Due date', 'The date this item must be finished by.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_common'),
  ('register:*:start_date', 'Start date', 'The date the work starts.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_common'),
  ('register:*:end_date', 'End date', 'The date the work ends.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_common'),
  ('register:*:planned_start', 'Planned start', 'The date the work is planned to start.', E'- {example_date}', 'Dates show as {date_format}.', 'Compare with the actual start to see slippage.', 'registers_common'),
  ('register:*:planned_end', 'Planned end', 'The date the work is planned to finish.', E'- {example_date}', 'Dates show as {date_format}.', 'Compare with the actual end to see slippage.', 'registers_common'),
  ('register:*:actual_start', 'Actual start', 'The date the work really started.', E'- {example_date}', 'Dates show as {date_format}.', 'Leave empty until it has started.', 'registers_common'),
  ('register:*:actual_end', 'Actual end', 'The date the work really finished.', E'- {example_date}', 'Dates show as {date_format}.', 'Leave empty until it has finished.', 'registers_common'),
  ('register:*:planned_date', 'Planned date', 'The date this is planned to happen.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_common'),
  ('register:*:actual_date', 'Actual date', 'The date this really happened.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_common'),
  ('register:*:approval_date', 'Approval date', 'The date approval was given.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_common'),
  ('register:*:decision_date', 'Decision date', 'The date the decision was made.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_common'),
  ('register:*:sign_off_date', 'Sign-off date', 'The date this was formally signed off.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_common'),
  ('register:*:review_date', 'Review date', 'The date the review took place.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_common'),
  ('register:*:next_review_date', 'Next review date', 'When this item should next be reviewed.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_common'),
  ('register:*:assessment_date', 'Assessment date', 'The date the assessment was carried out.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_common'),
  ('register:*:raised_date', 'Raised date', 'The date this item was first reported or recorded.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_common'),
  ('register:*:requested_date', 'Requested date', 'The date the request was made.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_common'),
  ('register:*:completed_date', 'Completed date', 'The date this item was completed.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_common'),
  ('register:*:closed_date', 'Closed date', 'The date this item was closed.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_common'),
  ('register:*:confirmation_date', 'Confirmation date', 'The date the information was confirmed.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_common'),

  -- Classification
  ('register:*:priority', 'Priority', 'How urgent or important this item is compared with others.', E'- High: needed for go-live\n- Low: can wait for a later release', NULL, NULL, 'registers_common'),
  ('register:*:severity', 'Severity', 'How serious the impact is if this is not dealt with.', E'- Critical: business cannot operate\n- Minor: a workaround exists', NULL, NULL, 'registers_common'),
  ('register:*:category', 'Category', 'The group this item belongs to, used for filtering and reports.', E'- Data\n- Training', NULL, NULL, 'registers_common'),
  ('register:*:overall_rag', 'Overall RAG', 'The overall health of this item at a glance.', E'- Green: on track\n- Amber: at risk, action under way\n- Red: off track, needs a decision', NULL, NULL, 'registers_common'),
  ('register:*:rag_status', 'RAG status', 'Whether this item is on track (green), at risk (amber) or off track (red).', E'- Green: on track\n- Red: off track, needs a decision', NULL, NULL, 'registers_common'),
  ('register:*:decision', 'Decision', 'The outcome that was decided.', E'- Approved\n- Approved with conditions\n- Rejected', NULL, NULL, 'registers_common'),
  ('register:*:audit_opinion', 'Audit opinion', 'The auditor''s overall conclusion.', E'- Satisfactory\n- Needs improvement', NULL, NULL, 'registers_common'),
  ('register:*:discipline', 'Discipline', 'The professional discipline or trade this item belongs to.', E'- Civil\n- Electrical', NULL, NULL, 'registers_common'),
  ('register:*:test_type', 'Test type', 'The kind of testing this item is about.', E'- System integration testing\n- User acceptance testing', NULL, NULL, 'registers_common'),
  ('register:*:signoff_type', 'Sign-off type', 'What area or kind of sign-off this is.', E'- Business sign-off\n- Technical sign-off', NULL, NULL, 'registers_common'),
  ('register:*:cutover_event', 'Cutover event', 'Which cutover event or rehearsal this item relates to.', E'- Dress rehearsal 1\n- Go-live weekend', NULL, NULL, 'registers_common'),
  ('register:*:cutover_phase', 'Cutover phase', 'The stage of the cutover this item belongs to.', E'- Pre-cutover\n- Cutover weekend\n- Post go-live', NULL, NULL, 'registers_common'),
  ('register:*:environment', 'Environment', 'The system environment this item applies to.', E'- UAT\n- Production', NULL, NULL, 'registers_common'),
  ('register:*:functional_area', 'Functional area', 'The business function this item belongs to.', E'- Payments\n- Lending', NULL, NULL, 'registers_common'),
  ('register:*:product_area', 'Product area', 'The product or data area this item covers.', E'- Deposits\n- Cards', NULL, NULL, 'registers_common'),
  ('register:*:component', 'Component', 'The system or component this item concerns.', E'- Core banking\n- Payments gateway', NULL, NULL, 'registers_common'),
  ('register:*:workstream', 'Workstream', 'The workstream responsible for this item.', E'- Data migration\n- Training', NULL, NULL, 'registers_common'),
  ('register:*:business_unit', 'Business unit', 'The part of the organisation this item affects or is aimed at.', E'- Retail banking\n- Head office, London', NULL, NULL, 'registers_common'),
  ('register:*:zone', 'Zone', 'The site zone or area this item is in.', E'- Zone A – North car park\n- Level 2 plant room', NULL, NULL, 'registers_common'),
  ('register:*:programme', 'Programme', 'The programme this item belongs to.', E'- Example Digital Transformation Programme', NULL, NULL, 'registers_common'),
  ('register:*:package', 'Package', 'The work package, contract package or package of works this item belongs to.', E'- Package 3 – Mechanical works\n- Release 2 package', NULL, NULL, 'registers_common'),

  -- References
  ('register:*:report_reference', 'Report reference', 'The reference of the report this item comes from or links to.', E'- RPT-2027-014', NULL, NULL, 'registers_common'),
  ('register:*:document_reference', 'Document reference', 'The unique reference of this document.', E'- DOC-MIG-003', NULL, NULL, 'registers_common'),
  ('register:*:document_version', 'Document version', 'The version number of the document.', E'- 1.0\n- 2.3', NULL, 'Increase it each time the document is reissued.', 'registers_common'),
  ('register:*:test_reference', 'Test reference', 'The reference of the test case or test evidence.', E'- TC-PAY-021', NULL, NULL, 'registers_common'),
  ('register:*:signoff_reference', 'Sign-off reference', 'The reference of the sign-off record.', E'- SO-UAT-005', NULL, NULL, 'registers_common'),
  ('register:*:readiness_reference', 'Readiness reference', 'The reference of the readiness assessment.', E'- RDY-GL-002', NULL, NULL, 'registers_common'),
  ('register:*:certificate_reference', 'Certificate reference', 'The number of the certificate issued.', E'- CERT-2027-118', NULL, NULL, 'registers_common'),
  ('register:*:course_code', 'Course code', 'The code of the training course.', E'- TRN-101', NULL, NULL, 'registers_common'),

  -- Places, units, systems
  ('register:*:location', 'Location', 'Where this item is, or where the work takes place.', E'- London head office\n- Dubai branch', NULL, NULL, 'registers_common'),
  ('register:*:unit', 'Unit', 'The unit of measure, or the organisational unit, this item is counted in.', E'- m³\n- Number of staff', NULL, NULL, 'registers_common'),
  ('register:*:system', 'System', 'The IT system this item relates to.', E'- Core banking system\n- HR system', NULL, NULL, 'registers_common'),
  ('register:*:activity', 'Activity', 'The activity being carried out.', E'- Data reconciliation\n- Concrete pour, Level 3', NULL, NULL, 'registers_common'),

  -- Numbers and money
  ('register:*:budget', 'Budget', 'The approved budget for this item.', E'- 250,000', 'Amounts show in {currency}.', NULL, 'registers_common'),
  ('register:*:percent_complete', 'Percent complete', 'How much of the work is done, as a percentage.', E'- 0 when not started\n- 100 when finished', NULL, NULL, 'registers_common'),
  ('register:*:passed', 'Passed', 'How many tests or checks passed.', E'- 48', NULL, NULL, 'registers_common'),
  ('register:*:pass_rate', 'Pass rate', 'The share of tests or checks that passed, as a percentage.', E'- 96', NULL, NULL, 'registers_common'),
  ('register:*:exit_criteria_met', 'Exit criteria met', 'Tick when every exit criterion has been met.', E'- Ticked: ready to move to the next stage', NULL, NULL, 'registers_common'),

  -- Text and lists
  ('register:*:notes', 'Notes', 'Anything else worth recording about this item.', E'- Waiting for supplier confirmation\n- Agreed at the weekly review in Cairo', NULL, NULL, 'registers_common'),
  ('register:*:purpose', 'Purpose', 'Why this exists and what it is meant to achieve.', E'- Confirm the system is ready for go-live', NULL, NULL, 'registers_common'),
  ('register:*:scope', 'Scope', 'What this covers.', E'- All branches in the London region\n- Customer and account data', NULL, 'One item per line.', 'registers_common'),
  ('register:*:in_scope', 'In scope', 'What is included.', E'- Retail customer accounts\n- Card transactions', NULL, 'One item per line.', 'registers_common'),
  ('register:*:out_of_scope', 'Out of scope', 'What is deliberately not included.', E'- Historic data older than 7 years\n- Corporate accounts', NULL, 'One item per line.', 'registers_common'),
  ('register:*:objectives', 'Objectives', 'What this aims to achieve.', E'- Prove payments work end to end\n- Confirm data is complete', NULL, 'One objective per line.', 'registers_common'),
  ('register:*:assumptions', 'Assumptions', 'Things taken as true for planning that have not been confirmed.', E'- Test environment available from week 2\n- Supplier staff on site in Dubai', NULL, 'One assumption per line.', 'registers_common'),
  ('register:*:constraints', 'Constraints', 'Limits the work must respect.', E'- No changes during month-end\n- Budget fixed at the approved amount', NULL, 'One constraint per line.', 'registers_common'),
  ('register:*:dependencies', 'Dependencies', 'Other work this item relies on.', E'- Network upgrade finished\n- Data cleansing signed off', NULL, 'One dependency per line.', 'registers_common'),
  ('register:*:conditions', 'Conditions', 'Conditions or caveats attached to this item.', E'- Approved provided the backup test passes', NULL, 'One condition per line.', 'registers_common'),
  ('register:*:exit_criteria', 'Exit criteria', 'What must be true before this stage can close.', E'- No open critical defects\n- All test cases run', NULL, 'One criterion per line.', 'registers_common'),
  ('register:*:open_issues', 'Open issues', 'Problems still unresolved.', E'- Two interface errors awaiting a fix', NULL, 'One issue per line.', 'registers_common'),
  ('register:*:related_documents', 'Related documents', 'Other documents linked to this item.', E'- Cutover plan v2.1\n- Test strategy', NULL, 'One document per line.', 'registers_common'),
  ('register:*:decision_comments', 'Decision comments', 'The reasons and remarks recorded with the decision.', E'- Go-live approved; monitor payments closely for 48 hours', NULL, NULL, 'registers_common'),
  ('register:*:root_cause', 'Root cause', 'The underlying reason the problem happened.', E'- Mapping rule missing for closed accounts', NULL, NULL, 'registers_common'),

  -- Tables
  ('register:*:evidence', 'Evidence', 'The evidence that supports this item, one row each.', E'- Test report – TC-PAY-021 – passed', NULL, 'Add one piece of evidence per row.', 'registers_common'),
  ('register:*:evidence_reviewed', 'Evidence reviewed', 'The evidence looked at before deciding, one row each.', E'- UAT summary report – reviewed', NULL, 'Add one item per row.', 'registers_common'),
  ('register:*:issues', 'Issues', 'Issues raised, one row each.', E'- Slow batch run – Medium – Integration Team', NULL, 'Add one issue per row.', 'registers_common'),
  ('register:*:checks', 'Checks', 'Checks to carry out, one row each.', E'- Backups complete – Done', NULL, 'Add one check per row.', 'registers_common'),
  ('register:*:actions', 'Actions', 'Follow-up actions, one row each, with owner and date.', E'- Fix interface error – Integration Team – {example_date}', NULL, 'Add one action per row.', 'registers_common'),
  ('register:*:findings', 'Findings', 'What the review or audit found, one row each.', E'- Two accounts not reconciled – Medium', NULL, 'Add one finding per row.', 'registers_common'),
  ('register:*:risks_issues', 'Risks and issues', 'Risks and issues linked to this item, one row each.', E'- Supplier delay – Risk – High', NULL, 'Add one per row.', 'registers_common'),
  ('register:*:risks_mitigations', 'Risks and mitigations', 'Each risk with what is being done about it.', E'- Key staff unavailable – Train a backup', NULL, 'Add one risk per row.', 'registers_common'),
  ('register:*:defects', 'Defects', 'Defects raised or related to this item, one row each.', E'- DEF-204 – Wrong fee calculated – High', NULL, 'Add one defect per row.', 'registers_common'),
  ('register:*:gaps_and_actions', 'Gaps and actions', 'Gaps found and the action to close each one.', E'- No trained support staff in Cairo – Run training session', NULL, 'Add one gap per row.', 'registers_common'),
  ('register:*:readiness_checks', 'Readiness checks', 'The readiness checks and their results, one row each.', E'- Support rota agreed – Met', NULL, 'Add one check per row.', 'registers_common'),
  ('register:*:roles_and_responsibilities', 'Roles and responsibilities', 'Who does what, one role per row.', E'- Cutover Manager – Runs the cutover – Head of Operations', NULL, 'Add one role per row.', 'registers_common'),
  ('register:*:version_history', 'Version history', 'Each version of the document, with date and what changed.', E'- 1.1 – {example_date} – Added rollback steps', NULL, 'Add one version per row.', 'registers_common'),
  ('register:*:glossary', 'Glossary', 'Terms used in the document and what they mean.', E'- UAT – User acceptance testing', NULL, 'Add one term per row.', 'registers_common'),
  ('register:*:appendices', 'Appendices', 'Attachments or appendices, with title and where to find them.', E'- Appendix A – Data mapping – Shared drive link', NULL, 'Add one appendix per row.', 'registers_common')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title,
  purpose = EXCLUDED.purpose,
  examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes,
  extra_notes = EXCLUDED.extra_notes,
  module_code = EXCLUDED.module_code,
  is_active = TRUE;

-- Check: how many common entries, and how many register fields they now cover
SELECT
  (SELECT count(*) FROM public.field_help WHERE module_code = 'registers_common' AND is_active) AS common_entries,
  (SELECT count(*) FROM public.local_register_fields f
     WHERE EXISTS (SELECT 1 FROM public.field_help h
                   WHERE h.help_key = 'register:*:' || f.field_key AND h.is_active)) AS platform_register_fields_covered,
  (SELECT count(*) FROM public.local_register_fields) AS platform_register_fields_total;
