-- ============================================================================
-- v1345 slice 4 wave 4b — change control field help
-- ============================================================================
-- Generated from scripts/field-help-content/change_control.mjs by scripts/field-help-content/build-sql.mjs (v1345 slice 2).
-- 60 help entries, module_code 'change_control'. Register keys fall back to the common
-- register:*:<field_key> help when a register has no entry of its own (S2-D1).
-- Examples follow CLAUDE.md rule 77. Drafted by Claude for owner sample review (G-D5).
-- Idempotent: re-running refreshes the text. Prerequisites: v1490.
-- ============================================================================

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.change_requests.change_title', 'Change title', 'A short name that says what change is requested.', '- Add a second identity check for business accounts', NULL, NULL, 'change_control'),
  ('public.change_requests.change_description', 'Change description', 'The change in full: what would be different afterwards.', '- Business account opening adds a company registry check before the account is approved.', NULL, NULL, 'change_control'),
  ('public.change_requests.change_category', 'Change category', 'The area the change mainly affects.', '- Scope', NULL, NULL, 'change_control'),
  ('public.change_requests.change_type', 'Change type', 'Why the change is needed: an enhancement, a defect fix, a corrective or preventive action, or a regulatory requirement.', '- Regulatory Requirement', NULL, NULL, 'change_control'),
  ('public.change_requests.submission_date', 'Submission date', 'When the change request was submitted.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'change_control'),
  ('public.change_requests.approval_required_by_date', 'Approval needed by', 'The latest date a decision is needed without delaying the project.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'change_control'),
  ('public.change_requests.change_board_id', 'Change board', 'The group that will decide on this change.', '- Project Change Board', NULL, NULL, 'change_control'),
  ('public.change_requests.requestor_name', 'Requestor', 'The person asking for the change.', '- Head of Compliance', NULL, NULL, 'change_control'),
  ('public.change_requests.requestor_organization', 'Requestor’s organisation', 'The team or organisation the requestor belongs to.', '- Compliance department', NULL, NULL, 'change_control'),
  ('public.change_requests.owner_user_id', 'Change owner', 'The person responsible for taking the change through assessment and decision.', '- Project Manager', NULL, NULL, 'change_control'),
  ('public.change_requests.current_approver_user_id', 'Current approver', 'The person whose approval is needed next.', '- Project Executive', NULL, NULL, 'change_control'),
  ('public.change_requests.reason_for_change', 'Reason for change', 'What has prompted the change.', '- New anti-money-laundering rules from 1 July.', NULL, NULL, 'change_control'),
  ('public.change_requests.business_rationale', 'Business rationale', 'Why the change is worth making for the business.', '- Avoids regulatory fines and keeps business account opening open.', NULL, NULL, 'change_control'),
  ('public.change_requests.current_situation', 'Current situation', 'How things work today.', '- Business accounts are approved after a manual document check only.', NULL, NULL, 'change_control'),
  ('public.change_requests.proposed_solution', 'Proposed solution', 'How the change would be made.', '- Connect the account opening system to the company registry service.', NULL, NULL, 'change_control'),
  ('public.change_requests.alternative_solutions', 'Alternative solutions', 'Other ways the need could be met, and why they were not proposed.', '- Manual registry search by branch staff – too slow at peak times.', NULL, NULL, 'change_control'),
  ('public.change_requests.priority', 'Priority', 'How important the change is compared with others.', '- High', NULL, NULL, 'change_control'),
  ('public.change_requests.urgency', 'Urgency', 'How soon a decision is needed.', '- Urgent', NULL, NULL, 'change_control'),
  ('public.change_requests.business_criticality', 'Business criticality', 'How critical the change is to the business.', '- High', NULL, NULL, 'change_control'),
  ('public.change_requests.related_requirement_ids', 'Related requirements', 'The requirements this change adds to or alters.', '- FR-014, FR-022', NULL, NULL, 'change_control'),
  ('public.change_requests.notes', 'Notes', 'Anything else the assessors should know.', '- Compliance has a draft of the new checks.', NULL, NULL, 'change_control'),
  ('public.change_requests.status_reason', 'Status reason', 'Why the change is at its current status.', '- Waiting for the cost estimate from the supplier.', NULL, NULL, 'change_control'),
  ('public.change_requests.assessment_date', 'Assessment date', 'When the change was assessed.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'change_control'),
  ('public.change_requests.impact_level', 'Overall impact level', 'The overall size of the change’s impact on the project.', '- Medium', NULL, NULL, 'change_control'),
  ('public.change_requests.impact_summary', 'Impact summary', 'The main effects of the change, in a few lines.', '- Adds 10 days and 25,000 to the build stage; no effect on go-live.', NULL, NULL, 'change_control'),
  ('public.change_requests.schedule_impact_level', 'Schedule impact level', 'How much the change affects the schedule.', '- Low', NULL, NULL, 'change_control'),
  ('public.change_requests.schedule_impact_days', 'Schedule impact (days)', 'How many days the change adds (or saves, as a negative number).', '- 10', NULL, NULL, 'change_control'),
  ('public.change_requests.schedule_impact_description', 'Schedule impact description', 'How the schedule changes.', '- Build stage ends 10 days later; testing starts on the same date using float.', NULL, NULL, 'change_control'),
  ('public.change_requests.new_completion_date', 'New completion date', 'The project or stage end date if the change is approved.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'change_control'),
  ('public.change_requests.cost_impact_level', 'Cost impact level', 'How much the change affects cost.', '- Medium', NULL, NULL, 'change_control'),
  ('public.change_requests.cost_impact_amount', 'Cost impact', 'The extra cost of the change (negative for a saving).', '- 25,000', 'Amounts show in {currency}.', NULL, 'change_control'),
  ('public.change_requests.cost_impact_description', 'Cost impact description', 'What the extra cost is for.', '- Supplier configuration and registry service fees for one year.', NULL, NULL, 'change_control'),
  ('public.change_requests.funding_source', 'Funding source', 'Where the money for the change would come from.', '- Project contingency', NULL, NULL, 'change_control'),
  ('public.change_requests.scope_impact_level', 'Scope impact level', 'How much the change affects scope.', '- Low', NULL, NULL, 'change_control'),
  ('public.change_requests.scope_baseline_affected', 'Scope baseline affected', 'Tick if the agreed scope baseline must be updated.', '- Ticked', NULL, NULL, 'change_control'),
  ('public.change_requests.scope_impact_description', 'Scope impact description', 'How the scope changes.', '- Adds a registry check step to business account opening.', NULL, NULL, 'change_control'),
  ('public.change_requests.quality_impact_level', 'Quality impact level', 'How much the change affects quality.', '- Positive', NULL, NULL, 'change_control'),
  ('public.change_requests.quality_impact_description', 'Quality impact description', 'How quality changes.', '- Fewer business accounts opened with wrong company details.', NULL, NULL, 'change_control'),
  ('public.change_requests.benefits_impact_level', 'Benefits impact level', 'How much the change affects the expected benefits.', '- Neutral', NULL, NULL, 'change_control'),
  ('public.change_requests.benefits_impact_description', 'Benefits impact description', 'How the benefits change.', '- No change to cost savings; lower compliance risk.', NULL, NULL, 'change_control'),
  ('public.change_requests.resource_impact_level', 'Resource impact level', 'How much the change affects people and other resources.', '- Low', NULL, NULL, 'change_control'),
  ('public.change_requests.resource_hours_required', 'Resource hours required', 'Extra hours of work the change needs.', '- 120', NULL, NULL, 'change_control'),
  ('public.change_requests.resource_impact_description', 'Resource impact description', 'Who is needed and for how long.', '- One developer for three weeks; one tester for one week.', NULL, NULL, 'change_control'),
  ('public.change_requests.risk_mitigation_required', 'Risk mitigation required', 'Tick if the change brings risks that need their own response.', '- Ticked', NULL, NULL, 'change_control'),
  ('public.change_requests.risk_impact_description', 'Risk impact description', 'New risks the change brings, or risks it reduces.', '- Depends on the registry service being available; adds a supplier risk.', NULL, NULL, 'change_control'),
  ('public.change_requests.feasibility_rating', 'Feasibility', 'How practical the change is to make.', '- Feasible', NULL, NULL, 'change_control'),
  ('public.change_requests.feasibility_assessment', 'Feasibility assessment', 'Why the change is or is not practical.', '- The supplier has built the same link for another bank.', NULL, NULL, 'change_control'),
  ('public.change_requests.implementation_complexity', 'Implementation complexity', 'How complex the change is to put in place.', '- Medium', NULL, NULL, 'change_control'),
  ('public.change_requests.estimated_effort_hours', 'Estimated effort (hours)', 'The total work needed, in hours.', '- 160', NULL, NULL, 'change_control'),
  ('public.change_requests.estimated_duration_days', 'Estimated duration (days)', 'How long the change takes from start to finish.', '- 15', NULL, NULL, 'change_control'),
  ('public.change_requests.recommendation', 'Recommendation', 'What the assessor recommends the change board decides.', '- Approve with Conditions', NULL, NULL, 'change_control'),
  ('public.change_requests.recommendation_rationale', 'Recommendation rationale', 'Why that decision is recommended.', '- Needed for compliance; cost fits within contingency.', NULL, NULL, 'change_control'),
  ('public.change_requests.conditions', 'Conditions', 'Conditions to attach if the change is approved.', '- Supplier must confirm the registry service level before build starts.', NULL, NULL, 'change_control'),
  ('public.change_requests.overall_impact_severity', 'Impact severity', 'The overall severity of the change’s impact.', '- Medium', NULL, NULL, 'change_control'),
  ('public.change_requests.cost_impact_currency', 'Cost impact currency', 'The currency of the cost impact.', '- GBP', NULL, NULL, 'change_control'),
  ('public.change_implementations.implementation_plan', 'Implementation plan', 'How the approved change will be put in place, step by step.', '- Configure registry link – test in UAT – brief branch staff – switch on for all branches.', NULL, NULL, 'change_control'),
  ('public.change_implementations.planned_start_date', 'Planned start date', 'When work on the change starts.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'change_control'),
  ('public.change_implementations.planned_end_date', 'Planned end date', 'When the change should be in place.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'change_control'),
  ('public.change_implementations.status', 'Status', 'How far the implementation has got.', '- In progress', NULL, NULL, 'change_control'),
  ('public.change_implementations.notes', 'Notes', 'Anything else to record about the implementation.', '- Branch briefing moved to the Monday team meeting.', NULL, NULL, 'change_control')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title,
  purpose = EXCLUDED.purpose,
  examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes,
  extra_notes = EXCLUDED.extra_notes,
  module_code = EXCLUDED.module_code,
  is_active = TRUE;

-- Check: entries written by this file
SELECT count(*) AS help_entries FROM public.field_help WHERE module_code = 'change_control' AND is_active;
