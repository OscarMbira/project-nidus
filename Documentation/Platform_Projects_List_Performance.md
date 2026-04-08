# Platform `/platform/projects` list performance

## Changes (summary)

| Area | Before | After |
|------|--------|--------|
| **My Projects** | Two round-trips (`user_projects` ids → `projects.in(...)`) | One embed query `user_projects` → `projects!inner` |
| **Search on My Projects** | Debounced refetch with `ilike` on every change | **Client-side filter** on the loaded set (no refetch while typing) |
| **Search on All Projects** | `ilike` name + description only | Same + **`project_code`**, with **sanitized** term for PostgREST |
| **Session** | `auth.getUser()` | **`auth.getSession()`** (fewer round-trips when session is cached) |
| **In-flight requests** | Overlap possible | **`AbortController`** cancels stale loads on tab/search change |
| **UI** | Full-page spinner on every list refresh | **Skeleton** only when list is empty; **“Updating list…”** when refreshing with data |
| **Rows** | Inline anonymous components | **`React.memo`** grid cards and table rows (`ProjectsListViews.jsx`) |

## Files

- `src/pages/Projects.jsx`
- `src/services/projectService.js` — `sanitizeProjectSearchTerm`, `getMyProjects` / `getAllProjects` options `{ signal }`
- `src/components/project/ProjectsListViews.jsx`
- `src/services/__tests__/projectService.search.test.js`

## Note

If `projects.is_deleted` filtering on the embedded resource ever fails for your PostgREST version, fall back to dropping `.eq('projects.is_deleted', false)` and filtering deleted projects in JavaScript after fetch.
