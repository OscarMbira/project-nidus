-- =============================================================================
-- v816: Global field-key uniqueness for org-added local fields, all tiers
-- Plan: projectplan/v816_local_field_key_uniqueness_and_dropdown_options_plan.md
-- Prerequisites: v810 (form_template_field_additions), v812 (scope_entity_type/scope_entity_id)
--
-- The v812 constraint (organisation_id, template_id, section_key, field_key,
-- scope_entity_type, scope_entity_id) allowed the SAME field_key to be added twice on the
-- same template as long as the section or scope differed. That's unsafe: field_key is the
-- join key `form_instance_values`/`getFormTemplateFieldUsage` read by ACROSS THE WHOLE
-- TEMPLATE, with no section/scope filter — two additions (or an addition colliding with a
-- master-schema field) sharing a key would silently share/overwrite each other's submitted
-- data. Field key must be unique per (organisation, template) full stop, regardless of which
-- section or tier added it. The app-level check in addFieldForOrg already enforced this globally
-- pre-insert; this migration makes the database itself the source of truth, closing the race
-- window between the pre-check SELECT and the INSERT.
-- =============================================================================

ALTER TABLE public.form_template_field_additions
    DROP CONSTRAINT IF EXISTS uq_form_template_field_additions_scope,
    DROP CONSTRAINT IF EXISTS form_template_field_additions_organisation_id_template_id_key;

ALTER TABLE public.form_template_field_additions
    ADD CONSTRAINT uq_form_template_field_additions_key UNIQUE (organisation_id, template_id, field_key);

ALTER TABLE sim.form_template_field_additions
    DROP CONSTRAINT IF EXISTS uq_sim_form_template_field_additions_scope,
    DROP CONSTRAINT IF EXISTS form_template_field_additions_organisation_id_template_id_key;

ALTER TABLE sim.form_template_field_additions
    ADD CONSTRAINT uq_sim_form_template_field_additions_key UNIQUE (organisation_id, template_id, field_key);

COMMENT ON CONSTRAINT uq_form_template_field_additions_key ON public.form_template_field_additions IS
    'field_key must be unique per (organisation, template) regardless of section or tier — it is the join key for form_instance_values/getFormTemplateFieldUsage across the whole template.';
COMMENT ON CONSTRAINT uq_sim_form_template_field_additions_key ON sim.form_template_field_additions IS
    'field_key must be unique per (organisation, template) regardless of section or tier — it is the join key for form_instance_values/getFormTemplateFieldUsage across the whole template.';

DO $$
BEGIN
  RAISE NOTICE 'v816_form_template_field_additions_key_uniqueness.sql applied';
END $$;
