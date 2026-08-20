# v833 — Issue Register list columns: Aging, Due date, Last Update

## Goal
Add three columns to the Issue Register **table (list) view**: **Aging**, **Due date**, and **Last Update**, so the register is easier to scan for stale and overdue items (matching the circled table in the user’s screenshot).

## Scope
- Presentation only in `IssueList` (list/`viewMode === 'list'` branch).
- Mirror the same change to Platform + Simulator (rule 34.1).
- Optionally surface the same three facts in card (`grid`) view for parity (Due date is already shown there).
- Add the three fields to `ISSUE_COLUMNS` export definitions so list exports include them (rule 38).
- Extend existing `IssueList` unit tests.

## Data (already on `issues` — no SQL)
| Column | Source | Display |
|--------|--------|---------|
| Aging | `date_raised` → fallback `created_at` | e.g. `12d` / `0d`; closed/resolved issues still show age from raised date (same rule as `get_issue_aging`) |
| Due date | `due_date` | `MMM dd, yyyy` or `—`; overdue + still open → red text |
| Last Update | `updated_at` | `MMM dd, yyyy` or `—` |

No new queries: `getIssues` already selects `*`.

## Column order (list table)
`#` · Title · Type · Priority · Status · Assigned · **Aging** · **Due date** · Created · **Last Update** · Actions

## Explicitly out of scope
- Sortable headers for the new columns (existing headers are already `sortable={false}`; leave as-is).
- Seeding `due_date` on demo rows (can be empty → `—`).
- Risk / Lessons list columns.

## Todo
- [x] Add Aging / Due date / Last Update cells + helpers in `apps/platform/src/components/IssueList.jsx`
- [x] Mirror to `apps/simulator/src/components/IssueList.jsx`
- [x] Add export keys in `IssueRegisterView.jsx` (Platform + Simulator)
- [x] Update `IssueList` unit tests (Platform; Simulator copy if present)
- [x] Review section in this plan

## Review

**Status: complete (Platform + Simulator).**

**What changed**
- `IssueList.jsx` (both apps): list table now has **Aging**, **Due date**, and **Last Update** between Assigned and Actions (Created kept). Aging is `Nd` from `date_raised` → `created_at`. Open issues past `due_date` render the due cell in red. Card/grid view also shows Aging, Due, and Updated.
- Helpers exported for reuse/tests: `getIssueAgeDays`, `formatIssueAge`, `isIssueDueOverdue`.
- `IssueRegisterView.jsx` (both apps): export columns include Aging / Due date / Created / Last Update; export rows compute `aging` via `formatIssueAge`.
- Unit tests: 9 passing in Platform `IssueList.test.jsx` (list headers + helper behaviour); Simulator test file mirrored.

**No SQL** — columns already exist on `issues`.

**Verify in browser:** Issue Register → List ≡ view → confirm the three new columns; toggle light/dark; export includes Aging.

### Follow-up — full-width table (same session)
Removed nested `max-w-7xl` on `IssueRegisterView` and `PMControlsIssueRegister` (Platform + Simulator), matching Risk Register’s `w-full` layout so Title stays on one row (`whitespace-nowrap`). Description still clamps to one line.
