# v775 — Add ICT industry plan template

**Status:** COMPLETE  
**Date:** 2026-07-16

## Problem

Global Template Library / Platform catalog had no dedicated **ICT** industry. Closest existing rows were `software_development` (Software Development & IT), `telecommunications`, `digital_transformation`, and `data_centres_cloud` — none used the common **ICT** sector label.

## Deliverables

| Item | Location |
|------|----------|
| Content draft | `projectplan/v775_ict_industry_content_draft.md` |
| Generator | `scripts/generate-v775-ict-industry.mjs` |
| Platform seed | `SQL/v775_ict_industry_template_seed.sql` |
| Catalog docs | `projectplan/v575_Industry_Plan_Templates.md` §1 + §8 |
| Admin catch-up | `E:\project-nidus-admin\SQL\v172_sync_ict_industry_into_global_library.sql` |

## Apply order

1. Monorepo: `SQL/v775_ict_industry_template_seed.sql`
2. Admin: `SQL/v172_sync_ict_industry_into_global_library.sql` **or** Global Template Library → **Import missing from Platform (bootstrap only)**
3. Publish from Global Template Library if needed

## Todo

- [x] Author ICT draft (industry 51)
- [x] Generate idempotent Platform seed SQL
- [x] Update v575 catalog index + §8
- [x] Admin sync catch-up SQL
- [x] Review section

## Review

Added industry **#51** `ict` — **ICT (Information & Communications Technology)** with 8 phases / 26 activities. Distinct from Software Development & IT (product build) and Telecommunications (network rollout): focuses on ICT programme intake, architecture, vendor contracting, systems integration, security/compliance, cutover, and service transition. Regenerate with `node scripts/generate-v775-ict-industry.mjs`.
