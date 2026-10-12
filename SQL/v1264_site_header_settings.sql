-- ============================================================================
-- v1264: Product-led public headers — per-header settings
-- PRD: projectprd/v1264_product_led_site_headers_PRD.md · Plan: projectplan/v1264_product_led_site_headers_plan.md
-- Run after v1260.
--
--   site_header_settings  one row per public header: scope_slug 'brand' (the brand site) or a
--                         site_products.slug ('platform', 'simulator', 'planner').
--                         Colours (hex) + the primary button (CTA) label and target.
--                         cta_url NULL → brand: open the "Which product?" chooser;
--                                        product: that product's sign_up_url.
--                         cta_url starting with '/' is an in-app path (same window).
--   site_color_contrast() WCAG 2.x contrast ratio of two hex colours. Used by the CHECKs below
--                         (text on background, CTA text on accent must be >= 4.5:1, WCAG AA)
--                         and by the Admin save RPC (Admin SQL v233) for a friendly message.
--
-- scope_slug is the friendly key (rule 16.3): no Admin ID Generation reference column.
-- Access: anon + authenticated read ACTIVE rows; no client writes (Admin RPC only). Idempotent.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.site_color_contrast(p_a TEXT, p_b TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
DECLARE
  v_l NUMERIC[] := ARRAY[]::NUMERIC[];
  v_hex TEXT;
  v_c NUMERIC;
  v_lum NUMERIC;
  i INT;
BEGIN
  IF p_a IS NULL OR p_b IS NULL OR p_a !~ '^#[0-9A-Fa-f]{6}$' OR p_b !~ '^#[0-9A-Fa-f]{6}$' THEN
    RETURN NULL;
  END IF;
  FOREACH v_hex IN ARRAY ARRAY[p_a, p_b] LOOP
    v_lum := 0;
    FOR i IN 0..2 LOOP
      v_c := ('x' || substr(v_hex, 2 + i * 2, 2))::bit(8)::int / 255.0;
      v_c := CASE WHEN v_c <= 0.03928 THEN v_c / 12.92 ELSE power((v_c + 0.055) / 1.055, 2.4) END;
      v_lum := v_lum + v_c * (ARRAY[0.2126, 0.7152, 0.0722])[i + 1];
    END LOOP;
    v_l := array_append(v_l, v_lum);
  END LOOP;
  RETURN round((greatest(v_l[1], v_l[2]) + 0.05) / (least(v_l[1], v_l[2]) + 0.05), 2);
END;
$$;
COMMENT ON FUNCTION public.site_color_contrast(TEXT, TEXT) IS
  'v1264: WCAG contrast ratio (1–21) of two #RRGGBB colours, rounded to 2 decimals; NULL for invalid input.';
GRANT EXECUTE ON FUNCTION public.site_color_contrast(TEXT, TEXT) TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.site_header_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_slug      TEXT NOT NULL UNIQUE CHECK (scope_slug ~ '^[a-z0-9-]+$'),
  bg_color        TEXT NOT NULL CHECK (bg_color ~ '^#[0-9A-Fa-f]{6}$'),
  text_color      TEXT NOT NULL CHECK (text_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color    TEXT NOT NULL CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  cta_text_color  TEXT NOT NULL CHECK (cta_text_color ~ '^#[0-9A-Fa-f]{6}$'),
  cta_label       TEXT NOT NULL CHECK (length(btrim(cta_label)) BETWEEN 1 AND 40),
  cta_url         TEXT CHECK (cta_url IS NULL OR (length(cta_url) <= 500 AND cta_url ~ '^(/|https?://)')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID,
  CONSTRAINT site_header_settings_text_contrast CHECK (public.site_color_contrast(text_color, bg_color) >= 4.5),
  CONSTRAINT site_header_settings_cta_contrast CHECK (public.site_color_contrast(cta_text_color, accent_color) >= 4.5)
);
COMMENT ON TABLE public.site_header_settings IS
  'v1264: Colours and primary button of each public header (brand site + each product''s public pages). Written only via Admin RPCs.';

DROP TRIGGER IF EXISTS trg_site_header_settings_updated_at ON public.site_header_settings;
CREATE TRIGGER trg_site_header_settings_updated_at BEFORE UPDATE ON public.site_header_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS + grants
ALTER TABLE public.site_header_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.site_header_settings TO anon, authenticated;
GRANT ALL ON public.site_header_settings TO service_role;

DROP POLICY IF EXISTS policy_site_header_settings_public_read ON public.site_header_settings;
CREATE POLICY policy_site_header_settings_public_read ON public.site_header_settings
  FOR SELECT TO anon, authenticated USING (is_active = TRUE);

-- Registry
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('site_header_settings', 'Colours and primary button of each public Nidus header (brand site, Platform, Simulator, Planner)', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_system_table = EXCLUDED.is_system_table, updated_at = NOW();

NOTIFY pgrst, 'reload schema';
SELECT 'v1264 applied' AS status,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'site_header_settings') AS tables_present;
