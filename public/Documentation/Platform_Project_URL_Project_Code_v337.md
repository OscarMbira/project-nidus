# Platform project URLs (project code) — v337

## Behaviour
- Primary URL segment is **`project_code`** when set (e.g. `/platform/projects/SEED334-PRJ-02`).
- **UUID** segments still work for bookmarks and old links; after load, detail/edit may **replace** the URL with the code when available.
- All Supabase calls use the resolved **`projects.id`** (UUID), not the code string.

## Utilities
- `src/utils/projectRouteParam.js` — `looksLikeProjectUuid`, `decodeProjectRouteSegment`, `platformProjectPath`, `resolveProjectIdFromRouteSegment`, `projectPathSegmentFromProject`.
- `src/hooks/usePlatformProjectId.js` — reads `useParams().projectId ?? useParams().id`, resolves to UUID.

## Routing note
Nested features that need a project context should live under `projects/:projectId/...` (same `:projectId` name as elsewhere) so the hook resolves correctly.
