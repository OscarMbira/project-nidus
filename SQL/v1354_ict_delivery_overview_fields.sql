-- ============================================================================
-- v1354: Information Technology — Delivery Overview form
-- ============================================================================
-- Owner request 2026-11-08: the Delivery Overview register (ict_delivery_overview) still
-- opened as Title, Description and Status only. This gives it the fields a technology
-- delivery overview is actually used for, on the same tab engine as the other industry
-- registers (field_group → tab; ungrouped fields stay on Details).
--
-- It stays a living overview, not a signed document (Technology Roadmap already covers
-- the controlled roadmap). Status keeps Draft and Published and adds In Delivery, On Hold
-- and Closed. Workstreams, milestones and the roadmap are linked, not re-typed.
-- Vendor-neutral (rule 26). System register fields live in public and are read by both
-- Platform and Simulator. Prerequisites: v1297, v1299, v1304, v1316, v1326, v1332.
-- Idempotent. No record values are rewritten.
-- ============================================================================

-- ── 1. Lifecycle that matches a living delivery overview ────────────────────────
UPDATE public.local_registers
SET status_workflow = '[
  {"key":"draft","label":"Draft"},
  {"key":"in_delivery","label":"In Delivery"},
  {"key":"on_hold","label":"On Hold"},
  {"key":"published","label":"Published"},
  {"key":"closed","label":"Closed"}
]'::jsonb,
    updated_at = NOW()
WHERE register_key = 'ict_delivery_overview'
  AND is_system_defined = TRUE;

