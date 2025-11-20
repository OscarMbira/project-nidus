-- ================================================
-- File: v34_analytics.sql
-- Description: Analytics & Metrics Dashboard module tables
-- Version: 1.1 (Added cleanup statements for idempotency)
-- Date: 2025-01-17
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v33 must be run first (all core tables must exist)
-- - projects table must exist
-- - users table must exist

-- Purpose:
-- Creates tables for Analytics & Metrics module:
-- 1. kpi_definitions - KPI definitions and configurations
-- 2. kpi_targets - Target values for KPIs
-- 3. kpi_actuals - Actual measured values for KPIs
-- 4. kpi_alerts - Alert configurations for KPI thresholds
-- 5. analytics_snapshots - Point-in-time analytics snapshots
-- 6. dashboard_configurations - User dashboard configurations
-- 7. dashboard_widgets - Dashboard widget configurations

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- CLEANUP: Drop existing tables if they exist (in reverse dependency order)
-- ================================================

DROP TABLE IF EXISTS dashboard_widgets CASCADE;
DROP TABLE IF EXISTS dashboard_configurations CASCADE;
DROP TABLE IF EXISTS analytics_snapshots CASCADE;
DROP TABLE IF EXISTS kpi_alerts CASCADE;
DROP TABLE IF EXISTS kpi_actuals CASCADE;
DROP TABLE IF EXISTS kpi_targets CASCADE;
DROP TABLE IF EXISTS kpi_definitions CASCADE;

-- Drop views
DROP VIEW IF EXISTS kpi_performance_summary CASCADE;

-- ================================================
-- TABLE 1: kpi_definitions
-- Description: KPI definitions and configurations
-- Category: analytics
-- ================================================

