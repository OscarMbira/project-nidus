-- ============================================================================
-- v1494r: Rollback of v1494 (mandatory help on user-created fields, v1345 slice 1b)
-- Removes the database checks. The help columns are kept (dropping them would lose help that
-- users have written); drop them by hand only if that is really wanted.
-- ============================================================================
DROP TRIGGER IF EXISTS trg_cfd_require_help ON public.custom_field_definitions;
DROP TRIGGER IF EXISTS trg_sim_cfd_require_help ON sim.custom_field_definitions;
DROP TRIGGER IF EXISTS trg_rflfd_require_help ON public.regional_format_local_field_definitions;
DROP TRIGGER IF EXISTS trg_ftv_require_field_help ON public.form_template_versions;
DROP TRIGGER IF EXISTS trg_sim_ftv_require_field_help ON sim.form_template_versions;
DROP FUNCTION IF EXISTS public.trg_require_field_definition_help();
DROP FUNCTION IF EXISTS public.trg_require_form_template_field_help();
