-- ============================================================================
-- v1468: Move every environment record to the one Environments register (v1342, slice 3)
-- ============================================================================
-- PRD/plan v1342 (D4: move all, keep values / statuses / audit / display IDs, delete nothing,
-- same-name records stay separate). Prerequisite: v1467.
--
-- 1. Core environments (public.test_environments, Simulator sim.practice_test_environments)
--    are copied to register records with the SAME id, so test suites' environment_ids keep
--    pointing at them. Active → Ready, inactive → Decommissioned. Name → Title,
--    Description → Description.
-- 2. Banking (fin_core_banking_environments) and IT (ict_environments) records are re-pointed to
--    the new register: same id, display ID, documents and history. Field keys are mapped:
--      Banking: environment → environment_type, component → banking_component
--      IT: hosting → hosting_model (+ cloud deployment type), location → cloud region (cloud /
--          hybrid) or a "Location:" line in Notes, purpose → Description (or a "Purpose:" line in
--          Notes when the record already has a description), application_version → deployed_build,
--          last_refresh → last_refresh_date, refresh values on_request → on_demand,
--          not_applicable → none
--    Every moved record keeps field_values._moved_from (old register key or table) for rollback.
-- 3. The old Banking and IT environment registers are switched off and point at the new one
--    (new column local_registers.moved_to_register_id, used by the list and record pages to
--    redirect old addresses). The old core tables are kept, not dropped.
-- Run v1467, v1468 and v1469 together: core environments added through the old page between
-- runs are picked up by running this file again (idempotent).
-- ============================================================================

-- ── 0. Redirect pointer for switched-off registers (public + sim definitions) ──────────
ALTER TABLE public.local_registers ADD COLUMN IF NOT EXISTS moved_to_register_id UUID REFERENCES public.local_registers(id);
COMMENT ON COLUMN public.local_registers.moved_to_register_id IS
  'v1342: set when a register is retired and its records moved; old addresses open this register instead.';

-- ── 1a. Platform core environments → register records (same id) ─────────────────────
INSERT INTO public.local_register_records
  (id, register_id, display_id, title, description, status, field_values, account_id, project_id, record_project_id,
   created_at, created_by, updated_at, updated_by)
SELECT te.id, '00000000-0000-4000-9100-000000000002'::uuid, '', te.name, NULLIF(btrim(te.description), ''),
       CASE WHEN te.is_active THEN 'ready' ELSE 'decommissioned' END,
       '{"_moved_from":"test_environments"}'::jsonb,
       p.account_id, p.id, p.id,
       te.created_at, te.created_by, te.updated_at, te.updated_by
FROM public.test_environments te
JOIN public.projects p ON p.id = te.project_id
WHERE te.is_deleted = FALSE
ON CONFLICT (id) DO NOTHING;

-- ── 1b. Simulator core environments → register records (same id) ────────────────────
INSERT INTO sim.local_register_records
  (id, register_id, is_system_register, display_id, title, description, status, field_values, record_project_id,
   created_at, created_by, updated_at, updated_by)
SELECT te.id, '00000000-0000-4000-9100-000000000002'::uuid, TRUE, '', te.name, NULLIF(btrim(te.description), ''),
       CASE WHEN te.is_active THEN 'ready' ELSE 'decommissioned' END,
       '{"_moved_from":"practice_test_environments"}'::jsonb,
       te.practice_project_id,
       te.created_at, te.created_by, te.updated_at, te.updated_by
FROM sim.practice_test_environments te
WHERE te.is_deleted = FALSE
ON CONFLICT (id) DO NOTHING;

-- ── 2a. Banking records (Platform, then Simulator) ──────────────────────────────────
UPDATE public.local_register_records r
SET register_id = '00000000-0000-4000-9100-000000000002',
    field_values = (r.field_values - 'environment' - 'component')
      || jsonb_strip_nulls(jsonb_build_object(
           'environment_type', r.field_values -> 'environment',
           'banking_component', r.field_values -> 'component',
           '_moved_from', 'fin_core_banking_environments'))
WHERE r.register_id = '00000000-0000-4000-9001-00000000000a';

UPDATE sim.local_register_records r
SET register_id = '00000000-0000-4000-9100-000000000002',
    field_values = (r.field_values - 'environment' - 'component')
      || jsonb_strip_nulls(jsonb_build_object(
           'environment_type', r.field_values -> 'environment',
           'banking_component', r.field_values -> 'component',
           '_moved_from', 'fin_core_banking_environments'))
