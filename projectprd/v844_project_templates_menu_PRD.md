# PRD: Project Templates (PM) — v844

## Problem
When a PM opens Organisational Templates in project context, **project-owned copies** (tier = Project, after “Copy down to my project”) sit in the same list as PMO/higher-tier templates. That mixes “browse & copy from the organisation” with “customise this project’s copies.”

## Solution
Add a separate PM sidebar item **Project Templates** (DB `menu_items`) that lists only templates copied to the **current project**. Organisational Templates (project-scoped) shows only higher-tier / organisational candidates for copy-down — not the project’s own copies.

## User stories
1. As a PM, I see **Project Templates** as a top-level sidebar item (sibling of Organizational Templates).
2. As a PM with a current project, Project Templates shows only `tier=project` nodes scoped to that project.
3. As a PM, I can View/Edit and Retire those project copies from Project Templates.
4. As a PM, Organisational Templates no longer lists those project copies; it lists nearest non–project-own templates with **Copy down to my project**.
5. As a PM without a selected project, Project Templates prompts me to select a project.
6. Menu label and route come from `menu_items` (no hardcoded live label override).
7. Simulator has the same split where the PM organisational templates mount exists.

## Implementation decisions
- Reuse `OrganisationalTemplatesPage` with `listVariant="project" | "organisational"` (thin wrappers / route elements).
- Route: `/platform/templates/project` (+ entity query via `usePlatformProjectId`, same pattern as `/platform/templates`).
- Menu code: `plat_pm_project_templates`; SQL `v844_*`.
- Platform–Simulator parity for the shared page logic and PM route.

## Testing
- Unit: scoped list helpers / filtering (project-own vs org candidates).
- Manual: copy down → row leaves Org list and appears under Project Templates; retire from Project Templates.

## Out of scope
- New detail editor (keep existing organisational-template detail URLs).
- PMO Admin global library changes.
- Renaming DB label of Organizational Templates.
