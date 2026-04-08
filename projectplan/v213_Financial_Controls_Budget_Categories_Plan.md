# v213 Financial Controls: Budget Categories & Funding Sources

## Summary
1. Move single-value fields (Currency, Budget Type) to the top of the Financial tab.
2. Add budget categories: repeatable rows (Category name, Amount, Funding source dropdown). Total budget = sum of category amounts, displayed as a live-updating (hot) field.
3. Funding sources as PMO-managed master data: new table, CRUD page under PMO Admin sidebar, dropdown in budget categories.

## 1. Database (SQL)
- **funding_sources**: id, account_id (org), name, code, description, is_active, is_deleted, created_at, updated_at. RLS by account.
- **project_budget_categories**: id, project_id, category_name, budget_amount, funding_source_id (FK), display_order. RLS by project access.
- projects.budget_amount = stored total (set on save from sum of categories). projects.funding_source = deprecated/legacy; keep for backward compat, can be null when using categories.

## 2. Funding Sources (PMO Admin)
- Service: getFundingSources(accountId?), create, update, delete (soft).
- Page: Funding Sources list + form at `/platform/pmo-admin/funding-sources`. Theme-aware.
- Sidebar: Add "Funding Sources" under PMO Admin (after Project Statuses).
- Route in App.jsx.

## 3. Financial Form (Create Project)
- **Order**: Currency, Budget Type (top) → Budget Categories (list + total) → Budget Approval Status (bottom).
- **Budget categories**: Add/remove rows. Each row: Category name (text), Amount (SmartAmountInput or number), Funding source (dropdown from funding_sources). Total = sum(amounts), read-only, updates on change.
- Persist: On project create/update, upsert project_budget_categories, set projects.budget_amount = total. Optionally set projects.funding_source to null or summary.

## 4. ProjectsCreate
- State: budget_categories = [{ category_name, amount, funding_source_id }]. Load funding sources (by current user org). Pass to FinancialControlsSection. On submit: compute total, send budget_amount; save categories via service or inline.
