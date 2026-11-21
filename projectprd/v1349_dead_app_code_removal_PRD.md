# v1349 — Remove unreachable code from Platform and Simulator (PRD)

## a) Problem statement

Platform and Simulator each carry large numbers of source files that their app never runs:

| App | Source files | Reachable from the app | Unreachable |
|---|---|---|---|
| Simulator (`apps/simulator/src`) | 2,732 | 1,132 | **1,600** |
| Platform (`apps/platform/src`) | 2,884 | 2,080 | **804** |
| Planner (`apps/planner/src`) | 22 | 22 | 0 |

(Measured 2026-11-21 with `scripts/find-unreachable-app-files.mjs`.)

They are mostly copies made when the two apps were split: Platform pages, components and services copied into Simulator (and Simulator pages copied into Platform) that no route renders. They cause real harm:

- **Wrong conclusions.** On 2026-11-21 Claude reported that "Simulator's plan pages write `public.project_plans`". In fact only an unmounted copy does; the live Simulator plan pages already use `sim.practice_*` tables. The dead copy looked live because `simulatorRoutes.jsx` imports it.
- **Wasted work.** Parity edits (rule 34.1), field help (rule 76) and fixes are applied to copies nobody sees. Many of the v1345 Simulator "twins" wired on 2026-11-21 are in this set.
- **Hidden schema risk.** Some dead Simulator copies call `platformDb` and would write `public` if ever mounted, breaking "never write simulation data to public".
- **Slower everything:** searches, builds, reviews and coverage checks scan ~2,400 files that do nothing.

## b) Solution

Delete every file that cannot be reached from its app's entry point, in reviewed folder batches, each one built, tested and committed on its own. Then make CI fail when an unreachable file appears, and add a CLAUDE.md rule so copies are made only when the other app actually renders them.

"Unreachable" is decided by `scripts/find-unreachable-app-files.mjs`: follow imports from `main.jsx` / `App.jsx`, plus `@shell/…` targets used by shared packages and federated modules; a lazy page entry (`export const X = lazy(…)`) counts only when a reachable file renders `<X>` (or passes `X` as a component), repeated until stable.

## c) User stories

1. As the owner, I can run one command per app and get the list of files that app never reaches.
2. As the owner, after the removal, every remaining source file in Platform, Simulator and Planner is reachable.
3. As the owner, every live page still works after each batch (the app builds and its test suite passes).
4. As the owner, any batch can be undone with one `git revert`, because each batch is its own commit.
5. As the owner, nothing with uncommitted edits is deleted: such files are skipped and listed for me.
6. As the owner, my pending v1345 work is committed and pushed before any deletion starts, without other sessions' files.
7. As a developer, unused lazy page entries are removed from each app's `lazyImports.js` and its route file imports.
8. As a developer, tests that only test deleted files are deleted with them; no test imports a deleted file.
9. As a developer, CI fails when a pull request adds a source file its app cannot reach.
10. As a developer, CLAUDE.md tells me not to copy a file to the other app unless that app renders it, and how to run the check.
11. As a developer, Simulator code reached by Simulator users no longer contains copies that write `public` through `platformDb` for Simulator data (checked after removal and listed).
12. As the owner, field-help coverage reports only count files that ship.
13. As the owner, the documentation records what was removed (counts per folder) and how to run the check.

## d) Implementation decisions (owner, 2026-11-21)

- **D1 Scope:** all unreachable code in **both** Simulator and Platform (not only the plan copies). Planner has none.
- **D2 Method:** folder batches. Per batch: re-run the check, delete the still-unreachable files and their test-only files, remove unused lazy entries and route imports, build that app, run its test suite, commit the batch on its own. The owner smoke-tests once at the end.
- **D3 Uncommitted work:** first commit and push Claude's pending v1345 work (parts 4a–4m, SQL v1521–v1543, plan list tables, rule changes), leaving other sessions' files out. During removal, skip any dead file that still has uncommitted edits and list it.
- **D4 Guard:** `--fail` mode in the check script, run for all three apps in `.github/workflows/shared.yml`; CLAUDE.md rule added.
- **D5** Deleted Simulator help keys: their `public.field_help_aliases` rows stay (harmless, a key nobody asks for). No SQL in this initiative.

## e) Testing decisions

- Seam 1 — the check itself: unit tests for the reachability rules (relative imports, `@shell/…`, rendered vs unrendered lazy entries, a page rendered only by a dead file stays dead) on a small fixture folder.
- Seam 2 — each batch: `pnpm turbo build --filter=@nidus/<app>-app` and the app's Vitest suite; failures stop the batch.
- Done = both apps report 0 unreachable files except the listed dirty skips; CI guard green; owner smoke test passes.

## f) Out of scope

- Unreachable files inside `packages/*` (shared code) and Admin (separate repo).
- Unused exports inside files that are reachable.
- Database tables that only dead code used (a later, separate decision).
- Fixing behaviour of live pages (only deletion and import clean-up).

## g) Further notes

- A file loaded by a string path (e.g. a glob import or a CMS-driven route) would show as unreachable. The batch build + tests catch missing modules; any such file found is kept and the script taught about it.
- `apps/simulator/src/routes/platformRoutes.jsx` (memory: dead route tree, v882) is expected in the Simulator list.
- Correction recorded in `projectplan/v1350_plan_list_tables_plan.md` (Simulator plans were never writing `public` through a live page).
