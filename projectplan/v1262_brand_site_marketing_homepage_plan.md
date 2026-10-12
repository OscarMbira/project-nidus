# v1262 — Brand site marketing homepage and Solutions pages (plan)

PRD: `projectprd/v1262_brand_site_marketing_homepage_PRD.md` (decisions settled 2026-10-12).
Admin: `E:\project-nidus-admin\projectplans\v213_site_sections_admin_plan.md`, SQL `v231`.
Status: **IMPLEMENTED** (approved 2026-10-12). Owner SQL run and publish pending.

## Files

| Area | New / changed |
|---|---|
| SQL (monorepo) | `SQL/v1262_site_sections.sql` (table, RLS, grants, bucket + storage policies, preview + read functions, registry) · `SQL/v1262_site_sections_seed.sql` (home + 3 Solutions pages, gated sections hidden) · `SQL/v1262_site_sections_tests.sql` |
| Shared data | `packages/shared/src/site/siteSections.js` (map rows, resolve CTAs, per-type validation) + tests; `siteChrome.js` fetch adds `site_sections` |
| Brand site | `apps/site/src/sections/*.jsx` (11 section components + `SectionPage.jsx`), `App.jsx` (route → sections or Markdown), `BrandHomePage.jsx` (replaced by sections), `SitePages.jsx` (Contact reads `?topic=`), `lib/fetchSiteData.js` (sections + preview token), `scripts/prerender.mjs` (FAQ JSON-LD), tests |
| Admin | SQL `v231` RPCs, services, Site Sections list/editor pages, routes, nav (see Admin plan v213) |
| Docs | `Documentation/Nidus_Brand_Site_v1241_Guide.md` (new "Marketing sections" part; correct the "after next build" wording), ROADMAP status line |

## Slices (each one end to end; tick as done)

- [x] **S1 — Hero from the database.** SQL table + RLS + anon read of published rows; seed the home `hero` only; site renders `hero` above today's content; Contact reads `?topic=sales`; tests (site + SQL vectors for anon read). *Proves the pipeline.*
- [x] **S2 — Remaining section types on Home.** 10 more components; `product_cards` reads `site_products`; FAQ keyboard + JSON-LD in prerender; seed full home (trust strip + testimonials hidden); old hard-coded home layout removed; tests per type.
- [x] **S3 — Solutions pages as section pages.** Routing rule (sections if any, else Markdown); seed `solutions/pmo`, `solutions/project-teams`, `solutions/training`; prerender covers them; tests.
- [x] **S4 — Admin editing (draft save).** Admin v231 list/save-draft/discard/reorder/show-hide/add RPCs + Site Sections pages with item tables and Audit tab; validators; tests. Drafts never visible to anon (SQL vector).
- [x] **S5 — Image upload.** `site-assets` bucket + storage policies (edit permission only, type/size checks); Admin upload control with alt text; site renders images with fallback icon; tests.
- [x] **S6 — Preview and publish.** Preview-token RPC (hashed, 60 min) + `site_get_sections_preview(token, page)`; site `?preview=` mode with a visible "Preview — not published" banner; Admin "Preview drafts" and "Publish" (confirm, one transaction, audited); SQL vectors (bad/expired token, publish moves drafts).
- [x] **S7 — Review.** Re-run v1251 note; Planner allow-list `--check`; site full build + prerender; Admin content build; lint; docs + guide; REVIEW.md checks; review section below.

## Owner run order (when built)

`v1262_site_sections.sql` → `v1262_site_sections_seed.sql` → re-run `v1251_planner_table_wall.sql` → Admin `v231` → `v1262_site_sections_tests.sql` (expect all PASS) → restart site dev server.

## Risks

- Seed copy is a draft for the owner to approve in Admin (preview → publish) before go-live.
- Images come from the owner; without them sections show icons/illustrations.
- Preview tokens are bearer links; mitigated by 60-minute expiry, hashed storage and draft-only exposure.

## Review (2026-10-12)

**Delivered**
- **SQL v1262.** `site_sections` stores published columns plus a `draft` column. Anon has a column-level grant that excludes `draft`, and RLS shows active rows only.
  - `site_preview_tokens` holds hashes only, valid for 60 minutes.
  - `site_preview_sections(token)` returns drafts and raises on a bad or expired link.
  - Bucket `site-assets`.
- **Seed.** 23 sections (home 11, Solutions 3 × 4). All are drafts; the trust strip and testimonials stay hidden. Every seeded section passes the shared validator.
- **SQL tests** (`v1262_site_sections_tests.sql`) cover T1–T7: the draft column is unreadable, anon sees active rows only, the preview link works and is refused when expired or malformed, and anon cannot write or read tokens.
- **Shared helpers.** `packages/shared/src/site/siteSections.js` holds the types, link resolution, validation and FAQ JSON-LD (16 tests).
- **Brand site**
  - `src/sections/SectionPage.jsx` holds the 11 section components.
  - Home and Solutions pages render from sections when published; otherwise the original page or Markdown.
  - `?preview=` mode shows a banner, or an error for an expired link.
  - Contact reads `?topic=`.
  - Prerender adds FAQ JSON-LD.
- **Admin v231 / v213.** Draft, add, discard, reorder, publish, preview link and upload policies. Site Sections list and editor, with an item table, image upload and an Audit tab.

**Decided during build** (implementation detail, within the PRD)
- Show/hide, reorder and new sections are drafts too, so nothing reaches visitors before Publish.
- The seed is drafts-only, so the owner approves the copy.

**Validation**
- Tests:
  - site 35/35 (11 new)
  - shared site helpers 16/16
  - `@nidus/ui` site 8/8
  - planner 13/13
  - Admin public-site services 23/23 (9 new)
- Planner allow-list `--check` passes (site_sections is not read by the Planner). Drift check is clean.
- Builds: site client and SSR bundles, Admin content module.
- The full site build (prerender) needs v1262 in the database first.

**Notes**
- Lint flags the Node globals in `apps/site/scripts/prerender.mjs`. This predates v1262 (the lint config treats the script as browser code).
- `lucide-react` is not a dependency of the Admin content module, so the move buttons use ↑ ↓ text.

**Owner steps:** run the SQL in the order above → Admin → Site Sections → Preview → Publish (Home, then each Solutions page).
