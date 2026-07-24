# v751 — Approval Justification & Field Lock Plan (Platform + Simulator)

**Created:** 2026-07-06
**Status:** Complete
**Companion to:** `project-nidus-admin/projectplans/v19.0_approval_justification_and_field_lock_plan.md` — same two requirements, ported to the Platform/Simulator Record Lifecycle implementation (`public`/`sim` schemas, reference plan `v639_Record_Lifecycle_Management_Plan.md`), which predates and differs architecturally from the admin app's Category B implementation this was ported from.
**Applies to:** `apps/platform` and `apps/simulator` — both apps maintain their own local copy of the lifecycle UI components (`src/components/ui/RecordLifecycleToolbar.jsx`, `AuthorisationRequestModal.jsx`, `src/modules/record-lifecycle/pages/LifecyclePages.jsx`), matching this repo's three-app parity convention, so every change below applies once per app at the equivalent path.

---

## 0. Requirements (as given, same as the admin-side plan)

1. Every approval page/form must have a **mandatory** comments/justification field for the authoriser — recorded for audit, explaining why they approved (or rejected) the change.
2. **All other fields must be non-editable** while a record is under approval — approve or reject, with a reason either way, but no data changes.

## 1. Current state on Platform/Simulator — different shape than admin, same gaps

Platform/Simulator's Record Lifecycle UI is centralised in a dedicated queue module (`src/modules/record-lifecycle/pages/LifecyclePages.jsx`, routed via `RecordLifecycleRoutes.jsx`) rather than embedded per-record like the admin app's `RecordLifecyclePanel`. Relevant pieces:

