# Unreachable app code — v1349 guide

**What changed (2026-11-21 → 22):** Platform and Simulator carried thousands of source files their app never ran. v1349 removed them, added a check that finds them, and added CI that stops new ones (CLAUDE.md rule 78).

## Why it mattered

- **Wrong conclusions.** A copy of the Platform plan pages inside Simulator looked like it wrote Simulator data to `public`. It was never mounted; the live Simulator plan pages already used `sim.practice_*` tables.
- **Wasted work.** Parity edits, field help and fixes were being applied to copies nobody sees (on 2026-11-22, other sessions still had uncommitted edits in 24 such Simulator files).
- **Slower everything.** Searches, builds and reviews scanned ~2,400 files that did nothing.

## Result

| App | Source files before | After | Unreachable before | After |
|---|---|---|---|---|
| Simulator | 2,732 | 1,164 | 1,600 | 24 (allow-listed, see below) |
| Platform | 2,884 | 2,142 | 804 | 0 |
| Planner | 22 | 22 | 0 | 0 |

Builds pass for both apps. No test file started failing; the number of failing test files fell (Simulator 59 → 20, Platform 61 → 54) because many already-failing tests were tests of the deleted code. The remaining failures are older ones (mostly integration tests that need a live database).

## How "unreachable" is decided

`scripts/find-unreachable-app-files.mjs` starts at `main.jsx` / `App.jsx` and follows every import:

- relative imports, `@/…` and `@shell/…` (the latter also from shared packages and federated modules);
- imports resolve without regard to case, as on Windows / macOS;
- a lazy page entry (`export const X = lazy(() => import('…'))`) counts only when a reachable file renders `<X>` or passes `X` as a component — including under another name (`export { AppLayout as Layout }`);
- tests and `.d.ts` files are ignored.

**Important:** Vite compiles every lazy entry whether or not anything renders it. A dead page registered as a lazy entry therefore still needs everything it imports. Remove unused lazy entries first (`--unused-lazy`), then the dead files; `--bundle` shows what the bundler compiles.

## Commands

```bash
node scripts/find-unreachable-app-files.mjs simulator                 # summary by folder
node scripts/find-unreachable-app-files.mjs simulator --list          # every unreachable file
node scripts/find-unreachable-app-files.mjs simulator --under pages/  # one folder
node scripts/find-unreachable-app-files.mjs simulator --skip-dirty    # leave out files with uncommitted edits
node scripts/find-unreachable-app-files.mjs simulator --bundle        # what the bundler compiles
node scripts/find-unreachable-app-files.mjs simulator --unused-lazy   # lazy entries nothing renders
node scripts/find-unreachable-app-files.mjs simulator --fail          # CI: fail on new unreachable files
```

## CI and the allow-list

`.github/workflows/unreachable-code.yml` runs the unit tests and `--fail` for Platform, Simulator and Planner on every change under `apps/*/src` or `packages/**/src`.

`scripts/unreachable-allowlist.json` lists 24 Simulator files that were unreachable but still had another session's uncommitted edits (Simulator copies of the Brief, Business Case, Mandate, PID, Benefits Review Plan, Team Charter and project create/edit pages, and `lib/useLdeExportParts.js`). Those edits go to pages Simulator users never see — the live Simulator equivalents are the `Practice*` pages. **Do not add to the list.** Remove each entry when its file is deleted; the check prints entries that are no longer unreachable.

## How to avoid it in future (rule 78)

1. Before a parity edit, confirm the other app renders that file.
2. Copy a file to the other app only together with the route that renders it.
3. Add a lazy entry only with its route; remove it with the route.
4. Delete pages and components when they stop being used, with their tests.