WHERE r.is_system_register = TRUE AND r.register_id = '00000000-0000-4000-9001-00000000000a';

-- ── 2b. IT records (Platform, then Simulator) ───────────────────────────────────────
UPDATE public.local_register_records r
SET register_id = '00000000-0000-4000-9100-000000000002',
    description = COALESCE(NULLIF(btrim(r.description), ''), NULLIF(btrim(r.field_values ->> 'purpose'), '')),
    field_values = (r.field_values - 'purpose' - 'hosting' - 'location' - 'application_version' - 'last_refresh')
      || jsonb_strip_nulls(jsonb_build_object(
           'hosting_model', CASE r.field_values ->> 'hosting'
                              WHEN 'on_premises' THEN 'on_premise' WHEN 'private_cloud' THEN 'cloud'
                              WHEN 'public_cloud' THEN 'cloud' WHEN 'hybrid' THEN 'hybrid' END,
           'cloud_deployment_type', CASE r.field_values ->> 'hosting'
                              WHEN 'private_cloud' THEN 'private' WHEN 'public_cloud' THEN 'public' END,
           'cloud_region', CASE WHEN r.field_values ->> 'hosting' IN ('private_cloud', 'public_cloud', 'hybrid')
                              THEN NULLIF(btrim(r.field_values ->> 'location'), '') END,
           'deployed_build', NULLIF(btrim(r.field_values ->> 'application_version'), ''),
           'last_refresh_date', NULLIF(btrim(r.field_values ->> 'last_refresh'), ''),
           'refresh_frequency', CASE r.field_values ->> 'refresh_frequency'
                              WHEN 'on_request' THEN 'on_demand' WHEN 'not_applicable' THEN 'none'
                              ELSE r.field_values ->> 'refresh_frequency' END,
           'notes', NULLIF(concat_ws(E'\n',
                      CASE WHEN COALESCE(r.field_values ->> 'hosting', '') NOT IN ('private_cloud', 'public_cloud', 'hybrid')
                                AND NULLIF(btrim(r.field_values ->> 'location'), '') IS NOT NULL
                           THEN 'Location: ' || btrim(r.field_values ->> 'location') END,
                      CASE WHEN NULLIF(btrim(r.description), '') IS NOT NULL
                                AND NULLIF(btrim(r.field_values ->> 'purpose'), '') IS NOT NULL
                           THEN 'Purpose: ' || btrim(r.field_values ->> 'purpose') END,
                      NULLIF(btrim(r.field_values ->> 'notes'), '')), ''),
           '_moved_from', 'ict_environments'))
WHERE r.register_id = '00000000-0000-4000-9003-000000000012';

UPDATE sim.local_register_records r
SET register_id = '00000000-0000-4000-9100-000000000002',
    description = COALESCE(NULLIF(btrim(r.description), ''), NULLIF(btrim(r.field_values ->> 'purpose'), '')),
    field_values = (r.field_values - 'purpose' - 'hosting' - 'location' - 'application_version' - 'last_refresh')
      || jsonb_strip_nulls(jsonb_build_object(
           'hosting_model', CASE r.field_values ->> 'hosting'
                              WHEN 'on_premises' THEN 'on_premise' WHEN 'private_cloud' THEN 'cloud'
                              WHEN 'public_cloud' THEN 'cloud' WHEN 'hybrid' THEN 'hybrid' END,
           'cloud_deployment_type', CASE r.field_values ->> 'hosting'
                              WHEN 'private_cloud' THEN 'private' WHEN 'public_cloud' THEN 'public' END,
           'cloud_region', CASE WHEN r.field_values ->> 'hosting' IN ('private_cloud', 'public_cloud', 'hybrid')
                              THEN NULLIF(btrim(r.field_values ->> 'location'), '') END,
           'deployed_build', NULLIF(btrim(r.field_values ->> 'application_version'), ''),
           'last_refresh_date', NULLIF(btrim(r.field_values ->> 'last_refresh'), ''),
           'refresh_frequency', CASE r.field_values ->> 'refresh_frequency'
                              WHEN 'on_request' THEN 'on_demand' WHEN 'not_applicable' THEN 'none'
                              ELSE r.field_values ->> 'refresh_frequency' END,
           'notes', NULLIF(concat_ws(E'\n',
                      CASE WHEN COALESCE(r.field_values ->> 'hosting', '') NOT IN ('private_cloud', 'public_cloud', 'hybrid')
                                AND NULLIF(btrim(r.field_values ->> 'location'), '') IS NOT NULL
                           THEN 'Location: ' || btrim(r.field_values ->> 'location') END,
                      CASE WHEN NULLIF(btrim(r.description), '') IS NOT NULL
                                AND NULLIF(btrim(r.field_values ->> 'purpose'), '') IS NOT NULL
                           THEN 'Purpose: ' || btrim(r.field_values ->> 'purpose') END,
                      NULLIF(btrim(r.field_values ->> 'notes'), '')), ''),
           '_moved_from', 'ict_environments'))
