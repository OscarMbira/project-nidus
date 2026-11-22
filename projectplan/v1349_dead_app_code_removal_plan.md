# v1349 — Remove unreachable code from Platform and Simulator (plan)

PRD: `projectprd/v1349_dead_app_code_removal_PRD.md`. Decisions D1–D5 there (owner, 2026-11-21).

## Slices (each a vertical slice: check → delete → build → test → commit)

### Slice 0 — Prepare
- [x] Commit + push Claude's pending v1345 work (parts 4a–4m, SQL v1521–v1543, plan list tables v1350, CLAUDE.md rule 76 / Admin rule 23, tools), excluding other sessions' files (D3). Admin repo: commit its CLAUDE.md rule 23. — 2026-11-21: monorepo `471be537` (634 files; CLAUDE.md staged hunk-by-hunk), Admin `70f8d18` (rule 23 hunk only). Left out as other sessions' work (14 files carrying both): `BusinessCaseForm` ×2, `HelpButton` ×2, `RecordCustomFields.test`, `GovernanceStructurePage`, `ProjectMandateView` ×2, `TeamCharterEditPage` ×2, Simulator `BenefitsReviewPlanForm` / `PIDForm` / `ProjectMandateCreate`, `briefExportSections.js`; also `FieldLabelWithHelp.jsx` + its test (another session's changes; Claude's added test rides with theirs).
- [x] Unit tests for `scripts/find-unreachable-app-files.mjs` on a fixture folder (relative imports, `@shell/…`, rendered vs unrendered lazy entries, page rendered only by a dead file) — 5 pass (`node --test scripts/__tests__/find-unreachable-app-files.test.mjs`).
- [x] Add `--fail` (exit 1 when anything is unreachable) and `--skip-dirty` (leave out files with uncommitted edits, list them).
- [x] Baseline: run both apps' builds and test suites before any deletion; record existing failures so they are not blamed on a batch. — 2026-11-21:
  - **Builds:** both failed at first because of other sessions' unfinished edits; fixed by owner choice ("Fix the two breakages"): `apps/platform/src/pages/brief/ProjectBriefView.jsx` (a `useLdeExportParts({…})` call written with literal `\n` text) and `apps/simulator/src/routes/routeCommon.jsx` (missing `HelpArticlePage` and `PracticePIDEdit` in its import / export lists). Both apps now build.
  - **Tests (already failing before any deletion):** Simulator 59 of 285 test files (121 of 1,379 tests); Platform 61 of 347 files (158 of 1,669 tests) — mostly integration tests that need a live database and slow-machine timeouts. **Batch rule:** a batch passes when the app builds and no test file fails that was not already in this baseline.

