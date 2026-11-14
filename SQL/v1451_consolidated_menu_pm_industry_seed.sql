-- ============================================================================
-- v1451: Consolidated role menus — Project Manager placements: every other industry pack (Slice 4)
-- PRD/plan: projectprd/v1341 / projectplan/v1341_consolidated_role_menus_plan.md
-- Design source: Documentation/Consolidated_Role_Menus_Proposal.md §4 (shared slots, merges with
-- core pages, industry-only pages).
--
-- Each industry group row (<pack>_cat_<group>) is placed for the 'pm' key; its registers travel
-- with it as a Level 3 sub-menu. Groups that mean the same thing across packs share a slot (D4).
-- Groups that extend a core page join that page's slot (D23 merges: Testing, Quality,
-- Requirements, Procurement, Benefits & Results). Industry-only groups get their own entry; a
-- section above 12 entries groups them under one entry automatically (D14).
-- Safety net: any industry group without a placement falls back to Deliver & Test.
-- Organisation-level industry pages (D28): none of the current packs has one (every industry
-- register is project-scoped); Admin can add organisation-scope placements later.
-- Idempotent. Run after v1450.
-- ============================================================================

-- ── 1. Safety net: industry group rows default to Deliver & Test ────────────
UPDATE public.menu_items
   SET default_section_code = 'deliver_test'
 WHERE menu_code ~ '^[a-z]{3}_cat_'
   AND default_section_code IS NULL;

