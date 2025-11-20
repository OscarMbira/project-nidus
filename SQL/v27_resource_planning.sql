-- =====================================================
-- Resource Planning Module
-- Version: 27
-- Date: 2025-01-XX
-- Description: Database tables for resource planning and capacity management
-- =====================================================

-- =====================================================
-- 1. Resources Table
-- =====================================================
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Information
    resource_name VARCHAR(255) NOT NULL,
    resource_code VARCHAR(50) UNIQUE,
    resource_type VARCHAR(50) NOT NULL DEFAULT 'human', -- human, equipment, facility, other
    resource_category VARCHAR(100), -- developer, designer, manager, etc.
    resource_description TEXT,
    
    -- Capacity Information
    default_capacity_hours_per_day DECIMAL(10,2) DEFAULT 8.0,
    default_capacity_days_per_week INTEGER DEFAULT 5,
    default_capacity_percentage DECIMAL(5,2) DEFAULT 100.00, -- 0-100%
    
    -- Cost Information (optional)
    hourly_rate DECIMAL(10,2),
    daily_rate DECIMAL(10,2),
    currency_code VARCHAR(3) DEFAULT 'USD',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    
    -- Linking
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Link to user if human resource
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    organization_id UUID, -- For future multi-tenant support
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT resources_capacity_check CHECK (default_capacity_percentage >= 0 AND default_capacity_percentage <= 100),
    CONSTRAINT resources_hours_check CHECK (default_capacity_hours_per_day >= 0 AND default_capacity_hours_per_day <= 24)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_resources_team_id ON resources(team_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(resource_type) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_resources_active ON resources(is_active, is_available) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_resources_code ON resources(resource_code) WHERE is_deleted = false AND resource_code IS NOT NULL;

-- =====================================================
-- 2. Resource Skills Table
-- =====================================================
CREATE TABLE IF NOT EXISTS resource_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    
    -- Skill Information
    skill_name VARCHAR(255) NOT NULL,
    skill_category VARCHAR(100), -- technical, soft, domain, etc.
    proficiency_level VARCHAR(50) DEFAULT 'intermediate', -- beginner, intermediate, advanced, expert
    years_of_experience INTEGER,
    certification VARCHAR(255),
    notes TEXT,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT resource_skills_proficiency_check CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_resource_skills_resource_id ON resource_skills(resource_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_resource_skills_name ON resource_skills(skill_name) WHERE is_deleted = false;

-- =====================================================
-- 3. Resource Calendar Table
-- =====================================================
CREATE TABLE IF NOT EXISTS resource_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    
    -- Calendar Entry
    calendar_date DATE NOT NULL,
    availability_type VARCHAR(50) NOT NULL DEFAULT 'available', -- available, unavailable, partial
    available_hours DECIMAL(10,2), -- Override default capacity for this day
    capacity_percentage DECIMAL(5,2) DEFAULT 100.00, -- Override default capacity percentage
    
    -- Unavailability Reason
    unavailability_reason VARCHAR(255), -- vacation, sick, training, etc.
    notes TEXT,
    
    -- Recurring Pattern (optional)
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(50), -- daily, weekly, monthly, yearly
    recurrence_end_date DATE,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT resource_calendar_availability_check CHECK (availability_type IN ('available', 'unavailable', 'partial')),
    CONSTRAINT resource_calendar_capacity_check CHECK (capacity_percentage >= 0 AND capacity_percentage <= 100),
    CONSTRAINT resource_calendar_unique_date UNIQUE (resource_id, calendar_date, is_deleted)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_resource_calendar_resource_id ON resource_calendar(resource_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_resource_calendar_date ON resource_calendar(calendar_date) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_resource_calendar_availability ON resource_calendar(availability_type, calendar_date) WHERE is_deleted = false;

-- =====================================================
-- 4. Resource Assignments Table
-- =====================================================
CREATE TABLE IF NOT EXISTS resource_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    
    -- Assignment Target (polymorphic)
    assignment_type VARCHAR(50) NOT NULL, -- task, work_package, user_story, kanban_card, project
    assignment_target_id UUID NOT NULL,
    
    -- Assignment Details
    assignment_start_date DATE NOT NULL,
    assignment_end_date DATE,
    allocated_hours_per_day DECIMAL(10,2),
    total_allocated_hours DECIMAL(10,2),
    allocation_percentage DECIMAL(5,2) DEFAULT 100.00, -- 0-100% of resource capacity
    
    -- Assignment Status
    assignment_status VARCHAR(50) DEFAULT 'planned', -- planned, confirmed, in_progress, completed, cancelled
    actual_start_date DATE,
    actual_end_date DATE,
    actual_hours_worked DECIMAL(10,2),
    
    -- Role/Responsibility
    role_in_assignment VARCHAR(100), -- lead, contributor, reviewer, etc.
    responsibility_description TEXT,
    
    -- Notes
    notes TEXT,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT resource_assignments_status_check CHECK (assignment_status IN ('planned', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    CONSTRAINT resource_assignments_allocation_check CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
    CONSTRAINT resource_assignments_dates_check CHECK (assignment_end_date IS NULL OR assignment_start_date <= assignment_end_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_resource_assignments_resource_id ON resource_assignments(resource_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_resource_assignments_target ON resource_assignments(assignment_type, assignment_target_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_resource_assignments_dates ON resource_assignments(assignment_start_date, assignment_end_date) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_resource_assignments_status ON resource_assignments(assignment_status) WHERE is_deleted = false;

-- =====================================================
-- 5. Resource Capacity Tracking Table
-- =====================================================
CREATE TABLE IF NOT EXISTS resource_capacity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    
    -- Time Period
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    period_type VARCHAR(50) DEFAULT 'week', -- day, week, month, quarter, year
    
    -- Capacity Metrics
    total_capacity_hours DECIMAL(10,2) NOT NULL, -- Total available hours in period
    allocated_hours DECIMAL(10,2) DEFAULT 0, -- Hours already allocated
    available_hours DECIMAL(10,2) GENERATED ALWAYS AS (total_capacity_hours - allocated_hours) STORED,
    utilization_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_capacity_hours > 0 THEN (allocated_hours / total_capacity_hours * 100)
            ELSE 0
        END
    ) STORED,
    
    -- Over-allocation
    is_over_allocated BOOLEAN GENERATED ALWAYS AS (allocated_hours > total_capacity_hours) STORED,
    over_allocation_hours DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE 
            WHEN allocated_hours > total_capacity_hours THEN allocated_hours - total_capacity_hours
            ELSE 0
        END
    ) STORED,
    
    -- Calculated At
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT resource_capacity_dates_check CHECK (period_start_date <= period_end_date),
    CONSTRAINT resource_capacity_unique_period UNIQUE (resource_id, period_start_date, period_end_date, period_type, is_deleted)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_resource_capacity_resource_id ON resource_capacity(resource_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_resource_capacity_period ON resource_capacity(period_start_date, period_end_date) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_resource_capacity_over_allocated ON resource_capacity(is_over_allocated) WHERE is_deleted = false AND is_over_allocated = true;

-- =====================================================
-- 6. Resource Conflicts Table
-- =====================================================
CREATE TABLE IF NOT EXISTS resource_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    
    -- Conflict Details
    conflict_type VARCHAR(50) NOT NULL, -- over_allocation, skill_mismatch, availability, scheduling
    conflict_severity VARCHAR(50) DEFAULT 'medium', -- low, medium, high, critical
    conflict_start_date DATE NOT NULL,
    conflict_end_date DATE NOT NULL,
    
    -- Conflict Description
    conflict_description TEXT NOT NULL,
    affected_assignments UUID[], -- Array of resource_assignment IDs
    
    -- Resolution
    resolution_status VARCHAR(50) DEFAULT 'open', -- open, in_progress, resolved, ignored
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT resource_conflicts_type_check CHECK (conflict_type IN ('over_allocation', 'skill_mismatch', 'availability', 'scheduling')),
    CONSTRAINT resource_conflicts_severity_check CHECK (conflict_severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT resource_conflicts_status_check CHECK (resolution_status IN ('open', 'in_progress', 'resolved', 'ignored')),
    CONSTRAINT resource_conflicts_dates_check CHECK (conflict_start_date <= conflict_end_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_resource_conflicts_resource_id ON resource_conflicts(resource_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_resource_conflicts_status ON resource_conflicts(resolution_status) WHERE is_deleted = false AND resolution_status = 'open';
CREATE INDEX IF NOT EXISTS idx_resource_conflicts_severity ON resource_conflicts(conflict_severity) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_resource_conflicts_dates ON resource_conflicts(conflict_start_date, conflict_end_date) WHERE is_deleted = false;

-- =====================================================
-- 7. Update Triggers
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_resource_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_resources_updated_at ON resources;
DROP TRIGGER IF EXISTS trigger_resource_skills_updated_at ON resource_skills;
DROP TRIGGER IF EXISTS trigger_resource_calendar_updated_at ON resource_calendar;
DROP TRIGGER IF EXISTS trigger_resource_assignments_updated_at ON resource_assignments;
DROP TRIGGER IF EXISTS trigger_resource_capacity_updated_at ON resource_capacity;
DROP TRIGGER IF EXISTS trigger_resource_conflicts_updated_at ON resource_conflicts;

-- Create triggers
CREATE TRIGGER trigger_resources_updated_at
    BEFORE UPDATE ON resources
    FOR EACH ROW
    EXECUTE FUNCTION update_resource_updated_at();

CREATE TRIGGER trigger_resource_skills_updated_at
    BEFORE UPDATE ON resource_skills
    FOR EACH ROW
    EXECUTE FUNCTION update_resource_updated_at();

CREATE TRIGGER trigger_resource_calendar_updated_at
    BEFORE UPDATE ON resource_calendar
    FOR EACH ROW
    EXECUTE FUNCTION update_resource_updated_at();

CREATE TRIGGER trigger_resource_assignments_updated_at
    BEFORE UPDATE ON resource_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_resource_updated_at();

CREATE TRIGGER trigger_resource_capacity_updated_at
    BEFORE UPDATE ON resource_capacity
    FOR EACH ROW
    EXECUTE FUNCTION update_resource_updated_at();

CREATE TRIGGER trigger_resource_conflicts_updated_at
    BEFORE UPDATE ON resource_conflicts
    FOR EACH ROW
    EXECUTE FUNCTION update_resource_updated_at();

-- =====================================================
-- 8. Register Tables in database_tables
-- =====================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES 
    ('resources', 'Resource definitions for resource planning', false, true, 'resource'),
    ('resource_skills', 'Skills and competencies for resources', false, true, 'resource'),
    ('resource_calendar', 'Resource availability calendar', false, true, 'resource'),
    ('resource_assignments', 'Resource assignments to tasks/work packages/etc', false, true, 'resource'),
    ('resource_capacity', 'Resource capacity tracking by time period', false, true, 'resource'),
    ('resource_conflicts', 'Resource conflict detection and resolution', false, true, 'resource')
ON CONFLICT (table_name) 
DO UPDATE SET 
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- 9. Helper Functions
-- =====================================================

-- Function to calculate resource capacity for a date range
CREATE OR REPLACE FUNCTION calculate_resource_capacity(
    p_resource_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    total_capacity_hours DECIMAL(10,2),
    allocated_hours DECIMAL(10,2),
    available_hours DECIMAL(10,2),
    utilization_percentage DECIMAL(5,2),
    is_over_allocated BOOLEAN
) AS $$
DECLARE
    v_default_hours_per_day DECIMAL(10,2);
    v_default_days_per_week INTEGER;
    v_default_capacity_pct DECIMAL(5,2);
    v_total_days INTEGER;
    v_calendar_entries RECORD;
    v_capacity DECIMAL(10,2) := 0;
    v_allocated DECIMAL(10,2) := 0;
BEGIN
    -- Get resource defaults
    SELECT 
        default_capacity_hours_per_day,
        default_capacity_days_per_week,
        default_capacity_percentage
    INTO 
        v_default_hours_per_day,
        v_default_days_per_week,
        v_default_capacity_pct
    FROM resources
    WHERE id = p_resource_id AND is_deleted = false;
    
    -- Calculate total days in range
    v_total_days := p_end_date - p_start_date + 1;
    
    -- Calculate base capacity (simplified - assumes 5 day weeks)
    v_capacity := v_total_days * v_default_hours_per_day * (v_default_capacity_pct / 100.0);
    
    -- Adjust for calendar entries (unavailability, partial availability)
    FOR v_calendar_entries IN
        SELECT * FROM resource_calendar
        WHERE resource_id = p_resource_id
        AND calendar_date BETWEEN p_start_date AND p_end_date
        AND is_deleted = false
    LOOP
        IF v_calendar_entries.availability_type = 'unavailable' THEN
            v_capacity := v_capacity - v_default_hours_per_day;
        ELSIF v_calendar_entries.availability_type = 'partial' THEN
            IF v_calendar_entries.available_hours IS NOT NULL THEN
                v_capacity := v_capacity - (v_default_hours_per_day - v_calendar_entries.available_hours);
            ELSIF v_calendar_entries.capacity_percentage IS NOT NULL THEN
                v_capacity := v_capacity - (v_default_hours_per_day * (1 - v_calendar_entries.capacity_percentage / 100.0));
            END IF;
        END IF;
    END LOOP;
    
    -- Calculate allocated hours
    SELECT COALESCE(SUM(allocated_hours_per_day * (
        LEAST(assignment_end_date, p_end_date) - GREATEST(assignment_start_date, p_start_date) + 1
    )), 0)
    INTO v_allocated
    FROM resource_assignments
    WHERE resource_id = p_resource_id
    AND assignment_status NOT IN ('cancelled', 'completed')
    AND assignment_start_date <= p_end_date
    AND (assignment_end_date IS NULL OR assignment_end_date >= p_start_date)
    AND is_deleted = false;
    
    RETURN QUERY SELECT
        v_capacity,
        v_allocated,
        GREATEST(0, v_capacity - v_allocated) as available_hours,
        CASE 
            WHEN v_capacity > 0 THEN (v_allocated / v_capacity * 100)
            ELSE 0
        END as utilization_percentage,
        (v_allocated > v_capacity) as is_over_allocated;
END;
$$ LANGUAGE plpgsql;

-- Function to detect resource conflicts
CREATE OR REPLACE FUNCTION detect_resource_conflicts(
    p_resource_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS INTEGER AS $$
DECLARE
    v_conflict_count INTEGER := 0;
    v_capacity_result RECORD;
    v_over_allocation_hours DECIMAL(10,2);
BEGIN
    -- Check for over-allocation
    SELECT * INTO v_capacity_result
    FROM calculate_resource_capacity(p_resource_id, p_start_date, p_end_date);
    
    IF v_capacity_result.is_over_allocated THEN
        -- Calculate over-allocation hours
        v_over_allocation_hours := v_capacity_result.allocated_hours - v_capacity_result.total_capacity_hours;
        
        -- Insert or update conflict record
        INSERT INTO resource_conflicts (
            resource_id,
            conflict_type,
            conflict_severity,
            conflict_start_date,
            conflict_end_date,
            conflict_description,
            resolution_status,
            created_by
        )
        VALUES (
            p_resource_id,
            'over_allocation',
            CASE 
                WHEN v_over_allocation_hours > (v_capacity_result.total_capacity_hours * 0.5) THEN 'critical'
                WHEN v_over_allocation_hours > (v_capacity_result.total_capacity_hours * 0.25) THEN 'high'
                ELSE 'medium'
            END,
            p_start_date,
            p_end_date,
            'Resource is over-allocated by ' || v_over_allocation_hours || ' hours',
            'open',
            (SELECT id FROM users WHERE email = 'system@projectnidus.com' LIMIT 1)
        )
        ON CONFLICT DO NOTHING;
        
        v_conflict_count := v_conflict_count + 1;
    END IF;
    
    RETURN v_conflict_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. Comments
-- =====================================================

COMMENT ON TABLE resources IS 'Resource definitions for resource planning and capacity management';
COMMENT ON TABLE resource_skills IS 'Skills and competencies associated with resources';
COMMENT ON TABLE resource_calendar IS 'Resource availability calendar with exceptions and recurring patterns';
COMMENT ON TABLE resource_assignments IS 'Assignments of resources to tasks, work packages, user stories, etc.';
COMMENT ON TABLE resource_capacity IS 'Resource capacity tracking by time period with utilization metrics';
COMMENT ON TABLE resource_conflicts IS 'Resource conflicts (over-allocation, skill mismatches, etc.)';

COMMENT ON FUNCTION calculate_resource_capacity IS 'Calculates resource capacity, allocation, and utilization for a date range';
COMMENT ON FUNCTION detect_resource_conflicts IS 'Detects and records resource conflicts for a date range';

