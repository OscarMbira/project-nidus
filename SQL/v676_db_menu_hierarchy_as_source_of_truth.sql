-- =============================================================================
-- v676: DB as the single source of truth for sidebar menu hierarchy
--
-- Problem: applyRoleSidebarRevamp() in useMenu.js uses 700+ lines of regex-based
-- matchCategory() to infer where each DB item belongs. Every DB change breaks it.
--
-- Fix: Category nodes are REAL DB rows. Items are parented to their correct category
-- via this migration. useMenu.js just reads the tree and adds visual track headers.
--
-- Steps:
--   1. Create / reactivate the PMO category rows (pmo-cat-exec, pmo-cat-project-delivery, etc.)
--   2. Re-parent items sitting under legacy section headers (pmo_section_*, pmo_admin_section)
--   3. Deactivate the legacy section header rows
--   4. Assign root-level items to categories in priority order
--   5. Tag methodology on category rows so track headers render correctly
-- =============================================================================

-- ─── STEP 1: Create / reactivate PMO category rows ───────────────────────────
-- Universal section categories

INSERT INTO public.menu_items
  (id, menu_code, menu_label, route_path, parent_menu_id, menu_level,
   sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT
  gen_random_uuid(), v.menu_code, v.menu_label, NULL, NULL, 1,
  v.sort_order, 'universal', v.menu_icon, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('pmo-cat-exec',                 'Executive Overview',        10,  'layout-dashboard'),
  ('pmo-cat-project-delivery',     'Project Delivery',          20,  'folder-kanban'),
  ('pmo-cat-process-templates',    'Process Templates',         58,  'layers'),
  ('pmo-cat-reporting-intelligence','Reporting & Intelligence', 60,  'bar-chart'),
  ('pmo-cat-workflows-approvals',  'Workflows & Approvals',     70,  'git-branch'),
  ('pmo-cat-teams',                'People & Resources',        80,  'users'),
  ('pmo-cat-stakeholders',         'Stakeholders',              90,  'users-2'),
  ('pmo-cat-knowledge-assets',     'Knowledge & Assets',        100, 'bookmark'),
  ('pmo-cat-audit-compliance',     'Audit Trail & Compliance',  110, 'shield'),
  ('pmo-cat-email-notifications',  'Email & Notifications',     120, 'mail'),
  ('pmo-cat-admin',                'PMO Administration',        130, 'settings'),
  ('pmo-cat-system-admin',         'System Administration',     140, 'settings-2'),
  ('pmo-cat-help',                 'Help',                      150, 'help-circle'),
  ('pmo-cat-support',              'Support',                   160, 'life-buoy')
) AS v(menu_code, menu_label, sort_order, menu_icon)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items m
  WHERE m.menu_code = v.menu_code AND COALESCE(m.is_deleted, FALSE) = FALSE
);

-- Reactivate any existing rows (may have been deactivated by v675)
UPDATE public.menu_items
SET is_active = TRUE, is_visible = TRUE, methodology = 'universal', updated_at = NOW()
WHERE menu_code IN (
  'pmo-cat-exec', 'pmo-cat-project-delivery', 'pmo-cat-process-templates',
  'pmo-cat-reporting-intelligence', 'pmo-cat-workflows-approvals', 'pmo-cat-teams',
  'pmo-cat-stakeholders', 'pmo-cat-knowledge-assets', 'pmo-cat-audit-compliance',
  'pmo-cat-email-notifications', 'pmo-cat-admin', 'pmo-cat-system-admin',
  'pmo-cat-help', 'pmo-cat-support'
)
AND COALESCE(is_deleted, FALSE) = FALSE;

-- Methodology track categories (appear under [S]/[P]/[A] track headers)
INSERT INTO public.menu_items
  (id, menu_code, menu_label, route_path, parent_menu_id, menu_level,
   sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT
  gen_random_uuid(), v.menu_code, v.menu_label, NULL, NULL, 1,
  v.sort_order, v.methodology, v.menu_icon, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('pmo-cat-initiation',          'Pre-Project Docs',           31,  'structured', 'briefcase'),
  ('pmo-cat-governance-standards','Governance & Standards',     32,  'structured', 'shield'),
  ('pmo-cat-pmbok',               'Process Group Forms',        40,  'pmbok',      'clipboard-list'),
  ('pmo-cat-agile-lean',          'Agile & Lean Tools',         50,  'agile',      'zap')
) AS v(menu_code, menu_label, sort_order, methodology, menu_icon)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items m
  WHERE m.menu_code = v.menu_code AND COALESCE(m.is_deleted, FALSE) = FALSE
);

