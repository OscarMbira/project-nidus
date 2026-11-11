-- ============================================================================
-- v1358: Information Technology — Workstreams form
-- ============================================================================
-- Owner request 2026-11-09: New Workstreams (ict_workstreams) opened as Title,
-- Description and Status only. A technology workstream is one owned slice of the
-- delivery, so the form captures who leads it, what it will produce, what it
-- depends on, who is on it, and whether it is on track. The programme-level
-- overview stays on Delivery Overview; milestones and the roadmap are linked,
-- not re-typed.
--
-- Structured lists are tables (Date | Milestone style) so each column can be
-- searched and sorted. Single statements stay one item per line.
-- Status keeps Not Started, In Progress and Complete, and adds On Hold.
-- Vendor-neutral (rule 26). System fields live in public and are read by both
-- Platform and Simulator. Prerequisites: v1297, v1299, v1304, v1316, v1326, v1332, v1351.
-- Idempotent. No record values are rewritten.
-- ============================================================================

UPDATE public.local_registers
SET status_workflow = '[
  {"key":"not_started","label":"Not Started"},
  {"key":"in_progress","label":"In Progress"},
  {"key":"on_hold","label":"On Hold"},
  {"key":"complete","label":"Complete"}
]'::jsonb,
    updated_at = NOW()
WHERE register_key = 'ict_workstreams'
  AND is_system_defined = TRUE;

INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  -- Details (with Title, Description, Status)
  ('workstream_lead', 'Workstream Lead', 'user_picker', true, 0, NULL, NULL),
  ('business_owner', 'Business Owner', 'user_picker', false, 1, NULL, NULL),
  ('workstream_type', 'Workstream Type', 'dropdown', false, 2, NULL,
    '[{"value":"business_capability","label":"Business capability"},{"value":"channels","label":"Channels and experience"},{"value":"data","label":"Data"},{"value":"integration","label":"Integration"},{"value":"infrastructure","label":"Infrastructure and environments"},{"value":"security","label":"Security"},{"value":"testing","label":"Testing"},{"value":"operational_readiness","label":"Operational readiness"},{"value":"change","label":"Change and training"},{"value":"regulatory","label":"Regulatory"},{"value":"cross_cutting","label":"Cross-cutting"}]'),
  ('priority', 'Priority', 'dropdown', false, 3, NULL,
    '[{"value":"critical","label":"Critical"},{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]'),
  ('on_critical_path', 'On the critical path', 'boolean', false, 4, NULL, NULL),
  ('planned_start_date', 'Planned Start', 'date', false, 5, NULL, NULL),
  ('planned_end_date', 'Planned End', 'date', false, 6, NULL, NULL),
  ('forecast_end_date', 'Forecast End', 'date', false, 7, NULL, NULL),
  ('percent_complete', 'Percent Complete (%)', 'number', false, 8, NULL, NULL),

  -- Scope
  ('objectives', 'Objectives', 'multi_line', false, 9, 'Scope', NULL),
  ('in_scope', 'In Scope', 'multi_line', false, 10, 'Scope', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 11, 'Scope', NULL),
  ('success_criteria', 'Success Criteria', 'multi_line', false, 12, 'Scope', NULL),

  -- Deliverables
  ('key_deliverables', 'Key Deliverables', 'table', false, 13, 'Deliverables',
    '[{"value":"deliverable","label":"Deliverable"},{"value":"target_date","label":"Target date","type":"date"},{"value":"owner","label":"Owner"}]'),

  -- Dependencies & Risks
  ('dependencies', 'Dependencies', 'table', false, 14, 'Dependencies & Risks',
    '[{"value":"dependency","label":"Dependency"},{"value":"needed_from","label":"Needed from"},{"value":"needed_by","label":"Needed by","type":"date"}]'),
  ('risks', 'Risks', 'table', false, 15, 'Dependencies & Risks',
    '[{"value":"risk","label":"Risk"},{"value":"mitigation","label":"Mitigation"}]'),
  ('issues', 'Issues', 'table', false, 16, 'Dependencies & Risks',
    '[{"value":"issue","label":"Issue"},{"value":"next_action","label":"Next action"}]'),
  ('decisions_needed', 'Decisions Needed', 'multi_line', false, 17, 'Dependencies & Risks', NULL),

  -- Team & Cost
  ('team', 'Team', 'table', false, 18, 'Team & Cost',
    '[{"value":"role","label":"Role"},{"value":"name","label":"Name"}]'),
  ('required_skills', 'Required Skills', 'table', false, 19, 'Team & Cost',
    '[{"value":"skill","label":"Skill"},{"value":"level","label":"Level","type":"select","options":["Awareness","Working","Skilled","Expert"]},{"value":"quantity","label":"Quantity"}]'),
  ('approved_budget', 'Approved Budget', 'currency', false, 20, 'Team & Cost', NULL),
  ('forecast_to_complete', 'Forecast to Complete', 'currency', false, 21, 'Team & Cost', NULL),

  -- Progress
  ('rag_status', 'RAG Status', 'dropdown', false, 22, 'Progress',
    '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]'),
  ('status_headline', 'Status Headline', 'long_text', false, 23, 'Progress', NULL),
  ('blockers', 'Blockers', 'multi_line', false, 24, 'Progress', NULL),
  ('last_status_update', 'Last Status Update', 'date', false, 25, 'Progress', NULL),

  -- Related registers for this project
  ('technology_milestones', 'Technology Milestones', 'linked_records', false, 26, 'Related',
    '[{"value":"ict_technology_milestones","label":"Technology Milestones"}]'),
  ('technology_roadmap', 'Technology Roadmap', 'linked_records', false, 27, 'Related',
    '[{"value":"ict_technology_roadmap","label":"Technology Roadmap"}]')
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'ict_workstreams'
  AND lr.is_system_defined = TRUE
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

DO $$
DECLARE
  v_fields INT;
  v_groups INT;
BEGIN
  SELECT COUNT(*), COUNT(DISTINCT field_group) FILTER (WHERE field_group IS NOT NULL)
    INTO v_fields, v_groups
  FROM public.local_register_fields f
  JOIN public.local_registers lr ON lr.id = f.register_id
  WHERE lr.register_key = 'ict_workstreams' AND lr.is_system_defined = TRUE;
  RAISE NOTICE 'v1358: ict_workstreams has % fields and % tabs (expected 28 fields, 6 tabs)', v_fields, v_groups;
END $$;

NOTIFY pgrst, 'reload schema';
