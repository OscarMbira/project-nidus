# v335 — Platform projects list (`/platform/projects`) optimization

## Objective
Reduce network round-trips, avoid redundant refetches on search, and improve perceived performance.

## Todos
- [x] Single-query My Projects (`user_projects` embed)
- [x] Client-side search for My Projects tab; server search for All (+ `project_code`, sanitized)
- [x] `getSession` bootstrap; abort in-flight list loads
- [x] Split session vs list loading UI; memoised row components
- [x] Unit test: `sanitizeProjectSearchTerm`
- [x] Documentation: `Documentation/Platform_Projects_List_Performance.md`

## Review
- **Simulator:** not applicable (platform-only page).
- **RLS:** unchanged; same tables and visibility rules as before.
