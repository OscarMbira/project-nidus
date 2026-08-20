-- ============================================================================
-- v906/v907: Industry Role Catalog — seed data (Phase 2 of 4)
-- ============================================================================
-- Seeds 10 industry_categories + 38 new built-in project_roles templates
-- (account_id IS NULL, is_template = TRUE), each bucketed into one of the 9
-- existing seniority tiers (role_level 6-11) and given the SAME role_menu_items
-- grants as that tier's original source role, via a mirrored `roles` row under
-- the same role_name (the v902 "matching rows in both tables" pattern).
-- Idempotent: safe to re-run (ON CONFLICT on the natural unique keys).
-- Prerequisites: v906_industry_categories_schema.sql
-- ============================================================================

-- ── 1. Industry categories ───────────────────────────────────────────────────

INSERT INTO public.industry_categories (name, is_active)
VALUES
  ('Construction & Engineering', TRUE),
  ('IT & Software', TRUE),
  ('Healthcare & Life Sciences', TRUE),
  ('Manufacturing & Operations', TRUE),
  ('Government & Public Sector', TRUE),
  ('Financial Services', TRUE),
  ('Marketing & Creative', TRUE),
  ('Energy & Utilities', TRUE),
  ('Education', TRUE),
  ('Cross-Industry', TRUE)
ON CONFLICT (name) WHERE is_active = TRUE DO UPDATE SET
  updated_at = NOW();

-- ── 2. New project_roles templates ───────────────────────────────────────────
-- v.tier_source = the existing built-in role_name whose role_menu_items grants
-- this new role copies (step 4 below).

INSERT INTO public.project_roles (
  role_name, role_display_name, role_description,
  is_system_default, is_template, role_level, permissions, is_active,
  industry_category_id, is_governance_only
)
SELECT
  v.role_name, v.role_display_name, v.role_description,
  TRUE, TRUE, v.role_level, '[]'::jsonb, TRUE,
  ic.id, v.is_governance_only
