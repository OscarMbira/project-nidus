# Starting Individual Platform Modules

Run these from the **monorepo root** (`E:\project-nidus`), not from this folder — `turbo` resolves
workspace packages from the root.

`pnpm run dev` starts only the two app shells (`platform-app` + `simulator-app`), no modules.
`pnpm run dev:all` starts everything (both apps + every module, `--concurrency=30`).

To start **any single Platform module** (or a custom combo) instead, use `turbo dev --filter=<package-name>`,
always paired with `@nidus/platform-app` (the shell that hosts these modules via Module Federation).

> Run `node scripts/free-dev-ports.mjs` first if ports are stuck from a previous run
> (that's what `pnpm run dev` / `dev:all` do automatically before starting).

## Shell (always needed as the host)

```bash
pnpm exec turbo dev --filter=@nidus/platform-app
```
Port: **5173**

## Platform modules

Source of truth: `packages/modules/registry.js` (`PLATFORM_MODULES`).

| Module | Folder | Port | Command |
|---|---|---|---|
| Planning Hub | planning-hub | 5201 | `pnpm exec turbo dev --filter=@nidus/platform-app --filter=@nidus/planning-hub` |
| Risk | risk-module | 5202 | `pnpm exec turbo dev --filter=@nidus/platform-app --filter=@nidus/risk-module` |
| Quality | quality-module | 5203 | `pnpm exec turbo dev --filter=@nidus/platform-app --filter=@nidus/quality-module` |
| Financial | financial-module | 5204 | `pnpm exec turbo dev --filter=@nidus/platform-app --filter=@nidus/financial-module` |
| Change | change-module | 5205 | `pnpm exec turbo dev --filter=@nidus/platform-app --filter=@nidus/change-module` |
| Stakeholder | stakeholder-module | 5206 | `pnpm exec turbo dev --filter=@nidus/platform-app --filter=@nidus/stakeholder-module` |
| Delays | delays-module | 5207 | `pnpm exec turbo dev --filter=@nidus/platform-app --filter=@nidus/delays-module` |
| Stage Gates | stage-gates-module | 5208 | `pnpm exec turbo dev --filter=@nidus/platform-app --filter=@nidus/stage-gates-module` |
| PMO | pmo-module | 5209 | `pnpm exec turbo dev --filter=@nidus/platform-app --filter=@nidus/pmo-module` |
| Portfolio | portfolio-module | 5210 | `pnpm exec turbo dev --filter=@nidus/platform-app --filter=@nidus/portfolio-module` |
| Programme | programme-module | 5211 | `pnpm exec turbo dev --filter=@nidus/platform-app --filter=@nidus/programme-module` |
| Benefits | benefits-module | 5212 | `pnpm exec turbo dev --filter=@nidus/platform-app --filter=@nidus/benefits-module` |
| Issues | issues-module | 5213 | `pnpm exec turbo dev --filter=@nidus/platform-app --filter=@nidus/issues-module` |
| Communications | communications-module | 5214 | `pnpm exec turbo dev --filter=@nidus/platform-app --filter=@nidus/communications-module` |
| Reports | reports-module | 5215 | `pnpm exec turbo dev --filter=@nidus/platform-app --filter=@nidus/reports-module` |
| Admin | admin-module | 5216 | `pnpm exec turbo dev --filter=@nidus/platform-app --filter=@nidus/admin-module` |

## Multiple modules at once

Chain `--filter` flags, e.g. shell + Risk + Financial:

```bash
pnpm exec turbo dev --filter=@nidus/platform-app --filter=@nidus/risk-module --filter=@nidus/financial-module
```

## Notes

- Module → port → package-name mapping is defined once in `packages/modules/registry.js` (`PLATFORM_MODULES`) — this file mirrors it for copy-paste convenience.
- New modules are scaffolded with `pnpm run new-module -- <folder-name> <federation_name> <port>` (see `scripts/new-module.js`), which reads defaults from `registry.js`.
- If you add or remove a Platform module, update `registry.js` first, then this file (see root `CLAUDE.md` rule on keeping `DEV_MODULES.md` files in sync).
- The Simulator equivalent of this file is at `apps/simulator/DEV_MODULES.md`.
