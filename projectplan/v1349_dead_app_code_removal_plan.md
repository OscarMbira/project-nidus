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
- [ ] Remove the unused entries from `lazyImports.js` (statement-aware: some span several lines). First pass removed 317 of 336 (the other 19 use another format — next pass). Only these hunks are committed; the file also holds another session's edits. Names stay harmlessly `undefined` in `routeCommon.jsx` (`import * as LP`); none is imported directly by name.
- [ ] Build + tests + commit.

### Slice 2…n — Simulator, folder by folder (largest first)
Order: `services` (≈303) · `components/structured` (≈103) · `pages/platform-app` (≈85) · `pages` root (≈70) · `components/cms` · `components/app` · `components/issues` · `services/sim` · `pages/pmo` · `components/brief` · `pages/simulator` · `components/risks` · remaining folders.
- [ ] One commit per folder batch; re-run the check before each (deleting one batch can make others unreachable).

### Slice n+1… — Platform, folder by folder
Order: `pages/simulator` (≈178) · `services` (≈99) · `services/sim` (≈53) · `components/cms` · `pages/sim` · `components/sim` · `pages/testingCentre` · `components/mandate` · remaining folders.

### Final slice — Guard + docs
- [ ] `.github/workflows/shared.yml`: run the check with `--fail` for platform, simulator, planner.
- [ ] CLAUDE.md rule: no unreachable files; copy to the other app only when it renders the copy; how to run the check.
- [ ] Check: no live Simulator file writes `public` through `platformDb` for Simulator data (list any found as findings).
- [ ] `Documentation/Dead_App_Code_Removal_v1349_Guide.md`: what was removed (counts per folder), how to run the check, the dirty-file skip list.
- [ ] Owner smoke test of both apps; review section below.

## Review

(to be completed)
