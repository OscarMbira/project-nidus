# Nidus brand site (v1241) — operator and developer guide

Plan: `projectplan/v1241_nidus_brand_site_plan.md` · PRD: `projectprd/v1241_nidus_brand_site_PRD.md`
Admin side: `E:\project-nidus-admin\projectplans\v210_public_site_products_admin_plan.md`

## What it is

One public front door at the apex domain (`<domain>`) for the Nidus product family. Each product
keeps its own landing page and sign-in on its subdomain:

| Address | Page |
|---|---|
| `<domain>` | Brand site (`apps/site`): product cards, short brand copy, a "Sign in" menu |
| `platform.<domain>` | Platform homepage + sign-in |
| `simulator.<domain>` | Simulator homepage + sign-in |
| `planner.<domain>` | Planner landing + trial sign-up + sign-in (v1239) |

Product homepages show a slim **Nidus family** bar (logo → brand site, links to the other products).
The Admin app is never listed.

## Editing content (no deploy needed)

Admin → Content & Localization → **Public Site Products**:

- **Product cards:** name, tagline, description, audience, landing / sign-in / sign-up URLs, icon, accent
  colour, card order, and "Shown on public site". Hiding a card never deletes it.
- **Brand copy:** `hero.heading`, `hero.subheading`, `connect.heading`, `connect.body`, `meta.title`,
  `meta.description`, `footer.tagline`, and `brand.url` (the brand site address the shared header/footer link to).

Changes show on the live brand site straight away, because the page refreshes its data after
loading. Search engines read the prerendered HTML, so run the `app-site` workflow (or redeploy)
when they should see an edit too.

## Before go-live

1. Run SQL, in this order:
   - monorepo `SQL/v1241_site_products_and_content.sql`
   - monorepo `SQL/v1241_site_products_and_content_seed.sql`
   - Admin `SQL/v225_site_products_admin_rpc.sql`
2. In Admin, replace the seeded local-dev URLs (`http://localhost:5173/…`) with the production URLs,
   and set `brand.url`.
3. Point the apex domain at the `apps/site` build. Add the `SITE_VERCEL_PROJECT_ID` secret for
   `.github/workflows/app-site.yml`.
4. Smoke test:
   - every card link and every Sign-in link;
   - phone width, light and dark;
   - "view source" shows the product names.

## Planner launch

The Planner card is seeded hidden. At the v1239 go/no-go, switch it on in Admin (Show) at the same
time as `admin.feature_flags.planner_public_signup`.

## Affiliate links

`<domain>/?ref=CODE` passes the code through to every product link. The product's own landing page
records the click (browser storage is per subdomain, so the brand site does not store it).

## For developers

- `apps/site`: Vite + React. It uses no Supabase client; it reads the two tables through the REST
  endpoint with the anon key. See `apps/site/DEV_APP.md`.
- **Build:** `vite build`, then an SSR build of `src/entry-server.jsx`, then
  `scripts/prerender.mjs`, which writes the HTML, data and meta tags into `dist/index.html`. If
  the data cannot be read, the build fails and the previous deploy stays live (no fallback content,
  rule 26).
- **Shared header/footer (Amendment A):** `packages/ui/src/site/` (`NidusSiteHeader`, `NidusSiteFooter`,
  `GetStartedChooser`, `PublicSiteChrome`), fed by `@nidus/shared/site/siteChrome.js` (10-minute sessionStorage
  cache). The NidusFamilyBar was replaced by it.
- **Reference copy** of the homepages before the family bar: git tag `v1241-homepages-before`, and
  `Documentation/Archive/v1241_homepage_snapshot/`.

## Amendment A — Shared header, footer and common pages

**What visitors see**
- The brand site, Platform, Simulator and Planner public pages all show the same header:
  **Products ▾ · Solutions ▾ · Pricing · Resources ▾ · Company ▾**, plus theme, **Sign in ▾** and **Get started**.
- **Get started** asks "Which product?".
- On a phone the four groups fold into one menu. Theme, Sign in and Get started stay visible.
- Links into another app open in a new browser window.
- Inside a product, a small bar under the header shows that product's own pages (Features, Pricing, Documentation …).
- The footer has brand and product, Solutions, Resources, Company and Legal columns.

