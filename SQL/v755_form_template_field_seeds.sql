-- ============================================================================
-- Form Template Field Seeds (Platform + Simulator)
-- Version: v755
-- Description: v506_form_template_seeds.sql gave all 68 PMBOK process guide
--   templates the same generic 3-field placeholder schema (Title/Description/
--   Owner). This replaces it with real, template-specific fields for each of
--   the 68 templates, using the field types already supported by
--   FormFieldRenderer.jsx (text, textarea, date, number, select, money).
--
-- Companion to projectplan/v754_pmo_form_template_builder_plan.md (rule 18.2).
--
-- Idempotent: re-running only inserts a new version when the schema actually
-- differs from what's already stored, and always converges is_current to the
-- seeded schema — safe to run multiple times.
--
-- IMPORTANT: each statement below is fully self-contained (its own CTE with the
-- 68-row VALUES list) rather than relying on a shared TEMP TABLE. The SQL runner
-- used to apply this script executes statements independently (each may land on
-- a different pooled connection), which drops session-scoped temp tables between
-- statements ("relation ... does not exist"). Repeating the CTE per statement
-- avoids any cross-statement state entirely.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- public schema (Platform) — insert new version where the schema differs
-- ----------------------------------------------------------------------------

WITH schemas(template_code, schema) AS (
VALUES

('F001', '{"title":"Project Charter","sections":[{"key":"general","title":"General","fields":[
  {"key":"purpose","label":"Purpose & Justification","type":"textarea"},
  {"key":"objectives","label":"Objectives","type":"textarea"},
  {"key":"success_criteria","label":"Success Criteria","type":"textarea"},
  {"key":"sponsor","label":"Sponsor","type":"text"},
  {"key":"high_level_requirements","label":"High-Level Requirements","type":"textarea"},
  {"key":"high_level_risks","label":"High-Level Risks","type":"textarea"},
  {"key":"summary_budget","label":"Summary Budget","type":"money"},
  {"key":"milestone_schedule","label":"Milestone Schedule","type":"textarea"},
  {"key":"pm_authority_level","label":"Project Manager Authority Level","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]}
]}]}'::jsonb),

('F002', '{"title":"Assumption Log","sections":[{"key":"general","title":"General","fields":[
  {"key":"assumption","label":"Assumption","type":"textarea"},
  {"key":"constraint","label":"Constraint","type":"textarea"},
  {"key":"category","label":"Category","type":"select","options":[{"value":"scope","label":"Scope"},{"value":"schedule","label":"Schedule"},{"value":"cost","label":"Cost"},{"value":"quality","label":"Quality"},{"value":"resource","label":"Resource"},{"value":"other","label":"Other"}]},
  {"key":"impact_if_invalid","label":"Impact if Invalid","type":"textarea"},
  {"key":"owner","label":"Owner","type":"text"},
  {"key":"date_identified","label":"Date Identified","type":"date"}
]}]}'::jsonb),

('F003', '{"title":"Stakeholder Register","sections":[{"key":"general","title":"General","fields":[
  {"key":"stakeholder_name","label":"Stakeholder Name","type":"text"},
  {"key":"role","label":"Role","type":"text"},
  {"key":"organisation","label":"Organisation","type":"text"},
  {"key":"contact_info","label":"Contact Information","type":"text"},
  {"key":"influence_level","label":"Influence Level","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]},
  {"key":"interest_level","label":"Interest Level","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]},
  {"key":"classification","label":"Classification","type":"select","options":[{"value":"internal","label":"Internal"},{"value":"external","label":"External"}]}
]}]}'::jsonb),

('F004', '{"title":"Stakeholder Analysis","sections":[{"key":"general","title":"General","fields":[
  {"key":"stakeholder_name","label":"Stakeholder Name","type":"text"},
  {"key":"current_engagement","label":"Current Engagement Level","type":"select","options":[{"value":"unaware","label":"Unaware"},{"value":"resistant","label":"Resistant"},{"value":"neutral","label":"Neutral"},{"value":"supportive","label":"Supportive"},{"value":"leading","label":"Leading"}]},
  {"key":"desired_engagement","label":"Desired Engagement Level","type":"select","options":[{"value":"unaware","label":"Unaware"},{"value":"resistant","label":"Resistant"},{"value":"neutral","label":"Neutral"},{"value":"supportive","label":"Supportive"},{"value":"leading","label":"Leading"}]},
  {"key":"key_requirements","label":"Key Requirements/Expectations","type":"textarea"},
  {"key":"engagement_strategy","label":"Engagement Strategy","type":"textarea"}
]}]}'::jsonb),

('F005', '{"title":"Project Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"plan_overview","label":"Plan Overview","type":"textarea"},
  {"key":"scope_summary","label":"Scope Management Approach","type":"textarea"},
  {"key":"schedule_summary","label":"Schedule Management Approach","type":"textarea"},
  {"key":"cost_summary","label":"Cost Management Approach","type":"textarea"},
  {"key":"quality_summary","label":"Quality Management Approach","type":"textarea"},
  {"key":"baseline_date","label":"Baseline Date","type":"date"}
]}]}'::jsonb),

('F006', '{"title":"Change Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"change_process","label":"Change Control Process","type":"textarea"},
  {"key":"approval_authority","label":"Change Approval Authority","type":"text"},
  {"key":"cc_board_members","label":"Change Control Board Members","type":"textarea"},
  {"key":"escalation_process","label":"Escalation Process","type":"textarea"}
]}]}'::jsonb),

('F007', '{"title":"Project Roadmap","sections":[{"key":"general","title":"General","fields":[
  {"key":"phase","label":"Phase/Milestone","type":"text"},
  {"key":"start_date","label":"Start Date","type":"date"},
  {"key":"end_date","label":"End Date","type":"date"},
  {"key":"key_deliverables","label":"Key Deliverables","type":"textarea"},
  {"key":"dependencies","label":"Dependencies","type":"textarea"}
]}]}'::jsonb),

('F008', '{"title":"Scope Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"scope_definition_process","label":"How Scope Will Be Defined","type":"textarea"},
  {"key":"wbs_process","label":"How the WBS Will Be Created","type":"textarea"},
  {"key":"scope_validation_process","label":"Scope Validation Process","type":"textarea"},
  {"key":"scope_control_process","label":"Scope Control Process","type":"textarea"}
]}]}'::jsonb),

('F009', '{"title":"Requirements Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"requirements_process","label":"Requirements Collection Process","type":"textarea"},
  {"key":"prioritisation_approach","label":"Prioritisation Approach","type":"textarea"},
  {"key":"traceability_approach","label":"Traceability Approach","type":"textarea"},
  {"key":"config_management","label":"Configuration Management Approach","type":"textarea"}
]}]}'::jsonb),

('F010', '{"title":"Requirements Documentation","sections":[{"key":"general","title":"General","fields":[
  {"key":"requirement_id","label":"Requirement ID","type":"text"},
  {"key":"description","label":"Description","type":"textarea"},
  {"key":"category","label":"Category","type":"select","options":[{"value":"functional","label":"Functional"},{"value":"non_functional","label":"Non-Functional"},{"value":"business","label":"Business"},{"value":"stakeholder","label":"Stakeholder"},{"value":"quality","label":"Quality"},{"value":"transition","label":"Transition"}]},
  {"key":"priority","label":"Priority","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]},
  {"key":"acceptance_criteria","label":"Acceptance Criteria","type":"textarea"}
]}]}'::jsonb),

('F011', '{"title":"Requirements Traceability Matrix","sections":[{"key":"general","title":"General","fields":[
  {"key":"requirement_id","label":"Requirement ID","type":"text"},
  {"key":"source","label":"Source","type":"text"},
  {"key":"linked_objective","label":"Linked Business Objective","type":"text"},
  {"key":"linked_deliverable","label":"Linked Deliverable/WBS Item","type":"text"},
  {"key":"test_case","label":"Test/Verification Method","type":"text"},
  {"key":"status","label":"Status","type":"select","options":[{"value":"not_started","label":"Not Started"},{"value":"in_progress","label":"In Progress"},{"value":"verified","label":"Verified"}]}
]}]}'::jsonb),

('F012', '{"title":"Inter-Requirements Traceability Matrix","sections":[{"key":"general","title":"General","fields":[
  {"key":"requirement_id","label":"Requirement ID","type":"text"},
  {"key":"related_requirement_id","label":"Related Requirement ID","type":"text"},
  {"key":"relationship_type","label":"Relationship Type","type":"select","options":[{"value":"depends_on","label":"Depends On"},{"value":"conflicts_with","label":"Conflicts With"},{"value":"duplicates","label":"Duplicates"},{"value":"refines","label":"Refines"}]},
  {"key":"notes","label":"Notes","type":"textarea"}
]}]}'::jsonb),

('F013', '{"title":"Project Scope Statement","sections":[{"key":"general","title":"General","fields":[
  {"key":"product_scope_description","label":"Product Scope Description","type":"textarea"},
  {"key":"deliverables","label":"Deliverables","type":"textarea"},
  {"key":"acceptance_criteria","label":"Acceptance Criteria","type":"textarea"},
  {"key":"exclusions","label":"Exclusions","type":"textarea"},
  {"key":"constraints","label":"Constraints","type":"textarea"},
  {"key":"assumptions","label":"Assumptions","type":"textarea"}
]}]}'::jsonb),

('F014', '{"title":"Work Breakdown Structure","sections":[{"key":"general","title":"General","fields":[
  {"key":"wbs_code","label":"WBS Code","type":"text"},
  {"key":"element_name","label":"Element Name","type":"text"},
  {"key":"parent_element","label":"Parent Element","type":"text"},
  {"key":"level","label":"Level","type":"number"}
]}]}'::jsonb),

('F015', '{"title":"WBS Dictionary","sections":[{"key":"general","title":"General","fields":[
  {"key":"wbs_code","label":"WBS Code","type":"text"},
  {"key":"element_name","label":"Element Name","type":"text"},
  {"key":"description","label":"Description of Work","type":"textarea"},
  {"key":"responsible_party","label":"Responsible Party","type":"text"},
  {"key":"acceptance_criteria","label":"Acceptance Criteria","type":"textarea"},
  {"key":"cost_estimate","label":"Cost Estimate","type":"money"}
]}]}'::jsonb),

('F016', '{"title":"Schedule Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"scheduling_methodology","label":"Scheduling Methodology","type":"text"},
  {"key":"scheduling_tool","label":"Scheduling Tool","type":"text"},
  {"key":"update_frequency","label":"Update Frequency","type":"select","options":[{"value":"weekly","label":"Weekly"},{"value":"biweekly","label":"Biweekly"},{"value":"monthly","label":"Monthly"}]},
  {"key":"control_thresholds","label":"Control Thresholds","type":"textarea"}
]}]}'::jsonb),

('F017', '{"title":"Activity List","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"activity_name","label":"Activity Name","type":"text"},
  {"key":"wbs_reference","label":"WBS Reference","type":"text"},
  {"key":"description","label":"Description","type":"textarea"}
]}]}'::jsonb),

('F018', '{"title":"Activity Attributes","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"predecessor","label":"Predecessor Activities","type":"text"},
  {"key":"successor","label":"Successor Activities","type":"text"},
  {"key":"resource_requirements","label":"Resource Requirements","type":"textarea"},
  {"key":"constraints","label":"Constraints","type":"textarea"}
]}]}'::jsonb),

('F019', '{"title":"Milestone List","sections":[{"key":"general","title":"General","fields":[
  {"key":"milestone_name","label":"Milestone Name","type":"text"},
  {"key":"target_date","label":"Target Date","type":"date"},
  {"key":"milestone_type","label":"Type","type":"select","options":[{"value":"mandatory","label":"Mandatory"},{"value":"optional","label":"Optional"}]},
  {"key":"description","label":"Description","type":"textarea"}
]}]}'::jsonb),

('F020', '{"title":"Network Diagram","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"predecessor","label":"Predecessor(s)","type":"text"},
  {"key":"dependency_type","label":"Dependency Type","type":"select","options":[{"value":"fs","label":"Finish-to-Start"},{"value":"ss","label":"Start-to-Start"},{"value":"ff","label":"Finish-to-Finish"},{"value":"sf","label":"Start-to-Finish"}]},
  {"key":"lag_lead","label":"Lag/Lead","type":"text"}
]}]}'::jsonb),

('F021', '{"title":"Duration Estimates","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"optimistic","label":"Optimistic Duration (days)","type":"number"},
  {"key":"most_likely","label":"Most Likely Duration (days)","type":"number"},
  {"key":"pessimistic","label":"Pessimistic Duration (days)","type":"number"},
  {"key":"estimation_basis","label":"Basis of Estimate","type":"textarea"}
]}]}'::jsonb),

('F022', '{"title":"Duration Estimating Worksheet","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"estimation_technique","label":"Estimation Technique","type":"select","options":[{"value":"analogous","label":"Analogous"},{"value":"parametric","label":"Parametric"},{"value":"three_point","label":"Three-Point"},{"value":"expert_judgement","label":"Expert Judgement"}]},
  {"key":"assumptions","label":"Assumptions","type":"textarea"},
  {"key":"estimated_duration","label":"Estimated Duration (days)","type":"number"}
]}]}'::jsonb),

('F023', '{"title":"Project Schedule","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"start_date","label":"Start Date","type":"date"},
  {"key":"end_date","label":"End Date","type":"date"},
  {"key":"duration","label":"Duration (days)","type":"number"},
  {"key":"status","label":"Status","type":"select","options":[{"value":"not_started","label":"Not Started"},{"value":"in_progress","label":"In Progress"},{"value":"complete","label":"Complete"},{"value":"delayed","label":"Delayed"}]}
]}]}'::jsonb),

('F024', '{"title":"Cost Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"estimating_approach","label":"Cost Estimating Approach","type":"textarea"},
  {"key":"budget_approach","label":"Budgeting Approach","type":"textarea"},
  {"key":"control_thresholds","label":"Cost Control Thresholds","type":"textarea"},
  {"key":"reporting_format","label":"Cost Reporting Format","type":"text"}
]}]}'::jsonb),

('F025', '{"title":"Cost Estimates","sections":[{"key":"general","title":"General","fields":[
  {"key":"wbs_reference","label":"WBS Reference","type":"text"},
  {"key":"cost_category","label":"Cost Category","type":"select","options":[{"value":"labour","label":"Labour"},{"value":"materials","label":"Materials"},{"value":"equipment","label":"Equipment"},{"value":"contingency","label":"Contingency"},{"value":"other","label":"Other"}]},
  {"key":"estimated_cost","label":"Estimated Cost","type":"money"},
  {"key":"basis_of_estimate","label":"Basis of Estimate","type":"textarea"}
]}]}'::jsonb),

('F026', '{"title":"Cost Estimating Worksheet","sections":[{"key":"general","title":"General","fields":[
  {"key":"wbs_reference","label":"WBS Reference","type":"text"},
  {"key":"estimation_technique","label":"Estimation Technique","type":"select","options":[{"value":"analogous","label":"Analogous"},{"value":"parametric","label":"Parametric"},{"value":"bottom_up","label":"Bottom-Up"},{"value":"expert_judgement","label":"Expert Judgement"}]},
  {"key":"unit_cost","label":"Unit Cost","type":"money"},
  {"key":"quantity","label":"Quantity","type":"number"},
  {"key":"total_cost","label":"Total Cost","type":"money"}
]}]}'::jsonb),

('F027', '{"title":"Bottom-Up Cost Estimating Worksheet","sections":[{"key":"general","title":"General","fields":[
  {"key":"work_package","label":"Work Package","type":"text"},
  {"key":"resource_type","label":"Resource Type","type":"text"},
  {"key":"unit_rate","label":"Unit Rate","type":"money"},
  {"key":"quantity","label":"Quantity","type":"number"},
  {"key":"subtotal","label":"Subtotal","type":"money"}
]}]}'::jsonb),

('F028', '{"title":"Cost Baseline","sections":[{"key":"general","title":"General","fields":[
  {"key":"wbs_reference","label":"WBS Reference","type":"text"},
  {"key":"baseline_amount","label":"Baseline Amount","type":"money"},
  {"key":"baseline_date","label":"Baseline Date","type":"date"},
  {"key":"reserve_amount","label":"Contingency Reserve","type":"money"}
]}]}'::jsonb),

('F029', '{"title":"Quality Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"quality_standards","label":"Quality Standards","type":"textarea"},
  {"key":"quality_objectives","label":"Quality Objectives","type":"textarea"},
  {"key":"qa_approach","label":"Quality Assurance Approach","type":"textarea"},
  {"key":"qc_approach","label":"Quality Control Approach","type":"textarea"}
]}]}'::jsonb),

('F030', '{"title":"Quality Metrics","sections":[{"key":"general","title":"General","fields":[
  {"key":"metric_name","label":"Metric Name","type":"text"},
  {"key":"target_value","label":"Target Value","type":"text"},
  {"key":"measurement_method","label":"Measurement Method","type":"textarea"},
  {"key":"frequency","label":"Measurement Frequency","type":"select","options":[{"value":"daily","label":"Daily"},{"value":"weekly","label":"Weekly"},{"value":"monthly","label":"Monthly"},{"value":"per_milestone","label":"Per Milestone"}]}
]}]}'::jsonb),

('F031', '{"title":"Responsibility Assignment Matrix","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_deliverable","label":"Activity/Deliverable","type":"text"},
  {"key":"responsible","label":"Responsible (R)","type":"text"},
  {"key":"accountable","label":"Accountable (A)","type":"text"},
  {"key":"consulted","label":"Consulted (C)","type":"text"},
  {"key":"informed","label":"Informed (I)","type":"text"}
]}]}'::jsonb),

('F032', '{"title":"Resource Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"resource_identification_approach","label":"Resource Identification Approach","type":"textarea"},
  {"key":"acquisition_approach","label":"Resource Acquisition Approach","type":"textarea"},
  {"key":"team_development_approach","label":"Team Development Approach","type":"textarea"},
  {"key":"release_criteria","label":"Resource Release Criteria","type":"textarea"}
]}]}'::jsonb),

('F033', '{"title":"Team Charter","sections":[{"key":"general","title":"General","fields":[
  {"key":"team_values","label":"Team Values","type":"textarea"},
  {"key":"communication_guidelines","label":"Communication Guidelines","type":"textarea"},
  {"key":"decision_making_process","label":"Decision-Making Process","type":"textarea"},
  {"key":"conflict_resolution","label":"Conflict Resolution Process","type":"textarea"},
  {"key":"meeting_norms","label":"Meeting Norms","type":"textarea"}
]}]}'::jsonb),

('F034', '{"title":"Resource Requirements","sections":[{"key":"general","title":"General","fields":[
  {"key":"resource_type","label":"Resource Type","type":"select","options":[{"value":"human","label":"Human"},{"value":"equipment","label":"Equipment"},{"value":"material","label":"Material"},{"value":"facility","label":"Facility"}]},
  {"key":"description","label":"Description","type":"text"},
  {"key":"quantity","label":"Quantity Required","type":"number"},
  {"key":"required_by_date","label":"Required By Date","type":"date"}
]}]}'::jsonb),

