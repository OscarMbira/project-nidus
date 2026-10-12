# Nidus Project Planner — dev reference (v1239)

| App | Folder | Port | Start | Build |
|---|---|---|---|---|
| Project Planner (`@nidus/planner-app`) | `apps/planner` | 5176 | `pnpm turbo dev --filter=@nidus/planner-app` | `pnpm turbo build --filter=@nidus/planner-app` |

- No Module Federation: the planning screens are bundled from `packages/planning` (D17).
- `@nidus/*` resolve to `packages/*` (no alias overrides, CLAUDE.md rule 34.3).
- Env (repo root `.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PLATFORM_URL` (the "Open full PMIS" link).
- Database: run the v1239 SQL in the order listed in `projectplan/v1239_dual_mode_planning_product_plan.md`. Sign-up stays closed until Admin turns on the `planner_public_signup` flag.
- When a planner screen starts using a new table: `node scripts/generate-planner-table-allowlist.mjs --write`, then re-run `SQL/v1251_planner_table_wall.sql`.
