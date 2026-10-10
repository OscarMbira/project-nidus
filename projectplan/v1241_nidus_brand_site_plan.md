# v1241 — Nidus brand site: implementation plan

PRD: `projectprd/v1241_nidus_brand_site_PRD.md`.
Status: **DRAFT — awaiting approval.**
Order: runs **after v1240** (needs the consolidated `packages/ui`). Independent of v1239 except the Planner card switch-on at the v1239 launch.
Admin repo work: Admin plan **v210**, Admin SQL **v225** (`E:\project-nidus-admin`).

## Approach

Test-first vertical slices (`projectplan/App_Guide.md`). Each slice ends with the Platform and Simulator retest suites (rule 43).

## Slice 0 — Reference copy of current homepages (owner request, before anything else)
- [ ] 0.1 Git tag `v1241-homepages-before` on the current commit (pushed only when the owner approves a push).
- [ ] 0.2 Full-page screenshots of the Platform and Simulator homepages (light/dark × desktop/mobile) into `Design Images/v1241_homepage_snapshots/`.
- [ ] 0.3 Copy `apps/platform/src/pages/PlatformHomepage.jsx` and `apps/simulator/src/pages/SimulatorHomepage.jsx` (and their Platform-side twins) verbatim into `Documentation/Archive/v1241_homepage_snapshot/*.jsx.txt`, with a README note giving the date and source commit.

## Slice 1 — Data: `site_products` + `site_content`
- [ ] 1.1 Test (RLS integration): anonymous select returns active rows only; anonymous writes are rejected.
- [ ] 1.2 **SQL v1241** `site_products_and_content.sql`:
  - Both tables with audit columns and a unique `slug`/`key`.
  - RLS: anonymous + authenticated SELECT where `is_active`; no write policies.
  - `database_tables` rows; `NOTIFY pgrst`.
- [ ] 1.3 **SQL v1241_seed** `site_products_and_content_seed.sql` (idempotent, `ON CONFLICT (slug) DO UPDATE`):
  - Platform and Simulator rows are active.
  - The Planner row is `is_active = false`.
  - Hero/intro copy taken from the current `NidusHomepage.jsx` text.
  - URLs use the configured domains (placeholders until Q2 in v1239 is answered).

## Slice 2 — `apps/site` and the brand page
- [ ] 2.1 Scaffold `apps/site`:
  - Vite, port 5177, no `@nidus/*` aliases.
  - Turbo filter `@nidus/site-app`.
  - `.github/workflows/app-site.yml` triggers on `apps/site/**`, `packages/ui|shared|supabase/**`.
  - `apps/site/DEV_APP.md`.
- [ ] 2.2 Tests first:
  - Cards render from the data, in `sort_order` order.
  - Inactive rows are hidden.
  - No Admin link.
  - The Sign-in menu lists each active product's `sign_in_url`.
- [ ] 2.3 `BrandHomePage`, ported from `NidusHomepage.jsx`:
  - Header (logo, product links, theme toggle, Sign in menu).
  - Hero from `site_content`.
  - Product cards from `site_products`.
  - "How the products connect" section (Planner grows into the Platform; Simulator for practice).
  - Footer.
  - Theme-aware (28.1), phone width with 16px gutter, PWA manifest (39), `useAffiliateTracking` carried over.
- [ ] 2.4 Prerender:
  - `apps/site/scripts/prerender.mjs` fetches both tables with the anon key at build time and renders static HTML via `react-dom/server`.
  - Meta tags (title, description, Open Graph) come from `site_content`.
  - The page hydrates and re-reads at runtime.
  - Test: the build output contains every active product name and URL. A failed fetch fails the build (no fallback data, rule 26).
- [ ] 2.5 Delete the dead `apps/platform/src/pages/NidusHomepage.jsx` and `apps/simulator/src/pages/NidusHomepage.jsx`, along with their lazy-import entries.

## Slice 3 — Nidus family bar on product homepages
- [ ] 3.1 Test: `NidusFamilyBar` (in `packages/ui`) shows the Nidus logo linking to the brand site plus the other active products, and hides the current product (`currentSlug` prop).
- [ ] 3.2 Add the bar to the top of `PlatformHomepage.jsx` (Platform app) and `SimulatorHomepage.jsx` (Simulator app). Nothing else on those pages changes. The bar reads `site_products` once per session, cached in sessionStorage (rule 66).
- [ ] 3.3 Record in v1239 Slice 5.3 that the Planner landing page mounts the same bar with `currentSlug="planner"`.
- [ ] 3.4 Regression: existing homepage tests in both apps still pass; manual light/dark check.

## Slice 4 — Admin editing (`E:\project-nidus-admin`, plan v210)
- [ ] 4.1 **Admin SQL v225** `site_products_admin_rpc.sql`:
  - `admin.upsert_site_product(...)`, `admin.set_site_product_active(...)`, `admin.upsert_site_content(...)`.
  - SECURITY DEFINER, restricted to Admin roles, writing `public.site_products` / `public.site_content`, with audit.
  - Documented as a narrow admin→public write exception (same style as v765/v779). Add the exception line to both CLAUDE.md files.
- [ ] 4.2 Admin "Public site products" list:
  - Sortable headers, row numbers, table/card toggle (default table), search, icon-only actions, export.
  - A routed edit page with Audit tab, unsaved-changes guard and success modal.
  - Plus a "Site content" key/value list.
  - Admin menu entry under the existing Admin content/configuration section.
- [ ] 4.3 Tests: RPC rejects non-admin callers; the edit flow updates a row; the brand site shows the change on next load.

## Slice 5 — Go-live
- [ ] 5.1 DNS/hosting: apex `<domain>` → `apps/site` build; product subdomains unchanged.
- [ ] 5.2 Smoke test: every card link, every Sign-in link, phone width, light/dark, view-source shows the prerendered content.
- [ ] 5.3 Docs:
  - `Documentation/Nidus_Brand_Site_v1241_Guide.md` (editing cards, adding a product, launch switch).
  - Blog note (rule 22).
  - ROADMAP.md entry.
- [ ] 5.4 Planner switch-on is owned by the v1239 go/no-go step (`site_products.is_active = true` for `planner`).

## Risks

| Risk | Mitigation |
|---|---|
| Domain names not final | URLs live in `site_products`; changing them needs no deploy |
| Database unavailable during build | Build fails loudly and the previous deploy stays live; no stale fallback content |
| Family bar changes product homepage layout | Slim fixed-height bar; Slice 0 snapshots allow before/after comparison |
| Admin→public write widens the Admin boundary | Narrow RPC limited to two tables, role-checked, audited, documented exception |

## Review (filled in after implementation)

Not started.
