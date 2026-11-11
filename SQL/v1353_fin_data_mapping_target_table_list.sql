-- ============================================================================
-- v1353: Data Mapping Load Steps — Target Table becomes a dropdown, Activity stays free text
-- ============================================================================
-- Owner request 2026-11-09: split the Load Steps column "Target Table / Activity" (v1351) into
--   * Target Table ▾ — a fixed list of 47 vendor-neutral target tables, labelled
--     "<Target Module> – <Table>" (e.g. "Lending – Loan bills") so the searchable dropdown groups
--     them by module (rule 26: no product-specific table names; rule 69: searchable list); and
--   * Activity — free text (e.g. "Capture overdue and due bills with ageing").
-- Load Steps columns: Extract File · Target Module ▾ · Load Step ▾ · Target Table ▾ · Activity ·
-- Load Method ▾. The list lives in the column definition (local_register_fields.dropdown_options);
-- add tables by re-running this file with a longer list.
-- Existing rows: the old "Target Table / Activity" text moves to Activity, Target Table left blank
-- (rows with 5 cells get an empty cell inserted, so re-running is safe). The 10 sample mapping
-- sheets (…-a00f-…) get their Target Table and Activity while they still hold the v1351 sample rows.
-- Prerequisites: v1351. Idempotent.
-- ============================================================================

UPDATE public.local_register_fields
SET dropdown_options = jsonb_build_array(
      jsonb_build_object('value', 'extract_file', 'label', 'Extract File'),
      (SELECT c FROM jsonb_array_elements(dropdown_options) c WHERE c ->> 'value' = 'target_module'),
      (SELECT c FROM jsonb_array_elements(dropdown_options) c WHERE c ->> 'value' = 'load_step'),
      jsonb_build_object('value', 'target_table', 'label', 'Target Table', 'type', 'select',
        'options', '["Customer – Customer master","Customer – Customer relationships","Customer – Customer addresses","Customer – KYC details","Accounts – Account arrangement","Accounts – Account balances and accruals","Accounts – Posting restrictions","Accounts – Statement frequency","Accounts – Dormancy dates","Accounts – Account locks","Deposits – Deposit arrangement","Deposits – Deposit balances and accruals","Lending – Loan arrangement","Lending – Loan balances and accruals","Lending – Loan commitment","Lending – Loan bills","Lending – Repayment schedules","Lending – Payment holidays","Limits – Limits","Collateral – Collateral rights","Collateral – Collateral items","Trade Finance – Letters of credit","Trade Finance – Drawings","Trade Finance – Guarantees","Trade Finance – Bills","Treasury – Foreign exchange deals","Treasury – Money market deals","Securities – Securities accounts","Securities – Security master","Cards – Card issue","Payments and Transfers – Standing orders","Payments and Transfers – Sweeps","Payments and Transfers – Funds transfers","Cheques – Cheque issue","Cheques – Cheques presented","Cheques – Stop payments","General Ledger – Journal entries","General Ledger – GL balances","Internal Accounts – Internal accounts","Teller and Cash – Vault accounts","Imaging and Documents – Document images","Delivery and Messaging – Delivery addresses","Delivery and Messaging – Bank directory","Users and Security – User profiles","Users and Security – User roles","Reference Data and Parameters – Reference tables","Other – Custom tables"]'::jsonb),
      jsonb_build_object('value', 'activity', 'label', 'Activity'),
      (SELECT c FROM jsonb_array_elements(dropdown_options) c WHERE c ->> 'value' = 'load_method')
    ),
    updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-00000000000f'::uuid AND field_key = 'load_steps';