-- Reactivate methodology track categories
UPDATE public.menu_items
SET is_active = TRUE, is_visible = TRUE, parent_menu_id = NULL, updated_at = NOW()
WHERE menu_code IN ('pmo-cat-initiation', 'pmo-cat-governance-standards', 'pmo-cat-pmbok', 'pmo-cat-agile-lean')
AND COALESCE(is_deleted, FALSE) = FALSE;

-- Set correct methodology on track categories
UPDATE public.menu_items SET methodology = 'structured', updated_at = NOW()
WHERE menu_code IN ('pmo-cat-initiation', 'pmo-cat-governance-standards')
AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items SET methodology = 'pmbok', updated_at = NOW()
WHERE menu_code = 'pmo-cat-pmbok' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items SET methodology = 'agile', updated_at = NOW()
WHERE menu_code = 'pmo-cat-agile-lean' AND COALESCE(is_deleted, FALSE) = FALSE;

-- ─── STEP 2: Re-parent items under legacy section headers ─────────────────────
-- Items under these containers need to be moved to their correct category.
-- Leaf items (route_path IS NOT NULL) are moved to category parents.
-- Container items (route_path IS NULL, has children) are moved to parent_menu_id = NULL
-- so they appear as expandable groups under the category.

-- Items under pmo_section_initiation → pmo-cat-initiation
UPDATE public.menu_items AS child
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS sec, public.menu_items AS cat
WHERE child.parent_menu_id = sec.id
  AND sec.menu_code = 'pmo_section_initiation'
  AND cat.menu_code = 'pmo-cat-initiation'
  AND COALESCE(child.is_deleted, FALSE) = FALSE;

-- Items under pm_section_initiation → pmo-cat-initiation
UPDATE public.menu_items AS child
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS sec, public.menu_items AS cat
WHERE child.parent_menu_id = sec.id
  AND sec.menu_code = 'pm_section_initiation'
  AND cat.menu_code = 'pmo-cat-initiation'
  AND COALESCE(child.is_deleted, FALSE) = FALSE;

-- Items under pmo_section_governance → pmo-cat-governance-standards
UPDATE public.menu_items AS child
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS sec, public.menu_items AS cat
WHERE child.parent_menu_id = sec.id
  AND sec.menu_code IN ('pmo_section_governance', 'pm_section_governance')
  AND cat.menu_code = 'pmo-cat-governance-standards'
  AND COALESCE(child.is_deleted, FALSE) = FALSE;

-- Items under pmo_admin_section → pmo-cat-admin
UPDATE public.menu_items AS child
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS sec, public.menu_items AS cat
WHERE child.parent_menu_id = sec.id
  AND sec.menu_code IN ('pmo_admin_section', 'pmo_section_platform_config', 'platform_governance_admin')
  AND cat.menu_code = 'pmo-cat-admin'
  AND COALESCE(child.is_deleted, FALSE) = FALSE;

-- Items under pmo_process_templates_section → pmo-cat-process-templates
UPDATE public.menu_items AS child
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS sec, public.menu_items AS cat
WHERE child.parent_menu_id = sec.id
  AND sec.menu_code IN (
    'pmo_process_templates_section',
    'pm_process_templates_section',
    'sim_pmo_process_templates_section'
  )
  AND cat.menu_code = 'pmo-cat-process-templates'
  AND COALESCE(child.is_deleted, FALSE) = FALSE;

-- ─── STEP 3: Deactivate legacy section header rows ────────────────────────────
UPDATE public.menu_items
SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code IN (
  'pmo_section_initiation',
  'pm_section_initiation',
  'pmo_section_governance',
  'pm_section_governance',
  'pmo_admin_section',
  'pmo_section_platform_config',
  'platform_governance_admin',
  'pmo_process_templates_section',
  'pm_process_templates_section',
  'sim_pmo_process_templates_section'
)
AND COALESCE(is_deleted, FALSE) = FALSE;

-- ─── STEP 4: Assign root-level items to categories (priority order) ───────────
-- Only items with parent_menu_id IS NULL that are not category rows themselves.
-- Run in priority order (like matchCategory early returns).

