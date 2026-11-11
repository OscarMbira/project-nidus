-- ============================================================================
-- v1389: Functional Design shows the project's requirements from the Requirements register
-- ============================================================================
-- PRD / plan v1338, Slice 7 — decision D9.
-- Functional Design (ict_functional_design) typed its requirements twice (Business Requirements and
-- Functional Requirements text lists). Both become read-only "linked records" chapters from the
-- Requirements register (core source, v1387 engine) — the same view the Requirements Specification
-- uses. Any text already typed is kept in a new "Requirements Notes (legacy)" field first, then the
-- old keys are removed from the records, so nothing is lost.
-- Note: re-running v1324 would turn the two fields back into text lists — re-run this file after it
-- (the legacy copy is idempotent: it only fills an empty legacy field).
-- Prerequisites: v1324, v1332, v1387. Idempotent.
-- ============================================================================

-- ── 1. Legacy notes field (Business Context tab) ────────────────────────────────
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, 'requirements_notes_legacy', 'Requirements Notes (legacy)', 'long_text', false, 16, 'Business Context', NULL
FROM public.local_registers lr
WHERE lr.register_key = 'ict_functional_design' AND lr.is_system_defined = TRUE
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, updated_at = NOW();

-- ── 2. Keep any typed requirement text (public and sim records) ─────────────────
WITH reg AS (
  SELECT id FROM public.local_registers WHERE register_key = 'ict_functional_design' AND is_system_defined = TRUE
)
UPDATE public.local_register_records r
SET field_values = (r.field_values - 'business_requirements' - 'functional_requirements')
      || CASE
           WHEN COALESCE(r.field_values ->> 'requirements_notes_legacy', '') <> '' THEN '{}'::jsonb
           ELSE jsonb_build_object('requirements_notes_legacy', concat_ws(E'\n\n',
             CASE WHEN COALESCE(r.field_values ->> 'business_requirements', '') <> ''
                  THEN 'Business requirements:' || E'\n' || (r.field_values ->> 'business_requirements') END,
             CASE WHEN COALESCE(r.field_values ->> 'functional_requirements', '') <> ''
                  THEN 'Functional requirements:' || E'\n' || (r.field_values ->> 'functional_requirements') END))
         END,
    updated_at = NOW()
FROM reg
WHERE r.register_id = reg.id
  AND (r.field_values ? 'business_requirements' OR r.field_values ? 'functional_requirements')
  AND r.signoff_state = 'none';

WITH reg AS (
  SELECT id FROM public.local_registers WHERE register_key = 'ict_functional_design' AND is_system_defined = TRUE
)
UPDATE sim.local_register_records r
SET field_values = (r.field_values - 'business_requirements' - 'functional_requirements')
      || CASE
           WHEN COALESCE(r.field_values ->> 'requirements_notes_legacy', '') <> '' THEN '{}'::jsonb
           ELSE jsonb_build_object('requirements_notes_legacy', concat_ws(E'\n\n',
             CASE WHEN COALESCE(r.field_values ->> 'business_requirements', '') <> ''
                  THEN 'Business requirements:' || E'\n' || (r.field_values ->> 'business_requirements') END,
             CASE WHEN COALESCE(r.field_values ->> 'functional_requirements', '') <> ''
                  THEN 'Functional requirements:' || E'\n' || (r.field_values ->> 'functional_requirements') END))
         END,
    updated_at = NOW()
FROM reg
WHERE r.register_id = reg.id
  AND (r.field_values ? 'business_requirements' OR r.field_values ? 'functional_requirements')
  AND r.signoff_state = 'none';

-- Blank legacy values (records whose lists were empty) are not kept. Records locked for sign-off are
-- left exactly as they are (the sign-off lock refuses edits); their old text stays in the record.
UPDATE public.local_register_records r
SET field_values = r.field_values - 'requirements_notes_legacy'
FROM public.local_registers lr
WHERE lr.id = r.register_id AND lr.register_key = 'ict_functional_design'
  AND r.signoff_state = 'none'
  AND COALESCE(r.field_values ->> 'requirements_notes_legacy', 'x') = '';

UPDATE sim.local_register_records r
SET field_values = r.field_values - 'requirements_notes_legacy'
FROM public.local_registers lr
WHERE lr.id = r.register_id AND lr.register_key = 'ict_functional_design'
  AND r.signoff_state = 'none'
  AND COALESCE(r.field_values ->> 'requirements_notes_legacy', 'x') = '';

-- ── 3. The two fields become read-only chapters from the Requirements register ───
UPDATE public.local_register_fields f
SET field_type = 'linked_records',
    field_label = v.field_label,
    dropdown_options = v.options::jsonb,
    updated_at = NOW()
FROM public.local_registers lr,
     (VALUES
       ('business_requirements', 'Business Requirements', '[{"value":"core:requirements","label":"Requirements register","category":"business"}]'),
       ('functional_requirements', 'Functional Requirements', '[{"value":"core:requirements","label":"Requirements register","category":"functional"}]')
     ) AS v(field_key, field_label, options)
WHERE lr.id = f.register_id
  AND lr.register_key = 'ict_functional_design' AND lr.is_system_defined = TRUE
  AND f.field_key = v.field_key;

-- ── Check ────────────────────────────────────────────────────────────────────────
SELECT f.field_key, f.field_label, f.field_type, f.field_group, f.dropdown_options
FROM public.local_register_fields f
JOIN public.local_registers lr ON lr.id = f.register_id
WHERE lr.register_key = 'ict_functional_design' AND lr.is_system_defined = TRUE
  AND f.field_key IN ('business_requirements', 'functional_requirements', 'requirements_notes_legacy')
ORDER BY f.display_order;

NOTIFY pgrst, 'reload schema';
