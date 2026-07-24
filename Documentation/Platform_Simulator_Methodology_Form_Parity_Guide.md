# Platform / Simulator — Structured & Agile form template parity (v786)

**Plan:** `projectplan/v786_platform_sim_methodology_form_seed_parity_plan.md`  
**Admin companions:** Admin `v189` (Structured) + `v191` (Agile) Global Template Library seeds  
**SQL seed:** `SQL/v786_structured_agile_form_template_seeds.sql`  
**Generator:** `scripts/generate-v786-platform-sim-form-seeds.js` (reads Admin `SQL/v189*` / `v191*` form payloads)

## What changed

| Layer | Change |
|---|---|
| **Seed** | 42 `FS-*` / `FA-*` form templates upserted into **`public` and `sim`** `form_templates` + new current `form_template_versions.schema` (full field catalogs). Process masters: **`SQL/v787_…`** (12 Structured/Agile strategy & approach docs). |
| **Filters** | `FormTemplateAdmin` maps Structured + Agile ceremony `?group=` values to `process_group` (Platform + Simulator) |
| **Menus** | PMO / PM form sidebars list Starting Up…Release ceremonies (not a single “Agile” bucket only) |
| **Builder** | `PROCESS_GROUPS` includes ceremony values for authoring |

## Apply order

1. Apply Admin GTL seeds if not already (`v189*`–`v191*`) — optional for Platform if using v786/v787 only.
2. Apply monorepo **`SQL/v786_structured_agile_form_template_seeds.sql`** (forms).
3. Apply monorepo **`SQL/v787_structured_agile_process_template_seeds.sql`** (process masters — Structured strategies + Agile approaches).
4. Refresh Platform (5173) / Simulator (5174); open **PMO → Forms → Backlog** or **Starting Up**, and Process Template browse for strategy/DoD masters.

## Regenerate seeds

When Admin regenerates v189/v191 SQL:

```bash
node scripts/generate-v786-platform-sim-form-seeds.js
node scripts/generate-v787-platform-sim-process-seeds.js
```

Requires `E:\project-nidus-admin\SQL` (or set `ADMIN_SQL_DIR`).

## Note on publish sync

Admin **Publish** still syncs GTL → `form_templates` via `sync_global_template_node`. v786 seeds make environments at-par **without** requiring every GTL row to be published first. Re-publish from Admin remains the long-term source of truth for org-specific edits.
