-- =============================================================================
-- v677: DB hierarchy for Simulator PMO and PM roles
--
-- Extends v676 (DB-as-source-of-truth) to the Simulator domain.
-- References: projectplan/v671_Methodology_Aware_Menu_Rationalisation_Plan.md
--   Section 5.4 — Simulator PMO layout roles (sim_pmo_admin, simulator_admin)
--   Section 5.5 — Simulator PM layout roles  (sim_project_manager)
--   Section 5.6 — Simulator TM layout roles  (sim_team_member) — no change needed
--                 TM already has correct tm_section_* hierarchy from v628b.
--
-- v676 bug fixed here:
--   v676 step 2 re-parented sim_pmo_pt_* and sim_pm_pt_* items to the PLATFORM
--   pmo-cat-process-templates category (wrong). This migration moves them to
--   sim_pmo_cat_process_templates / sim_pm_cat_process_templates.
--
-- NOTE: All Simulator category codes use underscore prefix (sim_pmo_cat_* /
-- sim_pm_cat_*) so applySimulatorMenuTransform.isSimNode() recognises them
-- directly as simulator nodes without relying on the children.length fallback.
-- =============================================================================

-- ─── STEP 1: Create Simulator PMO category rows ───────────────────────────────
-- Mirrors v671 plan section 5.4 (sim_pmo_admin / simulator_admin structure)

INSERT INTO public.menu_items
  (id, menu_code, menu_label, route_path, parent_menu_id, menu_level,
   sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT
  gen_random_uuid(), v.menu_code, v.menu_label, NULL, NULL, 1,
  v.sort_order, v.methodology, v.menu_icon, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  -- Universal categories (plan section 5.4 — Practice sections)
  ('sim_pmo_cat_live',              'Live Simulation',                    5,   'universal', 'play-circle'),
  ('sim_pmo_cat_exec',              'Practice Executive Overview',        10,  'universal', 'layout-dashboard'),
  ('sim_pmo_cat_project_delivery',  'Practice Project Delivery',          20,  'universal', 'folder-kanban'),
  ('sim_pmo_cat_reporting',         'Practice Reporting & Intelligence',  60,  'universal', 'bar-chart'),
  ('sim_pmo_cat_workflows',         'Practice Workflows & Governance',    70,  'universal', 'git-branch'),
  ('sim_pmo_cat_process_templates', 'Practice Process Templates',         80,  'universal', 'layers'),
  ('sim_pmo_cat_knowledge',         'Practice Knowledge & Assets',        90,  'universal', 'bookmark'),
  ('sim_pmo_cat_email',             'Practice Email & Notifications',     100, 'universal', 'mail'),
  ('sim_pmo_cat_admin',             'Practice Administration',            110, 'universal', 'settings'),
  ('sim_pmo_cat_system_admin',      'Simulator System Administration',    120, 'universal', 'settings-2'),
  -- Methodology track categories (plan section 5.4 — [S] [P] [A] tracks)
  ('sim_pmo_cat_initiation',        'Practice Pre-Project Docs',          31,  'structured', 'briefcase'),
  ('sim_pmo_cat_governance',        'Practice Governance & Standards',    32,  'structured', 'shield'),
  ('sim_pmo_cat_pmbok',             'Practice Process Group Forms',       40,  'pmbok',      'clipboard-list'),
  ('sim_pmo_cat_agile',             'Practice Agile & Lean',              50,  'agile',      'zap')
) AS v(menu_code, menu_label, sort_order, methodology, menu_icon)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items m
  WHERE m.menu_code = v.menu_code AND COALESCE(m.is_deleted, FALSE) = FALSE
);

-- Reactivate any existing rows
UPDATE public.menu_items
SET is_active = TRUE, is_visible = TRUE, updated_at = NOW()
WHERE menu_code IN (
  'sim_pmo_cat_live', 'sim_pmo_cat_exec', 'sim_pmo_cat_project_delivery',
  'sim_pmo_cat_reporting', 'sim_pmo_cat_workflows', 'sim_pmo_cat_process_templates',
  'sim_pmo_cat_knowledge', 'sim_pmo_cat_email', 'sim_pmo_cat_admin', 'sim_pmo_cat_system_admin',
  'sim_pmo_cat_initiation', 'sim_pmo_cat_governance', 'sim_pmo_cat_pmbok', 'sim_pmo_cat_agile'
)
AND COALESCE(is_deleted, FALSE) = FALSE;

