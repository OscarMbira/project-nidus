-- ============================================================================
-- v913: Industry Role Catalog expansion — 48 → 100 built-in roles
-- ============================================================================
-- Fills real gaps in the v906/v907 catalog — most notably IT & Software had zero actual
-- Developer roles (only Scrum Master/DevOps Lead/QA/Release Manager), and two entire common
-- functions (Human Resources, Legal & Compliance) were missing outright. Adds 2 new industry
-- categories and 52 new built-in roles (38 + 52 = 90 industry roles + the original 10 generic
-- tiers = 100 total), using the exact same mechanism as v907: each new role is bucketed into
-- one of the 6 seniority tiers already in use and inherits that tier's role_menu_items grants.
-- Idempotent — safe to re-run.
-- Prerequisites: v906 (industry_categories schema), v907 (original 38-role seed + tier pattern)
-- ============================================================================

-- ── 1. Two new industry categories ───────────────────────────────────────────

INSERT INTO public.industry_categories (name, is_active)
VALUES
  ('Human Resources', TRUE),
  ('Legal & Compliance', TRUE)
ON CONFLICT (name) WHERE is_active = TRUE DO UPDATE SET
  updated_at = NOW();

-- ── 2. 52 new project_roles templates ────────────────────────────────────────

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
  -- Level 11 — Executive/Sponsor tier (governance/oversight-only, matches project_sponsor)
  ('chief_technology_officer', 'Chief Technology Officer', 'Executive ownership of technology strategy and delivery', 11, 'Cross-Industry', 'project_sponsor', TRUE),
  ('legal_counsel_director', 'Legal Counsel Director', 'Executive oversight of legal strategy and risk', 11, 'Legal & Compliance', 'project_sponsor', TRUE),

  -- Level 10 — operational multi-project coordination (matches programme_manager)
  ('hr_programme_manager', 'HR Programme Manager', 'Coordinates multiple HR transformation and people programmes', 10, 'Human Resources', 'programme_manager', FALSE),
  ('legal_compliance_programme_manager', 'Legal & Compliance Programme Manager', 'Coordinates multi-project legal and compliance programmes', 10, 'Legal & Compliance', 'programme_manager', FALSE),

  -- Level 9 — Project Manager tier
  ('product_manager', 'Product Manager', 'Owns product strategy, roadmap, and delivery outcomes', 9, 'Cross-Industry', 'project_manager', FALSE),
  ('software_engineering_manager', 'Software Engineering Manager', 'Manages day-to-day software engineering delivery', 9, 'IT & Software', 'project_manager', FALSE),
  ('hr_business_partner', 'HR Business Partner', 'Day-to-day HR partnership with project and business teams', 9, 'Human Resources', 'project_manager', FALSE),

  -- Level 8 — Team Manager tier
  ('solutions_architect', 'Solutions Architect', 'Leads technical solution design across a delivery team', 8, 'Cross-Industry', 'team_manager', FALSE),
  ('engineering_team_lead', 'Engineering Team Lead', 'Leads a software engineering team''s day-to-day delivery', 8, 'IT & Software', 'team_manager', FALSE),
  ('qa_automation_lead', 'QA Automation Lead', 'Leads automated testing strategy and the QA team', 8, 'IT & Software', 'team_manager', FALSE),
  ('site_reliability_engineer_lead', 'Site Reliability Engineer (Lead)', 'Leads production reliability and incident response', 8, 'IT & Software', 'team_manager', FALSE),
  ('recruitment_lead', 'Recruitment Lead', 'Leads recruitment team and hiring pipeline', 8, 'Human Resources', 'team_manager', FALSE),
  ('compliance_team_lead', 'Compliance Team Lead', 'Leads compliance monitoring and review team', 8, 'Legal & Compliance', 'team_manager', FALSE),
  ('warehouse_operations_supervisor', 'Warehouse Operations Supervisor', 'Supervises warehouse and distribution operations', 8, 'Manufacturing & Operations', 'team_manager', FALSE),
  ('supply_chain_manager', 'Supply Chain Manager', 'Manages end-to-end supply chain coordination', 8, 'Manufacturing & Operations', 'team_manager', FALSE),
  ('registrar', 'Registrar', 'Manages student/academic records and enrolment operations', 8, 'Education', 'team_manager', FALSE),
  ('instructional_design_lead', 'Instructional Design Lead', 'Leads curriculum and learning-material design team', 8, 'Education', 'team_manager', FALSE),

  -- Level 7 — Project Assurance tier
  ('data_scientist', 'Data Scientist', 'Builds predictive models and data-driven analysis', 7, 'Cross-Industry', 'project_assurance', FALSE),
  ('security_engineer', 'Security Engineer', 'Reviews and assures application/infrastructure security', 7, 'IT & Software', 'project_assurance', FALSE),
  ('data_privacy_officer', 'Data Privacy Officer', 'Ensures data handling meets privacy/regulatory requirements', 7, 'Legal & Compliance', 'project_assurance', FALSE),
  ('contracts_manager', 'Contracts Manager', 'Manages contract review, negotiation, and compliance', 7, 'Legal & Compliance', 'project_assurance', FALSE),
  ('internal_auditor', 'Internal Auditor', 'Conducts internal financial and process audits', 7, 'Financial Services', 'project_assurance', FALSE),
  ('investment_analyst', 'Investment Analyst', 'Analyses investment opportunities and portfolio risk', 7, 'Financial Services', 'project_assurance', FALSE),
  ('actuary', 'Actuary', 'Assesses financial risk using statistical and mathematical models', 7, 'Financial Services', 'project_assurance', FALSE),
  ('pharmacovigilance_officer', 'Pharmacovigilance Officer', 'Monitors drug safety and adverse event reporting', 7, 'Healthcare & Life Sciences', 'project_assurance', FALSE),
  ('grants_manager', 'Grants Manager', 'Manages public sector grant applications and compliance', 7, 'Government & Public Sector', 'project_assurance', FALSE),
  ('renewable_energy_analyst', 'Renewable Energy Analyst', 'Analyses renewable energy generation and performance data', 7, 'Energy & Utilities', 'project_assurance', FALSE),
  ('grid_operations_manager', 'Grid Operations Manager', 'Oversees energy grid operations and reliability', 7, 'Energy & Utilities', 'project_assurance', FALSE),

  -- Level 6 — Quality Assurance tier (individual-contributor specialists)
  ('backend_developer', 'Backend Developer', 'Builds and maintains server-side application logic', 6, 'IT & Software', 'quality_assurance', FALSE),
  ('frontend_developer', 'Frontend Developer', 'Builds and maintains user-facing application interfaces', 6, 'IT & Software', 'quality_assurance', FALSE),
  ('full_stack_developer', 'Full Stack Developer', 'Builds across both frontend and backend application layers', 6, 'IT & Software', 'quality_assurance', FALSE),
  ('mobile_app_developer', 'Mobile App Developer', 'Builds and maintains mobile applications', 6, 'IT & Software', 'quality_assurance', FALSE),
  ('developer_api', 'Developer (API)', 'Builds and maintains API integrations and services', 6, 'IT & Software', 'quality_assurance', FALSE),
  ('developer_functional', 'Developer (Functional)', 'Implements functional/business-logic application features', 6, 'IT & Software', 'quality_assurance', FALSE),
  ('cloud_infrastructure_engineer', 'Cloud Infrastructure Engineer', 'Builds and maintains cloud infrastructure and deployments', 6, 'IT & Software', 'quality_assurance', FALSE),
  ('data_engineer', 'Data Engineer', 'Builds and maintains data pipelines and infrastructure', 6, 'Cross-Industry', 'quality_assurance', FALSE),
  ('data_analyst', 'Data Analyst', 'Analyses data to support reporting and decision-making', 6, 'Cross-Industry', 'quality_assurance', FALSE),
  ('ux_ui_designer', 'UX/UI Designer', 'Designs user experience and interface for products', 6, 'Cross-Industry', 'quality_assurance', FALSE),
  ('technical_writer', 'Technical Writer', 'Writes and maintains technical documentation', 6, 'Cross-Industry', 'quality_assurance', FALSE),
  ('recruiter', 'Recruiter', 'Sources and screens candidates for open roles', 6, 'Human Resources', 'quality_assurance', FALSE),
  ('learning_development_specialist', 'Learning & Development Specialist', 'Designs and delivers staff training programmes', 6, 'Human Resources', 'quality_assurance', FALSE),
  ('payroll_specialist', 'Payroll Specialist', 'Processes payroll and manages compensation administration', 6, 'Human Resources', 'quality_assurance', FALSE),
  ('paralegal', 'Paralegal', 'Supports legal research and documentation', 6, 'Legal & Compliance', 'quality_assurance', FALSE),
  ('financial_analyst', 'Financial Analyst', 'Analyses financial data and prepares reporting', 6, 'Financial Services', 'quality_assurance', FALSE),
  ('underwriter', 'Underwriter', 'Assesses and prices insurance/lending risk', 6, 'Financial Services', 'quality_assurance', FALSE),
  ('maintenance_engineer', 'Maintenance Engineer', 'Maintains and repairs manufacturing equipment', 6, 'Manufacturing & Operations', 'quality_assurance', FALSE),
  ('logistics_coordinator', 'Logistics Coordinator', 'Coordinates shipping, freight, and delivery logistics', 6, 'Manufacturing & Operations', 'quality_assurance', FALSE),
  ('clinical_nurse_coordinator', 'Clinical Nurse Coordinator', 'Coordinates clinical nursing care and patient scheduling', 6, 'Healthcare & Life Sciences', 'quality_assurance', FALSE),
  ('medical_writer', 'Medical Writer', 'Writes clinical and regulatory documentation', 6, 'Healthcare & Life Sciences', 'quality_assurance', FALSE),
  ('policy_analyst', 'Policy Analyst', 'Researches and analyses public policy options', 6, 'Government & Public Sector', 'quality_assurance', FALSE),
  ('content_strategist', 'Content Strategist', 'Plans and oversees content strategy across channels', 6, 'Marketing & Creative', 'quality_assurance', FALSE),
  ('graphic_designer', 'Graphic Designer', 'Designs visual assets for campaigns and brand materials', 6, 'Marketing & Creative', 'quality_assurance', FALSE)
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

