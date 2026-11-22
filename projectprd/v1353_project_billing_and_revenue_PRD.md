# v1353 — Project Billing & Revenue — PRD

**Status:** Decisions D1–D18 settled with the owner on 2026-11-22 (interview, rules 56–60). Plan:
`projectplan/v1353_project_billing_and_revenue_plan.md`.
**Roadmap:** R6 — Cost, Resource & Performance Management (budgets, actuals, forecasts, variance, performance
indicators); touches R10 (reporting) and R11 (integrations: accounting export).
**Systems:** Platform, Simulator and Planner (D13). Admin: none (billing is per organisation).

---

## a) Problem statement

Project Nidus tracks what a project **costs** but not what it **earns**. Organisations that deliver projects for
clients — consultancies, agencies, engineering and IT service firms, internal shared services that charge back —
cannot bill from Nidus and must re-key hours and milestones in a separate tool.

What exists today (codebase, 2026-11-22):

| Area | What exists | Gap for billing |
|---|---|---|
| Project billing type | `projects.billing_type`: `time_and_material`, `fixed_price`, `cost_reimbursable` (v1180, v1493) | Stored but drives nothing |
| Timesheets | `timesheet_entries` with hours, work category, overtime, approval status | No billable / non-billable flag, no rate, no link to an invoice |
| Rates | `resources.hourly_rate` / `daily_rate` — **cost** rates | No charge-out (bill) rates, no rate cards per client / role / period |
| Expenses | expense claims, categories, approval thresholds | No “rechargeable to client” flag or mark-up |
| Contracts | `contracts`, `contract_milestones` (with `payment_amount`) — supplier side | No client contract or billing milestones |
| Invoices | `invoices` — **supplier** invoices (accounts payable) against contracts / POs | No client invoices (accounts receivable) |
| Clients | `client_id` columns point to a **person** (`users`); client portal exists | No client organisation record to bill |
| Money | budgets, actuals, EVM (project → portfolio), currencies, regional settings | No revenue, margin, unbilled work (WIP) or billing forecast |

## b) Solution (shape)

A **Billing & Revenue** area for each project, driven by the project’s billing type:

1. **Clients** — client organisations with billing details, linked to projects.
2. **Rate cards** — charge-out rates by role / person / work category, with effective dates and currency.
3. **Billable work** — timesheet entries and expenses marked billable (defaults from project and rate card).
4. **Billing schedule** — fixed-price milestones and recurring fees.
5. **Client invoices** — drafted from approved billable time, rechargeable expenses and due milestones; reviewed,
   approved (rule 53) and issued; numbered by Admin ID Generation (rule 16.2); exported (rule 38).
6. **Revenue & margin** — revenue, cost, margin and unbilled work per project, rolled up to programme / portfolio.

## c) User stories (draft — refined in the interview)

1. As a Finance user, I can record a client organisation once and link it to projects.
2. As a PMO Admin, I can define rate cards (role / person / work category, currency, effective dates).
3. As a team member, my timesheet entry is billable or not by default from the project; I can change it if allowed.
4. As a project manager, I can mark an expense as rechargeable to the client.
5. As a project manager on a fixed-price project, I can set billing milestones with amounts and due dates.
6. As Finance, I can create a draft invoice for a project and period, pre-filled with approved billable time
   at the right rate, rechargeable expenses and due milestones.
7. Lines already invoiced cannot be invoiced twice; changing an invoiced timesheet entry is blocked or flagged.
8. An invoice goes through approval with mandatory justification (rule 53) and is locked once issued.
9. Credit notes reverse all or part of an issued invoice.
10. I can export an invoice (PDF / Word / Excel …, rules 38 / 38.1) and send it to the client.
11. I can see revenue, cost, margin and unbilled work per project, and roll them up to programme / portfolio.
12. Dashboard cards (unbilled work, overdue invoices) open the filtered list (rule 64).
13. Simulator learners can practise the same flow on practice projects (rule 34.1).

## d) Implementation decisions

*(settled one at a time in the interview — rules 56–60)*

- **D1 Who is billed (owner, 2026-11-22): a new Clients register** — client organisations (name, billing address,
  tax number, currency, payment terms, billing contacts) linked to projects; one client, many projects. The client
  portal can link to it later. Existing person-level `client_id` columns are left as they are.