('F035', '{"title":"Resource Breakdown Structure","sections":[{"key":"general","title":"General","fields":[
  {"key":"rbs_code","label":"RBS Code","type":"text"},
  {"key":"category","label":"Category","type":"text"},
  {"key":"resource_name","label":"Resource Name","type":"text"},
  {"key":"parent_category","label":"Parent Category","type":"text"}
]}]}'::jsonb),

('F036', '{"title":"Communications Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"stakeholder_group","label":"Stakeholder Group","type":"text"},
  {"key":"information_needs","label":"Information Needs","type":"textarea"},
  {"key":"communication_method","label":"Communication Method","type":"select","options":[{"value":"email","label":"Email"},{"value":"meeting","label":"Meeting"},{"value":"report","label":"Report"},{"value":"dashboard","label":"Dashboard"},{"value":"newsletter","label":"Newsletter"}]},
  {"key":"frequency","label":"Frequency","type":"select","options":[{"value":"daily","label":"Daily"},{"value":"weekly","label":"Weekly"},{"value":"biweekly","label":"Biweekly"},{"value":"monthly","label":"Monthly"},{"value":"ad_hoc","label":"Ad-hoc"}]},
  {"key":"responsible_party","label":"Responsible Party","type":"text"}
]}]}'::jsonb),

('F037', '{"title":"Risk Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"risk_methodology","label":"Risk Management Methodology","type":"textarea"},
  {"key":"roles_responsibilities","label":"Roles & Responsibilities","type":"textarea"},
  {"key":"risk_categories","label":"Risk Categories","type":"textarea"},
  {"key":"risk_appetite","label":"Risk Appetite","type":"select","options":[{"value":"averse","label":"Averse"},{"value":"minimal","label":"Minimal"},{"value":"cautious","label":"Cautious"},{"value":"open","label":"Open"},{"value":"hungry","label":"Hungry"}]}
]}]}'::jsonb),

('F038', '{"title":"Risk Register","sections":[{"key":"general","title":"General","fields":[
  {"key":"risk_description","label":"Risk Description","type":"textarea"},
  {"key":"category","label":"Category","type":"select","options":[{"value":"technical","label":"Technical"},{"value":"external","label":"External"},{"value":"organisational","label":"Organisational"},{"value":"project_management","label":"Project Management"}]},
  {"key":"probability","label":"Probability","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]},
  {"key":"impact","label":"Impact","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]},
  {"key":"risk_owner","label":"Risk Owner","type":"text"},
  {"key":"response_strategy","label":"Response Strategy","type":"select","options":[{"value":"avoid","label":"Avoid"},{"value":"transfer","label":"Transfer"},{"value":"mitigate","label":"Mitigate"},{"value":"accept","label":"Accept"},{"value":"exploit","label":"Exploit"},{"value":"share","label":"Share"},{"value":"enhance","label":"Enhance"}]},
  {"key":"target_date","label":"Target Resolution Date","type":"date"}
]}]}'::jsonb),

('F039', '{"title":"Risk Report","sections":[{"key":"general","title":"General","fields":[
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"overall_risk_exposure","label":"Overall Risk Exposure","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]},
  {"key":"top_risks","label":"Top Risks Summary","type":"textarea"},
  {"key":"risk_trend","label":"Risk Trend","type":"select","options":[{"value":"increasing","label":"Increasing"},{"value":"stable","label":"Stable"},{"value":"decreasing","label":"Decreasing"}]}
]}]}'::jsonb),

('F040', '{"title":"Probability and Impact Assessment","sections":[{"key":"general","title":"General","fields":[
  {"key":"risk_description","label":"Risk Description","type":"textarea"},
  {"key":"probability_score","label":"Probability Score (1-5)","type":"number"},
  {"key":"impact_score","label":"Impact Score (1-5)","type":"number"},
  {"key":"overall_rating","label":"Overall Rating","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]}
]}]}'::jsonb),

('F041', '{"title":"Probability and Impact Matrix","sections":[{"key":"general","title":"General","fields":[
  {"key":"probability_level","label":"Probability Level","type":"select","options":[{"value":"very_low","label":"Very Low"},{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"very_high","label":"Very High"}]},
  {"key":"impact_level","label":"Impact Level","type":"select","options":[{"value":"very_low","label":"Very Low"},{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"very_high","label":"Very High"}]},
  {"key":"resulting_priority","label":"Resulting Priority","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]}
]}]}'::jsonb),

('F042', '{"title":"Risk Data Sheet","sections":[{"key":"general","title":"General","fields":[
  {"key":"risk_id","label":"Risk ID","type":"text"},
  {"key":"risk_description","label":"Risk Description","type":"textarea"},
  {"key":"root_cause","label":"Root Cause","type":"textarea"},
  {"key":"triggers","label":"Triggers","type":"textarea"},
  {"key":"response_plan","label":"Response Plan","type":"textarea"},
  {"key":"contingency_plan","label":"Contingency Plan","type":"textarea"}
]}]}'::jsonb),

('F043', '{"title":"Procurement Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"procurement_approach","label":"Procurement Approach","type":"textarea"},
  {"key":"contract_types","label":"Contract Types to be Used","type":"textarea"},
  {"key":"procurement_documents","label":"Procurement Documents","type":"textarea"},
  {"key":"risk_management_approach","label":"Procurement Risk Management","type":"textarea"}
]}]}'::jsonb),

('F044', '{"title":"Procurement Strategy","sections":[{"key":"general","title":"General","fields":[
  {"key":"delivery_method","label":"Delivery Method","type":"select","options":[{"value":"turnkey","label":"Turnkey"},{"value":"design_build","label":"Design-Build"},{"value":"design_bid_build","label":"Design-Bid-Build"}]},
  {"key":"contract_payment_type","label":"Contract Payment Type","type":"select","options":[{"value":"fixed_price","label":"Fixed Price"},{"value":"cost_reimbursable","label":"Cost Reimbursable"},{"value":"time_and_materials","label":"Time & Materials"}]},
  {"key":"market_conditions","label":"Market Conditions","type":"textarea"}
]}]}'::jsonb),

('F045', '{"title":"Source Selection Criteria","sections":[{"key":"general","title":"General","fields":[
  {"key":"criterion","label":"Criterion","type":"text"},
  {"key":"weighting","label":"Weighting (%)","type":"number"},
  {"key":"description","label":"Description","type":"textarea"}
]}]}'::jsonb),

('F046', '{"title":"Stakeholder Engagement Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"stakeholder_group","label":"Stakeholder Group","type":"text"},
  {"key":"current_engagement","label":"Current Engagement Level","type":"select","options":[{"value":"unaware","label":"Unaware"},{"value":"resistant","label":"Resistant"},{"value":"neutral","label":"Neutral"},{"value":"supportive","label":"Supportive"},{"value":"leading","label":"Leading"}]},
  {"key":"desired_engagement","label":"Desired Engagement Level","type":"select","options":[{"value":"unaware","label":"Unaware"},{"value":"resistant","label":"Resistant"},{"value":"neutral","label":"Neutral"},{"value":"supportive","label":"Supportive"},{"value":"leading","label":"Leading"}]},
  {"key":"engagement_actions","label":"Engagement Actions","type":"textarea"}
]}]}'::jsonb),

('F047', '{"title":"Issue Log","sections":[{"key":"general","title":"General","fields":[
  {"key":"issue_description","label":"Issue Description","type":"textarea"},
  {"key":"category","label":"Category","type":"select","options":[{"value":"technical","label":"Technical"},{"value":"resource","label":"Resource"},{"value":"schedule","label":"Schedule"},{"value":"scope","label":"Scope"},{"value":"stakeholder","label":"Stakeholder"},{"value":"other","label":"Other"}]},
  {"key":"priority","label":"Priority","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]},
  {"key":"owner","label":"Owner","type":"text"},
  {"key":"status","label":"Status","type":"select","options":[{"value":"open","label":"Open"},{"value":"in_progress","label":"In Progress"},{"value":"resolved","label":"Resolved"},{"value":"closed","label":"Closed"}]},
  {"key":"raised_date","label":"Date Raised","type":"date"},
  {"key":"target_resolution_date","label":"Target Resolution Date","type":"date"}
]}]}'::jsonb),

('F048', '{"title":"Decision Log","sections":[{"key":"general","title":"General","fields":[
  {"key":"decision_description","label":"Decision Description","type":"textarea"},
  {"key":"decision_date","label":"Decision Date","type":"date"},
  {"key":"decision_maker","label":"Decision Maker","type":"text"},
  {"key":"rationale","label":"Rationale","type":"textarea"},
  {"key":"impact","label":"Impact","type":"textarea"}
]}]}'::jsonb),

('F049', '{"title":"Change Request","sections":[{"key":"general","title":"General","fields":[
  {"key":"change_description","label":"Change Description","type":"textarea"},
  {"key":"reason_for_change","label":"Reason for Change","type":"textarea"},
  {"key":"impact_assessment","label":"Impact Assessment (Scope/Schedule/Cost)","type":"textarea"},
  {"key":"priority","label":"Priority","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]},
  {"key":"status","label":"Status","type":"select","options":[{"value":"submitted","label":"Submitted"},{"value":"under_review","label":"Under Review"},{"value":"approved","label":"Approved"},{"value":"rejected","label":"Rejected"},{"value":"deferred","label":"Deferred"}]}
]}]}'::jsonb),

('F050', '{"title":"Change Log","sections":[{"key":"general","title":"General","fields":[
  {"key":"change_id","label":"Change ID","type":"text"},
  {"key":"change_summary","label":"Change Summary","type":"text"},
  {"key":"status","label":"Status","type":"select","options":[{"value":"submitted","label":"Submitted"},{"value":"approved","label":"Approved"},{"value":"rejected","label":"Rejected"},{"value":"deferred","label":"Deferred"}]},
  {"key":"decision_date","label":"Decision Date","type":"date"}
]}]}'::jsonb),

('F051', '{"title":"Lessons Learned Register","sections":[{"key":"general","title":"General","fields":[
  {"key":"lesson_description","label":"Lesson Description","type":"textarea"},
  {"key":"category","label":"Category","type":"select","options":[{"value":"went_well","label":"What Went Well"},{"value":"could_improve","label":"What Could Improve"},{"value":"recommendation","label":"Recommendation"}]},
  {"key":"phase","label":"Project Phase","type":"select","options":[{"value":"initiating","label":"Initiating"},{"value":"planning","label":"Planning"},{"value":"executing","label":"Executing"},{"value":"monitoring_controlling","label":"Monitoring & Controlling"},{"value":"closing","label":"Closing"}]},
  {"key":"recommendation","label":"Recommendation for Future Projects","type":"textarea"}
]}]}'::jsonb),

('F052', '{"title":"Quality Audit","sections":[{"key":"general","title":"General","fields":[
  {"key":"audit_date","label":"Audit Date","type":"date"},
  {"key":"auditor","label":"Auditor","type":"text"},
  {"key":"scope_of_audit","label":"Scope of Audit","type":"textarea"},
  {"key":"findings","label":"Findings","type":"textarea"},
  {"key":"corrective_actions","label":"Corrective Actions","type":"textarea"}
]}]}'::jsonb),

('F053', '{"title":"Team Performance Assessment","sections":[{"key":"general","title":"General","fields":[
  {"key":"team_member","label":"Team Member","type":"text"},
  {"key":"assessment_period","label":"Assessment Period","type":"text"},
  {"key":"performance_rating","label":"Performance Rating","type":"select","options":[{"value":"below","label":"Below Expectations"},{"value":"meets","label":"Meets Expectations"},{"value":"exceeds","label":"Exceeds Expectations"}]},
  {"key":"strengths","label":"Strengths","type":"textarea"},
  {"key":"development_areas","label":"Development Areas","type":"textarea"}
]}]}'::jsonb),

('F054', '{"title":"Team Member Status Report","sections":[{"key":"general","title":"General","fields":[
  {"key":"team_member","label":"Team Member","type":"text"},
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"tasks_completed","label":"Tasks Completed","type":"textarea"},
  {"key":"tasks_planned","label":"Tasks Planned Next Period","type":"textarea"},
  {"key":"blockers","label":"Blockers/Issues","type":"textarea"}
]}]}'::jsonb),

('F055', '{"title":"Project Status Report","sections":[{"key":"general","title":"General","fields":[
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"overall_rag","label":"Overall RAG Status","type":"select","options":[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]},
  {"key":"schedule_rag","label":"Schedule RAG","type":"select","options":[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]},
  {"key":"budget_rag","label":"Budget RAG","type":"select","options":[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]},
  {"key":"key_accomplishments","label":"Key Accomplishments","type":"textarea"},
  {"key":"issues_risks","label":"Issues & Risks","type":"textarea"},
  {"key":"next_period_plan","label":"Next Period Plan","type":"textarea"}
]}]}'::jsonb),

('F056', '{"title":"Variance Analysis","sections":[{"key":"general","title":"General","fields":[
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"planned_value","label":"Planned Value","type":"money"},
  {"key":"actual_cost","label":"Actual Cost","type":"money"},
  {"key":"earned_value","label":"Earned Value","type":"money"},
  {"key":"variance_explanation","label":"Variance Explanation","type":"textarea"}
]}]}'::jsonb),

('F057', '{"title":"Earned Value Analysis","sections":[{"key":"general","title":"General","fields":[
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"planned_value","label":"Planned Value (PV)","type":"money"},
  {"key":"earned_value","label":"Earned Value (EV)","type":"money"},
  {"key":"actual_cost","label":"Actual Cost (AC)","type":"money"},
  {"key":"budget_at_completion","label":"Budget at Completion (BAC)","type":"money"}
]}]}'::jsonb),

('F058', '{"title":"Risk Audit","sections":[{"key":"general","title":"General","fields":[
  {"key":"audit_date","label":"Audit Date","type":"date"},
  {"key":"auditor","label":"Auditor","type":"text"},
  {"key":"risk_process_effectiveness","label":"Risk Process Effectiveness","type":"select","options":[{"value":"effective","label":"Effective"},{"value":"partially_effective","label":"Partially Effective"},{"value":"ineffective","label":"Ineffective"}]},
  {"key":"findings","label":"Findings","type":"textarea"},
  {"key":"recommendations","label":"Recommendations","type":"textarea"}
]}]}'::jsonb),

('F059', '{"title":"Contractor Status Report","sections":[{"key":"general","title":"General","fields":[
  {"key":"contractor_name","label":"Contractor Name","type":"text"},
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"progress_summary","label":"Progress Summary","type":"textarea"},
  {"key":"performance_rag","label":"Performance RAG","type":"select","options":[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]},
  {"key":"issues","label":"Issues","type":"textarea"}
]}]}'::jsonb),

('F060', '{"title":"Procurement Audit","sections":[{"key":"general","title":"General","fields":[
  {"key":"audit_date","label":"Audit Date","type":"date"},
  {"key":"contract_reference","label":"Contract Reference","type":"text"},
  {"key":"compliance_status","label":"Compliance Status","type":"select","options":[{"value":"compliant","label":"Compliant"},{"value":"non_compliant","label":"Non-Compliant"},{"value":"partially_compliant","label":"Partially Compliant"}]},
  {"key":"findings","label":"Findings","type":"textarea"}
]}]}'::jsonb),

('F061', '{"title":"Contract Closeout Report","sections":[{"key":"general","title":"General","fields":[
  {"key":"contract_reference","label":"Contract Reference","type":"text"},
  {"key":"closeout_date","label":"Closeout Date","type":"date"},
  {"key":"deliverables_accepted","label":"Deliverables Accepted","type":"select","options":[{"value":"yes","label":"Yes"},{"value":"no","label":"No"},{"value":"partial","label":"Partial"}]},
  {"key":"outstanding_items","label":"Outstanding Items","type":"textarea"},
  {"key":"final_payment_amount","label":"Final Payment Amount","type":"money"}
]}]}'::jsonb),

('F062', '{"title":"Product Acceptance Form","sections":[{"key":"general","title":"General","fields":[
  {"key":"deliverable_name","label":"Deliverable Name","type":"text"},
  {"key":"acceptance_criteria_met","label":"Acceptance Criteria Met","type":"select","options":[{"value":"yes","label":"Yes"},{"value":"no","label":"No"},{"value":"partial","label":"Partial"}]},
  {"key":"accepted_by","label":"Accepted By","type":"text"},
  {"key":"acceptance_date","label":"Acceptance Date","type":"date"},
  {"key":"comments","label":"Comments","type":"textarea"}
]}]}'::jsonb),

('F063', '{"title":"Lessons Learned Summary","sections":[{"key":"general","title":"General","fields":[
  {"key":"summary","label":"Overall Lessons Learned Summary","type":"textarea"},
  {"key":"key_successes","label":"Key Successes","type":"textarea"},
  {"key":"key_challenges","label":"Key Challenges","type":"textarea"},
  {"key":"recommendations","label":"Recommendations for Future Projects","type":"textarea"}
]}]}'::jsonb),

('F064', '{"title":"Project or Phase Closeout","sections":[{"key":"general","title":"General","fields":[
  {"key":"closeout_date","label":"Closeout Date","type":"date"},
  {"key":"final_deliverables","label":"Final Deliverables","type":"textarea"},
  {"key":"outstanding_actions","label":"Outstanding Actions","type":"textarea"},
  {"key":"resource_release_confirmation","label":"Resources Released","type":"select","options":[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]},
  {"key":"sign_off_by","label":"Sign-Off By","type":"text"}
]}]}'::jsonb),

('F065', '{"title":"Product Vision","sections":[{"key":"general","title":"General","fields":[
  {"key":"vision_statement","label":"Vision Statement","type":"textarea"},
  {"key":"target_customers","label":"Target Customers","type":"textarea"},
  {"key":"key_benefits","label":"Key Benefits","type":"textarea"},
  {"key":"success_metrics","label":"Success Metrics","type":"textarea"}
]}]}'::jsonb),

('F066', '{"title":"Product Backlog","sections":[{"key":"general","title":"General","fields":[
  {"key":"item_title","label":"Backlog Item Title","type":"text"},
  {"key":"description","label":"Description","type":"textarea"},
  {"key":"priority","label":"Priority","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]},
  {"key":"estimate","label":"Estimate (Story Points)","type":"number"},
  {"key":"status","label":"Status","type":"select","options":[{"value":"not_started","label":"Not Started"},{"value":"in_progress","label":"In Progress"},{"value":"done","label":"Done"}]}
]}]}'::jsonb),

('F067', '{"title":"Release Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"release_name","label":"Release Name","type":"text"},
  {"key":"release_date","label":"Target Release Date","type":"date"},
  {"key":"included_features","label":"Included Features","type":"textarea"},
  {"key":"release_goals","label":"Release Goals","type":"textarea"}
]}]}'::jsonb),

