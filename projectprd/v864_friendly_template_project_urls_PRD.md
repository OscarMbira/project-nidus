# v864 — Friendly Project Key in Templates URLs — PRD

**Repo:** `E:\project-nidus` (Platform + Simulator monorepo).  
**Companion plan:** `projectplan/v864_friendly_template_project_urls_plan.md`  
**Status:** Approved & implemented (see plan review).

---

## a) Problem statement

PM Project Templates (and project-scoped Organisational Templates) force opaque query params into the address bar, e.g.

`/platform/templates/project?entityType=project&entityId=42a1e47a-e1bf-4ea3-a78c-ed278270458d`

Users see a UUID instead of the project’s display code (e.g. `SEED334-PRJ-07`). That breaks the platform convention (rule 16.1 / `projectRouteParam`) used elsewhere under `/platform/projects/:code`, and makes bookmarks hard to read or share.

---

## b) Solution

Use the project **display code** (`project_code`, fallback UUID) as a **path segment**:

| Surface | List | Detail |
|---------|------|--------|
| Project Templates | `/platform/templates/project/<projectKey>` | `/platform/templates/project/<projectKey>/<templateRef>` |
| Org Templates (project-scoped) | `/platform/templates/organisational/<projectKey>` | `/platform/templates/organisational/<projectKey>/<templateRef>` |
| Simulator PM | `/simulator/pm/templates/project\|organisational/<projectKey>[/<templateRef>]` | same |

Optional filters stay as query only (`domainGroup`, `tier`, `methodology`, etc.).

- Resolve `<projectKey>` → UUID via existing `resolveProjectIdFromRouteSegment` (code or UUID).
- Prefer writing `project_code` when redirecting/building links.
- One-hop **replace** redirect from legacy `?entityType=project&entityId=…` (and flat `…/project/:nodeId` with entity query) to the new shape.
- **PMO flat** org list (no project context) stays at `/app/pmo/organisational-templates` and `/platform/templates/organisational` **without** a project segment.

---

## c) User stories

1. As a PM on Project Templates, the URL shows my project code, not a UUID.
2. As a PM, opening View/Edit uses `/…/project/<projectKey>/<templateRef>` (display id preferred).
3. As a PM on project-scoped Organisational Templates, the same project-key pattern applies.
4. As a user with an old bookmark (`?entityId=<uuid>`), I am redirected once to the friendly path and keep working filters (`domainGroup`, etc.).
5. As a user with only a UUID (no code), the path may use the UUID; APIs still resolve.
6. As a PMO admin on the flat org list (no project), URLs stay without a project segment.
7. As a Simulator PM, the same patterns apply under `/simulator/pm/templates/…`.
8. As a user with no project selected, `/platform/templates/project` still prompts to select a project (no invented key).

---

## d) Implementation decisions (locked)

| # | Decision |
|---|----------|
| D1 | Path segment = `project_code` preferred; UUID fallback. |
| D2 | List `/…/project\|organisational/<projectKey>`; detail `/…/<projectKey>/<templateRef>`. |
| D3 | Drop writing `entityType` / `entityId` query for these PM mounts; legacy query accepted then replace-redirected. |
| D4 | Filters (`domainGroup`, etc.) remain query params. |
| D5 | Flat PMO / non–project-scoped org list: no project segment. |
| D6 | Platform + Simulator parity. |
| D7 | Menu `route_path` may stay `/platform/templates/project` (and org equivalent); entry/redirect adds the key from current project. |
| D8 | No new SQL tables; optional menu seed only if we choose to document tokens — **not required** for this slice. |

---

## e) Testing decisions

- Unit tests for path builders / parsers in `organisationalTemplateRoutes` (and shell copies if duplicated).
- Unit/route tests: legacy query → friendly path; list vs detail segment parsing; menu active matching still works with `/project/<key>`.
- Manual UAT: open Project Templates → URL has code; open detail; refresh; old UUID query bookmark redirects; Simulator smoke; flat PMO org list unchanged.

---

## f) Out of scope

- Renaming menu labels or domainGroup UX.
- Changing template `display_id` generation.
- Admin-app routes.
- Rewriting every historical external link beyond one-hop in-app redirect.

---

## g) Further notes

- Primary touchpoints: `ProjectTemplatesEntry`, `platformRoutes` / simulator routes, `OrganisationalTemplatesPage` entity sync effect, `organisationalTemplateRoutes.js` (shared + shell copies), `ProcessTemplatesLandingRedirect`, sidebar active-path helpers/tests.
- Ambiguous single-segment `…/project/:seg` (legacy detail): if `entityId` query present or current project known, treat `:seg` as template ref and redirect into `/project/<key>/<seg>`; if `:seg` resolves as a project, treat as list; otherwise keep prior detail behaviour with current-project context when available.
