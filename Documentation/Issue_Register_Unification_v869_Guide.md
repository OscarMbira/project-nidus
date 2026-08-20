# Issue Register Unification (v869)

## What changed

Issue **Log** / Issue **Management** (`Issues.jsx`) and **Issue Register** (`IssueRegisterView`) are now one page.

- Canonical UI: `IssueRegisterView` (Platform + Simulator).
- Former Issues routes re-export that page (`apps/*/src/pages/Issues.jsx`).
- Shared list/export columns: `apps/*/src/constants/issueListColumns.js` — change columns in **one** place.
- Dashboard: Total, New, In Progress, Resolved, Closed, Critical, Open, Overdue Actions + alerts/widgets (**no** table).
- Register: Live/Unauthorised/History/Archive lifecycle strip + type tabs + shared `IssueList`.
- Menu SQL: `SQL/v869_issue_register_menu_rename.sql` renames Issue Log → Issue Register (menu codes kept).

## Apply SQL

Run in Supabase SQL editor:

1. `SQL/v869_issue_register_menu_rename.sql`

Then hard-refresh the app (or clear menu cache) so the sidebar picks up new labels.

## Column source of truth

```js
// apps/platform|simulator/src/constants/issueListColumns.js
ISSUE_LIST_COLUMNS / ISSUE_EXPORT_COLUMNS
```

List headers in `IssueList.jsx` must stay aligned with that list (Title, Type, Priority, Status, Assigned, Aging, Due date, Created, Last Update, Actions).

## Out of scope

- Issue detail / reports / analytics chart pages
- Form template seed title F047 “Issue Log”
- Admin app
