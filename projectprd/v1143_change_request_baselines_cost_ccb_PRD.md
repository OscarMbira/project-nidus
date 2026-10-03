# v1143 — Change request baselines, cost and effort, and Change Board approval — PRD

**Applies to:** Platform (`apps/platform`, `public.change_requests`) and Simulator (`apps/simulator`, `sim.practice_change_requests`)
**Origin:** Change Requests (`ChangeRequestForm` on `/platform/change-requests`). Category (Scope, Schedule, Budget, Quality, Resource, Risk, Technical, Other) does not tell the user which documents must be updated. Cost and effort figures are not on the form. The Change Board does not approve the request in the system.

## a) Problem statement

A change request already has a status of Submitted, Under assessment, Pending approval, Approved, Rejected, Deferred, Implemented, or Cancelled (`public.change_requests.status`, `SQL/v31_change_management.sql`). It can name a Change Board (`change_board_id`). Category is a required field on Basic Info with the values Scope, Schedule, Budget, Quality, Resource, Risk, Technical, and Other. The Assessment tab records impact levels and descriptions. The Decision tab records a feasibility rating and a recommendation onto `change_assessments`. Saving that recommendation does not change the request status, and it does not check `change_board_members`.

Three gaps sit on top of that:

1. **Documents to update, driven by Category.** A scope change usually means the scope baseline, the scope statement, and the work breakdown structure. A budget change usually means the cost baseline and the budget. The form does not offer that list. `change_assessments.scope_baseline_affected` is a yes/no flag with no names. `document_types` (`SQL/v146`, seeded in `SQL/v147`) is the stage-gate document register (governance, planning, delivery, and so on). Its categories are not the change-request categories, so it cannot be the default list. The user needs the list that matches the circled Category, then the ability to drop names that do not apply to this project and to add a name the project uses. A name added here must show up for other projects in the same organisation.

2. **Cost and effort.** `change_assessments` already has `cost_impact_amount`, `cost_breakdown`, `funding_source`, `estimated_effort_hours`, and `estimated_duration_days`. The Assessment tab shows a cost impact level and a description only. Hours, duration, amount, breakdown, and funding source are not on the form.

3. **Change Board approval.** The Change Board is a real board (`change_board`) with members (`change_board_members.can_approve_changes`). `change_approvals` (and `sim.practice_change_approvals`) already store an approver, a decision, and a rationale, and `approval_level` can be `change-board`. `ChangeDecisions` can mark a row Approved without board membership, without a reason, and without setting `change_requests.status`. The form’s Decision dropdown is the assessor’s recommendation.

## b) Solution

Keep one change request. When Category is set, the request shows that category’s document list: the shared defaults plus any names this organisation has added, minus any names this project has marked as not applicable. The user can remove a name from this project’s context and can add a missing name. An added name is stored for the organisation, so the next project in that organisation sees it on the same category. Removing a name does not delete it for other projects.

Cost and effort stay optional flags on the assessment. The assessor’s recommendation stays a recommendation. **Send to Change Board** sets Pending approval and locks the request. An approving member of that board Approves or Rejects with a reason, and only that action sets Approved or Rejected.

## c) User stories

1. As an editor, when I choose Category, I see the default documents that category says must be updated, without searching for them.
2. As an editor, that list is the shared defaults for the category, plus names this organisation has added for the category, minus names this project has already marked not applicable.
3. As an editor, Scope starts with Scope baseline, Project scope statement, Work breakdown structure, and Product descriptions.
4. As an editor, Schedule starts with Schedule baseline, Project plan, and Milestone register.
5. As an editor, Budget starts with Cost baseline, Project budget, and Business case.
6. As an editor, Quality starts with Quality management approach, Quality register, and Acceptance criteria.
7. As an editor, Resource starts with Resource plan, Team structure, and Roles and responsibilities.
8. As an editor, Risk starts with Risk register and Risk management approach.
9. As an editor, Technical starts with Technical design, Configuration item records, and Interface specifications.
10. As an editor, Other starts with Change log. I add whatever else this change needs.
11. As an editor, I can remove a document that does not apply to this project. It leaves this request and stays off later requests of the same category on this project. Other projects in the organisation still receive it.
12. As an editor, I can add a document name that is not in the list. That name is saved for this category for the whole organisation, and other projects see it in their default list for that category.
13. As an editor, adding a name this project had previously removed puts it back for this project.
14. As an editor, changing Category replaces this request’s document list with the resolved list for the new category. Names already stored for the organisation stay in the catalogue.
15. As an editor, I can clear every document on this request when none of them apply. An empty list is allowed.
16. As an editor, each document on the request can be marked Required or Updated. A newly included name starts as Required. Marking Updated does not change any file or baseline record.
17. As an editor, I can mark “Cost estimate required” and “Effort estimate required” independently of Category.
18. As an editor, when a cost estimate is required, I enter the cost amount, a breakdown, and a funding source. The amount uses the project’s regional format. When the flag is off, those fields stay hidden.
19. As an editor, when an effort estimate is required, I enter estimated hours and duration in days. When the flag is off, those fields stay hidden.
20. As an editor, I can save the assessor recommendation and its rationale without the request status changing.
21. As an editor, I can send the request to the Change Board named on the request when its status is Submitted or Under assessment.
22. As an editor, Send to Change Board is unavailable when no Change Board is selected.
23. As an editor, Send to Change Board is blocked while a required cost amount or a required effort figure is blank. Zero is allowed once it has been entered. An empty document list does not block sending.
24. As an editor, after Send to Change Board the status is Pending approval and the request fields, including the document list, are read-only.
25. As an active Change Board member with approval permission on that board, I see Approve and Reject, and both stay disabled until I enter a reason.
26. As that member, Approve sets the request to Approved and writes the approval row. Reject sets the request to Rejected the same way.
27. As someone who is not an approving member of that board, I cannot set the request to Approved or Rejected, including from the existing Change Decisions list.
28. As a reader, I can see the document list that was on the request when it was sent, even if the organisation catalogue changes later.
29. As a Simulator user, I can do stories 1–28 on a practice change request. A name I add is available on that user’s other practice projects. A name I remove is not applicable only on that practice project.

