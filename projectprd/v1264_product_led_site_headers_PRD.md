# v1264 — Product-led public headers (per-product header settings) — PRD

**Status:** decisions agreed and plan approved by the owner 2026-10-12; implemented.
**Supersedes:** v1241 Amendment A decisions A-D2 (header layout on product pages), A-D3 (same header everywhere) and the "Get started → chooser everywhere" behaviour. A-D4 (one shared component), A-D5 (mobile), A-D6 (data-driven) still apply.
**Apps:** brand site (`apps/site`), Platform, Simulator and Planner public pages; Admin (header editor). Shared code: `packages/ui/src/site/`, `packages/shared/src/site/`.

## a) Problem statement

The Platform, Simulator and Planner public pages show **two stacked header rows**: the company header (Products ▾ · Solutions ▾ · Pricing · Resources ▾ · Company ▾) and, under it, the product bar (Project Nidus Platform · Features · Pricing · Documentation · Request a demo · Affiliates).

- **Pricing appears twice** with two different meanings: all-products pricing on top, product pricing below.
- The product name repeats the logo directly above it.
- Both rows are sticky, so they take about 120px on every scroll, which is a lot on phones (rule 29).
- The three products serve **different audiences** (PMOs and enterprise buyers / learners / small teams). Each needs its own first links, its own call to action and its own look. One company-led header serves none of them well.

## b) Solution

Keep **one shared header component** that takes **one configuration per site**:

- **Product pages use a product-led header in one row.** The product's name and icon come first and its own links are the main nav. A small **Project Nidus ▾** switcher holds the other products, all-products pricing, Solutions, Resources and Company.
- **The brand site keeps the company-led layout** and the "Which product?" chooser.
- **Each of the four headers (Brand, Platform, Simulator, Planner) has its own settings,** edited in Admin with a live preview: background, text and accent colours, CTA label and CTA target.

## c) User stories

1. As a visitor on a Platform/Simulator/Planner public page, I see a single header row, not two.
2. As a visitor on a product page, the product's name and icon appear next to the Project Nidus wordmark, and its own links (Features, Pricing, Docs …) are the main nav.
3. As a visitor on a product page, **Pricing** goes to that product's pricing only.
4. As a visitor on a product page, I can open **Project Nidus ▾** to reach:
   - the other products (with their sign-in links)
   - "Compare products" (brand-site pricing)
   - Solutions, Resources and Company links
5. As a visitor on a product page, **Sign in** is a plain link straight to this product's sign-in, not a dropdown.
6. As a visitor on a product page, the primary button shows this product's own CTA (e.g. Platform "Request a demo", Simulator "Start practising", Planner "Start free trial") and goes to its configured target.
7. As a visitor, a product nav link that points to the same URL as the CTA is hidden, so the action does not appear twice.
8. As a visitor on the brand site, the header keeps today's company-led layout and "Get started" still opens the "Which product?" chooser.
9. As a visitor, each header uses its configured background, text and accent colours, in both light and dark page modes. The header does not switch with the page theme (one colour set per header).
10. As a visitor, the header's dropdown menus and mobile menu use the header's own colours, so they stay readable.
11. As a phone visitor on a product page:
    - The logo, product name, theme toggle, Sign in and CTA stay visible.
    - ☰ opens the product links first, then a "Project Nidus" section (other products and company links).
12. As a keyboard / screen-reader user:
    - Menus are buttons with `aria-expanded`.
    - Escape and outside click close them.
    - Links into another app open in a new window and say so (unchanged from A-D4).
