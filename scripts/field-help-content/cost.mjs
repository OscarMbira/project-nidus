// v1345 slice 4, wave 4g — cost & finance field help (source for SQL/v1527).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
const DF = 'Dates show as {date_format}.'
const AM = 'Amounts show in {currency}.'
const date = (key, title, purpose) => [key, title, purpose, ['{example_date}'], DF]
const PP = 'public.project_plans.'
const SP = 'public.stage_plans.'
const CA = 'public.cost_actuals.'
const BC = 'public.budget_categories.'
const EC = 'public.expense_categories.'
const FS = 'public.funding_sources.'
const EX = 'public.project_expense_claims.'

export const MODULE = 'cost'
export const ROWS = [
  // ── Plan budgets ──
  [PP + 'total_budget', 'Total budget', 'The full budget for the project plan, and its currency.', ['1,200,000'], AM],
  [PP + 'contingency_amount', 'Contingency amount', 'Money held back for risks and unknowns.', ['150,000'], AM],
  [PP + 'contingency_percentage', 'Contingency percentage', 'Contingency as a share of the total budget.', ['12.5'], 'A percentage from 0 to 100.'],
  [PP + 'budget_breakdown', 'Budget breakdown', 'How the budget splits by category, written as JSON.', ['{"staff": 400000, "suppliers": 650000}']],
  [SP + 'stage_budget', 'Stage budget', 'The budget for this stage, and its currency.', ['320,000'], AM],
  [SP + 'contingency_amount', 'Contingency amount', 'Money held back in this stage for risks and unknowns.', ['30,000'], AM],
  [SP + 'budget_breakdown', 'Budget breakdown', 'How the stage budget splits by category, written as JSON.', ['{"training": 120000, "hardware": 200000}']],

  // ── Cost actuals ──
  [CA + 'transaction_type', 'Transaction type', 'Whether this is money spent (actual), money committed (an order placed) or an accrual (work done, not yet invoiced).', ['Actual']],
  [CA + 'amount', 'Amount', 'The value of the transaction.', ['4,800'], AM],
  date(CA + 'transaction_date', 'Transaction date', 'When the cost was incurred or committed.'),
  [CA + 'category', 'Category', 'The project budget line the cost belongs to.', ['Supplier services']],
  [CA + 'description', 'Description', 'What the cost is for.', ['Printer drivers for 12 branches']],
  [CA + 'notes', 'Notes', 'Anything else, such as the invoice or order number.', ['Invoice INV-2027-0418']],

  // ── Budget categories, expense categories, funding sources (settings) ──
  [BC + 'name', 'Name', 'The name of the budget category.', ['Supplier services']],
  [BC + 'code', 'Code', 'A short code for the category.', ['SUP']],
  [BC + 'description', 'Description', 'What costs belong in this category.', ['External companies paid to deliver work for the project.']],
  [BC + 'sort_order', 'Sort order', 'Where the category shows; lower numbers show first.', ['20']],
  [BC + 'is_active', 'Active', 'Tick to offer the category on new budgets.', ['Ticked']],
  [EC + 'category_code', 'Category code', 'A short code for the expense category.', ['TRV']],
  [EC + 'category_name', 'Category name', 'The name people see when they claim an expense.', ['Travel']],
  [EC + 'category_description', 'Description', 'What expenses belong in this category.', ['Flights, trains and taxis for project work.']],
  [EC + 'is_active', 'Active', 'Tick to offer the category on new claims.', ['Ticked']],
  [FS + 'name', 'Name', 'The name of the funding source.', ['Retail change budget']],
  [FS + 'code', 'Code', 'A short code for the funding source.', ['RCB-2027']],
  [FS + 'description', 'Description', 'Where the money comes from and any rules for using it.', ['Annual change budget held by the Retail division.']],
  [FS + 'is_active', 'Active', 'Tick to offer the funding source on new budgets.', ['Ticked']],

  // ── Expense claims ──
  [EX + 'project_id', 'Project', 'The project the expense was for.', ['Dubai Branch Network Refresh']],
  date(EX + 'expense_date', 'Expense date', 'When the money was spent.'),
  [EX + 'is_itemized', 'Itemize this expense', 'Tick to enter the expense as several lines, such as a trip with flight, hotel and meals.', ['Ticked']],
  [EX + 'amount', 'Amount', 'The total amount claimed.', ['385'], AM],
  [EX + 'description', 'Description', 'What the expense was for.', ['Taxi from Dubai airport to the pilot branch']],
  [EX + 'notes', 'Notes', 'Anything the approver should know.', ['Receipt attached; no other transport available.']],
  ['public.projects.budget_notes', 'Overall budget notes', 'Notes about the project budget as a whole.', ['Supplier costs fixed by contract; hardware prices valid until March.']],
]

export const ALIASES = [
  ...['transaction_type', 'amount', 'transaction_date', 'category', 'description', 'notes'].map((c) => ['sim.cost_actuals.' + c, CA + c]),
  ...['name', 'code', 'description', 'sort_order', 'is_active'].map((c) => ['sim.budget_categories.' + c, BC + c]),
  ...['category_code', 'category_name', 'category_description', 'is_active'].map((c) => ['sim.expense_categories.' + c, EC + c]),
  ...['name', 'code', 'description', 'is_active'].map((c) => ['sim.funding_sources.' + c, FS + c]),
  ['sim.project_expense_claims.practice_project_id', EX + 'project_id'],
  ...['expense_date', 'is_itemized', 'amount', 'description', 'notes'].map((c) => ['sim.project_expense_claims.' + c, EX + c]),
]
