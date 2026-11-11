-- ============================================================================
-- v1403: Change Management registers — full forms with tabs (Banking & Financial Services)
-- ============================================================================
-- PRD v1339 (approved 2026-11-11): new Banking & Financial Services workstream, for the eight new Change Management registers (organisational / people change):
--   Change Management Strategy (fin_change_strategy): 36 fields — Details · Introduction · Case for Change · Approach · Governance & Roles · Change Network · Communication & Engagement · Readiness & Adoption · Risks · Glossary & Appendices · Document Control
--   Change Impact Assessment (fin_change_impacts): 19 fields — Details · Today vs Future · Impact Scores · Actions · Notes
--   Change Readiness (fin_change_readiness): 18 fields — Details · Readiness Scores · Gaps & Actions · Notes
--   Change Network (fin_change_network): 15 fields — Details · Coverage · Preparation · Activities · Notes
--   Change Communications & Engagement (fin_change_communications): 17 fields — Details · Content · Reach & Feedback · Notes
--   Resistance & Concerns (fin_change_resistance): 16 fields — Details · Root Cause · Response · Notes
--   Adoption Tracking (fin_change_adoption): 14 fields — Details · Latest Reading · Readings · Actions · Notes
--   Change Sign-Off (fin_change_sign_off): 14 fields — Details · Approvers · Evidence · Decision · Notes
-- Lists with several parts per line are tables (rule 67.1), with dropdown columns where the values are a
-- short fixed list. Impact and readiness scores use the new average calculation (v1339 D6), reach rate and gap to target are calculated too, all worked out on save.
-- Creates the registers (system, project level), the sidebar section (Change Management, sort 604), one menu
-- per register, the Banking & Financial Services pack links and role access: the delivery-team group plus the
-- PRD D10 roles. The Change Management Strategy is a document register (sign-off, Word / PDF, one per
-- project, versioned). Vendor-neutral, no branded change models (rule 26). The Simulator has no Banking menu,
-- like every other Banking workstream.
-- Sample records: v1404. Prerequisites: v947, v1318, v1326, v1336, v1375 and the v1339 average calculation in the app. Idempotent.
-- ============================================================================

BEGIN;

-- ── 1. Registers (system, project level). Strategies are document registers: sign-off, one per project, versioned ──
INSERT INTO public.local_registers (id, register_key, label, icon, description, scope_level, account_id, status_workflow,
                                    is_document, one_record_per_project, versioned, is_system_defined, is_active, created_at, updated_at)
SELECT v.id::uuid, v.register_key, v.label, 'list-checks', v.description, 'project', NULL, v.status_workflow::jsonb,
       v.is_document, v.is_document, v.is_document, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('00000000-0000-4000-9001-000000000044', 'fin_change_strategy', 'Change Management Strategy', 'How people and organisational change is led for the transformation', '[{"key":"draft","label":"Draft"},{"key":"in_review","label":"In Review"},{"key":"approved","label":"Approved"},{"key":"superseded","label":"Superseded"}]', TRUE),
  ('00000000-0000-4000-9001-000000000045', 'fin_change_impacts', 'Change Impact Assessment', 'Who is affected by each change, how much, and what is done about it', '[{"key":"identified","label":"Identified"},{"key":"assessed","label":"Assessed"},{"key":"actions_planned","label":"Actions Planned"},{"key":"addressed","label":"Addressed"}]', FALSE),
  ('00000000-0000-4000-9001-000000000046', 'fin_change_readiness', 'Change Readiness', 'Readiness assessments by group and point in time', '[{"key":"planned","label":"Planned"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]', FALSE),
  ('00000000-0000-4000-9001-000000000047', 'fin_change_network', 'Change Network', 'Change champions, their coverage and activities', '[{"key":"nominated","label":"Nominated"},{"key":"active","label":"Active"},{"key":"inactive","label":"Inactive"}]', FALSE),
  ('00000000-0000-4000-9001-000000000048', 'fin_change_communications', 'Change Communications & Engagement', 'People-change messages and engagement events', '[{"key":"planned","label":"Planned"},{"key":"approved","label":"Approved"},{"key":"delivered","label":"Delivered"},{"key":"cancelled","label":"Cancelled"}]', FALSE),
  ('00000000-0000-4000-9001-000000000049', 'fin_change_resistance', 'Resistance & Concerns', 'Resistance and concerns raised, with root cause and response', '[{"key":"open","label":"Open"},{"key":"in_progress","label":"In Progress"},{"key":"resolved","label":"Resolved"},{"key":"closed","label":"Closed"}]', FALSE),
  ('00000000-0000-4000-9001-00000000004a', 'fin_change_adoption', 'Adoption Tracking', 'Adoption measures after go-live against target', '[{"key":"not_started","label":"Not Started"},{"key":"on_track","label":"On Track"},{"key":"at_risk","label":"At Risk"},{"key":"off_track","label":"Off Track"},{"key":"achieved","label":"Achieved"}]', FALSE),
  ('00000000-0000-4000-9001-00000000004b', 'fin_change_sign_off', 'Change Sign-Off', 'Formal change readiness and adoption sign-offs', '[{"key":"pending","label":"Pending"},{"key":"signed_off","label":"Signed Off"},{"key":"signed_off_with_conditions","label":"Signed Off with Conditions"},{"key":"rejected","label":"Rejected"}]', FALSE)
) AS v(id, register_key, label, description, status_workflow, is_document)
ON CONFLICT (id) DO UPDATE SET
  register_key = EXCLUDED.register_key, label = EXCLUDED.label, description = EXCLUDED.description,
  status_workflow = EXCLUDED.status_workflow, is_document = EXCLUDED.is_document,
  one_record_per_project = EXCLUDED.one_record_per_project, versioned = EXCLUDED.versioned,
  is_active = TRUE, updated_at = NOW();

