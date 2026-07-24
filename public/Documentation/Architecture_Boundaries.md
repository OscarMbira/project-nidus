# Architecture Boundaries (v729 Option B)

## Overview

Project Nidus uses a **modular monolith** pattern: one repository, two independent build/deploy targets (Platform and Simulator), with explicit import boundaries.

## Domain separation

| Domain | Routes | DB schema | Pages | Services |
|--------|--------|-----------|-------|----------|
| **Platform** | `/platform/*`, `/pmo/*`, `/pm/*` | `public` via `platformDb` | `src/pages/platform-app/`, `src/pages/app/` | `src/services/` (non-sim) |
| **Simulator** | `/simulator/*` | `sim` via `simDb` | `src/pages/simulator/`, `src/pages/sim/` | `src/services/sim/` |
| **Shared** | marketing, auth, onboarding | both | `src/shared/`, `src/components/ui/` | `src/services/supabase/` |

## Import rules (enforced by ESLint)

- **Platform code** must NOT import from:
  - `pages/simulator/**`
  - `pages/sim/**`
  - `components/sim/**`
  - `services/sim/**`

- **Simulator code** must NOT import from:
  - `pages/platform-app/**`
  - `pages/app/**`
  - `components/app/**`

Run boundary checks: `npm run lint:boundaries`

## Shared code

Cross-domain UI, hooks, utils, and contexts are exposed under `src/shared/` and the `@shared` Vite alias. Canonical implementations may still live in legacy paths; `src/shared/` re-exports them for explicit boundary labelling.

## Build targets

| Script | Output |
|--------|--------|
| `npm run build:platform` | `dist/platform/` |
| `npm run build:simulator` | `dist/simulator/` |
| `npm run build:all` | both |

## CI/CD path filters

- Platform workflow: platform pages, `PlatformApp.jsx`, `platformRoutes.jsx`
- Simulator workflow: simulator pages, `SimulatorApp.jsx`, `simulatorRoutes.jsx`
- Shared workflow: `src/shared/**`, supabase clients, UI primitives — rebuilds both apps

See also: `Documentation/CI_CD_Hosting_Setup.md`, `Documentation/DB_Rollback_Guide.md`
