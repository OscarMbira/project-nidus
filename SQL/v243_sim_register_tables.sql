-- =============================================================================
-- v243: Register All Simulator Practice Tables
-- Purpose: Register all new sim practice tables in database_tables registry
-- PRD Reference: Simulator_Feature_Parity_Implementation_Plan.md Phase 1, Task 1.17
-- =============================================================================

-- This file ensures all practice tables created in v227-v242 are registered
-- Most tables were registered in their respective SQL files, but this provides
-- a comprehensive verification and any missing registrations

-- Verify and register any missing tables
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
SELECT 
    table_name,
    'Practice ' || REPLACE(REPLACE(table_name, 'sim.practice_', ''), '_', ' ') || ' for simulator learning',
    false,
    true,
    'simulation'
FROM (
    VALUES
    ('sim.practice_projects'),
    ('sim.practice_project_stages'),
    ('sim.practice_project_memberships'),
    ('sim.practice_project_types'),
    ('sim.practice_project_statuses'),
    ('sim.practice_tasks'),
    ('sim.practice_task_assignments'),
    ('sim.practice_task_comments'),
    ('sim.practice_task_attachments'),
    ('sim.practice_project_briefs'),
    ('sim.practice_business_cases'),
    ('sim.practice_project_initiation_documents'),
    ('sim.practice_project_plans'),
    ('sim.practice_plan_milestones'),
    ('sim.practice_plan_resources'),
    ('sim.practice_work_packages'),
    ('sim.practice_work_package_products'),
    ('sim.practice_risk_register'),
    ('sim.practice_risks'),
    ('sim.practice_risk_management_strategies'),
    ('sim.practice_rms_templates'),
    ('sim.practice_issue_register'),
    ('sim.practice_issues'),
    ('sim.practice_issue_reports'),
    ('sim.practice_issue_actions'),
    ('sim.practice_issue_decisions'),
    ('sim.practice_quality_register'),
    ('sim.practice_quality_management_strategies'),
    ('sim.practice_quality_activities'),
    ('sim.practice_daily_logs'),
    ('sim.practice_daily_log_entries'),
    ('sim.practice_lessons_log'),
    ('sim.practice_lesson_entries'),
    ('sim.practice_lessons_reports'),
    ('sim.practice_checkpoint_reports'),
    ('sim.practice_highlight_reports'),
    ('sim.practice_exception_reports'),
    ('sim.practice_end_stage_reports'),
    ('sim.practice_end_project_reports'),
    ('sim.practice_communication_management_strategies'),
    ('sim.practice_configuration_management_strategies'),
    ('sim.practice_configuration_item_records'),
    ('sim.practice_benefits_review_plans'),
    ('sim.practice_product_descriptions'),
    ('sim.practice_project_product_descriptions'),
    ('sim.practice_product_status_accounts'),
    ('sim.practice_portfolios'),
    ('sim.practice_programmes'),
    ('sim.practice_portfolio_projects'),
    ('sim.practice_programme_projects'),
    ('sim.practice_dependencies'),
    ('sim.practice_stakeholder_register'),
    ('sim.practice_teams'),
    ('sim.practice_team_members'),
    ('sim.practice_governance_decisions'),
    ('sim.practice_document_register')
) AS t(table_name)
WHERE NOT EXISTS (
    SELECT 1 FROM database_tables 
    WHERE database_tables.table_name = t.table_name
)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- Summary query to verify all tables are registered
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM database_tables
    WHERE table_name LIKE 'sim.practice_%'
    AND is_deleted = FALSE;
    
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Simulator Practice Tables Registered: %', v_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v243_sim_register_tables.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;