FROM (VALUES
  -- Level 11 — Project Sponsor/Executive tier (governance/oversight-only, matches project_sponsor)
  ('construction_project_director', 'Construction Project Director', 'Executive leadership of construction programmes and capital projects', 11, 'Construction & Engineering', 'project_sponsor', TRUE),
  ('government_programme_director', 'Government Programme Director', 'Executive direction of public sector programmes', 11, 'Government & Public Sector', 'project_sponsor', TRUE),

  -- Level 10 — operational multi-project coordination (matches programme_manager, NOT the
  -- governance-only portfolio_manager, since these are day-to-day delivery-coordinating roles)
  ('it_programme_manager', 'IT Programme Manager', 'Coordinates multiple software/IT delivery projects', 10, 'IT & Software', 'programme_manager', FALSE),
  ('healthcare_programme_director', 'Healthcare Programme Director', 'Oversees multi-project healthcare and clinical programmes', 10, 'Healthcare & Life Sciences', 'programme_manager', FALSE),
  ('manufacturing_programme_manager', 'Manufacturing Programme Manager', 'Coordinates manufacturing and operations improvement programmes', 10, 'Manufacturing & Operations', 'programme_manager', FALSE),
  ('financial_programme_manager', 'Financial Programme Manager', 'Coordinates multi-project financial services programmes', 10, 'Financial Services', 'programme_manager', FALSE),
  ('energy_programme_manager', 'Energy Programme Manager', 'Coordinates energy and utilities delivery programmes', 10, 'Energy & Utilities', 'programme_manager', FALSE),
  ('education_programme_director', 'Education Programme Director', 'Oversees multi-project education and academic programmes', 10, 'Education', 'programme_manager', FALSE),

  -- Level 9 — Project Manager tier
  ('product_owner', 'Product Owner', 'Owns product backlog priorities and delivery scope', 9, 'Cross-Industry', 'project_manager', FALSE),
  ('clinical_trial_manager', 'Clinical Trial Manager', 'Manages day-to-day clinical trial execution', 9, 'Healthcare & Life Sciences', 'project_manager', FALSE),
  ('public_sector_project_manager', 'Public Sector Project Manager', 'Day-to-day management of government/public sector projects', 9, 'Government & Public Sector', 'project_manager', FALSE),
  ('marketing_programme_manager', 'Marketing Programme Manager', 'Manages marketing campaign and brand delivery programmes', 9, 'Marketing & Creative', 'project_manager', FALSE),
  ('release_train_engineer', 'Release Train Engineer', 'Facilitates Agile Release Train execution and delivery', 9, 'Cross-Industry', 'project_manager', FALSE),

  -- Level 8 — Team Manager tier
  ('site_superintendent', 'Site Superintendent', 'Supervises on-site construction crews and daily site operations', 8, 'Construction & Engineering', 'team_manager', FALSE),
  ('scrum_master', 'Scrum Master', 'Facilitates Scrum team ceremonies and removes delivery blockers', 8, 'IT & Software', 'team_manager', FALSE),
  ('devops_lead', 'DevOps Lead', 'Leads deployment pipeline and infrastructure operations', 8, 'IT & Software', 'team_manager', FALSE),
  ('production_supervisor', 'Production Supervisor', 'Supervises production line teams and daily manufacturing output', 8, 'Manufacturing & Operations', 'team_manager', FALSE),
  ('academic_project_coordinator', 'Academic Project Coordinator', 'Coordinates academic project teams and course delivery schedules', 8, 'Education', 'team_manager', FALSE),
  ('field_operations_supervisor', 'Field Operations Supervisor', 'Supervises field crews for energy and utilities operations', 8, 'Energy & Utilities', 'team_manager', FALSE),
  ('agile_coach', 'Agile Coach', 'Coaches teams on Agile practices and continuous improvement', 8, 'Cross-Industry', 'team_manager', FALSE),
  ('creative_director', 'Creative Director', 'Leads creative team output and campaign direction', 8, 'Marketing & Creative', 'team_manager', FALSE),
  ('technical_lead', 'Technical Lead', 'Leads technical delivery team and architecture decisions', 8, 'Cross-Industry', 'team_manager', FALSE),

  -- Level 7 — Project Assurance tier
  ('health_safety_officer', 'Health & Safety Officer', 'Oversees site safety compliance and incident prevention', 7, 'Construction & Engineering', 'project_assurance', FALSE),
  ('release_manager', 'Release Manager', 'Governs software release readiness and go-live approval', 7, 'IT & Software', 'project_assurance', FALSE),
  ('regulatory_affairs_specialist', 'Regulatory Affairs Specialist', 'Ensures compliance with healthcare regulatory requirements', 7, 'Healthcare & Life Sciences', 'project_assurance', FALSE),
  ('policy_compliance_officer', 'Policy Compliance Officer', 'Ensures public sector project compliance with policy and regulation', 7, 'Government & Public Sector', 'project_assurance', FALSE),
  ('risk_compliance_manager', 'Risk & Compliance Manager', 'Oversees financial risk and regulatory compliance', 7, 'Financial Services', 'project_assurance', FALSE),
  ('brand_compliance_reviewer', 'Brand Compliance Reviewer', 'Reviews campaign output for brand and regulatory compliance', 7, 'Marketing & Creative', 'project_assurance', FALSE),
  ('hse_officer', 'HSE Officer', 'Oversees health, safety, and environmental compliance', 7, 'Energy & Utilities', 'project_assurance', FALSE),

  -- Level 6 — Quality Assurance tier
  ('quantity_surveyor', 'Quantity Surveyor', 'Manages construction cost estimation and contract valuation', 6, 'Construction & Engineering', 'quality_assurance', FALSE),
  ('qa_test_lead', 'QA/Test Lead', 'Leads software quality testing and defect validation', 6, 'IT & Software', 'quality_assurance', FALSE),
  ('clinical_research_coordinator', 'Clinical Research Coordinator', 'Coordinates clinical research data collection and patient visits', 6, 'Healthcare & Life Sciences', 'quality_assurance', FALSE),
  ('process_engineer', 'Process Engineer', 'Validates and improves manufacturing process quality', 6, 'Manufacturing & Operations', 'quality_assurance', FALSE),
  ('procurement_officer', 'Procurement Officer', 'Manages public sector procurement and vendor evaluation', 6, 'Government & Public Sector', 'quality_assurance', FALSE),
  ('business_analyst', 'Business Analyst', 'Analyses requirements and validates delivered solutions', 6, 'Cross-Industry', 'quality_assurance', FALSE),
  ('campaign_coordinator', 'Campaign Coordinator', 'Coordinates marketing campaign execution and quality checks', 6, 'Marketing & Creative', 'quality_assurance', FALSE),
  ('asset_engineer', 'Asset Engineer', 'Validates energy/utility asset quality and maintenance standards', 6, 'Energy & Utilities', 'quality_assurance', FALSE),
  ('curriculum_quality_reviewer', 'Curriculum Quality Reviewer', 'Reviews academic curriculum quality and standards compliance', 6, 'Education', 'quality_assurance', FALSE)
) AS v(role_name, role_display_name, role_description, role_level, industry_name, tier_source, is_governance_only)
JOIN public.industry_categories ic ON ic.name = v.industry_name AND ic.is_active = TRUE
ON CONFLICT (role_name, (COALESCE(account_id, '00000000-0000-0000-0000-000000000000'::uuid)))
WHERE is_template = TRUE AND project_id IS NULL
DO UPDATE SET
  role_display_name = EXCLUDED.role_display_name,
  role_description = EXCLUDED.role_description,
  role_level = EXCLUDED.role_level,
  industry_category_id = EXCLUDED.industry_category_id,
  is_governance_only = EXCLUDED.is_governance_only,
  updated_at = NOW();

