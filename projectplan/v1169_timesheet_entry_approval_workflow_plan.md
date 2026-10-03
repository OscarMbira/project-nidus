# v1169 — Timesheet Entry Approval Workflow (Reasons, Lock, Notification, History)

See `projectprd/v1169_timesheet_entry_approval_workflow_PRD.md` for the full problem statement,
user stories, and decisions already settled via interview. This plan breaks that PRD into vertical
slices. Platform file paths are listed; every slice mirrors the same change to Simulator's
equivalent path in the same step (rule 34.1), unless noted otherwise.

## Todo

### Slice 1 — Schema
- [x] `SQL/v1169_timesheet_entry_approval_workflow.sql`: `timesheet_entry_approve_reasons`,
  `timesheet_entry_reject_reasons` (public only, shared reference data, same precedent as
  `assignment_roles`), `timesheet_entry_reviews` (public + sim — append-only, `CHECK
  (cardinality(reason_ids) >= 1)` enforced at the DB level too), RLS, `database_tables` registry.
- [x] `SQL/v1169b_timesheet_entry_approval_reasons_seed.sql`: 6 approve reasons, 7 reject reasons.
- [x] `SQL/v1169c_timesheet_review_reasons_menu.sql`: sidebar menu + role grants, Platform
  (`pmo-admin-timesheet-review-reasons`, PMO-admin-only tier) and Simulator
  (`sim-pmo-timesheet-review-reasons`).

### Slice 2 — Service layer
- [x] `timesheetService.js`: `approveTimesheetEntry`/`rejectTimesheetEntry` now take
  `(id, reviewerId, reasonIds, notes)`, throw if `reasonIds` is empty, insert into
  `timesheet_entry_reviews`, still update `timesheet_entries.status/reviewed_by/review_notes`.
  New `listTimesheetEntryReviewHistory(entryId)`. Notification (in-app `createNotification` +
  email `sendEmail`) is best-effort — wrapped so a notification/email failure never blocks the
  decision itself.
- [x] New `timesheetReasonCatalogService.js`: CRUD parameterized by decision, mirrors
  `assignmentRoleService.js`.

### Slice 3 — Review UX (`TeamTimesheetsPage.jsx`)
- [x] Approve/Reject now each open their own reason multi-select + optional notes; Confirm is
  disabled until ≥1 reason is checked. Also brought the whole page up to theme-aware (rule 28.1
  amend rule — it was dark-only) and swapped `auth.getUser()` for `auth.getSession()` (same
  no-network-round-trip fix already applied to My Timesheets).

### Slice 4 — Review History (`TimesheetEntryDetail.jsx`)
- [x] New "Review History" card replaces the old single rejection-notes/approved card — every
  past decision, newest first, with reviewer name, reasons, notes, and timestamp. Theme-aware.

### Slice 5 — Field lock (`TimesheetEntryForm.jsx`)
- [x] `<fieldset disabled>` wraps the form when the loaded entry's `status === 'submitted'`; Save
  actions hidden in that state too. Theme-aware.

### Slice 6 — Reason catalog management page
- [x] `TimesheetReviewReasons.jsx` — one page, Approve-reasons/Reject-reasons tab switch (per
  plan-review answer), same CRUD/Audit-tab/row-action shape as `AssignmentRoles.jsx`. Routed at
  `/platform/pmo-admin/timesheet-review-reasons` and `/simulator/pmo/timesheet-review-reasons`,
  linked from both PMO Configuration Home pages.

### Slice 7 — Simulator parity
- [x] Every file above mirrored to Simulator's equivalent path (services, pages, routes,
  lazyImports, routeCommon, PmoConfigurationHome cards). Reason catalogs stay `public`-only and
  read via `platformDb` from Simulator too, same precedent as `assignment_roles`.

### Slice 8 — Tests
- [x] `timesheetService.test.js` (mandatory-reason validation, append-only review insert +
  entry update + notification/email call, notification-failure doesn't block the decision,
  history ordering) and `timesheetReasonCatalogService.test.js` (table routing by decision,
  CRUD). Mirrored to Simulator. 13 tests, both apps, all passing.

### Slice 9 — Review
- [x] See Review section below.

## Review

**What changed:**
- Schema: 3 new tables (`SQL/v1169*.sql`) — two reason catalogs, one append-only review-history
  table (public + sim). `timesheet_entries` itself is untouched; its `status`/`reviewed_by`/
  `review_notes` columns are still updated for current-state reads.
- Services: `timesheetService.js` (approve/reject now mandatory-reasons + history write +
  notify), new `timesheetReasonCatalogService.js`.
- UI: `TeamTimesheetsPage.jsx` (new review UX), `TimesheetEntryDetail.jsx` (Review History card),
  `TimesheetEntryForm.jsx` (field lock while `submitted`), new `TimesheetReviewReasons.jsx`
  (catalog admin). `MyTimesheetsPage.jsx` and `PlanningProjectBar.jsx` got the earlier
  single-project auto-select fix (done before this plan was written, see PRD).
- Routing/menu: new route + lazy import + sidebar menu entry in both apps.
- Every file mirrored to Simulator; all touched files syntax-checked with esbuild; all 13 new
  tests pass in both apps.

**To deploy:** run `SQL/v1169_timesheet_entry_approval_workflow.sql`, then
`SQL/v1169b_timesheet_entry_approval_reasons_seed.sql`, then
`SQL/v1169c_timesheet_review_reasons_menu.sql`, in that order (v1169c depends on v1169's tables
existing; v1169b depends on v1169's tables existing).

**Remaining risk / not done:**
- No backfill of history for decisions made before this ships — only new decisions are recorded
  (documented as deliberate in the PRD, rule 12).
- Manual in-browser verification (submit → reject with reasons → resubmit → approve → check
  Review History, lock, notification) has not been run — recommend doing that pass after the SQL
  is applied.
- A separate, unrelated `src/services/sim/simTimesheetService.js` (both apps) exists on
  `sim.timesheet_entries` with the OLD 2-reason-free signature — confirmed zero callers
  (dead code, consistent with other dead shadow-copies found earlier this session). Not touched;
  flagged here rather than silently left for a future session to rediscover.
