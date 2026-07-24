# Starting Individual Simulator Modules

Run these from the **monorepo root** (`E:\project-nidus`), not from this folder — `turbo` resolves
workspace packages from the root.

`pnpm run dev` starts only the two app shells (`platform-app` + `simulator-app`), no modules.
`pnpm run dev:all` starts everything (both apps + every module, `--concurrency=30`).

To start **any single Simulator module** (or a custom combo) instead, use `turbo dev --filter=<package-name>`,
always paired with `@nidus/simulator-app` (the shell that hosts these modules via Module Federation).

> Run `node scripts/free-dev-ports.mjs` first if ports are stuck from a previous run
> (that's what `pnpm run dev` / `dev:all` do automatically before starting).

## Shell (always needed as the host)

```bash
pnpm exec turbo dev --filter=@nidus/simulator-app
```
Port: **5174**

## Simulator modules

Source of truth: `packages/modules/registry.js` (`SIMULATOR_MODULES`).

| Module | Folder | Port | Command |
|---|---|---|---|
| Sim Planning | sim-planning-module | 5301 | `pnpm exec turbo dev --filter=@nidus/simulator-app --filter=@nidus/sim-planning-module` |
| Sim Risk | sim-risk-module | 5302 | `pnpm exec turbo dev --filter=@nidus/simulator-app --filter=@nidus/sim-risk-module` |
| Sim Quality | sim-quality-module | 5303 | `pnpm exec turbo dev --filter=@nidus/simulator-app --filter=@nidus/sim-quality-module` |
| Sim PMO | sim-pmo-module | 5304 | `pnpm exec turbo dev --filter=@nidus/simulator-app --filter=@nidus/sim-pmo-module` |
| Sim Scenarios | sim-scenarios-module | 5305 | `pnpm exec turbo dev --filter=@nidus/simulator-app --filter=@nidus/sim-scenarios-module` |
| Sim Leaderboard | sim-leaderboard-module | 5306 | `pnpm exec turbo dev --filter=@nidus/simulator-app --filter=@nidus/sim-leaderboard-module` |
| Sim Admin | sim-admin-module | 5307 | `pnpm exec turbo dev --filter=@nidus/simulator-app --filter=@nidus/sim-admin-module` |

## Multiple modules at once

Chain `--filter` flags, e.g. shell + Sim Risk + Sim PMO:

```bash
pnpm exec turbo dev --filter=@nidus/simulator-app --filter=@nidus/sim-risk-module --filter=@nidus/sim-pmo-module
```

## Notes

- Module → port → package-name mapping is defined once in `packages/modules/registry.js` (`SIMULATOR_MODULES`) — this file mirrors it for copy-paste convenience.
- New modules are scaffolded with `pnpm run new-module -- <folder-name> <federation_name> <port>` (see `scripts/new-module.js`), which reads defaults from `registry.js`.
- If you add or remove a Simulator module, update `registry.js` first, then this file (see root `CLAUDE.md` rule on keeping `DEV_MODULES.md` files in sync).
- The Platform equivalent of this file is at `apps/platform/DEV_MODULES.md`.