### Slice 1 — Simulator plan copies (the original request)
- [x] `pages/plans/*`, unreachable `components/plans/*`, `services/projectPlanService.js`, `services/stagePlanService.js`, the dead `components/productDescription/ProductDescriptionView.jsx`; their lazy entries / route imports. — 35 files + 3 lazy entries in `lazyImports.js` (only that hunk committed; the file also holds another session's edits). The now-unused names in `routeCommon.jsx` / `simulatorRoutes.jsx` (`PlansDashboard`, `ProjectPlanCreate/Edit/ViewPage`, `StagePlanCreate/Edit/ViewPage`) resolve to `undefined` through `import * as LP` and are tidied in the final slice, once those files are committed.
- [x] Build + tests + commit. — Simulator builds; tests identical to baseline (59 failing files before and after). Commit `e89154c8`, pushed 2026-11-22.

### Slice 1b — Unused lazy entries first (learned 2026-11-22)
The first services batch (365 files) broke the build: Vite compiles **every** `lazy(() => import(…))` entry in `lazyImports.js` whether or not a route renders it, so a dead page kept alive by an unused entry still needs its imports. ~840 dead Simulator files were compiled only for that reason. The script gained `--bundle` (what the bundler compiles) and `--unused-lazy` (lazy entries no reachable file renders). Order is now: remove unused lazy entries → then folder batches are safe.
- [x] Remove the unused entries from `lazyImports.js` (statement-aware: some span several lines). 317 + 19 (space-padded) = 336 removed. Only these hunks are committed; the file also holds another session's edits. Names stay harmlessly `undefined` in `routeCommon.jsx` (`import * as LP`); none is imported directly by name.
- [x] Build + tests + commit. — `5f3659d4`, `3ec92178`.

### Slice 2…n — Simulator, folder by folder — DONE 2026-11-22
Batch = unreachable (render) ∩ not compiled (`--bundle`) ∩ no uncommitted edits, plus tests whose subject is dead (runner: build + full Vitest, compare failing test files with the baseline).

| Commit | Batch | Files | Failing test files after (baseline 59) |
|---|---|---|---|
| `057e38a0` | `services/*` + 60 tests + 3 dead workflow tests (`registrationFlow` drops its `paynowService` mock) | 362 | 33 (26 dead-code tests went) |
| `a7c16943` | `pages/**` + 6 tests | 417 | 33 |
| `12708bd8` | `components/**` + 16 tests (first try broke: import case `AppToPlatformRedirect` vs file `AppToplatformRedirect.jsx` → script now case-insensitive, test added) | 755 | 22 |
| `9a75afaa` | config, features, lib, services/sim, services/dual, services/communications, shared barrels, `moduleConfig.js` + 9 tests | 93 | 20 |

**Simulator result:** 2,732 → 1,164 source files; unreachable 1,600 → 31: 25 with other sessions' uncommitted edits (listed by `--skip-dirty`), 5 kept compiled by an unused lazy entry in `components/AppLayout.js` (`Layout`, `MobileNavigation`, `FeedbackWidget`, `feedbackService`, `helpService`), and `vite-env.d.ts` (kept on purpose — editor type hints, not code).

### (original order, superseded) Simulator, folder by folder (largest first)
Order: `services` (≈303) · `components/structured` (≈103) · `pages/platform-app` (≈85) · `pages` root (≈70) · `components/cms` · `components/app` · `components/issues` · `services/sim` · `pages/pmo` · `components/brief` · `pages/simulator` · `components/risks` · remaining folders.
- [ ] One commit per folder batch; re-run the check before each (deleting one batch can make others unreachable).

### Slice n+1… — Platform — DONE 2026-11-22

| Commit | Batch | Files | Failing test files after (baseline 61) |
|---|---|---|---|
| `b9171d7c` | 213 unused lazy entries in `lazyImports.js` (only these lines committed) | — | 61 |
| `a2847cc1` | `pages/**` (mostly `pages/simulator`, `pages/sim`) + 3 tests | 286 | 61 |
| `2d773abb` | `components/**` (mostly `components/sim`, cms, mandate, app, structured, forms …) + 8 tests | 284 | 54 |
| `fd1139e1` | services (incl. `services/sim`), configs, federation stubs, `PlatformApp.jsx`, `platform-main.jsx`, shared barrels + 20 tests; `testEnvironmentService.register.test.js` drops the case for the deleted Platform copy of `practiceTestEnvironmentService` | 203 | 54 |

**Platform result:** 2,884 → 2,142 source files; unreachable 804 → 0.

**Script fixes found on the way (each with a test):** imports resolve case-insensitively (`AppToPlatformRedirect` → `AppToplatformRedirect.jsx` broke one batch, caught by the build); renamed exports count (`export { AppLayout as Layout }` — the main layout was wrongly reported dead; deletion batches were never at risk because they only removed files the bundler did not compile, and the removed lazy entries were checked: none is used under another name or as a value); `.d.ts` files ignored.

### Final slice — Guard + docs — DONE 2026-11-22
- [x] CI: `.github/workflows/unreachable-code.yml` (own workflow — `shared.yml` only runs on package changes) runs the unit tests and `--fail` for platform, simulator, planner. `--fail` reads `scripts/unreachable-allowlist.json`: 24 Simulator files still holding other sessions' uncommitted edits (do not grow; stale entries are reported).
- [x] CLAUDE.md rule 78 (only that hunk committed).
- [x] Check: live Simulator files using `platformDb` — 247 files; 8 of them query core Platform tables (`projects`, `risks`, `issues`, `tasks`, `project_plans`, `stage_plans` …): `components/rfp/RFPList.jsx`, `modules/record-lifecycle/pages/LifecyclePages.jsx`, `pages/comms/DirectMessages.jsx`, `pages/comms/MeetingExtractionReview.jsx`, `pages/ProjectsEdit.jsx` (allow-listed dead), `services/budgetCategoryService.js`, `services/communications/meetingExtractionService.js`, `services/timesheetSettingsService.js`. **Finding for the owner** — some may be legitimate organisation-level reads; each needs a look under the "never write simulation data to public" rule. Not changed here (live code, out of scope).
- [x] `Documentation/Unreachable_App_Code_v1349_Guide.md`.
- [ ] Owner smoke test of both apps (click through the main pages of Platform and Simulator).
- [ ] Later, once the other sessions commit: tidy the now-unused names in `routeCommon.jsx` / `simulatorRoutes.jsx` / `platformRoutes.jsx` import lists (they resolve to `undefined`, harmless) and delete the 24 allow-listed Simulator files.

## Review (2026-11-22)

- **Removed:** Simulator 1,568 files (2,732 → 1,164), Platform 742 files (2,884 → 2,142), plus 549 unused lazy entries. 12 commits, each built and tested on its own; no test file started failing (failing test files fell: Simulator 59 → 20, Platform 61 → 54, because many were tests of the deleted code).
- **Pre-work:** two other sessions' unfinished edits stopped both apps building; fixed by owner choice (`ProjectBriefView.jsx` literal `\n`; Simulator `routeCommon.jsx` missing `HelpArticlePage`, `PracticePIDEdit`).
- **Guard:** CI workflow + allow-list + CLAUDE.md rule 78; script with 7 unit tests.
- **Effect on v1345 field help:** many Simulator "twins" wired on 2026-11-21 were in the deleted set; their `sim.*` alias rows stay in `public.field_help_aliases` (harmless — no screen asks for them). Coverage numbers now reflect only shipped screens.
- **Risks / follow-ups:** owner smoke test; the 24 allow-listed files; the 8 live Simulator files reading core Platform tables; the leftover unused names in route import lists.