-- 4a. Process Templates (highest priority — pmo_pt_* codes, process-templates routes)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'pmo-cat-process-templates'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'pmo-cat-%'
  AND item.id <> cat.id
  AND (
    item.menu_code LIKE 'pmo_pt_%'
    OR item.menu_code LIKE 'sim_pt_%'
    OR item.route_path ILIKE '%/pmo/process-templates%'
    OR item.route_path ILIKE '%/pmo/industry-templates%'
    OR item.route_path ILIKE '%/process-templates%'
    OR item.menu_label ILIKE 'process templates'
    OR item.menu_label ILIKE 'industry templates'
  );

-- 4b. Executive Overview (dashboard, portfolio, programme, planning intelligence)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'pmo-cat-exec'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'pmo-cat-%'
  AND item.id <> cat.id
  AND (
    -- Dashboard (but not monitoring/performance dashboards → system-admin)
    (item.route_path ILIKE '%/platform/dashboard%'
      AND item.menu_label NOT ILIKE '%monitoring%'
      AND item.menu_label NOT ILIKE '%performance dashboard%')
    -- Portfolio
    OR item.route_path ILIKE '%/platform/portfolio%'
    OR item.menu_label ILIKE 'portfolio'
    OR item.menu_label ILIKE 'portfolio dependencies'
    OR item.menu_label ILIKE 'portfolio collisions'
    OR item.menu_label ILIKE 'portfolio map'
    OR item.menu_label ILIKE 'strategic alignment'
    OR item.menu_label ILIKE 'benefits pipeline'
    -- Programme
    OR item.route_path ILIKE '%/platform/programme%'
    OR item.route_path ILIKE '%/platform/benefits%'
    OR item.menu_label ILIKE 'programme'
    OR item.menu_label ILIKE 'programme management'
    OR item.menu_label ILIKE 'programme projects'
    OR item.menu_label ILIKE 'programme dependencies'
    OR item.menu_label ILIKE 'programme benefits'
    OR item.menu_label ILIKE 'benefits management'
    -- Planning Intelligence
    OR item.route_path ILIKE '%planning-intelligence%'
    OR item.route_path ILIKE '%intelligence-rules%'
    OR item.route_path ILIKE '%governance-rules-config%'
    OR item.menu_code ILIKE '%pmo_intel%'
    OR item.menu_label ILIKE '%planning intelligence%'
    OR item.menu_label ILIKE '%intelligence rules%'
  );

-- 4c. PMBOK Process Group Forms
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'pmo-cat-pmbok'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'pmo-cat-%'
  AND item.id <> cat.id
  AND (
    item.route_path ILIKE '%/process-group-forms%'
    OR item.route_path ILIKE '%/forms?group=%'
    OR item.menu_code ILIKE '%_itto_%'
    OR item.menu_label ILIKE '%process group%'
    OR item.menu_label ILIKE '%itto template%'
    OR item.menu_label ILIKE '%itto project%'
    OR item.menu_label ILIKE '%itto draft%'
  );

-- 4d. Structured / Traditional — Initiation (mandates, briefs, business cases, BRPs)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'pmo-cat-initiation'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'pmo-cat-%'
  AND item.id <> cat.id
  AND (
    item.route_path ILIKE '%/pmo/initiation/%'
    OR item.route_path ILIKE '%/pm/initiation/%'
    OR item.route_path ILIKE '%/platform/mandates%'
    OR item.route_path ILIKE '%/platform/briefs%'
    OR item.route_path ILIKE '%/pmo/initiation/business-case%'
    OR item.route_path ILIKE '%/pmo/governance/mandate%'
    OR item.menu_code IN ('pmo_init_project_mandate', 'pmo_gov_mandate', 'pmo_init_business_case', 'pmo_init_project_brief')
    OR item.menu_label ILIKE '%project mandate%'
    OR item.menu_label ILIKE '%project brief%'
    OR item.menu_label ILIKE '%business case%'
    OR item.menu_label ILIKE '%benefits review plan%'
  );