- **`AuthorisationQueuePage`** (used for both `PendingApprovalsPage` — the approver's queue — and the PMO overview) lists pending requests and opens **`AuthorisationRequestModal`** in `mode="decide"` to approve/reject.
- **`AuthorisationRequestModal.jsx`** (`src/components/ui/`, duplicated per app) already has both **Approve** and **Reject** buttons in decide mode — ahead of where the admin record-page toolbar was before `v19.0` — but:
  - Its notes field is explicitly labelled **"Notes (optional)"** and nothing blocks `onDecision('approve'|'reject', notes)` from firing with an empty string. **Requirement 1 is not met today.**
  - It shows the approval chain (`ApprovalChainDisplay`) but **no diff of what actually changed** on the record — same gap the admin plan closed for My Approvals in `v18.0`.
- **`RecordLifecycleToolbar.jsx`** (`src/components/ui/`, duplicated per app) exists as a built component (Submit/Validate/Delete/Amend/Reverse/Archive/View, driven by handler props) but **is not imported or wired into any page** in either app today — confirmed by search across `apps/platform/src` and `apps/simulator/src`. The Risk/Issue/Project detail forms have no per-record lifecycle panel at all; the only decision surface is the queue page above.
- **Risk/Issue/Project edit forms have zero awareness of `record_status`.** Nothing in those forms currently checks status or disables fields — a record sitting in `unauthorised` today can still be freely edited and saved by anyone with edit rights, same underlying problem the admin app had, just via a different code path (there's no per-record panel to gate here, the plain edit form itself needs the check added). **Requirement 2 is not met today.**

## 2. Important architectural difference from admin — flag, don't silently inherit v18.0's assumption

Admin's `v18.0` plan fixed a defect where edits applied to the row **immediately**, before approval — the fix was a defer-apply `record_pending_changes` staging table. Checking Platform/Simulator's `public.submit_for_authorisation` (`SQL/v654_lifecycle_functions.sql:109`), it **only flips `record_status = 'unauthorised'`** on the row — it does not stage or restore field values at any point in the flow (`v654` lines ~154, ~363, ~367 only ever touch `record_status`/`authorised_by`/`authorised_at`). This means the same underlying defect admin had before `v18.0` likely also exists here: whatever "amend" call precedes submission already wrote the new values directly onto the live row, so **by the time a record reaches `unauthorised`, its fields already show the unapproved values** — there's no prior-approved snapshot left to diff against or fall back to.

**This plan does not attempt to fix that** (it would be a Category-A-appropriate equivalent of `v18.0`'s defer-apply redesign — a materially larger, separate piece of work, and Category A's physical `_history`/`_archive` table split may already partially cover it in ways Category B did not; needs its own investigation before committing to an approach). Flagging it here because it changes what requirement 2's "lock other fields" can honestly promise: locking the form prevents *further* changes once submitted, but the values already visible when the form is locked may already be the pending (unapproved) ones, not the last-live ones. If this turns out to matter to you, treat it as a v752+ follow-up plan, scoped after this one ships.

## 2b. Defer-apply investigation — completed (v752)

Investigation confirmed Category A `_history`/`_archive` does **not** prevent immediate-apply. The defect is the same as admin pre-v18.0: live rows were mutated before approval with no staging snapshot.

**Resolution:** `projectplan/v752_record_lifecycle_defer_apply_plan.md` — `record_pending_changes` staging (`SQL/v750`–`v752`), governed update gates on pilot tables, and queue diff UI via `PendingChangesDiff`. After v752, field lock shows **last-approved** values while pending edits sit in staging until approve/reject.

## 3. Scope — this plan only

Given §2, this plan is scoped tightly to the same two things done for admin, adapted to what exists here:

**Requirement 1 — mandatory justification, both apps:**
- `AuthorisationRequestModal.jsx`: relabel the textarea "Justification (required)", disable both the **Approve** and **Reject** buttons while `notes.trim()` is empty (mirrors admin's `useConfirmAction` behavior — this codebase enforces mandatory reason client-side only, no server-side check exists on the admin side either, so staying consistent rather than introducing an asymmetric server check here).
- Apply identically to `apps/platform/src/components/ui/AuthorisationRequestModal.jsx` and `apps/simulator/src/components/ui/AuthorisationRequestModal.jsx`.

**Requirement 2 — lock other fields during approval, both apps:**
- Thread `record_status` into the Risk/Issue/Project (and any other governed-table) detail/edit forms — these currently don't fetch or check it at all, so this is new plumbing, not a toggle on existing plumbing (unlike admin, where `lifecycleMeta` was already tracked).
- Wrap each form's field block in `<fieldset disabled={recordStatus === 'unauthorised'}>` (same technique as admin `v19.0` §3 — cascades `disabled` to every descendant control without editing each field individually), plus a locked-state banner reusing whatever ribbon/banner component the app already has for similar states.
- Optional but recommended for consistency with admin: also wire `RecordLifecycleToolbar` (already built, currently unused) into these same detail forms so a reviewer looking at the record itself sees its lifecycle status/actions in place, not only from the separate queue page — decide in Phase 0 whether this is in scope now or deferred, since it's net-new integration work beyond the two stated requirements.

**Diff visibility in the queue (nice-to-have, mirrors admin's `v18.0`/`v19.0` `PendingChangesDiff`):** given §2's finding that pre-approval values are already overwritten here, a same-shape diff view isn't buildable without the defer-apply work first — **out of scope for this plan**, tracked as dependent on whatever comes out of a future defer-apply investigation (§2).

## 4. Phased implementation checklist

- [x] **Phase 0 — Approval:** confirm §3 scope (mandatory justification + field lock only, `RecordLifecycleToolbar` wiring **deferred**, diff view explicitly out of scope pending §2)
- [x] **Phase 1 — Mandatory justification:** update `AuthorisationRequestModal.jsx` in `packages/ui` (runtime import for both apps) and synced app copies
- [x] **Phase 2 — Field lock:** thread `record_status` into Risk/Issue/Project detail forms in both apps; `RecordLifecycleFieldLock` + banner on detail pages; `<fieldset disabled>` on edit forms
- [ ] **Phase 3 (deferred):** wire `RecordLifecycleToolbar` into detail forms — tracked for a follow-up plan
- [x] **Phase 4 — Docs:** updated `Documentation/Record_Lifecycle_Management_Guide.md` (+ public mirror) with v751 behaviour and manual test steps
- [x] **Phase 5 — Tests:** `packages/ui/src/__tests__/AuthorisationRequestModal.test.jsx` and `RecordLifecycleFieldLock.test.jsx`
- [x] **Follow-up (not in this plan):** investigate whether Category A's physical `_history`/`_archive` split already protects against the immediate-apply defect noted in §2 — **done in v752**; defer-apply shipped in `SQL/v750`–`v752` and `v752_record_lifecycle_defer_apply_plan.md`

## 5. Review

**Shipped (2026-07-06):**

| Area | Change |
|------|--------|
| `packages/ui/src/AuthorisationRequestModal.jsx` | Decide mode: "Justification (required)", Approve/Reject disabled until non-empty; trimmed notes passed to handler |
| `packages/ui/src/RecordLifecycleFieldLock.jsx` | Shared lock banner + fieldset wrapper + `isRecordLifecycleLocked()` helper |
| Platform + Simulator forms | `EnhancedRiskForm`, `IssueForm`, `ProjectsEdit` — field lock + save guards |
| Platform + Simulator detail pages | `RiskDetail`, `IssueDetailView`, `ProjectsDetail` — banner, disable Edit/mutating actions when `unauthorised` |
| Docs | `Documentation/Record_Lifecycle_Management_Guide.md` v751 section |
| Tests | Vitest coverage for modal justification gate and field lock component |

**Deferred:** per-record `RecordLifecycleToolbar` integration (Phase 3).

**Completed via v752:** defer-apply staging + queue diff view (`PendingChangesDiff` in authorisation modal).
