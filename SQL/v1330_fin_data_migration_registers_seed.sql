-- ============================================================================
-- v1330: Seed / sample data — Data Migration registers (FIN pack), 10 records each
-- ============================================================================
-- Owner request 2026-10-24 (with v1329): sample data for the Data Migration registers of project
-- SEED334-PRJ-08, based on "Documents/Data Migration Sample v1.docx" plus best practice:
-- Source Systems, Data Mapping, Data Cleansing, Data Transformation, Migration Rules, Mock
-- Migrations, Reconciliations, Migration Defects and Migration Sign-Off (90 records).
--
-- These registers have no form fields yet apart from Mock Round (Mock Migrations) and
-- Reconciliation Type (Reconciliations), so the detail is in each record's description.
-- Same scenario and conventions as v1306/v1310/v1329 (fictional "Northbridge Bank", no vendor
-- names — rule 26; project resolved by project_code; display_id = '' for Admin ID Generation;
-- fixed hex-only UUIDs …-4000-a00e-… to …-4000-a016-…; ON CONFLICT (id) DO NOTHING).
-- Timeline: Mock 1 run 12–13 Sep 2026 (overran by 9 hours, rerun 3–4 Oct); Mock 2 static data
-- running 24–25 Oct 2026; later runs planned. Prerequisites: v947.
-- ============================================================================

WITH proj AS (
  SELECT id, account_id FROM public.projects WHERE project_code = 'SEED334-PRJ-08' LIMIT 1
)
INSERT INTO public.local_register_records
  (id, register_id, display_id, title, description, status, field_values, account_id, project_id, record_project_id)
SELECT v.id::uuid, v.register_id::uuid, '', v.title, v.description, v.status, v.field_values::jsonb,
       p.account_id, p.id, p.id
