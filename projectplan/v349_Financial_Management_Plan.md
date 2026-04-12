# v349 — Financial Management Implementation Plan
**Date:** 2026-04-09  
**Scope:** Platform + Simulator (parity)  
**Feature Set:** Cost Management, Project Budgeting, Earned Value Management (EVM), Profitability, Financial Reporting, Expense Claims & Reimbursements

---

## Executive Summary

Project Nidus already has a **foundation** for financial management:
- Portfolio-level budgets (`portfolio_budgets` table, `PortfolioFinancial.jsx`)
- Budget categories & funding sources master data
- Project budget categories (`project_budget_categories`)
- An EVM Dashboard component (`EVMDashboard.jsx`) with formulas but **not yet connected to real DB data**
- Simulator counterpart for portfolio financial

**What is missing** and will be built in this plan:
1. Project-level **actual cost tracking** (planned vs actuals)
2. **Budget baseline** management (lock/version/revise)
3. **EVM fully connected** to real project data with time-phased inputs
4. **Programme financial consolidation** (roll-up from projects)
5. **Revenue & Profitability** tracking per project
6. **Expense Claims & Reimbursements** with hierarchical approval
7. **Financial Reporting** hub (cross-entity, exportable)
8. **Simulator parity** for all of the above

### Definition of done (v349 — scope lock)

This plan is **complete** when:

- **Data model & SQL:** Migrations **v416–v424** applied (permissions, financial tables, sim mirrors, menu, **v423** full `resolve_expense_approval_chain`, **v424** `programme_financial_rollups` view).
- **Expense workflow:** `resolve_expense_approval_chain` builds up to **3** sequential approvers from project / programme / portfolio managers (`projects`, `programmes`, `portfolios` assignment fields) and **PMO** when thresholds require it; **self-approval skipped**; `submitExpense` stores JSON chain; **only the current approver** can approve/reject; **mark paid** only after `fully_approved` (PMO/system via `canManageAll` in UI).
- **Programme roll-ups:** Dashboard uses **`programme_financial_rollups`** for programme-level totals (not physical columns on `programmes`).
- **Routes & parity:** Documented Platform/Simulator paths and services exist; Simulator expense **submission** may stay minimal where practice data differs — **chain resolution** is implemented in **`sim.resolve_expense_approval_chain`** for practice projects.

---

## What Already Exists (Do Not Rebuild)

| Existing | Location |
|---|---|
| Portfolio budgets UI | `src/pages/platform-app/PortfolioFinancial.jsx` |
| Budget categories admin | `src/pages/platform-app/BudgetCategories.jsx` |
| Portfolio budget service | `portfolioService.js` — `getPortfolioBudgets`, `savePortfolioBudget` |
| Budget category service | `budgetCategoryService.js` |
| Project budget categories | `projectBudgetCategoryService.js`, `FinancialControlsSection.jsx` |
| EVM formulas | `EVMDashboard.jsx` + `metricsCalculator.js` |
| Simulator portfolio financial | `SimPortfolioFinancial.jsx`, `simPortfolioService.js` |
| Funding sources | DB table + service |
| `financial.approve_expenses` permission | `v86_default_project_roles_seed.sql` |

---

## Role-Based Access Control (RBAC) — Financial Management

### Authorised Roles (Financial Management Module)

| Role | `role_name` in DB | Access Level |
|---|---|---|
| Sponsor / Executive | `project_sponsor` / `executive` | View all financial data for their projects; view profitability & EVM |
| PMO | `pmo_admin` | Full access — view, create, update, delete across all projects |
| Portfolio Manager | `portfolio_manager` | Full access to portfolio-level financials; view programme/project roll-ups |
| Programme Manager | `programme_manager` | Full access to programme-level financials; view project roll-ups within their programme |
| Project Manager | `project_manager` | Full access to their project's financials (costs, EVM, revenue, baselines) |
| Project Board / Steering Committee | `project_board_member` | View-only access to their project's financial data (no create/edit/delete) |

### Permission Codes to Add (`finance` category)

| Permission Code | Description | Assigned to |
|---|---|---|
| `finance.view` | View financial data for own projects | All 6 roles above |
| `finance.manage` | Create, update, delete financial records | PM, Programme Mgr, Portfolio Mgr, PMO |
| `finance.view_all` | View financials across all projects | Programme Mgr (programme scope), Portfolio Mgr, PMO |
| `finance.manage_all` | Full financial management across all projects | PMO only |

### Role → Permission Mapping

