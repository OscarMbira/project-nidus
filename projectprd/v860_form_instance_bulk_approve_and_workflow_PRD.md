# v860 — Form Instance Bulk Approve + View Workflow Actions — PRD

**Repo:** `E:\project-nidus` (Platform + Simulator monorepo).  
**Companion plan:** `projectplan/v860_form_instance_bulk_approve_and_workflow_plan.md`  
**Status:** Approved & implemented (see plan review).

---

## a) Problem statement

After Excel bulk draft create (v857), Project Forms shows many **Draft** rows. Users need to approve them in bulk (or select all filtered drafts). On the form instance **view** page, Submit / Approve / Reject / Archive are visible but only partially wired (no Submit/Archive handlers, no mandatory justification, no reload). Version History and Audit Timeline render empty.

---

## b) Solution

1. **Records list (FormsGallery):** row checkboxes for draft rows; Select all = all **draft** rows in the **current filtered list**; toolbar **Approve selected** with one shared mandatory comment; soft cap from org setting (default 1000).
2. **Record view (FormView):** fully wire Submit / Approve / Reject / Archive with status-gated enablement, mandatory comments on Approve/Reject, toast + reload status; load Version History and Audit Timeline from DB.
3. **Org setting:** `public.accounts.form_bulk_approve_max` (default 1000), editable next to other org settings (PMO Admin / Organisation Methodology Settings pattern).
4. **Platform + Simulator parity.**

Reuse existing `submitFormForApproval` / `approveForm` / `rejectForm` / `archiveForm` in `formEngineService`.

---

## c) User stories

1. As a project member, I can checkbox-select one or more **draft** rows on Project Forms (template-filtered or all-forms view).
2. As a project member, I can **Select all** drafts in the current filtered list (not only the current page; not other templates when filtered by `templateCode`).
3. As a project member, I can **Approve selected** drafts → status `approved`, with one shared mandatory comment applied to each.
4. As a project member, if selection exceeds the org bulk-approve max, I see a clear error and no partial approve runs until I reduce the selection.
5. As a PMO admin / account owner, I can change `form_bulk_approve_max` (default 1000) in organisation settings.
6. As a project member on Form View, I can **Submit** when status is `draft` or `rejected` → `in_review`.
7. As a project member on Form View, I can **Approve** when status is `draft` or `in_review` → `approved`, with mandatory justification.
8. As a project member on Form View, I can **Reject** when status is `in_review` → `rejected`, with mandatory justification.
9. As a project member on Form View, I can **Archive** when status is `draft`, `in_review`, or `rejected` (not `approved`).
10. As a project member on Form View, after any status action I see success/error feedback and the updated status.
11. As a project member on Form View, I see Version History and Audit Timeline populated from `form_version_history` / `form_audit_log`.
12. As a project member on the list, Edit and Archive (trash) keep current behaviour (no hard-delete).
13. Simulator has the same behaviours for practice form instances.

---

## d) Implementation decisions (locked)

| # | Decision |
|---|----------|
| D1 | Bulk action = **Approve selected** only (draft → approved); skip `in_review` for bulk. |
| D2 | Single Approve/Reject require non-empty comments; Bulk Approve uses one shared comment. |
| D3 | Select all = drafts in current filtered list. |
| D4 | Button enablement per Q4 table (Submit: draft/rejected; Approve: draft/in_review; Reject: in_review; Archive: draft/in_review/rejected). |
| D5 | List Edit/trash stay as-is (trash = archive). |
| D6 | Platform + Simulator. |
| D7 | Who can approve: any user with project access (existing RLS). |
| D8 | Version History + Audit Timeline **in scope**. |
| D9 | Soft cap default **1000**, configurable on `public.accounts.form_bulk_approve_max`. |
| D10 | No new form workflow tables; reuse `form_approvals` + `form_audit_log` + status column. |

---

## e) Testing decisions

- Unit tests for status-gate helpers and bulk-select eligibility / cap check.
- Manual UAT: bulk-approve filtered drafts; single view Submit→Approve and draft→Approve; Reject; Archive; history/audit appear after actions.

---

## f) Out of scope

- Hard-delete of form instances.
- Bulk Submit / Bulk Reject / Bulk Archive.
- Role-restricted approver matrix / multi-step approval routing.
- Background jobs for &gt;1000 rows.
- Admin-app changes (unless ID rules discovered — none expected).

---

## g) Further notes

- Apply any needed SQL for `accounts.form_bulk_approve_max` as `SQL/v860_*.sql`.
- Prefer resolving approver `users.id` for `form_approvals.approver_id` (same pattern as `owner_id` on create).
- Theme-aware panels/modals (rule 28.1); success toasts with display/instance reference where available (rule 16).
