# v1241 — Nidus brand site: implementation plan

PRD: `projectprd/v1241_nidus_brand_site_PRD.md`.
Status: **APPROVED 2026-10-11 — implemented 2026-10-11; waiting on owner steps (run SQL, production URLs, DNS, smoke test).**
Order: runs **after v1240** (needs the consolidated `packages/ui`). Independent of v1239 except the Planner card switch-on at the v1239 launch.
Admin repo work: Admin plan **v210**, Admin SQL **v225** (`E:\project-nidus-admin`).

## Approach

Test-first vertical slices (`projectplan/App_Guide.md`). Each slice ends with the Platform and Simulator retest suites (rule 43).

## Slice 0 — Reference copy of current homepages (owner request, before anything else)
- [x] 0.1 Git tag `v1241-homepages-before` on the current commit (pushed only when the owner approves a push).
  - *Done.* Annotated local tag `v1241-homepages-before` on `633d34e`. Not pushed; it goes with the next push you approve.
- [~] 0.2 Full-page screenshots of the Platform and Simulator homepages (light/dark × desktop/mobile) into `Design Images/v1241_homepage_snapshots/`.
  - *Not possible here:* there is no browser automation in this repo. Take the screenshots from the tagged commit if wanted (README in the archive folder explains how).
- [x] 0.3 Copy `apps/platform/src/pages/PlatformHomepage.jsx` and `apps/simulator/src/pages/SimulatorHomepage.jsx` (and their Platform-side twins) verbatim into `Documentation/Archive/v1241_homepage_snapshot/*.jsx.txt`, with a README note giving the date and source commit.
  - *Done.* Four `.jsx.txt` copies plus a README in `Documentation/Archive/v1241_homepage_snapshot/`.

## Slice 1 — Data: `site_products` + `site_content`
- [~] 1.1 Test (RLS integration): anonymous select returns active rows only; anonymous writes are rejected.
  - *Written; to be run by the owner.* `SQL/v1241_verify_site_products_rls.sql` checks that anon reads active rows only, anon writes are rejected, and non-admin RPC calls are rejected. It runs inside a transaction that is rolled back.
- [x] 1.2 **SQL v1241** `site_products_and_content.sql`:
  - *Done.* `SQL/v1241_site_products_and_content.sql`.
  - Both tables with audit columns and a unique `slug`/`key`.
  - RLS: anonymous + authenticated SELECT where `is_active`; no write policies.
  - `database_tables` rows; `NOTIFY pgrst`.
- [x] 1.3 **SQL v1241_seed** `site_products_and_content_seed.sql` (idempotent, `ON CONFLICT (slug) DO UPDATE`):
  - *Done.* `SQL/v1241_site_products_and_content_seed.sql`. It also adds the `brand.url` key used by the family bar. A re-run does not overwrite URLs, `is_active` or edited copy.
  - Platform and Simulator rows are active.
  - The Planner row is `is_active = false`.
  - Hero/intro copy taken from the current `NidusHomepage.jsx` text.
  - URLs use the configured domains (placeholders until Q2 in v1239 is answered).

## Slice 2 — `apps/site` and the brand page
- [x] 2.1 Scaffold `apps/site`:
  - *Done.* `apps/site`: port 5177, `@nidus/site-app`, `.github/workflows/app-site.yml`, `apps/site/DEV_APP.md`. No Supabase client: it reads the REST endpoint with the anon key.
  - Vite, port 5177, no `@nidus/*` aliases.
  - Turbo filter `@nidus/site-app`.
  - `.github/workflows/app-site.yml` triggers on `apps/site/**`, `packages/ui|shared|supabase/**`.
  - `apps/site/DEV_APP.md`.
- [x] 2.2 Tests first:
  - *Done.* 14 tests across `siteData`, `BrandHomePage` and the server render.
  - Cards render from the data, in `sort_order` order.
  - Inactive rows are hidden.
  - No Admin link.
  - The Sign-in menu lists each active product's `sign_in_url`.
