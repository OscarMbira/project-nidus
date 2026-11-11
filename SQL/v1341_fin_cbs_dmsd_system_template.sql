-- ============================================================================
-- v1341: Core Banking System Data Migration Strategy (DMSD) — system template content
-- ============================================================================
-- Feature: projectprd/v1336_register_document_templates_cbs_dmsd_PRD.md
-- Plan:    projectplan/v1336_register_document_templates_cbs_dmsd_plan.md (slice 2)
--
-- One shipped (system) template for the Data Migration Strategy register (fin_migration_strategy):
-- a generic, vendor-neutral superset of the two sample strategies, with [placeholders] for
-- organisation-specific values, plus one Data Scope child record per product area
-- (33 children, linked through the Product Takeover Details field).
--
-- Annexures A–D are uploaded and registered by
--   node scripts/seed-cbs-dmsd-template-annexures.mjs
-- (bucket local-register-templates, path system/00000000-0000-4000-b341-000000000001/…).
--
-- Re-runnable: the template row is upserted (version + 1 when its content changes) and its children
-- are replaced. Records already created from the template are independent copies and are not touched.
-- The display ID is left blank for the Admin ID Generation trigger (rule 16.2).
--
-- Run after: v1336, Admin v244, v1337, v1338, v1339.
-- Generated from the content module in the v1336 work; check with
--   node scripts/check-cbs-dmsd-template.mjs
-- ============================================================================

BEGIN;

INSERT INTO public.local_register_templates
  (id, display_id, register_key, template_scope, account_id, name, description, version,
   record_title, record_description, record_status, field_values)
