-- ============================================================================
-- v1409: Architecture Reviews register — full form with tabs (Information Technology)
-- ============================================================================
-- Owner request 2026-11-11: best-practice fields, in logical tabs, for the Architecture Reviews register, which had only Title / Description / Status:
--   Architecture Reviews (ict_architecture_reviews): 31 fields — Details · Scope & Artefacts · Participants · Assessment · Findings & Actions · Outcome · Notes
-- Lists with several parts per line are tables (rule 67.1), with dropdown columns where the values are a
-- short fixed list. The Architecture Score is the average of five 1–5 ratings shown as a percentage (v1339 average calculation), worked out on save.
-- Status workflow keeps Scheduled and Complete and adds Requested, In Progress, Held – Actions Open and Cancelled.
-- The 10 v1374 sample records keep their ids. All fields optional, vendor-neutral (rule 26).
-- Platform register definition, the Simulator reads the same system register definitions.
-- Sample records: v1410. Prerequisites: v949, v1374, v1375 and the v1339 average calculation in the app. Idempotent.
-- ============================================================================

BEGIN;

-- ── Architecture Reviews (ict_architecture_reviews) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9003-00000000000c'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('review_reference', 'Review Reference', 'text', 0, NULL, NULL, NULL),
  ('review_type', 'Review Type', 'dropdown', 1, NULL, '[{"value":"concept","label":"Concept / Initiation"},{"value":"design","label":"Design Review"},{"value":"compliance","label":"Compliance Review"},{"value":"readiness","label":"Readiness Review"},{"value":"exception","label":"Exception / Waiver Review"},{"value":"post_implementation","label":"Post-Implementation Review"}]', NULL),
  ('review_body', 'Review Body', 'dropdown', 2, NULL, '[{"value":"design_authority","label":"Design Authority"},{"value":"architecture_board","label":"Architecture Review Board"},{"value":"technical_design_authority","label":"Technical Design Authority"},{"value":"security_design_authority","label":"Security Design Authority"}]', NULL),
  ('architecture_domains', 'Architecture Domains', 'multi_select', 3, NULL, '[{"value":"business","label":"Business"},{"value":"data","label":"Data"},{"value":"application","label":"Application"},{"value":"integration","label":"Integration"},{"value":"technology","label":"Technology / Infrastructure"},{"value":"security","label":"Security"}]', NULL),
  ('delivery_stage', 'Delivery Stage', 'dropdown', 4, NULL, '[{"value":"initiation","label":"Initiation"},{"value":"design","label":"Design"},{"value":"build","label":"Build"},{"value":"test","label":"Test"},{"value":"pre_go_live","label":"Pre Go-Live"},{"value":"post_go_live","label":"Post Go-Live"}]', NULL),
  ('review_date', 'Review Date', 'date', 5, NULL, NULL, NULL),
  ('chair', 'Chair', 'text', 6, NULL, NULL, NULL),
  ('presenter', 'Presenter', 'text', 7, NULL, NULL, NULL),
  ('review_scope', 'Scope of the Review', 'long_text', 8, 'Scope & Artefacts', NULL, NULL),
  ('questions_for_board', 'Questions for the Board', 'multi_line', 9, 'Scope & Artefacts', NULL, NULL),
  ('artefacts_reviewed', 'Artefacts Reviewed', 'table', 10, 'Scope & Artefacts', '[{"value":"artefact","label":"Artefact"},{"value":"version","label":"Version"},{"value":"reference","label":"Reference"}]', NULL),
  ('related_decisions', 'Related Decisions', 'table', 11, 'Scope & Artefacts', '[{"value":"reference","label":"Reference"},{"value":"decision","label":"Decision"}]', NULL),
  ('participants', 'Participants', 'table', 12, 'Participants', '[{"value":"name","label":"Name"},{"value":"role","label":"Role"},{"value":"attendance","label":"Attendance","type":"select","options":["Attended","Apologies","Delegate sent","Invited"]}]', NULL),
  ('quorum_met', 'Quorum Met', 'boolean', 13, 'Participants', NULL, NULL),
  ('compliance_checks', 'Compliance Checks', 'table', 14, 'Assessment', '[{"value":"standard","label":"Principle / Standard"},{"value":"result","label":"Result","type":"select","options":["Compliant","Partly compliant","Not compliant","Not applicable"]},{"value":"comment","label":"Comment"}]', NULL),
  ('strategic_fit', 'Strategic Fit (1 = poor, 5 = strong)', 'number', 15, 'Assessment', NULL, NULL),
  ('standards_compliance', 'Standards Compliance (1 = poor, 5 = strong)', 'number', 16, 'Assessment', NULL, NULL),
  ('security_rating', 'Security (1 = poor, 5 = strong)', 'number', 17, 'Assessment', NULL, NULL),
  ('resilience_rating', 'Resilience & Performance (1 = poor, 5 = strong)', 'number', 18, 'Assessment', NULL, NULL),
  ('supportability_rating', 'Supportability (1 = poor, 5 = strong)', 'number', 19, 'Assessment', NULL, NULL),
  ('architecture_score', 'Architecture Score', 'number', 20, 'Assessment', NULL, '{"op":"average","fields":["strategic_fit","standards_compliance","security_rating","resilience_rating","supportability_rating"],"of":5,"decimals":1,"display":"percent"}'),
  ('findings', 'Findings', 'table', 21, 'Findings & Actions', '[{"value":"finding","label":"Finding"},{"value":"severity","label":"Severity","type":"select","options":["High","Medium","Low","Observation"]},{"value":"domain","label":"Domain"}]', NULL),
  ('actions', 'Actions', 'table', 22, 'Findings & Actions', '[{"value":"action","label":"Action"},{"value":"owner","label":"Owner"},{"value":"due","label":"Due Date","type":"date"},{"value":"status","label":"Status","type":"select","options":["Open","In Progress","Done"]}]', NULL),
  ('risks_raised', 'Risks Raised', 'table', 23, 'Findings & Actions', '[{"value":"risk","label":"Risk"},{"value":"rating","label":"Rating","type":"select","options":["High","Medium","Low"]},{"value":"mitigation","label":"Mitigation"}]', NULL),
  ('outcome', 'Outcome', 'dropdown', 24, 'Outcome', '[{"value":"approved","label":"Approved"},{"value":"approved_conditions","label":"Approved with Conditions"},{"value":"rework","label":"Rework and Resubmit"},{"value":"rejected","label":"Rejected"},{"value":"deferred","label":"Deferred"}]', NULL),
  ('conditions', 'Conditions', 'multi_line', 25, 'Outcome', NULL, NULL),
  ('waivers', 'Waivers / Dispensations', 'table', 26, 'Outcome', '[{"value":"standard","label":"Standard"},{"value":"reason","label":"Reason"},{"value":"expiry","label":"Expiry Date","type":"date"},{"value":"approved_by","label":"Approved By"}]', NULL),
  ('decision_by', 'Decision By', 'text', 27, 'Outcome', NULL, NULL),
  ('minutes_reference', 'Minutes Reference', 'text', 28, 'Outcome', NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', 29, 'Outcome', NULL, NULL),
  ('notes', 'Notes', 'long_text', 30, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9003-00000000000c'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"requested","label":"Requested"},{"key":"scheduled","label":"Scheduled"},{"key":"in_progress","label":"In Progress"},{"key":"actions_open","label":"Held – Actions Open"},{"key":"complete","label":"Complete"},{"key":"cancelled","label":"Cancelled"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9003-00000000000c'::uuid;

COMMIT;

-- Check: fields and tabs per register.
SELECT r.register_key, count(f.*) AS fields, count(DISTINCT COALESCE(f.field_group, 'Details')) AS tabs,
       count(*) FILTER (WHERE f.field_type = 'table') AS table_fields,
       count(*) FILTER (WHERE f.calculation IS NOT NULL) AS calculated_fields
FROM public.local_registers r JOIN public.local_register_fields f ON f.register_id = r.id
WHERE r.id IN ('00000000-0000-4000-9003-00000000000c'::uuid)
GROUP BY r.register_key ORDER BY r.register_key;
