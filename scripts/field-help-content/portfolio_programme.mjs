// v1345 slice 4, wave 4j — portfolio, programme & PMO admin field help (source for SQL/v1533).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
import fs from 'node:fs'
const DF = 'Dates show as {date_format}.'
const AM = 'Amounts show in {currency}.'
const d = (key, title, purpose) => [key, title, purpose, ['{example_date}'], DF]
const t = (key, title, purpose, ex) => [key, title, purpose, [ex]]
const am = (key, title, purpose, ex) => [key, title, purpose, [ex], AM]
const PF = 'public.portfolios.'
const PG = 'public.programmes.'
const PB = 'public.portfolio_budgets.'
const PV = 'public.portfolio_governance.'
const PR = 'public.portfolio_reports.'
const PM = 'public.portfolio_members.'
const PCAT = 'public.portfolio_categories.'
const DT = 'public.delay_templates.'
const OA = 'public.organisation_authorities.'
const PCL = 'public.project_classifications.'
const RR = 'public.pmo_role_responsibilities.'
const shared = (P, kind) => [
  t(P + 'goals', 'Goals', `What the ${kind} aims to achieve.`, 'Modernise every branch by 2029'),
  t(P + 'budget_currency', 'Reporting currency', `The currency the ${kind}’s figures are reported in.`, 'GBP'),
  t(P + 'budget_type', 'Budget type', 'Whether the spend is capital, operational, or both.', 'Mixed (CapEx + OpEx)'),
  t(P + 'budget_categories', 'Budget categories', 'The cost categories used.', 'Staff; suppliers; hardware'),
  t(P + 'delivery_methodology_track', 'Delivery approach', `The usual way work in this ${kind} is delivered.`, 'Hybrid'),
  t(P + 'governance_model', 'Governance model', `How the ${kind} is governed.`, 'Monthly board with quarterly investment review'),
  t(P + 'review_frequency', 'Review frequency', `How often the ${kind} is reviewed.`, 'Quarterly'),
]