## d) Implementation decisions

- **The document list follows Category.** Accepted. There is no separate “baselines must be updated” checkbox. Category is the existing field (`scope`, `schedule`, `budget`, `quality`, `resource`, `risk`, `technical`, `other`).
- **Three stores, not one picker of existing files.**
  - Catalogue: shared rows (`account_id` null, `is_system` true) plus organisation rows (`account_id` set) keyed by `change_category` and document name. Adding a name inserts an organisation row. A matching name already in the catalogue is reused and is not duplicated.
  - Project exclusion: removing a name records that this project does not use that name for that category. It does not delete the catalogue row.
  - Request list: the names actually on this change request, each Required or Updated. Saved with the request so a later catalogue change does not rewrite a request already saved.
- **Defaults are the shared seed in stories 3–10.** They are system catalogue rows, not sample change requests. Organisation rows are created only when a user adds a name.
- **Do not use `document_types` as this list.** Those rows are stage-gate types with a different category set.
- **Do not link `project_baselines`, `configuration_baselines`, `project_budget_baselines`, or `project_documents`.** The list is document names. Updating the real file stays on that document’s own page.
- **Add is organisation-wide. Remove is project-scoped.** On the Simulator, “organisation” is the practice user’s projects, matching `practice_change_requestor_catalogue` being scoped by user.
- **Changing Category reloads the request list** from the resolved defaults for the new category (shared + organisation − this project’s exclusions).
- **Approved and Rejected come only from a Change Board decision.** The assessor’s recommendation does not write `change_requests.status`. One approving member is enough. Quorum and vote columns stay unused.
- **Reuse `change_approvals` and `sim.practice_change_approvals`.** Send to Change Board inserts `approval_level = 'change-board'`, `decision = 'pending'`. Approve and Reject require `decision_rationale` and require an active `change_board_members` row for that board with `can_approve_changes = TRUE`. That write sets the request status. Other approval levels on Change Decisions do not set the request status.
- **Lock while pending.** While status is `pending-approval`, the request body and the document list are read-only.
- **Cost and effort stay on the assessment**, behind `requires_cost_estimate` and `requires_effort_estimate` on the change request.
- **Platform and Simulator together.** No new menu. No sample change requests.

## e) Testing decisions

- Service tests, written first: Scope resolves the four shared names; an organisation-added name appears for a second project in the same account and does not appear for another account; a project exclusion hides the name on that project only; adding it back clears the exclusion; changing category replaces the request list; a saved request list does not change when the catalogue later changes; saving a recommendation does not set Approved; Send to Change Board does not require a document row; a required cost blocks send until an amount is entered; a non-member cannot decide; a blank reason cannot decide; a member’s Approve sets Approved.
- Compile check of the change request form in both apps.
- Signed-in check: open a Scope request and see the four default names, remove one, add a new name, open another project in the same organisation and see the added name, send to the board, and approve with a reason.
- Done means stories 1–29 hold on Platform and on a practice change request.

## f) Out-of-scope

- Rewriting a baseline or a project document when the request is approved, or opening that record from the list.
- Deleting a shared or organisation catalogue name from the admin side. Remove only marks it not applicable to this project.
- Using `document_types` or attaching a specific `project_documents` file.
- Quorum, vote counts, cost-threshold auto-approval, and escalation.
- A separate Change Board inbox.
- Resubmitting a Rejected request.
- New sidebar items.
- Turning `ChangeRequestForm` from a modal into a routed page.
- Moving the Category dropdown itself into a database lookup. It stays the eight values already on the form.

## g) Further notes

- SQL for the catalogue, the project exclusions, the request document rows, and the two estimate flags is written when implementation starts. Run it in Supabase before the document list or Send to Change Board will persist. `change_approvals` and `practice_change_approvals` already exist and are not recreated.
- The requestor catalogues (`SQL/v1142_change_requestor_catalogue.sql`) are a separate change.
- `current_approver_user_id` stays the named approver field. It is not a substitute for Change Board membership.
