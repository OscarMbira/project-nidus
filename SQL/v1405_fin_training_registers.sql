-- ============================================================================
-- v1405: Training registers — full forms with tabs (Banking & Financial Services)
-- ============================================================================
-- PRD v1339 (approved 2026-11-11): new Banking & Financial Services workstream, for the ten new Training registers (design and delivery of end-user training):
--   Training Strategy (fin_training_strategy): 30 fields — Details · Introduction · Audiences · Approach & Methods · Curriculum · Trainers · Environment · Schedule · Assessment & Effectiveness · Risks & Roles · Glossary & Appendices · Document Control
--   Training Needs Analysis (fin_training_needs): 11 fields — Details · Tasks Changing · Skills Gap · Courses · Notes
--   Curriculum (fin_training_curriculum): 13 fields — Details · Learning Objectives · Content · Prerequisites · Notes
--   Training Materials (fin_training_materials): 11 fields — Details · Version & Review · Approval · Notes
--   Trainers (fin_training_trainers): 11 fields — Details · Certification · Availability · Notes
--   Training Sessions (fin_training_sessions): 14 fields — Details · Schedule · Enrolment · Notes
--   Attendance & Assessment (fin_training_attendance): 13 fields — Details · Attendance · Assessment · Follow-Up · Notes
--   Training Environment (fin_training_environment): 12 fields — Details · Data & Users · Checks · Issues · Notes
--   Training Effectiveness (fin_training_effectiveness): 14 fields — Details · Scores · Findings & Actions · Notes
--   Training Sign-Off (fin_training_sign_off): 16 fields — Details · Approvers · Evidence · Decision · Notes
-- Lists with several parts per line are tables (rule 67.1), with dropdown columns where the values are a
-- short fixed list. Session duration and fill rate, attendance and pass rates, completion and evaluation scores (average, v1339) are worked out on save.
-- Creates the registers (system, project level), the sidebar section (Training, sort 605), one menu per
-- register, the Banking & Financial Services pack links and role access: the delivery-team group plus the
-- PRD D10 roles. The Training Strategy is a document register (sign-off, Word / PDF, one per project,
-- versioned). Operational Readiness → Training stays as the per-course readiness view (PRD D2). Attendance
-- is recorded per session, not per learner (D7). Vendor-neutral, no branded evaluation models (rule 26).
-- Sample records: v1406. Prerequisites: v947, v1318, v1326, v1336, v1375 and the v1339 average calculation in the app. Idempotent.
-- ============================================================================

BEGIN;

-- ── 1. Registers (system, project level). Strategies are document registers: sign-off, one per project, versioned ──
INSERT INTO public.local_registers (id, register_key, label, icon, description, scope_level, account_id, status_workflow,
                                    is_document, one_record_per_project, versioned, is_system_defined, is_active, created_at, updated_at)
