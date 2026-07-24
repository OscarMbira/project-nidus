-- =============================================================================
-- v786: Platform + Simulator Structured/Agile form template field completeness
-- Plan: projectplan/v786_platform_sim_methodology_form_seed_parity_plan.md
-- Source: Admin GTL seeds v189*/v191* (parsed by scripts/generate-v786-platform-sim-form-seeds.js)
-- Idempotent: ON CONFLICT (template_code) + new current version row
-- Prerequisites: form_templates / form_template_versions (public + sim)
-- =============================================================================

-- public.form_templates + versions

INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-SU-MANDATE-01', 'Project Mandate (Structured)', 'starting_up', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-SU-MANDATE-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-SU-MANDATE-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Project Mandate","sections":[{"key":"general","title":"General","fields":[{"key":"project_title","label":"Project title","type":"text","required":false},{"key":"document_date","label":"Document date","type":"date","required":false},{"key":"author","label":"Author","type":"text","required":false},{"key":"client_or_customer","label":"Client / customer","type":"text","required":false},{"key":"purpose","label":"Purpose","type":"textarea","required":false},{"key":"background","label":"Background","type":"textarea","required":false},{"key":"project_objectives","label":"Project objectives","type":"textarea","required":false},{"key":"project_scope","label":"Project scope","type":"textarea","required":false},{"key":"constraints","label":"Constraints","type":"textarea","required":false},{"key":"assumptions","label":"Assumptions","type":"textarea","required":false},{"key":"outline_business_case","label":"Outline business case","type":"textarea","required":false},{"key":"customer_quality_expectations","label":"Customer quality expectations","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-SU-BRIEF-01', 'Project Brief (Structured)', 'starting_up', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-SU-BRIEF-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-SU-BRIEF-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Project Brief","sections":[{"key":"general","title":"General","fields":[{"key":"project_definition","label":"Project definition","type":"textarea","required":false},{"key":"project_approach","label":"Project approach","type":"textarea","required":false},{"key":"business_case","label":"Business case","type":"textarea","required":false},{"key":"project_product_description","label":"Project product description","type":"textarea","required":false},{"key":"project_plan","label":"Project plan","type":"textarea","required":false},{"key":"project_management_team_structure","label":"Project management team structure","type":"textarea","required":false},{"key":"references","label":"References to other information","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-SU-DLOG-01', 'Daily Log (Structured)', 'starting_up', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-SU-DLOG-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-SU-DLOG-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Daily Log","sections":[{"key":"general","title":"General","fields":[{"key":"log_date","label":"Log date","type":"date","required":false},{"key":"entry_type","label":"Entry type","type":"select","required":false,"options":[{"value":"event","label":"Event"},{"value":"decision","label":"Decision"},{"value":"issue","label":"Issue"},{"value":"risk","label":"Risk"},{"value":"note","label":"Note"}]},{"key":"description","label":"Description","type":"textarea","required":false},{"key":"raised_by","label":"Raised by","type":"text","required":false},{"key":"follow_up_action","label":"Follow-up action","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-SU-LLOG-01', 'Lessons Log (Structured)', 'starting_up', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-SU-LLOG-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-SU-LLOG-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Lessons Log","sections":[{"key":"general","title":"General","fields":[{"key":"lesson_date","label":"Lesson date","type":"date","required":false},{"key":"category","label":"Category","type":"select","required":false,"options":[{"value":"process","label":"Process"},{"value":"product","label":"Product"},{"value":"resource","label":"Resource"},{"value":"stakeholder","label":"Stakeholder"},{"value":"other","label":"Other"}]},{"key":"description","label":"Description of lesson","type":"textarea","required":false},{"key":"effect_on_project","label":"Effect on project","type":"textarea","required":false},{"key":"recommendations","label":"Recommendations","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-DIR-01', 'Project Board Agenda (Structured)', 'directing', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-DIR-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-DIR-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Project Board Agenda","sections":[{"key":"general","title":"General","fields":[{"key":"meeting_date","label":"Meeting date","type":"date","required":false},{"key":"attendees","label":"Attendees","type":"textarea","required":false},{"key":"previous_minutes","label":"Previous minutes","type":"textarea","required":false},{"key":"decisions_required","label":"Decisions required","type":"textarea","required":false},{"key":"progress_report","label":"Progress report","type":"textarea","required":false},{"key":"issues","label":"Issues","type":"textarea","required":false},{"key":"risks","label":"Risks","type":"textarea","required":false},{"key":"any_other_business","label":"Any other business","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-DIR-HL-01', 'Highlight Report (Structured)', 'directing', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-DIR-HL-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-DIR-HL-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Highlight Report","sections":[{"key":"general","title":"General","fields":[{"key":"report_date","label":"Report date","type":"date","required":false},{"key":"period_covered","label":"Period covered","type":"text","required":false},{"key":"summary_status","label":"Summary status","type":"select","required":false,"options":[{"value":"green","label":"Green — on track"},{"value":"amber","label":"Amber — at risk"},{"value":"red","label":"Red — off track"}]},{"key":"achievements_this_period","label":"Achievements this period","type":"textarea","required":false},{"key":"work_planned_next_period","label":"Work planned next period","type":"textarea","required":false},{"key":"products_status","label":"Products status","type":"textarea","required":false},{"key":"issues_summary","label":"Issues summary","type":"textarea","required":false},{"key":"risks_summary","label":"Risks summary","type":"textarea","required":false},{"key":"forecast_completion","label":"Forecast completion","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-IP-PID-01', 'Project Initiation Document (Structured)', 'initiating', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-IP-PID-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-IP-PID-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Project Initiation Document","sections":[{"key":"general","title":"General","fields":[{"key":"project_definition","label":"Project definition","type":"textarea","required":false},{"key":"business_case_summary","label":"Business case summary","type":"textarea","required":false},{"key":"project_organisation","label":"Project organisation","type":"textarea","required":false},{"key":"quality_management_approach_ref","label":"Quality management approach (reference)","type":"textarea","required":false},{"key":"risk_management_approach_ref","label":"Risk management approach (reference)","type":"textarea","required":false},{"key":"configuration_management_approach_ref","label":"Configuration management approach (reference)","type":"textarea","required":false},{"key":"communication_management_approach_ref","label":"Communication management approach (reference)","type":"textarea","required":false},{"key":"project_plan_summary","label":"Project plan summary","type":"textarea","required":false},{"key":"project_controls","label":"Project controls","type":"textarea","required":false},{"key":"tolerances","label":"Tolerances","type":"textarea","required":false},{"key":"constraints","label":"Constraints","type":"textarea","required":false},{"key":"assumptions","label":"Assumptions","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-IP-BC-01', 'Business Case (Structured)', 'initiating', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-IP-BC-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-IP-BC-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Business Case","sections":[{"key":"general","title":"General","fields":[{"key":"reasons","label":"Reasons","type":"textarea","required":false},{"key":"business_options","label":"Business options","type":"textarea","required":false},{"key":"expected_benefits","label":"Expected benefits","type":"textarea","required":false},{"key":"expected_disbenefits","label":"Expected dis-benefits","type":"textarea","required":false},{"key":"timescale","label":"Timescale","type":"textarea","required":false},{"key":"costs","label":"Costs","type":"money","required":false},{"key":"investment_appraisal","label":"Investment appraisal","type":"textarea","required":false},{"key":"major_risks","label":"Major risks","type":"textarea","required":false},{"key":"recommendation","label":"Recommendation","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-IP-BRP-01', 'Benefits Review Plan (Structured)', 'initiating', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-IP-BRP-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-IP-BRP-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Benefits Review Plan","sections":[{"key":"general","title":"General","fields":[{"key":"scope_of_review","label":"Scope of review","type":"textarea","required":false},{"key":"benefits_to_be_measured","label":"Benefits to be measured","type":"textarea","required":false},{"key":"measurement_approach","label":"Measurement approach","type":"textarea","required":false},{"key":"resources_required","label":"Resources required","type":"textarea","required":false},{"key":"review_schedule","label":"Review schedule","type":"textarea","required":false},{"key":"roles_and_responsibilities","label":"Roles and responsibilities","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-IP-PPD-01', 'Project Product Description (Structured)', 'initiating', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-IP-PPD-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-IP-PPD-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Project Product Description","sections":[{"key":"general","title":"General","fields":[{"key":"purpose","label":"Purpose","type":"textarea","required":false},{"key":"composition","label":"Composition","type":"textarea","required":false},{"key":"derivation","label":"Derivation","type":"textarea","required":false},{"key":"format_and_presentation","label":"Format and presentation","type":"textarea","required":false},{"key":"quality_criteria","label":"Quality criteria","type":"textarea","required":false},{"key":"quality_tolerance","label":"Quality tolerance","type":"textarea","required":false},{"key":"quality_method","label":"Quality method","type":"textarea","required":false},{"key":"quality_responsibility","label":"Quality responsibility","type":"text","required":false},{"key":"product_quality_review","label":"Product quality review","type":"textarea","required":false},{"key":"acceptance_criteria","label":"Acceptance criteria","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-IP-PLAN-01', 'Plan — Project / Stage / Team (Structured)', 'initiating', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-IP-PLAN-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-IP-PLAN-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Plan","sections":[{"key":"general","title":"General","fields":[{"key":"plan_type","label":"Plan type","type":"select","required":false,"options":[{"value":"project","label":"Project plan"},{"value":"stage","label":"Stage plan"},{"value":"team","label":"Team plan"}]},{"key":"plan_description","label":"Plan description","type":"textarea","required":false},{"key":"product_breakdown_structure","label":"Product breakdown structure","type":"textarea","required":false},{"key":"product_descriptions","label":"Product descriptions","type":"textarea","required":false},{"key":"product_flow_diagram","label":"Product flow diagram","type":"textarea","required":false},{"key":"schedule","label":"Schedule","type":"textarea","required":false},{"key":"milestones","label":"Milestones","type":"textarea","required":false},{"key":"resources","label":"Resources","type":"textarea","required":false},{"key":"dependencies","label":"Dependencies","type":"textarea","required":false},{"key":"monitoring_and_control","label":"Monitoring and control","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-CS-CIR-01', 'Configuration Item Record (Structured)', 'controlling_a_stage', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-CS-CIR-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-CS-CIR-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Configuration Item Record","sections":[{"key":"general","title":"General","fields":[{"key":"item_identifier","label":"Item identifier","type":"text","required":false},{"key":"item_title","label":"Item title","type":"text","required":false},{"key":"item_type","label":"Item type","type":"select","required":false,"options":[{"value":"product","label":"Product"},{"value":"document","label":"Document"},{"value":"baseline","label":"Baseline"},{"value":"component","label":"Component"},{"value":"other","label":"Other"}]},{"key":"version","label":"Version","type":"text","required":false},{"key":"status","label":"Status","type":"select","required":false,"options":[{"value":"draft","label":"Draft"},{"value":"under_review","label":"Under review"},{"value":"approved","label":"Approved"},{"value":"superseded","label":"Superseded"},{"value":"archived","label":"Archived"}]},{"key":"location","label":"Location","type":"text","required":false},{"key":"owner","label":"Owner","type":"text","required":false},{"key":"date_created","label":"Date created","type":"date","required":false},{"key":"date_modified","label":"Date modified","type":"date","required":false},{"key":"source","label":"Source","type":"text","required":false},{"key":"related_products","label":"Related products","type":"textarea","required":false},{"key":"related_issues","label":"Related issues","type":"textarea","required":false},{"key":"related_change_requests","label":"Related change requests","type":"textarea","required":false},{"key":"description","label":"Description","type":"textarea","required":false},{"key":"specification_reference","label":"Specification reference","type":"text","required":false},{"key":"quality_records","label":"Quality records","type":"textarea","required":false},{"key":"verification_status","label":"Verification status","type":"select","required":false,"options":[{"value":"not_started","label":"Not started"},{"value":"in_progress","label":"In progress"},{"value":"verified","label":"Verified"},{"value":"failed","label":"Failed"}]},{"key":"release_status","label":"Release status","type":"select","required":false,"options":[{"value":"not_released","label":"Not released"},{"value":"released","label":"Released"},{"value":"withdrawn","label":"Withdrawn"}]},{"key":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-CS-ISSREG-01', 'Issue Register (Structured)', 'controlling_a_stage', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-CS-ISSREG-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-CS-ISSREG-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Issue Register","sections":[{"key":"general","title":"General","fields":[{"key":"issue_identifier","label":"Issue identifier","type":"text","required":false},{"key":"issue_date","label":"Issue date","type":"date","required":false},{"key":"raised_by","label":"Raised by","type":"text","required":false},{"key":"issue_type","label":"Issue type","type":"select","required":false,"options":[{"value":"request_for_change","label":"Request for change"},{"value":"off_specification","label":"Off-specification"},{"value":"problem_concern","label":"Problem / concern"},{"value":"external_event","label":"External event"}]},{"key":"priority","label":"Priority","type":"select","required":false,"options":[{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]},{"key":"status","label":"Status","type":"select","required":false,"options":[{"value":"open","label":"Open"},{"value":"in_progress","label":"In progress"},{"value":"resolved","label":"Resolved"},{"value":"closed","label":"Closed"}]},{"key":"description","label":"Description","type":"textarea","required":false},{"key":"impact","label":"Impact","type":"textarea","required":false},{"key":"action_owner","label":"Action owner","type":"text","required":false},{"key":"date_resolved","label":"Date resolved","type":"date","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-CS-ISSREP-01', 'Issue Report (Structured)', 'controlling_a_stage', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-CS-ISSREP-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-CS-ISSREP-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Issue Report","sections":[{"key":"general","title":"General","fields":[{"key":"issue_identifier","label":"Issue identifier","type":"text","required":false},{"key":"issue_date","label":"Issue date","type":"date","required":false},{"key":"raised_by","label":"Raised by","type":"text","required":false},{"key":"issue_type","label":"Issue type","type":"select","required":false,"options":[{"value":"request_for_change","label":"Request for change"},{"value":"off_specification","label":"Off-specification"},{"value":"problem_concern","label":"Problem / concern"},{"value":"external_event","label":"External event"}]},{"key":"priority","label":"Priority","type":"select","required":false,"options":[{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]},{"key":"status","label":"Status","type":"select","required":false,"options":[{"value":"open","label":"Open"},{"value":"under_review","label":"Under review"},{"value":"decision_pending","label":"Decision pending"},{"value":"closed","label":"Closed"}]},{"key":"description","label":"Description","type":"textarea","required":false},{"key":"impact_assessment","label":"Impact assessment","type":"textarea","required":false},{"key":"recommendation","label":"Recommendation","type":"textarea","required":false},{"key":"decision_required","label":"Decision required","type":"textarea","required":false},{"key":"options_considered","label":"Options considered","type":"textarea","required":false},{"key":"decision","label":"Decision","type":"textarea","required":false},{"key":"action_owner","label":"Action owner","type":"text","required":false},{"key":"follow_up_date","label":"Follow-up date","type":"date","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-CS-PSA-01', 'Product Status Account (Structured)', 'controlling_a_stage', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-CS-PSA-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-CS-PSA-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Product Status Account","sections":[{"key":"general","title":"General","fields":[{"key":"product_name","label":"Product name","type":"text","required":false},{"key":"product_status","label":"Product status","type":"select","required":false,"options":[{"value":"not_started","label":"Not started"},{"value":"in_progress","label":"In progress"},{"value":"completed","label":"Completed"},{"value":"approved","label":"Approved"},{"value":"handed_over","label":"Handed over"}]},{"key":"status_commentary","label":"Status commentary","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-CS-QREG-01', 'Quality Register (Structured)', 'controlling_a_stage', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-CS-QREG-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-CS-QREG-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Quality Register","sections":[{"key":"general","title":"General","fields":[{"key":"quality_identifier","label":"Quality identifier","type":"text","required":false},{"key":"product_name","label":"Product name","type":"text","required":false},{"key":"quality_method","label":"Quality method","type":"text","required":false},{"key":"planned_date","label":"Planned date","type":"date","required":false},{"key":"actual_date","label":"Actual date","type":"date","required":false},{"key":"quality_responsible","label":"Quality responsible","type":"text","required":false},{"key":"quality_result","label":"Quality result","type":"select","required":false,"options":[{"value":"pass","label":"Pass"},{"value":"pass_with_concessions","label":"Pass with concessions"},{"value":"fail","label":"Fail"},{"value":"not_applicable","label":"Not applicable"}]},{"key":"quality_records_location","label":"Quality records location","type":"text","required":false},{"key":"follow_up_required","label":"Follow-up required","type":"checkbox","required":false},{"key":"follow_up_action","label":"Follow-up action","type":"textarea","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-CS-RREG-01', 'Risk Register (Structured)', 'controlling_a_stage', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-CS-RREG-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-CS-RREG-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Risk Register","sections":[{"key":"general","title":"General","fields":[{"key":"risk_identifier","label":"Risk identifier","type":"text","required":false},{"key":"date_identified","label":"Date identified","type":"date","required":false},{"key":"risk_category","label":"Risk category","type":"select","required":false,"options":[{"value":"business","label":"Business"},{"value":"technical","label":"Technical"},{"value":"resource","label":"Resource"},{"value":"schedule","label":"Schedule"},{"value":"cost","label":"Cost"},{"value":"external","label":"External"}]},{"key":"risk_description","label":"Risk description","type":"textarea","required":false},{"key":"risk_status","label":"Risk status","type":"select","required":false,"options":[{"value":"open","label":"Open"},{"value":"mitigating","label":"Mitigating"},{"value":"closed","label":"Closed"}]},{"key":"risk_owner","label":"Risk owner","type":"text","required":false},{"key":"risk_response","label":"Risk response","type":"textarea","required":false},{"key":"probability_pre","label":"Probability (pre-response)","type":"select","required":false,"options":[{"value":"1","label":"1 — Very low"},{"value":"2","label":"2 — Low"},{"value":"3","label":"3 — Medium"},{"value":"4","label":"4 — High"},{"value":"5","label":"5 — Very high"}]},{"key":"impact_pre","label":"Impact (pre-response)","type":"select","required":false,"options":[{"value":"1","label":"1 — Very low"},{"value":"2","label":"2 — Low"},{"value":"3","label":"3 — Medium"},{"value":"4","label":"4 — High"},{"value":"5","label":"5 — Very high"}]},{"key":"expected_value_pre","label":"Expected value (pre-response)","type":"number","required":false},{"key":"probability_post","label":"Probability (post-response)","type":"select","required":false,"options":[{"value":"1","label":"1 — Very low"},{"value":"2","label":"2 — Low"},{"value":"3","label":"3 — Medium"},{"value":"4","label":"4 — High"},{"value":"5","label":"5 — Very high"}]},{"key":"impact_post","label":"Impact (post-response)","type":"select","required":false,"options":[{"value":"1","label":"1 — Very low"},{"value":"2","label":"2 — Low"},{"value":"3","label":"3 — Medium"},{"value":"4","label":"4 — High"},{"value":"5","label":"5 — Very high"}]},{"key":"expected_value_post","label":"Expected value (post-response)","type":"number","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-CS-EXC-01', 'Exception Report (Structured)', 'controlling_a_stage', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-CS-EXC-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-CS-EXC-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Exception Report","sections":[{"key":"general","title":"General","fields":[{"key":"exception_date","label":"Exception date","type":"date","required":false},{"key":"stage_or_project","label":"Stage / project","type":"text","required":false},{"key":"description_of_exception","label":"Description of exception","type":"textarea","required":false},{"key":"cause","label":"Cause","type":"textarea","required":false},{"key":"impact","label":"Impact","type":"textarea","required":false},{"key":"recommended_options","label":"Recommended options","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-MPD-CHK-01', 'Checkpoint Report (Structured)', 'managing_product_delivery', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-MPD-CHK-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-MPD-CHK-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Checkpoint Report","sections":[{"key":"general","title":"General","fields":[{"key":"checkpoint_date","label":"Checkpoint date","type":"date","required":false},{"key":"work_package_reference","label":"Work package reference","type":"text","required":false},{"key":"products_completed","label":"Products completed","type":"textarea","required":false},{"key":"products_planned","label":"Products planned","type":"textarea","required":false},{"key":"quality_activities","label":"Quality activities","type":"textarea","required":false},{"key":"follow_on_actions","label":"Follow-on actions","type":"textarea","required":false},{"key":"checkpoint_status","label":"Checkpoint status","type":"select","required":false,"options":[{"value":"on_track","label":"On track"},{"value":"at_risk","label":"At risk"},{"value":"blocked","label":"Blocked"}]}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-MPD-PD-01', 'Product Description (Structured)', 'managing_product_delivery', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-MPD-PD-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-MPD-PD-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Product Description","sections":[{"key":"general","title":"General","fields":[{"key":"product_identifier","label":"Product identifier","type":"text","required":false},{"key":"product_title","label":"Product title","type":"text","required":false},{"key":"purpose","label":"Purpose","type":"textarea","required":false},{"key":"composition","label":"Composition","type":"textarea","required":false},{"key":"derivation","label":"Derivation","type":"textarea","required":false},{"key":"format_and_presentation","label":"Format and presentation","type":"textarea","required":false},{"key":"quality_criteria","label":"Quality criteria","type":"textarea","required":false},{"key":"quality_tolerance","label":"Quality tolerance","type":"textarea","required":false},{"key":"quality_method","label":"Quality method","type":"textarea","required":false},{"key":"quality_responsibility","label":"Quality responsibility","type":"text","required":false},{"key":"product_quality_review","label":"Product quality review","type":"textarea","required":false},{"key":"acceptance_criteria","label":"Acceptance criteria","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-MPD-WP-01', 'Work Package (Structured)', 'managing_product_delivery', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-MPD-WP-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-MPD-WP-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Work Package","sections":[{"key":"general","title":"General","fields":[{"key":"work_package_identifier","label":"Work package identifier","type":"text","required":false},{"key":"work_package_title","label":"Work package title","type":"text","required":false},{"key":"work_package_description","label":"Work package description","type":"textarea","required":false},{"key":"products_to_be_delivered","label":"Products to be delivered","type":"textarea","required":false},{"key":"product_descriptions_reference","label":"Product descriptions (reference)","type":"textarea","required":false},{"key":"techniques_and_procedures","label":"Techniques and procedures","type":"textarea","required":false},{"key":"required_approach","label":"Required approach","type":"textarea","required":false},{"key":"change_authority","label":"Change authority","type":"text","required":false},{"key":"constraints","label":"Constraints","type":"textarea","required":false},{"key":"agreement_date","label":"Agreement date","type":"date","required":false},{"key":"start_date","label":"Start date","type":"date","required":false},{"key":"end_date","label":"End date","type":"date","required":false},{"key":"acceptance_criteria","label":"Acceptance criteria","type":"textarea","required":false},{"key":"quality_requirements","label":"Quality requirements","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-SB-ESR-01', 'End Stage Report (Structured)', 'managing_a_stage_boundary', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-SB-ESR-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-SB-ESR-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"End Stage Report","sections":[{"key":"general","title":"General","fields":[{"key":"stage_name","label":"Stage name","type":"text","required":false},{"key":"period_covered","label":"Period covered","type":"text","required":false},{"key":"achievements","label":"Achievements","type":"textarea","required":false},{"key":"products_completed","label":"Products completed","type":"textarea","required":false},{"key":"products_not_completed","label":"Products not completed","type":"textarea","required":false},{"key":"quality_activities_summary","label":"Quality activities summary","type":"textarea","required":false},{"key":"follow_on_actions","label":"Follow-on actions","type":"textarea","required":false},{"key":"lessons_identified","label":"Lessons identified","type":"textarea","required":false},{"key":"next_stage_overview","label":"Next stage overview","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-SB-LR-01', 'Lessons Report (Structured)', 'managing_a_stage_boundary', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-SB-LR-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-SB-LR-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Lessons Report","sections":[{"key":"general","title":"General","fields":[{"key":"report_date","label":"Report date","type":"date","required":false},{"key":"stage_or_project","label":"Stage / project","type":"text","required":false},{"key":"lessons_summary","label":"Lessons summary","type":"textarea","required":false},{"key":"recommendations","label":"Recommendations","type":"textarea","required":false},{"key":"follow_up_actions","label":"Follow-up actions","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-CP-EPR-01', 'End Project Report (Structured)', 'closing', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FS-CP-EPR-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-CP-EPR-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"End Project Report","sections":[{"key":"general","title":"General","fields":[{"key":"project_overview","label":"Project overview","type":"textarea","required":false},{"key":"performance_against_business_case","label":"Performance against business case","type":"textarea","required":false},{"key":"performance_against_objectives","label":"Performance against objectives","type":"textarea","required":false},{"key":"review_of_products","label":"Review of products","type":"textarea","required":false},{"key":"lessons_summary","label":"Lessons summary","type":"textarea","required":false},{"key":"follow_on_recommendations","label":"Follow-on recommendations","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-BL-01', 'Product Backlog Item Card (Agile)', 'backlog', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FA-BL-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-BL-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Backlog Item","sections":[{"key":"general","title":"General","fields":[{"key":"item_id","label":"Item ID","type":"text","required":false,"help":"Unique backlog identifier","sample":"PBI-1042"},{"key":"title","label":"Title","type":"text","required":false,"help":"Short outcome-oriented title","sample":"As a user I can reset my password"},{"key":"item_type","label":"Item type","type":"select","required":false,"options":[{"value":"story","label":"Story"},{"value":"bug","label":"Bug"},{"value":"spike","label":"Spike"},{"value":"enabler","label":"Enabler"},{"value":"chore","label":"Chore"}]},{"key":"description","label":"Description","type":"textarea","required":false,"help":"Context and intent for the item"},{"key":"persona_or_value","label":"Persona / business value","type":"textarea","required":false},{"key":"acceptance_criteria","label":"Acceptance criteria","type":"textarea","required":false,"help":"Testable conditions for done","sample":"Given… When… Then…"},{"key":"priority","label":"Priority","type":"select","required":false,"options":[{"value":"must","label":"Must"},{"value":"should","label":"Should"},{"value":"could","label":"Could"},{"value":"wont","label":"Won''t"}]},{"key":"estimate_points","label":"Estimate (points)","type":"number","required":false},{"key":"status","label":"Status","type":"select","required":false,"options":[{"value":"new","label":"New"},{"value":"refined","label":"Refined"},{"value":"ready","label":"Ready"},{"value":"in_sprint","label":"In sprint"},{"value":"done","label":"Done"},{"value":"blocked","label":"Blocked"}]},{"key":"sprint_assignment","label":"Sprint assignment","type":"text","required":false},{"key":"dependencies","label":"Dependencies","type":"textarea","required":false},{"key":"risks_or_notes","label":"Risks / notes","type":"textarea","required":false},{"key":"owner","label":"Owner","type":"text","required":false,"sample":"Product Owner"},{"key":"definition_of_ready_met","label":"Definition of Ready met","type":"checkbox","required":false,"help":"Tick when item meets team DoR"},{"key":"tags","label":"Tags / themes","type":"text","required":false},{"key":"created_date","label":"Created date","type":"date","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-BL-EPIC-01', 'Epic / Feature Brief (Agile)', 'backlog', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FA-BL-EPIC-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-BL-EPIC-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Epic / Feature Brief","sections":[{"key":"general","title":"General","fields":[{"key":"epic_id","label":"Epic ID","type":"text","required":false,"sample":"EPIC-12"},{"key":"title","label":"Title","type":"text","required":false},{"key":"desired_outcome","label":"Desired outcome","type":"textarea","required":false},{"key":"success_metrics","label":"Success metrics","type":"textarea","required":false},{"key":"child_themes","label":"Child themes / stories","type":"textarea","required":false},{"key":"mvp_scope","label":"MVP scope","type":"textarea","required":false},{"key":"out_of_scope","label":"Out of scope","type":"textarea","required":false},{"key":"risks","label":"Risks","type":"textarea","required":false},{"key":"owner","label":"Owner","type":"text","required":false},{"key":"status","label":"Status","type":"select","required":false,"options":[{"value":"draft","label":"Draft"},{"value":"active","label":"Active"},{"value":"done","label":"Done"},{"value":"parked","label":"Parked"}]},{"key":"target_release","label":"Target release","type":"text","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-BL-SPIKE-01', 'Spike / Research Item (Agile)', 'backlog', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FA-BL-SPIKE-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-BL-SPIKE-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Spike / Research Item","sections":[{"key":"general","title":"General","fields":[{"key":"spike_id","label":"Spike ID","type":"text","required":false},{"key":"title","label":"Title","type":"text","required":false},{"key":"research_question","label":"Research question","type":"textarea","required":false,"help":"What decision will this spike unlock?"},{"key":"time_box","label":"Time-box","type":"text","required":false,"sample":"2 days"},{"key":"findings","label":"Findings","type":"textarea","required":false},{"key":"recommendation","label":"Recommendation","type":"textarea","required":false},{"key":"follow_on_stories","label":"Follow-on stories","type":"textarea","required":false},{"key":"owner","label":"Owner","type":"text","required":false},{"key":"status","label":"Status","type":"select","required":false,"options":[{"value":"planned","label":"Planned"},{"value":"in_progress","label":"In progress"},{"value":"complete","label":"Complete"}]}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-BL-REF-01', 'Backlog Refinement Notes (Agile)', 'backlog', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FA-BL-REF-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-BL-REF-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Backlog Refinement Notes","sections":[{"key":"general","title":"General","fields":[{"key":"session_date","label":"Session date","type":"date","required":false},{"key":"facilitator","label":"Facilitator","type":"text","required":false},{"key":"attendees","label":"Attendees","type":"textarea","required":false},{"key":"items_refined","label":"Items refined","type":"textarea","required":false},{"key":"estimate_changes","label":"Estimate changes","type":"textarea","required":false},{"key":"readiness_decisions","label":"Readiness decisions","type":"textarea","required":false},{"key":"open_questions","label":"Open questions","type":"textarea","required":false},{"key":"next_actions","label":"Next actions","type":"textarea","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-SP-01', 'Sprint Planning Agenda (Agile)', 'sprint_planning', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FA-SP-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-SP-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Sprint Planning","sections":[{"key":"general","title":"General","fields":[{"key":"sprint_id","label":"Sprint ID","type":"text","required":false,"sample":"Sprint 24"},{"key":"sprint_start","label":"Sprint start","type":"date","required":false},{"key":"sprint_end","label":"Sprint end","type":"date","required":false},{"key":"sprint_goal","label":"Sprint goal","type":"textarea","required":false,"help":"Single coherent outcome for the sprint"},{"key":"team_capacity","label":"Team capacity","type":"text","required":false,"sample":"42 points / 160 hours"},{"key":"committed_items","label":"Committed items summary","type":"textarea","required":false},{"key":"dependencies","label":"Dependencies","type":"textarea","required":false},{"key":"risks","label":"Risks","type":"textarea","required":false},{"key":"definition_of_done_reminder","label":"Definition of Done reminder","type":"textarea","required":false},{"key":"attendees","label":"Attendees","type":"textarea","required":false},{"key":"decisions","label":"Decisions","type":"textarea","required":false},{"key":"parking_lot","label":"Parking lot","type":"textarea","required":false},{"key":"facilitator","label":"Facilitator","type":"text","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-SP-GOAL-01', 'Sprint Goal Statement (Agile)', 'sprint_planning', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FA-SP-GOAL-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-SP-GOAL-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Sprint Goal Statement","sections":[{"key":"general","title":"General","fields":[{"key":"sprint_id","label":"Sprint ID","type":"text","required":false},{"key":"goal_statement","label":"Goal statement","type":"textarea","required":false},{"key":"why_now","label":"Why now","type":"textarea","required":false},{"key":"success_measure","label":"Success measure","type":"textarea","required":false},{"key":"constraints","label":"Constraints","type":"textarea","required":false},{"key":"owner","label":"Owner","type":"text","required":false},{"key":"agreed_date","label":"Agreed date","type":"date","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-SP-CAP-01', 'Capacity & Availability Plan (Agile)', 'sprint_planning', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FA-SP-CAP-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-SP-CAP-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Capacity & Availability Plan","sections":[{"key":"general","title":"General","fields":[{"key":"sprint_id","label":"Sprint ID","type":"text","required":false},{"key":"team_member","label":"Team member","type":"text","required":false},{"key":"availability_percent","label":"Availability %","type":"number","required":false},{"key":"pto_or_leave","label":"PTO / leave","type":"textarea","required":false},{"key":"focus_factor","label":"Focus factor","type":"text","required":false,"sample":"0.8"},{"key":"planned_hours","label":"Planned hours","type":"number","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false},{"key":"updated_date","label":"Updated date","type":"date","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-SE-01', 'Daily Stand-up Notes (Agile)', 'sprint_execution', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FA-SE-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-SE-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Stand-up Notes","sections":[{"key":"general","title":"General","fields":[{"key":"standup_date","label":"Stand-up date","type":"date","required":false},{"key":"sprint_id","label":"Sprint ID","type":"text","required":false},{"key":"attendees","label":"Attendees","type":"textarea","required":false},{"key":"yesterday","label":"Yesterday","type":"textarea","required":false,"help":"Completed since last stand-up"},{"key":"today","label":"Today","type":"textarea","required":false,"help":"Plan for today toward sprint goal"},{"key":"impediments","label":"Impediments","type":"textarea","required":false},{"key":"help_needed","label":"Help needed","type":"textarea","required":false},{"key":"board_health_notes","label":"Board health notes","type":"textarea","required":false},{"key":"focus_today","label":"Team focus today","type":"textarea","required":false},{"key":"escalations","label":"Escalations","type":"textarea","required":false},{"key":"scribe","label":"Scribe","type":"text","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-SE-IMP-01', 'Impediment Record (Agile)', 'sprint_execution', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FA-SE-IMP-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-SE-IMP-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Impediment Record","sections":[{"key":"general","title":"General","fields":[{"key":"impediment_id","label":"Impediment ID","type":"text","required":false,"sample":"IMP-07"},{"key":"raised_date","label":"Raised date","type":"date","required":false},{"key":"description","label":"Description","type":"textarea","required":false},{"key":"impact","label":"Impact","type":"textarea","required":false},{"key":"owner","label":"Owner","type":"text","required":false},{"key":"status","label":"Status","type":"select","required":false,"options":[{"value":"open","label":"Open"},{"value":"in_progress","label":"In progress"},{"value":"escalated","label":"Escalated"},{"value":"resolved","label":"Resolved"}]},{"key":"target_date","label":"Target resolution date","type":"date","required":false},{"key":"resolution","label":"Resolution","type":"textarea","required":false},{"key":"related_items","label":"Related backlog items","type":"textarea","required":false},{"key":"raised_by","label":"Raised by","type":"text","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-SE-TASK-01', 'Task / Sub-task Card (Agile)', 'sprint_execution', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FA-SE-TASK-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-SE-TASK-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Task / Sub-task Card","sections":[{"key":"general","title":"General","fields":[{"key":"parent_pbi_ref","label":"Parent backlog item","type":"text","required":false},{"key":"task_title","label":"Task title","type":"text","required":false},{"key":"owner","label":"Owner","type":"text","required":false},{"key":"estimate_hours","label":"Estimate (hours)","type":"number","required":false},{"key":"status","label":"Status","type":"select","required":false,"options":[{"value":"todo","label":"To do"},{"value":"doing","label":"Doing"},{"value":"done","label":"Done"},{"value":"blocked","label":"Blocked"}]},{"key":"blockers","label":"Blockers","type":"textarea","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false},{"key":"updated_date","label":"Updated date","type":"date","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-SE-FCST-01', 'Mid-sprint Forecast Notes (Agile)', 'sprint_execution', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FA-SE-FCST-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-SE-FCST-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Mid-sprint Forecast Notes","sections":[{"key":"general","title":"General","fields":[{"key":"forecast_date","label":"Forecast date","type":"date","required":false},{"key":"sprint_id","label":"Sprint ID","type":"text","required":false},{"key":"forecast_to_goal","label":"Forecast to sprint goal","type":"textarea","required":false},{"key":"scope_change","label":"Scope change","type":"textarea","required":false},{"key":"escalation","label":"Escalation","type":"textarea","required":false},{"key":"confidence","label":"Confidence","type":"select","required":false,"options":[{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]},{"key":"author","label":"Author","type":"text","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-RR-01', 'Sprint Review Notes (Agile)', 'review_retrospective', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FA-RR-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-RR-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Sprint Review Notes","sections":[{"key":"general","title":"General","fields":[{"key":"sprint_id","label":"Sprint ID","type":"text","required":false},{"key":"review_date","label":"Review date","type":"date","required":false},{"key":"demo_items","label":"Demo items","type":"textarea","required":false},{"key":"stakeholder_feedback","label":"Stakeholder feedback","type":"textarea","required":false},{"key":"acceptance_outcomes","label":"Acceptance outcomes","type":"textarea","required":false},{"key":"backlog_impact","label":"Backlog impact","type":"textarea","required":false},{"key":"attendees","label":"Attendees","type":"textarea","required":false},{"key":"decisions","label":"Decisions","type":"textarea","required":false},{"key":"follow_up_stories","label":"Follow-up stories","type":"textarea","required":false},{"key":"facilitator","label":"Facilitator","type":"text","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-RR-RETRO-01', 'Sprint Retrospective Notes (Agile)', 'review_retrospective', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FA-RR-RETRO-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-RR-RETRO-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Sprint Retrospective Notes","sections":[{"key":"general","title":"General","fields":[{"key":"sprint_id","label":"Sprint ID","type":"text","required":false},{"key":"retro_date","label":"Retrospective date","type":"date","required":false},{"key":"went_well","label":"What went well","type":"textarea","required":false},{"key":"to_improve","label":"What to improve","type":"textarea","required":false},{"key":"experiments","label":"Experiments to try","type":"textarea","required":false},{"key":"action_owners","label":"Action owners / dates","type":"textarea","required":false},{"key":"follow_up","label":"Follow-up from last retro","type":"textarea","required":false},{"key":"attendees","label":"Attendees","type":"textarea","required":false},{"key":"facilitator","label":"Facilitator","type":"text","required":false},{"key":"parking_lot","label":"Parking lot","type":"textarea","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-RR-DEMO-01', 'Demo Feedback Log (Agile)', 'review_retrospective', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FA-RR-DEMO-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-RR-DEMO-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Demo Feedback Log","sections":[{"key":"general","title":"General","fields":[{"key":"demo_date","label":"Demo date","type":"date","required":false},{"key":"item_reference","label":"Item reference","type":"text","required":false},{"key":"feedback","label":"Feedback","type":"textarea","required":false},{"key":"priority","label":"Priority","type":"select","required":false,"options":[{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]},{"key":"follow_up_story","label":"Follow-up story","type":"textarea","required":false},{"key":"raised_by","label":"Raised by","type":"text","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-REL-01', 'Release Checklist (Agile)', 'release', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FA-REL-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-REL-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Release Checklist","sections":[{"key":"general","title":"General","fields":[{"key":"release_version","label":"Release version","type":"text","required":false,"sample":"2.4.0"},{"key":"release_date","label":"Release date","type":"date","required":false},{"key":"scope_summary","label":"Scope summary","type":"textarea","required":false},{"key":"environments","label":"Environments","type":"textarea","required":false,"help":"e.g. staging → production"},{"key":"test_sign_off","label":"Test sign-off","type":"textarea","required":false},{"key":"security_ops_checks","label":"Security / ops checks","type":"textarea","required":false},{"key":"communications_plan","label":"Communications","type":"textarea","required":false},{"key":"go_no_go","label":"Go / No-go","type":"select","required":false,"options":[{"value":"go","label":"Go"},{"value":"no_go","label":"No-go"},{"value":"conditional","label":"Conditional"}]},{"key":"rollback_owner","label":"Rollback owner","type":"text","required":false},{"key":"approvers","label":"Approvers","type":"textarea","required":false},{"key":"known_issues","label":"Known issues","type":"textarea","required":false},{"key":"post_release_verification","label":"Post-release verification","type":"textarea","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-REL-NOTES-01', 'Release Notes (Agile)', 'release', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FA-REL-NOTES-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-REL-NOTES-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Release Notes","sections":[{"key":"general","title":"General","fields":[{"key":"release_version","label":"Release version","type":"text","required":false},{"key":"release_date","label":"Release date","type":"date","required":false},{"key":"highlights","label":"Highlights","type":"textarea","required":false},{"key":"breaking_changes","label":"Breaking changes","type":"textarea","required":false},{"key":"known_issues","label":"Known issues","type":"textarea","required":false},{"key":"upgrade_steps","label":"Upgrade steps","type":"textarea","required":false},{"key":"contributors","label":"Contributors","type":"textarea","required":false},{"key":"links","label":"Links / references","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-REL-GNG-01', 'Go / No-Go Decision Record (Agile)', 'release', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FA-REL-GNG-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-REL-GNG-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Go / No-Go Decision Record","sections":[{"key":"general","title":"General","fields":[{"key":"release_version","label":"Release version","type":"text","required":false},{"key":"decision_date","label":"Decision date","type":"date","required":false},{"key":"decision","label":"Decision","type":"select","required":false,"options":[{"value":"go","label":"Go"},{"value":"no_go","label":"No-go"},{"value":"defer","label":"Defer"}]},{"key":"criteria_met","label":"Criteria met","type":"textarea","required":false},{"key":"risks_accepted","label":"Risks accepted","type":"textarea","required":false},{"key":"approvers","label":"Approvers","type":"textarea","required":false},{"key":"conditions","label":"Conditions (if any)","type":"textarea","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO public.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-REL-DEP-01', 'Deployment / Rollback Plan (Agile)', 'release', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM public.form_templates WHERE template_code = 'FA-REL-DEP-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-REL-DEP-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM public.form_template_versions WHERE template_id = v_id;
  UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Deployment / Rollback Plan","sections":[{"key":"general","title":"General","fields":[{"key":"release_version","label":"Release version","type":"text","required":false},{"key":"deployment_steps","label":"Deployment steps","type":"textarea","required":false},{"key":"step_owners","label":"Step owners","type":"textarea","required":false},{"key":"rollback_trigger","label":"Rollback trigger","type":"textarea","required":false},{"key":"rollback_steps","label":"Rollback steps","type":"textarea","required":false},{"key":"verification","label":"Verification","type":"textarea","required":false},{"key":"communication_points","label":"Communication points","type":"textarea","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


-- Simulator mirror (same template_code / schemas)
-- sim.form_templates + versions

INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-SU-MANDATE-01', 'Project Mandate (Structured)', 'starting_up', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-SU-MANDATE-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-SU-MANDATE-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Project Mandate","sections":[{"key":"general","title":"General","fields":[{"key":"project_title","label":"Project title","type":"text","required":false},{"key":"document_date","label":"Document date","type":"date","required":false},{"key":"author","label":"Author","type":"text","required":false},{"key":"client_or_customer","label":"Client / customer","type":"text","required":false},{"key":"purpose","label":"Purpose","type":"textarea","required":false},{"key":"background","label":"Background","type":"textarea","required":false},{"key":"project_objectives","label":"Project objectives","type":"textarea","required":false},{"key":"project_scope","label":"Project scope","type":"textarea","required":false},{"key":"constraints","label":"Constraints","type":"textarea","required":false},{"key":"assumptions","label":"Assumptions","type":"textarea","required":false},{"key":"outline_business_case","label":"Outline business case","type":"textarea","required":false},{"key":"customer_quality_expectations","label":"Customer quality expectations","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-SU-BRIEF-01', 'Project Brief (Structured)', 'starting_up', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-SU-BRIEF-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-SU-BRIEF-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Project Brief","sections":[{"key":"general","title":"General","fields":[{"key":"project_definition","label":"Project definition","type":"textarea","required":false},{"key":"project_approach","label":"Project approach","type":"textarea","required":false},{"key":"business_case","label":"Business case","type":"textarea","required":false},{"key":"project_product_description","label":"Project product description","type":"textarea","required":false},{"key":"project_plan","label":"Project plan","type":"textarea","required":false},{"key":"project_management_team_structure","label":"Project management team structure","type":"textarea","required":false},{"key":"references","label":"References to other information","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-SU-DLOG-01', 'Daily Log (Structured)', 'starting_up', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-SU-DLOG-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-SU-DLOG-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Daily Log","sections":[{"key":"general","title":"General","fields":[{"key":"log_date","label":"Log date","type":"date","required":false},{"key":"entry_type","label":"Entry type","type":"select","required":false,"options":[{"value":"event","label":"Event"},{"value":"decision","label":"Decision"},{"value":"issue","label":"Issue"},{"value":"risk","label":"Risk"},{"value":"note","label":"Note"}]},{"key":"description","label":"Description","type":"textarea","required":false},{"key":"raised_by","label":"Raised by","type":"text","required":false},{"key":"follow_up_action","label":"Follow-up action","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-SU-LLOG-01', 'Lessons Log (Structured)', 'starting_up', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-SU-LLOG-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-SU-LLOG-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Lessons Log","sections":[{"key":"general","title":"General","fields":[{"key":"lesson_date","label":"Lesson date","type":"date","required":false},{"key":"category","label":"Category","type":"select","required":false,"options":[{"value":"process","label":"Process"},{"value":"product","label":"Product"},{"value":"resource","label":"Resource"},{"value":"stakeholder","label":"Stakeholder"},{"value":"other","label":"Other"}]},{"key":"description","label":"Description of lesson","type":"textarea","required":false},{"key":"effect_on_project","label":"Effect on project","type":"textarea","required":false},{"key":"recommendations","label":"Recommendations","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-DIR-01', 'Project Board Agenda (Structured)', 'directing', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-DIR-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-DIR-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Project Board Agenda","sections":[{"key":"general","title":"General","fields":[{"key":"meeting_date","label":"Meeting date","type":"date","required":false},{"key":"attendees","label":"Attendees","type":"textarea","required":false},{"key":"previous_minutes","label":"Previous minutes","type":"textarea","required":false},{"key":"decisions_required","label":"Decisions required","type":"textarea","required":false},{"key":"progress_report","label":"Progress report","type":"textarea","required":false},{"key":"issues","label":"Issues","type":"textarea","required":false},{"key":"risks","label":"Risks","type":"textarea","required":false},{"key":"any_other_business","label":"Any other business","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-DIR-HL-01', 'Highlight Report (Structured)', 'directing', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-DIR-HL-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-DIR-HL-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Highlight Report","sections":[{"key":"general","title":"General","fields":[{"key":"report_date","label":"Report date","type":"date","required":false},{"key":"period_covered","label":"Period covered","type":"text","required":false},{"key":"summary_status","label":"Summary status","type":"select","required":false,"options":[{"value":"green","label":"Green — on track"},{"value":"amber","label":"Amber — at risk"},{"value":"red","label":"Red — off track"}]},{"key":"achievements_this_period","label":"Achievements this period","type":"textarea","required":false},{"key":"work_planned_next_period","label":"Work planned next period","type":"textarea","required":false},{"key":"products_status","label":"Products status","type":"textarea","required":false},{"key":"issues_summary","label":"Issues summary","type":"textarea","required":false},{"key":"risks_summary","label":"Risks summary","type":"textarea","required":false},{"key":"forecast_completion","label":"Forecast completion","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-IP-PID-01', 'Project Initiation Document (Structured)', 'initiating', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-IP-PID-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-IP-PID-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Project Initiation Document","sections":[{"key":"general","title":"General","fields":[{"key":"project_definition","label":"Project definition","type":"textarea","required":false},{"key":"business_case_summary","label":"Business case summary","type":"textarea","required":false},{"key":"project_organisation","label":"Project organisation","type":"textarea","required":false},{"key":"quality_management_approach_ref","label":"Quality management approach (reference)","type":"textarea","required":false},{"key":"risk_management_approach_ref","label":"Risk management approach (reference)","type":"textarea","required":false},{"key":"configuration_management_approach_ref","label":"Configuration management approach (reference)","type":"textarea","required":false},{"key":"communication_management_approach_ref","label":"Communication management approach (reference)","type":"textarea","required":false},{"key":"project_plan_summary","label":"Project plan summary","type":"textarea","required":false},{"key":"project_controls","label":"Project controls","type":"textarea","required":false},{"key":"tolerances","label":"Tolerances","type":"textarea","required":false},{"key":"constraints","label":"Constraints","type":"textarea","required":false},{"key":"assumptions","label":"Assumptions","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-IP-BC-01', 'Business Case (Structured)', 'initiating', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-IP-BC-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-IP-BC-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Business Case","sections":[{"key":"general","title":"General","fields":[{"key":"reasons","label":"Reasons","type":"textarea","required":false},{"key":"business_options","label":"Business options","type":"textarea","required":false},{"key":"expected_benefits","label":"Expected benefits","type":"textarea","required":false},{"key":"expected_disbenefits","label":"Expected dis-benefits","type":"textarea","required":false},{"key":"timescale","label":"Timescale","type":"textarea","required":false},{"key":"costs","label":"Costs","type":"money","required":false},{"key":"investment_appraisal","label":"Investment appraisal","type":"textarea","required":false},{"key":"major_risks","label":"Major risks","type":"textarea","required":false},{"key":"recommendation","label":"Recommendation","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-IP-BRP-01', 'Benefits Review Plan (Structured)', 'initiating', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-IP-BRP-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-IP-BRP-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Benefits Review Plan","sections":[{"key":"general","title":"General","fields":[{"key":"scope_of_review","label":"Scope of review","type":"textarea","required":false},{"key":"benefits_to_be_measured","label":"Benefits to be measured","type":"textarea","required":false},{"key":"measurement_approach","label":"Measurement approach","type":"textarea","required":false},{"key":"resources_required","label":"Resources required","type":"textarea","required":false},{"key":"review_schedule","label":"Review schedule","type":"textarea","required":false},{"key":"roles_and_responsibilities","label":"Roles and responsibilities","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-IP-PPD-01', 'Project Product Description (Structured)', 'initiating', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-IP-PPD-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-IP-PPD-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Project Product Description","sections":[{"key":"general","title":"General","fields":[{"key":"purpose","label":"Purpose","type":"textarea","required":false},{"key":"composition","label":"Composition","type":"textarea","required":false},{"key":"derivation","label":"Derivation","type":"textarea","required":false},{"key":"format_and_presentation","label":"Format and presentation","type":"textarea","required":false},{"key":"quality_criteria","label":"Quality criteria","type":"textarea","required":false},{"key":"quality_tolerance","label":"Quality tolerance","type":"textarea","required":false},{"key":"quality_method","label":"Quality method","type":"textarea","required":false},{"key":"quality_responsibility","label":"Quality responsibility","type":"text","required":false},{"key":"product_quality_review","label":"Product quality review","type":"textarea","required":false},{"key":"acceptance_criteria","label":"Acceptance criteria","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-IP-PLAN-01', 'Plan — Project / Stage / Team (Structured)', 'initiating', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-IP-PLAN-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-IP-PLAN-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Plan","sections":[{"key":"general","title":"General","fields":[{"key":"plan_type","label":"Plan type","type":"select","required":false,"options":[{"value":"project","label":"Project plan"},{"value":"stage","label":"Stage plan"},{"value":"team","label":"Team plan"}]},{"key":"plan_description","label":"Plan description","type":"textarea","required":false},{"key":"product_breakdown_structure","label":"Product breakdown structure","type":"textarea","required":false},{"key":"product_descriptions","label":"Product descriptions","type":"textarea","required":false},{"key":"product_flow_diagram","label":"Product flow diagram","type":"textarea","required":false},{"key":"schedule","label":"Schedule","type":"textarea","required":false},{"key":"milestones","label":"Milestones","type":"textarea","required":false},{"key":"resources","label":"Resources","type":"textarea","required":false},{"key":"dependencies","label":"Dependencies","type":"textarea","required":false},{"key":"monitoring_and_control","label":"Monitoring and control","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-CS-CIR-01', 'Configuration Item Record (Structured)', 'controlling_a_stage', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-CS-CIR-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-CS-CIR-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Configuration Item Record","sections":[{"key":"general","title":"General","fields":[{"key":"item_identifier","label":"Item identifier","type":"text","required":false},{"key":"item_title","label":"Item title","type":"text","required":false},{"key":"item_type","label":"Item type","type":"select","required":false,"options":[{"value":"product","label":"Product"},{"value":"document","label":"Document"},{"value":"baseline","label":"Baseline"},{"value":"component","label":"Component"},{"value":"other","label":"Other"}]},{"key":"version","label":"Version","type":"text","required":false},{"key":"status","label":"Status","type":"select","required":false,"options":[{"value":"draft","label":"Draft"},{"value":"under_review","label":"Under review"},{"value":"approved","label":"Approved"},{"value":"superseded","label":"Superseded"},{"value":"archived","label":"Archived"}]},{"key":"location","label":"Location","type":"text","required":false},{"key":"owner","label":"Owner","type":"text","required":false},{"key":"date_created","label":"Date created","type":"date","required":false},{"key":"date_modified","label":"Date modified","type":"date","required":false},{"key":"source","label":"Source","type":"text","required":false},{"key":"related_products","label":"Related products","type":"textarea","required":false},{"key":"related_issues","label":"Related issues","type":"textarea","required":false},{"key":"related_change_requests","label":"Related change requests","type":"textarea","required":false},{"key":"description","label":"Description","type":"textarea","required":false},{"key":"specification_reference","label":"Specification reference","type":"text","required":false},{"key":"quality_records","label":"Quality records","type":"textarea","required":false},{"key":"verification_status","label":"Verification status","type":"select","required":false,"options":[{"value":"not_started","label":"Not started"},{"value":"in_progress","label":"In progress"},{"value":"verified","label":"Verified"},{"value":"failed","label":"Failed"}]},{"key":"release_status","label":"Release status","type":"select","required":false,"options":[{"value":"not_released","label":"Not released"},{"value":"released","label":"Released"},{"value":"withdrawn","label":"Withdrawn"}]},{"key":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-CS-ISSREG-01', 'Issue Register (Structured)', 'controlling_a_stage', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-CS-ISSREG-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-CS-ISSREG-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Issue Register","sections":[{"key":"general","title":"General","fields":[{"key":"issue_identifier","label":"Issue identifier","type":"text","required":false},{"key":"issue_date","label":"Issue date","type":"date","required":false},{"key":"raised_by","label":"Raised by","type":"text","required":false},{"key":"issue_type","label":"Issue type","type":"select","required":false,"options":[{"value":"request_for_change","label":"Request for change"},{"value":"off_specification","label":"Off-specification"},{"value":"problem_concern","label":"Problem / concern"},{"value":"external_event","label":"External event"}]},{"key":"priority","label":"Priority","type":"select","required":false,"options":[{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]},{"key":"status","label":"Status","type":"select","required":false,"options":[{"value":"open","label":"Open"},{"value":"in_progress","label":"In progress"},{"value":"resolved","label":"Resolved"},{"value":"closed","label":"Closed"}]},{"key":"description","label":"Description","type":"textarea","required":false},{"key":"impact","label":"Impact","type":"textarea","required":false},{"key":"action_owner","label":"Action owner","type":"text","required":false},{"key":"date_resolved","label":"Date resolved","type":"date","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-CS-ISSREP-01', 'Issue Report (Structured)', 'controlling_a_stage', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-CS-ISSREP-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-CS-ISSREP-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Issue Report","sections":[{"key":"general","title":"General","fields":[{"key":"issue_identifier","label":"Issue identifier","type":"text","required":false},{"key":"issue_date","label":"Issue date","type":"date","required":false},{"key":"raised_by","label":"Raised by","type":"text","required":false},{"key":"issue_type","label":"Issue type","type":"select","required":false,"options":[{"value":"request_for_change","label":"Request for change"},{"value":"off_specification","label":"Off-specification"},{"value":"problem_concern","label":"Problem / concern"},{"value":"external_event","label":"External event"}]},{"key":"priority","label":"Priority","type":"select","required":false,"options":[{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]},{"key":"status","label":"Status","type":"select","required":false,"options":[{"value":"open","label":"Open"},{"value":"under_review","label":"Under review"},{"value":"decision_pending","label":"Decision pending"},{"value":"closed","label":"Closed"}]},{"key":"description","label":"Description","type":"textarea","required":false},{"key":"impact_assessment","label":"Impact assessment","type":"textarea","required":false},{"key":"recommendation","label":"Recommendation","type":"textarea","required":false},{"key":"decision_required","label":"Decision required","type":"textarea","required":false},{"key":"options_considered","label":"Options considered","type":"textarea","required":false},{"key":"decision","label":"Decision","type":"textarea","required":false},{"key":"action_owner","label":"Action owner","type":"text","required":false},{"key":"follow_up_date","label":"Follow-up date","type":"date","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-CS-PSA-01', 'Product Status Account (Structured)', 'controlling_a_stage', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-CS-PSA-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-CS-PSA-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Product Status Account","sections":[{"key":"general","title":"General","fields":[{"key":"product_name","label":"Product name","type":"text","required":false},{"key":"product_status","label":"Product status","type":"select","required":false,"options":[{"value":"not_started","label":"Not started"},{"value":"in_progress","label":"In progress"},{"value":"completed","label":"Completed"},{"value":"approved","label":"Approved"},{"value":"handed_over","label":"Handed over"}]},{"key":"status_commentary","label":"Status commentary","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-CS-QREG-01', 'Quality Register (Structured)', 'controlling_a_stage', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-CS-QREG-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-CS-QREG-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Quality Register","sections":[{"key":"general","title":"General","fields":[{"key":"quality_identifier","label":"Quality identifier","type":"text","required":false},{"key":"product_name","label":"Product name","type":"text","required":false},{"key":"quality_method","label":"Quality method","type":"text","required":false},{"key":"planned_date","label":"Planned date","type":"date","required":false},{"key":"actual_date","label":"Actual date","type":"date","required":false},{"key":"quality_responsible","label":"Quality responsible","type":"text","required":false},{"key":"quality_result","label":"Quality result","type":"select","required":false,"options":[{"value":"pass","label":"Pass"},{"value":"pass_with_concessions","label":"Pass with concessions"},{"value":"fail","label":"Fail"},{"value":"not_applicable","label":"Not applicable"}]},{"key":"quality_records_location","label":"Quality records location","type":"text","required":false},{"key":"follow_up_required","label":"Follow-up required","type":"checkbox","required":false},{"key":"follow_up_action","label":"Follow-up action","type":"textarea","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-CS-RREG-01', 'Risk Register (Structured)', 'controlling_a_stage', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-CS-RREG-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-CS-RREG-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Risk Register","sections":[{"key":"general","title":"General","fields":[{"key":"risk_identifier","label":"Risk identifier","type":"text","required":false},{"key":"date_identified","label":"Date identified","type":"date","required":false},{"key":"risk_category","label":"Risk category","type":"select","required":false,"options":[{"value":"business","label":"Business"},{"value":"technical","label":"Technical"},{"value":"resource","label":"Resource"},{"value":"schedule","label":"Schedule"},{"value":"cost","label":"Cost"},{"value":"external","label":"External"}]},{"key":"risk_description","label":"Risk description","type":"textarea","required":false},{"key":"risk_status","label":"Risk status","type":"select","required":false,"options":[{"value":"open","label":"Open"},{"value":"mitigating","label":"Mitigating"},{"value":"closed","label":"Closed"}]},{"key":"risk_owner","label":"Risk owner","type":"text","required":false},{"key":"risk_response","label":"Risk response","type":"textarea","required":false},{"key":"probability_pre","label":"Probability (pre-response)","type":"select","required":false,"options":[{"value":"1","label":"1 — Very low"},{"value":"2","label":"2 — Low"},{"value":"3","label":"3 — Medium"},{"value":"4","label":"4 — High"},{"value":"5","label":"5 — Very high"}]},{"key":"impact_pre","label":"Impact (pre-response)","type":"select","required":false,"options":[{"value":"1","label":"1 — Very low"},{"value":"2","label":"2 — Low"},{"value":"3","label":"3 — Medium"},{"value":"4","label":"4 — High"},{"value":"5","label":"5 — Very high"}]},{"key":"expected_value_pre","label":"Expected value (pre-response)","type":"number","required":false},{"key":"probability_post","label":"Probability (post-response)","type":"select","required":false,"options":[{"value":"1","label":"1 — Very low"},{"value":"2","label":"2 — Low"},{"value":"3","label":"3 — Medium"},{"value":"4","label":"4 — High"},{"value":"5","label":"5 — Very high"}]},{"key":"impact_post","label":"Impact (post-response)","type":"select","required":false,"options":[{"value":"1","label":"1 — Very low"},{"value":"2","label":"2 — Low"},{"value":"3","label":"3 — Medium"},{"value":"4","label":"4 — High"},{"value":"5","label":"5 — Very high"}]},{"key":"expected_value_post","label":"Expected value (post-response)","type":"number","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-CS-EXC-01', 'Exception Report (Structured)', 'controlling_a_stage', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-CS-EXC-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-CS-EXC-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Exception Report","sections":[{"key":"general","title":"General","fields":[{"key":"exception_date","label":"Exception date","type":"date","required":false},{"key":"stage_or_project","label":"Stage / project","type":"text","required":false},{"key":"description_of_exception","label":"Description of exception","type":"textarea","required":false},{"key":"cause","label":"Cause","type":"textarea","required":false},{"key":"impact","label":"Impact","type":"textarea","required":false},{"key":"recommended_options","label":"Recommended options","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-MPD-CHK-01', 'Checkpoint Report (Structured)', 'managing_product_delivery', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-MPD-CHK-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-MPD-CHK-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Checkpoint Report","sections":[{"key":"general","title":"General","fields":[{"key":"checkpoint_date","label":"Checkpoint date","type":"date","required":false},{"key":"work_package_reference","label":"Work package reference","type":"text","required":false},{"key":"products_completed","label":"Products completed","type":"textarea","required":false},{"key":"products_planned","label":"Products planned","type":"textarea","required":false},{"key":"quality_activities","label":"Quality activities","type":"textarea","required":false},{"key":"follow_on_actions","label":"Follow-on actions","type":"textarea","required":false},{"key":"checkpoint_status","label":"Checkpoint status","type":"select","required":false,"options":[{"value":"on_track","label":"On track"},{"value":"at_risk","label":"At risk"},{"value":"blocked","label":"Blocked"}]}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-MPD-PD-01', 'Product Description (Structured)', 'managing_product_delivery', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-MPD-PD-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-MPD-PD-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Product Description","sections":[{"key":"general","title":"General","fields":[{"key":"product_identifier","label":"Product identifier","type":"text","required":false},{"key":"product_title","label":"Product title","type":"text","required":false},{"key":"purpose","label":"Purpose","type":"textarea","required":false},{"key":"composition","label":"Composition","type":"textarea","required":false},{"key":"derivation","label":"Derivation","type":"textarea","required":false},{"key":"format_and_presentation","label":"Format and presentation","type":"textarea","required":false},{"key":"quality_criteria","label":"Quality criteria","type":"textarea","required":false},{"key":"quality_tolerance","label":"Quality tolerance","type":"textarea","required":false},{"key":"quality_method","label":"Quality method","type":"textarea","required":false},{"key":"quality_responsibility","label":"Quality responsibility","type":"text","required":false},{"key":"product_quality_review","label":"Product quality review","type":"textarea","required":false},{"key":"acceptance_criteria","label":"Acceptance criteria","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-MPD-WP-01', 'Work Package (Structured)', 'managing_product_delivery', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-MPD-WP-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-MPD-WP-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Work Package","sections":[{"key":"general","title":"General","fields":[{"key":"work_package_identifier","label":"Work package identifier","type":"text","required":false},{"key":"work_package_title","label":"Work package title","type":"text","required":false},{"key":"work_package_description","label":"Work package description","type":"textarea","required":false},{"key":"products_to_be_delivered","label":"Products to be delivered","type":"textarea","required":false},{"key":"product_descriptions_reference","label":"Product descriptions (reference)","type":"textarea","required":false},{"key":"techniques_and_procedures","label":"Techniques and procedures","type":"textarea","required":false},{"key":"required_approach","label":"Required approach","type":"textarea","required":false},{"key":"change_authority","label":"Change authority","type":"text","required":false},{"key":"constraints","label":"Constraints","type":"textarea","required":false},{"key":"agreement_date","label":"Agreement date","type":"date","required":false},{"key":"start_date","label":"Start date","type":"date","required":false},{"key":"end_date","label":"End date","type":"date","required":false},{"key":"acceptance_criteria","label":"Acceptance criteria","type":"textarea","required":false},{"key":"quality_requirements","label":"Quality requirements","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-SB-ESR-01', 'End Stage Report (Structured)', 'managing_a_stage_boundary', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-SB-ESR-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-SB-ESR-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"End Stage Report","sections":[{"key":"general","title":"General","fields":[{"key":"stage_name","label":"Stage name","type":"text","required":false},{"key":"period_covered","label":"Period covered","type":"text","required":false},{"key":"achievements","label":"Achievements","type":"textarea","required":false},{"key":"products_completed","label":"Products completed","type":"textarea","required":false},{"key":"products_not_completed","label":"Products not completed","type":"textarea","required":false},{"key":"quality_activities_summary","label":"Quality activities summary","type":"textarea","required":false},{"key":"follow_on_actions","label":"Follow-on actions","type":"textarea","required":false},{"key":"lessons_identified","label":"Lessons identified","type":"textarea","required":false},{"key":"next_stage_overview","label":"Next stage overview","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-SB-LR-01', 'Lessons Report (Structured)', 'managing_a_stage_boundary', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-SB-LR-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-SB-LR-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Lessons Report","sections":[{"key":"general","title":"General","fields":[{"key":"report_date","label":"Report date","type":"date","required":false},{"key":"stage_or_project","label":"Stage / project","type":"text","required":false},{"key":"lessons_summary","label":"Lessons summary","type":"textarea","required":false},{"key":"recommendations","label":"Recommendations","type":"textarea","required":false},{"key":"follow_up_actions","label":"Follow-up actions","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FS-CP-EPR-01', 'End Project Report (Structured)', 'closing', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FS-CP-EPR-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FS-CP-EPR-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"End Project Report","sections":[{"key":"general","title":"General","fields":[{"key":"project_overview","label":"Project overview","type":"textarea","required":false},{"key":"performance_against_business_case","label":"Performance against business case","type":"textarea","required":false},{"key":"performance_against_objectives","label":"Performance against objectives","type":"textarea","required":false},{"key":"review_of_products","label":"Review of products","type":"textarea","required":false},{"key":"lessons_summary","label":"Lessons summary","type":"textarea","required":false},{"key":"follow_on_recommendations","label":"Follow-on recommendations","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-BL-01', 'Product Backlog Item Card (Agile)', 'backlog', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FA-BL-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-BL-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Backlog Item","sections":[{"key":"general","title":"General","fields":[{"key":"item_id","label":"Item ID","type":"text","required":false,"help":"Unique backlog identifier","sample":"PBI-1042"},{"key":"title","label":"Title","type":"text","required":false,"help":"Short outcome-oriented title","sample":"As a user I can reset my password"},{"key":"item_type","label":"Item type","type":"select","required":false,"options":[{"value":"story","label":"Story"},{"value":"bug","label":"Bug"},{"value":"spike","label":"Spike"},{"value":"enabler","label":"Enabler"},{"value":"chore","label":"Chore"}]},{"key":"description","label":"Description","type":"textarea","required":false,"help":"Context and intent for the item"},{"key":"persona_or_value","label":"Persona / business value","type":"textarea","required":false},{"key":"acceptance_criteria","label":"Acceptance criteria","type":"textarea","required":false,"help":"Testable conditions for done","sample":"Given… When… Then…"},{"key":"priority","label":"Priority","type":"select","required":false,"options":[{"value":"must","label":"Must"},{"value":"should","label":"Should"},{"value":"could","label":"Could"},{"value":"wont","label":"Won''t"}]},{"key":"estimate_points","label":"Estimate (points)","type":"number","required":false},{"key":"status","label":"Status","type":"select","required":false,"options":[{"value":"new","label":"New"},{"value":"refined","label":"Refined"},{"value":"ready","label":"Ready"},{"value":"in_sprint","label":"In sprint"},{"value":"done","label":"Done"},{"value":"blocked","label":"Blocked"}]},{"key":"sprint_assignment","label":"Sprint assignment","type":"text","required":false},{"key":"dependencies","label":"Dependencies","type":"textarea","required":false},{"key":"risks_or_notes","label":"Risks / notes","type":"textarea","required":false},{"key":"owner","label":"Owner","type":"text","required":false,"sample":"Product Owner"},{"key":"definition_of_ready_met","label":"Definition of Ready met","type":"checkbox","required":false,"help":"Tick when item meets team DoR"},{"key":"tags","label":"Tags / themes","type":"text","required":false},{"key":"created_date","label":"Created date","type":"date","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-BL-EPIC-01', 'Epic / Feature Brief (Agile)', 'backlog', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FA-BL-EPIC-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-BL-EPIC-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Epic / Feature Brief","sections":[{"key":"general","title":"General","fields":[{"key":"epic_id","label":"Epic ID","type":"text","required":false,"sample":"EPIC-12"},{"key":"title","label":"Title","type":"text","required":false},{"key":"desired_outcome","label":"Desired outcome","type":"textarea","required":false},{"key":"success_metrics","label":"Success metrics","type":"textarea","required":false},{"key":"child_themes","label":"Child themes / stories","type":"textarea","required":false},{"key":"mvp_scope","label":"MVP scope","type":"textarea","required":false},{"key":"out_of_scope","label":"Out of scope","type":"textarea","required":false},{"key":"risks","label":"Risks","type":"textarea","required":false},{"key":"owner","label":"Owner","type":"text","required":false},{"key":"status","label":"Status","type":"select","required":false,"options":[{"value":"draft","label":"Draft"},{"value":"active","label":"Active"},{"value":"done","label":"Done"},{"value":"parked","label":"Parked"}]},{"key":"target_release","label":"Target release","type":"text","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-BL-SPIKE-01', 'Spike / Research Item (Agile)', 'backlog', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FA-BL-SPIKE-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-BL-SPIKE-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Spike / Research Item","sections":[{"key":"general","title":"General","fields":[{"key":"spike_id","label":"Spike ID","type":"text","required":false},{"key":"title","label":"Title","type":"text","required":false},{"key":"research_question","label":"Research question","type":"textarea","required":false,"help":"What decision will this spike unlock?"},{"key":"time_box","label":"Time-box","type":"text","required":false,"sample":"2 days"},{"key":"findings","label":"Findings","type":"textarea","required":false},{"key":"recommendation","label":"Recommendation","type":"textarea","required":false},{"key":"follow_on_stories","label":"Follow-on stories","type":"textarea","required":false},{"key":"owner","label":"Owner","type":"text","required":false},{"key":"status","label":"Status","type":"select","required":false,"options":[{"value":"planned","label":"Planned"},{"value":"in_progress","label":"In progress"},{"value":"complete","label":"Complete"}]}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-BL-REF-01', 'Backlog Refinement Notes (Agile)', 'backlog', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FA-BL-REF-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-BL-REF-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Backlog Refinement Notes","sections":[{"key":"general","title":"General","fields":[{"key":"session_date","label":"Session date","type":"date","required":false},{"key":"facilitator","label":"Facilitator","type":"text","required":false},{"key":"attendees","label":"Attendees","type":"textarea","required":false},{"key":"items_refined","label":"Items refined","type":"textarea","required":false},{"key":"estimate_changes","label":"Estimate changes","type":"textarea","required":false},{"key":"readiness_decisions","label":"Readiness decisions","type":"textarea","required":false},{"key":"open_questions","label":"Open questions","type":"textarea","required":false},{"key":"next_actions","label":"Next actions","type":"textarea","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-SP-01', 'Sprint Planning Agenda (Agile)', 'sprint_planning', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FA-SP-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-SP-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Sprint Planning","sections":[{"key":"general","title":"General","fields":[{"key":"sprint_id","label":"Sprint ID","type":"text","required":false,"sample":"Sprint 24"},{"key":"sprint_start","label":"Sprint start","type":"date","required":false},{"key":"sprint_end","label":"Sprint end","type":"date","required":false},{"key":"sprint_goal","label":"Sprint goal","type":"textarea","required":false,"help":"Single coherent outcome for the sprint"},{"key":"team_capacity","label":"Team capacity","type":"text","required":false,"sample":"42 points / 160 hours"},{"key":"committed_items","label":"Committed items summary","type":"textarea","required":false},{"key":"dependencies","label":"Dependencies","type":"textarea","required":false},{"key":"risks","label":"Risks","type":"textarea","required":false},{"key":"definition_of_done_reminder","label":"Definition of Done reminder","type":"textarea","required":false},{"key":"attendees","label":"Attendees","type":"textarea","required":false},{"key":"decisions","label":"Decisions","type":"textarea","required":false},{"key":"parking_lot","label":"Parking lot","type":"textarea","required":false},{"key":"facilitator","label":"Facilitator","type":"text","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-SP-GOAL-01', 'Sprint Goal Statement (Agile)', 'sprint_planning', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FA-SP-GOAL-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-SP-GOAL-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Sprint Goal Statement","sections":[{"key":"general","title":"General","fields":[{"key":"sprint_id","label":"Sprint ID","type":"text","required":false},{"key":"goal_statement","label":"Goal statement","type":"textarea","required":false},{"key":"why_now","label":"Why now","type":"textarea","required":false},{"key":"success_measure","label":"Success measure","type":"textarea","required":false},{"key":"constraints","label":"Constraints","type":"textarea","required":false},{"key":"owner","label":"Owner","type":"text","required":false},{"key":"agreed_date","label":"Agreed date","type":"date","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-SP-CAP-01', 'Capacity & Availability Plan (Agile)', 'sprint_planning', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FA-SP-CAP-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-SP-CAP-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Capacity & Availability Plan","sections":[{"key":"general","title":"General","fields":[{"key":"sprint_id","label":"Sprint ID","type":"text","required":false},{"key":"team_member","label":"Team member","type":"text","required":false},{"key":"availability_percent","label":"Availability %","type":"number","required":false},{"key":"pto_or_leave","label":"PTO / leave","type":"textarea","required":false},{"key":"focus_factor","label":"Focus factor","type":"text","required":false,"sample":"0.8"},{"key":"planned_hours","label":"Planned hours","type":"number","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false},{"key":"updated_date","label":"Updated date","type":"date","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-SE-01', 'Daily Stand-up Notes (Agile)', 'sprint_execution', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FA-SE-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-SE-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Stand-up Notes","sections":[{"key":"general","title":"General","fields":[{"key":"standup_date","label":"Stand-up date","type":"date","required":false},{"key":"sprint_id","label":"Sprint ID","type":"text","required":false},{"key":"attendees","label":"Attendees","type":"textarea","required":false},{"key":"yesterday","label":"Yesterday","type":"textarea","required":false,"help":"Completed since last stand-up"},{"key":"today","label":"Today","type":"textarea","required":false,"help":"Plan for today toward sprint goal"},{"key":"impediments","label":"Impediments","type":"textarea","required":false},{"key":"help_needed","label":"Help needed","type":"textarea","required":false},{"key":"board_health_notes","label":"Board health notes","type":"textarea","required":false},{"key":"focus_today","label":"Team focus today","type":"textarea","required":false},{"key":"escalations","label":"Escalations","type":"textarea","required":false},{"key":"scribe","label":"Scribe","type":"text","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-SE-IMP-01', 'Impediment Record (Agile)', 'sprint_execution', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FA-SE-IMP-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-SE-IMP-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Impediment Record","sections":[{"key":"general","title":"General","fields":[{"key":"impediment_id","label":"Impediment ID","type":"text","required":false,"sample":"IMP-07"},{"key":"raised_date","label":"Raised date","type":"date","required":false},{"key":"description","label":"Description","type":"textarea","required":false},{"key":"impact","label":"Impact","type":"textarea","required":false},{"key":"owner","label":"Owner","type":"text","required":false},{"key":"status","label":"Status","type":"select","required":false,"options":[{"value":"open","label":"Open"},{"value":"in_progress","label":"In progress"},{"value":"escalated","label":"Escalated"},{"value":"resolved","label":"Resolved"}]},{"key":"target_date","label":"Target resolution date","type":"date","required":false},{"key":"resolution","label":"Resolution","type":"textarea","required":false},{"key":"related_items","label":"Related backlog items","type":"textarea","required":false},{"key":"raised_by","label":"Raised by","type":"text","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-SE-TASK-01', 'Task / Sub-task Card (Agile)', 'sprint_execution', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FA-SE-TASK-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-SE-TASK-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Task / Sub-task Card","sections":[{"key":"general","title":"General","fields":[{"key":"parent_pbi_ref","label":"Parent backlog item","type":"text","required":false},{"key":"task_title","label":"Task title","type":"text","required":false},{"key":"owner","label":"Owner","type":"text","required":false},{"key":"estimate_hours","label":"Estimate (hours)","type":"number","required":false},{"key":"status","label":"Status","type":"select","required":false,"options":[{"value":"todo","label":"To do"},{"value":"doing","label":"Doing"},{"value":"done","label":"Done"},{"value":"blocked","label":"Blocked"}]},{"key":"blockers","label":"Blockers","type":"textarea","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false},{"key":"updated_date","label":"Updated date","type":"date","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-SE-FCST-01', 'Mid-sprint Forecast Notes (Agile)', 'sprint_execution', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FA-SE-FCST-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-SE-FCST-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Mid-sprint Forecast Notes","sections":[{"key":"general","title":"General","fields":[{"key":"forecast_date","label":"Forecast date","type":"date","required":false},{"key":"sprint_id","label":"Sprint ID","type":"text","required":false},{"key":"forecast_to_goal","label":"Forecast to sprint goal","type":"textarea","required":false},{"key":"scope_change","label":"Scope change","type":"textarea","required":false},{"key":"escalation","label":"Escalation","type":"textarea","required":false},{"key":"confidence","label":"Confidence","type":"select","required":false,"options":[{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]},{"key":"author","label":"Author","type":"text","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-RR-01', 'Sprint Review Notes (Agile)', 'review_retrospective', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FA-RR-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-RR-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Sprint Review Notes","sections":[{"key":"general","title":"General","fields":[{"key":"sprint_id","label":"Sprint ID","type":"text","required":false},{"key":"review_date","label":"Review date","type":"date","required":false},{"key":"demo_items","label":"Demo items","type":"textarea","required":false},{"key":"stakeholder_feedback","label":"Stakeholder feedback","type":"textarea","required":false},{"key":"acceptance_outcomes","label":"Acceptance outcomes","type":"textarea","required":false},{"key":"backlog_impact","label":"Backlog impact","type":"textarea","required":false},{"key":"attendees","label":"Attendees","type":"textarea","required":false},{"key":"decisions","label":"Decisions","type":"textarea","required":false},{"key":"follow_up_stories","label":"Follow-up stories","type":"textarea","required":false},{"key":"facilitator","label":"Facilitator","type":"text","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-RR-RETRO-01', 'Sprint Retrospective Notes (Agile)', 'review_retrospective', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FA-RR-RETRO-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-RR-RETRO-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Sprint Retrospective Notes","sections":[{"key":"general","title":"General","fields":[{"key":"sprint_id","label":"Sprint ID","type":"text","required":false},{"key":"retro_date","label":"Retrospective date","type":"date","required":false},{"key":"went_well","label":"What went well","type":"textarea","required":false},{"key":"to_improve","label":"What to improve","type":"textarea","required":false},{"key":"experiments","label":"Experiments to try","type":"textarea","required":false},{"key":"action_owners","label":"Action owners / dates","type":"textarea","required":false},{"key":"follow_up","label":"Follow-up from last retro","type":"textarea","required":false},{"key":"attendees","label":"Attendees","type":"textarea","required":false},{"key":"facilitator","label":"Facilitator","type":"text","required":false},{"key":"parking_lot","label":"Parking lot","type":"textarea","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-RR-DEMO-01', 'Demo Feedback Log (Agile)', 'review_retrospective', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FA-RR-DEMO-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-RR-DEMO-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Demo Feedback Log","sections":[{"key":"general","title":"General","fields":[{"key":"demo_date","label":"Demo date","type":"date","required":false},{"key":"item_reference","label":"Item reference","type":"text","required":false},{"key":"feedback","label":"Feedback","type":"textarea","required":false},{"key":"priority","label":"Priority","type":"select","required":false,"options":[{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]},{"key":"follow_up_story","label":"Follow-up story","type":"textarea","required":false},{"key":"raised_by","label":"Raised by","type":"text","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-REL-01', 'Release Checklist (Agile)', 'release', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FA-REL-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-REL-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Release Checklist","sections":[{"key":"general","title":"General","fields":[{"key":"release_version","label":"Release version","type":"text","required":false,"sample":"2.4.0"},{"key":"release_date","label":"Release date","type":"date","required":false},{"key":"scope_summary","label":"Scope summary","type":"textarea","required":false},{"key":"environments","label":"Environments","type":"textarea","required":false,"help":"e.g. staging → production"},{"key":"test_sign_off","label":"Test sign-off","type":"textarea","required":false},{"key":"security_ops_checks","label":"Security / ops checks","type":"textarea","required":false},{"key":"communications_plan","label":"Communications","type":"textarea","required":false},{"key":"go_no_go","label":"Go / No-go","type":"select","required":false,"options":[{"value":"go","label":"Go"},{"value":"no_go","label":"No-go"},{"value":"conditional","label":"Conditional"}]},{"key":"rollback_owner","label":"Rollback owner","type":"text","required":false},{"key":"approvers","label":"Approvers","type":"textarea","required":false},{"key":"known_issues","label":"Known issues","type":"textarea","required":false},{"key":"post_release_verification","label":"Post-release verification","type":"textarea","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-REL-NOTES-01', 'Release Notes (Agile)', 'release', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FA-REL-NOTES-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-REL-NOTES-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Release Notes","sections":[{"key":"general","title":"General","fields":[{"key":"release_version","label":"Release version","type":"text","required":false},{"key":"release_date","label":"Release date","type":"date","required":false},{"key":"highlights","label":"Highlights","type":"textarea","required":false},{"key":"breaking_changes","label":"Breaking changes","type":"textarea","required":false},{"key":"known_issues","label":"Known issues","type":"textarea","required":false},{"key":"upgrade_steps","label":"Upgrade steps","type":"textarea","required":false},{"key":"contributors","label":"Contributors","type":"textarea","required":false},{"key":"links","label":"Links / references","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-REL-GNG-01', 'Go / No-Go Decision Record (Agile)', 'release', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FA-REL-GNG-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-REL-GNG-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Go / No-Go Decision Record","sections":[{"key":"general","title":"General","fields":[{"key":"release_version","label":"Release version","type":"text","required":false},{"key":"decision_date","label":"Decision date","type":"date","required":false},{"key":"decision","label":"Decision","type":"select","required":false,"options":[{"value":"go","label":"Go"},{"value":"no_go","label":"No-go"},{"value":"defer","label":"Defer"}]},{"key":"criteria_met","label":"Criteria met","type":"textarea","required":false},{"key":"risks_accepted","label":"Risks accepted","type":"textarea","required":false},{"key":"approvers","label":"Approvers","type":"textarea","required":false},{"key":"conditions","label":"Conditions (if any)","type":"textarea","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
VALUES ('FA-REL-DEP-01', 'Deployment / Rollback Plan (Agile)', 'release', TRUE)
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM sim.form_templates WHERE template_code = 'FA-REL-DEP-01' LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', 'FA-REL-DEP-01';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM sim.form_template_versions WHERE template_id = v_id;
  UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '{"title":"Deployment / Rollback Plan","sections":[{"key":"general","title":"General","fields":[{"key":"release_version","label":"Release version","type":"text","required":false},{"key":"deployment_steps","label":"Deployment steps","type":"textarea","required":false},{"key":"step_owners","label":"Step owners","type":"textarea","required":false},{"key":"rollback_trigger","label":"Rollback trigger","type":"textarea","required":false},{"key":"rollback_steps","label":"Rollback steps","type":"textarea","required":false},{"key":"verification","label":"Verification","type":"textarea","required":false},{"key":"communication_points","label":"Communication points","type":"textarea","required":false},{"key":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb, TRUE);
END $$;


DO $$
BEGIN
  RAISE NOTICE 'v786_structured_agile_form_template_seeds.sql applied (% templates × public+sim)', 42;
END $$;
