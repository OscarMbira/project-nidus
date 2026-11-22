# PRD v1346 — My Team member & functional-role pages (non-modal)

## a) Problem statement

My Team’s Add/Edit **team member** and Add/Edit **functional role** flows are small modals. Members only capture role + allocation % even though `team_members` already has allocation dates and comments (used on Team Detail). Functional roles only capture a label even though `required_skills` and `sort_order` exist. Actions were easy to miss when gated solely on `team.manage`. Sample data on SEED334 teams is thin on members. Rule 65 expects new/amended record forms to be routed pages with an Audit tab (rule 63.1).

## b) Solution

Convert Add/Edit member and Add/Edit functional role to **routed, non-modal pages** (Details + Audit tabs). Expose the Team Detail–aligned member fields and role label + required skills + sort order. Keep list Actions as icon-only Edit/Delete (Create via Add). Top up SEED334 (and Simulator practice twin) so each team has **≥10 members** and **≥10 functional roles** where short. Platform + Simulator parity.

## c) User stories

1. As a team lead or project manager, I open **Add member** and land on a full page (not a modal).
2. As a manager, I edit a member on a full page with role, allocation %, start/end dates, and comments.
3. As a manager, I see an **Audit details** tab on member create (placeholder) and edit (Identity / Classification / Record history).
4. As a manager, I add/edit a functional role on a full page with label, required skills, and sort order, plus Audit tab.
5. As a manager, I cannot delete a role still used by members (disabled + clear label).
6. As a user without manage rights, I do not see Add/Edit/Delete (existing access rules: PM on project, team lead, PMO all-teams, or `team.manage`).
7. As a demo user on SEED334-PRJ-08, each project team has at least 10 members and 10 functional roles after seed.
8. As a Simulator practice user, the same Create/Edit pages and seed depth exist for practice teams.
9. As a manager, Cancel / Back returns via browser history (`navigate(-1)`).
10. As a manager, successful create/update shows the shared success confirmation modal (rule 16).
11. Unsaved changes are guarded (rule 52).
12. Field help exists for every new/amended capture field (rule 76).

## d) Implementation decisions (owner interview)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Scope | My Team member + functional-role forms only (not whole sidebar) |
| 2 | Member fields | Role, allocation %, start/end dates, comments (align Team Detail) |
| 3 | Functional roles | Convert to pages in same slice |
| 4 | Role fields | Label + required skills (multi-line) + sort order; Details + Audit |
| 5 | Seed | Idempotent top-up SEED334-PRJ-08 (≥10 members & ≥10 roles per team); Simulator twin |
| 6 | View route | Create + Edit only (no separate View) |
| 7 | Parity | Platform + Simulator in same slice |
| 8 | URLs (settled for plan) | Under My Team: `…/my-team/members/new`, `…/my-team/members/:memberId/edit`, `…/my-team/roles/new`, `…/my-team/roles/:roleId/edit` with `?teamId=` (and project scoping as today). No `display_id` on these tables — UUID in path is acceptable (rule 16.3). |

## e) Testing decisions

- Unit: route helpers / dirty-state field packing; role delete-disabled when `_count > 0`.
- Manual: Add/Edit member & role on Platform My Team and Simulator practice My Team; Audit tab; seed counts ≥10.
- Retest: My Team list Actions still work; PermissionGate / lead / PM access unchanged in intent.

## f) Out of scope

- Other consolidated-sidebar forms (separate slices).
- Separate View pages for member/role.
- Changing Team Detail’s own member editor (already has dates/comments).
- Admin app.
- New ID Generation rules for `team_members` / `team_functional_roles`.

## g) Further notes

- Prefer `@nidus/ui` `MultiLineListInput` for required skills (rule 67).
- Adopt `useSuccessModal` on these saves (rule 16).
- Keep project name off the team picker when the page is already project-scoped (prior UX fix).