('F068', '{"title":"Retrospective","sections":[{"key":"general","title":"General","fields":[
  {"key":"sprint_iteration","label":"Sprint/Iteration","type":"text"},
  {"key":"what_went_well","label":"What Went Well","type":"textarea"},
  {"key":"what_could_improve","label":"What Could Improve","type":"textarea"},
  {"key":"action_items","label":"Action Items","type":"textarea"}
]}]}'::jsonb)
)
INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
SELECT
  t.id,
  COALESCE((SELECT MAX(v.version_number) FROM public.form_template_versions v WHERE v.template_id = t.id), 0) + 1,
  s.schema,
  true
FROM schemas s
JOIN public.form_templates t ON t.template_code = s.template_code
WHERE NOT EXISTS (
  SELECT 1 FROM public.form_template_versions v
  WHERE v.template_id = t.id AND v.schema = s.schema
);

-- ----------------------------------------------------------------------------
-- public schema (Platform) — converge is_current to the seeded schema
-- ----------------------------------------------------------------------------

WITH schemas(template_code, schema) AS (
VALUES

('F001', '{"title":"Project Charter","sections":[{"key":"general","title":"General","fields":[
  {"key":"purpose","label":"Purpose & Justification","type":"textarea"},
  {"key":"objectives","label":"Objectives","type":"textarea"},
  {"key":"success_criteria","label":"Success Criteria","type":"textarea"},
  {"key":"sponsor","label":"Sponsor","type":"text"},
  {"key":"high_level_requirements","label":"High-Level Requirements","type":"textarea"},
  {"key":"high_level_risks","label":"High-Level Risks","type":"textarea"},
  {"key":"summary_budget","label":"Summary Budget","type":"money"},
  {"key":"milestone_schedule","label":"Milestone Schedule","type":"textarea"},
  {"key":"pm_authority_level","label":"Project Manager Authority Level","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]}
]}]}'::jsonb),

('F002', '{"title":"Assumption Log","sections":[{"key":"general","title":"General","fields":[
  {"key":"assumption","label":"Assumption","type":"textarea"},
  {"key":"constraint","label":"Constraint","type":"textarea"},
  {"key":"category","label":"Category","type":"select","options":[{"value":"scope","label":"Scope"},{"value":"schedule","label":"Schedule"},{"value":"cost","label":"Cost"},{"value":"quality","label":"Quality"},{"value":"resource","label":"Resource"},{"value":"other","label":"Other"}]},
  {"key":"impact_if_invalid","label":"Impact if Invalid","type":"textarea"},
  {"key":"owner","label":"Owner","type":"text"},
  {"key":"date_identified","label":"Date Identified","type":"date"}
]}]}'::jsonb),

('F003', '{"title":"Stakeholder Register","sections":[{"key":"general","title":"General","fields":[
  {"key":"stakeholder_name","label":"Stakeholder Name","type":"text"},
  {"key":"role","label":"Role","type":"text"},
  {"key":"organisation","label":"Organisation","type":"text"},
  {"key":"contact_info","label":"Contact Information","type":"text"},
  {"key":"influence_level","label":"Influence Level","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]},
  {"key":"interest_level","label":"Interest Level","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]},
  {"key":"classification","label":"Classification","type":"select","options":[{"value":"internal","label":"Internal"},{"value":"external","label":"External"}]}
]}]}'::jsonb),

('F004', '{"title":"Stakeholder Analysis","sections":[{"key":"general","title":"General","fields":[
  {"key":"stakeholder_name","label":"Stakeholder Name","type":"text"},
  {"key":"current_engagement","label":"Current Engagement Level","type":"select","options":[{"value":"unaware","label":"Unaware"},{"value":"resistant","label":"Resistant"},{"value":"neutral","label":"Neutral"},{"value":"supportive","label":"Supportive"},{"value":"leading","label":"Leading"}]},
  {"key":"desired_engagement","label":"Desired Engagement Level","type":"select","options":[{"value":"unaware","label":"Unaware"},{"value":"resistant","label":"Resistant"},{"value":"neutral","label":"Neutral"},{"value":"supportive","label":"Supportive"},{"value":"leading","label":"Leading"}]},
  {"key":"key_requirements","label":"Key Requirements/Expectations","type":"textarea"},
  {"key":"engagement_strategy","label":"Engagement Strategy","type":"textarea"}
]}]}'::jsonb),

('F005', '{"title":"Project Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"plan_overview","label":"Plan Overview","type":"textarea"},
  {"key":"scope_summary","label":"Scope Management Approach","type":"textarea"},
  {"key":"schedule_summary","label":"Schedule Management Approach","type":"textarea"},
  {"key":"cost_summary","label":"Cost Management Approach","type":"textarea"},
  {"key":"quality_summary","label":"Quality Management Approach","type":"textarea"},
  {"key":"baseline_date","label":"Baseline Date","type":"date"}
]}]}'::jsonb),

('F006', '{"title":"Change Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"change_process","label":"Change Control Process","type":"textarea"},
  {"key":"approval_authority","label":"Change Approval Authority","type":"text"},
  {"key":"cc_board_members","label":"Change Control Board Members","type":"textarea"},
  {"key":"escalation_process","label":"Escalation Process","type":"textarea"}
]}]}'::jsonb),

('F007', '{"title":"Project Roadmap","sections":[{"key":"general","title":"General","fields":[
  {"key":"phase","label":"Phase/Milestone","type":"text"},
  {"key":"start_date","label":"Start Date","type":"date"},
  {"key":"end_date","label":"End Date","type":"date"},
  {"key":"key_deliverables","label":"Key Deliverables","type":"textarea"},
  {"key":"dependencies","label":"Dependencies","type":"textarea"}
]}]}'::jsonb),

('F008', '{"title":"Scope Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"scope_definition_process","label":"How Scope Will Be Defined","type":"textarea"},
  {"key":"wbs_process","label":"How the WBS Will Be Created","type":"textarea"},
  {"key":"scope_validation_process","label":"Scope Validation Process","type":"textarea"},
  {"key":"scope_control_process","label":"Scope Control Process","type":"textarea"}
]}]}'::jsonb),

('F009', '{"title":"Requirements Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"requirements_process","label":"Requirements Collection Process","type":"textarea"},
  {"key":"prioritisation_approach","label":"Prioritisation Approach","type":"textarea"},
  {"key":"traceability_approach","label":"Traceability Approach","type":"textarea"},
  {"key":"config_management","label":"Configuration Management Approach","type":"textarea"}
]}]}'::jsonb),

('F010', '{"title":"Requirements Documentation","sections":[{"key":"general","title":"General","fields":[
  {"key":"requirement_id","label":"Requirement ID","type":"text"},
  {"key":"description","label":"Description","type":"textarea"},
  {"key":"category","label":"Category","type":"select","options":[{"value":"functional","label":"Functional"},{"value":"non_functional","label":"Non-Functional"},{"value":"business","label":"Business"},{"value":"stakeholder","label":"Stakeholder"},{"value":"quality","label":"Quality"},{"value":"transition","label":"Transition"}]},
  {"key":"priority","label":"Priority","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]},
  {"key":"acceptance_criteria","label":"Acceptance Criteria","type":"textarea"}
]}]}'::jsonb),

('F011', '{"title":"Requirements Traceability Matrix","sections":[{"key":"general","title":"General","fields":[
  {"key":"requirement_id","label":"Requirement ID","type":"text"},
  {"key":"source","label":"Source","type":"text"},
  {"key":"linked_objective","label":"Linked Business Objective","type":"text"},
  {"key":"linked_deliverable","label":"Linked Deliverable/WBS Item","type":"text"},
  {"key":"test_case","label":"Test/Verification Method","type":"text"},
  {"key":"status","label":"Status","type":"select","options":[{"value":"not_started","label":"Not Started"},{"value":"in_progress","label":"In Progress"},{"value":"verified","label":"Verified"}]}
]}]}'::jsonb),

('F012', '{"title":"Inter-Requirements Traceability Matrix","sections":[{"key":"general","title":"General","fields":[
  {"key":"requirement_id","label":"Requirement ID","type":"text"},
  {"key":"related_requirement_id","label":"Related Requirement ID","type":"text"},
  {"key":"relationship_type","label":"Relationship Type","type":"select","options":[{"value":"depends_on","label":"Depends On"},{"value":"conflicts_with","label":"Conflicts With"},{"value":"duplicates","label":"Duplicates"},{"value":"refines","label":"Refines"}]},
  {"key":"notes","label":"Notes","type":"textarea"}
]}]}'::jsonb),

('F013', '{"title":"Project Scope Statement","sections":[{"key":"general","title":"General","fields":[
  {"key":"product_scope_description","label":"Product Scope Description","type":"textarea"},
  {"key":"deliverables","label":"Deliverables","type":"textarea"},
  {"key":"acceptance_criteria","label":"Acceptance Criteria","type":"textarea"},
  {"key":"exclusions","label":"Exclusions","type":"textarea"},
  {"key":"constraints","label":"Constraints","type":"textarea"},
  {"key":"assumptions","label":"Assumptions","type":"textarea"}
]}]}'::jsonb),

('F014', '{"title":"Work Breakdown Structure","sections":[{"key":"general","title":"General","fields":[
  {"key":"wbs_code","label":"WBS Code","type":"text"},
  {"key":"element_name","label":"Element Name","type":"text"},
  {"key":"parent_element","label":"Parent Element","type":"text"},
  {"key":"level","label":"Level","type":"number"}
]}]}'::jsonb),

('F015', '{"title":"WBS Dictionary","sections":[{"key":"general","title":"General","fields":[
  {"key":"wbs_code","label":"WBS Code","type":"text"},
  {"key":"element_name","label":"Element Name","type":"text"},
  {"key":"description","label":"Description of Work","type":"textarea"},
  {"key":"responsible_party","label":"Responsible Party","type":"text"},
  {"key":"acceptance_criteria","label":"Acceptance Criteria","type":"textarea"},
  {"key":"cost_estimate","label":"Cost Estimate","type":"money"}
]}]}'::jsonb),

('F016', '{"title":"Schedule Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"scheduling_methodology","label":"Scheduling Methodology","type":"text"},
  {"key":"scheduling_tool","label":"Scheduling Tool","type":"text"},
  {"key":"update_frequency","label":"Update Frequency","type":"select","options":[{"value":"weekly","label":"Weekly"},{"value":"biweekly","label":"Biweekly"},{"value":"monthly","label":"Monthly"}]},
  {"key":"control_thresholds","label":"Control Thresholds","type":"textarea"}
]}]}'::jsonb),

('F017', '{"title":"Activity List","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"activity_name","label":"Activity Name","type":"text"},
  {"key":"wbs_reference","label":"WBS Reference","type":"text"},
  {"key":"description","label":"Description","type":"textarea"}
]}]}'::jsonb),

('F018', '{"title":"Activity Attributes","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"predecessor","label":"Predecessor Activities","type":"text"},
  {"key":"successor","label":"Successor Activities","type":"text"},
  {"key":"resource_requirements","label":"Resource Requirements","type":"textarea"},
  {"key":"constraints","label":"Constraints","type":"textarea"}
]}]}'::jsonb),

('F019', '{"title":"Milestone List","sections":[{"key":"general","title":"General","fields":[
  {"key":"milestone_name","label":"Milestone Name","type":"text"},
  {"key":"target_date","label":"Target Date","type":"date"},
  {"key":"milestone_type","label":"Type","type":"select","options":[{"value":"mandatory","label":"Mandatory"},{"value":"optional","label":"Optional"}]},
  {"key":"description","label":"Description","type":"textarea"}
]}]}'::jsonb),

('F020', '{"title":"Network Diagram","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"predecessor","label":"Predecessor(s)","type":"text"},
  {"key":"dependency_type","label":"Dependency Type","type":"select","options":[{"value":"fs","label":"Finish-to-Start"},{"value":"ss","label":"Start-to-Start"},{"value":"ff","label":"Finish-to-Finish"},{"value":"sf","label":"Start-to-Finish"}]},
  {"key":"lag_lead","label":"Lag/Lead","type":"text"}
]}]}'::jsonb),

('F021', '{"title":"Duration Estimates","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"optimistic","label":"Optimistic Duration (days)","type":"number"},
  {"key":"most_likely","label":"Most Likely Duration (days)","type":"number"},
  {"key":"pessimistic","label":"Pessimistic Duration (days)","type":"number"},
  {"key":"estimation_basis","label":"Basis of Estimate","type":"textarea"}
]}]}'::jsonb),

('F022', '{"title":"Duration Estimating Worksheet","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"estimation_technique","label":"Estimation Technique","type":"select","options":[{"value":"analogous","label":"Analogous"},{"value":"parametric","label":"Parametric"},{"value":"three_point","label":"Three-Point"},{"value":"expert_judgement","label":"Expert Judgement"}]},
  {"key":"assumptions","label":"Assumptions","type":"textarea"},
  {"key":"estimated_duration","label":"Estimated Duration (days)","type":"number"}
]}]}'::jsonb),

('F023', '{"title":"Project Schedule","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"start_date","label":"Start Date","type":"date"},
  {"key":"end_date","label":"End Date","type":"date"},
  {"key":"duration","label":"Duration (days)","type":"number"},
  {"key":"status","label":"Status","type":"select","options":[{"value":"not_started","label":"Not Started"},{"value":"in_progress","label":"In Progress"},{"value":"complete","label":"Complete"},{"value":"delayed","label":"Delayed"}]}
]}]}'::jsonb),

('F024', '{"title":"Cost Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"estimating_approach","label":"Cost Estimating Approach","type":"textarea"},
  {"key":"budget_approach","label":"Budgeting Approach","type":"textarea"},
  {"key":"control_thresholds","label":"Cost Control Thresholds","type":"textarea"},
  {"key":"reporting_format","label":"Cost Reporting Format","type":"text"}
]}]}'::jsonb),

('F025', '{"title":"Cost Estimates","sections":[{"key":"general","title":"General","fields":[
  {"key":"wbs_reference","label":"WBS Reference","type":"text"},
  {"key":"cost_category","label":"Cost Category","type":"select","options":[{"value":"labour","label":"Labour"},{"value":"materials","label":"Materials"},{"value":"equipment","label":"Equipment"},{"value":"contingency","label":"Contingency"},{"value":"other","label":"Other"}]},
  {"key":"estimated_cost","label":"Estimated Cost","type":"money"},
  {"key":"basis_of_estimate","label":"Basis of Estimate","type":"textarea"}
]}]}'::jsonb),

('F026', '{"title":"Cost Estimating Worksheet","sections":[{"key":"general","title":"General","fields":[
  {"key":"wbs_reference","label":"WBS Reference","type":"text"},
  {"key":"estimation_technique","label":"Estimation Technique","type":"select","options":[{"value":"analogous","label":"Analogous"},{"value":"parametric","label":"Parametric"},{"value":"bottom_up","label":"Bottom-Up"},{"value":"expert_judgement","label":"Expert Judgement"}]},
  {"key":"unit_cost","label":"Unit Cost","type":"money"},
  {"key":"quantity","label":"Quantity","type":"number"},
  {"key":"total_cost","label":"Total Cost","type":"money"}
]}]}'::jsonb),

('F027', '{"title":"Bottom-Up Cost Estimating Worksheet","sections":[{"key":"general","title":"General","fields":[
  {"key":"work_package","label":"Work Package","type":"text"},
  {"key":"resource_type","label":"Resource Type","type":"text"},
  {"key":"unit_rate","label":"Unit Rate","type":"money"},
  {"key":"quantity","label":"Quantity","type":"number"},
  {"key":"subtotal","label":"Subtotal","type":"money"}
]}]}'::jsonb),

('F028', '{"title":"Cost Baseline","sections":[{"key":"general","title":"General","fields":[
  {"key":"wbs_reference","label":"WBS Reference","type":"text"},
  {"key":"baseline_amount","label":"Baseline Amount","type":"money"},
  {"key":"baseline_date","label":"Baseline Date","type":"date"},
  {"key":"reserve_amount","label":"Contingency Reserve","type":"money"}
]}]}'::jsonb),

('F029', '{"title":"Quality Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"quality_standards","label":"Quality Standards","type":"textarea"},
  {"key":"quality_objectives","label":"Quality Objectives","type":"textarea"},
  {"key":"qa_approach","label":"Quality Assurance Approach","type":"textarea"},
  {"key":"qc_approach","label":"Quality Control Approach","type":"textarea"}
]}]}'::jsonb),

('F030', '{"title":"Quality Metrics","sections":[{"key":"general","title":"General","fields":[
  {"key":"metric_name","label":"Metric Name","type":"text"},
  {"key":"target_value","label":"Target Value","type":"text"},
  {"key":"measurement_method","label":"Measurement Method","type":"textarea"},
  {"key":"frequency","label":"Measurement Frequency","type":"select","options":[{"value":"daily","label":"Daily"},{"value":"weekly","label":"Weekly"},{"value":"monthly","label":"Monthly"},{"value":"per_milestone","label":"Per Milestone"}]}
]}]}'::jsonb),

('F031', '{"title":"Responsibility Assignment Matrix","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_deliverable","label":"Activity/Deliverable","type":"text"},
  {"key":"responsible","label":"Responsible (R)","type":"text"},
  {"key":"accountable","label":"Accountable (A)","type":"text"},
  {"key":"consulted","label":"Consulted (C)","type":"text"},
  {"key":"informed","label":"Informed (I)","type":"text"}
]}]}'::jsonb),

('F032', '{"title":"Resource Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"resource_identification_approach","label":"Resource Identification Approach","type":"textarea"},
  {"key":"acquisition_approach","label":"Resource Acquisition Approach","type":"textarea"},
  {"key":"team_development_approach","label":"Team Development Approach","type":"textarea"},
  {"key":"release_criteria","label":"Resource Release Criteria","type":"textarea"}
]}]}'::jsonb),

('F033', '{"title":"Team Charter","sections":[{"key":"general","title":"General","fields":[
  {"key":"team_values","label":"Team Values","type":"textarea"},
  {"key":"communication_guidelines","label":"Communication Guidelines","type":"textarea"},
  {"key":"decision_making_process","label":"Decision-Making Process","type":"textarea"},
  {"key":"conflict_resolution","label":"Conflict Resolution Process","type":"textarea"},
  {"key":"meeting_norms","label":"Meeting Norms","type":"textarea"}
]}]}'::jsonb),

('F034', '{"title":"Resource Requirements","sections":[{"key":"general","title":"General","fields":[
  {"key":"resource_type","label":"Resource Type","type":"select","options":[{"value":"human","label":"Human"},{"value":"equipment","label":"Equipment"},{"value":"material","label":"Material"},{"value":"facility","label":"Facility"}]},
  {"key":"description","label":"Description","type":"text"},
  {"key":"quantity","label":"Quantity Required","type":"number"},
  {"key":"required_by_date","label":"Required By Date","type":"date"}
]}]}'::jsonb),

('F035', '{"title":"Resource Breakdown Structure","sections":[{"key":"general","title":"General","fields":[
  {"key":"rbs_code","label":"RBS Code","type":"text"},
  {"key":"category","label":"Category","type":"text"},
  {"key":"resource_name","label":"Resource Name","type":"text"},
  {"key":"parent_category","label":"Parent Category","type":"text"}
]}]}'::jsonb),

