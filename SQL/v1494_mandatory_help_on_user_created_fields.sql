-- ============================================================================
-- v1494: Mandatory help on user-created fields (v1345 slice 1b, PRD Amendment A, CF-D1…CF-D6)
-- ============================================================================
-- 1. Help columns (CF-D5): help_purpose, help_example, help_format on
--      public.custom_field_definitions, sim.custom_field_definitions   (organisation + register custom fields)
--      public.regional_format_local_field_definitions                 (Regional & Format local fields)
--    Form template fields keep their help in the template schema JSON (help_purpose, help_example,
--    help_format); an existing "help" text counts as the purpose (it is the old optional help).
-- 2. Existing descriptions are copied once to help_purpose where it is empty (starting point).
-- 3. Database checks (CF-D4), for users' own saves only (auth.uid() present — SQL seeds, the
--    service role and system syncs are not affected):
--    - custom / local field definitions: a new definition, or an edit of its label, type or help,
--      needs a purpose and an example. Old definitions nobody edits stay valid; soft delete,
--      re-ordering and status changes are not blocked (CF-D3).
--    - form templates: each saved version is checked field by field; a field that is new or
--      changed since the previous version needs a purpose and an example; unchanged fields
--      carried over from the previous version are exempt until someone edits them (CF-D3).
-- 4. Report: user-created fields still missing help, per organisation.
-- No new tables. Idempotent. Rollback: v1494r_mandatory_help_on_user_created_fields_rollback.sql.
-- ============================================================================

-- ── 1. Columns ──────────────────────────────────────────────────────────────
ALTER TABLE public.custom_field_definitions
  ADD COLUMN IF NOT EXISTS help_purpose TEXT,
  ADD COLUMN IF NOT EXISTS help_example TEXT,
  ADD COLUMN IF NOT EXISTS help_format  TEXT;
ALTER TABLE sim.custom_field_definitions
  ADD COLUMN IF NOT EXISTS help_purpose TEXT,
  ADD COLUMN IF NOT EXISTS help_example TEXT,
  ADD COLUMN IF NOT EXISTS help_format  TEXT;
ALTER TABLE public.regional_format_local_field_definitions
  ADD COLUMN IF NOT EXISTS help_purpose TEXT,
  ADD COLUMN IF NOT EXISTS help_example TEXT,
  ADD COLUMN IF NOT EXISTS help_format  TEXT;

-- ── 2. Starting point from existing descriptions ────────────────────────────
UPDATE public.custom_field_definitions
   SET help_purpose = btrim(description)
 WHERE COALESCE(btrim(help_purpose), '') = '' AND COALESCE(btrim(description), '') <> '';
UPDATE sim.custom_field_definitions
   SET help_purpose = btrim(description)
 WHERE COALESCE(btrim(help_purpose), '') = '' AND COALESCE(btrim(description), '') <> '';

-- ── 3a. Field definitions: purpose + example required on users' saves ───────
-- TG_ARGV[0] = the definition's type column (field_type or value_type).
CREATE OR REPLACE FUNCTION public.trg_require_field_definition_help()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_type_col TEXT := TG_ARGV[0];
  v_new JSONB := to_jsonb(NEW);
  v_old JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- SQL seeds, service role, system jobs
  END IF;
  IF COALESCE((v_new ->> 'is_deleted')::boolean, FALSE) THEN
    RETURN NEW; -- deleting is never blocked
  END IF;
  IF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    IF (v_new ->> 'label') IS NOT DISTINCT FROM (v_old ->> 'label')
       AND (v_new ->> v_type_col) IS NOT DISTINCT FROM (v_old ->> v_type_col)
       AND (v_new ->> 'help_purpose') IS NOT DISTINCT FROM (v_old ->> 'help_purpose')
       AND (v_new ->> 'help_example') IS NOT DISTINCT FROM (v_old ->> 'help_example')
       AND (v_new ->> 'help_format') IS NOT DISTINCT FROM (v_old ->> 'help_format') THEN
      RETURN NEW; -- not an edit of the field itself (order, status, ...)
    END IF;
  END IF;
  IF COALESCE(btrim(NEW.help_purpose), '') = '' OR COALESCE(btrim(NEW.help_example), '') = '' THEN
    RAISE EXCEPTION 'Help is required for field "%": add what the field is for (purpose) and an example value.', NEW.label
      USING ERRCODE = 'check_violation', HINT = 'v1345 rule 76: user-created fields need help.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cfd_require_help ON public.custom_field_definitions;
CREATE TRIGGER trg_cfd_require_help BEFORE INSERT OR UPDATE ON public.custom_field_definitions
  FOR EACH ROW EXECUTE FUNCTION public.trg_require_field_definition_help('field_type');
DROP TRIGGER IF EXISTS trg_sim_cfd_require_help ON sim.custom_field_definitions;
CREATE TRIGGER trg_sim_cfd_require_help BEFORE INSERT OR UPDATE ON sim.custom_field_definitions
  FOR EACH ROW EXECUTE FUNCTION public.trg_require_field_definition_help('field_type');
