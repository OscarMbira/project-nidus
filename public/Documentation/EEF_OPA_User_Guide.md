# Enterprise Environment Factors (EEF) & Organisational Process Assets (OPA)

## Overview

**Org Knowledge** helps your organisation capture:

- **EEF (Enterprise Environment Factors):** External and internal conditions that influence delivery (culture, regulation, market, infrastructure).
- **OPA (Organisational Process Assets):** Templates, policies, procedures, standards, and historical knowledge.

Available on **Platform** (`/platform/...`) and **Simulator** (`/simulator/...`) with the same workflows, scoped to your organisation.

## Prerequisites

- Run SQL migrations `v400_eef_opa_tables.sql` and `v401_eef_opa_menu_seed.sql` in Supabase (order matters).
- Your user must resolve to an **organisation (account)** via account ownership or project membership (same rules as other org-scoped features).

## Navigation

- **Platform:** Sidebar **Org Knowledge** → Environment Factors, Process Assets, drafts, bulk upload, or hub at `/platform/org-knowledge`.
- **Simulator:** Menu **Org Knowledge** → matching simulator routes.

## Roles (summary)

| Capability | Typical roles |
|------------|----------------|
| Full CRUD + delete | System admin, PMO admin |
| Create / read / update (org-wide for leads) | PM, team lead |
| Create / read / update own | Team member |
| Create + read | Stakeholder |
| Read only | Viewer |

Exact enforcement uses **RLS** and **permission codes** (`eef.*`, `opa.*`).

## Single record capture

1. **Add EEF / Add OPA** — multi-step forms; you can **Save on hold** to queue drafts.
2. **Drafts** — open **EEF Drafts** / **OPA Drafts** to resume editing.

## Bulk upload

- **CSV** with header row. Required column: `title`.
- **EEF optional columns:** `eef_type`, `impact_level`, `impact_direction`, `status`, `category_code`, `description`, `source_reference`, `notes`, `is_on_hold`, `on_hold_reason`.
- **OPA optional columns:** `opa_type`, `status`, `version`, `category_code`, `description`, `document_reference`, `effective_date`, `expiry_date`, `notes`, `tags` (semicolon-separated), `is_on_hold`, `on_hold_reason`.
- `category_code` must match seeded or admin-defined category **codes** (e.g. `culture`, `templates`).

## Export

- **Lists:** Export dropdown — Excel, Word, PowerPoint (field picker), CSV, XML, JSON, Print.
- **Record view:** Export record to Excel, Word, PowerPoint, etc., via the record export menu.

## Simulator specifics

- **EEF/OPA** data lives in the **`sim`** schema.
- Optional link to **`simulation_runs`** instead of platform `projects`.

## Support

If menus do not appear, confirm `v401` ran and your role has `role_menu_items` entries. If inserts fail, verify RLS and that `organisation_id` matches an account you can access.
