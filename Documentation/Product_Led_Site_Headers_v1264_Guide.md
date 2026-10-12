# Product-led public headers (v1264) — guide

**PRD:** `projectprd/v1264_product_led_site_headers_PRD.md` · **Plan:** `projectplan/v1264_product_led_site_headers_plan.md` · **Admin:** `E:\project-nidus-admin\projectplans\v215_site_header_settings_admin_plan.md`

## What changed

Platform, Simulator and Planner public pages used to show **two stacked header rows**: the company header, and under it a product bar with the product's own links. Pricing appeared twice, and the two rows took up a lot of screen on phones.

Now each product has **one header row built around that product**:

```
[Project Nidus | ▦ Platform]  Features  Pricing  Docs  Affiliates  Project Nidus ▾     ☀  Sign in  [Request a demo]
```

- **The product's own links are the main menu.** Pricing here means this product's pricing.
- **Project Nidus ▾** holds everything else:
  - the other products
  - "Compare products" (pricing for all products)
  - Solutions, Resources and Company
  - sign-in links for the other products
- **Sign in** goes straight to this product's sign-in page.
- **The main button is the product's own:**
  - Platform: "Request a demo"
  - Simulator: "Start practising"
  - Planner: "Start free trial"
- **No duplicates.** If a menu link goes to the same place as the main button, the link is hidden.
- **The brand site keeps its company header,** and its "Get started" button still opens the "Which product?" chooser.

## Editing a header (Admin)

Go to **Content → Public Site Headers**. There are four headers: Brand site, Platform, Simulator and Planner. Edit one to change:

| Setting | Notes |
|---|---|
| Background, Text, Accent, Button text | Colour picker or a hex value such as `#0B1220`. Hover, border and muted tones are worked out from these. |
| Button label | Up to 40 characters. |
| Button goes to | Blank: the product's sign-up page (on the brand site, the "Which product?" chooser).<br>`/…`: a page inside the product.<br>`https://…`: another site, which opens in a new window. |
| Shown | Off: the built-in dark colours and the sign-up button. |

**Readability check.** Text on the background, and button text on the accent, must have a contrast of at least **4.5:1** (WCAG AA). The editor shows each ratio and won't save below it. The database checks the same rule.

**When it goes live.** Saving publishes straight away. The product apps show the change within about 10 minutes; the brand site shows it after its next build.

**Menu links.** Each product's menu links (Features, Docs, …) are still edited in **Public Site Pages & Menus**, under the menu "Product › <name>".

## For developers

- **Header component:** `packages/ui/src/site/NidusSiteHeader.jsx`. The layout depends on `currentProduct`: `null` gives the brand layout, otherwise the product layout.
- **Colours** are set as CSS variables (`--nh-*`) on the `<header>` and come from `headerCssVars()` in `@nidus/shared/site/siteColors.js`. Organisation branding (rule 72) cannot repaint them.
- **Data:**
  - `site_header_settings` is read by `fetchSiteChromeRows()` / `fetchSiteData()` and exposed as `chrome.headers[scope]`.
  - The cache key is `nidus:siteChrome:v2`.
  - If the table can't be read, the header uses its built-in colours and keeps its menus.
- **Main button:** `resolveHeaderCta(chrome, currentProduct)`.
- **Duplicate removal:** `productHeaderLinks(chrome, currentProduct, cta)`.

## Run order

1. Monorepo `SQL/v1264_site_header_settings.sql`, then `SQL/v1264_site_header_settings_seed.sql`. Optionally run `SQL/v1264_site_header_settings_tests.sql`: all 7 checks should PASS.
2. Re-run `SQL/v1251_planner_table_wall.sql`.
3. Admin `SQL/v233_site_header_settings_admin_rpc.sql`.

## Blog summary

> **One header per product.** Each Project Nidus product now has a single, focused header with its own menu, sign-in and main action, plus a small Project Nidus menu for the rest of the family. Fewer clicks, less clutter, more room on your phone.
