-- =============================================================================
-- v679: Comprehensive role → menu-category assignments for all v671 roles
--
-- Based on: projectplan/v671_Methodology_Aware_Menu_Rationalisation_Plan.md
--   Section 6  — Proposed Menu Structures per role
--   Section 7  — Summary Matrix (what each role can see)
--   Developer Images/Project Roles v1.png
--
-- Prerequisites (must run first):
--   v676_db_menu_hierarchy_as_source_of_truth.sql  (platform PMO category rows)
--   v677_simulator_roles_db_hierarchy.sql           (simulator category rows)
--   v510_sidebar_revamp_role_menu_items.sql         (platform_* PM section codes)
--   v638_menu_registry_backfill_platform.sql        (legacy pmo_/pm_ menu codes)
--   v641_sim_menu_registry_backfill.sql             (legacy sim_ menu codes)
--
-- Strategy:
--   Assign category-level menu_codes to each role.  Category rows are the
--   section-header nodes created by v676/v677; the sidebar renderer groups all
--   children under them.  ON CONFLICT (role_id, menu_item_id) DO NOTHING keeps
--   this idempotent — it never removes existing custom assignments.
-- =============================================================================

DO $$
DECLARE
  v_role_id UUID;
  v_codes   TEXT[];

  -- ── Shared code sets ────────────────────────────────────────────────────

  -- All Platform PMO v676 category codes
  c_pmo_all CONSTANT TEXT[] := ARRAY[
    'pmo-cat-exec', 'pmo-cat-project-delivery',
    'pmo-cat-initiation', 'pmo-cat-governance-standards',
    'pmo-cat-pmbok', 'pmo-cat-agile-lean',
    'pmo-cat-reporting-intelligence', 'pmo-cat-workflows-approvals',
    'pmo-cat-process-templates', 'pmo-cat-teams', 'pmo-cat-stakeholders',
    'pmo-cat-knowledge-assets', 'pmo-cat-audit-compliance',
    'pmo-cat-email-notifications', 'pmo-cat-admin'
  ];

  -- Legacy PMO section codes (v638 backfill)
  c_pmo_legacy CONSTANT TEXT[] := ARRAY[
    'pmo_section_initiation',
    'pmo_init_business_case', 'pmo_init_project_brief',
    'pmo_init_benefits_review_plan', 'pmo_gov_mandate',
    'pmo_gov_mandate_approval', 'pmo_section_governance',
    'pmo_gov_communication_strategy', 'pmo_gov_configuration_strategy',
    'pmo_gov_quality_strategy', 'pmo_gov_risk_strategy',
    'pmo_gov_itto_templates', 'pmo_gov_itto_drafts',
    'pmo_section_oversight',
    'pmo_oversight_risk_register', 'pmo_oversight_issue_register',
    'pmo_oversight_quality_register', 'pmo_oversight_lessons_log',
    'pmo_oversight_delays', 'pmo_oversight_delay_templates',
    'pmo_oversight_scope', 'pmo_oversight_schedules',
    'pmo_process_templates_section',
    'pmo_pt_hub', 'pmo_pt_pre', 'pmo_pt_init', 'pmo_pt_plan',
    'pmo_pt_exec', 'pmo_pt_mon', 'pmo_pt_close'
  ];

  -- All Platform PM v510 section codes
  c_pm_all CONSTANT TEXT[] := ARRAY[
    'platform_my_work', 'platform_controls', 'platform_planning',
    'platform_forms', 'platform_quality_testing',
    'platform_people_stakeholders', 'platform_reporting',
    'platform_governance_admin', 'platform_procurement',
    'platform_my_work_drafts'
  ];

  -- Legacy PM section codes (v638)
  c_pm_legacy CONSTANT TEXT[] := ARRAY[
    'pm_section_initiation',
    'pm_init_business_case', 'pm_init_project_brief',
    'pm_init_pid', 'pm_init_benefits_review_plan',
    'pm_process_templates_section',
    'pm_pt_hub', 'pm_pt_pre', 'pm_pt_init', 'pm_pt_plan',
    'pm_pt_exec', 'pm_pt_mon', 'pm_pt_close'
  ];

  -- All Sim PMO v677 category codes (excluding system_admin — added separately)
  c_sim_pmo_all CONSTANT TEXT[] := ARRAY[
    'sim_pmo_cat_live', 'sim_pmo_cat_exec', 'sim_pmo_cat_project_delivery',
    'sim_pmo_cat_reporting', 'sim_pmo_cat_workflows',
    'sim_pmo_cat_process_templates', 'sim_pmo_cat_knowledge',
    'sim_pmo_cat_email', 'sim_pmo_cat_admin',
    'sim_pmo_cat_initiation', 'sim_pmo_cat_governance',
    'sim_pmo_cat_pmbok', 'sim_pmo_cat_agile'
  ];

  -- All Sim PM v677 category codes
  c_sim_pm_all CONSTANT TEXT[] := ARRAY[
    'sim_pm_cat_live', 'sim_pm_cat_dashboard', 'sim_pm_cat_projects',
    'sim_pm_cat_teams', 'sim_pm_cat_controls',
    'sim_pm_cat_process_templates', 'sim_pm_cat_cross_framework',
    'sim_pm_cat_learning',
    'sim_pm_cat_initiation', 'sim_pm_cat_governance',
    'sim_pm_cat_pmbok', 'sim_pm_cat_agile'
  ];

