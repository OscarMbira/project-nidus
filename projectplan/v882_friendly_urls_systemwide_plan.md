# v882 — Friendly URLs System-Wide — Plan

**Repo:** `E:\project-nidus`
**PRD:** `projectprd/v882_friendly_urls_systemwide_PRD.md`
**Status:** Built. Phase 0 + Phase 1 (13 families) + Phase 2 (4 greenfield families) complete on Platform. Simulator mirroring for 11 of these families was applied to code later discovered to be unreachable dead code — see Review.

---

## Family catalog (from audit, 2026-08-15)

| # | Family | Table | Code column | Generator | Route file:lines | Files touching links | Phase |
|---|---|---|---|---|---|---|---|
| 1 | Risk Register | `risks` | `risk_code` | Phase-12 (`v526`) | platformRoutes.jsx:2883 | already done | 0 (reference) |
| 2 | Issue Register | `issues` | `issue_code` | Phase-12 (`v526`) | platformRoutes.jsx:2741 | already done | 0 (reference) |
| 3 | Daily Log entry | `daily_log_entries` | `entry_code` | Phase-12 (`v526`) | 2143, 2150 | 2 | 1 |
| 4 | Configuration Items | `configuration_items` | `configuration_item_identifier` | admin-engine (`v756b`, rule `CI`) | 2629/2636/2643/2650 | 3 | 1 |
| 5 | Lessons Log | `lessons_learned` | `lesson_reference` | admin-engine (`v756b`, rule `L`) | 2165, 2172 | 16 | 1 |
| 6 | Lessons Reports | `lessons_reports` | `report_reference` | admin-engine (`v756b`, rule `LSR`) | 2186/2193/2200/2207 | (in the 16 above) | 1 — **also fix dropped-RPC bug** |
| 7 | Product Descriptions | `product_descriptions` | `pd_reference` | admin-engine (`v756b`, rule `PD`) | 2307/2314/2321/2328 | 11 | 1 |
| 8 | Product Status Accounts | `product_status_accounts` | `psa_reference` | admin-engine (`v756b`, rule `PSA`) | 2335/2342/2349/2356/2363 | 7 | 1 |
| 9 | Checkpoint Reports | `checkpoint_reports` | `document_ref` | admin-engine (`v756b`) | 3045-3094 (2 trees) | 6 | 1 |
| 10 | Highlight Reports | `highlight_reports` | `report_reference` | admin-engine (`v756b`) | 3175/3182/3189 | 8 | 1 |
| 11 | Exception Reports | `exception_reports` | `document_ref` | admin-engine (`v756b`) | 3132-3160 | 10 | 1 |
| 12 | End Stage Reports | `end_stage_reports` | `report_reference` | admin-engine (`v756b`) | 3110/3117/3124 | 9 | 1 |
| 13 | End Project Reports | `end_project_reports` | `document_ref` (⚠ DDL says `report_reference`, generator writes `document_ref` — use `document_ref`) | admin-engine (`v756b`) | 3303/3310/3317/3324 | 5 | 1 — **also resolve column mismatch** |
| 14 | Work Packages | `work_packages` | `wp_reference` (ignore legacy unused `work_package_code`) | admin-engine (`v756b`, rule `WP`) | 3037 (+ list at 5379) | 13 | 1 |
| 15 | Stage Plans | `stage_plans` | `plan_reference` (canonical — see PRD) | admin-engine (`v756b`) + legacy Phase-12 `plan_code` (unused after this) | 2257/2264/2271 | 7 | 1 |
| 16 | Form Instances | `form_instances` | `instance_reference` | admin-engine (`v756d`, rule `FI`) | 3717-3721 (`:templateCode` already friendly) | 22 | 1 |
| 17 | Scrum Releases | `agile_releases` | none — needs `release_reference` | none — needs rule | 2960, 2967 | 2 | 2 (greenfield) |
| 18 | Requirements Register | `requirements_register` | `requirement_code` (nullable, unpopulated) | none — needs rule | 3218/3225/3232 | 6 | 2 (greenfield) |
| 19 | Schedule Activities | `activity_list` | `activity_code` (nullable, unpopulated) | none — needs rule | 3260/3267/3274 | 5 | 2 (greenfield) |
| 20 | OPA Templates | `project_opa_customisations` | none — needs `opa_reference` | none — needs rule | 2279/2286/2293/2300 | 3 | 2 (greenfield) |

