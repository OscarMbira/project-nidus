-- =============================================================================
-- v770b: Guidance + sample default content for Process Group Forms
-- - Moves prior instructional default_value text into guidance_text
-- - Seeds copy-ready sample content into default_value (Digital Workplace demo)
-- Platform (public) + Simulator (sim)
-- Prerequisites: v761, v770, form templates/schemas (v759+)
-- Idempotent: ON CONFLICT DO UPDATE
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Migrate existing instructional defaults → guidance (once)
-- -----------------------------------------------------------------------------
UPDATE public.form_template_field_defaults
SET guidance_text = NULLIF(trim(both '"' from default_value::text), ''),
    updated_at = NOW()
WHERE guidance_text IS NULL
  AND default_value IS NOT NULL
  AND jsonb_typeof(default_value) = 'string'
  AND NULLIF(trim(both '"' from default_value::text), '') IS NOT NULL
  AND (
      default_value::text ILIKE '%Summarise%'
      OR default_value::text ILIKE '%List measurable%'
      OR default_value::text ILIKE '%Define how%'
      OR default_value::text ILIKE '%Capture the%'
      OR default_value::text ILIKE '%Identify the%'
      OR default_value::text ILIKE '%Document assumptions%'
      OR default_value::text ILIKE '%List known%'
      OR default_value::text ILIKE '%Provide a short%'
      OR default_value::text ILIKE '%Provide %'
      OR default_value::text ILIKE '%Align with organisational%'
      OR default_value::text ILIKE '%Executive Sponsor%'
      OR default_value::text ILIKE '%List key initiation%'
  );

UPDATE sim.form_template_field_defaults
SET guidance_text = NULLIF(trim(both '"' from default_value::text), ''),
    updated_at = NOW()
WHERE guidance_text IS NULL
  AND default_value IS NOT NULL
  AND jsonb_typeof(default_value) = 'string'
  AND NULLIF(trim(both '"' from default_value::text), '') IS NOT NULL
  AND (
      default_value::text ILIKE '%Summarise%'
      OR default_value::text ILIKE '%List measurable%'
      OR default_value::text ILIKE '%Define how%'
      OR default_value::text ILIKE '%Capture the%'
      OR default_value::text ILIKE '%Identify the%'
      OR default_value::text ILIKE '%Document assumptions%'
      OR default_value::text ILIKE '%List known%'
      OR default_value::text ILIKE '%Provide a short%'
      OR default_value::text ILIKE '%Provide %'
      OR default_value::text ILIKE '%Align with organisational%'
      OR default_value::text ILIKE '%Executive Sponsor%'
      OR default_value::text ILIKE '%List key initiation%'
  );