- [x] 2.3 `BrandHomePage`, ported from `NidusHomepage.jsx`:
  - *Done.* `src/pages/BrandHomePage.jsx` + `ThemeToggle.jsx`. Affiliate codes are passed through to product links (`?ref=`), not stored, because browser storage is per subdomain.
  - Header (logo, product links, theme toggle, Sign in menu).
  - Hero from `site_content`.
  - Product cards from `site_products`.
  - "How the products connect" section (Planner grows into the Platform; Simulator for practice).
  - Footer.
  - Theme-aware (28.1), phone width with 16px gutter, PWA manifest (39), `useAffiliateTracking` carried over.
- [x] 2.4 Prerender:
  - *Done.* `scripts/prerender.mjs` after the client build and an SSR build. A failed fetch fails the build; verified against the database without the v1241 tables (fails with the real reason).
  - `apps/site/scripts/prerender.mjs` fetches both tables with the anon key at build time and renders static HTML via `react-dom/server`.
  - Meta tags (title, description, Open Graph) come from `site_content`.
  - The page hydrates and re-reads at runtime.
  - Test: the build output contains every active product name and URL. A failed fetch fails the build (no fallback data, rule 26).
- [x] 2.5 Delete the dead `apps/platform/src/pages/NidusHomepage.jsx` and `apps/simulator/src/pages/NidusHomepage.jsx`, along with their lazy-import entries.
  - *Done.* Both files and their lazy-import/route-list entries were removed; the named-import check is clean.

## Slice 3 — Nidus family bar on product homepages
- [x] 3.1 Test: `NidusFamilyBar` (in `packages/ui`) shows the Nidus logo linking to the brand site plus the other active products, and hides the current product (`currentSlug` prop).
  - *Done.* `packages/ui/src/NidusFamilyBar.jsx`, 3/3 tests (hides the current product and Admin, session cache, renders nothing on error).
- [x] 3.2 Add the bar to the top of `PlatformHomepage.jsx` (Platform app) and `SimulatorHomepage.jsx` (Simulator app). Nothing else on those pages changes. The bar reads `site_products` once per session, cached in sessionStorage (rule 66).
  - *Done.* Added to all four homepage copies (each app also has a copy of the other homepage). It renders nothing until the v1241 tables exist, so it is safe to ship before the SQL runs.
- [x] 3.3 Record in v1239 Slice 5.3 that the Planner landing page mounts the same bar with `currentSlug="planner"`.
  - *Done.* Recorded in v1239 Slice 5.3.
- [x] 3.4 Regression: existing homepage tests in both apps still pass; manual light/dark check.
  - *Done (automated part).* No test file renders the homepages; all four edited files and the bar compile. The manual light/dark check is in the owner test pass.

## Slice 4 — Admin editing (`E:\project-nidus-admin`, plan v210)
- [x] 4.1 **Admin SQL v225** `site_products_admin_rpc.sql`:
  - *Done.* `E:\project-nidus-admin\SQL\v225_site_products_admin_rpc.sql`, with permissions and a nav node. Hardened: the acting admin comes from the session, not a parameter. Exception documented in both CLAUDE.md files.
  - `admin.upsert_site_product(...)`, `admin.set_site_product_active(...)`, `admin.upsert_site_content(...)`.
  - SECURITY DEFINER, restricted to Admin roles, writing `public.site_products` / `public.site_content`, with audit.
  - Documented as a narrow admin→public write exception (same style as v765/v779). Add the exception line to both CLAUDE.md files.
- [x] 4.2 Admin "Public site products" list:
  - *Done.* Admin `PublicSiteProductsPage`, `PublicSiteProductFormPage`, `PublicSiteContentFormPage` (`modules/content`) and `packages/shared/src/publicSiteServices.js`. Admin `AdminTable` and `ViewToggle` were made light/dark aware along the way. The content module builds.
  - Sortable headers, row numbers, table/card toggle (default table), search, icon-only actions, export.
  - A routed edit page with Audit tab, unsaved-changes guard and success modal.
  - Plus a "Site content" key/value list.
  - Admin menu entry under the existing Admin content/configuration section.
- [~] 4.3 Tests: RPC rejects non-admin callers; the edit flow updates a row; the brand site shows the change on next load.
  - *Partly done.* Admin service tests pass (6/6). The non-admin rejection is in the verification SQL. The end-to-end edit → brand site check is in the owner test pass.

