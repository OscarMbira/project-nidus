-- ============================================================================
-- Issue Register Business Logic - Phase 10
-- Version: v176
-- Description: Auto-create issue register on project creation, status transitions, workflows
-- Date: 2026-01-19
-- ============================================================================
--
-- Prerequisites:
-- - v174_issue_register_tables.sql
-- - v175_issue_register_rls_policies.sql
--
-- ============================================================================
-- SECTION 1: AUTO-CREATE ISSUE REGISTER ON PROJECT CREATION
-- ============================================================================

-- Function to auto-create issue register when project is created
CREATE OR REPLACE FUNCTION auto_create_issue_register_for_project()
RETURNS TRIGGER AS $$
DECLARE
    v_register_id UUID;
    v_user_id UUID;
BEGIN
    -- Get the user who created the project (or use system user)
    v_user_id := NEW.created_by;
    
    -- If no created_by, try to get project owner
    IF v_user_id IS NULL THEN
        SELECT owner_user_id INTO v_user_id FROM projects WHERE id = NEW.id;
    END IF;
    
    -- Default to first admin user if still null (fallback)
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM users 
        WHERE is_deleted = FALSE 
        ORDER BY created_at ASC 
        LIMIT 1;
    END IF;
    
    -- Create issue register for the new project
    SELECT create_issue_register_for_project(NEW.id, v_user_id) INTO v_register_id;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail project creation
        RAISE WARNING 'Failed to auto-create issue register for project %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create issue register
DROP TRIGGER IF EXISTS trg_projects_auto_create_issue_register ON projects;
CREATE TRIGGER trg_projects_auto_create_issue_register
    AFTER INSERT ON projects
    FOR EACH ROW
    WHEN (NEW.is_deleted = FALSE)
    EXECUTE FUNCTION auto_create_issue_register_for_project();

COMMENT ON FUNCTION auto_create_issue_register_for_project() IS 'Automatically creates an issue register when a project is created';

-- ============================================================================
-- SECTION 2: STATUS TRANSITION VALIDATION
-- ============================================================================