-- ── 3. Mirror into `roles` (same role_name) — v511/v902 pattern ─────────────

INSERT INTO public.roles (role_name, role_display_name, role_description, role_level, industry_category_id, is_system_role, is_active)
SELECT pr.role_name, pr.role_display_name, pr.role_description, pr.role_level, pr.industry_category_id, TRUE, TRUE
FROM public.project_roles pr
WHERE pr.is_template = TRUE
  AND pr.account_id IS NULL
  AND pr.role_name IN (
    'construction_project_director', 'government_programme_director',
    'it_programme_manager', 'healthcare_programme_director', 'manufacturing_programme_manager',
    'financial_programme_manager', 'energy_programme_manager', 'education_programme_director',
    'product_owner', 'clinical_trial_manager', 'public_sector_project_manager',
    'marketing_programme_manager', 'release_train_engineer',
    'site_superintendent', 'scrum_master', 'devops_lead', 'production_supervisor',
    'academic_project_coordinator', 'field_operations_supervisor', 'agile_coach',
    'creative_director', 'technical_lead',
    'health_safety_officer', 'release_manager', 'regulatory_affairs_specialist',
    'policy_compliance_officer', 'risk_compliance_manager', 'brand_compliance_reviewer', 'hse_officer',
    'quantity_surveyor', 'qa_test_lead', 'clinical_research_coordinator', 'process_engineer',
    'procurement_officer', 'business_analyst', 'campaign_coordinator', 'asset_engineer',
    'curriculum_quality_reviewer'
  )
ON CONFLICT (role_name, (COALESCE(account_id, '00000000-0000-0000-0000-000000000000'::uuid)))
DO UPDATE SET
  role_display_name = EXCLUDED.role_display_name,
  role_description = EXCLUDED.role_description,
  role_level = EXCLUDED.role_level,
  industry_category_id = EXCLUDED.industry_category_id,
  updated_at = NOW();

-- ── 4. Copy role_menu_items grants from each tier's source role ─────────────
-- Maps each new role_name to the existing role_name whose menu grants it inherits.

WITH tier_map (new_role_name, source_role_name) AS (
  VALUES
    ('construction_project_director', 'project_sponsor'),
    ('government_programme_director', 'project_sponsor'),
    ('it_programme_manager', 'programme_manager'),
    ('healthcare_programme_director', 'programme_manager'),
    ('manufacturing_programme_manager', 'programme_manager'),
    ('financial_programme_manager', 'programme_manager'),
    ('energy_programme_manager', 'programme_manager'),
    ('education_programme_director', 'programme_manager'),
    ('product_owner', 'project_manager'),
    ('clinical_trial_manager', 'project_manager'),
    ('public_sector_project_manager', 'project_manager'),
    ('marketing_programme_manager', 'project_manager'),
    ('release_train_engineer', 'project_manager'),
    ('site_superintendent', 'team_manager'),
    ('scrum_master', 'team_manager'),
    ('devops_lead', 'team_manager'),
    ('production_supervisor', 'team_manager'),
    ('academic_project_coordinator', 'team_manager'),
    ('field_operations_supervisor', 'team_manager'),
    ('agile_coach', 'team_manager'),
    ('creative_director', 'team_manager'),
    ('technical_lead', 'team_manager'),
    ('health_safety_officer', 'project_assurance'),
    ('release_manager', 'project_assurance'),
    ('regulatory_affairs_specialist', 'project_assurance'),
    ('policy_compliance_officer', 'project_assurance'),
    ('risk_compliance_manager', 'project_assurance'),
    ('brand_compliance_reviewer', 'project_assurance'),
    ('hse_officer', 'project_assurance'),
    ('quantity_surveyor', 'quality_assurance'),
    ('qa_test_lead', 'quality_assurance'),
    ('clinical_research_coordinator', 'quality_assurance'),
    ('process_engineer', 'quality_assurance'),
    ('procurement_officer', 'quality_assurance'),
    ('business_analyst', 'quality_assurance'),
    ('campaign_coordinator', 'quality_assurance'),
    ('asset_engineer', 'quality_assurance'),
    ('curriculum_quality_reviewer', 'quality_assurance')
)
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), new_role.id, src_grant.menu_item_id, src_grant.can_view, src_grant.can_use, TRUE, NOW(), NOW()
FROM tier_map tm
JOIN public.roles new_role
  ON new_role.role_name = tm.new_role_name AND new_role.account_id IS NULL
JOIN public.roles src_role
  ON src_role.role_name = tm.source_role_name AND src_role.account_id IS NULL
JOIN public.role_menu_items src_grant
  ON src_grant.role_id = src_role.id
  AND src_grant.is_active = TRUE
  AND COALESCE(src_grant.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_use = EXCLUDED.can_use,
  is_active = TRUE,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v907: 10 industry_categories + 38 industry role templates + mirrored roles + copied menu grants seeded';
END $$;
