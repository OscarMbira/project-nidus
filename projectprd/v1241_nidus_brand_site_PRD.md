# v1241 — Nidus brand site (one front door for Platform, Simulator and Planner)

Status: DRAFT — decision interview complete (2026-10-10). Awaiting approval.
Plan: `projectplan/v1241_nidus_brand_site_plan.md`.
Depends on: `projectplan/v1240_shared_package_consolidation_plan.md` (built on the real `packages/ui`).
Related: `projectplan/v1239_dual_mode_planning_product_plan.md` (Planner card goes live at the Planner launch).

## a) Problem statement

Platform and Simulator each have their own homepage, which doubles as their sign-in entry. There is no single Nidus page that
introduces the product family and points visitors to the right product. A third product, Project Planner, is coming (v1239).

A `NidusHomepage.jsx` was started but is dead code:
- Identical copies exist in `apps/platform/src/pages/` and `apps/simulator/src/pages/`.
- No route mounts it.
- Its `/platform` and `/simulator` links date from the monolith and no longer work.

## b) Solution

A small static brand site, `apps/site`, at the apex domain `<domain>`. It shows the Nidus story and one card per product, with
links to each product's own landing page, sign-in and sign-up. Product cards come from a new database table, `public.site_products`.
The table is prerendered into static HTML at build time for search engines and refreshed at runtime, so edits show without a deploy.
Admin staff edit the cards in the Admin app.

Each product keeps its own landing page and sign-in on its subdomain. Those pages gain a slim shared "Nidus family" bar linking back to the brand site and across to the other products.

Admin is never listed publicly.

## c) User stories

1. As a visitor to `<domain>`, I see what Nidus is and one card each for Platform and Simulator (and Planner once launched).
2. As a visitor, each card tells me who the product is for and takes me to that product's landing page.
3. As a returning user, I use a "Sign in" menu on the brand site to reach my product's sign-in page.
4. As a visitor on a phone, the page is readable and usable at phone width, in light and dark mode.
5. As a search engine, I receive full HTML with the product names, descriptions and links, without running JavaScript.
6. As an Admin operator, I can add, edit, reorder, activate and deactivate product cards in the Admin app, and the change shows on the brand site without a deploy.
7. As the owner, the Planner card stays hidden until the Planner launch, then appears by switching it to active.
8. As a visitor on a product's landing page, a slim "Nidus family" bar lets me go to the brand site or another product.
9. As the owner, I keep a reference copy of the original Platform and Simulator homepages from before the family bar was added.
10. As a marketer, affiliate links that land on the brand site keep their attribution (existing `useAffiliateTracking`).
11. As a visitor, I never see a link to the Admin app.

## d) Implementation decisions (settled)

1. **Hosting.** New `apps/site` in the monorepo:
   - Static, no sign-in, no app shell, no Supabase auth session.
   - Dev port 5177; CI workflow `app-site.yml`.
   - Built on `packages/ui` (after v1240).
   - Reuses the content and layout of the dead `NidusHomepage.jsx`, made theme-aware (rule 28.1); the two dead copies are deleted.
2. **Content.** Table `public.site_products`:
   - Columns: `slug`, `name`, `tagline`, `description`, `audience`, `landing_url`, `sign_in_url`, `sign_up_url`, `icon_key`, `accent_key`, `sort_order`, `is_active`, audit columns.
   - Anonymous read is allowed for active rows only. No client writes.
   - Brand-level copy (hero heading, intro) lives in `public.site_content` (key/value) under the same rules.
   - The build prerenders both tables; the runtime refresh re-reads them.
3. **Editing.** An Admin screen "Public site products" (list + routed edit page) writes through a narrow SECURITY DEFINER RPC in the Admin repo. It is documented as an admin→public write exception, in the same style as v765/v779.
4. **Launch.** The site goes live after v1240 with Platform and Simulator cards. The Planner row is seeded with `is_active = false` and switched on in the v1239 go/no-go step.
5. **Product pages.** Platform and Simulator homepages (and later the Planner's) get a shared `NidusFamilyBar` from `packages/ui`, fed by `site_products`. Nothing else on those pages changes.
6. **Reference copy (owner request).** Before any homepage change:
   - A git tag `v1241-homepages-before`.
   - Full-page screenshots (light/dark × desktop/mobile) in `Design Images/v1241_homepage_snapshots/`.
   - Verbatim source copies of `PlatformHomepage.jsx` and `SimulatorHomepage.jsx` as `.jsx.txt` in `Documentation/Archive/v1241_homepage_snapshot/`, so they are never built or linted.
7. **Admin is not listed**, neither as a card nor in the sign-in menu.
8. **Display IDs.** `site_products` uses `slug` as its friendly key (rule 16.3). No Admin ID Generation rule is needed because there is no reference-code column.

## e) Testing decisions

- **Unit:**
  - Card list renders the active rows sorted by `sort_order` then name (rule 40.1 fallback).
  - The Planner card is hidden while inactive.
  - No Admin link appears.
  - The family bar excludes the current product.
- **Build:** the prerender script produces HTML containing every active product name and link. With the database unreachable, the build fails loudly. There is no fallback data (rule 26).
- **RLS integration:** anonymous select returns only active rows; anonymous insert, update and delete are rejected; the Admin RPC works for an authorised admin and is rejected for anyone else.
- **Responsive/theme:** phone-width and light/dark snapshot checks.
- **Regression:** Platform and Simulator homepage tests still pass with the family bar added.

## f) Out of scope

- Shared sign-in across subdomains (Release 2, v1239 D14).
- Blog, pricing comparison across products, CMS for full page bodies.
- Redesign of the Platform or Simulator homepages beyond the family bar.
- Any link to or mention of the Admin app.

## g) Further notes

- Final domain names are still placeholders (`<domain>`, `platform.`, `simulator.`, `planner.`).
- A `database_tables` row is required for both new tables.
- Rule 25.1 applies: product copy is data, not JSX.
