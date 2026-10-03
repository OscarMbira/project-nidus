# v1169 — Timesheet Entry Approval Workflow (Reasons, Lock, Notification, History)

## a) Problem statement

Project Nidus already has an entry-level timesheet approve/reject flow (`TeamTimesheetsPage.jsx`,
reached via "Team View" from My Timesheets): a reviewer types one free-text note and clicks
Approve or Reject. This has three gaps the Project Manager (the reviewer on most projects) hit
in practice:

1. **No mandatory justification.** Only Reject requires a note today; Approve can be confirmed
   with nothing typed at all, and even on Reject the note is one unstructured free-text field —
   there is no consistent, reportable reason captured for either decision.
2. **No resubmission history.** `approveTimesheetEntry()` / `rejectTimesheetEntry()` both call
   `updateTimesheetEntry()`, which overwrites the same row's `status` / `reviewed_by` /
   `review_notes`. If an entry is rejected, edited, and resubmitted, the PM's second decision
   silently erases all trace of the first — there is no way to see that an entry was ever
   rejected before, what the original reason was, or who reviewed it that first time.
3. **No notification.** Nothing tells the team member who submitted an entry that it was
   approved or rejected — they only find out by manually revisiting My Timesheets.

A separate, newer period-level (weekly) approval system also exists (`TimesheetApproverQueuePage.jsx`
/ `timesheet_approvals`, v963 GAP-13) that already solves resubmission history architecturally
(every decision is an appended row), but it operates on whole weeks, not individual entries, and
is not linked from My Timesheets. The PM's own description of what they want to review — one row
per entry, matching what's already visible on My Timesheets/Team View — confirmed the entry-level
flow is the one to extend, not the weekly one (user decision, interview Q1).

## b) Solution

Extend the existing entry-level approve/reject flow on `TeamTimesheetsPage.jsx` /
`timesheetService.js` so that:

- Approve and Reject each have their **own separate, DB-backed reason catalog**
  (`timesheet_entry_approve_reasons`, `timesheet_entry_reject_reasons`) that the PM multi-selects
  from, plus a free-text Notes field for anything the catalog doesn't cover. Both catalogs get a
  full CRUD management page (mirroring `AssignmentRoles.jsx`), so a PMO Admin can add/edit/
  deactivate reasons without a SQL migration.
- The action button (Approve or Reject) stays **disabled until at least one reason is selected**
  for that decision — mandatory justification, consistent with CLAUDE.md rule 53's
  approval-justification pattern. Notes stays optional.
- Every decision is recorded as a **new row** in a new `timesheet_entry_reviews` history table
  (decision, reviewer, selected reason ids, notes, decided_at) — never overwritten. The existing
  `timesheet_entries.status` / `reviewed_by` / `review_notes` columns are kept and still updated
  for "current state" (minimal disruption to existing reads), but the history table is the system
  of record for "has this ever been reviewed before, and what happened."
- `TimesheetEntryDetail.jsx` gains a **Review History** section (reverse-chronological list of
  every past decision on that entry, each showing reviewer, decision, reasons, notes, and date) —
  visible to both the submitter and the PM.
- While an entry's `status = 'submitted'` (awaiting PM decision), its edit form renders
  **read-only** — the submitter can view but not change the entry until the PM decides, per
  CLAUDE.md rule 53's field-lock requirement for governed decision surfaces.
- On Approve or Reject, the submitter is notified **in-app (notifications bell, existing
  `createNotification()` pattern) and by email** (existing `sendEmail()` / `send-email` Edge
  Function pattern — degrades to a console log if no active email configuration exists, same as
  every other email send in the app already does).
- My Timesheets also gets a small, separate, low-risk fix bundled into the same change: when the
  logged-in user has exactly one assigned project, the project picker auto-selects it and renders
  as a static label instead of a dropdown with one option (**already implemented** ahead of this
  PRD, see Implementation decisions).

## c) User stories

1. As a Project Manager reviewing a submitted entry, I can click Approve, pick one or more reasons
   from a predefined approve-reasons list, optionally add notes, and the Approve button only
   becomes clickable once I've picked at least one reason.
2. As a Project Manager reviewing a submitted entry, I can click Reject, pick one or more reasons
   from a predefined reject-reasons list, optionally add notes, and the Reject button only becomes
   clickable once I've picked at least one reason.
3. As a Project Manager, I can see every reason I pick is drawn from a list specific to the
   decision I'm making (I never see "Within scope" offered as a rejection reason).
4. As a PMO Admin, I can add, edit, and deactivate approve-reasons and reject-reasons from a
   dedicated management page, without needing a SQL migration.
5. As a team member whose entry was rejected, edited, and resubmitted, I can see on the entry's
   detail page every past review decision — not just the most recent one — including who reviewed
   it, what reasons were given, any notes, and when.
6. As a team member, I cannot edit a time entry while it is `submitted` and awaiting a PM decision
   — the form is read-only until the PM approves or rejects it.