CREATE TABLE IF NOT EXISTS kpi_definitions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- KPI Information
    kpi_code VARCHAR(100) UNIQUE NOT NULL,
    kpi_name VARCHAR(200) NOT NULL,
    kpi_description TEXT,
    kpi_category VARCHAR(100), -- 'schedule', 'cost', 'quality', 'resource', 'risk', 'scope', 'benefit', 'custom'

    -- Measurement
    measurement_unit VARCHAR(50), -- 'percentage', 'currency', 'days', 'count', 'ratio', 'index'
    measurement_frequency VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'quarterly', 'on-demand'
    data_source VARCHAR(100), -- 'calculated', 'manual', 'imported', 'system'

    -- Calculation
    calculation_formula TEXT, -- Formula or SQL for calculating the KPI
    calculation_method VARCHAR(100), -- 'sum', 'average', 'percentage', 'ratio', 'custom'
    aggregation_period VARCHAR(50), -- 'day', 'week', 'month', 'quarter', 'year', 'project-lifetime'

    -- Thresholds
    target_direction VARCHAR(50), -- 'higher-is-better', 'lower-is-better', 'target-is-best'
    green_threshold_min DECIMAL(15,4),
    green_threshold_max DECIMAL(15,4),
    yellow_threshold_min DECIMAL(15,4),
    yellow_threshold_max DECIMAL(15,4),
    red_threshold_min DECIMAL(15,4),
    red_threshold_max DECIMAL(15,4),

    -- Display
    display_format VARCHAR(50), -- 'number', 'percentage', 'currency', 'duration'
    decimal_places INTEGER DEFAULT 2,
    prefix VARCHAR(20), -- e.g., '$', '£'
    suffix VARCHAR(20), -- e.g., '%', 'days'

    -- Chart Preferences
    preferred_chart_type VARCHAR(50), -- 'line', 'bar', 'gauge', 'number', 'trend'
    chart_color VARCHAR(20),

    -- Applicability
    methodology VARCHAR(50), -- 'all', 'structured', 'scrum', 'kanban', 'agile'
    applicable_to_project_types TEXT[],

    -- Metadata
    is_system_kpi BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_leading_indicator BOOLEAN DEFAULT FALSE, -- Leading vs lagging indicator

    -- Ownership
    owner_user_id UUID REFERENCES users(id),

    -- Notes
    notes TEXT,
    interpretation_guide TEXT, -- How to interpret the KPI
    tags TEXT[],

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kpi_definitions_code ON kpi_definitions(kpi_code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kpi_definitions_category ON kpi_definitions(kpi_category) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kpi_definitions_methodology ON kpi_definitions(methodology) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kpi_definitions_active ON kpi_definitions(is_active) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_kpi_definitions_updated_at ON kpi_definitions;
CREATE TRIGGER trg_kpi_definitions_updated_at
    BEFORE UPDATE ON kpi_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 2: kpi_targets
-- Description: Target values for KPIs
-- Category: analytics
-- ================================================

CREATE TABLE IF NOT EXISTS kpi_targets (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    kpi_definition_id UUID NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID, -- For organization-level targets

    -- Target Information
    target_name VARCHAR(200),
    target_description TEXT,

    -- Target Value
    target_value DECIMAL(15,4) NOT NULL,
    stretch_target_value DECIMAL(15,4), -- Aspirational target
    minimum_acceptable_value DECIMAL(15,4), -- Threshold for acceptability

    -- Target Period
    target_period_type VARCHAR(50), -- 'project-lifetime', 'annual', 'quarterly', 'monthly', 'sprint', 'stage'
    period_start_date DATE,
    period_end_date DATE,

    -- Stage/Sprint Specific (if applicable)
    stage_boundary_id UUID,
    sprint_id UUID,

    -- Baseline
    baseline_value DECIMAL(15,4),
    baseline_date DATE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    approval_status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'approved', 'rejected'
    approved_by UUID REFERENCES users(id),
    approval_date DATE,

    -- Ownership
    owner_user_id UUID REFERENCES users(id),

    -- Notes
    notes TEXT,
    rationale TEXT, -- Why this target was set

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kpi_targets_kpi_id ON kpi_targets(kpi_definition_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kpi_targets_project_id ON kpi_targets(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kpi_targets_period ON kpi_targets(period_start_date, period_end_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kpi_targets_active ON kpi_targets(is_active) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_kpi_targets_updated_at ON kpi_targets;
CREATE TRIGGER trg_kpi_targets_updated_at
    BEFORE UPDATE ON kpi_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 3: kpi_actuals
-- Description: Actual measured values for KPIs
-- Category: analytics
-- ================================================

CREATE TABLE IF NOT EXISTS kpi_actuals (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    kpi_definition_id UUID NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
    kpi_target_id UUID REFERENCES kpi_targets(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    -- Measurement
    measurement_date DATE NOT NULL,
    measurement_timestamp TIMESTAMP DEFAULT NOW(),
    actual_value DECIMAL(15,4) NOT NULL,

    -- Calculated Values
    variance_from_target DECIMAL(15,4),
    variance_percentage DECIMAL(10,2),
    performance_status VARCHAR(50), -- 'on-track', 'at-risk', 'off-track', 'ahead', 'behind'

    -- Thresholds
    threshold_status VARCHAR(50), -- 'green', 'yellow', 'red'

    -- Trend
    trend_direction VARCHAR(50), -- 'improving', 'stable', 'declining'
    trend_percentage DECIMAL(10,2), -- % change from previous measurement

    -- Data Source
    data_source VARCHAR(100), -- 'calculated', 'manual', 'imported'
    calculation_details TEXT,
    manual_entry_notes TEXT,

    -- Context
    period_type VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'sprint', 'stage'
    period_identifier VARCHAR(100), -- e.g., 'Sprint 5', 'Stage 2', 'Q1 2025'

    -- Validation
    is_validated BOOLEAN DEFAULT FALSE,
    validated_by UUID REFERENCES users(id),
    validation_date DATE,

    -- Forecasting
    forecasted_value DECIMAL(15,4),
    confidence_level DECIMAL(5,2), -- 0-100%

    -- Notes
    notes TEXT,
    contributing_factors TEXT,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kpi_actuals_kpi_id ON kpi_actuals(kpi_definition_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kpi_actuals_target_id ON kpi_actuals(kpi_target_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kpi_actuals_project_id ON kpi_actuals(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kpi_actuals_date ON kpi_actuals(measurement_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kpi_actuals_status ON kpi_actuals(performance_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kpi_actuals_threshold ON kpi_actuals(threshold_status) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_kpi_actuals_updated_at ON kpi_actuals;
CREATE TRIGGER trg_kpi_actuals_updated_at
    BEFORE UPDATE ON kpi_actuals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 4: kpi_alerts
-- Description: Alert configurations for KPI thresholds
-- Category: analytics
-- ================================================

CREATE TABLE IF NOT EXISTS kpi_alerts (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    kpi_definition_id UUID NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    -- Alert Configuration
    alert_name VARCHAR(200) NOT NULL,
    alert_description TEXT,
    alert_type VARCHAR(50), -- 'threshold', 'trend', 'anomaly', 'milestone'

    -- Trigger Conditions
    trigger_condition VARCHAR(100), -- 'above-threshold', 'below-threshold', 'equals', 'not-equals', 'percentage-change'
    trigger_value DECIMAL(15,4),
    trigger_percentage DECIMAL(10,2),

    -- Alert Severity
    severity VARCHAR(50) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'

    -- Recipients
    notify_users UUID[], -- User IDs to notify
    notify_roles VARCHAR(100)[], -- Roles to notify
    notification_channels VARCHAR(50)[], -- 'email', 'sms', 'in-app', 'webhook'

    -- Email Settings
    email_subject VARCHAR(200),
    email_body_template TEXT,

    -- Frequency Control
    alert_frequency VARCHAR(50) DEFAULT 'immediate', -- 'immediate', 'daily-digest', 'weekly-digest'
    suppress_duplicate_hours INTEGER DEFAULT 24, -- Don't send same alert within X hours

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP,
    trigger_count INTEGER DEFAULT 0,

    -- Acknowledgement
    requires_acknowledgement BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP,

    -- Notes
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kpi_alerts_kpi_id ON kpi_alerts(kpi_definition_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kpi_alerts_project_id ON kpi_alerts(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kpi_alerts_active ON kpi_alerts(is_active) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kpi_alerts_severity ON kpi_alerts(severity) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_kpi_alerts_updated_at ON kpi_alerts;
CREATE TRIGGER trg_kpi_alerts_updated_at
    BEFORE UPDATE ON kpi_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 5: analytics_snapshots
-- Description: Point-in-time analytics snapshots
-- Category: analytics
-- ================================================

CREATE TABLE IF NOT EXISTS analytics_snapshots (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Snapshot Information
    snapshot_date DATE NOT NULL,
    snapshot_timestamp TIMESTAMP DEFAULT NOW(),
    snapshot_type VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'milestone', 'stage-gate', 'on-demand'
    snapshot_name VARCHAR(200),

    -- Scope
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID, -- For organization-level snapshots
    portfolio_id UUID, -- For portfolio snapshots

    -- Project Metrics (Overall)
    total_projects INTEGER,
    active_projects INTEGER,
    completed_projects INTEGER,
    on_track_projects INTEGER,
    at_risk_projects INTEGER,
    off_track_projects INTEGER,

    -- Schedule Metrics
    schedule_performance_index DECIMAL(10,4), -- SPI
    schedule_variance_days INTEGER,
    critical_path_status VARCHAR(50),

    -- Cost Metrics
    cost_performance_index DECIMAL(10,4), -- CPI
    budget_at_completion DECIMAL(15,2),
    actual_cost DECIMAL(15,2),
    cost_variance DECIMAL(15,2),
    estimate_at_completion DECIMAL(15,2),
    estimate_to_complete DECIMAL(15,2),

    -- Earned Value Management
    planned_value DECIMAL(15,2), -- PV
    earned_value DECIMAL(15,2), -- EV
    actual_cost_ev DECIMAL(15,2), -- AC
    budget_variance DECIMAL(15,2), -- BV
    to_complete_performance_index DECIMAL(10,4), -- TCPI

    -- Resource Metrics
    total_resources INTEGER,
    allocated_resources INTEGER,
    over_allocated_resources INTEGER,
    resource_utilization_percentage DECIMAL(5,2),

    -- Risk Metrics
    total_risks INTEGER,
    open_risks INTEGER,
    critical_risks INTEGER,
    risk_exposure_value DECIMAL(15,2),

    -- Issue Metrics
    total_issues INTEGER,
    open_issues INTEGER,
    critical_issues INTEGER,
    overdue_issues INTEGER,

    -- Quality Metrics
    quality_reviews_passed INTEGER,
    quality_reviews_failed INTEGER,
    open_defects INTEGER,
    defect_density DECIMAL(10,4),

    -- Change Metrics
    change_requests_total INTEGER,
    change_requests_approved INTEGER,
    change_requests_pending INTEGER,
    change_impact_cost DECIMAL(15,2),
    change_impact_days INTEGER,

    -- Velocity (Agile)
    sprint_velocity DECIMAL(10,2),
    story_points_completed INTEGER,
    story_points_committed INTEGER,

    -- Throughput (Kanban)
    throughput_items_per_week DECIMAL(10,2),
    average_lead_time_days DECIMAL(10,2),
    average_cycle_time_days DECIMAL(10,2),

    -- Custom KPIs
    custom_metrics JSONB, -- Flexible storage for additional metrics

    -- Health Score
    overall_health_score DECIMAL(5,2), -- 0-100
    health_status VARCHAR(50), -- 'healthy', 'at-risk', 'critical'

    -- Snapshot Metadata
    data_quality_score DECIMAL(5,2), -- Confidence in data quality
    snapshot_generated_by VARCHAR(50), -- 'system', 'manual', 'scheduled'

    -- Notes
    notes TEXT,
    analysis_summary TEXT,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_date ON analytics_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_project_id ON analytics_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_type ON analytics_snapshots(snapshot_type);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_health ON analytics_snapshots(health_status);

-- ================================================
-- TABLE 6: dashboard_configurations
-- Description: User dashboard configurations
-- Category: analytics
-- ================================================

CREATE TABLE IF NOT EXISTS dashboard_configurations (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Dashboard Information
    dashboard_name VARCHAR(200) NOT NULL,
    dashboard_description TEXT,
    dashboard_type VARCHAR(50), -- 'executive', 'project', 'portfolio', 'custom'

    -- Scope
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,

    -- Layout
    layout_type VARCHAR(50) DEFAULT 'grid', -- 'grid', 'flow', 'custom'
    layout_configuration JSONB, -- Grid settings, responsive breakpoints

    -- Refresh
    auto_refresh BOOLEAN DEFAULT FALSE,
    refresh_interval_seconds INTEGER DEFAULT 300, -- 5 minutes

    -- Filters
    default_filters JSONB,
    date_range_default VARCHAR(50), -- 'last-7-days', 'last-30-days', 'current-month', 'custom'

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Usage Statistics
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP,

    -- Notes
    notes TEXT,
    tags TEXT[],

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_configurations_user_id ON dashboard_configurations(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_dashboard_configurations_project_id ON dashboard_configurations(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_dashboard_configurations_type ON dashboard_configurations(dashboard_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_dashboard_configurations_shared ON dashboard_configurations(is_shared) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_dashboard_configurations_updated_at ON dashboard_configurations;
CREATE TRIGGER trg_dashboard_configurations_updated_at
    BEFORE UPDATE ON dashboard_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 7: dashboard_widgets
-- Description: Dashboard widget configurations
-- Category: analytics
-- ================================================

CREATE TABLE IF NOT EXISTS dashboard_widgets (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    dashboard_id UUID NOT NULL REFERENCES dashboard_configurations(id) ON DELETE CASCADE,
    kpi_definition_id UUID REFERENCES kpi_definitions(id) ON DELETE SET NULL,
    report_definition_id UUID REFERENCES report_definitions(id) ON DELETE SET NULL,

    -- Widget Information
    widget_name VARCHAR(200) NOT NULL,
    widget_type VARCHAR(50) NOT NULL, -- 'kpi-card', 'chart', 'table', 'gauge', 'heatmap', 'list', 'custom'

    -- Position & Size
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 4, -- Grid columns
    height INTEGER DEFAULT 3, -- Grid rows

    -- Data Source
    data_source_type VARCHAR(50), -- 'kpi', 'report', 'query', 'custom'
    data_source_configuration JSONB,

    -- Visualization
    chart_type VARCHAR(50), -- 'line', 'bar', 'pie', 'gauge', 'number', 'table'
    chart_configuration JSONB,
    color_scheme VARCHAR(50),

    -- Filters
    widget_filters JSONB,
    time_range VARCHAR(50), -- 'last-7-days', 'last-30-days', 'ytd', 'custom'

    -- Refresh
    auto_refresh BOOLEAN DEFAULT TRUE,
    refresh_interval_seconds INTEGER,

    -- Interactivity
    allow_drill_down BOOLEAN DEFAULT FALSE,
    drill_down_configuration JSONB,

    -- Display
    show_title BOOLEAN DEFAULT TRUE,
    show_legend BOOLEAN DEFAULT TRUE,
    show_filters BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,

    -- Status
    is_visible BOOLEAN DEFAULT TRUE,

    -- Notes
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_dashboard_id ON dashboard_widgets(dashboard_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_kpi_id ON dashboard_widgets(kpi_definition_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_type ON dashboard_widgets(widget_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_visible ON dashboard_widgets(is_visible) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_dashboard_widgets_updated_at ON dashboard_widgets;
CREATE TRIGGER trg_dashboard_widgets_updated_at
    BEFORE UPDATE ON dashboard_widgets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- VIEW: kpi_performance_summary
-- Description: KPI performance summary with targets and actuals
-- ================================================

CREATE OR REPLACE VIEW kpi_performance_summary AS
SELECT
    kd.id as kpi_id,
    kd.kpi_code,
    kd.kpi_name,
    kd.kpi_category,
    kt.project_id,
    kt.target_value,
    ka.actual_value,
    ka.measurement_date,
    ka.variance_from_target,
    ka.variance_percentage,
    ka.performance_status,
    ka.threshold_status,
    ka.trend_direction
FROM kpi_definitions kd
LEFT JOIN kpi_targets kt ON kd.id = kt.kpi_definition_id AND kt.is_active = TRUE AND kt.is_deleted = FALSE
LEFT JOIN LATERAL (
    SELECT *
    FROM kpi_actuals
    WHERE kpi_definition_id = kd.id
      AND (kpi_target_id = kt.id OR kt.id IS NULL)
      AND is_deleted = FALSE
    ORDER BY measurement_date DESC
    LIMIT 1
) ka ON TRUE
WHERE kd.is_deleted = FALSE AND kd.is_active = TRUE;

-- ================================================
-- Register Tables in database_tables Registry
-- ================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('kpi_definitions', 'KPI definitions and measurement configurations', false, true),
  ('kpi_targets', 'Target values and baselines for KPIs', false, true),
  ('kpi_actuals', 'Actual measured KPI values and performance tracking', false, true),
  ('kpi_alerts', 'Alert configurations for KPI threshold monitoring', false, true),
  ('analytics_snapshots', 'Point-in-time analytics snapshots for historical tracking', false, true),
  ('dashboard_configurations', 'User dashboard configurations and layouts', false, true),
  ('dashboard_widgets', 'Dashboard widget configurations and data sources', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ================================================
-- End of v34_analytics.sql
-- ================================================
