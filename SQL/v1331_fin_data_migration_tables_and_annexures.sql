-- ============================================================================
-- v1331: Data Migration Strategy — tabular fields + annexures for the sample's diagrams
-- ============================================================================
-- Owner requests 2026-10-24:
--   (a) "Make sure these sections are in a tabular format" (Glossary, Risks, Roles &
--       Responsibilities, Environment Management) and display other "A – B – C" fields as tables;
--   (b) the sample document's diagrams and embedded appendix files were left out of v1329.
--
--   1. Migration Strategy fields that hold "A – B – C" rows become 'table' fields (v1326), with
--      named columns (Mock / Rehearsal dates use the date picker):
--        Risks, Challenges and Mitigations   Risk | Consequence | Mitigation (as in the sample)
--        Roles & Responsibilities            Role | Responsibility | Name
--        Environment Management              Environment | Purpose
--        Migration Accounting Entries        Entry | Debit | Credit | Narrative
--        Estimated Record Volumes            Data Object | Records
--        Estimated Data Volumes              Source / Data Object | Volume (GB)
--        Mock Migrations Planned             Mock | Date | Scope
--        Dress Rehearsals Planned            Rehearsal | Date | Scope
--        Holding / Suspense Accounts         Category | Purpose
--      Data Scope "Accounting Entries" becomes Debit | Credit | Narrative.
--      Values saved as "A – B – C" lines are read as rows without conversion (v1326).
--   2. The v1329 sample records are rewritten as table rows (risks gain the sample's
--      Consequences column), and the strategy now points to four annexures:
--        Annexure A – Cutover big bang approach (diagram)
--        Annexure B – Cutover phased approach (diagram, recommended)
--        Annexure C – Data hand-off control form (Word, sample Appendix 2)
--        Annexure D – Data migration RACI matrix (Excel, sample Appendix 4)
--      The files are in "Design Images/Data Migration Strategy Annexures/" (redrawn without vendor
--      names, rule 26). Attachments live in Supabase Storage, which SQL cannot fill: upload them on
--      the record's Attachments tab (titles as above) and they appear as Annexures A–D in the
--      Word/PDF document.
-- Only records not locked for sign-off are updated. Prerequisites: v1316, v1317, v1325, v1326,
-- v1329. Idempotent.
-- ============================================================================

-- ── 1. Field types and columns ────────────────────────────────────────────────────────
UPDATE public.local_register_fields f
SET field_type = 'table',
    field_label = v.field_label,
    dropdown_options = v.columns::jsonb,
    updated_at = NOW()
FROM (VALUES
  ('00000000-0000-4000-9001-00000000000c', 'risks_mitigations', 'Risks, Challenges and Mitigations',
    '[{"value":"risk","label":"Risk"},{"value":"consequence","label":"Consequence"},{"value":"mitigation","label":"Mitigation"}]'),
  ('00000000-0000-4000-9001-00000000000c', 'roles_responsibilities', 'Roles & Responsibilities',
    '[{"value":"role","label":"Role"},{"value":"responsibility","label":"Responsibility"},{"value":"name","label":"Name"}]'),
  ('00000000-0000-4000-9001-00000000000c', 'environment_management', 'Environment Management',
    '[{"value":"environment","label":"Environment"},{"value":"purpose","label":"Purpose"}]'),
  ('00000000-0000-4000-9001-00000000000c', 'migration_accounting_entries', 'Migration Accounting Entries',
    '[{"value":"entry","label":"Entry"},{"value":"debit","label":"Debit"},{"value":"credit","label":"Credit"},{"value":"narrative","label":"Narrative"}]'),
  ('00000000-0000-4000-9001-00000000000c', 'estimated_record_volume', 'Estimated Record Volumes',
    '[{"value":"data_object","label":"Data Object"},{"value":"records","label":"Records"}]'),
  ('00000000-0000-4000-9001-00000000000c', 'estimated_data_volume_gb', 'Estimated Data Volumes',
    '[{"value":"source","label":"Source / Data Object"},{"value":"volume_gb","label":"Volume (GB)"}]'),
  ('00000000-0000-4000-9001-00000000000c', 'mock_runs_planned', 'Mock Migrations Planned',
    '[{"value":"mock","label":"Mock"},{"value":"date","label":"Date","type":"date"},{"value":"scope","label":"Scope"}]'),
  ('00000000-0000-4000-9001-00000000000c', 'dress_rehearsals_planned', 'Dress Rehearsals Planned',
    '[{"value":"rehearsal","label":"Rehearsal"},{"value":"date","label":"Date","type":"date"},{"value":"scope","label":"Scope"}]'),
  ('00000000-0000-4000-9001-00000000000c', 'holding_account_reference', 'Holding / Suspense Accounts (if applicable)',
    '[{"value":"category","label":"Category"},{"value":"purpose","label":"Purpose"}]'),
  ('00000000-0000-4000-9001-00000000000d', 'accounting_entries', 'Accounting Entries',
    '[{"value":"debit","label":"Debit"},{"value":"credit","label":"Credit"},{"value":"narrative","label":"Narrative"}]')
) AS v(register_id, field_key, field_label, columns)
WHERE f.register_id = v.register_id::uuid
  AND f.field_key = v.field_key;

