-- ============================================================================
-- v1362: Information Technology — Technology Milestones form
-- ============================================================================
-- Owner request 2026-11-09: New Technology Milestones opened as Title, Description
-- and Status only. A milestone is a dated point on the delivery, so the form
-- captures when it is due, who owns it, what must be true to pass it, and what
-- happens if it is missed. Workstreams and the roadmap stay linked, not re-typed.
--
-- A dependency line splits into Dependency | Needed from | Needed by, so those
-- columns can be searched and sorted (rule 67.1). Entry criteria, success
-- criteria and evidence stay one statement per line.
-- Status keeps Upcoming, Met and Missed, and adds At Risk.
-- Vendor-neutral (rule 26). System fields live in public and are read by both
-- Platform and Simulator. Prerequisites: v1297, v1299, v1304, v1316, v1326, v1332.
-- Idempotent. No record values are rewritten.
-- ============================================================================

UPDATE public.local_registers
SET status_workflow = '[
  {"key":"upcoming","label":"Upcoming"},
  {"key":"at_risk","label":"At Risk"},
  {"key":"met","label":"Met"},
  {"key":"missed","label":"Missed"}
]'::jsonb,
    updated_at = NOW()
WHERE register_key = 'ict_technology_milestones'
  AND is_system_defined = TRUE;

INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  -- Details (with Title, Description, Status). The first four are the list columns.
  ('planned_date', 'Planned Date', 'date', true, 0, NULL, NULL),
  ('owner', 'Owner', 'user_picker', false, 1, NULL, NULL),
  ('milestone_type', 'Milestone Type', 'dropdown', false, 2, NULL,
    '[{"value":"decision","label":"Decision"},{"value":"scope_baseline","label":"Scope baseline"},{"value":"build_complete","label":"Build complete"},{"value":"test_entry","label":"Test entry"},{"value":"test_exit","label":"Test exit"},{"value":"rehearsal","label":"Rehearsal"},{"value":"go_live","label":"Go-live"},{"value":"regulatory","label":"Regulatory"},{"value":"operational_readiness","label":"Operational readiness"},{"value":"other","label":"Other"}]'),
  ('workstream', 'Workstream', 'text', false, 3, NULL, NULL),
  ('forecast_date', 'Forecast Date', 'date', false, 4, NULL, NULL),
  ('actual_date', 'Actual Date', 'date', false, 5, NULL, NULL),
  ('on_critical_path', 'On the critical path', 'boolean', false, 6, NULL, NULL),

  -- Exit criteria
  ('entry_criteria', 'Entry Criteria', 'multi_line', false, 7, 'Exit Criteria', NULL),
  ('success_criteria', 'Success Criteria', 'multi_line', false, 8, 'Exit Criteria', NULL),
  ('evidence', 'Evidence', 'multi_line', false, 9, 'Exit Criteria', NULL),

  -- Dependencies & Health
  ('dependencies', 'Dependencies', 'table', false, 10, 'Dependencies & Health',
    '[{"value":"dependency","label":"Dependency"},{"value":"needed_from","label":"Needed from"},{"value":"needed_by","label":"Needed by","type":"date"}]'),
  ('impact_if_missed', 'Impact if Missed', 'dropdown', false, 11, 'Dependencies & Health',
    '[{"value":"critical","label":"Critical"},{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]'),
  ('rag_status', 'RAG Status', 'dropdown', false, 12, 'Dependencies & Health',
    '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]'),

  -- Related registers for this project
  ('workstreams', 'Workstreams', 'linked_records', false, 13, 'Related',
    '[{"value":"ict_workstreams","label":"Workstreams"}]'),
  ('technology_roadmap', 'Technology Roadmap', 'linked_records', false, 14, 'Related',
    '[{"value":"ict_technology_roadmap","label":"Technology Roadmap"}]')
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'ict_technology_milestones'
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
  WHERE lr.register_key = 'ict_technology_milestones' AND lr.is_system_defined = TRUE;
  RAISE NOTICE 'v1362: ict_technology_milestones has % fields and % tabs (expected 15 fields, 3 tabs)', v_fields, v_groups;
END $$;

NOTIFY pgrst, 'reload schema';
