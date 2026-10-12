# v1263 — Brand site blog with document downloads (plan)

PRD: `projectprd/v1263_brand_site_blog_PRD.md` (decisions settled 2026-10-12).
Admin: `E:\project-nidus-admin\projectplans\v214_blog_posts_admin_plan.md`, SQL `v232`.
Status: **IMPLEMENTED** (approved 2026-10-12). Owner SQL run, Edge Function deploy and Privacy page pending.

## Files

| Area | New / changed |
|---|---|
| SQL (monorepo) | `SQL/v1263_site_blog.sql` (categories, posts, attachments, RLS + column grants, private bucket `site-downloads`, preview + slug-status functions, enquiry columns/topic, gated-request function, registry) · `SQL/v1263_site_blog_seed.sql` (starter categories only — no invented posts) · `SQL/v1263_site_blog_tests.sql` |
| Edge Function | `supabase/functions/site-download/index.ts` (+ `DOMAIN_MANIFEST.md` row) |
| Shared | `packages/shared/src/site/siteBlog.js` + tests |
| Brand site | `src/blog/BlogPages.jsx` (list, post, gated form, unavailable notice); `lib/routes.js` (`/blog`, `/blog/<slug>`), `lib/fetchSiteData.js` (posts, attachments, categories, preview, slug status, gated download), `App.jsx`, `pages/SitePages.jsx` (exports Markdown link handling), `scripts/prerender.mjs` (posts + BlogPosting JSON-LD + og:image), tests |
| Admin | SQL `v232`; services; `BlogPostsPage`, `BlogPostFormPage` (Markdown toolbar + preview, attachments, publishing, Audit tab), `BlogCategoriesPage`; routes; nav; Site Enquiries shows download leads |
| Docs | brand-site guide "Blog" part; CLAUDE.md exception text (both repos) |

## Slices (each end to end; tick as done)

- [x] **S1 — Read a published post.** Tables + RLS + public read; `/blog/<slug>` and `/blog`; prerender writes each post; tests.
- [x] **S2 — Admin writes posts.** v232 create / save (in place or draft) / publish / schedule / discard / archive / restore / delete-never-published; Blog Posts list + form with Markdown toolbar/preview and Audit tab; categories page; tests.
- [x] **S3 — Open attachments.** Upload to `site-assets/blog/<post>/…`; list on the post; remove/keep with cleanup on publish; tests.
- [x] **S4 — Gated attachments.** Private bucket; enquiry columns + topic; service-role-only request function; Edge Function `site-download`; site form with consent + opt-in; Site Enquiries shows downloads; SQL + unit tests.
- [x] **S5 — Preview, filters, polish.** Preview link for posts; category filter + paging; archived notice; BlogPosting JSON-LD + og:image; Privacy-page warning in Admin.
- [x] **S6 — Review.** Allow-list check; builds; lint; docs; review section.

## Owner run order

1. `v1263_site_blog.sql`
2. `v1263_site_blog_seed.sql`
3. Re-run `v1251_planner_table_wall.sql`
4. Admin `v232`
5. `v1263_site_blog_tests.sql` (all PASS)
6. `supabase functions deploy site-download`
7. Restart the site dev server.

## Risks

- Gated downloads need the Privacy page published first (Admin warns).
- The Edge Function must be deployed before gated downloads work; open downloads do not need it.
- A file uploaded and then abandoned (browser closed before the attachment row is saved) can leave an orphan file. Upload failures that the database refuses are cleaned up immediately; a periodic cleanup job is out of scope.

## Review (2026-10-12)

**Delivered:** every slice above.

**Decided during build** (implementation detail, within the PRD)
- Never-published and restored posts are edited in place, since visitors cannot see them. Live and scheduled posts get drafts.
- Open or gated is chosen at upload. Switching means uploading again, because the file must move between the public and private buckets.
- Attachment name and order changes apply immediately (presentation only).
- Restoring an archived post cancels pending attachment removals, so nothing is left half-deleted.

**Fixed along the way**
- `scripts/prerender.mjs` inserted page HTML and site data with string replacements. Content containing `$'`, `$&` or `$$` would have corrupted the built page (the same pitfall that broke v1260). Function replacers now insert content literally.

**Validation**
- Tests:
  - site 46/46 (12 new blog tests; one existing route test updated because `/blog` is now always built)
  - shared site helpers 25/25 (9 new)
  - `@nidus/ui` site 8/8
  - planner 13/13
  - Admin public-site services 33/33 (10 new)
- SQL tests T1–T9 in `v1263_site_blog_tests.sql` cover:
  - published-only visibility
  - the draft column and gated file paths are hidden from anon
  - anon cannot call the gated-download function
  - the service role records the lead and gets the path
  - open-document and bad-email refusals
  - slug status
  - anon cannot write posts
- Planner allow-list `--check` passes (blog tables are not read by the Planner). Drift check is clean. Lint is clean.
- Builds: site client and SSR bundles, Admin content module.
- The full site build (prerender) needs v1263 in the database first.

**Notes**
- The Admin article preview reuses Admin's sanitising Markdown viewer, which only has dark styles. The preview pane is therefore a dark canvas in both themes.
- A stray empty file `E:\tmp_unused` was created by a mistyped command during the build. A safety check blocked its removal; the owner can delete it.
