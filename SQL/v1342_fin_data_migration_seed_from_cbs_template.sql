-- ============================================================================
-- v1342: Seed alignment — the sample Data Migration Strategy is re-created from the CBS DMSD template
-- ============================================================================
-- Feature: projectprd/v1336_register_document_templates_cbs_dmsd_PRD.md
-- Plan:    projectplan/v1336_register_document_templates_cbs_dmsd_plan.md (slice 5)
--
-- Owner decision (v1336 interview): replace the v1329 sample strategy (LREG-2026-105, project
-- SEED334-PRJ-08) and its Data Scope records with a copy of the Core Banking System DMSD system
-- template (v1341) — so the demo shows a record created from the template, placeholders and all.
--
--   * Deletes the v1329 seed rows only (ids …-4000-a00c-… and …-4000-a00d-…); their sign-off rows,
--     annexure rows and version history go with them (ON DELETE CASCADE). Records users created
--     in the project are not touched.
--   * Inserts the strategy with the same id and display ID (the existing ID Generation value is
--     kept, not minted — rule 16.2) and one Data Scope record per template child (fixed ids
--     …-4000-a00d-<sort order>, blank display IDs for the Admin ID Generation trigger).
--   * Provenance: created_from_template_id / created_from_template_version.
--
-- Afterwards, attach the template's annexures to the record:
--   node scripts/seed-data-migration-strategy-annexures.mjs
-- (it also removes the old annexure files left in storage).
--
-- Do not re-run v1329–v1331 after this file: they would overwrite the copy with the old sample.
-- Recovery: to go back to the old sample, delete the …-a00c-…001 / …-a00d-… rows and run v1329–v1331
-- (the old sample text is in those files; its annexures came from Documents/Data Migration Sample v1.docx).
-- Sign-offs and version history on the sample record are not recoverable — it is demo data only.
-- Run after: v1339 (one strategy per project) and v1341 (template). Re-runnable.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_project  UUID;
  v_account  UUID;
  v_t        RECORD;
  v_display  TEXT;
  v_other    UUID;
  v_children INT;
BEGIN
  SELECT id, account_id INTO v_project, v_account FROM public.projects WHERE project_code = 'SEED334-PRJ-08' LIMIT 1;
  IF v_project IS NULL THEN
    RAISE NOTICE 'v1342: project SEED334-PRJ-08 not found — nothing changed';
    RETURN;
  END IF;

  SELECT id, version, record_title, record_description, field_values INTO v_t
  FROM public.local_register_templates WHERE id = '00000000-0000-4000-b341-000000000001'::uuid;
  IF v_t.id IS NULL THEN
    RAISE EXCEPTION 'v1342: the CBS DMSD template is missing — run v1341 first';
  END IF;

  -- Another (user-created) strategy in the project would block the copy (one per project, v1339).
  SELECT id INTO v_other FROM public.local_register_records
  WHERE register_id = '00000000-0000-4000-9001-00000000000c'::uuid AND record_project_id = v_project
    AND is_deleted = FALSE AND id <> '00000000-0000-4000-a00c-000000000001'::uuid
  LIMIT 1;
  IF v_other IS NOT NULL THEN
    RAISE NOTICE 'v1342: SEED334-PRJ-08 already has another Data Migration Strategy (%) — nothing changed', v_other;
    RETURN;
  END IF;

  SELECT NULLIF(display_id, '') INTO v_display
  FROM public.local_register_records WHERE id = '00000000-0000-4000-a00c-000000000001'::uuid;

  -- Lifts the sign-off edit lock for this transaction only.
  PERFORM set_config('nidus.local_register_signoff', 'on', TRUE);

  DELETE FROM public.local_register_records
  WHERE id = '00000000-0000-4000-a00c-000000000001'::uuid
     OR (register_id = '00000000-0000-4000-9001-00000000000d'::uuid AND id::text LIKE '00000000-0000-4000-a00d-%');

  INSERT INTO public.local_register_records
    (id, register_id, display_id, title, description, status, field_values, account_id, project_id, record_project_id,
     created_from_template_id, created_from_template_version)
  VALUES ('00000000-0000-4000-a00c-000000000001'::uuid, '00000000-0000-4000-9001-00000000000c'::uuid, COALESCE(v_display, ''),
          'Data Migration Strategy – Northbridge Bank Core Banking Replacement', v_t.record_description, 'draft',
          v_t.field_values, v_account, v_project, v_project, v_t.id, v_t.version);

  INSERT INTO public.local_register_records
    (id, register_id, display_id, title, description, status, field_values, account_id, project_id, record_project_id,
     created_from_template_id, created_from_template_version)
  SELECT ('00000000-0000-4000-a00d-' || lpad(to_hex(c.sort_order), 12, '0'))::uuid,
         '00000000-0000-4000-9001-00000000000d'::uuid, '', c.title, c.description,
         CASE WHEN COALESCE(r.status_workflow, '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('key', c.status))
              THEN c.status ELSE COALESCE(r.status_workflow -> 0 ->> 'key', 'draft') END,
         c.field_values, v_account, v_project, v_project, v_t.id, v_t.version
  FROM public.local_register_template_children c
  JOIN public.local_registers r ON r.id = '00000000-0000-4000-9001-00000000000d'::uuid
  WHERE c.template_id = v_t.id AND c.register_key = 'fin_data_scope'
  ORDER BY c.sort_order;
  GET DIAGNOSTICS v_children = ROW_COUNT;

  PERFORM set_config('nidus.local_register_signoff', '', TRUE);
  RAISE NOTICE 'v1342: strategy % re-created from template version % with % Data Scope records',
    COALESCE(v_display, '(new display ID)'), v_t.version, v_children;
END $$;

COMMIT;

-- Check: the strategy (template provenance, version 1) and its Data Scope records.
SELECT r.display_id, r.title, r.content_version, r.created_from_template_version,
       (SELECT count(*) FROM public.local_register_records s
         WHERE s.register_id = '00000000-0000-4000-9001-00000000000d'::uuid
           AND s.record_project_id = r.record_project_id AND s.is_deleted = FALSE) AS data_scope_records
FROM public.local_register_records r
WHERE r.id = '00000000-0000-4000-a00c-000000000001'::uuid;
