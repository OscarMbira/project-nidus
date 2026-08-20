# v848 — Clarify Project Templates as the Real Data-Capture Screen; Retire Redundant Process Templates Hub

PRD: `projectprd/v848_project_templates_data_capture_clarity_PRD.md`

## Goal
A PM copying a process-template document (e.g. Project Charter) into a project already gets a
working, project-scoped data-capture form on the **Project Templates** page — the "Document
data" fields under "Process document content" are real, saved, per-project values
(`getNodeContent` / `updateProcessTemplateContent` against the linked catalog row, e.g.
`project_charters`, which already carries `project_id` from the copy-down flow in
`pmTemplateCopyService.js`). The page just doesn't say so — it reads like a template editor.
Meanwhile a second, independently-built **Process Templates Hub** writes into the same 24
tables via an unrelated copy mechanism and risks creating duplicate, unlinked rows for the same
project. Fix: relabel the existing capture UI so it's discoverable, and close off the Hub's
entry points (without touching its data or deeper sub-pages), following the non-destructive
redirect pattern from [[v823]].

## Root cause
Two separate systems both write to `public.project_charters` (and 23 sibling tables):
1. `pm_template_nodes` copy-down (`copyTemplateNodeForAccount` →
   `duplicateProcessTemplateRow`) — used by Organisational/Project Templates. Sets
   `project_id`/`practice_project_id` correctly, links back via
   `process_template_node_links`. **Already fully functional** — confirmed by reading
   `OrganisationalTemplateDetailPage.jsx:353-421`.
2. The standalone Process Templates Hub (`apps/platform/src/pages/processTemplates/*` +
   Simulator equivalents) — its own master→copy logic, no relationship to
   `pm_template_nodes` or `process_template_node_links`.

Its PM sidebar entry (`pm_pt_hub`, seeded v629, re-granted v679) is not rendering in the
current sidebar (orphaned by later menu-hierarchy rebuilds — v676, v718, v844/v845 churn never
re-touched it). The correct response is **not** to restore it (that reopens the duplicate-entry
risk) — it's to relabel the system that already works, and redirect the Hub's landing pages
into it.

## Decisions locked in with the user
- Relabel `OrganisationalTemplateDetailPage.jsx` (Platform + Simulator) using the existing
  `isProjectList` route flag — no new data/schema.
- Retire the Hub's **landing/list pages only** (4 mounts: platform pm + pmo, simulator pm +
  pmo) via `<Navigate>` redirect to Project Templates, mirroring [[v823]] exactly. Deeper
  sub-routes (create/edit/detail) and all menu config/grants stay untouched.
- Do **not** restore `pm_pt_hub` / `sim_pm_pt_hub` menu grants.
- Historical orphaned-row reconciliation is out of scope — flagged as a manual DB check for
  the user, not built here.

## Todo

### 1. Relabel the data-capture block (Platform)
- [x] `packages/modules/pmo-module/src/pages/OrganisationalTemplateDetailPage.jsx`:
  in the `contentInfo.kind === 'process_template'` block (~line 353), change the heading and
  add one line of help text, conditioned on `isProjectList`:
  - Project tier (`isProjectList === true`): heading "Your project's {friendly title}" (or
    similar), help text noting these are the real values for this project — fill in and save.
  - Org/PMO tier (`isProjectList === false`): heading keeps referencing the template/org
    default, help text notes this content is the starting point copied into projects.
  - Keep the existing `({contentInfo.table})` suffix for traceability; don't remove it.

### 2. Relabel the data-capture block (Simulator)
- [x] `packages/modules/sim-pmo-module/src/pages/OrganisationalTemplateDetailPage.jsx`:
  same change, mirrored (parity, rule 34.1). Confirm this file has the same `isProjectList`
  derivation before assuming identical line numbers — read it first, don't blind-copy the diff.

### 3. Retire Hub landing pages — Platform
- [x] Index route in `ProcessTemplatesRoutes.jsx` (mounted at `pm/process-templates` and
  `pmo/process-templates`) previously rendered `ProcessTemplatesHub`. Replaced with
  `ProcessTemplatesLandingRedirect.jsx`: `usePlatformProjectId()` + `<Navigate>` to
  `/platform/templates/project?entityType=project&entityId=…`, with "select a project first"
  fallback (v823 pattern). Left `t/:slug`, `new`, `edit`, `:id` sub-routes unchanged.

