-- ============================================================================
-- v958: Industry Capability Content Taxonomy — Phase 13 (MKT: Marketing, Advertising &
-- Creative Services)
-- ============================================================================
-- projectplan/v946_industry_capability_content_taxonomy_plan.md Phase 13.
-- Source: Documentation/Marketing_and_Creative_Menu_Taxonomy.md, filtered through PRD decisions
-- 6a (reuse table) and 0 (PM-of-projects only). 16 of ~35 categories kept as new registers, 11
-- become reuse links (no new local_registers row), the rest dropped entirely (ongoing marketing
-- operations — Market Research, Audience & Segmentation, Editorial Workflow, Social Media,
-- Digital Marketing, Email Marketing, Leads & Conversion, Customer Experience, Marketing
-- Compliance, Asset Rights & Licensing).
--
-- Aggressive leaf-collapsing applied throughout (same discipline as v948 CON) — most categories'
-- leaf lists are facets of ONE campaign/brief/job record (status + fields), not independent
-- registers. E.g. Campaign Management's 10 remaining leaves (after Schedule/Deliverables/Budget/
-- Approvals/Performance are reuse-linked) collapse to a single "Campaign Register" with a
-- 7-stage status_workflow, not 10 separate registers.
--
-- UUID block: 900c. Prerequisites: v931, v932, v946, v946c.
-- ============================================================================

-- ── 1. Category menu_items (16 rows) ────────────────────────────────────────────────────

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, NULL, NULL, 1, v.sort_order, 'universal', 'megaphone', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('mkt_cat_portfolio', 'Marketing Portfolio', 'Overview of the marketing portfolio', 2000),
  ('mkt_cat_strategy', 'Marketing Strategy', 'Marketing strategy activities', 2001),
  ('mkt_cat_brand', 'Brand Management', 'Brand management activities', 2002),
  ('mkt_cat_campaigns', 'Campaign Management', 'Campaign management activities', 2003),
  ('mkt_cat_creative_briefs', 'Creative Briefs', 'Creative brief register', 2004),
  ('mkt_cat_creative_production', 'Creative Production', 'Creative production jobs', 2005),
  ('mkt_cat_design', 'Design Management', 'Design request management', 2006),
  ('mkt_cat_content', 'Content Management', 'Content management activities', 2007),
  ('mkt_cat_media_planning', 'Media Planning & Buying', 'Media planning and buying activities', 2008),
  ('mkt_cat_advertising', 'Advertising', 'Advertising campaign activities', 2009),
  ('mkt_cat_events', 'Events & Activations', 'Event and activation management', 2010),
  ('mkt_cat_product_launches', 'Product Launches', 'Product launch activities', 2011),
  ('mkt_cat_pr', 'Public Relations', 'Public relations activities', 2012),
  ('mkt_cat_influencer', 'Influencer & Partnership Marketing', 'Influencer and partnership marketing', 2013),
  ('mkt_cat_print', 'Print & Production', 'Print production jobs', 2014),
  ('mkt_cat_video', 'Video & Multimedia', 'Video and multimedia projects', 2015)
) AS v(menu_code, menu_label, menu_description, sort_order)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('mkt_cat_%');

-- ── 2. local_registers (33 registers, UUID block 900c) ─────────────────────────────────

