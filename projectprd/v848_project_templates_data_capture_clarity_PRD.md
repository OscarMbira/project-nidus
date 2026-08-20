# PRD: Project Templates — clarify existing data capture, retire redundant Hub — v848

## a) Problem statement

A PM copies a process-template document (e.g. "Project Charter Template") down into a real
project via the Project Templates page (`/platform/templates/project/:id`,
`OrganisationalTemplateDetailPage.jsx`). That page already reads and writes the real,
project-scoped catalog row (e.g. `public.project_charters`, keyed by `project_id`) through
`getNodeContent` / `updateProcessTemplateContent` — the "Document data" fields (Purpose,
Objectives, etc.) shown there are the actual project data, and "Save changes" persists them.
But the page is framed entirely as a **template editor** ("Template metadata", "copied from
Global" badge, "Retire" button), so PMs cannot tell that the "Process document content" block
below it is where they enter their project's real charter — there is no visual or textual cue
distinguishing "editing the template shell" from "capturing this project's actual document".

Separately, an older, independently-built **Process Templates Hub**
(`apps/platform/src/pages/processTemplates/*`, routes `pm/process-templates/*` and
`pmo/process-templates/*`, mirrored in Simulator) writes into the **same 24 catalog tables**
via its own master→copy mechanism, entirely disconnected from `pm_template_nodes`. Its PM-facing
sidebar entry (`pm_pt_hub`) is not currently visible in the sidebar. If a PM ever reached it
(directly, by URL) and copied a document there too, it would create a second, unrelated row in
the same table for the same project — silent data duplication with no link between the two rows.

## b) Solution

1. **Relabel, don't rebuild.** On `OrganisationalTemplateDetailPage.jsx` (Platform: `pmo-module`;
   Simulator: `sim-pmo-module`), make the process-template content block clearly state whose data
   it is: when viewed via the **Project Templates** list (`isProjectList` route flag already
   exists), header/help text reads as "this project's actual data — fill it in and save"; when
   viewed via **Organisational Templates** (org/PMO tier, no `project_id`), it reads as "this
   organisation's default content used when PMs copy this template into a project". No new
   fields, no schema change — a labelling and micro-copy fix only.
2. **Retire the Hub's entry points, not its data.** Mirroring the non-destructive pattern from
   [[v823]] (legacy Template Library → redirect), turn the Hub's list/landing pages
   (`ProcessTemplateListPage.jsx` and Simulator equivalents, all 4 mounts: platform pm/pmo,
   simulator pm/pmo) into redirects to the Project Templates page for the resolved current
   project, instead of deleting routes, menu grants, or the underlying create/edit/detail
   sub-pages. This closes off the duplicate-entry path going forward without touching history.
3. **Do not restore the orphaned `pm_pt_hub` menu entry.** It stays exactly as it is today
   (not rendered) — restoring it would re-open the second entry point this PRD is closing.

## c) User stories

1. As a PM viewing a template I copied into my project (Project Templates page), I can see —
   without needing to be told out-of-band — that the "Document data" fields below the template
   metadata are my project's actual content, not template configuration.
2. As a PM, I fill in Purpose/Objectives/etc. on that page and click Save, and the values persist
   to my project's own copy of the underlying document (already true today — this PRD only makes
   it discoverable).
3. As a PMO admin viewing the same template at the organisation tier (Organisational Templates,
   no project context), I see that I'm editing the org-wide default content, not a specific
   project's data.
4. As a PM who navigates directly to `/pm/process-templates` (old bookmark, muscle memory, or
   stray link), I land on the Project Templates page for my current project instead of a
   parallel, disconnected copy-and-edit flow that could fork my document into a second row.
5. As a PM in the Simulator, I get the same clarified labelling and the same Hub redirect
   behaviour as Platform (parity).
6. As the system, I never silently create two unrelated rows in the same 24-table family for the
   same project as a result of normal navigation.

## d) Implementation decisions (agreed)

| # | Decision |
|---|----------|
| 1 | No new database tables or columns. Pure UI copy/labelling + route-level redirect. |
| 2 | Relabel is driven by the existing `isProjectList` route flag already computed in `OrganisationalTemplateDetailPage.jsx` — no new tier-detection logic. |
| 3 | Hub retirement follows the [[v823]] pattern exactly: convert the landing/list page into a `<Navigate>` redirect to Project Templates scoped to the resolved current project (via `usePlatformProjectId()`); leave create/edit/detail sub-routes and menu config untouched. |
| 4 | The orphaned `pm_pt_hub` / `sim_pm_pt_hub` menu grants are left as-is (already not rendering) — explicitly **not** restored. |
| 5 | Platform + Simulator parity: both `pmo-module`/`sim-pmo-module` detail pages relabelled; both platform and simulator Hub list pages (pm + pmo mounts, 4 total) redirected. |
| 6 | Historical/orphaned data reconciliation (rows created via the Hub's own copy path with no `process_template_node_links` entry) is explicitly out of scope for this plan — flagged as a manual follow-up DB check (see Further notes). |

## e) Testing decisions

- Manual: open a project-tier copy of a process-template document (e.g. Project Charter) on
  Project Templates, confirm the new labelling reads as "your project's data", edit a field, Save,
  reload, confirm persistence (regression check — behaviour already exists, must not break it).
- Manual: open the same template's org-tier row via Organisational Templates, confirm the label
  reads as "organisation default", not "your project's data".
- Manual: navigate directly to `/pm/process-templates` and `/pmo/process-templates` (Platform) and
  their Simulator equivalents, confirm redirect to the correct Project Templates scope.
- Manual: repeat both checks in Simulator for parity.
- No new unit tests required — no new business logic, only copy/labelling and a redirect
  component (same testing posture as [[v823]]).

## f) Out of scope

- Any change to `pm_template_nodes`, `process_template_node_links`, or any of the 24 catalog
  tables' schema or RLS.
- Restoring or repositioning the `pm_pt_hub` sidebar menu entry.
- Migrating/backfilling any pre-existing rows created via the Hub's independent copy path.
- The Hub's deeper sub-pages (create/edit/detail) — left routable directly, only the landing/list
  entry point redirects, mirroring v823's scope boundary.
- Any bespoke per-document-type (24 distinct forms) UI — the generic key/value editor stays as-is
  (that was already a settled v805 decision, not reopened here).

## g) Further notes

- Docs: note the clarified behaviour in
  `Documentation/Form_Template_Org_Field_Customisation_And_Tier_Cascade_Guide.md` (already tracks
  tier-cascade content editing) — a short addendum, not a rewrite.
- **Manual follow-up requested from the user:** run one query against `public.project_charters`
  (and, if time allows, the other 23 tables in `PROCESS_TEMPLATE_TABLES`) for rows where
  `project_id`/`practice_project_id` is not null and no matching row exists in
  `process_template_node_links` — any hits indicate pre-existing Hub-created data that would need
  a small reconciliation follow-up plan.
- Related: [[v823]] (redirect pattern precedent), [[v805]] (generic content editor decision),
  [[v844]] (Project Templates menu split this page now lives behind).
