-- ============================================================================
-- v1329: Seed / sample data — Data Migration Strategy (every tab) + Data Scope (FIN pack)
-- ============================================================================
-- Owner request 2026-10-24: sample data for the Data Migration registers of project SEED334-PRJ-08
-- (the project selected in the header), based on "Documents/Data Migration Sample v1.docx"
-- (a data migration approach for a core banking upgrade), with best-practice values for anything
-- the sample leaves open.
--
--   * Data Migration Strategy (…9001-…00c): 1 complete document record — every tab filled
--     (Details, Executive Summary, Scope, Assumptions & Constraints, Migration Approach, Cutover &
--     Services, Data Takeover, Product Takeover, Data Quality, Migration Accounting &
--     Reconciliation, Pre & Post Migration, Risks, Roles & Environments, Glossary & Appendices,
--     Notes, Sign-Off, Document Control). Status Draft — In Review / Approved are set by sign-off.
--   * Data Scope (…9001-…00d): 30 records — one per data takeover area of the sample
--     (v1317: "one record per product or data area").
--
-- Continues the v1306/v1310 scenario (fictional "Northbridge Bank" replacing its core banking
-- platform: two legacy core instances consolidated onto one new core, Release 1 go-live weekend
-- 9–12 April 2027). The sample's vendor product, module and table names are replaced by neutral
-- terms (CLAUDE.md rule 26); the sample's bank name is not used.
--
-- Conventions (as v1306/v1310): project resolved by project_code (nothing inserted if missing);
-- display_id = '' so the Admin ID Generation trigger assigns LREG-… (rule 16.2); multi_line =
-- newline-joined string; table = one row per line, cells separated by a tab (v1326); multi_select
-- = JSON array of option keys; dropdown = option key; number/currency = JSON number; dates
-- YYYY-MM-DD. Fixed hex-only UUIDs (…-4000-a00c-… / …-4000-a00d-…) + ON CONFLICT (id) DO NOTHING.
-- Prerequisites: v947, v1316, v1317, v1321, v1325, v1326, v1327.
-- ============================================================================

WITH proj AS (
  SELECT id, account_id FROM public.projects WHERE project_code = 'SEED334-PRJ-08' LIMIT 1
)
INSERT INTO public.local_register_records
  (id, register_id, display_id, title, description, status, field_values, account_id, project_id, record_project_id)
SELECT v.id::uuid, v.register_id::uuid, '', v.title, v.description, v.status, v.field_values::jsonb,
       p.account_id, p.id, p.id
