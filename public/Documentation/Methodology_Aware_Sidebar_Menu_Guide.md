# Methodology-Aware Sidebar Menu Guide (v671)

## Overview

Sidebars for Platform and Simulator now group items under three methodology tracks:

| Badge | Track | Meaning |
|-------|--------|---------|
| [S] | Structured | Predictive – Structured/Traditional (mandates, briefs, governance strategies) |
| [P] | PMBOK | Predictive – PMBOK process groups, ITTO, EEF |
| [A] | Agile | Agile & Lean tools, Scrum, Lean metrics |

Universal sections (Executive Overview, Delivery Management, Reporting, Administration, etc.) stay outside track wrappers.

## Configuration layers

1. **Organisation (accounts table)** — `default_methodology`, `allow_project_methodology_override` (SQL `v673_*`)
2. **Project** — `delivery_methodology` + `delivery_methodology_track` (SQL `v672_*`)
3. **User** — sidebar “Methodology focus” switcher (`MethodologySwitcher`, localStorage)

## SQL migrations (run in order)

1. `SQL/v671_methodology_menu_categories.sql` — `menu_items.methodology` column
2. `SQL/v671_pre_project_mandate_menu.sql` — mandate under Pre-Project Docs (if not applied)
3. `SQL/v672_projects_delivery_methodology.sql` — project track column + sim parity
4. `SQL/v673_organisations_methodology_setting.sql` — account-level defaults + RLS

## Code references

- `src/config/methodologyMenuUtils.js` — track resolution, PM role profiles, learner filter
- `src/hooks/useMenu.js` — DB fetch, PMO categorisation, track wrappers
- `src/components/ui/SidebarMethodologyHeader.jsx` — track divider UI
- `src/components/platform/OrganisationMethodologySettings.jsx` — PMO Admin → Settings tab

## PM role profiles (Phase 1)

Roles `executive`, `project_sponsor`, `project_board_member`, `project_assurance`, `quality_assurance`, `stakeholder`, and `viewer` receive a filtered PM-layout menu via pattern rules in `filterMenuByPmProfile`.

## Simulator

- `useSimMenu` applies `filterSimulatorLearnerMenu` for `simulator_user`.
- Practice project / run tables gain `delivery_methodology_track` in v672.

## Registry

`getMenuRegistryEntries()` enriches each row with `methodology` via `menuRegistryMethodology.js` for validation and SQL seeding alignment.
