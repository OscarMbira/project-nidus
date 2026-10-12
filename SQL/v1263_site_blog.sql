-- ============================================================================
-- v1263: Brand-site blog — posts, categories, attachments (open + email-gated downloads)
-- PRD:  projectprd/v1263_brand_site_blog_PRD.md
-- Plan: projectplan/v1263_brand_site_blog_plan.md
-- Admin: E:\project-nidus-admin\SQL\v232_blog_posts_admin_rpc.sql (editing RPCs, upload policies)
-- Run after v1262. Idempotent.
--
--   site_blog_categories   the category list readers filter by (Admin-maintained)
--   site_blog_posts        articles. A post is visible when published_at <= now() and not archived.
--                          Never-published posts are edited in place; once published, edits go to
--                          `draft` (admin-only) until republished.
--   site_blog_attachments  documents on a post. state: live | draft_add | draft_remove (changes to
--                          a published post wait for republish). Open files live in the public
--                          bucket site-assets (public_url set); gated files live in the PRIVATE bucket
--                          site-downloads and are only handed out by the site-download Edge Function
--                          after the visitor's details are recorded (site_record_gated_download).
--   site_enquiries         + topic 'download', document/post and marketing opt-in columns.
-- ============================================================================

-- ── Categories ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_blog_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  name        TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 60),
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID
);
COMMENT ON TABLE public.site_blog_categories IS 'v1263: Brand-site blog categories (Admin-maintained); readers filter posts by these.';

-- ── Posts ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_blog_posts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 80),
  title              TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 160),
  summary            TEXT CHECK (summary IS NULL OR length(summary) <= 400),
  body_md            TEXT NOT NULL DEFAULT '',
  cover_image_url    TEXT CHECK (cover_image_url IS NULL OR cover_image_url ~* '^https://'),
  cover_image_alt    TEXT,
  author_name        TEXT,
  author_role        TEXT,
  category_id        UUID REFERENCES public.site_blog_categories(id) ON DELETE RESTRICT,
  published_at       TIMESTAMPTZ,          -- visible from this moment (future = scheduled)
  first_published_at TIMESTAMPTZ,          -- set at first publish; locks the slug
  archived_at        TIMESTAMPTZ,
  draft              JSONB CHECK (draft IS NULL OR jsonb_typeof(draft) = 'object'),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID,
  published_by       UUID
);
COMMENT ON TABLE public.site_blog_posts IS 'v1263: Brand-site blog posts. Public when published_at <= now() and not archived; draft column is admin-only.';
CREATE INDEX IF NOT EXISTS idx_site_blog_posts_published ON public.site_blog_posts (published_at DESC) WHERE archived_at IS NULL;

-- ── Attachments ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_blog_attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID NOT NULL REFERENCES public.site_blog_posts(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 160),
  bucket       TEXT NOT NULL CHECK (bucket IN ('site-assets', 'site-downloads')),
  file_path    TEXT NOT NULL CHECK (file_path ~ '^blog/[A-Za-z0-9/_.-]+$'),
  public_url   TEXT CHECK (public_url IS NULL OR public_url ~* '^https://'),
  mime_type    TEXT NOT NULL,
  size_bytes   BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  is_gated     BOOLEAN NOT NULL DEFAULT FALSE,
  state        TEXT NOT NULL DEFAULT 'live' CHECK (state IN ('live', 'draft_add', 'draft_remove')),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID,
  CONSTRAINT site_blog_attachments_gating CHECK (
    (is_gated AND bucket = 'site-downloads' AND public_url IS NULL) OR
    (NOT is_gated AND bucket = 'site-assets' AND public_url IS NOT NULL))
);
COMMENT ON TABLE public.site_blog_attachments IS 'v1263: Documents attached to blog posts. Gated files are private (site-downloads) and served only after the download form.';
CREATE INDEX IF NOT EXISTS idx_site_blog_attachments_post ON public.site_blog_attachments (post_id, sort_order);

-- updated_at
DROP TRIGGER IF EXISTS trg_site_blog_categories_updated_at ON public.site_blog_categories;
CREATE TRIGGER trg_site_blog_categories_updated_at BEFORE UPDATE ON public.site_blog_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_site_blog_posts_updated_at ON public.site_blog_posts;
CREATE TRIGGER trg_site_blog_posts_updated_at BEFORE UPDATE ON public.site_blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_site_blog_attachments_updated_at ON public.site_blog_attachments;
CREATE TRIGGER trg_site_blog_attachments_updated_at BEFORE UPDATE ON public.site_blog_attachments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── RLS + grants (visitors: published content only; never drafts or private file paths) ──
ALTER TABLE public.site_blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_blog_attachments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.site_blog_categories, public.site_blog_posts, public.site_blog_attachments FROM anon, authenticated;
GRANT SELECT (id, slug, name, description, sort_order, is_active) ON public.site_blog_categories TO anon, authenticated;
GRANT SELECT (id, slug, title, summary, body_md, cover_image_url, cover_image_alt, author_name, author_role, category_id,
              published_at, archived_at, created_at, updated_at)
  ON public.site_blog_posts TO anon, authenticated;