FROM (VALUES

  -- ══ Source Systems (…9001-…00e) — identified / connected / extracted ═════════════════
  ('00000000-0000-4000-a00e-000000000001', '00000000-0000-4000-9001-00000000000e',
   'Legacy core banking – Instance 1 (retail and SME)', 'Main source for customers, current and savings accounts, deposits, retail loans, limits, collateral, cards and standing orders. Owner: Amina Diallo. Full extract 420 GB; extracts taken after the final close of business.', 'extracted', '{}'),
  ('00000000-0000-4000-a00e-000000000002', '00000000-0000-4000-9001-00000000000e',
   'Legacy core banking – Instance 2 (corporate and treasury)', 'Source for corporate customers and accounts, corporate lending, trade finance (LCs, drawings, guarantees, bills), FX, money market and securities. Owner: Ahmed Hassan. Full extract 160 GB.', 'extracted', '{}'),
  ('00000000-0000-4000-a00e-000000000003', '00000000-0000-4000-9001-00000000000e',
   'Document imaging system', 'Customer images, signatures and mandates (2.8 million images, about 1.9 TB). Reference data extracted; image transfer method depends on the storage decision. Owner: Brian Otieno.', 'connected', '{}'),
  ('00000000-0000-4000-a00e-000000000004', '00000000-0000-4000-9001-00000000000e',
   'Card management platform', 'Cross-check of card status and expiry so that only active cards are migrated. Read-only extract of card status. Owner: Ravi Pillai.', 'connected', '{}'),
  ('00000000-0000-4000-a00e-000000000005', '00000000-0000-4000-9001-00000000000e',
   'Finance and general ledger system', 'Trial balance control totals per GL line, currency and company used to fund take-over accounts and reconcile balances. Owner: Olivia Banda.', 'extracted', '{}'),
  ('00000000-0000-4000-a00e-000000000006', '00000000-0000-4000-9001-00000000000e',
   'Treasury dealing system', 'Confirmation of open FX and money market deals against the core. Deals themselves migrate from Instance 2; this source is used for reconciliation only. Owner: Linda Zhou.', 'connected', '{}'),
  ('00000000-0000-4000-a00e-000000000007', '00000000-0000-4000-9001-00000000000e',
   'Customer due diligence (KYC) repository', 'KYC completeness used to choose the surviving record when one customer has several customer numbers. Owner: Nadia Rahman.', 'connected', '{}'),
  ('00000000-0000-4000-a00e-000000000008', '00000000-0000-4000-9001-00000000000e',
   'Digital banking user store', 'Internet and mobile banking user registrations linked to customer numbers; remapped where customer numbers change. Owner: Ravi Pillai.', 'identified', '{}'),
  ('00000000-0000-4000-a00e-000000000009', '00000000-0000-4000-9001-00000000000e',
   'Identity and access management directory', 'Bank user profiles and user groups for the core; access recertified by line managers before go-live. Owner: Nadia Rahman.', 'identified', '{}'),
  ('00000000-0000-4000-a00e-00000000000a', '00000000-0000-4000-9001-00000000000e',
   'Custom tables (bank-defined)', 'Bank-defined custom tables and templates in both instances. Data presence and record counts under analysis before the approach is decided. Owner: Priya Naidoo.', 'identified', '{}'),

  -- ══ Data Mapping (…9001-…00f) — draft / reviewed / approved ════════════════════════
  ('00000000-0000-4000-a00f-000000000001', '00000000-0000-4000-9001-00000000000f',
   'Customer mapping sheet (DMS-CUS-01)', 'Source-to-target mapping for customers from both instances: 8-digit numbering, duplicate merge rules, mandatory industry, sector, status, account officer, target, nationality and residence. Signed off after Mock 1.', 'approved', '{}'),
  ('00000000-0000-4000-a00f-000000000002', '00000000-0000-4000-9001-00000000000f',
   'Customer account mapping sheet (DMS-ACC-01)', 'Take-over arrangement for current and savings accounts (customer, product, currency, account conditions) and capture balances activity for balances and accruals. Instance 2 numbers become alternate keys.', 'approved', '{}'),
  ('00000000-0000-4000-a00f-000000000003', '00000000-0000-4000-9001-00000000000f',
   'Deposit take-over arrangement (DMS-DEP-01)', 'Deposit arrangement load: customer, product, account limit and amount; legacy deposit reference mapped as the alternate account ID.', 'reviewed', '{}'),
  ('00000000-0000-4000-a00f-000000000004', '00000000-0000-4000-9001-00000000000f',
   'Deposit balances, principal adjustment and accruals (DMS-DEP-02/03)', 'Capture balances, adjust expected principal and capture current accruals with value date = migration date. Multi-value and sub-value fields documented in detail.', 'reviewed', '{}'),
  ('00000000-0000-4000-a00f-000000000005', '00000000-0000-4000-9001-00000000000f',
   'Lending take-over arrangement (DMS-LND-01)', 'Loan arrangement load: customer number, product code, product limit and commitment amount; payment schedule regenerated from migrated frequency.', 'reviewed', '{}'),
  ('00000000-0000-4000-a00f-000000000006', '00000000-0000-4000-9001-00000000000f',
   'Lending balances, commitment adjustment and bills (DMS-LND-02/03/04)', 'Capture current balance, adjust outstanding commitment, capture accruals and capture overdue and due bills with original due dates and ageing.', 'draft', '{}'),
  ('00000000-0000-4000-a00f-000000000007', '00000000-0000-4000-9001-00000000000f',
   'Limits mapping sheet (DMS-LIM-01)', 'Limits with original sanctioned amounts, global limits for multi-purpose lines, new ID format and the expired-limit rule (expiry + 1 day, original kept in a local field).', 'approved', '{}'),
  ('00000000-0000-4000-a00f-000000000008', '00000000-0000-4000-9001-00000000000f',
   'Collateral right and collateral mapping (DMS-COL-01/02)', 'Collateral rights (customer.serial) loaded before collateral items (customer.serial.serial); links to limits and contracts.', 'approved', '{}'),
  ('00000000-0000-4000-a00f-000000000009', '00000000-0000-4000-9001-00000000000f',
   'Trade finance mapping (DMS-TF-01 to 04)', 'Letters of credit (net outstanding amount, original amount in a local field), drawings (payment method internal account), guarantees and bills.', 'draft', '{}'),
  ('00000000-0000-4000-a00f-00000000000a', '00000000-0000-4000-9001-00000000000f',
   'GL balances journal capture (DMS-GL-01)', 'Balanced journal capture that funds take-over accounts per product, currency and company from the legacy trial balance, with differences to account 14918.', 'reviewed', '{}'),

  -- ══ Data Cleansing (…9001-…010) — not started / in progress / complete ═════════════
  ('00000000-0000-4000-a010-000000000001', '00000000-0000-4000-9001-000000000010',
   'Duplicate customers across the two instances', 'De-duplication run found 23,400 customers held in both instances and 4,150 customers with several numbers in one instance. Survivor = record with the most complete KYC data; old numbers kept as alternate keys. 96% resolved.', 'in_progress', '{}'),
  ('00000000-0000-4000-a010-000000000002', '00000000-0000-4000-9001-000000000010',
   'Customer address completeness', 'Address completeness at 82% against an 85% target (Mock 1). Branch cleansing sprint with weekly progress reports to the business data owner.', 'in_progress', '{}'),
  ('00000000-0000-4000-a010-000000000003', '00000000-0000-4000-9001-000000000010',
   'Mandatory customer fields', 'Industry, sector, customer status, account officer, target market, nationality and residence must be filled before load. 61,200 records corrected at source.', 'complete', '{}'),
  ('00000000-0000-4000-a010-000000000004', '00000000-0000-4000-9001-000000000010',
   'Accounts dormant for more than 5 years', 'Accounts dormant for more than 5 years to be closed before migration, with unclaimed balances transferred per regulation. 18,700 accounts identified; operations to process in November.', 'not_started', '{}'),
  ('00000000-0000-4000-a010-000000000005', '00000000-0000-4000-9001-000000000010',
   'Matured deposits still carrying balances', 'Matured deposits with balances cannot be migrated as running deposits. 1,320 deposits to be paid out or rolled over before the freeze.', 'in_progress', '{}'),
  ('00000000-0000-4000-a010-000000000006', '00000000-0000-4000-9001-000000000010',
   'Multiple repayment accounts per customer', 'Target allows one liquidation account per customer per currency. 8,900 loans remapped to the customer primary account after customer consent checks.', 'complete', '{}'),
  ('00000000-0000-4000-a010-000000000007', '00000000-0000-4000-9001-000000000010',
   'Invalid bank identifier codes', 'Bank identifier codes on delivery addresses checked against the current directory; 340 outdated codes replaced.', 'complete', '{}'),
  ('00000000-0000-4000-a010-000000000008', '00000000-0000-4000-9001-000000000010',
   'Accounts marked for closure without balance', 'Accounts marked for closure with zero balance are excluded; remaining 2,450 closed in legacy before the freeze.', 'in_progress', '{}'),
  ('00000000-0000-4000-a010-000000000009', '00000000-0000-4000-9001-000000000010',
   'Missing KYC documents for active customers', 'Active customers with expired identity documents or missing proof of address flagged for remediation; migration not blocked but flagged in the target.', 'in_progress', '{}'),
  ('00000000-0000-4000-a010-00000000000a', '00000000-0000-4000-9001-000000000010',
   'Expired limits linked to running contracts', 'Expired limits still referenced by contracts: renew or apply the migration rule (expiry + 1 day). 2,180 limits reviewed by credit.', 'not_started', '{}'),

  -- ══ Data Transformation (…9001-…011) — not started / in progress / complete ════════
  ('00000000-0000-4000-a011-000000000001', '00000000-0000-4000-9001-000000000011',
   'Customer numbering to 8 digits', 'Instance 1 numbers kept where unique; clashes and Instance 2 customers given new 8-digit numbers; old numbers stored as alternate keys.', 'complete', '{}'),
  ('00000000-0000-4000-a011-000000000002', '00000000-0000-4000-9001-000000000011',
   'Instance 2 account numbers to 10-digit standard', 'New 10-digit account numbers to the group standard with check digit; Instance 2 numbers kept as alternate keys for channels and statements.', 'complete', '{}'),
  ('00000000-0000-4000-a011-000000000003', '00000000-0000-4000-9001-000000000011',
   'Legacy product codes to target products', 'Legacy account, deposit and loan product codes mapped to target product groups and products (e.g. three legacy current accounts to one).', 'in_progress', '{}'),
  ('00000000-0000-4000-a011-000000000004', '00000000-0000-4000-9001-000000000011',
   'Posting restriction codes', 'Legacy posting restriction codes mapped to target restriction codes with narratives carried over; code 90 kept where balances exist.', 'complete', '{}'),
  ('00000000-0000-4000-a011-000000000005', '00000000-0000-4000-9001-000000000011',
   'Accrual value dates to migration date', 'Accrued interest, charges and taxes migrated as at the cut-off with value date set to the migration date to prevent double accrual.', 'in_progress', '{}'),
  ('00000000-0000-4000-a011-000000000006', '00000000-0000-4000-9001-000000000011',
   'Past dues to bills with ageing', 'Legacy past-due records converted to bills with the past-due date as the bill date so target ageing continues from the same point.', 'in_progress', '{}'),
  ('00000000-0000-4000-a011-000000000007', '00000000-0000-4000-9001-000000000011',
   'Limit identifiers to new format', 'Limit IDs converted to the target customer.reference.serial format; legacy IDs kept as alternate keys.', 'complete', '{}'),
  ('00000000-0000-4000-a011-000000000008', '00000000-0000-4000-9001-000000000011',
   'Statement frequency remapping', 'Non-default statement frequencies mapped to the new account numbers for Instance 2 accounts.', 'not_started', '{}'),
  ('00000000-0000-4000-a011-000000000009', '00000000-0000-4000-9001-000000000011',
   'Extract file layout standard', 'All extracts converted to plain text, one record per line, pipe field separator, double-colon multi-values and double-exclamation sub-values; dates YYYYMMDD.', 'complete', '{}'),
  ('00000000-0000-4000-a011-00000000000a', '00000000-0000-4000-9001-000000000011',
   'Currency and branch code harmonisation', 'Branch (company) and currency codes of both instances harmonised to the target static data before the static window.', 'in_progress', '{}'),

  -- ══ Migration Rules (…9001-…012) — draft / approved ════════════════════════════════
  ('00000000-0000-4000-a012-000000000001', '00000000-0000-4000-9001-000000000012',
   'Data freeze from the final legacy close of business', 'After the final legacy close of business no financial or non-financial transactions are accepted in the source, and no new data enters the target until migration and reconciliation are complete.', 'approved', '{}'),
  ('00000000-0000-4000-a012-000000000002', '00000000-0000-4000-9001-000000000012',
   'No account closures in the week before go-live', 'No accounts may be closed in the week before go-live, so no account is marked for closure on the migration date.', 'approved', '{}'),
  ('00000000-0000-4000-a012-000000000003', '00000000-0000-4000-9001-000000000012',
   'Legacy references kept as alternate keys', 'Every migrated record keeps its legacy reference as an alternate key, used to link subsequent loads and for audit.', 'approved', '{}'),
  ('00000000-0000-4000-a012-000000000004', '00000000-0000-4000-9001-000000000012',
   'Accrued interest value-dated to the migration date', 'Accrued amounts are migrated as at the cut-off and value-dated to the migration date to avoid double accrual.', 'approved', '{}'),
  ('00000000-0000-4000-a012-000000000005', '00000000-0000-4000-9001-000000000012',
   'Expired limits and guarantees', 'Expired limits are loaded with expiry = migration date + 1 day and expired guarantees with expiry = migration date; both expire again at the first close of business. Original dates kept in local fields.', 'approved', '{}'),
  ('00000000-0000-4000-a012-000000000006', '00000000-0000-4000-9001-000000000012',
   'Matured deposits with balances not migrated', 'Matured deposits still holding balances are not migrated unless their maturity date is moved to the migration date.', 'approved', '{}'),
  ('00000000-0000-4000-a012-000000000007', '00000000-0000-4000-9001-000000000012',
   'Cards expiring on or before the migration date excluded', 'Only active cards with expiry after the migration date are migrated.', 'approved', '{}'),
  ('00000000-0000-4000-a012-000000000008', '00000000-0000-4000-9001-000000000012',
   'FX split contracts', 'Split FX contracts are migrated only when both legs are unmatured; value dates as in the legacy system.', 'approved', '{}'),
  ('00000000-0000-4000-a012-000000000009', '00000000-0000-4000-9001-000000000012',
   'Each load authorised before the next', 'The load from each step is checked and authorised before the next step starts; a 100% successful load rate is required to proceed.', 'approved', '{}'),
  ('00000000-0000-4000-a012-00000000000a', '00000000-0000-4000-9001-000000000012',
   'Outgoing messages suppressed during the load', 'SWIFT and customer advices are suppressed for the whole load and re-enabled after reconciliation, before the first close of business.', 'draft', '{}'),

  -- ══ Mock Migrations (…9001-…013) — planned / in progress / complete; Mock Round ════
  ('00000000-0000-4000-a013-000000000001', '00000000-0000-4000-9001-000000000013',
   'Mock 1 – static data (12 Sep 2026)', 'Static and reference data plus customers from both instances into SIT. 1.39 million customers loaded (99.3%); load time 19 hours against 10 planned.', 'complete', '{"mock_round":"mock_1"}'),
  ('00000000-0000-4000-a013-000000000002', '00000000-0000-4000-9001-000000000013',
   'Mock 1 – financial data (13 Sep 2026)', 'Accounts, deposits, loans and GL balances into SIT. Overran the window by 9 hours; take-over accounts left with 0.4% unexplained difference.', 'complete', '{"mock_round":"mock_1"}'),
  ('00000000-0000-4000-a013-000000000003', '00000000-0000-4000-9001-000000000013',
   'Mock 1 rerun – customers and accounts (3–4 Oct 2026)', 'Rerun after tuning parallel load agents: customers and accounts loaded in 7 hours 40 minutes; 99.8% success.', 'complete', '{"mock_round":"mock_1"}'),
  ('00000000-0000-4000-a013-000000000004', '00000000-0000-4000-9001-000000000013',
   'Mock 2 – static data (24–25 Oct 2026)', 'Full static data, customers, limits and collateral into SIT with business verification in UAT. Running now.', 'in_progress', '{"mock_round":"mock_2"}'),
  ('00000000-0000-4000-a013-000000000005', '00000000-0000-4000-9001-000000000013',
   'Mock 2 – financial data (14–15 Nov 2026)', 'All financial data including trade finance and treasury, with full reconciliation and a zero-difference target.', 'planned', '{"mock_round":"mock_2"}'),
  ('00000000-0000-4000-a013-000000000006', '00000000-0000-4000-9001-000000000013',
   'Mock 3 – full scope, production volumes (16–17 Jan 2027)', 'Full scope in pre-production with production-sized data to confirm timings for the go-live plan.', 'planned', '{}'),
  ('00000000-0000-4000-a013-000000000007', '00000000-0000-4000-9001-000000000013',
   'Dress rehearsal 1 – static window (13 Feb 2027)', 'Timed rehearsal of the first migration window following the cutover runbook.', 'planned', '{"mock_round":"dress_rehearsal"}'),
  ('00000000-0000-4000-a013-000000000008', '00000000-0000-4000-9001-000000000013',
   'Dress rehearsal 2 – financial window (6 Mar 2027)', 'Timed rehearsal of the go-live weekend financial load with finance reconciliation and go/no-go points.', 'planned', '{"mock_round":"dress_rehearsal"}'),
  ('00000000-0000-4000-a013-000000000009', '00000000-0000-4000-9001-000000000013',
   'Dress rehearsal 3 – final timed rehearsal (20 Mar 2027)', 'End-to-end rehearsal with business sign-off; last chance to change the runbook.', 'planned', '{"mock_round":"dress_rehearsal"}'),
  ('00000000-0000-4000-a013-00000000000a', '00000000-0000-4000-9001-000000000013',
   'Final migration – go-live weekend (9–12 Apr 2027)', 'Window 1 static data two weeks earlier (26 Mar 2027); window 2 financial data over the go-live weekend.', 'planned', '{"mock_round":"final_migration"}'),

  -- ══ Reconciliations (…9001-…014) — open / reconciled / exception; Reconciliation Type
  ('00000000-0000-4000-a014-000000000001', '00000000-0000-4000-9001-000000000014',
   'Mock 1 – customer record counts', 'Source 1,401,880 customers after de-duplication; loaded 1,392,070; 9,810 rejected (missing mandatory fields). Rejections fixed at source.', 'reconciled', '{"reconciliation_type":"record_counts"}'),
  ('00000000-0000-4000-a014-000000000002', '00000000-0000-4000-9001-000000000014',
   'Mock 1 – account record counts', 'Source 2,148,300 accounts; loaded 2,147,950; 350 rejected (closed product codes).', 'reconciled', '{"reconciliation_type":"account"}'),
  ('00000000-0000-4000-a014-000000000003', '00000000-0000-4000-9001-000000000014',
   'Mock 1 – take-over accounts at zero', 'Take-over accounts did not return to zero: 0.4% difference on deposits caused by accruals loaded twice. Fix in transformation; retest in Mock 2.', 'exception', '{"reconciliation_type":"financial"}'),
  ('00000000-0000-4000-a014-000000000004', '00000000-0000-4000-9001-000000000014',
   'Mock 1 – trial balance comparison', 'GL lines and currencies compared with the legacy trial balance; three lines out of balance linked to the deposit accrual issue.', 'exception', '{"reconciliation_type":"financial"}'),
  ('00000000-0000-4000-a014-000000000005', '00000000-0000-4000-9001-000000000014',
   'Mock 1 rerun – customer sample check', '200 customers verified field by field by branch staff; 3 address formatting differences fixed in the mapping.', 'reconciled', '{"reconciliation_type":"customer"}'),
  ('00000000-0000-4000-a014-000000000006', '00000000-0000-4000-9001-000000000014',
   'Mock 2 – static data record counts', 'Customer, limit and collateral counts per instance for the run in progress.', 'open', '{"reconciliation_type":"record_counts"}'),
  ('00000000-0000-4000-a014-000000000007', '00000000-0000-4000-9001-000000000014',
   'Mock 2 – loan balances and ageing', 'Principal, overdue and accrued totals and ageing buckets per product compared with legacy.', 'open', '{"reconciliation_type":"financial"}'),
  ('00000000-0000-4000-a014-000000000008', '00000000-0000-4000-9001-000000000014',
   'Mock 2 – deposit principal and accruals', 'Deposit counts, principal and accrued interest per product and tenor; confirms the double-accrual fix.', 'open', '{"reconciliation_type":"financial"}'),
  ('00000000-0000-4000-a014-000000000009', '00000000-0000-4000-9001-000000000014',
   'Mock 2 – account balances by product and currency', 'Account balances per product and currency against the legacy trial balance, summary and detail.', 'open', '{"reconciliation_type":"account"}'),
  ('00000000-0000-4000-a014-00000000000a', '00000000-0000-4000-9001-000000000014',
   'Mock 2 – migration suspense accounts', 'Suspense categories 14901 to 14918 confirmed at zero per currency after all loads and adjusting entries.', 'open', '{"reconciliation_type":"financial"}'),

  -- ══ Migration Defects (…9001-…015) — open / in progress / resolved / closed ════════
  ('00000000-0000-4000-a015-000000000001', '00000000-0000-4000-9001-000000000015',
   'Deposit accruals loaded twice', 'Mock 1: deposit accruals captured in both the balances and the accruals step, leaving take-over accounts out by 0.4%. Fix: accruals only in the accruals step. Severity high.', 'resolved', '{}'),
  ('00000000-0000-4000-a015-000000000002', '00000000-0000-4000-9001-000000000015',
   'Customer load rejected for missing sector', 'Mock 1: 9,810 customers rejected because sector or industry was blank. Corrected at source and default rule agreed with compliance. Severity high.', 'closed', '{}'),
  ('00000000-0000-4000-a015-000000000003', '00000000-0000-4000-9001-000000000015',
   'Financial load overran the window by 9 hours', 'Mock 1: single-threaded loads. Parallel load agents increased from 8 to 24; rerun completed within plan. Severity critical.', 'resolved', '{}'),
  ('00000000-0000-4000-a015-000000000004', '00000000-0000-4000-9001-000000000015',
   'Closed product codes rejected on accounts', 'Mock 1: 350 accounts on retired product codes rejected; mapping added to the product code transformation. Severity medium.', 'closed', '{}'),
  ('00000000-0000-4000-a015-000000000005', '00000000-0000-4000-9001-000000000015',
   'Address line truncated at 35 characters', 'Mock 1 rerun sample check: long address lines cut off. Split rule into two lines added to the customer mapping. Severity low.', 'resolved', '{}'),
  ('00000000-0000-4000-a015-000000000006', '00000000-0000-4000-9001-000000000015',
   'Overdue bills lose original due date', 'Loan bills loaded with the migration date as due date, resetting ageing. Mapping corrected; retest in Mock 2. Severity high.', 'in_progress', '{}'),
  ('00000000-0000-4000-a015-000000000007', '00000000-0000-4000-9001-000000000015',
   'Standing orders with next run before migration date', 'Standing orders whose next execution date fell before the migration date failed validation. Rule: recalculate the next date. Severity medium.', 'in_progress', '{}'),
  ('00000000-0000-4000-a015-000000000008', '00000000-0000-4000-9001-000000000015',
   'Collateral loaded before collateral rights', 'Load sequence error in the runbook caused 1,200 collateral rejections. Runbook sequence corrected. Severity medium.', 'resolved', '{}'),
  ('00000000-0000-4000-a015-000000000009', '00000000-0000-4000-9001-000000000015',
   'Image references point to missing files', 'Reference extract found 14,300 image references with no file in storage. Investigation with the imaging team. Severity medium.', 'open', '{}'),
  ('00000000-0000-4000-a015-00000000000a', '00000000-0000-4000-9001-000000000015',
   'Advices not suppressed during the load', 'Customer advices generated during the Mock 2 static load in SIT (no customers affected). Suppression step added to the pre-migration checklist. Severity high.', 'open', '{}'),

  -- ══ Migration Sign-Off (…9001-…016) — pending / signed off ════════════════════════
  ('00000000-0000-4000-a016-000000000001', '00000000-0000-4000-9001-000000000016',
   'Data Migration Strategy baseline (v1.0)', 'Sign-off of the strategy as the baseline for the migration build phase. Approvers: Grace Moyo, Daniel Okafor, Olivia Banda, Amina Diallo.', 'pending', '{}'),
  ('00000000-0000-4000-a016-000000000002', '00000000-0000-4000-9001-000000000016',
   'Mock 1 – customer and static data', 'Hand-off and sign-off form for Mock 1 static data after the rerun; signed by Amina Diallo (business data owner) on 10 Oct 2026.', 'signed_off', '{}'),
  ('00000000-0000-4000-a016-000000000003', '00000000-0000-4000-9001-000000000016',
   'Mock 1 – financial data', 'Sign-off withheld: take-over accounts not at zero. Will be closed by the Mock 2 financial reconciliation.', 'pending', '{}'),
  ('00000000-0000-4000-a016-000000000004', '00000000-0000-4000-9001-000000000016',
   'Customer data – Head of Retail', 'Departmental head sign-off for customer data quality and completeness (Nomvula Khumalo).', 'pending', '{}'),
  ('00000000-0000-4000-a016-000000000005', '00000000-0000-4000-9001-000000000016',
   'Accounts and deposits – product owners', 'Product owner sign-off of account and deposit balances by product and currency (Nomvula Khumalo, Catherine Mwangi).', 'pending', '{}'),
  ('00000000-0000-4000-a016-000000000006', '00000000-0000-4000-9001-000000000016',
   'Loans, limits and collateral – credit', 'Credit sign-off for loan balances, ageing, limits and collateral (Joy Akinyi).', 'pending', '{}'),
  ('00000000-0000-4000-a016-000000000007', '00000000-0000-4000-9001-000000000016',
   'General ledger and migration accounting – finance', 'Financial controller sign-off: take-over and suspense accounts at zero, trial balance agreed (Olivia Banda).', 'pending', '{}'),
  ('00000000-0000-4000-a016-000000000008', '00000000-0000-4000-9001-000000000016',
   'Trade finance and treasury', 'Sign-off of LCs, drawings, guarantees, bills, FX and money market deals (Ahmed Hassan, Linda Zhou).', 'pending', '{}'),
  ('00000000-0000-4000-a016-000000000009', '00000000-0000-4000-9001-000000000016',
   'Users and access rights – information security', 'Recertified user profiles and user groups migrated correctly (Nadia Rahman).', 'pending', '{}'),
  ('00000000-0000-4000-a016-00000000000a', '00000000-0000-4000-9001-000000000016',
   'Internal audit assurance', 'Independent review of migration controls, reconciliation evidence and sign-offs before the go/no-go decision.', 'pending', '{}')

) AS v(id, register_id, title, description, status, field_values)
CROSS JOIN proj p
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  v_project UUID;
  v_rows INT;
BEGIN
  SELECT id INTO v_project FROM public.projects WHERE project_code = 'SEED334-PRJ-08' LIMIT 1;
  IF v_project IS NULL THEN
    RAISE NOTICE 'v1330: project SEED334-PRJ-08 not found — no seed rows inserted';
    RETURN;
  END IF;
  SELECT COUNT(*) INTO v_rows FROM public.local_register_records
  WHERE id::text ~ '^00000000-0000-4000-a0(0e|0f|10|11|12|13|14|15|16)-' AND record_project_id = v_project;
  RAISE NOTICE 'v1330: % Data Migration register seed records on SEED334-PRJ-08 (expected 90)', v_rows;
END $$;
