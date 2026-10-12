-- ============================================================================
-- v1260: Nidus brand site — navigation, common pages and enquiries
-- Plan: projectplan/v1241_nidus_brand_site_plan.md (Amendment A, A1). Run after v1241.
--
--   site_products  + pricing_url, docs_url (Pricing comparison, Resources ▾ documentation links)
--   site_nav_links  header dropdowns (solutions / resources / company), footer columns
--                   (footer_solutions / footer_resources / footer_company / footer_legal) and each
--                   product's own bar (product_<slug>, shown only inside that product).
--                   A link may point at a site_pages slug (internal) or a URL (another app → opens
--                   in a new window).
--   site_pages      common pages shown only on the brand site (About, Contact intro, Blog,
--                   Resources, Solutions/*, Terms, Privacy). Markdown body.
--   site_enquiries  contact-form messages. Anonymous visitors have no user record, so
--                   support_tickets (user_id NOT NULL) cannot hold them. Written only through
--                   site_submit_enquiry() (validated, rate-limited); read only by Admin RPCs (v230).
--
-- Access: anon + authenticated read ACTIVE nav links/pages only; no client writes anywhere
-- (Admin RPCs, Admin SQL v230). Idempotent.
-- ============================================================================

ALTER TABLE public.site_products ADD COLUMN IF NOT EXISTS pricing_url TEXT;
ALTER TABLE public.site_products ADD COLUMN IF NOT EXISTS docs_url TEXT;

-- ── Navigation ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_nav_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_key    TEXT NOT NULL UNIQUE CHECK (link_key ~ '^[a-z0-9_.-]+$'),
  -- product_<slug>: that product's own bar under the shared header (Features, Pricing, Docs …),
  -- shown only inside that product; url holds an in-app path such as '/platform/features'.
  nav_group   TEXT NOT NULL CHECK (nav_group ~ '^(solutions|resources|company|footer_(solutions|resources|company|legal)|product_[a-z0-9-]+)$'),
  label       TEXT NOT NULL,
  description TEXT,
  page_slug   TEXT,                 -- internal brand-site page (site_pages.slug) …
  url         TEXT,                 -- … or an address in another app (opens in a new window)
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID,
  CONSTRAINT site_nav_links_target CHECK ((page_slug IS NOT NULL) <> (url IS NOT NULL))
);
COMMENT ON TABLE public.site_nav_links IS
  'v1260: Header dropdown and footer links for the public Nidus sites. A link targets a site_pages slug or an external URL.';

-- ── Pages ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_pages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+(/[a-z0-9-]+)?$'),
  title       TEXT NOT NULL,
  summary     TEXT,                 -- meta description + intro line
  body_md     TEXT NOT NULL DEFAULT '',
  page_kind   TEXT NOT NULL DEFAULT 'page' CHECK (page_kind IN ('page', 'solution', 'legal', 'contact')),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID
);
COMMENT ON TABLE public.site_pages IS
  'v1260: Common pages of the public Nidus brand site (About, Contact, Blog, Resources, Solutions, Terms, Privacy). Markdown.';

-- ── Enquiries ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_enquiries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT NOT NULL CHECK (length(full_name) BETWEEN 1 AND 120),
  email         TEXT NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
  organisation  TEXT CHECK (organisation IS NULL OR length(organisation) <= 160),
  product_slug  TEXT,
  topic         TEXT NOT NULL DEFAULT 'general' CHECK (topic IN ('general', 'sales', 'support', 'partnership', 'press')),
  message       TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 5000),
  page_url      TEXT,
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'answered', 'closed', 'spam')),
  handled_by    UUID,
  handled_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.site_enquiries IS
  'v1260: Contact-form messages from the public Nidus brand site. Insert only via site_submit_enquiry(); read in Admin.';
CREATE INDEX IF NOT EXISTS idx_site_enquiries_status_created ON public.site_enquiries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_enquiries_email_created ON public.site_enquiries (lower(email), created_at DESC);

-- updated_at maintenance
DROP TRIGGER IF EXISTS trg_site_nav_links_updated_at ON public.site_nav_links;
CREATE TRIGGER trg_site_nav_links_updated_at BEFORE UPDATE ON public.site_nav_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_site_pages_updated_at ON public.site_pages;
CREATE TRIGGER trg_site_pages_updated_at BEFORE UPDATE ON public.site_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_site_enquiries_updated_at ON public.site_enquiries;
CREATE TRIGGER trg_site_enquiries_updated_at BEFORE UPDATE ON public.site_enquiries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS + grants
ALTER TABLE public.site_nav_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_enquiries ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.site_nav_links TO anon, authenticated;
GRANT SELECT ON public.site_pages TO anon, authenticated;
GRANT ALL ON public.site_nav_links, public.site_pages, public.site_enquiries TO service_role;
-- site_enquiries: no client privileges at all (insert through the RPC below, read through Admin RPCs).

DROP POLICY IF EXISTS policy_site_nav_links_public_read ON public.site_nav_links;
CREATE POLICY policy_site_nav_links_public_read ON public.site_nav_links FOR SELECT TO anon, authenticated USING (is_active = TRUE);
DROP POLICY IF EXISTS policy_site_pages_public_read ON public.site_pages;
CREATE POLICY policy_site_pages_public_read ON public.site_pages FOR SELECT TO anon, authenticated USING (is_active = TRUE);

-- ── Contact form RPC ────────────────────────────────────────────────────────
-- Validates input, drops obvious bots (honeypot field filled) and limits each email address to
-- 5 messages per hour. Returns only a reference number (no data is ever read back).
CREATE OR REPLACE FUNCTION public.site_submit_enquiry(
  p_full_name TEXT, p_email TEXT, p_message TEXT,
  p_topic TEXT DEFAULT 'general', p_organisation TEXT DEFAULT NULL, p_product_slug TEXT DEFAULT NULL,
  p_page_url TEXT DEFAULT NULL, p_website TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(btrim(p_email));
  v_id UUID;
BEGIN
  -- Honeypot: real visitors never see or fill this field.
  IF COALESCE(btrim(p_website), '') <> '' THEN
    RETURN jsonb_build_object('received', TRUE);
  END IF;
  IF COALESCE(btrim(p_full_name), '') = '' THEN RAISE EXCEPTION 'Please enter your name'; END IF;
  IF v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN RAISE EXCEPTION 'Please enter a valid email address'; END IF;
  IF length(btrim(COALESCE(p_message, ''))) < 10 THEN RAISE EXCEPTION 'Please write a little more in your message'; END IF;
  IF length(p_message) > 5000 THEN RAISE EXCEPTION 'Messages can be up to 5,000 characters'; END IF;
  IF (SELECT COUNT(*) FROM public.site_enquiries WHERE lower(email) = v_email AND created_at > NOW() - INTERVAL '1 hour') >= 5 THEN
    RAISE EXCEPTION 'You have sent several messages recently. Please wait a little before sending another.';
  END IF;
  INSERT INTO public.site_enquiries (full_name, email, organisation, product_slug, topic, message, page_url)
  VALUES (left(btrim(p_full_name), 120), v_email, NULLIF(left(btrim(COALESCE(p_organisation, '')), 160), ''),
          NULLIF(btrim(COALESCE(p_product_slug, '')), ''),
          CASE WHEN p_topic IN ('general', 'sales', 'support', 'partnership', 'press') THEN p_topic ELSE 'general' END,
          btrim(p_message), left(p_page_url, 500))
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('received', TRUE, 'reference', upper(substr(replace(v_id::text, '-', ''), 1, 8)));
END;
$$;
REVOKE ALL ON FUNCTION public.site_submit_enquiry(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.site_submit_enquiry(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- Registry
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('site_nav_links', 'Header dropdown and footer links for the public Nidus brand site and product landing pages', false, true),
  ('site_pages', 'Common pages of the public Nidus brand site (About, Contact, Blog, Resources, Solutions, Terms, Privacy)', false, true),
  ('site_enquiries', 'Contact-form messages from the public Nidus brand site (read in Admin)', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_system_table = EXCLUDED.is_system_table, updated_at = NOW();

NOTIFY pgrst, 'reload schema';
SELECT 'v1260 applied' AS status,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('site_nav_links', 'site_pages', 'site_enquiries')) AS tables_present;
