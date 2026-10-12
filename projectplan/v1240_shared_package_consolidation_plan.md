# v1240 — Shared package consolidation: implementation plan

PRD: `projectprd/v1240_shared_package_consolidation_PRD.md`.
Status: **APPROVED 2026-10-11 — in progress.** Runs **before** `projectplan/v1239_dual_mode_planning_product_plan.md` (owner decision 2026-10-10: separate plans, run one after the other).

## Approach

Test-first vertical slices (`projectplan/App_Guide.md`). Each slice removes one aliased group everywhere at once (Platform, Simulator, all 24 modules) and leaves both apps working. No SQL. No user-visible change.

## Slice 0 — Baseline and tooling
- [x] 0.1 Run and record the Platform, Simulator and packages test suites on HEAD (pass/fail per file), plus `pnpm turbo build` of both apps and all modules. This is the regression baseline for every later slice.
  - *In progress (2026-10-11).* Runs in a clean git worktree of the pushed commit `633d34e` (`E:\nidus-baseline`) so in-progress v1240 edits cannot contaminate it. Results go to the session scratchpad and are summarised in the Review section.
- [x] 0.2 `scripts/check-shared-drift.mjs`: lists every app file under `components/ui|utils|hooks|context|constants` that also exists in `packages/*`, as identical or differing, plus app-only files. It is used in report mode now and enforce mode at the end. Test: fixture folders with identical, differing and app-only files.
  - *Done 2026-10-11.* `scripts/check-shared-drift.mjs` + `scripts/__tests__/check-shared-drift.test.mjs` (`node --test`, 5/5 pass). It ignores CRLF/LF-only differences, which shrank the true divergent list from 9 to **7** (`legacyTemplateParse.js` and `useEntityDetailParams.js` differed only in line endings). First report: **130 alias overrides in 26 configs**, 670 files in shadow folders.
- [x] 0.3 Confirm there are no imports of `apps/*/src/config/pmoMenuHierarchyUtils.js` / `menuRegistry.js` (grep + build), then delete the four files. Smoke test the sidebars in both apps.
  - *Done 2026-10-11 — scope widened (owner decision: "port, then delete").* The dead copies held work that never went live (commit `e699628`, 2026-10-04). It was ported into `packages/config` before deletion:
    - `menuRegistry.js`: 8 entries (v982 Phase 7 PMO Configuration items + risk categories).
    - `pmoMenuHierarchyUtils.js`:
      - v1000 `dissolveExecutiveOverviewCategory` (Dashboard at the PMO root, matching `SQL/v1000_promote_dashboard_out_of_executive_overview.sql`); `nestExecutiveOverviewSections` is kept as a deprecated alias.
      - `applyCategorySortOrders` now fills only a missing `sort_order` (rule 25.1).
      - The six merge conflicts kept the package side, which was newer.
    - `recordLifecycleRegistry.js`: the v931/v935 Local Registers entry.
  - Also deleted in both apps: the dead `menuRegistryUtils.js`, `menuRegistryMethodology.js` and `recordLifecycleRegistry.js` copies, and three app tests that only exercised dead code.
  - `recordLifecycleService.js` (both apps) had a dynamic import of the app copy; it now imports `LIFECYCLE_TABLE_REGISTRY` from `@nidus/config`, and its test mock was updated to match.
  - Tests:
    - New `packages/config/src/__tests__/v1240PortedConfig.test.js` (19 tests). It includes the one unique case from the deleted app tests.
    - 8 stale tests updated to v1000 behaviour: 7 in `packages/config`, plus 3 in `useMenuMethodology.test.js` per app.
    - `packages/config`: 115/115 pass.
    - `useMenuMethodology` is back to the baseline's 2 pre-existing failures in each app.
  - Menu taxonomy document **not** changed (owner instruction 2026-10-11). The taxonomy already shows Dashboard as a top-level item with no Executive Overview wrapper, so the port aligns the sidebar with it.
  - Visible change: the PMO sidebar loses the empty "Executive Overview" wrapper, and Dashboard leads. Manual sidebar smoke is pending (done with the Slice 0 regression comparison).

