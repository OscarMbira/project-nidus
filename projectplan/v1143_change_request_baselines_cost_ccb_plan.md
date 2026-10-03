# v1143 — Change request baselines, cost and effort, and Change Board approval — Implementation Plan

**PRD:** `projectprd/v1143_change_request_baselines_cost_ccb_PRD.md`
**Status:** PRD amended for the Category document list. Not approved for implementation.

Category fills the documents that must be updated. The user removes names that do not apply to this project and can add a name, which is then available to other projects in the organisation. A Change Board member approves or rejects in the system. Only that decision sets Approved or Rejected.

---

## Phase 0 — SQL (`SQL/v1143_change_category_documents_and_board.sql`)

- [ ] `public.change_requests`
  - `requires_cost_estimate BOOLEAN NOT NULL DEFAULT FALSE`
  - `requires_effort_estimate BOOLEAN NOT NULL DEFAULT FALSE`
  - No separate “must update baselines” flag. Category drives the document list.
- [ ] `public.change_update_document_catalogue`
  - `account_id` null for shared defaults, set for an organisation addition
  - `change_category` (`scope`, `schedule`, `budget`, `quality`, `resource`, `risk`, `technical`, `other`)
  - `document_name` (1–200), `is_system`
  - Unique on category + lower(name) among shared rows, and on account + category + lower(name) among organisation rows
  - Seed the shared names from PRD stories 3–10
  - Register in `database_tables`
- [ ] `public.change_update_document_exclusions`
  - `project_id`, `change_category`, `document_name`
  - Unique per project + category + name
  - Register in `database_tables`
- [ ] `public.change_request_update_documents`
  - `change_request_id`, `document_name`, `link_status` (`required`, `updated`)
  - This is the saved list on the request
  - Register in `database_tables`
- [ ] RLS: catalogue readable by the organisation (shared rows by any authenticated user). Insert of an organisation row uses the same edit roles as the requestor catalogue. Exclusions and request rows follow project access on `change_requests`.
- [ ] Reuse `public.change_approvals` and `sim.practice_change_approvals`. Do not add a second decision table.
  - Send to Change Board inserts `approval_level = 'change-board'`, `decision = 'pending'`.
  - Approve / Reject sets `decision` to `approved` or `rejected` and requires `decision_rationale`.
  - The writer must be an active board member for the request’s board with `can_approve_changes = TRUE`. That write sets the request status.
  - A non-change-board approval row does not set the request status.
- [ ] Simulator mirror: catalogue scoped by `user_id` for additions (shared rows still `user_id` null), exclusions by `practice_project_id`, request rows on `practice_change_requests`. `sim.get_current_user_id()` for RLS.
- [ ] No new menu row. No sample change requests.

## Phase 1 — Platform service

- [ ] Resolve the list for a project + category: shared names + this account’s names − this project’s exclusions.
- [ ] `addChangeUpdateDocument(accountId, category, name)` inserts an organisation catalogue row, or returns the existing one. If this project had excluded that name, clear the exclusion.
- [ ] `excludeChangeUpdateDocument(projectId, category, name)` writes the project exclusion and drops the name from the open request list.
- [ ] Save and load `change_request_update_documents` with the request. Changing category replaces that request’s rows with the newly resolved list.
- [ ] `submitChangeRequestToBoard` and `decideChangeRequest` as in the PRD. Saving an assessment recommendation must not change status.
- [ ] Unit tests for the resolve, add, exclude, and status rules.

## Phase 2 — Platform form

- [ ] On Basic Info, under Category: the resolved document list in a table with row numbers. Icon-only remove (confirm first). Searchable add, with “Add for this organisation” when the name is missing.
- [ ] Each row can be marked Required or Updated.
- [ ] Changing Category reloads the list.
- [ ] On Assessment: cost amount, breakdown, and funding source when costing is required. Hours and duration days when effort is required. Amount uses the resolved regional format.
- [ ] Decision tab keeps the assessor recommendation.
- [ ] **Send to Change Board** when a board is selected and the request is not yet pending, approved, or rejected. Empty document list is allowed. A required estimate blocks send until the figure is entered.
- [ ] While status is `pending-approval`, the request fields and the document list are read-only.
- [ ] Approve and Reject show only for an approving member, stay disabled until the reason is filled, then call `decideChangeRequest`.
- [ ] Success confirmation after adding a document name, after send, and after the board decision.
- [ ] Same theme surfaces as the rest of the form.

## Phase 3 — Simulator

- [ ] Same resolve / add / exclude against `sim.practice_change_*`, with additions visible on that user’s practice projects.
- [ ] Same sections on `apps/simulator/src/components/change/ChangeRequestForm.jsx`.

## Phase 4 — Check

- [ ] Compile both change request forms.
- [ ] Run the catalogue and status-rule unit tests.
- [ ] After the SQL is run: Scope shows the four default names; a removed name stays off that project; an added name appears on another project in the same organisation; a member’s Approve with a reason sets Approved.

## Review

Not started.
