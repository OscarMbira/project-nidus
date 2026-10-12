-- ============================================================================
-- v1262: Brand site marketing sections (home + Solutions pages)
-- PRD:  projectprd/v1262_brand_site_marketing_homepage_PRD.md
-- Plan: projectplan/v1262_brand_site_marketing_homepage_plan.md
-- Admin: E:\project-nidus-admin\SQL\v231_site_sections_admin_rpc.sql (edit/publish RPCs, upload policies)
-- Run after v1260. Idempotent.
--
--   site_sections        one row per section of a page ('home' or a site_pages slug), one of 11
--                        types. Published columns are what visitors see. `draft` holds unpublished
--                        changes (content, is_active, sort_order); Admin "Publish" copies them in.
--   site_preview_tokens  short-lived preview links (hash only) so an admin can view drafts on the
--                        real brand site.
--   storage bucket site-assets  public images for sections (uploads: Admin v231 policies).
--
-- Visitors (anon/authenticated) may read published, active rows and NEVER the draft column
-- (column-level grant). Drafts are readable only through site_preview_sections(token).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.site_sections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug     TEXT NOT NULL CHECK (page_slug ~ '^(home|[a-z0-9-]+(/[a-z0-9-]+)?)$'),
  section_key   TEXT NOT NULL CHECK (section_key ~ '^[a-z0-9_-]+$'),
  section_type  TEXT NOT NULL CHECK (section_type IN ('hero', 'trust_strip', 'value_points', 'product_cards', 'feature_grid',
                                                      'steps', 'audience_links', 'testimonials', 'pricing_teaser', 'faq', 'cta_band')),
  heading       TEXT,
  subheading    TEXT,
  body          TEXT,
  primary_cta   JSONB,                 -- {"label": "...", "href": "/contact?topic=sales" | "https://..." | "#get-started" | "#<section_key>"}
  secondary_cta JSONB,
  image_url     TEXT,
  image_alt     TEXT,
  items         JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array'),
                                       -- [{title, subtitle, text, icon, href, image_url, image_alt}]
  draft         JSONB CHECK (draft IS NULL OR jsonb_typeof(draft) = 'object'),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT FALSE,
  published_at  TIMESTAMPTZ,
  published_by  UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID,
  CONSTRAINT site_sections_page_key UNIQUE (page_slug, section_key)
);
COMMENT ON TABLE public.site_sections IS
  'v1262: Marketing sections of brand-site pages (home, Solutions). Published columns are public; draft is admin-only until published.';
CREATE INDEX IF NOT EXISTS idx_site_sections_page_order ON public.site_sections (page_slug, sort_order);

CREATE TABLE IF NOT EXISTS public.site_preview_tokens (
  token_hash  TEXT PRIMARY KEY,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.site_preview_tokens IS
  'v1262: SHA-256 hashes of short-lived brand-site preview links (drafts). Created by Admin; no client access.';

DROP TRIGGER IF EXISTS trg_site_sections_updated_at ON public.site_sections;
CREATE TRIGGER trg_site_sections_updated_at BEFORE UPDATE ON public.site_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS + grants
ALTER TABLE public.site_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_preview_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.site_sections FROM anon, authenticated;
REVOKE ALL ON public.site_preview_tokens FROM anon, authenticated;
-- Every column except draft (and the internal who-columns).
GRANT SELECT (id, page_slug, section_key, section_type, heading, subheading, body, primary_cta, secondary_cta,
              image_url, image_alt, items, sort_order, is_active, published_at, created_at, updated_at)
  ON public.site_sections TO anon, authenticated;
GRANT ALL ON public.site_sections, public.site_preview_tokens TO service_role;

DROP POLICY IF EXISTS policy_site_sections_public_read ON public.site_sections;
CREATE POLICY policy_site_sections_public_read ON public.site_sections FOR SELECT TO anon, authenticated USING (is_active = TRUE);
-- site_preview_tokens: no client policies at all.

-- ── Effective (draft-applied) view of one section, used by preview and publish ──
CREATE OR REPLACE FUNCTION public.site_section_with_draft(s public.site_sections)
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (to_jsonb(s) - 'draft' - 'created_by' - 'updated_by' - 'published_by') || COALESCE(s.draft, '{}'::jsonb)
$$;

-- ── Preview: drafts for whoever holds a valid preview link ────────────────────
-- Returns the effective (draft-applied) active sections of every page, ordered. Raises on a
-- missing, unknown or expired token, so a bad link never silently shows published content as
-- if it were the preview.
CREATE OR REPLACE FUNCTION public.site_preview_sections(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF COALESCE(length(p_token), 0) < 32 THEN
    RAISE EXCEPTION 'This preview link is not valid.';
  END IF;
  v_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  IF NOT EXISTS (SELECT 1 FROM public.site_preview_tokens WHERE token_hash = v_hash AND expires_at > NOW()) THEN
    RAISE EXCEPTION 'This preview link has expired or is not valid. Open a new preview from Admin.';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(e ORDER BY e->>'page_slug', (e->>'sort_order')::int, e->>'section_key')
    FROM (SELECT public.site_section_with_draft(s) AS e FROM public.site_sections s) x
    WHERE COALESCE((e->>'is_active')::boolean, FALSE)
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.site_preview_sections(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.site_preview_sections(TEXT) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.site_section_with_draft(public.site_sections) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.site_section_with_draft(public.site_sections) TO service_role;

-- ── Images bucket (public read; upload policies are in Admin SQL v231) ────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('site-assets', 'site-assets', TRUE, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Registry
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('site_sections', 'Marketing sections (hero, features, FAQ …) of brand-site pages, with unpublished drafts', false, true),
  ('site_preview_tokens', 'Hashes of short-lived brand-site preview links used by Admin to view drafts', true, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_system_table = EXCLUDED.is_system_table, updated_at = NOW();

NOTIFY pgrst, 'reload schema';
SELECT 'v1262 applied' AS status,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('site_sections', 'site_preview_tokens')) AS tables_present_of_2,
       (SELECT COUNT(*) FROM storage.buckets WHERE id = 'site-assets') AS bucket_present;