-- 4e. Structured / Traditional — Governance & Standards
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'pmo-cat-governance-standards'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'pmo-cat-%'
  AND item.id <> cat.id
  AND (
    item.menu_label ILIKE '%communication management strategy%'
    OR item.menu_label ILIKE '%configuration management strategy%'
    OR item.menu_label ILIKE '%quality management strategy%'
    OR item.menu_label ILIKE '%risk management strategy%'
    OR item.route_path ILIKE '%/platform/eef%'
    OR item.route_path ILIKE '%/eef%'
    OR item.menu_label ILIKE '%environmental factor%'
    OR item.menu_label ILIKE '%eef%'
    OR item.menu_code ILIKE '%_eef%'
    OR item.route_path ILIKE '%governance/framework%'
    OR item.route_path ILIKE '%governance/policy%'
    OR item.route_path ILIKE '%governance/decision-log%'
    OR (item.menu_label ILIKE '%governance%' AND item.route_path IS NULL
        AND item.menu_code NOT ILIKE 'pmo-cat-%')
  );

-- 4f. Agile & Lean Tools
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'pmo-cat-agile-lean'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'pmo-cat-%'
  AND item.id <> cat.id
  AND (
    item.route_path ILIKE '%/scrum/scrum-of-scrums%'
    OR item.route_path ILIKE '%/lean/value-stream-map%'
    OR item.route_path ILIKE '%/lean/kaizen%'
    OR item.menu_label ILIKE '%scrum of scrums%'
    OR item.menu_label ILIKE '%value stream map%'
    OR item.menu_label ILIKE '%kaizen board%'
    OR item.route_path ILIKE '%/pmo/collaboration/whiteboard%'
    OR item.route_path ILIKE '%/pmo/planning/planning-poker%'
    OR item.menu_label ILIKE '%planning poker%'
    OR item.menu_label ILIKE '%whiteboard%'
  );

-- 4g. Project Delivery (projects, oversight, risk/issue registers, scope/schedule)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'pmo-cat-project-delivery'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'pmo-cat-%'
  AND item.id <> cat.id
  AND (
    item.route_path ILIKE '%/platform/projects%'
    OR item.route_path ILIKE '%/app/projects%'
    OR item.route_path ILIKE '%/app/project-members%'
    OR item.route_path ILIKE '%/platform/project-members%'
    OR item.route_path ILIKE '%/app/daily-log%'
    OR item.menu_label ILIKE 'projects'
    OR item.menu_label ILIKE 'my projects'
    OR item.menu_label ILIKE 'all projects'
    OR item.menu_label ILIKE 'create project'
    OR item.menu_label ILIKE 'project dashboard'
    OR item.menu_label ILIKE 'archived projects'
    OR item.menu_label ILIKE 'on hold%'
    OR item.menu_label ILIKE 'project oversight'
    OR item.menu_label ILIKE 'risk register'
    OR item.menu_label ILIKE 'enterprise risk%'
    OR item.menu_label ILIKE 'issue register'
    OR item.menu_label ILIKE 'issue log'
    OR item.menu_label ILIKE 'quality register'
    OR item.menu_label ILIKE 'lessons log'
    OR item.menu_label ILIKE '%scope oversight%'
    OR item.menu_label ILIKE '%schedule oversight%'
    OR item.menu_label ILIKE 'delay register'
    OR item.menu_label ILIKE 'change register'
    OR item.menu_label ILIKE 'change log'
    OR item.menu_label ILIKE 'story map'
    OR item.menu_label ILIKE 'releases'
    OR item.menu_label ILIKE 'manage members'
    OR item.menu_label ILIKE 'daily log'
    OR item.menu_code ILIKE 'platform_projects%'
    OR item.menu_code ILIKE 'pm_projects%'
    OR item.route_path ILIKE '%/platform/scope%'
    OR item.route_path ILIKE '%/platform/schedule%'
    OR item.route_path ILIKE '%/platform/delays%'
    OR item.route_path ILIKE '%/platform/changes%'
  );

