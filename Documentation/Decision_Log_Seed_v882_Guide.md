# Decision Log sample seed (v882)

## What it does

Inserts **5 sample decisions** into `public.project_decisions` for every active `SEED334-PRJ-*` project that currently has **no** decision rows (including **SEED334-PRJ-08** Velocity Freight).

Statuses covered: approved, deferred, proposed, rejected (plus priorities low→critical via the set).

`decision_reference` is left blank so the `trg_project_decisions_ref` trigger assigns `DEC-YYYY-NNNN`.

## Apply

Run in Supabase SQL editor (order matters if the log is still empty in the UI):

1. `SQL/v884_project_decisions_rls_fix.sql` — fixes SELECT RLS so authenticated users can see seeded rows
2. `SQL/v882_seed_decision_log_seed334.sql` — seed (re-run only if v884 NOTICE reports `total=0`)

See `Documentation/Decision_Log_Empty_After_Seed_v884_Guide.md` if the page stays empty after seeding.

## How to see the rows

1. Open **Controls & Registers → Knowledge & Governance → Decision Log**
2. Select **Velocity Freight… (SEED334-PRJ-08)** (or another SEED334 project) in the **header** project selector
3. Hard-refresh — the table should list the five seeded decisions

## Idempotent

Re-running v882 skips projects that already have non-deleted decisions.
