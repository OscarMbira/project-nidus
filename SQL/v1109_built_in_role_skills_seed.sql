-- ============================================================================
-- v1109: Seed Required Skills (2-3 each) for all ~100 built-in project_roles
-- ============================================================================
-- projectplan/v1105_project_roles_from_role_library_plan.md Phase 0.
-- Idempotent: only fills role_skills where it is currently NULL/blank, so a
-- System Admin's later edit (via update_builtin_role, v1110) is never
-- overwritten by re-running this file. Targets built-in rows only
-- (is_template = TRUE, account_id IS NULL, project_id IS NULL) — never touches
-- an organisation's own custom roles.
--
-- Source role_name list: SQL/v91_role_system_cleanup.sql (9), v355 (1),
-- v907_industry_role_catalog_seed_data.sql (38), v913_industry_role_catalog_
-- expansion_seed_data.sql (52) = 100 built-in roles.
-- ============================================================================

UPDATE public.project_roles pr
SET role_skills = v.skills, updated_at = NOW()
FROM (VALUES
  ('project_board_member', E'Stakeholder Governance\nDecision Making\nStrategic Oversight'),
  ('project_sponsor', E'Strategic Alignment\nBudget Approval\nExecutive Sponsorship'),
  ('programme_manager', E'Programme Governance\nBenefits Realisation\nCross-Project Coordination'),
  ('project_manager', E'Project Planning\nRisk Management\nStakeholder Communication'),
  ('team_manager', E'Team Leadership\nResource Allocation\nPerformance Management'),
  ('project_assurance', E'Independent Review\nQuality Assurance\nGovernance Compliance'),
  ('quality_assurance', E'Quality Standards\nTesting Oversight\nProcess Compliance'),
  ('change_authority', E'Change Impact Assessment\nChange Approval\nConfiguration Control'),
  ('team_member', E'Task Execution\nCollaboration\nStatus Reporting'),
  ('portfolio_manager', E'Portfolio Prioritisation\nResource Optimisation\nStrategic Alignment'),
  ('construction_project_director', E'Capital Programme Leadership\nContract Governance\nExecutive Stakeholder Management'),
  ('government_programme_director', E'Public Sector Governance\nPolicy Alignment\nProgramme Direction'),
  ('it_programme_manager', E'IT Delivery Coordination\nVendor Management\nTechnical Risk Management'),
  ('healthcare_programme_director', E'Clinical Programme Oversight\nRegulatory Compliance\nMulti-Project Coordination'),
  ('manufacturing_programme_manager', E'Operations Improvement\nProgramme Scheduling\nCross-Functional Coordination'),
  ('financial_programme_manager', E'Financial Programme Governance\nRegulatory Compliance\nMulti-Project Coordination'),
  ('energy_programme_manager', E'Energy Delivery Coordination\nRegulatory Compliance\nProgramme Scheduling'),
  ('education_programme_director', E'Academic Programme Oversight\nCurriculum Governance\nStakeholder Coordination'),
  ('product_owner', E'Backlog Prioritisation\nStakeholder Alignment\nUser Story Writing'),
  ('clinical_trial_manager', E'Trial Protocol Management\nRegulatory Compliance\nSite Coordination'),
  ('public_sector_project_manager', E'Public Procurement\nPolicy Compliance\nStakeholder Management'),
  ('marketing_programme_manager', E'Campaign Portfolio Management\nBrand Governance\nBudget Coordination'),
  ('release_train_engineer', E'Agile Release Train Facilitation\nSAFe Practices\nCross-Team Coordination'),
  ('site_superintendent', E'Site Supervision\nSafety Compliance\nSchedule Management'),
  ('scrum_master', E'Scrum Facilitation\nAgile Coaching\nImpediment Removal'),
  ('devops_lead', E'CI/CD Pipeline Management\nInfrastructure Automation\nRelease Management'),
  ('production_supervisor', E'Production Line Supervision\nQuality Control\nShift Scheduling'),
  ('academic_project_coordinator', E'Course Scheduling\nStakeholder Coordination\nAdministrative Planning'),
  ('field_operations_supervisor', E'Field Crew Supervision\nSafety Compliance\nOperational Scheduling'),
  ('agile_coach', E'Agile Coaching\nFacilitation\nContinuous Improvement'),
  ('creative_director', E'Creative Direction\nBrand Strategy\nTeam Leadership'),
  ('technical_lead', E'Technical Architecture\nCode Review\nTeam Mentoring'),
  ('health_safety_officer', E'Safety Compliance\nIncident Investigation\nRisk Assessment'),
  ('release_manager', E'Release Planning\nChange Coordination\nGo-Live Governance'),
  ('regulatory_affairs_specialist', E'Regulatory Compliance\nSubmission Preparation\nStandards Interpretation'),
  ('policy_compliance_officer', E'Policy Interpretation\nCompliance Monitoring\nRegulatory Reporting'),
  ('risk_compliance_manager', E'Risk Assessment\nRegulatory Compliance\nAudit Coordination'),
  ('brand_compliance_reviewer', E'Brand Guideline Review\nRegulatory Compliance\nQuality Review'),
  ('hse_officer', E'Health Safety Environmental Compliance\nIncident Investigation\nRisk Assessment'),
  ('quantity_surveyor', E'Cost Estimation\nContract Valuation\nProcurement Management'),
  ('qa_test_lead', E'Test Strategy\nDefect Management\nTest Team Leadership'),
  ('clinical_research_coordinator', E'Patient Visit Coordination\nData Collection\nRegulatory Compliance'),
  ('process_engineer', E'Process Validation\nContinuous Improvement\nQuality Control'),
  ('procurement_officer', E'Vendor Evaluation\nContract Negotiation\nProcurement Compliance'),
  ('business_analyst', E'Requirements Analysis\nStakeholder Elicitation\nSolution Validation'),
  ('campaign_coordinator', E'Campaign Execution\nVendor Coordination\nQuality Checks'),
  ('asset_engineer', E'Asset Quality Validation\nMaintenance Standards\nTechnical Inspection'),
  ('curriculum_quality_reviewer', E'Curriculum Review\nStandards Compliance\nQuality Assurance'),
  ('chief_technology_officer', E'Technology Strategy\nExecutive Leadership\nInnovation Governance'),
  ('legal_counsel_director', E'Legal Strategy\nRisk Management\nExecutive Advisory'),
  ('hr_programme_manager', E'HR Programme Coordination\nChange Management\nStakeholder Engagement'),
  ('legal_compliance_programme_manager', E'Legal Programme Coordination\nRegulatory Compliance\nRisk Management'),
  ('product_manager', E'Product Strategy\nRoadmap Planning\nStakeholder Management'),
  ('software_engineering_manager', E'Engineering Team Leadership\nDelivery Planning\nTechnical Oversight'),
  ('hr_business_partner', E'HR Advisory\nStakeholder Partnership\nEmployee Relations'),
  ('solutions_architect', E'Solution Design\nTechnical Architecture\nIntegration Planning'),
  ('engineering_team_lead', E'Team Leadership\nTechnical Mentoring\nDelivery Planning'),
  ('qa_automation_lead', E'Test Automation Strategy\nFramework Design\nQA Team Leadership'),
  ('site_reliability_engineer_lead', E'Production Reliability\nIncident Response\nMonitoring & Alerting'),
  ('recruitment_lead', E'Recruitment Strategy\nHiring Pipeline Management\nStakeholder Coordination'),
  ('compliance_team_lead', E'Compliance Monitoring\nTeam Leadership\nRegulatory Reporting'),
  ('warehouse_operations_supervisor', E'Warehouse Operations\nInventory Management\nTeam Supervision'),
  ('supply_chain_manager', E'Supply Chain Coordination\nVendor Management\nLogistics Planning'),
  ('registrar', E'Academic Records Management\nEnrolment Administration\nData Accuracy'),
  ('instructional_design_lead', E'Curriculum Design\nLearning Material Development\nTeam Leadership'),
  ('data_scientist', E'Predictive Modelling\nStatistical Analysis\nData Visualization'),
  ('security_engineer', E'Security Assessment\nVulnerability Management\nInfrastructure Hardening'),
  ('data_privacy_officer', E'Data Privacy Compliance\nRegulatory Interpretation\nRisk Assessment'),
  ('contracts_manager', E'Contract Review\nNegotiation\nCompliance Monitoring'),
  ('internal_auditor', E'Audit Planning\nFinancial Review\nProcess Compliance'),
  ('investment_analyst', E'Investment Analysis\nPortfolio Risk Assessment\nFinancial Modelling'),
  ('actuary', E'Statistical Risk Modelling\nFinancial Analysis\nRegulatory Compliance'),
  ('pharmacovigilance_officer', E'Drug Safety Monitoring\nAdverse Event Reporting\nRegulatory Compliance'),
  ('grants_manager', E'Grant Application Management\nCompliance Reporting\nBudget Tracking'),
  ('renewable_energy_analyst', E'Energy Performance Analysis\nData Modelling\nReporting'),
  ('grid_operations_manager', E'Grid Operations Management\nReliability Planning\nRegulatory Compliance'),
  ('backend_developer', E'Server-Side Development\nAPI Design\nDatabase Design'),
  ('frontend_developer', E'UI Development\nResponsive Design\nCross-Browser Compatibility'),
  ('full_stack_developer', E'Frontend Development\nBackend Development\nSystem Integration'),
  ('mobile_app_developer', E'Mobile App Development\nUI/UX Implementation\nApp Store Deployment'),
  ('developer_api', E'API Development\nIntegration Design\nAPI Documentation'),
  ('developer_functional', E'Business Logic Implementation\nFunctional Testing\nRequirements Translation'),
  ('cloud_infrastructure_engineer', E'Cloud Architecture\nInfrastructure as Code\nDeployment Automation'),
  ('data_engineer', E'Data Pipeline Development\nETL Design\nData Infrastructure'),
  ('data_analyst', E'Data Analysis\nReporting\nDashboard Development'),
  ('ux_ui_designer', E'User Experience Design\nInterface Design\nUsability Testing'),
  ('technical_writer', E'Technical Documentation\nContent Structuring\nEditing'),
  ('recruiter', E'Candidate Sourcing\nScreening\nInterview Coordination'),
  ('learning_development_specialist', E'Training Design\nProgramme Delivery\nNeeds Assessment'),
  ('payroll_specialist', E'Payroll Processing\nCompensation Administration\nCompliance Reporting'),
  ('paralegal', E'Legal Research\nDocument Preparation\nCase Support'),
  ('financial_analyst', E'Financial Analysis\nReporting\nForecasting'),
  ('underwriter', E'Risk Assessment\nPricing Analysis\nPolicy Evaluation'),
  ('maintenance_engineer', E'Equipment Maintenance\nTroubleshooting\nPreventive Maintenance Planning'),
  ('logistics_coordinator', E'Shipping Coordination\nFreight Management\nDelivery Scheduling'),
  ('clinical_nurse_coordinator', E'Clinical Care Coordination\nPatient Scheduling\nCare Documentation'),
  ('medical_writer', E'Clinical Documentation\nRegulatory Writing\nTechnical Editing'),
  ('policy_analyst', E'Policy Research\nImpact Analysis\nReport Writing'),
  ('content_strategist', E'Content Planning\nEditorial Strategy\nChannel Coordination'),
  ('graphic_designer', E'Visual Design\nBrand Asset Creation\nLayout Design')
) AS v(role_name, skills)
WHERE pr.role_name = v.role_name
  AND pr.is_template = TRUE
  AND pr.account_id IS NULL
  AND pr.project_id IS NULL
  AND (pr.role_skills IS NULL OR btrim(pr.role_skills) = '');

-- Mirror the same skills into public.roles for the matching role_name, only where
-- that table also has a role_skills column and it's blank — no-op if the column
-- doesn't exist there (roles has no skills concept; kept defensive, not assumed).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'role_skills'
  ) THEN
    UPDATE public.roles r
    SET role_skills = pr.role_skills
    FROM public.project_roles pr
    WHERE pr.role_name = r.role_name
      AND pr.is_template = TRUE AND pr.account_id IS NULL AND pr.project_id IS NULL
      AND pr.role_skills IS NOT NULL
      AND (r.role_skills IS NULL OR btrim(r.role_skills) = '');
  END IF;
END $$;

DO $$
DECLARE
  v_missing INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_missing
  FROM public.project_roles
  WHERE is_template = TRUE AND account_id IS NULL AND project_id IS NULL
    AND (role_skills IS NULL OR btrim(role_skills) = '');
  IF v_missing > 0 THEN
    RAISE NOTICE 'v1109: % built-in role(s) still have no role_skills after seeding — check for a role_name added after this file was written', v_missing;
  ELSE
    RAISE NOTICE 'v1109_built_in_role_skills_seed.sql applied successfully — all built-in roles have skills';
  END IF;
END $$;