-- 4h. Reporting & Intelligence (reports, analytics, financial, EVM)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'pmo-cat-reporting-intelligence'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'pmo-cat-%'
  AND item.id <> cat.id
  AND (
    item.menu_label ILIKE '%highlight report%'
    OR item.menu_label ILIKE '%exception report%'
    OR item.menu_label ILIKE '%end stage report%'
    OR item.menu_label ILIKE '%end project report%'
    OR item.menu_label ILIKE '%lessons report%'
    OR item.menu_label ILIKE '%report library%'
    OR item.menu_label ILIKE '%analytics dashboard%'
    OR item.menu_label ILIKE '%dashboard builder%'
    OR item.menu_label ILIKE '%scheduled reports%'
    OR item.menu_label ILIKE '%agile metrics hub%'
    OR item.menu_label ILIKE '%sprint metrics%'
    OR item.menu_label ILIKE '%lean metrics%'
    OR item.menu_label ILIKE 'financial reports'
    OR item.menu_label ILIKE '%portfolio evm%'
    OR item.menu_label ILIKE '%expense approval%'
    OR item.menu_label ILIKE '%expense threshold%'
    OR item.route_path ILIKE '%/reports%'
    OR item.route_path ILIKE '%/reporting%'
    OR item.route_path ILIKE '%/analytics%'
    OR item.route_path ILIKE '%/financial-reports%'
    OR item.route_path ILIKE '%/evm%'
    OR item.route_path ILIKE '%/expenses%'
    OR item.route_path ILIKE '%/scrum/metrics%'
    OR item.route_path ILIKE '%/lean/metrics%'
    OR item.route_path ILIKE '%/agile/metrics%'
    OR item.route_path ILIKE '%/s-curve%'
    OR item.route_path ILIKE '%/closure/lessons-report%'
    OR item.menu_code ILIKE '%_reporting_%'
    OR item.menu_code ILIKE '%_highlight_%'
    OR item.menu_code ILIKE '%_exception_%'
    OR item.menu_code ILIKE '%_evm_%'
    OR item.menu_code ILIKE '%_financial_%'
  );

-- 4i. Workflows & Approvals (authorisation, lifecycle, quality assurance, approvals)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'pmo-cat-workflows-approvals'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'pmo-cat-%'
  AND item.id <> cat.id
  AND (
    item.route_path ILIKE '%/pmo/authorisation/%'
    OR item.route_path ILIKE '%/pm/authorisation/%'
    OR item.menu_label ILIKE '%authorisation queue%'
    OR item.menu_label ILIKE '%lifecycle dashboard%'
    OR item.menu_label ILIKE '%configure lifecycle%'
    OR item.menu_label ILIKE '%approval chains%'
    OR item.menu_label ILIKE '%archive retention%'
    OR item.menu_label ILIKE '%archive vault%'
    OR item.menu_label ILIKE '%mandate pending approval%'
    OR item.menu_label ILIKE '%brief pending approval%'
    OR item.menu_label ILIKE '%pending approval%'
    OR item.menu_label ILIKE '%pending my approval%'
    OR item.menu_label ILIKE '%quality assurance%'
    OR item.menu_label ILIKE '%quality review%'
    OR item.menu_label ILIKE '%quality inspection%'
    OR item.menu_label ILIKE '%audit finding%'
    OR item.menu_label ILIKE '%capa%'
    OR item.menu_label ILIKE '%test plan%'
    OR item.menu_label ILIKE '%test case%'
    OR item.menu_label ILIKE '%defect register%'
    OR item.menu_label ILIKE '%stage gate%'
    OR item.menu_label ILIKE '%decision log%'
    OR item.menu_label ILIKE '%work authorisation%'
    OR item.menu_code ILIKE '%_authorisation_%'
    OR item.menu_code ILIKE '%_lifecycle_%'
    OR item.menu_code ILIKE '%_approval_%'
  );

-- 4j. People & Resources (teams, manager assignments, invitations, resource directory)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'pmo-cat-teams'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'pmo-cat-%'
  AND item.id <> cat.id
  AND (
    item.route_path ILIKE '%/platform/teams%'
    OR item.route_path ILIKE '%/teams/%'
    OR item.route_path ILIKE '%/pmo-admin/manager-assignments%'
    OR item.route_path ILIKE '%/pmo-admin/appointments%'
    OR item.route_path ILIKE '%/pmo-admin/invitation%'
    OR item.route_path ILIKE '%send-role-invitation%'
    OR item.route_path ILIKE '%assign-roles%'
    OR item.route_path ILIKE '%/pmo-admin/users%'
    OR item.menu_label ILIKE 'teams'
    OR item.menu_label ILIKE 'all teams'
    OR item.menu_label ILIKE 'my team'
    OR item.menu_label ILIKE 'resource directory'
    OR item.menu_label ILIKE 'skill matrix'
    OR item.menu_label ILIKE 'team capacity'
    OR item.menu_label ILIKE '%manager assignment%'
    OR item.menu_label ILIKE '%appointment tracker%'
    OR item.menu_label ILIKE '%invitation tracker%'
    OR item.menu_label ILIKE '%send invitation%'
    OR item.menu_label ILIKE 'assign roles'
    OR item.menu_label ILIKE 'add users'
    OR item.menu_code ILIKE 'pmo_admin_manager%'
    OR item.menu_code ILIKE 'pmo_admin_invitation%'
    OR item.menu_code ILIKE 'pmo_admin_assign%'
    OR item.menu_code ILIKE 'pmo_assignment%'
    OR item.menu_code ILIKE 'pmo_appointment%'
    OR item.menu_code ILIKE 'teams_%'
    OR item.menu_code ILIKE 'tm_team_%'
  );

