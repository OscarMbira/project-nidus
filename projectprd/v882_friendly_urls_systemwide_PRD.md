# v882 — Friendly URLs System-Wide — PRD

**Repo:** `E:\project-nidus` (Platform + Simulator)
**Plan:** `projectplan/v882_friendly_urls_systemwide_plan.md`

---

## a) Problem statement

Only two record families in the entire Platform app show human-readable URLs today: Risk Register
(`risk_code`, e.g. `RISK-0012`) and Issue Register (`issue_code`). Every other record type nested under
`/platform/projects/:projectId/...` — Requirements, Daily Log, Lessons Log, Lessons Reports, Configuration
Items, Product Descriptions, Product Status Accounts, Work Packages, Stage Plans, Form Instances, and the five
"structured" report types (Exception/Highlight/Checkpoint/End Stage/End Project) — still shows raw UUIDs in the
address bar, for the project segment, the record segment, or both. This surfaced concretely when a user opened a
Requirement detail page and saw
`/platform/projects/0ff409c7-6b75-459c-b9dc-5dd7bf5a09c2/scope/requirements/71fe99e6-ef92-4365-8f53-3b9481edd3aa`
despite the record already displaying a human code (`REQ-P08-001`) on-page.

Investigation found the DB layer is mostly already there: a generic trigger
(`public.trg_apply_admin_display_id`, installed by `v756b`/`v756d`) already populates a code column on 13 of
these 17 families, driven by `admin.id_generation_rules` seeds. The gap is almost entirely on the frontend — the
only resolver code that exists (`entityResolverService.js`, `projectRouteParam.js`) is hand-written per entity
type (a `resolveRiskId`/`getRiskCode`/`platformRiskPath` triple, repeated for Issue, and nothing else), which is
exactly why it stopped at two families and was never extended.

Two more problems surfaced during the audit, not previously known:
- `lessonsReportService.js` still calls `generate_lessons_report_reference`, an RPC that `v756b` already dropped
  in favour of the generic trigger — a live bug independent of URLs.
- `end_project_reports`: the original DDL (`v30`) declares the code column as `report_reference`, but the
  `v756b` generator trigger writes to `document_ref` instead — a column mismatch that needs resolving before a
  URL can safely key on either one.
- `stage_plans` has two competing generators firing simultaneously: the older Phase-12 regime
  (`v526_platform_entity_code_triggers.sql`, writing `plan_code`) and the newer admin-engine regime (`v756b`,
  writing `plan_reference`).

## b) Solution

Replace the copy-paste-per-entity resolver pattern with one generic, table-driven registry
(`packages/shared/src/config/entityUrlRegistry.js`): each entity type is a ~5-line config entry
`{ table, codeColumn, parentScopeColumn, listPath, detailPath }`, and a single generic resolver
(`resolveEntityRouteKey(entityType, idOrCode)` / `resolveEntityId(entityType, routeSegment)`) replaces the
hand-written function pairs. Risk and Issue migrate onto this registry first (proving it against the two families
that already work), then the 13 DB-ready families are added as registry entries + link-building updates, then the
4 greenfield families get a new Admin ID Generation rule + trigger (per rule 16.2) before joining the registry.
The three found bugs (dropped RPC, column mismatch, dual generator) get fixed as part of the family they block.

## c) User stories

1. As a PM, every record detail/edit URL under `/platform/projects/:projectId/...` shows the project's
   `project_code` and the record's own human code, for all 17 families — not just Risk and Issue.
2. As a PM opening an old bookmarked/shared UUID-based link, it still resolves correctly (backward-compatible
   loader) and the address bar self-corrects to the friendly form, same behaviour already proven for Risk/Issue
   and for the `/pm/controls/*` area (v872).
3. As a developer adding an 18th record type in future, wiring up its friendly URL is a config addition to
   `entityUrlRegistry.js` plus updating that family's own link-building call sites — not a new resolver function
   pair.
4. As a PM working in Lessons Reports, report creation no longer fails/logs errors from the dropped
   `generate_lessons_report_reference` RPC.
5. As a PM working in End Project Reports or Stage Plans, the URL key is unambiguous — one column, one generator,
   not two competing ones.
6. As a Simulator user, the same 17-family coverage exists on the Simulator side (parity, rule 34.1).

## d) Implementation decisions (already settled)

- **Generic table-driven resolver, not more copy-paste** (confirmed). Building this once is the bulk of Phase 1's
  work; every family after that is a config entry + call-site updates, not new resolver code.
- **Phasing: DB-ready families first, greenfield last** (confirmed) — 13 families whose code column + generator
  already exist go first (fastest visible progress, no schema work needed); the 4 greenfield families
  (`agile_releases`, `requirements_register`, `activity_list`, `project_opa_customisations`) get a new Admin ID
  Generation rule + trigger in a later phase, following rule 16.2's checklist exactly (rule seed in
  `E:\project-nidus-admin\SQL\`, generic trigger wiring in `E:\project-nidus\SQL\`, backfill for existing rows).
- **`end_project_reports` column mismatch**: use `document_ref` as canonical (it's what the live generator
  trigger actually populates) — fix or drop the unused `report_reference` column reference in that family's issue,
  don't try to reconcile both.
- **`stage_plans` dual generator**: `plan_reference` (the admin-engine column) becomes canonical, since
  `admin.id_generation_rules` is the actively-maintained system per rule 16.2 for all new/ongoing work. The older
  Phase-12 `plan_code` trigger gets left in place (harmless, unused) rather than removed, to avoid touching
  unrelated trigger infrastructure as a side effect of a URL fix.
- **Dropped-RPC bug in `lessonsReportService.js`**: fixed in the same issue that migrates Lessons Reports, since
  it's the same file being touched anyway.
- **GitHub issues**: this PRD gets broken into vertical-slice issues per rule 17.2 (see plan file) — issues are
  drafted in the plan but not created on GitHub without a separate explicit go-ahead (creating issues is a
  visible/shared action).
- **Platform + Simulator parity** (rule 34.1) — every family fix ships for both apps in the same issue, not as a
  follow-up.

## e) Testing decisions

- Unit tests for the new generic resolver (`entityUrlRegistry.test.js`) covering: code round-trips to UUID and
  back for a sample of registry entries, unresolvable code falls back gracefully, legacy UUID bookmark resolves
  and self-corrects.
- Per-family manual smoke test after migration: open the family's list → detail → edit, confirm the URL shows
  the friendly form and an old UUID bookmark still resolves.
- No change to existing Risk/Issue behaviour is expected — their migration onto the generic registry is a
  refactor, not a behaviour change, and existing coverage (if any) should be re-run to confirm.

## f) Out-of-scope

- The five structured report types keep their five separate service files / components (not consolidated into
  one shared component) — this PRD only touches their link-building and loader code, not their broader
  architecture.
- Renaming/reconciling the three parallel ID-generation regimes (Phase-12 triggers vs admin-engine vs none)
  beyond what's needed to resolve the `stage_plans` conflict — a larger, separate cleanup if ever pursued.
- Any Admin-app equivalent — Admin already has its own complete `navId()`/`useDisplayId()` system (see v205),
  unaffected by this Platform/Simulator-side work.

## g) Further notes

- Audited via two research passes on 2026-08-15: initial scope discovery (17 families identified) and a
  per-family DB/generator catalog (table, code column, generator status, route lines, file counts) — see plan
  file for the full table.
- The DB layer being ~80% pre-built (`v756b`/`v756d`'s generic trigger already covers 13 of 17 families) means
  this initiative is materially smaller than it first appears — it's a frontend/resolver project, not a schema
  migration project, for most of its scope.
