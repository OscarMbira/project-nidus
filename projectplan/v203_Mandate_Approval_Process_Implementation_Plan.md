# Mandate Approval Process and PMO Sidebar Menu – Implementation Plan

**Plan version:** v203  
**Document version:** 1.0  
**Date:** 2026-02-06  
**Status:** Implementation complete  
**Reference image:** Developer Images/PMO Mandate Approve v1.png  

---

## 1. Executive summary

Mandates currently remain in **draft** status with no way for PMO users to submit them for approval or to approve/authorise them so they can be used to create projects. This plan describes how to implement:

1. **Mandate approval/authorisation flow** – from draft → submitted → approved (or rejected).
2. **PMO sidebar menu** – a dedicated “Approval / Authorisation” (or “Mandate Approval”) entry so PMO users can reach the approval list and act on mandates.
3. **UI changes** – “Submit for approval” on mandate view when status is draft, and Approve/Reject actions on the approval dashboard.

Once approved, the mandate will show as **approved** (not draft) and the PMO user will be able to use **Create Project** from the mandate as intended.

---

## 2. Current state

### 2.1 Mandate status

- **project_mandates.document_status** can be: `draft`, `submitted`, `approved`, `rejected`.
- Mandates created or edited in the PMO flow currently stay in **draft**.
- There is **no “Submit for approval”** action on the mandate view/edit page, so records never move to `submitted` or into the approval queue.

### 2.2 Backend (already present)

- **mandateWorkflowService.js** provides:
  - `submitForReview(mandateId)` – sets `document_status` to `submitted`.
  - `submitForApproval(mandateId, approverId)` – creates a row in **mandate_approvals** with `approval_status: 'pending'` and keeps mandate as `submitted`.
  - `approveMandate(approvalId, approverId, comments)` – sets approval to `approved` and mandate `document_status` to `approved`.
  - `rejectMandate(approvalId, approverId, comments)` – sets approval to `rejected` and mandate `document_status` to `rejected`.
  - `getPendingApprovals(userId)` – returns pending mandate approvals.
- **Database:** Tables **mandate_approvals** and **mandate_reviewers** exist (SQL v160, v162 RLS). No schema change required for the basic flow.

### 2.3 Frontend gaps

- **PMO sidebar (pmoMenuConfig.js):** No menu item for “Mandate Approval” or “Approval / Authorisation”. PMO users cannot navigate to an approval list from the sidebar.
- **PMO routes (App.jsx):** There is **no** route for `/pmo/mandates/approvals`. The platform route `/platform/mandates/approvals` exists and renders **MandateApprovalDashboard**.
- **Mandate view (ProjectMandateView.jsx):** No “Submit for approval” button when status is `draft` (or `rejected` for resubmit).
- **MandateApprovalDashboard.jsx:** Shows pending mandates but only has a “View” action. **Approve** and **Reject** buttons are missing, so approvers cannot complete the authorisation step.

---

## 3. Desired state

1. **Mandate view (PMO and Platform)**  
   - When `document_status === 'draft'` (and optionally when `rejected`): show a **“Submit for approval”** button.  
   - On action: call workflow service to move mandate to “submitted” and create a **mandate_approvals** record with status `pending`.  
   - After approval, mandate shows **approved** and **“Create Project”** is available.

2. **PMO sidebar**  
   - New menu item under **PMO Governance** (or a dedicated section):  
     - **“Mandate Approval”** or **“Approval / Authorisation”**  
     - Path: `/pmo/mandates/approvals`  
   - PMO users can open this from the sidebar and see the list of mandates pending approval.

3. **Approval dashboard (PMO and Platform)**  
   - List of mandates with **pending** approval (existing behaviour).  
   - For each item: **View**, **Approve**, **Reject**.  
   - Approve/Reject call **approveMandate** / **rejectMandate** (with optional comments), then refresh the list and show success/error feedback.

4. **Status display**  
   - Red-boxed status area on mandate view shows **DRAFT** until the mandate is submitted and then approved; after approval it shows **APPROVED** so it is clear the record can be used to create a project.

---

## 4. Implementation phases

### Phase 1: PMO sidebar menu and route ✅ Completed

**Objective:** PMO users can navigate to the mandate approval list from the sidebar.

