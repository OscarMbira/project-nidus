-- =============================================================================
-- v768: Process Group Forms — Default Content seed (Platform + Simulator)
-- Seeds instructional guidance text into default_value (historical).
-- SUPERSEDED for dual guidance+sample: apply v770 then v770b instead.
-- Prerequisites: v506/v755/v759 (templates + schemas), v761 (defaults table)
-- Idempotent: ON CONFLICT DO UPDATE (does not overwrite non-empty existing values
--             except curated F001 rows, which are always refreshed)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Platform — curated Project Charter (F001)
-- -----------------------------------------------------------------------------
WITH f001_defaults(section_key, field_key, default_value) AS (
    VALUES
    ('general', 'purpose', to_jsonb($t$
Summarise why this project exists and the business problem or opportunity it addresses.
Include the strategic alignment statement and the expected organisational benefit.
$t$::text)),
    ('general', 'objectives', to_jsonb($t$
List measurable project objectives (SMART). Example:
1. Deliver [capability / product] by [target date]
2. Achieve [benefit / KPI] within [tolerance]
3. Satisfy agreed stakeholder acceptance criteria
$t$::text)),
    ('general', 'success_criteria', to_jsonb($t$
Define how success will be judged at project close, for example:
- Scope delivered against approved baseline
- Benefits realisation measures met or on track
- Quality acceptance criteria signed off by sponsor
- Budget and schedule within agreed tolerances
$t$::text)),
    ('general', 'sponsor', to_jsonb('Executive Sponsor — [Name, Role]'::text)),
    ('general', 'high_level_requirements', to_jsonb($t$
Capture the high-level must-have requirements that justify initiating the project.
Defer detailed requirements to the Requirements Documentation (F010).
$t$::text)),
    ('general', 'high_level_risks', to_jsonb($t$
Identify the top initiation risks (technical, external, organisational, delivery).
Note owners and proposed response direction; detail in the Risk Register (F038).
$t$::text)),
    ('general', 'summary_budget', to_jsonb('0'::text)),
    ('general', 'milestone_schedule', to_jsonb($t$
List key initiation / early milestones, for example:
- Charter approved
- Kick-off complete
- Baseline plan authorised
$t$::text)),
    ('general', 'pm_authority_level', to_jsonb('medium'::text)),
    ('general', 'assumptions', to_jsonb($t$
Document assumptions that, if proven false, may impact scope, cost, or schedule.
Track open assumptions in the Assumption Log (F002).
$t$::text)),
    ('general', 'constraints', to_jsonb($t$
List known constraints (budget ceiling, fixed end date, regulatory, resource, technology).
$t$::text)),
    ('general', 'business_case_summary', to_jsonb($t$
Provide a short business-case summary: options considered, preferred option, and expected value.
$t$::text))
)
INSERT INTO public.form_template_field_defaults (
    organisation_id, template_id, section_key, field_key, default_value
)
SELECT a.id, t.id, d.section_key, d.field_key, d.default_value
FROM public.accounts a
CROSS JOIN public.form_templates t
CROSS JOIN f001_defaults d
WHERE COALESCE(a.is_deleted, FALSE) = FALSE
  AND t.template_code = 'F001'
ON CONFLICT (organisation_id, template_id, section_key, field_key) DO UPDATE SET
    default_value = EXCLUDED.default_value,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- 2) Platform — generated text/textarea guidance for all Process Group templates
-- -----------------------------------------------------------------------------
INSERT INTO public.form_template_field_defaults (
    organisation_id, template_id, section_key, field_key, default_value
)
SELECT
    a.id,
    t.id,
    sec->>'key',
    fld->>'key',
    to_jsonb(
        format(
            E'Provide %s for %s (%s).\nAlign with organisational standards and international best practice. Project managers may amend after instance creation.',
            lower(COALESCE(fld->>'label', fld->>'key')),
            t.name,
            t.template_code
        )
    )
FROM public.accounts a
CROSS JOIN public.form_templates t
JOIN public.form_template_versions v
  ON v.template_id = t.id
 AND v.is_current = TRUE
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(v.schema->'sections', '[]'::jsonb)) AS sec
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(sec->'fields', '[]'::jsonb)) AS fld
WHERE COALESCE(a.is_deleted, FALSE) = FALSE
  AND t.process_group IN (
      'initiating', 'planning', 'executing', 'monitoring_controlling', 'closing'
  )
  AND COALESCE(fld->>'type', 'text') IN ('text', 'textarea')
  AND NULLIF(trim(COALESCE(sec->>'key', '')), '') IS NOT NULL
  AND NULLIF(trim(COALESCE(fld->>'key', '')), '') IS NOT NULL
