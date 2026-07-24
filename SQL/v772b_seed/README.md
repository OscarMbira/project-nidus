# v772b Industry Catalog Expansion (30 → 50)

**Plan:** `projectplan/v772_industry_template_springboard_content_plan.md` Phase 0  
**Source draft:** `projectplan/v772c_new_industry_content_draft.md`  
**Regenerate:** `node scripts/generate-v772b-industry-expansion.mjs`

> **Important:** `SQL/v772b_industry_template_catalog_expansion.sql` is a **pointer only** — it does **not** insert industries. You must run the batch files below.

## Apply order (Supabase SQL editor — Platform / public schema)

Run each batch file in order (or run individual `industries/{code}.sql` files):

1. `batches/batch_01_of_05.sql` — includes **Insurance & Underwriting Transformation**
2. `batches/batch_02_of_05.sql`
3. `batches/batch_03_of_05.sql`
4. `batches/batch_04_of_05.sql`
5. `batches/batch_05_of_05.sql`

Optional enrichment (existing 3 industries):

6. `../v772_industry_template_content_enrichment.sql`

## Then Admin Global Template Library (required for Admin UI)

Admin’s Global Template Library does **not** read this folder directly. It copies from `public.pmo_industry_templates` via bulk SQL:

7. Admin `E:\project-nidus-admin\SQL\v169_global_template_v772b_industries_catchup.sql`  
   (or re-run `v167_global_template_industry_bulk_populate.sql` after the batches)

After step 7, refresh **Global Templates → Global Template Library** — you should see e.g. **Insurance & Underwriting Transformation**.

## Quick check (SQL)

```sql
-- Platform catalog
SELECT industry_code, industry_name
FROM public.pmo_industry_templates
WHERE industry_code = 'insurance_underwriting';

-- Admin library
SELECT name, payload->>'industry_code' AS code, synced_at
FROM admin.global_template_library
WHERE domain = 'industry_plan'
  AND payload->>'industry_code' = 'insurance_underwriting';
```
