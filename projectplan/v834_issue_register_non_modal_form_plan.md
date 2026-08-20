# v834 — Issue Register create/edit form: non-modal + back to list

## Goal
Replace the circled **Edit Issue / Create Issue** modal on the Issue Register with an
**in-page (non-modal) form**, and add a **← Back to issue list** control that returns to
the register list without a dialog overlay.

## Current state
- `IssueRegisterView` mounts `<IssueForm />` with default `variant="modal"`, which
  `FormSurface` renders as `fixed inset-0` overlay.
- `IssueForm` already accepts `variant` (`'modal' | 'page'`) and passes it to
  `FormSurface`.
- `FormSurface` already supports `variant="page"` (in-page bordered panel, no overlay) —
  used today on PMO oversight routes via `resolveOversightFormVariant`.

## Approach (minimal)
1. **`IssueRegisterView` (Platform + Simulator):** when `showIssueForm` is true, **swap**
   the list/analytics chrome for the form (do not stack a modal on top of the table).
   - Render a **← Back to issue list** button/link at the top that calls the existing
     cancel handler (`setShowIssueForm(false); setSelectedIssue(null)`).
   - Pass `variant="page"` to `IssueForm`.
2. **Leave other callers alone** (`IssueDetailView`, `TasksDetail`, etc.) — they keep the
   default modal unless they already opt into `page`.
3. **No SQL.** No new routes required (same URL; form is a view state on the register page).
4. Theme-aware: reuse existing `FormSurface` / form classes (already light+dark).

## Explicitly out of scope
- Deep-link URL for edit (`?issueId=…`) — nice-to-have later; not required for this ask.
- Changing Risk Register / other register modals.
- Reworking `FormSurface` API beyond what’s needed.

## Todo
- [x] Wire non-modal swap + back link in `apps/platform/src/pages/IssueRegisterView.jsx`
- [x] Mirror in `apps/simulator/src/pages/IssueRegisterView.jsx`
- [x] Smoke-check: Add Issue and Edit Issue both open as page; Back returns to list; Cancel/X same
- [x] Review section

## Review

**Status: complete (Platform + Simulator).**

When Create/Edit is opened from the Issue Register, the list is replaced by an in-page
`IssueForm` with `variant="page"` (no modal overlay). A **← Back to issue list** control
(and the form’s Cancel/X) returns to the register list. Other callers of `IssueForm` still
use the default modal.

**Files:** `apps/platform/src/pages/IssueRegisterView.jsx`, `apps/simulator/src/pages/IssueRegisterView.jsx`
