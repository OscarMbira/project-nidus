# v869 — Issue Register Unification — PRD

**Repos touched:** `E:\project-nidus` (monorepo — Platform + Simulator). Menu SQL in monorepo `SQL/` only. No Admin repo changes.
**Status:** ✅ Implemented (interview complete; PRD + plan executed).

---

## a) Problem statement

Project Nidus currently exposes **two separate issue list experiences** for the same domain:

1. **Issue Register** (`IssueRegisterView` — e.g. `/pm/controls/issue-register`, `/…/issues/register`): tabs Dashboard / Register / Analytics / Settings; Register list columns include Assigned, Aging, Due date (plus Created / Last Update in code); Dashboard summary cards are Total / Open / Critical / Overdue Actions plus alert widgets.
2. **Issue Log / Issue Management** (`Issues.jsx` — e.g. `/platform/issues`, `/app/issues`, project-scoped `/projects/:id/issues`): Live / Unauthorised / History / Archive lifecycle strip; status summary cards (Total / New / In Progress / Resolved / Closed / Critical); list powered by the same `IssueList` component but with a divergent page chrome, export column set, filters, and menu label.

Operators change columns or dashboard metrics in one place and the other stays stale. Menu labels say both “Issue Log” and “Issue Register,” which reinforces the split. The user wants **one place to change list fields** and a **merged Dashboard** that carries the useful summary metrics from both sides, without putting the table on the Dashboard tab.

## b) Solution

Unify on **Issue Register** as the single canonical page:

1. All former Issue Log / Issue Management list routes **render or redirect to** `IssueRegisterView` (same component, one field definition).
2. **Dashboard** tab = enriched summary cards + existing CriticalIssuesAlert / OpenIssuesWidget only — **no issue table**.
3. **Register** tab = lifecycle filter strip + type tabs (All / RFCs / Off-Specs / Problems) + filters + the shared `IssueList` (canonical columns).
4. Extract a **single shared column/export config** consumed by list UI and export menus so column changes happen once.
5. SQL menu update: rename every **Issue Log** menu label to **Issue Register** (codes may stay for grant stability; labels and paths align to Register where needed).
6. Apply the same change on **Simulator** (rule 34 / 34.1).

## c) User stories

1. As a PM, when I open any former Issue Log or Issue Register menu entry, I land on the **same** Issue Register page (Dashboard default).
2. As a PM on **Dashboard**, I see status cards: Total, New, In Progress, Resolved, Closed, Critical, **plus** Open and Overdue Actions, then CriticalIssuesAlert and OpenIssuesWidget — and I do **not** see the issues table on this tab.
3. As a PM on **Register**, I can filter by record lifecycle (Live / Unauthorised / History / Archive / All) and by issue type (All / RFCs / Off-Specs / Problems), then search/filter and work the shared list.
4. As a PM, the list always shows: `#`, Title (+ description), Type, Priority, Status, Assigned, Aging, Due date, Created, Last Update, Actions.
5. As a developer (or operator), when I change that column set, I change **one** shared config — both former entry points and export pick it up.
6. As a user of the sidebar, I no longer see “Issue Log”; entries are labelled **Issue Register**.
7. As a Simulator user, I get the same unified page and menu labelling for practice issues.
8. As a PM, create/edit still uses the existing shared `IssueForm` (no second create form).

## d) Implementation decisions

| # | Decision | Chosen |
|---|----------|--------|
| 1 | Page structure | **A+B**: one canonical Issue Register page; Issue Log URLs render/redirect to the same component |
| 2 | Dashboard contents | **B**: summary + alerts/widgets only; table stays on Register |
| 3 | Lifecycle tabs | **A**: Register tab only |
| 4 | List columns | **B**: 1st-image set + Created + Last Update |
| 5 | Dashboard cards | **A**: Issue Log six cards + Open + Overdue Actions + existing widgets |
| 6 | Menu labels | **B**: rename all Issue Log → Issue Register |
| 7 | Default tab | **A**: Dashboard |
| 8 | Lock & proceed | **A**: write PRD + plan (`v869`), wait for go-ahead before coding |

**Codebase facts (not re-asked):**

- Canonical UI today: `apps/platform/src/pages/IssueRegisterView.jsx` (+ Simulator mirror); PM shell wraps via `PMControlsIssueRegister.jsx`.
- Divergent UI: `apps/platform/src/pages/Issues.jsx` (+ Simulator mirror).
- Shared list already: `IssueList.jsx` (Platform + Simulator copies) already includes Assigned, Aging, Due date, Created, Last Update — export column arrays on the two pages still diverge and must be unified.
- Detail / reports / analytics / on-hold / my-actions routes are **not** part of this merge (remain as today).
- Form template seed title “Issue Log” (e.g. F047) is a **form template product name**, not a sidebar menu label — out of scope unless a later ticket renames templates.

## e) Testing decisions

- Unit/component: Register tab shows lifecycle header; Dashboard does not render `IssueList`; Dashboard card counts include New / In Progress / Resolved / Closed / Open / Overdue / Critical.
- Assert shared column config drives list headers and export columns (one module, both consumers).
- Route smoke: former Issues routes resolve to IssueRegisterView (or Navigate equivalent).
- Menu SQL idempotent: labels for Issue Log codes become Issue Register; no duplicate broken links.
- Platform + Simulator parity checks on the mirrored pages.
- Manual: open PM Issue Register and old Issue Log URL → same chrome; toggle Dashboard vs Register; edit one shared column config in code review checklist.

## f) Out of scope

- Redesigning Issue **detail**, reports, analytics charts, or Settings / LDE field customisation beyond wiring they already have.
- Renaming Dynamic Form Engine template F047 “Issue Log” (or other seed form titles).
- Merging PMO oversight multi-project issue views into this page (unless they already mount `IssueRegisterView` — then they inherit automatically).
- Admin app changes.
- Putting the issue table on the Dashboard tab (explicitly rejected).

## g) Further notes

- Prefer **thin redirect or re-export** of `Issues` → `IssueRegisterView` over deleting the file immediately, so lazy import paths and bookmarks keep working; delete/stub cleanup can be the last checklist item.
- Shared column config: prefer a small module next to `IssueList` (e.g. `issueListColumns.js`) rather than a new package unless both apps already share issues UI via `@nidus/*` (today they do not — Platform/Simulator copies; keep parity by applying the same file in both apps, or promote to `packages/shared` only if import cost is low).
- Expand `getIssueSummary` / Dashboard fetch so status breakdown cards are not client-only counts from a partial page of issues (Issue Log today counts the **current page** of `issues` — Register should use register/project-scoped summary totals for honesty).
