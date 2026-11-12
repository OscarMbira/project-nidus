-- ============================================================================
-- v1435: Read-only query — structure of the Core PM tables for wave 1 sample data
-- ============================================================================
-- Core PM audit wave 1 (Documentation/Core_PM_Fields_and_Sample_Data_Audit.md). Returns, for each
-- of 47 tables: its columns (name, type, required, default), check constraints, foreign keys,
-- unique constraints, triggers, and whether the same table exists in the sim schema. Used to write
-- seed files that match the live tables exactly. Changes nothing. After running, export the result
-- as CSV and save it as core_pm_wave1_structure (no extension) in E:project-nidusCSV Files-- ============================================================================

WITH wanted(table_name) AS (
  VALUES
    ('project_mandates'),
    ('mandate_deliverables'),
    ('mandate_dependencies'),
    ('project_briefs'),
    ('business_cases'),
    ('business_case_options'),
    ('business_case_benefits'),
    ('scope_statements'),
    ('schedule_management_plans'),
    ('product_descriptions'),
    ('milestones'),
    ('constraints_register'),
    ('deliverable_register'),
    ('wbs_nodes'),
    ('wbs_dictionary_entries'),
    ('control_accounts'),
    ('project_contacts'),
    ('project_governance_structure'),
    ('project_governance_members'),
    ('change_requests'),
    ('assumptions'),
    ('stakeholders'),
    ('stakeholder_analysis'),
    ('stakeholder_engagement'),
    ('stakeholder_communications'),
    ('project_decisions'),
    ('project_delays'),
    ('stage_gate_reviews'),
    ('lessons_logs'),
    ('lessons_learned'),
    ('project_baselines'),
    ('test_environments'),
    ('cross_project_resource_allocations'),
    ('vendors'),
    ('vendor_ratings'),
    ('project_ittos'),
    ('agile_releases'),
    ('cost_actuals'),
    ('project_budget_categories'),
    ('project_expense_claims'),
    ('teams'),
    ('comm_meetings'),
    ('configuration_items'),
    ('issues'),
    ('risks'),
    ('project_closures'),
    ('follow_on_actions')
)
SELECT w.table_name,
  (SELECT json_agg(json_build_object('c', a.attname, 't', format_type(a.atttypid, a.atttypmod), 'req', a.attnotnull,
            'def', pg_get_expr(d.adbin, d.adrelid)) ORDER BY a.attnum)
     FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
     WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped) AS columns,
  (SELECT json_agg(pg_get_constraintdef(k.oid)) FROM pg_constraint k WHERE k.conrelid = c.oid AND k.contype = 'c') AS checks,
  (SELECT json_agg(pg_get_constraintdef(k.oid)) FROM pg_constraint k WHERE k.conrelid = c.oid AND k.contype = 'f') AS foreign_keys,
  (SELECT json_agg(pg_get_constraintdef(k.oid)) FROM pg_constraint k WHERE k.conrelid = c.oid AND k.contype IN ('u', 'p')) AS unique_keys,
  (SELECT json_agg(tg.tgname || ': ' || p.proname) FROM pg_trigger tg JOIN pg_proc p ON p.oid = tg.tgfoid WHERE tg.tgrelid = c.oid AND NOT tg.tgisinternal) AS triggers,
  (SELECT count(*) FROM pg_class s JOIN pg_namespace sn ON sn.oid = s.relnamespace WHERE sn.nspname = 'sim' AND s.relname = w.table_name) > 0 AS in_sim
FROM wanted w
JOIN pg_class c ON c.relname = w.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
ORDER BY w.table_name;
