# v1353 — Project Billing & Revenue — Implementation plan

**PRD:** `projectprd/v1353_project_billing_and_revenue_PRD.md` (owner decisions D1–D18, 2026-11-22).
**Systems:** Platform (`public`), Simulator (`sim`), Planner (`public`, Planner edition) — D13.
**Method:** test-first vertical slices (App_Guide), one per D18 step; each slice builds in all apps, tests pass with
no new failures, is committed, and the owner runs its SQL and checks in the browser before the next starts. SQL
numbers are taken from `ls SQL` immediately before each file (rule 18.0).

## Facts this plan builds on

- `projects.billing_type`: `time_and_material` | `fixed_price` | `cost_reimbursable` (v1180, v1493).
- `timesheet_entries` (Platform, Simulator twin, Planner via `packages/planning/src/services/timeData.js`): hours,
  work category, overtime, status draft / submitted / approved / rejected; no billable flag.
- `resources.hourly_rate` / `daily_rate` are **cost** rates (kept for margin).
- Expense claims with items, categories, approval thresholds.
- `invoices`, `contracts`, `contract_milestones` are **supplier** side (v644) — not reused for client billing; new
  client-billing tables use distinct names (`client_invoices` …) to avoid confusion.
- Currencies, Admin exchange rates, Regional & Format Settings (rule 68), organisation branding, shared export engine
  (rule 38.1), record lifecycle approvals (rule 53), Admin ID Generation (rule 16.2), client portal (v644).

## Data model (new tables, `public` and `sim` twins; RLS on; registered in `database_tables`; Planner wall)

| Table | Purpose | Key columns |
|---|---|---|
| `clients` | Client organisations (D1, D2) | `client_reference` (display ID), name, kind `external`/`internal`, billing address, tax number, currency, payment terms (days), default tax code, mark-up %, notes |
| `client_contacts` | Billing contacts | client, name, role title, email, phone, is_billing_contact |
| `project_billing_settings` | Project ↔ client and billing defaults | project, client, rate card, billable default, mark-up %, contract value, currency |
| `rate_cards` / `rate_card_lines` | Charge-out rates (D3) | card scope (organisation / client / project), currency, effective from / to; line: role or person or work category, unit (hour / day), rate |
| `tax_codes` | Organisation tax codes (D8) | code, label, rate %, kind (standard / exempt / reverse charge), is_default |
| `billing_schedule_lines` | Fixed price and recurring (D7) | project, description, basis (milestone / date / recurring), milestone link, amount or % of contract value, due date / frequency, status |
| `client_invoices` / `client_invoice_lines` | Invoices (D10) | `invoice_reference` (display ID), client, project, status draft / pending_approval / issued / part_paid / paid / cancelled, dates, currency, exchange rate to org currency, totals; line: source (time / expense / schedule / manual), source id, quantity, unit, rate (frozen), amount, tax code, tax |
| `client_credit_notes` / lines | Reversals (D5, D10) | `credit_note_reference`, invoice, reason, lines pointing at invoice lines |
| `client_payments` | Payments received (D10) | invoice, date, amount, method, reference |
| `client_invoice_sends` | Email log (D16) | invoice, recipients, sent at, sent by |
| `invoice_document_settings` | Text parts of the layout (D15) | organisation, payment instructions, footer |

Columns added: `timesheet_entries.is_billable`, `timesheet_entries.client_invoice_line_id`; expense claim items
`is_rechargeable`, `client_invoice_line_id`; `timesheet_work_categories.billable_default`;
`expense_categories.rechargeable_default`.

Database rules (triggers / RPCs, `SECURITY DEFINER` where needed, never bypassing RLS from clients):
- Lock: an entry / expense item linked to an issued invoice line cannot be updated or deleted (D5, D6) — released only
  by a credit note for that line.
- No double billing: a source row can be on at most one non-cancelled invoice line.
- Issue: `issue_client_invoice` assigns the display ID, freezes totals and exchange rate (D9), sets `issued` — only
  from approved; issued invoices are immutable.
- Rate resolution in SQL and JS from one rule set (person → project card → client card → organisation card, by
  effective date) with shared test vectors.

Admin (separate repo): `admin.id_generation_rules` seeds for `public|sim.clients`, `client_invoices`,
`client_credit_notes` (rule 16.2, Admin SQL).

## Slice 1 — Foundations (clients, rate cards, tax codes, Finance role)

Tests first: rate resolution vectors; tax rounding; client form validation; RLS (Finance / PMO / PM / team).
- [x] SQL: `clients`, `client_contacts`, `rate_cards`, `rate_card_lines`, `tax_codes`, `project_billing_settings`
      (public + sim), registry, display-ID triggers, Planner wall re-run; Finance / Billing role + `role_menu_items`;
      companion seed (rule 18.2: “Example …” clients, blank references).
- [x] Admin SQL: ID generation rules for the new reference columns.
- [x] Pages (routed, rule 65; Audit tab 63.1; field help 76; success modal 16; draft/hold 37; exports 38):
      Clients list + create / view / edit, contacts; Rate cards; Tax codes; Project › Billing settings tab.
- [x] Bulk upload with legend (rules 26 / 71): clients, rate card lines.
- [x] Menus (rule 75): catalogue + placements (Finance section; PM Project Settings); taxonomy + placement docs (70).
- [x] Simulator twins (practice data) and Planner pages for the same set.
- [x] Field help seeds (public + sim aliases); guide started.
- [x] Exit: builds, tests, commit; owner SQL + browser check. (Owner applied the SQL. Platform billing pages checked in the browser.)

## Slice 2 — Time & materials invoicing (billable time, expenses, invoice lifecycle)