-- 4k. Stakeholders
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'pmo-cat-stakeholders'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'pmo-cat-%'
  AND item.id <> cat.id
  AND item.menu_code NOT IN ('platform_stakeholders', 'platform_people_stakeholders')
  AND (
    item.route_path ILIKE '%/platform/stakeholders%'
    OR item.menu_label ILIKE '%stakeholder register%'
    OR item.menu_label ILIKE '%stakeholder analysis%'
    OR item.menu_label ILIKE '%engagement planning%'
    OR item.menu_label ILIKE '%communication plan%'
    OR item.menu_label ILIKE '%power/interest matrix%'
    OR item.menu_label ILIKE '%assessment matrix%'
    OR item.menu_code ILIKE '%_stakeholder_%'
  );

-- 4l. Knowledge & Assets (org knowledge, OPA, procurement, industry templates)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'pmo-cat-knowledge-assets'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'pmo-cat-%'
  AND item.id <> cat.id
  AND (
    item.route_path ILIKE '%/platform/org-knowledge%'
    OR item.route_path ILIKE '%/platform/opa%'
    OR item.route_path ILIKE '%/platform/industry-templates%'
    OR item.route_path ILIKE '%/pmo/procurement%'
    OR item.route_path ILIKE '%/rfp%'
    OR item.route_path ILIKE '%/vendor%'
    OR item.route_path ILIKE '%/purchase-orders%'
    OR item.menu_label ILIKE '%org knowledge hub%'
    OR item.menu_label ILIKE '%process assets%'
    OR item.menu_label ILIKE '%add opa%'
    OR item.menu_label ILIKE '%opa drafts%'
    OR item.menu_label ILIKE '%opa bulk%'
    OR item.menu_label ILIKE '%industry templates%'
    OR item.menu_label ILIKE '%rfp register%'
    OR item.menu_label ILIKE '%vendor register%'
    OR item.menu_label ILIKE '%purchase request%'
    OR item.menu_label ILIKE '%procurement%'
    OR item.menu_code ILIKE 'proc_%'
    OR item.menu_code ILIKE 'template_library%'
    OR item.menu_code ILIKE 'pmo_opa_%'
    OR item.menu_code ILIKE '%_knowledge_%'
  );

-- 4m. Email & Notifications
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'pmo-cat-email-notifications'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'pmo-cat-%'
  AND item.id <> cat.id
  AND (
    item.route_path ILIKE '%/platform/admin/email-settings%'
    OR item.route_path ILIKE '%/email-sender-profiles%'
    OR item.route_path ILIKE '%/invitation-settings%'
    OR item.route_path ILIKE '%/settings/notifications%'
    OR item.route_path ILIKE '%/comms/messages%'
    OR item.route_path ILIKE '%/comms/direct%'
    OR item.route_path ILIKE '%/comms/meetings%'
    OR item.route_path ILIKE '%/comms/pending%'
    OR item.menu_label ILIKE '%email settings%'
    OR item.menu_label ILIKE '%sender profiles%'
    OR item.menu_label ILIKE '%invitation templates%'
    OR item.menu_label ILIKE '%invitation expiry%'
    OR item.menu_label ILIKE 'messages'
    OR item.menu_label ILIKE 'direct messages'
    OR item.menu_label ILIKE 'meetings'
    OR item.menu_label ILIKE '%pending ai review%'
    OR item.menu_label ILIKE '%notification preference%'
    OR item.menu_code ILIKE 'pmo_email_%'
    OR item.menu_code ILIKE '%_notification%'
  );