| Role | `finance.view` | `finance.manage` | `finance.view_all` | `finance.manage_all` |
|---|---|---|---|---|
| `project_sponsor` / `executive` | ✅ | ❌ | ❌ | ❌ |
| `project_board_member` | ✅ | ❌ | ❌ | ❌ |
| `project_manager` | ✅ | ✅ | ❌ | ❌ |
| `programme_manager` | ✅ | ✅ | ✅ (programme scope) | ❌ |
| `portfolio_manager` | ✅ | ✅ | ✅ | ❌ |
| `pmo_admin` | ✅ | ✅ | ✅ | ✅ |

### Enforcement Strategy

1. **DB Layer (RLS):** All new financial tables include RLS policies enforced via joins to `user_roles`, `project_memberships`, and `roles`.
2. **Menu Layer:** Financial menu items use `finance.view` permission. PMO-only items use `finance.manage_all`.
3. **Component Layer:** `useFinancialPermissions` hook returns `{ canView, canManage, canViewAll, canManageAll }` to show/hide edit controls.
4. **Simulator:** Subscription-tier checks (`free` vs `premium`) consistent with existing simulator patterns.

---

## Phase Breakdown

### Phase 1 — Project Cost Management (Actuals Tracking)
Track actual costs incurred on a project against the planned budget categories.

**New DB tables:**
- `project_cost_entries` — individual cost/expense entries (date, amount, category, description, entered_by, approved)
- `project_budget_baselines` — snapshot/version of the budget at a point in time (baseline_name, version, locked_at, total_amount, JSON snapshot of categories)

**New service:** `projectCostService.js`

**New pages (Platform):**
- `ProjectCostManagement.jsx` — list & entry of cost actuals per project (table + card view, CRUD, export)
- `ProjectBudgetBaseline.jsx` — manage budget baselines (set baseline, compare versions)

**Routes:**
- `/platform/projects/:projectId/costs`
- `/platform/projects/:projectId/budget-baseline`

**Simulator parity:**
- `sim_project_cost_entries` & `sim_project_budget_baselines` tables in `sim` schema
- `simProjectCostService.js`
- `SimProjectCostManagement.jsx`, `SimProjectBudgetBaseline.jsx`
- Routes: `/simulator/practice-projects/:projectId/costs`, `.../budget-baseline`

---

### Phase 2 — Earned Value Management (EVM) — Full Implementation
Connect the existing `EVMDashboard.jsx` to real data and add time-phased EVM input.

**New DB table:**
- `project_evm_snapshots` — periodic EVM data points (period_date, planned_value, earned_value, actual_cost, project_id). One row per reporting period (weekly/monthly).

**New service:** `evmService.js` — CRUD for snapshots + EVM metric calculations at project/programme/portfolio level

**New pages (Platform):**
- `ProjectEVMPage.jsx` — full EVM dashboard for a single project:
  - Input form for PV/EV/AC per period
  - Computed SPI, CPI, SV, CV, EAC, ETC, VAC, TCPI
  - S-curve chart (cumulative PV vs EV vs AC over time)
  - EVM health status indicator
- `ProgrammeEVMPage.jsx` — EVM roll-up across projects in a programme
- `PortfolioEVMPage.jsx` — EVM roll-up across portfolio

**Routes (Platform):**
- `/platform/projects/:projectId/evm`
- `/platform/programme/:programmeId/evm`
- `/platform/portfolio/evm`

**Simulator parity:**
- `sim_project_evm_snapshots` table
- `simEvmService.js`
- `SimProjectEVMPage.jsx`, `SimProgrammeEVMPage.jsx`, `SimPortfolioEVMPage.jsx`
- Routes: `/simulator/practice-projects/:projectId/evm`, `.../evm` equivalents

---

### Phase 3 — Programme Financial Consolidation
Aggregate project-level financials up to Programme level.

**Read model (no triggers on `programmes`):**
- Database view **`public.programme_financial_rollups`** (v424): `programme_id`, `project_count`, `total_actual_cost`, `total_revenue`, `cost_variance` — aggregated from `project_cost_entries` and `project_revenue_entries` via `programme_projects`. SPI/CPI at programme level may be added later from EVM snapshots.

**New page (Platform):**
- `ProgrammeFinancialDashboard.jsx` — per-project cost/revenue table + **summary cards** fed from `programme_financial_rollups` + export.

**Route:** `/platform/programme/:id/financial` (parameter name **`id`**, consistent with other programme routes)

**Simulator parity:**
- `SimProgrammeFinancialDashboard.jsx`
- Route: `/simulator/practice-programme/:programmeId/financial`

---

### Phase 4 — Revenue & Profitability Tracking
Track revenue streams and calculate profitability at project level.