-- ── 3. Mirror into `roles` (same role_name) — v511/v902/v907 pattern ────────

INSERT INTO public.roles (role_name, role_display_name, role_description, role_level, industry_category_id, is_system_role, is_active)
SELECT pr.role_name, pr.role_display_name, pr.role_description, pr.role_level, pr.industry_category_id, TRUE, TRUE
FROM public.project_roles pr
WHERE pr.is_template = TRUE
  AND pr.account_id IS NULL
  AND pr.role_name IN (
    'chief_technology_officer', 'legal_counsel_director',
    'hr_programme_manager', 'legal_compliance_programme_manager',
    'product_manager', 'software_engineering_manager', 'hr_business_partner',
    'solutions_architect', 'engineering_team_lead', 'qa_automation_lead',
    'site_reliability_engineer_lead', 'recruitment_lead', 'compliance_team_lead',
    'warehouse_operations_supervisor', 'supply_chain_manager', 'registrar',
    'instructional_design_lead',
    'data_scientist', 'security_engineer', 'data_privacy_officer', 'contracts_manager',
    'internal_auditor', 'investment_analyst', 'actuary', 'pharmacovigilance_officer',
    'grants_manager', 'renewable_energy_analyst', 'grid_operations_manager',
    'backend_developer', 'frontend_developer', 'full_stack_developer', 'mobile_app_developer',
    'developer_api', 'developer_functional', 'cloud_infrastructure_engineer',
    'data_engineer', 'data_analyst', 'ux_ui_designer', 'technical_writer',
    'recruiter', 'learning_development_specialist', 'payroll_specialist',
    'paralegal', 'financial_analyst', 'underwriter',
    'maintenance_engineer', 'logistics_coordinator',
    'clinical_nurse_coordinator', 'medical_writer',
    'policy_analyst', 'content_strategist', 'graphic_designer'
  )