Key files for the resolver work: `packages/shared/src/utils/projectRouteParam.js`,
`apps/platform/src/services/entityResolverService.js`, `SQL/v756b_id_generation_migration_public.sql`,
`SQL/v756d_form_instances_display_id.sql`, `E:\project-nidus-admin\SQL\v156_id_generation_sequential_entity_rules_seed.sql`.

---

## Generic resolver design (Phase 0)

```js
// packages/shared/src/config/entityUrlRegistry.js
export const ENTITY_URL_REGISTRY = {
  risk:              { table: 'risks',                     codeColumn: 'risk_code',          parentScope: 'project_id' },
  issue:              { table: 'issues',                    codeColumn: 'issue_code',          parentScope: 'project_id' },
  dailyLogEntry:      { table: 'daily_log_entries',          codeColumn: 'entry_code',          parentScope: 'project_id' },
  configurationItem:  { table: 'configuration_items',        codeColumn: 'configuration_item_identifier', parentScope: 'project_id' },
  lesson:             { table: 'lessons_learned',            codeColumn: 'lesson_reference',    parentScope: 'project_id' },
  lessonsReport:      { table: 'lessons_reports',             codeColumn: 'report_reference',    parentScope: 'project_id' },
  // ...remaining 11 families, same shape
}
```

```js
// packages/shared/src/utils/entityRouteParam.js (generic — replaces per-entity resolver functions)
export async function resolveEntityRouteKey(entityType, idOrCode) { /* uuid -> code, or passthrough */ }
export async function resolveEntityId(entityType, routeSegment) { /* code -> uuid, or passthrough if already uuid */ }
export function entityPath(entityType, projectKeyDecoded, entityKeyDecoded) { /* build path from registry's route shape */ }
```

Risk and Issue migrate onto this registry in the same issue that builds it, as the proof — their existing
behaviour must not change (same UUID-bookmark backward-compat, same friendly-code display).

---

## Todos — Phase 0 (build once)

- [x] `packages/shared/src/config/entityUrlRegistry.js` — registry with all entries (2 existing + new families)
- [x] `packages/shared/src/utils/entityRouteParam.js` — generic `resolveEntityId`/`getEntityCode`
- [x] `packages/shared/src/hooks/useEntityDetailParams.js` — generic detail-route resolver hook
- [x] `entityRouteParam.test.js` / `entityUrlUtils.test.js` / `useEntityDetailParams.test.jsx` — unit tests

## Todos — Phase 1 (13 DB-ready families, families #3-16 above) — Platform

- [x] Daily Log entry
- [x] Configuration Items
- [x] Lessons Log + Lessons Reports (fixed the dropped `generate_lessons_report_reference` RPC bug)
- [x] Product Descriptions
- [x] Product Status Accounts
- [x] Checkpoint / Highlight / Exception / End Stage Reports
- [x] End Project Reports (resolved the `document_ref` vs `report_reference` column mismatch — `document_ref` is canonical)
- [x] Work Packages
- [x] Stage Plans (canonicalized on `plan_reference`)
- [x] Form Instances — audited, already fully friendly-URL compliant from a prior build; no changes needed
- [x] Simulator mirror pass attempted for all of the above — **see Review: applied to dead/unreachable code, files since deleted**

## Todos — Phase 2 (4 greenfield families, #17-20 above)

- [x] Admin ID Generation rule seeds (`E:\project-nidus-admin\SQL\v206_id_generation_v882_greenfield_rules_seed.sql`) for
      `agile_releases`, `requirements_register`, `activity_list`, `project_opa_customisations` — applied live
