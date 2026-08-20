-- =============================================================================
-- v879: Controls & Registers menu consolidation (Platform + Simulator)
-- Prerequisites: v680-v684 (menu revamp baseline), v869 (issue register rename), v875 (change log route fix)
-- Plan: projectplan/v879_controls_registers_menu_consolidation_plan.md
-- PRD:  projectprd/v879_controls_registers_menu_consolidation_PRD.md
--
-- Adds 4 sub-groups under "Controls & Registers" (Platform: plat_grp_pm_controls,
-- Simulator: sim_grp_pm_controls): Core Controls / Quality & Configuration /
-- Knowledge & Governance / Scope & Value. Reparents existing leaves into them,
-- adds the previously-orphaned register pages (Quality Register, Configuration
-- Item Register, RAID Log, Decision Log, Benefits Register), fixes dead
-- route-path bugs found during the audit, and mirrors the whole structure on
-- Simulator. Idempotent throughout — safe to re-run.
-- =============================================================================

-- =============================================================================
-- ══ PART 1 — PLATFORM: new sub-groups under plat_grp_pm_controls ═════════════
-- =============================================================================

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_controls' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_pm_ctrl_core',      'Core Controls',              NULL, 10, 'shield'),
  ('plat_pm_ctrl_quality',   'Quality & Configuration',    NULL, 20, 'check-circle'),
  ('plat_pm_ctrl_knowledge', 'Knowledge & Governance',     NULL, 30, 'book'),
  ('plat_pm_ctrl_scope',     'Scope & Value',              NULL, 40, 'target')
) AS v(mc, ml, rp, so, ic)
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = v.mc AND COALESCE(is_deleted,FALSE)=FALSE);

-- =============================================================================
-- ══ PART 2 — PLATFORM: reparent existing leaves into their sub-group ═════════
-- =============================================================================

-- Core Controls: Risk / Issue / Change / Delay
UPDATE public.menu_items SET
  parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_ctrl_core' AND COALESCE(is_deleted,FALSE)=FALSE),
  menu_level = 4, sort_order = 10, route_path = '/pm/controls/risk-register', updated_at = NOW()
WHERE menu_code = 'plat_pm_risk_reg' AND COALESCE(is_deleted,FALSE)=FALSE;

UPDATE public.menu_items SET
  parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_ctrl_core' AND COALESCE(is_deleted,FALSE)=FALSE),
  menu_level = 4, sort_order = 20, updated_at = NOW()
WHERE menu_code = 'plat_pm_issue_log' AND COALESCE(is_deleted,FALSE)=FALSE;

UPDATE public.menu_items SET
  parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_ctrl_core' AND COALESCE(is_deleted,FALSE)=FALSE),
  menu_level = 4, sort_order = 30, updated_at = NOW()
WHERE menu_code = 'plat_pm_change_log' AND COALESCE(is_deleted,FALSE)=FALSE;

UPDATE public.menu_items SET
  parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_ctrl_core' AND COALESCE(is_deleted,FALSE)=FALSE),
  menu_level = 4, sort_order = 40, updated_at = NOW()
WHERE menu_code = 'plat_pm_delay_reg' AND COALESCE(is_deleted,FALSE)=FALSE;

-- Scope & Value: Requirements / EEF (Benefits Register is a new row, added in Part 3)
UPDATE public.menu_items SET
  parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_ctrl_scope' AND COALESCE(is_deleted,FALSE)=FALSE),
  menu_level = 4, sort_order = 10, updated_at = NOW()
WHERE menu_code = 'plat_pm_requirements' AND COALESCE(is_deleted,FALSE)=FALSE;

UPDATE public.menu_items SET
  parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_ctrl_scope' AND COALESCE(is_deleted,FALSE)=FALSE),
  menu_level = 4, sort_order = 20, updated_at = NOW()
WHERE menu_code = 'plat_pm_eef' AND COALESCE(is_deleted,FALSE)=FALSE;

-- Knowledge & Governance: reparent the EXISTING Decision Log row (plat_pm_s_decision_log, currently
-- under [S] Governance & Standards) rather than creating a duplicate — this also fixes its dead
-- route (/platform/decision-log never existed as a React route; the real page is at
-- /platform/governance/decisions). Existing role grants (project_sponsor, project_board_member,
-- wildcard roles) carry over unchanged since menu_code/id are untouched.
UPDATE public.menu_items SET
  parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_ctrl_knowledge' AND COALESCE(is_deleted,FALSE)=FALSE),
  menu_level = 4, sort_order = 20, route_path = '/platform/governance/decisions', updated_at = NOW()
WHERE menu_code = 'plat_pm_s_decision_log' AND COALESCE(is_deleted,FALSE)=FALSE;

-- =============================================================================
-- ══ PART 3 — PLATFORM: new leaf rows for previously-orphaned registers ═══════
-- =============================================================================

INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp,
       (SELECT id FROM public.menu_items WHERE menu_code = v.parent_code AND COALESCE(is_deleted,FALSE)=FALSE),
       4, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('plat_pm_quality_reg',  'Quality Register',             '/pm/controls/quality-register',       'plat_pm_ctrl_quality',   10, 'check-circle'),
  ('plat_pm_config_reg',   'Configuration Item Register',  '/pm/controls/configuration-items',     'plat_pm_ctrl_quality',   20, 'database'),
  ('plat_pm_lessons_ctrl', 'Lessons Log',                  '/pm/controls/lessons-log',             'plat_pm_ctrl_knowledge', 10, 'book-open'),
  ('plat_pm_raid_log',     'RAID Log',                     '/platform/raid-log',                   'plat_pm_ctrl_knowledge', 30, 'list'),
  ('plat_pm_benefits_reg', 'Benefits Register',            '/platform/benefits/register',          'plat_pm_ctrl_scope',     30, 'trending-up')
) AS v(mc, ml, rp, parent_code, so, ic)
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = v.mc AND COALESCE(is_deleted,FALSE)=FALSE);

-- =============================================================================
-- ══ PART 4 — PLATFORM: dead-route fixes found during the audit ═══════════════
-- =============================================================================

-- Lessons Log under Projects group (separate row from the new Controls-side entry above) —
-- both now point at the same working page rather than one of them being dead.
UPDATE public.menu_items SET route_path = '/pm/controls/lessons-log', updated_at = NOW()
WHERE menu_code = 'plat_pm_lessons' AND COALESCE(is_deleted,FALSE)=FALSE;

-- PMO Project Oversight — every register leaf pointed at a route that doesn't exist in
-- platformRoutes.jsx. Fix to the actual mounted paths; section stays separate from
-- Controls & Registers (aggregated PMO-level view vs. per-project PM view).
UPDATE public.menu_items SET route_path = '/pmo/oversight/risk-register', updated_at = NOW()
WHERE menu_code = 'plat_oversight_risk' AND COALESCE(is_deleted,FALSE)=FALSE;

UPDATE public.menu_items SET route_path = '/pmo/oversight/issue-register', updated_at = NOW()
WHERE menu_code = 'plat_oversight_issue' AND COALESCE(is_deleted,FALSE)=FALSE;

UPDATE public.menu_items SET route_path = '/pmo/oversight/quality-register', updated_at = NOW()
WHERE menu_code = 'plat_oversight_quality' AND COALESCE(is_deleted,FALSE)=FALSE;

UPDATE public.menu_items SET route_path = '/pmo/oversight/lessons-log', updated_at = NOW()
WHERE menu_code = 'plat_oversight_lessons' AND COALESCE(is_deleted,FALSE)=FALSE;

UPDATE public.menu_items SET route_path = '/pmo/registers/changes', updated_at = NOW()
WHERE menu_code = 'plat_oversight_change' AND COALESCE(is_deleted,FALSE)=FALSE;

