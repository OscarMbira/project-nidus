# v1263 — Brand site blog with document downloads

Status: APPROVED 2026-10-12 and implemented — see the plan
`projectplan/v1263_brand_site_blog_plan.md`.
Builds on v1241 (brand site), Amendment A (site_pages, site_enquiries, Admin v212/v230) and v1262
(sections, draft → preview → publish, `site-assets` bucket, preview tokens).
Admin side: plan `E:\project-nidus-admin\projectplans\v214_blog_posts_admin_plan.md`, SQL `v232`.

## a) Problem statement

The brand site's Blog is a single Markdown page. An admin cannot upload documents, every article
has to be written into that one block of text, articles have no address of their own, and adding,
replacing or removing an article means hand-editing the whole page. There is no way to offer a
guide or checklist for download, and no way to capture interested visitors when they download one.

## b) Solution

A proper blog:

- **Posts** — article (title, summary, Markdown body, cover image, author name/role, category,
  publish date) with **optional document attachments**.
- **Admin → Blog Posts** — create, edit, preview, publish now or on a future date, archive,
  restore; upload / replace / remove attachments; delete only never-published drafts.
  **Admin → Blog Categories** — the category list readers filter by.
- **Brand site** — `/blog` lists published posts newest first with category filter and paging;
  `/blog/<slug>` shows one post with its downloads; archived posts show "no longer available".
- **Downloads** — open by default. A document can be marked **email-gated**: the visitor gives
  name and email (organisation optional, separate unticked marketing opt-in), the request is
  recorded in **Site Enquiries** (topic *Download*), and a short-lived download link is returned.
  Gated files live in a **private** bucket so they cannot be fetched without the form.

## c) User stories

Visitor — reading

1. As a visitor, `/blog` lists published posts newest first: cover image, title, summary, category, author, date.
2. As a visitor, I can filter the list by category and page through it (12 posts per page).
3. As a visitor, `/blog/<slug>` shows the full article with its downloads.
4. As a visitor, a post scheduled for a future date does not appear until that date.
5. As a visitor, an archived post's address shows "This article is no longer available" with a link back to the blog (no error page).
6. As a visitor, posts read well in light and dark mode and on a phone.

Visitor — downloading

7. As a visitor, an open document downloads straight away; I see its name, type and size first.
8. As a visitor, a gated document shows a short form: name*, email*, organisation, an unticked "Send me Project Nidus news and product updates" box, and a notice explaining the use of my details with a link to the Privacy page.
9. As a visitor, after a valid form I receive a download link that works for 5 minutes.
10. As a visitor, invalid input is refused with a clear message; too many requests from one email in an hour are refused politely.
11. As a visitor, a gated file's storage address cannot be used to download it without the form.

Search and sharing

12. As a search engine, `/blog` and every published post are prerendered with title, description, Open Graph image and `BlogPosting` structured data.

Admin — posts

13. As an admin with `system.public_site.view`, I can open **Blog Posts**: a table with search, category and status filters (Draft, Scheduled, Published, Archived), Card/Table toggle, row numbers and export.
14. As an admin with `system.public_site.edit`, I can create a post: title, slug (suggested from the title, editable), summary, body, cover image (+ alt text), author name, author role, category, publish date.
15. As an admin, I write the body in Markdown with a toolbar (heading, bold, italic, bullet list, numbered list, link, image, quote) and a Preview tab.
16. As an admin, I can upload attachments (PDF, DOCX, XLSX, PPTX, TXT, CSV, PNG, JPG, WebP; up to 10 MB each), give each a display name, mark it gated or open, reorder, replace and remove them.
17. As an admin, saving stores a draft; I can leave and continue later (rule 37).
18. As an admin, "Preview" opens the post on the brand site with a 60-minute preview link.
19. As an admin, "Publish" makes the post live now, or on the publish date if it is in the future (status Scheduled).
20. As an admin, editing a published post saves a draft of the changes; visitors keep seeing the published version until I republish.
21. As an admin, "Archive" takes a post off the site and "Restore" brings it back as a draft.
22. As an admin, I can permanently delete a post only if it was never published (with confirmation); its files are removed too.
23. As an admin, removed or replaced attachment files are deleted from storage when the change is published (or when a never-published draft is deleted).
24. As an admin, every create, save, publish, schedule, archive, restore, delete and upload is in the Admin audit log; each post has an Audit details tab.
25. As an admin, the address of a post (slug) is unique; changing it after publishing is refused (it would break shared links).

