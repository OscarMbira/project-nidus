-- ============================================================================
-- v1429: Programme, Donors, Grants & Field Operations registers — full forms with tabs (NGO / Development)
-- ============================================================================
-- Owner request 2026-11-11: best-practice fields (including audit and compliance fields), in logical tabs, for the twelve NGO / Development registers under Development Programme, Donor Management, Grants and Field Operations, which had only Title / Description / Status:
--   Programme Overview (ngo_programme_overview): 28 fields — Details · Goal & Scope · Budget · Reach · Status & Risks · Audit & Compliance · Notes
--   Countries / Regions (ngo_countries_regions): 23 fields — Details · Context & Security · Government · Reach · Audit & Compliance · Notes
--   Communities (ngo_communities): 23 fields — Details · Engagement · Services · Accountability · Exit · Notes
--   Thematic Areas (ngo_thematic_areas): 13 fields — Details · Strategy · Indicators · Budget · Learning · Notes
--   Programme Milestones (ngo_programme_milestones): 12 fields — Details · Dates · Funding · Criteria & Evidence · Notes
--   Donor Register (ngo_donor_register): 17 fields — Details · Funding · Compliance & Audit · Notes
--   Funding Agreements (ngo_funding_agreements): 21 fields — Details · Terms · Payments · Reporting · Audit & Compliance · Notes
--   Grant Register (ngo_grant_register): 26 fields — Details · Amounts · Budget · Reporting · Audit · Notes
--   Field Offices (ngo_field_offices): 18 fields — Details · Security · Operations · Audit · Notes
--   Field Teams (ngo_field_teams): 16 fields — Details · Deployment · Safety & Conduct · Notes
--   Activity Plans (ngo_activity_plans): 17 fields — Details · Activities · Targets & Budget · Approval & Deviations · Notes
--   Missions (ngo_missions): 17 fields — Details · Plan & Logistics · Findings · Notes
-- Lists with several parts per line are tables (rule 67.1), with dropdown columns where the values are a
-- short fixed list. Funding gaps, burn rates, reach, funds received and award percentages, complaint resolution and activity achievement are calculated fields, worked out on save.
-- Status workflows keep their existing keys and gain the states each register needs. Record history (created /
-- updated by and when) is on every form’s Audit details tab (rule 63.1). No records exist yet for these
-- registers, so no saved values change. All fields optional, vendor-neutral (rule 26). Platform register
-- definitions, the Simulator reads the same system register definitions.
-- Sample records: v1430. Prerequisites: v956, v1326, v1375 and the v1339 average calculation in the app. Idempotent.
-- ============================================================================

BEGIN;

