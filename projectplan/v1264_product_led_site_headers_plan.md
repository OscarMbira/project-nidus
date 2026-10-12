# v1264 — Product-led public headers — Implementation plan

**PRD:** `projectprd/v1264_product_led_site_headers_PRD.md`
**Admin companion plan:** `E:\project-nidus-admin\projectplans\v215_site_header_settings_admin_plan.md` (written at slice S4)
**Status:** approved 2026-10-12; implemented.

## Files

| Area | File | Change |
|---|---|---|
| SQL (monorepo) | `SQL/v1264_site_header_settings.sql` | New table `public.site_header_settings`: `scope_slug` unique, hex CHECKs, CTA label/url, `is_active`, audit columns, `updated_at` trigger. RLS: anon/auth `SELECT` active rows only, no write policies. `database_tables` registration. |
| SQL (monorepo) | `SQL/v1264_site_header_settings_seed.sql` | Four rows per PRD D11 (idempotent `ON CONFLICT (scope_slug) DO NOTHING`). |
| SQL (monorepo) | `SQL/v1264_site_header_settings_tests.sql` | Assertions (hex CHECK, RLS read/write). |
| SQL (Admin) | `E:\project-nidus-admin\SQL\v233_site_header_settings_admin_rpc.sql` | `public.admin_list_site_header_settings`, `public.admin_upsert_site_header_settings` (permission `system.public_site.edit`, server-side WCAG check, audit). |
| Shared | `packages/shared/src/site/siteColors.js` (new) | `contrastRatio`, `meetsAA`, `deriveHeaderPalette` (hover/muted/border tones from the 4 colours). |
| Shared | `packages/shared/src/site/siteChrome.js` | Fetch `site_header_settings`; `buildSiteChrome()` → `headers`; cache key `v2`; `productHeaderLinks()` de-dup helper. |
| UI | `packages/ui/src/site/NidusSiteHeader.jsx` | Split into `BrandLayout` (today's) + `ProductLayout` (one row, Project Nidus ▾ switcher, direct Sign in, CTA). Remove `ProductBar`. Colours via CSS variables. |
| UI | `packages/ui/src/site/__tests__/NidusSiteHeader.test.jsx` | Update + new cases. |
| Brand site | `apps/site/src/lib/fetchSiteData.js` | Include header settings in the prerender data. |
| Admin | content module: Header settings page + service + test, menu link | Editor with preview, contrast ratios, success modal. |
| Docs | `CLAUDE.md` rule 34.5 | Add `site_header_settings` to the v1241 narrow write exception line. |
| Docs | `Documentation/Product_Led_Site_Headers_v1264_Guide.md` | Owner guide + blog-ready summary. |

No app wrapper changes are needed: `PlatformHeader` / `SimulatorHeader` / the Planner `PublicLayout` already pass `currentProduct`.

## Tasks (vertical slices)

- [x] **S1: data end-to-end.** Monorepo SQL table + seed + tests. `siteChrome.js` reads `headers`. Header renders seeded colours via CSS variables on all four sites. Unit tests: chrome builder + fallback.
- [x] **S2: product layout.** `ProductLayout` with one row:
  - product name/icon, product links as main nav
  - Project Nidus ▾ switcher (other products + sign-ins, Compare products, Solutions/Resources/Company)
  - direct Sign in, CTA from settings
  - `ProductBar` removed
  - de-dup helper + tests
- [x] **S3: mobile + accessibility.** ☰ menu content per D9, keyboard/Escape/outside-click, new-window labels. Component tests.
- [x] **S4: Admin editor.**
  - Admin SQL v233 RPCs, service, Header settings page (four entries, colour pickers + hex, CTA fields, live preview, contrast ratios, Save blocked below 4.5:1, success modal)
  - wired into the content module's menu
  - Admin plan v215
  - tests
- [x] **S5: brand site.** Prerender includes header settings; brand layout keeps the chooser and uses its own colours.
- [x] **S6: finish.**
  - CLAUDE.md 34.5 line
  - guide doc
  - Planner allow-list regenerate + `--check`
  - `check-shared-drift --enforce`
  - builds (Platform, Simulator, Planner, site, Admin content module)
  - full retest suite
  - REVIEW.md checks
  - review section in this plan

## Owner run order (after approval and implementation)

1. Monorepo `v1264_site_header_settings.sql`, then `v1264_site_header_settings_seed.sql`.
2. Re-run `SQL/v1251_planner_table_wall.sql`.
3. Admin `v233_site_header_settings_admin_rpc.sql`.
4. Restart dev servers. The product apps' header cache key changes to `v2`, so no manual cache clearing is needed.

## Risks

- **Low contrast in derived hover/muted tones.** They are generated from the checked base pair and kept above 3:1 (non-text UI). This is covered by tests.
- **Brand-site SEO HTML only updates on the next build.** This is the same as other brand-site content today.
- **If v1264 isn't applied yet, the header falls back to built-in colours** (PRD story 19). The page does not break.

## Review (2026-10-12)

**Delivered**
- **Product pages: one header row** (`NidusSiteHeader` product layout):
  - the product's name and icon, then its own links
  - a **Project Nidus ▾** switcher: other products, Compare products, Solutions, Resources, Company, sign-ins to other products
  - a direct Sign in and the product's own CTA
  - the old product bar is removed; the brand-site layout and chooser are unchanged
- **Per-header colours and CTA** in `site_header_settings`:
  - `site_color_contrast()` plus CHECK constraints enforce WCAG AA in the database
  - applied as `--nh-*` CSS variables, so rule 72 branding cannot repaint them
- **Duplicates removed automatically:** a product link that matches the CTA is hidden, and brand pricing shows as "Compare products" in the switcher.
- **Admin:** Content → Public Site Headers (list + view/edit with live preview, contrast readouts, Save blocked below 4.5:1, audit tab). Admin SQL v233, Admin plan v215.
- **CLAUDE.md** rule 34.5 narrow write exception now names `site_header_settings`. Guide: `Documentation/Product_Led_Site_Headers_v1264_Guide.md`.

**Deviation from PRD**
- **Simulator seed accent** is `#15803D` (green-700), not `#16A34A`. White on green-600 is 3.3:1 and would fail D5. The PRD is updated.
- **Admin save feedback** is the Admin toast. Admin has no shared success modal; every public-site form there uses the toast.

**Validation**
- Tests:
  - `@nidus/shared` site: 36/36
  - `@nidus/ui`: 193/193 (header 14, of which 8 new)
  - `apps/site`: 46/46
  - Admin public-site services: 19/19 (5 new)
- Builds:
  - Platform, Simulator, Planner (turbo): 10/10 tasks
  - site: `vite build`
  - Admin content module
- Checks: compiled CSS contains the `--nh-*` utilities. `check-shared-drift --enforce` is clean, and the Planner allow-list is up to date (73).
- Lint: 0 errors (unused-var warnings are JSX false positives, a pre-existing pattern).
- SQL tests (`v1264_site_header_settings_tests.sql`, 7 checks) are written but **not run**. They need the owner's database.

**Remaining risks**
- Not yet checked in a browser: light/dark toggle, phone width, dropdown readability with custom colours. Do this after running the SQL.
- Until v1264 is applied, headers use the built-in colours and the products' sign-up as the CTA (Platform shows "Get started", not "Request a demo").