-- Set methodology on track categories
UPDATE public.menu_items SET methodology = 'structured', updated_at = NOW()
WHERE menu_code IN ('sim_pmo_cat_initiation', 'sim_pmo_cat_governance')
  AND COALESCE(is_deleted, FALSE) = FALSE;
UPDATE public.menu_items SET methodology = 'pmbok',      updated_at = NOW()
WHERE menu_code = 'sim_pmo_cat_pmbok' AND COALESCE(is_deleted, FALSE) = FALSE;
UPDATE public.menu_items SET methodology = 'agile',      updated_at = NOW()
WHERE menu_code = 'sim_pmo_cat_agile' AND COALESCE(is_deleted, FALSE) = FALSE;

-- ─── STEP 2: Create Simulator PM category rows ────────────────────────────────
-- Mirrors v671 plan section 5.5 (sim_project_manager structure)

INSERT INTO public.menu_items
  (id, menu_code, menu_label, route_path, parent_menu_id, menu_level,
   sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT
  gen_random_uuid(), v.menu_code, v.menu_label, NULL, NULL, 1,
  v.sort_order, v.methodology, v.menu_icon, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  -- Universal categories (plan section 5.5 — Universal Practice)
  ('sim_pm_cat_live',              'Live Simulation',                  5,   'universal', 'play-circle'),
  ('sim_pm_cat_dashboard',         'Practice Dashboard',               10,  'universal', 'layout-dashboard'),
  ('sim_pm_cat_projects',          'Practice Projects',                20,  'universal', 'folder-kanban'),
  ('sim_pm_cat_teams',             'Practice Teams',                   25,  'universal', 'users'),
  ('sim_pm_cat_controls',          'Practice Controls & Registers',    30,  'universal', 'list-checks'),
  ('sim_pm_cat_process_templates', 'Practice Process Templates',       70,  'universal', 'layers'),
  ('sim_pm_cat_cross_framework',   'Practice Cross-Framework',         90,  'universal', 'git-branch'),
  ('sim_pm_cat_learning',          'Learning Hub',                     95,  'universal', 'graduation-cap'),
  -- Methodology track categories (plan section 5.5 — [S] [P] [A] tracks)
  ('sim_pm_cat_initiation',        'Practice Pre-Project Docs',        41,  'structured', 'briefcase'),
  ('sim_pm_cat_governance',        'Practice Governance & Standards',  42,  'structured', 'shield'),
  ('sim_pm_cat_pmbok',             'Practice PMBOK Process Groups',    50,  'pmbok',      'clipboard-list'),
  ('sim_pm_cat_agile',             'Practice Agile & Lean',            60,  'agile',      'zap')
) AS v(menu_code, menu_label, sort_order, methodology, menu_icon)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items m
  WHERE m.menu_code = v.menu_code AND COALESCE(m.is_deleted, FALSE) = FALSE
);

-- Reactivate any existing rows
UPDATE public.menu_items
SET is_active = TRUE, is_visible = TRUE, updated_at = NOW()
WHERE menu_code IN (
  'sim_pm_cat_live', 'sim_pm_cat_dashboard', 'sim_pm_cat_projects', 'sim_pm_cat_teams',
  'sim_pm_cat_controls', 'sim_pm_cat_process_templates', 'sim_pm_cat_cross_framework',
  'sim_pm_cat_learning', 'sim_pm_cat_initiation', 'sim_pm_cat_governance',
  'sim_pm_cat_pmbok', 'sim_pm_cat_agile'
)

AND COALESCE(is_deleted, FALSE) = FALSE;

-- Set methodology on track categories
UPDATE public.menu_items SET methodology = 'structured', updated_at = NOW()
WHERE menu_code IN ('sim_pm_cat_initiation', 'sim_pm_cat_governance')
  AND COALESCE(is_deleted, FALSE) = FALSE;
UPDATE public.menu_items SET methodology = 'pmbok', updated_at = NOW()
WHERE menu_code = 'sim_pm_cat_pmbok' AND COALESCE(is_deleted, FALSE) = FALSE;
UPDATE public.menu_items SET methodology = 'agile', updated_at = NOW()
WHERE menu_code = 'sim_pm_cat_agile' AND COALESCE(is_deleted, FALSE) = FALSE;