Admin — categories and leads

26. As an admin, **Blog Categories** lets me add, rename, reorder and hide categories; a category used by posts cannot be deleted, only hidden.
27. As an admin, gated downloads appear in **Site Enquiries** with topic *Download*, the document and post names, and whether the visitor opted in to marketing (with the date).

## d) Implementation decisions (settled 2026-10-12)

- **Content:** article + optional downloads. **Editor:** Markdown + toolbar + preview (no new editor library; the site already renders Markdown safely, no raw HTML).
- **Files:** PDF, DOCX, XLSX, PPTX, TXT, CSV, PNG, JPG, WebP; 10 MB; no executables/archives/HTML/SVG for attachments. Open files → public bucket `site-assets` (path `blog/…`); **gated files → private bucket `site-downloads`**.
- **Grouping:** one category per post from `site_blog_categories` (Admin-maintained, rule 25.1).
- **Lifecycle:** draft → preview → publish now / scheduled (`published_at` in the future, visible when reached); edits to a live post are drafts; archive/restore; hard delete only for never-published drafts. Slug locked after first publish.
- **Author:** typed name + optional role; the acting admin is recorded only in audit columns.
- **Gated downloads:** name + email required, organisation optional, separate unticked marketing opt-in recorded with timestamp; lead stored in `site_enquiries` (new topic `download`, new columns for document/post and opt-in); a new Edge Function `site-download` validates the request through a service-role-only SQL function and returns a 5-minute signed URL. Rate limit: 10 gated downloads per email per hour.
- **Privacy page:** the notice links to `/privacy`. The Privacy page is currently inactive; Admin shows a warning on any gated document while the Privacy page is not published, and the link is hidden on the site until it is.
- **Data:** `site_blog_posts` (published columns + `draft` JSONB like v1262, `status` derived from published_at/archived_at), `site_blog_attachments` (post, display name, file path, bucket, mime, size, gated, sort, draft flag), `site_blog_categories`. Anon reads published, active, due posts (RLS `published_at <= now() AND archived_at IS NULL`) and never the draft column; anon reads attachment rows of visible posts but **never the storage path of gated files** (column-level grant + a view or RPC for the download list).
- **Preview:** reuses `site_preview_tokens` (v1262) via a new `site_preview_blog_post(token, slug)` function.
- **Routing:** `/blog` (list) and `/blog/<slug>` (post) are built-in routes; the existing `site_pages` row `blog` keeps supplying the page title/intro. Prerender writes every published post.
- **Admin lists** follow Admin rules 12/12.1 (sortable headers; default sort title A→Z then created — documented exception: Blog Posts defaults to newest publish date first because it is a publication list) and the Card/Table toggle, row numbers and export.

## e) Testing decisions

- **Shared helpers (`packages/shared/src/site/siteBlog.js`):** post visibility (scheduled/archived), slug rules, attachment type/size rules, list filtering/paging, `BlogPosting` JSON-LD.
- **Site:** list (newest first, category filter, paging), post page, archived notice, open download link, gated form validation + success with mocked function, preview mode, prerender paths.
- **SQL tests (`v1263_site_blog_tests.sql`):** anon sees only due published posts; never the draft column; never gated file paths; future posts hidden; archived hidden; gated-request function refuses bad input and rate-limits; not callable by anon directly.
- **Edge Function:** request validation and response shape (unit-tested helper), deployed by the owner.
- **Admin:** services (no admin id sent), validators, slug suggestion, upload type/size checks.
- **Builds:** site full build (prerender includes posts), Admin content module.

## f) Out of scope

- Comments, likes, newsletters/RSS, full-text search across post bodies (title/summary search only).
- Emailing the download link (it is returned on screen).
- Multiple authors per post, author profile pages, multi-language posts.
- A "latest posts" homepage section (could be a later 12th section type).
- Analytics of downloads beyond the enquiry record.

## g) Further notes

- The Privacy policy must be written and published before gated downloads are used publicly.
- The Edge Function needs deploying (`supabase functions deploy site-download`) — an owner step like the Paynow functions.
- Existing Markdown on the `blog` page becomes the list page's intro text.
