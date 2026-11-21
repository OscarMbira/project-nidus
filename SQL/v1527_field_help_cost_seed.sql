-- ============================================================================
-- v1345 slice 4 wave 4g — cost and finance field help
-- ============================================================================
-- Generated from scripts/field-help-content/cost.mjs by scripts/field-help-content/build-sql.mjs (v1345 slice 2).
-- 33 help entries, module_code 'cost'. Register keys fall back to the common
-- register:*:<field_key> help when a register has no entry of its own (S2-D1).
-- Examples follow CLAUDE.md rule 77. Drafted by Claude for owner sample review (G-D5).
-- Idempotent: re-running refreshes the text. Prerequisites: v1490.
-- ============================================================================

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.project_plans.total_budget', 'Total budget', 'The full budget for the project plan, and its currency.', '- 1,200,000', 'Amounts show in {currency}.', NULL, 'cost'),
  ('public.project_plans.contingency_amount', 'Contingency amount', 'Money held back for risks and unknowns.', '- 150,000', 'Amounts show in {currency}.', NULL, 'cost'),
  ('public.project_plans.contingency_percentage', 'Contingency percentage', 'Contingency as a share of the total budget.', '- 12.5', 'A percentage from 0 to 100.', NULL, 'cost'),
  ('public.project_plans.budget_breakdown', 'Budget breakdown', 'How the budget splits by category, written as JSON.', '- {"staff": 400000, "suppliers": 650000}', NULL, NULL, 'cost'),
  ('public.stage_plans.stage_budget', 'Stage budget', 'The budget for this stage, and its currency.', '- 320,000', 'Amounts show in {currency}.', NULL, 'cost'),
  ('public.stage_plans.contingency_amount', 'Contingency amount', 'Money held back in this stage for risks and unknowns.', '- 30,000', 'Amounts show in {currency}.', NULL, 'cost'),
  ('public.stage_plans.budget_breakdown', 'Budget breakdown', 'How the stage budget splits by category, written as JSON.', '- {"training": 120000, "hardware": 200000}', NULL, NULL, 'cost'),
  ('public.cost_actuals.transaction_type', 'Transaction type', 'Whether this is money spent (actual), money committed (an order placed) or an accrual (work done, not yet invoiced).', '- Actual', NULL, NULL, 'cost'),
  ('public.cost_actuals.amount', 'Amount', 'The value of the transaction.', '- 4,800', 'Amounts show in {currency}.', NULL, 'cost'),
  ('public.cost_actuals.transaction_date', 'Transaction date', 'When the cost was incurred or committed.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'cost'),
  ('public.cost_actuals.category', 'Category', 'The project budget line the cost belongs to.', '- Supplier services', NULL, NULL, 'cost'),
  ('public.cost_actuals.description', 'Description', 'What the cost is for.', '- Printer drivers for 12 branches', NULL, NULL, 'cost'),
  ('public.cost_actuals.notes', 'Notes', 'Anything else, such as the invoice or order number.', '- Invoice INV-2027-0418', NULL, NULL, 'cost'),
  ('public.budget_categories.name', 'Name', 'The name of the budget category.', '- Supplier services', NULL, NULL, 'cost'),
  ('public.budget_categories.code', 'Code', 'A short code for the category.', '- SUP', NULL, NULL, 'cost'),
  ('public.budget_categories.description', 'Description', 'What costs belong in this category.', '- External companies paid to deliver work for the project.', NULL, NULL, 'cost'),
  ('public.budget_categories.sort_order', 'Sort order', 'Where the category shows; lower numbers show first.', '- 20', NULL, NULL, 'cost'),
  ('public.budget_categories.is_active', 'Active', 'Tick to offer the category on new budgets.', '- Ticked', NULL, NULL, 'cost'),
  ('public.expense_categories.category_code', 'Category code', 'A short code for the expense category.', '- TRV', NULL, NULL, 'cost'),
  ('public.expense_categories.category_name', 'Category name', 'The name people see when they claim an expense.', '- Travel', NULL, NULL, 'cost'),
  ('public.expense_categories.category_description', 'Description', 'What expenses belong in this category.', '- Flights, trains and taxis for project work.', NULL, NULL, 'cost'),
  ('public.expense_categories.is_active', 'Active', 'Tick to offer the category on new claims.', '- Ticked', NULL, NULL, 'cost'),
  ('public.funding_sources.name', 'Name', 'The name of the funding source.', '- Retail change budget', NULL, NULL, 'cost'),
  ('public.funding_sources.code', 'Code', 'A short code for the funding source.', '- RCB-2027', NULL, NULL, 'cost'),
  ('public.funding_sources.description', 'Description', 'Where the money comes from and any rules for using it.', '- Annual change budget held by the Retail division.', NULL, NULL, 'cost'),
  ('public.funding_sources.is_active', 'Active', 'Tick to offer the funding source on new budgets.', '- Ticked', NULL, NULL, 'cost'),
  ('public.project_expense_claims.project_id', 'Project', 'The project the expense was for.', '- Dubai Branch Network Refresh', NULL, NULL, 'cost'),
  ('public.project_expense_claims.expense_date', 'Expense date', 'When the money was spent.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'cost'),
  ('public.project_expense_claims.is_itemized', 'Itemize this expense', 'Tick to enter the expense as several lines, such as a trip with flight, hotel and meals.', '- Ticked', NULL, NULL, 'cost'),
  ('public.project_expense_claims.amount', 'Amount', 'The total amount claimed.', '- 385', 'Amounts show in {currency}.', NULL, 'cost'),
  ('public.project_expense_claims.description', 'Description', 'What the expense was for.', '- Taxi from Dubai airport to the pilot branch', NULL, NULL, 'cost'),
  ('public.project_expense_claims.notes', 'Notes', 'Anything the approver should know.', '- Receipt attached; no other transport available.', NULL, NULL, 'cost'),
  ('public.projects.budget_notes', 'Overall budget notes', 'Notes about the project budget as a whole.', '- Supplier costs fixed by contract; hardware prices valid until March.', NULL, NULL, 'cost')
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
  ('sim.cost_actuals.transaction_type', 'public.cost_actuals.transaction_type'),
  ('sim.cost_actuals.amount', 'public.cost_actuals.amount'),
  ('sim.cost_actuals.transaction_date', 'public.cost_actuals.transaction_date'),
  ('sim.cost_actuals.category', 'public.cost_actuals.category'),
  ('sim.cost_actuals.description', 'public.cost_actuals.description'),
  ('sim.cost_actuals.notes', 'public.cost_actuals.notes'),
  ('sim.budget_categories.name', 'public.budget_categories.name'),
  ('sim.budget_categories.code', 'public.budget_categories.code'),
  ('sim.budget_categories.description', 'public.budget_categories.description'),
  ('sim.budget_categories.sort_order', 'public.budget_categories.sort_order'),
  ('sim.budget_categories.is_active', 'public.budget_categories.is_active'),
  ('sim.expense_categories.category_code', 'public.expense_categories.category_code'),
  ('sim.expense_categories.category_name', 'public.expense_categories.category_name'),
  ('sim.expense_categories.category_description', 'public.expense_categories.category_description'),
  ('sim.expense_categories.is_active', 'public.expense_categories.is_active'),
  ('sim.funding_sources.name', 'public.funding_sources.name'),
  ('sim.funding_sources.code', 'public.funding_sources.code'),
  ('sim.funding_sources.description', 'public.funding_sources.description'),
  ('sim.funding_sources.is_active', 'public.funding_sources.is_active'),
  ('sim.project_expense_claims.practice_project_id', 'public.project_expense_claims.project_id'),
  ('sim.project_expense_claims.expense_date', 'public.project_expense_claims.expense_date'),
  ('sim.project_expense_claims.is_itemized', 'public.project_expense_claims.is_itemized'),
  ('sim.project_expense_claims.amount', 'public.project_expense_claims.amount'),
  ('sim.project_expense_claims.description', 'public.project_expense_claims.description'),
  ('sim.project_expense_claims.notes', 'public.project_expense_claims.notes')
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;

-- Check: entries written by this file
SELECT count(*) AS help_entries FROM public.field_help WHERE module_code = 'cost' AND is_active;
