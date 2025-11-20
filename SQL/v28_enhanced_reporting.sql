-- =====================================================
-- Enhanced Reporting Module
-- Version: 28
-- Date: 2025-01-XX
-- Description: Database tables for custom reports, analytics, and scheduled reports
-- =====================================================

-- =====================================================
-- 1. Report Templates Table
-- =====================================================
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template Information
    template_name VARCHAR(255) NOT NULL,
    template_description TEXT,
    template_category VARCHAR(100), -- project, resource, task, financial, custom, etc.
    template_type VARCHAR(50) NOT NULL DEFAULT 'custom', -- custom, prebuilt, system
    
    -- Data Source Configuration
    data_source_type VARCHAR(50) NOT NULL, -- table, query, view, function
    data_source_name VARCHAR(255) NOT NULL, -- table name, view name, function name
    data_source_query TEXT, -- Custom SQL query if data_source_type is 'query'
    
    -- Field Configuration (JSONB)
    field_config JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of field definitions
    -- Example: [{"name": "project_name", "label": "Project Name", "type": "text", "visible": true, "sortable": true}]
    
    -- Filter Configuration (JSONB)
    filter_config JSONB DEFAULT '[]'::jsonb, -- Array of filter definitions
    -- Example: [{"field": "status", "operator": "equals", "value": "active"}]
    
    -- Grouping Configuration (JSONB)
    grouping_config JSONB DEFAULT '[]'::jsonb, -- Array of grouping definitions
    -- Example: [{"field": "project_type", "order": "asc"}]
    
    -- Sorting Configuration (JSONB)
    sorting_config JSONB DEFAULT '[]'::jsonb, -- Array of sort definitions
    -- Example: [{"field": "created_at", "direction": "desc"}]
    
    -- Visualization Configuration (JSONB)
    visualization_config JSONB DEFAULT '{}'::jsonb, -- Chart/visualization settings
    -- Example: {"type": "bar", "xAxis": "project_name", "yAxis": "task_count", "colors": ["#3B82F6"]}
    
    -- Display Settings
    page_size INTEGER DEFAULT 50,
    show_totals BOOLEAN DEFAULT false,
    show_subtotals BOOLEAN DEFAULT false,
    
    -- Sharing & Access
    is_public BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    shared_with_users UUID[], -- Array of user IDs
    shared_with_roles UUID[], -- Array of role IDs
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT report_templates_type_check CHECK (template_type IN ('custom', 'prebuilt', 'system')),
    CONSTRAINT report_templates_data_source_check CHECK (data_source_type IN ('table', 'query', 'view', 'function'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_report_templates_category ON report_templates(template_category) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_report_templates_type ON report_templates(template_type) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_report_templates_created_by ON report_templates(created_by) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_report_templates_active ON report_templates(is_active) WHERE is_deleted = false;

-- =====================================================
-- 2. Scheduled Reports Table
-- =====================================================
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
    
    -- Schedule Configuration
    schedule_name VARCHAR(255) NOT NULL,
    schedule_description TEXT,
    
    -- Schedule Frequency
    frequency_type VARCHAR(50) NOT NULL, -- daily, weekly, monthly, quarterly, yearly, custom
    frequency_value INTEGER DEFAULT 1, -- Every N days/weeks/months
    schedule_day INTEGER, -- Day of week (1-7) or day of month (1-31)
    schedule_time TIME, -- Time of day to run (HH:MM:SS)
    schedule_timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Custom Schedule (Cron Expression)
    cron_expression VARCHAR(100), -- For custom schedules
    
    -- Recipients
    recipient_emails TEXT[], -- Array of email addresses
    recipient_user_ids UUID[], -- Array of user IDs
    recipient_role_ids UUID[], -- Array of role IDs
    
    -- Export Format
    export_format VARCHAR(50) DEFAULT 'pdf', -- pdf, csv, excel, json, html
    export_options JSONB DEFAULT '{}'::jsonb, -- Format-specific options
    
    -- Delivery Method
    delivery_method VARCHAR(50) DEFAULT 'email', -- email, download, storage
    storage_path VARCHAR(500), -- Path if delivery_method is 'storage'
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    run_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT scheduled_reports_frequency_check CHECK (frequency_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
    CONSTRAINT scheduled_reports_format_check CHECK (export_format IN ('pdf', 'csv', 'excel', 'json', 'html')),
    CONSTRAINT scheduled_reports_delivery_check CHECK (delivery_method IN ('email', 'download', 'storage'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_template ON scheduled_reports(report_template_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON scheduled_reports(is_active, next_run_at) WHERE is_deleted = false AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_deleted = false AND is_active = true;

-- =====================================================
-- 3. Report Executions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS report_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
    scheduled_report_id UUID REFERENCES scheduled_reports(id) ON DELETE SET NULL,
    
    -- Execution Details
    execution_type VARCHAR(50) NOT NULL DEFAULT 'manual', -- manual, scheduled, api
    execution_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, cancelled
    
    -- Execution Parameters
    execution_params JSONB DEFAULT '{}'::jsonb, -- Parameters used for this execution
    filter_overrides JSONB DEFAULT '{}'::jsonb, -- Filter overrides for this execution
    
    -- Results
    record_count INTEGER,
    execution_time_ms INTEGER, -- Execution time in milliseconds
    file_size_bytes BIGINT, -- Size of generated file if applicable
    file_path VARCHAR(500), -- Path to generated file
    file_url TEXT, -- URL to access generated file
    
    -- Error Information
    error_message TEXT,
    error_stack TEXT,
    
    -- Execution Timestamps
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT report_executions_type_check CHECK (execution_type IN ('manual', 'scheduled', 'api')),
    CONSTRAINT report_executions_status_check CHECK (execution_status IN ('pending', 'running', 'completed', 'failed', 'cancelled'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_report_executions_template ON report_executions(report_template_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_report_executions_scheduled ON report_executions(scheduled_report_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_report_executions_status ON report_executions(execution_status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_report_executions_created_at ON report_executions(created_at DESC) WHERE is_deleted = false;

-- =====================================================
-- 4. Analytics Dashboards Table
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dashboard Information
    dashboard_name VARCHAR(255) NOT NULL,
    dashboard_description TEXT,
    dashboard_category VARCHAR(100), -- project, resource, financial, custom, etc.
    dashboard_type VARCHAR(50) NOT NULL DEFAULT 'custom', -- custom, prebuilt, system
    
    -- Layout Configuration (JSONB)
    layout_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Grid layout, widget positions
    -- Example: {"columns": 12, "rows": 8, "widgets": [{"id": "widget1", "x": 0, "y": 0, "w": 6, "h": 4}]}
    
    -- Widget Configuration (JSONB)
    widgets_config JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of widget definitions
    -- Example: [{"id": "widget1", "type": "chart", "title": "Project Status", "config": {...}}]
    
    -- Refresh Settings
    auto_refresh_enabled BOOLEAN DEFAULT false,
    auto_refresh_interval_seconds INTEGER DEFAULT 60,
    
    -- Sharing & Access
    is_public BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    shared_with_users UUID[],
    shared_with_roles UUID[],
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT analytics_dashboards_type_check CHECK (dashboard_type IN ('custom', 'prebuilt', 'system'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_category ON analytics_dashboards(dashboard_category) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_type ON analytics_dashboards(dashboard_type) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_created_by ON analytics_dashboards(created_by) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_active ON analytics_dashboards(is_active) WHERE is_deleted = false;

-- =====================================================
-- 5. Analytics Widgets Table
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES analytics_dashboards(id) ON DELETE CASCADE,
    
    -- Widget Information
    widget_name VARCHAR(255) NOT NULL,
    widget_type VARCHAR(50) NOT NULL, -- chart, table, metric, kpi, text, custom
    widget_title VARCHAR(255),
    widget_description TEXT,
    
    -- Data Source Configuration
    data_source_type VARCHAR(50) NOT NULL, -- table, query, function, api
    data_source_name VARCHAR(255) NOT NULL,
    data_source_query TEXT,
    
    -- Widget Configuration (JSONB)
    widget_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Widget-specific configuration
    -- Example for chart: {"chartType": "bar", "xAxis": "date", "yAxis": "value", "colors": ["#3B82F6"]}
    -- Example for metric: {"format": "currency", "currency": "USD", "decimals": 2}
    
    -- Display Settings
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 4,
    height INTEGER DEFAULT 3,
    min_width INTEGER DEFAULT 2,
    min_height INTEGER DEFAULT 2,
    
    -- Refresh Settings
    refresh_interval_seconds INTEGER, -- Widget-specific refresh interval
    
    -- Status
    is_visible BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT analytics_widgets_type_check CHECK (widget_type IN ('chart', 'table', 'metric', 'kpi', 'text', 'custom')),
    CONSTRAINT analytics_widgets_data_source_check CHECK (data_source_type IN ('table', 'query', 'function', 'api'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_widgets_dashboard ON analytics_widgets(dashboard_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_analytics_widgets_type ON analytics_widgets(widget_type) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_analytics_widgets_order ON analytics_widgets(dashboard_id, display_order) WHERE is_deleted = false;

-- =====================================================
-- 6. KPI Definitions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS kpi_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- KPI Information
    kpi_name VARCHAR(255) NOT NULL,
    kpi_description TEXT,
    kpi_category VARCHAR(100), -- project, resource, financial, quality, etc.
    kpi_unit VARCHAR(50), -- percentage, count, currency, hours, days, etc.
    
    -- Calculation Configuration
    calculation_type VARCHAR(50) NOT NULL, -- sum, avg, count, min, max, custom
    calculation_formula TEXT, -- Custom formula if calculation_type is 'custom'
    data_source_type VARCHAR(50) NOT NULL, -- table, query, function
    data_source_name VARCHAR(255) NOT NULL,
    data_source_query TEXT,
    
    -- Target Configuration
    target_value DECIMAL(10,2),
    target_type VARCHAR(50), -- fixed, percentage, trend
    threshold_warning DECIMAL(10,2),
    threshold_critical DECIMAL(10,2),
    
    -- Display Configuration
    display_format VARCHAR(50) DEFAULT 'number', -- number, percentage, currency, duration
    decimal_places INTEGER DEFAULT 2,
    currency_code VARCHAR(3),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT kpi_definitions_calculation_check CHECK (calculation_type IN ('sum', 'avg', 'count', 'min', 'max', 'custom')),
    CONSTRAINT kpi_definitions_data_source_check CHECK (data_source_type IN ('table', 'query', 'function')),
    CONSTRAINT kpi_definitions_target_check CHECK (target_type IS NULL OR target_type IN ('fixed', 'percentage', 'trend'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kpi_definitions_category ON kpi_definitions(kpi_category) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_kpi_definitions_active ON kpi_definitions(is_active) WHERE is_deleted = false;

-- =====================================================
-- 7. KPI Values Table (Time-Series Data)
-- =====================================================
CREATE TABLE IF NOT EXISTS kpi_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_id UUID NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
    
    -- Value Information
    kpi_value DECIMAL(15,4) NOT NULL,
    measurement_date DATE NOT NULL,
    measurement_time TIMESTAMP WITH TIME ZONE, -- Optional timestamp for more precise measurements
    
    -- Context
    context_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    context_resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
    context_metadata JSONB DEFAULT '{}'::jsonb, -- Additional context data
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT kpi_values_unique_measurement UNIQUE (kpi_id, measurement_date, context_project_id, context_resource_id, is_deleted)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kpi_values_kpi_id ON kpi_values(kpi_id, measurement_date DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_kpi_values_project ON kpi_values(context_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_kpi_values_resource ON kpi_values(context_resource_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_kpi_values_date ON kpi_values(measurement_date DESC) WHERE is_deleted = false;

-- =====================================================
-- 8. Update Triggers
-- =====================================================

CREATE OR REPLACE FUNCTION update_reporting_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_report_templates_updated_at
    BEFORE UPDATE ON report_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_reporting_updated_at();

CREATE TRIGGER trigger_scheduled_reports_updated_at
    BEFORE UPDATE ON scheduled_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_reporting_updated_at();

CREATE TRIGGER trigger_report_executions_updated_at
    BEFORE UPDATE ON report_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_reporting_updated_at();

CREATE TRIGGER trigger_analytics_dashboards_updated_at
    BEFORE UPDATE ON analytics_dashboards
    FOR EACH ROW
    EXECUTE FUNCTION update_reporting_updated_at();

CREATE TRIGGER trigger_analytics_widgets_updated_at
    BEFORE UPDATE ON analytics_widgets
    FOR EACH ROW
    EXECUTE FUNCTION update_reporting_updated_at();

CREATE TRIGGER trigger_kpi_definitions_updated_at
    BEFORE UPDATE ON kpi_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_reporting_updated_at();

CREATE TRIGGER trigger_kpi_values_updated_at
    BEFORE UPDATE ON kpi_values
    FOR EACH ROW
    EXECUTE FUNCTION update_reporting_updated_at();

-- =====================================================
-- 9. Register Tables in database_tables
-- =====================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES 
    ('report_templates', 'Report template definitions for custom reporting', false, true, 'reporting'),
    ('scheduled_reports', 'Scheduled report configurations', false, true, 'reporting'),
    ('report_executions', 'Report execution history and results', false, true, 'reporting'),
    ('analytics_dashboards', 'Analytics dashboard definitions', false, true, 'reporting'),
    ('analytics_widgets', 'Analytics widget definitions for dashboards', false, true, 'reporting'),
    ('kpi_definitions', 'KPI definition and configuration', false, true, 'reporting'),
    ('kpi_values', 'KPI measurement values over time', false, true, 'reporting')
ON CONFLICT (table_name) 
DO UPDATE SET 
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- 10. Helper Functions
-- =====================================================

-- Function to calculate next run time for scheduled reports
CREATE OR REPLACE FUNCTION calculate_next_run_time(
    p_frequency_type VARCHAR(50),
    p_frequency_value INTEGER,
    p_schedule_day INTEGER,
    p_schedule_time TIME,
    p_last_run_at TIMESTAMP WITH TIME ZONE
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    v_next_run TIMESTAMP WITH TIME ZONE;
    v_base_date DATE;
BEGIN
    v_base_date := COALESCE(p_last_run_at::DATE, CURRENT_DATE);
    
    CASE p_frequency_type
        WHEN 'daily' THEN
            v_next_run := (v_base_date + (p_frequency_value || ' days')::INTERVAL)::DATE + p_schedule_time;
        WHEN 'weekly' THEN
            -- Calculate next occurrence of schedule_day
            v_next_run := (v_base_date + ((p_schedule_day - EXTRACT(DOW FROM v_base_date) + 7) % 7 || ' days')::INTERVAL)::DATE + p_schedule_time;
            IF v_next_run <= CURRENT_TIMESTAMP THEN
                v_next_run := v_next_run + '7 days'::INTERVAL;
            END IF;
        WHEN 'monthly' THEN
            -- Calculate next occurrence of schedule_day in month
            v_next_run := DATE_TRUNC('month', v_base_date + '1 month'::INTERVAL)::DATE + (p_schedule_day - 1) || ' days' + p_schedule_time;
        WHEN 'quarterly' THEN
            v_next_run := DATE_TRUNC('quarter', v_base_date + '3 months'::INTERVAL)::DATE + (p_schedule_day - 1) || ' days' + p_schedule_time;
        WHEN 'yearly' THEN
            v_next_run := DATE_TRUNC('year', v_base_date + '1 year'::INTERVAL)::DATE + (p_schedule_day - 1) || ' days' + p_schedule_time;
        ELSE
            v_next_run := NULL;
    END CASE;
    
    RETURN v_next_run;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. Comments
-- =====================================================

COMMENT ON TABLE report_templates IS 'Report template definitions for custom reporting with field, filter, and visualization configuration';
COMMENT ON TABLE scheduled_reports IS 'Scheduled report configurations with frequency, recipients, and delivery settings';
COMMENT ON TABLE report_executions IS 'Report execution history tracking execution status, results, and errors';
COMMENT ON TABLE analytics_dashboards IS 'Analytics dashboard definitions with layout and widget configuration';
COMMENT ON TABLE analytics_widgets IS 'Analytics widget definitions for dashboard widgets (charts, tables, metrics)';
COMMENT ON TABLE kpi_definitions IS 'KPI definition and calculation configuration';
COMMENT ON TABLE kpi_values IS 'KPI measurement values over time for trend analysis';

COMMENT ON FUNCTION calculate_next_run_time IS 'Calculates the next run time for scheduled reports based on frequency configuration';

