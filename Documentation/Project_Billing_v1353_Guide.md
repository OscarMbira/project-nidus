# Project billing and revenue (v1353)

Clients, charge-out rates, tax codes and client invoices for Platform, Simulator and Planner. Supplier invoices are unchanged.

## Run the SQL, in order

1. `SQL/v1577_billing_foundations.sql`
2. `SQL/v1578_client_invoices.sql`
3. `SQL/v1579_billing_schedule_jobs.sql`
4. `E:\project-nidus-admin\SQL\v259_billing_id_generation_seed.sql` (after the tables exist, so display ids are assigned)
5. `SQL/v1580_billing_tests.sql` (rolls back; skips when you are not signed in)
6. `SQL/v1581_billing_gaps.sql` (simulator locks, queued milestone billing, exchange rates)
7. `SQL/v1582_billing_issue_role.sql` (only a PMO Admin or the account owner can issue)
8. `SQL/v1583_billing_assertion_tests.sql` (rolled back; it raises if an issued invoice can be changed)
9. `SQL/v1584_billing_sample_seed.sql` (sample client invoices, tax codes, rate card and a payment on SEED334-PRJ-08)

If a saved client or invoice has a blank reference, run Admin v259 again.

## Where to open it

- **Money & Resources:** Clients, Rate cards, Tax codes, Client invoices, Revenue and margin. Invoice payment text and exchange rates are on Client invoices → Payment text. A draft line can be changed or removed. Email billing contacts attaches the PDF. Send overdue reminders is on the invoice list. Programme and portfolio financial pages show billed revenue, unbilled value, cost, and margin.
- **On a project:** any schedule page → **Billing** → Billing settings, Billing schedule, Client invoices, Revenue and margin.
- **Planner:** the same schedule menu, plus **Client billing** at `/app/client-billing` (the existing Billing page is the subscription, and is left as it is).
- **Client portal:** the portal’s Invoices button opens issued invoices for that project.

## How an invoice moves

Draft (approved billable time, rechargeable expenses, due schedule lines) → Submit → Approve with a justification, which issues it → Record payment → Part-paid or Paid. Past the due date with money still owed, the list shows Overdue. An issued invoice is not edited. A credit note reverses the lines and releases the time or expense so it can be billed again.

A person rate wins, then the project card, then the client card, then the organisation card. The rate is stored on the invoice line.

Internal clients are not taxed. The accounting export writes them as journal lines. External invoices, credit notes and payments export as CSV and JSON with a data dictionary.

## Jobs

Registered in the background-job catalogue (Admin → Background Jobs):

- `billing.schedule_due` — daily, and again when a milestone is marked achieved
- `billing.recurring_drafts` — daily
- `billing.overdue_reminders` — daily email to billing contacts at 7, 14 and 30 days, once each

**Draft due lines now** on the billing schedule runs the first two immediately.
