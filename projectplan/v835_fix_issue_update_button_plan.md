# v835 — Fix Issue Register "Update Issue" submit

## Problem
Clicking **Update Issue** appears to do nothing. `handleSubmit` runs `validateIssueForm`, which
rejects the form’s own legacy types (`bug`, `enhancement`, …) and older severities
(`low`/`medium`/`high` from seeds / v25). Errors are stored in state but **not shown next to
Issue Type**, and the viewport is usually at the bottom of the long form — so the user sees
no feedback.

## Fix
1. Allow legacy issue types and severity aliases in `@nidus/shared` `issueValidation`.
2. In `IssueForm`: surface a submit-level error summary, show type/severity field errors,
   resolve `users.id` (not auth uid) for raised_by/author fallbacks, clearer success message
   with display id (rule 16).
3. Mirror Platform → Simulator; extend unit tests.

## Todo
- [x] Update `packages/shared/src/utils/issueValidation.js` (+ tests)
- [x] Fix `IssueForm` submit UX / user ids (Platform + Simulator)
- [x] Review

## Review

**Root cause:** `validateIssueType` only allowed the three structured register types, but the
form (and many seeded rows) use legacy types like `bug`. Submit failed validation with no
visible feedback at the bottom of the long form.

**Fixes:**
- Accept legacy issue types + severity aliases (`low`/`medium`/`high`) in shared validation.
- `IssueForm` now alerts + scrolls to the first error; shows type field errors; resolves
  `public.users.id` for raised_by/author fallbacks; success toast includes record id + UPDATE/CREATE.
- Mirrored `IssueForm.jsx` to Simulator. Shared package tests updated (legacy type/severity cases).

### Follow-up — "Error fetching team members" (400)

`IssueForm.fetchTeamMembers` queried a table that does not exist: `project_members`, filtered
on `is_deleted`. The real table is **`project_memberships`**, and memberships are retired via
**`is_active`**, not a soft-delete flag. The failed query left Raised By / Author / Owner
dropdowns empty. Fixed in `IssueForm.jsx` (Platform + Simulator).

**Same bug was present elsewhere** — now fixed to the same
`project_memberships` + `is_active` pattern (Platform + Simulator):

| File | Affected picker |
|---|---|
| `components/RiskForm.jsx` | Risk owner |
| `components/MitigationPlan.jsx` | Mitigation owner |
| `components/issues/ActionForm.jsx` | Action assignee |
| `components/structured/ProductForm.jsx` | Product owner |
| `components/structured/WorkPackageForm.jsx` | Work package owner |
| `components/productStatusAccount/ProductStatusAccountForm.jsx` | Author |
| `pages/scrum/DailyScrum.jsx` | Attendees |

No remaining `from('project_members')` under `apps/`.