INSERT INTO public.local_registers (id, register_key, label, icon, description, scope_level, account_id, status_workflow, is_system_defined, is_active, created_at, updated_at)
SELECT v.id::uuid, v.register_key, v.label, 'list-checks', v.description, 'project', NULL, v.status_workflow::jsonb, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  -- Marketing Portfolio (6, Annual Marketing Calendar dropped — reuse-linked)
  ('00000000-0000-4000-900c-000000000001', 'mkt_marketing_overview', 'Marketing Overview', 'Marketing portfolio overview', '[{"key":"draft","label":"Draft"},{"key":"published","label":"Published"}]'),
  ('00000000-0000-4000-900c-000000000002', 'mkt_campaign_portfolio', 'Campaign Portfolio', 'Campaign portfolio register', '[{"key":"active","label":"Active"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-900c-000000000003', 'mkt_brand_portfolio', 'Brand Portfolio', 'Brand portfolio register', '[{"key":"active","label":"Active"},{"key":"retired","label":"Retired"}]'),
  ('00000000-0000-4000-900c-000000000004', 'mkt_product_service_portfolio', 'Product / Service Portfolio', 'Product/service marketing portfolio register', '[{"key":"active","label":"Active"},{"key":"retired","label":"Retired"}]'),
  ('00000000-0000-4000-900c-000000000005', 'mkt_market_region_portfolio', 'Market / Region Portfolio', 'Market/region portfolio register', '[{"key":"active","label":"Active"},{"key":"planned","label":"Planned"}]'),
  ('00000000-0000-4000-900c-000000000006', 'mkt_strategic_milestones', 'Strategic Marketing Milestones', 'Strategic marketing milestones', '[{"key":"upcoming","label":"Upcoming"},{"key":"met","label":"Met"},{"key":"missed","label":"Missed"}]'),
  -- Marketing Strategy (3, collapsed, Budget Strategy dropped — reuse-linked)
  ('00000000-0000-4000-900c-000000000007', 'mkt_marketing_strategy', 'Marketing Strategy', 'Objectives, target markets, segments, value proposition, positioning and marketing mix', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-900c-000000000008', 'mkt_channel_strategy', 'Channel Strategy', 'Marketing channel strategy', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-900c-000000000009', 'mkt_strategic_initiatives', 'Strategic Initiatives', 'Marketing strategic initiative register', '[{"key":"proposed","label":"Proposed"},{"key":"active","label":"Active"},{"key":"complete","label":"Complete"}]'),
  -- Brand Management (3, collapsed, Brand Assets/Compliance dropped)
  ('00000000-0000-4000-900c-00000000000a', 'mkt_brand_strategy', 'Brand Strategy', 'Brand strategy and architecture', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-900c-00000000000b', 'mkt_brand_guidelines', 'Brand Guidelines', 'Brand guidelines, visual identity and tone of voice', '[{"key":"draft","label":"Draft"},{"key":"review","label":"Review"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-900c-00000000000c', 'mkt_brand_refresh', 'Brand Refresh / Rebrand', 'Brand refresh or rebrand project register', '[{"key":"proposed","label":"Proposed"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  -- Campaign Management (1, heavily collapsed — Schedule/Deliverables/Budget/Approvals/Performance reuse-linked)
  ('00000000-0000-4000-900c-00000000000d', 'mkt_campaign_register', 'Campaign Register', 'Campaign brief, objectives, audience, channels, launch and closure tracking', '[{"key":"briefed","label":"Briefed"},{"key":"objectives_set","label":"Objectives Set"},{"key":"audience_defined","label":"Audience Defined"},{"key":"channels_selected","label":"Channels Selected"},{"key":"approved","label":"Approved"},{"key":"launched","label":"Launched"},{"key":"closed","label":"Closed"}]'),
  -- Creative Briefs (1, collapsed)
  ('00000000-0000-4000-900c-00000000000e', 'mkt_creative_briefs', 'Creative Briefs', 'Creative brief register', '[{"key":"new","label":"New"},{"key":"open","label":"Open"},{"key":"approved","label":"Approved"}]'),
  -- Creative Production (1, collapsed)
  ('00000000-0000-4000-900c-00000000000f', 'mkt_creative_jobs', 'Creative Jobs', 'Copywriting, design, photography, video, animation, illustration, audio and web creative jobs', '[{"key":"requested","label":"Requested"},{"key":"in_progress","label":"In Progress"},{"key":"delivered","label":"Delivered"}]'),
  -- Design Management (1, collapsed)
  ('00000000-0000-4000-900c-000000000010', 'mkt_design_requests', 'Design Requests', 'Design request, concept, draft and approval tracking', '[{"key":"requested","label":"Requested"},{"key":"concepts","label":"Concepts"},{"key":"drafts","label":"Drafts"},{"key":"review","label":"Review"},{"key":"final_artwork","label":"Final Artwork"},{"key":"approved","label":"Approved"}]'),
  -- Content Management (2, collapsed, Content Calendar dropped — reuse-linked)
  ('00000000-0000-4000-900c-000000000011', 'mkt_content_strategy', 'Content Strategy', 'Content strategy register', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-900c-000000000012', 'mkt_content_items', 'Content Items', 'Articles, blog posts, social content, email content, video content, case studies, white papers and thought leadership', '[{"key":"briefed","label":"Briefed"},{"key":"in_progress","label":"In Progress"},{"key":"published","label":"Published"}]'),
  -- Media Planning & Buying (2, collapsed, Spend Tracking/Performance dropped — reuse-linked)
  ('00000000-0000-4000-900c-000000000013', 'mkt_media_strategy', 'Media Strategy', 'Media strategy register', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-900c-000000000014', 'mkt_media_plan', 'Media Plan', 'Media channels, vendors, placements, rates, bookings and flighting schedule', '[{"key":"draft","label":"Draft"},{"key":"booked","label":"Booked"},{"key":"live","label":"Live"}]'),
  -- Advertising (1, collapsed)
  ('00000000-0000-4000-900c-000000000015', 'mkt_advertising_campaigns', 'Advertising Campaigns', 'Advertising brief, concepts, copy, artwork, legal review and production tracking', '[{"key":"brief","label":"Brief"},{"key":"concepts","label":"Concepts"},{"key":"copy_artwork","label":"Copy / Artwork"},{"key":"legal_review","label":"Legal Review"},{"key":"approved","label":"Approved"},{"key":"production","label":"Production"},{"key":"archived","label":"Archived"}]'),
  -- Events & Activations (2, collapsed, Suppliers dropped — reuse-linked)
  ('00000000-0000-4000-900c-000000000016', 'mkt_event_portfolio', 'Event Portfolio', 'Event and activation portfolio register', '[{"key":"planned","label":"Planned"},{"key":"active","label":"Active"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-900c-000000000017', 'mkt_event_register', 'Event Register', 'Event brief, venue, guest list, agenda, sponsorship, production and post-event review tracking', '[{"key":"brief","label":"Brief"},{"key":"planning","label":"Planning"},{"key":"production","label":"Production"},{"key":"event_day","label":"Event Day"},{"key":"post_event_review","label":"Post-Event Review"}]'),
  -- Product Launches (2, collapsed, Launch Assets dropped — reuse-linked)
  ('00000000-0000-4000-900c-000000000018', 'mkt_launch_strategy', 'Launch Strategy', 'Product launch strategy register', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-900c-000000000019', 'mkt_launch_register', 'Launch Register', 'Launch messaging, audience, campaign, sales enablement, readiness and review tracking', '[{"key":"strategy","label":"Strategy"},{"key":"preparation","label":"Preparation"},{"key":"channel_readiness","label":"Channel Readiness"},{"key":"launch_event","label":"Launch Event"},{"key":"go_live","label":"Go-Live"},{"key":"post_launch_review","label":"Post-Launch Review"}]'),
  -- Public Relations (4, Thought Leadership/PR Performance dropped)
  ('00000000-0000-4000-900c-00000000001a', 'mkt_pr_strategy', 'PR Strategy', 'Public relations strategy register', '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'),
  ('00000000-0000-4000-900c-00000000001b', 'mkt_media_contacts', 'Media Contacts', 'Media contact register', '[{"key":"active","label":"Active"},{"key":"inactive","label":"Inactive"}]'),
  ('00000000-0000-4000-900c-00000000001c', 'mkt_pr_activities', 'PR Activities', 'Press releases, media briefings, interviews and crisis communications', '[{"key":"planned","label":"Planned"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'),
  ('00000000-0000-4000-900c-00000000001d', 'mkt_media_coverage', 'Media Coverage', 'Media coverage register', '[{"key":"logged","label":"Logged"},{"key":"reviewed","label":"Reviewed"}]'),
  -- Influencer & Partnership Marketing (2, collapsed, Deliverables/Content Approval/Performance dropped)
  ('00000000-0000-4000-900c-00000000001e', 'mkt_partner_influencer_register', 'Partner & Influencer Register', 'Partner and influencer register', '[{"key":"identified","label":"Identified"},{"key":"engaged","label":"Engaged"},{"key":"active","label":"Active"}]'),
  ('00000000-0000-4000-900c-00000000001f', 'mkt_influencer_campaigns', 'Influencer Campaigns', 'Influencer campaign brief, contract, content approval and posting tracking', '[{"key":"briefed","label":"Briefed"},{"key":"contracted","label":"Contracted"},{"key":"content_approved","label":"Content Approved"},{"key":"posted","label":"Posted"}]'),
  -- Print & Production (1, collapsed)
  ('00000000-0000-4000-900c-000000000020', 'mkt_print_jobs', 'Print Jobs', 'Print specification, artwork, proofs, production and delivery tracking', '[{"key":"specification","label":"Specification"},{"key":"artwork","label":"Artwork"},{"key":"proofs","label":"Proofs"},{"key":"approved","label":"Approved"},{"key":"production","label":"Production"},{"key":"delivered","label":"Delivered"}]'),
  -- Video & Multimedia (1, collapsed)
  ('00000000-0000-4000-900c-000000000021', 'mkt_video_projects', 'Video Projects', 'Video brief, script, storyboard, shoot, editing and distribution tracking', '[{"key":"brief","label":"Brief"},{"key":"script","label":"Script"},{"key":"storyboard","label":"Storyboard"},{"key":"production","label":"Production"},{"key":"editing","label":"Editing"},{"key":"review","label":"Review"},{"key":"distributed","label":"Distributed"}]')
) AS v(id, register_key, label, description, status_workflow)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, status_workflow = EXCLUDED.status_workflow,
  is_active = TRUE, updated_at = NOW();

INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT lr.id, ip.id
FROM public.local_registers lr
JOIN public.industry_packs ip ON ip.industry_category_id = (SELECT id FROM public.industry_categories WHERE name = 'Marketing, Advertising & Creative Services')
WHERE lr.id::text LIKE '00000000-0000-4000-900c-%'
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

-- ── 3. menu_items — one per register, nested under its category ────────────────────────

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'mkt_reg_' || lr.register_key, lr.label, lr.description, '/platform/local-registers/' || lr.id::text,
  (SELECT id FROM public.menu_items WHERE menu_code = v.category_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  2, v.sort_order, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('00000000-0000-4000-900c-000000000001','mkt_cat_portfolio',2010),('00000000-0000-4000-900c-000000000002','mkt_cat_portfolio',2011),
  ('00000000-0000-4000-900c-000000000003','mkt_cat_portfolio',2012),('00000000-0000-4000-900c-000000000004','mkt_cat_portfolio',2013),
  ('00000000-0000-4000-900c-000000000005','mkt_cat_portfolio',2014),('00000000-0000-4000-900c-000000000006','mkt_cat_portfolio',2015),
  ('00000000-0000-4000-900c-000000000007','mkt_cat_strategy',2020),('00000000-0000-4000-900c-000000000008','mkt_cat_strategy',2021),
  ('00000000-0000-4000-900c-000000000009','mkt_cat_strategy',2022),
  ('00000000-0000-4000-900c-00000000000a','mkt_cat_brand',2030),('00000000-0000-4000-900c-00000000000b','mkt_cat_brand',2031),
  ('00000000-0000-4000-900c-00000000000c','mkt_cat_brand',2032),
  ('00000000-0000-4000-900c-00000000000d','mkt_cat_campaigns',2040),
  ('00000000-0000-4000-900c-00000000000e','mkt_cat_creative_briefs',2050),
  ('00000000-0000-4000-900c-00000000000f','mkt_cat_creative_production',2060),
  ('00000000-0000-4000-900c-000000000010','mkt_cat_design',2070),
  ('00000000-0000-4000-900c-000000000011','mkt_cat_content',2080),('00000000-0000-4000-900c-000000000012','mkt_cat_content',2081),
  ('00000000-0000-4000-900c-000000000013','mkt_cat_media_planning',2090),('00000000-0000-4000-900c-000000000014','mkt_cat_media_planning',2091),
  ('00000000-0000-4000-900c-000000000015','mkt_cat_advertising',2100),
  ('00000000-0000-4000-900c-000000000016','mkt_cat_events',2110),('00000000-0000-4000-900c-000000000017','mkt_cat_events',2111),
  ('00000000-0000-4000-900c-000000000018','mkt_cat_product_launches',2120),('00000000-0000-4000-900c-000000000019','mkt_cat_product_launches',2121),
  ('00000000-0000-4000-900c-00000000001a','mkt_cat_pr',2130),('00000000-0000-4000-900c-00000000001b','mkt_cat_pr',2131),
  ('00000000-0000-4000-900c-00000000001c','mkt_cat_pr',2132),('00000000-0000-4000-900c-00000000001d','mkt_cat_pr',2133),
  ('00000000-0000-4000-900c-00000000001e','mkt_cat_influencer',2140),('00000000-0000-4000-900c-00000000001f','mkt_cat_influencer',2141),
  ('00000000-0000-4000-900c-000000000020','mkt_cat_print',2150),
  ('00000000-0000-4000-900c-000000000021','mkt_cat_video',2160)
) AS v(register_id, category_code, sort_order)
JOIN public.local_registers lr ON lr.id = v.register_id::uuid
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- ── 4. Reuse links (PRD decision 6a) — 11 categories, no new local_registers rows ───────
-- Routes verified against apps/platform/src/routes/platformRoutes.jsx before use (not guessed —
-- an earlier draft of this file had 5 wrong paths, caught and fixed here). Two verified-real
-- destinations (Cost Management, Procurement) are project-scoped routes
-- (`projects/:projectId/costs`, no generic project-agnostic procurement page found) that this
-- generic, project-agnostic menu_items row cannot resolve a live :projectId into — flagged
-- explicitly rather than shipped as a silently-broken link; Marketing Budget/Agencies & Suppliers
-- point at Reports/Governance instead as the closest working generic destination until a
-- project-context-aware reuse-link mechanism exists (out of scope for this PRD).

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'mkt_reuse_risks_issues', 'Marketing Risks & Issues', 'Marketing risk and issue register',
    '/platform/raid-log', (SELECT id FROM public.menu_items WHERE menu_code = 'mkt_cat_portfolio' LIMIT 1), 2, 2016, 'universal', 'alert-triangle', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'mkt_reuse_budget', 'Marketing Budget', 'Marketing budget management (see project Cost Management for project-scoped budget)',
    '/platform/reports', (SELECT id FROM public.menu_items WHERE menu_code = 'mkt_cat_strategy' LIMIT 1), 2, 2023, 'universal', 'dollar-sign', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'mkt_reuse_resources', 'Creative Resource Management', 'Creative team resource management',
    '/platform/resources', (SELECT id FROM public.menu_items WHERE menu_code = 'mkt_cat_creative_production' LIMIT 1), 2, 2061, 'universal', 'users', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'mkt_reuse_approvals', 'Approvals & Governance', 'Marketing approvals and governance',
    '/platform/governance', (SELECT id FROM public.menu_items WHERE menu_code = 'mkt_cat_campaigns' LIMIT 1), 2, 2041, 'universal', 'shield-check', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'mkt_reuse_suppliers', 'Agencies & Suppliers', 'Marketing agency and supplier management (see PMO Procurement for RFP-based procurement)',
    '/platform/governance', (SELECT id FROM public.menu_items WHERE menu_code = 'mkt_cat_events' LIMIT 1), 2, 2112, 'universal', 'briefcase', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'mkt_reuse_calendar', 'Marketing Calendar', 'Marketing calendar',
    '/platform/tasks/calendar', (SELECT id FROM public.menu_items WHERE menu_code = 'mkt_cat_portfolio' LIMIT 1), 2, 2017, 'universal', 'calendar', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'mkt_reuse_campaign_schedule', 'Campaign Schedule', 'Campaign scheduling',
    '/platform/tasks/calendar', (SELECT id FROM public.menu_items WHERE menu_code = 'mkt_cat_campaigns' LIMIT 1), 2, 2042, 'universal', 'calendar-clock', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'mkt_reuse_campaign_deliverables', 'Campaign Deliverables', 'Campaign deliverable management',
    '/platform/scope/requirements', (SELECT id FROM public.menu_items WHERE menu_code = 'mkt_cat_campaigns' LIMIT 1), 2, 2043, 'universal', 'package', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'mkt_reuse_assets', 'Marketing Assets', 'Marketing asset and document management',
    '/platform/documents/project', (SELECT id FROM public.menu_items WHERE menu_code = 'mkt_cat_portfolio' LIMIT 1), 2, 2018, 'universal', 'folder', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'mkt_reuse_lessons', 'Marketing Knowledge & Lessons', 'Marketing lessons learned',
    '/platform/lessons/corporate', (SELECT id FROM public.menu_items WHERE menu_code = 'mkt_cat_portfolio' LIMIT 1), 2, 2019, 'universal', 'book-open', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'mkt_reuse_analytics', 'Performance & Analytics', 'Marketing performance reporting',
    '/platform/reports', (SELECT id FROM public.menu_items WHERE menu_code = 'mkt_cat_portfolio' LIMIT 1), 2, 2020, 'universal', 'bar-chart', TRUE, TRUE, NOW(), NOW())
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- ── 5. Role grants (both prefixes share "mkt_re") ───────────────────────────────────────

SELECT public.grant_menu_role_group('mkt_re%');

-- ── 6. industry_pack_menu_items ─────────────────────────────────────────────────────────

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT DISTINCT lrip.industry_pack_id, mi.id
FROM public.local_register_industry_packs lrip
JOIN public.local_registers lr ON lr.id = lrip.register_id
JOIN public.menu_items mi ON mi.route_path = '/platform/local-registers/' || lr.id::text
WHERE lr.id::text LIKE '00000000-0000-4000-900c-%' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT ip.id, mi.id
FROM public.menu_items mi
JOIN public.industry_packs ip ON ip.industry_category_id = (SELECT id FROM public.industry_categories WHERE name = 'Marketing, Advertising & Creative Services')
WHERE mi.menu_code LIKE 'mkt_reuse_%' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

DO $$
DECLARE v_registers INT;
BEGIN
  SELECT COUNT(*) INTO v_registers FROM public.local_registers WHERE id::text LIKE '00000000-0000-4000-900c-%';
  RAISE NOTICE 'v958: MKT phase complete — % registers across 16 categories + 11 reuse links', v_registers;
END $$;
