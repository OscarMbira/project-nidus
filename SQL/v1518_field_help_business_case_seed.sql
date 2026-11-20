-- ============================================================================
-- v1345 slice 3 wave 3d — business case field help (Platform business case + Simulator practice business case)
-- ============================================================================
-- Generated from scripts/field-help-content/business_case.mjs by scripts/field-help-content/build-sql.mjs (v1345 slice 2).
-- 56 help entries, module_code 'business_case'. Register keys fall back to the common
-- register:*:<field_key> help when a register has no entry of its own (S2-D1).
-- Examples follow CLAUDE.md rule 77. Drafted by Claude for owner sample review (G-D5).
-- Idempotent: re-running refreshes the text. Prerequisites: v1490.
-- ============================================================================

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.business_cases.case_title', 'Business case title', 'A clear, short title for the business case.', '- Dubai Branch Network Refresh – business case', NULL, NULL, 'business_case'),
  ('public.business_cases.executive_summary', 'Executive summary', 'The whole case in a paragraph: what is proposed, what it costs, what it returns and what you ask for.', '- Replace the teller system in 12 Dubai branches for 1,200,000, saving 400,000 a year from year two. Approval is requested to start in Q2.', NULL, NULL, 'business_case'),
  ('public.business_cases.strategic_alignment', 'Strategic alignment', 'Which organisational goals or strategies the project supports.', '- Supports the 2027 goal to make every service available in one visit or online.', NULL, NULL, 'business_case'),
  ('public.business_cases.reasons_for_project', 'Reasons for the project', 'Why the project is needed now.', E'- Teller system support ends next year\n- Account opening takes up to 3 days', 'One item per line.', NULL, 'business_case'),
  ('public.business_cases.problem_statement', 'Problem statement', 'The problems the project will solve.', E'- Customers return to the branch to finish opening an account\n- Manual identity checks cause errors', 'One item per line.', NULL, 'business_case'),
  ('public.business_cases.recommended_option', 'Recommended option', 'The business option recommended: do nothing, do the minimum, do something, or another option.', '- Do Something', NULL, NULL, 'business_case'),
  ('public.business_cases.option_justification', 'Option justification', 'Why the recommended option is better than the others.', E'- Lowest cost over five years\n- Reuses the group platform already proven in London', 'One item per line.', NULL, 'business_case'),
  ('public.business_case_options.option_type', 'Option type', 'The kind of option: do nothing, do the minimum, do something, or an alternative.', '- Do Minimum', NULL, NULL, 'business_case'),
  ('public.business_case_options.option_title', 'Option title', 'A short name for the option.', '- Upgrade the existing teller system', NULL, NULL, 'business_case'),
  ('public.business_case_options.description', 'Description', 'What the option involves.', '- Apply the supplier’s upgrade and keep current processes.', NULL, NULL, 'business_case'),
  ('public.business_case_options.estimated_cost', 'Estimated cost', 'The rough total cost of this option.', '- 650,000', 'Amounts show in {currency}.', NULL, 'business_case'),
  ('public.business_case_options.estimated_benefits', 'Expected benefits', 'What the option would deliver.', '- Two more years of support; no improvement to account opening time.', NULL, NULL, 'business_case'),
  ('public.business_case_options.advantages', 'Advantages', 'The strengths of this option.', '- Lower cost; little disruption to branches.', NULL, NULL, 'business_case'),
  ('public.business_case_options.disadvantages', 'Disadvantages', 'The weaknesses of this option.', '- Account opening still takes up to 3 days.', NULL, NULL, 'business_case'),
  ('public.business_case_options.risks_summary', 'Key risks', 'The main risks if this option is chosen.', '- The supplier may withdraw support early.', NULL, NULL, 'business_case'),
  ('public.business_case_options.is_recommended', 'Recommended option', 'Tick if this is the option you recommend. Only one option should be ticked.', '- Ticked', NULL, NULL, 'business_case'),
  ('public.business_cases.start_date', 'Planned start date', 'When the project is planned to start.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'business_case'),
  ('public.business_cases.end_date', 'Planned end date', 'When the project is planned to finish.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'business_case'),
  ('public.business_cases.timescale_description', 'Timescale description', 'How long the project takes and when benefits start, in plain words.', '- Nine months to deliver; savings start three months after the last branch goes live.', NULL, NULL, 'business_case'),
  ('public.business_cases.key_milestones', 'Key milestones', 'The main dates the project works towards.', E'- Pilot branch live – {example_date}\n- All branches live – {example_date}', 'One item per line.', NULL, 'business_case'),
  ('public.business_cases.major_risks', 'Major risks summary', 'The biggest risks to the project and its benefits.', E'- Supplier resources may be late\n- Branch staff may resist the new process', 'One item per line.', NULL, 'business_case'),
  ('public.business_cases.overall_risk_rating', 'Overall risk rating', 'Your overall view of how risky the investment is.', '- Medium', NULL, NULL, 'business_case'),
  ('public.business_cases.dis_benefits_included', 'Capture dis-benefits', 'Tick to record outcomes some people will see as negative.', '- Ticked', NULL, NULL, 'business_case'),
  ('public.business_cases.dis_benefits_description', 'Dis-benefits / negative consequences', 'Outcomes some people will see as negative, even if the project succeeds.', '- Branch staff spend two days away from the counter for training', 'One item per line.', NULL, 'business_case'),
  ('public.business_case_dis_benefits.dis_benefit_description', 'Dis-benefit description', 'One negative outcome of the project.', '- Longer queues during the two-week training period', NULL, NULL, 'business_case'),
  ('public.business_case_dis_benefits.severity', 'Severity', 'How serious the dis-benefit is.', '- Medium', NULL, NULL, 'business_case'),
  ('public.business_case_dis_benefits.affected_stakeholders', 'Affected stakeholders', 'Who will feel the dis-benefit.', '- Branch customers in Dubai', NULL, NULL, 'business_case'),
  ('public.business_case_dis_benefits.impact_description', 'Impact description', 'How the dis-benefit will affect them.', '- Waiting times may rise by 10 minutes at peak hours.', NULL, NULL, 'business_case'),
  ('public.business_case_dis_benefits.mitigation', 'Mitigation', 'How the effect will be reduced.', '- Train staff in small groups and add relief tellers on Saturdays.', NULL, NULL, 'business_case'),
  ('public.business_case_benefits.benefit_description', 'Benefit description', 'One benefit the project is expected to bring.', '- Lower branch running costs', NULL, NULL, 'business_case'),
  ('public.business_case_benefits.benefit_type', 'Benefit type', 'The kind of benefit.', '- Financial', NULL, NULL, 'business_case'),
  ('public.business_case_benefits.benefit_owner', 'Benefit owner', 'The person accountable for making sure this benefit is achieved.', '- Head of Retail Banking', NULL, NULL, 'business_case'),
  ('public.business_case_benefits.target_value', 'Target value', 'The level the benefit should reach, with its unit.', '- 400,000 a year', NULL, NULL, 'business_case'),
  ('public.business_case_benefits.target_date', 'Target date', 'When the benefit should reach its target.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'business_case'),
  ('public.business_case_benefits.measurement_method', 'Measurement method', 'How the benefit will be measured.', '- Branch running costs from the monthly finance report, compared with last year.', NULL, NULL, 'business_case'),
  ('public.business_case_benefits.realization_timing', 'Realisation timing', 'When the benefit will start to appear.', '- Three months after the last branch goes live', NULL, NULL, 'business_case'),
  ('public.business_cases.budget_currency', 'Currency', 'The currency the business case figures are in.', '- GBP', NULL, NULL, 'business_case'),
  ('public.business_cases.budget_type', 'Budget type', 'Whether the spend is capital (creates an asset), operational (running costs), or both.', '- Mixed (CapEx + OpEx)', NULL, NULL, 'business_case'),
  ('public.business_cases.budget_categories', 'Budget categories', 'The cost broken down by category.', E'- Staff costs – 400,000\n- Supplier services – 650,000', 'Amounts show in {currency}.', NULL, 'business_case'),
  ('public.business_cases.budget_approval_status', 'Budget approval status', 'Whether the budget has been approved yet.', '- Pending approval', NULL, NULL, 'business_case'),
  ('public.business_cases.cost_assumptions', 'Cost assumptions', 'What the cost figures assume.', '- Supplier day rate stays the same; no new hardware needed in branches.', NULL, NULL, 'business_case'),
  ('public.business_cases.npv', 'Net present value (NPV)', 'The total value of future benefits minus costs, in today’s money. Positive means the investment pays.', '- 850,000', 'Amounts show in {currency}.', NULL, 'business_case'),
  ('public.business_cases.roi_percentage', 'Return on investment (ROI %)', 'The net benefit as a percentage of the cost.', '- 35', NULL, NULL, 'business_case'),
  ('public.business_cases.payback_period_months', 'Payback period (months)', 'How many months until the benefits have paid back the cost.', '- 30', NULL, NULL, 'business_case'),
  ('public.business_cases.discount_rate', 'Discount rate (%)', 'The yearly rate used to turn future money values back to today’s value for NPV. Your finance team sets it.', '- 8', NULL, NULL, 'business_case'),
  ('public.business_cases.investment_appraisal_notes', 'Investment appraisal notes', 'How the financial figures were worked out, and anything a reviewer should know.', '- Five-year view; savings from year two only; figures checked by the finance team.', NULL, NULL, 'business_case'),
  ('public.business_case_distribution.recipient_name', 'Recipient name', 'Who receives the business case.', '- Chief Financial Officer', NULL, NULL, 'business_case'),
  ('public.business_case_distribution.recipient_title', 'Title / role', 'The recipient’s job title or role on the project.', '- Investment Committee member', NULL, NULL, 'business_case'),
  ('public.business_case_distribution.version_distributed', 'Version', 'Which version of the business case they received.', '- 2.0', NULL, NULL, 'business_case'),
  ('public.business_case_distribution.distribution_status', 'Status', 'Whether the recipient has received, read or acknowledged it.', '- Acknowledged', NULL, NULL, 'business_case'),
  ('sim.practice_business_cases.lifecycle_stage', 'Status', 'Where the practice business case is in its life.', '- Draft', NULL, NULL, 'business_case'),
  ('sim.practice_business_cases.estimated_cost', 'Estimated cost', 'The rough total cost of the project.', '- 1,200,000', 'Amounts show in {currency}.', NULL, 'business_case'),
  ('sim.practice_business_cases.estimated_benefits', 'Estimated benefits', 'The rough total value of the benefits.', '- 2,000,000', 'Amounts show in {currency}.', NULL, 'business_case'),
  ('sim.practice_business_cases.expected_costs', 'Cost notes', 'How the cost estimate was built and what it includes.', '- Supplier services 650,000; staff 400,000; contingency 150,000.', NULL, NULL, 'business_case'),
  ('sim.practice_business_cases.expected_benefits', 'Expected benefits', 'The benefits expected, in plain words.', '- Same-day account opening; 15% lower branch running costs.', NULL, NULL, 'business_case'),
  ('sim.practice_business_cases.option_is_recommended', 'Mark as recommended', 'Tick if this is the option you recommend. Only one option should be ticked.', '- Ticked', NULL, NULL, 'business_case')
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
  ('sim.practice_business_cases.case_title', 'public.business_cases.case_title'),
  ('sim.practice_business_cases.case_description', 'public.business_cases.executive_summary'),
  ('sim.practice_business_cases.business_justification', 'public.business_cases.reasons_for_project'),
  ('sim.practice_business_cases.recommended_option', 'public.business_cases.recommended_option'),
  ('sim.practice_business_cases.option_justification', 'public.business_cases.option_justification'),
  ('sim.practice_business_cases.target_start_date', 'public.business_cases.start_date'),
  ('sim.practice_business_cases.target_end_date', 'public.business_cases.end_date'),
  ('sim.practice_business_cases.net_present_value', 'public.business_cases.npv'),
  ('sim.practice_business_cases.return_on_investment', 'public.business_cases.roi_percentage'),
  ('sim.practice_business_cases.payback_period_months', 'public.business_cases.payback_period_months'),
  ('sim.practice_business_cases.expected_risks', 'public.business_cases.major_risks')
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;

-- Check: entries written by this file
SELECT count(*) AS help_entries FROM public.field_help WHERE module_code = 'business_case' AND is_active;