-- ── 2. Fields: Details + 7 tabs ─────────────────────────────────────────────────
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  -- Details (with Title, Description, Status)
  ('delivery_lead', 'Delivery Lead', 'user_picker', true, 0, NULL, NULL),
  ('business_owner', 'Business Owner', 'user_picker', false, 1, NULL, NULL),
  ('delivery_type', 'Delivery Type', 'dropdown', true, 2, NULL,
    '[{"value":"new_build","label":"New build"},{"value":"enhancement","label":"Enhancement"},{"value":"replacement","label":"System replacement"},{"value":"migration","label":"Platform or data migration"},{"value":"integration","label":"Integration"},{"value":"platform","label":"Platform or infrastructure"},{"value":"mixed","label":"Mixed"}]'),
  ('delivery_approach', 'Delivery Approach', 'dropdown', false, 3, NULL,
    '[{"value":"structured","label":"Structured (sequential stages)"},{"value":"iterative","label":"Iterative"},{"value":"hybrid","label":"Hybrid"}]'),
  ('current_phase', 'Current Phase', 'dropdown', false, 4, NULL,
    '[{"value":"initiation","label":"Initiation"},{"value":"discovery","label":"Discovery"},{"value":"design","label":"Design"},{"value":"build","label":"Build"},{"value":"test","label":"Test"},{"value":"release","label":"Release"},{"value":"hypercare","label":"Hypercare"},{"value":"closed","label":"Closed"}]'),
  ('start_date', 'Start Date', 'date', false, 5, NULL, NULL),
  ('target_go_live', 'Target Go-Live', 'date', false, 6, NULL, NULL),

  -- Governance
  ('executive_sponsor', 'Executive Sponsor', 'user_picker', false, 7, 'Governance', NULL),
  ('technical_lead', 'Technical Lead', 'user_picker', false, 8, 'Governance', NULL),
  ('governance_forum', 'Governance Forum', 'text', false, 9, 'Governance', NULL),
  ('reporting_cadence', 'Reporting Cadence', 'dropdown', false, 10, 'Governance',
    '[{"value":"weekly","label":"Weekly"},{"value":"fortnightly","label":"Fortnightly"},{"value":"monthly","label":"Monthly"},{"value":"quarterly","label":"Quarterly"}]'),
  ('escalation_path', 'Escalation Path', 'long_text', false, 11, 'Governance', NULL),

  -- Scope
  ('in_scope', 'In Scope', 'multi_line', false, 12, 'Scope', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 13, 'Scope', NULL),
  ('success_criteria', 'Success Criteria', 'multi_line', false, 14, 'Scope', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 15, 'Scope', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 16, 'Scope', NULL),

  -- What is being delivered
  ('capabilities', 'Capabilities Being Delivered', 'multi_line', false, 17, 'Delivery Shape', NULL),
  ('systems_in_scope', 'Systems in Scope', 'multi_line', false, 18, 'Delivery Shape', NULL),
  ('environments_in_scope', 'Environments in Scope', 'multi_select', false, 19, 'Delivery Shape',
    '[{"value":"development","label":"Development"},{"value":"test","label":"Test"},{"value":"sit","label":"System integration test"},{"value":"uat","label":"User acceptance test"},{"value":"pre_production","label":"Pre-production"},{"value":"production","label":"Production"},{"value":"dr","label":"Disaster recovery"}]'),
  ('business_change_impact', 'Business Change Impact', 'long_text', false, 20, 'Delivery Shape', NULL),

  -- Health
  ('overall_rag', 'Overall RAG', 'dropdown', false, 21, 'Health',
    '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]'),
  ('schedule_rag', 'Schedule RAG', 'dropdown', false, 22, 'Health',
    '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]'),
  ('scope_rag', 'Scope RAG', 'dropdown', false, 23, 'Health',
    '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]'),
  ('quality_rag', 'Quality RAG', 'dropdown', false, 24, 'Health',
    '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]'),
  ('cost_rag', 'Cost RAG', 'dropdown', false, 25, 'Health',
    '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]'),
  ('headline', 'Headline This Period', 'long_text', false, 26, 'Health', NULL),
  ('last_review_date', 'Last Review Date', 'date', false, 27, 'Health', NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 28, 'Health', NULL),

  -- Dependencies & Risks
  ('key_dependencies', 'Key Dependencies', 'multi_line', false, 29, 'Dependencies & Risks', NULL),
  ('key_risks', 'Key Risks', 'multi_line', false, 30, 'Dependencies & Risks', NULL),
  ('key_issues', 'Key Issues', 'multi_line', false, 31, 'Dependencies & Risks', NULL),
  ('decisions_needed', 'Decisions Needed', 'multi_line', false, 32, 'Dependencies & Risks', NULL),

  -- Team & Investment
  ('delivery_team', 'Delivery Team', 'table', false, 33, 'Team & Investment',
    '[{"value":"role","label":"Role"},{"value":"name","label":"Name"}]'),
  ('suppliers', 'Suppliers and Partners', 'multi_line', false, 34, 'Team & Investment', NULL),
  ('approved_budget', 'Approved Budget', 'currency', false, 35, 'Team & Investment', NULL),
  ('forecast_to_complete', 'Forecast to Complete', 'currency', false, 36, 'Team & Investment', NULL),
  ('expected_benefits', 'Expected Benefits', 'multi_line', false, 37, 'Team & Investment', NULL),

  -- Related registers for this project (shown on the record; edited in those registers)
  ('workstreams', 'Workstreams', 'linked_records', false, 38, 'Related',
    '[{"value":"ict_workstreams","label":"Workstreams"}]'),
  ('technology_milestones', 'Technology Milestones', 'linked_records', false, 39, 'Related',
    '[{"value":"ict_technology_milestones","label":"Technology Milestones"}]'),
  ('technology_roadmap', 'Technology Roadmap', 'linked_records', false, 40, 'Related',
    '[{"value":"ict_technology_roadmap","label":"Technology Roadmap"}]')
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'ict_delivery_overview'
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
  WHERE lr.register_key = 'ict_delivery_overview' AND lr.is_system_defined = TRUE;
  RAISE NOTICE 'v1354: ict_delivery_overview has % fields and % tabs (expected 41 fields, 7 tabs)', v_fields, v_groups;
END $$;

NOTIFY pgrst, 'reload schema';