**New DB table:**
- `project_revenue_entries` — revenue entries (date, amount, revenue_type, description, is_confirmed)
- Revenue types: Contract Payment, Milestone Payment, Retainer, Grant, Other

**New service:** `projectRevenueService.js`

**New page (Platform):**
- `ProjectProfitability.jsx`:
  - Revenue entry form + list
  - Total Revenue vs Total Cost comparison
  - Gross Profit & Profit Margin %
  - ROI calculation (Benefit ÷ Cost)
  - Break-even analysis chart
  - Time-series revenue vs cost line chart

**Route:** `/platform/projects/:projectId/profitability`

**Simulator parity:**
- `sim_project_revenue_entries` table
- `simProjectRevenueService.js`
- `SimProjectProfitability.jsx`
- Route: `/simulator/practice-projects/:projectId/profitability`

---

### Phase 4b — Expense Claims & Reimbursements (All Roles, Hierarchical Approval)

> **Scope:** Any authenticated user — regardless of role — can capture and submit project expenses for record keeping and reimbursement. Approval flows upward through the project/programme/portfolio hierarchy. No approver can approve their own expense.

---

#### Approval Hierarchy

Expenses route upward based on the **submitter's role** and the **project's place in the hierarchy** (standalone project, project in programme, project in programme in portfolio).

```
Submitter                   → Level 1 Approver       → Level 2 Approver        → Level 3 Approver
─────────────────────────────────────────────────────────────────────────────────────────────────────
Project Team Member/Any     → Project Manager         → Programme Manager*       → PMO Admin
Project Manager             → Programme Manager*      → Portfolio Manager*       → PMO Admin
Programme Manager           → Portfolio Manager*      → PMO Admin / Sponsor      → —
Portfolio Manager           → PMO Admin               → Sponsor / Executive      → —
PMO Admin                   → Sponsor / Executive     → —                        → —

* Only applies if the project belongs to a programme / the programme belongs to a portfolio.
  If no programme exists, escalation skips that level and goes directly to the next.
```

**Rules:**
1. An approver **cannot approve their own expense** — if the submitter IS the expected L1 approver, that level is skipped automatically.
2. Approval is **sequential** — Level 2 is only notified after Level 1 approves.
3. **Rejection at any level** returns the claim to the submitter with the rejecting approver's comments.
4. **Amount thresholds** (configurable per account by PMO Admin) can force escalation to a higher level — e.g. any expense > $5,000 requires PMO (L3) approval regardless of submitter's role.
5. **Final approver** marks as Paid / Processed once all levels approve.

---

#### Expense Status Workflow (Hierarchical)

```
Draft
  └─► Submitted
        └─► Pending L1 Approval  (e.g. Project Manager)
              ├─► Rejected → back to Submitter (with reason)
              └─► L1 Approved
                    └─► Pending L2 Approval  (e.g. Programme Manager — if applicable)
                          ├─► Rejected → back to Submitter
                          └─► L2 Approved
                                └─► Pending L3 Approval  (e.g. PMO — if applicable)
                                      ├─► Rejected → back to Submitter
                                      └─► Fully Approved
                                            └─► Paid / Processed
```

`claim_status` values: `draft` | `submitted` | `pending_l1` | `pending_l2` | `pending_l3` | `fully_approved` | `rejected` | `paid` | `processed`

---

#### Who Can Do What

| Action | All users | Project Manager | Programme Manager | Portfolio Manager | PMO Admin | Sponsor/Executive |
|---|---|---|---|---|---|---|
| Submit own expense | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Save as draft / hold | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View own expenses | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve claims at their level | ❌ | ✅ (L1) | ✅ (L2) | ✅ (L2/L3) | ✅ (L3/Final) | ✅ (Final) |
| View all expenses in scope | ❌ | Project only | Programme's projects | Portfolio's projects | All | All |
| Mark as Paid / Processed | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Export expense reports | ❌ | Project only | Programme scope | Portfolio scope | All | All |

---

#### New DB Tables

**`project_expense_claims`** — the main claim record:
```
id (UUID, PK)
project_id (FK → projects, NOT NULL)
submitted_by_user_id (FK → users, NOT NULL)
expense_type (VARCHAR — travel/meals/vendor/equipment/training/other)
expense_date (DATE)
amount (DECIMAL 15,2)
currency (VARCHAR 3)
description (TEXT)
receipt_url (TEXT — file attachment)
vendor_name (VARCHAR, nullable)
claim_status (VARCHAR — see status values above)
current_approval_level (INTEGER — 1, 2, 3; NULL when draft/fully approved/paid)
total_approval_levels (INTEGER — computed when submitted: 1, 2, or 3 based on hierarchy)
approval_chain (JSONB — ordered array of {level, approver_role, approver_user_id, resolved_at})
is_reimbursable (BOOLEAN DEFAULT true)
is_deleted (BOOLEAN DEFAULT false)
created_at, updated_at (TIMESTAMPS)
```