export const MODULE = 'portfolio_programme'
export const ROWS = [
  // ── Portfolio ──
  t(PF + 'portfolio_code', 'Portfolio code', 'A short code for the portfolio.', 'PF-RETAIL'),
  t(PF + 'portfolio_name', 'Portfolio name', 'The name of the portfolio.', 'Retail Transformation Portfolio'),
  t(PF + 'portfolio_status', 'Status', 'Where the portfolio stands.', 'Active'),
  t(PF + 'portfolio_type', 'Portfolio type', 'The kind of portfolio.', 'Strategic'),
  t(PF + 'portfolio_category', 'Category', 'A grouping for the portfolio.', 'Business change'),
  t(PF + 'parent_portfolio_id', 'Parent portfolio', 'The portfolio this one sits under, if any.', 'Group Change Portfolio'),
  t(PF + 'portfolio_description', 'Description', 'What the portfolio covers.', 'All change in the Retail division.'),
  t(PF + 'portfolio_vision', 'Vision', 'Where the portfolio wants the business to be.', 'Every customer served in one visit or online.'),
  t(PF + 'portfolio_mission', 'Mission', 'How the portfolio will get there.', 'Deliver the right change in the right order within budget.'),
  t(PF + 'portfolio_owner_user_id', 'Portfolio owner', 'The senior person accountable for the portfolio.', 'Chief Operating Officer'),
  t(PF + 'portfolio_manager_user_id', 'Portfolio manager', 'The person who runs the portfolio day to day.', 'Head of Portfolio Office'),
  d(PF + 'portfolio_start_date', 'Start date', 'When the portfolio starts.'),
  d(PF + 'portfolio_end_date', 'End date', 'When the portfolio ends, if it has an end.'),
  ...shared(PF, 'portfolio'),

  // ── Programme ──
  t(PG + 'programme_code', 'Programme code', 'A short code for the programme.', 'PG-BRANCH'),
  t(PG + 'programme_name', 'Programme name', 'The name of the programme.', 'Branch Modernisation Programme'),
  t(PG + 'programme_status', 'Status', 'Where the programme stands.', 'Active'),
  t(PG + 'programme_type', 'Programme type', 'The kind of programme.', 'Transformation'),
  t(PG + 'programme_category', 'Category', 'A grouping for the programme.', 'Business change'),
  t(PG + 'programme_description', 'Description', 'What the programme covers.', 'Replace systems and processes in all branches.'),
  t(PG + 'programme_vision', 'Vision', 'The future state the programme creates.', 'Branches that open accounts in one visit.'),
  t(PG + 'programme_mission', 'Mission', 'How the programme will get there.', 'Deliver three linked projects in waves.'),
  t(PG + 'programme_owner_user_id', 'Programme owner', 'The senior person accountable for the programme.', 'Head of Retail Banking'),
  t(PG + 'programme_manager_user_id', 'Programme manager', 'The person who runs the programme.', 'Programme Manager'),
  d(PG + 'programme_start_date', 'Start date', 'When the programme starts.'),
  d(PG + 'programme_end_date', 'End date', 'When the programme is planned to end.'),
  t(PG + 'portfolio_id', 'Portfolio', 'The portfolio the programme belongs to.', 'Retail Transformation Portfolio'),
  t(PG + 'success_criteria', 'Success criteria', 'How you will know the programme succeeded.', 'All branches modernised; savings of 1m a year.'),
  ...shared(PG, 'programme'),

  // ── Portfolio pages ──
  t(PCAT + 'name', 'Name', 'The name of the portfolio category.', 'Business change'),
  t(PCAT + 'code', 'Code', 'A short code for the category.', 'BCH'),
  t(PCAT + 'description', 'Description', 'Which portfolios belong in this category.', 'Portfolios that change how the business works.'),
  t(PCAT + 'sort_order', 'Sort order', 'Where the category shows; lower numbers first.', '10'),
  t(PCAT + 'is_active', 'Active', 'Tick to offer the category.', 'Ticked'),
  t(PB + 'portfolio_id', 'Portfolio', 'The portfolio the budget belongs to.', 'Retail Transformation Portfolio'),
  t(PB + 'budget_name', 'Budget name', 'A name for this budget.', 'FY2027 change budget'),
  t(PB + 'budget_type', 'Type', 'The kind of budget.', 'Capital'),
  t(PB + 'budget_currency', 'Currency', 'The currency of the budget.', 'GBP'),
  t(PB + 'budget_status', 'Status', 'Where the budget stands.', 'Approved'),
  am(PB + 'approved_amount', 'Approved amount', 'The amount approved for the portfolio.', '12,000,000'),
  am(PB + 'actual_spent', 'Actual spent', 'The amount spent so far.', '4,300,000'),
  am(PB + 'remaining_amount', 'Remaining', 'Approved amount minus actual spent.', '7,700,000'),
  t(PV + 'governance_model', 'Governance model', 'How the portfolio is governed.', 'Investment committee with monthly reviews'),
  t(PV + 'review_frequency', 'Review frequency', 'How often the portfolio is reviewed.', 'Monthly'),
  d(PV + 'last_review_date', 'Last review date', 'When it was last reviewed.'),
  d(PV + 'next_review_date', 'Next review date', 'When it is next reviewed.'),
  t(PV + 'decision_authority', 'Decision authority', 'Who decides on investments in the portfolio.', 'Investment Committee'),
  t(PV + 'governance_notes', 'Governance notes', 'Anything else about governance.', 'Changes over 500,000 need committee approval.'),
  t(PR + 'portfolio_id', 'Portfolio', 'The portfolio the report is for.', 'Retail Transformation Portfolio'),
  t(PR + 'report_name', 'Report name', 'A name for the report.', 'Q2 portfolio dashboard'),
  t(PR + 'report_type', 'Report type', 'The kind of report.', 'Quarterly review'),
  t(PR + 'report_period', 'Period', 'The period the report covers.', 'Q2 2027'),
  t(PR + 'generation_status', 'Status', 'Where the report stands.', 'Published'),
  t(PR + 'report_summary', 'Summary / content', 'What the report says.', '8 of 10 projects on track; 2 need board attention.'),
  t(PM + 'portfolio_id', 'Portfolio', 'The portfolio the person joins.', 'Retail Transformation Portfolio'),
  t(PM + 'user_email', 'User email', 'The email of the person to add.', 'portfolio.analyst@company.example'),
  t(PM + 'member_role', 'Role', 'Their role in the portfolio.', 'Portfolio Analyst'),
  d(PM + 'start_date', 'Start date', 'When they join.'),
  d(PM + 'end_date', 'End date', 'When they leave, if known.'),

  // ── PMO admin ──
  t(DT + 'name', 'Name', 'A name for the delay template.', 'Supplier late delivery'),
  t(DT + 'delay_category', 'Category', 'The kind of delay.', 'Supplier'),
  t(DT + 'default_severity', 'Default severity', 'The severity new delays from this template start with.', 'Medium'),
  t(DT + 'tags', 'Tags', 'Short words to find the template, separated by commas.', 'supplier, hardware'),
  t(DT + 'status', 'Status', 'Whether the template is in use.', 'Active'),
  t(DT + 'delay_cause', 'Typical cause', 'The usual cause of this kind of delay.', 'Supplier capacity or late ordering.'),
  t(DT + 'responsible_party', 'Responsible party', 'Who usually owns this kind of delay.', 'Supplier'),
  t(DT + 'resolution_plan_template', 'Resolution plan template', 'Steps usually taken to recover.', 'Agree a new date; look for interim hardware; update the plan.'),
  t(OA + 'authority_name', 'Name', 'A name for the authority level.', 'Project Manager spend limit'),
  t(OA + 'authority_type', 'Type', 'What the authority covers.', 'Spend'),
  am(OA + 'min_amount', 'Min amount', 'The lowest amount this authority covers.', '0'),
  am(OA + 'max_amount', 'Max amount', 'The highest amount this authority may approve.', '10,000'),
  t(OA + 'currency', 'Currency', 'The currency of the amounts.', 'GBP'),
  t(OA + 'required_approval_level', 'Approval level', 'The approval level needed in this range.', 'Project Manager'),
  t(OA + 'delegated_role_name', 'Delegated role', 'The role this authority is delegated to.', 'Project Manager'),
  t(OA + 'escalation_role_name', 'Escalation role', 'Who it goes to if not approved in time.', 'Project Executive'),
  t(OA + 'escalation_after_days', 'Escalate after (days)', 'Days before an unanswered request is escalated.', '3'),
  t(OA + 'description', 'Description', 'When this authority applies.', 'Day-to-day spend within the approved budget.'),
  t(OA + 'is_active', 'Active', 'Tick to use this authority.', 'Ticked'),
  t(PCL + 'classification_code', 'Code', 'A short code for the project classification.', 'STR'),
  t(PCL + 'classification_name', 'Name', 'The name of the classification.', 'Strategic'),
  t(PCL + 'complexity_level', 'Complexity level', 'How complex projects in this class usually are.', 'High'),
  t(PCL + 'color', 'Colour', 'The colour used for this class in lists and charts.', '#2563EB'),
  t(PCL + 'description', 'Description', 'Which projects belong in this class.', 'Projects that deliver a stated strategic goal.'),
  t(PCL + 'is_active', 'Active', 'Tick to offer the classification.', 'Ticked'),
  t(RR + 'record_type', 'Record type', 'What this entry describes.', 'Responsibility'),
  t(RR + 'role_name', 'Role', 'The role the entry is about.', 'Project Manager'),
  t(RR + 'raci_code', 'RACI', 'Whether the role is Responsible, Accountable, Consulted or Informed.', 'R'),
  t(RR + 'notes', 'Notes', 'Anything else about the responsibility.', 'Prepares the highlight report every two weeks.'),
  t(RR + 'is_active', 'Active', 'Tick to keep the entry in use.', 'Ticked'),
]

