# v860 — Form Instance Bulk Approve + View Workflow — Implementation Plan

**PRD:** `projectprd/v860_form_instance_bulk_approve_and_workflow_PRD.md`  
**Repo:** `E:\project-nidus` (Platform + Simulator).  
**Status:** COMPLETE — implemented after user Approve.

---

## Guiding constraints

- Smallest diff: reuse `formEngineService` status transitions; extend helpers in `formInstanceRegisterUtils`.
- Theme-aware (28.1); Platform + Simulator parity (34.1).
- Mandatory justification on Approve/Reject (rule 53).
- Org setting on `public.accounts` (same pattern as v673 methodology).

---

## Phase 1 — Shared helpers + org cap SQL

- [x] **1.1** SQL `v860_accounts_form_bulk_approve_max.sql` — column `form_bulk_approve_max INT NOT NULL DEFAULT 1000` + check `BETWEEN 1 AND 10000` (or similar sane max)
- [x] **1.2** Helpers: `canSubmitFormInstance`, `canApproveFormInstance`, `canRejectFormInstance`, `canBulkApproveFormInstance`; bulk select + cap validators (+ Vitest)
- [x] **1.3** `formEngineService`: resolve current `users.id` for approver; fetch versions + audit; harden approve/reject to require comments; optional thin `bulkApproveFormInstances`

## Phase 2 — Form View workflow + history

- [x] **2.1** Upgrade `ApprovalWorkflowPanel` — disable by status; comment modal/field for Approve/Reject; busy/error states; theme pairs
- [x] **2.2** Wire Platform `FormView` — Submit / Approve / Reject / Archive; reload instance + history/audit after success
- [x] **2.3** Simulator `FormView` + panel parity

## Phase 3 — FormsGallery bulk select / approve

- [x] **3.1** Platform FormsGallery — checkboxes (draft only), select all filtered drafts, toolbar Approve selected + shared comment modal, enforce org cap
- [x] **3.2** Load `form_bulk_approve_max` from project’s account
- [x] **3.3** Org settings UI field (next to methodology settings) Platform + Simulator
- [x] **3.4** Simulator FormsGallery parity

## Phase 4 — Docs + verify

- [x] **4.1** `Documentation/Form_Instance_Bulk_Approve_Workflow_v860_Guide.md`
- [x] **4.2** Unit tests green; manual UAT checklist in plan review
- [ ] **4.3** Mark PRD/plan complete after user sign-off

---

## Review section

### Summary
Delivered bulk draft approve on Project Forms, wired Form View Submit/Approve/Reject/Archive with mandatory justification, loaded version history + audit timeline, and added org-configurable `form_bulk_approve_max` (default 1000) on `public.accounts`.

### Apply in Supabase
1. `SQL/v860_accounts_form_bulk_approve_max.sql`
2. Ensure v858/v859 form_instances RLS already applied

### Manual UAT
- [ ] Select all drafts on template-filtered records → Approve with comment
- [ ] Form View: Submit, Approve, Reject, Archive with correct enablement
- [ ] Version History / Audit Timeline update after actions
- [ ] Change org bulk-approve max and confirm enforcement