-- Function to validate status transitions
CREATE OR REPLACE FUNCTION validate_issue_status_transition(
    p_current_status VARCHAR,
    p_new_status VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Define valid transitions
    CASE p_current_status
        WHEN 'draft' THEN
            RETURN p_new_status IN ('raised', 'cancelled');
        WHEN 'raised' THEN
            RETURN p_new_status IN ('under_assessment', 'cancelled');
        WHEN 'under_assessment' THEN
            RETURN p_new_status IN ('awaiting_decision', 'resolved', 'cancelled');
        WHEN 'awaiting_decision' THEN
            RETURN p_new_status IN ('approved', 'rejected', 'deferred', 'cancelled');
        WHEN 'approved' THEN
            RETURN p_new_status IN ('in_progress', 'cancelled');
        WHEN 'rejected' THEN
            RETURN p_new_status IN ('closed', 'cancelled');
        WHEN 'deferred' THEN
            RETURN p_new_status IN ('raised', 'cancelled');
        WHEN 'in_progress' THEN
            RETURN p_new_status IN ('resolved', 'cancelled');
        WHEN 'resolved' THEN
            RETURN p_new_status IN ('closed', 'reopened');
        WHEN 'closed' THEN
            RETURN p_new_status IN ('reopened', 'cancelled');
        WHEN 'reopened' THEN
            RETURN p_new_status IN ('raised', 'cancelled');
        WHEN 'cancelled' THEN
            RETURN FALSE; -- Cannot transition from cancelled
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_issue_status_transition(VARCHAR, VARCHAR) IS 'Validates if a status transition is allowed';

-- Function to enforce status transitions
CREATE OR REPLACE FUNCTION enforce_issue_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    v_old_status VARCHAR;
BEGIN
    -- Get old status
    IF TG_OP = 'UPDATE' THEN
        v_old_status := OLD.status;
    ELSE
        v_old_status := NULL;
    END IF;
    
    -- If status changed, validate transition
    IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
        IF NOT validate_issue_status_transition(v_old_status, NEW.status) THEN
            RAISE EXCEPTION 'Invalid status transition from % to %', v_old_status, NEW.status;
        END IF;
        
        -- Update status_date
        NEW.status_date := CURRENT_DATE;
    END IF;
    
    -- Set status_date on initial creation if not set
    IF TG_OP = 'INSERT' AND NEW.status_date IS NULL THEN
        NEW.status_date := CURRENT_DATE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce status transitions
DROP TRIGGER IF EXISTS trg_issues_enforce_status_transition ON issues;
CREATE TRIGGER trg_issues_enforce_status_transition
    BEFORE INSERT OR UPDATE ON issues
    FOR EACH ROW
    EXECUTE FUNCTION enforce_issue_status_transition();

COMMENT ON FUNCTION enforce_issue_status_transition() IS 'Enforces valid status transitions and updates status_date';

-- ============================================================================
-- SECTION 3: PRIORITY/SEVERITY ASSESSMENT AND ALERTS
-- ============================================================================

-- Function to calculate combined priority/severity score
CREATE OR REPLACE FUNCTION calculate_issue_priority_score(
    p_priority VARCHAR,
    p_severity VARCHAR
)
RETURNS VARCHAR AS $$
DECLARE
    v_score VARCHAR;
BEGIN
    -- Priority × Severity Matrix
    CASE 
        -- Critical Priority
        WHEN p_priority = 'critical' AND p_severity IN ('critical', 'major') THEN
            v_score := 'very_high';
        WHEN p_priority = 'critical' AND p_severity IN ('moderate', 'minor') THEN
            v_score := 'high';
        
        -- High Priority
        WHEN p_priority = 'high' AND p_severity = 'critical' THEN
            v_score := 'very_high';
        WHEN p_priority = 'high' AND p_severity IN ('major', 'moderate') THEN
            v_score := 'high';
        WHEN p_priority = 'high' AND p_severity = 'minor' THEN
            v_score := 'medium';
        
        -- Medium Priority
        WHEN p_priority = 'medium' AND p_severity = 'critical' THEN
            v_score := 'high';
        WHEN p_priority = 'medium' AND p_severity = 'major' THEN
            v_score := 'high';
        WHEN p_priority = 'medium' AND p_severity = 'moderate' THEN
            v_score := 'medium';
        WHEN p_priority = 'medium' AND p_severity = 'minor' THEN
            v_score := 'low';
        
        -- Low Priority
        WHEN p_priority = 'low' AND p_severity IN ('critical', 'major') THEN
            v_score := 'medium';
        WHEN p_priority = 'low' AND p_severity IN ('moderate', 'minor') THEN
            v_score := 'low';
        
        ELSE
            v_score := 'medium';
    END CASE;
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_issue_priority_score(VARCHAR, VARCHAR) IS 'Calculates combined priority/severity score';

-- Function to check if issue requires immediate attention
CREATE OR REPLACE FUNCTION requires_immediate_attention(
    p_priority VARCHAR,
    p_severity VARCHAR,
    p_status VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_score VARCHAR;
BEGIN
    -- Only check open issues
    IF p_status IN ('closed', 'cancelled', 'rejected') THEN
        RETURN FALSE;
    END IF;
    
    v_score := calculate_issue_priority_score(p_priority, p_severity);
    
    -- Very high and high scores require immediate attention
    RETURN v_score IN ('very_high', 'high');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION requires_immediate_attention(VARCHAR, VARCHAR, VARCHAR) IS 'Determines if issue requires immediate attention based on priority/severity';

-- ============================================================================
-- SECTION 4: WORKFLOW HELPERS
-- ============================================================================

-- Function to check if RFC can create change request
CREATE OR REPLACE FUNCTION can_create_change_request(p_issue_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_issue RECORD;
BEGIN
    SELECT issue_type, status INTO v_issue
    FROM issues
    WHERE id = p_issue_id AND is_deleted = FALSE;
    
    -- Must be RFC and approved
    RETURN v_issue.issue_type = 'request_for_change' 
        AND v_issue.status IN ('approved', 'in_progress');
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION can_create_change_request(UUID) IS 'Checks if RFC can create a change request';

-- Function to check if issue can be transferred to risk
CREATE OR REPLACE FUNCTION can_transfer_to_risk(p_issue_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_issue RECORD;
BEGIN
    SELECT status, transferred_to_risk_id INTO v_issue
    FROM issues
    WHERE id = p_issue_id AND is_deleted = FALSE;
    
    -- Must be open and not already transferred
    RETURN v_issue.status NOT IN ('closed', 'cancelled')
        AND v_issue.transferred_to_risk_id IS NULL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION can_transfer_to_risk(UUID) IS 'Checks if issue can be transferred to risk register';

-- Function to check if issue requires decision
CREATE OR REPLACE FUNCTION requires_decision(p_issue_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_issue RECORD;
    v_decision_count INTEGER;
BEGIN
    SELECT issue_type, status INTO v_issue
    FROM issues
    WHERE id = p_issue_id AND is_deleted = FALSE;
    
    -- RFCs and Off-specs in awaiting_decision status require decisions
    IF v_issue.status = 'awaiting_decision' THEN
        -- Check if decision already recorded
        SELECT COUNT(*) INTO v_decision_count
        FROM issue_decisions
        WHERE issue_id = p_issue_id AND is_deleted = FALSE;
        
        RETURN v_decision_count = 0;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION requires_decision(UUID) IS 'Checks if issue requires a decision';

-- ============================================================================
-- SECTION 5: VALIDATION HELPERS
-- ============================================================================

-- Function to validate issue completeness
CREATE OR REPLACE FUNCTION validate_issue_completeness(p_issue_id UUID)
RETURNS TABLE (
    field_name VARCHAR,
    is_valid BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_issue RECORD;
BEGIN
    SELECT * INTO v_issue
    FROM issues
    WHERE id = p_issue_id AND is_deleted = FALSE;
    
    -- Title validation
    RETURN QUERY SELECT 'title'::VARCHAR, 
        (LENGTH(COALESCE(v_issue.issue_title, '')) >= 10)::BOOLEAN,
        CASE WHEN LENGTH(COALESCE(v_issue.issue_title, '')) < 10 
            THEN 'Title must be at least 10 characters' 
            ELSE 'Valid' 
        END;
    
    -- Description validation
    RETURN QUERY SELECT 'description'::VARCHAR,
        (LENGTH(COALESCE(v_issue.issue_description, '')) >= 30)::BOOLEAN,
        CASE WHEN LENGTH(COALESCE(v_issue.issue_description, '')) < 30 
            THEN 'Description must be at least 30 characters' 
            ELSE 'Valid' 
        END;
    
    -- Impact description validation
    RETURN QUERY SELECT 'impact_description'::VARCHAR,
        (LENGTH(COALESCE(v_issue.impact_description, '')) >= 20)::BOOLEAN,
        CASE WHEN LENGTH(COALESCE(v_issue.impact_description, '')) < 20 
            THEN 'Impact description must be at least 20 characters' 
            ELSE 'Valid' 
        END;
    
    -- Issue type validation
    RETURN QUERY SELECT 'issue_type'::VARCHAR,
        (v_issue.issue_type IS NOT NULL)::BOOLEAN,
        CASE WHEN v_issue.issue_type IS NULL 
            THEN 'Issue type is required' 
            ELSE 'Valid' 
        END;
    
    -- Priority validation
    RETURN QUERY SELECT 'priority'::VARCHAR,
        (v_issue.priority IS NOT NULL)::BOOLEAN,
        CASE WHEN v_issue.priority IS NULL 
            THEN 'Priority is required' 
            ELSE 'Valid' 
        END;
    
    -- Severity validation
    RETURN QUERY SELECT 'severity'::VARCHAR,
        (v_issue.severity IS NOT NULL)::BOOLEAN,
        CASE WHEN v_issue.severity IS NULL 
            THEN 'Severity is required' 
            ELSE 'Valid' 
        END;
    
    -- Owner validation for in-progress issues
    RETURN QUERY SELECT 'owner'::VARCHAR,
        (v_issue.status != 'in_progress' OR v_issue.owner_id IS NOT NULL)::BOOLEAN,
        CASE WHEN v_issue.status = 'in_progress' AND v_issue.owner_id IS NULL 
            THEN 'Owner must be assigned for issues in progress' 
            ELSE 'Valid' 
        END;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION validate_issue_completeness(UUID) IS 'Validates issue completeness and returns validation results';

-- ============================================================================
-- SECTION 6: WARNING GENERATORS
-- ============================================================================

-- Function to get warnings for an issue
CREATE OR REPLACE FUNCTION get_issue_warnings(p_issue_id UUID)
RETURNS TABLE (
    warning_type VARCHAR,
    warning_message TEXT,
    severity VARCHAR
) AS $$
DECLARE
    v_issue RECORD;
    v_action_count INTEGER;
    v_overdue_action_count INTEGER;
    v_days_open INTEGER;
    v_decision_count INTEGER;
BEGIN
    SELECT i.*, 
           EXTRACT(DAY FROM CURRENT_DATE - i.date_raised)::INTEGER AS days_open
    INTO v_issue
    FROM issues i
    WHERE i.id = p_issue_id AND i.is_deleted = FALSE;
    
    -- High priority/severity without actions
    IF requires_immediate_attention(v_issue.priority, v_issue.severity, v_issue.status) THEN
        SELECT COUNT(*) INTO v_action_count
        FROM issue_actions
        WHERE issue_id = p_issue_id AND is_deleted = FALSE;
        
        IF v_action_count = 0 THEN
            RETURN QUERY SELECT 'no_actions'::VARCHAR,
                'High priority/severity issue has no resolution actions'::TEXT,
                'high'::VARCHAR;
        END IF;
    END IF;
    
    -- Overdue actions
    SELECT COUNT(*) INTO v_overdue_action_count
    FROM issue_actions
    WHERE issue_id = p_issue_id 
        AND is_deleted = FALSE
        AND status NOT IN ('completed', 'cancelled')
        AND target_date < CURRENT_DATE;
    
    IF v_overdue_action_count > 0 THEN
        RETURN QUERY SELECT 'overdue_actions'::VARCHAR,
            format('%s action(s) are overdue', v_overdue_action_count)::TEXT,
            'medium'::VARCHAR;
    END IF;
    
    -- Issues open too long (30+ days)
    IF v_issue.days_open >= 30 AND v_issue.status NOT IN ('closed', 'cancelled') THEN
        RETURN QUERY SELECT 'aging'::VARCHAR,
            format('Issue has been open for %s days', v_issue.days_open)::TEXT,
            'medium'::VARCHAR;
    END IF;
    
    -- RFCs without decision
    IF v_issue.issue_type = 'request_for_change' 
        AND v_issue.status = 'awaiting_decision' THEN
        SELECT COUNT(*) INTO v_decision_count
        FROM issue_decisions
        WHERE issue_id = p_issue_id AND is_deleted = FALSE;
        
        IF v_decision_count = 0 THEN
            RETURN QUERY SELECT 'no_decision'::VARCHAR,
                'RFC is awaiting decision but no decision has been recorded'::TEXT,
                'high'::VARCHAR;
        END IF;
    END IF;
    
    -- Off-specs without resolution
    IF v_issue.issue_type = 'off_specification' 
        AND v_issue.status IN ('under_assessment', 'in_progress')
        AND v_issue.resolution_description IS NULL THEN
        RETURN QUERY SELECT 'no_resolution'::VARCHAR,
            'Off-specification issue has no resolution plan'::TEXT,
            'medium'::VARCHAR;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_issue_warnings(UUID) IS 'Returns warnings for an issue based on quality criteria';

-- ============================================================================
-- SECTION 7: COMPLETION INDICATORS
-- ============================================================================

-- Function to calculate issue completion percentage
CREATE OR REPLACE FUNCTION calculate_issue_completion(p_issue_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_issue RECORD;
    v_total_actions INTEGER;
    v_completed_actions INTEGER;
    v_completion_score INTEGER := 0;
BEGIN
    SELECT * INTO v_issue
    FROM issues
    WHERE id = p_issue_id AND is_deleted = FALSE;
    
    -- Base score: status progression (0-50 points)
    CASE v_issue.status
        WHEN 'draft' THEN v_completion_score := 0;
        WHEN 'raised' THEN v_completion_score := 10;
        WHEN 'under_assessment' THEN v_completion_score := 20;
        WHEN 'awaiting_decision' THEN v_completion_score := 30;
        WHEN 'approved' THEN v_completion_score := 40;
        WHEN 'in_progress' THEN v_completion_score := 50;
        WHEN 'resolved' THEN v_completion_score := 80;
        WHEN 'closed' THEN v_completion_score := 100;
        ELSE v_completion_score := 0;
    END CASE;
    
    -- Action completion (0-30 points)
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
    INTO v_total_actions, v_completed_actions
    FROM issue_actions
    WHERE issue_id = p_issue_id AND is_deleted = FALSE;
    
    IF v_total_actions > 0 THEN
        v_completion_score := v_completion_score + 
            LEAST(30, ROUND((v_completed_actions::DECIMAL / v_total_actions) * 30));
    END IF;
    
    -- Resolution description (0-20 points)
    IF v_issue.resolution_description IS NOT NULL 
        AND LENGTH(v_issue.resolution_description) >= 20 THEN
        v_completion_score := v_completion_score + 20;
    END IF;
    
    RETURN LEAST(100, v_completion_score);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_issue_completion(UUID) IS 'Calculates completion percentage for an issue';