-- ── 2. Placements ───────────────────────────────────────────────────────────
INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order)
SELECT mi.id, 'pm', v.section_code, par.id, v.slot_key, v.sort_order
FROM (VALUES
  -- Construction & Engineering (CON)
  ('con_cat_management',           'project_setup',         NULL::text, 'delivery_overview'::text, 15),
  ('con_cat_design_engineering',   'scope_requirements',    NULL, 'design_architecture', 60),
  ('con_cat_progress_measurement', 'plan_schedule',         NULL, NULL, 75),
  ('con_cat_sites',                'deliver_test',          NULL, NULL, 90),
  ('con_cat_inspections',          'deliver_test',          NULL, 'quality', 61),
  ('con_cat_quality_control',      'deliver_test',          NULL, 'quality', 62),
  ('con_cat_health_safety',        'risks_governance',      NULL, 'health_safety', 85),
  ('con_cat_permits',              'risks_governance',      NULL, 'compliance', 81),
  ('con_cat_rfis',                 'risks_governance',      NULL, NULL, 70),
  ('con_cat_site_instructions',    'risks_governance',      NULL, NULL, 71),
  ('con_cat_handover_commissioning','readiness_close',      NULL, NULL, 60),
  ('con_cat_plant_equipment',      'money_resources',       NULL, NULL, 52),
  ('con_cat_materials',            'money_resources',       NULL, 'procurement', 61),
  ('con_cat_contractors',          'money_resources',       NULL, NULL, 70),
  ('con_cat_subcontractors',       'money_resources',       NULL, NULL, 71),
  ('con_cat_commercial',           'money_resources',       NULL, NULL, 72),
  ('con_cat_progress_certificates','money_resources',       NULL, NULL, 73),
  -- Information Technology (ICT)
  ('ict_cat_delivery',             'project_setup',         NULL, 'delivery_overview', 15),
  ('ict_cat_environments',         'project_setup',         'plat_pm_project_settings', NULL, 55),
  ('ict_cat_architecture',         'scope_requirements',    NULL, 'design_architecture', 61),
  ('ict_cat_design',               'scope_requirements',    NULL, 'design_architecture', 62),
  ('ict_cat_interfaces',           'scope_requirements',    NULL, 'interfaces', 70),
  ('ict_cat_data',                 'deliver_test',          NULL, 'data_migration', 41),
  ('ict_cat_development',          'deliver_test',          NULL, NULL, 90),
  ('ict_cat_cybersecurity',        'deliver_test',          NULL, NULL, 91),
  ('ict_cat_testing',              'deliver_test',          NULL, 'testing', 72),
  ('ict_cat_technical_debt',       'risks_governance',      NULL, NULL, 75),
  ('ict_cat_production_readiness', 'readiness_close',       NULL, 'operational_readiness', 31),
  -- Healthcare (HLT)
  ('hlt_cat_projects',             'project_setup',         NULL, 'delivery_overview', 15),
  ('hlt_cat_facilities_equipment', 'deliver_test',          NULL, 'facilities_equipment', 45),
  ('hlt_cat_accreditation',        'risks_governance',      NULL, 'compliance', 82),
  ('hlt_cat_workforce_readiness',  'stakeholders_adoption', NULL, NULL, 80),
  ('hlt_cat_operational_readiness','readiness_close',       NULL, 'operational_readiness', 32),
  ('hlt_cat_clinical_readiness',   'readiness_close',       NULL, NULL, 61),
  -- Government & Public Sector (GOV)
  ('gov_cat_programme',            'project_setup',         NULL, 'delivery_overview', 15),
  ('gov_cat_policy_mandate',       'project_setup',         NULL, NULL, 25),
  ('gov_cat_investment',           'project_setup',         NULL, NULL, 45),
  ('gov_cat_interagency_coordination','stakeholders_adoption', NULL, NULL, 80),
  ('gov_cat_benefits_outcomes',    'readiness_close',       NULL, 'benefits_results', 11),
  ('gov_cat_budget_appropriation', 'money_resources',       NULL, NULL, 15),
  ('gov_cat_procurement_tendering','money_resources',       NULL, 'procurement', 62),
  -- Telecommunications (TEL)
  ('tel_cat_programme',            'project_setup',         NULL, 'delivery_overview', 15),
  ('tel_cat_network_planning',     'scope_requirements',    NULL, 'design_architecture', 63),
  ('tel_cat_sites_towers',         'deliver_test',          NULL, NULL, 90),
  ('tel_cat_ran',                  'deliver_test',          NULL, NULL, 91),
  ('tel_cat_core_network',         'deliver_test',          NULL, NULL, 92),
  ('tel_cat_transmission',         'deliver_test',          NULL, NULL, 93),
  ('tel_cat_oss_bss',              'deliver_test',          NULL, NULL, 94),
  ('tel_cat_network_testing',      'deliver_test',          NULL, 'testing', 73),
  ('tel_cat_launch_operations',    'readiness_close',       NULL, 'go_live_hypercare', 52),
  -- Energy & Utilities (ENR)
  ('enr_cat_programme',            'project_setup',         NULL, 'delivery_overview', 15),
  ('enr_cat_generation',           'deliver_test',          NULL, NULL, 90),
  ('enr_cat_transmission',         'deliver_test',          NULL, NULL, 91),
  ('enr_cat_distribution',         'deliver_test',          NULL, NULL, 92),
  ('enr_cat_utility_assets',       'deliver_test',          NULL, NULL, 93),
  ('enr_cat_metering',             'deliver_test',          NULL, NULL, 94),
  ('enr_cat_grid_integration',     'deliver_test',          NULL, NULL, 95),
  ('enr_cat_hse',                  'risks_governance',      NULL, 'health_safety', 86),
  ('enr_cat_operations_readiness', 'readiness_close',       NULL, 'operational_readiness', 33),
  ('enr_cat_outages_cutovers',     'readiness_close',       NULL, 'cutover', 41),
  -- Manufacturing (MFG)
  ('mfg_cat_programme',            'project_setup',         NULL, 'delivery_overview', 15),
  ('mfg_cat_industrialisation',    'scope_requirements',    NULL, 'design_architecture', 64),
  ('mfg_cat_plant_facility',       'deliver_test',          NULL, 'facilities_equipment', 46),
  ('mfg_cat_production_lines',     'deliver_test',          NULL, 'facilities_equipment', 47),
  ('mfg_cat_equipment_tooling',    'deliver_test',          NULL, 'facilities_equipment', 48),
  ('mfg_cat_production_readiness', 'readiness_close',       NULL, 'operational_readiness', 34),
  ('mfg_cat_ramp_up',              'readiness_close',       NULL, NULL, 62),
  -- Education (EDU)
  ('edu_cat_programme',            'project_setup',         NULL, 'delivery_overview', 15),
  ('edu_cat_curriculum',           'scope_requirements',    NULL, 'design_architecture', 65),
  ('edu_cat_academic_programmes',  'scope_requirements',    NULL, 'design_architecture', 66),
  ('edu_cat_facilities',           'deliver_test',          NULL, 'facilities_equipment', 49),
  ('edu_cat_digital_learning',     'deliver_test',          NULL, NULL, 90),
  ('edu_cat_research',             'deliver_test',          NULL, NULL, 91),
  -- NGO / Development (NGO)
  ('ngo_cat_programme',            'project_setup',         NULL, 'delivery_overview', 15),
  ('ngo_cat_field_operations',     'deliver_test',          NULL, NULL, 90),
  ('ngo_cat_logical_framework',    'readiness_close',       NULL, 'benefits_results', 12),
  ('ngo_cat_monitoring_evaluation','readiness_close',       NULL, 'benefits_results', 13),
  ('ngo_cat_impact_learning',      'readiness_close',       NULL, NULL, 63),
  ('ngo_cat_donor_management',     'money_resources',       NULL, NULL, 70),
  ('ngo_cat_grants',               'money_resources',       NULL, NULL, 71),
  ('ngo_cat_partners',             'money_resources',       NULL, NULL, 72),
  -- Retail (RET)
  ('ret_cat_programme',            'project_setup',         NULL, 'delivery_overview', 15),
  ('ret_cat_store_development',    'deliver_test',          NULL, NULL, 90),
  ('ret_cat_merchandising',        'deliver_test',          NULL, NULL, 91),
  ('ret_cat_pos',                  'deliver_test',          NULL, NULL, 92),
  ('ret_cat_ecommerce',            'deliver_test',          NULL, NULL, 93),
  ('ret_cat_launch_stabilisation', 'readiness_close',       NULL, 'go_live_hypercare', 53),
  -- Human Resources (HRM)
  ('hrm_cat_projects',             'project_setup',         NULL, 'delivery_overview', 15),
  ('hrm_cat_portfolio',            'project_setup',         NULL, 'delivery_overview', 16),
  ('hrm_cat_org_design',           'deliver_test',          NULL, NULL, 90),
  ('hrm_cat_technology',           'deliver_test',          NULL, NULL, 91),
  -- Legal & Compliance (LCO)
  ('lco_cat_projects',             'project_setup',         NULL, 'delivery_overview', 15),
  ('lco_cat_portfolio',            'project_setup',         NULL, 'delivery_overview', 16),
  ('lco_cat_regulatory_change',    'risks_governance',      NULL, 'compliance', 83),
  ('lco_cat_remediation',          'risks_governance',      NULL, NULL, 76),
  ('lco_cat_technology',           'deliver_test',          NULL, NULL, 90),
  -- Marketing (MKT)
  ('mkt_cat_portfolio',            'project_setup',         NULL, 'delivery_overview', 15),
  ('mkt_cat_strategy',             'project_setup',         NULL, NULL, 46),
  ('mkt_cat_brand',                'stakeholders_adoption', NULL, NULL, 80),
  ('mkt_cat_pr',                   'stakeholders_adoption', NULL, NULL, 81),
  ('mkt_cat_influencer',           'stakeholders_adoption', NULL, NULL, 82),
  ('mkt_cat_campaigns',            'deliver_test',          NULL, NULL, 90),
  ('mkt_cat_content',              'deliver_test',          NULL, NULL, 91),
  ('mkt_cat_creative_briefs',      'deliver_test',          NULL, NULL, 92),
  ('mkt_cat_creative_production',  'deliver_test',          NULL, NULL, 93),
  ('mkt_cat_design',               'deliver_test',          NULL, NULL, 94),
  ('mkt_cat_advertising',          'deliver_test',          NULL, NULL, 95),
  ('mkt_cat_media_planning',       'deliver_test',          NULL, NULL, 96),
  ('mkt_cat_events',               'deliver_test',          NULL, NULL, 97),
  ('mkt_cat_print',                'deliver_test',          NULL, NULL, 98),
  ('mkt_cat_video',                'deliver_test',          NULL, NULL, 99),
  ('mkt_cat_product_launches',     'readiness_close',       NULL, 'go_live_hypercare', 54)
) AS v(menu_code, section_code, parent_code, slot_key, sort_order)
JOIN public.menu_items mi ON mi.menu_code = v.menu_code AND COALESCE(mi.is_deleted, FALSE) = FALSE
LEFT JOIN public.menu_items par ON par.menu_code = v.parent_code AND COALESCE(par.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET
  section_code = EXCLUDED.section_code,
  parent_menu_item_id = EXCLUDED.parent_menu_item_id,
  slot_key = EXCLUDED.slot_key,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();

-- ── Check: industry groups and how many are placed for the PM ───────────────
SELECT
  (SELECT count(*) FROM public.menu_items WHERE menu_code ~ '^[a-z]{3}_cat_' AND COALESCE(is_deleted, FALSE) = FALSE) AS industry_groups,
  (SELECT count(*) FROM public.menu_item_placements p JOIN public.menu_items mi ON mi.id = p.menu_item_id
    WHERE p.placement_key = 'pm' AND mi.menu_code ~ '^[a-z]{3}_cat_') AS industry_groups_placed_for_pm;
