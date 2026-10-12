-- ============================================================================
-- v1263 (seed): starter blog categories. Run after SQL/v1263_site_blog.sql. Idempotent; never
-- overwrites Admin edits. No posts are seeded — articles are written by the owner in Admin (rule 25/26).
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.site_blog_categories') IS NULL THEN
    RAISE EXCEPTION 'v1263 seed cannot run yet: run SQL/v1263_site_blog.sql first, then this seed.';
  END IF;
END $$;

INSERT INTO public.site_blog_categories (slug, name, description, sort_order)
VALUES
  ('planning',     'Planning',     'Scheduling, dependencies, baselines and the critical path', 10),
  ('pmo',          'PMO',          'Portfolio oversight, standards and reporting',             20),
  ('governance',   'Governance',   'Stage gates, approvals, risk and change control',          30),
  ('training',     'Training',     'Building project management skills',                       40),
  ('product-news', 'Product news', 'What is new in Project Nidus',                              50)
ON CONFLICT (slug) DO NOTHING;

SELECT slug, name, is_active FROM public.site_blog_categories ORDER BY sort_order, name;
