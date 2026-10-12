-- ============================================================================
-- v1241 seed: product cards + brand copy for the public Nidus brand site
-- Companion to v1241_site_products_and_content.sql (rule 18.2). Idempotent.
--
-- URLs below are the LOCAL DEV hosts (Platform 5173, Simulator 5174, Planner 5176, brand site
-- 5177). Before go-live, set the production URLs in Admin → Public site products (or a follow-up
-- SQL file) once the domains are final (v1239 open question Q2).
--
-- The Planner card ships inactive and is switched on in the v1239 go/no-go step together with
-- admin.feature_flags.planner_public_signup. Admin is never listed.
-- ============================================================================

INSERT INTO public.site_products
  (slug, name, tagline, description, audience, landing_url, sign_in_url, sign_up_url, icon_key, accent_key, sort_order, is_active)
VALUES
  ('platform', 'Project Nidus Platform',
   'The complete project management information system',
   'Run projects, programmes and portfolios end to end: planning, RAID, change control, quality, benefits, governance and reporting, with industry packs for your sector.',
   'Organisations and PMOs managing real projects',
   'http://localhost:5173/', 'http://localhost:5173/platform/login', 'http://localhost:5173/platform/register',
   'layout-dashboard', 'blue', 10, TRUE),
  ('simulator', 'Project Nidus Simulator',
   'Practise project management on realistic scenarios',
   'Step into project, programme, portfolio and PMO roles, make decisions on simulated projects, and build skills without risk to live work.',
   'Learners, trainers and teams building PM skills',
   'http://localhost:5174/', 'http://localhost:5174/simulator/login', 'http://localhost:5174/simulator/register',
   'graduation-cap', 'green', 20, TRUE),
  ('planner', 'Project Nidus Planner',
   'Focused project planning that grows with you',
   'Plan with Gantt, dependencies, critical path, baselines and the Planning Hub. Move to the full Platform at any time and keep every project.',
   'Individuals and small teams who only need planning',
   'http://localhost:5176/', 'http://localhost:5176/login', 'http://localhost:5176/signup',
   'calendar-range', 'violet', 30, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  tagline     = EXCLUDED.tagline,
  description = EXCLUDED.description,
  audience    = EXCLUDED.audience,
  icon_key    = EXCLUDED.icon_key,
  accent_key  = EXCLUDED.accent_key,
  sort_order  = EXCLUDED.sort_order;
  -- landing/sign-in/sign-up URLs and is_active are NOT overwritten on re-run, so production values
  -- set in Admin and the Planner launch switch survive a re-applied seed.

INSERT INTO public.site_content (content_key, content_value, description)
VALUES
  ('hero.heading', 'Project management software that fits how you work',
   'Brand site hero heading'),
  ('hero.subheading', 'Plan, deliver and learn with one connected family of products. Start with what you need and grow without re-keying a single project.',
   'Brand site hero sub-heading'),
  ('connect.heading', 'How the products connect',
   'Heading of the section explaining how the products relate'),
  ('connect.body', 'Planner and Platform share the same projects, so moving up keeps every plan, task and baseline. Simulator gives your team a safe place to practise the same ways of working.',
   'Body of the connection section'),
  ('meta.title', 'Project Nidus — project planning, delivery and training',
   'HTML <title> and Open Graph title for the brand site'),
  ('meta.description', 'Project Nidus: a full project management platform, a focused project planner, and a simulator for practising project management.',
   'Meta description and Open Graph description for the brand site'),
  ('footer.tagline', 'Project Nidus — plan, deliver, learn.',
   'Footer tagline'),
  ('brand.url', 'http://localhost:5177/',
   'Brand site address used by the "Nidus family" bar on product homepages (set the production URL before go-live)')
ON CONFLICT (content_key) DO UPDATE SET
  description = EXCLUDED.description;
  -- content_value is NOT overwritten on re-run, so edits made in Admin are kept.

DO $$
BEGIN
  RAISE NOTICE 'v1241 seed: % site products, % content keys',
    (SELECT COUNT(*) FROM public.site_products), (SELECT COUNT(*) FROM public.site_content);
END $$;