FROM (VALUES

  -- ══ Data Migration Strategy (…9001-…00c) — one complete document ════════════════════
  ('00000000-0000-4000-a00c-000000000001', '00000000-0000-4000-9001-00000000000c',
   'Data Migration Strategy – Core Banking Replacement (Release 1)',
   'How customer, account, product and financial data moves from the two legacy core instances to the new core banking platform: approach, takeover rules, quality, accounting, reconciliation and sign-off.',
   'draft',
   '{"document_reference":"DM-STR-001","document_version":"1.0","document_owner":"Fatima Bello",
     "system_category":"core_banking","migration_type":"replacement","migration_approach":"phased",
     "target_system":"New core banking platform – Release 1 (deposits, lending, payments, trade finance and treasury)",
     "target_go_live_date":"2027-04-12","next_review_date":"2026-11-30",

     "introduction":"This Data Migration Strategy has been prepared by the Data Migration workstream of the Core Banking Modernisation Programme and is an input to the detailed Data Migration Plan and cutover runbook.\n\nA significant amount of data must move from the two legacy core banking instances (Instance 1 – retail and SME, Instance 2 – corporate and treasury) to the new core banking platform. This document describes the prerequisites, the migration itself, the method to be followed and the post-migration activities.\n\nThe approach is driven by data volumes, the processing capacity of the source and target platforms within the migration window, and the complexity of mapping business rules between them. Data migration runs in parallel with design, build and testing and is managed as autonomously as possible from the main build.\n\nWhatever the approach, the same principles apply: business and technical people are involved throughout, migration starts as early as possible, financial and technical reconciliation methods are agreed well in advance, and a fallback plan is in place.\n\nThis is a living document. It is updated as volumes are confirmed and after every mock migration and dress rehearsal. Version 1.0 is the baseline for sign-off to start the migration build phase.",
     "purpose":"To set out the rules for migrating data from the two legacy core instances to the new core banking platform so that the transition is smooth, accurate and causes minimal disruption to the business. The strategy reflects industry good practice and may be updated by the bank to reflect its business requirements.",
     "migration_objectives":"Migrate 1.4 million customers and all in-scope accounts and contracts with zero unreconciled balances\nComplete three mock migrations and three dress rehearsals, each fully reconciled\nFinish the financial data load and reconciliation within the go-live weekend window (60 hours)\nAchieve 100% completeness and integrity for migrated data, evidenced by control totals\nObtain data owner sign-off for every product before the system is opened for business\nKeep a full audit trail from legacy record to migrated record (legacy references kept as alternate keys)",

     "in_scope":"Key areas of migration and the tasks required to prepare and execute them\nStatic data (customers, reference and parameter data) and financial data (accounts, deposits, loans, limits, collateral, trade finance, treasury, GL balances)\nIssues that need attention for a successful migration\nMigration accounting, reconciliation approach and sign-off",
     "out_of_scope":"Decommissioning of the legacy core instances\nBusiness cutover strategy (covered by the Cutover Strategy)\nOther systems interfaced to the legacy core\nExisting take-over account differences in the legacy systems\nExisting general ledger differences in the legacy systems\nTransactions not authorised or on hold in the legacy systems\nHistorical transactions (only balances and open items are migrated)",

     "assumptions":"Automated migration using the vendor bulk-load tool will be used for all high-volume data\nManual migration may be used where volumes are low or loading is complex, agreed with the bank in advance\nThe migration window is adequate for all migration processes to run in the allocated time\nProduction hardware and network performance is optimal for the migration processes\nNo historical transaction data is migrated\nBusiness data owners are available for verification and sign-off during every migration run",
     "constraints":"Financial data can only be migrated over a long weekend with the source systems frozen\nThe target system date for the migration weekend is Saturday (technical working day)\nBoth source and target systems are offline to customers from the final legacy close of business until reconciliation is complete\nTarget product conditions and parameters must be frozen before the final mock migration\nRegulators and customers must be informed of the service outage in advance",

     "approach_description":"Phased approach. Two options were considered: a single big-bang migration of all data over one long weekend, and a phased approach. Based on the volume analysis of both legacy instances, a phased approach is recommended: all static data (customers, reference and parameter data) is migrated in the first migration window, two to four weeks before go-live, and all financial data is migrated in the second window on the go-live weekend.\n\nData from both legacy instances is extracted, verified and cleansed in a staging area and loaded in the same migration window. The approach is confirmed during the mock migrations and dress rehearsals, as it depends on real volumes and the time available.\n\nA migration runbook lists every data file per data object, record counts and the load sequence; it is updated after every load with records loaded against records expected. A timing log is kept for every load, including mocks and dress rehearsals, to inform the go-live plan. All loads use a dedicated migration user and channel so the target audit trail identifies migrated data.",
     "migration_stages":["extract","profile","cleanse","transform_map","load","validate","reconcile","sign_off"],
     "configuration_dependencies":"Bank-level security set-up parameters\nUser roles and user profiles\nProduct categories, product groups and products for accounts, deposits and lending\nMessaging and delivery parameters\nPurging and housekeeping parameters\nError codes\nAccount class classifications\nLimits attached to products\nTransaction codes\nSecurities, letter of credit and FX parameters\nOverdue status codes (ageing)\nMigration take-over accounts per product, per currency and per legacy instance",
     "system_readiness_checks":"Number of processors in the target environment confirmed\nMaximum number of parallel load agents confirmed\nEnvironment prerequisite checklist completed by the data migration team\nMigration user has full read and write access to the target environment\nNo records in exception in the target modules\nTarget system date set to Saturday for the migration weekend\nPre-migration backups taken and verified",

     "migration_window_start":"2027-04-09","migration_window_end":"2027-04-12","planned_downtime_hours":60,
     "services_impacted":"Branch teller and back-office services\nInternet banking\nMobile banking\nATM and point-of-sale (stand-in processing only)\nPayment switch and real-time gross settlement\nCard authorisation (stand-in limits)\nSWIFT messaging (outgoing messages suppressed during the load)\nGeneral ledger extract to the finance system\nAML transaction monitoring feed",
     "user_communication_required":true,
     "rollback_approach":"Go/no-go decision points are held after the static data load, after the financial data load and after reconciliation. If a decision point fails and cannot be resolved within the window, the bank falls back to the legacy core instances: the legacy systems are reopened from the frozen state at the final close of business, no transactions have been taken on the new core, and target data is discarded. Full backups of source and target are taken before the load and retained until hypercare exit. Detailed steps are in the Rollback Plan.",

     "data_categories":["master","transactional","reference","balances","documents","users_security","configuration"],
     "data_objects":"Customers and customer relationships\nCustomer accounts and internal accounts\nTerm deposits and call/notice deposits\nLoans (including arrears and past dues)\nLimits and collateral\nBlocked funds and statement preferences\nStanding orders and sweeps\nCheques, drafts and stop-payment instructions\nCustomer images and signatures\nDebit cards\nFX spot and forward deals\nLetters of credit, drawings and guarantees\nBills and securities\nMoney market placements and takings\nGeneral ledger and P&L balances\nUser profiles and user groups",
     "source_systems":"Legacy core banking – Instance 1 (retail and SME)\nLegacy core banking – Instance 2 (corporate and treasury)\nDocument imaging system (images and signatures)\nCard management platform (card status cross-check)\nFinance and general ledger system (trial balance control totals)",
     "migration_tool":"Vendor bulk-load tool (data migration utility of the target platform)\nStaging database with SQL validation scripts\nReconciliation workbook and comparison scripts",
     "estimated_record_volume":"Customers – 1,400,000\nCustomer accounts – 2,150,000\nTerm and notice deposits – 185,000\nLoans – 240,000\nLimits – 96,000\nCollateral – 71,000\nStanding orders – 310,000\nCheque books and cheques presented – 420,000\nCustomer images and signatures – 2,800,000\nDebit cards – 1,050,000",
     "estimated_data_volume_gb":"Instance 1 extract – 420 GB\nInstance 2 extract – 160 GB\nImages and signatures – 1,900 GB",
     "mock_runs_planned":"Mock 1 – 2026-09-12 – Static data and customers (both instances)\nMock 2 – 2026-11-14 – Static and financial data, full reconciliation\nMock 3 – 2027-01-16 – Full scope with production-sized volumes",
     "dress_rehearsals_planned":"Dress rehearsal 1 – 2027-02-13 – Full go-live timeline, static window\nDress rehearsal 2 – 2027-03-06 – Full go-live timeline, financial window\nDress rehearsal 3 – 2027-03-20 – Final timed rehearsal with business sign-off",

     "products_in_scope":["customers_individual_and_corporate","current_and_savings_accounts","term_fixed_deposits","loans_and_lending_arrangements","legacy_loans_and_arrears_past_dues","internal_office_accounts","dormant_and_inactive_accounts","credit_limits_and_facilities","collateral_and_collateral_rights","blocked_held_funds_liens","statement_preferences","standing_orders","sweeps_and_cash_pooling","cheques_drafts_and_stop_payment_instructions","customer_images_signatures_and_mandates","cards_debit_credit_prepaid","treasury_fx_spot_and_forward_deals","money_market_placements_and_borrowings","letters_of_credit_issued_and_advised","lc_drawings_settlements","bank_guarantees_issued","bills_for_collection_discounting","securities_custody_accounts","securities_master_instruments","general_ledger_pandl_and_customer_balances","uncleared_balances_items_in_transit","teller_ids_tills_and_teller_cash_accounts","customer_delivery_addresses_and_advice_preferences","user_profiles_user_groups_and_access_rights","custom_tables_and_templates","static_reference_data_branches_currencies_rates_holidays"],
     "product_takeover_approach":"Each product is migrated through a take-over arrangement followed by balance capture, so the target records look as if they had been captured directly in the new core\nLegacy references are kept as alternate keys on every migrated record\nAccrued interest is migrated as at the cut-off date with the value date set to the migration date to avoid double accrual\nOverdue amounts are migrated as bills with their original due dates so ageing continues correctly\nEach load is checked and authorised before the next one starts\nDetailed rules for every product are recorded in the Data Scope register",
     "balance_reconciliation_by_product":true,
     "product_owner_signoff_required":true,

     "data_integrity_rules":"Restricted access to data from extraction through staging to the final load (authorised staff only)\nAll changes to data tracked through audit trails\nAll extract files backed up before migration and kept read-only as the source of verification\nReferential integrity checked against target master and parameter data\n100% successful load rate is the benchmark to proceed\nRecords read and written verified at every step with control totals\nCompleteness tests: control totals and amounts, omissions and incomplete fields, all legacy data accounted for in the target",
     "data_cleansing_approach":"Profile both legacy instances to find records that break target validations that do not exist in the source\nCorrect inaccurate records at source wherever possible, owned by the business data owner\nRun de-duplication checks and remove duplicate customers and accounts\nCheck mandatory fields for completeness (industry, sector, customer status, account officer, nationality, residence)\nLog every cleansing issue found during analysis and mock runs and share it with the bank for action\nRe-run profiling after each mock migration until exceptions are closed",
     "data_standards":"Secure shared location for all migration and reconciliation extracts\nOne record per line and one line per record\nPlain text extract files with no heading row\nFields separated by a pipe (|)\nMulti-values separated by a double colon (::)\nSub-values separated by a double exclamation mark (!!)\nDates in YYYYMMDD format and amounts without thousands separators",
     "data_quality_target":100,
     "data_owner_signoff_required":true,

     "financial_impact":"General ledger balances fund product take-over accounts through journal capture; take-over accounts must return to zero as contracts are migrated\nInterest accrued in the legacy system is migrated and cancelled in P&L through adjusting entries so income and expense are not double counted\nTemporary migration suspense accounts exist only for the migration and are closed within seven days of go-live\nAny unexplained difference is posted to the take-over differences account and investigated before sign-off",
     "migration_accounting_entries":"Loans principal – Dr Loan account 50,000 – Cr Migration suspense 50,000 – Take-on of current principal\nLoans accrued interest – Dr Loan accrual 5,455 – Cr P&L 5,455 – Take-on of accrued interest\nLoans accrual adjustment – Dr P&L 5,455 – Cr Migration suspense 5,455 – Cancel accrued interest balance in P&L\nLoans overdue bills – Dr Overdue principal 6,000 and overdue interest 300 – Cr Migration suspense 6,300 – Take-on of overdue bills\nDeposits principal – Dr Migration suspense 20,000 – Cr Deposit account 20,000 – Take-on of deposit principal\nDeposits accrued interest – Dr P&L 500 – Cr Deposit accrual 500 – Take-on of accrued deposit interest\nDeposits accrual adjustment – Dr Migration suspense 500 – Cr P&L 500 – Cancel accrued interest balance in P&L",
     "regulatory_reporting_impacted":true,
     "ifrs9_impact":true,
     "ifrs9_data_carried_over":"Credit risk stage (1, 2 or 3) per loan\nDays past due per bill\nProvision and impairment balances\nRestructured and forborne flags\nRisk grade at origination and current risk grade",
     "holding_account_reference":"14901 – Accounts\n14902 – Loans\n14903 – Deposits\n14904 – GL account accruals\n14906 – GL loan accruals\n14907 – GL deposit accruals\n14908 – Internal accounts\n14909 – Legacy loans\n14910 – Legacy loan accruals\n14918 – Take-on differences",
     "reconciliation_approach":"Top-down: reconcile at summary level first (entities, data classes, control totals), then investigate at detailed and transaction level where differences or risks appear\nCompare migrated data with source data after every stage, using automated comparison where possible (spreadsheets, SQL queries, legacy reports)\nRaw data reconciliation (record counts, rejected records summary and detail, balances summary and detail) and functional reconciliation (business validation of samples)\nTarget raw data extracts provided after every successful load in the same layout as the load files for electronic comparison\nGeneral ledger, loan and deposit balances reconciled before the system goes live\nReconciliation is the responsibility of the bank; sign-off by each data owner",
     "reconciliation_levels":["record_counts","value_totals","ledger_level","entity_level","sample_checks","business_validation"],
     "reconciliation_tolerance":0,

     "pre_migration_tasks":"All parameter tables set up and frozen on the target\nAll services and interfaces stopped\nComplete pre-migration system and data backups taken separately\nCurrency rates updated in the target system\nOutgoing advices and messages suppressed\nLegacy close of business completed and data frozen\nControl totals from the legacy trial balance provided by Finance",
     "post_migration_tasks":"Complete post-migration system and data backups taken separately\nSuppressed advices and messages re-enabled\nAll services and interfaces restarted\nFirst close of business run to move to the next working day\nMigration suspense and take-over accounts confirmed at zero\nTemporary migration users disabled\nHypercare defect triage started",

     "overall_risk_rating":"high",
     "risks_mitigations":"Target environments (development, staging, testing) not available on time – Agree environment dates with IT and track them weekly; book pre-production for all dress rehearsals\nDelays in data verification by the business – Name and release verifiers for each data object and give them access to verification tools before each mock\nData verification issues lead to inaccurate data being loaded – Check and sign off all data before loading; stop the load if control totals do not match\nMigration overruns the go-live window (Mock 1 overran by 9 hours) – Tune parallel load agents, pre-load static data in window 1 and rehearse the timeline three times\nCustomer address quality below target (85%) – Business cleansing sprint with weekly progress against target\nUnreconciled balances at go/no-go – Zero-tolerance reconciliation with finance present on the weekend; fallback plan ready",

     "parties_involved":["business_units","it","finance","risk_compliance","internal_audit","target_vendor","migration_partner"],
     "roles_responsibilities":"Programme director – Overall accountability and go/no-go decisions – Daniel Okafor\nData migration lead – Strategy, plan, runbook and load execution – Fatima Bello\nData migration consultant (partner) – Mapping, load tooling and timing – Migration partner team\nBusiness data owner – Data cleansing, verification and product sign-off – Amina Diallo\nFinancial controller – Control totals, migration accounting and GL reconciliation – Olivia Banda\nIT environments lead – Environments, backups and system readiness – Kwame Asante\nTest manager – Mock migration and dress rehearsal test evidence – Maria Fernandes\nCompliance and risk – Data protection and regulatory notification – Nadia Rahman\nInternal audit – Independent assurance of controls and sign-off – Internal audit representative\nData cleansing and enrichment team – Correct source data before each mock – Business operations\nReconciliation team – Record and balance reconciliation after every load – Finance and operations",
     "environments":["development","sit","uat","pre_production","production"],
     "environment_management":"Development – mapping and load script build\nSystem integration test – Mock 1 and Mock 2\nUser acceptance test – business verification of Mock 2 data\nPre-production – Mock 3 and all dress rehearsals with production-sized volumes\nProduction – final migration windows\nEnvironment refresh and turnaround times as per the Environment Management document (Appendix 3)",

     "glossary":"CoB\tClose of business – end-of-day processing that moves the system to the next working day\nDMS\tData mapping sheet – source-to-target field mapping for one data object\nEoD\tEnd of day\nEoM\tEnd of month\nBSU\tBusiness support unit\nToA\tTake-over account – account funded with GL balances and used as the contra for migrated balances\nGL\tGeneral ledger\nFT\tFunds transfer\nFX\tForeign exchange\nP&L\tProfit and loss\nLC\tLetter of credit\nDC\tData capture (manual journal entry)\nDMD\tData mapping definition\nSL\tSyndicated loans\nDES\tData extract specification\nMCM\tMigration control matrix\nETL\tExtract, transform and load\nISB\tInitial system build\nSTO\tStanding order\nLCY / FCY\tLocal currency / foreign currency\nDress rehearsal\tFull, timed run of the go-live migration in a production-like environment",
     "appendices":"Appendix 1 – List of data mapping sheets (DMS)\tDM-DMS-INDEX v0.3\nAppendix 2 – Sample hand-off and sign-off control form\tDM-FRM-002\nAppendix 3 – Environment management document\tTo follow in the next draft\nAppendix 4 – RACI matrix\tDM-RACI-001",
     "notes":"Image storage location (file storage or database) is still under discussion; the images section will be updated once decided\nCustom tables and templates: approach to be confirmed once analysis of data presence and volumes is complete\nRoles and decision points to be detailed in the go-live plan",

     "approvals":"Grace Moyo\tChief Operating Officer (Executive Sponsor)\t\nDaniel Okafor\tProgramme Director\t\nOlivia Banda\tFinancial Controller\t\nAmina Diallo\tHead of Operations (Business Data Owner)\t\nFatima Bello\tData Migration Lead\t\nMigration partner\tEngagement Manager\t",
     "version_history":"0.1\t2026-02-25\tFatima Bello\tInitial draft\n0.2\t2026-05-18\tFatima Bello\tPhased approach recommended after volume analysis\n0.3\t2026-09-28\tFatima Bello\tUpdated after Mock 1 (timing, address quality)\n1.0\t2026-10-24\tFatima Bello\tBaseline for sign-off"}'),

  -- ══ Data Scope (…9001-…00d) — one record per data takeover area ═════════════════════
  ('00000000-0000-4000-a00d-000000000001', '00000000-0000-4000-9001-00000000000d',
   'Customers', 'Individual and corporate customers with their relationships; static data loaded in window 1 with an incremental load on go-live weekend.', 'rules_approved',
   '{"product_area":"customers_individual_and_corporate","legacy_source_module":"Customer master (Instances 1 and 2)","target_module":"Customer","product_owner":"Amina Diallo","migration_strategy_reference":"DM-STR-001 §4.1","migration_wave":"Window 1 – static data (incremental on go-live weekend)",
     "scope_criteria":"All active customers in both legacy instances\nCustomers with at least one open account, contract, limit or collateral",
     "inclusion_rules":"All relevant customer records\nCustomer relationships (joint, guarantor, related party)",
     "exclusion_rules":"Customers with no open products and no activity for 7 years (archived separately)",
     "numbering_key_rules":"New customer numbers have 8 digits\nInstance 1 customer number kept as the new customer number where unique\nWhere the same number exists in both instances, both are replaced by new numbers and the old numbers kept as alternate keys\nWhere one customer has several numbers, the one with the most complete KYC data is kept",
     "target_setup_prerequisites":"Industry, sector, customer status, account officer, target market, nationality and residence tables loaded first",
     "migration_steps":"Extract from both instances\nDe-duplicate and merge in staging\nLoad customers\nLoad customer relationships\nAuthorise and verify",
     "data_dependencies":"Static reference data","estimated_record_count":1400000,
     "reconciliation_checks":"Record counts per instance and per customer type\nMandatory field completeness\nSample of 200 customers verified field by field",
     "balance_reconciliation_required":false,"product_owner_signed_off":false,
     "open_issues":"Customer address quality at 82% against an 85% target"}'),
  ('00000000-0000-4000-a00d-000000000002', '00000000-0000-4000-9001-00000000000d',
   'Customer accounts', 'Current and savings accounts migrated to the new accounts module through take-over arrangement and balance capture.', 'rules_approved',
   '{"product_area":"current_and_savings_accounts","legacy_source_module":"Accounts (customer categories 1001–9999)","target_module":"Retail and business accounts","product_owner":"Nomvula Khumalo","migration_strategy_reference":"DM-STR-001 §4.2","migration_wave":"Window 2 – financial data",
     "scope_criteria":"Customer account categories 1001 to 9999 in both instances",
     "inclusion_rules":"Open accounts with or without balances\nAccounts with posting restriction 90 that still hold balances",
     "exclusion_rules":"Closed accounts\nAccounts marked for closure with no balance",
     "numbering_key_rules":"Instance 1 account numbers retained\nInstance 2 account numbers become alternate keys; new 10-digit numbers created to the group standard",
     "restrictions_carried_over":"Posting restrictions and their narratives",
     "target_setup_prerequisites":"Account product conditions (charges, statements, dormancy, closure, facilities) configured",
     "freeze_rules":"No account closures in the week before go-live",
     "migration_steps":"Take-over arrangement (customer, product, currency, account-specific conditions)\nCapture balances and current accruals (credit and debit interest, charges, taxes)\nAuthorise each step before the next",
     "data_dependencies":"Customers\nLimits\nCollateral","estimated_record_count":2150000,"estimated_balance_total":18400000000,
     "balance_cutoff_rule":"Balances after all transactions on the last business day and the final legacy close of business on the eve of the go-live weekend.",
     "uncleared_items_treatment":"Uncleared balances migrated with the value date of the legacy entry.",
     "accounting_entries":"Dr Migration suspense (accounts) – Cr Customer account – Credit balances taken on\nDr Customer account – Cr Migration suspense (accounts) – Debit balances taken on",
     "reconciliation_checks":"Account counts per product and currency\nBalance totals per product and currency against the legacy trial balance\nAccrued interest totals",
     "balance_reconciliation_required":true,"product_owner_signed_off":false}'),
  ('00000000-0000-4000-a00d-000000000003', '00000000-0000-4000-9001-00000000000d',
   'Customer deposits', 'Fixed and call/notice deposits moved from the legacy money market module to the new deposits module in four steps.', 'rules_approved',
   '{"product_area":"term_fixed_deposits","legacy_source_module":"Money market – customer deposits","target_module":"Deposits","product_owner":"Catherine Mwangi","migration_strategy_reference":"DM-STR-001 §4.3","migration_wave":"Window 2 – financial data",
     "scope_criteria":"All running fixed, call and notice deposits",
     "inclusion_rules":"Running deposits with principal and accrued interest",
     "exclusion_rules":"Matured deposits still carrying balances (unless the maturity date is moved to the migration date; they mature again at the first close of business)",
     "numbering_key_rules":"New deposit numbers generated; legacy deposit reference kept as alternate key and used to link subsequent loads",
     "special_conditions":"Interest due on the migration date is capitalised or credited to the customer account in the legacy system before the freeze",
     "migration_steps":"Take-over arrangement\nCapture balances\nAdjust expected principal (deposit already funded)\nCapture current accruals (value date = migration date)",
     "data_dependencies":"Customers\nSettlement accounts","estimated_record_count":185000,"estimated_balance_total":6200000000,
     "accounting_entries":"Dr Migration suspense (deposits) – Cr Deposit – Principal taken on\nDr P&L – Cr Deposit accrual – Accrued interest taken on\nDr Migration suspense – Cr P&L – Cancel accrued interest in P&L",
     "reconciliation_checks":"Deposit counts per product and tenor\nPrincipal and accrued interest totals",
     "balance_reconciliation_required":true,"product_owner_signed_off":false}'),
  ('00000000-0000-4000-a00d-000000000004', '00000000-0000-4000-9001-00000000000d',
   'Loans', 'Loans from the legacy loans module and arrangement-based lending moved to the new lending module in up to five steps.', 'rules_approved',
   '{"product_area":"loans_and_lending_arrangements","legacy_source_module":"Loans and deposits module; arrangement-based lending","target_module":"Lending","product_owner":"Nomvula Khumalo","migration_strategy_reference":"DM-STR-001 §4.4","migration_wave":"Window 2 – financial data",
     "scope_criteria":"All running loans, including matured loans with overdue bills",
     "inclusion_rules":"Current principal, overdue bills, accrued interest, penalty interest, charges and taxes",
     "numbering_key_rules":"New loan numbers generated; legacy reference kept as alternate key",
     "special_conditions":"One liquidation (repayment) account per customer per currency; other repayment accounts remapped\nPayment schedules regenerated from migrated frequency\nAutomated repayments through the transaction recycler",
     "target_setup_prerequisites":"Lending products, overdue (ageing) set-up and take-over accounts",
     "migration_steps":"Take-over arrangement\nCapture current balance\nAdjust outstanding commitment\nCapture current accruals (value date = migration date)\nCapture overdue and due bills with original due dates",
     "data_dependencies":"Customers\nLimits\nCollateral\nSettlement accounts","estimated_record_count":240000,"estimated_balance_total":11900000000,
     "accounting_entries":"Dr Loan – Cr Migration suspense (loans) – Principal 50,000 taken on\nDr Loan accrual – Cr P&L – Accrued interest 5,455\nDr P&L – Cr Migration suspense – Cancel accrued interest\nDr Overdue principal and interest – Cr Migration suspense – Overdue bills",
     "reconciliation_checks":"Loan counts per product\nPrincipal, overdue and accrued totals\nAgeing buckets compared with legacy",
     "balance_reconciliation_required":true,"product_owner_signed_off":false,
     "open_issues":"Interest in suspense exceptions file layout to be agreed"}'),
  ('00000000-0000-4000-a00d-000000000005', '00000000-0000-4000-9001-00000000000d',
   'Loan arrears and past dues', 'Past-due amounts migrated as bills with original due dates so ageing and suspended interest continue correctly.', 'in_scope',
   '{"product_area":"legacy_loans_and_arrears_past_dues","legacy_source_module":"Past dues","target_module":"Lending – bills and ageing","product_owner":"Joy Akinyi","migration_strategy_reference":"DM-STR-001 §4.4","migration_wave":"Window 2 – financial data",
     "inclusion_rules":"All past dues for loans moving to the new lending module\nArrears on matured loans (liquidated to migration suspense and migrated as bills)",
     "special_conditions":"Past-due date captured as the bill date\nAgeing performed automatically by the target overdue set-up\nSuspended interest exceptions sent in a separate file",
     "migration_steps":"Capture bills after the loan current balance is loaded","data_dependencies":"Loans","estimated_record_count":38000,"estimated_balance_total":410000000,
     "reconciliation_checks":"Bill counts and amounts per ageing bucket","balance_reconciliation_required":true}'),
  ('00000000-0000-4000-a00d-000000000006', '00000000-0000-4000-9001-00000000000d',
   'Internal, nostro and vostro accounts', 'Internal accounts, nostros, vostros and bankers cheque accounts migrated with their numbers unchanged.', 'rules_approved',
   '{"product_area":"internal_office_accounts","legacy_source_module":"Accounts (internal categories 10000–49000, nostro 5000–5999, vostro 2000, bankers cheques 1099)","target_module":"Internal accounts","product_owner":"Olivia Banda","migration_strategy_reference":"DM-STR-001 §4.5","migration_wave":"Window 2 – financial data",
     "numbering_key_rules":"Account numbers retained; if category or department changes, the old number is kept in a local reference field",
     "special_conditions":"Customer-like internal accounts moved to customer accounts before the migration date",
     "migration_steps":"Create internal accounts\nPost balances through the GL balances load to take-over accounts\nTransfer to the respective accounts by funds transfer",
     "estimated_record_count":5200,"balance_reconciliation_required":true}'),
  ('00000000-0000-4000-a00d-000000000007', '00000000-0000-4000-9001-00000000000d',
   'Dormant and inactive accounts', 'Last customer credit and debit dates migrated so the target marks dormancy and inactivity at the first close of business.', 'rules_approved',
   '{"product_area":"dormant_and_inactive_accounts","legacy_source_module":"Accounts – dormancy dates","target_module":"Accounts – dormancy","product_owner":"Amina Diallo","migration_strategy_reference":"DM-STR-001 §4.6","migration_wave":"Window 2 – financial data",
     "inclusion_rules":"Account number, last customer credit date and last customer debit date",
     "special_conditions":"Accounts dormant for more than 5 years are closed (with unclaimed balances transferred) before migration\nThresholds: inactive after 6 months, dormant after 12 months",
     "target_setup_prerequisites":"Dormancy set-up on account products","estimated_record_count":310000}'),
  ('00000000-0000-4000-a00d-000000000008', '00000000-0000-4000-9001-00000000000d',
   'Limits', 'All outstanding limits migrated with the original sanctioned amount before accounts and loans are taken over.', 'rules_approved',
   '{"product_area":"credit_limits_and_facilities","legacy_source_module":"Limits","target_module":"Limits","product_owner":"Joy Akinyi","migration_strategy_reference":"DM-STR-001 §4.7","migration_wave":"Window 2 – before accounts and loans",
     "numbering_key_rules":"New limit identifiers in the target format; legacy reference kept as alternate key",
     "special_conditions":"Global limits created for multi-purpose credit lines\nExpired limits loaded with expiry = migration date + 1 day and expire again at first close of business; original expiry kept in a local field",
     "target_setup_prerequisites":"Limit parameters and limit references set up",
     "migration_steps":"Load limits with sanctioned amount\nAvailable amounts recalculated as contracts are migrated","estimated_record_count":96000,
     "reconciliation_checks":"Limit counts and sanctioned totals; utilisation after contract loads"}'),
  ('00000000-0000-4000-a00d-000000000009', '00000000-0000-4000-9001-00000000000d',
   'Collateral rights and collateral', 'Collateral rights loaded first, then collateral items, as static data before loans.', 'rules_approved',
   '{"product_area":"collateral_and_collateral_rights","legacy_source_module":"Collateral","target_module":"Collateral","product_owner":"Joy Akinyi","migration_strategy_reference":"DM-STR-001 §4.8","migration_wave":"Window 1 – static data",
     "numbering_key_rules":"Collateral right ID = customer number.serial\nCollateral ID = customer number.serial.serial",
     "target_setup_prerequisites":"Collateral right and collateral code set-up","migration_steps":"Load collateral rights\nLoad collateral\nLink to limits and contracts",
     "estimated_record_count":71000}'),
  ('00000000-0000-4000-a00d-00000000000a', '00000000-0000-4000-9001-00000000000d',
   'Blocked funds', 'Locked and frozen amounts migrated with their narratives after accounts are reconciled.', 'rules_approved',
   '{"product_area":"blocked_held_funds_liens","legacy_source_module":"Locked events","target_module":"Account locks","product_owner":"Amina Diallo","migration_strategy_reference":"DM-STR-001 §4.9","migration_wave":"Window 2 – after accounts",
     "numbering_key_rules":"New lock IDs; legacy reference kept as alternate key","restrictions_carried_over":"Lock narratives and reasons",
     "data_dependencies":"Customer accounts reconciled and authorised","estimated_record_count":42000}'),
  ('00000000-0000-4000-a00d-00000000000b', '00000000-0000-4000-9001-00000000000d',
   'Statement frequency', 'Only accounts whose statement frequency differs from the product default are migrated.', 'rules_approved',
   '{"product_area":"statement_preferences","legacy_source_module":"Account statements","target_module":"Account statements","product_owner":"Nomvula Khumalo","migration_strategy_reference":"DM-STR-001 §4.10","migration_wave":"Window 2 – after accounts",
     "inclusion_rules":"Accounts with a non-default statement frequency","exclusion_rules":"Accounts following the product default (set automatically)",
     "special_conditions":"Frequencies mapped to the new account numbers for Instance 2 accounts","estimated_record_count":64000}'),
  ('00000000-0000-4000-a00d-00000000000c', '00000000-0000-4000-9001-00000000000d',
   'Standing orders', 'All live standing orders migrated after accounts.', 'rules_approved',
   '{"product_area":"standing_orders","legacy_source_module":"Standing orders","target_module":"Standing orders","product_owner":"Nomvula Khumalo","migration_strategy_reference":"DM-STR-001 §4.11","migration_wave":"Window 2 – after accounts",
     "inclusion_rules":"All standing orders in the live file","special_conditions":"Next execution date must be after the migration date",
     "data_dependencies":"Customer accounts","estimated_record_count":310000}'),
  ('00000000-0000-4000-a00d-00000000000d', '00000000-0000-4000-9001-00000000000d',
   'Cheques, drafts and stop instructions', 'Issued cheque books, cheques presented, stop-payment instructions and active bankers cheque orders.', 'in_scope',
   '{"product_area":"cheques_drafts_and_stop_payment_instructions","legacy_source_module":"Cheque issue, cheques presented, payment stop, stock entry","target_module":"Cheques","product_owner":"Kevin Mutua","migration_strategy_reference":"DM-STR-001 §4.13","migration_wave":"Window 2 – after accounts",
     "inclusion_rules":"Last active cheque order per account\nCheques presented for active cheque books\nAll stop-payment instructions including history\nActive bankers cheque orders",
     "special_conditions":"Cheque register updated with last sequence number, start and end series and leaves used",
     "target_setup_prerequisites":"Cheque types and cheque statuses finalised","estimated_record_count":420000}'),
  ('00000000-0000-4000-a00d-00000000000e', '00000000-0000-4000-9001-00000000000d',
   'Sweeps', 'Sweep instructions for active accounts migrated after the accounts.', 'rules_approved',
   '{"product_area":"sweeps_and_cash_pooling","legacy_source_module":"Account links","target_module":"Sweeps","product_owner":"Ahmed Hassan","migration_strategy_reference":"DM-STR-001 §4.12","migration_wave":"Window 2 – after accounts",
     "inclusion_rules":"Sweep instructions on active accounts","data_dependencies":"Customer accounts","estimated_record_count":3400}'),
  ('00000000-0000-4000-a00d-00000000000f', '00000000-0000-4000-9001-00000000000d',
   'Customer images and signatures', 'Image references and document uploads migrated with their images.', 'in_scope',
   '{"product_area":"customer_images_signatures_and_mandates","legacy_source_module":"Document images and uploads","target_module":"Imaging","product_owner":"Brian Otieno","migration_strategy_reference":"DM-STR-001 §4.14","migration_wave":"Window 1 – static data",
     "inclusion_rules":"All customer images and documents with their references",
     "target_setup_prerequisites":"Image types set up","estimated_record_count":2800000,
     "open_issues":"Storage location (file storage or database) not yet decided"}'),
  ('00000000-0000-4000-a00d-000000000010', '00000000-0000-4000-9001-00000000000d',
   'Debit cards', 'Active debit cards migrated; cards expiring on or before the migration date are excluded.', 'rules_approved',
   '{"product_area":"cards_debit_credit_prepaid","legacy_source_module":"Card issue","target_module":"Cards","product_owner":"Ravi Pillai","migration_strategy_reference":"DM-STR-001 §4.15","migration_wave":"Window 2 – after accounts",
     "exclusion_rules":"Cards expired or expiring on the migration date","target_setup_prerequisites":"Card statuses and card charges migrated before the weekend",
     "estimated_record_count":1050000}'),
  ('00000000-0000-4000-a00d-000000000011', '00000000-0000-4000-9001-00000000000d',
   'FX spot and forward deals', 'Unmatured FX contracts loaded with their original value dates.', 'rules_approved',
   '{"product_area":"treasury_fx_spot_and_forward_deals","legacy_source_module":"Foreign exchange","target_module":"Treasury – FX","product_owner":"Linda Zhou","migration_strategy_reference":"DM-STR-001 §4.16","migration_wave":"Window 2 – financial data",
     "inclusion_rules":"Contracts not matured on the migration date\nSplit contracts only where both legs are unmatured",
     "numbering_key_rules":"Legacy deal number stored as replacing deal number",
     "special_conditions":"Currency rates updated before the load\nSWIFT message generation suppressed during the load","estimated_record_count":1800}'),
  ('00000000-0000-4000-a00d-000000000012', '00000000-0000-4000-9001-00000000000d',
   'Letters of credit', 'Issued and advised LCs migrated with the net outstanding amount; unpaid and unmatured drawings migrated separately.', 'in_scope',
   '{"product_area":"letters_of_credit_issued_and_advised","legacy_source_module":"Letters of credit","target_module":"Trade finance – LC","product_owner":"Ahmed Hassan","migration_strategy_reference":"DM-STR-001 §4.17","migration_wave":"Window 2 – financial data",
     "inclusion_rules":"Sight LCs at current outstanding amount\nUsance and deferred-payment LCs at outstanding amount plus accepted, unmatured documents\nLCs with contingent liability or pending drawings after expiry",
     "numbering_key_rules":"Legacy LC number stored in the old LC number field\nParent LC migrated before child (transferred) LCs",
     "special_conditions":"Original LC amount kept in a local field where it differs from outstanding\nExpired LCs with liability: liability reversal date set on or after the migration date; original expiry kept as advice expiry\nCharges are collected upfront and not migrated",
     "estimated_record_count":2600}'),
  ('00000000-0000-4000-a00d-000000000013', '00000000-0000-4000-9001-00000000000d',
   'LC drawings', 'Unpaid and unmatured drawings under LCs, including discounted drawings.', 'in_scope',
   '{"product_area":"lc_drawings_settlements","legacy_source_module":"Drawings","target_module":"Trade finance – drawings","product_owner":"Ahmed Hassan","migration_strategy_reference":"DM-STR-001 §4.18","migration_wave":"Window 2 – after LCs",
     "special_conditions":"Example: LC 100,000 with paid drawings 30,000 and unpaid 20,000 – net LC 70,000 migrated, then the 20,000 drawing reduces it to 50,000\nPayment method set to internal account\nDiscounted drawings keep the original value date; the target amortises the discount",
     "data_dependencies":"Letters of credit","estimated_record_count":900}'),
  ('00000000-0000-4000-a00d-000000000014', '00000000-0000-4000-9001-00000000000d',
   'Bank guarantees issued', 'Live guarantees migrated with outstanding amounts and original value and expiry dates.', 'in_scope',
   '{"product_area":"bank_guarantees_issued","legacy_source_module":"Guarantees","target_module":"Trade finance – guarantees","product_owner":"Ahmed Hassan","migration_strategy_reference":"DM-STR-001 §4.19","migration_wave":"Window 2 – financial data",
     "numbering_key_rules":"New guarantee numbers; legacy reference kept as alternate key",
     "special_conditions":"Periodic commission migrated in the commission fields and collected from the next frequency date\nInvocations and commission due on the migration date processed in legacy first\nExpired guarantees: expiry set to migration date, expire again after first close of business",
     "estimated_record_count":3100}'),
  ('00000000-0000-4000-a00d-000000000015', '00000000-0000-4000-9001-00000000000d',
   'Bills', 'Active bills and bill registers migrated after bill parameters.', 'draft',
   '{"product_area":"bills_for_collection_discounting","legacy_source_module":"Bills and bill registers","target_module":"Bills","product_owner":"Ahmed Hassan","migration_strategy_reference":"DM-STR-001 §4.20","migration_wave":"Window 2 – financial data",
     "inclusion_rules":"Active bills only","target_setup_prerequisites":"Bill parameters, bill types and condition tables migrated first",
     "numbering_key_rules":"Legacy bill and register IDs kept as alternate keys","estimated_record_count":700}'),
  ('00000000-0000-4000-a00d-000000000016', '00000000-0000-4000-9001-00000000000d',
   'Securities customers and custody accounts', 'Customer securities roles and securities account masters, after customers and accounts.', 'draft',
   '{"product_area":"securities_custody_accounts","legacy_source_module":"Customer securities; securities account master","target_module":"Securities","product_owner":"Linda Zhou","migration_strategy_reference":"DM-STR-001 §4.21–4.22","migration_wave":"Window 1 – static data",
     "inclusion_rules":"Customers dealing in securities and own-book portfolios","numbering_key_rules":"Securities account ID = customer number followed by a sequence",
     "special_conditions":"Own-book portfolios populated with the dealer book","data_dependencies":"Customers\nCustomer accounts","estimated_record_count":5600}'),
  ('00000000-0000-4000-a00d-000000000017', '00000000-0000-4000-9001-00000000000d',
   'Securities master', 'Instruments (bonds and shares) with their conditions and corporate action data.', 'draft',
   '{"product_area":"securities_master_instruments","legacy_source_module":"Security master","target_module":"Securities – instruments","product_owner":"Linda Zhou","migration_strategy_reference":"DM-STR-001 §4.23","migration_wave":"Window 1 – static data",
     "numbering_key_rules":"Instrument ID format XXXXX-NNN","target_setup_prerequisites":"Country, currency, price type, industry and stock exchange tables loaded first",
     "estimated_record_count":1200}'),
  ('00000000-0000-4000-a00d-000000000018', '00000000-0000-4000-9001-00000000000d',
   'Money market placements and takings', 'Interbank placements and takings stay in the money market module; customer deposits move to the deposits module.', 'rules_approved',
   '{"product_area":"money_market_placements_and_borrowings","legacy_source_module":"Money market","target_module":"Treasury – money market","product_owner":"Linda Zhou","migration_strategy_reference":"DM-STR-001 §4.24","migration_wave":"Window 2 – financial data",
     "numbering_key_rules":"New IDs; legacy reference kept as alternate key","special_conditions":"Start date = legacy value date; principal as at the migration date",
     "estimated_record_count":450}'),
  ('00000000-0000-4000-a00d-000000000019', '00000000-0000-4000-9001-00000000000d',
   'General ledger, P&L and customer balances', 'GL balances fund product take-over accounts through journal capture; take-over accounts return to zero as contracts are migrated.', 'rules_approved',
   '{"product_area":"general_ledger_pandl_and_customer_balances","legacy_source_module":"General ledger and trial balance","target_module":"General ledger","product_owner":"Olivia Banda","migration_strategy_reference":"DM-STR-001 §4.25 and §5","migration_wave":"Window 2 – first financial load",
     "special_conditions":"Take-over accounts opened per product, per currency and per company\nDifferences posted to the take-over differences account (14918)\nMigration suspense accounts closed within 7 days of go-live",
     "migration_steps":"Fund take-over accounts with Finance control totals (balanced journal)\nMigrate contracts and accounts against the take-over accounts\nConfirm take-over accounts are zero","balance_cutoff_rule":"Legacy trial balance after the final close of business.",
     "accounting_entries":"Dr Take-over account – Cr Migration suspense – Funding with control totals\nDr/Cr Take-over differences – Unexplained differences",
     "reconciliation_checks":"Trial balance comparison by GL line and currency\nTake-over and suspense accounts at zero","balance_reconciliation_required":true}'),
  ('00000000-0000-4000-a00d-00000000001a', '00000000-0000-4000-9001-00000000000d',
   'Uncleared balances', 'Future-dated items whose exposure goes beyond the migration date, split into local and foreign currency.', 'in_scope',
   '{"product_area":"uncleared_balances_items_in_transit","legacy_source_module":"Accounts – uncleared items","target_module":"Funds transfer (uncleared balance)","product_owner":"Olivia Banda","migration_strategy_reference":"DM-STR-001 §4.26","migration_wave":"Window 2 – after accounts",
     "uncleared_items_treatment":"Split into local and foreign currency uncleared balances and migrated through funds transfer with the original value dates.",
     "estimated_record_count":9500,"balance_reconciliation_required":true}'),
  ('00000000-0000-4000-a00d-00000000001b', '00000000-0000-4000-9001-00000000000d',
   'Tills and teller cash accounts', 'Tills are not migrated; new tills are created. Vault balances migrate per branch and currency.', 'out_of_scope',
   '{"product_area":"teller_ids_tills_and_teller_cash_accounts","legacy_source_module":"Teller","target_module":"Teller","product_owner":"Kevin Mutua","migration_strategy_reference":"DM-STR-001 §4.27",
     "exclusion_rules":"Tills and teller IDs (new tills created in the target)",
     "special_conditions":"Tellers balance and transfer all cash to the branch vault at the final legacy close of business\nTeller cash accounts created automatically in the target\nVault accounts created with internal accounts; vault balances migrated with balance sheet balances"}'),
  ('00000000-0000-4000-a00d-00000000001c', '00000000-0000-4000-9001-00000000000d',
   'Delivery addresses and message products', 'SWIFT delivery addresses migrated; print addresses created automatically with customers.', 'rules_approved',
   '{"product_area":"customer_delivery_addresses_and_advice_preferences","legacy_source_module":"Delivery addresses and delivery products","target_module":"Delivery","product_owner":"Ravi Pillai","migration_strategy_reference":"DM-STR-001 §4.28","migration_wave":"Window 1 – static data",
     "inclusion_rules":"SWIFT delivery addresses","exclusion_rules":"Print addresses (created automatically)","special_conditions":"Bank identifier codes updated before the load","estimated_record_count":2300}'),
  ('00000000-0000-4000-a00d-00000000001d', '00000000-0000-4000-9001-00000000000d',
   'User profiles and user groups', 'User groups (rights) migrated before the weekend; user profiles migrated on the migration date.', 'rules_approved',
   '{"product_area":"user_profiles_user_groups_and_access_rights","legacy_source_module":"Users and user groups","target_module":"Security – users and roles","product_owner":"Nadia Rahman","migration_strategy_reference":"DM-STR-001 §4.29","migration_wave":"Window 1 (groups) and Window 2 (users)",
     "special_conditions":"User roles may replace user groups in the target; if so, roles are promoted from UAT on the go-live weekend\nAccess recertified by line managers before go-live",
     "estimated_record_count":2100}'),
  ('00000000-0000-4000-a00d-00000000001e', '00000000-0000-4000-9001-00000000000d',
   'Custom tables and templates', 'Bank-defined custom tables and templates; approach decided after data analysis.', 'draft',
   '{"product_area":"custom_tables_and_templates","legacy_source_module":"Custom table definitions","target_module":"Custom tables","product_owner":"Priya Naidoo","migration_strategy_reference":"DM-STR-001 §4.30",
     "open_issues":"Analysis of data presence and record counts in progress; approach to be communicated"}')

) AS v(id, register_id, title, description, status, field_values)
CROSS JOIN proj p
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  v_project UUID;
  v_strategy INT;
  v_scope INT;
BEGIN
  SELECT id INTO v_project FROM public.projects WHERE project_code = 'SEED334-PRJ-08' LIMIT 1;
  IF v_project IS NULL THEN
    RAISE NOTICE 'v1329: project SEED334-PRJ-08 not found — no seed rows inserted';
    RETURN;
  END IF;
  SELECT COUNT(*) INTO v_strategy FROM public.local_register_records WHERE id::text LIKE '00000000-0000-4000-a00c-%' AND record_project_id = v_project;
  SELECT COUNT(*) INTO v_scope FROM public.local_register_records WHERE id::text LIKE '00000000-0000-4000-a00d-%' AND record_project_id = v_project;
  RAISE NOTICE 'v1329: % Data Migration Strategy record(s) (expected 1) and % Data Scope records (expected 30) on SEED334-PRJ-08', v_strategy, v_scope;
END $$;