-- ─── STEP 3: Fix v676 bug — move sim PT items out of Platform category ─────────
-- v676 step 2 accidentally re-parented sim_pmo_pt_* and sim_pm_pt_* items
-- to the PLATFORM pmo-cat-process-templates category. Move them to sim categories.

UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pmo_cat_process_templates'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.id <> cat.id
  AND item.menu_code LIKE 'sim_pmo_pt_%';

UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pm_cat_process_templates'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.id <> cat.id
  AND item.menu_code LIKE 'sim_pm_pt_%';

-- ─── STEP 4: Re-parent items from Simulator section containers ────────────────

-- 4a. sim_pmo_section_initiation → sim_pmo_cat_initiation
--     Plan: Practice Pre-Project Docs — Mandates, Briefs, Business Cases, BRPs
UPDATE public.menu_items AS child
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS sec, public.menu_items AS cat
WHERE child.parent_menu_id = sec.id
  AND sec.menu_code = 'sim_pmo_section_initiation'
  AND cat.menu_code = 'sim_pmo_cat_initiation'
  AND COALESCE(child.is_deleted, FALSE) = FALSE;

-- 4b. sim_pmo_section_governance → sim_pmo_cat_governance
--     Plan: Practice Governance & Standards — strategies, ITTO, EEF
UPDATE public.menu_items AS child
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS sec, public.menu_items AS cat
WHERE child.parent_menu_id = sec.id
  AND sec.menu_code = 'sim_pmo_section_governance'
  AND cat.menu_code = 'sim_pmo_cat_governance'
  AND COALESCE(child.is_deleted, FALSE) = FALSE;

-- 4c. sim_pmo_section_oversight → sim_pmo_cat_project_delivery
--     Plan: Practice Project Delivery — oversight, risk/issue/quality registers
UPDATE public.menu_items AS child
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS sec, public.menu_items AS cat
WHERE child.parent_menu_id = sec.id
  AND sec.menu_code = 'sim_pmo_section_oversight'
  AND cat.menu_code = 'sim_pmo_cat_project_delivery'
  AND COALESCE(child.is_deleted, FALSE) = FALSE;

-- 4d. sim_pm_section_initiation → sim_pm_cat_initiation
--     Plan: Practice Pre-Project Docs (PM level) — Business Case, Brief, PID, BRP
UPDATE public.menu_items AS child
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS sec, public.menu_items AS cat
WHERE child.parent_menu_id = sec.id
  AND sec.menu_code = 'sim_pm_section_initiation'
  AND cat.menu_code = 'sim_pm_cat_initiation'
  AND COALESCE(child.is_deleted, FALSE) = FALSE;

-- 4e. Any remaining items still under deactivated pmo-cat-process-templates
--     with sim routes → move to correct sim category
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pmo_cat_process_templates'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.id <> cat.id
  AND (
    item.route_path ILIKE '%/simulator/pmo/process-templates%'
    OR item.route_path ILIKE '%/simulator/pmo/templates%'
  );

UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pm_cat_process_templates'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.id <> cat.id
  AND (
    item.route_path ILIKE '%/simulator/pm/process-templates%'
    OR item.route_path ILIKE '%/simulator/pm/templates%'
  );

-- ─── STEP 5: Assign root-level Simulator PMO items to categories ──────────────
-- Items with parent_menu_id IS NULL (or deactivated parents)
-- Plan: section 5.4 sim_pmo_admin structure

-- 5a. Live Simulation (plan: Live Simulation — Start Run, Active Dashboard, Event Inbox, EVM, History)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pmo_cat_live'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code IN ('sim_pmo_live_simulation')
    OR item.route_path ILIKE '%/simulator/run/%'
    OR item.menu_label ILIKE 'live simulation'
    OR item.menu_label ILIKE 'start new run'
    OR item.menu_label ILIKE 'active run dashboard'
    OR item.menu_label ILIKE 'event inbox'
    OR item.menu_label ILIKE 'evm dashboard'
    OR item.menu_label ILIKE 'my run history'
  );