-- Naming collision: this Team Lead leaf was labelled the same as the group it has nothing to do
-- with (it's a single leaf pointing straight at /platform/risks, not a group). Rename only —
-- route/grants/menu_code untouched.
UPDATE public.menu_items SET menu_label = 'Risk Register', updated_at = NOW()
WHERE menu_code = 'plat_tl_controls' AND COALESCE(is_deleted,FALSE)=FALSE;

-- =============================================================================
-- ══ PART 5 — PLATFORM: role grants for the new leaves ════════════════════════
-- Wildcard roles (system_admin, account_owner, pmo_admin, project_manager) pick up every new
-- plat_* row automatically once these blocks — identical to their v683 definitions — are re-run
-- against the now-larger menu_items table. Idempotent (ON CONFLICT DO UPDATE). Programme Manager /
-- Project Board Member / PM Project Assurance / PM Change Authority are intentionally NOT touched
-- here — none of the 5 new leaves (Quality Register, Configuration Item Register, RAID Log,
-- Benefits Register, plus the reparented Lessons Log/Decision Log) match those roles' existing,
-- narrower footprints, so this pass doesn't silently widen their access.
-- =============================================================================

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'system_admin'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code LIKE 'plat_%'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'account_owner'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code LIKE 'plat_%'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'pmo_admin'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code LIKE 'plat_%'
  AND mi.menu_code NOT LIKE 'plat_sec_system_admin'
  AND mi.menu_code NOT LIKE 'plat_sys_%'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'project_manager'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code LIKE 'plat_%'
  AND mi.menu_code NOT LIKE 'plat_sec_exec%'
  AND mi.menu_code NOT LIKE 'plat_sec_project_delivery'
  AND mi.menu_code NOT LIKE 'plat_grp_projects'
  AND mi.menu_code NOT LIKE 'plat_grp_oversight%'
  AND mi.menu_code NOT LIKE 'plat_oversight%'
  AND mi.menu_code NOT LIKE 'plat_sec_reporting'
  AND mi.menu_code NOT LIKE 'plat_grp_reporting_assurance'
  AND mi.menu_code NOT LIKE 'plat_rep_%'
  AND mi.menu_code NOT LIKE 'plat_sec_workflows'
  AND mi.menu_code NOT LIKE 'plat_grp_workflows%'
  AND mi.menu_code NOT LIKE 'plat_grp_auth_lifecycle'
  AND mi.menu_code NOT LIKE 'plat_lc_%'
  AND mi.menu_code NOT LIKE 'plat_sec_process_templates'
  AND mi.menu_code NOT LIKE 'plat_pt_%'
  AND mi.menu_code NOT LIKE 'plat_sec_knowledge'
  AND mi.menu_code NOT LIKE 'plat_grp_knowledge%'
  AND mi.menu_code NOT LIKE 'plat_know_%'
  AND mi.menu_code NOT LIKE 'plat_grp_okr'
  AND mi.menu_code NOT LIKE 'plat_okr_%'
  AND mi.menu_code NOT LIKE 'plat_grp_procurement'
  AND mi.menu_code NOT LIKE 'plat_proc_%'
  AND mi.menu_code NOT LIKE 'plat_grp_collaboration'
  AND mi.menu_code NOT LIKE 'plat_collab_%'
  AND mi.menu_code NOT LIKE 'plat_sec_people'
  AND mi.menu_code NOT LIKE 'plat_people_%'
  AND mi.menu_code NOT LIKE 'plat_sec_email'
  AND mi.menu_code NOT LIKE 'plat_email_%'
  AND mi.menu_code NOT LIKE 'plat_sec_admin'
  AND mi.menu_code NOT LIKE 'plat_admin_%'
  AND mi.menu_code NOT LIKE 'plat_sec_system_admin'
  AND mi.menu_code NOT LIKE 'plat_sys_%'
  AND mi.menu_code NOT LIKE 'plat_sec_account'
  AND mi.menu_code NOT LIKE 'plat_acct_%'
  AND mi.menu_code NOT LIKE 'plat_sec_team_mgmt'
  AND mi.menu_code NOT LIKE 'plat_sec_delivery'
  AND mi.menu_code NOT LIKE 'plat_tl_%'
  AND mi.menu_code NOT LIKE 'plat_grp_tl_%'
  AND mi.menu_code NOT LIKE 'plat_sec_personal'
  AND mi.menu_code NOT LIKE 'plat_tm_%'
  AND mi.menu_code NOT LIKE 'plat_grp_tm_%'
  AND mi.menu_code NOT LIKE 'plat_sec_team_section'
  AND mi.menu_code NOT LIKE 'plat_sec_delivery_artefacts'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

-- =============================================================================
-- ══ PART 6 — SIMULATOR: new sub-groups under sim_grp_pm_controls ═════════════
-- =============================================================================

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pm_controls' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_pm_ctrl_core',      'Core Controls',              NULL, 10, 'shield'),
  ('sim_pm_ctrl_quality',   'Quality & Configuration',    NULL, 20, 'check-circle'),
  ('sim_pm_ctrl_knowledge', 'Knowledge & Governance',     NULL, 30, 'book'),
  ('sim_pm_ctrl_scope',     'Scope & Value',              NULL, 40, 'target')
) AS v(mc, ml, rp, so, ic)
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = v.mc AND COALESCE(is_deleted,FALSE)=FALSE);

-- =============================================================================
-- ══ PART 7 — SIMULATOR: reparent existing leaves + fix dead route-path bugs ══
-- =============================================================================

-- Core Controls: Risk / Issue / Delay (Quality moves to its own sub-group below)
UPDATE public.menu_items SET
  parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pm_ctrl_core' AND COALESCE(is_deleted,FALSE)=FALSE),
  menu_level = 4, sort_order = 10, route_path = '/simulator/pm/controls/risk-register', updated_at = NOW()
WHERE menu_code = 'sim_pm_risk_reg' AND COALESCE(is_deleted,FALSE)=FALSE;

UPDATE public.menu_items SET
  parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pm_ctrl_core' AND COALESCE(is_deleted,FALSE)=FALSE),
  menu_level = 4, sort_order = 20, route_path = '/simulator/pm/controls/issue-register', updated_at = NOW()
WHERE menu_code = 'sim_pm_issue_reg' AND COALESCE(is_deleted,FALSE)=FALSE;

UPDATE public.menu_items SET
  parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pm_ctrl_core' AND COALESCE(is_deleted,FALSE)=FALSE),
  menu_level = 4, sort_order = 40, updated_at = NOW()
