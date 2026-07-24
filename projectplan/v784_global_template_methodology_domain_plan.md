# v784 — Global Template methodology + Project-tier domain (monorepo schema/sync)

**Companion Admin plan:** `project-nidus-admin/projectplans/v188_global_templates_level_first_menu_plan.md`
**Companion Admin SQL:** `project-nidus-admin/SQL/v185_project_template_domain_methodology.sql`

## Why

Admin's Global Template Library needs to show templates organised as **Level (Portfolio/Programme/Project) → Methodology (PMBOK/Structured/Agile)**, per the sidebar redesign agreed with the user. Two schema gaps block this:

1. **No `project_template` domain.** `public.pm_template_nodes` / `sim.pm_template_nodes` / their entity-assignment tables and `sync_global_template_node` only allow `portfolio_template` / `programme_template` (added in v783) — not `project_template`. The `tier` column on `pm_template_nodes` already supports `'project'` (from v764), so this is additive, not a new concept.
2. **No `methodology` column, and the sync function ignores tier entirely.** `public._sync_global_template_node_for_account` (v765_global_template_sync_rpc.sql:78-108) hardcodes `tier => 'pmo'` for every domain it writes, regardless of whether the source domain is `portfolio_template`/`programme_template`. That means today's Portfolio/Programme template publishes already land in the tree at the wrong tier. This plan fixes that as part of adding `project_template`, since the whole point of the new domain is correct tier placement.

Methodology (PMBOK/Structured/Agile) is a new orthogonal classification — it must NOT reuse the existing `category` column, which already means different things per domain (phase name for `form_template`/`process_template`, a free-text tag like `"strategic"` for `portfolio_template`/`programme_template`). Overloading `category` would collide with that and perpetuate the current inconsistency where "Agile" is jammed into the same category list as PMBOK's five process groups (`defaultAdminNav.js:277-282`).

## Scope

### `SQL/v785_project_template_domain_and_methodology.sql`
- [x] Add `methodology TEXT NULL` to `public.pm_template_nodes` and `sim.pm_template_nodes`, with `CHECK (methodology IS NULL OR methodology IN ('pmbok', 'structured', 'agile'))`.
- [x] Extend `chk_pm_template_nodes_domain` (public + sim) and `chk_pm_template_entity_assignment_domain` (public + sim, where the table exists) to add `'project_template'` to the allowed list (alongside the existing v783 set).
- [x] Fix `public._sync_global_template_node_for_account`: replace the hardcoded `tier => 'pmo'` with a domain→tier map:
  - `portfolio_template` → `'portfolio'`
  - `programme_template` → `'programme'`
  - `project_template` → `'project'`
  - everything else (fields, form_template, opa, process_template, industry_plan, legacy_document, structured_list) → `'pmo'` (unchanged — these are global reference content, not level-scoped)
  - Add a new `p_methodology TEXT` parameter, written straight to the new `methodology` column on insert/update.
- [x] Extend `public.sync_global_template_node` / `sim.sync_global_template_node` signatures to accept and thread through `p_methodology TEXT DEFAULT NULL`; add `project_template` to the domain whitelist, validated the same way as `portfolio_template`/`programme_template` (payload-only, requires `payload.template_code`, no separate catalog table).
- [x] Re-grant `EXECUTE` on the new function signatures to `service_role` (existing REVOKE/GRANT pattern from v783/v765).

### Companion seed
No monorepo-side seed file needed — Global Template Library authoring lives entirely in Admin; sample rows are seeded there (Admin `SQL/v185b_...`) and flow down through the sync RPC this migration updates. Rule 18.2 companion-seed obligation is satisfied on the Admin side.

### Platform/Simulator parity
This is a schema/function-only change applied identically to `public` and `sim` in the same migration — no Platform or Simulator page/component changes are needed, since neither app has its own Global Template authoring UI (both are read-only consumers of `pm_template_nodes` via `is_system_synced`). Parity rule 34.1 is satisfied by symmetric public/sim treatment within this one file.

## Todo
- [x] Write and apply `SQL/v785_project_template_domain_and_methodology.sql`
- [x] Manually verify: publish a portfolio_template and programme_template global template, confirm resulting `pm_template_nodes.tier` is now `'portfolio'`/`'programme'` (not `'pmo'`) for both public and sim
- [x] Confirm existing Platform/Simulator PMO tree rendering (wherever `pm_template_nodes.tier` drives display) tolerates the corrected tier values — spot check, no code change expected since `tier` was always a valid enum value, just previously mis-set
- [x] Update this plan's checklist and add a short review section once applied

## Review

### Shipped
- `SQL/v785_project_template_domain_and_methodology.sql` adds `methodology`, extends domains with `project_template`, and fixes sync tier mapping + `p_methodology` on both `public` and `sim` sync entry points.

### Verify after apply
1. Publish a Portfolio and Programme GTL row from Admin; confirm `pm_template_nodes.tier` is `portfolio` / `programme` (not `pmo`) in both schemas.
2. Publish a Project template; confirm `tier = 'project'` and `methodology` copied.
3. Spot-check Platform/Simulator PMO tree still renders (tier values were already valid; only previously mis-set).

### Companion
Admin v188 (`v185` / `v185b` / `v186` + UI) depends on this file being applied first.
