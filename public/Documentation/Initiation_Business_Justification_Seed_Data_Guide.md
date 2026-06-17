# Initiation & Business Justification — Seed Data Guide

Seed scripts populate the **Initiation & Business Justification** PMO sidebar section with realistic demo records:

| Menu item | Platform table | Seed markers |
|-----------|----------------|--------------|
| Business Case | `business_cases` (+ options, benefits, dis-benefits) | `SEED636-BC-*` |
| Project Brief | `project_briefs` (+ SMART objectives) | `SEED636-PB-*` |
| Benefits Review Plan | `benefits_review_plans` (+ resources, revisions) | `SEED636-BRP-*` |

Simulator parity uses **`SEED637`** markers (`document_content` on briefs/cases; `SEED637-BRP-*` plan titles on review plans).

## Prerequisites

1. Core migrations applied: `v260_business_case_tables.sql`, `v163_project_brief_tables.sql`, `v186_benefits_review_plan_tables.sql` (+ RLS scripts).
2. At least one row in `public.users` and **one active project** (two or more projects recommended so multiple briefs can be seeded — each project allows only one brief).
3. Optional: a programme row improves programme-level business case linkage.
4. Simulator: `v229_sim_briefs_business_case.sql`, `v238_sim_benefits_products.sql`, and at least one `sim.practice_projects` row.

## Run order

```sql
-- Platform (Supabase SQL editor or psql)
\i SQL/v636_initiation_business_justification_seed_data.sql

-- Simulator parity
\i SQL/v637_sim_initiation_business_justification_seed_data.sql
```

Scripts are **idempotent**: existing seed rows are deleted and re-inserted on each run.

## What gets seeded (Platform)

### Business Cases (3)

| Reference | Status | Scope |
|-----------|--------|-------|
| `SEED636-BC-001` | draft | Programme-level digital modernisation |
| `SEED636-BC-002` | submitted | Linked to first project — customer portal |
| `SEED636-BC-003` | approved | Linked to second project — data warehouse |

Includes options comparison on BC-001, benefits and dis-benefits on BC-003.

### Project Briefs (1–2)

| Reference | Status | Notes |
|-----------|--------|-------|
| `SEED636-PB-001` | draft | First project; includes SMART objectives |
| `SEED636-PB-002` | under_review | Second project (skipped if only one project exists) |

### Benefits Review Plans (2)

| Reference | Status | Linked to |
|-----------|--------|-----------|
| `SEED636-BRP-001` | draft | BC-002 / first project |
| `SEED636-BRP-002` | approved | BC-003; includes revision history and resources |

## Verify in the UI

- **Business Case:** `/pmo/initiation/business-case`
- **Project Brief:** `/pmo/initiation/project-brief`
- **Benefits Review Plan:** `/pmo/initiation/benefits-review-plan`

Filter or search by `SEED636` references if the list is long.

## Troubleshooting

| Issue | Cause / fix |
|-------|-------------|
| Notice: skip initiation seed | No `public.users` row — create a user first |
| Only 1 project brief seeded | `project_briefs.project_id` is UNIQUE; add another project |
| RLS hides rows | Ensure your login user is PMO admin or a member of the seeded projects |
| Sim seed skipped | No `sim.practice_projects` or `auth.users` — complete simulator onboarding first |

## Removing seed data

Re-run the scripts (they delete by marker first), or manually:

```sql
DELETE FROM public.business_cases WHERE case_reference LIKE 'SEED636-%';
DELETE FROM public.project_briefs WHERE brief_reference LIKE 'SEED636-PB-%';
DELETE FROM public.benefits_review_plans WHERE document_ref LIKE 'SEED636-BRP-%';
```

Child rows cascade or are removed by the seed script’s pre-delete block.
