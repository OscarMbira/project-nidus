-- ============================================================================
-- v1377: Information Technology › Architecture — splittable list fields become tables
-- ============================================================================
-- Owner request 2026-11-09: full field audit of the Architecture registers (Enterprise, Solution,
-- Application, Data, Integration, Security Architecture and Architecture Decisions). Every line of
-- these multi-line fields splits into the same parts, so each becomes a table field with one named
-- column per part — searchable, sortable, and a real table in the exports (rules 67.1, 38.1).
--
--   All seven  risks_mitigations            Risk | Mitigation
--   All seven  roles_and_responsibilities   Role | Responsibility | Name
--   Enterprise transition_architectures     Transition | Architecture State
--   Solution   stakeholders                 Name | Role
--   Solution   non_functional_requirements  Category | Requirement | Target
--   Solution   data_flows                   Source | Target | Pattern (list)
--   Solution   architecture_decisions       Reference | Decision
--   Application non_functional_requirements Requirement | Target
--   Data       data_flows                   Flow | Source | Target
--   Data       data_owners                  Name | Role
--   Integration interfaces                  Interface | Source | Target | Pattern (list) | Frequency
--   Security   data_classification          Data | Classification (list)
--   Security   residual_risks               Residual Risk | Treatment
--   Decisions  options_considered           Option | Pros | Cons
--   Decisions  related_decisions            Reference | Decision
--
-- Lines saved as "A – B – C" already read into the columns. Section 2 rewrites the v1374 sample
-- lines written as "A: B", "Name (Role)" or "Source to Target (pattern)" into one cell per part
-- (tab-separated) — sample rows only; nothing else is touched.
-- Stays a list: one statement per line, and fields where a dash is only part of a name (e.g.
-- "Target core banking platform – customer module" in Technology Stack). Related Documents stays
-- a list because the document's Document Control page lays it out as a reference list.
-- Re-run this file if v1324 is applied again (v1324 defines these fields as multi-line).
-- Prerequisites: v1324, v1326, v1351 (select columns), v1374. Idempotent.
-- ============================================================================

-- ── 1. Field definitions ──────────────────────────────────────────────────────
WITH defs(register_keys, field_key, field_label, columns) AS (
  VALUES
    (ARRAY['ict_enterprise_architecture', 'ict_solution_architecture', 'ict_application_architecture', 'ict_data_architecture',
           'ict_integration_architecture', 'ict_security_architecture', 'ict_architecture_decisions'],
     'risks_mitigations', 'Risks and Mitigations',
     '[{"value":"risk","label":"Risk"},{"value":"mitigation","label":"Mitigation"}]'),
    (ARRAY['ict_enterprise_architecture', 'ict_solution_architecture', 'ict_application_architecture', 'ict_data_architecture',
           'ict_integration_architecture', 'ict_security_architecture', 'ict_architecture_decisions'],
     'roles_and_responsibilities', 'Roles and Responsibilities',
     '[{"value":"role","label":"Role"},{"value":"responsibility","label":"Responsibility"},{"value":"name","label":"Name"}]'),
    (ARRAY['ict_enterprise_architecture'], 'transition_architectures', 'Transition Architectures',
     '[{"value":"transition","label":"Transition"},{"value":"state","label":"Architecture State"}]'),
    (ARRAY['ict_solution_architecture'], 'stakeholders', 'Stakeholders',
     '[{"value":"name","label":"Name"},{"value":"role","label":"Role"}]'),
    (ARRAY['ict_solution_architecture'], 'non_functional_requirements', 'Non-Functional Requirements',
     '[{"value":"category","label":"Category"},{"value":"requirement","label":"Requirement"},{"value":"target","label":"Target"}]'),
    (ARRAY['ict_solution_architecture'], 'data_flows', 'Data Flows',
     '[{"value":"source","label":"Source"},{"value":"target","label":"Target"},{"value":"pattern","label":"Pattern","type":"select","options":["Batch","Real-time API","Event streaming","ETL/ELT","Replication","File transfer"]}]'),
    (ARRAY['ict_solution_architecture'], 'architecture_decisions', 'Architecture Decisions',
     '[{"value":"reference","label":"Reference"},{"value":"decision","label":"Decision"}]'),
    (ARRAY['ict_application_architecture'], 'non_functional_requirements', 'Non-Functional Requirements',
     '[{"value":"requirement","label":"Requirement"},{"value":"target","label":"Target"}]'),
    (ARRAY['ict_data_architecture'], 'data_flows', 'Data Flows',
     '[{"value":"flow","label":"Flow"},{"value":"source","label":"Source"},{"value":"target","label":"Target"}]'),
    (ARRAY['ict_data_architecture'], 'data_owners', 'Data Owners',
     '[{"value":"name","label":"Name"},{"value":"role","label":"Role"}]'),
    (ARRAY['ict_integration_architecture'], 'interfaces', 'Interfaces',
     '[{"value":"interface","label":"Interface"},{"value":"source","label":"Source"},{"value":"target","label":"Target"},{"value":"pattern","label":"Pattern","type":"select","options":["Batch","Real-time API","Event streaming","ETL/ELT","Replication","File transfer"]},{"value":"frequency","label":"Frequency"}]'),
    (ARRAY['ict_security_architecture'], 'data_classification', 'Data Classification',
     '[{"value":"data","label":"Data"},{"value":"classification","label":"Classification","type":"select","options":["Public","Internal","Confidential","Restricted"]}]'),
    (ARRAY['ict_security_architecture'], 'residual_risks', 'Residual Risks',
     '[{"value":"risk","label":"Residual Risk"},{"value":"treatment","label":"Treatment"}]'),
    (ARRAY['ict_architecture_decisions'], 'options_considered', 'Options Considered',
     '[{"value":"option","label":"Option"},{"value":"pros","label":"Pros"},{"value":"cons","label":"Cons"}]'),
    (ARRAY['ict_architecture_decisions'], 'related_decisions', 'Related Decisions',
     '[{"value":"reference","label":"Reference"},{"value":"decision","label":"Decision"}]')
)
UPDATE public.local_register_fields f
SET field_type = 'table',
    field_label = d.field_label,
    dropdown_options = d.columns::jsonb,
    updated_at = NOW()