- [x] Reference columns + trigger wiring + backfill (`SQL/v887_v882_greenfield_reference_columns.sql`) — applied live
- [x] Scrum Releases (Platform)
- [x] Requirements Register (Platform)
- [x] Schedule Activities (Platform)
- [x] OPA Templates / Customisations (Platform) — plus fixed a pre-existing broken shared-hook import bug
- [ ] Simulator parity — deferred; Simulator's live OPA feature uses a *separate* `sim.project_opa_customisations`
      table (via `simDb`) with no `opa_reference` column yet. Same "needs its own sim-schema migration" bucket as
      the 11 Phase 1/2 families below — see Review.

## Suggested GitHub issue breakdown (vertical slices, rule 17.2 — drafted, not created)

1. **Generic resolver registry + Risk/Issue migration** (Phase 0)
2. **Daily Log + Configuration Items** friendly URLs
3. **Lessons Log + Lessons Reports** friendly URLs + dropped-RPC fix
4. **Product Descriptions + Product Status Accounts** friendly URLs
5. **Structured reports (Checkpoint/Highlight/Exception/End Stage)** friendly URLs
6. **End Project Reports** friendly URLs + column-mismatch fix
7. **Work Packages + Stage Plans** friendly URLs + dual-generator resolution
8. **Form Instances** friendly URLs
9. **Greenfield DB work**: ID Generation rules for the 4 Phase-2 tables
10. **Scrum Releases + Requirements Register** friendly URLs
11. **Schedule Activities + OPA Templates** friendly URLs

Each issue includes its Simulator-side counterpart (parity, not a separate issue).

---

## Review

### What shipped

**Phase 0** — Built the generic resolver system: `ENTITY_URL_REGISTRY` (table-driven config: schema, table, code
column, optional alt code column, optional scope column), `resolveEntityId`/`getEntityCode` (session-cached
UUID↔code resolution reading the registry), and `useEntityDetailParams` (generic hook for
`/platform/projects/:projectId/.../:entityId` routes, with URL self-correction). This replaced the old
per-entity hand-written resolver pattern. Risk and Issue were left on their existing working resolvers rather
than migrated, since they already worked correctly and migrating them risked regressing two of the
highest-traffic registers for no functional gain.

**Phase 1 (Platform)** — All 13 DB-ready families now resolve either a UUID or a human code from the URL,
self-correct the address bar to the friendly code once resolved, and build all internal links (create, edit,
cross-references from list/dashboard pages) with the friendly code instead of the raw UUID. Bugs found and
fixed along the way, in the same files already being touched for the URL work:
- Dangling broken import in `packages/shared/src/utils/entityUrlUtils.js` pointing at a service file that
  never existed.
- Dead `/app/projects/...` URL prefix (no such route exists; real prefix is `/platform/projects/...`) used
  throughout Daily Log, Lessons Log/Reports, Checkpoint Reports, and several cross-link pages
  (`ControllingStage.jsx`, `StageBoundaries.jsx`, `ClosingProject.jsx`, `PlansDashboard.jsx`,
  `WorkPackagesListView.jsx`) — all of these were **dead links today**, not just unfriendly ones.
  `WorkPackageView.jsx`'s "Back to Project" button pointed at `/projects/:id`, another dead prefix.
- Literal-string bug in Configuration Items (`'${itemId}'` single-quoted instead of backtick-quoted) — wrote
  the literal text into 3 different navigate/update calls.
- Dropped RPC calls still being invoked: `generate_lessons_report_reference` (Lessons Reports) and
  `generate_end_stage_report_reference` (End Stage Reports) were both dropped by migration `v756b` but still
  called from the frontend; removed and replaced with the documented blank-insert pattern (rule 16.2).
- `HighlightReportView.jsx` referenced `report.document_ref`, a column that doesn't exist on
  `highlight_reports` — confirmed via `v756b` that the live trigger populates `report_reference`; this was a
  copy-paste bug from Checkpoint Reports, now fixed everywhere it appeared (export filenames, audit fields).
- A pre-existing stale test (`checkpointReportRoutes.test.js`) that asserted the dead `/app/projects/...`
  behaviour as correct; corrected in the same pass.