- **D2 Client kinds (owner, 2026-11-22): external and internal.** A client is either an external company or an
  internal department / cost centre. Same rates and invoices; internal clients skip tax and their invoices can be
  exported as journal entries instead of being sent.
- **D3 Rates (owner, 2026-11-22): rate cards with overrides.** Organisation rate cards by role (optionally by work
  category) with effective dates and currency; a client or a project may have its own card; a person-level
  override wins. Precedence: person override → project card → client card → organisation card. The rate used is
  frozen on each invoice line. Cost rates on resources stay as they are (used for margin).
- **D4 Billable time (owner, 2026-11-22): approved hours with a billable flag.** Each timesheet entry gets a billable
  flag; the default comes from the project (on for time & materials, off otherwise) and can be set per work
  category. Only **approved, billable, not-yet-invoiced** hours appear on a draft invoice.
- **D5 Invoiced time is locked (owner, 2026-11-22).** A timesheet entry on an issued invoice is read-only. To correct
  it, issue a credit note for that line; the credit releases the entry for editing and re-billing. Enforced in the
  database, not only in the screen.
- **D6 Expenses (owner, 2026-11-22): rechargeable flag with optional mark-up.** Each approved expense line can be
  rechargeable (default per expense category); a client or project may set a mark-up %. Approved, rechargeable,
  not-yet-invoiced lines appear on draft invoices; invoiced expense lines lock like time (D5).
- **D7 Billing schedule per project (owner, 2026-11-22).** Each project can have a billing schedule: lines that are
  milestone-based or date-based, with an amount or a % of the contract value. A line linked to a project milestone
  becomes billable when that milestone is complete; a dated line on its date. Recurring lines cover retainers and
  monthly fees. Delivery milestones stay separate from billing data.
- **D8 Tax (owner, 2026-11-22): organisation tax codes.** Each organisation defines tax codes (e.g. VAT 20%, Exempt,
  Reverse charge) with a default per client; every invoice line carries a tax code and the invoice totals tax by
  code. Internal clients default to no tax (D2). Admin’s own `admin.tax_rates` (SaaS billing) is not reused.
- **D9 Currency (owner, 2026-11-22): invoice in the client’s currency, roll up in the organisation’s.** Rates in
  another currency convert at the invoice date’s exchange rate; that rate is stored on the invoice. Revenue and
  margin roll up in the organisation’s reporting currency (rule 68) using the stored rate.
- **D10 Invoice flow (owner, 2026-11-22): Draft → Approved → Issued → Paid.** Drafts are editable; submitting needs
  approval with a mandatory justification (rule 53, form read-only while pending); approval issues the invoice —
  locked and numbered (Admin ID Generation, rule 16.2). Payments recorded against it move it to Part-paid / Paid;
  past the due date unpaid it shows Overdue. An issued invoice is never edited or deleted — it is reversed by a
  credit note (D5).
- **D11 Accounting (owner, 2026-11-22): export file only.** Issued invoices, credit notes and payments export as
  CSV / Excel / JSON in a documented layout with a legend (rule 71); internal-client invoices export as journal
  entries (D2). Live accounting integrations are later work.
- **D12 Roles (owner, 2026-11-22): a new Finance / Billing role.** Finance manages clients, rate cards and tax codes,
  drafts and submits invoices and records payments. PMO Admin or Account Owner approves (D10). Project Managers see
  their project’s billing schedule, unbilled work and margin, and may draft invoices but not approve them. Menus
  follow rule 75 (catalogue + placement, taxonomy and placement docs in the same change).
- **D13 Systems (owner, 2026-11-22): Platform, Simulator and Planner.** Simulator learners practise the full flow on
  practice projects (`sim` schema, own clients and rate cards; practice invoices clearly marked). The Planner edition
  gets billing too, built on its time-against-tasks entries (the same `timesheet_entries` table, `packages/planning/src/services/timeData.js`); the new tables join the Planner allow-list and the
  Planner database wall is re-run (table registration rule 6).