-- ── 2. Sidebar section header(s) — pure headers, no route (v947 pattern) ──
INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
                               methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, NULL, NULL, 1, v.sort_order, 'universal', 'layers', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('fin_cat_change_management', 'Change Management', 'People and organisational change for the banking transformation', 604)
) AS v(menu_code, menu_label, menu_description, sort_order)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description, sort_order = EXCLUDED.sort_order,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- ── 3. Fields per register ──
-- ── Change Management Strategy (fin_change_strategy) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000044'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('document_reference', 'Document Reference', 'text', 0, NULL, NULL, NULL),
  ('document_version', 'Document Version', 'text', 1, NULL, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', 2, NULL, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', 3, NULL, NULL, NULL),
  ('change_lead', 'Change Management Lead', 'user_picker', 4, NULL, NULL, NULL),
  ('sponsor', 'Executive Sponsor', 'user_picker', 5, NULL, NULL, NULL),
  ('change_scale', 'Scale of Change', 'dropdown', 6, NULL, '[{"value":"transformational","label":"Transformational"},{"value":"significant","label":"Significant"},{"value":"moderate","label":"Moderate"}]', NULL),
  ('purpose', 'Purpose', 'long_text', 7, 'Introduction', NULL, NULL),
  ('objectives', 'Objectives', 'multi_line', 8, 'Introduction', NULL, NULL),
  ('scope', 'Scope', 'multi_line', 9, 'Introduction', NULL, NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', 10, 'Introduction', NULL, NULL),
  ('assumptions', 'Assumptions', 'multi_line', 11, 'Introduction', NULL, NULL),
  ('constraints', 'Constraints', 'multi_line', 12, 'Introduction', NULL, NULL),
  ('change_vision', 'Change Vision', 'long_text', 13, 'Case for Change', NULL, NULL),
  ('case_for_change', 'Case for Change', 'long_text', 14, 'Case for Change', NULL, NULL),
  ('what_changes', 'What Changes', 'table', 15, 'Case for Change', '[{"value":"area","label":"Area"},{"value":"from","label":"Today"},{"value":"to","label":"In Future"}]', NULL),
  ('what_stays', 'What Stays the Same', 'multi_line', 16, 'Case for Change', NULL, NULL),
  ('change_approach', 'Change Approach', 'long_text', 17, 'Approach', NULL, NULL),
  ('change_phases', 'Change Phases', 'table', 18, 'Approach', '[{"value":"phase","label":"Phase"},{"value":"timing","label":"Timing"},{"value":"focus","label":"Focus"}]', NULL),
  ('impacted_groups', 'Impacted Groups', 'table', 19, 'Approach', '[{"value":"group","label":"Group"},{"value":"size","label":"People"},{"value":"impact","label":"Impact Level","type":"select","options":["High","Medium","Low"]}]', NULL),
  ('governance', 'Governance', 'long_text', 20, 'Governance & Roles', NULL, NULL),
  ('roles_and_responsibilities', 'Roles and Responsibilities', 'table', 21, 'Governance & Roles', '[{"value":"role","label":"Role"},{"value":"responsibility","label":"Responsibility"},{"value":"name","label":"Name"}]', NULL),
  ('network_model', 'Change Network Model', 'long_text', 22, 'Change Network', NULL, NULL),
  ('champion_ratio', 'Champion Ratio', 'text', 23, 'Change Network', NULL, NULL),
  ('champion_commitment', 'Champion Time Commitment', 'text', 24, 'Change Network', NULL, NULL),
  ('engagement_principles', 'Engagement Principles', 'multi_line', 25, 'Communication & Engagement', NULL, NULL),
  ('key_messages', 'Key Messages', 'multi_line', 26, 'Communication & Engagement', NULL, NULL),
  ('engagement_calendar', 'Engagement Calendar', 'table', 27, 'Communication & Engagement', '[{"value":"when","label":"When"},{"value":"activity","label":"Activity"},{"value":"audience","label":"Audience"},{"value":"owner","label":"Owner"}]', NULL),
  ('readiness_measures', 'Readiness Measures', 'table', 28, 'Readiness & Adoption', '[{"value":"measure","label":"Measure"},{"value":"target","label":"Target"},{"value":"when","label":"When"}]', NULL),
  ('adoption_measures', 'Adoption Measures', 'table', 29, 'Readiness & Adoption', '[{"value":"measure","label":"Measure"},{"value":"target","label":"Target"},{"value":"measured_by","label":"Measured By"}]', NULL),
  ('sustainment', 'Sustaining the Change', 'multi_line', 30, 'Readiness & Adoption', NULL, NULL),
  ('risks_mitigations', 'Risks and Mitigations', 'table', 31, 'Risks', '[{"value":"risk","label":"Risk"},{"value":"impact","label":"Impact"},{"value":"mitigation","label":"Mitigation"},{"value":"owner","label":"Owner"}]', NULL),
  ('glossary', 'Glossary of Terms', 'table', 32, 'Glossary & Appendices', '[{"value":"term","label":"Term"},{"value":"definition","label":"Definition"}]', NULL),
  ('appendices', 'Appendices', 'table', 33, 'Glossary & Appendices', '[{"value":"title","label":"Title"},{"value":"reference","label":"Reference / Link"}]', NULL),
  ('version_history', 'Version History', 'table', 34, 'Document Control', '[{"value":"version","label":"Version"},{"value":"date","label":"Date","type":"date"},{"value":"author","label":"Author"},{"value":"change","label":"Change"}]', NULL),
  ('related_documents', 'Related Documents', 'table', 35, 'Document Control', '[{"value":"document","label":"Document"},{"value":"reference","label":"Reference"}]', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000044'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

-- ── Change Impact Assessment (fin_change_impacts) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000045'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('impact_reference', 'Impact Reference', 'text', 0, NULL, NULL, NULL),
  ('change_area', 'What Changes', 'text', 1, NULL, NULL, NULL),
  ('impacted_group', 'Impacted Group', 'text', 2, NULL, NULL, NULL),
  ('business_unit', 'Business Unit', 'dropdown', 3, NULL, '[{"value":"retail_branches","label":"Retail branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"business_banking","label":"Business banking"},{"value":"corporate_trade","label":"Corporate and trade finance"},{"value":"treasury","label":"Treasury"},{"value":"payments_operations","label":"Payments operations"},{"value":"card_operations","label":"Card operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"digital_channels","label":"Digital channels"},{"value":"it_operations","label":"IT operations"},{"value":"all_staff","label":"All staff"}]', NULL),
  ('headcount', 'People Affected', 'number', 4, NULL, NULL, NULL),
  ('impact_types', 'Type of Impact', 'multi_select', 5, NULL, '[{"value":"people","label":"People / roles"},{"value":"process","label":"Process"},{"value":"technology","label":"Technology"},{"value":"policy","label":"Policy / rules"},{"value":"organisation","label":"Organisation structure"},{"value":"customer","label":"Customer experience"}]', NULL),
  ('impact_level', 'Impact Level', 'dropdown', 6, NULL, '[{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]', NULL),
  ('owner', 'Owner', 'user_picker', 7, NULL, NULL, NULL),
  ('current_state', 'Today', 'long_text', 8, 'Today vs Future', NULL, NULL),
  ('future_state', 'In Future', 'long_text', 9, 'Today vs Future', NULL, NULL),
  ('key_differences', 'Key Differences', 'multi_line', 10, 'Today vs Future', NULL, NULL),
  ('people_impact', 'People Impact (1 = low, 5 = high)', 'number', 11, 'Impact Scores', NULL, NULL),
  ('process_impact', 'Process Impact (1 = low, 5 = high)', 'number', 12, 'Impact Scores', NULL, NULL),
  ('technology_impact', 'Technology Impact (1 = low, 5 = high)', 'number', 13, 'Impact Scores', NULL, NULL),
  ('overall_impact', 'Overall Impact', 'number', 14, 'Impact Scores', NULL, '{"op":"average","fields":["people_impact","process_impact","technology_impact"],"of":5,"decimals":1,"display":"percent"}'),
  ('actions', 'Actions', 'table', 15, 'Actions', '[{"value":"action","label":"Action"},{"value":"type","label":"Type","type":"select","options":["Communication","Training","Process change","Support","Coaching"]},{"value":"owner","label":"Owner"},{"value":"due","label":"Due Date","type":"date"},{"value":"status","label":"Status","type":"select","options":["Open","Done"]}]', NULL),
  ('training_required', 'Training Required', 'boolean', 16, 'Actions', NULL, NULL),
  ('linked_courses', 'Linked Courses', 'text', 17, 'Actions', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 18, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000045'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

-- ── Change Readiness (fin_change_readiness) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000046'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('assessment_reference', 'Assessment Reference', 'text', 0, NULL, NULL, NULL),
  ('assessed_group', 'Group Assessed', 'text', 1, NULL, NULL, NULL),
  ('business_unit', 'Business Unit', 'dropdown', 2, NULL, '[{"value":"retail_branches","label":"Retail branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"business_banking","label":"Business banking"},{"value":"corporate_trade","label":"Corporate and trade finance"},{"value":"treasury","label":"Treasury"},{"value":"payments_operations","label":"Payments operations"},{"value":"card_operations","label":"Card operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"digital_channels","label":"Digital channels"},{"value":"it_operations","label":"IT operations"},{"value":"all_staff","label":"All staff"}]', NULL),
  ('assessment_point', 'Assessment Point', 'dropdown', 3, NULL, '[{"value":"baseline","label":"Baseline"},{"value":"pre_rehearsal","label":"Before dress rehearsals"},{"value":"pre_go_live","label":"Before go-live"},{"value":"post_go_live","label":"After go-live"}]', NULL),
  ('assessment_date', 'Assessment Date', 'date', 4, NULL, NULL, NULL),
  ('method', 'Method', 'dropdown', 5, NULL, '[{"value":"survey","label":"Survey"},{"value":"workshop","label":"Workshop"},{"value":"interviews","label":"Interviews"},{"value":"pulse","label":"Pulse check"}]', NULL),
  ('respondents', 'Respondents', 'number', 6, NULL, NULL, NULL),
  ('owner', 'Owner', 'user_picker', 7, NULL, NULL, NULL),
  ('aware', 'Aware of the Change (1 = low, 5 = high)', 'number', 8, 'Readiness Scores', NULL, NULL),
  ('understand', 'Understand What It Means for Them (1 = low, 5 = high)', 'number', 9, 'Readiness Scores', NULL, NULL),
  ('accept', 'Accept and Support It (1 = low, 5 = high)', 'number', 10, 'Readiness Scores', NULL, NULL),
  ('able', 'Able to Work the New Way (1 = low, 5 = high)', 'number', 11, 'Readiness Scores', NULL, NULL),
  ('sustain', 'Likely to Sustain It (1 = low, 5 = high)', 'number', 12, 'Readiness Scores', NULL, NULL),
  ('readiness_score', 'Readiness Score', 'number', 13, 'Readiness Scores', NULL, '{"op":"average","fields":["aware","understand","accept","able","sustain"],"of":5,"decimals":1,"display":"percent"}'),
  ('readiness_rag', 'Readiness RAG', 'dropdown', 14, 'Readiness Scores', '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]', NULL),
  ('key_findings', 'Key Findings', 'multi_line', 15, 'Gaps & Actions', NULL, NULL),
  ('gaps_and_actions', 'Gaps and Actions', 'table', 16, 'Gaps & Actions', '[{"value":"gap","label":"Gap"},{"value":"action","label":"Action"},{"value":"owner","label":"Owner"},{"value":"due","label":"Due Date","type":"date"}]', NULL),
  ('notes', 'Notes', 'multi_line', 17, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000046'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

-- ── Change Network (fin_change_network) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000047'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('champion_reference', 'Champion Reference', 'text', 0, NULL, NULL, NULL),
  ('job_title', 'Job Title', 'text', 1, NULL, NULL, NULL),
  ('business_unit', 'Business Unit', 'dropdown', 2, NULL, '[{"value":"retail_branches","label":"Retail branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"business_banking","label":"Business banking"},{"value":"corporate_trade","label":"Corporate and trade finance"},{"value":"treasury","label":"Treasury"},{"value":"payments_operations","label":"Payments operations"},{"value":"card_operations","label":"Card operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"digital_channels","label":"Digital channels"},{"value":"it_operations","label":"IT operations"},{"value":"all_staff","label":"All staff"}]', NULL),
  ('location', 'Location', 'text', 3, NULL, NULL, NULL),
  ('line_manager', 'Line Manager', 'text', 4, NULL, NULL, NULL),
  ('appointed_date', 'Appointed On', 'date', 5, NULL, NULL, NULL),
  ('time_commitment', 'Time Commitment', 'text', 6, NULL, NULL, NULL),
  ('units_covered', 'Teams / Branches Covered', 'multi_line', 7, 'Coverage', NULL, NULL),
  ('staff_covered', 'Staff Covered', 'number', 8, 'Coverage', NULL, NULL),
  ('briefings_attended', 'Champion Briefings Attended', 'number', 9, 'Preparation', NULL, NULL),
  ('champion_training_complete', 'Champion Training Complete', 'boolean', 10, 'Preparation', NULL, NULL),
  ('toolkit_issued', 'Champion Toolkit Issued', 'boolean', 11, 'Preparation', NULL, NULL),
  ('activities', 'Activities', 'table', 12, 'Activities', '[{"value":"date","label":"Date","type":"date"},{"value":"activity","label":"Activity"},{"value":"audience","label":"Audience"},{"value":"attendees","label":"Attendees"}]', NULL),
  ('feedback_raised', 'Feedback Raised', 'multi_line', 13, 'Activities', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 14, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000047'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

-- ── Change Communications & Engagement (fin_change_communications) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000048'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('comm_reference', 'Reference', 'text', 0, NULL, NULL, NULL),
  ('comm_type', 'Type', 'dropdown', 1, NULL, '[{"value":"announcement","label":"Announcement"},{"value":"briefing","label":"Manager briefing"},{"value":"town_hall","label":"Town hall"},{"value":"roadshow","label":"Roadshow"},{"value":"newsletter","label":"Newsletter / article"},{"value":"video","label":"Video"},{"value":"faq","label":"FAQ"},{"value":"workshop","label":"Workshop"},{"value":"survey","label":"Survey"}]', NULL),
  ('audiences', 'Audiences', 'multi_select', 2, NULL, '[{"value":"retail_branches","label":"Retail branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"business_banking","label":"Business banking"},{"value":"corporate_trade","label":"Corporate and trade finance"},{"value":"treasury","label":"Treasury"},{"value":"payments_operations","label":"Payments operations"},{"value":"card_operations","label":"Card operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"digital_channels","label":"Digital channels"},{"value":"it_operations","label":"IT operations"},{"value":"all_staff","label":"All staff"}]', NULL),
  ('channels', 'Channels', 'multi_select', 3, NULL, '[{"value":"face_to_face","label":"Face to face"},{"value":"virtual","label":"Virtual meeting"},{"value":"intranet","label":"Intranet"},{"value":"email","label":"Email"},{"value":"video","label":"Video"},{"value":"print","label":"Print / posters"},{"value":"champions","label":"Through champions"}]', NULL),
  ('change_phase', 'Change Phase', 'dropdown', 4, NULL, '[{"value":"awareness","label":"Awareness"},{"value":"preparation","label":"Preparation"},{"value":"go_live","label":"Go-live"},{"value":"reinforcement","label":"Reinforcement"}]', NULL),
  ('owner', 'Owner', 'user_picker', 5, NULL, NULL, NULL),
  ('planned_date', 'Planned Date', 'date', 6, NULL, NULL, NULL),
  ('actual_date', 'Actual Date', 'date', 7, NULL, NULL, NULL),
  ('key_messages', 'Key Messages', 'multi_line', 8, 'Content', NULL, NULL),
  ('message_body', 'Message / Agenda', 'long_text', 9, 'Content', NULL, NULL),
  ('linked_impacts', 'Linked Impacts', 'text', 10, 'Content', NULL, NULL),
  ('audience_size', 'Audience Size', 'number', 11, 'Reach & Feedback', NULL, NULL),
  ('reached', 'Reached / Attended', 'number', 12, 'Reach & Feedback', NULL, NULL),
  ('reach_rate', 'Reach Rate', 'number', 13, 'Reach & Feedback', NULL, '{"op":"percent","numerator":"reached","denominator":"audience_size","decimals":1,"display":"percent"}'),
  ('sentiment', 'Sentiment', 'dropdown', 14, 'Reach & Feedback', '[{"value":"positive","label":"Positive"},{"value":"mixed","label":"Mixed"},{"value":"neutral","label":"Neutral"},{"value":"negative","label":"Negative"}]', NULL),
  ('feedback', 'Feedback and Questions', 'multi_line', 15, 'Reach & Feedback', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 16, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000048'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

-- ── Resistance & Concerns (fin_change_resistance) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000049'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('concern_reference', 'Reference', 'text', 0, NULL, NULL, NULL),
  ('source_group', 'Raised By (group)', 'text', 1, NULL, NULL, NULL),
  ('business_unit', 'Business Unit', 'dropdown', 2, NULL, '[{"value":"retail_branches","label":"Retail branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"business_banking","label":"Business banking"},{"value":"corporate_trade","label":"Corporate and trade finance"},{"value":"treasury","label":"Treasury"},{"value":"payments_operations","label":"Payments operations"},{"value":"card_operations","label":"Card operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"digital_channels","label":"Digital channels"},{"value":"it_operations","label":"IT operations"},{"value":"all_staff","label":"All staff"}]', NULL),
  ('raised_date', 'Raised On', 'date', 3, NULL, NULL, NULL),
  ('raised_through', 'Raised Through', 'dropdown', 4, NULL, '[{"value":"champion","label":"Change champion"},{"value":"survey","label":"Survey"},{"value":"town_hall","label":"Town hall"},{"value":"manager","label":"Line manager"},{"value":"staff_forum","label":"Staff forum"},{"value":"helpdesk","label":"Helpdesk"}]', NULL),
  ('concern_type', 'Type of Concern', 'dropdown', 5, NULL, '[{"value":"job_security","label":"Job security"},{"value":"workload","label":"Workload"},{"value":"skills","label":"Skills / confidence"},{"value":"process","label":"New process"},{"value":"usability","label":"System usability"},{"value":"timing","label":"Timing"},{"value":"communication","label":"Communication"}]', NULL),
  ('severity', 'Severity', 'dropdown', 6, NULL, '[{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]', NULL),
  ('people_affected', 'People Affected', 'number', 7, NULL, NULL, NULL),
  ('root_cause', 'Root Cause', 'long_text', 8, 'Root Cause', NULL, NULL),
  ('response_plan', 'Response', 'long_text', 9, 'Response', NULL, NULL),
  ('owner', 'Owner', 'user_picker', 10, 'Response', NULL, NULL),
  ('target_date', 'Target Date', 'date', 11, 'Response', NULL, NULL),
  ('response_actions', 'Actions Taken', 'table', 12, 'Response', '[{"value":"date","label":"Date","type":"date"},{"value":"action","label":"Action"},{"value":"by","label":"By"}]', NULL),
  ('resolution', 'Resolution', 'long_text', 13, 'Response', NULL, NULL),
  ('closed_date', 'Closed On', 'date', 14, 'Response', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 15, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000049'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

-- ── Adoption Tracking (fin_change_adoption) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-00000000004a'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('measure_reference', 'Measure Reference', 'text', 0, NULL, NULL, NULL),
  ('measure', 'Measure', 'text', 1, NULL, NULL, NULL),
  ('business_unit', 'Business Unit', 'dropdown', 2, NULL, '[{"value":"retail_branches","label":"Retail branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"business_banking","label":"Business banking"},{"value":"corporate_trade","label":"Corporate and trade finance"},{"value":"treasury","label":"Treasury"},{"value":"payments_operations","label":"Payments operations"},{"value":"card_operations","label":"Card operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"digital_channels","label":"Digital channels"},{"value":"it_operations","label":"IT operations"},{"value":"all_staff","label":"All staff"}]', NULL),
  ('measure_type', 'Measure Type', 'dropdown', 3, NULL, '[{"value":"usage","label":"Usage"},{"value":"process_compliance","label":"Process compliance"},{"value":"proficiency","label":"Proficiency"},{"value":"workarounds","label":"Workaround use"},{"value":"satisfaction","label":"User satisfaction"},{"value":"error_rate","label":"Error rate"}]', NULL),
  ('unit', 'Unit', 'text', 4, NULL, NULL, NULL),
  ('owner', 'Owner', 'user_picker', 5, NULL, NULL, NULL),
  ('target_value', 'Target', 'number', 6, 'Latest Reading', NULL, NULL),
  ('baseline_value', 'Baseline (before go-live)', 'number', 7, 'Latest Reading', NULL, NULL),
  ('latest_value', 'Latest Value', 'number', 8, 'Latest Reading', NULL, NULL),
  ('latest_reading_date', 'Latest Reading On', 'date', 9, 'Latest Reading', NULL, NULL),
  ('gap_to_target', 'Gap to Target', 'number', 10, 'Latest Reading', NULL, '{"op":"difference","minuend":"latest_value","subtrahend":"target_value"}'),
  ('readings', 'Readings', 'table', 11, 'Readings', '[{"value":"date","label":"Date","type":"date"},{"value":"value","label":"Value"},{"value":"note","label":"Note"}]', NULL),
  ('actions_taken', 'Actions Taken', 'multi_line', 12, 'Actions', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 13, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000004a'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

-- ── Change Sign-Off (fin_change_sign_off) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-00000000004b'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('signoff_reference', 'Sign-Off Reference', 'text', 0, NULL, NULL, NULL),
  ('signoff_type', 'Sign-Off Type', 'dropdown', 1, NULL, '[{"value":"strategy","label":"Change strategy approval"},{"value":"impacts","label":"Impact assessment complete"},{"value":"baseline","label":"Readiness baseline"},{"value":"unit_readiness","label":"Business unit readiness"},{"value":"pre_go_live","label":"Pre-go-live change readiness"},{"value":"adoption","label":"Adoption review"},{"value":"closure","label":"Change closure"}]', NULL),
  ('business_unit', 'Business Unit', 'dropdown', 2, NULL, '[{"value":"retail_branches","label":"Retail branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"business_banking","label":"Business banking"},{"value":"corporate_trade","label":"Corporate and trade finance"},{"value":"treasury","label":"Treasury"},{"value":"payments_operations","label":"Payments operations"},{"value":"card_operations","label":"Card operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"digital_channels","label":"Digital channels"},{"value":"it_operations","label":"IT operations"},{"value":"all_staff","label":"All staff"}]', NULL),
  ('signoff_owner', 'Sign-Off Coordinator', 'user_picker', 3, NULL, NULL, NULL),
  ('requested_date', 'Requested Date', 'date', 4, NULL, NULL, NULL),
  ('due_date', 'Due Date', 'date', 5, NULL, NULL, NULL),
  ('approvers', 'Approvers', 'table', 6, 'Approvers', '[{"value":"department","label":"Department"},{"value":"name","label":"Name"},{"value":"role","label":"Role"},{"value":"decision","label":"Decision","type":"select","options":["Approved","Approved with conditions","Rejected","Pending"]},{"value":"date","label":"Date","type":"date"}]', NULL),
  ('evidence_reviewed', 'Evidence Reviewed', 'table', 7, 'Evidence', '[{"value":"evidence","label":"Evidence"},{"value":"reference","label":"Reference"}]', NULL),
  ('readiness_score', 'Readiness Score at Sign-Off (%)', 'number', 8, 'Evidence', NULL, NULL),
  ('conditions', 'Conditions / Caveats', 'multi_line', 9, 'Evidence', NULL, NULL),
  ('decision', 'Decision', 'dropdown', 10, 'Decision', '[{"value":"approved","label":"Approved"},{"value":"approved_with_conditions","label":"Approved with conditions"},{"value":"rejected","label":"Rejected"},{"value":"pending","label":"Pending"}]', NULL),
  ('decision_date', 'Decision Date', 'date', 11, 'Decision', NULL, NULL),
  ('decision_comments', 'Decision Comments', 'multi_line', 12, 'Decision', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 13, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000004b'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

-- ── 4. Banking & Financial Services pack ──
INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT lr.id, ip.id
FROM public.local_registers lr
JOIN public.industry_packs ip ON ip.industry_category_id = (
  SELECT id FROM public.industry_categories WHERE name = 'Banking & Financial Services'
)
WHERE lr.id IN ('00000000-0000-4000-9001-000000000044'::uuid, '00000000-0000-4000-9001-000000000045'::uuid, '00000000-0000-4000-9001-000000000046'::uuid, '00000000-0000-4000-9001-000000000047'::uuid, '00000000-0000-4000-9001-000000000048'::uuid, '00000000-0000-4000-9001-000000000049'::uuid, '00000000-0000-4000-9001-00000000004a'::uuid, '00000000-0000-4000-9001-00000000004b'::uuid)
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

-- ── 5. Register menu items under their section ──
INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
                               methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'fin_reg_' || lr.register_key, lr.label, lr.description,
       '/platform/local-registers/' || lr.id::text,
       (SELECT id FROM public.menu_items WHERE menu_code = v.category AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, v.sort_order, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('00000000-0000-4000-9001-000000000044', 'fin_cat_change_management', 720),
  ('00000000-0000-4000-9001-000000000045', 'fin_cat_change_management', 721),
  ('00000000-0000-4000-9001-000000000046', 'fin_cat_change_management', 722),
  ('00000000-0000-4000-9001-000000000047', 'fin_cat_change_management', 723),
  ('00000000-0000-4000-9001-000000000048', 'fin_cat_change_management', 724),
  ('00000000-0000-4000-9001-000000000049', 'fin_cat_change_management', 725),
  ('00000000-0000-4000-9001-00000000004a', 'fin_cat_change_management', 726),
  ('00000000-0000-4000-9001-00000000004b', 'fin_cat_change_management', 727)
) AS v(register_id, category, sort_order)
JOIN public.local_registers lr ON lr.id = v.register_id::uuid
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description, route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id, sort_order = EXCLUDED.sort_order,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- ── 6. Role access: the delivery-team group (v946c) plus the named roles (PRD D10) ──
SELECT public.grant_menu_role_group('fin_cat_%');
SELECT public.grant_menu_role_group('fin_reg_%');

WITH target_roles AS (
  SELECT id
  FROM public.roles
  WHERE COALESCE(is_deleted, FALSE) = FALSE
    AND account_id IS NULL
    AND lower(regexp_replace(trim(role_name), '[[:space:]]+', '_', 'g')) IN (
      'project_sponsor', 'project_board_member', 'financial_programme_manager', 'pm_project_assurance', 'internal_auditor', 'risk_compliance_manager', 'pm_team_member', 'learning_development_specialist'
    )
),
target_items AS (
  SELECT id FROM public.menu_items
  WHERE COALESCE(is_deleted, FALSE) = FALSE
    AND menu_code IN ('fin_cat_change_management', 'fin_reg_fin_change_strategy', 'fin_reg_fin_change_impacts', 'fin_reg_fin_change_readiness', 'fin_reg_fin_change_network', 'fin_reg_fin_change_communications', 'fin_reg_fin_change_resistance', 'fin_reg_fin_change_adoption', 'fin_reg_fin_change_sign_off')
)
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, is_deleted, created_at, updated_at)
SELECT gen_random_uuid(), r.id, m.id, TRUE, TRUE, TRUE, FALSE, NOW(), NOW()
FROM target_roles r CROSS JOIN target_items m
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- ── 7. industry_pack_menu_items (v945 pattern) ──
INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT DISTINCT lrip.industry_pack_id, mi.id
FROM public.local_register_industry_packs lrip
JOIN public.local_registers lr ON lr.id = lrip.register_id
JOIN public.menu_items mi ON mi.route_path = '/platform/local-registers/' || lr.id::text
WHERE lr.id IN ('00000000-0000-4000-9001-000000000044'::uuid, '00000000-0000-4000-9001-000000000045'::uuid, '00000000-0000-4000-9001-000000000046'::uuid, '00000000-0000-4000-9001-000000000047'::uuid, '00000000-0000-4000-9001-000000000048'::uuid, '00000000-0000-4000-9001-000000000049'::uuid, '00000000-0000-4000-9001-00000000004a'::uuid, '00000000-0000-4000-9001-00000000004b'::uuid)
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

COMMIT;

-- Check: menus and how many roles can see each.
SELECT mi.menu_level, mi.sort_order, mi.menu_code, mi.menu_label,
       (SELECT count(*) FROM public.role_menu_items rmi WHERE rmi.menu_item_id = mi.id AND rmi.can_view AND rmi.is_active) AS roles
FROM public.menu_items mi
WHERE mi.menu_code IN ('fin_cat_change_management', 'fin_reg_fin_change_strategy', 'fin_reg_fin_change_impacts', 'fin_reg_fin_change_readiness', 'fin_reg_fin_change_network', 'fin_reg_fin_change_communications', 'fin_reg_fin_change_resistance', 'fin_reg_fin_change_adoption', 'fin_reg_fin_change_sign_off')
ORDER BY mi.menu_level, mi.sort_order;

-- Check: fields and tabs per register.
SELECT r.register_key, count(f.*) AS fields, count(DISTINCT COALESCE(f.field_group, 'Details')) AS tabs,
       count(*) FILTER (WHERE f.field_type = 'table') AS table_fields,
       count(*) FILTER (WHERE f.calculation IS NOT NULL) AS calculated_fields
FROM public.local_registers r JOIN public.local_register_fields f ON f.register_id = r.id
WHERE r.id IN ('00000000-0000-4000-9001-000000000044'::uuid, '00000000-0000-4000-9001-000000000045'::uuid, '00000000-0000-4000-9001-000000000046'::uuid, '00000000-0000-4000-9001-000000000047'::uuid, '00000000-0000-4000-9001-000000000048'::uuid, '00000000-0000-4000-9001-000000000049'::uuid, '00000000-0000-4000-9001-00000000004a'::uuid, '00000000-0000-4000-9001-00000000004b'::uuid)
GROUP BY r.register_key ORDER BY r.register_key;
