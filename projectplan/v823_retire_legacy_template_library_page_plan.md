# v823 — Retire Legacy Template Library Page, Redirect to Tier-Cascade System

## Goal
PMO already customises templates via the tier-cascade system (`pm_template_nodes`, fixed in
[[v822]]), but the PM sidebar's "Templates" link (`/platform/templates`) always shows "No
published templates yet" — it queries a completely different, disconnected legacy system
(`public.template_library` / `project_template_copies`, SQL v406) that PMO never publishes into.

## Root cause
Two unrelated template systems exist in this codebase:
- **Legacy** (`template_library`/`project_template_copies`): project-scoped only, published via
  its own "Manage" screen. `apps/{platform,simulator}/src/pages/templates/TemplateLibraryList.jsx`
  queries this. Empty because nothing uses this flow anymore.
- **Tier-cascade** (`pm_template_nodes`): PMO → Portfolio → Programme → Project, the actively
  developed system (`packages/modules/{pmo,sim-pmo}-module/src/pages/TemplateLibraryPage.jsx`,
  reached at `/app/pmo/template-library` and `/simulator/pmo/template-library`). This is what
  PMO actually used, and what [[v822]] just fixed the duplicate-copy behaviour for.

User confirmed: the tier-cascade system is the real one; the legacy page should be retired.

## Fix
Turn the legacy list page into a thin redirect to the tier-cascade Global Template Library,
scoped to the PM's current project (`entityType=project`, `tier=project`), rather than deleting
the route/menu entry outright (avoids touching menu config, permissions, or the sibling
Manage/project-copies/notifications sub-routes, which are a broader legacy footprint out of
scope for this fix):

- `apps/platform/src/pages/templates/TemplateLibraryList.jsx` and
  `apps/simulator/src/pages/templates/TemplateLibraryList.jsx`: replaced the old
  `template_library` query + list UI with:
  - `usePlatformProjectId()` to resolve the current project (path param → `?projectId=` →
    the PM area's last-selected project via `localStorage` — the same resolution chain already
    used by 100+ other pages, so a user who's picked a project anywhere in `/pm/*` gets it here
    automatically, matching what the screenshot showed).
  - No project resolved → a "select a project first" message with a link to Projects, instead
    of the old confusing "No published templates yet" text.
  - Project resolved → `<Navigate to="/app/pmo/template-library?entityType=project&entityId=…&tier=project" replace />`
    (Simulator: `/simulator/pmo/template-library`, same query shape).

## Explicitly out of scope
- The legacy system's other sub-pages (Manage, project-copies, template detail/edit, bulk
  upload, notifications, version history) — still exist, still routable directly, not touched.
  Only the entry point a PM actually lands on via the sidebar is fixed.
- The `pmMenuConfig.js` / `simulatorMenuConfig.js` menu entries themselves — left pointing at
  `/platform/templates` / `/simulator/templates` unchanged; the redirect happens inside the
  component so the menu config, permissions, and icon wiring already set up for that path don't
  need to change.
- Any change to `pm_template_nodes` / the tier-cascade system itself beyond what [[v822]]
  already did.

## Todo
- [x] `apps/platform/src/pages/templates/TemplateLibraryList.jsx` → redirect component
- [x] `apps/simulator/src/pages/templates/TemplateLibraryList.jsx` → redirect component
- [x] Syntax-check both files (esbuild, no errors)

## Review

**Status: code complete, pending browser verification.**

Both files reduced from a full (always-empty) list page to a small redirect: resolve the
current project via `usePlatformProjectId()` (the same 100+-caller fallback chain — path param →
`?projectId=` → the PM area's last-selected project in `localStorage`), then `<Navigate>` to the
tier-cascade Global Template Library scoped to that project (`entityType=project&tier=project`).
No project resolved → a plain "select a project first" message with a link to the Projects list,
replacing the old confusing "No published templates yet. PMO can publish templates under
Manage." (which pointed at a Manage flow for a system PMO doesn't use).

Caught one route-name slip while mirroring to Simulator: the "Go to Projects" fallback link
initially reused Platform's `/platform/projects` path verbatim; corrected to Simulator's actual
route, `/simulator/practice-projects` (confirmed via `simulatorMenuConfig.js`), before finishing.

Deliberately did not touch: the menu config entries (still point at `/platform/templates` /
`/simulator/templates` — the redirect lives inside the component so no menu/permission wiring
needed to change), or any of the legacy system's other sub-pages (Manage, project-copies,
template detail/edit, bulk upload, notifications) — those still exist and are directly routable,
just no longer the page a PM lands on from the sidebar.

**Left for the user:** browser verification — click "Templates" in the Platform (and Simulator)
sidebar and confirm it lands on the Global Template Library scoped to the current project,
showing PMO's already-customised templates with a working Copy action (per [[v822]]).