-- -----------------------------------------------------------------------------
-- 1) Platform — F001 Project Charter (guidance + sample)
-- -----------------------------------------------------------------------------
WITH f001(section_key, field_key, guidance_text, default_value) AS (
    VALUES
    ('general', 'purpose',
     $g$Summarise why this project exists and the business problem or opportunity it addresses. Include the strategic alignment statement and the expected organisational benefit.$g$,
     to_jsonb($s$The organisation will implement a unified Digital Workplace Platform to replace fragmented collaboration tools, reduce shadow IT, and improve hybrid-team productivity. This initiative supports the strategic objective of modernising core ways of working and enabling consistent delivery across business units.$s$::text)),
    ('general', 'objectives',
     $g$List measurable project objectives (SMART).$g$,
     to_jsonb($s$1. Deploy the Digital Workplace Platform to 2,500 users by 30 June 2027.
2. Retire three legacy collaboration tools within 90 days of go-live.
3. Achieve ≥80% monthly active usage among licensed users within six months of go-live.
4. Reduce average time-to-find shared information by 25% (baseline survey vs post-implementation).$s$::text)),
    ('general', 'success_criteria',
     $g$Define how success will be judged at project close.$g$,
     to_jsonb($s$- Platform accepted by Business Owner and IT Operations against agreed UAT criteria
- Migration of priority document libraries and teams completed with <2% critical defect reopen rate
- Benefits realisation plan approved; first benefit checkpoint scheduled within 30 days of close
- Final cost and schedule within ±10% of approved baseline (or formally change-controlled)$s$::text)),
    ('general', 'sponsor',
     $g$Name the executive sponsor and role.$g$,
     to_jsonb('Amina Okonkwo — Chief Operating Officer (Executive Sponsor)'::text)),
    ('general', 'high_level_requirements',
     $g$Capture high-level must-have requirements that justify initiating the project. Defer detail to Requirements Documentation (F010).$g$,
     to_jsonb($s$1. Single sign-on via corporate identity provider for all licensed users
2. Secure file sharing and co-authoring with external partner guest access controls
3. Mobile access for iOS and Android with offline read for priority content
4. Retention, audit, and eDiscovery controls aligned to Information Governance policy
5. Integration with HR directory for joiner/mover/leaver provisioning$s$::text)),
    ('general', 'high_level_risks',
     $g$Identify top initiation risks; detail in the Risk Register (F038).$g$,
     to_jsonb($s$1. Low user adoption if change management is under-resourced — Owner: Change Lead; Response: structured adoption plan and champions network
2. Data migration quality gaps from legacy tools — Owner: Data Lead; Response: pilot migration and rollback criteria
3. Vendor roadmap delays for required security controls — Owner: IT Security; Response: contractual milestones and alternate control design
4. Concurrent major programmes competing for the same SMEs — Owner: PMO; Response: resource calendar and escalation path$s$::text)),
    ('general', 'summary_budget',
     $g$Enter the approved high-level budget envelope (currency as used by the organisation).$g$,
     to_jsonb('1850000'::text)),
    ('general', 'milestone_schedule',
     $g$List key initiation and early delivery milestones.$g$,
     to_jsonb($s$- Charter approved — 15 Aug 2026
- Kick-off complete — 01 Sep 2026
- Requirements baseline authorised — 15 Oct 2026
- Pilot go-live (250 users) — 01 Feb 2027
- Organisation-wide go-live — 30 Jun 2027$s$::text)),
    ('general', 'pm_authority_level',
     $g$Select the authority level granted to the project manager.$g$,
     to_jsonb('medium'::text)),
    ('general', 'assumptions',
     $g$Document assumptions that, if proven false, may impact scope, cost, or schedule. Track detail in Assumption Log (F002).$g$,
     to_jsonb($s$1. Corporate identity provider and licensing agreements will be available before build starts
2. Business units will release subject-matter experts for workshops on the agreed cadence
3. Existing network capacity is sufficient for expected concurrent collaboration load
4. No major regulatory change will force redesign of retention controls during delivery$s$::text)),
    ('general', 'constraints',
     $g$List known constraints (budget, dates, regulatory, resource, technology).$g$,
     to_jsonb($s$1. Approved capital envelope must not exceed the authorised business-case amount without Change Control Board approval
2. Organisation-wide go-live must complete before the legacy licence renewal date (30 Sep 2027)
3. Solution must remain within the approved technology standards catalogue
4. Core delivery team capped at 12 FTEs unless portfolio board authorises uplift$s$::text)),
    ('general', 'business_case_summary',
     $g$Provide a short business-case summary: options considered, preferred option, and expected value.$g$,
     to_jsonb($s$Options considered: (A) retain and integrate legacy tools, (B) best-of-breed point solutions, (C) unified Digital Workplace Platform. Preferred option C delivers the highest NPV through licence consolidation, reduced support effort, and productivity gains. Expected value: approx. USD 2.4m benefit over 3 years versus USD 1.85m investment, with payback inside 28 months.$s$::text))
)
INSERT INTO public.form_template_field_defaults (
    organisation_id, template_id, section_key, field_key, default_value, guidance_text
)
SELECT a.id, t.id, d.section_key, d.field_key, d.default_value, d.guidance_text
FROM public.accounts a
CROSS JOIN public.form_templates t
CROSS JOIN f001 d
WHERE COALESCE(a.is_deleted, FALSE) = FALSE
  AND t.template_code = 'F001'
ON CONFLICT (organisation_id, template_id, section_key, field_key) DO UPDATE SET
    default_value = EXCLUDED.default_value,
    guidance_text = EXCLUDED.guidance_text,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- 2) Platform — other process-group templates: guidance + sample