## Slice 5 — Go-live
- [~] 5.1 DNS/hosting: apex `<domain>` → `apps/site` build; product subdomains unchanged.
  - *Owner step* (DNS/hosting and the `SITE_VERCEL_PROJECT_ID` secret).
- [~] 5.2 Smoke test: every card link, every Sign-in link, phone width, light/dark, view-source shows the prerendered content.
  - *Owner step* (after SQL, production URLs and deploy).
- [x] 5.3 Docs:
  - *Done.* `Documentation/Nidus_Brand_Site_v1241_Guide.md`, `Documentation/Nidus_Brand_Site_v1241_Blog_Post.md`. ROADMAP entry made with the final ROADMAP update.
  - `Documentation/Nidus_Brand_Site_v1241_Guide.md` (editing cards, adding a product, launch switch).
  - Blog note (rule 22).
  - ROADMAP.md entry.
- [~] 5.4 Planner switch-on is owned by the v1239 go/no-go step (`site_products.is_active = true` for `planner`).
  - *Owned by v1239* (go/no-go step).

## Risks

| Risk | Mitigation |
|---|---|
| Domain names not final | URLs live in `site_products`; changing them needs no deploy |
| Database unavailable during build | Build fails loudly and the previous deploy stays live; no stale fallback content |
| Family bar changes product homepage layout | Slim fixed-height bar; Slice 0 snapshots allow before/after comparison |
| Admin→public write widens the Admin boundary | Narrow RPC limited to two tables, role-checked, audited, documented exception |

## Review (filled in after implementation)

**Implemented 2026-10-11.** Code, SQL, Admin screen, docs and tests are complete. Remaining items are owner steps:
- run the SQL (`v1241`, `v1241_seed`, Admin `v225`, then `v1241_verify`);
- set the production URLs and `brand.url` in Admin;
- DNS and the deploy secret;
- the smoke test;
- the Planner switch-on at the v1239 launch.

Tests: `apps/site` 14/14 · `packages/ui` NidusFamilyBar 3/3 · Admin publicSiteServices 6/6 · Admin UI 42/42.

Findings:
- Tailwind does not scan `packages/*` by default. Fixed in v1240, and the site's own CSS has `@source`.
- Admin `AdminTable` and `ViewToggle` were dark-only. Fixed.
- **Security finding (outside scope):** 276 Admin RPC call sites trust a client-supplied `p_admin_user_id`. See Admin plan v210.


---

## Amendment A — Shared header, footer and common pages (requested 2026-10-11)

**Status:** decisions agreed with the owner 2026-10-11; in progress.

### Decisions
| # | Decision |
|---|---|
| A-D1 | Common pages (About, Contact, Blog, Resources, Solutions, Terms, Privacy, product comparison) live **only on the brand site**. Platform, Simulator and Planner link to them; their own copies are retired (their routes redirect to the brand site). |
| A-D2 | Header: `Products ▾ · Solutions ▾ · Pricing · Resources ▾ · Company ▾` + theme toggle + `Sign in ▾` + primary **Get started**, which opens a "Which product?" chooser. |
| A-D3 | The same header and an enriched footer (columns: brand + products, solutions, resources, company, legal; copyright) are used on the brand site and on the Platform, Simulator and Planner public pages. |
| A-D4 | One shared header component and one shared footer component (`packages/ui`) for easy maintenance. Links that go to another application open in a new browser window. |
| A-D5 | Narrow screens: the four groups collapse into one menu; theme toggle, Sign in and Get started stay visible. |
| A-D6 | Everything in the header/footer and on the common pages is data (rule 25.1): products from `site_products`, links from a new `site_nav_links`, page text from a new `site_pages`, all edited in Admin. |
| A-D7 | The contact form must work: messages go to a new `site_enquiries` table (anonymous visitors have no user record, so `support_tickets` cannot be used) through a validated, rate-limited RPC, and Admin lists them. |
| A-D8 | Terms and Privacy are seeded **inactive** with no legal text: the owner writes them in Admin; their footer links appear once active. |

