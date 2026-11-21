# v1349 — Remove unreachable code from Platform and Simulator (plan)

PRD: `projectprd/v1349_dead_app_code_removal_PRD.md`. Decisions D1–D5 there (owner, 2026-11-21).

## Slices (each a vertical slice: check → delete → build → test → commit)

### Slice 0 — Prepare
- [ ] Commit + push Claude's pending v1345 work (parts 4a–4m, SQL v1521–v1543, plan list tables v1350, CLAUDE.md rule 76 / Admin rule 23, tools), excluding other sessions' files (D3). Admin repo: commit its CLAUDE.md rule 23.
- [ ] Unit tests for `scripts/find-unreachable-app-files.mjs` on a fixture folder (relative imports, `@shell/…`, rendered vs unrendered lazy entries, page rendered only by a dead file).
- [ ] Add `--fail` (exit 1 when anything is unreachable) and `--skip-dirty` (leave out files with uncommitted edits, list them).
- [ ] Baseline: run both apps' builds and test suites before any deletion; record existing failures so they are not blamed on a batch.

### Slice 1 — Simulator plan copies (the original request)
- [ ] `pages/plans/*`, unreachable `components/plans/*`, `services/projectPlanService.js`, `services/stagePlanService.js`, the dead `components/productDescription/ProductDescriptionView.jsx`; their lazy entries / route imports.
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
