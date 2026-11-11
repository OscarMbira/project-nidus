-- ============================================================================
-- v1351: Target Module dropdown (Data Scope) + Load Steps table (Data Mapping)
-- ============================================================================
-- Owner decision 2026-11-09:
--   1. One shared Target Module list (20 vendor-neutral modules — rule 26). Data Scope's "Target
--      System Module" becomes a dropdown on that list; existing text is converted on records and on
--      template child records (CBS DMSD, v1341, and organisation templates). Text that matches no
--      module is left as it was (it still shows; the user can pick a module).
--   2. Data Mapping: one mapping sheet often covers several loads, so Extract File Name, Target
--      Module, Target Table / Load Activity and Load Method become one "Load Steps" table — one row
--      per load: Extract File · Target Module ▾ · Load Step ▾ · Target Table / Activity · Load
--      Method ▾. Dropdown columns are new in the table engine (v1351: column type 'select'; the cell
--      stores the option label). Load Step is a vendor-neutral list; the product-specific table or
--      activity name stays free text.
--      Existing values move into row 1 of each record; the 10 sample sheets (…-a00f-…) get their
--      real steps (e.g. DMS-LND-02/03/04 = three loads) while they still hold the sample values. The
--      four old fields are removed from the form (their stored values are kept in field_values).
-- Do not re-run v1348 after this file (it would add the four old fields back).
-- Prerequisites: v1338, v1341, v1348–v1350. Idempotent.
-- ============================================================================

