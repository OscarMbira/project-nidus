# Module Federation — Local Development Guide (v731)

## Overview

Platform and Simulator shells load domain modules at runtime via Module Federation.
Each module under `packages/modules/<name>/` builds independently and exposes `remoteEntry.js`.

## Quick start

```bash
# Default dev — platform + simulator shells only (ports 5173, 5174)
pnpm dev

# Platform shell only
pnpm dev:platform

# All federated modules + shells (requires concurrency headroom)
pnpm dev:all
```

Set in `.env.development.local`:

```env
VITE_FEDERATION_ENABLED=true
VITE_MODULE_PLANNING_HUB_URL=http://localhost:5201
```

## Port registry

| App / Module | Port |
|--------------|------|
| Platform shell | 5173 |
| Simulator shell | 5174 |
| planning-hub | 5201 |
| risk-module | 5202 |
| quality-module | 5203 |
| financial-module | 5204 |
| change-module | 5205 |
| stakeholder-module | 5206 |
| delays-module | 5207 |
| stage-gates-module | 5208 |
| pmo-module | 5209 |
| portfolio-module | 5210 |
| programme-module | 5211 |
| benefits-module | 5212 |
| issues-module | 5213 |
| communications-module | 5214 |
| reports-module | 5215 |
| admin-module | 5216 |
| sim-planning-module | 5301 |
| sim-risk-module | 5302 |
| sim-quality-module | 5303 |
| sim-pmo-module | 5304 |
| sim-scenarios-module | 5305 |
| sim-leaderboard-module | 5306 |
| sim-admin-module | 5307 |

## Create a new module

```bash
pnpm new-module my-module-name
```

See `packages/modules/ModuleContract.md` for the interface contract.

## Build a single module

```bash
pnpm turbo build --filter=@nidus/planning-hub
```

## Health checks

Each module serves `GET /health.json` and `GET /modules/<folder>/health` in dev.
Production CDN: `https://cdn.nidus.com/modules/<folder>/v<semver>/health.json`

## Scaffold all modules

```bash
pnpm scaffold:modules
```
