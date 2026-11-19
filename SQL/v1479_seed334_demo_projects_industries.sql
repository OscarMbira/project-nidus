-- ============================================================================
-- v1479: Demo projects SEED334-PRJ-01…10 — industry tags + document baseline (v1344, slice 0)
-- ============================================================================
-- PRD projectprd/v1344_project_setup_forms_fields_audit_seed_PRD.md amendment A6.
-- The rich initiation samples go on SEED334-PRJ-01…10. Industry pages (Delivery Overview,
-- registers) show only on projects with an industry (v1341 D18), so each of the ten gets one
-- primary industry from its organisation's own industries, chosen to fit the project:
--   01 Meridian Payments (PCI)          Banking & Financial Services
--   02 Aurora Mobile (field app)        IT
--   03 GreenGrid (solar analytics)      Energy & Utilities
--   04 Harbor Health (clinic intake)    Healthcare & Life Sciences
--   05 Summit ERP (finance cutover)     IT
--   06 Nexus Platform (API gateway)     IT
--   07 Cedar Trust Schools (LMS / SIS)  Education
--   08 Velocity Freight (routing)       IT  (its ICT Delivery Overview samples, v1355, become visible)
--   09 Orion Defense (SOC playbooks)    Government & Public Sector
--   10 Apex Mutual (claims STP)         Banking & Financial Services
-- Names are matched loosely (e.g. "IT & Software" or "Information Technology") against the
-- organisation's account_industries, so nothing is tagged with an industry the organisation
-- has not selected. A project that already has any industry is left exactly as it is.
-- Projects outside the ten are untouched. Reversible: delete their project_industries rows.
-- Idempotent.
-- ============================================================================

WITH wanted(project_code, patterns) AS (VALUES
  ('SEED334-PRJ-01', ARRAY['banking', 'financial']),
  ('SEED334-PRJ-02', ARRAY['information technology', 'it & software', 'technology', 'software']),
  ('SEED334-PRJ-03', ARRAY['energy', 'utilities']),
  ('SEED334-PRJ-04', ARRAY['health']),
  ('SEED334-PRJ-05', ARRAY['information technology', 'it & software', 'technology', 'software']),
  ('SEED334-PRJ-06', ARRAY['information technology', 'it & software', 'technology', 'software']),
  ('SEED334-PRJ-07', ARRAY['education']),
  ('SEED334-PRJ-08', ARRAY['information technology', 'it & software', 'technology', 'software']),
  ('SEED334-PRJ-09', ARRAY['government', 'public sector']),
  ('SEED334-PRJ-10', ARRAY['banking', 'financial'])
),
pick AS (
  SELECT DISTINCT ON (p.id) p.id AS project_id, ic.id AS industry_category_id
  FROM wanted w
  JOIN public.projects p ON p.project_code = w.project_code AND COALESCE(p.is_deleted, FALSE) = FALSE
  JOIN public.account_industries ai ON ai.account_id = p.account_id
  JOIN public.industry_categories ic ON ic.id = ai.industry_category_id
  CROSS JOIN LATERAL unnest(w.patterns) WITH ORDINALITY AS pat(pattern, rank)
  WHERE lower(ic.name) LIKE '%' || pat.pattern || '%'
    AND NOT EXISTS (SELECT 1 FROM public.project_industries x WHERE x.project_id = p.id)
    AND p.industry_category_id IS NULL
  ORDER BY p.id, pat.rank
)
INSERT INTO public.project_industries (project_id, industry_category_id, is_primary)
SELECT project_id, industry_category_id, TRUE FROM pick
ON CONFLICT DO NOTHING;

-- Keep the primary pointer in step (as replaceProjectIndustries does)
UPDATE public.projects p
SET industry_category_id = pi.industry_category_id, updated_at = NOW()
FROM public.project_industries pi
WHERE pi.project_id = p.id AND pi.is_primary = TRUE
  AND p.project_code IN ('SEED334-PRJ-01', 'SEED334-PRJ-02', 'SEED334-PRJ-03', 'SEED334-PRJ-04', 'SEED334-PRJ-05',
                         'SEED334-PRJ-06', 'SEED334-PRJ-07', 'SEED334-PRJ-08', 'SEED334-PRJ-09', 'SEED334-PRJ-10')
  AND p.industry_category_id IS DISTINCT FROM pi.industry_category_id;

-- Baseline: the ten projects, their industries and document counts before the rich seeds.
SELECT p.project_code, p.project_name,
       (SELECT string_agg(ic.name, ', ' ORDER BY pi.is_primary DESC, ic.name)
          FROM public.project_industries pi JOIN public.industry_categories ic ON ic.id = pi.industry_category_id
         WHERE pi.project_id = p.id) AS industries,
       (SELECT count(*) FROM public.project_mandates m WHERE m.project_id = p.id) AS mandates,
       (SELECT count(*) FROM public.project_briefs b WHERE b.project_id = p.id) AS briefs,
       (SELECT count(*) FROM public.business_cases c WHERE c.project_id = p.id) AS business_cases,
       (SELECT count(*) FROM public.milestones ms WHERE ms.project_id = p.id AND COALESCE(ms.is_deleted, FALSE) = FALSE) AS milestones,
       (SELECT count(*) FROM public.project_contacts pc WHERE pc.project_id = p.id) AS contacts
FROM public.projects p
WHERE p.project_code IN ('SEED334-PRJ-01', 'SEED334-PRJ-02', 'SEED334-PRJ-03', 'SEED334-PRJ-04', 'SEED334-PRJ-05',
                         'SEED334-PRJ-06', 'SEED334-PRJ-07', 'SEED334-PRJ-08', 'SEED334-PRJ-09', 'SEED334-PRJ-10')
ORDER BY p.project_code;