WHERE r.is_system_register = TRUE AND r.register_id = '00000000-0000-4000-9003-000000000012';

-- ── 3. Old registers off, pointing at the new one; old core tables kept ──────────────
UPDATE public.local_registers
SET is_active = FALSE, moved_to_register_id = '00000000-0000-4000-9100-000000000002', updated_at = NOW()
WHERE id IN ('00000000-0000-4000-9001-00000000000a', '00000000-0000-4000-9003-000000000012');

COMMENT ON TABLE public.test_environments IS
  'v1191, superseded by v1342 / SQL v1468: environments now live in the register core_environments (same ids). Kept for rollback.';
COMMENT ON TABLE sim.practice_test_environments IS
  'v1191, superseded by v1342 / SQL v1468: environments now live in the register core_environments (same ids). Kept for rollback.';

-- ── Self-check ─────────────────────────────────────────────────────────────────────
-- A. Per project: old core + moved Banking / IT = merged (expect ok = true on every row).
SELECT 'A_counts' AS check_name, p.project_code,
       (SELECT count(*) FROM public.test_environments te WHERE te.project_id = p.id AND te.is_deleted = FALSE) AS core_rows,
       count(*) FILTER (WHERE r.field_values ->> '_moved_from' = 'fin_core_banking_environments') AS banking_rows,
       count(*) FILTER (WHERE r.field_values ->> '_moved_from' = 'ict_environments') AS it_rows,
       count(*) FILTER (WHERE r.field_values ->> '_moved_from' = 'test_environments') AS core_copied,
       count(*) AS merged_rows,
       count(*) FILTER (WHERE r.field_values ->> '_moved_from' = 'test_environments')
         = (SELECT count(*) FROM public.test_environments te WHERE te.project_id = p.id AND te.is_deleted = FALSE) AS ok
FROM public.local_register_records r
JOIN public.projects p ON p.id = r.record_project_id
WHERE r.register_id = '00000000-0000-4000-9100-000000000002' AND r.is_deleted = FALSE
GROUP BY p.id, p.project_code
ORDER BY p.project_code;

-- B. Test suite environment links that no longer resolve (expect no rows), Platform and Simulator.
SELECT 'B_unresolved_suite_link' AS check_name, 'platform' AS app, s.id AS suite_id, e.value AS environment_id
FROM public.test_suites s, jsonb_array_elements_text(COALESCE(s.environment_ids, '[]'::jsonb)) e(value)
WHERE COALESCE(s.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (SELECT 1 FROM public.local_register_records r
                  WHERE r.id::text = e.value AND r.register_id = '00000000-0000-4000-9100-000000000002')
UNION ALL
SELECT 'B_unresolved_suite_link', 'simulator', s.id, e.value
FROM sim.practice_test_suites s, jsonb_array_elements_text(COALESCE(s.environment_ids, '[]'::jsonb)) e(value)
WHERE COALESCE(s.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (SELECT 1 FROM sim.local_register_records r
                  WHERE r.id::text = e.value AND r.register_id = '00000000-0000-4000-9100-000000000002');

-- C. Records left on the old registers (expect 0).
SELECT 'C_left_behind' AS check_name,
  (SELECT count(*) FROM public.local_register_records WHERE register_id IN ('00000000-0000-4000-9001-00000000000a', '00000000-0000-4000-9003-000000000012')) AS platform,
  (SELECT count(*) FROM sim.local_register_records WHERE register_id IN ('00000000-0000-4000-9001-00000000000a', '00000000-0000-4000-9003-000000000012')) AS simulator;

NOTIFY pgrst, 'reload schema';
