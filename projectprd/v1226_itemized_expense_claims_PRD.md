# v1226 — Itemized / Grouped Expense Claims (Platform + Simulator)

## a. Problem statement

A user submitting an expense claim today can only capture a single amount against a single
description (e.g. "Printer ink — $120"). In practice, many real-world expenses are a single
receipt covering multiple distinct purchases — a grocery run with five different items, a
hardware-store trip, a per-diem covering several meals. Today the user is forced to either
(a) submit several separate claims for one physical receipt, which is unnatural and makes
reconciliation against the receipt harder for an approver, or (b) collapse everything into one
opaque total with no breakdown, which gives the approver no way to see what they're actually
approving.

Separately, the Simulator app's expense-claims feature was partially built (full DB schema,
RLS, and the hierarchical approval-chain RPC all already exist — see `SQL/v421` and `SQL/v423`)
but was never finished at the UI layer: `SimMyExpenses.jsx` is a read-only list, and
`SimExpenseApproval.jsx` / `SimExpenseApprovalThresholds.jsx` are placeholder stubs. This PRD
also closes that gap so Platform and Simulator reach genuine parity (rule 34.1) on this feature,
rather than leaving Simulator's expense claims permanently unusable.

## b. Solution

Add an optional itemized breakdown to an expense claim: a claim can still be a single typed
amount (today's flow, unchanged), or the user can toggle "Itemize this expense" to reveal a
line-items table (description, category, amount). Once itemized, the claim's total becomes a
read-only, live sum of its line items — there is no way for the total to drift from the items.

Line items are stored in a new child table (`project_expense_claim_items` / sim mirror),
referencing a new DB-backed `expense_categories` lookup table (with a full admin CRUD screen,
mirroring the existing Project Types/Statuses admin pattern) for per-line categorisation.

Finish the Simulator expense-claims UI (New claim/My claims form, a real approvals review
screen, a real thresholds admin screen) on top of the hierarchical schema/RPC that already
exist there, and apply the same itemization capability to it, so Platform and Simulator reach
full parity on this feature.

## c. User stories

1. As a user filling in a new expense claim, I can leave it as a single amount (today's flow),
   with no extra steps required.
2. As a user filling in a new expense claim, I can toggle "Itemize this expense" to switch to
   an itemized breakdown instead of a single amount.
3. As a user itemizing a claim, I can add a line item with a description, an amount, and an
   optional category, and see a running total update live.
4. As a user itemizing a claim, I can edit or delete a line item I've already added, while the
   claim is still a draft.
5. As a user itemizing a claim, the claim's "Amount" field becomes read-only and always equals
   the sum of my line items — I cannot type a total that disagrees with the items.
6. As a user, I cannot submit an itemized claim with zero line items (if I toggle itemization
   on, I must add at least one item, or toggle it back off).
7. As a user, each line item amount must be greater than zero, same validation as the
   single-amount flow today.
8. As a user, once I submit a claim (it leaves draft status), I can no longer add, edit, or
   delete its line items — the whole claim becomes read-only, consistent with how the rest of
   the claim already locks on submit.
9. As a user viewing a claim's detail page, I see the itemized breakdown (if any) read-only
   under the claim's fields.
10. As an approver reviewing a pending claim, I can see the itemized breakdown for claims that
    have one, not just the total.
11. As a user exporting my expenses list, each claim still exports as one row (with its total).
12. As a user exporting a single claim's detail page, the export includes each line item as its
    own row/entry (Excel: one item per row; Word/PDF/PPT: itemized list under the claim fields),
    per the existing export conventions (rule 38).
13. As a PMO Admin, I can manage the list of expense categories (add, edit, deactivate) from a
    dedicated admin screen, mirroring the existing Project Types/Statuses admin pages.
14. As a Simulator user, I have the same New claim/My claims experience as Platform, including
    itemization, backed by `sim.practice_projects` instead of `public.projects`.
15. As a Simulator approver, I see a real approvals review screen (not a stub) with
    Approve/Reject/History, mirroring Platform's `ExpenseApproval.jsx`.
16. As a Simulator PMO user, I see a real expense-thresholds admin screen (not a stub),
    mirroring Platform's `ExpenseApprovalThresholds.jsx`.
17. As a developer, the Simulator approval chain continues to use the existing
    `sim.resolve_expense_approval_chain` RPC and hierarchical schema already in place — no
    parallel/simplified schema is introduced.

## d. Implementation decisions

- Itemization is **optional**, toggled per claim; the single-amount flow is unchanged when the
  toggle is off.
- When itemized, the claim's `amount` column is **auto-computed** from the sum of its line
  items (read-only in the UI) — not independently typed and validated against the sum.
- Line items capture **description, amount, and an optional category** (via the new
  `expense_categories` lookup). Vendor/date/receipt stay at the claim level (one receipt, one
  vendor, one date per claim).
- Line items are stored in a **new child table** (`project_expense_claim_items`, with a `sim.`
  mirror), not a JSONB column — consistent with how budget lines and other itemized data in
  this codebase already work, and needed for row numbers (rule 44), per-row CRUD, and export.
- A **new DB-backed `expense_categories` lookup table** (+ `sim.` mirror) replaces the idea of a
  hardcoded category list, with a **full admin CRUD screen** in both apps, modeled directly on
  the existing `ProjectTypes.jsx` / `projectTypeService.js` pattern. No Admin ID Generation
  wiring (rule 16.2) — this is a simple reference/lookup table with no transactional
  display-ID needs, same precedent as `project_statuses`/`project_types`.
- A **new dedicated itemized-table UI component** is built in `@nidus/ui` (not an extension of
  `MultiLineListInput`, which only supports single-text-value rows) — row #, description,
  category dropdown, amount, inline edit/delete, add-item row, running total footer. Shared
  identically by Platform and Simulator forms.
- Line items are **locked once the claim leaves draft status**, consistent with the existing
  whole-claim field lock on submit (rule 53).
- Line items are **saved as part of the same claim save** (delete-all + re-insert on each save,
  same pattern as `project_budget_categories`), not persisted independently per-row — simpler
  and avoids partial-save races, consistent with the existing "Save changes"/"Save draft"
  single-action UX.
- **Simulator scope reversed mid-interview**: `sim.project_expense_claims`,
  `sim.expense_approval_steps`, `sim.expense_approval_thresholds`, and
  `sim.resolve_expense_approval_chain` **already exist** (`SQL/v421`, `SQL/v423`) and already
  mirror Platform's full 3-level hierarchical approval model. This PRD finishes the missing UI
  layer (`SimMyExpenses.jsx` → full New claim/My claims form; `SimExpenseApproval.jsx` → real
  approvals review; `SimExpenseApprovalThresholds.jsx` → real thresholds admin) rather than
  building a separate simplified single-approver model, which would have duplicated already-
  working infrastructure.
- Exports (rule 38) include itemized lines on single-record export only; the list-level export
  stays one row per claim.

## e. Testing decisions

- TDD, vertical-slice (tracer bullet) style per `App_Guide.md`: one failing test → minimum code
  to pass → repeat, for each slice in the implementation plan.
- Unit tests for: the new itemized-table component (add/edit/delete/sum), the category service,
  the claim save path with items (sum computation, delete-all+reinsert), the submit-lock
  behaviour (items become read-only once not-draft), and the Simulator equivalents.
- No new integration/E2E test infra introduced — follows existing Vitest + React Testing
  Library conventions already used throughout `src/pages/**/__tests__`.

## f. Out-of-scope items

- Per-line receipts/attachments (receipt stays single, claim-level).
- Linking line items to budget categories/lines (unlike Cost Actuals' Category field, expense
  claims are not budget-tracked line-by-line in this pass).
- Any change to the existing threshold-based approval chain logic itself (`resolve_expense_
  approval_chain`) — it continues to key off the claim's total `amount`, unchanged.
- Migrating/backfilling existing claims into itemized form — existing claims simply have zero
  line items and continue to display as simple/flat claims.
- A field-level change log for expense categories or claims (metadata-only audit per rule
  63.1, not a value-level diff).

## g. Further notes

- Table/route/service naming for Simulator mirrors existing conventions exactly:
  `sim.practice_projects` (not `sim.projects`) is the real live project table; `sim.
  project_expense_claims` already references it via `practice_project_id`.
- Version v1226 is used across the PRD, implementation plan, and all new SQL migrations in this
  initiative, to keep them traceable as one piece of work (current highest SQL version at the
  time of writing was v1225; plan/PRD folders were at ~v1206).
