# v795 — Fix Global Template publish 409 on portfolio/programme/project

## Problem
After the v190 column heal, Publish to Platform/Simulator returns **HTTP 409 Conflict**:
`duplicate key value violates unique constraint "uq_pm_template_nodes_current_scope"`

Confirmed on live `project_template` rows (e.g. Agile Delivery Team Template).

## Root cause
`uq_pm_template_nodes_current_scope` (v774) allows one **current** node per
`(account, tier, domain, scope, domain_ref_id)`.

Catalog-backed domains pass a per-document `domain_ref_id`. Level domains
(`portfolio_template` / `programme_template` / `project_template`) from v783/v785
set `v_template_id := NULL`, so every level template shares the coalesced zero-UUID
slot — only the first publish succeeds; the rest 409.

## Fix
1. [x] Monorepo `SQL/v795_fix_level_template_sync_domain_ref.sql`
   - Heal existing NULL `domain_ref_id` → `source_global_template_id` for those domains (public + sim)
   - `sync_global_template_node`: set `v_template_id := p_global_template_id` for level domains
2. [ ] Apply `v795` in Supabase SQL Editor (CLI DB password currently invalid)
3. [ ] Re-test Publish to Platform for pending project/portfolio/programme templates
4. [x] Review

## Out of scope
- Admin publish RPC (already correct; failure is inside monorepo sync)
- `fields` domain (intentionally one current node per scope when `domain_ref_id` is NULL — v774)

## Apply
Paste `SQL/v795_fix_level_template_sync_domain_ref.sql` into Supabase SQL Editor, or:
```bash
# from monorepo if SUPABASE_DB_URL / password is valid
```

## Review
- Probe: service-role publish of form/process templates succeeded after v190; all scanned `project_template` pending rows failed with 23505 on `uq_pm_template_nodes_current_scope`.
- Fix aligns level domains with the v774 multi-document uniqueness model.
