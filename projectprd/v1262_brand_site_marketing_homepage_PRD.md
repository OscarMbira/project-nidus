# v1262 — Brand site marketing homepage and Solutions pages

Status: APPROVED 2026-10-12 and implemented — see the plan
`projectplan/v1262_brand_site_marketing_homepage_plan.md`.
Builds on v1241 (brand site) and its Amendment A (shared header/footer, SQL v1260, Admin v212/v230).
Admin side: plan `E:\project-nidus-admin\projectplans\v213_site_sections_admin_plan.md`, SQL `v231`.

## a) Problem statement

The brand site homepage (`apps/site`) is a heading, three product cards and one paragraph. It
works as a directory but not as the front door of a SaaS company. A visitor who does not yet know
which product they need gets no reason to stay: there is no clear value statement, no feature
overview, no path for buyers who want a demo, and no answers to common questions. The three
Solutions pages (PMOs, project teams, training) are plain Markdown text with the same weakness.

The usual marketing layout (hero, value points, features, how it works, social proof, FAQ,
call to action) is missing. Because rule 25.1 forbids hard-coded copy, it must also be editable
in Admin without a code deploy, and because the page is public, edits must not go live
half-finished.

## b) Solution

A **section-based page**: each page is an ordered list of sections, each of one of 11 known
types, stored in one table (`site_sections`). The brand site renders the homepage and the three
Solutions pages from these sections. Pages without sections (About, Contact, Blog, Resources,
Terms, Privacy) keep their Markdown body.

The homepage sells the product family and helps the visitor choose; each product's own landing
page keeps the detail. Sections that need real proof (trust strip, testimonials) ship hidden and
are switched on only when real content exists.

Admins edit sections in a new Admin screen. Edits save as **drafts**; admins **preview** drafts on
the real brand site through a short-lived preview link, then **publish** all drafts of a page in one
step. Images are uploaded from Admin into a public Storage bucket.

### Section types (11)

| Type | Shows |
|---|---|
| `hero` | headline, value statement, primary + secondary button, image |
| `trust_strip` | customer logos and/or headline figures (hidden until real) |
| `value_points` | 3–4 problem → value points |
| `product_cards` | the existing product cards from `site_products` (no copy of their data) |
| `feature_grid` | 4–6 feature cards (icon, title, text) |
| `steps` | "How it works / grow with you" numbered steps |
| `audience_links` | Solutions by audience: cards linking to pages |
| `testimonials` | real quotes (name, role, organisation, optional photo) — hidden until real |
| `pricing_teaser` | text + "Compare plans" button, **no prices** |
| `faq` | question/answer list (+ FAQ structured data for search engines) |
| `cta_band` | full-width call to action before the footer |

## c) User stories

Visitor — homepage

1. As a visitor, I see a hero with a clear headline, a one-line value statement, a "Get started" button and a "Book a demo" button.
2. As a visitor, "Get started" opens the existing "Which product?" chooser.
3. As a visitor, "Book a demo" opens the Contact page with the topic already set to Sales.
4. As a visitor, I see 3–4 value points that explain the problems Nidus solves.
5. As a visitor, I see the three product cards (from `site_products`), each linking to its product in a new window.
6. As a visitor, I see a feature grid of cross-product strengths.
7. As a visitor, I see how Planner, Platform and Simulator connect (numbered steps).
8. As a visitor, I see links to Solutions pages for PMOs, project teams and training.
9. As a visitor, I see a pricing teaser with no prices and a "Compare plans" button to the Pricing page.
10. As a visitor, I can expand FAQ answers one at a time, with the keyboard as well as the mouse.
11. As a visitor, I see a final call-to-action band with the same two buttons as the hero.
12. As a visitor, I never see a trust strip or testimonials section unless an admin has published it with real content.
13. As a visitor, every section reads well in light and dark mode; the header and footer stay dark.
14. As a visitor on a phone, every section stacks to one column with no horizontal scrolling.
15. As a visitor, images have alt text, and sections without an image still look complete (icon/illustration).

Visitor — Solutions pages

16. As a visitor, `/solutions/pmo`, `/solutions/project-teams` and `/solutions/training` show section pages (hero, value points or features, FAQ, call to action) instead of plain text.
17. As a visitor, About, Contact, Blog, Resources, Terms and Privacy look as they do today.

Search engines and performance

18. As a search engine, I receive the full published homepage and Solutions pages in the prerendered HTML.
19. As a search engine, I receive FAQ structured data (`FAQPage` JSON-LD) on pages with an FAQ section.
20. As a visitor, the page shows its published content as soon as it loads, and refreshes to the latest published content in the browser.

Admin — editing

21. As an admin with `system.public_site.view`, I can open **Site Sections** in Admin and pick a page (Home, each Solutions page).
22. As an admin, I see the page's sections in order with type, heading, shown/hidden and "draft changes" status.
23. As an admin with `system.public_site.edit`, I can edit a section's heading, intro text, buttons, image and items.
24. As an admin, I edit repeating items (features, steps, FAQ entries, logos, quotes, value points, audience links) as a table: add, edit, delete (with confirmation) and move up/down.
25. As an admin, I can reorder sections.
26. As an admin, I can show or hide a section; hiding never deletes it.
27. As an admin, I can add a new section of any of the 11 types to a page.
28. As an admin, I can upload an image (PNG, JPG, WebP or SVG, up to 2 MB) and set its alt text.
29. As an admin, invalid input is refused with a clear message (e.g. a button without a link, a link that is not `/…` or `https://…`, an FAQ entry without an answer).

