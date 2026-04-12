# ITTO Management — User Guide (v352)

**Date:** 2026-04-11  

## Overview

ITTO (Inputs, Tools & Techniques, Outputs) management lets the PMO maintain **organisation templates** and lets project teams create **project-specific ITTO instances** (from a template or standalone). Data is stored in PostgreSQL (`public.itto_templates`, `public.project_ittos`) and mirrored in the Simulator (`sim.itto_templates`, `sim.project_ittos`).

## Roles (summary)

| Area | Who |
|------|-----|
| Template CRUD | PMO Admin / System Admin (routes under `/pmo/itto/*`) |
| Template read + copy | PM, programme/portfolio managers, team leads/managers (also `/pm/itto/templates`, `/platform/itto/templates`) |
| Project ITTO CRUD | Project manager and team lead/manager roles on the project (RLS enforced) |
| Read-only | Assurance, QA, team members, stakeholders |

## Routes (Platform)

| Route | Purpose |
|-------|---------|
| `/pmo/itto/templates` | Manage org templates |
| `/pmo/itto/drafts` | Draft queue (your on-hold records) |
| `/pm/itto/templates` | Read/copy templates |
| `/pm/itto/project` | Project ITTOs |
| `/pm/itto/drafts` | Drafts |
| `/platform/itto/templates` | Templates (permission-gated) |
| `/platform/itto/project` | Project ITTOs |
| `/platform/itto/drafts` | Drafts |

## Routes (Simulator)

| Route | Purpose |
|-------|---------|
| `/simulator/pmo/itto/templates` | PMO sim — templates |
| `/simulator/pmo/itto/drafts` | Drafts |
| `/simulator/pm/itto/templates` | PM sim — templates |
| `/simulator/pm/itto/project` | Project ITTOs |
| `/simulator/pm/itto/drafts` | Drafts |
| `/simulator/itto/templates` | General sim menu |
| `/simulator/itto/project` | Project ITTOs |
| `/simulator/itto/drafts` | Drafts |

## Database migrations

Apply in order:

1. `SQL/v439_itto_templates.sql`
2. `SQL/v440_project_ittos.sql`
3. `SQL/v441_sim_itto_tables.sql`
4. `SQL/v442_itto_menu_items.sql` (permissions + menu)
5. `SQL/v443_itto_seed_templates.sql` (optional seed templates per organisation)

## Support

For technical behaviour (RLS, JSON field shapes), see `projectplan/v352_ITTO_Management_Plan.md`.