GRANT SELECT (id, post_id, display_name, public_url, mime_type, size_bytes, is_gated, state, sort_order)
  ON public.site_blog_attachments TO anon, authenticated;
GRANT ALL ON public.site_blog_categories, public.site_blog_posts, public.site_blog_attachments TO service_role;

DROP POLICY IF EXISTS policy_site_blog_categories_public_read ON public.site_blog_categories;
CREATE POLICY policy_site_blog_categories_public_read ON public.site_blog_categories FOR SELECT TO anon, authenticated USING (is_active = TRUE);

DROP POLICY IF EXISTS policy_site_blog_posts_public_read ON public.site_blog_posts;
CREATE POLICY policy_site_blog_posts_public_read ON public.site_blog_posts FOR SELECT TO anon, authenticated
  USING (published_at IS NOT NULL AND published_at <= NOW() AND archived_at IS NULL);

-- Live attachments (and ones only marked for removal in an unpublished draft) of visible posts.
-- The EXISTS runs under the caller's own RLS on site_blog_posts, so it only sees visible posts.
DROP POLICY IF EXISTS policy_site_blog_attachments_public_read ON public.site_blog_attachments;
CREATE POLICY policy_site_blog_attachments_public_read ON public.site_blog_attachments FOR SELECT TO anon, authenticated
  USING (state IN ('live', 'draft_remove') AND EXISTS (SELECT 1 FROM public.site_blog_posts p WHERE p.id = post_id));

