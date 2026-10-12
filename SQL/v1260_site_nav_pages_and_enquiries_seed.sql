-- ============================================================================
-- v1260 (seed): brand-site navigation, common pages and product links — Amendment A (A1)
-- Run after v1260. Idempotent: rows are keyed by link_key / slug; text is NOT overwritten on
-- re-run, so edits made in Admin are kept. Local-dev URLs: set production URLs before go-live.
--
-- Page copy for About and Contact is moved from the Platform/Simulator homepage sections.
-- Their Blog and Resources sections only held placeholder teasers that linked nowhere, so those
-- pages are seeded with real links instead of invented articles. Terms and Privacy are seeded
-- INACTIVE with no legal text: the owner writes them in Admin (A-D8).
-- ============================================================================

-- Prerequisite: SQL/v1260_site_nav_pages_and_enquiries.sql (adds pricing_url/docs_url, creates the tables).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'site_products' AND column_name = 'pricing_url')
     OR to_regclass('public.site_nav_links') IS NULL OR to_regclass('public.site_pages') IS NULL THEN
    RAISE EXCEPTION 'v1260 seed cannot run yet: run SQL/v1260_site_nav_pages_and_enquiries.sql first, then this seed.';
  END IF;
END $$;

-- Product links used by Pricing and Resources ▾
UPDATE public.site_products SET pricing_url = COALESCE(pricing_url, 'http://localhost:5173/pricing'),
       docs_url = COALESCE(docs_url, 'http://localhost:5173/documentation/platform') WHERE slug = 'platform';
UPDATE public.site_products SET pricing_url = COALESCE(pricing_url, 'http://localhost:5174/pricing'),
       docs_url = COALESCE(docs_url, 'http://localhost:5174/documentation/simulator') WHERE slug = 'simulator';
UPDATE public.site_products SET pricing_url = COALESCE(pricing_url, 'http://localhost:5176/pricing') WHERE slug = 'planner';

-- ── Pages ───────────────────────────────────────────────────────────────────
INSERT INTO public.site_pages (slug, title, summary, body_md, page_kind, sort_order, is_active) VALUES
('about', 'About Project Nidus',
 'Project management tools and training for teams of every size.',
 E'Project Nidus helps project managers, teams and organisations deliver work with structured methods and practical tools.\n\nOur mission is to make professional project management accessible, practical and effective for teams of all sizes. Whether you are planning a single project, running a PMO, or practising your skills, Project Nidus gives you the tools and insight you need.\n\n## One family of products\n\n- **Project Nidus Platform** — the complete project management information system for organisations and PMOs.\n- **Project Nidus Planner** — focused project planning for individuals and small teams, with an upgrade path to the Platform.\n- **Project Nidus Simulator** — realistic scenarios for learning and practising project management without risk to live work.\n\nThe products share the same projects and ways of working, so moving from one to another never means re-keying your plans.',
 'page', 10, TRUE),
('contact', 'Contact us',
 'Questions about our products, pricing or partnerships? Send us a message and we will reply as soon as we can.',
 '', 'contact', 20, TRUE),
('blog', 'Blog',
 'Articles on planning, delivery and project leadership.',
 E'Articles are on their way. In the meantime, the product guides below explain how to plan and deliver projects with Project Nidus.',
 'page', 30, TRUE),
('resources', 'Resources',
 'Guides and documentation for every Project Nidus product.',
 E'## Documentation\n\n- [Platform documentation](http://localhost:5173/documentation/platform)\n- [Simulator documentation](http://localhost:5174/documentation/simulator)\n\n## Need help?\n\nIf you cannot find what you need, [contact us](/contact) and we will point you in the right direction.',
 'page', 40, TRUE),
('solutions/pmo', 'For PMOs',
 'Portfolio oversight, governance and consistent reporting across every project.',
 E'A PMO needs one reliable view of every project. **Project Nidus Platform** brings portfolios, programmes and projects together with shared standards, stage gates, RAID registers and dashboards.\n\n- Consistent templates and methods across teams\n- Governance and approvals with a full audit trail\n- Portfolio and programme dashboards built from live project data\n- Industry packs for your sector\n\nTrain new project managers safely with **Project Nidus Simulator** before they run live work.',
 'solution', 10, TRUE),
('solutions/project-teams', 'For project teams',
 'Plan the work, share the schedule and track progress together.',
 E'Most teams start with a plan. **Project Nidus Planner** gives you Gantt charts, dependencies, the critical path, baselines and team workload in the browser — with a free trial and no card.\n\nWhen you need risks, issues, change control and finance as well, move up to **Project Nidus Platform** and keep every project, task and baseline.',
 'solution', 20, TRUE),