DROP TRIGGER IF EXISTS trg_rflfd_require_help ON public.regional_format_local_field_definitions;
CREATE TRIGGER trg_rflfd_require_help BEFORE INSERT OR UPDATE ON public.regional_format_local_field_definitions
  FOR EACH ROW EXECUTE FUNCTION public.trg_require_field_definition_help('value_type');

-- ── 3b. Form templates: new or changed fields need purpose + example ────────
CREATE OR REPLACE FUNCTION public.trg_require_form_template_field_help()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_prev JSONB;
  v_field JSONB;
  v_prev_field JSONB;
  v_purpose TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- template seeds and global template sync
  END IF;
  IF TG_TABLE_SCHEMA = 'sim' THEN
    v_prev := (SELECT v.schema FROM sim.form_template_versions v
               WHERE v.template_id = NEW.template_id AND v.version_number < NEW.version_number
               ORDER BY v.version_number DESC LIMIT 1);
  ELSE
    v_prev := (SELECT v.schema FROM public.form_template_versions v
               WHERE v.template_id = NEW.template_id AND v.version_number < NEW.version_number
               ORDER BY v.version_number DESC LIMIT 1);
  END IF;

  FOR v_field IN
    SELECT f FROM jsonb_array_elements(COALESCE(NEW.schema -> 'sections', '[]'::jsonb)) s,
                  jsonb_array_elements(COALESCE(s -> 'fields', '[]'::jsonb)) f
  LOOP
    v_prev_field := (SELECT pf FROM jsonb_array_elements(COALESCE(v_prev -> 'sections', '[]'::jsonb)) ps,
                                    jsonb_array_elements(COALESCE(ps -> 'fields', '[]'::jsonb)) pf
                     WHERE pf ->> 'key' = v_field ->> 'key' LIMIT 1);
    CONTINUE WHEN v_prev_field IS NOT NULL
      AND (v_prev_field ->> 'label') IS NOT DISTINCT FROM (v_field ->> 'label')
      AND (v_prev_field ->> 'type') IS NOT DISTINCT FROM (v_field ->> 'type')
      -- effective purpose: help_purpose, else the older optional "help" text
      AND COALESCE(NULLIF(btrim(v_prev_field ->> 'help_purpose'), ''), NULLIF(btrim(v_prev_field ->> 'help'), ''))
          IS NOT DISTINCT FROM COALESCE(NULLIF(btrim(v_field ->> 'help_purpose'), ''), NULLIF(btrim(v_field ->> 'help'), ''))
      AND (v_prev_field ->> 'help_example') IS NOT DISTINCT FROM (v_field ->> 'help_example')
      AND (v_prev_field ->> 'help_format') IS NOT DISTINCT FROM (v_field ->> 'help_format');
    v_purpose := COALESCE(NULLIF(btrim(v_field ->> 'help_purpose'), ''), btrim(v_field ->> 'help'));
    IF COALESCE(v_purpose, '') = '' OR COALESCE(btrim(v_field ->> 'help_example'), '') = '' THEN
      RAISE EXCEPTION 'Help is required for form field "%": add what the field is for (purpose) and an example value.',
        COALESCE(v_field ->> 'label', v_field ->> 'key')
        USING ERRCODE = 'check_violation', HINT = 'v1345 rule 76: user-created fields need help.';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ftv_require_field_help ON public.form_template_versions;
CREATE TRIGGER trg_ftv_require_field_help BEFORE INSERT ON public.form_template_versions
  FOR EACH ROW EXECUTE FUNCTION public.trg_require_form_template_field_help();
DROP TRIGGER IF EXISTS trg_sim_ftv_require_field_help ON sim.form_template_versions;
CREATE TRIGGER trg_sim_ftv_require_field_help BEFORE INSERT ON sim.form_template_versions
  FOR EACH ROW EXECUTE FUNCTION public.trg_require_form_template_field_help();

-- ── 4. Report: user-created fields still missing help (CF-D3) ───────────────
-- Run any time; one row per organisation and kind of field.
SELECT a.account_name AS organisation, x.kind, x.missing_help, x.total
FROM (
  SELECT account_id, 'Custom fields (Platform)' AS kind,
         count(*) FILTER (WHERE COALESCE(btrim(help_purpose), '') = '' OR COALESCE(btrim(help_example), '') = '') AS missing_help,
         count(*) AS total
  FROM public.custom_field_definitions WHERE COALESCE(is_deleted, FALSE) = FALSE GROUP BY account_id
  UNION ALL
  SELECT account_id, 'Custom fields (Simulator)',
         count(*) FILTER (WHERE COALESCE(btrim(help_purpose), '') = '' OR COALESCE(btrim(help_example), '') = ''),
         count(*)
  FROM sim.custom_field_definitions WHERE COALESCE(is_deleted, FALSE) = FALSE GROUP BY account_id
  UNION ALL
  SELECT account_id, 'Regional & Format local fields',
         count(*) FILTER (WHERE COALESCE(btrim(help_purpose), '') = '' OR COALESCE(btrim(help_example), '') = ''),
         count(*)
  FROM public.regional_format_local_field_definitions WHERE is_deleted = FALSE GROUP BY account_id
) x
LEFT JOIN public.accounts a ON a.id = x.account_id
WHERE x.missing_help > 0
ORDER BY 1, 2;
