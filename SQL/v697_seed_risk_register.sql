-- =============================================================================
-- v697: Seed Data – Risk Register (10 risks for EDP-2024)
-- Prerequisites: v696 must be applied (demo project + risk register must exist).
-- Covers: Threat & Opportunity risks across Budget, Resource, Technical,
--         Vendor, Regulatory, Schedule categories.
-- Roles served: pmo_admin, project_manager, project_assurance, project_board_member
-- =============================================================================

-- ─── Inline fix for generate_risk_identifier (v706) ─────────────────────────
-- The v172 version uses SUBSTRING(risk_identifier FROM 6) which extracts '6-001'
-- from 'R-2026-001' instead of '001', causing an integer cast error.
-- SPLIT_PART correctly extracts the third dash-separated segment.
CREATE OR REPLACE FUNCTION generate_risk_identifier(p_risk_register_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_year      INTEGER;
    v_sequence  INTEGER;
    v_reference VARCHAR(50);
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    SELECT COALESCE(
        MAX(NULLIF(SPLIT_PART(risk_identifier, '-', 3), '')::INTEGER), 0
    ) + 1
    INTO v_sequence
    FROM risks
    WHERE risk_register_id = p_risk_register_id
      AND risk_identifier LIKE 'R-' || v_year || '-%'
      AND is_deleted = FALSE;
    v_reference := 'R-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  v_project_id  UUID;
  v_reg_id      UUID;
  v_owner_id    UUID;
BEGIN

  -- Resolve demo project
  SELECT id INTO v_project_id
  FROM public.projects
  WHERE project_code = 'EDP-2024' AND COALESCE(is_deleted, false) = false
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE NOTICE 'v697: Demo project not found â€“ run v696 first. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_reg_id
  FROM public.risk_registers
  WHERE project_id = v_project_id AND COALESCE(is_deleted, false) = false
  LIMIT 1;

  IF v_reg_id IS NULL THEN
    RAISE NOTICE 'v697: Risk register not found â€“ run v696 first. Skipping.';
    RETURN;
  END IF;

  SELECT u.id INTO v_owner_id
  FROM public.users u WHERE COALESCE(u.is_deleted, false) = false LIMIT 1;

  -- â”€â”€â”€ Insert risks (skip if risk_code already exists for this register) â”€â”€â”€â”€

  INSERT INTO public.risks (
    id, risk_register_id, project_id,
    risk_code, risk_title,
    risk_description,
    risk_type, risk_category,
    cause_description, event_description, effect_description,
    probability, impact,
    pre_probability, pre_impact,
    response_strategy, contingency_plan,
    status_enum, proximity,
    identified_date,
    risk_owner_user_id, identified_by_user_id,
    is_deleted, created_at, updated_at
  )
  SELECT
    gen_random_uuid(), v_reg_id, v_project_id,
    r.risk_code, r.risk_title,
    r.event,   -- risk_description (legacy NOT NULL field; mirrors event_description per v172 migration)
    r.risk_type, r.risk_category,
    r.cause, r.event, r.effect,
    r.prob, r.impact,
    r.prob, r.impact,
    r.response, r.contingency,
    r.status::risk_status_enum, r.proximity::risk_proximity_enum,
    CURRENT_DATE - (r.days_ago || ' days')::interval,
    v_owner_id, v_owner_id,
    false, NOW(), NOW()
  FROM (VALUES
    -- (risk_code, title, type, category, cause, event, effect, prob, impact, response, contingency, status, proximity, days_ago)
    ('RSK-001',
     'Budget Overrun Due to Scope Changes',
     'threat', 'financial',
     'Stakeholders requesting additional features mid-delivery without formal change control',
     'Project budget is exceeded by more than 15% during execution phase',
     'Programme delivery stalls; additional funding request requires board approval, delaying go-live by 3â€“6 months',
     4, 4,
     'mitigate',
     'Enforce formal change control board (CCB) process; freeze scope at Stage 3 gate; maintain 10% contingency reserve',
     'identified', 'within_stage', 30),

    ('RSK-002',
     'Key Resource Unavailability â€“ ERP Architect',
     'threat', 'resource',
     'Single point of dependency on one specialist ERP architect with no named backup',
     'Lead architect becomes unavailable (illness, resignation, competing priority) during critical design phase',
     'ERP configuration decisions delayed; downstream workstreams blocked; potential 2-month schedule slip',
     3, 5,
     'mitigate',
     'Cross-train senior developer on ERP configuration; document all architecture decisions in shared repository',
     'identified', 'within_project', 14),

    ('RSK-003',
     'Legacy System Integration Failure',
     'threat', 'technical',
     'Undocumented APIs and data structures in 12-year-old legacy finance system',
     'Integration between legacy ERP and new customer portal fails during system testing',
     'Customer portal cannot process real-time transactions; phased go-live plan collapses',
     3, 4,
     'mitigate',
     'Engage legacy vendor for paid API documentation audit; build integration spike by end of Stage 2',
     'identified', 'within_project', 21),

    ('RSK-004',
     'Data Migration Integrity Risk',
     'threat', 'technical',
     'Historical records in source system have inconsistent data formats and missing mandatory fields',
     'Corrupted or incomplete data is migrated to new data warehouse, invalidating reporting',
     'Management reporting compromised; regulatory audit risk; remediation cost estimated at Â£180K',
     4, 4,
     'mitigate',
     'Run parallel data cleansing sprint; define data quality acceptance criteria before migration cutover',
     'identified', 'within_project', 45),

    ('RSK-005',
     'Third-Party Vendor Delivery Delay',
     'threat', 'supplier',
     'Mobile workforce platform vendor has history of delayed releases and limited UK support',
     'Vendor delivers mobile platform module 6 weeks late, disrupting field team go-live',
     'Field operatives continue on paper-based processes; productivity target missed in Q2',
     3, 3,
     'transfer',
     'Include contractual SLA penalties and milestone-based payments; identify alternate vendor as contingency',
     'identified', 'within_stage', 10),

    ('RSK-006',
     'Regulatory Compliance â€“ GDPR Data Residency',
     'threat', 'compliance',
     'Cloud provider''s default configuration stores certain data outside UK data sovereignty boundaries',
     'Personal data processed or stored in non-compliant jurisdiction during system go-live',
     'Regulatory fine up to 4% of global turnover; reputational damage; enforcement action',
     2, 5,
     'avoid',
     'Mandate UK-region Azure deployment; legal sign-off on data processing agreements before UAT commences',
     'identified', 'within_project', 60),

    ('RSK-007',
     'Change Fatigue Reducing User Adoption',
     'threat', 'organisational',
     'Organisation has undergone three major system changes in the past two years; staff morale is strained',
     'End-user resistance to new systems leads to low adoption rate post go-live',
     'Benefits realisation targets not met; shadow IT and workarounds persist; ROI delayed by 12+ months',
     4, 3,
     'mitigate',
     'Commission dedicated change management workstream; appoint department change champions; phased rollout with super-user network',
     'identified', 'within_project', 5),

    ('RSK-008',
     'Cyber Security Vulnerability in API Gateway',
     'threat', 'technical',
     'New customer portal exposes REST APIs without current penetration testing completed',
     'Security vulnerability exploited before hardening is complete, resulting in data breach',
     'Customer data compromised; regulatory notification required; estimated remediation cost Â£500K+',
     2, 5,
     'mitigate',
     'Mandatory OWASP-aligned pen test before UAT; API gateway firewall rules applied from environment build',
     'identified', 'within_project', 7),

    ('RSK-009',
     'Early Cloud Adoption Driving Cost Savings',
     'opportunity', 'financial',
     'Cloud-first architecture removes need for on-premises hardware refresh scheduled for next year',
     'Project delivers cloud migration 4 months ahead of hardware refresh cycle',
     'Capital expenditure of Â£220K avoided; operating cost reduced by an estimated Â£45K per annum',
     3, 4,
     'enhance',
     'Accelerate cloud workstream deliverables; communicate saving to Finance Director to secure continued investment',
     'identified', 'beyond_project', 20),

    ('RSK-010',
     'Reuse of Portal Components Across Business Units',
     'opportunity', 'technical',
     'Customer portal component library built for this programme is reusable across three other BU portals',
     'Other business units adopt the shared component library, reducing future development costs',
     'Estimated Â£340K development saving across BU programmes; improved consistency of digital brand',
     4, 3,
     'enhance',
     'Document component library as an organisational asset; present at Group Technology Forum in Q2',
     'identified', 'beyond_project', 15)

  ) AS r(risk_code, risk_title, risk_type, risk_category, cause, event, effect,
         prob, impact, response, contingency, status, proximity, days_ago)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.risks
    WHERE risk_register_id = v_reg_id AND risk_code = r.risk_code
  );

  RAISE NOTICE 'v697: Risk register seed complete for project %.', v_project_id;

END $$;