### 4. Retire Hub landing pages — Simulator
- [x] Same for `ProcessTemplatesRoutesSimPm` / `ProcessTemplatesRoutesSimPmo` via
  `apps/simulator/.../ProcessTemplatesLandingRedirect.jsx` →
  `/simulator/pm/templates/project?entityType=project&entityId=…`.

### 5. Docs
- [x] Short addendum to
  `Documentation/Form_Template_Org_Field_Customisation_And_Tier_Cascade_Guide.md` noting the
  Project Templates page is the data-capture surface for process-template documents, and that
  the old Process Templates Hub entry points now redirect there.

### 6. Verification
- [x] Code review: labels gated on existing `isProjectList`; save path untouched.
- [x] Redirect targets confirmed against `ProjectTemplatesEntry` / Simulator federated mount.
- [ ] Browser spot-check (user): open project-tier + org-tier detail; hit Hub landings.
- [ ] Manual DB orphan check (user) — see PRD Further notes.

## Explicitly out of scope
- Any schema/table/RLS change.
- Restoring `pm_pt_hub`/`sim_pm_pt_hub` menu grants.
- Migrating pre-existing Hub-created rows.
- Hub sub-pages beyond the landing/list route.
- Per-document bespoke forms (generic key/value editor stays, per v805).

## Review

**Shipped**

1. **Relabel (Platform + Simulator modules)** — `OrganisationalTemplateDetailPage.jsx` process
   content block:
   - Project Templates: `Your project's {title} ({table})` + help that fields are real project
     values to fill and save.
   - Organisational Templates: `Organisation default content ({table})` + help that content is
     the starting point when copied into a project.
2. **Hub landing redirect** — new `ProcessTemplatesLandingRedirect.jsx` in Platform and
   Simulator; wired as the `index` route in both `ProcessTemplatesRoutes.jsx` copies (covers
   all four mounts: pm/pmo × platform/simulator). Sub-routes unchanged; `ProcessTemplatesHub`
   left on disk but no longer the index element.
3. **Docs** — addendum under the Form Template / tier cascade guide (v848 section).

**Manual follow-up for you**

- Confirm in the browser: Project Templates detail wording + save still persists; Org Templates
  shows org-default wording; `/pm/process-templates` and `/pmo/process-templates` (and Simulator
  equivalents) land on Project Templates for the current project.
- Optional DB check for Hub-orphaned catalog rows (PRD §g): rows with
  `project_id`/`practice_project_id` set and no matching `process_template_node_links` entry.

**Independent verification (post-implementation code review)**

Re-read every changed file against this plan's Todo list, not just the diff summary:
- `packages/modules/pmo-module/.../OrganisationalTemplateDetailPage.jsx` — heading/help text
  correctly gated on the pre-existing `isProjectList` flag; no changes to `getNodeContent` /
  `updateProcessTemplateContent` calls or the Save handler — capture behaviour unchanged, only
  presentation.
- `packages/modules/sim-pmo-module/.../OrganisationalTemplateDetailPage.jsx` — same block,
  same wording, confirmed line-for-line equivalent to the Platform version (not a divergent
  copy-paste).
- `apps/platform/.../ProcessTemplatesRoutes.jsx` and the Simulator counterpart — `index` route
  swapped from `ProcessTemplatesHub` to `ProcessTemplatesLandingRedirect`; `t/:slug`, `new`,
  `edit`, `:id` routes byte-identical to before (diff touches only the two lines around the
  `index` route).
- `ProcessTemplatesLandingRedirect.jsx` (both apps) — redirects to
  `/platform/templates/project?entityType=project&entityId=…` (Simulator:
  `/simulator/pm/templates/project`), which is confirmed to match the `entityType`/`entityId`
  query-param contract `ProjectTemplatesEntry.jsx` already reads (not a guessed param shape);
  Simulator copy correctly uses "practice project" wording and `/simulator/practice-projects`
  as its no-project fallback link, rather than reusing Platform's path verbatim (the exact
  mistake the v823 review flagged and corrected for its own redirect).
- Docs addendum present and appended without disturbing the v815/v847 sections above it.

No discrepancies found between the plan, the PRD, and the shipped diff. The two unchecked
verification items (browser spot-check, DB orphan check) remain genuinely manual — not
something verifiable by reading code — and are correctly left for the user above.