ON CONFLICT (organisation_id, template_id, section_key, field_key) DO UPDATE SET
    default_value = CASE
        WHEN public.form_template_field_defaults.default_value IS NULL
          OR public.form_template_field_defaults.default_value = 'null'::jsonb
          OR public.form_template_field_defaults.default_value = '""'::jsonb
        THEN EXCLUDED.default_value
        ELSE public.form_template_field_defaults.default_value
    END,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- 3) Platform — select defaults (prefer "medium", else first option)
-- -----------------------------------------------------------------------------
INSERT INTO public.form_template_field_defaults (
    organisation_id, template_id, section_key, field_key, default_value
)
SELECT
    a.id,
    t.id,
    sec->>'key',
    fld->>'key',
    to_jsonb(
        COALESCE(
            (
                SELECT opt->>'value'
                FROM jsonb_array_elements(COALESCE(fld->'options', '[]'::jsonb)) opt
                WHERE opt->>'value' = 'medium'
                LIMIT 1
            ),
            (
                SELECT opt->>'value'
                FROM jsonb_array_elements(COALESCE(fld->'options', '[]'::jsonb)) opt
                WHERE NULLIF(trim(COALESCE(opt->>'value', '')), '') IS NOT NULL
                LIMIT 1
            )
        )
    )
FROM public.accounts a
CROSS JOIN public.form_templates t
JOIN public.form_template_versions v
  ON v.template_id = t.id
 AND v.is_current = TRUE
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(v.schema->'sections', '[]'::jsonb)) AS sec
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(sec->'fields', '[]'::jsonb)) AS fld
WHERE COALESCE(a.is_deleted, FALSE) = FALSE
  AND t.process_group IN (
      'initiating', 'planning', 'executing', 'monitoring_controlling', 'closing'
  )
  AND fld->>'type' = 'select'
  AND jsonb_typeof(fld->'options') = 'array'
  AND jsonb_array_length(fld->'options') > 0
ON CONFLICT (organisation_id, template_id, section_key, field_key) DO UPDATE SET
    default_value = CASE
        WHEN public.form_template_field_defaults.default_value IS NULL
          OR public.form_template_field_defaults.default_value = 'null'::jsonb
          OR public.form_template_field_defaults.default_value = '""'::jsonb
        THEN EXCLUDED.default_value
        ELSE public.form_template_field_defaults.default_value
    END,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- 4) Simulator — curated F001
-- -----------------------------------------------------------------------------
WITH f001_defaults(section_key, field_key, default_value) AS (
    VALUES
    ('general', 'purpose', to_jsonb($t$
Summarise why this project exists and the business problem or opportunity it addresses.
Include the strategic alignment statement and the expected organisational benefit.
$t$::text)),
    ('general', 'objectives', to_jsonb($t$
List measurable project objectives (SMART). Example:
1. Deliver [capability / product] by [target date]
2. Achieve [benefit / KPI] within [tolerance]
3. Satisfy agreed stakeholder acceptance criteria
$t$::text)),
    ('general', 'success_criteria', to_jsonb($t$
Define how success will be judged at project close, for example:
- Scope delivered against approved baseline
- Benefits realisation measures met or on track
- Quality acceptance criteria signed off by sponsor
- Budget and schedule within agreed tolerances
$t$::text)),
    ('general', 'sponsor', to_jsonb('Executive Sponsor — [Name, Role]'::text)),
    ('general', 'high_level_requirements', to_jsonb($t$
Capture the high-level must-have requirements that justify initiating the project.
Defer detailed requirements to the Requirements Documentation (F010).
$t$::text)),
    ('general', 'high_level_risks', to_jsonb($t$
Identify the top initiation risks (technical, external, organisational, delivery).
Note owners and proposed response direction; detail in the Risk Register (F038).
$t$::text)),
    ('general', 'summary_budget', to_jsonb('0'::text)),
    ('general', 'milestone_schedule', to_jsonb($t$
List key initiation / early milestones, for example:
- Charter approved
- Kick-off complete
- Baseline plan authorised
$t$::text)),
    ('general', 'pm_authority_level', to_jsonb('medium'::text)),
    ('general', 'assumptions', to_jsonb($t$
Document assumptions that, if proven false, may impact scope, cost, or schedule.
Track open assumptions in the Assumption Log (F002).
$t$::text)),
    ('general', 'constraints', to_jsonb($t$
List known constraints (budget ceiling, fixed end date, regulatory, resource, technology).
$t$::text)),
    ('general', 'business_case_summary', to_jsonb($t$
Provide a short business-case summary: options considered, preferred option, and expected value.
$t$::text))
)
INSERT INTO sim.form_template_field_defaults (
    organisation_id, template_id, section_key, field_key, default_value
)
SELECT a.id, t.id, d.section_key, d.field_key, d.default_value
FROM public.accounts a
CROSS JOIN sim.form_templates t
CROSS JOIN f001_defaults d
WHERE COALESCE(a.is_deleted, FALSE) = FALSE
  AND t.template_code = 'F001'