-- Text → module key (helper for this file only; dropped at the end).
CREATE OR REPLACE FUNCTION public.v1351_target_module_key(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_text IS NULL OR btrim(p_text) = '' THEN p_text
    WHEN p_text IN ('customer','accounts','deposits','lending','limits','collateral','trade_finance','treasury','securities','cards',
                    'payments','cheques','general_ledger','internal_accounts','teller','imaging','delivery','users_security','reference_data','other') THEN p_text
    WHEN p_text ILIKE '%custom table%' THEN 'other'
    WHEN p_text ILIKE '%users%' OR p_text ILIKE '%roles%' THEN 'users_security'
    WHEN p_text ILIKE 'customer%' THEN 'customer'
    WHEN p_text ILIKE '%internal account%' THEN 'internal_accounts'
    WHEN p_text ILIKE '%deposit%' THEN 'deposits'
    WHEN p_text ILIKE '%lending%' OR p_text ILIKE '%loan%' THEN 'lending'
    WHEN p_text ILIKE '%limit%' THEN 'limits'
    WHEN p_text ILIKE '%collateral%' THEN 'collateral'
    WHEN p_text ILIKE '%trade finance%' OR p_text ILIKE 'bills%' THEN 'trade_finance'
    WHEN p_text ILIKE '%treasury%' OR p_text ILIKE '%money market%' THEN 'treasury'
    WHEN p_text ILIKE '%securit%' THEN 'securities'
    WHEN p_text ILIKE '%card%' THEN 'cards'
    WHEN p_text ILIKE '%cheque%' THEN 'cheques'
    WHEN p_text ILIKE '%standing order%' OR p_text ILIKE '%sweep%' OR p_text ILIKE '%funds transfer%' OR p_text ILIKE '%payment%' THEN 'payments'
    WHEN p_text ILIKE '%general ledger%' THEN 'general_ledger'
    WHEN p_text ILIKE '%teller%' THEN 'teller'
    WHEN p_text ILIKE '%imaging%' OR p_text ILIKE '%document%' THEN 'imaging'
    WHEN p_text ILIKE '%delivery%' OR p_text ILIKE '%directory%' OR p_text ILIKE '%messag%' THEN 'delivery'
    WHEN p_text ILIKE '%reference%' OR p_text ILIKE '%parameter%' THEN 'reference_data'
    WHEN p_text ILIKE '%account%' THEN 'accounts'
    ELSE p_text
  END
$$;

-- ── 1. Data Scope: Target System Module → dropdown ───────────────────────────────────
UPDATE public.local_register_fields
SET field_type = 'dropdown',
    dropdown_options = '[{"value":"customer","label":"Customer"},{"value":"accounts","label":"Accounts"},{"value":"deposits","label":"Deposits"},{"value":"lending","label":"Lending"},{"value":"limits","label":"Limits"},{"value":"collateral","label":"Collateral"},{"value":"trade_finance","label":"Trade Finance"},{"value":"treasury","label":"Treasury"},{"value":"securities","label":"Securities"},{"value":"cards","label":"Cards"},{"value":"payments","label":"Payments and Transfers"},{"value":"cheques","label":"Cheques"},{"value":"general_ledger","label":"General Ledger"},{"value":"internal_accounts","label":"Internal Accounts"},{"value":"teller","label":"Teller and Cash"},{"value":"imaging","label":"Imaging and Documents"},{"value":"delivery","label":"Delivery and Messaging"},{"value":"users_security","label":"Users and Security"},{"value":"reference_data","label":"Reference Data and Parameters"},{"value":"other","label":"Other"}]'::jsonb,
    updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-00000000000d'::uuid AND field_key = 'target_module';

UPDATE public.local_register_records
SET field_values = jsonb_set(field_values, '{target_module}', to_jsonb(public.v1351_target_module_key(field_values ->> 'target_module'))),
    updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-00000000000d'::uuid
  AND field_values ? 'target_module'
  AND field_values ->> 'target_module' IS DISTINCT FROM public.v1351_target_module_key(field_values ->> 'target_module');

UPDATE sim.local_register_records
SET field_values = jsonb_set(field_values, '{target_module}', to_jsonb(public.v1351_target_module_key(field_values ->> 'target_module'))),
    updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-00000000000d'::uuid
  AND field_values ? 'target_module'
  AND field_values ->> 'target_module' IS DISTINCT FROM public.v1351_target_module_key(field_values ->> 'target_module');

UPDATE public.local_register_template_children
SET field_values = jsonb_set(field_values, '{target_module}', to_jsonb(public.v1351_target_module_key(field_values ->> 'target_module')))
WHERE register_key = 'fin_data_scope'
  AND field_values ? 'target_module'
  AND field_values ->> 'target_module' IS DISTINCT FROM public.v1351_target_module_key(field_values ->> 'target_module');

UPDATE sim.local_register_template_children
SET field_values = jsonb_set(field_values, '{target_module}', to_jsonb(public.v1351_target_module_key(field_values ->> 'target_module')))
WHERE register_key = 'fin_data_scope'
  AND field_values ? 'target_module'
  AND field_values ->> 'target_module' IS DISTINCT FROM public.v1351_target_module_key(field_values ->> 'target_module');

-- ── 2. Data Mapping: Load Steps table ────────────────────────────────────────────────
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-00000000000f'::uuid, 'load_steps', 'Load Steps', 'table', FALSE, 11, 'Source & Target',
  jsonb_build_array(
    jsonb_build_object('value', 'extract_file', 'label', 'Extract File'),
    jsonb_build_object('value', 'target_module', 'label', 'Target Module', 'type', 'select',
      'options', (SELECT jsonb_agg(o ->> 'label' ORDER BY ord) FROM public.local_register_fields f,
                  jsonb_array_elements(f.dropdown_options) WITH ORDINALITY AS t(o, ord)
                  WHERE f.register_id = '00000000-0000-4000-9001-00000000000d'::uuid AND f.field_key = 'target_module')),
    jsonb_build_object('value', 'load_step', 'label', 'Load Step', 'type', 'select',
      'options', '["Create / takeover","Capture balances","Adjust balance","Capture bills","Journal / data capture","Update / amend"]'::jsonb),
    jsonb_build_object('value', 'target_activity', 'label', 'Target Table / Activity'),
    jsonb_build_object('value', 'load_method', 'label', 'Load Method', 'type', 'select',
      'options', '["Automated load (mapping sheet)","Standard upload utility","Manual capture","Journal / data capture"]'::jsonb)
  )
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000000f'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, updated_at = NOW();

-- 2a. Sample sheets still holding the v1349 values: their real load steps.
UPDATE public.local_register_records r
SET field_values = r.field_values || jsonb_build_object('load_steps', v.steps), updated_at = NOW()
FROM (VALUES
  ('00000000-0000-4000-a00f-000000000001', 'Customer master (bulk load)',
   E'NB_CUSTOMER_<YYYYMMDD>_<run>.txt\tCustomer\tCreate / takeover\tCustomer master (bulk load)\tAutomated load (mapping sheet)\nNB_CUSTOMER_REL_<YYYYMMDD>_<run>.txt\tCustomer\tCreate / takeover\tCustomer relationships\tAutomated load (mapping sheet)\nNB_CUSTOMER_DELTA_<YYYYMMDD>_<run>.txt\tCustomer\tUpdate / amend\tCustomer master (delta on the cutover weekend)\tAutomated load (mapping sheet)'),
  ('00000000-0000-4000-a00f-000000000002', 'Account takeover arrangement; capture balances',
   E'NB_ACCOUNT_<YYYYMMDD>_<run>.txt\tAccounts\tCreate / takeover\tAccount takeover arrangement\tAutomated load (mapping sheet)\nNB_ACCOUNT_BAL_<YYYYMMDD>_<run>.txt\tAccounts\tCapture balances\tCapture balances and accruals\tAutomated load (mapping sheet)\nNB_ACCOUNT_LOWBAL_<YYYYMMDD>_<run>.txt\tPayments and Transfers\tCapture balances\tLowest balance funds transfer (savings, mid-month)\tAutomated load (mapping sheet)'),
  ('00000000-0000-4000-a00f-000000000003', 'Deposit takeover arrangement',
   E'NB_DEPOSIT_<YYYYMMDD>_<run>.txt\tDeposits\tCreate / takeover\tDeposit takeover arrangement\tAutomated load (mapping sheet)'),
  ('00000000-0000-4000-a00f-000000000004', 'Capture balances; adjust expected principal',
   E'NB_DEPOSIT_BAL_<YYYYMMDD>_<run>.txt\tDeposits\tCapture balances\tCapture principal and accrued interest\tAutomated load (mapping sheet)\nNB_DEPOSIT_ADJ_<YYYYMMDD>_<run>.txt\tDeposits\tAdjust balance\tAdjust expected principal (already funded)\tAutomated load (mapping sheet)'),
  ('00000000-0000-4000-a00f-000000000005', 'Lending takeover arrangement',
   E'NB_LOAN_<YYYYMMDD>_<run>.txt\tLending\tCreate / takeover\tLending takeover arrangement\tAutomated load (mapping sheet)'),
  ('00000000-0000-4000-a00f-000000000006', 'Capture balances; adjust commitment; capture bills',
   E'NB_LOAN_BAL_<YYYYMMDD>_<run>.txt\tLending\tCapture balances\tCapture principal and accruals\tAutomated load (mapping sheet)\nNB_LOAN_COMMIT_<YYYYMMDD>_<run>.txt\tLending\tAdjust balance\tAdjust outstanding commitment\tAutomated load (mapping sheet)\nNB_LOAN_BILLS_<YYYYMMDD>_<run>.txt\tLending\tCapture bills\tCapture overdue and due bills with ageing\tAutomated load (mapping sheet)\nNB_LOAN_FEES_<YYYYMMDD>_<run>.xlsx\tLending\tCapture bills\tCapture unamortised fees\tStandard upload utility'),
  ('00000000-0000-4000-a00f-000000000007', 'Limit (bulk load)',
   E'NB_LIMIT_<YYYYMMDD>_<run>.txt\tLimits\tCreate / takeover\tLimit (bulk load)\tAutomated load (mapping sheet)'),
  ('00000000-0000-4000-a00f-000000000008', 'Collateral right; collateral',
   E'NB_COLLATERAL_RIGHT_<YYYYMMDD>_<run>.txt\tCollateral\tCreate / takeover\tCollateral right\tAutomated load (mapping sheet)\nNB_COLLATERAL_<YYYYMMDD>_<run>.txt\tCollateral\tCreate / takeover\tCollateral item\tAutomated load (mapping sheet)'),
  ('00000000-0000-4000-a00f-000000000009', 'Letters of credit; drawings; guarantees; bills',
   E'NB_LC_<YYYYMMDD>_<run>.txt\tTrade Finance\tCreate / takeover\tLetters of credit\tAutomated load (mapping sheet)\nNB_LC_DRAWING_<YYYYMMDD>_<run>.txt\tTrade Finance\tCreate / takeover\tDrawings\tAutomated load (mapping sheet)\nNB_GUARANTEE_<YYYYMMDD>_<run>.txt\tTrade Finance\tCreate / takeover\tGuarantees\tAutomated load (mapping sheet)\nNB_BILLS_<YYYYMMDD>_<run>.txt\tTrade Finance\tCreate / takeover\tBills\tAutomated load (mapping sheet)'),
  ('00000000-0000-4000-a00f-00000000000a', 'Journal capture (balanced)',
   E'NB_GL_BAL_<YYYYMMDD>_<run>.xlsx\tGeneral Ledger\tJournal / data capture\tJournal capture (balanced)\tJournal / data capture')
) AS v(id, seeded_target_table, steps)
WHERE r.id = v.id::uuid AND r.is_deleted = FALSE
  AND NOT (r.field_values ? 'load_steps')
  AND r.field_values ->> 'target_table' = v.seeded_target_table;

-- 2b. Every other record: the four old values become row 1 (Load Step left blank).
UPDATE public.local_register_records r
SET field_values = r.field_values || jsonb_build_object('load_steps',
      concat_ws(E'\t',
        COALESCE(r.field_values ->> 'extract_file_name', ''),
        COALESCE((SELECT o ->> 'label' FROM public.local_register_fields f, jsonb_array_elements(f.dropdown_options) o
                  WHERE f.register_id = '00000000-0000-4000-9001-00000000000d'::uuid AND f.field_key = 'target_module'
                    AND o ->> 'value' = public.v1351_target_module_key(r.field_values ->> 'target_module')),
                 r.field_values ->> 'target_module', ''),
        '',
        COALESCE(r.field_values ->> 'target_table', ''),
        COALESCE((SELECT o ->> 'label' FROM public.local_register_fields f, jsonb_array_elements(f.dropdown_options) o
                  WHERE f.register_id = '00000000-0000-4000-9001-00000000000f'::uuid AND f.field_key = 'load_method'
                    AND o ->> 'value' = r.field_values ->> 'load_method'), '')
      )),
    updated_at = NOW()
WHERE r.register_id = '00000000-0000-4000-9001-00000000000f'::uuid
  AND NOT (r.field_values ? 'load_steps')
  AND (COALESCE(r.field_values ->> 'extract_file_name', '') <> '' OR COALESCE(r.field_values ->> 'target_module', '') <> ''
       OR COALESCE(r.field_values ->> 'target_table', '') <> '' OR COALESCE(r.field_values ->> 'load_method', '') <> '');

-- 2c. The four separate fields leave the form (values stay in field_values).
DELETE FROM public.local_register_fields
WHERE register_id = '00000000-0000-4000-9001-00000000000f'::uuid
  AND field_key IN ('extract_file_name', 'target_module', 'target_table', 'load_method');

DROP FUNCTION public.v1351_target_module_key(TEXT);

-- Check: Data Scope modules in use, and Load Steps rows per sample mapping sheet.
SELECT 'Data Scope' AS register, field_values ->> 'target_module' AS value, count(*) AS records
FROM public.local_register_records
WHERE register_id = '00000000-0000-4000-9001-00000000000d'::uuid AND is_deleted = FALSE
GROUP BY 2
UNION ALL
SELECT 'Data Mapping', display_id, array_length(string_to_array(field_values ->> 'load_steps', E'\n'), 1)
FROM public.local_register_records
WHERE register_id = '00000000-0000-4000-9001-00000000000f'::uuid AND is_deleted = FALSE
ORDER BY 1, 2;