-- ── Programme Overview (ngo_programme_overview) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-900a-000000000001'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('programme_code', 'Programme Code', 'text', 0, NULL, NULL, NULL),
  ('programme_manager', 'Programme Manager', 'text', 1, NULL, NULL, NULL),
  ('lead_donor', 'Lead Donor', 'text', 2, NULL, NULL, NULL),
  ('countries', 'Countries', 'multi_select', 3, NULL, '[{"value":"kenya","label":"Kenya"},{"value":"uganda","label":"Uganda"},{"value":"tanzania","label":"Tanzania"},{"value":"ethiopia","label":"Ethiopia"},{"value":"south_sudan","label":"South Sudan"},{"value":"somalia","label":"Somalia"}]', NULL),
  ('sectors', 'Sectors', 'multi_select', 4, NULL, '[{"value":"wash","label":"Water, sanitation and hygiene"},{"value":"livelihoods","label":"Livelihoods"},{"value":"climate","label":"Climate resilience"},{"value":"nutrition","label":"Nutrition"},{"value":"health","label":"Health"},{"value":"education","label":"Education"},{"value":"protection","label":"Protection"},{"value":"gender","label":"Gender equality"}]', NULL),
  ('start_date', 'Start', 'date', 5, NULL, NULL, NULL),
  ('end_date', 'End', 'date', 6, NULL, NULL, NULL),
  ('overall_rag', 'Overall RAG', 'dropdown', 7, NULL, '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]', NULL),
  ('goal', 'Goal', 'long_text', 8, 'Goal & Scope', NULL, NULL),
  ('outcomes', 'Outcomes', 'multi_line', 9, 'Goal & Scope', NULL, NULL),
  ('target_groups', 'Target Groups', 'multi_line', 10, 'Goal & Scope', NULL, NULL),
  ('total_budget', 'Total Budget', 'currency', 11, 'Budget', NULL, NULL),
  ('funds_secured', 'Funds Secured', 'currency', 12, 'Budget', NULL, NULL),
  ('funding_gap', 'Funding Gap', 'currency', 13, 'Budget', NULL, '{"op":"difference","minuend":"total_budget","subtrahend":"funds_secured","decimals":2}'),
  ('spent_to_date', 'Spent to Date', 'currency', 14, 'Budget', NULL, NULL),
  ('burn_rate', 'Spent (% of budget)', 'number', 15, 'Budget', NULL, '{"op":"percent","numerator":"spent_to_date","denominator":"total_budget","display":"percent"}'),
  ('target_beneficiaries', 'Target Beneficiaries', 'number', 16, 'Reach', NULL, NULL),
  ('reached_beneficiaries', 'Beneficiaries Reached', 'number', 17, 'Reach', NULL, NULL),
  ('reach_rate', 'Reached (% of target)', 'number', 18, 'Reach', NULL, '{"op":"percent","numerator":"reached_beneficiaries","denominator":"target_beneficiaries","display":"percent"}'),
  ('women_percent', 'Women and Girls (%)', 'number', 19, 'Reach', NULL, NULL),
  ('achievements', 'Key Achievements', 'multi_line', 20, 'Status & Risks', NULL, NULL),
  ('key_risks', 'Key Risks', 'table', 21, 'Status & Risks', '[{"value":"risk","label":"Risk"},{"value":"rating","label":"Rating","type":"select","options":["High","Medium","Low"]},{"value":"mitigation","label":"Mitigation"}]', NULL),
  ('next_steps', 'Next Steps', 'multi_line', 22, 'Status & Risks', NULL, NULL),
  ('last_audit_date', 'Last Audit', 'date', 23, 'Audit & Compliance', NULL, NULL),
  ('audit_opinion', 'Audit Opinion', 'dropdown', 24, 'Audit & Compliance', '[{"value":"unqualified","label":"Unqualified (clean)"},{"value":"qualified","label":"Qualified"},{"value":"adverse","label":"Adverse"},{"value":"disclaimer","label":"Disclaimer"},{"value":"not_yet","label":"Not yet audited"}]', NULL),
  ('open_audit_findings', 'Open Audit Findings', 'number', 25, 'Audit & Compliance', NULL, NULL),
  ('safeguarding_reports', 'Safeguarding Reports This Year', 'number', 26, 'Audit & Compliance', NULL, NULL),
  ('notes', 'Notes', 'long_text', 27, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-900a-000000000001'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"draft","label":"Draft"},{"key":"in_review","label":"In Review"},{"key":"published","label":"Published"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-900a-000000000001'::uuid;

-- ── Countries / Regions (ngo_countries_regions) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-900a-000000000002'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('country', 'Country', 'dropdown', 0, NULL, '[{"value":"kenya","label":"Kenya"},{"value":"uganda","label":"Uganda"},{"value":"tanzania","label":"Tanzania"},{"value":"ethiopia","label":"Ethiopia"},{"value":"south_sudan","label":"South Sudan"},{"value":"somalia","label":"Somalia"}]', NULL),
  ('regions', 'Regions / Counties', 'multi_line', 1, NULL, NULL, NULL),
  ('country_office', 'Country Office', 'text', 2, NULL, NULL, NULL),
  ('country_director', 'Country Director', 'text', 3, NULL, NULL, NULL),
  ('start_date', 'Operating Since', 'date', 4, NULL, NULL, NULL),
  ('end_date', 'Planned Exit', 'date', 5, NULL, NULL, NULL),
  ('operating_context', 'Operating Context', 'dropdown', 6, 'Context & Security', '[{"value":"stable","label":"Stable"},{"value":"fragile","label":"Fragile"},{"value":"conflict","label":"Conflict-affected"},{"value":"emergency","label":"Emergency"}]', NULL),
  ('security_level', 'Security Level', 'dropdown', 7, 'Context & Security', '[{"value":"low","label":"Low"},{"value":"moderate","label":"Moderate"},{"value":"high","label":"High"},{"value":"very_high","label":"Very high"}]', NULL),
  ('context_risks', 'Context Risks', 'table', 8, 'Context & Security', '[{"value":"risk","label":"Risk"},{"value":"rating","label":"Rating","type":"select","options":["High","Medium","Low"]},{"value":"mitigation","label":"Mitigation"}]', NULL),
  ('registration_status', 'NGO Registration', 'dropdown', 9, 'Government', '[{"value":"registered","label":"Registered"},{"value":"pending","label":"Pending renewal"},{"value":"not_required","label":"Not required"}]', NULL),
  ('registration_expiry', 'Registration Expiry', 'date', 10, 'Government', NULL, NULL),
  ('government_counterparts', 'Government Counterparts', 'table', 11, 'Government', '[{"value":"office","label":"Ministry / Office"},{"value":"contact","label":"Contact"},{"value":"role","label":"Role"}]', NULL),
  ('mou_reference', 'MoU Reference', 'text', 12, 'Government', NULL, NULL),
  ('mou_expiry', 'MoU Expiry', 'date', 13, 'Government', NULL, NULL),
  ('target_beneficiaries', 'Target Beneficiaries', 'number', 14, 'Reach', NULL, NULL),
  ('reached_beneficiaries', 'Beneficiaries Reached', 'number', 15, 'Reach', NULL, NULL),
  ('reach_rate', 'Reached (%)', 'number', 16, 'Reach', NULL, '{"op":"percent","numerator":"reached_beneficiaries","denominator":"target_beneficiaries","display":"percent"}'),
  ('partners_count', 'Local Partners', 'number', 17, 'Reach', NULL, NULL),
  ('last_audit_date', 'Last Audit', 'date', 18, 'Audit & Compliance', NULL, NULL),
  ('audit_opinion', 'Audit Opinion', 'dropdown', 19, 'Audit & Compliance', '[{"value":"unqualified","label":"Unqualified (clean)"},{"value":"qualified","label":"Qualified"},{"value":"adverse","label":"Adverse"},{"value":"disclaimer","label":"Disclaimer"},{"value":"not_yet","label":"Not yet audited"}]', NULL),
  ('open_audit_findings', 'Open Audit Findings', 'number', 20, 'Audit & Compliance', NULL, NULL),
  ('last_compliance_review', 'Last Compliance Review', 'date', 21, 'Audit & Compliance', NULL, NULL),
  ('notes', 'Notes', 'long_text', 22, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-900a-000000000002'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"planned","label":"Planned"},{"key":"active","label":"Active"},{"key":"suspended","label":"Suspended"},{"key":"complete","label":"Complete / Exited"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-900a-000000000002'::uuid;

-- ── Communities (ngo_communities) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-900a-000000000003'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('community_code', 'Community Code', 'text', 0, NULL, NULL, NULL),
  ('country', 'Country', 'dropdown', 1, NULL, '[{"value":"kenya","label":"Kenya"},{"value":"uganda","label":"Uganda"},{"value":"tanzania","label":"Tanzania"},{"value":"ethiopia","label":"Ethiopia"},{"value":"south_sudan","label":"South Sudan"},{"value":"somalia","label":"Somalia"}]', NULL),
  ('district', 'District / County', 'text', 2, NULL, NULL, NULL),
  ('location', 'Village / Location', 'text', 3, NULL, NULL, NULL),
  ('population', 'Population', 'number', 4, NULL, NULL, NULL),
  ('households', 'Households', 'number', 5, NULL, NULL, NULL),
  ('vulnerability', 'Vulnerability', 'dropdown', 6, NULL, '[{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]', NULL),
  ('main_language', 'Main Language', 'text', 7, NULL, NULL, NULL),
  ('entry_date', 'Entry Date', 'date', 8, 'Engagement', NULL, NULL),
  ('consent_obtained', 'Community Consent Obtained', 'boolean', 9, 'Engagement', NULL, NULL),
  ('committee_formed', 'Community Committee Formed', 'boolean', 10, 'Engagement', NULL, NULL),
  ('committee_chair', 'Committee Chair', 'text', 11, 'Engagement', NULL, NULL),
  ('women_on_committee', 'Women on the Committee (%)', 'number', 12, 'Engagement', NULL, NULL),
  ('feedback_channel', 'Feedback Channel', 'dropdown', 13, 'Engagement', '[{"value":"hotline","label":"Free hotline"},{"value":"suggestion_box","label":"Suggestion box"},{"value":"help_desk","label":"Help desk on distribution days"},{"value":"committee","label":"Through the committee"}]', NULL),
  ('interventions', 'Interventions', 'multi_select', 14, 'Services', '[{"value":"water_point","label":"Water point"},{"value":"latrines","label":"Latrines"},{"value":"hygiene","label":"Hygiene promotion"},{"value":"savings_groups","label":"Savings groups"},{"value":"climate_agri","label":"Climate-smart farming"},{"value":"health_outreach","label":"Health outreach"}]', NULL),
  ('water_points', 'Water Points', 'number', 15, 'Services', NULL, NULL),
  ('beneficiaries_reached', 'Beneficiaries Reached', 'number', 16, 'Services', NULL, NULL),
  ('complaints_received', 'Complaints Received', 'number', 17, 'Accountability', NULL, NULL),
  ('complaints_resolved', 'Complaints Resolved', 'number', 18, 'Accountability', NULL, NULL),
  ('resolution_rate', 'Resolved (%)', 'number', 19, 'Accountability', NULL, '{"op":"percent","numerator":"complaints_resolved","denominator":"complaints_received","display":"percent"}'),
  ('exit_date', 'Planned Exit', 'date', 20, 'Exit', NULL, NULL),
  ('exit_strategy', 'Exit Strategy', 'long_text', 21, 'Exit', NULL, NULL),
  ('notes', 'Notes', 'long_text', 22, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-900a-000000000003'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"identified","label":"Identified"},{"key":"engaged","label":"Engaged"},{"key":"active","label":"Active"},{"key":"exited","label":"Exited"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-900a-000000000003'::uuid;

-- ── Thematic Areas (ngo_thematic_areas) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-900a-000000000004'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('theme_code', 'Theme Code', 'text', 0, NULL, NULL, NULL),
  ('sector', 'Sector', 'dropdown', 1, NULL, '[{"value":"wash","label":"Water, sanitation and hygiene"},{"value":"livelihoods","label":"Livelihoods"},{"value":"climate","label":"Climate resilience"},{"value":"nutrition","label":"Nutrition"},{"value":"health","label":"Health"},{"value":"education","label":"Education"},{"value":"protection","label":"Protection"},{"value":"gender","label":"Gender equality"}]', NULL),
  ('thematic_lead', 'Thematic Lead', 'text', 2, NULL, NULL, NULL),
  ('sdgs', 'Sustainable Development Goals', 'multi_select', 3, NULL, '[{"value":"sdg1","label":"SDG 1 No poverty"},{"value":"sdg2","label":"SDG 2 Zero hunger"},{"value":"sdg3","label":"SDG 3 Good health"},{"value":"sdg4","label":"SDG 4 Quality education"},{"value":"sdg5","label":"SDG 5 Gender equality"},{"value":"sdg6","label":"SDG 6 Clean water"},{"value":"sdg8","label":"SDG 8 Decent work"},{"value":"sdg13","label":"SDG 13 Climate action"},{"value":"sdg16","label":"SDG 16 Peace and justice"}]', NULL),
  ('theory_of_change', 'Theory of Change', 'long_text', 4, 'Strategy', NULL, NULL),
  ('approaches', 'Key Approaches', 'multi_line', 5, 'Strategy', NULL, NULL),
  ('cross_cutting', 'Cross-Cutting Issues', 'multi_select', 6, 'Strategy', '[{"value":"gender","label":"Gender"},{"value":"disability","label":"Disability inclusion"},{"value":"climate","label":"Climate"},{"value":"safeguarding","label":"Safeguarding"},{"value":"accountability","label":"Accountability to communities"}]', NULL),
  ('indicators', 'Headline Indicators', 'table', 7, 'Indicators', '[{"value":"indicator","label":"Indicator"},{"value":"baseline","label":"Baseline"},{"value":"target","label":"Target"},{"value":"actual","label":"Actual"}]', NULL),
  ('budget', 'Budget', 'currency', 8, 'Budget', NULL, NULL),
  ('spent', 'Spent', 'currency', 9, 'Budget', NULL, NULL),
  ('burn_rate', 'Spent (%)', 'number', 10, 'Budget', NULL, '{"op":"percent","numerator":"spent","denominator":"budget","display":"percent"}'),
  ('lessons', 'Lessons Learned', 'multi_line', 11, 'Learning', NULL, NULL),
  ('notes', 'Notes', 'long_text', 12, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-900a-000000000004'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"planned","label":"Planned"},{"key":"active","label":"Active"},{"key":"complete","label":"Complete"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-900a-000000000004'::uuid;

-- ── Programme Milestones (ngo_programme_milestones) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-900a-000000000005'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('milestone_code', 'Milestone Code', 'text', 0, NULL, NULL, NULL),
  ('milestone_type', 'Type', 'dropdown', 1, NULL, '[{"value":"donor","label":"Donor deliverable"},{"value":"programme","label":"Programme"},{"value":"reporting","label":"Reporting"},{"value":"financial","label":"Financial"},{"value":"evaluation","label":"Evaluation"},{"value":"audit","label":"Audit"}]', NULL),
  ('programme', 'Programme', 'text', 2, NULL, NULL, NULL),
  ('owner', 'Owner', 'text', 3, NULL, NULL, NULL),
  ('baseline_date', 'Baseline Date', 'date', 4, 'Dates', NULL, NULL),
  ('forecast_date', 'Forecast Date', 'date', 5, 'Dates', NULL, NULL),
  ('actual_date', 'Actual Date', 'date', 6, 'Dates', NULL, NULL),
  ('donor_linked', 'Linked to Donor Payment', 'boolean', 7, 'Funding', NULL, NULL),
  ('tranche_value', 'Tranche Value', 'currency', 8, 'Funding', NULL, NULL),
  ('criteria', 'Completion Criteria', 'table', 9, 'Criteria & Evidence', '[{"value":"check","label":"Check"},{"value":"done","label":"Done","type":"select","options":["Yes","Partly","No"]}]', NULL),
  ('evidence', 'Evidence', 'table', 10, 'Criteria & Evidence', '[{"value":"evidence","label":"Evidence"},{"value":"reference","label":"Reference"}]', NULL),
  ('notes', 'Notes', 'long_text', 11, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-900a-000000000005'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"upcoming","label":"Upcoming"},{"key":"at_risk","label":"At Risk"},{"key":"met","label":"Met"},{"key":"missed","label":"Missed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-900a-000000000005'::uuid;

-- ── Donor Register (ngo_donor_register) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-900a-000000000006'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('donor_code', 'Donor Code', 'text', 0, NULL, NULL, NULL),
  ('donor_type', 'Donor Type', 'dropdown', 1, NULL, '[{"value":"bilateral","label":"Bilateral government"},{"value":"multilateral","label":"Multilateral"},{"value":"foundation","label":"Foundation"},{"value":"corporate","label":"Corporate"},{"value":"major_individual","label":"Major individual"},{"value":"pooled_fund","label":"Pooled fund"}]', NULL),
  ('headquarters', 'Headquarters', 'text', 2, NULL, NULL, NULL),
  ('relationship_manager', 'Relationship Manager', 'text', 3, NULL, NULL, NULL),
  ('contact_person', 'Donor Contact', 'text', 4, NULL, NULL, NULL),
  ('contact_email', 'Contact Email', 'text', 5, NULL, NULL, NULL),
  ('relationship_health', 'Relationship Health', 'dropdown', 6, NULL, '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]', NULL),
  ('total_committed', 'Total Committed', 'currency', 7, 'Funding', NULL, NULL),
  ('received_to_date', 'Received to Date', 'currency', 8, 'Funding', NULL, NULL),
  ('received_rate', 'Received (%)', 'number', 9, 'Funding', NULL, '{"op":"percent","numerator":"received_to_date","denominator":"total_committed","display":"percent"}'),
  ('active_grants', 'Active Grants', 'number', 10, 'Funding', NULL, NULL),
  ('funding_priorities', 'Funding Priorities', 'multi_line', 11, 'Funding', NULL, NULL),
  ('due_diligence_date', 'Due Diligence Completed', 'date', 12, 'Compliance & Audit', NULL, NULL),
  ('reporting_requirements', 'Reporting Requirements', 'multi_line', 13, 'Compliance & Audit', NULL, NULL),
  ('audit_requirement', 'Audit Requirement', 'dropdown', 14, 'Compliance & Audit', '[{"value":"annual_external","label":"Annual external audit"},{"value":"project_audit","label":"Project audit at close"},{"value":"donor_audit","label":"Donor’s own audit"},{"value":"none","label":"None"}]', NULL),
  ('next_audit', 'Next Audit', 'date', 15, 'Compliance & Audit', NULL, NULL),
  ('notes', 'Notes', 'long_text', 16, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-900a-000000000006'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"prospect","label":"Prospect"},{"key":"engaged","label":"Engaged"},{"key":"active","label":"Active"},{"key":"lapsed","label":"Lapsed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-900a-000000000006'::uuid;

-- ── Funding Agreements (ngo_funding_agreements) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-900a-000000000007'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('agreement_reference', 'Agreement Reference', 'text', 0, NULL, NULL, NULL),
  ('donor', 'Donor', 'text', 1, NULL, NULL, NULL),
  ('programme', 'Programme', 'text', 2, NULL, NULL, NULL),
  ('agreement_type', 'Agreement Type', 'dropdown', 3, NULL, '[{"value":"grant","label":"Grant agreement"},{"value":"contract","label":"Service contract"},{"value":"cooperative","label":"Cooperative agreement"},{"value":"mou","label":"Memorandum of understanding"},{"value":"sub_grant","label":"Sub-grant"}]', NULL),
  ('amount', 'Agreement Amount', 'currency', 4, NULL, NULL, NULL),
  ('start_date', 'Start', 'date', 5, NULL, NULL, NULL),
  ('end_date', 'End', 'date', 6, NULL, NULL, NULL),
  ('signed_date', 'Signed', 'date', 7, NULL, NULL, NULL),
  ('signatory', 'Our Signatory', 'text', 8, NULL, NULL, NULL),
  ('cost_share_percent', 'Cost Share (%)', 'number', 9, 'Terms', NULL, NULL),
  ('indirect_rate_percent', 'Indirect Cost Rate (%)', 'number', 10, 'Terms', NULL, NULL),
  ('special_conditions', 'Special Conditions', 'multi_line', 11, 'Terms', NULL, NULL),
  ('tranches', 'Payment Tranches', 'table', 12, 'Payments', '[{"value":"tranche","label":"Tranche"},{"value":"due","label":"Due","type":"date"},{"value":"amount","label":"Amount"},{"value":"status","label":"Status","type":"select","options":["Received","Due","Overdue"]}]', NULL),
  ('received_to_date', 'Received to Date', 'currency', 13, 'Payments', NULL, NULL),
  ('received_rate', 'Received (%)', 'number', 14, 'Payments', NULL, '{"op":"percent","numerator":"received_to_date","denominator":"amount","display":"percent"}'),
  ('reporting_schedule', 'Reporting Schedule', 'table', 15, 'Reporting', '[{"value":"report","label":"Report"},{"value":"due","label":"Due","type":"date"},{"value":"status","label":"Status","type":"select","options":["Submitted","Due","Overdue","Accepted"]}]', NULL),
  ('audit_required', 'Audit Required', 'boolean', 16, 'Audit & Compliance', NULL, NULL),
  ('audit_due', 'Audit Due', 'date', 17, 'Audit & Compliance', NULL, NULL),
  ('audit_opinion', 'Audit Opinion', 'dropdown', 18, 'Audit & Compliance', '[{"value":"unqualified","label":"Unqualified (clean)"},{"value":"qualified","label":"Qualified"},{"value":"adverse","label":"Adverse"},{"value":"disclaimer","label":"Disclaimer"},{"value":"not_yet","label":"Not yet audited"}]', NULL),
  ('compliance_issues', 'Compliance Issues', 'multi_line', 19, 'Audit & Compliance', NULL, NULL),
  ('notes', 'Notes', 'long_text', 20, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-900a-000000000007'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"negotiation","label":"Negotiation"},{"key":"active","label":"Active"},{"key":"reporting","label":"Final Reporting"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-900a-000000000007'::uuid;

-- ── Grant Register (ngo_grant_register) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-900a-000000000008'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('grant_reference', 'Grant Reference', 'text', 0, NULL, NULL, NULL),
  ('donor', 'Donor', 'text', 1, NULL, NULL, NULL),
  ('opportunity', 'Call / Opportunity', 'text', 2, NULL, NULL, NULL),
  ('grant_manager', 'Grant Manager', 'text', 3, NULL, NULL, NULL),
  ('sector', 'Sector', 'dropdown', 4, NULL, '[{"value":"wash","label":"Water, sanitation and hygiene"},{"value":"livelihoods","label":"Livelihoods"},{"value":"climate","label":"Climate resilience"},{"value":"nutrition","label":"Nutrition"},{"value":"health","label":"Health"},{"value":"education","label":"Education"},{"value":"protection","label":"Protection"},{"value":"gender","label":"Gender equality"}]', NULL),
  ('application_date', 'Applied', 'date', 5, NULL, NULL, NULL),
  ('decision_date', 'Decision', 'date', 6, NULL, NULL, NULL),
  ('start_date', 'Start', 'date', 7, NULL, NULL, NULL),
  ('end_date', 'End', 'date', 8, NULL, NULL, NULL),
  ('amount_requested', 'Amount Requested', 'currency', 9, 'Amounts', NULL, NULL),
  ('amount_awarded', 'Amount Awarded', 'currency', 10, 'Amounts', NULL, NULL),
  ('award_rate', 'Awarded (% of request)', 'number', 11, 'Amounts', NULL, '{"op":"percent","numerator":"amount_awarded","denominator":"amount_requested","display":"percent"}'),
  ('disbursed', 'Received from Donor', 'currency', 12, 'Amounts', NULL, NULL),
  ('spent', 'Spent', 'currency', 13, 'Amounts', NULL, NULL),
  ('burn_rate', 'Spent (% of award)', 'number', 14, 'Amounts', NULL, '{"op":"percent","numerator":"spent","denominator":"amount_awarded","display":"percent"}'),
  ('budget_lines', 'Budget Lines', 'table', 15, 'Budget', '[{"value":"line","label":"Budget Line"},{"value":"budget","label":"Budget"},{"value":"spent","label":"Spent"}]', NULL),
  ('next_report_due', 'Next Report Due', 'date', 16, 'Reporting', NULL, NULL),
  ('reports_submitted', 'Reports Submitted', 'number', 17, 'Reporting', NULL, NULL),
  ('reports_overdue', 'Reports Overdue', 'number', 18, 'Reporting', NULL, NULL),
  ('audit_required', 'Audit Required', 'boolean', 19, 'Audit', NULL, NULL),
  ('auditor', 'Auditor', 'text', 20, 'Audit', NULL, NULL),
  ('audit_period', 'Audit Period', 'text', 21, 'Audit', NULL, NULL),
  ('audit_opinion', 'Audit Opinion', 'dropdown', 22, 'Audit', '[{"value":"unqualified","label":"Unqualified (clean)"},{"value":"qualified","label":"Qualified"},{"value":"adverse","label":"Adverse"},{"value":"disclaimer","label":"Disclaimer"},{"value":"not_yet","label":"Not yet audited"}]', NULL),
  ('audit_findings', 'Audit Findings', 'table', 23, 'Audit', '[{"value":"finding","label":"Finding"},{"value":"rating","label":"Rating","type":"select","options":["High","Medium","Low"]},{"value":"status","label":"Status","type":"select","options":["Open","In progress","Closed"]}]', NULL),
  ('questioned_costs', 'Questioned Costs', 'currency', 24, 'Audit', NULL, NULL),
  ('notes', 'Notes', 'long_text', 25, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-900a-000000000008'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"application","label":"Application"},{"key":"rejected","label":"Not Funded"},{"key":"awarded","label":"Awarded"},{"key":"disbursement","label":"Disbursement"},{"key":"closeout","label":"Closeout"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-900a-000000000008'::uuid;

-- ── Field Offices (ngo_field_offices) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-900a-000000000009'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('office_code', 'Office Code', 'text', 0, NULL, NULL, NULL),
  ('country', 'Country', 'dropdown', 1, NULL, '[{"value":"kenya","label":"Kenya"},{"value":"uganda","label":"Uganda"},{"value":"tanzania","label":"Tanzania"},{"value":"ethiopia","label":"Ethiopia"},{"value":"south_sudan","label":"South Sudan"},{"value":"somalia","label":"Somalia"}]', NULL),
  ('location', 'Location', 'text', 2, NULL, NULL, NULL),
  ('office_type', 'Office Type', 'dropdown', 3, NULL, '[{"value":"country_office","label":"Country office"},{"value":"regional_hub","label":"Regional hub"},{"value":"field_office","label":"Field office"},{"value":"sub_office","label":"Sub-office"}]', NULL),
  ('office_manager', 'Office Manager', 'text', 4, NULL, NULL, NULL),
  ('opened', 'Opened', 'date', 5, NULL, NULL, NULL),
  ('staff_count', 'Staff', 'number', 6, NULL, NULL, NULL),
  ('vehicles', 'Vehicles', 'number', 7, NULL, NULL, NULL),
  ('security_level', 'Security Level', 'dropdown', 8, 'Security', '[{"value":"low","label":"Low"},{"value":"moderate","label":"Moderate"},{"value":"high","label":"High"},{"value":"very_high","label":"Very high"}]', NULL),
  ('last_security_assessment', 'Last Security Assessment', 'date', 9, 'Security', NULL, NULL),
  ('evacuation_plan', 'Evacuation Plan in Place', 'boolean', 10, 'Security', NULL, NULL),
  ('monthly_cost', 'Monthly Running Cost', 'currency', 11, 'Operations', NULL, NULL),
  ('lease_expiry', 'Lease Expiry', 'date', 12, 'Operations', NULL, NULL),
  ('connectivity', 'Connectivity', 'text', 13, 'Operations', NULL, NULL),
  ('last_internal_audit', 'Last Internal Audit', 'date', 14, 'Audit', NULL, NULL),
  ('audit_rating', 'Audit Rating', 'dropdown', 15, 'Audit', '[{"value":"satisfactory","label":"Satisfactory"},{"value":"needs_improvement","label":"Needs improvement"},{"value":"unsatisfactory","label":"Unsatisfactory"},{"value":"not_audited","label":"Not yet audited"}]', NULL),
  ('open_audit_actions', 'Open Audit Actions', 'number', 16, 'Audit', NULL, NULL),
  ('notes', 'Notes', 'long_text', 17, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-900a-000000000009'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"opening","label":"Opening"},{"key":"active","label":"Active"},{"key":"suspended","label":"Suspended"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-900a-000000000009'::uuid;

-- ── Field Teams (ngo_field_teams) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-900a-00000000000a'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('team_code', 'Team Code', 'text', 0, NULL, NULL, NULL),
  ('team_type', 'Team Type', 'dropdown', 1, NULL, '[{"value":"wash","label":"WASH engineering"},{"value":"livelihoods","label":"Livelihoods"},{"value":"health","label":"Health outreach"},{"value":"me","label":"Monitoring and evaluation"},{"value":"mobilisation","label":"Community mobilisation"},{"value":"emergency","label":"Emergency response"}]', NULL),
  ('field_office', 'Field Office', 'text', 2, NULL, NULL, NULL),
  ('team_leader', 'Team Leader', 'text', 3, NULL, NULL, NULL),
  ('team_size', 'Team Size', 'number', 4, NULL, NULL, NULL),
  ('women_in_team', 'Women in the Team', 'number', 5, NULL, NULL, NULL),
  ('women_share', 'Women (%)', 'number', 6, NULL, NULL, '{"op":"percent","numerator":"women_in_team","denominator":"team_size","display":"percent"}'),
  ('deployment_start', 'Deployed', 'date', 7, 'Deployment', NULL, NULL),
  ('deployment_end', 'Planned Stand-Down', 'date', 8, 'Deployment', NULL, NULL),
  ('areas_covered', 'Areas Covered', 'multi_line', 9, 'Deployment', NULL, NULL),
  ('vehicle', 'Vehicle', 'text', 10, 'Deployment', NULL, NULL),
  ('roles', 'Roles', 'table', 11, 'Deployment', '[{"value":"role","label":"Role"},{"value":"number","label":"Number"}]', NULL),
  ('training_done', 'Training Completed', 'multi_select', 12, 'Safety & Conduct', '[{"value":"first_aid","label":"First aid"},{"value":"security","label":"Security awareness"},{"value":"safeguarding","label":"Safeguarding"},{"value":"code_of_conduct","label":"Code of conduct"},{"value":"driving","label":"Defensive driving"}]', NULL),
  ('last_check_in', 'Last Security Check-In', 'date', 13, 'Safety & Conduct', NULL, NULL),
  ('incidents', 'Incidents This Year', 'number', 14, 'Safety & Conduct', NULL, NULL),
  ('notes', 'Notes', 'long_text', 15, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-900a-00000000000a'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"forming","label":"Forming"},{"key":"deployed","label":"Deployed"},{"key":"stood_down","label":"Stood Down"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-900a-00000000000a'::uuid;

-- ── Activity Plans (ngo_activity_plans) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-900a-00000000000b'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('plan_reference', 'Plan Reference', 'text', 0, NULL, NULL, NULL),
  ('period', 'Quarter', 'text', 1, NULL, NULL, NULL),
  ('field_office', 'Field Office', 'text', 2, NULL, NULL, NULL),
  ('programme', 'Programme', 'text', 3, NULL, NULL, NULL),
  ('output_code', 'Output', 'text', 4, NULL, NULL, NULL),
  ('owner', 'Owner', 'text', 5, NULL, NULL, NULL),
  ('activities', 'Activities', 'table', 6, 'Activities', '[{"value":"activity","label":"Activity"},{"value":"location","label":"Location"},{"value":"start","label":"Start","type":"date"},{"value":"end","label":"End","type":"date"},{"value":"responsible","label":"Responsible"}]', NULL),
  ('target_participants', 'Target Participants', 'number', 7, 'Targets & Budget', NULL, NULL),
  ('actual_participants', 'Actual Participants', 'number', 8, 'Targets & Budget', NULL, NULL),
  ('achievement', 'Achieved (%)', 'number', 9, 'Targets & Budget', NULL, '{"op":"percent","numerator":"actual_participants","denominator":"target_participants","display":"percent"}'),
  ('budget', 'Budget', 'currency', 10, 'Targets & Budget', NULL, NULL),
  ('spent', 'Spent', 'currency', 11, 'Targets & Budget', NULL, NULL),
  ('burn_rate', 'Spent (%)', 'number', 12, 'Targets & Budget', NULL, '{"op":"percent","numerator":"spent","denominator":"budget","display":"percent"}'),
  ('approved_by', 'Approved By', 'text', 13, 'Approval & Deviations', NULL, NULL),
  ('approval_date', 'Approved', 'date', 14, 'Approval & Deviations', NULL, NULL),
  ('deviations', 'Deviations from the Plan', 'multi_line', 15, 'Approval & Deviations', NULL, NULL),
  ('notes', 'Notes', 'long_text', 16, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-900a-00000000000b'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-900a-00000000000b'::uuid;

-- ── Missions (ngo_missions) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-900a-00000000000c'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('mission_reference', 'Mission Reference', 'text', 0, NULL, NULL, NULL),
  ('mission_type', 'Mission Type', 'dropdown', 1, NULL, '[{"value":"monitoring","label":"Monitoring visit"},{"value":"assessment","label":"Needs assessment"},{"value":"donor_visit","label":"Donor visit"},{"value":"technical","label":"Technical support"},{"value":"evaluation","label":"Evaluation"},{"value":"audit","label":"Audit or spot check"},{"value":"emergency","label":"Emergency response"}]', NULL),
  ('destination', 'Destination', 'text', 2, NULL, NULL, NULL),
  ('team_lead', 'Team Lead', 'text', 3, NULL, NULL, NULL),
  ('members', 'Members', 'multi_line', 4, NULL, NULL, NULL),
  ('start_date', 'Start', 'date', 5, NULL, NULL, NULL),
  ('end_date', 'End', 'date', 6, NULL, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', 7, 'Plan & Logistics', NULL, NULL),
  ('transport', 'Transport', 'dropdown', 8, 'Plan & Logistics', '[{"value":"road","label":"Road"},{"value":"air","label":"Air"},{"value":"road_air","label":"Road and air"},{"value":"boat","label":"Boat"}]', NULL),
  ('security_clearance', 'Security Clearance Given', 'boolean', 9, 'Plan & Logistics', NULL, NULL),
  ('budget', 'Budget', 'currency', 10, 'Plan & Logistics', NULL, NULL),
  ('actual_cost', 'Actual Cost', 'currency', 11, 'Plan & Logistics', NULL, NULL),
  ('findings', 'Findings', 'multi_line', 12, 'Findings', NULL, NULL),
  ('recommendations', 'Recommendations', 'table', 13, 'Findings', '[{"value":"action","label":"Action"},{"value":"owner","label":"Owner"},{"value":"due","label":"Due Date","type":"date"},{"value":"status","label":"Status","type":"select","options":["Open","In Progress","Done"]}]', NULL),
  ('report_reference', 'Report Reference', 'text', 14, 'Findings', NULL, NULL),
  ('report_date', 'Report Date', 'date', 15, 'Findings', NULL, NULL),
  ('notes', 'Notes', 'long_text', 16, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-900a-00000000000c'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"planned","label":"Planned"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"},{"key":"cancelled","label":"Cancelled"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-900a-00000000000c'::uuid;

COMMIT;

-- Check: fields and tabs per register.
SELECT r.register_key, count(f.*) AS fields, count(DISTINCT COALESCE(f.field_group, 'Details')) AS tabs,
       count(*) FILTER (WHERE f.field_type = 'table') AS table_fields,
       count(*) FILTER (WHERE f.calculation IS NOT NULL) AS calculated_fields
FROM public.local_registers r JOIN public.local_register_fields f ON f.register_id = r.id
WHERE r.id IN ('00000000-0000-4000-900a-000000000001'::uuid, '00000000-0000-4000-900a-000000000002'::uuid, '00000000-0000-4000-900a-000000000003'::uuid, '00000000-0000-4000-900a-000000000004'::uuid, '00000000-0000-4000-900a-000000000005'::uuid, '00000000-0000-4000-900a-000000000006'::uuid, '00000000-0000-4000-900a-000000000007'::uuid, '00000000-0000-4000-900a-000000000008'::uuid, '00000000-0000-4000-900a-000000000009'::uuid, '00000000-0000-4000-900a-00000000000a'::uuid, '00000000-0000-4000-900a-00000000000b'::uuid, '00000000-0000-4000-900a-00000000000c'::uuid)
GROUP BY r.register_key ORDER BY r.register_key;
