# Process Templates Seed Data Guide

**Version:** v633–v635  
**Related plan:** `projectplan/v629_Process_Group_Hub_Implementation_Plan.md`

---

## Overview

Seed scripts populate the v629 Process Templates hub with organisation-wide **master templates** (PMO catalogue) and sidebar menu entries. Masters are **not linked to any project** (`project_id` / `practice_project_id` = NULL, `is_master` = TRUE).

---

## SQL files (run in order)

| Order | File | Purpose |
|------:|------|---------|
| 1 | `SQL/v629_process_templates_new_tables.sql` | Create tables, RLS, registry |
| 2 | `SQL/v632_process_templates_nullable_project_for_masters.sql` | Allow NULL project for masters |
| 3 | `SQL/v629_process_templates_sidebar_menu.sql` | Platform PMO / PM / TM sidebar menus |
| 4 | `SQL/v633_process_templates_master_seed_data.sql` | **24 Platform master templates** + checklist items |
| 5 | `SQL/v634_sim_process_templates_master_seed_data.sql` | **24 Simulator master templates** (sim schema parity) |
| 6 | `SQL/v635_sim_process_templates_sidebar_menu.sql` | Simulator PMO / PM sidebar menus |

---

## What v633 seeds (Platform)

One **active master** per new CRUD table (24 total):

| Process group | Templates seeded |
|---------------|------------------|
| Initiating | Project Charter, Assumption Log |
| Planning | PMP, Requirements Mgmt Plan, Requirements Documentation, WBS Dictionary, Activity Attributes, Activity Resource Requirements, RBS, Activity Duration Estimates, Cost Mgmt Plan, Activity Cost Estimates, Cost Baseline, Resource Mgmt Plan, Procurement Mgmt Plan, Stakeholder Engagement Plan |
| Executing | Quality Checklists (+ 5 items), Team Performance Assessment, Make-or-Buy Decision Log |
| Monitoring & Controlling | Variance Analysis Report, EVM Status Report, Scope Acceptance Form |
| Closing | Project Closure Checklist (+ 7 items), Contract Closure Document |

**Reference codes:** `SEED633-{PREFIX}-001` (e.g. `SEED633-PCH-001`).

**Idempotent:** Re-running deletes rows where `reference_code LIKE 'SEED633-%'` and re-inserts.

**Prerequisites:** At least one `accounts` row and one row in `auth.users` (resolved via `public.users.auth_user_id` join, or directly from `auth.users`).

---

## What v634 seeds (Simulator)

Same 24 masters in `sim` schema with reference codes `SEED634-*`. Uses first `sim.practice_projects.user_id` or falls back to first platform auth user.

---

## Regenerating seed SQL

If template metadata changes, edit `scripts/generate-v633-process-templates-seed.mjs` and run:

```bash
node scripts/generate-v633-process-templates-seed.mjs
```

---

## Pre-Project / existing templates

Business Case, Benefits Realisation Plan, Project Mandate, and all **existing** hub links (37 items) are **not** seeded here — they use existing application tables and routes defined in `processTemplatesRegistry.js`.

---

## After seeding

1. Log in as PMO → `/pmo/process-templates/t/project-management-plan` — masters should list immediately (no project selector).
2. Log in as PM → copy a master into a project workspace via **Copy**.
3. Simulator → `/simulator/pmo/process-templates` — same masters from `sim` schema.