7. As a team member, I receive an in-app notification and an email the moment my entry is approved
   or rejected, including the reasons/notes given.
8. As a Project Manager with only one assigned project, My Timesheets shows my project directly
   instead of making me pick it from a one-item dropdown.
9. As a PMO Admin / Project Manager / Team Manager, Platform and Simulator behave identically for
   all of the above (rule 34.1 parity).

## d) Implementation decisions

- **Entry-level, not period-level** (interview Q1) — this builds on `TeamTimesheetsPage.jsx` /
  `timesheetService.js`, not the weekly `timesheetPeriodService.js` / `timesheet_approvals` system.
  The two remain independent; this PRD does not touch the weekly flow.
- **Reasons: predefined catalog, not free-typed list** (interview Q2) — new DB tables, not a
  `MultiLineListInput`-style free-add list.
- **Separate catalogs per decision** (interview Q3) — `timesheet_entry_approve_reasons` and
  `timesheet_entry_reject_reasons` are two distinct tables, each with their own CRUD page.
- **Multi-select** (interview Q4) — a PM can pick more than one reason per decision.
- **Full CRUD management page for both catalogs** (interview Q5) — same shape as
  `AssignmentRoles.jsx` (table/card toggle, row numbers, icon-only row actions, Audit tab, theme-
  aware, `navigate(-1)` back button). Likely one page with an Approve-reasons / Reject-reasons tab
  switch rather than two separate routes, to avoid duplicating near-identical CRUD scaffolding —
  confirm in the plan review.
- **In-app + email notification** (interview Q6) — reuses `createNotification()`
  (`notificationUtils.js`) and `sendEmail()` (`emailIntegrationService.js`); no new
  infrastructure. Submitter only (not the wider team/PMO) — the user asked specifically for "the
  associated user who submitted the timesheet" to be notified.
- **Existing `timesheet_entries.review_notes`/`reviewed_by` columns are kept**, still updated with
  the latest decision for backward compatibility with existing reads (`TimesheetEntryDetail.jsx`'s
  current Rejection Notes / Approved cards). The new `timesheet_entry_reviews` table is the
  authoritative multi-row history; nothing is removed from the existing schema.
- **Field lock while `submitted`** — mandated by CLAUDE.md rule 53 for any decision-gated record,
  applied here without a separate interview question since it's a standing repo rule, not a new
  design choice. `TimesheetEntryForm.jsx`'s edit mode renders read-only (`<fieldset disabled>`)
  when the loaded entry's `status === 'submitted'`.
- **My Timesheets single-project auto-select** — already implemented (new opt-in
  `autoSelectSingle` prop on the shared `PlanningProjectBar.jsx`, used only by `MyTimesheetsPage.jsx`
  so the other 26 consumers of that shared bar are unaffected). Mentioned here for completeness;
  no further plan/approval needed for that piece.
- **Reason catalog tables are lightweight lookups** (code/name/description/sort_order/is_active +
  audit fields + RLS), same shape as `assignment_roles`/`currencies` — no Admin ID Generation
  display-id wiring (rule 16.2 doesn't apply; these aren't business-record reference columns, same
  precedent as `assignment_roles`).
- **Platform–Simulator parity** (rule 34.1) — every file touched gets mirrored to Simulator's
  equivalent paths in the same change.

## e) Testing decisions

- Unit tests for the new service functions (`timesheetService.js`'s updated
  `approveTimesheetEntry`/`rejectTimesheetEntry`, plus new reason-catalog CRUD functions and
  `listTimesheetEntryReviewHistory`) in `src/services/__tests__/`.
- Manual verification in-browser: submit an entry, reject it with 2 reasons + notes, confirm the
  submitter gets an in-app notification and (if email is configured) an email; edit and resubmit;
  approve the resubmission; confirm both decisions appear in Review History in order, oldest-to-
  newest reversed (newest first); confirm the entry's edit form is read-only while `submitted`.
- "Done" = all 9 user stories above are demonstrably true in the running app, for both Platform
  and Simulator.

## f) Out-of-scope items

- The weekly/period-level approval system (`timesheetPeriodService.js`) is untouched.
- Field-level change diffs (what specifically changed between the rejected version and the
  resubmitted version) — explicitly out of scope per the same reasoning as CLAUDE.md rule 63.1
  ("this rule does not require a field-level change log... deliberately separate, larger effort").
  Review History shows decisions and reasons, not before/after field diffs.
- Bulk approve/reject (approving many entries at once) — not requested, not in scope.
- Escalation, auto-approve, or approval-settings configuration — that already exists for the
  weekly flow (`timesheet_approval_settings`) and is not being extended to the entry-level flow
  here.

## g) Further notes

- This PRD intentionally keeps `timesheet_entries.review_notes`/`reviewed_by` rather than
  migrating existing data into the new history table retroactively — no backfill is planned;
  history starts accumulating from the first decision made after this ships (rule 12: no
  sample/dummy data, and there's no reliable way to reconstruct past decisions that were already
  overwritten before this change).