-- ── 2a. Sample strategy record: table rows ────────────────────────────────────────────
UPDATE public.local_register_records
SET field_values = field_values || '{
  "risks_mitigations":"Target environments (development, staging, testing) not available on time\tScheduled tasks delayed, impacting the project timeline\tAgree environment dates with IT and track them weekly; book pre-production for all dress rehearsals\nDelays in data verification by the business\tData loading delayed, impacting the migration timeline\tName and release verifiers for each data object and give them access to verification tools before each mock\nData verification issues\tDelays in loading, or inaccurate data loaded\tCheck and sign off all data before loading; stop the load if control totals do not match\nMigration overruns the go-live window (Mock 1 overran by 9 hours)\tGo-live delayed or fallback to the legacy systems\tTune parallel load agents, pre-load static data in window 1 and rehearse the timeline three times\nCustomer address quality below target (82% against 85%)\tFailed statements and gaps in regulatory reporting\tBusiness cleansing sprint with weekly progress against target\nUnreconciled balances at go/no-go\tGo-live decision cannot be taken; risk of financial misstatement\tZero-tolerance reconciliation with Finance present on the weekend; fallback plan ready",
  "roles_responsibilities":"Programme director\tOverall accountability and go/no-go decisions\tDaniel Okafor\nData migration lead\tStrategy, plan, runbook and load execution\tFatima Bello\nData migration consultant (partner)\tMapping, load tooling and timing\tMigration partner team\nBusiness data owner\tData cleansing, verification and product sign-off\tAmina Diallo\nFinancial controller\tControl totals, migration accounting and GL reconciliation\tOlivia Banda\nIT environments lead\tEnvironments, backups and system readiness\tKwame Asante\nTest manager\tMock migration and dress rehearsal test evidence\tMaria Fernandes\nCompliance and risk\tData protection and regulatory notification\tNadia Rahman\nInternal audit\tIndependent assurance of controls and sign-off\tInternal audit representative\nData cleansing and enrichment team\tCorrect source data before each mock\tBusiness operations\nReconciliation team\tRecord and balance reconciliation after every load\tFinance and operations",
  "environment_management":"Development\tMapping and load script build\nSystem integration test\tMock 1 and Mock 2\nUser acceptance test\tBusiness verification of Mock 2 data\nPre-production\tMock 3 and all dress rehearsals with production-sized volumes\nProduction\tFinal migration windows\nAll environments\tRefresh and turnaround times as per the Environment Management document (Appendix 3)",
  "migration_accounting_entries":"Loans – principal\tLoan account 50,000\tMigration suspense 50,000\tTake-on of current principal\nLoans – accrued interest\tLoan accrual 5,455\tP&L 5,455\tTake-on of accrued interest\nLoans – accrual adjustment\tP&L 5,455\tMigration suspense 5,455\tCancel the accrued interest balance in P&L\nLoans – overdue bills\tOverdue principal 6,000; overdue interest 260; overdue penalty interest 40\tMigration suspense 6,300\tTake-on of overdue bills\nDeposits – principal\tMigration suspense 20,000\tDeposit account 20,000\tTake-on of deposit principal\nDeposits – accrued interest\tP&L 500\tDeposit accrual 500\tTake-on of accrued deposit interest\nDeposits – accrual adjustment\tMigration suspense 500\tP&L 500\tCancel the accrued interest balance in P&L",
  "estimated_record_volume":"Customers\t1,400,000\nCustomer accounts\t2,150,000\nTerm and notice deposits\t185,000\nLoans\t240,000\nLimits\t96,000\nCollateral\t71,000\nStanding orders\t310,000\nCheque books and cheques presented\t420,000\nCustomer images and signatures\t2,800,000\nDebit cards\t1,050,000",
  "estimated_data_volume_gb":"Instance 1 extract\t420\nInstance 2 extract\t160\nImages and signatures\t1,900",
  "mock_runs_planned":"Mock 1\t2026-09-12\tStatic data and customers (both instances)\nMock 2\t2026-11-14\tStatic and financial data, full reconciliation\nMock 3\t2027-01-16\tFull scope with production-sized volumes",
  "dress_rehearsals_planned":"Dress rehearsal 1\t2027-02-13\tFull go-live timeline, static window\nDress rehearsal 2\t2027-03-06\tFull go-live timeline, financial window\nDress rehearsal 3\t2027-03-20\tFinal timed rehearsal with business sign-off",
  "holding_account_reference":"14901\tAccounts\n14902\tLoans\n14903\tDeposits\n14904\tGL account accruals\n14906\tGL loan accruals\n14907\tGL deposit accruals\n14908\tInternal accounts\n14909\tLegacy loans\n14910\tLegacy loan accruals\n14918\tTake-on differences",
  "appendices":"Appendix 1 – List of data mapping sheets (DMS)\tDM-DMS-INDEX v0.3\nAppendix 2 – Data hand-off control form\tAnnexure C (attached)\nAppendix 3 – Environment management document\tTo follow in the next draft\nAppendix 4 – RACI matrix\tAnnexure D (attached)\nAppendix 5 – Cutover timeline: big bang option\tAnnexure A (attached)\nAppendix 6 – Cutover timeline: phased option (recommended)\tAnnexure B (attached)"
}'::jsonb,
    updated_at = NOW()
