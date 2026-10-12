-- ============================================================================
-- v1264 seed: starting values for the four public headers (PRD D11). Run after v1264.
-- Today's dark header colours; each product's accent for its primary button. Edit in Admin
-- (Content → Header settings). Idempotent: existing rows are never overwritten.
--
-- Simulator accent is green-700 (#15803D), not green-600: white text on green-600 is only
-- 3.3:1 and would fail the WCAG AA check on the table.
-- ============================================================================

INSERT INTO public.site_header_settings
  (scope_slug, bg_color, text_color, accent_color, cta_text_color, cta_label, cta_url)
VALUES
  ('brand',     '#030712', '#D1D5DB', '#2563EB', '#FFFFFF', 'Get started',      NULL),
  ('platform',  '#030712', '#D1D5DB', '#2563EB', '#FFFFFF', 'Request a demo',   '/platform/request-demo'),
  ('simulator', '#030712', '#D1D5DB', '#15803D', '#FFFFFF', 'Start practising', NULL),
  ('planner',   '#030712', '#D1D5DB', '#7C3AED', '#FFFFFF', 'Start free trial', NULL)
ON CONFLICT (scope_slug) DO NOTHING;

SELECT scope_slug, cta_label, COALESCE(cta_url, '(default)') AS cta_url,
       public.site_color_contrast(text_color, bg_color) AS text_contrast,
       public.site_color_contrast(cta_text_color, accent_color) AS cta_contrast
FROM public.site_header_settings ORDER BY scope_slug;