Tests first: billable defaults; draft pre-fill picks only approved + billable + not-invoiced; mark-up; lock and
double-billing triggers; issue / pay / credit flows; Overdue.
- [x] SQL: billable / rechargeable columns + defaults; `client_invoices` (+ lines), credit notes, payments, sends;
      triggers and RPCs above; tax by code.
- [x] Timesheet and expense screens: billable / rechargeable toggles (all three products for timesheets).
- [x] Invoice pages: draft from project + period, edit lines (manual lines too), submit for approval (rule 53),
      issue, record payment, credit note; list with filters (status, client, overdue); dashboard cards (rule 64).
- [x] Invoice document (D15): branded layout on the export engine (PDF / Word / Excel); document text settings.
- [x] Email send (D16) via the existing send-email function, logged; manual reminder and recurring buttons (D17).
- [x] Jobs (D17 amended, rule 80): register `billing.overdue_reminders` (daily, organisation time; marker so each
      reminder step is sent once) in the v1352 catalogue with its handler and tests.
- [x] Simulator + Planner parity; field help; tests.
- [x] Exit as slice 1.

## Slice 3 — Billing schedules (fixed price, recurring)

- [x] SQL: `billing_schedule_lines`; due rules (milestone complete / date / recurring frequency).
- [x] Project › Billing schedule page; due lines appear on draft invoices; % of contract value.
- [x] Jobs (D17 amended, rule 80): `billing.schedule_due` (daily for dated lines; milestone-complete trigger calls
      `enqueue_background_job`) and `billing.recurring_drafts` (daily) in the v1352 catalogue, idempotent per line
      and period.
- [x] Parity, field help, tests; exit.

## Slice 4 — Revenue, WIP, margin, accounting export, client portal

- [x] Revenue / WIP / margin per project (D14); roll-ups on programme and portfolio financial dashboards (clickable
      cards, rule 64); reporting views.
- [x] Accounting export (D11): invoices, credit notes, payments (CSV / Excel / JSON with legend); internal clients as
      journal entries (D2).
- [x] Client portal: client’s invoices and status (D16).
- [x] Check all three billing jobs show run history in Admin › Background Jobs (D17 amended). The jobs are registered; history appears after the first tick.
- [x] Guide `Documentation/Project_Billing_v1353_Guide.md`; ROADMAP R6 status update; parity, tests; exit.

## Risks

| Risk | Mitigation |
|---|---|
| Money rounding / currency errors | Server-side totals, NUMERIC(18,2), shared rate/tax test vectors, stored exchange rate |
| Editing billed time breaks invoices | Database lock + credit-note release (D5), tested in SQL |
| Planner wall / allow-list drift | Re-run v1251 and regenerate the allow-list in each slice (CI `app-planner.yml`) |
| Scope size | Four slices, each shippable; automation uses the v1352 framework (built first) |
| Confusion with supplier invoices | Distinct `client_*` table names and a separate Finance menu section |

## Review

Implemented 2026-11-24. The owner has applied v1577–v1584, Admin v259, and the Planner wall. `send-email` and `background-job-worker` are deployed on project qltvojzcmzqiixuvauoj. Platform billing pages, the project billing schedule, and the programme and portfolio financial pages were checked in the browser. Simulator and Planner use the same screens; those two apps were not signed in during the check.

Shared screens live in `packages/planning` and are routed for Platform (`/platform/billing`), Simulator (`/simulator/billing`), Planner (`/app/client-billing`) and on every schedule under Billing. A draft line can be added, changed, or removed. Issuing stores the invoice-date exchange rate. The invoice email attaches the PDF. The layout uses the organisation logo and colours, a line table, tax by code, and the payment text. Accounting files include invoices, credit notes, and payments. Overdue reminders can be sent from the invoice list; the daily job still sends each step once. Programme and portfolio financial pages show billed revenue, unbilled value, cost, and margin. Screen tests cover the overdue filter, draft, approval justification, payment, and the export menu. `background-job-worker` is deployed with `billing.schedule_due`, and `send-email` is deployed with PDF attachments. `SQL/v1582_billing_issue_role.sql` limits issuing to a PMO Admin or the account owner. Simulator practice invoices stay issuable by the learner and are marked Practice. The invoice header includes payment terms. Client, tax, rate-card, invoice, schedule and portal lists sort, export, and switch between card and table. A client opens read-only and is edited on its own page. `SQL/v1583_billing_assertion_tests.sql` fails the transaction if an issued invoice can be edited, deleted, or billed twice. `SQL/v1584_billing_sample_seed.sql` adds sample invoices, a tax code, a rate card and a payment on SEED334-PRJ-08.

### v1359 audit corrections (2026-11-28)

The v1359 gap closure (`projectplan/v1359_v1353_to_v1356_gap_closure_plan.md`) found and fixed:
- **Wrong rates (B9):** drafts ignored rate-card dates, read only the first card per scope and never matched role lines.
- **Menu side effect (B5):** `SQL/v1577` placed every `_fin_` menu item (Banking register pages too); undone by
  `SQL/v1610`, and v1577 narrowed.
- **Planner wall (X2):** `client_credit_notes` / `client_payments` were missing from the Planner allow-list.
- **Rules:** currency from Regional & Format Settings and the currencies list (B1); rate-card dates (B2); role and
  person pickers (B3); client upload preview and confirmation (B4); confirm dialog for draft lines (B6); Revenue money
  format and click-through (B10); a red timesheet test (B11).
- Admin `SQL/v259` was uncommitted (X1).
Outstanding: Simulator and Planner billing browser checks (B7).
