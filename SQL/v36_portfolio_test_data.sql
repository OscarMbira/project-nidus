-- ================================================
-- File: v36_portfolio_test_data.sql
-- Description: Test data for Portfolio Management module
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v36_portfolio_management.sql must be run first
-- - Users table must have at least one user
-- - Projects table should have some test projects (optional)

-- Purpose:
-- Creates test portfolios and related data for testing Phase 6 functionality

-- Note: This script is idempotent and can be run multiple times safely
-- WARNING: This will create test data. Use in development/test environments only.

-- ================================================
-- SECTION 1: TEST PORTFOLIOS
-- ================================================

DO $$
DECLARE
    v_user_id UUID;
    v_portfolio_1_id UUID;
    v_portfolio_2_id UUID;
    v_portfolio_3_id UUID;
    v_project_id UUID;
BEGIN
    -- Get first available user
    SELECT id INTO v_user_id FROM users WHERE is_active = true AND is_deleted = false LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'No active users found. Please create a user first.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Creating test portfolios with user: %', v_user_id;
    
    -- Test Portfolio 1: Strategic Portfolio
    INSERT INTO portfolios (
        portfolio_code,
        portfolio_name,
        portfolio_description,
        portfolio_vision,
        portfolio_type,
        portfolio_category,
        portfolio_status,
        portfolio_owner_user_id,
        portfolio_manager_user_id,
        portfolio_start_date,
        portfolio_end_date,
        total_budget,
        allocated_budget,
        budget_currency,
        governance_model,
        review_frequency,
        overall_health_score,
        total_projects_count,
        active_projects_count,
        created_by,
        updated_by
    ) VALUES (
        'STRAT-001',
        'Strategic Initiatives Portfolio',
        'Portfolio for managing strategic business initiatives and transformation projects',
        'To deliver strategic value through coordinated project execution',
        'strategic',
        'business',
        'active',
        v_user_id,
        v_user_id,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '12 months',
        5000000.00,
        2500000.00,
        'USD',
        'centralized',
        'monthly',
        85.5,
        5,
        3,
        v_user_id,
        v_user_id
    )
    ON CONFLICT (portfolio_code) DO UPDATE SET
        portfolio_name = EXCLUDED.portfolio_name,
        updated_at = NOW()
    RETURNING id INTO v_portfolio_1_id;
    
    RAISE NOTICE 'Created Strategic Portfolio: %', v_portfolio_1_id;
    
    -- Test Portfolio 2: Operational Portfolio
    INSERT INTO portfolios (
        portfolio_code,
        portfolio_name,
        portfolio_description,
        portfolio_type,
        portfolio_category,
        portfolio_status,
        portfolio_owner_user_id,
        total_budget,
        budget_currency,
        governance_model,
        review_frequency,
        overall_health_score,
        total_projects_count,
        active_projects_count,
        created_by,
        updated_by
    ) VALUES (
        'OPS-001',
        'Operations Portfolio',
        'Day-to-day operations and maintenance projects',
        'operational',
        'it',
        'active',
        v_user_id,
        2000000.00,
        'USD',
        'decentralized',
        'bi-weekly',
        72.3,
        8,
        6,
        v_user_id,
        v_user_id
    )
    ON CONFLICT (portfolio_code) DO UPDATE SET
        portfolio_name = EXCLUDED.portfolio_name,
        updated_at = NOW()
    RETURNING id INTO v_portfolio_2_id;
    
    RAISE NOTICE 'Created Operations Portfolio: %', v_portfolio_2_id;
    
    -- Test Portfolio 3: Planning Portfolio
    INSERT INTO portfolios (
        portfolio_code,
        portfolio_name,
        portfolio_description,
        portfolio_type,
        portfolio_category,
        portfolio_status,
        total_budget,
        budget_currency,
        created_by,
        updated_by
    ) VALUES (
        'PLAN-001',
        'Planning Portfolio',
        'Portfolio for projects in planning phase',
        'innovation',
        'research',
        'planning',
        1000000.00,
        'USD',
        v_user_id,
        v_user_id
    )
    ON CONFLICT (portfolio_code) DO UPDATE SET
        portfolio_name = EXCLUDED.portfolio_name,
        updated_at = NOW()
    RETURNING id INTO v_portfolio_3_id;
    
    RAISE NOTICE 'Created Planning Portfolio: %', v_portfolio_3_id;
    
    -- ================================================
    -- SECTION 2: PORTFOLIO MEMBERS
    -- ================================================
    
    -- Add portfolio owner as member
    INSERT INTO portfolio_members (
        portfolio_id,
        user_id,
        member_role,
        assignment_status,
        can_view_all_projects,
        can_edit_portfolio,
        can_assign_projects,
        can_review_portfolio,
        created_by,
        updated_by
    )
    SELECT 
        v_portfolio_1_id,
        v_user_id,
        'portfolio_manager',
        'active',
        true,
        true,
        true,
        true,
        v_user_id,
        v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM portfolio_members 
        WHERE portfolio_id = v_portfolio_1_id 
        AND user_id = v_user_id 
        AND is_deleted = false
    );
    
    -- ================================================
    -- SECTION 3: PORTFOLIO OBJECTIVES
    -- ================================================
    
    -- Strategic Objective 1
    INSERT INTO portfolio_objectives (
        portfolio_id,
        objective_code,
        objective_name,
        objective_description,
        objective_type,
        target_value,
        current_value,
        measurement_unit,
        objective_status,
        strategic_importance_score,
        objective_owner_user_id,
        created_by,
        updated_by
    ) VALUES (
        v_portfolio_1_id,
        'OBJ-001',
        'Increase Market Share',
        'Increase market share by 15% in target markets',
        'strategic',
        15.0,
        8.5,
        'percentage',
        'in-progress',
        5,
        v_user_id,
        v_user_id,
        v_user_id
    )
    ON CONFLICT DO NOTHING;
    
    -- Strategic Objective 2
    INSERT INTO portfolio_objectives (
        portfolio_id,
        objective_code,
        objective_name,
        objective_description,
        objective_type,
        target_value,
        current_value,
        measurement_unit,
        objective_status,
        strategic_importance_score,
        created_by,
        updated_by
    ) VALUES (
        v_portfolio_1_id,
        'OBJ-002',
        'Digital Transformation',
        'Complete digital transformation initiatives',
        'strategic',
        100.0,
        45.0,
        'percentage',
        'in-progress',
        5,
        v_user_id,
        v_user_id
    )
    ON CONFLICT DO NOTHING;
    
    -- ================================================
    -- SECTION 4: PORTFOLIO GOVERNANCE
    -- ================================================
    
    INSERT INTO portfolio_governance (
        portfolio_id,
        governance_board_name,
        governance_model,
        review_meeting_frequency,
        next_review_meeting_date,
        decision_making_process,
        created_by,
        updated_by
    ) VALUES (
        v_portfolio_1_id,
        'Strategic Portfolio Board',
        'centralized',
        'monthly',
        CURRENT_DATE + INTERVAL '1 month',
        'Board reviews and approves all strategic initiatives',
        v_user_id,
        v_user_id
    )
    ON CONFLICT (portfolio_id) DO UPDATE SET
        governance_board_name = EXCLUDED.governance_board_name,
        updated_at = NOW();
    
    -- ================================================
    -- SECTION 5: PORTFOLIO BUDGETS
    -- ================================================
    
    INSERT INTO portfolio_budgets (
        portfolio_id,
        budget_name,
        budget_description,
        budget_type,
        budget_year,
        budget_quarter,
        budget_start_date,
        budget_end_date,
        approved_budget,
        allocated_budget,
        spent_budget,
        budget_status,
        budget_owner_user_id,
        created_by,
        updated_by
    ) VALUES (
        v_portfolio_1_id,
        'Q1 2025 Strategic Budget',
        'First quarter budget for strategic initiatives',
        'operational',
        EXTRACT(YEAR FROM CURRENT_DATE),
        1,
        DATE_TRUNC('quarter', CURRENT_DATE),
        DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 day',
        1250000.00,
        1000000.00,
        750000.00,
        'active',
        v_user_id,
        v_user_id,
        v_user_id
    )
    ON CONFLICT DO NOTHING;
    
    -- ================================================
    -- SECTION 6: PORTFOLIO RISKS
    -- ================================================
    
    INSERT INTO portfolio_risks (
        portfolio_id,
        risk_code,
        risk_title,
        risk_description,
        risk_category,
        probability_level,
        impact_level,
        risk_status,
        response_strategy,
        created_by,
        updated_by
    ) VALUES (
        v_portfolio_1_id,
        'RISK-001',
        'Resource Shortage',
        'Potential shortage of skilled resources across portfolio projects',
        'operational',
        4,
        4,
        'identified',
        'mitigate',
        v_user_id,
        v_user_id
    ),
    (
        v_portfolio_1_id,
        'RISK-002',
        'Budget Overrun',
        'Risk of exceeding allocated budget due to scope creep',
        'financial',
        3,
        5,
        'assessed',
        'mitigate',
        v_user_id,
        v_user_id
    )
    ON CONFLICT DO NOTHING;
    
    -- ================================================
    -- SECTION 7: PORTFOLIO METRICS (SAMPLE)
    -- ================================================
    
    INSERT INTO portfolio_metrics (
        portfolio_id,
        metric_period_start_date,
        metric_period_end_date,
        metric_period_type,
        total_projects,
        active_projects,
        completed_projects,
        overall_health_score,
        average_project_health,
        total_budget,
        allocated_budget,
        spent_budget,
        budget_utilization_percentage,
        resource_utilization_percentage,
        total_risks_count,
        high_risks_count,
        calculated_at,
        created_by,
        updated_by
    ) VALUES (
        v_portfolio_1_id,
        DATE_TRUNC('month', CURRENT_DATE),
        DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
        'month',
        5,
        3,
        1,
        85.5,
        82.0,
        5000000.00,
        2500000.00,
        1875000.00,
        37.5,
        68.5,
        2,
        1,
        NOW(),
        v_user_id,
        v_user_id
    )
    ON CONFLICT (portfolio_id, metric_period_start_date, metric_period_end_date, metric_period_type, is_deleted) DO UPDATE SET
        calculated_at = NOW(),
        updated_at = NOW();
    
    -- ================================================
    -- SECTION 8: PORTFOLIO PROJECTS (if projects exist)
    -- ================================================
    
    -- Try to assign first available project to portfolio
    SELECT id INTO v_project_id FROM projects WHERE is_deleted = false LIMIT 1;
    
    IF v_project_id IS NOT NULL THEN
        INSERT INTO portfolio_projects (
            portfolio_id,
            project_id,
            assignment_status,
            portfolio_priority,
            priority_order,
            is_strategic_project,
            created_by,
            updated_by
        ) VALUES (
            v_portfolio_1_id,
            v_project_id,
            'active',
            'high',
            1,
            true,
            v_user_id,
            v_user_id
        )
        ON CONFLICT (portfolio_id, project_id, is_deleted) DO UPDATE SET
            updated_at = NOW();
        
        RAISE NOTICE 'Assigned project % to portfolio', v_project_id;
    ELSE
        RAISE NOTICE 'No projects found to assign to portfolio';
    END IF;
    
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Test Data Created Successfully';
    RAISE NOTICE '  - 3 Test Portfolios';
    RAISE NOTICE '  - Portfolio Members';
    RAISE NOTICE '  - Portfolio Objectives';
    RAISE NOTICE '  - Portfolio Governance';
    RAISE NOTICE '  - Portfolio Budgets';
    RAISE NOTICE '  - Portfolio Risks';
    RAISE NOTICE '  - Portfolio Metrics';
    RAISE NOTICE '================================================';
    
END $$;

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Verify portfolios were created
SELECT 
    portfolio_code,
    portfolio_name,
    portfolio_status,
    portfolio_type,
    total_projects_count,
    overall_health_score
FROM portfolios
WHERE portfolio_code IN ('STRAT-001', 'OPS-001', 'PLAN-001')
AND is_deleted = false;

-- Verify portfolio members
SELECT 
    p.portfolio_name,
    u.email,
    pm.member_role,
    pm.assignment_status
FROM portfolio_members pm
JOIN portfolios p ON pm.portfolio_id = p.id
JOIN users u ON pm.user_id = u.id
WHERE p.portfolio_code = 'STRAT-001'
AND pm.is_deleted = false;

-- Verify portfolio objectives
SELECT 
    p.portfolio_name,
    po.objective_code,
    po.objective_name,
    po.objective_status,
    po.completion_percentage
FROM portfolio_objectives po
JOIN portfolios p ON po.portfolio_id = p.id
WHERE p.portfolio_code = 'STRAT-001'
AND po.is_deleted = false;

-- ================================================
-- End of v36_portfolio_test_data.sql
-- ================================================

