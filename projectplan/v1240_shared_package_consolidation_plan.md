# v1240 — Shared package consolidation: implementation plan

PRD: `projectprd/v1240_shared_package_consolidation_PRD.md`.
Status: **DRAFT — awaiting approval.** Runs **before** `projectplan/v1239_dual_mode_planning_product_plan.md` (owner decision 2026-10-10: separate plans, run one after the other).

## Approach

Test-first vertical slices (`projectplan/App_Guide.md`). Each slice removes one aliased group everywhere at once (Platform, Simulator, all 24 modules) and leaves both apps working. No SQL. No user-visible change.

## Slice 0 — Baseline and tooling
- [ ] 0.1 Run and record the Platform, Simulator and packages test suites on HEAD (pass/fail per file), plus `pnpm turbo build` of both apps and all modules. This is the regression baseline for every later slice.
- [ ] 0.2 `scripts/check-shared-drift.mjs`: lists every app file under `components/ui|utils|hooks|context|constants` that also exists in `packages/*`, as identical or differing, plus app-only files. It is used in report mode now and enforce mode at the end. Test: fixture folders with identical, differing and app-only files.
- [ ] 0.3 Confirm there are no imports of `apps/*/src/config/pmoMenuHierarchyUtils.js` / `menuRegistry.js` (grep + build), then delete the four files. Smoke test the sidebars in both apps.

## Slice 1 — `AppConfigProvider` (foundation for merged files)
- [ ] 1.1 `packages/shared/src/context/AppConfigContext.jsx`: `AppConfigProvider({ app: 'platform'|'simulator'|'planner', basePath, db })` + `useAppConfig()`. Test: default throws a clear error when missing; values are readable.
- [ ] 1.2 Mount it once in `apps/platform/src/App.jsx` and `apps/simulator/src/App.jsx` (beside the existing providers). Nothing consumes it yet.

## Slice 2 — constants
- [ ] 2.1 Copy the stale-package file (apps agree) into `packages/shared/src/constants`; move the app-only file if it is service-free.
- [ ] 2.2 Remove the `@nidus/shared/constants` alias from both apps and all 24 module configs; delete the app copies.
- [ ] 2.3 Retest + build all; compare with the baseline.

## Slice 3 — utils
- [ ] 3.1 Copy the 16 apps-agree files into packages, with tests.
- [ ] 3.2 Merge the 5 divergent files (`briefCharterTerminology`, `legacyTemplateParse`, `menuCacheUtils`, `projectWizardFormUtils`, `sidebarRouteUtils`):
  - Diff each one.
  - Real app differences become a parameter or `useAppConfig()`.
  - Accidental drift keeps the better version.
  - A parameterised test covers both apps.
- [ ] 3.3 App-only utils (7): service-free ones move to packages; service-dependent ones move to `apps/*/src/lib/` and imports are updated.
- [ ] 3.4 Remove the `@nidus/shared/utils` alias everywhere; delete the copies; move the tests; retest + build.

## Slice 4 — hooks
- [ ] 4.1 Copy the 6 apps-agree hooks.
- [ ] 4.2 Merge `useEntityDetailParams`, `useMenu`, `useSimMenu`. The menu hooks keep app prefix filtering through `useAppConfig().app`, which keeps the cross-app leak protection (memory). The `pln_` prefix support needed by v1239 D19 is added here as a parameterised case.
- [ ] 4.3 Remove the alias everywhere; delete the copies; move the tests; retest + build. Manual: Platform sidebar, PM sidebar, Simulator sidebar.

## Slice 5 — ui
- [ ] 5.1 Copy the 14 apps-agree components (`AuthorisationRequestModal`, `CompletedExampleManager`, `DashboardStatCard`, `FormSurface`, `index.js`, `IndustryPlanColumnChooser`, `Modal`, `MultiItemTextField`, `RecordLifecycleFieldLock`, `SelectField`, `SuccessConfirmationModal`, `Table`, `TierFormPolicyPanel`, `ViewToggle`).
- [ ] 5.2 Merge `SearchableSelect.jsx` (Platform ≠ Simulator).
- [ ] 5.3 App-only components:
  - Service-free ones (e.g. `CalculatedMetricsSummary` if clean) move to `packages/ui`.
  - Service-dependent ones (`DocumentAttachmentsPanel`, `SignatoriesPanel`, `SelectOptionsEditor`, `SignatureCaptureControl`, …) move to `apps/*/src/components/shared-app/` and their imports are updated.
- [ ] 5.4 Remove the `@nidus/ui` alias everywhere; delete the copies; move the tests; retest + build. Manual: light/dark, list page, form + unsaved guard, success modal, exports.

## Slice 6 — context (last, highest risk)
- [ ] 6.1 Copy the 2 apps-agree contexts. App-only contexts (3): service-free ones move; others go to `apps/*/src/context-app/`.
- [ ] 6.2 Remove the `@nidus/shared/context` alias everywhere, in the same commit as deleting the copies, so there is never a moment with two context instances. Test: one provider instance reaches a deep consumer (theme, unsaved-changes, toast).
- [ ] 6.3 Retest + build; full manual smoke in both apps.

## Slice 7 — Federation singletons
- [ ] 7.1 Add `@nidus/ui` and `@nidus/shared` to `FEDERATION_SHARED` (`packages/shared/src/federation/federationShared.js`) as `singleton: true`.
- [ ] 7.2 Test: build `planning-hub` as a real remote, load it in the Platform shell, and confirm that the theme toggle and unsaved-changes guard work inside it.

## Slice 8 — Guards, CI, docs
- [ ] 8.1 Switch `check-shared-drift.mjs` to enforce mode. Add an ESLint rule/`no-restricted-imports` pattern blocking relative imports into `packages/` and blocking new files in the old shadow folders.
- [ ] 8.2 Replace the stale `.github/workflows/shared.yml` with: triggers on `packages/ui|shared|supabase|config/**`, runs the drift check + `pnpm turbo build test --filter=...[HEAD^1]` (all dependents).
- [ ] 8.3 CLAUDE.md rule 34.3 note (no app-local `@nidus/*` aliases; CI enforces). Update the two shadow-copy memories. `Documentation/Shared_Package_Consolidation_v1240_Guide.md` (what moved where, how to add a shared component now).
- [ ] 8.4 Final regression against the Slice 0 baseline; record the results in the review section.

## Risks

| Risk | Mitigation |
|---|---|
| A merged file breaks Simulator-only behaviour | Parameterised tests for both apps; Simulator manual smoke per slice |
| Two React context instances during the context slice | Alias removal and copy deletion in one commit (6.2) |
| A module build breaks after alias removal | Every slice builds all 24 modules before merge |
| Large diff hard to review | One group per slice; mechanical copies separated from merges within each slice |

## Review (filled in after implementation)

Not started.