('F036', '{"title":"Communications Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"stakeholder_group","label":"Stakeholder Group","type":"text"},
  {"key":"information_needs","label":"Information Needs","type":"textarea"},
  {"key":"communication_method","label":"Communication Method","type":"select","options":[{"value":"email","label":"Email"},{"value":"meeting","label":"Meeting"},{"value":"report","label":"Report"},{"value":"dashboard","label":"Dashboard"},{"value":"newsletter","label":"Newsletter"}]},
  {"key":"frequency","label":"Frequency","type":"select","options":[{"value":"daily","label":"Daily"},{"value":"weekly","label":"Weekly"},{"value":"biweekly","label":"Biweekly"},{"value":"monthly","label":"Monthly"},{"value":"ad_hoc","label":"Ad-hoc"}]},
  {"key":"responsible_party","label":"Responsible Party","type":"text"}
]}]}'::jsonb),

('F037', '{"title":"Risk Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"risk_methodology","label":"Risk Management Methodology","type":"textarea"},
  {"key":"roles_responsibilities","label":"Roles & Responsibilities","type":"textarea"},
  {"key":"risk_categories","label":"Risk Categories","type":"textarea"},
  {"key":"risk_appetite","label":"Risk Appetite","type":"select","options":[{"value":"averse","label":"Averse"},{"value":"minimal","label":"Minimal"},{"value":"cautious","label":"Cautious"},{"value":"open","label":"Open"},{"value":"hungry","label":"Hungry"}]}
]}]}'::jsonb),

('F038', '{"title":"Risk Register","sections":[{"key":"general","title":"General","fields":[
  {"key":"risk_description","label":"Risk Description","type":"textarea"},
  {"key":"category","label":"Category","type":"select","options":[{"value":"technical","label":"Technical"},{"value":"external","label":"External"},{"value":"organisational","label":"Organisational"},{"value":"project_management","label":"Project Management"}]},
  {"key":"probability","label":"Probability","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]},
  {"key":"impact","label":"Impact","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]},
  {"key":"risk_owner","label":"Risk Owner","type":"text"},
  {"key":"response_strategy","label":"Response Strategy","type":"select","options":[{"value":"avoid","label":"Avoid"},{"value":"transfer","label":"Transfer"},{"value":"mitigate","label":"Mitigate"},{"value":"accept","label":"Accept"},{"value":"exploit","label":"Exploit"},{"value":"share","label":"Share"},{"value":"enhance","label":"Enhance"}]},
  {"key":"target_date","label":"Target Resolution Date","type":"date"}
]}]}'::jsonb),

('F039', '{"title":"Risk Report","sections":[{"key":"general","title":"General","fields":[
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"overall_risk_exposure","label":"Overall Risk Exposure","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]},
  {"key":"top_risks","label":"Top Risks Summary","type":"textarea"},
  {"key":"risk_trend","label":"Risk Trend","type":"select","options":[{"value":"increasing","label":"Increasing"},{"value":"stable","label":"Stable"},{"value":"decreasing","label":"Decreasing"}]}
]}]}'::jsonb),

('F040', '{"title":"Probability and Impact Assessment","sections":[{"key":"general","title":"General","fields":[
  {"key":"risk_description","label":"Risk Description","type":"textarea"},
  {"key":"probability_score","label":"Probability Score (1-5)","type":"number"},
  {"key":"impact_score","label":"Impact Score (1-5)","type":"number"},
  {"key":"overall_rating","label":"Overall Rating","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]}
]}]}'::jsonb),

('F041', '{"title":"Probability and Impact Matrix","sections":[{"key":"general","title":"General","fields":[
  {"key":"probability_level","label":"Probability Level","type":"select","options":[{"value":"very_low","label":"Very Low"},{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"very_high","label":"Very High"}]},
  {"key":"impact_level","label":"Impact Level","type":"select","options":[{"value":"very_low","label":"Very Low"},{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"very_high","label":"Very High"}]},
  {"key":"resulting_priority","label":"Resulting Priority","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]}
]}]}'::jsonb),

('F042', '{"title":"Risk Data Sheet","sections":[{"key":"general","title":"General","fields":[
  {"key":"risk_id","label":"Risk ID","type":"text"},
  {"key":"risk_description","label":"Risk Description","type":"textarea"},
  {"key":"root_cause","label":"Root Cause","type":"textarea"},
  {"key":"triggers","label":"Triggers","type":"textarea"},
  {"key":"response_plan","label":"Response Plan","type":"textarea"},
  {"key":"contingency_plan","label":"Contingency Plan","type":"textarea"}
]}]}'::jsonb),

('F043', '{"title":"Procurement Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"procurement_approach","label":"Procurement Approach","type":"textarea"},
  {"key":"contract_types","label":"Contract Types to be Used","type":"textarea"},
  {"key":"procurement_documents","label":"Procurement Documents","type":"textarea"},
  {"key":"risk_management_approach","label":"Procurement Risk Management","type":"textarea"}
]}]}'::jsonb),

('F044', '{"title":"Procurement Strategy","sections":[{"key":"general","title":"General","fields":[
  {"key":"delivery_method","label":"Delivery Method","type":"select","options":[{"value":"turnkey","label":"Turnkey"},{"value":"design_build","label":"Design-Build"},{"value":"design_bid_build","label":"Design-Bid-Build"}]},
  {"key":"contract_payment_type","label":"Contract Payment Type","type":"select","options":[{"value":"fixed_price","label":"Fixed Price"},{"value":"cost_reimbursable","label":"Cost Reimbursable"},{"value":"time_and_materials","label":"Time & Materials"}]},
  {"key":"market_conditions","label":"Market Conditions","type":"textarea"}
]}]}'::jsonb),

('F045', '{"title":"Source Selection Criteria","sections":[{"key":"general","title":"General","fields":[
  {"key":"criterion","label":"Criterion","type":"text"},
  {"key":"weighting","label":"Weighting (%)","type":"number"},
  {"key":"description","label":"Description","type":"textarea"}
]}]}'::jsonb),

('F046', '{"title":"Stakeholder Engagement Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"stakeholder_group","label":"Stakeholder Group","type":"text"},
  {"key":"current_engagement","label":"Current Engagement Level","type":"select","options":[{"value":"unaware","label":"Unaware"},{"value":"resistant","label":"Resistant"},{"value":"neutral","label":"Neutral"},{"value":"supportive","label":"Supportive"},{"value":"leading","label":"Leading"}]},
  {"key":"desired_engagement","label":"Desired Engagement Level","type":"select","options":[{"value":"unaware","label":"Unaware"},{"value":"resistant","label":"Resistant"},{"value":"neutral","label":"Neutral"},{"value":"supportive","label":"Supportive"},{"value":"leading","label":"Leading"}]},
  {"key":"engagement_actions","label":"Engagement Actions","type":"textarea"}
]}]}'::jsonb),

('F047', '{"title":"Issue Log","sections":[{"key":"general","title":"General","fields":[
  {"key":"issue_description","label":"Issue Description","type":"textarea"},
  {"key":"category","label":"Category","type":"select","options":[{"value":"technical","label":"Technical"},{"value":"resource","label":"Resource"},{"value":"schedule","label":"Schedule"},{"value":"scope","label":"Scope"},{"value":"stakeholder","label":"Stakeholder"},{"value":"other","label":"Other"}]},
  {"key":"priority","label":"Priority","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]},
  {"key":"owner","label":"Owner","type":"text"},
  {"key":"status","label":"Status","type":"select","options":[{"value":"open","label":"Open"},{"value":"in_progress","label":"In Progress"},{"value":"resolved","label":"Resolved"},{"value":"closed","label":"Closed"}]},
  {"key":"raised_date","label":"Date Raised","type":"date"},
  {"key":"target_resolution_date","label":"Target Resolution Date","type":"date"}
]}]}'::jsonb),

('F048', '{"title":"Decision Log","sections":[{"key":"general","title":"General","fields":[
  {"key":"decision_description","label":"Decision Description","type":"textarea"},
  {"key":"decision_date","label":"Decision Date","type":"date"},
  {"key":"decision_maker","label":"Decision Maker","type":"text"},
  {"key":"rationale","label":"Rationale","type":"textarea"},
  {"key":"impact","label":"Impact","type":"textarea"}
]}]}'::jsonb),

('F049', '{"title":"Change Request","sections":[{"key":"general","title":"General","fields":[
  {"key":"change_description","label":"Change Description","type":"textarea"},
  {"key":"reason_for_change","label":"Reason for Change","type":"textarea"},
  {"key":"impact_assessment","label":"Impact Assessment (Scope/Schedule/Cost)","type":"textarea"},
  {"key":"priority","label":"Priority","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]},
  {"key":"status","label":"Status","type":"select","options":[{"value":"submitted","label":"Submitted"},{"value":"under_review","label":"Under Review"},{"value":"approved","label":"Approved"},{"value":"rejected","label":"Rejected"},{"value":"deferred","label":"Deferred"}]}
]}]}'::jsonb),

('F050', '{"title":"Change Log","sections":[{"key":"general","title":"General","fields":[
  {"key":"change_id","label":"Change ID","type":"text"},
  {"key":"change_summary","label":"Change Summary","type":"text"},
  {"key":"status","label":"Status","type":"select","options":[{"value":"submitted","label":"Submitted"},{"value":"approved","label":"Approved"},{"value":"rejected","label":"Rejected"},{"value":"deferred","label":"Deferred"}]},
  {"key":"decision_date","label":"Decision Date","type":"date"}
]}]}'::jsonb),

('F051', '{"title":"Lessons Learned Register","sections":[{"key":"general","title":"General","fields":[
  {"key":"lesson_description","label":"Lesson Description","type":"textarea"},
  {"key":"category","label":"Category","type":"select","options":[{"value":"went_well","label":"What Went Well"},{"value":"could_improve","label":"What Could Improve"},{"value":"recommendation","label":"Recommendation"}]},
  {"key":"phase","label":"Project Phase","type":"select","options":[{"value":"initiating","label":"Initiating"},{"value":"planning","label":"Planning"},{"value":"executing","label":"Executing"},{"value":"monitoring_controlling","label":"Monitoring & Controlling"},{"value":"closing","label":"Closing"}]},
  {"key":"recommendation","label":"Recommendation for Future Projects","type":"textarea"}
]}]}'::jsonb),

('F052', '{"title":"Quality Audit","sections":[{"key":"general","title":"General","fields":[
  {"key":"audit_date","label":"Audit Date","type":"date"},
  {"key":"auditor","label":"Auditor","type":"text"},
  {"key":"scope_of_audit","label":"Scope of Audit","type":"textarea"},
  {"key":"findings","label":"Findings","type":"textarea"},
  {"key":"corrective_actions","label":"Corrective Actions","type":"textarea"}
]}]}'::jsonb),

('F053', '{"title":"Team Performance Assessment","sections":[{"key":"general","title":"General","fields":[
  {"key":"team_member","label":"Team Member","type":"text"},
  {"key":"assessment_period","label":"Assessment Period","type":"text"},
  {"key":"performance_rating","label":"Performance Rating","type":"select","options":[{"value":"below","label":"Below Expectations"},{"value":"meets","label":"Meets Expectations"},{"value":"exceeds","label":"Exceeds Expectations"}]},
  {"key":"strengths","label":"Strengths","type":"textarea"},
  {"key":"development_areas","label":"Development Areas","type":"textarea"}
]}]}'::jsonb),

('F054', '{"title":"Team Member Status Report","sections":[{"key":"general","title":"General","fields":[
  {"key":"team_member","label":"Team Member","type":"text"},
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"tasks_completed","label":"Tasks Completed","type":"textarea"},
  {"key":"tasks_planned","label":"Tasks Planned Next Period","type":"textarea"},
  {"key":"blockers","label":"Blockers/Issues","type":"textarea"}
]}]}'::jsonb),

('F055', '{"title":"Project Status Report","sections":[{"key":"general","title":"General","fields":[
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"overall_rag","label":"Overall RAG Status","type":"select","options":[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]},
  {"key":"schedule_rag","label":"Schedule RAG","type":"select","options":[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]},
  {"key":"budget_rag","label":"Budget RAG","type":"select","options":[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]},
  {"key":"key_accomplishments","label":"Key Accomplishments","type":"textarea"},
  {"key":"issues_risks","label":"Issues & Risks","type":"textarea"},
  {"key":"next_period_plan","label":"Next Period Plan","type":"textarea"}
]}]}'::jsonb),

('F056', '{"title":"Variance Analysis","sections":[{"key":"general","title":"General","fields":[
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"planned_value","label":"Planned Value","type":"money"},
  {"key":"actual_cost","label":"Actual Cost","type":"money"},
  {"key":"earned_value","label":"Earned Value","type":"money"},
  {"key":"variance_explanation","label":"Variance Explanation","type":"textarea"}
]}]}'::jsonb),

('F057', '{"title":"Earned Value Analysis","sections":[{"key":"general","title":"General","fields":[
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"planned_value","label":"Planned Value (PV)","type":"money"},
  {"key":"earned_value","label":"Earned Value (EV)","type":"money"},
  {"key":"actual_cost","label":"Actual Cost (AC)","type":"money"},
  {"key":"budget_at_completion","label":"Budget at Completion (BAC)","type":"money"}
]}]}'::jsonb),

('F058', '{"title":"Risk Audit","sections":[{"key":"general","title":"General","fields":[
  {"key":"audit_date","label":"Audit Date","type":"date"},
  {"key":"auditor","label":"Auditor","type":"text"},
  {"key":"risk_process_effectiveness","label":"Risk Process Effectiveness","type":"select","options":[{"value":"effective","label":"Effective"},{"value":"partially_effective","label":"Partially Effective"},{"value":"ineffective","label":"Ineffective"}]},
  {"key":"findings","label":"Findings","type":"textarea"},
  {"key":"recommendations","label":"Recommendations","type":"textarea"}
]}]}'::jsonb),

('F059', '{"title":"Contractor Status Report","sections":[{"key":"general","title":"General","fields":[
  {"key":"contractor_name","label":"Contractor Name","type":"text"},
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"progress_summary","label":"Progress Summary","type":"textarea"},
  {"key":"performance_rag","label":"Performance RAG","type":"select","options":[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]},
  {"key":"issues","label":"Issues","type":"textarea"}
]}]}'::jsonb),

('F060', '{"title":"Procurement Audit","sections":[{"key":"general","title":"General","fields":[
  {"key":"audit_date","label":"Audit Date","type":"date"},
  {"key":"contract_reference","label":"Contract Reference","type":"text"},
  {"key":"compliance_status","label":"Compliance Status","type":"select","options":[{"value":"compliant","label":"Compliant"},{"value":"non_compliant","label":"Non-Compliant"},{"value":"partially_compliant","label":"Partially Compliant"}]},
  {"key":"findings","label":"Findings","type":"textarea"}
]}]}'::jsonb),

('F061', '{"title":"Contract Closeout Report","sections":[{"key":"general","title":"General","fields":[
  {"key":"contract_reference","label":"Contract Reference","type":"text"},
  {"key":"closeout_date","label":"Closeout Date","type":"date"},
  {"key":"deliverables_accepted","label":"Deliverables Accepted","type":"select","options":[{"value":"yes","label":"Yes"},{"value":"no","label":"No"},{"value":"partial","label":"Partial"}]},
  {"key":"outstanding_items","label":"Outstanding Items","type":"textarea"},
  {"key":"final_payment_amount","label":"Final Payment Amount","type":"money"}
]}]}'::jsonb),

('F062', '{"title":"Product Acceptance Form","sections":[{"key":"general","title":"General","fields":[
  {"key":"deliverable_name","label":"Deliverable Name","type":"text"},
  {"key":"acceptance_criteria_met","label":"Acceptance Criteria Met","type":"select","options":[{"value":"yes","label":"Yes"},{"value":"no","label":"No"},{"value":"partial","label":"Partial"}]},
  {"key":"accepted_by","label":"Accepted By","type":"text"},
  {"key":"acceptance_date","label":"Acceptance Date","type":"date"},
  {"key":"comments","label":"Comments","type":"textarea"}
]}]}'::jsonb),

('F063', '{"title":"Lessons Learned Summary","sections":[{"key":"general","title":"General","fields":[
  {"key":"summary","label":"Overall Lessons Learned Summary","type":"textarea"},
  {"key":"key_successes","label":"Key Successes","type":"textarea"},
  {"key":"key_challenges","label":"Key Challenges","type":"textarea"},
  {"key":"recommendations","label":"Recommendations for Future Projects","type":"textarea"}
]}]}'::jsonb),

('F064', '{"title":"Project or Phase Closeout","sections":[{"key":"general","title":"General","fields":[
  {"key":"closeout_date","label":"Closeout Date","type":"date"},
  {"key":"final_deliverables","label":"Final Deliverables","type":"textarea"},
  {"key":"outstanding_actions","label":"Outstanding Actions","type":"textarea"},
  {"key":"resource_release_confirmation","label":"Resources Released","type":"select","options":[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]},
  {"key":"sign_off_by","label":"Sign-Off By","type":"text"}
]}]}'::jsonb),

('F065', '{"title":"Product Vision","sections":[{"key":"general","title":"General","fields":[
  {"key":"vision_statement","label":"Vision Statement","type":"textarea"},
  {"key":"target_customers","label":"Target Customers","type":"textarea"},
  {"key":"key_benefits","label":"Key Benefits","type":"textarea"},
  {"key":"success_metrics","label":"Success Metrics","type":"textarea"}
]}]}'::jsonb),

('F066', '{"title":"Product Backlog","sections":[{"key":"general","title":"General","fields":[
  {"key":"item_title","label":"Backlog Item Title","type":"text"},
  {"key":"description","label":"Description","type":"textarea"},
  {"key":"priority","label":"Priority","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]},
  {"key":"estimate","label":"Estimate (Story Points)","type":"number"},
  {"key":"status","label":"Status","type":"select","options":[{"value":"not_started","label":"Not Started"},{"value":"in_progress","label":"In Progress"},{"value":"done","label":"Done"}]}
]}]}'::jsonb),

('F067', '{"title":"Release Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"release_name","label":"Release Name","type":"text"},
  {"key":"release_date","label":"Target Release Date","type":"date"},
  {"key":"included_features","label":"Included Features","type":"textarea"},
  {"key":"release_goals","label":"Release Goals","type":"textarea"}
]}]}'::jsonb),

('F068', '{"title":"Retrospective","sections":[{"key":"general","title":"General","fields":[
  {"key":"sprint_iteration","label":"Sprint/Iteration","type":"text"},
  {"key":"what_went_well","label":"What Went Well","type":"textarea"},
  {"key":"what_could_improve","label":"What Could Improve","type":"textarea"},
  {"key":"action_items","label":"Action Items","type":"textarea"}
]}]}'::jsonb)
)
UPDATE public.form_template_versions v
SET is_current = (v.schema = s.schema)
FROM public.form_templates t
JOIN schemas s ON s.template_code = t.template_code
WHERE v.template_id = t.id
  AND v.is_current <> (v.schema = s.schema);

-- ----------------------------------------------------------------------------
-- sim schema (Simulator) — insert new version where the schema differs (rule 34.1 parity)
-- ----------------------------------------------------------------------------