ON CONFLICT (role_name, (COALESCE(account_id, '00000000-0000-0000-0000-000000000000'::uuid)))
DO UPDATE SET
  role_display_name = EXCLUDED.role_display_name,
  role_description = EXCLUDED.role_description,
  role_level = EXCLUDED.role_level,
  industry_category_id = EXCLUDED.industry_category_id,
  updated_at = NOW();

-- ── 4. Copy role_menu_items grants from each tier's source role ─────────────

WITH tier_map (new_role_name, source_role_name) AS (
  VALUES
    ('chief_technology_officer', 'project_sponsor'),
    ('legal_counsel_director', 'project_sponsor'),
    ('hr_programme_manager', 'programme_manager'),
    ('legal_compliance_programme_manager', 'programme_manager'),
    ('product_manager', 'project_manager'),
    ('software_engineering_manager', 'project_manager'),
    ('hr_business_partner', 'project_manager'),
    ('solutions_architect', 'team_manager'),
    ('engineering_team_lead', 'team_manager'),
    ('qa_automation_lead', 'team_manager'),
    ('site_reliability_engineer_lead', 'team_manager'),
    ('recruitment_lead', 'team_manager'),
    ('compliance_team_lead', 'team_manager'),
    ('warehouse_operations_supervisor', 'team_manager'),
    ('supply_chain_manager', 'team_manager'),
    ('registrar', 'team_manager'),
    ('instructional_design_lead', 'team_manager'),
    ('data_scientist', 'project_assurance'),
    ('security_engineer', 'project_assurance'),
    ('data_privacy_officer', 'project_assurance'),
    ('contracts_manager', 'project_assurance'),
    ('internal_auditor', 'project_assurance'),
    ('investment_analyst', 'project_assurance'),
    ('actuary', 'project_assurance'),
    ('pharmacovigilance_officer', 'project_assurance'),
    ('grants_manager', 'project_assurance'),
    ('renewable_energy_analyst', 'project_assurance'),
    ('grid_operations_manager', 'project_assurance'),
    ('backend_developer', 'quality_assurance'),
    ('frontend_developer', 'quality_assurance'),
    ('full_stack_developer', 'quality_assurance'),
    ('mobile_app_developer', 'quality_assurance'),
    ('developer_api', 'quality_assurance'),
    ('developer_functional', 'quality_assurance'),
    ('cloud_infrastructure_engineer', 'quality_assurance'),
    ('data_engineer', 'quality_assurance'),
    ('data_analyst', 'quality_assurance'),
    ('ux_ui_designer', 'quality_assurance'),
    ('technical_writer', 'quality_assurance'),
    ('recruiter', 'quality_assurance'),
    ('learning_development_specialist', 'quality_assurance'),
    ('payroll_specialist', 'quality_assurance'),
    ('paralegal', 'quality_assurance'),
    ('financial_analyst', 'quality_assurance'),
    ('underwriter', 'quality_assurance'),
    ('maintenance_engineer', 'quality_assurance'),
    ('logistics_coordinator', 'quality_assurance'),
    ('clinical_nurse_coordinator', 'quality_assurance'),
    ('medical_writer', 'quality_assurance'),
    ('policy_analyst', 'quality_assurance'),
    ('content_strategist', 'quality_assurance'),
    ('graphic_designer', 'quality_assurance')
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
  RAISE NOTICE 'v913: 2 new industry_categories + 52 new built-in roles seeded (catalog now 100 total)';
END $$;