13. As an Admin with `system.public_site.edit`, I can open **Header settings** and see four entries: Brand site, Platform, Simulator, Planner.
14. As an Admin, I can edit:
    - background colour
    - text colour
    - accent colour
    - CTA text colour
    - CTA label
    - CTA target URL (blank = the product's sign-up URL; on the brand site, blank = open the chooser)
15. As an Admin, I see a **live preview** of the header while editing.
16. As an Admin, **Save is blocked** if text on the background, or CTA text on the accent, is below a WCAG AA contrast ratio of 4.5:1. The editor shows the ratio next to each pair.
17. As an Admin, Save publishes immediately. I get the shared success-confirmation modal (rule 16), and the change is audited.
18. As an Admin, invalid hex values are rejected by both the editor and the database.
19. As a visitor, if a header's settings row is missing or cannot be read, the header renders with today's built-in neutral chrome colours and the product's sign-up as the CTA. No invented menus or content (rules 25.1/26: colours are presentation chrome, not content).
20. As the owner, product apps pick up a saved change within about 10 minutes (existing chrome cache), and the brand site on its next build.

## d) Implementation decisions

| # | Decision |
|---|---|
| D1 | One shared `NidusSiteHeader` with two layouts: `brand` (company-led, as today) and `product` (product-led, one row). Layout is chosen by `currentProduct` (null → brand). |
| D2 | Product header CTA comes from settings. The chooser is used on the brand site only. |
| D3 | Product header Sign in is a direct link to that product's `sign_in_url`. Other products' sign-ins are in the Project Nidus ▾ switcher. |
| D4 | Full per-header theming: background, text, accent and CTA-text hex colours. |
| D5 | Colours are set as hex values (colour picker + hex field) and saved only if text/background and CTA text/accent are ≥ 4.5:1. This is checked in the Admin UI **and** in the save RPC. |
| D6 | One colour set per header, used in both page themes (keeps the 2026-10-12 "header ignores page theme" decision). Hover, muted and border tones are derived from the configured colours, not configured separately. |
| D7 | The brand site gets the same editor and its own settings row. |
| D8 | De-duplication is automatic:<br>• in a product header, "Pricing" means product pricing; brand pricing appears in the switcher as "Compare products"<br>• a nav link whose URL equals the CTA URL is hidden |
| D9 | Mobile follows A-D5: product links, then a Project Nidus section, inside ☰; Sign in and CTA stay visible. |
| D10 | Save = live (no draft/publish), with live preview, audited. |
| D11 | Seed values: today's colours (bg `#030712`, text `#D1D5DB`) for all four; accents Brand/Platform `#2563EB`, Simulator `#15803D` (green-700; white on green-600 `#16A34A` is only 3.3:1 and fails D5), Planner `#7C3AED`, CTA text `#FFFFFF`.<br>CTAs: Brand "Get started" (chooser), Platform "Request a demo" → `/platform/request-demo`, Simulator "Start practising" → sign-up, Planner "Start free trial" → sign-up. |
| D12 | Storage: new table `public.site_header_settings`, one row per `scope_slug` (`brand` or a `site_products.slug`). `scope_slug` is the friendly key (rule 16.3), so there's no Admin ID Generation reference column (rule 16.2 does not apply). Anonymous visitors can read active rows. There are no client write policies. Writes go only through a new Admin SECURITY DEFINER RPC gated by `system.public_site.edit`, which extends the CLAUDE.md 34.5 v1241 narrow write exception (CLAUDE.md line updated in the same change). |
| D13 | Read path: `site_header_settings` is added to `fetchSiteChromeRows()` (same REST + anon key, same 10-minute sessionStorage cache; cache key bumped to `v2`). `buildSiteChrome()` exposes `headers[scope]`. |
| D14 | Colours are applied through CSS custom properties on the header element (inline `style`), not Tailwind classes. The class-based branding override (rule 72) cannot repaint them, and arbitrary hex needs no Tailwind safelist. |
| D15 | The footer is unchanged. |

## e) Testing decisions

- **Pure unit tests** (`packages/shared/src/site`):
  - `contrastRatio()` / `meetsAA()` against known pairs
  - `buildSiteChrome()` exposes header settings and handles a missing row
  - de-duplication helper (CTA-URL match, product Pricing vs brand pricing)
- **Component tests** (`packages/ui/src/site/__tests__/NidusSiteHeader.test.jsx`):
  - brand layout unchanged (chooser opens)
  - product layout renders one row, the product's CTA label/target, direct Sign in, and a Project Nidus ▾ switcher with other products and company links
  - duplicate CTA link hidden
  - CSS variables set from settings
  - fallback without settings
  - mobile menu content
- **SQL test** (`SQL/v1264_site_header_settings_tests.sql`):
  - hex CHECK rejects bad values
  - anonymous visitors can read only active rows and cannot write
  - the RPC rejects low-contrast pairs and callers without permission
- **Admin**: service unit tests for the new RPC wrappers; the editor test covers contrast blocking and the preview.
- **Done means:**
  - all the above pass
  - Platform, Simulator, Planner and site builds pass
  - `check-shared-drift --enforce` is clean
  - the Planner allow-list `--check` is up to date
  - light/dark toggled manually on all four sites shows a single readable header row

## f) Out of scope

- Footer per-product customisation.
- Per-product logo uploads (the Project Nidus wordmark stays).
- Draft/publish workflow and version history for header settings.
- Signed-in app chrome (sidebar/top bar inside the apps). This PRD covers public pages only.
- Fixing the pre-existing client-supplied `p_admin_user_id` pattern in Admin RPCs (tracked in Admin plan v210). The new RPC follows the existing pattern.

## g) Further notes

- `site_nav_links` `product_planner` currently has only "Pricing". The owner can add Planner links in the existing Pages & Menus editor; nothing new is needed for that.
- After the SQL is applied: re-run `SQL/v1251_planner_table_wall.sql` (CLAUDE.md DB rule 6), and regenerate the Planner allow-list because the Planner public pages read the new table.
- `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` is not affected (no `menu_items` change).
