// v1345 slice 3, wave 3d — business case field help (source for SQL/v1518).
// Platform: public.business_cases + business_case_options / _benefits / _dis_benefits / _distribution.
// Simulator practice business case: sim.practice_business_cases — matching columns alias to the Platform help,
// the rest have their own sim.* rows. Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?].
// CLAUDE.md rule 77 applies. Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
const DF = 'Dates show as {date_format}.'
const AM = 'Amounts show in {currency}.'
const LINES = 'One item per line.'
const BC = 'public.business_cases.'
const OP = 'public.business_case_options.'
const BN = 'public.business_case_benefits.'
const DB = 'public.business_case_dis_benefits.'
const DS = 'public.business_case_distribution.'
const SB = 'sim.practice_business_cases.'

export const MODULE = 'business_case'
export const ROWS = [
  // ── Summary and reasons ──
  [BC + 'case_title', 'Business case title', 'A clear, short title for the business case.', ['Dubai Branch Network Refresh – business case']],
  [BC + 'executive_summary', 'Executive summary', 'The whole case in a paragraph: what is proposed, what it costs, what it returns and what you ask for.', ['Replace the teller system in 12 Dubai branches for 1,200,000, saving 400,000 a year from year two. Approval is requested to start in Q2.']],
  [BC + 'strategic_alignment', 'Strategic alignment', 'Which organisational goals or strategies the project supports.', ['Supports the 2027 goal to make every service available in one visit or online.']],
  [BC + 'reasons_for_project', 'Reasons for the project', 'Why the project is needed now.', ['Teller system support ends next year', 'Account opening takes up to 3 days'], LINES],
  [BC + 'problem_statement', 'Problem statement', 'The problems the project will solve.', ['Customers return to the branch to finish opening an account', 'Manual identity checks cause errors'], LINES],

  // ── Options ──
  [BC + 'recommended_option', 'Recommended option', 'The business option recommended: do nothing, do the minimum, do something, or another option.', ['Do Something']],
  [BC + 'option_justification', 'Option justification', 'Why the recommended option is better than the others.', ['Lowest cost over five years', 'Reuses the group platform already proven in London'], LINES],
  [OP + 'option_type', 'Option type', 'The kind of option: do nothing, do the minimum, do something, or an alternative.', ['Do Minimum']],
  [OP + 'option_title', 'Option title', 'A short name for the option.', ['Upgrade the existing teller system']],
  [OP + 'description', 'Description', 'What the option involves.', ['Apply the supplier’s upgrade and keep current processes.']],
  [OP + 'estimated_cost', 'Estimated cost', 'The rough total cost of this option.', ['650,000'], AM],
  [OP + 'estimated_benefits', 'Expected benefits', 'What the option would deliver.', ['Two more years of support; no improvement to account opening time.']],
  [OP + 'advantages', 'Advantages', 'The strengths of this option.', ['Lower cost; little disruption to branches.']],
  [OP + 'disadvantages', 'Disadvantages', 'The weaknesses of this option.', ['Account opening still takes up to 3 days.']],
  [OP + 'risks_summary', 'Key risks', 'The main risks if this option is chosen.', ['The supplier may withdraw support early.']],
  [OP + 'is_recommended', 'Recommended option', 'Tick if this is the option you recommend. Only one option should be ticked.', ['Ticked']],

  // ── Timescale ──
  [BC + 'start_date', 'Planned start date', 'When the project is planned to start.', ['{example_date}'], DF],
  [BC + 'end_date', 'Planned end date', 'When the project is planned to finish.', ['{example_date}'], DF],
  [BC + 'timescale_description', 'Timescale description', 'How long the project takes and when benefits start, in plain words.', ['Nine months to deliver; savings start three months after the last branch goes live.']],
  [BC + 'key_milestones', 'Key milestones', 'The main dates the project works towards.', ['Pilot branch live – {example_date}', 'All branches live – {example_date}'], LINES],

  // ── Risks and dis-benefits ──
  [BC + 'major_risks', 'Major risks summary', 'The biggest risks to the project and its benefits.', ['Supplier resources may be late', 'Branch staff may resist the new process'], LINES],
  [BC + 'overall_risk_rating', 'Overall risk rating', 'Your overall view of how risky the investment is.', ['Medium']],
  [BC + 'dis_benefits_included', 'Capture dis-benefits', 'Tick to record outcomes some people will see as negative.', ['Ticked']],
  [BC + 'dis_benefits_description', 'Dis-benefits / negative consequences', 'Outcomes some people will see as negative, even if the project succeeds.', ['Branch staff spend two days away from the counter for training'], LINES],
  [DB + 'dis_benefit_description', 'Dis-benefit description', 'One negative outcome of the project.', ['Longer queues during the two-week training period']],
  [DB + 'severity', 'Severity', 'How serious the dis-benefit is.', ['Medium']],
  [DB + 'affected_stakeholders', 'Affected stakeholders', 'Who will feel the dis-benefit.', ['Branch customers in Dubai']],
  [DB + 'impact_description', 'Impact description', 'How the dis-benefit will affect them.', ['Waiting times may rise by 10 minutes at peak hours.']],
  [DB + 'mitigation', 'Mitigation', 'How the effect will be reduced.', ['Train staff in small groups and add relief tellers on Saturdays.']],

  // ── Benefits ──
  [BN + 'benefit_description', 'Benefit description', 'One benefit the project is expected to bring.', ['Lower branch running costs']],
  [BN + 'benefit_type', 'Benefit type', 'The kind of benefit.', ['Financial']],
  [BN + 'benefit_owner', 'Benefit owner', 'The person accountable for making sure this benefit is achieved.', ['Head of Retail Banking']],
  [BN + 'target_value', 'Target value', 'The level the benefit should reach, with its unit.', ['400,000 a year']],
  [BN + 'target_date', 'Target date', 'When the benefit should reach its target.', ['{example_date}'], DF],
  [BN + 'measurement_method', 'Measurement method', 'How the benefit will be measured.', ['Branch running costs from the monthly finance report, compared with last year.']],
  [BN + 'realization_timing', 'Realisation timing', 'When the benefit will start to appear.', ['Three months after the last branch goes live']],

  // ── Financials ──
  [BC + 'budget_currency', 'Currency', 'The currency the business case figures are in.', ['GBP']],
  [BC + 'budget_type', 'Budget type', 'Whether the spend is capital (creates an asset), operational (running costs), or both.', ['Mixed (CapEx + OpEx)']],
  [BC + 'budget_categories', 'Budget categories', 'The cost broken down by category.', ['Staff costs – 400,000', 'Supplier services – 650,000'], AM],
  [BC + 'budget_approval_status', 'Budget approval status', 'Whether the budget has been approved yet.', ['Pending approval']],
  [BC + 'cost_assumptions', 'Cost assumptions', 'What the cost figures assume.', ['Supplier day rate stays the same; no new hardware needed in branches.']],
  [BC + 'npv', 'Net present value (NPV)', 'The total value of future benefits minus costs, in today’s money. Positive means the investment pays.', ['850,000'], AM],
  [BC + 'roi_percentage', 'Return on investment (ROI %)', 'The net benefit as a percentage of the cost.', ['35']],
  [BC + 'payback_period_months', 'Payback period (months)', 'How many months until the benefits have paid back the cost.', ['30']],
  [BC + 'discount_rate', 'Discount rate (%)', 'The yearly rate used to turn future money values back to today’s value for NPV. Your finance team sets it.', ['8']],
  [BC + 'investment_appraisal_notes', 'Investment appraisal notes', 'How the financial figures were worked out, and anything a reviewer should know.', ['Five-year view; savings from year two only; figures checked by the finance team.']],

  // ── Distribution ──
  [DS + 'recipient_name', 'Recipient name', 'Who receives the business case.', ['Chief Financial Officer']],
  [DS + 'recipient_title', 'Title / role', 'The recipient’s job title or role on the project.', ['Investment Committee member']],
  [DS + 'version_distributed', 'Version', 'Which version of the business case they received.', ['2.0']],
  [DS + 'distribution_status', 'Status', 'Whether the recipient has received, read or acknowledged it.', ['Acknowledged']],

  // ── Simulator practice business case: fields with no Platform equivalent ──
  [SB + 'lifecycle_stage', 'Status', 'Where the practice business case is in its life.', ['Draft']],
  [SB + 'estimated_cost', 'Estimated cost', 'The rough total cost of the project.', ['1,200,000'], AM],
  [SB + 'estimated_benefits', 'Estimated benefits', 'The rough total value of the benefits.', ['2,000,000'], AM],
  [SB + 'expected_costs', 'Cost notes', 'How the cost estimate was built and what it includes.', ['Supplier services 650,000; staff 400,000; contingency 150,000.']],
  [SB + 'expected_benefits', 'Expected benefits', 'The benefits expected, in plain words.', ['Same-day account opening; 15% lower branch running costs.']],
  [SB + 'option_is_recommended', 'Mark as recommended', 'Tick if this is the option you recommend. Only one option should be ticked.', ['Ticked']],
]

// Simulator practice business case fields that mean the same as a Platform business case field.
export const ALIASES = [
  [SB + 'case_title', BC + 'case_title'],
  [SB + 'case_description', BC + 'executive_summary'],
  [SB + 'business_justification', BC + 'reasons_for_project'],
  [SB + 'recommended_option', BC + 'recommended_option'],
  [SB + 'option_justification', BC + 'option_justification'],
  [SB + 'target_start_date', BC + 'start_date'],
  [SB + 'target_end_date', BC + 'end_date'],
  [SB + 'net_present_value', BC + 'npv'],
  [SB + 'return_on_investment', BC + 'roi_percentage'],
  [SB + 'payback_period_months', BC + 'payback_period_months'],
  [SB + 'expected_risks', BC + 'major_risks'],
]
