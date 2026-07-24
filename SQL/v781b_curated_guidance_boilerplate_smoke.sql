-- =============================================================================
-- v781b: smoke — leftover boilerplate guidance after v781 seed
-- Expect public=0 and sim=0
-- =============================================================================

SELECT 'public' AS schema_name, COUNT(*) AS boilerplate_rows
FROM public.form_template_field_defaults
WHERE guidance_text ILIKE 'Briefly complete %'
   OR guidance_text ILIKE '%understood offline without system context%'
   OR guidance_text ILIKE 'Complete % for %(%Align with organisational standards%'
UNION ALL
SELECT 'sim', COUNT(*)
FROM sim.form_template_field_defaults
WHERE guidance_text ILIKE 'Briefly complete %'
   OR guidance_text ILIKE '%understood offline without system context%'
   OR guidance_text ILIKE 'Complete % for %(%Align with organisational standards%';

-- Spot-check F004 / F050 schema help
SELECT t.template_code, fld->>'key' AS field_key, left(fld->>'help', 80) AS help_preview
FROM public.form_templates t
JOIN public.form_template_versions v ON v.template_id = t.id AND v.is_current
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(v.schema->'sections', '[]'::jsonb)) sec
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(sec->'fields', '[]'::jsonb)) fld
WHERE t.template_code IN ('F004', 'F050')
ORDER BY t.template_code, fld->>'key';