**Common pages live only on the brand site**
- Pages: About, Contact, Blog, Resources, Solutions/*, Terms, Privacy.
- The old `/about`, `/contact`, `/blog` and `/resources` addresses in Platform and Simulator now forward to the brand site.

**Where the content comes from**

| Table (SQL v1260) | Holds |
|---|---|
| `site_nav_links` | header dropdowns, footer columns, product bars (`product_<slug>`) |
| `site_pages` | page title, summary, Markdown body; hidden pages and links to them are not shown |
| `site_products.pricing_url` / `docs_url` | Pricing comparison and Resources ▾ documentation links |
| `site_enquiries` | Contact-form messages, written only through `site_submit_enquiry()` |

**Editing (Admin → Content & Localization → Content)**
- **Public Site Products:** product cards, including the Pricing and Documentation URLs.
- **Public Site Pages & Menus:** pages and menu links.
- **Site Enquiries:** Contact messages. Reply by email and set the status.

**When changes show**
- **Brand site:** visitors see changes on their next page load (the site reloads its data in the
  browser). The prerendered HTML that search engines read updates on the next site build.
- **Platform / Simulator / Planner:** within about 10 minutes (header cache).

**Run order:** monorepo `SQL/v1260_site_nav_pages_and_enquiries.sql` → `..._seed.sql` → re-run `SQL/v1251_planner_table_wall.sql` → Admin `SQL/v230_site_nav_pages_enquiries_admin_rpc.sql`.

## v1262 — Marketing sections (homepage and Solutions pages)

**What visitors see**
- The homepage and the three Solutions pages are built from sections, top to bottom.
  - Hero with Get started (opens the product chooser) and Book a demo (Contact, topic Sales).
  - Value points, product cards, feature highlights, how it works, Solutions by audience.
  - Pricing teaser (no prices), FAQ, and a final call-to-action band.
- The trust strip and testimonials exist but stay hidden until real logos, figures or quotes are added.
- A page without published sections keeps its Markdown text. This applies to About, Contact, Blog, Resources, Terms and Privacy.
- FAQ sections also go into the page as `FAQPage` structured data for search engines.

**Where it is stored** (SQL `v1262_site_sections.sql`)

| What | Where |
|---|---|
| Sections | `public.site_sections`: one row per section, 11 types; buttons and item lists stored as JSON |
| Unpublished changes | the row's `draft` column. Visitors cannot read it; that column is not granted to anon. |
| Preview links | `public.site_preview_tokens`: hashes only, 60 minutes |
| Images | public bucket `site-assets`: PNG/JPG/WebP/SVG, up to 2 MB |

**Button links**

| Link | Does |
|---|---|
| `#get-started` | opens the product chooser |
| `#<section key>` | scrolls to that section |
| `/…` | a brand-site page |
| `https://…` | another app, opens in a new window |

**Editing (Admin → Content & Localization → Content → Site Sections)**
1. Pick the page.
2. Edit a section (text, buttons, image, item table). **Save draft**.
3. Reorder, show or hide, or add sections. These are drafts too.
4. **Preview drafts** opens the brand site with a 60-minute preview link and a yellow "Preview" banner.
5. **Publish** makes all of that page's drafts live in one step. Every action is in the Admin audit log.

**Starter copy.** The v1262 seed puts every section in as a draft. The homepage keeps its old look until you publish it in Admin.

**Run order:** `v1262_site_sections.sql` → `v1262_site_sections_seed.sql` → re-run `v1251_planner_table_wall.sql` → Admin `v231_site_sections_admin_rpc.sql` → `v1262_site_sections_tests.sql` (all PASS).

## v1263 — Blog with document downloads

**What visitors see**
- `/blog` lists published articles, newest first.
  - Each card shows a cover image, category, title, summary, author and date.
  - Readers can filter by category. The list shows 12 articles per page.
  - With no articles yet, the Blog page's own text is shown instead.
- `/blog/<address>` shows one article and its **Downloads**.
  - **Open** documents download straight away.
  - **Email-required** documents show a short form: name, email, optional organisation, and an unticked "Send me Project Nidus news" box. A consent notice links to the Privacy page.
  - After the form, the visitor gets a download link that works for 5 minutes.
- An archived article's address shows "This article is no longer available".
- Search engines get each article's title, description and share image, plus `BlogPosting` structured data.

**Editing (Admin → Content & Localization → Content)**
- **Blog Posts**
  - Use **New Post**, fill in title, summary, category, author and cover image, write the article, then **Save**.
  - The article editor has a toolbar and a Preview tab. The **Image** button uploads an image and places it in the text.
  - **Downloads:** pick a file (PDF, Word, Excel, PowerPoint, text, CSV or image; up to 10 MB), give it a name, and tick "Require email" if needed.
  - **Preview** shows the article on the real site.
  - **Publish** makes it live now. Set a **Publish date** in the future to schedule it instead.
  - After publishing, edits and download changes are drafts until you click **Publish changes**. **Discard changes** returns to the published version.
  - **Archive** takes an article off the site; **Restore** brings it back as a draft.
  - Only drafts that were never published can be deleted.
  - The address (`/blog/…`) is locked once published, so shared links keep working.
- **Blog Categories:** add, rename, reorder and hide the categories readers filter by.
- **Site Enquiries:** each email-required download appears with topic *download*, the document name, and whether the visitor opted in to news (with the date).

**How downloads are protected**
- Open files are in the public bucket `site-assets`.
- Email-required files are in the **private** bucket `site-downloads`, so their storage address does not work on its own.
- The `site-download` Edge Function checks the form through `site_record_gated_download` (service role only). It records the lead and returns a signed 5-minute link. Limit: 10 downloads per email per hour.
- Publish the **Privacy** page before using email-required downloads publicly. Admin shows a warning until it is published.

**Run order:**
1. `v1263_site_blog.sql`
2. `v1263_site_blog_seed.sql` (5 starter categories, no posts)
3. Re-run `v1251_planner_table_wall.sql`
4. Admin `v232_blog_posts_admin_rpc.sql`
5. `v1263_site_blog_tests.sql` (all PASS)
6. `supabase functions deploy site-download`
7. Restart the site dev server.