WHERE menu_code = 'sim_pm_delay_reg' AND COALESCE(is_deleted,FALSE)=FALSE;

-- Quality & Configuration: Quality Register / Configuration Items
UPDATE public.menu_items SET
  parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pm_ctrl_quality' AND COALESCE(is_deleted,FALSE)=FALSE),
  menu_level = 4, sort_order = 10, route_path = '/simulator/pm/controls/quality-register', updated_at = NOW()
WHERE menu_code = 'sim_pm_quality_reg' AND COALESCE(is_deleted,FALSE)=FALSE;

UPDATE public.menu_items SET
  parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pm_ctrl_quality' AND COALESCE(is_deleted,FALSE)=FALSE),
  menu_level = 4, sort_order = 20, updated_at = NOW()
WHERE menu_code = 'sim_pm_cmdb' AND COALESCE(is_deleted,FALSE)=FALSE;

-- Knowledge & Governance: Lessons Log (Decision Log / RAID Log are new rows, added in Part 8)
UPDATE public.menu_items SET
  parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pm_ctrl_knowledge' AND COALESCE(is_deleted,FALSE)=FALSE),
  menu_level = 4, sort_order = 10, route_path = '/simulator/pm/controls/lessons-log', updated_at = NOW()
WHERE menu_code = 'sim_pm_lessons' AND COALESCE(is_deleted,FALSE)=FALSE;

-- =============================================================================
-- ══ PART 8 — SIMULATOR: new leaf rows (parity with Platform) ═════════════════
-- Change Log, Decision Log, RAID Log routes are mounted in Part 9's companion route-file edit
-- (apps/simulator/src/routes/simulatorRoutes.jsx) — components already existed as unused lazy
-- imports before this pass.
-- =============================================================================

INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp,
       (SELECT id FROM public.menu_items WHERE menu_code = v.parent_code AND COALESCE(is_deleted,FALSE)=FALSE),
       4, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('sim_pm_change_log',    'Change Log',            '/simulator/change',                                          'sim_pm_ctrl_core',      30, 'git-commit'),
  ('sim_pm_decision_log',  'Decision Log',          '/simulator/governance/decisions',                            'sim_pm_ctrl_knowledge', 20, 'file-text'),
  ('sim_pm_raid_log',      'RAID Log',              '/simulator/raid-log',                                        'sim_pm_ctrl_knowledge', 30, 'list'),
  -- Simulator has no flat (non-:projectId) Requirements Register route like Platform's
  -- /platform/scope/requirements — /simulator/practice-projects/scope/requirements is a new
  -- redirect route (apps/simulator/src/pages/scope/SimRequirementsCurrentProjectRedirect.jsx)
  -- that resolves the PM area's current project and forwards to the :projectId page.
  ('sim_pm_requirements',  'Requirements Register', '/simulator/practice-projects/scope/requirements',            'sim_pm_ctrl_scope',     10, 'clipboard'),
  ('sim_pm_eef',           'EEF',                   '/simulator/eef',                                             'sim_pm_ctrl_scope',     20, 'globe'),
  ('sim_pm_benefits_reg',  'Benefits Register',     '/simulator/benefits/register',                               'sim_pm_ctrl_scope',     30, 'trending-up')
) AS v(mc, ml, rp, parent_code, so, ic)
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = v.mc AND COALESCE(is_deleted,FALSE)=FALSE);

-- =============================================================================
-- ══ PART 9 — SIMULATOR: role grants ═══════════════════════════════════════════
-- simulator_admin / sim_pmo_admin are wildcard roles (LIKE 'sim_%') — re-running them picks up
-- every new sim_* row automatically, same mechanism as Part 5. sim_project_manager uses an
-- explicit code list (no wildcard), so it needs a targeted grant for the 6 new/newly-linked leaves.
-- =============================================================================

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'simulator_admin'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code LIKE 'sim_%'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'sim_pmo_admin'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code LIKE 'sim_%'
  AND mi.menu_code NOT IN (
    'sim_sec_system_admin','sim_sys_platform_settings','sim_sys_pwa','sim_sys_subscription',
    'sim_sys_branding','sim_grp_scenario_mgmt','sim_sys_user_mgmt',
    'sim_sys_leaderboard_admin','sim_sys_cert_admin',
    'sim_admin_all_scenarios','sim_admin_publish','sim_admin_scenario_analytics'
  )
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'sim_project_manager'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code IN (
  'sim_pm_change_log','sim_pm_decision_log','sim_pm_raid_log',
  'sim_pm_requirements','sim_pm_eef','sim_pm_benefits_reg'
) AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

-- =============================================================================
-- ══ PART 10 — Table registration (none needed) ════════════════════════════════
-- This migration only touches existing tables (menu_items, role_menu_items) — no new tables,
-- so no database_tables registry row is required (Database Table Registration Rule scope).
-- =============================================================================
