-- =====================================================
-- Automation Module
-- Version: 31
-- Date: 2025-01-XX
-- Description: Database tables for workflow automation and rule-based automation
-- =====================================================

-- =====================================================
-- 1. Automation Rules Table
-- =====================================================
CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Rule Information
    rule_name VARCHAR(255) NOT NULL,
    rule_description TEXT,
    rule_category VARCHAR(50) DEFAULT 'general', -- general, task, project, notification, integration
    
    -- Trigger Configuration (JSONB)
    trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Example: {"type": "task_created", "conditions": {"project_id": "...", "status": "..."}}
    
    -- Action Configuration (JSONB)
    action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Example: {"type": "send_notification", "recipients": [...], "template": "..."}
    
    -- Rule Scope
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- NULL for global rules
    methodology_id UUID REFERENCES methodologies(id) ON DELETE SET NULL,
    
    -- Execution Settings
    is_active BOOLEAN DEFAULT true,
    execution_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    next_execution_at TIMESTAMP WITH TIME ZONE,
    
    -- Priority
    priority INTEGER DEFAULT 5, -- 1-10, higher = more important
    
    -- Error Handling
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    last_error_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT automation_rules_category_check CHECK (rule_category IN (
        'general', 'task', 'project', 'notification', 'integration', 'quality', 'risk', 'change'
    )),
    CONSTRAINT automation_rules_priority_check CHECK (priority >= 1 AND priority <= 10)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON automation_rules(is_active, next_execution_at) WHERE is_deleted = false AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_automation_rules_project ON automation_rules(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_automation_rules_category ON automation_rules(rule_category) WHERE is_deleted = false;

-- =====================================================
-- 2. Automation Executions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS automation_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Rule Reference
    rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
    
    -- Execution Details
    execution_status VARCHAR(50) NOT NULL DEFAULT 'running', -- running, completed, failed, cancelled
    trigger_data JSONB DEFAULT '{}'::jsonb, -- Data that triggered the rule
    action_data JSONB DEFAULT '{}'::jsonb, -- Data used for actions
    
    -- Execution Results
    actions_executed INTEGER DEFAULT 0,
    actions_succeeded INTEGER DEFAULT 0,
    actions_failed INTEGER DEFAULT 0,
    execution_result JSONB DEFAULT '{}'::jsonb,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER, -- Duration in milliseconds
    
    -- Error Information
    error_message TEXT,
    error_details JSONB,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT automation_executions_status_check CHECK (execution_status IN (
        'running', 'completed', 'failed', 'cancelled'
    ))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_executions_rule ON automation_executions(rule_id, started_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_automation_executions_status ON automation_executions(execution_status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_automation_executions_started_at ON automation_executions(started_at DESC) WHERE is_deleted = false;

-- =====================================================
-- 3. Scheduled Automations Table
-- =====================================================
CREATE TABLE IF NOT EXISTS scheduled_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Schedule Information
    schedule_name VARCHAR(255) NOT NULL,
    schedule_description TEXT,
    
    -- Rule Reference
    rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
    
    -- Schedule Configuration (JSONB)
    schedule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Example: {"frequency": "daily", "time": "09:00", "timezone": "UTC", "days_of_week": [1,2,3,4,5]}
    
    -- Schedule Status
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    run_count INTEGER DEFAULT 0,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_automations_active ON scheduled_automations(is_active, next_run_at) WHERE is_deleted = false AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_automations_rule ON scheduled_automations(rule_id) WHERE is_deleted = false;

-- =====================================================
-- 4. Update Triggers
-- =====================================================

CREATE OR REPLACE FUNCTION update_automation_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_automation_rules_updated_at
    BEFORE UPDATE ON automation_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_automation_rules_updated_at();

CREATE TRIGGER trigger_scheduled_automations_updated_at
    BEFORE UPDATE ON scheduled_automations
    FOR EACH ROW
    EXECUTE FUNCTION update_automation_rules_updated_at();

-- =====================================================
-- 5. Helper Functions
-- =====================================================

-- Function to calculate next execution time for scheduled automation
CREATE OR REPLACE FUNCTION calculate_next_scheduled_run(
    p_schedule_config JSONB
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    v_frequency VARCHAR(50);
    v_time TIME;
    v_timezone VARCHAR(50);
    v_days_of_week INTEGER[];
    v_next_run TIMESTAMP WITH TIME ZONE;
    v_current_day INTEGER;
BEGIN
    v_frequency := p_schedule_config->>'frequency';
    v_time := (p_schedule_config->>'time')::TIME;
    v_timezone := COALESCE(p_schedule_config->>'timezone', 'UTC');
    v_days_of_week := ARRAY(SELECT jsonb_array_elements_text(p_schedule_config->'days_of_week')::INTEGER);
    
    -- Get current day of week (1=Monday, 7=Sunday)
    v_current_day := EXTRACT(DOW FROM CURRENT_TIMESTAMP AT TIME ZONE v_timezone)::INTEGER;
    IF v_current_day = 0 THEN v_current_day := 7; END IF; -- Convert Sunday from 0 to 7
    
    -- Calculate next run based on frequency
    IF v_frequency = 'daily' THEN
        v_next_run := (CURRENT_DATE AT TIME ZONE v_timezone + v_time) AT TIME ZONE v_timezone;
        IF v_next_run <= CURRENT_TIMESTAMP THEN
            v_next_run := v_next_run + INTERVAL '1 day';
        END IF;
    ELSIF v_frequency = 'weekly' THEN
        -- Find next matching day of week
        -- Implementation would find next day in v_days_of_week array
        v_next_run := (CURRENT_DATE AT TIME ZONE v_timezone + v_time) AT TIME ZONE v_timezone;
    ELSIF v_frequency = 'monthly' THEN
        v_next_run := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' AT TIME ZONE v_timezone + v_time) AT TIME ZONE v_timezone;
    ELSE
        RETURN NULL;
    END IF;
    
    RETURN v_next_run;
END;
$$ LANGUAGE plpgsql;

-- Function to update rule execution stats
CREATE OR REPLACE FUNCTION update_rule_execution_stats(
    p_rule_id UUID,
    p_success BOOLEAN,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE automation_rules
    SET 
        execution_count = execution_count + 1,
        last_executed_at = CURRENT_TIMESTAMP,
        error_count = CASE WHEN p_success THEN error_count ELSE error_count + 1 END,
        last_error = CASE WHEN p_success THEN NULL ELSE p_error_message END,
        last_error_at = CASE WHEN p_success THEN NULL ELSE CURRENT_TIMESTAMP END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_rule_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. Register Tables in database_tables
-- =====================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES 
    ('automation_rules', 'Automation rules for workflow automation and triggers', false, true, 'automation'),
    ('automation_executions', 'Execution history for automation rules', false, true, 'automation'),
    ('scheduled_automations', 'Scheduled automation configurations', false, true, 'automation')
ON CONFLICT (table_name) 
DO UPDATE SET 
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- 7. Comments
-- =====================================================

COMMENT ON TABLE automation_rules IS 'Automation rules with triggers and actions for workflow automation';
COMMENT ON TABLE automation_executions IS 'Execution history and logs for automation rules';
COMMENT ON TABLE scheduled_automations IS 'Scheduled automation configurations for recurring tasks';

COMMENT ON FUNCTION calculate_next_scheduled_run IS 'Calculates the next execution time for a scheduled automation';
COMMENT ON FUNCTION update_rule_execution_stats IS 'Updates execution statistics for an automation rule';