-- 5b. Practice Executive Overview (plan: Dashboard, Portfolio, Programme, Planning Intelligence)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pmo_cat_exec'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code IN ('sim_pmo_dashboard', 'sim_pmo_portfolio', 'sim_pmo_programme', 'sim_pmo_planning')
    OR item.route_path ILIKE '%/simulator/pmo/dashboard%'
    OR (item.route_path ILIKE '%/simulator/pmo/planning%' AND item.menu_label NOT ILIKE '%template%')
    OR item.route_path ILIKE '%/simulator/practice-portfolio%'
    OR item.route_path ILIKE '%/simulator/practice-programme%'
    OR item.route_path ILIKE '%/simulator/practice-dependencies%'
    OR item.route_path ILIKE '%/simulator/benefits%'
    OR item.menu_code ILIKE 'sim_pmo_pp_programme%'
    OR item.menu_code ILIKE 'sim_pmo_pp_dependencies%'
    OR item.menu_code ILIKE 'sim_pmo_pp_collisions%'
    OR item.menu_code ILIKE 'sim_pmo_planning%'
    OR item.menu_label ILIKE 'practice portfolio'
    OR item.menu_label ILIKE 'practice programme'
    OR item.menu_label ILIKE 'planning intelligence'
    OR item.menu_label ILIKE 'planning hub'
    OR item.menu_label ILIKE 'intelligence rules'
  );

-- 5c. Practice Project Delivery (plan: Practice Projects, Project Oversight)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pmo_cat_project_delivery'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code IN ('sim_pmo_projects', 'sim_pmo_oversight')
    OR item.menu_code ILIKE 'sim_pmo_pp_projects%'
    OR item.menu_code ILIKE 'sim_pmo_pr_%'
    OR item.menu_code ILIKE 'sim_pmo_oversight%'
    OR item.route_path ILIKE '%/simulator/practice-projects%'
    OR item.route_path ILIKE '%/simulator/pmo/oversight%'
    OR item.route_path ILIKE '%/simulator/pmo/registers%'
    OR item.route_path ILIKE '%/simulator/pmo/delays%'
    OR item.route_path ILIKE '%/simulator/pmo/oversight/scope%'
    OR item.route_path ILIKE '%/simulator/pmo/oversight/schedules%'
    OR item.menu_label ILIKE 'practice projects'
    OR item.menu_label ILIKE 'all practice projects'
    OR item.menu_label ILIKE 'practice project oversight'
  );

-- 5d. Practice Initiation [S] (plan: Mandates, Briefs, Business Cases, BRPs)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pmo_cat_initiation'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code IN ('sim_pmo_initiation')
    OR item.menu_code ILIKE 'sim_pmo_init_%'
    OR item.menu_code ILIKE 'sim_pmo_gov_mandates%'
    OR item.route_path ILIKE '%/simulator/pmo/initiation/%'
    OR item.route_path ILIKE '%/simulator/mandates/%'
    OR item.route_path ILIKE '%/simulator/practice-briefs%'
    OR item.menu_label ILIKE 'practice business case'
    OR item.menu_label ILIKE 'practice project brief'
    OR item.menu_label ILIKE 'practice benefits review plan'
    OR item.menu_label ILIKE 'practice mandates'
    OR item.menu_label ILIKE 'pre-project docs'
  );

-- 5e. Practice Governance & Standards [S] (plan: strategies, ITTO, EEF)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pmo_cat_governance'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code IN ('sim_pmo_governance')
    OR item.menu_code ILIKE 'sim_pmo_gov_%'
    OR item.route_path ILIKE '%/simulator/pmo/governance/%'
    OR item.route_path ILIKE '%/simulator/pmo/itto/%'
    OR item.route_path ILIKE '%/simulator/pmo/eef%'
    OR item.menu_label ILIKE '%management strategy%'
    OR item.menu_label ILIKE 'itto%'
    OR item.menu_label ILIKE '%eef%'
    OR item.menu_label ILIKE 'environment factors'
  );

-- 5f. Practice PMBOK Process Group Forms [P]
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pmo_cat_pmbok'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code ILIKE 'sim_pmo_forms%'
    OR item.route_path ILIKE '%/simulator/pmo/forms%'
    OR (item.menu_label ILIKE '%process group%' AND item.menu_label NOT ILIKE '%template%')
  );