Admin — drafts, preview, publish

30. As an admin, saving a section stores my changes as a draft; visitors still see the published version.
31. As an admin, I can leave and come back later; my draft is still there (rule 37).
32. As an admin, I can discard a section's draft and return to the published version.
33. As an admin, "Preview drafts" opens the brand site page showing drafts, through a link that works for 60 minutes.
34. As a visitor without that link, I can never see drafts.
35. As an admin, "Publish" makes every drafted section of that page live in one step and asks me to confirm first.
36. As an admin, publish, discard, reorder, show/hide, add and image upload are recorded in the Admin audit log.
37. As an admin, each section has an Audit details tab (Identity, Classification, Record history).

## d) Implementation decisions (settled 2026-10-12)

- **Scope:** all 11 section types; trust strip and testimonials seeded hidden. Homepage **and** the three Solutions pages in this release.
- **Data model:** one table `public.site_sections` — `page_slug` (`home` or a `site_pages` slug), `section_key` (unique per page), `section_type` (one of 11), published fields (`heading`, `subheading`, `body`, `primary_cta`, `secondary_cta`, `image_url`, `image_alt`, `items` JSONB list), `draft` JSONB (null when no draft), `sort_order`, `is_active`, `published_at/_by`, audit columns. Repeating items live in `items` (JSONB array) — one Admin screen, not one table per type.
- **Rendering rule:** a page with at least one active published section renders sections; otherwise its Markdown body. `product_cards` reads `site_products` (no duplicate data).
- **Images:** public Storage bucket `site-assets`; upload only by admins holding `system.public_site.edit` (storage policy via a SECURITY DEFINER check); PNG/JPG/WebP/SVG, ≤ 2 MB; alt text required when an image is set.
- **Publishing:** draft → preview → publish. Preview uses a token minted by an Admin RPC (60-minute expiry, stored hashed); the site calls a SECURITY DEFINER function with that token to read drafts. Publish copies each draft into the published columns for the whole page in one transaction. Visitors (anon) can read only published, active rows.
- **Live content:** the brand site already reloads site data in the browser; it will reload sections too. The prerendered HTML (for search engines) updates on the next site build. (Corrects earlier wording that edits appear "only after the next build".)
- **Hero buttons:** "Get started" → product chooser; "Book a demo" → `/contact?topic=sales` (Contact page reads `topic`). Changeable in Admin, e.g. to the v1261 live demo when it ships.
- **Pricing teaser:** text + "Compare plans" link, no figures.
- **Admin power:** edit, reorder, show/hide, add from the 11 types; no hard delete; new layouts need code.
- **No invented content (rules 25/26):** seed copy is drafted from existing product descriptions for the owner to approve; no logos, figures or testimonials are seeded as visible; nothing falls back to built-in copy when the database is unreachable (the site shows its existing load notice).
- **Theme:** sections follow light/dark (rule 28.1); header/footer stay dark (owner decision 2026-10-12).
- **Planner wall:** `site_sections` is read by the shared site chrome path only on the brand site; it is added to the Planner allow-list only if a Planner screen reads it (it does not), and v1251 is re-run so the new table is walled.

## e) Testing decisions

- **Site (vitest + RTL):** one test per section type (renders heading/items; hidden types render nothing); page renders sections when present and Markdown otherwise; hero buttons (chooser, `/contact?topic=sales`); Contact preselects `topic`; FAQ keyboard toggle; FAQ JSON-LD output; preview mode shows drafts only with a token.
- **Data helpers (`packages/shared/src/site`):** section mapping (draft vs published), CTA link resolution, validation of items per type.
- **Admin (vitest):** service calls send no admin id; validators per section type; publish/discard call the right RPCs.
- **SQL:** a test script (v1262 test vectors) proving anon reads only published active rows, the preview function rejects bad/expired tokens, publish moves drafts, non-admins cannot write or upload. Ends with a SELECT report.
- **Builds:** site full build (prerender of home + 3 Solutions pages from sections), Admin content module.
- **Done** = all of the above pass, the owner previews and publishes the seeded copy, and the homepage shows all non-gated sections in both themes and on a phone.

## f) Out of scope

- Real customer logos, figures and testimonials (owner supplies later; sections exist, hidden).
- About, Contact, Blog, Resources, Terms, Privacy as section pages (stay Markdown).
- Live prices on the homepage.
- A/B testing, analytics or click tracking beyond the existing referral code.
- Translations of brand-site copy (UI i18n is deferred).
- A 12th section type or a free-form page builder.
- Scheduled publishing.

## g) Further notes

- Section copy and images are public marketing content, so the seed is idempotent and never overwrites Admin edits on re-run.
- v1261 (shared Platform demo) will want a "Try the live demo" button; that is an Admin edit of the hero/CTA buttons, not code.
- Product screenshots should be real captures of the current UI; originals go in `Design Images/brand-site/` and uploads go to `site-assets`.
