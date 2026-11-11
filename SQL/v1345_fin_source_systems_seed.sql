-- ============================================================================
-- v1345: Seed / sample data — Source Systems fields (v1344) for the Data Migration demo project
-- ============================================================================
-- Companion seed to v1344 (rule 18.2). Fills the new Source Systems fields on the 10 sample records
-- of project SEED334-PRJ-08 (ids …-4000-a00e-…, fictional "Northbridge Bank" core banking
-- replacement; vendor-neutral, rule 26). Values already present on a record are kept — the seed
-- only adds missing keys. Owner pickers are left empty (they hold real users).
-- Prerequisites: v1344. Idempotent.
-- ============================================================================

UPDATE public.local_register_records r
SET field_values = v.vals::jsonb || COALESCE(r.field_values, '{}'::jsonb),
    updated_at = NOW()
FROM (VALUES
  ('00000000-0000-4000-a00e-000000000001', $j${
    "system_type":"core_banking","vendor_product":"Legacy core banking platform","version_release":"Release 2014 (customised)",
    "entities_covered":"Northbridge Bank – retail and SME\nAll 84 retail branches","migration_criticality":"high","migration_wave":"Window 1 (static) and window 2 (financial)",
    "hosting":"on_premise","database_platform":"Relational database on in-house servers","extraction_method":"vendor_utility","extract_format":"Pipe-delimited text, one record per line, no heading row",
    "extraction_responsible":"bank","access_status":"granted","access_reference":"Change request CR-DM-014 (read-only migration account)",
    "data_domains":["customers","accounts","deposits","loans","limits_collateral","payments","general_ledger","users_security","reference_data"],
    "key_data_objects":"Customer master\nAccounts and balances\nDeposits\nLoans and past dues\nLimits and collateral\nStanding orders\nGeneral ledger and trial balance",
    "estimated_record_count":4200000,"data_volume_gb":420,"history_available_years":12,"data_quality_rating":"acceptable",
    "known_data_issues":"Customer address completeness at 82% (target 85%)\nDuplicate customers across branches\nMissing industry and sector codes on older corporate customers",
    "extraction_runs":"Mock 1\t2026-09-12\t2026-09-12\t4,180,000\tCompleted\nMock 2\t2026-11-14\t\t\tPlanned\nMock 3\t2027-01-16\t\t\tPlanned",
    "data_freeze_date":"2027-04-09","final_extract_date":"2027-04-09","extract_duration_hours":6,"control_totals_source":"Legacy trial balance after the final close of business",
    "dependencies":"Final legacy close of business\nFinance sign-off of control totals",
    "post_go_live_disposition":"read_only","decommission_date":"2027-10-31","read_only_access_until":"2027-10-31","retention_years":7,
    "archive_approach":"Full database backup kept for the retention period\nRead-only enquiry access for audit and complaints until decommissioning"}$j$),
  ('00000000-0000-4000-a00e-000000000002', $j${
    "system_type":"core_banking","vendor_product":"Legacy core banking platform","version_release":"Release 2014 (corporate instance)",
    "entities_covered":"Northbridge Bank – corporate banking and treasury","migration_criticality":"high","migration_wave":"Window 1 (static) and window 2 (financial)",
    "hosting":"on_premise","database_platform":"Relational database on in-house servers","extraction_method":"vendor_utility","extract_format":"Pipe-delimited text, one record per line, no heading row",
    "extraction_responsible":"bank","access_status":"granted","access_reference":"Change request CR-DM-015 (read-only migration account)",
    "data_domains":["customers","accounts","deposits","loans","limits_collateral","trade_finance","treasury","general_ledger","reference_data"],
    "key_data_objects":"Corporate customers and relationships\nAccounts and balances\nLoans, limits and collateral\nLetters of credit, guarantees and bills\nMoney market deals",
    "estimated_record_count":620000,"data_volume_gb":160,"history_available_years":12,"data_quality_rating":"acceptable",
    "known_data_issues":"Customer numbers overlap with Instance 1 (new numbers needed)\nExpired limits still linked to live facilities",
    "extraction_runs":"Mock 1\t2026-09-12\t2026-09-12\t615,000\tCompleted\nMock 2\t2026-11-14\t\t\tPlanned\nMock 3\t2027-01-16\t\t\tPlanned",
    "data_freeze_date":"2027-04-09","final_extract_date":"2027-04-09","extract_duration_hours":3,"control_totals_source":"Legacy trial balance after the final close of business",
    "dependencies":"Final legacy close of business\nTreasury deals matured or confirmed before the freeze",
    "post_go_live_disposition":"read_only","decommission_date":"2027-10-31","read_only_access_until":"2027-10-31","retention_years":7,
    "archive_approach":"Full database backup kept for the retention period\nRead-only enquiry access until decommissioning"}$j$),
  ('00000000-0000-4000-a00e-000000000003', $j${
    "system_type":"document_imaging","vendor_product":"Enterprise document management system","entities_covered":"All branches",
    "migration_criticality":"medium","migration_wave":"Window 1 (static data)","hosting":"on_premise","database_platform":"Document store with metadata database",
    "extraction_method":"database_extract","extract_format":"Metadata file plus image files (PNG / PDF)","extraction_responsible":"bank","access_status":"granted",
    "data_domains":["documents_images","customers"],"key_data_objects":"Signatures\nCustomer photos\nAccount mandates\nKYC documents",
    "estimated_record_count":2800000,"data_volume_gb":1900,"data_quality_rating":"acceptable",
    "known_data_issues":"Image storage location in the target (file storage or database) not yet decided",
    "extraction_runs":"Mock 1\t2026-09-12\t2026-09-13\t2,790,000\tCompleted\nMock 2\t2026-11-14\t\t\tPlanned",
    "extract_duration_hours":14,"control_totals_source":"Image count per document type",
    "dependencies":"Customers loaded in the target\nTarget image and document types set up",
    "post_go_live_disposition":"keep_active","retention_years":10,
    "archive_approach":"Transactional documents (e.g. credit files) stay in the document system"}$j$),
  ('00000000-0000-4000-a00e-000000000004', $j${
    "system_type":"card_management","vendor_product":"Card management system","migration_criticality":"medium","migration_wave":"Not migrated (interface)",
    "hosting":"vendor_hosted","extraction_method":"api","extraction_responsible":"legacy_system_vendor","access_status":"granted",
    "data_domains":["cards","customers"],"key_data_objects":"Card status file (cross-check only)","estimated_record_count":1050000,"data_quality_rating":"good",
    "control_totals_source":"Active card count per product","dependencies":"Target card interface built and tested",
    "post_go_live_disposition":"keep_active","notes":"Cards stay in the card management system; the target connects through an interface. The card status file is used only to cross-check linked accounts."}$j$),
  ('00000000-0000-4000-a00e-000000000005', $j${
    "system_type":"general_ledger","vendor_product":"Finance and general ledger system","entities_covered":"Northbridge Bank – all entities",
    "migration_criticality":"high","migration_wave":"Window 2 (financial data)","hosting":"private_cloud","extraction_method":"report_export",
    "extract_format":"Trial balance report (Excel)","extraction_responsible":"bank","access_status":"granted",
    "data_domains":["general_ledger"],"key_data_objects":"Trial balance by GL line and currency\nP&L category mapping",
    "data_quality_rating":"good","extraction_runs":"Mock 2\t2026-11-14\t\t\tPlanned\nMock 3\t2027-01-16\t\t\tPlanned",
    "final_extract_date":"2027-04-10","extract_duration_hours":1,"control_totals_source":"Signed trial balance from the Financial Controller",
    "dependencies":"Legacy general ledger balanced before the migration date",
    "post_go_live_disposition":"keep_active"}$j$),
  ('00000000-0000-4000-a00e-000000000006', $j${
    "system_type":"treasury","vendor_product":"Treasury dealing system","migration_criticality":"medium","migration_wave":"Window 2 (financial data)",
    "hosting":"on_premise","extraction_method":"file_export","extract_format":"CSV deal extract","extraction_responsible":"bank","access_status":"granted",
    "data_domains":["treasury"],"key_data_objects":"Unmatured FX spot and forward deals\nMoney market placements and takings",
    "estimated_record_count":2250,"data_quality_rating":"good","extract_duration_hours":1,"control_totals_source":"Open deal count and nominal per currency",
    "dependencies":"Currency rates updated in the target before the load","post_go_live_disposition":"decommission","decommission_date":"2027-07-31","retention_years":7}$j$),
  ('00000000-0000-4000-a00e-000000000007', $j${
    "system_type":"kyc_aml","vendor_product":"Customer due diligence repository","migration_criticality":"medium","migration_wave":"Window 1 (static data)",
    "hosting":"private_cloud","extraction_method":"database_extract","extraction_responsible":"bank","access_status":"requested",
    "data_domains":["customers","documents_images"],"key_data_objects":"KYC risk ratings\nDue diligence review dates\nPolitically exposed person flags",
    "data_quality_rating":"unknown","known_data_issues":"Not yet profiled","dependencies":"Customer number mapping from both legacy instances",
    "post_go_live_disposition":"keep_active"}$j$),
  ('00000000-0000-4000-a00e-000000000008', $j${
    "system_type":"digital_channels","vendor_product":"Internet and mobile banking user store","migration_criticality":"medium","migration_wave":"Window 2 (cutover weekend)",
    "hosting":"vendor_hosted","extraction_method":"api","extraction_responsible":"legacy_system_vendor","access_status":"not_requested",
    "data_domains":["users_security","customers"],"key_data_objects":"Digital banking users\nUser-to-account links\nBeneficiaries",
    "data_quality_rating":"unknown","dependencies":"New account numbers mapped for Instance 2 accounts",
    "post_go_live_disposition":"keep_active"}$j$),
  ('00000000-0000-4000-a00e-000000000009', $j${
    "system_type":"identity_access","vendor_product":"Directory service","migration_criticality":"low","migration_wave":"Window 1 (groups) and window 2 (users)",
    "hosting":"on_premise","extraction_method":"report_export","extraction_responsible":"bank","access_status":"not_requested",
    "data_domains":["users_security"],"key_data_objects":"Staff user IDs\nRole and branch assignments","estimated_record_count":2100,"data_quality_rating":"unknown",
    "dependencies":"Target roles approved; access recertified by line managers","post_go_live_disposition":"keep_active"}$j$),
  ('00000000-0000-4000-a00e-00000000000a', $j${
    "system_type":"core_banking","vendor_product":"Legacy core banking platform (bank-defined tables)","migration_criticality":"low","migration_wave":"To be decided",
    "hosting":"on_premise","extraction_method":"database_extract","extraction_responsible":"bank","access_status":"granted",
    "data_domains":["reference_data"],"key_data_objects":"Bank-defined custom tables and templates","data_quality_rating":"unknown",
    "open_issues":"Analysis of data presence and record counts in progress; approach to be agreed",
    "post_go_live_disposition":"archive"}$j$)
) AS v(id, vals)
WHERE r.id = v.id::uuid AND r.is_deleted = FALSE;

-- Check: how many sample records now carry the new fields.
SELECT count(*) FILTER (WHERE field_values ? 'system_type') AS with_system_type, count(*) AS sample_records
FROM public.local_register_records
WHERE register_id = '00000000-0000-4000-9001-00000000000e'::uuid AND id::text LIKE '00000000-0000-4000-a00e-%';