-- 5g. Practice Agile & Lean [A] (plan: Scrum of Scrums, Value Stream Map, Kaizen)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pmo_cat_agile'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code IN ('sim_pmo_agile_lean')
    OR item.menu_code ILIKE 'sim_pmo_agile%'
    OR item.route_path ILIKE '%/simulator/practice-projects/%/scrum/%'
    OR item.route_path ILIKE '%/simulator/practice-projects/%/lean/%'
    OR item.menu_label ILIKE '%scrum of scrums%'
    OR item.menu_label ILIKE '%value stream map%'
    OR item.menu_label ILIKE '%kaizen%'
    OR item.menu_label ILIKE 'agile & lean tools'
  );

-- 5h. Practice Reporting & Intelligence (plan: reports, financial, sprint/lean metrics)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pmo_cat_reporting'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code IN ('sim_pmo_reporting', 'sim_pmo_financial')
    OR item.menu_code ILIKE 'sim_pmo_report%'
    OR item.menu_code ILIKE 'sim_pmo_fin%'
    OR item.route_path ILIKE '%/simulator/pmo/reporting%'
    OR item.route_path ILIKE '%/simulator/financial-reports%'
    OR item.route_path ILIKE '%/simulator/practice-portfolio/evm%'
    OR item.route_path ILIKE '%/simulator/expenses%'
    OR item.route_path ILIKE '%/simulator/reports%'
    OR item.menu_label ILIKE '%practice reporting%'
    OR item.menu_label ILIKE '%financial management%'
  );

-- 5i. Practice Workflows & Governance (plan: authorisation, quality, approvals)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pmo_cat_workflows'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code IN ('sim_pmo_authorisation', 'sim_pmo_workflows', 'sim_pmo_testing_centre')
    OR item.menu_code ILIKE 'sim_pmo_auth%'
    OR item.menu_code ILIKE 'sim_pmo_workflows%'
    OR item.menu_code ILIKE 'sim_pmo_tc%'
    OR item.route_path ILIKE '%/simulator/pmo/authorisation%'
    OR item.route_path ILIKE '%/simulator/pmo/testing-centre%'
    OR item.menu_label ILIKE '%authorisation%'
    OR item.menu_label ILIKE '%approval chains%'
    OR item.menu_label ILIKE '%archive%'
    OR item.menu_label ILIKE '%quality & testing%'
    OR item.menu_label ILIKE '%workflows%'
    OR item.menu_label ILIKE '%lifecycle%'
  );

-- 5j. Practice Process Templates (plan: hub, all phases, agile templates)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pmo_cat_process_templates'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code IN ('sim_pmo_process_templates')
    OR item.menu_code ILIKE 'sim_pmo_pt_%'
    OR item.route_path ILIKE '%/simulator/pmo/process-templates%'
    OR item.route_path ILIKE '%/simulator/pmo/templates%'
    OR (item.menu_label ILIKE '%process templates%' AND item.menu_code ILIKE 'sim_pmo%')
  );

-- 5k. Practice Knowledge & Assets (plan: OPA, procurement, RFP)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pmo_cat_knowledge'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code IN ('sim_pmo_procurement', 'sim_pmo_knowledge_assets')
    OR item.menu_code ILIKE 'sim_pmo_proc%'
    OR item.menu_code ILIKE 'sim_pmo_knowledge%'
    OR item.route_path ILIKE '%/simulator/pmo/procurement%'
    OR item.route_path ILIKE '%/simulator/pmo/rfp%'
    OR item.route_path ILIKE '%/simulator/opa%'
    OR item.menu_label ILIKE '%procurement%'
    OR item.menu_label ILIKE '%process assets%'
    OR item.menu_label ILIKE '%practice knowledge%'
  );

-- 5l. Practice Email & Notifications
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pmo_cat_email'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code IN ('sim_pmo_email_notifications')
    OR item.menu_code ILIKE 'sim_pmo_email%'
    OR item.route_path ILIKE '%/simulator/pmo/email%'
    OR item.route_path ILIKE '%/simulator/pmo/sender-profiles%'
    OR item.route_path ILIKE '%/simulator/pmo/invitation%'
    OR item.menu_label ILIKE '%email & notifications%'
    OR item.menu_label ILIKE '%notification preferences%'
  );