-- Sample mapping sheets still holding the v1351 rows: Target Table + Activity.
UPDATE public.local_register_records r
SET field_values = jsonb_set(r.field_values, '{load_steps}', to_jsonb(v.new_steps)), updated_at = NOW()
FROM (VALUES
  ('00000000-0000-4000-a00f-000000000001',
   E'NB_CUSTOMER_<YYYYMMDD>_<run>.txt\tCustomer\tCreate / takeover\tCustomer master (bulk load)\tAutomated load (mapping sheet)\nNB_CUSTOMER_REL_<YYYYMMDD>_<run>.txt\tCustomer\tCreate / takeover\tCustomer relationships\tAutomated load (mapping sheet)\nNB_CUSTOMER_DELTA_<YYYYMMDD>_<run>.txt\tCustomer\tUpdate / amend\tCustomer master (delta on the cutover weekend)\tAutomated load (mapping sheet)',
   E'NB_CUSTOMER_<YYYYMMDD>_<run>.txt\tCustomer\tCreate / takeover\tCustomer – Customer master\tBulk load\tAutomated load (mapping sheet)\nNB_CUSTOMER_REL_<YYYYMMDD>_<run>.txt\tCustomer\tCreate / takeover\tCustomer – Customer relationships\tBulk load\tAutomated load (mapping sheet)\nNB_CUSTOMER_DELTA_<YYYYMMDD>_<run>.txt\tCustomer\tUpdate / amend\tCustomer – Customer master\tDelta update on the cutover weekend\tAutomated load (mapping sheet)'),
  ('00000000-0000-4000-a00f-000000000002',
   E'NB_ACCOUNT_<YYYYMMDD>_<run>.txt\tAccounts\tCreate / takeover\tAccount takeover arrangement\tAutomated load (mapping sheet)\nNB_ACCOUNT_BAL_<YYYYMMDD>_<run>.txt\tAccounts\tCapture balances\tCapture balances and accruals\tAutomated load (mapping sheet)\nNB_ACCOUNT_LOWBAL_<YYYYMMDD>_<run>.txt\tPayments and Transfers\tCapture balances\tLowest balance funds transfer (savings, mid-month)\tAutomated load (mapping sheet)',
   E'NB_ACCOUNT_<YYYYMMDD>_<run>.txt\tAccounts\tCreate / takeover\tAccounts – Account arrangement\tTakeover arrangement\tAutomated load (mapping sheet)\nNB_ACCOUNT_BAL_<YYYYMMDD>_<run>.txt\tAccounts\tCapture balances\tAccounts – Account balances and accruals\tCapture balances and accruals\tAutomated load (mapping sheet)\nNB_ACCOUNT_LOWBAL_<YYYYMMDD>_<run>.txt\tPayments and Transfers\tCapture balances\tPayments and Transfers – Funds transfers\tLowest balance transfer (savings, mid-month)\tAutomated load (mapping sheet)'),
  ('00000000-0000-4000-a00f-000000000003',
   E'NB_DEPOSIT_<YYYYMMDD>_<run>.txt\tDeposits\tCreate / takeover\tDeposit takeover arrangement\tAutomated load (mapping sheet)',
   E'NB_DEPOSIT_<YYYYMMDD>_<run>.txt\tDeposits\tCreate / takeover\tDeposits – Deposit arrangement\tTakeover arrangement\tAutomated load (mapping sheet)'),
  ('00000000-0000-4000-a00f-000000000004',
   E'NB_DEPOSIT_BAL_<YYYYMMDD>_<run>.txt\tDeposits\tCapture balances\tCapture principal and accrued interest\tAutomated load (mapping sheet)\nNB_DEPOSIT_ADJ_<YYYYMMDD>_<run>.txt\tDeposits\tAdjust balance\tAdjust expected principal (already funded)\tAutomated load (mapping sheet)',
   E'NB_DEPOSIT_BAL_<YYYYMMDD>_<run>.txt\tDeposits\tCapture balances\tDeposits – Deposit balances and accruals\tCapture principal and accrued interest\tAutomated load (mapping sheet)\nNB_DEPOSIT_ADJ_<YYYYMMDD>_<run>.txt\tDeposits\tAdjust balance\tDeposits – Deposit balances and accruals\tAdjust expected principal (already funded)\tAutomated load (mapping sheet)'),
  ('00000000-0000-4000-a00f-000000000005',
   E'NB_LOAN_<YYYYMMDD>_<run>.txt\tLending\tCreate / takeover\tLending takeover arrangement\tAutomated load (mapping sheet)',
   E'NB_LOAN_<YYYYMMDD>_<run>.txt\tLending\tCreate / takeover\tLending – Loan arrangement\tTakeover arrangement\tAutomated load (mapping sheet)'),
  ('00000000-0000-4000-a00f-000000000006',
   E'NB_LOAN_BAL_<YYYYMMDD>_<run>.txt\tLending\tCapture balances\tCapture principal and accruals\tAutomated load (mapping sheet)\nNB_LOAN_COMMIT_<YYYYMMDD>_<run>.txt\tLending\tAdjust balance\tAdjust outstanding commitment\tAutomated load (mapping sheet)\nNB_LOAN_BILLS_<YYYYMMDD>_<run>.txt\tLending\tCapture bills\tCapture overdue and due bills with ageing\tAutomated load (mapping sheet)\nNB_LOAN_FEES_<YYYYMMDD>_<run>.xlsx\tLending\tCapture bills\tCapture unamortised fees\tStandard upload utility',
   E'NB_LOAN_BAL_<YYYYMMDD>_<run>.txt\tLending\tCapture balances\tLending – Loan balances and accruals\tCapture principal and accruals\tAutomated load (mapping sheet)\nNB_LOAN_COMMIT_<YYYYMMDD>_<run>.txt\tLending\tAdjust balance\tLending – Loan commitment\tAdjust outstanding commitment\tAutomated load (mapping sheet)\nNB_LOAN_BILLS_<YYYYMMDD>_<run>.txt\tLending\tCapture bills\tLending – Loan bills\tCapture overdue and due bills with ageing\tAutomated load (mapping sheet)\nNB_LOAN_FEES_<YYYYMMDD>_<run>.xlsx\tLending\tCapture bills\tLending – Loan bills\tCapture unamortised fees\tStandard upload utility'),
  ('00000000-0000-4000-a00f-000000000007',
   E'NB_LIMIT_<YYYYMMDD>_<run>.txt\tLimits\tCreate / takeover\tLimit (bulk load)\tAutomated load (mapping sheet)',
   E'NB_LIMIT_<YYYYMMDD>_<run>.txt\tLimits\tCreate / takeover\tLimits – Limits\tBulk load\tAutomated load (mapping sheet)'),
  ('00000000-0000-4000-a00f-000000000008',
   E'NB_COLLATERAL_RIGHT_<YYYYMMDD>_<run>.txt\tCollateral\tCreate / takeover\tCollateral right\tAutomated load (mapping sheet)\nNB_COLLATERAL_<YYYYMMDD>_<run>.txt\tCollateral\tCreate / takeover\tCollateral item\tAutomated load (mapping sheet)',
   E'NB_COLLATERAL_RIGHT_<YYYYMMDD>_<run>.txt\tCollateral\tCreate / takeover\tCollateral – Collateral rights\tBulk load\tAutomated load (mapping sheet)\nNB_COLLATERAL_<YYYYMMDD>_<run>.txt\tCollateral\tCreate / takeover\tCollateral – Collateral items\tBulk load\tAutomated load (mapping sheet)'),
  ('00000000-0000-4000-a00f-000000000009',
   E'NB_LC_<YYYYMMDD>_<run>.txt\tTrade Finance\tCreate / takeover\tLetters of credit\tAutomated load (mapping sheet)\nNB_LC_DRAWING_<YYYYMMDD>_<run>.txt\tTrade Finance\tCreate / takeover\tDrawings\tAutomated load (mapping sheet)\nNB_GUARANTEE_<YYYYMMDD>_<run>.txt\tTrade Finance\tCreate / takeover\tGuarantees\tAutomated load (mapping sheet)\nNB_BILLS_<YYYYMMDD>_<run>.txt\tTrade Finance\tCreate / takeover\tBills\tAutomated load (mapping sheet)',
   E'NB_LC_<YYYYMMDD>_<run>.txt\tTrade Finance\tCreate / takeover\tTrade Finance – Letters of credit\tBulk load\tAutomated load (mapping sheet)\nNB_LC_DRAWING_<YYYYMMDD>_<run>.txt\tTrade Finance\tCreate / takeover\tTrade Finance – Drawings\tBulk load\tAutomated load (mapping sheet)\nNB_GUARANTEE_<YYYYMMDD>_<run>.txt\tTrade Finance\tCreate / takeover\tTrade Finance – Guarantees\tBulk load\tAutomated load (mapping sheet)\nNB_BILLS_<YYYYMMDD>_<run>.txt\tTrade Finance\tCreate / takeover\tTrade Finance – Bills\tBulk load\tAutomated load (mapping sheet)'),
  ('00000000-0000-4000-a00f-00000000000a',
   E'NB_GL_BAL_<YYYYMMDD>_<run>.xlsx\tGeneral Ledger\tJournal / data capture\tJournal capture (balanced)\tJournal / data capture',
   E'NB_GL_BAL_<YYYYMMDD>_<run>.xlsx\tGeneral Ledger\tJournal / data capture\tGeneral Ledger – Journal entries\tBalanced journal capture\tJournal / data capture')
) AS v(id, old_steps, new_steps)
WHERE r.id = v.id::uuid AND r.is_deleted = FALSE AND r.field_values ->> 'load_steps' = v.old_steps;

