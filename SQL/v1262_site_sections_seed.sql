-- ============================================================================
-- v1262 (seed): starter sections for the brand-site homepage and the three Solutions pages
-- Run after SQL/v1262_site_sections.sql. Idempotent (ON CONFLICT DO NOTHING): re-running never
-- overwrites Admin edits.
--
-- Everything is seeded as a DRAFT (published columns empty, is_active = FALSE). Visitors keep
-- seeing today's pages until the owner previews and publishes in Admin → Site Sections.
-- Copy is drafted from existing product descriptions; no customer logos, figures or quotes are
-- invented — the trust strip and testimonials are seeded empty and hidden (rule 25/26).
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.site_sections') IS NULL THEN
    RAISE EXCEPTION 'v1262 seed cannot run yet: run SQL/v1262_site_sections.sql first, then this seed.';
  END IF;
END $$;

INSERT INTO public.site_sections (page_slug, section_key, section_type, sort_order, is_active, draft)
SELECT v.page_slug, v.section_key, v.section_type, v.sort_order, FALSE,
       v.draft || jsonb_build_object('is_active', v.visible, 'sort_order', v.sort_order)
FROM (VALUES

-- ── Home ────────────────────────────────────────────────────────────────────
('home', 'hero', 'hero', 10, TRUE, '{
  "heading": "Plan, deliver and master projects in one connected family",
  "subheading": "Plan, deliver and learn with one connected family of products. Start with what you need and grow without re-keying a single project.",
  "body": "Start with a free trial. Upgrade when you are ready.",
  "primary_cta": {"label": "Get started", "href": "#get-started"},
  "secondary_cta": {"label": "Book a demo", "href": "/contact?topic=sales"}
}'::jsonb),
('home', 'trust', 'trust_strip', 20, FALSE, '{
  "heading": "Trusted by project teams and PMOs",
  "items": []
}'::jsonb),
('home', 'why', 'value_points', 30, TRUE, '{
  "heading": "Why teams choose Project Nidus",
  "subheading": "Most tools make you choose between a simple planner and a full project management system. Nidus lets you start small and grow without starting again.",
  "items": [
    {"title": "One source of truth", "text": "Plans, RAID logs, changes and reports live on the same project record instead of scattered spreadsheets.", "icon": "layers"},
    {"title": "Grow without re-keying", "text": "Start in Planner and move to Platform with every task, dependency and baseline intact.", "icon": "repeat"},
    {"title": "Governance built in", "text": "Stage gates, approvals with a recorded justification, and an audit trail on every record.", "icon": "shield-check"},
    {"title": "Skills before live work", "text": "Practise decisions on realistic scenarios in the Simulator before running real projects.", "icon": "graduation-cap"}
  ]
}'::jsonb),
('home', 'products', 'product_cards', 40, TRUE, '{
  "heading": "Choose the product that fits",
  "subheading": "Each product works on its own. Together they share one project record."
}'::jsonb),
('home', 'features', 'feature_grid', 50, TRUE, '{
  "heading": "Built for how projects really run",
  "items": [
    {"title": "Planning Hub and Gantt", "text": "Dependencies, critical path, baselines and team workload in the browser.", "icon": "calendar-range"},
    {"title": "RAID and change control", "text": "Risks, assumptions, issues, dependencies and change requests with approvals.", "icon": "alert-triangle"},
    {"title": "Portfolio and programme dashboards", "text": "Roll up live project data for PMOs and leadership.", "icon": "bar-chart"},
    {"title": "Industry packs", "text": "Sector-specific menus and templates for your industry.", "icon": "briefcase"},
    {"title": "Works on any device", "text": "Install it as an app on your phone, tablet or desktop.", "icon": "smartphone"},
    {"title": "Your brand, your formats", "text": "Organisation branding plus regional date, currency and number formats.", "icon": "sparkles"}
  ]
}'::jsonb),
('home', 'how-it-works', 'steps', 60, TRUE, '{
  "heading": "Start small, grow with confidence",
  "subheading": "Planner and Platform share the same projects, so moving up keeps every plan, task and baseline. Simulator gives your team a safe place to practise the same ways of working.",
  "items": [
    {"title": "Plan in Planner", "text": "Build the schedule, link tasks and share it with your team."},
    {"title": "Move up to Platform", "text": "Add RAID, change control, finance and governance. Your projects come with you."},
    {"title": "Train with Simulator", "text": "Prepare project managers on realistic scenarios before they lead live work."}
  ]
}'::jsonb),
('home', 'solutions', 'audience_links', 70, TRUE, '{
  "heading": "Solutions for your team",
  "items": [
    {"title": "For PMOs", "text": "Portfolio oversight, governance and consistent reporting.", "icon": "briefcase", "href": "/solutions/pmo"},
    {"title": "For project teams", "text": "Plan, schedule and track the work together.", "icon": "users", "href": "/solutions/project-teams"},
    {"title": "For training and learning", "text": "Practise real project decisions on realistic scenarios.", "icon": "graduation-cap", "href": "/solutions/training"}
  ]
}'::jsonb),
('home', 'testimonials', 'testimonials', 80, FALSE, '{
  "heading": "What our customers say",
  "items": []
}'::jsonb),
('home', 'pricing', 'pricing_teaser', 90, TRUE, '{
  "heading": "Plans for individuals, teams and PMOs",
  "subheading": "Start with a free trial and upgrade when you are ready.",
  "primary_cta": {"label": "Compare plans", "href": "/pricing"},
  "secondary_cta": {"label": "Talk to sales", "href": "/contact?topic=sales"}
}'::jsonb),
('home', 'faq', 'faq', 100, TRUE, '{
  "heading": "Frequently asked questions",
  "items": [
    {"title": "Which product should I start with?", "text": "Choose Planner if you only need scheduling, Platform for full project, programme and portfolio management, and Simulator to learn and practise. Not sure? Book a demo and we will help you choose."},
    {"title": "Can I move from Planner to Platform later?", "text": "Yes. Planner and Platform share the same projects, so upgrading keeps every plan, task and baseline."},
    {"title": "Is there a free trial?", "text": "Yes. You can try each product before you subscribe. See the product pricing pages for the trial details."},
    {"title": "Does it work on mobile?", "text": "Yes. Project Nidus works in any modern browser and can be installed as an app on phones, tablets and desktops."},
    {"title": "Can it follow our methods and industry?", "text": "Yes. Platform supports different delivery methods, organisation templates and industry packs, together with your branding and regional formats."},
    {"title": "How do I get help?", "text": "Use the Contact page and choose the topic that fits. Product guides are under Resources."}
  ]
}'::jsonb),
('home', 'get-started', 'cta_band', 110, TRUE, '{
  "heading": "Ready to see Project Nidus in action?",
  "subheading": "Start with the product you need, or talk to us about your team.",
  "primary_cta": {"label": "Get started", "href": "#get-started"},
  "secondary_cta": {"label": "Book a demo", "href": "/contact?topic=sales"}
}'::jsonb),

-- ── Solutions: PMOs ─────────────────────────────────────────────────────────
('solutions/pmo', 'hero', 'hero', 10, TRUE, '{
  "heading": "One reliable view of every project",
  "subheading": "Portfolio oversight, governance and consistent reporting across every project with Project Nidus Platform.",
  "primary_cta": {"label": "Book a demo", "href": "/contact?topic=sales"},
  "secondary_cta": {"label": "Get started", "href": "#get-started"}
}'::jsonb),
('solutions/pmo', 'features', 'feature_grid', 20, TRUE, '{
  "heading": "What your PMO gets",
  "items": [
    {"title": "Consistent templates and methods", "text": "One way of working across every team and project.", "icon": "clipboard-check"},
    {"title": "Governance and approvals", "text": "Decisions recorded with a justification and a full audit trail.", "icon": "shield-check"},
    {"title": "Stage gates", "text": "Control progress through defined decision points.", "icon": "git-branch"},
    {"title": "Portfolio and programme dashboards", "text": "Built from live project data, not monthly spreadsheets.", "icon": "bar-chart"},
    {"title": "Industry packs", "text": "Menus and templates for your sector.", "icon": "briefcase"},
    {"title": "Train before live work", "text": "Prepare new project managers safely with Project Nidus Simulator.", "icon": "graduation-cap"}
  ]
}'::jsonb),
('solutions/pmo', 'faq', 'faq', 30, TRUE, '{
  "heading": "Questions from PMOs",
  "items": [
    {"title": "Can we group projects into programmes and portfolios?", "text": "Yes. Platform rolls projects up into programmes and portfolios, with dashboards at each level."},
    {"title": "Can we use our own templates?", "text": "Yes. Your organisation can set its own templates and methods so every project follows the same standard."}
  ]
}'::jsonb),
('solutions/pmo', 'get-started', 'cta_band', 40, TRUE, '{
  "heading": "See how Project Nidus supports your PMO",
  "primary_cta": {"label": "Book a demo", "href": "/contact?topic=sales"},
  "secondary_cta": {"label": "Get started", "href": "#get-started"}
}'::jsonb),

-- ── Solutions: project teams ────────────────────────────────────────────────
('solutions/project-teams', 'hero', 'hero', 10, TRUE, '{
  "heading": "Plan the work, share the schedule, deliver together",
  "subheading": "Most teams start with a plan. Project Nidus Planner gives you everything to build and track it, and grows into the full Platform when you need more.",
  "primary_cta": {"label": "Get started", "href": "#get-started"},
  "secondary_cta": {"label": "Compare plans", "href": "/pricing"}
}'::jsonb),
('solutions/project-teams', 'features', 'feature_grid', 20, TRUE, '{
  "heading": "Everything a project team needs to plan",
  "items": [
    {"title": "Gantt and dependencies", "text": "Link tasks and see the whole schedule at a glance.", "icon": "calendar-range"},
    {"title": "Critical path and baselines", "text": "Know what drives the end date and track changes against the plan.", "icon": "target"},
    {"title": "Team workload", "text": "See who is over or under loaded before it becomes a problem.", "icon": "users"},
    {"title": "Room to grow", "text": "Move to Platform for risks, issues, change control and finance, and keep every project.", "icon": "trending-up"}
  ]
}'::jsonb),
('solutions/project-teams', 'faq', 'faq', 30, TRUE, '{
  "heading": "Questions from project teams",
  "items": [
    {"title": "Do we need the full Platform?", "text": "No. Planner covers scheduling on its own. Move to Platform later if you need more, and your projects come with you."},
    {"title": "Can we try it first?", "text": "Yes. Start with a free trial and upgrade when you are ready."}
  ]
}'::jsonb),
('solutions/project-teams', 'get-started', 'cta_band', 40, TRUE, '{
  "heading": "Start planning with your team today",
  "primary_cta": {"label": "Get started", "href": "#get-started"},
  "secondary_cta": {"label": "Book a demo", "href": "/contact?topic=sales"}
}'::jsonb),

-- ── Solutions: training and learning ────────────────────────────────────────
('solutions/training', 'hero', 'hero', 10, TRUE, '{
  "heading": "Practise real project decisions without risk",
  "subheading": "Project Nidus Simulator puts learners in project, programme, portfolio and PMO roles on realistic scenarios.",
  "primary_cta": {"label": "Get started", "href": "#get-started"},
  "secondary_cta": {"label": "Talk to us about training", "href": "/contact?topic=sales"}
}'::jsonb),
('solutions/training', 'features', 'feature_grid', 20, TRUE, '{
  "heading": "Learning that feels like the real thing",
  "items": [
    {"title": "Realistic scenarios", "text": "Decisions have consequences, just like on a live project.", "icon": "target"},
    {"title": "Every role", "text": "Practise as a project, programme or portfolio manager, or in the PMO.", "icon": "users"},
    {"title": "Scored progress", "text": "See how decisions play out and where to improve.", "icon": "trending-up"},
    {"title": "Certificates", "text": "Recognise the skills learners have gained.", "icon": "book-open"}
  ]
}'::jsonb),
('solutions/training', 'faq', 'faq', 30, TRUE, '{
  "heading": "Questions about training",
  "items": [
    {"title": "Who is the Simulator for?", "text": "Learners building project management skills, trainers running courses, and organisations preparing people before they manage live projects."},
    {"title": "Does it use the same ways of working as the Platform?", "text": "Yes. Learners practise the same methods they will use on live projects in Project Nidus Platform."}
  ]
}'::jsonb),
('solutions/training', 'get-started', 'cta_band', 40, TRUE, '{
  "heading": "Prepare your people for live projects",
  "primary_cta": {"label": "Get started", "href": "#get-started"},
  "secondary_cta": {"label": "Talk to us", "href": "/contact?topic=sales"}
}'::jsonb)

) AS v(page_slug, section_key, section_type, sort_order, visible, draft)
ON CONFLICT (page_slug, section_key) DO NOTHING;

SELECT page_slug,
       COUNT(*) AS sections,
       COUNT(*) FILTER (WHERE draft IS NOT NULL) AS with_draft,
       COUNT(*) FILTER (WHERE is_active) AS published_and_shown
FROM public.site_sections
GROUP BY page_slug
ORDER BY page_slug;