| # | Task | Details |
|---|------|---------|
| 1.1 | Add PMO sidebar menu item | In **src/config/pmoMenuConfig.js**, under PMO Governance (or a new “Approval” section), add an entry e.g. “Mandate Approval” or “Approval / Authorisation” with path `/pmo/mandates/approvals` and an appropriate icon (e.g. FileCheck, CheckCircle). |
| 1.2 | Add PMO route for approvals | In **App.jsx**, add a route for `path="pmo/mandates/approvals"` that renders **MandateApprovalDashboard** inside the same PMO layout (ThemeProvider → ToastProvider → ProtectedRoute → PMOLayout), consistent with other PMO mandate routes. |
| 1.3 | Verify navigation | Confirm that from any PMO page, the new sidebar item goes to `/pmo/mandates/approvals` and the approval dashboard loads. |

**Deliverables:** Updated `pmoMenuConfig.js`, new PMO route in `App.jsx`, quick smoke test of sidebar and URL.

---

### Phase 2: “Submit for approval” on mandate view ✅ Completed

**Objective:** Author/PMO user can submit a draft (or rejected) mandate for approval so it appears in the approval queue.

| # | Task | Details |
|---|------|---------|
| 2.1 | Add “Submit for approval” button | In **ProjectMandateView.jsx**, when `mandate.document_status === 'draft'` (and optionally `=== 'rejected'` for resubmit), show a primary button: “Submit for approval”. |
| 2.2 | Wire to workflow service | On click: call **submitForApproval(mandateId)** from **mandateWorkflowService** (or a thin wrapper that uses current user as approver if needed). Ensure backend allows submission when there are no reviewers (current code allows this). On success: refresh mandate (or navigate) and show toast success. On error: show toast/alert with message. |
| 2.3 | Optional: prevent double submit | Disable the button or hide it when mandate is already `submitted` or `approved`, or when a pending approval record already exists for this mandate. |
| 2.4 | Context-aware path | Use existing `basePath` / `isPMOContext` so that after submit the user stays in PMO context (e.g. redirect or refresh to same mandate view or to `/pmo/mandates/approvals`). |

**Deliverables:** Updated **ProjectMandateView.jsx**, optional wrapper in **mandateWorkflowService** if needed, and manual test: draft → Submit for approval → mandate appears in approval list.

---

### Phase 3: Approve and Reject on approval dashboard ✅ Completed

**Objective:** PMO user can approve or reject a mandate from the approval/authorisation menu so that the record moves to **approved** (or **rejected**) and is no longer stuck in draft/submitted.

| # | Task | Details |
|---|------|---------|
| 3.1 | Add Approve button | In **MandateApprovalDashboard.jsx**, for each pending approval card, add an **“Approve”** button. On click: call **approveMandate(approval.id, currentUserId, comments)**. Optional: modal or inline field for approval comments. |
| 3.2 | Add Reject button | Add a **“Reject”** button. On click: call **rejectMandate(approval.id, currentUserId, comments)**. Optional: modal for rejection reason. |
| 3.3 | Post-action behaviour | After approve/reject: refresh the pending list (e.g. refetch `getPendingApprovals`), show success toast, and optionally redirect or update local state so the item disappears from the list. |
| 3.4 | Error handling | On API failure, show error toast and leave the list unchanged so the user can retry. |
| 3.5 | Optional comments | If comments are required by policy, add a small modal or inline input for comments before calling approve/reject. |

**Deliverables:** Updated **MandateApprovalDashboard.jsx** with Approve/Reject actions and basic error/success feedback.

---

### Phase 4: Status display and “Create Project”

**Objective:** After approval, the mandate view clearly shows **APPROVED** (not draft) and the “Create Project” action is available for PMO.

| # | Task | Details |
|---|------|---------|
| 4.1 | Verify status badge | Ensure the red-boxed status section on mandate view shows **APPROVED** when `document_status === 'approved'` (and DRAFT/SUBMITTED/REJECTED for other values). Existing logic may already support this; confirm and adjust if needed. |
| 4.2 | “Create Project” visibility | **canCreateProject(mandateId)** already requires `document_status === 'approved'` and `project_id === null`. Confirm that the “Create Project” button is visible on mandate view when the mandate is approved and unlinked. |
| 4.3 | Resubmit after reject | If Phase 2 supports resubmit when status is `rejected`, ensure the approval dashboard no longer shows that mandate in the pending list after rejection, and that “Submit for approval” is shown again on the mandate view. |