## Slice 1 — `AppConfigProvider` (foundation for merged files)
- [x] 1.1 `packages/shared/src/context/AppConfigContext.jsx`: `AppConfigProvider({ app: 'platform'|'simulator'|'planner', basePath, db })` + `useAppConfig()`. Test: default throws a clear error when missing; values are readable.
  - *Done 2026-10-11.* 4/4 tests in `packages/shared/src/context/__tests__/AppConfigContext.test.jsx` (registered in the package's `vitest.config.js` include list). Unknown app ids are rejected. The existing `PlatformContext` was reviewed and not reused: it is async, auth-driven user state, not static app identity.
- [x] 1.2 Mount it once in `apps/platform/src/App.jsx` and `apps/simulator/src/App.jsx` (beside the existing providers). Nothing consumes it yet.
  - *Done 2026-10-11.* Outermost inside `BrowserRouter`:
    - Platform: `app="platform" basePath="" db={platformDb}`
    - Simulator: `app="simulator" basePath="/simulator" db={simDb}`
  - Identical temporary copies in `apps/*/src/context/AppConfigContext.jsx` are needed because the `@nidus/shared/context` alias still points at the app folders until Slice 6, which deletes them. The drift check reports the copies as identical.

## Slice 2 — constants
- [x] 2.1 Copy the stale-package file (apps agree) into `packages/shared/src/constants`; move the app-only file if it is service-free.
  - *Done 2026-10-11.*
  - The "stale" `simulatorRoles.js` was really an app **re-export shim** of the package (`export * from '../../../../packages/…'`), so the package copy is the source and the shim was deleted. The drift script now reports shims separately (6/6 tests).
  - `issueListColumns.js` (no imports) and its test moved to `packages/shared/src/constants`.
  - Four imports were repointed to `@nidus/shared/constants/issueListColumns`.
  - `simulatorV734RoleFlow.integration.test.js` no longer reaches into `packages/` with a relative path (rule 49).
- [x] 2.2 Remove the `@nidus/shared/constants` alias from both apps and all 24 module configs; delete the app copies.
  - *Done 2026-10-11.* 26 configs, one line each. `apps/*/src/constants` now has no files.
- [x] 2.3 Retest + build all; compare with the baseline.
  - Targeted tests pass:
    - package constants: 8/8
    - Simulator role-flow integration + NPC role filter: 5/5
    - Platform Issue tests: 15/15
  - The full-suite comparison and full build wait for the baseline to finish.
- **Finding that changes Slices 3–6 (2026-10-11):** of the 31 "stale package" files, 4 have a **newer package side** and most have changes on **both** sides. "Apps agree" does not mean the package is older. Each file is now merged individually:
  - start from the app version, which is live behaviour;
  - review every package-only change: port it if it is a fix that never went live (as with the dead config copies), drop it if it is older code;
  - record the decision per file in the slice notes.

## Slice 3 — utils
- **Slice 3 outcome (2026-10-11): code done; full-suite regression runs after Slice 4.** Per-file decisions:

  | Decision | Files |
  |---|---|
  | Package version (import/comment differences only; the app `services/supabaseClient` re-exports `@nidus/supabase`) | `automationUtils`, `githubIntegration`, `mentionUtils`, `permissionChecker`, `benefitProgress`, `bulkCopyButtonLabel`, `orgTemplateBulkSelection`, `entityRouteParam` |
  | Package version (unshipped fix) | `checkpointReportRoutes`: the live app built `/app/projects/…` links that match no route, so **Checkpoint Report links were broken**; the package's v882 version builds `/platform/projects/<code>/…` |
  | Package version (unshipped refactor) | `entityUrlUtils` (v882 `ENTITY_URL_REGISTRY`, which covers every entity type used, Simulator included) |
  | App version | `notificationUtils` (session read + `maybeSingle` fix); `stakeholderSEAMUtils` (package copy repeated three keys and lost the `rec.*` fallback); `regionalFormatConstants` (package hardcoded a currency list, rule 25.1, and nothing used it); `initAppErrorReporting` (package version wrote to the `admin` schema, which rule 34.5 forbids) |
  | Platform version for both apps | `briefCharterTerminology`, `sidebarRouteUtils` (Platform-only fixes; new parameters are optional); `projectWizardFormUtils` (the Simulator/package `industry_category_id` field is superseded by Platform's v1106 multi-industry flow, and the Simulator pages using it are dead); `menuCacheUtils` (only the cache version differed: Platform 132, Simulator 74, package 56 → **133**) |
  | Moved into package | `authSession` (optional client parameter; both clients share one auth storage key), `menuItemSelectionUtils`, `riskCategoryMatch`, `riskRegisterStats`, `suiteFieldValues`, `taskOwnerInvitationRoles` |
  | App-side (`apps/*/src/lib/`) | `changeRequestExport` (genuinely different per app), `issueReportAutoSave` (imports an app service). The unusable package copy of `issueReportAutoSave` was deleted. |
  | Shim deleted | `menuLayoutUtils` |

  - **Imports:** 360 imports in 342 app files rewritten from relative `../utils/x` to `@nidus/shared/utils/x` (or `../lib/x`). Every target was verified to exist.
  - **Removals:** `apps/*/src/utils` deleted; utils alias removed from all 26 configs.
  - **Tests:**
    - Merged where both sides had unique cases (`sidebarRouteUtils`, `roleSkillsUtils`).
    - The richer side was taken for `accountResolution`, `formTranslations` and `entityUrlUtils`.
    - App-only tests moved into the package.
    - Package utils tests now run by folder glob. Many had never been in the package include list and only ever ran from the app copies.
  - **Test environment:** `packages/shared/vitest.config.js` now mirrors the apps (jsdom, `src/test/setup.js` copied from the apps, globals, placeholder Supabase env, as in `packages/config`). Two tests needed isolation fixes under jsdom: `entityRouteParam` (clear its `sessionStorage` cache) and `docFetcher` (mock `@nidus/supabase`, not an app path).
  - **Result:** `packages/shared` runs 889 tests (625 before), with 8 failures. Six already failed in the app baseline (`checkpointReportExport` ×4, `ianaTimezoneOptions`, `queryRouter`); the other 2 were fixed above.
  - **Found for later slices:** service-dependent package files that only ever worked as app copies, and so must stay app-side (or receive services) when their group moves:
    - hooks: `useDraftQueue`, `useEntityId`, `useOPATailoringContext`, `useRecordLifecycleFilter`, `useSimPracticeOwner`, `useSimulationCompletion`
    - context: `BrandingContext`, `PlatformContext`
    - ui: `CompletedExampleManager`, `DashboardSwitcher`, `EntityHoldQueue`, `TailorDocumentModal`, `TierFormPolicyPanel`
- [x] 3.1 Copy the 16 apps-agree files into packages, with tests.
- [x] 3.2 Merge the 5 divergent files (`briefCharterTerminology`, `legacyTemplateParse`, `menuCacheUtils`, `projectWizardFormUtils`, `sidebarRouteUtils`):
  - Diff each one.
  - Real app differences become a parameter or `useAppConfig()`.
  - Accidental drift keeps the better version.
  - A parameterised test covers both apps.
- [x] 3.3 App-only utils (7): service-free ones move to packages; service-dependent ones move to `apps/*/src/lib/` and imports are updated.
- [x] 3.4 Remove the `@nidus/shared/utils` alias everywhere; delete the copies; move the tests; retest + build. *(Removal and moves done; full retest + build run with Slice 4.)*

## Slice 4 — hooks
- [x] 4.1 Copy the 6 apps-agree hooks.
  - *Done 2026-10-11.* Per-file decisions:
    - `useProjectPermissions`: package version (only the import differed).
    - `useSuccessModal`: app version (adds the `subject` option).
    - `usePlatformProjectId`: app version (the 2026-09-04 stale-project-id race fix via `CurrentProjectContext`).
    - `useSidebarCollapsed` and `useAffiliateTracking`: the app files were re-export shims, so the package is the source.
    - `useEntityDetailParams`: identical (it differed only in line endings).
- [x] 4.2 Merge `useEntityDetailParams`, `useMenu`, `useSimMenu`. The menu hooks keep app prefix filtering through `useAppConfig().app`, which keeps the cross-app leak protection (memory). The `pln_` prefix support needed by v1239 D19 is added here as a parameterised case.
  - *Done 2026-10-11, with a deviation.* `useMenu` and `useSimMenu` depend on chains of app services: `billingAccessService` → `roleService`, `organisationIndustryService`, and the Simulator's practice-industry service. Moving services is out of scope (PRD f), so:
    - **Both stay app-side** in `apps/*/src/lib/`, each app keeping its current behaviour.
    - The pure part that was copied in both apps, `applySimulatorMenuTransform`, is now **one shared util**, `packages/shared/src/utils/simulatorMenuTransform.js`. It is the Simulator's superset version, with the portfolio, programme and coordinator practice scopes. Both `useMenu` files import and re-export it, and the `packages/config` registry test imports it directly.
    - The `pln_` prefix moves to v1239: the Planner gets its own menu loader for the `pln_` allow-list.
  - **CurrentProjectContext split:**
    - The context object and the no-provider-safe reader move to `packages/shared/src/hooks/useCurrentProject.js`.
    - Each app's `CurrentProjectProvider` keeps its `roleService` logic, supplies the shared object, and re-exports `useCurrentProject`, so ~60 importers are unchanged.
    - This lets `usePlatformProjectId` be a single shared hook (the Planner needs it).
  - **App-side hooks** (`apps/*/src/lib/`): `useMenu`, `useSimMenu`, `useDraftQueue`, `useEntityId`, `useOPATailoringContext`, `useRecordLifecycleFilter`, `useSimPracticeOwner`, `useSimulationCompletion`.
    - All are identical in both apps but bind to each app's own services (`public` vs `sim`).
    - Their unusable package copies and the package tests for them were deleted. The app tests moved to `lib/__tests__`.
- [x] 4.3 Remove the alias everywhere; delete the copies; move the tests; retest + build. Manual: Platform sidebar, PM sidebar, Simulator sidebar.
  - **Imports:** 198 imports in 170 files rewritten to `@nidus/shared/hooks/x` or `lib/`. Every target was verified to exist, except `packages/ui/src/HoldButton.jsx` → `useDraftQueue`, which Slice 5 settles. The app copies of `HoldButton` now import `lib/useDraftQueue`.
  - **Removals:** hooks alias removed from 26 configs; `apps/*/src/hooks` deleted. Package hooks tests run by folder glob.
  - **Tests:** package hooks + context 66/66. App `lib/` + `context`: Platform 42/44, Simulator 41/43; the 2 failures in each are the baseline's pre-existing `useMenuMethodology` failures.
  - **Rewrite script fix:** it missed bare side-effect imports (`import './utils/x'`); fixed and rerun for utils.
  - **Pending:** full regression + build comparison, and the manual sidebar check (left to the owner's final test pass).
- **Fixes made while verifying builds (pre-existing at the pushed commit `633d34e`):**
  - `apps/platform/src/services/intakeFormService.js` was missing `listProjectOptions`, which broke the **Platform build**.
  - `apps/simulator/src/routes/routeCommon.jsx` was missing 9 page exports (`CrossProjectResources`, `ResourceUtilization`, `ResourceForecasts`, `ResourceEdit`, `ResourceAssignmentEdit`, `SimDataManagementAdmin`, `SimDataBreachRecordForm`, `SimPrivacyCenter`, `SimulatorPMInitiationDocumentSignatory`), which broke the **Simulator build**.
  - `packages/modules/pmo-module/index.html` had been accidentally deleted in `94552fa`, which broke the **pmo-module build** and blocked every filtered Platform build. It was restored.
  - With these fixed, all 30 build tasks pass (the baseline failed 3).

## Slice 5 — ui
- [x] 5.1 Copy the 14 apps-agree components (`AuthorisationRequestModal`, `CompletedExampleManager`, `DashboardStatCard`, `FormSurface`, `index.js`, `IndustryPlanColumnChooser`, `Modal`, `MultiItemTextField`, `RecordLifecycleFieldLock`, `SelectField`, `SuccessConfirmationModal`, `Table`, `TierFormPolicyPanel`, `ViewToggle`).
  - *Done 2026-10-11.* Per-file decisions:

    | Decision | Files |
    |---|---|
    | App version | `Modal` (screen-reader title fix), `SelectField` (`customValueActions`, `descriptionColumnBeside`), `DashboardStatCard` (`description`), `FormSurface` ("Back to…" link), `SuccessConfirmationModal` (`subject`), `IndustryPlanColumnChooser` (icon-only row actions, rule 61), `AuthorisationRequestModal` |
    | Package version | `ViewToggle` (the live copy used dark-only text colours, so this is a rule 28.1 fix); `Table` (darker row-number contrast); `MultiItemTextField` (comment only) |
    | Barrel (`index.js`) | Package list (adds `Pagination`, `MultiLineListInput`, `ExpenseItemsTable`) with the app's `export { Table }`. The package's `export { default as Table }` pointed at a default export that does not exist. |

  - **Gap recorded:** for `AuthorisationRequestModal`, the package version's v752 "pending changes" panel was rejected. No caller passes `pending`, so it would always show "No deferred field changes on file…". Wiring it up is follow-up work.
- [x] 5.2 Merge `SearchableSelect.jsx` (Platform ≠ Simulator).
  - *Done.* The Platform version is the newest superset (Enter selects the first named custom action) and serves both apps.
- [x] 5.3 App-only components:
  - Service-free ones (e.g. `CalculatedMetricsSummary` if clean) move to `packages/ui`.
  - Service-dependent ones (`DocumentAttachmentsPanel`, `SignatoriesPanel`, `SelectOptionsEditor`, `SignatureCaptureControl`, …) move to `apps/*/src/components/shared-app/` and their imports are updated.
  - *Done, with corrections.* `CalculatedMetricsSummary`, `DocumentAttachmentsPanel`, `SelectOptionsEditor` and `SignatureCaptureControl` use only package code (`@nidus/shared/services/...`), so they **moved to `packages/ui`** with their tests.
  - **App-side, in `apps/*/src/components/shared-app/`:** `SignatoriesPanel` (the Simulator version uses its practice-membership service), plus the package-listed components that import app services: `CompletedExampleManager`, `DashboardSwitcher`, `EntityHoldQueue`, `HoldButton`, `TailorDocumentModal`, `TierFormPolicyPanel`.
  - The unusable package copies of these were deleted.
  - `pmo-module` / `sim-pmo-module` import `SignatoriesPanel` via `@shell/components/shared-app/…`.
  - Both apps' `vite.config.js` gained `'@shell': src`, because the app builds compile those module pages too.
- [x] 5.4 Remove the `@nidus/ui` alias everywhere; delete the copies; move the tests; retest + build. Manual: light/dark, list page, form + unsaved guard, success modal, exports.
  - **Imports:** 1,084 imports in 755 files rewritten.
  - **Removals:** `@nidus/ui` alias removed from 26 configs; `apps/*/src/components/ui` deleted.
  - **Test environment:** `packages/ui/vitest.config.js` gained placeholder Supabase env.
  - **Test fix:** the moved `SignatoriesPanel` test mocked `../SignatureCaptureControl`, which no longer exists, so the mock silently stopped applying. It was repointed to `@nidus/ui/SignatureCaptureControl`.
  - **Results:** `packages/ui` 29/29 files, 167 tests. That includes `ExportRecordMenu`, which **failed in the baseline** and now passes. App `shared-app` tests: Platform 13/13, Simulator 9/9.
  - **Build:** all 30 build tasks pass.
  - **Manual checks** are left to the owner's test pass.

## Slice 6 — context (last, highest risk)
- [x] 6.1 Copy the 2 apps-agree contexts. App-only contexts (3): service-free ones move; others go to `apps/*/src/context-app/`.
  - *Done 2026-10-11.* `LanguageContext` and `UnsavedChangesContext` differed only by Slice 3's import rewrite, so the package versions were kept.
  - **App-side, in `apps/*/src/lib/`** (not `context-app/`, to keep a single app-side folder):
    - `BrandingContext` and `PlatformContext` (app services);
    - `CurrentProjectContext` provider;
    - `CurrentPortfolioContext` and `CurrentProgrammeContext` (Platform only).
  - **Branding split:**
    - `@nidus/shared/hooks/useBranding` holds the context object and the reader.
    - `@nidus/shared/utils/brandingDefaults` holds `getDefaultBranding`; both apps' `brandingService` import and re-export it.
    - Each app's `BrandingProvider` and `applyBrandingToDOM` stay in `lib/`.
    - `packages/ui`'s `ExportRecordMenu` and `FormTemplateExportMenu` read the shared hook.
  - The unusable package `BrandingContext`/`PlatformContext` copies were deleted. `UnsavedChangesContext.discard.test.jsx` moved into the package.
- [x] 6.2 Remove the `@nidus/shared/context` alias everywhere, in the same commit as deleting the copies, so there is never a moment with two context instances. Test: one provider instance reaches a deep consumer (theme, unsaved-changes, toast).
  - **Imports:** 296 imports in 280 files rewritten.
  - **Removals:** context alias removed from 26 configs; `apps/*/src/context` deleted, including the temporary `AppConfigContext` copies.
  - **Drift check `--enforce`: 0 alias overrides, 0 files in shadow folders.**
- [x] 6.3 Retest + build; full manual smoke in both apps.
  - Package context + hooks: 47/47.
  - A comment containing `apps/*/src` closed its block comment early and broke the parse. Fixed.
  - **All 30 build tasks pass.**
  - Manual smoke is in the owner's test pass.

## Slice 7 — Federation singletons
- [x] 7.1 Add `@nidus/ui` and `@nidus/shared` to `FEDERATION_SHARED` (`packages/shared/src/federation/federationShared.js`) as `singleton: true`.
  - *Done (refined).* Federation matches exact import ids, so the nine **context-defining** modules are listed individually as singletons: seven `@nidus/shared/context/*` plus `hooks/useBranding` and `hooks/useCurrentProject`.
  - Workspace subpaths have no `node_modules` `package.json`, so they carry an explicit `version: '0.0.1'` and `requiredVersion: false`.
  - All 24 module configs now use `shared: FEDERATION_SHARED` instead of their own inline React-only lists.
- [~] 7.2 Test: build `planning-hub` as a real remote, load it in the Platform shell, and confirm that the theme toggle and unsaved-changes guard work inside it.
  - **Build-level check done.** `planning-hub` built as a remote emits nine `__federation_shared_@nidus/…` chunks. The Platform shell built with `VITE_FEDERATION_ENABLED=true` emits the same nine.
  - **Runtime check (browser) is in the owner's test pass:** run the remote on port 5201 with the shell federated, then toggle the theme and trigger the unsaved-changes guard inside the hub.

## Slice 8 — Guards, CI, docs
- [x] 8.1 Switch `check-shared-drift.mjs` to enforce mode. Add an ESLint rule/`no-restricted-imports` pattern blocking relative imports into `packages/` and blocking new files in the old shadow folders.
  - *Done.* `--enforce` passes.
  - `NO_RELATIVE_PACKAGES` (`**/packages/*/src/**`) was added to every app block in `eslint.config.js` and `packages/eslint-config/boundaries.js`. It had to go into every app block, because a later flat-config block replaces an earlier `no-restricted-imports` for the same files.
  - A probe file was rejected as expected. New files in the shadow folders are caught by the drift check.
- [x] 8.2 Replace the stale `.github/workflows/shared.yml` with: triggers on `packages/ui|shared|supabase|config/**`, runs the drift check + `pnpm turbo build test --filter=...[HEAD^1]` (all dependents).
  - *Done.* It also triggers on `apps/*/vite.config.js` and the drift script, and runs the drift unit tests.
- [x] 8.3 CLAUDE.md rule 34.3 note (no app-local `@nidus/*` aliases; CI enforces). Update the two shadow-copy memories. `Documentation/Shared_Package_Consolidation_v1240_Guide.md` (what moved where, how to add a shared component now).
  - *Done.* Rule 34.3 now has sub-points on: no copies or aliases, `lib/` + `shared-app/`, `useAppConfig`, `@shell`.
  - The four obsolete shadow-copy memories were replaced by one v1240 layout memory.
  - Guide and blog post written (rule 22): `Documentation/Shared_Package_Consolidation_v1240_Guide.md`, `Documentation/Shared_Package_Consolidation_v1240_Blog_Post.md`.
- [x] 8.4 Final regression against the Slice 0 baseline; record the results in the review section.
  - *Done 2026-10-11.* See Review below.
  - **Running.** The final snapshot (`5d99fab`, worktree `E:\nidus-v1240`) is being compared with the clean `baseline2` rerun.
  - **Why `baseline2`:** the first baseline's result files were overwritten mid-session by orphaned child processes of a stopped run that read the half-edited main tree.

## Risks

| Risk | Mitigation |
|---|---|
| A merged file breaks Simulator-only behaviour | Parameterised tests for both apps; Simulator manual smoke per slice |
| Two React context instances during the context slice | Alias removal and copy deletion in one commit (6.2) |
| A module build breaks after alias removal | Every slice builds all 24 modules before merge |
| Large diff hard to review | One group per slice; mechanical copies separated from merges within each slice |

## Review (filled in after implementation)

**Status: complete except owner checks** (7.2 runtime federation check in a browser, plus the manual smoke tests listed below).

### Final regression (snapshot `5d99fab` vs clean baseline `633d34e`, both in isolated worktrees)

| Suite | Baseline passed / total | After v1240 passed / total |
|---|---|---|
| apps/platform | 2,000 / 2,146 | 1,538 / 1,671 |
| apps/simulator | 1,744 / 1,858 | 1,296 / 1,396 |
| packages/ui | 146 / 146 | 167 / 167 (+12 restored, see below) |
| packages/shared | 625 / 625 | 898 / 904 (+4 restored) |
| packages/config | 96 / 96 | 115 / 115 |

The app totals fall because their tests moved into the packages with the code. Classification of every test that passed in the baseline:

- **Now failing: 0.**
- **Moved and passing in a package: 985.**
- **Not matched: 29.** All were explained and resolved:
  - `authErrorMessage.test.js` (4 per app) sat directly in `utils/`, not `utils/__tests__`, and was deleted with the folder. **Restored** to `packages/shared/src/utils/__tests__/`: 4/4.
  - The Simulator's `SignatureCaptureControl.test.jsx` (12, its Simulator-mode cases) was not moved; only Platform's was. **Restored** as `packages/ui/src/__tests__/SignatureCaptureControl.simulator.test.jsx`: 12/12.
  - `entityUrlUtils` app tests (4 per app) tested the old per-entity resolver and are replaced by the package's v882 registry tests (decision in Slice 3).
  - One `pmoMenuHierarchyUtils` case was ported to `v1240PortedConfig.test.js` (different file name).
- The 6 remaining `packages/shared` failures all failed in the baseline's app runs too: `checkpointReportExport` ×4, `ianaTimezoneOptions`, `queryRouter`.
- The app suites' remaining failures are the baseline's pre-existing ones.

**Builds:** 30/30 build tasks pass. The baseline failed 3: `platform-app`, `simulator-app`, `pmo-module`.

### Found and fixed during verification (not anticipated in the plan)

- **Tailwind scanning.** Tailwind v4 only scans the app folder, so classes used only in `packages/*` would be silently missing from the CSS. Proved with a probe class, then fixed with `@source` for `packages/ui/src`, `packages/shared/src` and `packages/modules/*/src` in both apps' `index.css`. The probe now passes in both apps. Nothing was visibly broken yet, because every shared class also appeared in app code.
- **Rewrite script and imports.**
  - The rewrite script initially missed bare side-effect imports (`import './utils/x'`), which broke the Platform build. Fixed and rerun.
  - Imports a moved test makes of its own old neighbours (`../SignatureCaptureControl`) silently stopped matching; one such mock was fixed.
- **Process.** The first baseline's result files were overwritten by orphaned child processes of a stopped run. The baseline was redone as `baseline2` in a clean worktree.

### Owner checks still needed

1. Federation runtime: start `planning-hub` on 5201, then the Platform shell with `VITE_FEDERATION_ENABLED=true`. Toggle the theme and trigger the unsaved-changes guard inside `/pm/planning`.
2. Manual smoke in both apps, light and dark:
   - Platform, PM and PMO sidebars (PMO sidebar: Dashboard at the top, no "Executive Overview" wrapper);
   - a list page with the card/table toggle;
   - a create form (unsaved-changes guard, success modal);
   - an export menu;
   - a Checkpoint Report link.
3. Remove the leftover worktree folders `E:\nidus-slice3`, `E:\nidus-baseline` and `E:\nidus-v1240`. The tool's safety check blocks me from deleting them. Run `git worktree prune` afterwards.

### Follow-up gaps recorded (not v1240 scope)

- `AuthorisationRequestModal` v752 pending-changes panel: no caller passes `pending`.
- `useMenu` / `useSimMenu` remain per-app because they depend on app services. Unifying them needs services in packages.
- `pmo-module/index.html` and `docs/README.md` had been deleted by `94552fa`; both were restored. That commit deleted nothing else (checked).