BEGIN

  -- ===========================================================================
  -- HELPER: insert categories for a single role_id
  -- (PostgreSQL does not allow nested functions in DO blocks; pattern is
  --  repeated per role family below.)
  -- ===========================================================================

  -- ===========================================================================
  -- 1. PLATFORM PMO LAYOUT ROLES
  -- ===========================================================================

  -- ── 1a. system_admin ────────────────────────────────────────────────────
  -- Full PMO + System Administration + all PM sections + all Sim categories
  v_codes := c_pmo_all
          || ARRAY['pmo-cat-system-admin']
          || c_pmo_legacy
          || c_pm_all
          || c_pm_legacy
          || c_sim_pmo_all
          || ARRAY['sim_pmo_cat_system_admin']
          || c_sim_pm_all;

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('system_admin', 'System Admin', 'super_admin', 'Super Admin')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items
      (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO NOTHING;
  END LOOP;

  -- ── 1b. account_owner ───────────────────────────────────────────────────
  -- Full PMO (no system admin) + PM sections
  v_codes := c_pmo_all
          || c_pmo_legacy
          || c_pm_all
          || c_pm_legacy;

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('account_owner', 'Account Owner')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items
      (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO NOTHING;
  END LOOP;

  -- ── 1c. pmo_admin ───────────────────────────────────────────────────────
  -- Full PMO (no system admin) + PM sections
  v_codes := c_pmo_all
          || c_pmo_legacy
          || c_pm_all
          || c_pm_legacy;

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('pmo_admin', 'PMO Admin', 'pmo_manager', 'PMO Manager')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items
      (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO NOTHING;
  END LOOP;


  -- ===========================================================================
  -- 2. PLATFORM PM LAYOUT ROLES
  -- ===========================================================================

  -- ── 2a. project_manager (Full Access) ───────────────────────────────────
  -- All PM sections + methodology tracks + process templates
  v_codes := c_pm_all
          || c_pm_legacy
          || ARRAY[
               'pmo-cat-initiation', 'pmo-cat-governance-standards',
               'pmo-cat-pmbok', 'pmo-cat-agile-lean',
               'pmo-cat-process-templates',
               'pmo_section_initiation', 'pmo_init_business_case',
               'pmo_init_project_brief', 'pmo_init_benefits_review_plan',
               'pmo_section_governance', 'pmo_gov_communication_strategy',
               'pmo_gov_configuration_strategy', 'pmo_gov_quality_strategy',
               'pmo_gov_risk_strategy', 'pmo_gov_itto_templates',
               'pmo_gov_itto_drafts', 'pmo_section_oversight',
               'pmo_oversight_risk_register', 'pmo_oversight_issue_register',
               'pmo_oversight_quality_register', 'pmo_oversight_lessons_log',
               'pmo_oversight_delays', 'pmo_oversight_delay_templates',
               'pmo_oversight_scope', 'pmo_oversight_schedules',
               'pmo_process_templates_section',
               'pmo_pt_hub', 'pmo_pt_pre', 'pmo_pt_init', 'pmo_pt_plan',
               'pmo_pt_exec', 'pmo_pt_mon', 'pmo_pt_close'
             ];

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('project_manager', 'Project Manager')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items
      (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO NOTHING;
  END LOOP;

  -- ── 2b. portfolio_manager ───────────────────────────────────────────────
  -- Plan §5.2.2: Executive Overview, Portfolio/Programme (full), Projects (view),
  -- Financial, Reporting, [S]/[P]/[A] read-only overview
  v_codes := ARRAY[
    'pmo-cat-exec', 'pmo-cat-project-delivery',
    'pmo-cat-initiation', 'pmo-cat-governance-standards',
    'pmo-cat-pmbok', 'pmo-cat-agile-lean',
    'pmo-cat-reporting-intelligence',
    'platform_my_work', 'platform_reporting', 'platform_controls',
    'pmo_section_initiation', 'pmo_init_business_case',
    'pmo_init_benefits_review_plan', 'pmo_init_pid',
    'pmo_section_oversight',
    'pmo_oversight_risk_register', 'pmo_oversight_issue_register',
    'pmo_oversight_delays'
  ];

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('portfolio_manager', 'Portfolio Manager')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items
      (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO NOTHING;
  END LOOP;

  -- ── 2c. programme_manager ───────────────────────────────────────────────
  -- Plan §5.2.3: Programme (full), cross-project delivery, [S] governance,
  -- [P] process groups (planning→closing), [A] delivery + metrics
  v_codes := ARRAY[
    'pmo-cat-project-delivery', 'pmo-cat-reporting-intelligence',
    'pmo-cat-workflows-approvals',
    'pmo-cat-initiation', 'pmo-cat-governance-standards',
    'pmo-cat-pmbok', 'pmo-cat-agile-lean',
    'platform_my_work', 'platform_controls', 'platform_planning',
    'platform_reporting', 'platform_governance_admin',
    'pm_section_initiation', 'pm_init_business_case',
    'pm_init_benefits_review_plan', 'pm_init_pid',
    'pmo_section_initiation', 'pmo_gov_communication_strategy',
    'pmo_gov_risk_strategy', 'pmo_section_oversight',
    'pmo_oversight_risk_register', 'pmo_oversight_issue_register',
    'pmo_oversight_delays'
  ];

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('programme_manager', 'Programme Manager',
                        'pm_programme_manager', 'PM Programme Manager')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items
      (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO NOTHING;
  END LOOP;

  -- ── 2d. project_sponsor ─────────────────────────────────────────────────
  -- Plan §5.2.4: Dashboard (KPIs/health), My Projects (read), Financial (read),
  -- [S] Business Justification (read+approve), Approvals, Governance, Reports
  v_codes := ARRAY[
    'platform_my_work', 'platform_reporting', 'platform_governance_admin',
    'pmo-cat-initiation',
    'pmo_section_initiation', 'pmo_init_business_case',
    'pmo_init_project_brief', 'pmo_init_benefits_review_plan', 'pmo_init_pid',
    'pm_section_initiation', 'pm_init_business_case',
    'pm_init_project_brief', 'pm_init_benefits_review_plan', 'pm_init_pid',
    'pmo_section_oversight', 'pmo_oversight_risk_register'
  ];

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('project_sponsor', 'Project Sponsor',
                        'sponsor', 'Sponsor', 'project_executive', 'Project Executive')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items
      (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO NOTHING;
  END LOOP;

  -- ── 2e. executive ───────────────────────────────────────────────────────
  -- Plan §5.2.5: Read-only strategic overview — Portfolio health, KPIs,
  -- Programme summary, Projects (RAG), Reports, Financial overview,
  -- [S] Business Cases + BRPs (read-only)
  v_codes := ARRAY[
    'pmo-cat-exec', 'pmo-cat-project-delivery',
    'pmo-cat-reporting-intelligence', 'pmo-cat-initiation',
    'platform_my_work', 'platform_reporting',
    'pmo_section_initiation', 'pmo_init_business_case',
    'pmo_init_benefits_review_plan'
  ];

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('executive', 'Executive')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items
      (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO NOTHING;
  END LOOP;

  -- ── 2f. project_board_member ─────────────────────────────────────────────
  -- Plan §5.2.6: Governance approvals, stage gates, [S] artefacts review,
  -- Reports (read), Oversight (Risk/Issue/Change read)
  v_codes := ARRAY[
    'platform_my_work', 'platform_governance_admin',
    'platform_reporting', 'platform_controls',
    'pmo-cat-initiation',
    'pmo_section_initiation', 'pmo_init_business_case',
    'pmo_init_project_brief', 'pmo_init_pid',
    'pm_section_initiation', 'pm_init_business_case',
    'pm_init_project_brief', 'pm_init_pid',
    'pmo_section_oversight',
    'pmo_oversight_risk_register', 'pmo_oversight_issue_register'
  ];

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('project_board_member', 'Project Board Member',
                        'board_member', 'Board Member')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items
      (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO NOTHING;
  END LOOP;

  -- ── 2g. project_assurance ────────────────────────────────────────────────
  -- Plan §5.2.7: Quality & compliance focus, audits, assurance checks,
  -- [S] artefacts (read), Reporting, Oversight (Risk/Issue/Delay read)
  v_codes := ARRAY[
    'platform_my_work', 'platform_quality_testing',
    'platform_governance_admin', 'platform_reporting', 'platform_controls',
    'pmo-cat-initiation', 'pmo-cat-governance-standards',
    'pmo_section_initiation', 'pmo_init_business_case',
    'pmo_init_pid', 'pmo_init_benefits_review_plan',
    'pmo_section_governance', 'pmo_gov_quality_strategy',
    'pmo_gov_configuration_strategy',
    'pmo_section_oversight',
    'pmo_oversight_risk_register', 'pmo_oversight_issue_register',
    'pmo_oversight_delays'
  ];

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('project_assurance', 'Project Assurance',
                        'assurance', 'Assurance')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items
      (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO NOTHING;
  END LOOP;

  -- ── 2h. quality_assurance ───────────────────────────────────────────────
  -- Plan §5.2.8: Narrower than project_assurance — quality activities only,
  -- [S] QMS document (read), Testing, CAPA, Reports
  v_codes := ARRAY[
    'platform_my_work', 'platform_quality_testing', 'platform_reporting',
    'pmo-cat-initiation',
    'pmo_gov_quality_strategy',
    'pmo_section_oversight', 'pmo_oversight_quality_register'
  ];

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('quality_assurance', 'Quality Assurance',
                        'qa', 'QA', 'quality_manager', 'Quality Manager')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items
      (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO NOTHING;
  END LOOP;

  -- ── 2i. stakeholder ─────────────────────────────────────────────────────
  -- Plan §5.2.9: Very limited — Dashboard, My Projects (read-only),
  -- Communications, Highlight/End Project Reports,
  -- [S] Benefits Review Plans + Project Brief (summary view)
  v_codes := ARRAY[
    'platform_my_work', 'platform_reporting',
    'pmo-cat-initiation',
    'pmo_init_benefits_review_plan', 'pmo_init_project_brief',
    'pm_init_benefits_review_plan', 'pm_init_project_brief'
  ];

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('stakeholder', 'Stakeholder')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items
      (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO NOTHING;
  END LOOP;

  -- ── 2j. viewer ──────────────────────────────────────────────────────────
  -- Plan §5.2.10: Read-only dashboard + shared reports only
  v_codes := ARRAY[
    'platform_my_work', 'platform_reporting'
  ];

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('viewer', 'Viewer', 'read_only', 'Read Only')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items
      (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO NOTHING;
  END LOOP;


  -- ===========================================================================
  -- 3. PLATFORM TM LAYOUT ROLES
  -- ===========================================================================

  -- ── 3a. team_member ─────────────────────────────────────────────────────
  -- Plan §5.3.1: Personal tasks, daily log, team comms,
  -- [S] Assigned work packages (read), [A] Sprint tasks, Authorisation
  v_codes := ARRAY[
    'platform_my_work', 'platform_controls', 'platform_people_stakeholders',
    'pmo_oversight_risk_register'    -- limited: can log risks
  ];

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('team_member', 'Team Member',
                        'pm_team_member', 'PM Team Member')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items
      (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO NOTHING;
  END LOOP;

  -- ── 3b. team_lead ───────────────────────────────────────────────────────
  -- Plan §5.3.2: Inherits team_member + Team Management, Workstream Plans,
  -- Timesheet Management, Work Packages create/edit, Checkpoint Reports
  v_codes := ARRAY[
    'platform_my_work', 'platform_controls', 'platform_planning',
    'platform_quality_testing', 'platform_people_stakeholders',
    'platform_reporting',
    'pmo_section_oversight',
    'pmo_oversight_risk_register', 'pmo_oversight_issue_register'
  ];

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('team_lead', 'Team Lead',
                        'team_manager', 'Team Manager',
                        'pm_team_manager', 'PM Team Manager')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items
      (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO NOTHING;
  END LOOP;


  -- ===========================================================================
  -- 4. SIMULATOR PMO LAYOUT ROLES
  -- ===========================================================================

  -- ── 4a. sim_pmo_admin ───────────────────────────────────────────────────
  -- Plan §5.4.1: Mirrors pmo_admin with Practice prefixes — all Sim PMO cats
  v_codes := c_sim_pmo_all;

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('sim_pmo_admin', 'Sim PMO Admin',
                        'sim_pmo_manager', 'Sim PMO Manager')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items
      (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO NOTHING;
  END LOOP;

  -- ── 4b. simulator_admin ─────────────────────────────────────────────────
  -- Plan §5.4.2: Inherits sim_pmo_admin + Simulator System Administration,
  -- Scenario Management (admin), User Management, Leaderboard/Certificate admin
  v_codes := c_sim_pmo_all
          || ARRAY['sim_pmo_cat_system_admin'];

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('simulator_admin', 'Simulator Admin')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items
      (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO NOTHING;
  END LOOP;


  -- ===========================================================================
  -- 5. SIMULATOR PM LAYOUT ROLES
  -- ===========================================================================

  -- ── 5a. sim_project_manager ─────────────────────────────────────────────
  -- Plan §5.5.1: Mirrors project_manager with Practice prefixes — all Sim PM cats
  -- + Scenarios, Learning Path, Leaderboard, Certificates, My Profile
  v_codes := c_sim_pm_all;

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('sim_project_manager', 'Sim Project Manager')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items
      (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO NOTHING;
  END LOOP;


  -- ===========================================================================
  -- 6. SIMULATOR TM LAYOUT ROLES
  -- ===========================================================================

  -- ── 6a. sim_team_member ─────────────────────────────────────────────────
  -- Plan §5.6.1: Practice personal workspace — tasks, daily log, team comms,
  -- [S] Assigned Work Packages (read), [A] Sprint Tasks, Scenarios/Learning
  v_codes := ARRAY[
    'sim_pm_cat_live', 'sim_pm_cat_dashboard',
    'sim_pm_cat_projects', 'sim_pm_cat_learning'
  ];

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('sim_team_member', 'Sim Team Member')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items
      (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO NOTHING;
  END LOOP;


  -- ===========================================================================
  -- 7. SIMULATOR LEARNER ROLE
  -- ===========================================================================

  -- ── 7a. simulator_user ──────────────────────────────────────────────────
  -- Plan §5.7.1: No assigned project. Learning Hub, Scenarios, Live Simulation,
  -- [S]/[P]/[A] practice artefacts (scenario-scoped), Upgrade CTA
  v_codes := ARRAY[
    'sim_pm_cat_live', 'sim_pm_cat_dashboard', 'sim_pm_cat_learning',
    'sim_pm_cat_initiation',    -- Practice Mandate/Brief/Business Case (scenario)
    'sim_pm_cat_pmbok',         -- Practice Process Groups (scenario)
    'sim_pm_cat_agile'          -- Practice Agile Tools (scenario)
  ];

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('simulator_user', 'Simulator User',
                        'learner', 'Learner', 'sim_learner', 'Sim Learner')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items
      (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO NOTHING;
  END LOOP;


  -- ===========================================================================
  -- 8. NOTIFICATION PREFERENCES — universal grant for every active role
  --    (Section 7 matrix: every single role has Notification Preferences = ✓)
  -- ===========================================================================

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE COALESCE(is_active, TRUE) = TRUE
      AND COALESCE(is_deleted, FALSE) = FALSE
  LOOP
    INSERT INTO public.role_menu_items
      (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code IN (
      'pmo_notification_preferences',
      'pm_notification_preferences',
      'notification_preferences',
      'platform_notifications',
      'sim_notification_preferences'
    )
    AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO NOTHING;
  END LOOP;


  RAISE NOTICE 'v679: role_menu_items seed complete for all v671 roles';

END $$;