-- 4n. System Administration (platform settings, auth, GDPR, roles & permissions)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'pmo-cat-system-admin'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'pmo-cat-%'
  AND item.id <> cat.id
  AND (
    item.menu_code IN ('pmo_sys_platform_settings', 'pmo_sys_pwa_settings', 'platform_settings', 'pwa_settings')
    OR item.route_path ILIKE '%/platform/settings%'
    OR item.route_path ILIKE '%/pwa-settings%'
    OR item.route_path ILIKE '%/authentication-settings%'
    OR item.route_path ILIKE '%/encryption%'
    OR item.route_path ILIKE '%/gdpr%'
    OR item.route_path ILIKE '%/roles-permissions%'
    OR item.route_path ILIKE '%/help-content%'
    OR item.route_path ILIKE '%/feedback-analysis%'
    OR item.route_path ILIKE '%/monitoring-dashboard%'
    OR item.menu_label ILIKE '%platform settings%'
    OR item.menu_label ILIKE '%pwa settings%'
    OR item.menu_label ILIKE '%authentication settings%'
    OR item.menu_label ILIKE '%encryption%'
    OR item.menu_label ILIKE '%gdpr%'
    OR item.menu_label ILIKE '%roles & permissions%'
    OR item.menu_label ILIKE '%help content management%'
    OR item.menu_label ILIKE '%feedback analysis%'
    OR item.menu_label ILIKE '%monitoring dashboard%'
    OR item.menu_code ILIKE 'pmo_sys_%'
  );

-- 4o. PMO Administration (catch-all for admin items: org settings, branding, user mgmt, etc.)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'pmo-cat-admin'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'pmo-cat-%'
  AND item.id <> cat.id
  AND (
    item.route_path ILIKE '%/pmo-admin/%'
    OR item.route_path ILIKE '%/platform/admin/%'
    OR item.route_path ILIKE '%/platform/organisation/%'
    OR item.route_path ILIKE '%/platform/subscription%'
    OR item.menu_label ILIKE '%organisation settings%'
    OR item.menu_label ILIKE '%branding%'
    OR item.menu_label ILIKE '%user management%'
    OR item.menu_label ILIKE '%role menu access%'
    OR item.menu_label ILIKE '%project types%'
    OR item.menu_label ILIKE '%project statuses%'
    OR item.menu_label ILIKE '%funding sources%'
    OR item.menu_label ILIKE '%budget categories%'
    OR item.menu_label ILIKE '%subscription%'
    OR item.menu_label ILIKE '%integrations%'
    OR item.menu_label ILIKE '%local data extensions%'
    OR item.menu_label ILIKE '%form templates%'
    OR item.menu_code ILIKE 'pmo_admin_%'
    OR item.menu_code ILIKE 'lde_%'
    OR item.menu_code ILIKE 'pmo_role_%'
  );

-- ─── STEP 5: Ensure OKR / Strategy items go to Knowledge & Assets ─────────────
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'pmo-cat-knowledge-assets'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'pmo-cat-%'
  AND item.id <> cat.id
  AND (
    item.route_path ILIKE '%/okr%'
    OR item.route_path ILIKE '%/strategy/okr%'
    OR item.menu_label ILIKE '%okr dashboard%'
    OR item.menu_label ILIKE '%objectives%key result%'
    OR item.menu_label ILIKE '%alignment map%'
    OR item.menu_label ILIKE '%okr check%'
    OR item.menu_code ILIKE '%_okr_%'
    OR item.menu_code ILIKE 'pmo_strategy_%'
  );

-- ─── STEP 6: Clean up — deactivate any remaining orphan pmo-cat-* nodes ──────
-- Keep only the ones we just created/reactivated above.
UPDATE public.menu_items
SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code LIKE 'pmo-cat-%'
  AND route_path IS NULL
  AND COALESCE(is_deleted, FALSE) = FALSE
  AND menu_code NOT IN (
    'pmo-cat-exec', 'pmo-cat-project-delivery', 'pmo-cat-process-templates',
    'pmo-cat-reporting-intelligence', 'pmo-cat-workflows-approvals', 'pmo-cat-teams',
    'pmo-cat-stakeholders', 'pmo-cat-knowledge-assets', 'pmo-cat-audit-compliance',
    'pmo-cat-email-notifications', 'pmo-cat-admin', 'pmo-cat-system-admin',
    'pmo-cat-help', 'pmo-cat-support',
    'pmo-cat-initiation', 'pmo-cat-governance-standards', 'pmo-cat-pmbok', 'pmo-cat-agile-lean'
  );

DO $$ BEGIN
  RAISE NOTICE 'v676_db_menu_hierarchy_as_source_of_truth.sql applied successfully';
END $$;