**`expense_approval_steps`** — full audit trail of each approval action:
```
id (UUID, PK)
expense_claim_id (FK → project_expense_claims, NOT NULL)
approval_level (INTEGER — 1, 2, or 3)
approver_user_id (FK → users, NOT NULL)
approver_role_name (VARCHAR — role at time of decision)
action (VARCHAR — approved / rejected / escalated)
comments (TEXT, nullable)
actioned_at (TIMESTAMP)
created_at (TIMESTAMP)
```

**`expense_approval_thresholds`** (per-account config, manageable by PMO Admin):
```
id (UUID, PK)
account_id (FK → accounts)
threshold_name (VARCHAR — e.g. 'Standard', 'High Value')
min_amount (DECIMAL 15,2)
max_amount (DECIMAL 15,2, nullable — NULL means no upper limit)
required_approval_level (INTEGER — 1, 2, or 3)
is_active (BOOLEAN)
created_at, updated_at (TIMESTAMPS)
```
> Example: amounts > $5,000 → require Level 3 (PMO) approval regardless of submitter's role.

---

#### New Permission Codes (Expense Module)

| Code | Description | Assigned to |
|---|---|---|
| `financial.submit_expense` | Submit own expense claims | **ALL roles** |
| `financial.approve_l1` | Approve Level 1 expenses (project scope) | `project_manager` |
| `financial.approve_l2` | Approve Level 2 expenses (programme scope) | `programme_manager`, `portfolio_manager` |
| `financial.approve_l3` | Approve Level 3 expenses (org-wide) | `pmo_admin`, `project_sponsor`, `executive` |
| `financial.mark_paid` | Mark approved expenses as paid/processed | `pmo_admin`, `project_sponsor`, `executive` |

Note: existing `financial.approve_expenses` kept for backward compatibility, mapped to L1.

---

#### DB Helper Function

`public.resolve_expense_approval_chain(p_project_id UUID, p_submitter_user_id UUID, p_amount NUMERIC) RETURNS JSONB` — implemented in **v423**:
1. Resolves **project manager**, **programme manager**, **portfolio manager** (when project is linked via `programme_projects` / programme `portfolio_id`)
2. Applies **`expense_approval_thresholds`** for the project’s account (fallback: submitter’s `users.account_id`) — **`required_approval_level`** drives minimum chain depth; **PMO** is appended from `user_roles` / `roles` as needed (max **3** approvers)
3. Skips an approver when they are the **submitter** (no self-approval)
4. Returns `[{ "level", "approver_user_id", "approver_role" }, ...]`

`sim.resolve_expense_approval_chain(p_practice_project_id UUID, p_submitter_public_user_id UUID, p_amount NUMERIC)` — same rules; maps **auth.users** programme/portfolio managers to **`public.users.id`**.

Called from **`submitExpense()`** / sim submit to populate **`approval_chain`** and **`total_approval_levels`**.

---

#### New Service: `expenseClaimService.js`

```
submitExpense(data)                      — saves claim, resolves approval chain, sets pending_l1
saveDraft(data)                          — save as draft
getMyExpenses(userId)                    — submitter's own claims with chain status
getPendingApprovals(userId)              — claims awaiting THIS user's approval
getScopeExpenses(userId)                 — all expenses in user's scope
approveStep(claimId, userId, comments)   — advances to next level or fully_approved
rejectStep(claimId, userId, reason)      — returns claim to submitter
markPaid(claimId, userId)                — paid/processed (PMO/Sponsor only)
getApprovalHistory(claimId)              — full audit trail
```

---

#### New Pages (Platform)

- **`MyExpenses.jsx`** — ALL roles:
  - Multi-step form: Details → Receipt upload → Review & submit
  - Draft/hold queue — resume any time
  - Own expense list: card + table view, sortable, searchable
  - **Approval chain tracker** — visual stepper (current level, next approver, completed levels)
  - Status badge per expense
  - Single record + bulk upload (CSV template)
  - Export own expenses (Excel/CSV)