WHERE id = '00000000-0000-4000-a00c-000000000001'::uuid
  AND signoff_state = 'none';

-- ── 2b. Point the approach and notes at the diagrams (once) ──────────────────────────
UPDATE public.local_register_records
SET field_values = jsonb_set(
      jsonb_set(field_values, '{approach_description}',
        to_jsonb(COALESCE(field_values ->> 'approach_description', '') ||
          E'\n\nThe two options are illustrated in Annexure A (big bang – one cutover weekend) and Annexure B (phased – window 1 for static data, window 2 for financial data on the go-live weekend).')),
      '{notes}',
      to_jsonb(COALESCE(field_values ->> 'notes', '') ||
        E'\nAnnexures A–D (cutover diagrams, data hand-off control form, RACI matrix) are attached on the Attachments tab')),
    updated_at = NOW()
WHERE id = '00000000-0000-4000-a00c-000000000001'::uuid
  AND signoff_state = 'none'
  AND COALESCE(field_values ->> 'approach_description', '') NOT LIKE '%Annexure A%';

-- ── 2c. Data Scope accounting entries as Debit | Credit | Narrative rows ─────────────
UPDATE public.local_register_records r
SET field_values = r.field_values || jsonb_build_object('accounting_entries', v.entries),
    updated_at = NOW()
FROM (VALUES
  ('00000000-0000-4000-a00d-000000000002', E'Migration suspense (accounts)\tCustomer account\tCredit balances taken on\nCustomer account\tMigration suspense (accounts)\tDebit balances taken on'),
  ('00000000-0000-4000-a00d-000000000003', E'Migration suspense (deposits)\tDeposit\tPrincipal taken on\nP&L\tDeposit accrual\tAccrued interest taken on\nMigration suspense (deposits)\tP&L\tCancel accrued interest in P&L'),
  ('00000000-0000-4000-a00d-000000000004', E'Loan\tMigration suspense (loans)\tPrincipal taken on (e.g. 50,000)\nLoan accrual\tP&L\tAccrued interest taken on (e.g. 5,455)\nP&L\tMigration suspense (loans)\tCancel accrued interest in P&L\nOverdue principal and interest\tMigration suspense (loans)\tOverdue bills taken on'),
  ('00000000-0000-4000-a00d-000000000019', E'Take-over account\tMigration suspense\tFunding with Finance control totals\nTake-over differences (14918)\tTake-over account\tUnexplained differences, investigated before sign-off')
) AS v(id, entries)
WHERE r.id = v.id::uuid
  AND r.signoff_state = 'none';

DO $$
DECLARE
  v_tables INT;
  v_annex BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO v_tables FROM public.local_register_fields
  WHERE field_type = 'table'
    AND ((register_id = '00000000-0000-4000-9001-00000000000c'::uuid AND field_key IN ('risks_mitigations', 'roles_responsibilities', 'environment_management', 'migration_accounting_entries', 'estimated_record_volume', 'estimated_data_volume_gb', 'mock_runs_planned', 'dress_rehearsals_planned', 'holding_account_reference'))
      OR (register_id = '00000000-0000-4000-9001-00000000000d'::uuid AND field_key = 'accounting_entries'));
  SELECT COALESCE(field_values ->> 'appendices', '') LIKE '%Annexure A%' INTO v_annex
  FROM public.local_register_records WHERE id = '00000000-0000-4000-a00c-000000000001'::uuid;
  RAISE NOTICE 'v1331: % of 10 fields are now tables; sample strategy references annexures: %', v_tables, COALESCE(v_annex, FALSE);
END $$;

NOTIFY pgrst, 'reload schema';