**Deliverables:** Confirmation (and minor fixes if needed) of status display and Create Project visibility; short test script for full flow. **✅ Phase 4 Completed**

---

## 5. Technical notes

### 5.1 Workflow service usage

- **Submit for approval (draft → approval queue):** Use **submitForApproval(mandateId, approverId)**. It creates a **mandate_approvals** row with `approval_status: 'pending'` and sets mandate to `submitted`. The service checks for pending **mandate_reviewers**; if there are none, the check passes.
- **Approve:** **approveMandate(approvalId, approverId, comments)** updates the approval row to `approved` and the mandate to `document_status: 'approved'`.
- **Reject:** **rejectMandate(approvalId, approverId, comments)** updates the approval row to `rejected` and the mandate to `document_status: 'rejected'`.
- **getCurrentUserId:** The workflow service uses **getCurrentUserId()** (from `users` table via `auth_user_id`). Ensure PMO users exist in **users** and are linked to auth so approval actions run under the correct user.

### 5.2 Permissions and RLS

- **mandate_approvals** and **mandate_reviewers** have RLS; PMO Admin has FOR ALL policies. Ensure the logged-in PMO user has the appropriate role so they can insert/update **mandate_approvals** and update **project_mandates** (document_status). No schema change is assumed; only behaviour and UI.

### 5.3 Routes summary

| Route | Purpose |
|-------|--------|
| `/pmo/mandates/approvals` | **New.** PMO mandate approval dashboard (list + Approve/Reject). |
| `/platform/mandates/approvals` | **Existing.** Platform approval dashboard; can be updated similarly with Approve/Reject if desired. |
| `/pmo/mandates/:mandateId/view` | **Existing.** Mandate view; add “Submit for approval” when draft/rejected. |

### 5.4 Files to touch (summary)

| File | Changes |
|------|--------|
| **src/config/pmoMenuConfig.js** | Add “Mandate Approval” (or “Approval / Authorisation”) menu item with path `/pmo/mandates/approvals`. |
| **src/App.jsx** | Add route `pmo/mandates/approvals` → MandateApprovalDashboard inside PMO layout. |
| **src/pages/mandate/ProjectMandateView.jsx** | Add “Submit for approval” button and handler; call submitForApproval. |
| **src/pages/mandate/MandateApprovalDashboard.jsx** | Add Approve and Reject buttons; call approveMandate/rejectMandate; refresh list and toasts. |
| **src/services/mandateWorkflowService.js** | Optional: ensure submitForApproval works when there are no reviewers (no code change if already allowed). |

---

## 6. Testing checklist (after implementation)

- [x] PMO sidebar shows “Mandate Approval” (or chosen label) and links to `/pmo/mandates/approvals`.
- [x] Opening `/pmo/mandates/approvals` shows the approval dashboard (empty or with pending items).
- [x] On a mandate in **draft**, “Submit for approval” is visible and clickable; after submit, status becomes submitted and a pending approval exists.
- [x] Pending mandate appears on `/pmo/mandates/approvals` with View, Approve, Reject.
- [x] “Approve” sets mandate to **approved** and removes it from the pending list (or marks it approved in the list).
- [x] “Reject” sets mandate to **rejected** and removes it from the pending list.
- [x] On mandate view, when **approved**, the red-boxed status shows APPROVED and “Create Project” is visible and works.
- [x] Rejected mandate can be edited (if allowed) and resubmitted for approval if that option is implemented.

---

## 7. Out of scope (for this plan)

- **Reviewer workflow:** Assigning reviewers, mandate_reviewers, and “Submit for review” before “Submit for approval” are not required for the minimal flow (draft → submit for approval → PMO approves). They can be added later.
- **Notifications:** mandateWorkflowService has placeholder notification functions; implementing email/in-app notifications is separate.
- **Audit trail:** Storing full history of approvals/rejections (beyond existing mandate_approvals columns) can be a follow-up.
- **Platform vs PMO parity:** This plan focuses on PMO; platform mandate approval can be aligned in a later pass (same dashboard component, same actions).

---

## 8. Approval and next steps

- **Implementation:** Complete (Phases 1–4 implemented).
- **Stakeholder:** Optional regression check on existing mandate create/edit/view and project creation from an approved mandate.

**Document owner:** Development team  
**Reference:** Developer Images/PMO Mandate Approve v1.png (red-boxed draft status; goal: move to approved via approval menu and actions).