- **D14 Revenue (owner, 2026-11-22): billed revenue and unbilled work.** Revenue = issued invoices net of credit
  notes; unbilled work (WIP) = approved billable time, rechargeable expenses and due schedule lines not yet
  invoiced; margin = revenue − cost (actuals and cost rates). Shown per project and rolled up to programme and
  portfolio financial dashboards (clickable cards, rule 64). Accrual / % complete recognition stays in the
  accounting system.
- **D15 Invoice document (owner, 2026-11-22): branded standard layout.** One layout using the organisation’s logo
  and colours: header (client, invoice number, dates, payment terms), line table, tax by code, totals, payment
  instructions and footer. Organisations edit only the text parts (payment instructions, footer). Built on the
  shared export engine (rule 38.1): PDF, Word and Excel.
- **D16 Sending (owner, 2026-11-22): email from Nidus and the client portal.** An issued invoice can be emailed (PDF
  attached) to the client’s billing contacts; each send is logged on the invoice. The client portal shows that
  client’s invoices and their status. Downloading to send manually still works.
- **D17 Automation (owner, 2026-11-22): manual now, automatic with v1352.** In this release Overdue is worked out on
  screen, and Finance sends reminders and creates due recurring invoices with a button. When the background-jobs
  framework (v1352) lands, a daily job sends overdue reminders and drafts due recurring invoices — registered in that
  job catalogue (planned rule 80), not as module-own schedules.
  **Amended (owner, 2026-11-22):** v1352 is delivered before v1353, so the jobs ship with billing from the start —
  `billing.overdue_reminders` (daily, organisation time, emails client billing contacts once per reminder step),
  `billing.recurring_drafts` (daily) and `billing.schedule_due` (daily for dated lines; milestone-based lines queued
  through `enqueue_background_job` when the milestone completes). The manual buttons stay.
- **D18 Delivery order (owner, 2026-11-22):** (1) clients, rate cards, tax codes, Finance role; (2) billable time and
  expenses → invoices: draft, approve, issue, pay, credit, export, email; (3) billing schedules — fixed price and
  recurring; (4) revenue, WIP and margin dashboards, accounting export, client portal. Platform, Simulator and
  Planner in every slice; each slice tested and committed before the next.

Standing rules that apply throughout (not re-decided): routed pages, not modals (65); Audit tab (63.1); field help
(76) and regional date inputs (79); success modal (16); display IDs in URLs (16.1); save as draft / hold (37);
amount shorthand (36); bulk upload with legend for clients and rate cards (26 / 71); list sort, row numbers, card /
table toggle and exports (38–44); theme-aware (28.1); performance pass (66); RLS without bypass (42).

## e) Testing decisions

- **Pure logic (unit, Vitest):** rate resolution (precedence and effective dates, D3), billable defaults (D4), mark-up
  (D6), schedule-line due rules (D7), tax by code and rounding (D8), currency conversion with stored rate (D9),
  revenue / WIP / margin arithmetic (D14).
- **Database (SQL test scripts, run in a rolled-back transaction):** invoiced timesheet / expense lines cannot be
  changed (D5); a line cannot be invoiced twice; credit note releases lines; issued invoice cannot be edited or
  deleted (D10); RLS by organisation and role (D12); Planner wall covers the new tables (D13).
- **Screens (React Testing Library):** draft invoice pre-fill, approval with mandatory justification, issue → locked,
  payment → Part-paid / Paid, Overdue shown, export menu, dashboard cards open filtered lists.
- **Parity:** each slice’s Simulator and Planner screens covered by the same tests where the component is shared.
- **Done:** each slice builds in all apps, tests pass with no new failures, owner runs SQL and checks in the browser.

## f) Out of scope

- Payment collection from clients (card / bank) — Nidus records payments; money moves outside.
- Full general ledger, tax filing and accrual / % complete revenue (D14) — handled in the accounting system.
- Live accounting integrations (D11) — later work; this release exports files.
- An invoice template designer (D15).
- (Automatic reminders and recurring drafts are now in scope — D17 amended, v1352 first.)

## g) Further notes

- Reuse: currencies and Regional & Format Settings (rule 68), Admin ID Generation (16.2), record lifecycle approvals
  (53), shared export engine (38.1), register engine where a record is a plain form + list (rule 74).
- Examples follow rule 77 (role titles, “Example … Ltd”, `.example` addresses).
