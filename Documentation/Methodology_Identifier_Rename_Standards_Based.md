# Methodology Identifier Rename — `pmbok` → `standards_based`

**Plans:** Monorepo `projectplan/v797_pmbok_internal_identifier_rename_plan.md` · Admin `project-nidus-admin/projectplans/v196_pmbok_internal_identifier_rename_plan.md`  
**SQL:** Monorepo `SQL/v798_rename_pmbok_identifier_standards_based.sql` · Admin `SQL/v196_rename_pmbok_methodology_to_standards_based.sql`  
**Display label only (earlier):** `SQL/v797_rename_pmbok_track_label_standards_based.sql`

## What changed

The internal track / methodology identifier is now **`standards_based`** (UI label remains **Standards-Based**; badge **`[P]`** unchanged).

| Surface | Old | New |
|---|---|---|
| Track id / column value | `pmbok` | `standards_based` |
| Category menu codes | `pmo-cat-pmbok`, `sim_*_cat_pmbok`, … | `pmo-cat-standards-based`, … |
| Group codes | `plat_grp_pmbok_forms`, … | `plat_grp_standards_based_forms`, … |
| Canonical matcher | `matchPmbokLeaf` | `matchStandardsBasedLeaf` |

## Apply order (Supabase SQL Editor)

1. **`SQL/v798_rename_pmbok_identifier_standards_based.sql`** (public + sim) — DROP CHECKs → sanitize/UPDATE data → ADD CHECKs → re-issue sync RPCs  
2. **Admin `SQL/v196_rename_pmbok_methodology_to_standards_based.sql`** — GTL methodology + create/update RPC validation  

Safe to re-run after a partial failure (idempotent DROP / sanitize / ADD).

## Runtime aliases

`normalizeProjectDeliveryTrack`, `resolveVisibleTracks`, and `inferMenuItemMethodology` still accept legacy **`pmbok`** / **`waterfall-pmbok`** inputs and map them to **`standards_based`**, so sidebar focus and org settings stay correct during/after migration.

## Smoke checklist

- [x] Unit: `methodologyMenuUtils` — legacy `pmbok` maps to `standards_based`; `[P]` track wrapper keeps children  
- [x] Unit: `pmoMenuHierarchyUtils` — category resolvers use `pmo-cat-standards-based`  
- [ ] After DB apply: Platform/Simulator sidebar — open Standards-Based `[P]` track and confirm menu items appear (not empty / not “universal” dump)
- [ ] After Admin v196: Global Template Library filters use `?methodology=standards_based`; publish accepts the value
