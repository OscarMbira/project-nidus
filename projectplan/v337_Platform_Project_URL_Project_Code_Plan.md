# v337 — Platform project URLs use project code

## Goal
Use human-readable `project_code` in `/platform/projects/:segment` where possible; keep legacy UUID URLs working; resolve to UUID for API calls.

## Todos
- [x] `projectRouteParam.js` + `usePlatformProjectId` (existing)
- [x] `ProjectsDetail.jsx` — fix `id` → `projectId`; links via `platformProjectPath(urlProjectSegment, …)`
- [x] `ProjectsEdit.jsx` — resolve segment, `platformDb`, optional methodology without `!inner`
- [x] `Projects.jsx` + `ProjectsListViews.jsx` — open detail with code when present
- [x] `App.jsx` — project-scoped routes under `projects/:projectId/…` for modules previously only at top level
- [x] `DailyLogView.jsx` — fix stray `)}` JSX parse error (blocking build)
- [x] Unit test `src/utils/__tests__/projectRouteParam.test.js`

## Review (implementation summary)
- **Routes:** Added `projects/:projectId/structured/*`, `ppd`, `qms`, `rms`, `issues`, `issues/register`, `risks`, `raid-log`, `scrum/*`, `kanban` so `usePlatformProjectId` receives the segment when navigating from project detail.
- **Projects detail:** Portfolio/programme saves use `projectId`; widgets and Gantt use `projectId`; all project links use `platformProjectPath` with `urlProjectSegment` (code when loaded).
- **Projects edit:** Same resolver + UUID→code replace when opening by UUID; save navigates to path built from updated code.
- **Projects list:** `goToProject(project)` navigates with `platformProjectPath(code || id)`.
- **DailyLogView:** Removed an extra `)}` that broke the JSX tree (unrelated to URLs but blocked `vite build`).

## Follow-up
- Full `vite build` currently fails on unresolved import in `ExceptionReportView.jsx` (pre-existing; not part of this change).
- Optional: align remaining `/app/projects/` links app-wide with `/platform/projects/` + code segment.