FROM defs d, public.local_registers lr
WHERE lr.id = f.register_id
  AND lr.is_system_defined = TRUE
  AND lr.register_key = ANY (d.register_keys)
  AND f.field_key = d.field_key;

-- ── 2. Sample rows (v1374): one cell per part ─────────────────────────────────
-- 'n' = newline-sensitive, so ^ and $ match at each line.
WITH regs AS (
  SELECT id, register_key FROM public.local_registers
  WHERE is_system_defined = TRUE
    AND register_key IN ('ict_enterprise_architecture', 'ict_solution_architecture', 'ict_application_architecture',
                         'ict_data_architecture', 'ict_security_architecture')
)
UPDATE public.local_register_records r
SET field_values = r.field_values || (
      CASE regs.register_key
        WHEN 'ict_enterprise_architecture' THEN jsonb_strip_nulls(jsonb_build_object(
          'transition_architectures', regexp_replace(r.field_values ->> 'transition_architectures', '^([^:\t]+):\s*([^\t]+)$', E'\\1\t\\2', 'gn')))
        WHEN 'ict_solution_architecture' THEN jsonb_strip_nulls(jsonb_build_object(
          'stakeholders', regexp_replace(r.field_values ->> 'stakeholders', '^([^(\t]+) \(([^)]+)\)$', E'\\1\t\\2', 'gn'),
          'data_flows',
            replace(replace(replace(replace(replace(replace(
              regexp_replace(r.field_values ->> 'data_flows', '^(.+) to ([^(\t]+) \(([^)]+)\)$', E'\\1\t\\2\t\\3', 'gn'),
              E'\treal-time api', E'\tReal-time API'), E'\tevent streaming', E'\tEvent streaming'),
              E'\tfile transfer', E'\tFile transfer'), E'\tbatch', E'\tBatch'),
              E'\treplication', E'\tReplication'), E'\tetl/elt', E'\tETL/ELT')))
        WHEN 'ict_application_architecture' THEN jsonb_strip_nulls(jsonb_build_object(
          'non_functional_requirements', regexp_replace(r.field_values ->> 'non_functional_requirements', '^([^:\t]+):\s*([^\t]+)$', E'\\1\t\\2', 'gn')))
        WHEN 'ict_data_architecture' THEN jsonb_strip_nulls(jsonb_build_object(
          'data_flows', regexp_replace(r.field_values ->> 'data_flows', '^([^:\t]+):\s*(.+) to ([^\t]+)$', E'\\1\t\\2\t\\3', 'gn'),
          'data_owners', regexp_replace(r.field_values ->> 'data_owners', '^([^(\t]+) \(([^)]+)\)$', E'\\1\t\\2', 'gn')))
        WHEN 'ict_security_architecture' THEN jsonb_strip_nulls(jsonb_build_object(
          'data_classification', regexp_replace(r.field_values ->> 'data_classification', '^([^:\t]+):\s*([^\t]+)$', E'\\1\t\\2', 'gn'),
          'residual_risks', regexp_replace(r.field_values ->> 'residual_risks', '^([^\t]+) \(([^)]+)\)$', E'\\1\t\\2', 'gn')))
      END),
    updated_at = NOW()
FROM regs
WHERE r.register_id = regs.id
  AND r.id::text ~ '^00000000-0000-4000-a0(1[b-f]|20)-';

DO $$
DECLARE
  v_tables INT;
BEGIN
  SELECT COUNT(*) INTO v_tables
  FROM public.local_register_fields f
  JOIN public.local_registers lr ON lr.id = f.register_id
  WHERE lr.is_system_defined = TRUE AND f.field_type = 'table'
    AND lr.register_key IN ('ict_enterprise_architecture', 'ict_solution_architecture', 'ict_application_architecture',
                            'ict_data_architecture', 'ict_integration_architecture', 'ict_security_architecture', 'ict_architecture_decisions')
    AND f.field_key NOT IN ('glossary', 'appendices', 'version_history');
  RAISE NOTICE 'v1377: % architecture list fields are tables (expected 27)', v_tables;
END $$;

NOTIFY pgrst, 'reload schema';
