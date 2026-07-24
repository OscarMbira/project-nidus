-- ============================================================================
-- v760: F017 Activity List — required skill(s) standard fields
-- Platform (public) + Simulator (sim)
-- Adds: required_skills (textarea), minimum_proficiency (select)
-- Idempotent: new version only when schema differs; converges is_current.
-- Companion to projectplan/v756_template_field_governance_plan.md (rule 18.2)
-- Apply after v759 (or v755 if v759 not yet applied).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- public schema (Platform)
-- ----------------------------------------------------------------------------

WITH schemas(template_code, schema) AS (
VALUES
('F017', '{"title":"Activity List","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"activity_name","label":"Activity Name","type":"text"},
  {"key":"wbs_reference","label":"WBS Reference","type":"text"},
  {"key":"description","label":"Description","type":"textarea"},
  {"key":"duration_estimate","label":"Duration Estimate (days)","type":"number"},
  {"key":"resource_assigned","label":"Assigned Resource(s)","type":"text"},
  {"key":"required_skills","label":"Required Skill(s) (one per line)","type":"textarea"},
  {"key":"minimum_proficiency","label":"Minimum Proficiency","type":"select","options":[{"value":"basic","label":"Basic"},{"value":"intermediate","label":"Intermediate"},{"value":"advanced","label":"Advanced"},{"value":"expert","label":"Expert"}]},
  {"key":"activity_type","label":"Activity Type","type":"select","options":[{"value":"task","label":"Task"},{"value":"milestone","label":"Milestone"},{"value":"summary","label":"Summary"}]},
  {"key":"status","label":"Status","type":"select","options":[{"value":"not_started","label":"Not Started"},{"value":"in_progress","label":"In Progress"},{"value":"complete","label":"Complete"}]}
]}]}'::jsonb)
)
INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
SELECT
  t.id,
  COALESCE((SELECT MAX(v.version_number) FROM public.form_template_versions v WHERE v.template_id = t.id), 0) + 1,
  s.schema,
  true
FROM schemas s
JOIN public.form_templates t ON t.template_code = s.template_code
WHERE NOT EXISTS (
  SELECT 1 FROM public.form_template_versions v
  WHERE v.template_id = t.id AND v.schema = s.schema
);

WITH schemas(template_code, schema) AS (
VALUES
('F017', '{"title":"Activity List","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"activity_name","label":"Activity Name","type":"text"},
  {"key":"wbs_reference","label":"WBS Reference","type":"text"},
  {"key":"description","label":"Description","type":"textarea"},
  {"key":"duration_estimate","label":"Duration Estimate (days)","type":"number"},
  {"key":"resource_assigned","label":"Assigned Resource(s)","type":"text"},
  {"key":"required_skills","label":"Required Skill(s) (one per line)","type":"textarea"},
  {"key":"minimum_proficiency","label":"Minimum Proficiency","type":"select","options":[{"value":"basic","label":"Basic"},{"value":"intermediate","label":"Intermediate"},{"value":"advanced","label":"Advanced"},{"value":"expert","label":"Expert"}]},
  {"key":"activity_type","label":"Activity Type","type":"select","options":[{"value":"task","label":"Task"},{"value":"milestone","label":"Milestone"},{"value":"summary","label":"Summary"}]},
  {"key":"status","label":"Status","type":"select","options":[{"value":"not_started","label":"Not Started"},{"value":"in_progress","label":"In Progress"},{"value":"complete","label":"Complete"}]}
]}]}'::jsonb)
)
UPDATE public.form_template_versions v
SET is_current = (v.schema = s.schema)
FROM public.form_templates t
JOIN schemas s ON s.template_code = t.template_code
WHERE v.template_id = t.id
  AND v.is_current <> (v.schema = s.schema);

-- ----------------------------------------------------------------------------
-- sim schema (Simulator)
-- ----------------------------------------------------------------------------

WITH schemas(template_code, schema) AS (
VALUES
('F017', '{"title":"Activity List","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"activity_name","label":"Activity Name","type":"text"},
  {"key":"wbs_reference","label":"WBS Reference","type":"text"},
  {"key":"description","label":"Description","type":"textarea"},
  {"key":"duration_estimate","label":"Duration Estimate (days)","type":"number"},
  {"key":"resource_assigned","label":"Assigned Resource(s)","type":"text"},
  {"key":"required_skills","label":"Required Skill(s) (one per line)","type":"textarea"},
  {"key":"minimum_proficiency","label":"Minimum Proficiency","type":"select","options":[{"value":"basic","label":"Basic"},{"value":"intermediate","label":"Intermediate"},{"value":"advanced","label":"Advanced"},{"value":"expert","label":"Expert"}]},
  {"key":"activity_type","label":"Activity Type","type":"select","options":[{"value":"task","label":"Task"},{"value":"milestone","label":"Milestone"},{"value":"summary","label":"Summary"}]},
  {"key":"status","label":"Status","type":"select","options":[{"value":"not_started","label":"Not Started"},{"value":"in_progress","label":"In Progress"},{"value":"complete","label":"Complete"}]}
]}]}'::jsonb)
)
INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
SELECT
  t.id,
  COALESCE((SELECT MAX(v.version_number) FROM sim.form_template_versions v WHERE v.template_id = t.id), 0) + 1,
  s.schema,
  true
FROM schemas s
JOIN sim.form_templates t ON t.template_code = s.template_code
WHERE NOT EXISTS (
  SELECT 1 FROM sim.form_template_versions v
  WHERE v.template_id = t.id AND v.schema = s.schema
);

WITH schemas(template_code, schema) AS (
VALUES
('F017', '{"title":"Activity List","sections":[{"key":"general","title":"General","fields":[
  {"key":"activity_id","label":"Activity ID","type":"text"},
  {"key":"activity_name","label":"Activity Name","type":"text"},
  {"key":"wbs_reference","label":"WBS Reference","type":"text"},
  {"key":"description","label":"Description","type":"textarea"},
  {"key":"duration_estimate","label":"Duration Estimate (days)","type":"number"},
  {"key":"resource_assigned","label":"Assigned Resource(s)","type":"text"},
  {"key":"required_skills","label":"Required Skill(s) (one per line)","type":"textarea"},
  {"key":"minimum_proficiency","label":"Minimum Proficiency","type":"select","options":[{"value":"basic","label":"Basic"},{"value":"intermediate","label":"Intermediate"},{"value":"advanced","label":"Advanced"},{"value":"expert","label":"Expert"}]},
  {"key":"activity_type","label":"Activity Type","type":"select","options":[{"value":"task","label":"Task"},{"value":"milestone","label":"Milestone"},{"value":"summary","label":"Summary"}]},
  {"key":"status","label":"Status","type":"select","options":[{"value":"not_started","label":"Not Started"},{"value":"in_progress","label":"In Progress"},{"value":"complete","label":"Complete"}]}
]}]}'::jsonb)
)
UPDATE sim.form_template_versions v
SET is_current = (v.schema = s.schema)
FROM sim.form_templates t
JOIN schemas s ON s.template_code = t.template_code
WHERE v.template_id = t.id
  AND v.is_current <> (v.schema = s.schema);

DO $$
BEGIN
  RAISE NOTICE 'v760_form_template_f017_required_skills.sql applied (F017 + required_skills, minimum_proficiency)';
END $$;