-- ── Buckets ──────────────────────────────────────────────────────────────────
-- site-assets (public, v1262) now also holds open blog documents: widen its types and size.
UPDATE storage.buckets
   SET file_size_limit = 10485760,
       allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation',
         'text/plain', 'text/csv']
 WHERE id = 'site-assets';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('site-downloads', 'site-downloads', FALSE, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv'])
ON CONFLICT (id) DO UPDATE SET public = FALSE, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── Enquiries: download leads ────────────────────────────────────────────────
ALTER TABLE public.site_enquiries ADD COLUMN IF NOT EXISTS attachment_id UUID REFERENCES public.site_blog_attachments(id) ON DELETE SET NULL;
ALTER TABLE public.site_enquiries ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES public.site_blog_posts(id) ON DELETE SET NULL;
ALTER TABLE public.site_enquiries ADD COLUMN IF NOT EXISTS document_name TEXT;
ALTER TABLE public.site_enquiries ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.site_enquiries ADD COLUMN IF NOT EXISTS marketing_opt_in_at TIMESTAMPTZ;
ALTER TABLE public.site_enquiries DROP CONSTRAINT IF EXISTS site_enquiries_topic_check;
ALTER TABLE public.site_enquiries ADD CONSTRAINT site_enquiries_topic_check
  CHECK (topic IN ('general', 'sales', 'support', 'partnership', 'press', 'download'));

-- ── Archived / missing post (for a friendly notice instead of a 404) ─────────
CREATE OR REPLACE FUNCTION public.site_blog_slug_status(p_slug TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p.id IS NULL THEN 'missing'
    WHEN p.archived_at IS NOT NULL THEN 'archived'
    WHEN p.published_at IS NOT NULL AND p.published_at <= NOW() THEN 'published'
    ELSE 'missing'                         -- drafts and scheduled posts are not revealed
  END
  FROM (SELECT 1) one LEFT JOIN public.site_blog_posts p ON p.slug = p_slug
$$;
REVOKE ALL ON FUNCTION public.site_blog_slug_status(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.site_blog_slug_status(TEXT) TO anon, authenticated, service_role;

-- ── Preview one post with its drafts (admin preview link, v1262 tokens) ──────
CREATE OR REPLACE FUNCTION public.site_preview_blog_post(p_token TEXT, p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post public.site_blog_posts%ROWTYPE;
BEGIN
  IF COALESCE(length(p_token), 0) < 32 OR NOT EXISTS (
    SELECT 1 FROM public.site_preview_tokens
     WHERE token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') AND expires_at > NOW()) THEN
    RAISE EXCEPTION 'This preview link has expired or is not valid. Open a new preview from Admin.';
  END IF;
  SELECT * INTO v_post FROM public.site_blog_posts WHERE slug = p_slug;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'There is no post at /blog/%.', p_slug;
  END IF;
  RETURN jsonb_build_object(
    'post', (to_jsonb(v_post) - 'draft' - 'created_by' - 'updated_by' - 'published_by') || COALESCE(v_post.draft, '{}'::jsonb),
    'attachments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', a.id, 'post_id', a.post_id, 'display_name', a.display_name, 'public_url', a.public_url,
                                          'mime_type', a.mime_type, 'size_bytes', a.size_bytes, 'is_gated', a.is_gated,
                                          'state', a.state, 'sort_order', a.sort_order) ORDER BY a.sort_order, a.created_at)
        FROM public.site_blog_attachments a WHERE a.post_id = v_post.id AND a.state IN ('live', 'draft_add')), '[]'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION public.site_preview_blog_post(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.site_preview_blog_post(TEXT, TEXT) TO anon, authenticated, service_role;

-- ── Gated download: record the lead, return where the file is (service role only) ──
-- Called by the site-download Edge Function, which then signs a 5-minute link. Never callable
-- by visitors directly, so the private path is never exposed to the browser.
CREATE OR REPLACE FUNCTION public.site_record_gated_download(
  p_attachment_id UUID, p_full_name TEXT, p_email TEXT, p_organisation TEXT DEFAULT NULL,
  p_marketing_opt_in BOOLEAN DEFAULT FALSE, p_page_url TEXT DEFAULT NULL, p_website TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(btrim(COALESCE(p_email, '')));
  v_att public.site_blog_attachments%ROWTYPE;
  v_post public.site_blog_posts%ROWTYPE;
  v_id UUID;
BEGIN
  IF COALESCE(btrim(p_website), '') <> '' THEN
    RAISE EXCEPTION 'Your request could not be processed.';
  END IF;
  SELECT * INTO v_att FROM public.site_blog_attachments WHERE id = p_attachment_id;
  IF NOT FOUND OR NOT v_att.is_gated OR v_att.state NOT IN ('live', 'draft_remove') THEN
    RAISE EXCEPTION 'This document is not available.';
  END IF;
  SELECT * INTO v_post FROM public.site_blog_posts WHERE id = v_att.post_id;
  IF v_post.published_at IS NULL OR v_post.published_at > NOW() OR v_post.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'This document is not available.';
  END IF;
  IF COALESCE(btrim(p_full_name), '') = '' THEN RAISE EXCEPTION 'Please enter your name'; END IF;
  IF v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN RAISE EXCEPTION 'Please enter a valid email address'; END IF;
  IF (SELECT COUNT(*) FROM public.site_enquiries WHERE lower(email) = v_email AND topic = 'download' AND created_at > NOW() - INTERVAL '1 hour') >= 10 THEN
    RAISE EXCEPTION 'You have downloaded several documents recently. Please wait a little before trying again.';
  END IF;
  INSERT INTO public.site_enquiries (full_name, email, organisation, topic, message, page_url,
                                     attachment_id, post_id, document_name, marketing_opt_in, marketing_opt_in_at)
  VALUES (left(btrim(p_full_name), 120), v_email, NULLIF(left(btrim(COALESCE(p_organisation, '')), 160), ''), 'download',
          left(format('Downloaded "%s" from "%s"', v_att.display_name, v_post.title), 5000), left(p_page_url, 500),
          v_att.id, v_post.id, v_att.display_name, COALESCE(p_marketing_opt_in, FALSE),
          CASE WHEN p_marketing_opt_in THEN NOW() END)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('bucket', v_att.bucket, 'path', v_att.file_path, 'display_name', v_att.display_name,
                            'reference', upper(substr(replace(v_id::text, '-', ''), 1, 8)));
END;
$$;
REVOKE ALL ON FUNCTION public.site_record_gated_download(UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.site_record_gated_download(UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT) TO service_role;

-- Registry
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('site_blog_categories', 'Brand-site blog categories readers filter posts by', false, true),
  ('site_blog_posts', 'Brand-site blog posts (articles), with unpublished drafts and scheduled publishing', false, true),
  ('site_blog_attachments', 'Documents attached to brand-site blog posts (open or email-gated downloads)', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_system_table = EXCLUDED.is_system_table, updated_at = NOW();

NOTIFY pgrst, 'reload schema';
SELECT 'v1263 applied' AS status,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'
         AND table_name IN ('site_blog_categories', 'site_blog_posts', 'site_blog_attachments')) AS tables_present_of_3,
       (SELECT COUNT(*) FROM storage.buckets WHERE id = 'site-downloads' AND NOT public) AS private_bucket_present;