// Simulator practice portfolio pages and the Simulator copies of these screens read the Platform help.
const twin = JSON.parse(fs.readFileSync(new URL('./_twin_aliases_port.json', import.meta.url), 'utf8'))
const seeded = new Set(ROWS.map((r) => r[0]))
const practice = [
  ...['portfolio_code', 'portfolio_name', 'portfolio_status', 'portfolio_type', 'portfolio_category', 'parent_portfolio_id', 'portfolio_description', 'portfolio_vision',
    'portfolio_mission', 'portfolio_start_date', 'portfolio_end_date', 'goals', 'budget_currency', 'budget_type', 'budget_categories', 'governance_model', 'review_frequency']
    .map((c) => ['sim.practice_portfolios.' + c, PF + c]),
  ...['name', 'code', 'description', 'sort_order', 'is_active'].map((c) => ['sim.portfolio_categories.' + c, PCAT + c]),
  ['sim.practice_portfolio_budgets.practice_portfolio_id', PB + 'portfolio_id'],
  ...['budget_name', 'budget_type', 'budget_currency', 'budget_status', 'approved_amount', 'actual_spent', 'remaining_amount'].map((c) => ['sim.practice_portfolio_budgets.' + c, PB + c]),
  ...['governance_model', 'review_frequency', 'last_review_date', 'next_review_date', 'decision_authority', 'governance_notes'].map((c) => ['sim.practice_portfolio_governance.' + c, PV + c]),
  ['sim.practice_portfolio_reports.practice_portfolio_id', PR + 'portfolio_id'],
  ...['report_name', 'report_type', 'report_period', 'generation_status', 'report_summary'].map((c) => ['sim.practice_portfolio_reports.' + c, PR + c]),
  ...['portfolio_id', 'member_role', 'start_date', 'end_date'].map((c) => ['sim.practice_portfolio_members.' + c, PM + c]),
  ['sim.practice_portfolio_members.member_email', PM + 'user_email'],
]
ROWS.push(
  d('sim.practice_portfolio_reports.report_date', 'Report date', 'When the report was produced.'),
  t('sim.practice_portfolio_members.member_name', 'Member name', 'The name or role of the person.', 'Portfolio Analyst'),
)
export const ALIASES = [...new Map([...practice, ...twin.filter(([, p]) => seeded.has(p))]).entries()]