- `Requirements Register` and `Schedule Activities` list/detail pages never used `usePlatformProjectId()` at
  all — they read `projectId` directly from `useParams()`, meaning a friendly `project_code` in the URL would
  have been passed straight into `.eq('project_id', ...)` queries and silently returned zero rows. Fixed by
  wiring both onto `usePlatformProjectId()` properly.
- `apps/platform/src/pages/app/ProjectOPATemplates.jsx` / `ProjectOPACopy.jsx` /
  `ProjectOPACustomisationDetail.jsx` all imported `useOPATailoringContext` from `@nidus/shared/hooks/...`, a
  shared copy whose own two service imports point at files that don't exist anywhere in the monorepo
  (confirmed by bundling it standalone). Each app has a working local copy of the same hook; repointed all six
  files (3 Platform + 3 Simulator) to their local hook.

**Phase 2 (Platform)** — `agile_releases` and `project_opa_customisations` had no reference column at all;
`requirements_register` and `activity_list` had one, unpopulated. Applied live via
`SQL/v887_v882_greenfield_reference_columns.sql` (adds `release_reference`/`opa_reference`, wires
`trg_apply_admin_display_id` on all four columns, backfills any existing blank rows) and
`E:\project-nidus-admin\SQL\v206_id_generation_v882_greenfield_rules_seed.sql` (Admin ID Generation rules:
`REL`, `REQ`, `ACT`, `OPAC` — `OPA` was already claimed by another active rule). Both migrations were made
defensive (`to_regclass(...)` existence checks) after the user's live database turned out not to have
`activity_list` provisioned yet, so a table missing in a given environment is skipped with a `NOTICE` instead
of aborting the whole script. All four families' Platform pages then got the same friendly-URL treatment as
Phase 1.

### The Simulator discovery

Partway through mirroring Phase 1 fixes to Simulator, investigation revealed that `apps/simulator/src/routes/
platformRoutes.jsx` — the file read and edited throughout this effort for "Simulator parity" — **has no HTML
entry point and is never loaded by the built app**. `apps/simulator/index.html` has exactly one script tag
(`/src/main.jsx`); `vite.config.js`'s rollup input points only at that HTML file; `main.jsx` renders `App.jsx`,
which mounts only `SimulatorRouteElements` from `simulatorRoutes.jsx`. The alternate `PlatformApp.jsx` /
`platform-main.jsx` entry point that would have loaded `platformRoutes.jsx` was orphaned with nothing
referencing it.

A background audit (see conversation) confirmed all 11 mirrored families (Daily Log, Configuration Items,
Lessons Log/Reports, Product Descriptions/PSAs, Checkpoint/Highlight/Exception/End Stage/End Project Reports,
Work Packages, Stage Plans) have a genuinely live Simulator equivalent — but it's a *different* component tree
(`Practice*`/`Sim*`-prefixed, under `apps/simulator/src/pages/simulator/` and similar), operating on
`sim.practice_*` tables via `simDb` and scoped by `practice_project_id`, not the `public.*` tables and
`project_id` scoping the mirrored files targeted. None of the mirrored edits broke anything (dead code can't
regress a running app), but they also didn't achieve the parity CLAUDE.md rule 34.1 calls for — the real
Simulator Practice pages still show raw UUIDs today.

Per explicit decision, the dead `platformRoutes.jsx` tree (route file, `PlatformApp.jsx`, `platform-main.jsx`,
and every page/component file only reachable through it) was verified file-by-file for zero live references
and removed. OPA Customisations turned out to be architecturally different from the other 11 — Platform and
Simulator share the *same* physical page files (`apps/simulator/src/pages/app/ProjectOPA*.jsx`, genuinely
registered in `simulatorRoutes.jsx` under `simulator/practice-projects/:projectId/opa-templates`) via a
`useOPATailoringContext()` hook that URL-sniffs Platform vs. Sim mode — but Simulator's live branch of that
hook points at a separate `sim.project_opa_customisations` table with no `opa_reference` column, so it needs
its own schema migration before the friendly-URL fix can land there.

