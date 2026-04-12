# v350 — Agile Feature Gaps (User Guide)

**Applies to:** Platform (`/platform/projects/...`) and Simulator (`/simulator/practice-projects/...`) where noted.

## Scrum

- **Sprint metrics** — `/projects/:projectId/scrum/metrics`: velocity trend, sprint comparison table, burndown/burnup for selected sprint, sprint forecast (last N completed sprints).
- **Sprint board** — burnup appears next to burndown on the sprint board.
- **Story map** — `/projects/:projectId/scrum/story-map`: journey / activity / story nodes (`story_map_items`).
- **DoD / DoR templates** — `/projects/:projectId/scrum/templates`: `project_agile_templates` (`dod` | `dor`).

## Release planning

- **Releases** — `/projects/:projectId/scrum/releases` and detail `/scrum/releases/:releaseId`.
- **Roadmap** — `/projects/:projectId/scrum/roadmap`.

## Kanban

- **Metrics** — `/projects/:projectId/kanban/metrics`: CFD, control chart, plus tabs for lead/cycle histograms, throughput, flow efficiency.
- **Classes of service** — configured on each board (`KanbanBoard`): `kanban_classes_of_service`; cards may reference `class_of_service_id` when the column is present in the database.

## XP

- **XP dashboard** — `/projects/:projectId/xp/dashboard`: pair sessions, code reviews, CI builds, TDD toggles on `user_stories.tdd_followed`.

## Lean

- **Value stream map** — `/projects/:projectId/lean/value-stream-map`.
- **Kaizen** — `/projects/:projectId/lean/kaizen`.
- **Lean metrics** — `/projects/:projectId/lean/metrics`.

## Scrum of Scrums

- **Page** — `/projects/:projectId/scrum/scrum-of-scrums`: meetings and per-team updates.

## Agile metrics hub

- **Hub** — `/projects/:projectId/agile/metrics`: quick links and forecast snapshot.

## Database

- Platform migrations: `SQL/v433_*.sql` through `SQL/v437_agile_feature_gaps_menu_items.sql` (sequenced after financial scripts that used v423–v432).
- Optional **seed data** (dev/demo): `SQL/v438_agile_feature_gaps_seed_data.sql` — idempotent; tags rows with `AGILE-SEED-v438` / `SEED v438`; inserts DoD/DoR only if template slots are empty (does not overwrite existing templates).
- Run in order on Supabase (PostgreSQL 15+).

## Simulator parity

- Practice-scoped tables live in `sim` schema (see `v436_sim_agile_gap_tables.sql`).
- Sprint metrics in the simulator UI explain platform-only sprint history until `sim` sprint tables exist.