WITH schemas(template_code, schema) AS (
VALUES

('F001', '{"title":"Project Charter","sections":[{"key":"general","title":"General","fields":[
  {"key":"purpose","label":"Purpose & Justification","type":"textarea"},
  {"key":"objectives","label":"Objectives","type":"textarea"},
  {"key":"success_criteria","label":"Success Criteria","type":"textarea"},
  {"key":"sponsor","label":"Sponsor","type":"text"},
  {"key":"high_level_requirements","label":"High-Level Requirements","type":"textarea"},
  {"key":"high_level_risks","label":"High-Level Risks","type":"textarea"},
  {"key":"summary_budget","label":"Summary Budget","type":"money"},
  {"key":"milestone_schedule","label":"Milestone Schedule","type":"textarea"},
  {"key":"pm_authority_level","label":"Project Manager Authority Level","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]}
]}]}'::jsonb),

('F002', '{"title":"Assumption Log","sections":[{"key":"general","title":"General","fields":[
  {"key":"assumption","label":"Assumption","type":"textarea"},
  {"key":"constraint","label":"Constraint","type":"textarea"},
  {"key":"category","label":"Category","type":"select","options":[{"value":"scope","label":"Scope"},{"value":"schedule","label":"Schedule"},{"value":"cost","label":"Cost"},{"value":"quality","label":"Quality"},{"value":"resource","label":"Resource"},{"value":"other","label":"Other"}]},
  {"key":"impact_if_invalid","label":"Impact if Invalid","type":"textarea"},
  {"key":"owner","label":"Owner","type":"text"},
  {"key":"date_identified","label":"Date Identified","type":"date"}
]}]}'::jsonb),

('F003', '{"title":"Stakeholder Register","sections":[{"key":"general","title":"General","fields":[
  {"key":"stakeholder_name","label":"Stakeholder Name","type":"text"},
  {"key":"role","label":"Role","type":"text"},
  {"key":"organisation","label":"Organisation","type":"text"},
  {"key":"contact_info","label":"Contact Information","type":"text"},
  {"key":"influence_level","label":"Influence Level","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]},
  {"key":"interest_level","label":"Interest Level","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]},
  {"key":"classification","label":"Classification","type":"select","options":[{"value":"internal","label":"Internal"},{"value":"external","label":"External"}]}
]}]}'::jsonb),

('F004', '{"title":"Stakeholder Analysis","sections":[{"key":"general","title":"General","fields":[
  {"key":"stakeholder_name","label":"Stakeholder Name","type":"text"},
  {"key":"current_engagement","label":"Current Engagement Level","type":"select","options":[{"value":"unaware","label":"Unaware"},{"value":"resistant","label":"Resistant"},{"value":"neutral","label":"Neutral"},{"value":"supportive","label":"Supportive"},{"value":"leading","label":"Leading"}]},
  {"key":"desired_engagement","label":"Desired Engagement Level","type":"select","options":[{"value":"unaware","label":"Unaware"},{"value":"resistant","label":"Resistant"},{"value":"neutral","label":"Neutral"},{"value":"supportive","label":"Supportive"},{"value":"leading","label":"Leading"}]},
  {"key":"key_requirements","label":"Key Requirements/Expectations","type":"textarea"},
  {"key":"engagement_strategy","label":"Engagement Strategy","type":"textarea"}
]}]}'::jsonb),

('F005', '{"title":"Project Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"plan_overview","label":"Plan Overview","type":"textarea"},
  {"key":"scope_summary","label":"Scope Management Approach","type":"textarea"},
  {"key":"schedule_summary","label":"Schedule Management Approach","type":"textarea"},
  {"key":"cost_summary","label":"Cost Management Approach","type":"textarea"},
  {"key":"quality_summary","label":"Quality Management Approach","type":"textarea"},
  {"key":"baseline_date","label":"Baseline Date","type":"date"}
]}]}'::jsonb),

('F006', '{"title":"Change Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"change_process","label":"Change Control Process","type":"textarea"},
  {"key":"approval_authority","label":"Change Approval Authority","type":"text"},
  {"key":"cc_board_members","label":"Change Control Board Members","type":"textarea"},
  {"key":"escalation_process","label":"Escalation Process","type":"textarea"}
]}]}'::jsonb),

('F007', '{"title":"Project Roadmap","sections":[{"key":"general","title":"General","fields":[
  {"key":"phase","label":"Phase/Milestone","type":"text"},
  {"key":"start_date","label":"Start Date","type":"date"},
  {"key":"end_date","label":"End Date","type":"date"},
  {"key":"key_deliverables","label":"Key Deliverables","type":"textarea"},
  {"key":"dependencies","label":"Dependencies","type":"textarea"}
]}]}'::jsonb),

('F008', '{"title":"Scope Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"scope_definition_process","label":"How Scope Will Be Defined","type":"textarea"},
  {"key":"wbs_process","label":"How the WBS Will Be Created","type":"textarea"},
  {"key":"scope_validation_process","label":"Scope Validation Process","type":"textarea"},
  {"key":"scope_control_process","label":"Scope Control Process","type":"textarea"}
]}]}'::jsonb),

('F009', '{"title":"Requirements Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"requirements_process","label":"Requirements Collection Process","type":"textarea"},
  {"key":"prioritisation_approach","label":"Prioritisation Approach","type":"textarea"},
  {"key":"traceability_approach","label":"Traceability Approach","type":"textarea"},
  {"key":"config_management","label":"Configuration Management Approach","type":"textarea"}
]}]}'::jsonb),

('F010', '{"title":"Requirements Documentation","sections":[{"key":"general","title":"General","fields":[
  {"key":"requirement_id","label":"Requirement ID","type":"text"},
  {"key":"description","label":"Description","type":"textarea"},
  {"key":"category","label":"Category","type":"select","options":[{"value":"functional","label":"Functional"},{"value":"non_functional","label":"Non-Functional"},{"value":"business","label":"Business"},{"value":"stakeholder","label":"Stakeholder"},{"value":"quality","label":"Quality"},{"value":"transition","label":"Transition"}]},
  {"key":"priority","label":"Priority","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]},
  {"key":"acceptance_criteria","label":"Acceptance Criteria","type":"textarea"}
]}]}'::jsonb),

('F011', '{"title":"Requirements Traceability Matrix","sections":[{"key":"general","title":"General","fields":[
  {"key":"requirement_id","label":"Requirement ID","type":"text"},
  {"key":"source","label":"Source","type":"text"},
  {"key":"linked_objective","label":"Linked Business Objective","type":"text"},
  {"key":"linked_deliverable","label":"Linked Deliverable/WBS Item","type":"text"},
  {"key":"test_case","label":"Test/Verification Method","type":"text"},
  {"key":"status","label":"Status","type":"select","options":[{"value":"not_started","label":"Not Started"},{"value":"in_progress","label":"In Progress"},{"value":"verified","label":"Verified"}]}
]}]}'::jsonb),

('F012', '{"title":"Inter-Requirements Traceability Matrix","sections":[{"key":"general","title":"General","fields":[
  {"key":"requirement_id","label":"Requirement ID","type":"text"},
  {"key":"related_requirement_id","label":"Related Requirement ID","type":"text"},
  {"key":"relationship_type","label":"Relationship Type","type":"select","options":[{"value":"depends_on","label":"Depends On"},{"value":"conflicts_with","label":"Conflicts With"},{"value":"duplicates","label":"Duplicates"},{"value":"refines","label":"Refines"}]},
  {"key":"notes","label":"Notes","type":"textarea"}
]}]}'::jsonb),

('F013', '{"title":"Project Scope Statement","sections":[{"key":"general","title":"General","fields":[
  {"key":"product_scope_description","label":"Product Scope Description","type":"textarea"},
  {"key":"deliverables","label":"Deliverables","type":"textarea"},
  {"key":"acceptance_criteria","label":"Acceptance Criteria","type":"textarea"},
  {"key":"exclusions","label":"Exclusions","type":"textarea"},
  {"key":"constraints","label":"Constraints","type":"textarea"},
  {"key":"assumptions","label":"Assumptions","type":"textarea"}
]}]}'::jsonb),

('F014', '{"title":"Work Breakdown Structure","sections":[{"key":"general","title":"General","fields":[
  {"key":"wbs_code","label":"WBS Code","type":"text"},
  {"key":"element_name","label":"Element Name","type":"text"},
  {"key":"parent_element","label":"Parent Element","type":"text"},
  {"key":"level","label":"Level","type":"number"}
]}]}'::jsonb),

('F015', '{"title":"WBS Dictionary","sections":[{"key":"general","title":"General","fields":[
  {"key":"wbs_code","label":"WBS Code","type":"text"},
  {"key":"element_name","label":"Element Name","type":"text"},
  {"key":"description","label":"Description of Work","type":"textarea"},
  {"key":"responsible_party","label":"Responsible Party","type":"text"},
  {"key":"acceptance_criteria","label":"Acceptance Criteria","type":"textarea"},
  {"key":"cost_estimate","label":"Cost Estimate","type":"money"}
]}]}'::jsonb),

('F016', '{"title":"Schedule Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"scheduling_methodology","label":"Scheduling Methodology","type":"text"},
  {"key":"scheduling_tool","label":"Scheduling Tool","type":"text"},
  {"key":"update_frequency","label":"Update Frequency","type":"select","options":[{"value":"weekly","label":"Weekly"},{"value":"biweekly","label":"Biweekly"},{"value":"monthly","label":"Monthly"}]},
  {"key":"control_thresholds","label":"Control Thresholds","type":"textarea"}
]}]}'::jsonb),

('F017', '{"title":"Activity List","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"activity_name","label":"Activity Name","type":"text"},
  {"key":"wbs_reference","label":"WBS Reference","type":"text"},
  {"key":"description","label":"Description","type":"textarea"}
]}]}'::jsonb),

('F018', '{"title":"Activity Attributes","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"predecessor","label":"Predecessor Activities","type":"text"},
  {"key":"successor","label":"Successor Activities","type":"text"},
  {"key":"resource_requirements","label":"Resource Requirements","type":"textarea"},
  {"key":"constraints","label":"Constraints","type":"textarea"}
]}]}'::jsonb),

('F019', '{"title":"Milestone List","sections":[{"key":"general","title":"General","fields":[
  {"key":"milestone_name","label":"Milestone Name","type":"text"},
  {"key":"target_date","label":"Target Date","type":"date"},
  {"key":"milestone_type","label":"Type","type":"select","options":[{"value":"mandatory","label":"Mandatory"},{"value":"optional","label":"Optional"}]},
  {"key":"description","label":"Description","type":"textarea"}
]}]}'::jsonb),

('F020', '{"title":"Network Diagram","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"predecessor","label":"Predecessor(s)","type":"text"},
  {"key":"dependency_type","label":"Dependency Type","type":"select","options":[{"value":"fs","label":"Finish-to-Start"},{"value":"ss","label":"Start-to-Start"},{"value":"ff","label":"Finish-to-Finish"},{"value":"sf","label":"Start-to-Finish"}]},
  {"key":"lag_lead","label":"Lag/Lead","type":"text"}
]}]}'::jsonb),

('F021', '{"title":"Duration Estimates","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"optimistic","label":"Optimistic Duration (days)","type":"number"},
  {"key":"most_likely","label":"Most Likely Duration (days)","type":"number"},
  {"key":"pessimistic","label":"Pessimistic Duration (days)","type":"number"},
  {"key":"estimation_basis","label":"Basis of Estimate","type":"textarea"}
]}]}'::jsonb),

('F022', '{"title":"Duration Estimating Worksheet","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"estimation_technique","label":"Estimation Technique","type":"select","options":[{"value":"analogous","label":"Analogous"},{"value":"parametric","label":"Parametric"},{"value":"three_point","label":"Three-Point"},{"value":"expert_judgement","label":"Expert Judgement"}]},
  {"key":"assumptions","label":"Assumptions","type":"textarea"},
  {"key":"estimated_duration","label":"Estimated Duration (days)","type":"number"}
]}]}'::jsonb),

('F023', '{"title":"Project Schedule","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"start_date","label":"Start Date","type":"date"},
  {"key":"end_date","label":"End Date","type":"date"},
  {"key":"duration","label":"Duration (days)","type":"number"},
  {"key":"status","label":"Status","type":"select","options":[{"value":"not_started","label":"Not Started"},{"value":"in_progress","label":"In Progress"},{"value":"complete","label":"Complete"},{"value":"delayed","label":"Delayed"}]}
]}]}'::jsonb),

('F024', '{"title":"Cost Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"estimating_approach","label":"Cost Estimating Approach","type":"textarea"},
  {"key":"budget_approach","label":"Budgeting Approach","type":"textarea"},
  {"key":"control_thresholds","label":"Cost Control Thresholds","type":"textarea"},
  {"key":"reporting_format","label":"Cost Reporting Format","type":"text"}
]}]}'::jsonb),

('F025', '{"title":"Cost Estimates","sections":[{"key":"general","title":"General","fields":[
  {"key":"wbs_reference","label":"WBS Reference","type":"text"},
  {"key":"cost_category","label":"Cost Category","type":"select","options":[{"value":"labour","label":"Labour"},{"value":"materials","label":"Materials"},{"value":"equipment","label":"Equipment"},{"value":"contingency","label":"Contingency"},{"value":"other","label":"Other"}]},
  {"key":"estimated_cost","label":"Estimated Cost","type":"money"},
  {"key":"basis_of_estimate","label":"Basis of Estimate","type":"textarea"}
]}]}'::jsonb),

('F026', '{"title":"Cost Estimating Worksheet","sections":[{"key":"general","title":"General","fields":[
  {"key":"wbs_reference","label":"WBS Reference","type":"text"},
  {"key":"estimation_technique","label":"Estimation Technique","type":"select","options":[{"value":"analogous","label":"Analogous"},{"value":"parametric","label":"Parametric"},{"value":"bottom_up","label":"Bottom-Up"},{"value":"expert_judgement","label":"Expert Judgement"}]},
  {"key":"unit_cost","label":"Unit Cost","type":"money"},
  {"key":"quantity","label":"Quantity","type":"number"},
  {"key":"total_cost","label":"Total Cost","type":"money"}
]}]}'::jsonb),

('F027', '{"title":"Bottom-Up Cost Estimating Worksheet","sections":[{"key":"general","title":"General","fields":[
  {"key":"work_package","label":"Work Package","type":"text"},
  {"key":"resource_type","label":"Resource Type","type":"text"},
  {"key":"unit_rate","label":"Unit Rate","type":"money"},
  {"key":"quantity","label":"Quantity","type":"number"},
  {"key":"subtotal","label":"Subtotal","type":"money"}
]}]}'::jsonb),

('F028', '{"title":"Cost Baseline","sections":[{"key":"general","title":"General","fields":[
  {"key":"wbs_reference","label":"WBS Reference","type":"text"},
  {"key":"baseline_amount","label":"Baseline Amount","type":"money"},
  {"key":"baseline_date","label":"Baseline Date","type":"date"},
  {"key":"reserve_amount","label":"Contingency Reserve","type":"money"}
]}]}'::jsonb),

('F029', '{"title":"Quality Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"quality_standards","label":"Quality Standards","type":"textarea"},
  {"key":"quality_objectives","label":"Quality Objectives","type":"textarea"},
  {"key":"qa_approach","label":"Quality Assurance Approach","type":"textarea"},
  {"key":"qc_approach","label":"Quality Control Approach","type":"textarea"}
]}]}'::jsonb),

('F030', '{"title":"Quality Metrics","sections":[{"key":"general","title":"General","fields":[
  {"key":"metric_name","label":"Metric Name","type":"text"},
  {"key":"target_value","label":"Target Value","type":"text"},
  {"key":"measurement_method","label":"Measurement Method","type":"textarea"},
  {"key":"frequency","label":"Measurement Frequency","type":"select","options":[{"value":"daily","label":"Daily"},{"value":"weekly","label":"Weekly"},{"value":"monthly","label":"Monthly"},{"value":"per_milestone","label":"Per Milestone"}]}
]}]}'::jsonb),

('F031', '{"title":"Responsibility Assignment Matrix","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_deliverable","label":"Activity/Deliverable","type":"text"},
  {"key":"responsible","label":"Responsible (R)","type":"text"},
  {"key":"accountable","label":"Accountable (A)","type":"text"},
  {"key":"consulted","label":"Consulted (C)","type":"text"},
  {"key":"informed","label":"Informed (I)","type":"text"}
]}]}'::jsonb),

('F032', '{"title":"Resource Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"resource_identification_approach","label":"Resource Identification Approach","type":"textarea"},
  {"key":"acquisition_approach","label":"Resource Acquisition Approach","type":"textarea"},
  {"key":"team_development_approach","label":"Team Development Approach","type":"textarea"},
  {"key":"release_criteria","label":"Resource Release Criteria","type":"textarea"}
]}]}'::jsonb),

('F033', '{"title":"Team Charter","sections":[{"key":"general","title":"General","fields":[
  {"key":"team_values","label":"Team Values","type":"textarea"},
  {"key":"communication_guidelines","label":"Communication Guidelines","type":"textarea"},
  {"key":"decision_making_process","label":"Decision-Making Process","type":"textarea"},
  {"key":"conflict_resolution","label":"Conflict Resolution Process","type":"textarea"},
  {"key":"meeting_norms","label":"Meeting Norms","type":"textarea"}
]}]}'::jsonb),

('F034', '{"title":"Resource Requirements","sections":[{"key":"general","title":"General","fields":[
  {"key":"resource_type","label":"Resource Type","type":"select","options":[{"value":"human","label":"Human"},{"value":"equipment","label":"Equipment"},{"value":"material","label":"Material"},{"value":"facility","label":"Facility"}]},
  {"key":"description","label":"Description","type":"text"},
  {"key":"quantity","label":"Quantity Required","type":"number"},
  {"key":"required_by_date","label":"Required By Date","type":"date"}
]}]}'::jsonb),

('F035', '{"title":"Resource Breakdown Structure","sections":[{"key":"general","title":"General","fields":[
  {"key":"rbs_code","label":"RBS Code","type":"text"},
  {"key":"category","label":"Category","type":"text"},
  {"key":"resource_name","label":"Resource Name","type":"text"},
  {"key":"parent_category","label":"Parent Category","type":"text"}
]}]}'::jsonb),

('F036', '{"title":"Communications Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"stakeholder_group","label":"Stakeholder Group","type":"text"},
  {"key":"information_needs","label":"Information Needs","type":"textarea"},
  {"key":"communication_method","label":"Communication Method","type":"select","options":[{"value":"email","label":"Email"},{"value":"meeting","label":"Meeting"},{"value":"report","label":"Report"},{"value":"dashboard","label":"Dashboard"},{"value":"newsletter","label":"Newsletter"}]},
  {"key":"frequency","label":"Frequency","type":"select","options":[{"value":"daily","label":"Daily"},{"value":"weekly","label":"Weekly"},{"value":"biweekly","label":"Biweekly"},{"value":"monthly","label":"Monthly"},{"value":"ad_hoc","label":"Ad-hoc"}]},
  {"key":"responsible_party","label":"Responsible Party","type":"text"}
]}]}'::jsonb),