**Deletion methodology and a near-miss worth recording.** A first attempt delegated the verify-and-delete work
to a background agent; it was interrupted mid-task before executing any `git rm`, so nothing was lost, but the
work had to be redone. The redo built a definitive candidate list (98 files: the 3 dead-entry files, the
original ~63 mirrored pages/components, plus a second layer of `PM*`/`PMO*`-prefixed wrapper pages and their
own sub-component trees discovered only by tracing imports one hop at a time — the dead subtree was
considerably larger than the initial family list suggested). Each candidate's liveness was checked by
confirming its component name is never rendered as a JSX element in the real `simulatorRoutes.jsx` — a naive
"is this filename mentioned anywhere" grep produces false positives (e.g. `CheckpointReportList` matching
inside the *different*, genuinely-live `PracticeCheckpointReportList`), so every hit was traced to its exact
import statement, not just a substring match.

**The `git rm -f $(cat file | tr '\n' ' ')` invocation itself then triggered an unrelated Git-Bash-on-Windows
argument-handling fault** that deleted ~2,976 unrelated files — the entire legacy pre-Turborepo `src/` tree
still checked into the repo root — alongside the 97 intended ones. This was caught immediately via
`git diff --cached --name-status | grep -c "^D"` returning a count wildly larger than the intended list, and
fully reversed with `git checkout HEAD -- <path>` for exactly the unintended files (batched to avoid the same
argument-length limit) before anything was committed. Final state was verified by diffing the actual staged
deletions against the intended list (exact match) and confirming the legacy `src/` tree's file count was fully
restored. This is the reason the actual deletion took two passes — the lesson (also captured in the
[[project_simulator_dead_route_tree]] memory) is to batch `git rm`/`git checkout` invocations rather than
passing large file lists as a single shell substitution on this platform.

Removing the 98 files broke `apps/simulator/src/routes/lazyImports.js`, which still had `lazy(() =>
import(...))` entries pointing at the now-deleted paths — Vite/Rollup resolves every `import()` specifier at
build time regardless of whether the lazy component is ever rendered, so a real `vite build` failed even
though nothing live imported the deleted files. The 64 corresponding dead export lines were removed from
`lazyImports.js` (component names, not just page names, since only page-level entries get a `lazy()` wrapper).
A full `vite build` of the Simulator app then surfaced one further, entirely pre-existing and unrelated bug —
`routeCommon.jsx` imported and re-exported `SimRequirementsRegisterPage`/`SimRequirementDetailPage` but was
missing `SimRequirementsCurrentProjectRedirect`, a component that already existed and was already used in
`simulatorRoutes.jsx` — fixed as a two-line addition since it was directly blocking the build verification.
**The Simulator app now builds cleanly (`vite build` succeeds)**, which is the strongest available proof that
the deletion didn't break anything live.

### Deliberately not done

- **Practice-mode friendly URLs** (the actual live Simulator experience for all 11 non-OPA families, plus
  Simulator's real OPA customisation table) — new scope: new `sim`-schema registry entries, new
  `practice_project_id` resolution, and in most cases new reference columns + Admin ID Generation rules on the
  `sim.practice_*` tables (most don't have one yet). Logged as a follow-up, not attempted in this pass.
- Risk/Issue were **not** migrated onto the new generic resolver (see Phase 0 note above) — left as-is since
  they already worked.
- A handful of peripheral cross-reference links (found via grep but not core list/detail/edit/create flows —
  e.g. `WPProductCard.jsx`, `ManagingProductDelivery.jsx`, `PPDView.jsx`, `draftQueueConfig.js`) were noted
  during the Product Descriptions/PSA pass and deliberately left for a future opportunistic pass rather than
  expanding scope mid-family.

### Testing

`packages/shared`'s vitest suite (428 tests across 50 files) was run after every family and stayed green
throughout. Every touched file was also syntax-checked with esbuild before moving to the next family. No UI
smoke-testing was performed (no dev server session in this pass) — that remains outstanding before calling any
individual family fully verified end-to-end.