-- Every other row still in the 5-column layout: empty Target Table inserted before Activity.
UPDATE public.local_register_records r
SET field_values = jsonb_set(r.field_values, '{load_steps}', to_jsonb((
      SELECT string_agg(
               CASE WHEN array_length(string_to_array(line, E'\t'), 1) = 5
                    THEN array_to_string((string_to_array(line, E'\t'))[1:3] || ARRAY['']::text[] || (string_to_array(line, E'\t'))[4:5], E'\t')
                    ELSE line END,
               E'\n' ORDER BY n)
      FROM unnest(string_to_array(r.field_values ->> 'load_steps', E'\n')) WITH ORDINALITY AS t(line, n)
    ))),
    updated_at = NOW()
WHERE r.register_id = '00000000-0000-4000-9001-00000000000f'::uuid
  AND COALESCE(r.field_values ->> 'load_steps', '') <> ''
  AND EXISTS (SELECT 1 FROM unnest(string_to_array(r.field_values ->> 'load_steps', E'\n')) line
              WHERE array_length(string_to_array(line, E'\t'), 1) = 5);

-- Check: columns, list size, and rows per sample sheet.
SELECT (SELECT jsonb_agg(c ->> 'label') FROM jsonb_array_elements(dropdown_options) c) AS columns,
       (SELECT jsonb_array_length(c -> 'options') FROM jsonb_array_elements(dropdown_options) c WHERE c ->> 'value' = 'target_table') AS target_tables
FROM public.local_register_fields
WHERE register_id = '00000000-0000-4000-9001-00000000000f'::uuid AND field_key = 'load_steps';
