# v205 - Mandate Submit for Approval - Full Implementation Plan

## Overview
Complete the "Submit for Approval" workflow for Project Mandates. Fix existing bugs, replace `window.prompt`/`alert` with proper modals, and ensure the full approval flow (submit → approve/reject) works end-to-end.

## Issues Found

### Bugs (Critical)
1. **ProjectMandateView.jsx line 106**: `createProjectFromMandate(mandateId)` — `mandateId` is undefined. Should be `mandate.id`.
2. **ProjectMandateView.jsx line 120**: `if (!mandateId || ...)` — `mandateId` is undefined. Should be `mandate?.id`.
3. **ProjectMandateView.jsx line 123**: `submitForApproval(mandateId, null)` — `mandateId` is undefined. Should be `mandate.id`.
4. **MandateApprovals.jsx line 26**: `getApprovalStatus` returns `{approvals, latest, isApproved, ...}` but sets `setApprovals(data || [])` — should be `setApprovals(data.approvals || [])`.

### UX Issues
5. `MandateApprovalDashboard.jsx` uses `window.prompt()` for rejection reason — needs a proper modal.
6. `MandateApprovals.jsx` uses `prompt()` and `alert()` — needs proper modals and toast.
7. No confirmation dialog before "Submit for Approval" — user needs to confirm.
8. No approval history shown on mandate view page.

## Todo List

- [ ] 1. Fix 3 `mandateId` bugs in `ProjectMandateView.jsx`
- [ ] 2. Create `MandateSubmitModal.jsx` — confirmation dialog for submit for approval
- [ ] 3. Create `MandateApprovalActionModal.jsx` — approve/reject modal with comments field
- [ ] 4. Update `ProjectMandateView.jsx` — wire up confirmation modal, show approval history section
- [ ] 5. Update `MandateApprovalDashboard.jsx` — replace `window.prompt` with the new modal
- [ ] 6. Fix `MandateApprovals.jsx` — fix data bug, replace `prompt`/`alert` with proper modals/toast

## Files to Change
- `src/pages/mandate/ProjectMandateView.jsx` (bug fixes + modal + approval history)
- `src/pages/mandate/MandateApprovalDashboard.jsx` (replace window.prompt)
- `src/components/mandate/MandateApprovals.jsx` (fix data bug, replace alert/prompt)
- NEW: `src/components/mandate/MandateSubmitModal.jsx`
- NEW: `src/components/mandate/MandateApprovalActionModal.jsx`

## Review

### Changes Made

| File | What Changed |
|---|---|
| `src/pages/mandate/ProjectMandateView.jsx` | Fixed 3 `mandateId` undefined bugs → now uses `mandate.id`. Added `showSubmitModal` + `approvalHistory` state. Button now opens confirmation modal. Approval History section rendered below Linked Project. |
| `src/pages/mandate/MandateApprovalDashboard.jsx` | Replaced `window.prompt()` / direct service calls with `actionModal` state + `MandateApprovalActionModal`. |
| `src/components/mandate/MandateApprovals.jsx` | Fixed `getApprovalStatus` return value bug (`data.approvals` not `data`). Replaced `prompt()`/`alert()` with `MandateApprovalActionModal` + toast notifications. Added `onStatusChange` callback prop. |
| `src/components/mandate/MandateSubmitModal.jsx` | NEW — confirmation dialog before submitting, shows mandate title/reference. |
| `src/components/mandate/MandateApprovalActionModal.jsx` | NEW — approve/reject modal with comments textarea; rejection requires a reason. |

### Workflow After Fix
1. User clicks **Submit for approval** → `MandateSubmitModal` opens with mandate details.
2. User clicks **Submit for Approval** in modal → `submitForApproval(mandate.id)` called → status → `submitted` → approval record created.
3. PMO Admin visits Approval Dashboard → clicks **Approve** or **Reject** → `MandateApprovalActionModal` opens.
4. On approve (optional notes) → mandate → `approved`. On reject (required reason) → mandate → `rejected`.
5. View page shows **Approval History** section listing all approval records with status, date, and comments.
