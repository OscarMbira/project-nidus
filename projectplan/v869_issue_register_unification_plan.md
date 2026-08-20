# v869 — Issue Register Unification — Implementation Plan

**PRD:** `projectprd/v869_issue_register_unification_PRD.md`  
**Status:** ✅ Implemented  
**Repos touched:** `E:\project-nidus` only (Platform + Simulator).  
**Canonical page:** `IssueRegisterView` (Platform + Simulator). Divergent page retired as UI: `Issues.jsx` (re-exports Register).

---

## Design recap

- One page, two entry styles: PM layout wrapper (`PMControlsIssueRegister`) and bare `IssueRegisterView` for non-PM routes.
- Dashboard = cards + widgets only; Register = lifecycle + type tabs + shared list.
- Single column/export config; `IssueList` remains the only table renderer for this domain.
- Menu: label rename Issue Log → Issue Register; align hrefs to Register paths where they still pointed at the old Issues page.
- Summary metrics: status breakdown from `getIssueSummary` / table fallback (`issues_by_status`).

---

## Todos

### Shared list config

- [x] Add `issueListColumns.js` (Platform + Simulator)
- [x] Wire export via `ISSUE_EXPORT_COLUMNS` + `mapIssueForListExport` in `IssueRegisterView`

### IssueRegisterView (Platform then Simulator)

- [x] Default `viewMode` remains `'dashboard'`
- [x] Dashboard cards: Total, New, In Progress, Resolved, Closed, Critical, Open, Overdue Actions + widgets
- [x] Enrich summary when RPC omits `issues_by_status`
- [x] Register tab: `RecordLifecycleListHeader` + client-side `record_status` filter
- [x] Keep type tabs, filters, Export, Log Issue, card/list toggle on Register

### Route / Issues.jsx collapse

- [x] Platform + Simulator `Issues.jsx` → re-export `IssueRegisterView`
- [x] Detail/report/analytics/on-hold/my-actions routes untouched

### Menu SQL

- [x] `SQL/v869_issue_register_menu_rename.sql`

### Tests & docs

- [x] `constants/__tests__/issueListColumns.test.js` (Platform + Simulator)
- [x] IssueList list-view header assertions include Assigned / Created
- [x] `Documentation/Issue_Register_Unification_v869_Guide.md`

### Parity checklist

- [x] Platform + Simulator IssueRegisterView / Issues / issueListColumns / analytics summary fill

---

## Review section

**Summary:** Unified Issue Log and Issue Register onto `IssueRegisterView`. Dashboard shows eight summary cards (no table). Register carries lifecycle filters plus the shared list. Column/export config lives in `issueListColumns.js`. Menu SQL renames Issue Log → Issue Register.

**Apply:** Run `SQL/v869_issue_register_menu_rename.sql` in Supabase, then refresh the app.

**Files of note:**
- `apps/platform|simulator/src/pages/IssueRegisterView.jsx`
- `apps/platform|simulator/src/pages/Issues.jsx` (re-export)
- `apps/platform|simulator/src/constants/issueListColumns.js`
- `apps/platform|simulator/src/services/issueAnalyticsService.js`
- `SQL/v869_issue_register_menu_rename.sql`
- `Documentation/Issue_Register_Unification_v869_Guide.md`
