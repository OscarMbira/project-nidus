-- ============================================================================
-- v1304: Local Register 'multi_select' field type + Regulatory Milestones "Impact Types"
-- ============================================================================
-- 1. Adds a 'multi_select' field type to local_register_fields (public + sim, engine parity).
--    It reuses dropdown_options; the form renders @nidus/ui MultiSelectDropdown and stores the
--    value as a JSON array of option values in local_register_records.field_values.
-- 2. Regulatory Milestones (fin_regulatory_milestones, 00000000-0000-4000-9001-000000000005),
--    owner decision 2026-10-21:
--      * impact_if_missed stays a single dropdown (Critical/High/Medium/Low), relabelled
--        "Impact Severity", on the Deadline & Accountability tab.
--      * New multi-select impact_types ("Impact Types") on its own tab, right after it.
--    Submission & Approval fields move down one display_order to make room. The form reads:
--      Details · Deadline & Accountability · Impact Types · Submission & Approval · Audit details
-- Prerequisite: v1299 (named field_type constraints). Idempotent.
-- ============================================================================

-- ── 1. Allow 'multi_select' in both schemas ─────────────────────────────────────────
ALTER TABLE public.local_register_fields DROP CONSTRAINT IF EXISTS chk_local_register_fields_field_type;
ALTER TABLE public.local_register_fields
  ADD CONSTRAINT chk_local_register_fields_field_type CHECK (field_type IN
    ('text', 'multi_line', 'number', 'date', 'dropdown', 'multi_select', 'boolean', 'user_picker', 'currency'));

ALTER TABLE sim.local_register_fields DROP CONSTRAINT IF EXISTS chk_sim_local_register_fields_field_type;
ALTER TABLE sim.local_register_fields
  ADD CONSTRAINT chk_sim_local_register_fields_field_type CHECK (field_type IN
    ('text', 'multi_line', 'number', 'date', 'dropdown', 'multi_select', 'boolean', 'user_picker', 'currency'));

-- ── 2. Regulatory Milestones ────────────────────────────────────────────────────────
UPDATE public.local_register_fields
SET field_label = 'Impact Severity', updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-000000000005'::uuid
  AND field_key = 'impact_if_missed';

-- Make room after Deadline & Accountability (display_order 4-8)
UPDATE public.local_register_fields f
SET display_order = v.display_order, updated_at = NOW()
FROM (VALUES
  ('submission_date', 10),
  ('submission_reference', 11),
  ('approval_date', 12),
  ('evidence_location', 13),
  ('regulator_feedback', 14),
  ('rag_status', 15)
) AS v(field_key, display_order)
WHERE f.register_id = '00000000-0000-4000-9001-000000000005'::uuid
  AND f.field_key = v.field_key;

INSERT INTO public.local_register_fields (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-000000000005'::uuid, 'impact_types', 'Impact Types', 'multi_select', false, 9, 'Impact Types',
  '[{"value":"regulatory_penalty","label":"Regulatory Penalty / Fine"},{"value":"licence_restriction","label":"Licence or Operating Restriction"},{"value":"go_live_delay","label":"Go-Live Delay"},{"value":"reputational_damage","label":"Reputational Damage"},{"value":"customer_harm","label":"Customer Harm"},{"value":"legal_action","label":"Legal Action"},{"value":"supervisory_scrutiny","label":"Increased Supervisory Scrutiny"}]'::jsonb
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000005'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type,
  display_order = EXCLUDED.display_order, field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options, updated_at = NOW();

DO $$
DECLARE
  v_total INT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.local_register_fields
  WHERE register_id = '00000000-0000-4000-9001-000000000005'::uuid;
  RAISE NOTICE 'v1304: Regulatory Milestones has % fields (expected 16, incl. Impact Types)', v_total;
END $$;

NOTIFY pgrst, 'reload schema';