('F037', '{"title":"Risk Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"risk_methodology","label":"Risk Management Methodology","type":"textarea"},
  {"key":"roles_responsibilities","label":"Roles & Responsibilities","type":"textarea"},
  {"key":"risk_categories","label":"Risk Categories","type":"textarea"},
  {"key":"risk_appetite","label":"Risk Appetite","type":"select","options":[{"value":"averse","label":"Averse"},{"value":"minimal","label":"Minimal"},{"value":"cautious","label":"Cautious"},{"value":"open","label":"Open"},{"value":"hungry","label":"Hungry"}]}
]}]}'::jsonb),

('F038', '{"title":"Risk Register","sections":[{"key":"general","title":"General","fields":[
  {"key":"risk_description","label":"Risk Description","type":"textarea"},
  {"key":"category","label":"Category","type":"select","options":[{"value":"technical","label":"Technical"},{"value":"external","label":"External"},{"value":"organisational","label":"Organisational"},{"value":"project_management","label":"Project Management"}]},
  {"key":"probability","label":"Probability","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]},
  {"key":"impact","label":"Impact","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]},
  {"key":"risk_owner","label":"Risk Owner","type":"text"},
  {"key":"response_strategy","label":"Response Strategy","type":"select","options":[{"value":"avoid","label":"Avoid"},{"value":"transfer","label":"Transfer"},{"value":"mitigate","label":"Mitigate"},{"value":"accept","label":"Accept"},{"value":"exploit","label":"Exploit"},{"value":"share","label":"Share"},{"value":"enhance","label":"Enhance"}]},
  {"key":"target_date","label":"Target Resolution Date","type":"date"}
]}]}'::jsonb),

('F039', '{"title":"Risk Report","sections":[{"key":"general","title":"General","fields":[
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"overall_risk_exposure","label":"Overall Risk Exposure","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]},
  {"key":"top_risks","label":"Top Risks Summary","type":"textarea"},
  {"key":"risk_trend","label":"Risk Trend","type":"select","options":[{"value":"increasing","label":"Increasing"},{"value":"stable","label":"Stable"},{"value":"decreasing","label":"Decreasing"}]}
]}]}'::jsonb),

('F040', '{"title":"Probability and Impact Assessment","sections":[{"key":"general","title":"General","fields":[
  {"key":"risk_description","label":"Risk Description","type":"textarea"},
  {"key":"probability_score","label":"Probability Score (1-5)","type":"number"},
  {"key":"impact_score","label":"Impact Score (1-5)","type":"number"},
  {"key":"overall_rating","label":"Overall Rating","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]}
]}]}'::jsonb),

('F041', '{"title":"Probability and Impact Matrix","sections":[{"key":"general","title":"General","fields":[
  {"key":"probability_level","label":"Probability Level","type":"select","options":[{"value":"very_low","label":"Very Low"},{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"very_high","label":"Very High"}]},
  {"key":"impact_level","label":"Impact Level","type":"select","options":[{"value":"very_low","label":"Very Low"},{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"very_high","label":"Very High"}]},
  {"key":"resulting_priority","label":"Resulting Priority","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]}
]}]}'::jsonb),

('F042', '{"title":"Risk Data Sheet","sections":[{"key":"general","title":"General","fields":[
  {"key":"risk_id","label":"Risk ID","type":"text"},
  {"key":"risk_description","label":"Risk Description","type":"textarea"},
  {"key":"root_cause","label":"Root Cause","type":"textarea"},
  {"key":"triggers","label":"Triggers","type":"textarea"},
  {"key":"response_plan","label":"Response Plan","type":"textarea"},
  {"key":"contingency_plan","label":"Contingency Plan","type":"textarea"}
]}]}'::jsonb),

('F043', '{"title":"Procurement Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"procurement_approach","label":"Procurement Approach","type":"textarea"},
  {"key":"contract_types","label":"Contract Types to be Used","type":"textarea"},
  {"key":"procurement_documents","label":"Procurement Documents","type":"textarea"},
  {"key":"risk_management_approach","label":"Procurement Risk Management","type":"textarea"}
]}]}'::jsonb),

('F044', '{"title":"Procurement Strategy","sections":[{"key":"general","title":"General","fields":[
  {"key":"delivery_method","label":"Delivery Method","type":"select","options":[{"value":"turnkey","label":"Turnkey"},{"value":"design_build","label":"Design-Build"},{"value":"design_bid_build","label":"Design-Bid-Build"}]},
  {"key":"contract_payment_type","label":"Contract Payment Type","type":"select","options":[{"value":"fixed_price","label":"Fixed Price"},{"value":"cost_reimbursable","label":"Cost Reimbursable"},{"value":"time_and_materials","label":"Time & Materials"}]},
  {"key":"market_conditions","label":"Market Conditions","type":"textarea"}
]}]}'::jsonb),

('F045', '{"title":"Source Selection Criteria","sections":[{"key":"general","title":"General","fields":[
  {"key":"criterion","label":"Criterion","type":"text"},
  {"key":"weighting","label":"Weighting (%)","type":"number"},
  {"key":"description","label":"Description","type":"textarea"}
]}]}'::jsonb),

('F046', '{"title":"Stakeholder Engagement Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"stakeholder_group","label":"Stakeholder Group","type":"text"},
  {"key":"current_engagement","label":"Current Engagement Level","type":"select","options":[{"value":"unaware","label":"Unaware"},{"value":"resistant","label":"Resistant"},{"value":"neutral","label":"Neutral"},{"value":"supportive","label":"Supportive"},{"value":"leading","label":"Leading"}]},
  {"key":"desired_engagement","label":"Desired Engagement Level","type":"select","options":[{"value":"unaware","label":"Unaware"},{"value":"resistant","label":"Resistant"},{"value":"neutral","label":"Neutral"},{"value":"supportive","label":"Supportive"},{"value":"leading","label":"Leading"}]},
  {"key":"engagement_actions","label":"Engagement Actions","type":"textarea"}
]}]}'::jsonb),

('F047', '{"title":"Issue Log","sections":[{"key":"general","title":"General","fields":[
  {"key":"issue_description","label":"Issue Description","type":"textarea"},
  {"key":"category","label":"Category","type":"select","options":[{"value":"technical","label":"Technical"},{"value":"resource","label":"Resource"},{"value":"schedule","label":"Schedule"},{"value":"scope","label":"Scope"},{"value":"stakeholder","label":"Stakeholder"},{"value":"other","label":"Other"}]},
  {"key":"priority","label":"Priority","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]},
  {"key":"owner","label":"Owner","type":"text"},
  {"key":"status","label":"Status","type":"select","options":[{"value":"open","label":"Open"},{"value":"in_progress","label":"In Progress"},{"value":"resolved","label":"Resolved"},{"value":"closed","label":"Closed"}]},
  {"key":"raised_date","label":"Date Raised","type":"date"},
  {"key":"target_resolution_date","label":"Target Resolution Date","type":"date"}
]}]}'::jsonb),

('F048', '{"title":"Decision Log","sections":[{"key":"general","title":"General","fields":[
  {"key":"decision_description","label":"Decision Description","type":"textarea"},
  {"key":"decision_date","label":"Decision Date","type":"date"},
  {"key":"decision_maker","label":"Decision Maker","type":"text"},
  {"key":"rationale","label":"Rationale","type":"textarea"},
  {"key":"impact","label":"Impact","type":"textarea"}
]}]}'::jsonb),

('F049', '{"title":"Change Request","sections":[{"key":"general","title":"General","fields":[
  {"key":"change_description","label":"Change Description","type":"textarea"},
  {"key":"reason_for_change","label":"Reason for Change","type":"textarea"},
  {"key":"impact_assessment","label":"Impact Assessment (Scope/Schedule/Cost)","type":"textarea"},
  {"key":"priority","label":"Priority","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]},
  {"key":"status","label":"Status","type":"select","options":[{"value":"submitted","label":"Submitted"},{"value":"under_review","label":"Under Review"},{"value":"approved","label":"Approved"},{"value":"rejected","label":"Rejected"},{"value":"deferred","label":"Deferred"}]}
]}]}'::jsonb),

('F050', '{"title":"Change Log","sections":[{"key":"general","title":"General","fields":[
  {"key":"change_id","label":"Change ID","type":"text"},
  {"key":"change_summary","label":"Change Summary","type":"text"},
  {"key":"status","label":"Status","type":"select","options":[{"value":"submitted","label":"Submitted"},{"value":"approved","label":"Approved"},{"value":"rejected","label":"Rejected"},{"value":"deferred","label":"Deferred"}]},
  {"key":"decision_date","label":"Decision Date","type":"date"}
]}]}'::jsonb),

('F051', '{"title":"Lessons Learned Register","sections":[{"key":"general","title":"General","fields":[
  {"key":"lesson_description","label":"Lesson Description","type":"textarea"},
  {"key":"category","label":"Category","type":"select","options":[{"value":"went_well","label":"What Went Well"},{"value":"could_improve","label":"What Could Improve"},{"value":"recommendation","label":"Recommendation"}]},
  {"key":"phase","label":"Project Phase","type":"select","options":[{"value":"initiating","label":"Initiating"},{"value":"planning","label":"Planning"},{"value":"executing","label":"Executing"},{"value":"monitoring_controlling","label":"Monitoring & Controlling"},{"value":"closing","label":"Closing"}]},
  {"key":"recommendation","label":"Recommendation for Future Projects","type":"textarea"}
]}]}'::jsonb),

('F052', '{"title":"Quality Audit","sections":[{"key":"general","title":"General","fields":[
  {"key":"audit_date","label":"Audit Date","type":"date"},
  {"key":"auditor","label":"Auditor","type":"text"},
  {"key":"scope_of_audit","label":"Scope of Audit","type":"textarea"},
  {"key":"findings","label":"Findings","type":"textarea"},
  {"key":"corrective_actions","label":"Corrective Actions","type":"textarea"}
]}]}'::jsonb),

('F053', '{"title":"Team Performance Assessment","sections":[{"key":"general","title":"General","fields":[
  {"key":"team_member","label":"Team Member","type":"text"},
  {"key":"assessment_period","label":"Assessment Period","type":"text"},
  {"key":"performance_rating","label":"Performance Rating","type":"select","options":[{"value":"below","label":"Below Expectations"},{"value":"meets","label":"Meets Expectations"},{"value":"exceeds","label":"Exceeds Expectations"}]},
  {"key":"strengths","label":"Strengths","type":"textarea"},
  {"key":"development_areas","label":"Development Areas","type":"textarea"}
]}]}'::jsonb),

('F054', '{"title":"Team Member Status Report","sections":[{"key":"general","title":"General","fields":[
  {"key":"team_member","label":"Team Member","type":"text"},
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"tasks_completed","label":"Tasks Completed","type":"textarea"},
  {"key":"tasks_planned","label":"Tasks Planned Next Period","type":"textarea"},
  {"key":"blockers","label":"Blockers/Issues","type":"textarea"}
]}]}'::jsonb),

('F055', '{"title":"Project Status Report","sections":[{"key":"general","title":"General","fields":[
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"overall_rag","label":"Overall RAG Status","type":"select","options":[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]},
  {"key":"schedule_rag","label":"Schedule RAG","type":"select","options":[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]},
  {"key":"budget_rag","label":"Budget RAG","type":"select","options":[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]},
  {"key":"key_accomplishments","label":"Key Accomplishments","type":"textarea"},
  {"key":"issues_risks","label":"Issues & Risks","type":"textarea"},
  {"key":"next_period_plan","label":"Next Period Plan","type":"textarea"}
]}]}'::jsonb),

('F056', '{"title":"Variance Analysis","sections":[{"key":"general","title":"General","fields":[
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"planned_value","label":"Planned Value","type":"money"},
  {"key":"actual_cost","label":"Actual Cost","type":"money"},
  {"key":"earned_value","label":"Earned Value","type":"money"},
  {"key":"variance_explanation","label":"Variance Explanation","type":"textarea"}
]}]}'::jsonb),

('F057', '{"title":"Earned Value Analysis","sections":[{"key":"general","title":"General","fields":[
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"planned_value","label":"Planned Value (PV)","type":"money"},
  {"key":"earned_value","label":"Earned Value (EV)","type":"money"},
  {"key":"actual_cost","label":"Actual Cost (AC)","type":"money"},
  {"key":"budget_at_completion","label":"Budget at Completion (BAC)","type":"money"}
]}]}'::jsonb),

('F058', '{"title":"Risk Audit","sections":[{"key":"general","title":"General","fields":[
  {"key":"audit_date","label":"Audit Date","type":"date"},
  {"key":"auditor","label":"Auditor","type":"text"},
  {"key":"risk_process_effectiveness","label":"Risk Process Effectiveness","type":"select","options":[{"value":"effective","label":"Effective"},{"value":"partially_effective","label":"Partially Effective"},{"value":"ineffective","label":"Ineffective"}]},
  {"key":"findings","label":"Findings","type":"textarea"},
  {"key":"recommendations","label":"Recommendations","type":"textarea"}
]}]}'::jsonb),

('F059', '{"title":"Contractor Status Report","sections":[{"key":"general","title":"General","fields":[
  {"key":"contractor_name","label":"Contractor Name","type":"text"},
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"progress_summary","label":"Progress Summary","type":"textarea"},
  {"key":"performance_rag","label":"Performance RAG","type":"select","options":[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]},
  {"key":"issues","label":"Issues","type":"textarea"}
]}]}'::jsonb),

('F060', '{"title":"Procurement Audit","sections":[{"key":"general","title":"General","fields":[
  {"key":"audit_date","label":"Audit Date","type":"date"},
  {"key":"contract_reference","label":"Contract Reference","type":"text"},
  {"key":"compliance_status","label":"Compliance Status","type":"select","options":[{"value":"compliant","label":"Compliant"},{"value":"non_compliant","label":"Non-Compliant"},{"value":"partially_compliant","label":"Partially Compliant"}]},
  {"key":"findings","label":"Findings","type":"textarea"}
]}]}'::jsonb),

('F061', '{"title":"Contract Closeout Report","sections":[{"key":"general","title":"General","fields":[
  {"key":"contract_reference","label":"Contract Reference","type":"text"},
  {"key":"closeout_date","label":"Closeout Date","type":"date"},
  {"key":"deliverables_accepted","label":"Deliverables Accepted","type":"select","options":[{"value":"yes","label":"Yes"},{"value":"no","label":"No"},{"value":"partial","label":"Partial"}]},
  {"key":"outstanding_items","label":"Outstanding Items","type":"textarea"},
  {"key":"final_payment_amount","label":"Final Payment Amount","type":"money"}
]}]}'::jsonb),

('F062', '{"title":"Product Acceptance Form","sections":[{"key":"general","title":"General","fields":[
  {"key":"deliverable_name","label":"Deliverable Name","type":"text"},
  {"key":"acceptance_criteria_met","label":"Acceptance Criteria Met","type":"select","options":[{"value":"yes","label":"Yes"},{"value":"no","label":"No"},{"value":"partial","label":"Partial"}]},
  {"key":"accepted_by","label":"Accepted By","type":"text"},
  {"key":"acceptance_date","label":"Acceptance Date","type":"date"},
  {"key":"comments","label":"Comments","type":"textarea"}
]}]}'::jsonb),

('F063', '{"title":"Lessons Learned Summary","sections":[{"key":"general","title":"General","fields":[
  {"key":"summary","label":"Overall Lessons Learned Summary","type":"textarea"},
  {"key":"key_successes","label":"Key Successes","type":"textarea"},
  {"key":"key_challenges","label":"Key Challenges","type":"textarea"},
  {"key":"recommendations","label":"Recommendations for Future Projects","type":"textarea"}
]}]}'::jsonb),

('F064', '{"title":"Project or Phase Closeout","sections":[{"key":"general","title":"General","fields":[
  {"key":"closeout_date","label":"Closeout Date","type":"date"},
  {"key":"final_deliverables","label":"Final Deliverables","type":"textarea"},
  {"key":"outstanding_actions","label":"Outstanding Actions","type":"textarea"},
  {"key":"resource_release_confirmation","label":"Resources Released","type":"select","options":[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]},
  {"key":"sign_off_by","label":"Sign-Off By","type":"text"}
]}]}'::jsonb),

('F065', '{"title":"Product Vision","sections":[{"key":"general","title":"General","fields":[
  {"key":"vision_statement","label":"Vision Statement","type":"textarea"},
  {"key":"target_customers","label":"Target Customers","type":"textarea"},
  {"key":"key_benefits","label":"Key Benefits","type":"textarea"},
  {"key":"success_metrics","label":"Success Metrics","type":"textarea"}
]}]}'::jsonb),

('F066', '{"title":"Product Backlog","sections":[{"key":"general","title":"General","fields":[
  {"key":"item_title","label":"Backlog Item Title","type":"text"},
  {"key":"description","label":"Description","type":"textarea"},
  {"key":"priority","label":"Priority","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]},
  {"key":"estimate","label":"Estimate (Story Points)","type":"number"},
  {"key":"status","label":"Status","type":"select","options":[{"value":"not_started","label":"Not Started"},{"value":"in_progress","label":"In Progress"},{"value":"done","label":"Done"}]}
]}]}'::jsonb),

('F067', '{"title":"Release Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"release_name","label":"Release Name","type":"text"},
  {"key":"release_date","label":"Target Release Date","type":"date"},
  {"key":"included_features","label":"Included Features","type":"textarea"},
  {"key":"release_goals","label":"Release Goals","type":"textarea"}
]}]}'::jsonb),

('F068', '{"title":"Retrospective","sections":[{"key":"general","title":"General","fields":[
  {"key":"sprint_iteration","label":"Sprint/Iteration","type":"text"},
  {"key":"what_went_well","label":"What Went Well","type":"textarea"},
  {"key":"what_could_improve","label":"What Could Improve","type":"textarea"},
  {"key":"action_items","label":"Action Items","type":"textarea"}
]}]}'::jsonb)
)
INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
SELECT
  t.id,
  COALESCE((SELECT MAX(v.version_number) FROM sim.form_template_versions v WHERE v.template_id = t.id), 0) + 1,
  s.schema,
  true
FROM schemas s
JOIN sim.form_templates t ON t.template_code = s.template_code
WHERE NOT EXISTS (
  SELECT 1 FROM sim.form_template_versions v
  WHERE v.template_id = t.id AND v.schema = s.schema
);

-- ----------------------------------------------------------------------------
-- sim schema (Simulator) — converge is_current to the seeded schema
-- ----------------------------------------------------------------------------

WITH schemas(template_code, schema) AS (
VALUES

('F001', '{"title":"Project Charter","sections":[{"key":"general","title":"General","fields":[
  {"key":"purpose","label":"Purpose & Justification","type":"textarea"},
  {"key":"objectives","label":"Objectives","type":"textarea"},
  {"key":"success_criteria","label":"Success Criteria","type":"textarea"},
  {"key":"sponsor","label":"Sponsor","type":"text"},
  {"key":"high_level_requirements","label":"High-Level Requirements","type":"textarea"},
  {"key":"high_level_risks","label":"High-Level Risks","type":"textarea"},
  {"key":"summary_budget","label":"Summary Budget","type":"money"},
  {"key":"milestone_schedule","label":"Milestone Schedule","type":"textarea"},
  {"key":"pm_authority_level","label":"Project Manager Authority Level","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]}
]}]}'::jsonb),