- **`ExpenseApproval.jsx`** — 6 financial roles only:
  - **"Awaiting My Approval"** tab — claims at the user's current level
  - **"In My Scope"** tab — all expenses in user's project/programme/portfolio scope
  - **"All Expenses"** tab — PMO/Sponsor only
  - Approve / Reject with mandatory comments
  - Mark as Paid / Processed (PMO/Sponsor only)
  - Full approval history per claim (collapsible audit trail)
  - Export (Excel, Word, CSV, Print)
  - Card + table view, sortable columns

- **`ExpenseApprovalThresholds.jsx`** — PMO Admin only:
  - Configure amount thresholds per account
  - Set required approval levels per threshold band
  - Route: `/platform/pmo-admin/expense-thresholds`

**Routes (Platform):**
- `/platform/expenses/my` — all users
- `/platform/expenses/approvals` — 6 financial roles only
- `/platform/pmo-admin/expense-thresholds` — PMO Admin only

---

#### Simulator Parity

- `sim_project_expense_claims`, `sim_expense_approval_steps`, `sim_expense_approval_thresholds` tables in `sim` schema
- `simExpenseClaimService.js` — mirrors full approval chain logic
- `SimMyExpenses.jsx` → `/simulator/expenses/my`
- `SimExpenseApproval.jsx` → `/simulator/expenses/approvals`
- `SimExpenseApprovalThresholds.jsx` → `/simulator/pmo/expense-thresholds`

---

### Phase 5 — Financial Reporting Hub
Central reporting across all projects, programmes, and portfolios.

**New page (Platform):**
- `FinancialReportingHub.jsx`:
  - Filters: Portfolio / Programme / Project / Date Range / Currency / Status
  - Report types:
    - Budget Utilisation Report (planned vs actual vs remaining)
    - Cost Performance Report (CPI/SPI heat map)
    - Variance Analysis Report (cost/schedule variances)
    - Profitability Summary Report
    - EVM Trend Report (S-curves multi-project)
    - Expense Summary Report (by submitter, type, status, project)
  - Export: Excel, Word, PowerPoint, CSV, JSON, PDF/Print (dropdown)
  - Card and table view toggle

**Route:** `/platform/financial-reports`

**Simulator parity:**
- `SimFinancialReportingHub.jsx`
- Route: `/simulator/financial-reports`

---

### Phase 6 — Sidebar Integration & Navigation

> **Architecture note:** The **main Platform sidebar** (`Sidebar.jsx` via `useMenu()` hook) is **fully database-driven** — reads from `menu_items` and `role_menu_items` DB tables, NOT static JS config files. Static configs (`pmoMenuConfig.js`, `pmDashboardMenuConfig.js`, etc.) serve only specialist role dashboards and the Simulator.

#### 6a — Main Platform Sidebar (DB-driven)

New `menu_items` rows (via `SQL/v422_financial_menu_items.sql`):

| Menu Label | Route Path | Parent Section | Icon |
|---|---|---|---|
| Cost Management | `/platform/projects/:id/costs` | Projects | `dollar-sign` |
| Budget Baseline | `/platform/projects/:id/budget-baseline` | Projects | `bookmark` |
| EVM | `/platform/projects/:id/evm` | Projects | `trending-up` |
| Profitability | `/platform/projects/:id/profitability` | Projects | `bar-chart-2` |
| Financial Dashboard | `/platform/programme/:id/financial` | Programme | `pie-chart` |
| Programme EVM | `/platform/programme/:id/evm` | Programme | `trending-up` |
| Portfolio EVM | `/platform/portfolio/evm` | Portfolio | `trending-up` |
| Financial Reports | `/platform/financial-reports` | Top-level | `file-bar-chart` |
| My Expenses | `/platform/expenses/my` | Top-level | `receipt` |
| Expense Approvals | `/platform/expenses/approvals` | Top-level | `clipboard-check` |

New `role_menu_items` rows:

**Financial management pages** → 6 financial roles:

| Role | `can_view` | `can_use` |
|---|---|---|
| `project_sponsor` / `executive` | ✅ | ✅ (read-only at component level) |
| `pmo_admin` | ✅ | ✅ |
| `portfolio_manager` | ✅ | ✅ |
| `programme_manager` | ✅ | ✅ |
| `project_manager` | ✅ | ✅ |
| `project_board_member` | ✅ | ✅ (read-only at component level) |

**"My Expenses"** → **ALL roles** (`can_view: true`, `can_use: true` for every role in `roles` table)

**"Expense Approvals"** → 6 financial roles only

#### 6b — PMO Specialist Dashboard (`pmoMenuConfig.js`)
- Financial Reports → `/platform/financial-reports`
- Portfolio EVM → `/platform/portfolio/evm`
- Expense Approvals → `/platform/expenses/approvals`
- Expense Thresholds (config) → `/platform/pmo-admin/expense-thresholds`