-- -----------------------------------------------------------------------------
INSERT INTO public.form_template_field_defaults (
    organisation_id, template_id, section_key, field_key, default_value, guidance_text
)
SELECT
    a.id,
    t.id,
    sec->>'key',
    fld->>'key',
    to_jsonb(
        format(
            E'Sample (%s — %s) for the Nidus Digital Workplace Platform:\n%s\nCustomise names, dates, owners, and measures for your project.',
            t.template_code,
            t.name,
            COALESCE(fld->>'label', fld->>'key')
        )
    ),
    format(
        E'Complete %s for %s (%s). Align with organisational standards. Project managers may amend after instance creation.',
        lower(COALESCE(fld->>'label', fld->>'key')),
        t.name,
        t.template_code
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
  AND t.template_code <> 'F001'
  AND COALESCE(fld->>'type', 'text') IN ('text', 'textarea')
  AND NULLIF(trim(COALESCE(sec->>'key', '')), '') IS NOT NULL
  AND NULLIF(trim(COALESCE(fld->>'key', '')), '') IS NOT NULL
ON CONFLICT (organisation_id, template_id, section_key, field_key) DO UPDATE SET
    default_value = EXCLUDED.default_value,
    guidance_text = COALESCE(
        NULLIF(trim(public.form_template_field_defaults.guidance_text), ''),
        EXCLUDED.guidance_text
    ),
    updated_at = NOW();

INSERT INTO public.form_template_field_defaults (
    organisation_id, template_id, section_key, field_key, default_value, guidance_text
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
    ),
    format(
        E'Select the appropriate %s for %s (%s).',
        lower(COALESCE(fld->>'label', fld->>'key')),
        t.name,
        t.template_code
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
  AND t.template_code <> 'F001'
  AND fld->>'type' = 'select'
  AND jsonb_typeof(fld->'options') = 'array'
  AND jsonb_array_length(fld->'options') > 0
ON CONFLICT (organisation_id, template_id, section_key, field_key) DO UPDATE SET
    default_value = EXCLUDED.default_value,
    guidance_text = COALESCE(
        NULLIF(trim(public.form_template_field_defaults.guidance_text), ''),
        EXCLUDED.guidance_text
    ),
    updated_at = NOW();

-- Ensure F001 (and any remaining) rows that still only have instructional default_value
-- as sample get a non-instruction sample where guidance already holds the instruction.
-- (F001 curated upsert above already sets both.)

-- -----------------------------------------------------------------------------
-- 3) Simulator — F001 + generated (mirror)
-- -----------------------------------------------------------------------------
WITH f001(section_key, field_key, guidance_text, default_value) AS (
    VALUES
    ('general', 'purpose',
     $g$Summarise why this project exists and the business problem or opportunity it addresses. Include the strategic alignment statement and the expected organisational benefit.$g$,
     to_jsonb($s$The organisation will implement a unified Digital Workplace Platform to replace fragmented collaboration tools, reduce shadow IT, and improve hybrid-team productivity. This initiative supports the strategic objective of modernising core ways of working and enabling consistent delivery across business units.$s$::text)),
    ('general', 'objectives',
     $g$List measurable project objectives (SMART).$g$,
     to_jsonb($s$1. Deploy the Digital Workplace Platform to 2,500 users by 30 June 2027.
2. Retire three legacy collaboration tools within 90 days of go-live.
3. Achieve ≥80% monthly active usage among licensed users within six months of go-live.
4. Reduce average time-to-find shared information by 25% (baseline survey vs post-implementation).$s$::text)),
    ('general', 'success_criteria',
     $g$Define how success will be judged at project close.$g$,
     to_jsonb($s$- Platform accepted by Business Owner and IT Operations against agreed UAT criteria
- Migration of priority document libraries and teams completed with <2% critical defect reopen rate
- Benefits realisation plan approved; first benefit checkpoint scheduled within 30 days of close
- Final cost and schedule within ±10% of approved baseline (or formally change-controlled)$s$::text)),
    ('general', 'sponsor',
     $g$Name the executive sponsor and role.$g$,
     to_jsonb('Amina Okonkwo — Chief Operating Officer (Executive Sponsor)'::text)),
    ('general', 'high_level_requirements',
     $g$Capture high-level must-have requirements that justify initiating the project. Defer detail to Requirements Documentation (F010).$g$,
     to_jsonb($s$1. Single sign-on via corporate identity provider for all licensed users
2. Secure file sharing and co-authoring with external partner guest access controls
3. Mobile access for iOS and Android with offline read for priority content
4. Retention, audit, and eDiscovery controls aligned to Information Governance policy
5. Integration with HR directory for joiner/mover/leaver provisioning$s$::text)),
    ('general', 'high_level_risks',
     $g$Identify top initiation risks; detail in the Risk Register (F038).$g$,
     to_jsonb($s$1. Low user adoption if change management is under-resourced — Owner: Change Lead; Response: structured adoption plan and champions network
2. Data migration quality gaps from legacy tools — Owner: Data Lead; Response: pilot migration and rollback criteria
3. Vendor roadmap delays for required security controls — Owner: IT Security; Response: contractual milestones and alternate control design
4. Concurrent major programmes competing for the same SMEs — Owner: PMO; Response: resource calendar and escalation path$s$::text)),
    ('general', 'summary_budget',
     $g$Enter the approved high-level budget envelope (currency as used by the organisation).$g$,
     to_jsonb('1850000'::text)),
    ('general', 'milestone_schedule',
     $g$List key initiation and early delivery milestones.$g$,
     to_jsonb($s$- Charter approved — 15 Aug 2026
- Kick-off complete — 01 Sep 2026
- Requirements baseline authorised — 15 Oct 2026
- Pilot go-live (250 users) — 01 Feb 2027
- Organisation-wide go-live — 30 Jun 2027$s$::text)),
    ('general', 'pm_authority_level',
     $g$Select the authority level granted to the project manager.$g$,
     to_jsonb('medium'::text)),
    ('general', 'assumptions',
     $g$Document assumptions that, if proven false, may impact scope, cost, or schedule. Track detail in Assumption Log (F002).$g$,
     to_jsonb($s$1. Corporate identity provider and licensing agreements will be available before build starts
2. Business units will release subject-matter experts for workshops on the agreed cadence
3. Existing network capacity is sufficient for expected concurrent collaboration load
4. No major regulatory change will force redesign of retention controls during delivery$s$::text)),
    ('general', 'constraints',
     $g$List known constraints (budget, dates, regulatory, resource, technology).$g$,
     to_jsonb($s$1. Approved capital envelope must not exceed the authorised business-case amount without Change Control Board approval
2. Organisation-wide go-live must complete before the legacy licence renewal date (30 Sep 2027)
3. Solution must remain within the approved technology standards catalogue
4. Core delivery team capped at 12 FTEs unless portfolio board authorises uplift$s$::text)),
    ('general', 'business_case_summary',
     $g$Provide a short business-case summary: options considered, preferred option, and expected value.$g$,
     to_jsonb($s$Options considered: (A) retain and integrate legacy tools, (B) best-of-breed point solutions, (C) unified Digital Workplace Platform. Preferred option C delivers the highest NPV through licence consolidation, reduced support effort, and productivity gains. Expected value: approx. USD 2.4m benefit over 3 years versus USD 1.85m investment, with payback inside 28 months.$s$::text))
)
INSERT INTO sim.form_template_field_defaults (
    organisation_id, template_id, section_key, field_key, default_value, guidance_text
)
SELECT a.id, t.id, d.section_key, d.field_key, d.default_value, d.guidance_text
FROM public.accounts a
CROSS JOIN sim.form_templates t
CROSS JOIN f001 d
WHERE COALESCE(a.is_deleted, FALSE) = FALSE
  AND t.template_code = 'F001'
ON CONFLICT (organisation_id, template_id, section_key, field_key) DO UPDATE SET
    default_value = EXCLUDED.default_value,
    guidance_text = EXCLUDED.guidance_text,
    updated_at = NOW();

INSERT INTO sim.form_template_field_defaults (
    organisation_id, template_id, section_key, field_key, default_value, guidance_text
)
SELECT
    a.id,
    t.id,
    sec->>'key',
    fld->>'key',
    to_jsonb(
        format(
            E'Sample (%s — %s) for the Nidus Digital Workplace Platform:\n%s\nCustomise names, dates, owners, and measures for your project.',
            t.template_code,
            t.name,
            COALESCE(fld->>'label', fld->>'key')
        )
    ),
    format(
        E'Complete %s for %s (%s). Align with organisational standards. Project managers may amend after instance creation.',
        lower(COALESCE(fld->>'label', fld->>'key')),
        t.name,
        t.template_code
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
  AND t.template_code <> 'F001'
  AND COALESCE(fld->>'type', 'text') IN ('text', 'textarea')
  AND NULLIF(trim(COALESCE(sec->>'key', '')), '') IS NOT NULL
  AND NULLIF(trim(COALESCE(fld->>'key', '')), '') IS NOT NULL
ON CONFLICT (organisation_id, template_id, section_key, field_key) DO UPDATE SET
    default_value = EXCLUDED.default_value,
    guidance_text = COALESCE(
        NULLIF(trim(sim.form_template_field_defaults.guidance_text), ''),
        EXCLUDED.guidance_text
    ),
    updated_at = NOW();

INSERT INTO sim.form_template_field_defaults (
    organisation_id, template_id, section_key, field_key, default_value, guidance_text
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
    ),
    format(
        E'Select the appropriate %s for %s (%s).',
        lower(COALESCE(fld->>'label', fld->>'key')),
        t.name,
        t.template_code
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
  AND t.template_code <> 'F001'
  AND fld->>'type' = 'select'
  AND jsonb_typeof(fld->'options') = 'array'
  AND jsonb_array_length(fld->'options') > 0
ON CONFLICT (organisation_id, template_id, section_key, field_key) DO UPDATE SET
    default_value = EXCLUDED.default_value,
    guidance_text = COALESCE(
        NULLIF(trim(sim.form_template_field_defaults.guidance_text), ''),
        EXCLUDED.guidance_text
    ),
    updated_at = NOW();

DO $$
DECLARE
    v_pub INTEGER;
    v_sim INTEGER;
    v_guided INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_pub FROM public.form_template_field_defaults;
    SELECT COUNT(*) INTO v_sim FROM sim.form_template_field_defaults;
    SELECT COUNT(*) INTO v_guided
    FROM public.form_template_field_defaults
    WHERE NULLIF(trim(guidance_text), '') IS NOT NULL;
    RAISE NOTICE 'v770b applied (public=% rows, sim=% rows, public with guidance=%)', v_pub, v_sim, v_guided;
END $$;