('F002', '{"title":"Assumption Log","sections":[{"key":"general","title":"General","fields":[
  {"key":"assumption","label":"Assumption","type":"textarea"},
  {"key":"constraint","label":"Constraint","type":"textarea"},
  {"key":"category","label":"Category","type":"select","options":[{"value":"scope","label":"Scope"},{"value":"schedule","label":"Schedule"},{"value":"cost","label":"Cost"},{"value":"quality","label":"Quality"},{"value":"resource","label":"Resource"},{"value":"other","label":"Other"}]},
  {"key":"impact_if_invalid","label":"Impact if Invalid","type":"textarea"},
  {"key":"owner","label":"Owner","type":"text"},
  {"key":"date_identified","label":"Date Identified","type":"date"}
]}]}'::jsonb),

('F003', '{"title":"Stakeholder Register","sections":[{"key":"general","title":"General","fields":[
  {"key":"stakeholder_name","label":"Stakeholder Name","type":"text"},
  {"key":"role","label":"Role","type":"text"},
  {"key":"organisation","label":"Organisation","type":"text"},
  {"key":"contact_info","label":"Contact Information","type":"text"},
  {"key":"influence_level","label":"Influence Level","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]},
  {"key":"interest_level","label":"Interest Level","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]},
  {"key":"classification","label":"Classification","type":"select","options":[{"value":"internal","label":"Internal"},{"value":"external","label":"External"}]}
]}]}'::jsonb),

('F004', '{"title":"Stakeholder Analysis","sections":[{"key":"general","title":"General","fields":[
  {"key":"stakeholder_name","label":"Stakeholder Name","type":"text"},
  {"key":"current_engagement","label":"Current Engagement Level","type":"select","options":[{"value":"unaware","label":"Unaware"},{"value":"resistant","label":"Resistant"},{"value":"neutral","label":"Neutral"},{"value":"supportive","label":"Supportive"},{"value":"leading","label":"Leading"}]},
  {"key":"desired_engagement","label":"Desired Engagement Level","type":"select","options":[{"value":"unaware","label":"Unaware"},{"value":"resistant","label":"Resistant"},{"value":"neutral","label":"Neutral"},{"value":"supportive","label":"Supportive"},{"value":"leading","label":"Leading"}]},
  {"key":"key_requirements","label":"Key Requirements/Expectations","type":"textarea"},
  {"key":"engagement_strategy","label":"Engagement Strategy","type":"textarea"}
]}]}'::jsonb),

('F005', '{"title":"Project Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"plan_overview","label":"Plan Overview","type":"textarea"},
  {"key":"scope_summary","label":"Scope Management Approach","type":"textarea"},
  {"key":"schedule_summary","label":"Schedule Management Approach","type":"textarea"},
  {"key":"cost_summary","label":"Cost Management Approach","type":"textarea"},
  {"key":"quality_summary","label":"Quality Management Approach","type":"textarea"},
  {"key":"baseline_date","label":"Baseline Date","type":"date"}
]}]}'::jsonb),

('F006', '{"title":"Change Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"change_process","label":"Change Control Process","type":"textarea"},
  {"key":"approval_authority","label":"Change Approval Authority","type":"text"},
  {"key":"cc_board_members","label":"Change Control Board Members","type":"textarea"},
  {"key":"escalation_process","label":"Escalation Process","type":"textarea"}
]}]}'::jsonb),

('F007', '{"title":"Project Roadmap","sections":[{"key":"general","title":"General","fields":[
  {"key":"phase","label":"Phase/Milestone","type":"text"},
  {"key":"start_date","label":"Start Date","type":"date"},
  {"key":"end_date","label":"End Date","type":"date"},
  {"key":"key_deliverables","label":"Key Deliverables","type":"textarea"},
  {"key":"dependencies","label":"Dependencies","type":"textarea"}
]}]}'::jsonb),

('F008', '{"title":"Scope Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"scope_definition_process","label":"How Scope Will Be Defined","type":"textarea"},
  {"key":"wbs_process","label":"How the WBS Will Be Created","type":"textarea"},
  {"key":"scope_validation_process","label":"Scope Validation Process","type":"textarea"},
  {"key":"scope_control_process","label":"Scope Control Process","type":"textarea"}
]}]}'::jsonb),

('F009', '{"title":"Requirements Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"requirements_process","label":"Requirements Collection Process","type":"textarea"},
  {"key":"prioritisation_approach","label":"Prioritisation Approach","type":"textarea"},
  {"key":"traceability_approach","label":"Traceability Approach","type":"textarea"},
  {"key":"config_management","label":"Configuration Management Approach","type":"textarea"}
]}]}'::jsonb),

('F010', '{"title":"Requirements Documentation","sections":[{"key":"general","title":"General","fields":[
  {"key":"requirement_id","label":"Requirement ID","type":"text"},
  {"key":"description","label":"Description","type":"textarea"},
  {"key":"category","label":"Category","type":"select","options":[{"value":"functional","label":"Functional"},{"value":"non_functional","label":"Non-Functional"},{"value":"business","label":"Business"},{"value":"stakeholder","label":"Stakeholder"},{"value":"quality","label":"Quality"},{"value":"transition","label":"Transition"}]},
  {"key":"priority","label":"Priority","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]},
  {"key":"acceptance_criteria","label":"Acceptance Criteria","type":"textarea"}
]}]}'::jsonb),

('F011', '{"title":"Requirements Traceability Matrix","sections":[{"key":"general","title":"General","fields":[
  {"key":"requirement_id","label":"Requirement ID","type":"text"},
  {"key":"source","label":"Source","type":"text"},
  {"key":"linked_objective","label":"Linked Business Objective","type":"text"},
  {"key":"linked_deliverable","label":"Linked Deliverable/WBS Item","type":"text"},
  {"key":"test_case","label":"Test/Verification Method","type":"text"},
  {"key":"status","label":"Status","type":"select","options":[{"value":"not_started","label":"Not Started"},{"value":"in_progress","label":"In Progress"},{"value":"verified","label":"Verified"}]}
]}]}'::jsonb),

('F012', '{"title":"Inter-Requirements Traceability Matrix","sections":[{"key":"general","title":"General","fields":[
  {"key":"requirement_id","label":"Requirement ID","type":"text"},
  {"key":"related_requirement_id","label":"Related Requirement ID","type":"text"},
  {"key":"relationship_type","label":"Relationship Type","type":"select","options":[{"value":"depends_on","label":"Depends On"},{"value":"conflicts_with","label":"Conflicts With"},{"value":"duplicates","label":"Duplicates"},{"value":"refines","label":"Refines"}]},
  {"key":"notes","label":"Notes","type":"textarea"}
]}]}'::jsonb),

('F013', '{"title":"Project Scope Statement","sections":[{"key":"general","title":"General","fields":[
  {"key":"product_scope_description","label":"Product Scope Description","type":"textarea"},
  {"key":"deliverables","label":"Deliverables","type":"textarea"},
  {"key":"acceptance_criteria","label":"Acceptance Criteria","type":"textarea"},
  {"key":"exclusions","label":"Exclusions","type":"textarea"},
  {"key":"constraints","label":"Constraints","type":"textarea"},
  {"key":"assumptions","label":"Assumptions","type":"textarea"}
]}]}'::jsonb),

('F014', '{"title":"Work Breakdown Structure","sections":[{"key":"general","title":"General","fields":[
  {"key":"wbs_code","label":"WBS Code","type":"text"},
  {"key":"element_name","label":"Element Name","type":"text"},
  {"key":"parent_element","label":"Parent Element","type":"text"},
  {"key":"level","label":"Level","type":"number"}
]}]}'::jsonb),

('F015', '{"title":"WBS Dictionary","sections":[{"key":"general","title":"General","fields":[
  {"key":"wbs_code","label":"WBS Code","type":"text"},
  {"key":"element_name","label":"Element Name","type":"text"},
  {"key":"description","label":"Description of Work","type":"textarea"},
  {"key":"responsible_party","label":"Responsible Party","type":"text"},
  {"key":"acceptance_criteria","label":"Acceptance Criteria","type":"textarea"},
  {"key":"cost_estimate","label":"Cost Estimate","type":"money"}
]}]}'::jsonb),

('F016', '{"title":"Schedule Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"scheduling_methodology","label":"Scheduling Methodology","type":"text"},
  {"key":"scheduling_tool","label":"Scheduling Tool","type":"text"},
  {"key":"update_frequency","label":"Update Frequency","type":"select","options":[{"value":"weekly","label":"Weekly"},{"value":"biweekly","label":"Biweekly"},{"value":"monthly","label":"Monthly"}]},
  {"key":"control_thresholds","label":"Control Thresholds","type":"textarea"}
]}]}'::jsonb),

('F017', '{"title":"Activity List","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"activity_name","label":"Activity Name","type":"text"},
  {"key":"wbs_reference","label":"WBS Reference","type":"text"},
  {"key":"description","label":"Description","type":"textarea"}
]}]}'::jsonb),

('F018', '{"title":"Activity Attributes","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"predecessor","label":"Predecessor Activities","type":"text"},
  {"key":"successor","label":"Successor Activities","type":"text"},
  {"key":"resource_requirements","label":"Resource Requirements","type":"textarea"},
  {"key":"constraints","label":"Constraints","type":"textarea"}
]}]}'::jsonb),

('F019', '{"title":"Milestone List","sections":[{"key":"general","title":"General","fields":[
  {"key":"milestone_name","label":"Milestone Name","type":"text"},
  {"key":"target_date","label":"Target Date","type":"date"},
  {"key":"milestone_type","label":"Type","type":"select","options":[{"value":"mandatory","label":"Mandatory"},{"value":"optional","label":"Optional"}]},
  {"key":"description","label":"Description","type":"textarea"}
]}]}'::jsonb),

('F020', '{"title":"Network Diagram","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"predecessor","label":"Predecessor(s)","type":"text"},
  {"key":"dependency_type","label":"Dependency Type","type":"select","options":[{"value":"fs","label":"Finish-to-Start"},{"value":"ss","label":"Start-to-Start"},{"value":"ff","label":"Finish-to-Finish"},{"value":"sf","label":"Start-to-Finish"}]},
  {"key":"lag_lead","label":"Lag/Lead","type":"text"}
]}]}'::jsonb),

('F021', '{"title":"Duration Estimates","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"optimistic","label":"Optimistic Duration (days)","type":"number"},
  {"key":"most_likely","label":"Most Likely Duration (days)","type":"number"},
  {"key":"pessimistic","label":"Pessimistic Duration (days)","type":"number"},
  {"key":"estimation_basis","label":"Basis of Estimate","type":"textarea"}
]}]}'::jsonb),

('F022', '{"title":"Duration Estimating Worksheet","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"estimation_technique","label":"Estimation Technique","type":"select","options":[{"value":"analogous","label":"Analogous"},{"value":"parametric","label":"Parametric"},{"value":"three_point","label":"Three-Point"},{"value":"expert_judgement","label":"Expert Judgement"}]},
  {"key":"assumptions","label":"Assumptions","type":"textarea"},
  {"key":"estimated_duration","label":"Estimated Duration (days)","type":"number"}
]}]}'::jsonb),

('F023', '{"title":"Project Schedule","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"start_date","label":"Start Date","type":"date"},
  {"key":"end_date","label":"End Date","type":"date"},
  {"key":"duration","label":"Duration (days)","type":"number"},
  {"key":"status","label":"Status","type":"select","options":[{"value":"not_started","label":"Not Started"},{"value":"in_progress","label":"In Progress"},{"value":"complete","label":"Complete"},{"value":"delayed","label":"Delayed"}]}
]}]}'::jsonb),

('F024', '{"title":"Cost Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"estimating_approach","label":"Cost Estimating Approach","type":"textarea"},
  {"key":"budget_approach","label":"Budgeting Approach","type":"textarea"},
  {"key":"control_thresholds","label":"Cost Control Thresholds","type":"textarea"},
  {"key":"reporting_format","label":"Cost Reporting Format","type":"text"}
]}]}'::jsonb),

('F025', '{"title":"Cost Estimates","sections":[{"key":"general","title":"General","fields":[
  {"key":"wbs_reference","label":"WBS Reference","type":"text"},
  {"key":"cost_category","label":"Cost Category","type":"select","options":[{"value":"labour","label":"Labour"},{"value":"materials","label":"Materials"},{"value":"equipment","label":"Equipment"},{"value":"contingency","label":"Contingency"},{"value":"other","label":"Other"}]},
  {"key":"estimated_cost","label":"Estimated Cost","type":"money"},
  {"key":"basis_of_estimate","label":"Basis of Estimate","type":"textarea"}
]}]}'::jsonb),

('F026', '{"title":"Cost Estimating Worksheet","sections":[{"key":"general","title":"General","fields":[
  {"key":"wbs_reference","label":"WBS Reference","type":"text"},
  {"key":"estimation_technique","label":"Estimation Technique","type":"select","options":[{"value":"analogous","label":"Analogous"},{"value":"parametric","label":"Parametric"},{"value":"bottom_up","label":"Bottom-Up"},{"value":"expert_judgement","label":"Expert Judgement"}]},
  {"key":"unit_cost","label":"Unit Cost","type":"money"},
  {"key":"quantity","label":"Quantity","type":"number"},
  {"key":"total_cost","label":"Total Cost","type":"money"}
]}]}'::jsonb),

('F027', '{"title":"Bottom-Up Cost Estimating Worksheet","sections":[{"key":"general","title":"General","fields":[
  {"key":"work_package","label":"Work Package","type":"text"},
  {"key":"resource_type","label":"Resource Type","type":"text"},
  {"key":"unit_rate","label":"Unit Rate","type":"money"},
  {"key":"quantity","label":"Quantity","type":"number"},
  {"key":"subtotal","label":"Subtotal","type":"money"}
]}]}'::jsonb),

('F028', '{"title":"Cost Baseline","sections":[{"key":"general","title":"General","fields":[
  {"key":"wbs_reference","label":"WBS Reference","type":"text"},
  {"key":"baseline_amount","label":"Baseline Amount","type":"money"},
  {"key":"baseline_date","label":"Baseline Date","type":"date"},
  {"key":"reserve_amount","label":"Contingency Reserve","type":"money"}
]}]}'::jsonb),

('F029', '{"title":"Quality Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"quality_standards","label":"Quality Standards","type":"textarea"},
  {"key":"quality_objectives","label":"Quality Objectives","type":"textarea"},
  {"key":"qa_approach","label":"Quality Assurance Approach","type":"textarea"},
  {"key":"qc_approach","label":"Quality Control Approach","type":"textarea"}
]}]}'::jsonb),

('F030', '{"title":"Quality Metrics","sections":[{"key":"general","title":"General","fields":[
  {"key":"metric_name","label":"Metric Name","type":"text"},
  {"key":"target_value","label":"Target Value","type":"text"},
  {"key":"measurement_method","label":"Measurement Method","type":"textarea"},
  {"key":"frequency","label":"Measurement Frequency","type":"select","options":[{"value":"daily","label":"Daily"},{"value":"weekly","label":"Weekly"},{"value":"monthly","label":"Monthly"},{"value":"per_milestone","label":"Per Milestone"}]}
]}]}'::jsonb),

('F031', '{"title":"Responsibility Assignment Matrix","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_deliverable","label":"Activity/Deliverable","type":"text"},
  {"key":"responsible","label":"Responsible (R)","type":"text"},
  {"key":"accountable","label":"Accountable (A)","type":"text"},
  {"key":"consulted","label":"Consulted (C)","type":"text"},
  {"key":"informed","label":"Informed (I)","type":"text"}
]}]}'::jsonb),

('F032', '{"title":"Resource Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"resource_identification_approach","label":"Resource Identification Approach","type":"textarea"},
  {"key":"acquisition_approach","label":"Resource Acquisition Approach","type":"textarea"},
  {"key":"team_development_approach","label":"Team Development Approach","type":"textarea"},
  {"key":"release_criteria","label":"Resource Release Criteria","type":"textarea"}
]}]}'::jsonb),

('F033', '{"title":"Team Charter","sections":[{"key":"general","title":"General","fields":[
  {"key":"team_values","label":"Team Values","type":"textarea"},
  {"key":"communication_guidelines","label":"Communication Guidelines","type":"textarea"},
  {"key":"decision_making_process","label":"Decision-Making Process","type":"textarea"},
  {"key":"conflict_resolution","label":"Conflict Resolution Process","type":"textarea"},
  {"key":"meeting_norms","label":"Meeting Norms","type":"textarea"}
]}]}'::jsonb),

('F034', '{"title":"Resource Requirements","sections":[{"key":"general","title":"General","fields":[
  {"key":"resource_type","label":"Resource Type","type":"select","options":[{"value":"human","label":"Human"},{"value":"equipment","label":"Equipment"},{"value":"material","label":"Material"},{"value":"facility","label":"Facility"}]},
  {"key":"description","label":"Description","type":"text"},
  {"key":"quantity","label":"Quantity Required","type":"number"},
  {"key":"required_by_date","label":"Required By Date","type":"date"}
]}]}'::jsonb),

('F035', '{"title":"Resource Breakdown Structure","sections":[{"key":"general","title":"General","fields":[
  {"key":"rbs_code","label":"RBS Code","type":"text"},
  {"key":"category","label":"Category","type":"text"},
  {"key":"resource_name","label":"Resource Name","type":"text"},
  {"key":"parent_category","label":"Parent Category","type":"text"}
]}]}'::jsonb),

('F036', '{"title":"Communications Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"stakeholder_group","label":"Stakeholder Group","type":"text"},
  {"key":"information_needs","label":"Information Needs","type":"textarea"},
  {"key":"communication_method","label":"Communication Method","type":"select","options":[{"value":"email","label":"Email"},{"value":"meeting","label":"Meeting"},{"value":"report","label":"Report"},{"value":"dashboard","label":"Dashboard"},{"value":"newsletter","label":"Newsletter"}]},
  {"key":"frequency","label":"Frequency","type":"select","options":[{"value":"daily","label":"Daily"},{"value":"weekly","label":"Weekly"},{"value":"biweekly","label":"Biweekly"},{"value":"monthly","label":"Monthly"},{"value":"ad_hoc","label":"Ad-hoc"}]},
  {"key":"responsible_party","label":"Responsible Party","type":"text"}
]}]}'::jsonb),

('F037', '{"title":"Risk Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"risk_methodology","label":"Risk Management Methodology","type":"textarea"},
  {"key":"roles_responsibilities","label":"Roles & Responsibilities","type":"textarea"},
  {"key":"risk_categories","label":"Risk Categories","type":"textarea"},
  {"key":"risk_appetite","label":"Risk Appetite","type":"select","options":[{"value":"averse","label":"Averse"},{"value":"minimal","label":"Minimal"},{"value":"cautious","label":"Cautious"},{"value":"open","label":"Open"},{"value":"hungry","label":"Hungry"}]}
]}]}'::jsonb),