#### 6c — PM Specialist Dashboard (`pmDashboardMenuConfig.js`)
- Cost Management, Budget Baseline, EVM, Profitability → project-scoped routes
- My Expenses → `/platform/expenses/my`
- Expense Approvals → `/platform/expenses/approvals`

#### 6d — Simulator Sidebars (static configs)
All Simulator financial items → `subscriptionTier: 'premium'`

- **`simulatorMenuConfig.js`** — practice cost, EVM, profitability, programme financial, portfolio EVM, financial reports, my expenses, expense approvals
- **`simulatorPMOMenuConfig.js`** — Financial Management section + Expense Thresholds
- **`simulatorPMMenuConfig.js`** — Financial section + My Expenses + Expense Approvals

---

### Phase 7 — Unit Tests
- `projectCostService.test.js`
- `evmService.test.js`
- `projectRevenueService.test.js`
- `expenseClaimService.test.js`

---

## SQL Files Schedule

> **Note:** Scripts were added as **v416–v422** (not v293–v300) to avoid colliding with existing versioned SQL in the repo. Logical mapping:

| Version | File | Contents |
|---|---|---|
| v416 | `SQL/v416_financial_permissions.sql` | `finance.*` + expense permission codes + `role_permissions` |
| v417 | `SQL/v417_project_cost_entries_and_baselines.sql` | `project_cost_entries`, `project_budget_baselines`, RLS, `database_tables` |
| v418 | `SQL/v418_project_evm_snapshots.sql` | `project_evm_snapshots` + RLS |
| v419 | `SQL/v419_project_revenue_entries.sql` | `project_revenue_entries` + RLS |
| v420 | `SQL/v420_project_expense_claims.sql` | Expense claims, approval steps/thresholds, **stub** `resolve_expense_approval_chain`, RLS |
| v421 | `SQL/v421_sim_financial_tables.sql` | `sim.*` mirrors + RLS |
| v422 | `SQL/v422_financial_menu_items.sql` | `menu_items` + `role_menu_items` for financial hub |
| v423 | `SQL/v423_resolve_expense_approval_chain_full.sql` | **Full** `public.resolve_expense_approval_chain` + `sim.resolve_expense_approval_chain` |
| v424 | `SQL/v424_programme_financial_rollups_view.sql` | View **`programme_financial_rollups`** |
| v425 | `SQL/v425_financial_management_seed_data.sql` | Optional **≥22 rows per table** dev/demo seed (`FM-SEED v425` markers) |

---

## New Files to Create

### SQL
```
SQL/v416_financial_permissions.sql
SQL/v417_project_cost_entries_and_baselines.sql
SQL/v418_project_evm_snapshots.sql
SQL/v419_project_revenue_entries.sql
SQL/v420_project_expense_claims.sql
SQL/v421_sim_financial_tables.sql
SQL/v422_financial_menu_items.sql
SQL/v423_resolve_expense_approval_chain_full.sql
SQL/v424_programme_financial_rollups_view.sql
SQL/v425_financial_management_seed_data.sql
```

### Platform Services
```
src/services/projectCostService.js
src/services/evmService.js
src/services/projectRevenueService.js
src/services/expenseClaimService.js
```

### Platform Pages
```
src/pages/platform-app/ProjectCostManagement.jsx
src/pages/platform-app/ProjectBudgetBaseline.jsx
src/pages/platform-app/ProjectEVMPage.jsx
src/pages/platform-app/ProgrammeEVMPage.jsx
src/pages/platform-app/PortfolioEVMPage.jsx
src/pages/platform-app/ProgrammeFinancialDashboard.jsx
src/pages/platform-app/ProjectProfitability.jsx
src/pages/platform-app/MyExpenses.jsx
src/pages/platform-app/ExpenseApproval.jsx
src/pages/platform-app/ExpenseApprovalThresholds.jsx
src/pages/platform-app/FinancialReportingHub.jsx
```

### Simulator Services
```
src/services/simProjectCostService.js
src/services/simEvmService.js
src/services/simProjectRevenueService.js
src/services/simExpenseClaimService.js
```

### Simulator Pages
```
src/pages/simulator/SimProjectCostManagement.jsx
src/pages/simulator/SimProjectBudgetBaseline.jsx
src/pages/simulator/SimProjectEVMPage.jsx
src/pages/simulator/SimProgrammeEVMPage.jsx
src/pages/simulator/SimPortfolioEVMPage.jsx
src/pages/simulator/SimProgrammeFinancialDashboard.jsx
src/pages/simulator/SimProjectProfitability.jsx
src/pages/simulator/SimMyExpenses.jsx
src/pages/simulator/SimExpenseApproval.jsx
src/pages/simulator/SimExpenseApprovalThresholds.jsx
src/pages/simulator/SimFinancialReportingHub.jsx
```

