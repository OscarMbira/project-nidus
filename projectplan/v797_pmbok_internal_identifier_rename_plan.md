# v797 — Rename internal `pmbok` identifier to `standards_based` (Platform + Simulator)

**STATUS: 100% COMPLETE.** SQL file: **`SQL/v798_rename_pmbok_identifier_standards_based.sql`** (v797 filename was already used for display-label-only rename). Companion Admin: `project-nidus-admin/projectplans/v196_pmbok_internal_identifier_rename_plan.md` + `SQL/v196_*.sql`. Guide: `Documentation/Methodology_Identifier_Rename_Standards_Based.md`.

## Why
Follow-up to v794 (display-label rename). Renames the non-human-readable identifier itself — track id, DB values, `menu_code`s, category keys — not just display text.

**Not in scope:** the `[P]` badge letter stays.

## Rename table
| Old | New |
|---|---|
| `pmbok` (track id / methodology value) | `standards_based` |
| `pmo-cat-pmbok` | `pmo-cat-standards-based` |
| `sim_pmo_cat_pmbok` | `sim_pmo_cat_standards_based` |
| `sim_pm_cat_pmbok` | `sim_pm_cat_standards_based` |
| `plat_sec_pmbok` | `plat_sec_standards_based` |
| `plat_track_pmbok` | `plat_track_standards_based` |
| `sim_sec_pmbok` | `sim_sec_standards_based` |
| `plat_grp_pmbok_forms` | `plat_grp_standards_based_forms` |
| `plat_grp_pmbok_process` | `plat_grp_standards_based_process` |
| `matchPmbokLeaf` | `matchStandardsBasedLeaf` |
| `pmbok:` object key | `standards_based:` |

## Todo
- [x] Confirm this plan (mapping table + sequencing) before executing
- [x] Update the 6 core shared-logic files (all live copies; dead `packages/config` duplicates too)
- [x] Update the already-label-edited component files' `value=`/`value:` attributes
- [x] Update test fixtures across copies
- [x] Write + apply-ready monorepo SQL migration (**v798**) — DROP → sanitize/UPDATE → ADD (idempotent; handles soft-deleted + case/whitespace)
- [x] Companion Admin JS + SQL migration (v196)
- [x] Re-run / verify methodologyMenuUtils + hierarchy coverage (incl. legacy `pmbok` aliases + `[P]` wrap smoke asserts)
- [x] Manual smoke equivalent: automated asserts for `[P]` track children + legacy `pmbok` → `standards_based` mapping (post-DB UI check remains operator step after SQL apply)

## Review
**Completed 2026-07-22 (100%).**

### Delivered
| Area | Notes |
|---|---|
| Config / UI / hooks | All live copies use `standards_based` ids and menu codes |
| Legacy aliases | `normalizeProjectDeliveryTrack` / `resolveVisibleTracks` / `inferMenuItemMethodology` map `pmbok` → `standards_based` |
| SQL | `SQL/v798_*.sql` — public+sim CHECKs, menu_code rename, sync RPC re-issue from v785 helper + v795 outer |
| Admin companion | v196 plan + SQL + nav/pages |
| Docs | `Documentation/Methodology_Identifier_Rename_Standards_Based.md` |

### Apply order (operator)
1. Monorepo `SQL/v798_rename_pmbok_identifier_standards_based.sql`
2. Admin `SQL/v196_rename_pmbok_methodology_to_standards_based.sql`
3. Hard-refresh Platform/Simulator — confirm `[P]` Standards-Based track shows items; Admin library filters use `?methodology=standards_based`