### Tasks
- [x] A1 SQL **v1260** `site_nav_pages_and_enquiries.sql` (`site_nav_links`, `site_pages`, `site_enquiries`, `site_submit_enquiry()` RPC, RLS + grants) + **v1260** seed (nav groups, page copy moved from the Platform/Simulator sections, three Solutions pages, Terms/Privacy inactive).
- [x] A2 `packages/shared`: `fetchSiteChrome()` (REST + anon key, short sessionStorage cache — rule 66) used by every app.
- [x] A3 `packages/ui`: `NidusSiteHeader`, `NidusSiteFooter`, `GetStartedChooser` (theme-aware, keyboard-accessible dropdowns, mobile menu, external links in a new window) + tests.
- [x] A4 `apps/site`: multi-page (Home, Pricing, Solutions/:slug, About, Contact, Blog, Resources, Terms, Privacy, 404), every route prerendered; contact form → `site_submit_enquiry`.
- [x] A5 Platform, Simulator, Planner public pages use the shared header/footer; their `/about`, `/contact`, `/blog`, `/resources`, `/terms`, `/privacy` redirect to the brand site.
- [x] A6 Admin (plan v212, SQL v230): edit navigation links and pages, read enquiries.
- [x] A7 Tests, builds, docs (brand-site guide), plan review.

### Amendment A — Review (2026-10-11)

**Delivered**
- **One shared header and footer** (`packages/ui/src/site/`: `NidusSiteHeader`, `NidusSiteFooter`, `GetStartedChooser`, `PublicSiteChrome`). The brand site, Platform, Simulator and Planner public pages all render it.
  - Header: Products ▾ · Solutions ▾ · Pricing · Resources ▾ · Company ▾ + theme + Sign in ▾ + Get started (opens a "Which product?" chooser).
  - On narrow screens the four groups collapse into one menu; theme, Sign in and Get started stay visible.
  - Links to another app open in a new window. The current product's own bar (Features, Pricing, Docs …) stays in the same window.
- **Header and footer content comes from the database:** `site_products`, `site_content`, `site_nav_links`, `site_pages` (SQL v1260 + seed). It is read through `@nidus/shared/site/siteChrome.js` with a 10-minute sessionStorage cache (rule 66). The NidusFamilyBar was removed.
- **Common pages live only on the brand site:** About, Contact, Blog, Resources, Solutions/*, plus Terms and Privacy (inactive until the copy is approved).
  - The Platform and Simulator `/about`, `/contact`, `/blog` and `/resources` routes redirect there via `BrandSiteRedirect`; the old section components were deleted. Neither app had a public `/terms` or `/privacy` route, so the footer links straight to the brand site for those.
  - The brand site is multi-page. Every route plus `404.html` is prerendered.
  - The Contact form posts to `site_submit_enquiry` (validated, honeypot, 5 per email per hour).
- **Admin editing:** Admin plan v212, SQL v230. Pages & Menus editor, Site Enquiries inbox, and Pricing/Documentation URLs on product cards.

**Fixes found during review**
- `SQL/v1260_site_nav_pages_and_enquiries.sql` had been corrupted while it was written: a `$'` in a JS `String.replace` replacement string expanded to the rest of the file inside the `nav_group` CHECK. Repaired, and every changed file was scanned for the same pattern (none found).
- Removed dead `isLoggedIn` auth checks from both apps' `PlatformHomepage` / `SimulatorHomepage`. They became unused once the inline headers went, and they carried two lint errors.
- Brand-site/header lint errors fixed (`ProductIcon` element helper; documented hydration-only `setState`).

**Validation**
- Tests:
  - site 24/24
  - planner 13/13
  - `@nidus/ui` 187/187
  - shared site 8/8
  - Admin public-site services 14/14
- Planner allow-list `--check` up to date (73). `check-shared-drift --enforce` clean.
- Builds:
  - Platform, Simulator and Planner: turbo, 10/10 tasks.
  - Site: `vite build` + SSR.
  - Admin content module.
- Prerender reads live data, so it needs v1260 applied first. Until then the full site build stops with "column site_products.pricing_url does not exist" (exit 1, previous deploy stays live; rule 26).

**Owner run order:** monorepo `v1260` → `v1260_seed` → re-run `v1251` (walls the new tables) → Admin `v230`. Then restart the site dev server.

**Remaining risks**
- Brand-site edits reach visitors on their next page load; the prerendered HTML search engines read updates on the next site build. Product apps pick them up within about 10 minutes (cache).
- Terms and Privacy stay hidden until legal copy is written.