-- 5m. Practice Administration (plan: admin settings, org settings, branding)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pmo_cat_admin'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code IN ('sim_pmo_admin', 'sim_pmo_people_resources')
    OR item.menu_code ILIKE 'sim_pmo_admin%'
    OR item.menu_code ILIKE 'sim_pmo_people%'
    OR item.menu_code ILIKE 'sim_pmo_invitation%'
    OR item.route_path ILIKE '%/simulator/pmo/manager-assignments%'
    OR item.route_path ILIKE '%/simulator/pmo/invitation%'
    OR item.route_path ILIKE '%/simulator/pmo/send-invitations%'
    OR item.route_path ILIKE '%/simulator/pmo/manager-assignment%'
    OR item.route_path ILIKE '%/simulator/practice-teams/directory%'
    OR item.route_path ILIKE '%/simulator/practice-teams/capacity%'
    OR item.menu_label ILIKE '%people & resources%'
    OR item.menu_label ILIKE '%manager assignments%'
    OR item.menu_label ILIKE '%invitation tracker%'
    OR item.menu_label ILIKE 'practice administration'
  );

-- 5n. Simulator System Administration (simulator_admin only — plan section 5.4.2)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pmo_cat_system_admin'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code ILIKE 'sim_admin_%'
    OR item.route_path ILIKE '%/simulator/admin/%'
    OR item.menu_label ILIKE '%scenario management%'
    OR item.menu_label ILIKE '%leaderboard administration%'
    OR item.menu_label ILIKE '%certificate administration%'
    OR item.menu_label ILIKE '%simulator subscription%'
  );

-- ─── STEP 6: Assign root-level Simulator PM items to categories ───────────────
-- Plan section 5.5 — sim_project_manager structure

-- 6a. Live Simulation (PM scope — same structure as PMO)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pm_cat_live'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pm_cat_%'
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code IN ('sim_live_simulation')
    OR item.menu_code ILIKE 'sim_live_%'
    OR (item.route_path ILIKE '%/simulator/run/%' AND item.menu_code NOT ILIKE 'sim_pmo_%')
  );

-- 6b. Practice Dashboard
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pm_cat_dashboard'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pm_cat_%'
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code IN ('sim_dashboard', 'sim_pm_dashboard', 'sim_ai_workspace')
    OR item.route_path = '/simulator/dashboard'
    OR item.route_path = '/simulator/ai'
    OR item.menu_label ILIKE 'practice dashboard'
    OR item.menu_label ILIKE 'ai workspace'
  );

-- 6c. Practice Projects (plan: My Practice Projects, Create, Members, Tasks)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pm_cat_projects'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pm_cat_%'
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code IN ('sim_practice_projects', 'sim_pm_delivery')
    OR item.menu_code ILIKE 'sim_practice_projects%'
    OR item.route_path ILIKE '%/simulator/practice-projects%'
    OR item.route_path ILIKE '%/simulator/practice-tasks%'
    OR item.menu_label ILIKE 'my practice projects'
    OR item.menu_label ILIKE 'create practice project'
    OR item.menu_label ILIKE 'practice tasks'
  );

-- 6d. Practice Teams
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pm_cat_teams'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pm_cat_%'
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code IN ('sim_practice_teams_section')
    OR item.menu_code ILIKE 'sim_practice_teams%'
    OR item.route_path ILIKE '%/simulator/practice-teams%'
    OR item.menu_label ILIKE 'practice teams'
    OR item.menu_label ILIKE 'my practice team'
  );

-- 6e. Practice Controls & Registers (plan: Risk, Issue, Quality, Delay, Lessons, CMDB)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pm_cat_controls'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pm_cat_%'
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code IN ('sim_pm_controls')
    OR item.route_path ILIKE '%/simulator/pm/risk%'
    OR item.route_path ILIKE '%/simulator/pm/issues%'
    OR item.route_path ILIKE '%/simulator/pm/quality%'
    OR item.route_path ILIKE '%/simulator/pm/delays%'
    OR item.route_path ILIKE '%/simulator/pm/lessons%'
    OR item.route_path ILIKE '%/simulator/pm/cmdb%'
    OR item.menu_label ILIKE 'practice controls'
  );

-- 6f. Practice Initiation [S] (plan section 5.5 — Business Case, Brief, PID, BRP)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pm_cat_initiation'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pm_cat_%'
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code IN ('sim_practice_initiation', 'sim_pm_initiation')
    OR item.menu_code ILIKE 'sim_pm_init_%'
    OR item.menu_code ILIKE 'sim_mandates%'
    OR item.route_path ILIKE '%/simulator/pm/initiation%'
    OR item.route_path ILIKE '%/simulator/mandates%'
    OR item.menu_label ILIKE 'practice initiation'
  );

