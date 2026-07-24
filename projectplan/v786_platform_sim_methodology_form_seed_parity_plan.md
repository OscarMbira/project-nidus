# v786 — Platform + Simulator parity for Structured/Agile form field completeness

**Companion Admin:** `project-nidus-admin/projectplans/v189_*` + `v191_*` (GTL seeds)  
**Why:** Admin GTL now has full Structured (v189) and Agile (v191) form field catalogs. Platform/Simulator consume `form_templates` / `form_template_versions` (via publish sync or local seeds). Without monorepo seeds + menu/filter mapping, PMO Form Template galleries stay on thin F001–F068 stubs and cannot surface FS-*/FA-* ceremony forms.

## Scope

1. **Seed (rule 18.2, public + sim):** Idempotent upsert of Admin-parity form templates (`FS-*`, `FA-*`) into `public` and `sim` `form_templates` + current `form_template_versions.schema`.
2. **Filters:** Extend `FormTemplateAdmin` `GROUP_TO_PROCESS_GROUP` for Structured ceremonies + Agile ceremonies (Platform + Simulator copies).
3. **Menus:** Add ceremony leaves under PMO Forms for Structured and expand Agile beyond a single bucket (`pmoMenuConfig`, `simulatorPMOMenuConfig`, and PM dashboard form group links where the same `?group=` pattern is used).
4. **Builder process groups:** Extend `PROCESS_GROUPS` in Platform + Simulator `FormTemplateBuilder.jsx` so authors can assign ceremony groups.
5. **Docs:** Short note in `Documentation/` + this plan Review.

## Non-goals

- Re-author Admin GTL (already done).
- Process-doc masters in Platform process-template tables (optional follow-up; forms are the screenshot gap).
- Portfolio/Programme/Project level template masters.
- Drag-reorder (Admin-only authoring UI).

## Defaults

- Generator reads Admin `SQL/v189*`–`v191d*` form payloads when available under `E:\project-nidus-admin\SQL\`.
- Agile ceremony filters use category→`process_group` override (`backlog`, `sprint_planning`, …) so `?group=Backlog` works.

## Todo

- [x] `scripts/generate-v786-platform-sim-form-seeds.js` + `SQL/v786_structured_agile_form_template_seeds.sql`
- [x] FormTemplateAdmin filters (platform + simulator)
- [x] Menu configs (platform PMO + simulator PMO + PM form group links)
- [x] FormTemplateBuilder PROCESS_GROUPS (both apps)
- [x] Documentation + Review

## Review

**Status:** Complete (2026-07-21)

### Delivered

| Artifact | Notes |
|---|---|
| `SQL/v786_structured_agile_form_template_seeds.sql` | 42 templates × public + sim |
| `scripts/generate-v786-platform-sim-form-seeds.js` | Parses Admin v189/v191 form SQL |
| `FormTemplateAdmin.jsx` (platform + simulator) | Ceremony `?group=` → `process_group` |
| `FormTemplateBuilder.jsx` (both) | Extended `PROCESS_GROUPS` |
| `pmoMenuConfig.js`, `simulatorPMOMenuConfig.js`, `pmDashboardMenuConfig.js`, `pmMenuConfig.js`, `simulatorMenuConfig.js` | Ceremony menu leaves |
| `Documentation/Platform_Simulator_Methodology_Form_Parity_Guide.md` | Apply / regenerate guide |
| `packages/shared/.../formProcessGroupFilters.test.js` | Filter map unit test |

### Apply

Run `SQL/v786_structured_agile_form_template_seeds.sql` on Supabase, then open Platform/Simulator **Forms → Backlog** or **Starting Up**.

### Follow-up (optional)

- [x] Seed Agile/Structured **process** masters into Platform process-template tables to match Admin `v191e` / `v189c` — **`SQL/v787_structured_agile_process_template_seeds.sql`** (12 masters × public + sim).