### Hooks
```
src/hooks/useFinancialPermissions.js
```

### Tests
```
src/services/__tests__/projectCostService.test.js
src/services/__tests__/evmService.test.js
src/services/__tests__/projectRevenueService.test.js
src/services/__tests__/expenseClaimService.test.js
```

### Documentation
```
Documentation/v349_Financial_Management_Guide.md
```

---

## Todo List

### Phase 0 — RBAC, Permissions & Menu Setup
- [x] Create `SQL/v422_financial_menu_items.sql` (menu_items + role_menu_items; My Expenses for ALL roles) — hub + PMO thresholds; see also v416 for permissions
- [x] Create `SQL/v416_financial_permissions.sql`
- [x] Create `src/hooks/useFinancialPermissions.js`

### Phase 1 — Project Cost Management
- [x] Create `SQL/v417_project_cost_entries_and_baselines.sql`
- [x] Create `src/services/projectCostService.js`
- [x] Create `src/pages/platform-app/ProjectCostManagement.jsx`
- [x] Create `src/pages/platform-app/ProjectBudgetBaseline.jsx`
- [x] Create `src/services/simProjectCostService.js`
- [x] Create `src/pages/simulator/SimProjectCostManagement.jsx`
- [x] Create `src/pages/simulator/SimProjectBudgetBaseline.jsx`

### Phase 2 — EVM Full Implementation
- [x] Create `SQL/v418_project_evm_snapshots.sql`
- [x] Create `src/services/evmService.js`
- [x] Create `src/pages/platform-app/ProjectEVMPage.jsx`
- [x] Create `src/pages/platform-app/ProgrammeEVMPage.jsx`
- [x] Create `src/pages/platform-app/PortfolioEVMPage.jsx`
- [x] Create `src/services/simEvmService.js`
- [x] Create `src/pages/simulator/SimProjectEVMPage.jsx`
- [x] Create `src/pages/simulator/SimProgrammeEVMPage.jsx`
- [x] Create `src/pages/simulator/SimPortfolioEVMPage.jsx` (practice portfolio roll-up via `sim` tables)

### Phase 3 — Programme Financial Consolidation
- [x] Create `src/pages/platform-app/ProgrammeFinancialDashboard.jsx`
- [x] Create `src/pages/simulator/SimProgrammeFinancialDashboard.jsx`

### Phase 4 — Revenue & Profitability
- [x] Create `SQL/v419_project_revenue_entries.sql`
- [x] Create `src/services/projectRevenueService.js`
- [x] Create `src/pages/platform-app/ProjectProfitability.jsx`
- [x] Create `src/services/simProjectRevenueService.js`
- [x] Create `src/pages/simulator/SimProjectProfitability.jsx`

### Phase 4b — Expense Claims & Reimbursements (Hierarchical Approval)
- [x] Create `SQL/v420_project_expense_claims.sql` (tables + stub `resolve_expense_approval_chain()` + RLS)
- [x] Create `src/services/expenseClaimService.js`
- [x] Create `src/pages/platform-app/MyExpenses.jsx`
- [x] Create `src/pages/platform-app/ExpenseApproval.jsx`
- [x] Create `src/pages/platform-app/ExpenseApprovalThresholds.jsx`
- [x] Create `src/services/simExpenseClaimService.js`
- [x] Create `src/pages/simulator/SimMyExpenses.jsx`
- [x] Create `src/pages/simulator/SimExpenseApproval.jsx`
- [x] Create `src/pages/simulator/SimExpenseApprovalThresholds.jsx`

### Phase 5 — Financial Reporting Hub
- [x] Create `src/pages/platform-app/FinancialReportingHub.jsx`
- [x] Create `src/pages/simulator/SimFinancialReportingHub.jsx`

### Phase 6 — Simulator SQL
- [x] Create `SQL/v421_sim_financial_tables.sql`
- [x] Table registry included in `v417` / migration chain as applicable (`database_tables` inserts in v417+)
- [x] Create `SQL/v423_resolve_expense_approval_chain_full.sql` (full chain + sim counterpart)
- [x] Create `SQL/v424_programme_financial_rollups_view.sql`