-- 6g. Practice PMBOK Process Groups [P]
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pm_cat_pmbok'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pm_cat_%'
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code IN ('sim_forms_practice')
    OR item.menu_code ILIKE 'sim_forms_practice%'
    OR item.route_path ILIKE '%/simulator/pm/projects/%/forms%'
    OR item.menu_label ILIKE 'process group practice'
  );

-- 6h. Practice Agile & Lean [A]
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pm_cat_agile'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pm_cat_%'
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.route_path ILIKE '%/simulator/pm/projects/%/scrum%'
    OR item.route_path ILIKE '%/simulator/pm/projects/%/lean%'
    OR item.menu_label ILIKE 'practice agile%'
    OR item.menu_label ILIKE 'practice lean%'
  );

-- 6i. Practice Process Templates
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pm_cat_process_templates'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pm_cat_%'
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code ILIKE 'sim_pm_pt_%'
    OR item.route_path ILIKE '%/simulator/pm/process-templates%'
    OR item.route_path ILIKE '%/simulator/pm/templates%'
  );

-- 6j. Learning Hub (plan section 5.5 — Scenarios, Learning Path, Leaderboard, Certificates)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pm_cat_learning'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pm_cat_%'
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.route_path ILIKE '%/simulator/scenarios%'
    OR item.route_path ILIKE '%/simulator/learning%'
    OR item.route_path ILIKE '%/simulator/leaderboard%'
    OR item.route_path ILIKE '%/simulator/certificates%'
    OR item.route_path ILIKE '%/simulator/profile%'
    OR item.menu_label ILIKE '%scenarios%'
    OR item.menu_label ILIKE '%learning path%'
    OR item.menu_label ILIKE '%leaderboard%'
    OR item.menu_label ILIKE '%certificates%'
    OR item.menu_label ILIKE '%my profile%'
    OR item.menu_label ILIKE '%badges%'
  );

-- 6k. Practice Cross-Framework (plan: communications, org knowledge, stakeholders)
UPDATE public.menu_items AS item
SET parent_menu_id = cat.id, menu_level = 2, updated_at = NOW()
FROM public.menu_items AS cat
WHERE cat.menu_code = 'sim_pm_cat_cross_framework'
  AND COALESCE(cat.is_deleted, FALSE) = FALSE
  AND item.parent_menu_id IS NULL
  AND COALESCE(item.is_deleted, FALSE) = FALSE
  AND item.menu_code NOT LIKE 'sim_pm_cat_%'
  AND item.menu_code NOT LIKE 'sim_pmo_cat_%'
  AND item.id <> cat.id
  AND (
    item.menu_code IN ('sim_comms', 'sim_org_knowledge', 'sim_financial', 'sim_testing_centre',
                       'sim_pm_governance', 'sim_pm_reporting')
    OR item.menu_code ILIKE 'sim_comms%'
    OR item.route_path ILIKE '%/simulator/comms%'
    OR item.route_path ILIKE '%/simulator/opa%'
    OR item.route_path ILIKE '%/simulator/eef%'
    OR item.route_path ILIKE '%/simulator/templates%'
    OR item.route_path ILIKE '%/simulator/pm/reporting%'
    OR item.menu_label ILIKE 'communications'
    OR item.menu_label ILIKE 'org knowledge'
    OR item.menu_label ILIKE 'testing and qa'
  );

-- ─── STEP 7: Deactivate Simulator legacy section container rows ───────────────
UPDATE public.menu_items
SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code IN (
  'sim_pmo_section_initiation',
  'sim_pmo_section_governance',
  'sim_pmo_section_oversight',
  'sim_pm_section_initiation',
  'sim_pm_process_templates_section'
)
AND COALESCE(is_deleted, FALSE) = FALSE;
-- Note: sim_pmo_process_templates_section was already deactivated by v676.

-- ─── STEP 8: TM layout — no DB changes needed ─────────────────────────────────
-- v628b created proper tm_section_* containers with tm_* children.
-- applyRoleSidebarRevamp(layout='tm') returns the DB tree as-is,
-- which already has the correct Personal Workspace / My Work / Plans / etc. structure.
-- No SQL changes needed for TM roles.

DO $$ BEGIN
  RAISE NOTICE 'v677_simulator_roles_db_hierarchy.sql applied successfully';
END $$;