SELECT v.id::uuid, v.register_key, v.label, 'list-checks', v.description, 'project', NULL, v.status_workflow::jsonb,
       v.is_document, v.is_document, v.is_document, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('00000000-0000-4000-9001-00000000004c', 'fin_training_strategy', 'Training Strategy', 'How end-user training is designed, delivered and measured', '[{"key":"draft","label":"Draft"},{"key":"in_review","label":"In Review"},{"key":"approved","label":"Approved"},{"key":"superseded","label":"Superseded"}]', TRUE),
  ('00000000-0000-4000-9001-00000000004d', 'fin_training_needs', 'Training Needs Analysis', 'What each role needs to learn, and which courses cover it', '[{"key":"draft","label":"Draft"},{"key":"validated","label":"Validated with the Business"},{"key":"approved","label":"Approved"}]', FALSE),
  ('00000000-0000-4000-9001-00000000004e', 'fin_training_curriculum', 'Curriculum', 'Course catalogue: objectives, content, duration and method', '[{"key":"draft","label":"Draft"},{"key":"in_design","label":"In Design"},{"key":"approved","label":"Approved"},{"key":"retired","label":"Retired"}]', FALSE),
  ('00000000-0000-4000-9001-00000000004f', 'fin_training_materials', 'Training Materials', 'Training materials through draft, review, approval and publication', '[{"key":"not_started","label":"Not Started"},{"key":"drafting","label":"Drafting"},{"key":"in_review","label":"In Review"},{"key":"approved","label":"Approved"},{"key":"published","label":"Published"}]', FALSE),
  ('00000000-0000-4000-9001-000000000050', 'fin_training_trainers', 'Trainers', 'Trainer pool, certification and availability', '[{"key":"nominated","label":"Nominated"},{"key":"in_training","label":"In Training"},{"key":"certified","label":"Certified"},{"key":"inactive","label":"Inactive"}]', FALSE),
  ('00000000-0000-4000-9001-000000000051', 'fin_training_sessions', 'Training Sessions', 'Scheduled training sessions, venues and enrolment', '[{"key":"planned","label":"Planned"},{"key":"scheduled","label":"Scheduled"},{"key":"delivered","label":"Delivered"},{"key":"cancelled","label":"Cancelled"}]', FALSE),
  ('00000000-0000-4000-9001-000000000052', 'fin_training_attendance', 'Attendance & Assessment', 'Attendance and assessment results per session', '[{"key":"open","label":"Open"},{"key":"recorded","label":"Recorded"},{"key":"follow_up","label":"Follow-Up Needed"},{"key":"closed","label":"Closed"}]', FALSE),
  ('00000000-0000-4000-9001-000000000053', 'fin_training_environment', 'Training Environment', 'Training environment readiness: data, users and checks', '[{"key":"not_ready","label":"Not Ready"},{"key":"in_progress","label":"In Progress"},{"key":"ready","label":"Ready"},{"key":"issue","label":"Issue"}]', FALSE),
  ('00000000-0000-4000-9001-000000000054', 'fin_training_effectiveness', 'Training Effectiveness', 'Evaluation of training: reaction, learning, behaviour and results', '[{"key":"planned","label":"Planned"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]', FALSE),
  ('00000000-0000-4000-9001-000000000055', 'fin_training_sign_off', 'Training Sign-Off', 'Formal training completion sign-offs', '[{"key":"pending","label":"Pending"},{"key":"signed_off","label":"Signed Off"},{"key":"signed_off_with_conditions","label":"Signed Off with Conditions"},{"key":"rejected","label":"Rejected"}]', FALSE)
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
  ('fin_cat_training', 'Training', 'Design and delivery of end-user training for the banking transformation', 605)
) AS v(menu_code, menu_label, menu_description, sort_order)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description, sort_order = EXCLUDED.sort_order,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- ── 3. Fields per register ──
-- ── Training Strategy (fin_training_strategy) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-00000000004c'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('document_reference', 'Document Reference', 'text', 0, NULL, NULL, NULL),
  ('document_version', 'Document Version', 'text', 1, NULL, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', 2, NULL, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', 3, NULL, NULL, NULL),
  ('training_lead', 'Training Lead', 'user_picker', 4, NULL, NULL, NULL),
  ('training_start', 'Training Start', 'date', 5, NULL, NULL, NULL),
  ('training_end', 'Training End', 'date', 6, NULL, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', 7, 'Introduction', NULL, NULL),
  ('objectives', 'Objectives', 'multi_line', 8, 'Introduction', NULL, NULL),
  ('scope', 'Scope', 'multi_line', 9, 'Introduction', NULL, NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', 10, 'Introduction', NULL, NULL),
  ('assumptions', 'Assumptions', 'multi_line', 11, 'Introduction', NULL, NULL),
  ('constraints', 'Constraints', 'multi_line', 12, 'Introduction', NULL, NULL),
  ('audiences', 'Audiences', 'table', 13, 'Audiences', '[{"value":"audience","label":"Audience"},{"value":"people","label":"People"},{"value":"priority","label":"Priority","type":"select","options":["High","Medium","Low"]},{"value":"approach","label":"Approach"}]', NULL),
  ('delivery_approach', 'Delivery Approach', 'long_text', 14, 'Approach & Methods', NULL, NULL),
  ('delivery_methods', 'Delivery Methods', 'table', 15, 'Approach & Methods', '[{"value":"method","label":"Method"},{"value":"used_for","label":"Used For"}]', NULL),
  ('train_the_trainer', 'Train-the-Trainer Approach', 'long_text', 16, 'Approach & Methods', NULL, NULL),
  ('curriculum_overview', 'Curriculum Overview', 'table', 17, 'Curriculum', '[{"value":"course","label":"Course"},{"value":"audience","label":"Audience"},{"value":"duration","label":"Duration"},{"value":"method","label":"Method"}]', NULL),
  ('trainer_model', 'Trainer Model', 'long_text', 18, 'Trainers', NULL, NULL),
  ('environment_approach', 'Training Environment', 'long_text', 19, 'Environment', NULL, NULL),
  ('training_schedule', 'Schedule', 'table', 20, 'Schedule', '[{"value":"phase","label":"Phase"},{"value":"from","label":"From","type":"date"},{"value":"to","label":"To","type":"date"},{"value":"focus","label":"Focus"}]', NULL),
  ('assessment_approach', 'Assessment Approach', 'long_text', 21, 'Assessment & Effectiveness', NULL, NULL),
  ('effectiveness_measures', 'Effectiveness Measures', 'table', 22, 'Assessment & Effectiveness', '[{"value":"level","label":"Level"},{"value":"measure","label":"Measure"},{"value":"target","label":"Target"}]', NULL),
  ('completion_criteria', 'Completion Criteria', 'multi_line', 23, 'Assessment & Effectiveness', NULL, NULL),
  ('roles_and_responsibilities', 'Roles and Responsibilities', 'table', 24, 'Risks & Roles', '[{"value":"role","label":"Role"},{"value":"responsibility","label":"Responsibility"},{"value":"name","label":"Name"}]', NULL),
  ('risks_mitigations', 'Risks and Mitigations', 'table', 25, 'Risks & Roles', '[{"value":"risk","label":"Risk"},{"value":"impact","label":"Impact"},{"value":"mitigation","label":"Mitigation"},{"value":"owner","label":"Owner"}]', NULL),
  ('glossary', 'Glossary of Terms', 'table', 26, 'Glossary & Appendices', '[{"value":"term","label":"Term"},{"value":"definition","label":"Definition"}]', NULL),
  ('appendices', 'Appendices', 'table', 27, 'Glossary & Appendices', '[{"value":"title","label":"Title"},{"value":"reference","label":"Reference / Link"}]', NULL),
  ('version_history', 'Version History', 'table', 28, 'Document Control', '[{"value":"version","label":"Version"},{"value":"date","label":"Date","type":"date"},{"value":"author","label":"Author"},{"value":"change","label":"Change"}]', NULL),
  ('related_documents', 'Related Documents', 'table', 29, 'Document Control', '[{"value":"document","label":"Document"},{"value":"reference","label":"Reference"}]', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000004c'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

-- ── Training Needs Analysis (fin_training_needs) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-00000000004d'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('tna_reference', 'Reference', 'text', 0, NULL, NULL, NULL),
  ('role_name', 'Role / Job Family', 'text', 1, NULL, NULL, NULL),
  ('business_unit', 'Business Unit', 'dropdown', 2, NULL, '[{"value":"retail_branches","label":"Retail branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"business_banking","label":"Business banking"},{"value":"corporate_trade","label":"Corporate and trade finance"},{"value":"treasury","label":"Treasury"},{"value":"payments_operations","label":"Payments operations"},{"value":"card_operations","label":"Card operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"digital_channels","label":"Digital channels"},{"value":"it_operations","label":"IT operations"},{"value":"all_staff","label":"All staff"}]', NULL),
  ('people_in_role', 'People in Role', 'number', 3, NULL, NULL, NULL),
  ('impact_level', 'Impact Level', 'dropdown', 4, NULL, '[{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]', NULL),
  ('owner', 'Owner', 'user_picker', 5, NULL, NULL, NULL),
  ('tasks_changing', 'Tasks Changing', 'table', 6, 'Tasks Changing', '[{"value":"task","label":"Task"},{"value":"today","label":"Today"},{"value":"new_way","label":"New Way"},{"value":"frequency","label":"Frequency","type":"select","options":["Daily","Weekly","Monthly","Rarely"]}]', NULL),
  ('skills_gap', 'Skills Gap', 'table', 7, 'Skills Gap', '[{"value":"skill","label":"Skill"},{"value":"current","label":"Current Level (1–5)"},{"value":"required","label":"Required Level (1–5)"}]', NULL),
  ('required_courses', 'Required Courses', 'table', 8, 'Courses', '[{"value":"course","label":"Course"},{"value":"mandatory","label":"Mandatory","type":"select","options":["Yes","No"]},{"value":"when","label":"When"}]', NULL),
  ('training_hours', 'Training Hours per Person', 'number', 9, 'Courses', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 10, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000004d'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

-- ── Curriculum (fin_training_curriculum) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-00000000004e'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('course_code', 'Course Code', 'text', 0, NULL, NULL, NULL),
  ('business_unit', 'Main Audience', 'dropdown', 1, NULL, '[{"value":"retail_branches","label":"Retail branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"business_banking","label":"Business banking"},{"value":"corporate_trade","label":"Corporate and trade finance"},{"value":"treasury","label":"Treasury"},{"value":"payments_operations","label":"Payments operations"},{"value":"card_operations","label":"Card operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"digital_channels","label":"Digital channels"},{"value":"it_operations","label":"IT operations"},{"value":"all_staff","label":"All staff"}]', NULL),
  ('delivery_method', 'Delivery Method', 'dropdown', 2, NULL, '[{"value":"classroom","label":"Classroom"},{"value":"virtual","label":"Virtual classroom"},{"value":"e_learning","label":"E-learning"},{"value":"on_the_job","label":"On the job"},{"value":"train_the_trainer","label":"Train the trainer"},{"value":"blended","label":"Blended"}]', NULL),
  ('duration_hours', 'Duration (hours)', 'number', 3, NULL, NULL, NULL),
  ('course_owner', 'Course Owner', 'user_picker', 4, NULL, NULL, NULL),
  ('mandatory', 'Mandatory', 'boolean', 5, NULL, NULL, NULL),
  ('max_class_size', 'Maximum Class Size', 'number', 6, NULL, NULL, NULL),
  ('learning_objectives', 'Learning Objectives', 'multi_line', 7, 'Learning Objectives', NULL, NULL),
  ('content_outline', 'Content Outline', 'table', 8, 'Content', '[{"value":"module","label":"Module"},{"value":"topics","label":"Topics"},{"value":"minutes","label":"Minutes"}]', NULL),
  ('prerequisites', 'Prerequisites', 'multi_line', 9, 'Prerequisites', NULL, NULL),
  ('assessment_method', 'Assessment', 'dropdown', 10, 'Prerequisites', '[{"value":"quiz","label":"Quiz"},{"value":"practical","label":"Practical exercise"},{"value":"observation","label":"Observed on the job"},{"value":"none","label":"None"}]', NULL),
  ('pass_mark', 'Pass Mark (%)', 'number', 11, 'Prerequisites', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 12, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000004e'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

-- ── Training Materials (fin_training_materials) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-00000000004f'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('material_reference', 'Reference', 'text', 0, NULL, NULL, NULL),
  ('course_code', 'Course', 'text', 1, NULL, NULL, NULL),
  ('material_type', 'Type', 'dropdown', 2, NULL, '[{"value":"slides","label":"Slides"},{"value":"manual","label":"User manual"},{"value":"quick_reference","label":"Quick reference card"},{"value":"exercise","label":"Exercise book"},{"value":"video","label":"Video"},{"value":"e_learning","label":"E-learning module"},{"value":"trainer_guide","label":"Trainer guide"}]', NULL),
  ('author', 'Author', 'user_picker', 3, NULL, NULL, NULL),
  ('version', 'Version', 'text', 4, 'Version & Review', NULL, NULL),
  ('due_date', 'Due Date', 'date', 5, 'Version & Review', NULL, NULL),
  ('reviewers', 'Reviewers', 'table', 6, 'Version & Review', '[{"value":"reviewer","label":"Reviewer"},{"value":"area","label":"Area"},{"value":"result","label":"Result","type":"select","options":["Approved","Changes requested","Pending"]},{"value":"date","label":"Date","type":"date"}]', NULL),
  ('approved_by', 'Approved By', 'user_picker', 7, 'Approval', NULL, NULL),
  ('approval_date', 'Approval Date', 'date', 8, 'Approval', NULL, NULL),
  ('published_location', 'Published Location', 'text', 9, 'Approval', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 10, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000004f'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

-- ── Trainers (fin_training_trainers) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000050'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('trainer_reference', 'Reference', 'text', 0, NULL, NULL, NULL),
  ('trainer_type', 'Trainer Type', 'dropdown', 1, NULL, '[{"value":"core_trainer","label":"Core trainer"},{"value":"super_user","label":"Super user trainer"},{"value":"vendor","label":"Vendor trainer"},{"value":"subject_expert","label":"Subject expert"}]', NULL),
  ('business_unit', 'Business Unit', 'dropdown', 2, NULL, '[{"value":"retail_branches","label":"Retail branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"business_banking","label":"Business banking"},{"value":"corporate_trade","label":"Corporate and trade finance"},{"value":"treasury","label":"Treasury"},{"value":"payments_operations","label":"Payments operations"},{"value":"card_operations","label":"Card operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"digital_channels","label":"Digital channels"},{"value":"it_operations","label":"IT operations"},{"value":"all_staff","label":"All staff"}]', NULL),
  ('location', 'Base Location', 'text', 3, NULL, NULL, NULL),
  ('courses_certified', 'Courses Certified', 'table', 4, 'Certification', '[{"value":"course","label":"Course"},{"value":"certified_on","label":"Certified On","type":"date"},{"value":"status","label":"Status","type":"select","options":["Certified","In training","Shadowing"]}]', NULL),
  ('ttt_complete', 'Train-the-Trainer Complete', 'boolean', 5, 'Certification', NULL, NULL),
  ('ttt_date', 'Train-the-Trainer Date', 'date', 6, 'Certification', NULL, NULL),
  ('available_from', 'Available From', 'date', 7, 'Availability', NULL, NULL),
  ('available_to', 'Available To', 'date', 8, 'Availability', NULL, NULL),
  ('days_per_week', 'Training Days per Week', 'number', 9, 'Availability', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 10, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000050'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

-- ── Training Sessions (fin_training_sessions) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000051'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('session_reference', 'Session Reference', 'text', 0, NULL, NULL, NULL),
  ('course_code', 'Course', 'text', 1, NULL, NULL, NULL),
  ('business_unit', 'Audience', 'dropdown', 2, NULL, '[{"value":"retail_branches","label":"Retail branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"business_banking","label":"Business banking"},{"value":"corporate_trade","label":"Corporate and trade finance"},{"value":"treasury","label":"Treasury"},{"value":"payments_operations","label":"Payments operations"},{"value":"card_operations","label":"Card operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"digital_channels","label":"Digital channels"},{"value":"it_operations","label":"IT operations"},{"value":"all_staff","label":"All staff"}]', NULL),
  ('delivery_method', 'Delivery Method', 'dropdown', 3, NULL, '[{"value":"classroom","label":"Classroom"},{"value":"virtual","label":"Virtual classroom"},{"value":"e_learning","label":"E-learning"},{"value":"on_the_job","label":"On the job"},{"value":"train_the_trainer","label":"Train the trainer"},{"value":"blended","label":"Blended"}]', NULL),
  ('trainer', 'Trainer', 'user_picker', 4, NULL, NULL, NULL),
  ('venue', 'Venue / Link', 'text', 5, NULL, NULL, NULL),
  ('start_at', 'Start', 'datetime', 6, 'Schedule', NULL, NULL),
  ('end_at', 'End', 'datetime', 7, 'Schedule', NULL, NULL),
  ('duration_minutes', 'Elapsed Time', 'number', 8, 'Schedule', NULL, '{"op":"minutes_between","start":"start_at","end":"end_at","display":"duration"}'),
  ('capacity', 'Capacity', 'number', 9, 'Enrolment', NULL, NULL),
  ('enrolled', 'Enrolled', 'number', 10, 'Enrolment', NULL, NULL),
  ('fill_rate', 'Fill Rate', 'number', 11, 'Enrolment', NULL, '{"op":"percent","numerator":"enrolled","denominator":"capacity","decimals":1,"display":"percent"}'),
  ('waiting_list', 'Waiting List', 'number', 12, 'Enrolment', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 13, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000051'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

-- ── Attendance & Assessment (fin_training_attendance) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000052'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('session_reference', 'Session', 'text', 0, NULL, NULL, NULL),
  ('course_code', 'Course', 'text', 1, NULL, NULL, NULL),
  ('session_date', 'Session Date', 'date', 2, NULL, NULL, NULL),
  ('trainer', 'Trainer', 'user_picker', 3, NULL, NULL, NULL),
  ('enrolled', 'Enrolled', 'number', 4, 'Attendance', NULL, NULL),
  ('attended', 'Attended', 'number', 5, 'Attendance', NULL, NULL),
  ('attendance_rate', 'Attendance Rate', 'number', 6, 'Attendance', NULL, '{"op":"percent","numerator":"attended","denominator":"enrolled","decimals":1,"display":"percent"}'),
  ('assessed', 'Assessed', 'number', 7, 'Assessment', NULL, NULL),
  ('passed', 'Passed', 'number', 8, 'Assessment', NULL, NULL),
  ('pass_rate', 'Pass Rate', 'number', 9, 'Assessment', NULL, '{"op":"percent","numerator":"passed","denominator":"assessed","decimals":1,"display":"percent"}'),
  ('average_score', 'Average Score (%)', 'number', 10, 'Assessment', NULL, NULL),
  ('follow_up', 'Follow-Up', 'table', 11, 'Follow-Up', '[{"value":"learner_group","label":"Learner / Group"},{"value":"reason","label":"Reason","type":"select","options":["Absent","Failed assessment","Needs practice"]},{"value":"action","label":"Action"},{"value":"due","label":"Due Date","type":"date"}]', NULL),
  ('notes', 'Notes', 'multi_line', 12, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000052'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

-- ── Training Environment (fin_training_environment) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000053'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('item_reference', 'Reference', 'text', 0, NULL, NULL, NULL),
  ('environment_name', 'Environment', 'text', 1, NULL, NULL, NULL),
  ('item_type', 'Item', 'dropdown', 2, NULL, '[{"value":"build","label":"Environment build"},{"value":"data","label":"Training data"},{"value":"users","label":"Training user IDs"},{"value":"refresh","label":"Data refresh"},{"value":"access","label":"Classroom access"},{"value":"devices","label":"Classroom devices"}]', NULL),
  ('owner', 'Owner', 'user_picker', 3, NULL, NULL, NULL),
  ('needed_by', 'Needed By', 'date', 4, NULL, NULL, NULL),
  ('ready_date', 'Ready Date', 'date', 5, NULL, NULL, NULL),
  ('training_users', 'Training User IDs', 'number', 6, 'Data & Users', NULL, NULL),
  ('data_set', 'Training Data Set', 'text', 7, 'Data & Users', NULL, NULL),
  ('refresh_frequency', 'Refresh Frequency', 'dropdown', 8, 'Data & Users', '[{"value":"before_each_session","label":"Before each session"},{"value":"daily","label":"Daily"},{"value":"weekly","label":"Weekly"},{"value":"on_request","label":"On request"}]', NULL),
  ('readiness_checks', 'Readiness Checks', 'table', 9, 'Checks', '[{"value":"check","label":"Check"},{"value":"owner","label":"Owner"},{"value":"status","label":"Status","type":"select","options":["Done","In progress","Not started","Not applicable"]},{"value":"due","label":"Due Date","type":"date"}]', NULL),
  ('issues', 'Issues', 'table', 10, 'Issues', '[{"value":"issue","label":"Issue"},{"value":"severity","label":"Severity","type":"select","options":["High","Medium","Low"]},{"value":"action","label":"Action"},{"value":"owner","label":"Owner"}]', NULL),
  ('notes', 'Notes', 'multi_line', 11, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000053'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

-- ── Training Effectiveness (fin_training_effectiveness) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000054'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('evaluation_reference', 'Reference', 'text', 0, NULL, NULL, NULL),
  ('course_code', 'Course', 'text', 1, NULL, NULL, NULL),
  ('business_unit', 'Audience', 'dropdown', 2, NULL, '[{"value":"retail_branches","label":"Retail branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"business_banking","label":"Business banking"},{"value":"corporate_trade","label":"Corporate and trade finance"},{"value":"treasury","label":"Treasury"},{"value":"payments_operations","label":"Payments operations"},{"value":"card_operations","label":"Card operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"digital_channels","label":"Digital channels"},{"value":"it_operations","label":"IT operations"},{"value":"all_staff","label":"All staff"}]', NULL),
  ('evaluation_point', 'When', 'dropdown', 3, NULL, '[{"value":"end_of_course","label":"End of course"},{"value":"before_go_live","label":"Before go-live"},{"value":"after_go_live","label":"After go-live (30 days)"}]', NULL),
  ('evaluation_date', 'Evaluation Date', 'date', 4, NULL, NULL, NULL),
  ('respondents', 'Respondents', 'number', 5, NULL, NULL, NULL),
  ('reaction', 'Reaction – Was the Training Useful? (1 = low, 5 = high)', 'number', 6, 'Scores', NULL, NULL),
  ('learning', 'Learning – Did They Learn It? (1 = low, 5 = high)', 'number', 7, 'Scores', NULL, NULL),
  ('behaviour', 'Behaviour – Do They Use It on the Job? (1 = low, 5 = high)', 'number', 8, 'Scores', NULL, NULL),
  ('results', 'Results – Better Business Outcomes? (1 = low, 5 = high)', 'number', 9, 'Scores', NULL, NULL),
  ('effectiveness_score', 'Effectiveness Score', 'number', 10, 'Scores', NULL, '{"op":"average","fields":["reaction","learning","behaviour","results"],"of":5,"decimals":1,"display":"percent"}'),
  ('findings', 'Findings', 'multi_line', 11, 'Findings & Actions', NULL, NULL),
  ('actions', 'Actions', 'table', 12, 'Findings & Actions', '[{"value":"action","label":"Action"},{"value":"owner","label":"Owner"},{"value":"due","label":"Due Date","type":"date"},{"value":"status","label":"Status","type":"select","options":["Open","Done"]}]', NULL),
  ('notes', 'Notes', 'multi_line', 13, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000054'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

-- ── Training Sign-Off (fin_training_sign_off) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000055'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('signoff_reference', 'Sign-Off Reference', 'text', 0, NULL, NULL, NULL),
  ('signoff_type', 'Sign-Off Type', 'dropdown', 1, NULL, '[{"value":"strategy","label":"Training strategy approval"},{"value":"curriculum","label":"Curriculum approval"},{"value":"materials","label":"Materials approval"},{"value":"trainers_ready","label":"Trainers ready"},{"value":"unit_completion","label":"Business unit training complete"},{"value":"overall","label":"Overall training readiness"}]', NULL),
  ('business_unit', 'Business Unit', 'dropdown', 2, NULL, '[{"value":"retail_branches","label":"Retail branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"business_banking","label":"Business banking"},{"value":"corporate_trade","label":"Corporate and trade finance"},{"value":"treasury","label":"Treasury"},{"value":"payments_operations","label":"Payments operations"},{"value":"card_operations","label":"Card operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"digital_channels","label":"Digital channels"},{"value":"it_operations","label":"IT operations"},{"value":"all_staff","label":"All staff"}]', NULL),
  ('signoff_owner', 'Sign-Off Coordinator', 'user_picker', 3, NULL, NULL, NULL),
  ('requested_date', 'Requested Date', 'date', 4, NULL, NULL, NULL),
  ('due_date', 'Due Date', 'date', 5, NULL, NULL, NULL),
  ('approvers', 'Approvers', 'table', 6, 'Approvers', '[{"value":"department","label":"Department"},{"value":"name","label":"Name"},{"value":"role","label":"Role"},{"value":"decision","label":"Decision","type":"select","options":["Approved","Approved with conditions","Rejected","Pending"]},{"value":"date","label":"Date","type":"date"}]', NULL),
  ('evidence_reviewed', 'Evidence Reviewed', 'table', 7, 'Evidence', '[{"value":"evidence","label":"Evidence"},{"value":"reference","label":"Reference"}]', NULL),
  ('staff_targeted', 'Staff Targeted', 'number', 8, 'Evidence', NULL, NULL),
  ('staff_trained', 'Staff Trained', 'number', 9, 'Evidence', NULL, NULL),
  ('completion', 'Completion', 'number', 10, 'Evidence', NULL, '{"op":"percent","numerator":"staff_trained","denominator":"staff_targeted","decimals":1,"display":"percent"}'),
  ('conditions', 'Conditions / Caveats', 'multi_line', 11, 'Evidence', NULL, NULL),
  ('decision', 'Decision', 'dropdown', 12, 'Decision', '[{"value":"approved","label":"Approved"},{"value":"approved_with_conditions","label":"Approved with conditions"},{"value":"rejected","label":"Rejected"},{"value":"pending","label":"Pending"}]', NULL),
  ('decision_date', 'Decision Date', 'date', 13, 'Decision', NULL, NULL),
  ('decision_comments', 'Decision Comments', 'multi_line', 14, 'Decision', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 15, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000055'::uuid)
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
WHERE lr.id IN ('00000000-0000-4000-9001-00000000004c'::uuid, '00000000-0000-4000-9001-00000000004d'::uuid, '00000000-0000-4000-9001-00000000004e'::uuid, '00000000-0000-4000-9001-00000000004f'::uuid, '00000000-0000-4000-9001-000000000050'::uuid, '00000000-0000-4000-9001-000000000051'::uuid, '00000000-0000-4000-9001-000000000052'::uuid, '00000000-0000-4000-9001-000000000053'::uuid, '00000000-0000-4000-9001-000000000054'::uuid, '00000000-0000-4000-9001-000000000055'::uuid)
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

-- ── 5. Register menu items under their section ──
INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
                               methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'fin_reg_' || lr.register_key, lr.label, lr.description,
       '/platform/local-registers/' || lr.id::text,
       (SELECT id FROM public.menu_items WHERE menu_code = v.category AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, v.sort_order, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('00000000-0000-4000-9001-00000000004c', 'fin_cat_training', 730),
  ('00000000-0000-4000-9001-00000000004d', 'fin_cat_training', 731),
  ('00000000-0000-4000-9001-00000000004e', 'fin_cat_training', 732),
  ('00000000-0000-4000-9001-00000000004f', 'fin_cat_training', 733),
  ('00000000-0000-4000-9001-000000000050', 'fin_cat_training', 734),
  ('00000000-0000-4000-9001-000000000051', 'fin_cat_training', 735),
  ('00000000-0000-4000-9001-000000000052', 'fin_cat_training', 736),
  ('00000000-0000-4000-9001-000000000053', 'fin_cat_training', 737),
  ('00000000-0000-4000-9001-000000000054', 'fin_cat_training', 738),
  ('00000000-0000-4000-9001-000000000055', 'fin_cat_training', 739)
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
    AND menu_code IN ('fin_cat_training', 'fin_reg_fin_training_strategy', 'fin_reg_fin_training_needs', 'fin_reg_fin_training_curriculum', 'fin_reg_fin_training_materials', 'fin_reg_fin_training_trainers', 'fin_reg_fin_training_sessions', 'fin_reg_fin_training_attendance', 'fin_reg_fin_training_environment', 'fin_reg_fin_training_effectiveness', 'fin_reg_fin_training_sign_off')
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
WHERE lr.id IN ('00000000-0000-4000-9001-00000000004c'::uuid, '00000000-0000-4000-9001-00000000004d'::uuid, '00000000-0000-4000-9001-00000000004e'::uuid, '00000000-0000-4000-9001-00000000004f'::uuid, '00000000-0000-4000-9001-000000000050'::uuid, '00000000-0000-4000-9001-000000000051'::uuid, '00000000-0000-4000-9001-000000000052'::uuid, '00000000-0000-4000-9001-000000000053'::uuid, '00000000-0000-4000-9001-000000000054'::uuid, '00000000-0000-4000-9001-000000000055'::uuid)
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

COMMIT;

-- Check: menus and how many roles can see each.
SELECT mi.menu_level, mi.sort_order, mi.menu_code, mi.menu_label,
       (SELECT count(*) FROM public.role_menu_items rmi WHERE rmi.menu_item_id = mi.id AND rmi.can_view AND rmi.is_active) AS roles
FROM public.menu_items mi
WHERE mi.menu_code IN ('fin_cat_training', 'fin_reg_fin_training_strategy', 'fin_reg_fin_training_needs', 'fin_reg_fin_training_curriculum', 'fin_reg_fin_training_materials', 'fin_reg_fin_training_trainers', 'fin_reg_fin_training_sessions', 'fin_reg_fin_training_attendance', 'fin_reg_fin_training_environment', 'fin_reg_fin_training_effectiveness', 'fin_reg_fin_training_sign_off')
ORDER BY mi.menu_level, mi.sort_order;

-- Check: fields and tabs per register.
SELECT r.register_key, count(f.*) AS fields, count(DISTINCT COALESCE(f.field_group, 'Details')) AS tabs,
       count(*) FILTER (WHERE f.field_type = 'table') AS table_fields,
       count(*) FILTER (WHERE f.calculation IS NOT NULL) AS calculated_fields
FROM public.local_registers r JOIN public.local_register_fields f ON f.register_id = r.id
WHERE r.id IN ('00000000-0000-4000-9001-00000000004c'::uuid, '00000000-0000-4000-9001-00000000004d'::uuid, '00000000-0000-4000-9001-00000000004e'::uuid, '00000000-0000-4000-9001-00000000004f'::uuid, '00000000-0000-4000-9001-000000000050'::uuid, '00000000-0000-4000-9001-000000000051'::uuid, '00000000-0000-4000-9001-000000000052'::uuid, '00000000-0000-4000-9001-000000000053'::uuid, '00000000-0000-4000-9001-000000000054'::uuid, '00000000-0000-4000-9001-000000000055'::uuid)
GROUP BY r.register_key ORDER BY r.register_key;