('solutions/training', 'For training and learning',
 'Practise real project decisions without risk to live work.',
 E'**Project Nidus Simulator** puts learners in project, programme, portfolio and PMO roles on realistic scenarios. Decisions have consequences, progress is scored, and certificates recognise the skills gained.\n\nTrainers and organisations can use the Simulator to prepare people before they manage live projects on the Platform.',
 'solution', 30, TRUE),
('terms', 'Terms of Service', 'The terms that apply to using Project Nidus.', '', 'legal', 90, FALSE),
('privacy', 'Privacy Policy', 'How Project Nidus collects and uses personal information.', '', 'legal', 91, FALSE)
ON CONFLICT (slug) DO NOTHING;

-- ── Navigation ──────────────────────────────────────────────────────────────
INSERT INTO public.site_nav_links (link_key, nav_group, label, description, page_slug, url, sort_order) VALUES
-- Header dropdowns
('solutions.pmo',            'solutions', 'For PMOs',               'Portfolio oversight and governance',      'solutions/pmo', NULL, 10),
('solutions.project-teams',  'solutions', 'For project teams',      'Plan, schedule and track together',       'solutions/project-teams', NULL, 20),
('solutions.training',       'solutions', 'For training & learning','Practise on realistic scenarios',         'solutions/training', NULL, 30),
('resources.docs-platform',  'resources', 'Platform documentation', 'Guides for the full PMIS',                NULL, 'http://localhost:5173/documentation/platform', 10),
('resources.docs-simulator', 'resources', 'Simulator documentation','Guides for the Simulator',                NULL, 'http://localhost:5174/documentation/simulator', 20),
('resources.blog',           'resources', 'Blog',                   'Articles on planning and delivery',       'blog', NULL, 30),
('resources.resources',      'resources', 'All resources',          'Guides and documentation in one place',   'resources', NULL, 40),
('company.about',            'company',   'About',                  'Who we are',                              'about', NULL, 10),
('company.contact',          'company',   'Contact',                'Talk to us',                              'contact', NULL, 20),
-- Footer columns (products come from site_products)
('footer.solutions.pmo',            'footer_solutions', 'For PMOs',                NULL, 'solutions/pmo', NULL, 10),
('footer.solutions.project-teams',  'footer_solutions', 'For project teams',       NULL, 'solutions/project-teams', NULL, 20),
('footer.solutions.training',       'footer_solutions', 'For training & learning', NULL, 'solutions/training', NULL, 30),
('footer.resources.docs-platform',  'footer_resources', 'Platform documentation',  NULL, NULL, 'http://localhost:5173/documentation/platform', 10),
('footer.resources.docs-simulator', 'footer_resources', 'Simulator documentation', NULL, NULL, 'http://localhost:5174/documentation/simulator', 20),
('footer.resources.blog',           'footer_resources', 'Blog',                    NULL, 'blog', NULL, 30),
('footer.resources.resources',      'footer_resources', 'All resources',           NULL, 'resources', NULL, 40),
('footer.company.about',            'footer_company',   'About',                   NULL, 'about', NULL, 10),
('footer.company.contact',          'footer_company',   'Contact',                 NULL, 'contact', NULL, 20),
('footer.company.pricing',          'footer_company',   'Pricing',                 NULL, 'pricing', NULL, 30),
('footer.legal.terms',              'footer_legal',     'Terms of Service',        NULL, 'terms', NULL, 10),
('footer.legal.privacy',            'footer_legal',     'Privacy Policy',          NULL, 'privacy', NULL, 20),
-- Product bars (in-app paths; Blog and Resources moved to the brand site — A-D1)
('product.platform.features',  'product_platform',  'Features',       NULL, NULL, '/platform/features', 10),
('product.platform.pricing',   'product_platform',  'Pricing',        NULL, NULL, '/platform/pricing', 20),
('product.platform.docs',      'product_platform',  'Documentation',  NULL, NULL, '/documentation/platform', 30),
('product.platform.demo',      'product_platform',  'Request a demo', NULL, NULL, '/platform/request-demo', 40),
('product.platform.affiliate', 'product_platform',  'Affiliates',     NULL, NULL, '/platform/affiliate', 50),
('product.simulator.features', 'product_simulator', 'Features',       NULL, NULL, '/simulator/features', 10),
('product.simulator.pricing',  'product_simulator', 'Pricing',        NULL, NULL, '/simulator/pricing', 20),
('product.simulator.docs',     'product_simulator', 'Documentation',  NULL, NULL, '/documentation/simulator', 30),
('product.simulator.demo',     'product_simulator', 'Request a demo', NULL, NULL, '/simulator/request-demo', 40),
('product.simulator.affiliate','product_simulator', 'Affiliates',     NULL, NULL, '/simulator/affiliate', 50),
('product.planner.pricing',    'product_planner',   'Pricing',        NULL, NULL, '/pricing', 10)
ON CONFLICT (link_key) DO NOTHING;