ON CONFLICT (organisation_id, template_id, section_key, field_key) DO UPDATE SET
    default_value = EXCLUDED.default_value,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- 5) Simulator — generated text/textarea + select defaults
-- -----------------------------------------------------------------------------
INSERT INTO sim.form_template_field_defaults (
    organisation_id, template_id, section_key, field_key, default_value
)
SELECT
    a.id,
    t.id,
    sec->>'key',
    fld->>'key',
    to_jsonb(
        format(
            E'Provide %s for %s (%s).\nAlign with organisational standards and international best practice. Project managers may amend after instance creation.',
            lower(COALESCE(fld->>'label', fld->>'key')),
            t.name,
            t.template_code
        )
    )
FROM public.accounts a
CROSS JOIN sim.form_templates t
JOIN sim.form_template_versions v
  ON v.template_id = t.id
 AND v.is_current = TRUE
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(v.schema->'sections', '[]'::jsonb)) AS sec
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(sec->'fields', '[]'::jsonb)) AS fld
WHERE COALESCE(a.is_deleted, FALSE) = FALSE
  AND t.process_group IN (
      'initiating', 'planning', 'executing', 'monitoring_controlling', 'closing'
  )
  AND COALESCE(fld->>'type', 'text') IN ('text', 'textarea')
  AND NULLIF(trim(COALESCE(sec->>'key', '')), '') IS NOT NULL
  AND NULLIF(trim(COALESCE(fld->>'key', '')), '') IS NOT NULL
ON CONFLICT (organisation_id, template_id, section_key, field_key) DO UPDATE SET
    default_value = CASE
        WHEN sim.form_template_field_defaults.default_value IS NULL
          OR sim.form_template_field_defaults.default_value = 'null'::jsonb
          OR sim.form_template_field_defaults.default_value = '""'::jsonb
        THEN EXCLUDED.default_value
        ELSE sim.form_template_field_defaults.default_value
    END,
    updated_at = NOW();

INSERT INTO sim.form_template_field_defaults (
    organisation_id, template_id, section_key, field_key, default_value
)
SELECT
    a.id,
    t.id,
    sec->>'key',
    fld->>'key',
    to_jsonb(
        COALESCE(
            (
                SELECT opt->>'value'
                FROM jsonb_array_elements(COALESCE(fld->'options', '[]'::jsonb)) opt
                WHERE opt->>'value' = 'medium'
                LIMIT 1
            ),
            (
                SELECT opt->>'value'
                FROM jsonb_array_elements(COALESCE(fld->'options', '[]'::jsonb)) opt
                WHERE NULLIF(trim(COALESCE(opt->>'value', '')), '') IS NOT NULL
                LIMIT 1
            )
        )
    )
FROM public.accounts a
CROSS JOIN sim.form_templates t
JOIN sim.form_template_versions v
  ON v.template_id = t.id
 AND v.is_current = TRUE
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(v.schema->'sections', '[]'::jsonb)) AS sec
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(sec->'fields', '[]'::jsonb)) AS fld
WHERE COALESCE(a.is_deleted, FALSE) = FALSE
  AND t.process_group IN (
      'initiating', 'planning', 'executing', 'monitoring_controlling', 'closing'
  )
  AND fld->>'type' = 'select'
  AND jsonb_typeof(fld->'options') = 'array'
  AND jsonb_array_length(fld->'options') > 0
ON CONFLICT (organisation_id, template_id, section_key, field_key) DO UPDATE SET
    default_value = CASE
        WHEN sim.form_template_field_defaults.default_value IS NULL
          OR sim.form_template_field_defaults.default_value = 'null'::jsonb
          OR sim.form_template_field_defaults.default_value = '""'::jsonb
        THEN EXCLUDED.default_value
        ELSE sim.form_template_field_defaults.default_value
    END,
    updated_at = NOW();

DO $$
DECLARE
    v_pub INTEGER;
    v_sim INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_pub FROM public.form_template_field_defaults;
    SELECT COUNT(*) INTO v_sim FROM sim.form_template_field_defaults;
    RAISE NOTICE 'v768_form_template_default_content_seed.sql applied (public=% rows, sim=% rows)', v_pub, v_sim;
END $$;
