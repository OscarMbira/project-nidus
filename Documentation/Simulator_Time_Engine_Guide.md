# Simulator Time Engine Guide (v734)

## Overview

The turn-based time compression engine lets users complete multi-month or multi-year project simulations in 2–4 hours of real time.

## Time model

- Each **turn** represents a configurable calendar period (weekly, monthly, or quarterly).
- A run has a fixed number of turns based on role profile or scenario template.
- Each turn follows: **Review → Decide → Advance**.

## Database tables

| Table | Purpose |
|-------|---------|
| `sim.simulation_turns` | Turn calendar, status, decisions, metrics snapshot |
| `sim.turn_events` | Injected events requiring user decisions |
| `sim.turn_metrics` | KPI time-series per turn |

## Services

- `turnEngineService.js` — initialise, advance, skip, history
- `turnEventService.js` — event load, decision submit, generation
- `turnMetricsService.js` — KPI calculation and health score
- `eventGeneratorService.js` — archetypes, probability, cascading consequences

## UI routes

- `/simulator/run/:runId/turns` — main gameplay (`SimulationTurnView`)
- `/simulator/runs/:runId/complete` — debrief (`SimulationComplete`)

## Role defaults

See `ROLE_TIME_PROFILES` in `@nidus/shared/constants/simulatorRoles`.

## Save & resume

Turn status is persisted in `sim.simulation_turns.status`. Users can exit mid-run and resume on the current `review` or `deciding` turn.