### Phase 7 — Routing & Navigation
- [x] Update `App.jsx` with all new Platform routes
- [x] Update `App.jsx` with all new Simulator routes
- [x] Update `src/config/pmoMenuConfig.js` — Financial Management section + Expense Thresholds config item
- [x] Update `src/config/pmDashboardMenuConfig.js` — Financial section + My Expenses + Expense Approvals
- [x] Update `src/config/simulatorMenuConfig.js` — practice financial items (premium tier on parent group)
- [x] Update `src/config/simulatorPMOMenuConfig.js` — Financial section for Simulator PMO sidebar
- [x] Update `src/config/simulatorPMMenuConfig.js` — Financial section for Simulator PM sidebar
- [x] Add financial-related icons to `Sidebar.jsx` and `SimulatorLayout.jsx` icon maps

### Phase 8 — Unit Tests
- [x] Create `src/services/__tests__/projectCostService.test.js`
- [x] Create `src/services/__tests__/evmService.test.js`
- [x] Create `src/services/__tests__/projectRevenueService.test.js`
- [x] Create `src/services/__tests__/expenseClaimService.test.js`

### Phase 9 — Documentation
- [x] Create `Documentation/v349_Financial_Management_Guide.md`

---

## Implementation review (v349 — completed)

| Area | Summary |
|------|---------|
| **SQL** | Delivered as **v416–v422** (see schedule above). Apply in order on Supabase. |
| **Routes** | Platform: `financial-reports`, `expenses/my`, `expenses/approvals`, `pmo-admin/expense-thresholds`, `projects/:projectId/{costs,budget-baseline,evm,profitability}`, `programme/:id/{evm,financial}`, `portfolio/evm`. Simulator: matching `simulator/...` paths including `practice-projects`, `practice-programme/:programmeId`, `practice-portfolio/evm`, `pmo/expense-thresholds`. |
| **Programme param** | Platform programme routes use **`:id`** (aligned with existing `programme/:id` pages). Simulator programme routes use **`:programmeId`**. |
| **Menus** | DB-driven items via v422; static configs updated for PMO, PM, Simulator main/PMO/PM sidebars; `Sidebar.jsx` icon map extended for financial icons. |
| **Tests** | Vitest coverage for `computeEvmMetrics`, `sumAmounts`, and mocked `listCostEntries` / `getMyExpenses`. |
| **Docs** | `Documentation/v349_Financial_Management_Guide.md` lists routes and SQL order. |
| **Expense resolution** | **v423** replaces the v420 stub; app enforces current approver and paid-only after full approval. |
| **Programme roll-ups** | **v424** view + dashboard summary cards. |

---

## Key Design Decisions

1. **EVM data is time-phased** — one snapshot row per reporting period, allowing S-curve generation
2. **Budget baselines are immutable JSON snapshots** — once locked, original numbers are preserved; revisions create new baseline versions
3. **Cost entries reference existing `budget_categories`** — no new category master needed
4. **Revenue is tracked separately from costs** — allows profitability = revenue − cost
5. **Programme/Portfolio financials are computed** (aggregates from project data) — no double-entry
6. **UX patterns:** New financial **list** pages use **dark-first** styling, **card/table** where implemented, **ExportListMenu** where lists exist; full sort/search/PWA/draft-hold on **every** form is **not** required for v349 closure — add incrementally by page.
7. **Amount shorthand** (`10k` / `3m`) applies where numeric inputs implement the shared pattern (not a global mandate for every field).
8. **Export:** Reuse **`ExportListMenu`** (and related utilities) for table/list exports; full Office suite on every screen is **not** a v349 gate.
9. **All new tables registered** in `database_tables` registry
10. **RBAC enforced at 3 layers**: DB (RLS), menu (permission codes), component (`useFinancialPermissions` hook)
11. **Sponsor/Executive & Board members** are read-only — no create/edit/delete controls rendered
12. **PMO has the highest access** — sees and manages financials across all projects
13. **Programme/Portfolio Managers** get cross-project view within their scope
14. **Expense approval is hierarchical and sequential** — self-approval blocked, rejection returns to submitter at any level, amount thresholds can escalate to higher levels

---

## EVM Metric Reference

| Metric | Formula | Meaning |
|---|---|---|
| SV | EV − PV | Schedule Variance |
| CV | EV − AC | Cost Variance |
| SPI | EV / PV | Schedule Performance Index |
| CPI | EV / AC | Cost Performance Index |
| EAC | BAC / CPI | Estimate at Completion |
| ETC | EAC − AC | Estimate to Complete |
| VAC | BAC − EAC | Variance at Completion |
| TCPI | (BAC − EV) / (BAC − AC) | To-Complete Performance Index |

---

*Plan version: v349 | Created: 2026-04-09*