VALUES (
  '00000000-0000-4000-b341-000000000001'::uuid, '', 'fin_migration_strategy', 'system', NULL,
  $cbs$Core Banking System Data Migration Strategy (DMSD)$cbs$,
  $cbs$Generic data migration strategy for replacing a core banking system: approach, cutover windows, product takeover rules for 33 product areas, data standards, migration accounting, IFRS 9, reconciliation, roles and sign-off. Fill the bracketed placeholders and remove the product areas that do not apply.$cbs$,
  1,
  $cbs$Data Migration Strategy – [Bank Name] Core Banking Replacement$cbs$,
  $cbs$How customer, account, product and financial data moves from [Legacy Core Banking System] to [Target Core Banking System]: approach, takeover rules, data quality, migration accounting, reconciliation and sign-off.$cbs$,
  'draft',
  $cbs${
  "document_reference": "[Document Reference]",
  "document_version": "0.1",
  "system_category": "core_banking",
  "migration_type": "replacement",
  "migration_approach": "phased",
  "target_system": "[Target Core Banking System] – [Release or Phase]",
  "introduction": "This Data Migration Strategy has been prepared by the Data Migration workstream of the [Programme Name] and is an input to the detailed Data Migration Plan and the migration runbooks.\n\nA significant amount of data must move from [Legacy Core Banking System] to [Target Core Banking System]. This document describes the prerequisites, the migration itself, the method to be followed and the post-migration activities.\n\nThe approach is driven by data volumes, the processing capacity of the source and target platforms within the migration window, and the complexity of mapping business rules between them. Data migration runs in parallel with design, build and testing and is managed as autonomously as possible from the main build.\n\nWhatever the approach, the same principles apply: business and technical people are involved throughout, migration starts as early as possible, financial and technical reconciliation methods are agreed well in advance, and a fallback plan is in place.\n\nThis is a living document. It is updated as volumes are confirmed and after every mock migration and dress rehearsal. Version 1.0 is the baseline for sign-off to start the migration build phase.",
  "purpose": "To set out the rules for migrating data from [Legacy Core Banking System] to [Target Core Banking System] so that the transition is smooth, accurate and causes minimal disruption to the business. The aim is to migrate accurate, relevant and clean data — not to dump data. The strategy reflects industry good practice and may be updated by [Bank Name] to reflect its business requirements.",
  "migration_objectives": "Migrate all in-scope customers, accounts and contracts with zero unreconciled balances\nComplete [Number of Mocks] mock migrations and [Number of Rehearsals] dress rehearsals, each fully reconciled\nFinish the financial data load and reconciliation within the go-live weekend window\nAchieve 100% completeness and integrity for migrated data, evidenced by control totals\nObtain data owner sign-off for every product before the system is opened for business\nKeep a full audit trail from legacy record to migrated record (legacy references kept as alternate keys)",
  "in_scope": "Key areas of migration and the tasks required to prepare and execute them\nStatic data (customers, reference and parameter data) and financial data (accounts, deposits, loans, limits, collateral, trade finance, treasury, general ledger balances)\nIssues that need attention for a successful migration\nMigration accounting, reconciliation approach and sign-off",
  "out_of_scope": "Decommissioning of the legacy core banking system\nBusiness cutover strategy (covered by the Cutover Strategy)\nOther systems interfaced to the legacy core (covered by the integration workstream)\nExisting takeover account and general ledger differences in the legacy system\nTransactions not authorised or on hold in the legacy system\nHistorical transactions (only balances and open items are migrated)\nAny process without defined business requirements",
  "assumptions": "Automated migration using the target system migration (bulk-load) tool is used for all high-volume data\nManual migration may be used where volumes are low or loading is complex, agreed with [Bank Name] in advance\nThe migration window is adequate for all migration processes to run in the allocated time\nProduction hardware and network performance is optimal for the migration processes\nNo historical transaction data is migrated\nBusiness data owners are available for verification and sign-off during every migration run",
  "constraints": "Financial data can only be migrated over a (long) weekend with the source system frozen\nBoth source and target systems are offline to customers from the final legacy close of business until reconciliation is complete\nTarget product conditions and parameters must be frozen before the final mock migration\nCustomers and regulators must be informed of the service outage in advance\nWhether a two-day weekend is enough, or extra days are needed, is decided during the mock migrations",
  "approach_description": "Two approaches were considered:\n\nBig bang — all branches and all products are migrated at once and the target system takes over completely from the go-live date. No parallel maintenance of the legacy system is needed.\n\nPhased — the migration happens at different times, by branch, product, module, entity or country instance, and the legacy system is maintained in parallel until the target has taken over completely.\n\n[Bank Name] will adopt the [Selected Approach] approach. Static data (customers, reference and parameter data) is loaded in an earlier window and any changes made in the legacy system afterwards (the delta) are loaded on the cutover weekend, before the financial data. The approach is confirmed during the mock migrations and dress rehearsals, as it depends on real volumes and the time available.\n\nData is extracted, verified and cleansed in a staging area — a replica of the legacy data together with the target parameter mapping — and loaded through the target migration tool. A migration control matrix lists every data file per data object, the record counts and the load sequence; it is updated after every load with records loaded against records expected. A timing log is kept for every load, including mocks and dress rehearsals, to inform the go-live plan. All loads use a dedicated migration user so the target audit trail identifies migrated data.\n\nThe options are illustrated in Annexure A (single window / big bang) and Annexure B (multi-window / phased).",
  "migration_stages": [
    "extract",
    "profile",
    "cleanse",
    "transform_map",
    "load",
    "validate",
    "reconcile",
    "sign_off"
  ],
  "stage_responsibilities": "Extract\tLegacy data extracted by a utility built by the extraction team, in the layout of the mapped data mapping sheet (DMS)\t[Bank Name] / [Legacy System Vendor]\nTransform\tData cleansed, enriched and converted in the staging area into the format the target accepts\t[Migration Partner]\nValidate (extracted files)\tExtracted files checked by the responsible business units before loading — cuts reconciliation time after the load\t[Bank Name] business units\nLoad\tValidated files loaded into the target; errors corrected and the corrected file reloaded\t[Migration Partner]\nValidate (loaded data)\tLoaded data reconciled against what was provided for upload\t[Bank Name] business units\nReconcile and sign off\tRaw data and functional reconciliation; each data owner signs off their product\t[Bank Name] data owners",
  "load_error_ownership": "Wrong extraction mapping or wrong legacy data\t[Bank Name] (extraction team and data owner)\nTarget build, parameter or configuration issue\t[Migration Partner] with the configuration team\nLoad tool or load script issue\t[Migration Partner]\nMissing target reference or parameter data\tConfiguration team\nEnvironment or infrastructure issue\tIT environments team",
  "migration_sequence": "[Entity or Instance 1]\tBig bang (all branches and products)\tMulti-window (static early, delta and financial on the cutover weekend)\t\n[Entity or Instance 2]\tBig bang (all branches and products)\tMulti-window (static early, delta and financial on the cutover weekend)\t",
  "runbooks": "Business migration runbook (non-technical)\tBusiness teams — follow and track the migration activities\t[Business Migration Lead]\tAppendix 6\nTechnical migration runbook\tMigration and IT teams — every load step, timing and check\t[Technical Migration Lead]\tAppendix 7\nMigration control matrix\tMigration team — data files, record counts and load sequence\t[Data Migration Lead]\tAppendix 5",
  "configuration_dependencies": "All parameter and core system tables updated on the target before the mock migrations start\nBank-level security set-up parameters\nUser roles and user profiles\nProduct catalogue: product lines, groups and products for accounts, deposits and lending\nMessaging and delivery parameters\nPurging and housekeeping parameters\nError codes\nAccount class classifications\nLimits attached to products\nTransaction codes\nSecurities, letter of credit and foreign exchange parameters\nOverdue status codes (ageing)\nMigration takeover accounts per product, per currency and per entity or instance",
  "system_readiness_checks": "Environment prerequisite checklist prepared by the data migration team and completed first in every migration environment\nNumber of processors in the target environment confirmed\nMaximum number of parallel load agents confirmed\nMigration user has full read and write access to the target environment\nNo records in exception or awaiting authorisation in the target\nTarget system date set for the migration weekend\nPre-migration backups taken and verified",
  "cutover_window_approach": "multi_window",
  "data_loaded_before_cutover": "Static reference and parameter data\nCustomers and customer relationships\nCollateral rights and collateral\nCustomer images, signatures and documents metadata\nSecurities master and securities customers\nUser groups and roles\nDelta load of static changes made in the legacy system after the early load (on the cutover weekend, before financial data)",
  "services_impacted": "Branch teller and back-office services\nInternet banking\nMobile banking\nATM and point-of-sale (stand-in processing only)\nPayment switch and real-time gross settlement\nCard authorisation (stand-in limits)\nSWIFT messaging (outgoing messages suppressed during the load)\nGeneral ledger extract to the finance system\nAnti-money-laundering transaction monitoring feed",
  "user_communication_required": true,
  "stakeholder_notifications": "Customers\tService outage dates, affected channels and what to do\t[Notice Period] before cutover\t[Communications Lead]\nRegulator / central bank\tSystem change and planned outage\tAs required by regulation\t[Compliance Lead]\nPayment switch, card schemes and correspondent banks\tOutage window and stand-in arrangements\t[Notice Period] before cutover\t[Operations Lead]\nStaff\tCutover timetable, freeze rules and first-day procedures\tTwo weeks before cutover\t[Change Manager]",
  "go_no_go_decision_points": "Static data loaded and reconciled\tAfter the static / delta load\t[Programme Director] and data owners\nFinancial data loaded\tAfter the financial data load\t[Programme Director] and [Financial Controller]\nReconciliation complete\tAfter raw data and functional reconciliation\tData owners, Finance and Internal Audit\nOpen for business\tBefore the first business day\t[Executive Sponsor]",
  "rollback_approach": "Go/no-go decision points are held after the static data load, after the financial data load and after reconciliation. If a decision point fails and cannot be resolved within the window, [Bank Name] falls back to [Legacy Core Banking System]: the legacy system is reopened from the frozen state at the final close of business, no transactions have been taken on the target, and target data is discarded. Full backups of source and target are taken before the load and retained until hypercare exit. Detailed steps are in the Rollback Plan.",
  "data_categories": [
    "master",
    "transactional",
    "reference",
    "balances",
    "documents",
    "users_security",
    "configuration"
  ],
  "data_objects": "Customers and customer relationships\nCustomer accounts and internal accounts\nTerm deposits and call / notice deposits\nLoans (including arrears and past dues)\nLimits and collateral\nBlocked funds and statement preferences\nStanding orders and sweeps\nCheques, drafts and stop-payment instructions\nCustomer images, signatures, mandates and KYC documents\nCards\nForeign exchange spot and forward deals\nLetters of credit, drawings and guarantees\nBills and securities\nMoney market placements and takings\nGeneral ledger and P&L balances\nUser profiles and user groups",
  "source_systems": "[Legacy Core Banking System] – [Entity or Instance 1]\n[Legacy Core Banking System] – [Entity or Instance 2]\nDocument imaging system (images, signatures and mandates)\nCard management system (card status cross-check)\nFinance and general ledger system (trial balance control totals)",
  "migration_tool": "Target system data migration (bulk-load) tool\nStaging database with validation scripts\nReconciliation workbook and comparison scripts",
  "estimated_record_volume": "Customers\t[Count]\nCustomer accounts\t[Count]\nTerm and notice deposits\t[Count]\nLoans\t[Count]\nLimits\t[Count]\nCollateral\t[Count]\nStanding orders\t[Count]\nCustomer images and signatures\t[Count]",
  "estimated_data_volume_gb": "[Entity or Instance 1] extract\t[Volume]\n[Entity or Instance 2] extract\t[Volume]\nImages and signatures\t[Volume]",
  "mock_runs_planned": "Mock 1\t\tStatic data and customers\nMock 2\t\tStatic and financial data, full reconciliation\nMock 3\t\tFull scope with production-sized volumes",
  "dress_rehearsals_planned": "Dress rehearsal 1\t\tFull go-live timeline, static window\nDress rehearsal 2\t\tFull go-live timeline, financial window\nDress rehearsal 3\t\tFinal timed rehearsal with business sign-off",
  "product_takeover_approach": "Each arrangement is migrated through a takeover step followed by balance capture, so the target records look as if they had been captured directly in the target system\nPrerequisites for arrangement-based products (accounts, deposits, loans): the complete product catalogue, customers and relationships, collateral and limits, and settlement accounts for automated repayments\nEvery data file contains all mandatory values, including target parameter values (e.g. sector and industry codes on customers); special characters not allowed by the load tool are removed at file level\nLegacy references are kept as alternate keys on every migrated record and used to link subsequent loads\nAccrued interest is migrated as at the cut-off date with the value date set to the migration date to avoid double accrual\nOverdue amounts are migrated as bills with their original due dates so ageing continues correctly\nEach load is checked and authorised before the next one starts\nDetailed rules for every product are recorded in the Data Scope register",
  "balance_reconciliation_by_product": true,
  "product_owner_signoff_required": true,
  "data_integrity_rules": "Restricted access to data from extraction through staging to the final load (authorised staff only)\nAll changes to data tracked through audit trails\nAll extract files backed up before migration and kept read-only as the source of verification\nReferential integrity checked against target master and parameter data\n100% successful load rate is the benchmark to proceed\nRecords read and written verified at every step with control totals\nCompleteness tests: control totals and amounts, omissions and incomplete fields, all legacy data accounted for in the target",
  "data_cleansing_approach": "Profile the legacy data to find records that break target validations that do not exist in the source\nCorrect inaccurate records at source wherever possible, owned by the business data owner\nRun de-duplication checks and remove duplicate customers and accounts\nCheck mandatory fields for completeness (industry, sector, customer status, account officer, nationality, residence)\nLog every cleansing issue found during analysis and mock runs and share it with [Bank Name] for action\nRe-run profiling after each mock migration until exceptions are closed",
  "data_standards": "Secure shared location for all legacy extracts and target extracts of loaded data, read-only for stakeholders\nOne record per line and one line per record\nPlain text extract files with no heading row\nFields separated by a pipe (|)\nMulti-values separated by a double colon (::)\nSub-values separated by a double exclamation mark (!!)\nData mapping sheets listed in Appendix 1; file names follow the migration control matrix (Appendix 5)",
  "load_file_conventions": "File format\tPlain text, one record per line, no heading row\nField separator\tPipe (|)\nMulti-value separator\tDouble colon (::)\nSub-value separator\tDouble exclamation mark (!!)\nDates\tYYYYMMDD\nAmounts\tNo thousands separators; decimal point\nFile name\t<entity>_<data object>_<YYYYMMDD>_<run number>.txt, as listed in the migration control matrix\nTarget extracts for reconciliation\tSame layout and delimiters as the load file",
  "data_quality_target": 100,
  "data_owner_signoff_required": true,
  "financial_impact": "General ledger balances fund product takeover accounts through journal capture; takeover accounts must return to zero as contracts are migrated\nThe legacy general ledger must be balanced; mismatches are resolved in the legacy system before the migration date\nInterest accrued in the legacy system is migrated and cancelled in P&L through adjusting entries so income and expense are not double counted\nSuspended interest and accruals are funded in the same takeover account to avoid a post-migration set-off\nTemporary migration suspense accounts exist only for the migration and are closed after reconciliation\nAny unexplained difference is posted to the take-on differences account and signed off by [Bank Name] as a known difference",
  "holding_account_reference": "[Category]\tTakeover suspense – customer accounts\n[Category]\tTakeover suspense – loans\n[Category]\tTakeover suspense – deposits\n[Category]\tTakeover accruals – accounts\n[Category]\tTakeover accruals – loans\n[Category]\tTakeover accruals – deposits\n[Category]\tTakeover suspended interest\n[Category]\tTakeover suspense – internal accounts\n[Category]\tTakeover suspense – nostro and vostro accounts\n[Category]\tTakeover suspense – P&L\n[Category]\tTake-on differences",
  "migration_accounting_entries": "Loans – principal (illustrative)\tLoan 1,000,000\tTakeover suspense – loans 1,000,000\tTake-on of current principal\nLoans – accrued interest\tLoan accrual 2,100\tTakeover accruals 2,100\tTake-on of accrued interest\nLoans – overdue bills\tOverdue principal 3,600; overdue interest 3; overdue penalty interest 40\tTakeover suspense – loans 3,643\tTake-on of overdue and due bills with original due dates\nLoans – suspended interest\tTakeover suspended interest 300\tTakeover accruals 300\tPost-migration set-off (or fund both in one takeover account)\nLoans – amortised fees (capture bill)\tFee due 260\tFee accrual 260\tUnamortised fee outstanding at migration\nLoans – amortised fees (adjust bill)\tTakeover suspense – loans 260\tFee due 260\tCustomer already settled the fee in the legacy system\nDeposits – principal\tTakeover suspense – deposits 5,000\tDeposit 5,000\tTake-on of deposit principal\nDeposits – accrued interest\tTakeover accruals 423\tDeposit interest accrual 423\tTake-on of accrued deposit interest\nCurrent account – debit balance\tCustomer account 500,000\tTakeover suspense – accounts 500,000\tOverdrawn balance taken on\nSavings account – lowest balance split\tTakeover suspense – accounts 55,250\tSavings account 55,000 (migration date) and 250 (last accrual date)\tMid-month migration where interest is paid on the lowest balance\nAccounts – accrued debit interest\tAccount accrual 252\tTakeover accruals 252\tTake-on of accrued debit interest\nAccounts – accrued credit interest\tTakeover accruals 498\tAccount accrual 498\tTake-on of accrued credit interest\nP&L balances\tP&L takeover account / P&L lines\tP&L lines / P&L takeover account\tEach P&L line migrated against the P&L takeover account (P&L category mapping required)\nInternal accounts\tInternal takeover account / internal accounts\tInternal accounts / internal takeover account\tSame mapping as the internal account static extract",
  "suspense_closure_days": 7,
  "take_on_differences_account": "[Take-on Differences Account]",
  "regulatory_reporting_impacted": true,
  "ifrs9_impact": true,
  "ifrs9_data_carried_over": "Credit risk stage (1, 2 or 3) per loan\nDays past due per bill\nProvision and impairment balances\nRestructured and forborne flags\nRisk grade at origination and current risk grade\nContracts updated for cashflow (IFRS 9) reporting through the takeover cashflow-reporting step of each product line, before go-live",
  "reconciliation_approach": "Top-down: reconcile at summary level first (entities, data classes, control totals), then investigate at detailed and transaction level where differences or risks appear\nCompare migrated data with source data after every stage, using automated comparison where possible (spreadsheets, SQL queries, legacy reports)\nRaw data reconciliation (record counts, rejected records summary and detail, balances summary and detail) and functional reconciliation (business validation using target system reports)\nTarget raw data extracts provided after every successful load in the same layout and delimiters as the load files, for electronic comparison\nGeneral ledger, loan and deposit balances reconciled before the system goes live\nReconciliation is the responsibility of [Bank Name]; each data owner signs off using the data hand-off control form (Annexure C)",
  "reconciliation_levels": [
    "record_counts",
    "value_totals",
    "ledger_level",
    "entity_level",
    "sample_checks",
    "business_validation",
    "raw_data",
    "functional"
  ],
  "reconciliation_tolerance": 0,
  "pre_migration_tasks": "All parameter tables aligned and frozen on the target\nAll services and interfaces stopped\nComplete pre-migration system and data backups taken separately\nCurrency rates updated in the target system\nOutgoing advices and messages suppressed\nLegacy close of business completed and data frozen\nControl totals from the legacy trial balance provided by Finance\nPre-migration checklist completed (Appendix 9)",
  "post_migration_tasks": "Complete post-migration system and data backups taken separately\nAdvices generated during migration cleared before any service starts; suppressed messages re-enabled\nPost-migration checklist completed (Appendix 10)\nAll services and interfaces restarted\nFirst close of business run to move to the next working day\nMigration suspense and takeover accounts confirmed at zero\nTemporary migration users disabled\nHypercare defect triage started",
  "overall_risk_rating": "high",
  "risks_mitigations": "Target environments not available on time\tScheduled tasks delayed, impacting the timeline\tAgree environment dates with IT and track them weekly; book pre-production for all dress rehearsals\nDelays in data verification by the business\tLoading delayed, impacting the migration timeline\tName and release verifiers per data object and give them verification tools before each mock\nData verification issues\tDelays in loading, or inaccurate data loaded\tCheck and sign off all data before loading; stop the load if control totals do not match\nMigration overruns the go-live window\tGo-live delayed or fallback to the legacy system\tTune parallel load agents, pre-load static data early and rehearse the timeline\nCustomer data quality below target\tFailed statements and gaps in regulatory reporting\tBusiness cleansing sprint with weekly progress against target\nUnreconciled balances at go/no-go\tGo-live decision cannot be taken; risk of financial misstatement\tZero-tolerance reconciliation with Finance present on the weekend; fallback plan ready",
  "parties_involved": [
    "business_units",
    "it",
    "finance",
    "risk_compliance",
    "internal_audit",
    "target_vendor",
    "source_vendor",
    "migration_partner"
  ],
  "migration_participants": "Project manager\t[Migration Partner]\nData migration consultant\t[Migration Partner]\nBusiness consultants (if required)\t[Migration Partner]\nProject manager\t[Bank Name]\nData migration team leader\t[Bank Name]\nIT staff extracting data from the legacy system\t[Bank Name] / [Legacy System Vendor]\nIT staff administering the target environments\t[Bank Name]\nBusiness owners for products (functional team leaders)\t[Bank Name]\nInternal Audit representative\t[Bank Name]\nRisk and Compliance representative\t[Bank Name]\nFinance representative\t[Bank Name]\nData cleansing and enrichment teams\t[Bank Name]\nReconciliation teams\t[Bank Name]\nData analyst (completeness, accuracy and integrity of extracted and loaded data)\t[Bank Name]",
  "roles_responsibilities": "Programme director\tOverall accountability and go/no-go decisions\t[Name]\nData migration lead\tStrategy, plan, runbooks and load execution\t[Name]\nData migration consultant (partner)\tMapping, load tooling and timing\t[Name]\nBusiness data owners\tData cleansing, verification and product sign-off; accept or raise gaps\t[Name]\nData analyst\tAnalyse extracted and loaded data; confirm completeness, accuracy and integrity\t[Name]\nLead – data extraction\tLegacy extraction utilities and extract files\t[Name]\nLead – data upload\tLoads into the target and load error handling\t[Name]\nFinancial controller\tControl totals, migration accounting and general ledger reconciliation\t[Name]\nIT environments lead\tEnvironments, backups and system readiness\t[Name]\nTest manager\tMock migration and dress rehearsal test evidence\t[Name]\nRisk and compliance\tData protection and regulatory notification\t[Name]\nInternal audit\tIndependent assurance of controls and sign-off\t[Name]",
  "environments": [
    "development",
    "sit",
    "uat",
    "staging",
    "pre_production",
    "production"
  ],
  "environment_management": "Development\tMapping and load script build\nStaging (transformation)\tReplica of legacy data with target parameter mapping; cleansing and transformation\nSystem integration test\tMock 1 and Mock 2\nUser acceptance test\tBusiness verification of mock migration data\nPre-production\tFinal mock and all dress rehearsals with production-sized volumes\nProduction\tFinal migration windows\nAll environments\tCreation, refresh and turnaround times as per the environment management document (Appendix 3)",
  "glossary": "Alternate key\tLegacy reference stored on the migrated record and used to find it and link later loads\nBIC\tBank identifier code (SWIFT directory)\nBSU\tBusiness support unit\nCapture balance\tLoad step that posts current balances and accruals to a migrated arrangement\nCapture bill\tLoad step that posts overdue and due bills with their original dates and ageing\nCoB\tClose of business – end-of-day processing that moves the system to the next working day\nDC\tData capture (manual journal entry)\nDelta load\tLoad of static changes made in the legacy system after the early static load\nDES\tData extract specification\nDM\tData migration\nDMD\tData mapping definition\nDMS\tData mapping sheet – source-to-target field mapping for one data object\nDress rehearsal\tFull, timed run of the go-live migration in a production-like environment\nECL\tExpected credit loss (IFRS 9)\nEoD / EoM\tEnd of day / end of month\nETL\tExtract, transform and load\nFT\tFunds transfer\nFX\tForeign exchange\nGL\tGeneral ledger\nGo / no-go\tDecision point at which named representatives confirm a stage is complete before the next starts\nHypercare\tPeriod of heightened support after go-live\nKYC\tKnow your customer\nLC\tLetter of credit\nLCY / FCY\tLocal currency / foreign currency\nMCM\tMigration control matrix – data files, record counts and load sequence\nMock migration\tTrial migration run used to test mapping, timing and reconciliation\nNostro / vostro\tThe bank’s account held with another bank / another bank’s account held with the bank\nP&L\tProfit and loss\nStaging\tEnvironment where legacy data is cleansed and transformed before loading\nSTO\tStanding order\nToA\tTakeover account – account funded with GL balances and used as the contra for migrated balances",
  "appendices": "Appendix 1 – List of data mapping sheets (DMS)\t[Reference]\nAppendix 2 – Data hand-off control form\tAnnexure C (attached)\nAppendix 3 – Environment management document\t[Reference]\nAppendix 4 – RACI matrix\tAnnexure D (attached)\nAppendix 5 – Migration control matrix and load file naming convention\t[Reference]\nAppendix 6 – Business migration runbook\t[Reference]\nAppendix 7 – Technical migration runbook\t[Reference]\nAppendix 8 – Project schedule baseline\t[Reference]\nAppendix 9 – Pre-migration checklist\t[Reference]\nAppendix 10 – Post-migration checklist\t[Reference]\nAppendix 11 – Attributes updated manually after migration\t[Reference]\nAppendix 12 – Cutover timeline: single window / big bang option\tAnnexure A (attached)\nAppendix 13 – Cutover timeline: multi-window / phased option\tAnnexure B (attached)",
  "notes": "This document was created from the Core Banking System DMSD template. Replace every bracketed placeholder and remove the product areas that do not apply\nAnnexures A–D (cutover diagrams, data hand-off control form, RACI matrix) are attached on the Attachments tab",
  "approvals": "Programme / Projects\t[Name]\t[Role]\t\nFinance\t[Name]\t[Role]\t\nRetail / Personal Banking\t[Name]\t[Role]\t\nBusiness Banking\t[Name]\t[Role]\t\nCorporate Banking\t[Name]\t[Role]\t\nCredit Operations\t[Name]\t[Role]\t\nReconciliations\t[Name]\t[Role]\t\nRisk and Compliance\t[Name]\t[Role]\t\nData Management\t[Name]\t[Role]\t\n[Migration Partner]\t[Name]\tData Migration Consultant\t\n[Migration Partner]\t[Name]\tProject Manager\t",
  "version_history": "0.1\t\t[Author]\tCreated from the Core Banking System DMSD template",
  "products_in_scope": [
    "customers_individual_and_corporate",
    "current_and_savings_accounts",
    "term_fixed_deposits",
    "loans_and_lending_arrangements",
    "legacy_loans_and_arrears_past_dues",
    "internal_office_accounts",
    "nostro_vostro_accounts",
    "dormant_and_inactive_accounts",
    "credit_limits_and_facilities",
    "collateral_and_collateral_rights",
    "blocked_held_funds_liens",
    "statement_preferences",
    "standing_orders",
    "sweeps_and_cash_pooling",
    "cheques_drafts_and_stop_payment_instructions",
    "customer_images_signatures_and_mandates",
    "cards_debit_credit_prepaid",
    "treasury_fx_spot_and_forward_deals",
    "money_market_placements_and_borrowings",
    "letters_of_credit_issued_and_advised",
    "lc_drawings_settlements",
    "bank_guarantees_issued",
    "bills_for_collection_discounting",
    "securities_custody_accounts",
    "securities_master_instruments",
    "general_ledger_pandl_and_customer_balances",
    "uncleared_balances_items_in_transit",
    "teller_ids_tills_and_teller_cash_accounts",
    "customer_delivery_addresses_and_advice_preferences",
    "bank_identifier_codes_bic_swift_directory",
    "user_profiles_user_groups_and_access_rights",
    "custom_tables_and_templates",
    "static_reference_data_branches_currencies_rates_holidays"
  ]
}$cbs$::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name               = EXCLUDED.name,
  description        = EXCLUDED.description,
  record_title       = EXCLUDED.record_title,
  record_description = EXCLUDED.record_description,
  record_status      = EXCLUDED.record_status,
  version            = public.local_register_templates.version
                       + CASE WHEN public.local_register_templates.field_values IS DISTINCT FROM EXCLUDED.field_values THEN 1 ELSE 0 END,
  field_values       = EXCLUDED.field_values,
  is_archived        = FALSE,
  updated_at         = NOW();

DELETE FROM public.local_register_template_children WHERE template_id = '00000000-0000-4000-b341-000000000001'::uuid;

INSERT INTO public.local_register_template_children
  (template_id, link_field_key, register_key, sort_order, title, description, status, field_values)
SELECT '00000000-0000-4000-b341-000000000001'::uuid, 'product_takeover_details', 'fin_data_scope', c.ord::int,
       c.e ->> 'title', c.e ->> 'description', c.e ->> 'status', c.e -> 'field_values'
FROM jsonb_array_elements($cbs$[
  {
    "title": "Customers",
    "description": "Individual and corporate customers with their relationships; loaded in the static window with a delta load on the cutover weekend.",
    "status": "in_scope",
    "field_values": {
      "product_area": "customers_individual_and_corporate",
      "migration_strategy_reference": "[Document Reference] §4.1",
      "legacy_source_module": "[Legacy Core Banking System] – customer master",
      "target_module": "Customer",
      "migration_wave": "Window 1 – static data (delta on the cutover weekend)",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "shared",
      "scope_criteria": "All active customers\nCustomers with at least one open account, contract, limit or collateral",
      "inclusion_rules": "All relevant customer records\nCustomer relationships (joint, guarantor, related party)",
      "exclusion_rules": "Customers with no open products and no activity for [Retention Period] (archived separately)",
      "numbering_key_rules": "Target customer numbers generated in advance to the bank standard\nLegacy customer number stored in a local reference field defined as the alternate key\nWhere the same number exists in two entities or instances, new numbers are issued and the old numbers kept as alternate keys\nWhere one customer has several numbers, the record with the most complete KYC data is kept",
      "target_setup_prerequisites": "Industry, sector, customer status, account officer, target market, nationality, residence and segmentation tables loaded first",
      "migration_steps": "1\tCustomers\tCustomer DMS\tAll customers\n2\tCustomer relationships\tCustomer relationship DMS\tJoint, guarantor and related parties\n3\tDelta customers and changes\tCustomer DMS\tChanges after the static load",
      "data_dependencies": "Static reference data",
      "reconciliation_checks": "Record counts per entity and customer type\nMandatory field completeness\nSample of customers verified field by field",
      "balance_reconciliation_required": false,
      "pre_migration_actions": "De-duplicate and merge customers in staging",
      "post_migration_actions": "Verify customer short names (mnemonics) and segmentation against the agreed matrix"
    }
  },
  {
    "title": "Current and savings accounts",
    "description": "Current and savings accounts migrated through a takeover arrangement and balance capture in up to five steps.",
    "status": "in_scope",
    "field_values": {
      "product_area": "current_and_savings_accounts",
      "migration_strategy_reference": "[Document Reference] §4.2",
      "legacy_source_module": "[Legacy Core Banking System] – accounts",
      "target_module": "Accounts",
      "migration_wave": "Window 2 – financial data (cutover weekend)",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "shared",
      "scope_criteria": "Customer account categories [Category Range]",
      "inclusion_rules": "Open accounts with or without balances\nAccounts with posting restrictions that still hold balances",
      "exclusion_rules": "Closed accounts\nAccounts marked for closure with no balance",
      "numbering_key_rules": "Legacy account numbers retained where they fit the target format\nOtherwise new numbers are issued to the bank standard and the legacy number kept as the alternate key\nThe standard clearing account number is migrated as an alternate account ID",
      "restrictions_carried_over": "Posting restrictions and their narratives",
      "target_setup_prerequisites": "Account product conditions (interest, charges, statements, dormancy, closure, facilities) configured",
      "freeze_rules": "No account closures in the week before go-live",
      "migration_steps": "1\tTakeover arrangement – customer, currency, alternate ID, limit, debit/credit interest conditions, product\tAccount takeover DMS\tAll accounts\n2\tCurrent balances, accrued debit and credit interest, charges and taxes\tAccount capture balance DMS\tAccounts with balances\n3\tMove the account to suspend interest\tAccount suspend DMS\tAccounts suspending interest\n4\tCurrent accruals against each balance type\tAccount capture accruals DMS\tAccounts with accruals\n5\tLowest balance for the period, value-dated at the last accrual date (contra = takeover account)\tFunds transfer DMS\tSavings accounts paying interest on the lowest balance, migrated mid-month",
      "data_dependencies": "Customers\nLimits\nCollateral",
      "balance_cutoff_rule": "Balances after all transactions on the last business day and the final legacy close of business on the eve of the cutover weekend.",
      "uncleared_items_treatment": "Uncleared balances migrated with the value date of the legacy entry (see Uncleared balances).",
      "accounting_entries": "Takeover suspense – accounts\tCustomer account\tCredit balances taken on\nCustomer account\tTakeover suspense – accounts\tDebit balances taken on\nTakeover accruals\tAccount accrual\tAccrued credit interest taken on\nAccount accrual\tTakeover accruals\tAccrued debit interest taken on",
      "reconciliation_checks": "Account counts per product and currency\nBalance totals per product and currency against the legacy trial balance\nAccrued interest totals",
      "balance_reconciliation_required": true,
      "special_conditions": "Lowest balance example: balance 1,000 at cut-off and lowest balance 200 for the period — 200 migrated with the last accrual date, 800 with the migration date\nNo split is needed when migration happens at month end\nDormancy for arrangement accounts updated during the takeover step"
    }
  },
  {
    "title": "Term and call deposits",
    "description": "Fixed, call and notice deposits migrated in three steps: takeover arrangement, capture balances and accruals, adjust expected principal.",
    "status": "in_scope",
    "field_values": {
      "product_area": "term_fixed_deposits",
      "migration_strategy_reference": "[Document Reference] §4.3",
      "legacy_source_module": "[Legacy Core Banking System] – deposits / money market",
      "target_module": "Deposits",
      "migration_wave": "Window 2 – financial data (cutover weekend)",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "shared",
      "scope_criteria": "All running fixed, call and notice deposits",
      "inclusion_rules": "Running deposits with principal and accrued interest",
      "exclusion_rules": "Matured deposits still carrying balances (unless the maturity date is moved to the migration date so they mature again at the first close of business)",
      "numbering_key_rules": "New deposit numbers generated; legacy deposit reference kept as the alternate key and used to link subsequent loads",
      "migration_steps": "1\tTakeover arrangement – customer, currency, alternate ID, interest conditions, product, amount\tDeposit takeover DMS\tAll deposits\n2\tCurrent principal and accrued interest (value date = migration date)\tDeposit capture balances DMS\tAll deposits\n3\tAdjust expected principal (deposit already funded)\tDeposit adjust balances DMS\tAll deposits",
      "data_dependencies": "Customers\nSettlement accounts",
      "special_conditions": "Interest due on the migration date is capitalised or paid to the customer account in the legacy system before the freeze",
      "accounting_entries": "Takeover suspense – deposits\tDeposit\tPrincipal taken on (e.g. 5,000)\nTakeover accruals\tDeposit interest accrual\tAccrued interest taken on (e.g. 423)",
      "reconciliation_checks": "Deposit counts per product and tenor\nPrincipal and accrued interest totals",
      "balance_reconciliation_required": true
    }
  },
  {
    "title": "Loans",
    "description": "Loans migrated in up to nine steps; the steps used for each loan depend on its data and stage in the life cycle.",
    "status": "in_scope",
    "field_values": {
      "product_area": "loans_and_lending_arrangements",
      "migration_strategy_reference": "[Document Reference] §4.4",
      "legacy_source_module": "[Legacy Core Banking System] – loans",
      "target_module": "Lending",
      "migration_wave": "Window 2 – financial data (cutover weekend)",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "shared",
      "scope_criteria": "All running loans, including matured loans with overdue bills",
      "inclusion_rules": "Current principal, overdue and due bills, accrued interest, penalty interest, unamortised fees, charges and taxes",
      "numbering_key_rules": "New loan numbers generated; legacy reference kept as the alternate key and used in every subsequent load",
      "target_setup_prerequisites": "Lending products, payment schedules, overdue (ageing) set-up and takeover accounts",
      "freeze_rules": "Legacy loan issues resolved before the migration date",
      "migration_steps": "1\tTakeover arrangement – customer, currency, alternate ID, limit, interest conditions, product, amount\tLending takeover DMS\tAll loans\n2\tCurrent principal\tLending capture balances (principal) DMS\tAll loans\n3\tOverdue and due bills with ageing\tLending capture bills DMS\tLoans with arrears or bills due on the migration date\n4\tUnamortised fees\tLending capture bills (amortised) DMS\tProducts that amortise fees\n5\tManual suspension (overrides arrears-based ageing)\tLending manual suspend DMS\tLoans manually suspended in the legacy system\n6\tCurrent interest accruals (value date = migration date)\tLending capture accruals DMS\tLoans with accruals\n7\tAdjust outstanding commitment\tLending adjust balances DMS\tAll loans\n8\tFuture repayment holidays\tLending payment holiday DMS\tLoans with approved repayment holidays\n9\tAdjust amortised fee bills against the takeover account\tLending adjust bills (amortised) DMS\tLoans from step 4",
      "data_dependencies": "Customers\nLimits\nCollateral\nSettlement accounts",
      "special_conditions": "Payment schedules that differ from the product must be given in the data file\nAll target default values are provided in the data file\nAutomated repayments start once the settlement accounts are set at takeover\nOne repayment account per customer per currency; other repayment accounts remapped",
      "accounting_entries": "Loan\tTakeover suspense – loans\tPrincipal taken on\nLoan accrual\tTakeover accruals\tAccrued interest taken on\nOverdue principal and interest\tTakeover suspense – loans\tOverdue bills taken on\nTakeover suspense – loans\tFee due\tAmortised fee bill settled at migration",
      "reconciliation_checks": "Loan counts per product\nPrincipal, overdue and accrued totals\nAgeing buckets compared with the legacy system",
      "balance_reconciliation_required": true
    }
  },
  {
    "title": "Loan arrears and past dues",
    "description": "Past-due amounts migrated as bills with original due dates so ageing and suspended interest continue correctly.",
    "status": "in_scope",
    "field_values": {
      "product_area": "legacy_loans_and_arrears_past_dues",
      "migration_strategy_reference": "[Document Reference] §4.5",
      "legacy_source_module": "[Legacy Core Banking System] – past dues",
      "target_module": "Lending – bills and ageing",
      "migration_wave": "Window 2 – financial data (cutover weekend)",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "shared",
      "inclusion_rules": "All past dues for loans being migrated\nArrears on matured loans (the loan is marked expired automatically by the target)",
      "migration_steps": "1\tBills with original due dates and ageing status\tLending capture bills DMS\tAfter the loan current balance is loaded",
      "data_dependencies": "Loans",
      "special_conditions": "Past-due date captured as the bill date\nAgeing performed automatically by the target overdue set-up\nSuspended interest exceptions sent in a separate file",
      "accounting_entries": "Overdue principal, interest and penalty interest\tTakeover suspense – loans\tOverdue bills taken on",
      "reconciliation_checks": "Bill counts and amounts per ageing bucket",
      "balance_reconciliation_required": true
    }
  },
  {
    "title": "Internal accounts",
    "description": "Internal accounts, including the migration takeover suspense accounts and branch vaults, created with numbers provided in the data file.",
    "status": "in_scope",
    "field_values": {
      "product_area": "internal_office_accounts",
      "migration_strategy_reference": "[Document Reference] §4.6",
      "legacy_source_module": "[Legacy Core Banking System] – internal accounts",
      "target_module": "Internal accounts",
      "migration_wave": "Window 2 – financial data (cutover weekend)",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "bank",
      "numbering_key_rules": "Internal account numbers are not generated by the target; they are provided in the data file in the format currency-category-subdivision-branch (e.g. USD-<category>-0001-0001)\nIf the category or department changes, the old number is kept in a local reference field",
      "migration_steps": "1\tInternal accounts including takeover suspense accounts\tInternal account DMS\tAll internal accounts\n2\tBalances posted through the general ledger load against the takeover accounts\tGeneral ledger balances DMS\tAccounts with balances",
      "special_conditions": "Customer-like internal accounts moved to customer accounts before the migration date\nTakeover suspense accounts flagged for high-volume posting where the target requires it",
      "accounting_entries": "Internal takeover account / internal accounts\tInternal accounts / internal takeover account\tEach internal account balance migrated against the internal takeover account",
      "balance_reconciliation_required": true
    }
  },
  {
    "title": "Nostro and vostro accounts",
    "description": "Nostro and vostro accounts migrated with their balances against the account takeover suspense account.",
    "status": "in_scope",
    "field_values": {
      "product_area": "nostro_vostro_accounts",
      "migration_strategy_reference": "[Document Reference] §4.7",
      "legacy_source_module": "[Legacy Core Banking System] – nostro and vostro accounts",
      "target_module": "Accounts / internal accounts",
      "migration_wave": "Window 2 – financial data (cutover weekend)",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "bank",
      "numbering_key_rules": "Account numbers retained; legacy number kept as the alternate key if it changes",
      "migration_steps": "1\tNostro and vostro accounts\tAccount takeover DMS\tAll nostro and vostro accounts\n2\tBalances and accrued interest\tAccount capture balance DMS\tAccounts with balances",
      "special_conditions": "Example: total balances of 10,000 fund the takeover account; each account is then posted against it until the takeover account is zero",
      "accounting_entries": "Takeover suspense – nostro and vostro\tAccount\tCredit balances taken on\nAccount\tTakeover suspense – nostro and vostro\tDebit balances taken on",
      "reconciliation_checks": "Balances per account and currency agreed to the correspondent statements",
      "balance_reconciliation_required": true
    }
  },
  {
    "title": "Dormant and inactive accounts",
    "description": "Last customer credit and debit dates migrated so the target marks dormancy and inactivity correctly at the first close of business.",
    "status": "in_scope",
    "field_values": {
      "product_area": "dormant_and_inactive_accounts",
      "migration_strategy_reference": "[Document Reference] §4.8",
      "legacy_source_module": "[Legacy Core Banking System] – accounts – dormancy dates",
      "target_module": "Accounts – dormancy",
      "migration_wave": "Window 2 – financial data (cutover weekend)",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "bank",
      "inclusion_rules": "Account number, last customer credit date and last customer debit date",
      "special_conditions": "If the dates are not loaded, every account is marked inactive at the first close of business\nAccounts dormant beyond [Dormancy Closure Period] are closed (unclaimed balances transferred) before migration\nThresholds: inactive after [Inactive Period], dormant after [Dormant Period]",
      "target_setup_prerequisites": "Dormancy set-up on account products",
      "migration_steps": "1\tLast customer credit and debit dates\tAccount dormancy DMS\tNon-arrangement accounts\n2\tDormancy status\tAccount takeover DMS (context fields)\tArrangement accounts"
    }
  },
  {
    "title": "Limits",
    "description": "All outstanding limits migrated with the original sanctioned amount before accounts and loans are taken over.",
    "status": "in_scope",
    "field_values": {
      "product_area": "credit_limits_and_facilities",
      "migration_strategy_reference": "[Document Reference] §4.9",
      "legacy_source_module": "[Legacy Core Banking System] – limits",
      "target_module": "Limits",
      "migration_wave": "Window 2 – before accounts and loans",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "bank",
      "migration_steps": "1\tProduct limits with sanctioned amount\tLimits (product) DMS\tLoans\n2\tOverdraft limits\tLimits (overdraft) DMS\tAccounts with overdrafts",
      "special_conditions": "Available amounts recalculated by the target as contracts are migrated\nGlobal limits created for multi-purpose credit lines\nExpired limits cannot be loaded: renew them in the legacy system or load with expiry = migration date + 1 day (original expiry kept in a local field), or leave them out — decided by [Bank Name]\nTemporary limits: approach confirmed after the build",
      "numbering_key_rules": "Target limit identifiers; legacy reference kept as the alternate key",
      "target_setup_prerequisites": "Limit parameters and limit references set up",
      "reconciliation_checks": "Limit counts and sanctioned totals; utilisation after the contract loads"
    }
  },
  {
    "title": "Collateral rights and collateral",
    "description": "Collateral rights loaded first, then collateral items, as static data before loans.",
    "status": "in_scope",
    "field_values": {
      "product_area": "collateral_and_collateral_rights",
      "migration_strategy_reference": "[Document Reference] §4.10",
      "legacy_source_module": "[Legacy Core Banking System] – collateral",
      "target_module": "Collateral",
      "migration_wave": "Window 1 – static data (delta on the cutover weekend)",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "bank",
      "migration_steps": "1\tCollateral rights\tCollateral right DMS\tAll collateral\n2\tCollateral (customer number, limit reference and collateral details)\tCollateral DMS\tAll collateral",
      "numbering_key_rules": "Collateral right ID = customer number.serial\nCollateral ID = customer number.serial.serial",
      "target_setup_prerequisites": "Collateral right and collateral type set-up",
      "manual_updates_after_migration": "Legacy user-defined collateral attributes with no target mapping, updated by the business after migration (Appendix 11)",
      "data_dependencies": "Customers\nLimits"
    }
  },
  {
    "title": "Blocked funds",
    "description": "Blocked and frozen amounts migrated with their narratives after customers and accounts are reconciled.",
    "status": "in_scope",
    "field_values": {
      "product_area": "blocked_held_funds_liens",
      "migration_strategy_reference": "[Document Reference] §4.11",
      "legacy_source_module": "[Legacy Core Banking System] – locked amounts",
      "target_module": "Account locks",
      "migration_wave": "Window 2 – after accounts",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "bank",
      "data_dependencies": "Customer accounts reconciled and authorised",
      "numbering_key_rules": "New lock IDs; legacy reference kept as the alternate key",
      "restrictions_carried_over": "Lock narratives and reasons",
      "migration_steps": "1\tBlocked and frozen amounts\tLocked events DMS\tAccounts with blocks"
    }
  },
  {
    "title": "Statement frequency",
    "description": "Only accounts whose statement frequency differs from the product default are migrated.",
    "status": "in_scope",
    "field_values": {
      "product_area": "statement_preferences",
      "migration_strategy_reference": "[Document Reference] §4.12",
      "legacy_source_module": "[Legacy Core Banking System] – account statements",
      "target_module": "Account statements",
      "migration_wave": "Window 2 – after accounts",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "bank",
      "inclusion_rules": "Accounts with a non-default statement frequency",
      "exclusion_rules": "Accounts following the product default (set automatically)",
      "special_conditions": "Frequencies mapped to the new account numbers where numbers change"
    }
  },
  {
    "title": "Standing orders",
    "description": "All live standing orders migrated after accounts.",
    "status": "in_scope",
    "field_values": {
      "product_area": "standing_orders",
      "migration_strategy_reference": "[Document Reference] §4.13",
      "legacy_source_module": "[Legacy Core Banking System] – standing orders",
      "target_module": "Standing orders",
      "migration_wave": "Window 2 – after accounts",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "bank",
      "inclusion_rules": "All standing orders in the live file",
      "special_conditions": "Next execution date must be after the migration date",
      "data_dependencies": "Customer accounts",
      "migration_steps": "1\tStanding order instructions\tStanding order DMS\tAll live standing orders"
    }
  },
  {
    "title": "Sweeps",
    "description": "Sweep instructions for active accounts migrated after the accounts.",
    "status": "in_scope",
    "field_values": {
      "product_area": "sweeps_and_cash_pooling",
      "migration_strategy_reference": "[Document Reference] §4.14",
      "legacy_source_module": "[Legacy Core Banking System] – account sweeps",
      "target_module": "Sweeps",
      "migration_wave": "Window 2 – after accounts",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "bank",
      "inclusion_rules": "Sweep instructions on active accounts",
      "data_dependencies": "Customer accounts",
      "migration_steps": "1\tSweep instructions\tSweeps DMS\tActive accounts with sweeps"
    }
  },
  {
    "title": "Cheques, drafts and stop instructions",
    "description": "Active cheque books, cheques presented, stop-payment instructions and active banker’s cheque orders.",
    "status": "in_scope",
    "field_values": {
      "product_area": "cheques_drafts_and_stop_payment_instructions",
      "migration_strategy_reference": "[Document Reference] §4.15",
      "legacy_source_module": "[Legacy Core Banking System] – cheques",
      "target_module": "Cheques",
      "migration_wave": "Window 2 – after accounts",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "bank",
      "inclusion_rules": "Active cheque books (last active cheque order per account)\nCheques presented for the active cheque books\nAll stop-payment instructions\nActive banker’s cheque orders",
      "special_conditions": "Cheque register updated with the last sequence number, start and end series and leaves used",
      "target_setup_prerequisites": "Cheque types and cheque statuses finalised",
      "migration_steps": "1\tCheque books issued\tCheque issue DMS\tActive cheque books\n2\tCheques presented\tCheques presented DMS\tActive cheque books\n3\tStop-payment instructions\tPayment stop DMS\tAll stops"
    }
  },
  {
    "title": "Customer images, signatures, mandates and KYC documents",
    "description": "Image and document metadata migrated to the target; the physical files are moved to the agreed storage location.",
    "status": "in_scope",
    "field_values": {
      "product_area": "customer_images_signatures_and_mandates",
      "migration_strategy_reference": "[Document Reference] §4.16",
      "legacy_source_module": "Document imaging system",
      "target_module": "Imaging",
      "migration_wave": "Window 1 – static data (delta on the cutover weekend)",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "bank",
      "inclusion_rules": "Signatures, photos, mandates and customer KYC documents with their references",
      "exclusion_rules": "Transactional documents (e.g. credit documents) that stay in the document management system",
      "special_conditions": "Moving the physical image files to the storage location is the responsibility of [Bank Name]",
      "target_setup_prerequisites": "Image and document types set up; storage location decided",
      "migration_steps": "1\tImage and document metadata\tDocument image DMS\tAll customers with images\n2\tDocument uploads\tDocument upload DMS\tAll customers with images"
    }
  },
  {
    "title": "Cards",
    "description": "Where cards are managed in a separate card management system, the target connects through an interface and no data is migrated.",
    "status": "in_scope",
    "field_values": {
      "product_area": "cards_debit_credit_prepaid",
      "migration_strategy_reference": "[Document Reference] §4.17",
      "legacy_source_module": "Card management system",
      "target_module": "Cards interface",
      "migration_wave": "Not applicable",
      "migration_method": "interface_api_no_migration",
      "responsible_party": "target_system_vendor",
      "special_conditions": "Interface / API development managed by the technical stream\nIf cards are held in the legacy core instead, migrate active cards after accounts and leave out cards expired or expiring on the migration date",
      "target_setup_prerequisites": "Card statuses and card charges set up before the cutover weekend"
    }
  },
  {
    "title": "FX spot and forward deals",
    "description": "Unmatured foreign exchange contracts loaded with their original value dates.",
    "status": "in_scope",
    "field_values": {
      "product_area": "treasury_fx_spot_and_forward_deals",
      "migration_strategy_reference": "[Document Reference] §4.18",
      "legacy_source_module": "[Legacy Core Banking System] – foreign exchange",
      "target_module": "Treasury – foreign exchange",
      "migration_wave": "Window 2 – financial data (cutover weekend)",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "bank",
      "inclusion_rules": "Contracts not matured on the migration date\nSplit contracts only where both legs are unmatured",
      "special_conditions": "Currency rates updated before the load\nSWIFT message generation suppressed during the load",
      "numbering_key_rules": "Legacy deal number stored as the replaced deal number"
    }
  },
  {
    "title": "Money market placements and takings",
    "description": "Interbank placements and takings stay in the money market module; customer deposits move to the deposits module.",
    "status": "in_scope",
    "field_values": {
      "product_area": "money_market_placements_and_borrowings",
      "migration_strategy_reference": "[Document Reference] §4.19",
      "legacy_source_module": "[Legacy Core Banking System] – money market",
      "target_module": "Treasury – money market",
      "migration_wave": "Window 2 – financial data (cutover weekend)",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "bank",
      "special_conditions": "Start date = legacy value date; principal as at the migration date",
      "numbering_key_rules": "New IDs; legacy reference kept as the alternate key",
      "balance_reconciliation_required": true
    }
  },
  {
    "title": "Letters of credit",
    "description": "Issued and advised letters of credit migrated with the net outstanding amount; unpaid and unmatured drawings migrated separately.",
    "status": "in_scope",
    "field_values": {
      "product_area": "letters_of_credit_issued_and_advised",
      "migration_strategy_reference": "[Document Reference] §4.20",
      "legacy_source_module": "[Legacy Core Banking System] – letters of credit",
      "target_module": "Trade finance – letters of credit",
      "migration_wave": "Window 2 – financial data (cutover weekend)",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "bank",
      "inclusion_rules": "Sight LCs at the current outstanding amount\nUsance and deferred-payment LCs at the outstanding amount plus accepted, unmatured documents\nLCs with contingent liability or pending drawings after expiry",
      "special_conditions": "Original LC amount kept in a local field where it differs from the outstanding amount\nExpired LCs with liability: liability reversal date on or after the migration date; original expiry kept\nCharges collected upfront are not migrated",
      "numbering_key_rules": "Legacy LC number stored in the old LC number field\nParent LCs migrated before child (transferred) LCs"
    }
  },
  {
    "title": "LC drawings",
    "description": "Unpaid and unmatured drawings under letters of credit, including discounted drawings.",
    "status": "in_scope",
    "field_values": {
      "product_area": "lc_drawings_settlements",
      "migration_strategy_reference": "[Document Reference] §4.21",
      "legacy_source_module": "[Legacy Core Banking System] – drawings",
      "target_module": "Trade finance – drawings",
      "migration_wave": "Window 2 – after letters of credit",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "bank",
      "data_dependencies": "Letters of credit",
      "special_conditions": "Example: LC 100,000 with paid drawings 30,000 and unpaid 20,000 — net LC 70,000 migrated, then the 20,000 drawing reduces it to 50,000\nPayment method set to internal account\nDiscounted drawings keep the original value date; the target amortises the discount"
    }
  },
  {
    "title": "Bank guarantees issued",
    "description": "Live guarantees migrated with outstanding amounts and original value and expiry dates.",
    "status": "in_scope",
    "field_values": {
      "product_area": "bank_guarantees_issued",
      "migration_strategy_reference": "[Document Reference] §4.22",
      "legacy_source_module": "[Legacy Core Banking System] – guarantees",
      "target_module": "Trade finance – guarantees",
      "migration_wave": "Window 2 – financial data (cutover weekend)",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "bank",
      "special_conditions": "Periodic commission migrated in the commission fields and collected from the next frequency date\nInvocations and commission due on the migration date processed in the legacy system first\nExpired guarantees: expiry set to the migration date so they expire again after the first close of business",
      "numbering_key_rules": "New guarantee numbers; legacy reference kept as the alternate key"
    }
  },
  {
    "title": "Bills",
    "description": "Active bills and bill registers migrated after the bill parameters.",
    "status": "in_scope",
    "field_values": {
      "product_area": "bills_for_collection_discounting",
      "migration_strategy_reference": "[Document Reference] §4.23",
      "legacy_source_module": "[Legacy Core Banking System] – bills",
      "target_module": "Bills",
      "migration_wave": "Window 2 – financial data (cutover weekend)",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "bank",
      "inclusion_rules": "Active bills only",
      "numbering_key_rules": "Legacy bill and register IDs kept as alternate keys",
      "target_setup_prerequisites": "Bill parameters, bill types and condition tables migrated first"
    }
  },
  {
    "title": "Securities customers and custody accounts",
    "description": "Customer securities roles and securities account masters, after customers and accounts.",
    "status": "in_scope",
    "field_values": {
      "product_area": "securities_custody_accounts",
      "migration_strategy_reference": "[Document Reference] §4.24",
      "legacy_source_module": "[Legacy Core Banking System] – securities customers and accounts",
      "target_module": "Securities",
      "migration_wave": "Window 1 – static data (delta on the cutover weekend)",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "bank",
      "inclusion_rules": "Customers dealing in securities and own-book portfolios",
      "special_conditions": "Own-book portfolios populated with the dealer book",
      "numbering_key_rules": "Securities account ID = customer number followed by a sequence",
      "data_dependencies": "Customers\nCustomer accounts"
    }
  },
  {
    "title": "Securities master",
    "description": "Instruments (bonds and shares) with their conditions and corporate action data.",
    "status": "in_scope",
    "field_values": {
      "product_area": "securities_master_instruments",
      "migration_strategy_reference": "[Document Reference] §4.25",
      "legacy_source_module": "[Legacy Core Banking System] – security master",
      "target_module": "Securities – instruments",
      "migration_wave": "Window 1 – static data (delta on the cutover weekend)",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "bank",
      "numbering_key_rules": "Instrument ID format agreed with [Bank Name]",
      "target_setup_prerequisites": "Country, currency, price type, industry and stock exchange tables loaded first"
    }
  },
  {
    "title": "General ledger, P&L and customer balances",
    "description": "General ledger balances fund the takeover accounts through data capture; takeover accounts return to zero as contracts are migrated.",
    "status": "in_scope",
    "field_values": {
      "product_area": "general_ledger_pandl_and_customer_balances",
      "migration_strategy_reference": "[Document Reference] §4.26",
      "legacy_source_module": "[Legacy Core Banking System] – general ledger and trial balance",
      "target_module": "General ledger",
      "migration_wave": "Window 2 – first financial load",
      "migration_method": "manual_capture",
      "responsible_party": "bank",
      "migration_steps": "1\tFund takeover accounts with Finance control totals (balanced journal)\tData capture\tBefore any contract load\n2\tMigrate accounts and contracts against the takeover accounts\tProduct DMS\tEvery product\n3\tMigrate P&L balances against the P&L takeover account\tP&L balances DMS\tEvery P&L line\n4\tConfirm takeover accounts are zero\tReconciliation\tAfter all loads",
      "special_conditions": "Takeover accounts opened per product and per currency\nThe legacy general ledger is balanced before uploading; differences are a last resort, posted to the take-on differences account and signed off as known differences\nP&L category mapping required to map legacy P&L accounts to the target\nMigration suspense accounts closed within the days set in Suspense Account Closure (strategy)",
      "balance_cutoff_rule": "Legacy trial balance after the final close of business.",
      "accounting_entries": "Takeover account\tMigration suspense\tFunding with Finance control totals\nTake-on differences\tTakeover account\tUnexplained differences, investigated before sign-off",
      "reconciliation_checks": "Trial balance comparison by general ledger line and currency\nTakeover and suspense accounts at zero",
      "balance_reconciliation_required": true
    }
  },
  {
    "title": "Uncleared balances",
    "description": "Balances with a future exposure date migrated through funds transfer with their original value dates.",
    "status": "in_scope",
    "field_values": {
      "product_area": "uncleared_balances_items_in_transit",
      "migration_strategy_reference": "[Document Reference] §4.27",
      "legacy_source_module": "[Legacy Core Banking System] – uncleared items",
      "target_module": "Funds transfer (uncleared balances)",
      "migration_wave": "Window 2 – after accounts",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "bank",
      "uncleared_items_treatment": "Uncleared balances file provided by [Bank Name], split into local and foreign currency, migrated through funds transfer with the original value dates.",
      "migration_steps": "1\tUncleared customer balances\tFunds transfer (uncleared funds) DMS\tAccounts with uncleared items",
      "balance_reconciliation_required": true
    }
  },
  {
    "title": "Tills and teller cash accounts",
    "description": "Tills are not migrated; new tills are created. Vault balances migrate per branch and currency.",
    "status": "in_scope",
    "field_values": {
      "product_area": "teller_ids_tills_and_teller_cash_accounts",
      "migration_strategy_reference": "[Document Reference] §4.28",
      "legacy_source_module": "[Legacy Core Banking System] – teller",
      "target_module": "Teller",
      "migration_wave": "Not applicable (vaults in window 2)",
      "migration_method": "not_migrated",
      "responsible_party": "bank",
      "exclusion_rules": "Tills and teller IDs (new tills created in the target)",
      "pre_migration_actions": "Tellers balance their tills and transfer all cash to the branch vault in each currency at the final legacy close of business\nNo pending withdrawals, deposits, till transfers or transactions awaiting approval",
      "post_migration_actions": "Head tellers create tills for each teller in their branch\nHead tellers transfer cash from the vault to each teller before the branch opens",
      "special_conditions": "Vault accounts created with the internal accounts; vault balances migrated with the balance sheet balances"
    }
  },
  {
    "title": "Delivery addresses and message preferences",
    "description": "SWIFT delivery addresses migrated; print addresses created automatically with customers.",
    "status": "in_scope",
    "field_values": {
      "product_area": "customer_delivery_addresses_and_advice_preferences",
      "migration_strategy_reference": "[Document Reference] §4.29",
      "legacy_source_module": "[Legacy Core Banking System] – delivery addresses",
      "target_module": "Delivery",
      "migration_wave": "Window 1 – static data (delta on the cutover weekend)",
      "migration_method": "automated_load_mapping_sheet",
      "responsible_party": "bank",
      "inclusion_rules": "SWIFT delivery addresses",
      "exclusion_rules": "Print addresses (created automatically)",
      "data_dependencies": "Customers\nBank identifier codes"
    }
  },
  {
    "title": "Bank identifier codes (SWIFT directory)",
    "description": "The worldwide bank directory loaded through the standard directory upload, without a data mapping sheet.",
    "status": "in_scope",
    "field_values": {
      "product_area": "bank_identifier_codes_bic_swift_directory",
      "migration_strategy_reference": "[Document Reference] §4.30",
      "legacy_source_module": "SWIFT bank directory file",
      "target_module": "Bank directory",
      "migration_wave": "Window 1 – static data (delta on the cutover weekend)",
      "migration_method": "standard_upload_utility",
      "responsible_party": "bank",
      "special_conditions": "Only the directory file format supported by the target upload is accepted",
      "migration_steps": "1\tBank directory file\tStandard directory upload (no DMS)\tBefore delivery addresses"
    }
  },
  {
    "title": "User profiles and user groups",
    "description": "User groups and roles set up before the weekend; user profiles created on the migration date.",
    "status": "in_scope",
    "field_values": {
      "product_area": "user_profiles_user_groups_and_access_rights",
      "migration_strategy_reference": "[Document Reference] §4.31",
      "legacy_source_module": "[Legacy Core Banking System] – users and user groups",
      "target_module": "Security – users and roles",
      "migration_wave": "Window 1 (groups) and window 2 (users)",
      "migration_method": "manual_capture",
      "responsible_party": "bank",
      "special_conditions": "[Bank Name] assigns user roles, branch access and start and end times\nUser roles may replace user groups in the target; if so, roles are promoted from user acceptance testing on the cutover weekend\nAccess recertified by line managers before go-live"
    }
  },
  {
    "title": "Custom tables and templates",
    "description": "Bank-defined custom tables and templates; approach decided after data analysis.",
    "status": "in_scope",
    "field_values": {
      "product_area": "custom_tables_and_templates",
      "migration_strategy_reference": "[Document Reference] §4.32",
      "legacy_source_module": "[Legacy Core Banking System] – custom tables",
      "target_module": "Custom tables",
      "migration_wave": "[Window]",
      "responsible_party": "shared",
      "special_conditions": "Analyse data presence and record counts first; the approach is then agreed with [Bank Name]"
    }
  },
  {
    "title": "Static reference data",
    "description": "Branches, currencies, rates, holidays and other reference tables set up before any other load.",
    "status": "in_scope",
    "field_values": {
      "product_area": "static_reference_data_branches_currencies_rates_holidays",
      "migration_strategy_reference": "[Document Reference] §4.33",
      "legacy_source_module": "[Legacy Core Banking System] – reference tables",
      "target_module": "Reference data and parameters",
      "migration_wave": "Before window 1",
      "migration_method": "standard_upload_utility",
      "responsible_party": "shared",
      "inclusion_rules": "Branches and companies\nCurrencies and currency rates\nHoliday calendars\nIndustry, sector, nationality and residence codes",
      "freeze_rules": "Reference and parameter tables frozen before the final mock migration",
      "post_migration_actions": "Currency rates refreshed on the migration date"
    }
  }
]$cbs$::jsonb) WITH ORDINALITY AS c(e, ord);

COMMIT;

-- Check: one template, 33 children, every selected product has a child.
SELECT t.display_id, t.name, t.version,
       (SELECT count(*) FROM public.local_register_template_children c WHERE c.template_id = t.id) AS children,
       jsonb_array_length(t.field_values -> 'products_in_scope') AS products_selected,
       (SELECT count(*) FROM jsonb_array_elements_text(t.field_values -> 'products_in_scope') p
         WHERE NOT EXISTS (SELECT 1 FROM public.local_register_template_children c
                           WHERE c.template_id = t.id AND c.field_values ->> 'product_area' = p)) AS products_without_child
FROM public.local_register_templates t
WHERE t.id = '00000000-0000-4000-b341-000000000001'::uuid;
