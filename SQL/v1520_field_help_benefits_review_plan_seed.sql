-- ============================================================================
-- v1345 slice 3 wave 3f — benefits review plan field help (Platform plan + Simulator practice plan)
-- ============================================================================
-- Generated from scripts/field-help-content/benefits_review_plan.mjs by scripts/field-help-content/build-sql.mjs (v1345 slice 2).
-- 85 help entries, module_code 'benefits_review_plan'. Register keys fall back to the common
-- register:*:<field_key> help when a register has no entry of its own (S2-D1).
-- Examples follow CLAUDE.md rule 77. Drafted by Claude for owner sample review (G-D5).
-- Idempotent: re-running refreshes the text. Prerequisites: v1490.
-- ============================================================================

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.benefits_review_plans.plan_title', 'Plan title', 'A clear title for the benefits review plan.', '- Dubai Branch Network Refresh – benefits review plan', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.document_ref', 'Document reference', 'The reference used in your document management system.', '- DOC-PMO-0611', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.version_number', 'Version number', 'The version of this plan. Raise it each time the plan is reissued.', '- 1.0', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.release', 'Release', 'Which release or issue of the plan this is, if your organisation tracks releases.', '- Baseline for board approval', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.plan_date', 'Plan date', 'The date this version of the plan was written.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.author_user_id', 'Author', 'The person who wrote the plan.', '- Project Manager', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.owner_user_id', 'Owner', 'The person accountable for the plan, usually the senior person who owns the benefits.', '- Head of Retail Banking', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.client', 'Client', 'The person or body the benefits are for.', '- Retail Banking division', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.project_id', 'Project', 'The project whose benefits this plan reviews.', '- Dubai Branch Network Refresh', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.programme_id', 'Programme', 'The programme the benefits contribute to, if any.', '- Branch Modernisation Programme', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.status', 'Status', 'Where the plan is in its approval life.', '- Pending approval', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.benefits_coverage_notes', 'Benefits coverage notes', 'Which benefits the plan will measure and review, in summary.', E'- Lower branch running costs\n- Same-day account opening', 'One item per line.', NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.accountability_description', 'Accountability', 'Who is accountable for achieving each benefit and for reviewing it.', '- The Head of Retail Banking owns all branch benefits; the PMO runs the reviews.', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.measurement_approach', 'Benefits measurement approach', 'How the benefits will be measured: the data, the method and who collects it.', E'- Monthly branch cost report from Finance\n- Account opening times from the branch system', 'One item per line.', NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.resources_description', 'Resources description', 'The people, systems and money needed to carry out the reviews.', E'- PMO analyst – 2 days each quarter\n- Finance report access', 'One item per line.', NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.estimated_review_effort_hours', 'Estimated effort (hours)', 'The total hours expected to run the reviews.', '- 120', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.estimated_review_cost', 'Estimated cost', 'The expected cost of running the reviews.', '- 15,000', 'Amounts show in {currency}.', NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.review_cost_currency', 'Currency', 'The currency the review cost is in.', '- GBP', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.baseline_measures_description', 'Baseline measures', 'The starting values the benefits will be compared with.', '- Branch running cost 2.6m a year; account opening averages 3 days.', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.baseline_recording_date', 'Baseline recording date', 'When the baseline values were taken.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.baseline_source', 'Baseline source', 'Where the baseline values came from.', '- Finance cost report for the last full year', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.performance_review_approach', 'Performance review approach', 'How and when benefit performance will be reviewed, and by whom.', '- Quarterly review by the PMO with the benefit owner; results reported to the board.', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.performance_review_frequency', 'Review frequency', 'How often performance is reviewed.', '- Quarterly', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.performance_review_criteria', 'Review criteria', 'What each review checks.', E'- Is the benefit on track against its target?\n- Are any dis-benefits growing?', 'One item per line.', NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.dis_benefits_included', 'Dis-benefits considered', 'Tick to measure and review dis-benefits (negative outcomes) as well as benefits.', '- Ticked', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plans.dis_benefits_description', 'Dis-benefits for measurement and review', 'Each dis-benefit and how it will be measured.', '- Short dip in productivity during training – track via queue times', 'One item per line.', NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_benefits.benefit_id', 'Benefit', 'The benefit from the benefits register this plan will review.', '- Lower branch running costs', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_benefits.measurement_frequency', 'Measurement frequency', 'How often this benefit is measured.', '- Monthly', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_benefits.priority', 'Priority', 'How important this benefit is to review.', '- High', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_benefits.accountable_user_id', 'Accountable person', 'The person accountable for this benefit being achieved.', '- Head of Retail Banking', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_benefits.next_review_date', 'Next review date', 'When this benefit is next reviewed.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_benefits.measurement_timing_reason', 'Measurement timing reason', 'Why the benefit is measured at that frequency.', '- Cost savings show in the monthly finance report.', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_resources.resource_type', 'Resource type', 'What kind of resource is needed.', '- Person', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_resources.resource_name', 'Resource name', 'A short name for the resource.', '- PMO benefits analyst', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_resources.assigned_user_id', 'Assigned user', 'The person providing the resource, if it is a person.', '- PMO Analyst', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_resources.availability_confirmed', 'Availability confirmed', 'Tick once the resource’s availability has been agreed.', '- Ticked', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_resources.skill_required', 'Skill required', 'The skill the resource must have.', '- Financial analysis', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_resources.skill_level', 'Skill level', 'How skilled the resource needs to be.', '- Intermediate', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_resources.estimated_effort_hours', 'Estimated effort (hours)', 'The hours this resource is expected to spend.', '- 40', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_resources.estimated_cost', 'Estimated cost', 'What this resource is expected to cost.', '- 4,000', 'Amounts show in {currency}.', NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_resources.cost_currency', 'Currency', 'The currency of the cost.', '- GBP', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_resources.required_from_date', 'Required from', 'When the resource is first needed.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_resources.required_to_date', 'Required to', 'When the resource is no longer needed.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_resources.resource_description', 'Resource description', 'What the resource will do.', '- Collects branch cost data and prepares the quarterly benefits report.', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_resources.notes', 'Notes', 'Anything else to know about this resource.', '- Shared with the Card Services programme.', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_schedule.review_name', 'Review name', 'A short name for the review.', '- Q1 benefits review', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_schedule.review_type', 'Review type', 'The kind of review.', '- Benefit Review', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_schedule.benefit_id', 'Benefit', 'The benefit this review covers. Leave blank to review all benefits.', '- Lower branch running costs', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_schedule.planned_date', 'Planned date', 'When the review is planned.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'benefits_review_plan'),
  ('public.benefits_review_schedule.forecast_date', 'Forecast date', 'When the review is now expected, if it has moved.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'benefits_review_plan'),
  ('public.benefits_review_schedule.review_duration_hours', 'Duration (hours)', 'How long the review takes.', '- 2', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_schedule.reviewer_user_id', 'Reviewer', 'The person who leads the review.', '- PMO Lead', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_schedule.is_virtual', 'Virtual / remote review', 'Tick if the review is held online.', '- Ticked', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_schedule.meeting_link', 'Meeting link', 'The link to join an online review.', '- https://meet.company.example/q1-benefits', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_schedule.review_location', 'Review location', 'Where an in-person review is held.', '- Board room, London office', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_schedule.review_description', 'Review description', 'What the review will cover.', '- Check Q1 savings against the target and agree any actions.', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_schedule.outcome_summary', 'Outcome summary', 'The overall result of the review.', '- Savings 8% above target; benefit on track.', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_schedule.findings', 'Findings', 'What the review found.', '- Overtime costs fell faster than expected in Dubai branches.', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_schedule.recommendations', 'Recommendations', 'What the review recommends.', '- Raise the year-two savings target by 5%.', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_schedule.action_items', 'Action items', 'Actions agreed at the review, with owners.', '- Update the benefits register – PMO Analyst', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_schedule.review_report_url', 'Review report URL', 'A link to the full review report.', '- https://documents.company.example/benefits/q1-review', NULL, NULL, 'benefits_review_plan'),
  ('public.dis_benefits.dis_benefit_code', 'Dis-benefit code', 'A short code for the dis-benefit.', '- DB-003', NULL, NULL, 'benefits_review_plan'),
  ('public.dis_benefits.dis_benefit_name', 'Dis-benefit name', 'A short name for the negative outcome.', '- Longer queues during training', NULL, NULL, 'benefits_review_plan'),
  ('public.dis_benefits.dis_benefit_category', 'Category', 'Who or what the dis-benefit affects.', '- Customer', NULL, NULL, 'benefits_review_plan'),
  ('public.dis_benefits.impact_severity', 'Impact severity', 'How serious the impact is.', '- Medium', NULL, NULL, 'benefits_review_plan'),
  ('public.dis_benefits.impact_probability', 'Impact probability (%)', 'How likely the dis-benefit is to happen.', '- 60', 'A percentage from 0 to 100.', NULL, 'benefits_review_plan'),
  ('public.dis_benefits.status', 'Status', 'Where the dis-benefit stands.', '- Identified', NULL, NULL, 'benefits_review_plan'),
  ('public.dis_benefits.mitigation_owner_user_id', 'Mitigation owner', 'The person responsible for reducing the dis-benefit.', '- Branch Operations Manager', NULL, NULL, 'benefits_review_plan'),
  ('public.dis_benefits.mitigation_status', 'Mitigation status', 'How far the mitigation has got.', '- In progress', NULL, NULL, 'benefits_review_plan'),
  ('public.dis_benefits.measurable', 'Measurable', 'Tick if the dis-benefit can be measured with a number.', '- Ticked', NULL, NULL, 'benefits_review_plan'),
  ('public.dis_benefits.measurement_unit', 'Measurement unit', 'The unit the dis-benefit is measured in.', '- Minutes of waiting time', NULL, NULL, 'benefits_review_plan'),
  ('public.dis_benefits.baseline_value', 'Baseline value', 'The value before the project started.', '- 8', NULL, NULL, 'benefits_review_plan'),
  ('public.dis_benefits.dis_benefit_description', 'Dis-benefit description', 'What the negative outcome is.', '- Customers wait longer while branch staff are away training.', NULL, NULL, 'benefits_review_plan'),
  ('public.dis_benefits.impact_description', 'Impact description', 'How the dis-benefit affects people or the business.', '- Average waiting time may rise by 10 minutes at peak hours.', NULL, NULL, 'benefits_review_plan'),
  ('public.dis_benefits.mitigation_approach', 'Mitigation approach', 'How the dis-benefit will be reduced.', '- Train in small groups and add relief tellers on Saturdays.', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_distribution.recipient_user_id', 'Select user', 'A person in the system who receives the plan. Optional if you enter a name instead.', '- Chief Financial Officer', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_distribution.recipient_name', 'Name', 'The recipient’s name or role.', '- Chief Financial Officer', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_distribution.recipient_title', 'Title', 'The recipient’s job title.', '- Chief Financial Officer', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_distribution.recipient_email', 'Email', 'Where the plan is sent.', '- cfo@company.example', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_distribution.distribution_method', 'Distribution method', 'How the plan is shared with this person.', '- Email', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_revisions.revision_date', 'Revision date', 'When this revision was made.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_revisions.revision_number', 'Revision number', 'The number of this revision.', '- 1.1', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_revisions.summary_of_changes', 'Summary of changes', 'What changed in this revision.', '- Added the Q3 review dates; raised the cost savings target.', NULL, NULL, 'benefits_review_plan'),
  ('public.benefits_review_plan_revisions.changes_marked', 'Changes marked in document', 'Tick if the changes are highlighted in the document itself.', '- Ticked', NULL, NULL, 'benefits_review_plan'),
  ('sim.practice_benefits_review_plans.scope_description', 'Scope description', 'Which benefits and which period the plan covers.', '- All branch benefits from go-live until two years after the project closes.', NULL, NULL, 'benefits_review_plan')
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
  ('sim.practice_benefits_review_plans.plan_title', 'public.benefits_review_plans.plan_title'),
  ('sim.practice_benefits_review_plans.measurement_approach', 'public.benefits_review_plans.measurement_approach')
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;

-- Check: entries written by this file
SELECT count(*) AS help_entries FROM public.field_help WHERE module_code = 'benefits_review_plan' AND is_active;