('F038', '{"title":"Risk Register","sections":[{"key":"general","title":"General","fields":[
  {"key":"risk_description","label":"Risk Description","type":"textarea"},
  {"key":"category","label":"Category","type":"select","options":[{"value":"technical","label":"Technical"},{"value":"external","label":"External"},{"value":"organisational","label":"Organisational"},{"value":"project_management","label":"Project Management"}]},
  {"key":"probability","label":"Probability","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]},
  {"key":"impact","label":"Impact","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]},
  {"key":"risk_owner","label":"Risk Owner","type":"text"},
  {"key":"response_strategy","label":"Response Strategy","type":"select","options":[{"value":"avoid","label":"Avoid"},{"value":"transfer","label":"Transfer"},{"value":"mitigate","label":"Mitigate"},{"value":"accept","label":"Accept"},{"value":"exploit","label":"Exploit"},{"value":"share","label":"Share"},{"value":"enhance","label":"Enhance"}]},
  {"key":"target_date","label":"Target Resolution Date","type":"date"}
]}]}'::jsonb),

('F039', '{"title":"Risk Report","sections":[{"key":"general","title":"General","fields":[
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"overall_risk_exposure","label":"Overall Risk Exposure","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]},
  {"key":"top_risks","label":"Top Risks Summary","type":"textarea"},
  {"key":"risk_trend","label":"Risk Trend","type":"select","options":[{"value":"increasing","label":"Increasing"},{"value":"stable","label":"Stable"},{"value":"decreasing","label":"Decreasing"}]}
]}]}'::jsonb),

('F040', '{"title":"Probability and Impact Assessment","sections":[{"key":"general","title":"General","fields":[
  {"key":"risk_description","label":"Risk Description","type":"textarea"},
  {"key":"probability_score","label":"Probability Score (1-5)","type":"number"},
  {"key":"impact_score","label":"Impact Score (1-5)","type":"number"},
  {"key":"overall_rating","label":"Overall Rating","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]}
]}]}'::jsonb),

('F041', '{"title":"Probability and Impact Matrix","sections":[{"key":"general","title":"General","fields":[
  {"key":"probability_level","label":"Probability Level","type":"select","options":[{"value":"very_low","label":"Very Low"},{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"very_high","label":"Very High"}]},
  {"key":"impact_level","label":"Impact Level","type":"select","options":[{"value":"very_low","label":"Very Low"},{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"very_high","label":"Very High"}]},
  {"key":"resulting_priority","label":"Resulting Priority","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]}
]}]}'::jsonb),

('F042', '{"title":"Risk Data Sheet","sections":[{"key":"general","title":"General","fields":[
  {"key":"risk_id","label":"Risk ID","type":"text"},
  {"key":"risk_description","label":"Risk Description","type":"textarea"},
  {"key":"root_cause","label":"Root Cause","type":"textarea"},
  {"key":"triggers","label":"Triggers","type":"textarea"},
  {"key":"response_plan","label":"Response Plan","type":"textarea"},
  {"key":"contingency_plan","label":"Contingency Plan","type":"textarea"}
]}]}'::jsonb),

('F043', '{"title":"Procurement Management Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"procurement_approach","label":"Procurement Approach","type":"textarea"},
  {"key":"contract_types","label":"Contract Types to be Used","type":"textarea"},
  {"key":"procurement_documents","label":"Procurement Documents","type":"textarea"},
  {"key":"risk_management_approach","label":"Procurement Risk Management","type":"textarea"}
]}]}'::jsonb),

('F044', '{"title":"Procurement Strategy","sections":[{"key":"general","title":"General","fields":[
  {"key":"delivery_method","label":"Delivery Method","type":"select","options":[{"value":"turnkey","label":"Turnkey"},{"value":"design_build","label":"Design-Build"},{"value":"design_bid_build","label":"Design-Bid-Build"}]},
  {"key":"contract_payment_type","label":"Contract Payment Type","type":"select","options":[{"value":"fixed_price","label":"Fixed Price"},{"value":"cost_reimbursable","label":"Cost Reimbursable"},{"value":"time_and_materials","label":"Time & Materials"}]},
  {"key":"market_conditions","label":"Market Conditions","type":"textarea"}
]}]}'::jsonb),

('F045', '{"title":"Source Selection Criteria","sections":[{"key":"general","title":"General","fields":[
  {"key":"criterion","label":"Criterion","type":"text"},
  {"key":"weighting","label":"Weighting (%)","type":"number"},
  {"key":"description","label":"Description","type":"textarea"}
]}]}'::jsonb),

('F046', '{"title":"Stakeholder Engagement Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"stakeholder_group","label":"Stakeholder Group","type":"text"},
  {"key":"current_engagement","label":"Current Engagement Level","type":"select","options":[{"value":"unaware","label":"Unaware"},{"value":"resistant","label":"Resistant"},{"value":"neutral","label":"Neutral"},{"value":"supportive","label":"Supportive"},{"value":"leading","label":"Leading"}]},
  {"key":"desired_engagement","label":"Desired Engagement Level","type":"select","options":[{"value":"unaware","label":"Unaware"},{"value":"resistant","label":"Resistant"},{"value":"neutral","label":"Neutral"},{"value":"supportive","label":"Supportive"},{"value":"leading","label":"Leading"}]},
  {"key":"engagement_actions","label":"Engagement Actions","type":"textarea"}
]}]}'::jsonb),

('F047', '{"title":"Issue Log","sections":[{"key":"general","title":"General","fields":[
  {"key":"issue_description","label":"Issue Description","type":"textarea"},
  {"key":"category","label":"Category","type":"select","options":[{"value":"technical","label":"Technical"},{"value":"resource","label":"Resource"},{"value":"schedule","label":"Schedule"},{"value":"scope","label":"Scope"},{"value":"stakeholder","label":"Stakeholder"},{"value":"other","label":"Other"}]},
  {"key":"priority","label":"Priority","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]},
  {"key":"owner","label":"Owner","type":"text"},
  {"key":"status","label":"Status","type":"select","options":[{"value":"open","label":"Open"},{"value":"in_progress","label":"In Progress"},{"value":"resolved","label":"Resolved"},{"value":"closed","label":"Closed"}]},
  {"key":"raised_date","label":"Date Raised","type":"date"},
  {"key":"target_resolution_date","label":"Target Resolution Date","type":"date"}
]}]}'::jsonb),

('F048', '{"title":"Decision Log","sections":[{"key":"general","title":"General","fields":[
  {"key":"decision_description","label":"Decision Description","type":"textarea"},
  {"key":"decision_date","label":"Decision Date","type":"date"},
  {"key":"decision_maker","label":"Decision Maker","type":"text"},
  {"key":"rationale","label":"Rationale","type":"textarea"},
  {"key":"impact","label":"Impact","type":"textarea"}
]}]}'::jsonb),

('F049', '{"title":"Change Request","sections":[{"key":"general","title":"General","fields":[
  {"key":"change_description","label":"Change Description","type":"textarea"},
  {"key":"reason_for_change","label":"Reason for Change","type":"textarea"},
  {"key":"impact_assessment","label":"Impact Assessment (Scope/Schedule/Cost)","type":"textarea"},
  {"key":"priority","label":"Priority","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]},
  {"key":"status","label":"Status","type":"select","options":[{"value":"submitted","label":"Submitted"},{"value":"under_review","label":"Under Review"},{"value":"approved","label":"Approved"},{"value":"rejected","label":"Rejected"},{"value":"deferred","label":"Deferred"}]}
]}]}'::jsonb),

('F050', '{"title":"Change Log","sections":[{"key":"general","title":"General","fields":[
  {"key":"change_id","label":"Change ID","type":"text"},
  {"key":"change_summary","label":"Change Summary","type":"text"},
  {"key":"status","label":"Status","type":"select","options":[{"value":"submitted","label":"Submitted"},{"value":"approved","label":"Approved"},{"value":"rejected","label":"Rejected"},{"value":"deferred","label":"Deferred"}]},
  {"key":"decision_date","label":"Decision Date","type":"date"}
]}]}'::jsonb),

('F051', '{"title":"Lessons Learned Register","sections":[{"key":"general","title":"General","fields":[
  {"key":"lesson_description","label":"Lesson Description","type":"textarea"},
  {"key":"category","label":"Category","type":"select","options":[{"value":"went_well","label":"What Went Well"},{"value":"could_improve","label":"What Could Improve"},{"value":"recommendation","label":"Recommendation"}]},
  {"key":"phase","label":"Project Phase","type":"select","options":[{"value":"initiating","label":"Initiating"},{"value":"planning","label":"Planning"},{"value":"executing","label":"Executing"},{"value":"monitoring_controlling","label":"Monitoring & Controlling"},{"value":"closing","label":"Closing"}]},
  {"key":"recommendation","label":"Recommendation for Future Projects","type":"textarea"}
]}]}'::jsonb),

('F052', '{"title":"Quality Audit","sections":[{"key":"general","title":"General","fields":[
  {"key":"audit_date","label":"Audit Date","type":"date"},
  {"key":"auditor","label":"Auditor","type":"text"},
  {"key":"scope_of_audit","label":"Scope of Audit","type":"textarea"},
  {"key":"findings","label":"Findings","type":"textarea"},
  {"key":"corrective_actions","label":"Corrective Actions","type":"textarea"}
]}]}'::jsonb),

('F053', '{"title":"Team Performance Assessment","sections":[{"key":"general","title":"General","fields":[
  {"key":"team_member","label":"Team Member","type":"text"},
  {"key":"assessment_period","label":"Assessment Period","type":"text"},
  {"key":"performance_rating","label":"Performance Rating","type":"select","options":[{"value":"below","label":"Below Expectations"},{"value":"meets","label":"Meets Expectations"},{"value":"exceeds","label":"Exceeds Expectations"}]},
  {"key":"strengths","label":"Strengths","type":"textarea"},
  {"key":"development_areas","label":"Development Areas","type":"textarea"}
]}]}'::jsonb),

('F054', '{"title":"Team Member Status Report","sections":[{"key":"general","title":"General","fields":[
  {"key":"team_member","label":"Team Member","type":"text"},
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"tasks_completed","label":"Tasks Completed","type":"textarea"},
  {"key":"tasks_planned","label":"Tasks Planned Next Period","type":"textarea"},
  {"key":"blockers","label":"Blockers/Issues","type":"textarea"}
]}]}'::jsonb),

('F055', '{"title":"Project Status Report","sections":[{"key":"general","title":"General","fields":[
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"overall_rag","label":"Overall RAG Status","type":"select","options":[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]},
  {"key":"schedule_rag","label":"Schedule RAG","type":"select","options":[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]},
  {"key":"budget_rag","label":"Budget RAG","type":"select","options":[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]},
  {"key":"key_accomplishments","label":"Key Accomplishments","type":"textarea"},
  {"key":"issues_risks","label":"Issues & Risks","type":"textarea"},
  {"key":"next_period_plan","label":"Next Period Plan","type":"textarea"}
]}]}'::jsonb),

('F056', '{"title":"Variance Analysis","sections":[{"key":"general","title":"General","fields":[
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"planned_value","label":"Planned Value","type":"money"},
  {"key":"actual_cost","label":"Actual Cost","type":"money"},
  {"key":"earned_value","label":"Earned Value","type":"money"},
  {"key":"variance_explanation","label":"Variance Explanation","type":"textarea"}
]}]}'::jsonb),

('F057', '{"title":"Earned Value Analysis","sections":[{"key":"general","title":"General","fields":[
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"planned_value","label":"Planned Value (PV)","type":"money"},
  {"key":"earned_value","label":"Earned Value (EV)","type":"money"},
  {"key":"actual_cost","label":"Actual Cost (AC)","type":"money"},
  {"key":"budget_at_completion","label":"Budget at Completion (BAC)","type":"money"}
]}]}'::jsonb),

('F058', '{"title":"Risk Audit","sections":[{"key":"general","title":"General","fields":[
  {"key":"audit_date","label":"Audit Date","type":"date"},
  {"key":"auditor","label":"Auditor","type":"text"},
  {"key":"risk_process_effectiveness","label":"Risk Process Effectiveness","type":"select","options":[{"value":"effective","label":"Effective"},{"value":"partially_effective","label":"Partially Effective"},{"value":"ineffective","label":"Ineffective"}]},
  {"key":"findings","label":"Findings","type":"textarea"},
  {"key":"recommendations","label":"Recommendations","type":"textarea"}
]}]}'::jsonb),

('F059', '{"title":"Contractor Status Report","sections":[{"key":"general","title":"General","fields":[
  {"key":"contractor_name","label":"Contractor Name","type":"text"},
  {"key":"reporting_period","label":"Reporting Period","type":"date"},
  {"key":"progress_summary","label":"Progress Summary","type":"textarea"},
  {"key":"performance_rag","label":"Performance RAG","type":"select","options":[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]},
  {"key":"issues","label":"Issues","type":"textarea"}
]}]}'::jsonb),

('F060', '{"title":"Procurement Audit","sections":[{"key":"general","title":"General","fields":[
  {"key":"audit_date","label":"Audit Date","type":"date"},
  {"key":"contract_reference","label":"Contract Reference","type":"text"},
  {"key":"compliance_status","label":"Compliance Status","type":"select","options":[{"value":"compliant","label":"Compliant"},{"value":"non_compliant","label":"Non-Compliant"},{"value":"partially_compliant","label":"Partially Compliant"}]},
  {"key":"findings","label":"Findings","type":"textarea"}
]}]}'::jsonb),

('F061', '{"title":"Contract Closeout Report","sections":[{"key":"general","title":"General","fields":[
  {"key":"contract_reference","label":"Contract Reference","type":"text"},
  {"key":"closeout_date","label":"Closeout Date","type":"date"},
  {"key":"deliverables_accepted","label":"Deliverables Accepted","type":"select","options":[{"value":"yes","label":"Yes"},{"value":"no","label":"No"},{"value":"partial","label":"Partial"}]},
  {"key":"outstanding_items","label":"Outstanding Items","type":"textarea"},
  {"key":"final_payment_amount","label":"Final Payment Amount","type":"money"}
]}]}'::jsonb),

('F062', '{"title":"Product Acceptance Form","sections":[{"key":"general","title":"General","fields":[
  {"key":"deliverable_name","label":"Deliverable Name","type":"text"},
  {"key":"acceptance_criteria_met","label":"Acceptance Criteria Met","type":"select","options":[{"value":"yes","label":"Yes"},{"value":"no","label":"No"},{"value":"partial","label":"Partial"}]},
  {"key":"accepted_by","label":"Accepted By","type":"text"},
  {"key":"acceptance_date","label":"Acceptance Date","type":"date"},
  {"key":"comments","label":"Comments","type":"textarea"}
]}]}'::jsonb),

('F063', '{"title":"Lessons Learned Summary","sections":[{"key":"general","title":"General","fields":[
  {"key":"summary","label":"Overall Lessons Learned Summary","type":"textarea"},
  {"key":"key_successes","label":"Key Successes","type":"textarea"},
  {"key":"key_challenges","label":"Key Challenges","type":"textarea"},
  {"key":"recommendations","label":"Recommendations for Future Projects","type":"textarea"}
]}]}'::jsonb),

('F064', '{"title":"Project or Phase Closeout","sections":[{"key":"general","title":"General","fields":[
  {"key":"closeout_date","label":"Closeout Date","type":"date"},
  {"key":"final_deliverables","label":"Final Deliverables","type":"textarea"},
  {"key":"outstanding_actions","label":"Outstanding Actions","type":"textarea"},
  {"key":"resource_release_confirmation","label":"Resources Released","type":"select","options":[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]},
  {"key":"sign_off_by","label":"Sign-Off By","type":"text"}
]}]}'::jsonb),

('F065', '{"title":"Product Vision","sections":[{"key":"general","title":"General","fields":[
  {"key":"vision_statement","label":"Vision Statement","type":"textarea"},
  {"key":"target_customers","label":"Target Customers","type":"textarea"},
  {"key":"key_benefits","label":"Key Benefits","type":"textarea"},
  {"key":"success_metrics","label":"Success Metrics","type":"textarea"}
]}]}'::jsonb),

('F066', '{"title":"Product Backlog","sections":[{"key":"general","title":"General","fields":[
  {"key":"item_title","label":"Backlog Item Title","type":"text"},
  {"key":"description","label":"Description","type":"textarea"},
  {"key":"priority","label":"Priority","type":"select","options":[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]},
  {"key":"estimate","label":"Estimate (Story Points)","type":"number"},
  {"key":"status","label":"Status","type":"select","options":[{"value":"not_started","label":"Not Started"},{"value":"in_progress","label":"In Progress"},{"value":"done","label":"Done"}]}
]}]}'::jsonb),

('F067', '{"title":"Release Plan","sections":[{"key":"general","title":"General","fields":[
  {"key":"release_name","label":"Release Name","type":"text"},
  {"key":"release_date","label":"Target Release Date","type":"date"},
  {"key":"included_features","label":"Included Features","type":"textarea"},
  {"key":"release_goals","label":"Release Goals","type":"textarea"}
]}]}'::jsonb),

('F068', '{"title":"Retrospective","sections":[{"key":"general","title":"General","fields":[
  {"key":"sprint_iteration","label":"Sprint/Iteration","type":"text"},
  {"key":"what_went_well","label":"What Went Well","type":"textarea"},
  {"key":"what_could_improve","label":"What Could Improve","type":"textarea"},
  {"key":"action_items","label":"Action Items","type":"textarea"}
]}]}'::jsonb)
)
UPDATE sim.form_template_versions v
SET is_current = (v.schema = s.schema)
FROM sim.form_templates t
JOIN schemas s ON s.template_code = t.template_code
WHERE v.template_id = t.id
  AND v.is_current <> (v.schema = s.schema);

-- ----------------------------------------------------------------------------
-- Verification
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  v_public_seeded INTEGER;
  v_sim_seeded INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_public_seeded
  FROM public.form_template_versions v
  JOIN public.form_templates t ON t.id = v.template_id
  WHERE v.is_current = true AND v.version_number > 1;

  SELECT COUNT(*) INTO v_sim_seeded
  FROM sim.form_template_versions v
  JOIN sim.form_templates t ON t.id = v.template_id
  WHERE v.is_current = true AND v.version_number > 1;

  RAISE NOTICE '================================================';
  RAISE NOTICE 'Form Template Field Seeds Complete';
  RAISE NOTICE 'public.form_templates with real fields (version > 1): %', v_public_seeded;
  RAISE NOTICE 'sim.form_templates with real fields (version > 1): %', v_sim_seeded;
  RAISE NOTICE '================================================';

  IF v_public_seeded < 68 THEN
    RAISE WARNING 'Expected 68 seeded templates in public schema, found %. Run SQL/v506_form_template_seeds.sql first if templates are missing.', v_public_seeded;
  END IF;
END $$;
