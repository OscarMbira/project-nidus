-- =====================================================
-- Enhanced Reporting Module - Seed Data
-- Version: 28
-- Date: 2025-01-XX
-- Description: Pre-built report templates and analytics dashboards
-- =====================================================

-- =====================================================
-- Pre-built Report Templates
-- =====================================================

-- 1. Project Status Report
INSERT INTO report_templates (
    template_name,
    template_description,
    template_category,
    template_type,
    data_source_type,
    data_source_name,
    field_config,
    filter_config,
    sorting_config,
    visualization_config,
    page_size,
    show_totals,
    is_public,
    is_active,
    created_by
)
SELECT
    'Project Status Report',
    'Comprehensive report showing project status, progress, and key metrics',
    'project',
    'prebuilt',
    'table',
    'projects',
    '[
        {"name": "project_name", "label": "Project Name", "type": "text", "visible": true, "sortable": true},
        {"name": "project_code", "label": "Project Code", "type": "text", "visible": true, "sortable": true},
        {"name": "project_status", "label": "Status", "type": "text", "visible": true, "sortable": true},
        {"name": "start_date", "label": "Start Date", "type": "date", "visible": true, "sortable": true},
        {"name": "end_date", "label": "End Date", "type": "date", "visible": true, "sortable": true},
        {"name": "created_at", "label": "Created At", "type": "timestamp", "visible": true, "sortable": true}
    ]'::jsonb,
    '[]'::jsonb,
    '[{"field": "created_at", "direction": "desc"}]'::jsonb,
    '{"type": "table", "showChart": false}'::jsonb,
    50,
    false,
    true,
    true,
    (SELECT id FROM users WHERE email LIKE '%admin%' OR is_system_user = true LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM report_templates WHERE template_name = 'Project Status Report' AND template_type = 'prebuilt'
);

-- 2. Resource Utilization Report
INSERT INTO report_templates (
    template_name,
    template_description,
    template_category,
    template_type,
    data_source_type,
    data_source_name,
    field_config,
    filter_config,
    sorting_config,
    visualization_config,
    page_size,
    show_totals,
    is_public,
    is_active,
    created_by
)
SELECT
    'Resource Utilization Report',
    'Report showing resource allocation and utilization across projects',
    'resource',
    'prebuilt',
    'table',
    'resources',
    '[
        {"name": "resource_name", "label": "Resource Name", "type": "text", "visible": true, "sortable": true},
        {"name": "resource_type", "label": "Type", "type": "text", "visible": true, "sortable": true},
        {"name": "default_capacity_hours_per_day", "label": "Capacity (h/day)", "type": "number", "visible": true, "sortable": true},
        {"name": "default_capacity_percentage", "label": "Capacity %", "type": "number", "visible": true, "sortable": true},
        {"name": "is_active", "label": "Active", "type": "boolean", "visible": true, "sortable": true},
        {"name": "is_available", "label": "Available", "type": "boolean", "visible": true, "sortable": true}
    ]'::jsonb,
    '[]'::jsonb,
    '[{"field": "resource_name", "direction": "asc"}]'::jsonb,
    '{"type": "bar", "xAxis": "resource_name", "yAxis": "default_capacity_hours_per_day"}'::jsonb,
    50,
    true,
    true,
    true,
    (SELECT id FROM users WHERE email LIKE '%admin%' OR is_system_user = true LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM report_templates WHERE template_name = 'Resource Utilization Report' AND template_type = 'prebuilt'
);

-- 3. Task Progress Report
INSERT INTO report_templates (
    template_name,
    template_description,
    template_category,
    template_type,
    data_source_type,
    data_source_name,
    field_config,
    filter_config,
    sorting_config,
    visualization_config,
    page_size,
    show_totals,
    is_public,
    is_active,
    created_by
)
SELECT
    'Task Progress Report',
    'Report showing task status, progress, and assignments',
    'task',
    'prebuilt',
    'table',
    'tasks',
    '[
        {"name": "task_name", "label": "Task Name", "type": "text", "visible": true, "sortable": true},
        {"name": "task_status", "label": "Status", "type": "text", "visible": true, "sortable": true},
        {"name": "priority", "label": "Priority", "type": "text", "visible": true, "sortable": true},
        {"name": "due_date", "label": "Due Date", "type": "date", "visible": true, "sortable": true},
        {"name": "progress_percentage", "label": "Progress %", "type": "number", "visible": true, "sortable": true},
        {"name": "created_at", "label": "Created At", "type": "timestamp", "visible": true, "sortable": true}
    ]'::jsonb,
    '[]'::jsonb,
    '[{"field": "due_date", "direction": "asc"}]'::jsonb,
    '{"type": "table", "showChart": false}'::jsonb,
    100,
    false,
    true,
    true,
    (SELECT id FROM users WHERE email LIKE '%admin%' OR is_system_user = true LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM report_templates WHERE template_name = 'Task Progress Report' AND template_type = 'prebuilt'
);

-- 4. Risk Summary Report
INSERT INTO report_templates (
    template_name,
    template_description,
    template_category,
    template_type,
    data_source_type,
    data_source_name,
    field_config,
    filter_config,
    sorting_config,
    visualization_config,
    page_size,
    show_totals,
    is_public,
    is_active,
    created_by
)
SELECT
    'Risk Summary Report',
    'Report showing project risks with probability, impact, and mitigation status',
    'project',
    'prebuilt',
    'table',
    'risks',
    '[
        {"name": "risk_title", "label": "Risk Title", "type": "text", "visible": true, "sortable": true},
        {"name": "risk_category", "label": "Category", "type": "text", "visible": true, "sortable": true},
        {"name": "probability", "label": "Probability", "type": "text", "visible": true, "sortable": true},
        {"name": "impact", "label": "Impact", "type": "text", "visible": true, "sortable": true},
        {"name": "risk_status", "label": "Status", "type": "text", "visible": true, "sortable": true},
        {"name": "created_at", "label": "Identified", "type": "timestamp", "visible": true, "sortable": true}
    ]'::jsonb,
    '[]'::jsonb,
    '[{"field": "created_at", "direction": "desc"}]'::jsonb,
    '{"type": "heatmap", "xAxis": "probability", "yAxis": "impact"}'::jsonb,
    50,
    false,
    true,
    true,
    (SELECT id FROM users WHERE email LIKE '%admin%' OR is_system_user = true LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM report_templates WHERE template_name = 'Risk Summary Report' AND template_type = 'prebuilt'
);

-- 5. Issue Tracking Report
INSERT INTO report_templates (
    template_name,
    template_description,
    template_category,
    template_type,
    data_source_type,
    data_source_name,
    field_config,
    filter_config,
    sorting_config,
    visualization_config,
    page_size,
    show_totals,
    is_public,
    is_active,
    created_by
)
SELECT
    'Issue Tracking Report',
    'Report showing project issues, blockers, and their resolution status',
    'project',
    'prebuilt',
    'table',
    'issues',
    '[
        {"name": "issue_title", "label": "Issue Title", "type": "text", "visible": true, "sortable": true},
        {"name": "issue_type", "label": "Type", "type": "text", "visible": true, "sortable": true},
        {"name": "issue_status", "label": "Status", "type": "text", "visible": true, "sortable": true},
        {"name": "priority", "label": "Priority", "type": "text", "visible": true, "sortable": true},
        {"name": "reported_date", "label": "Reported", "type": "date", "visible": true, "sortable": true},
        {"name": "resolved_date", "label": "Resolved", "type": "date", "visible": true, "sortable": true}
    ]'::jsonb,
    '[]'::jsonb,
    '[{"field": "reported_date", "direction": "desc"}]'::jsonb,
    '{"type": "table", "showChart": false}'::jsonb,
    50,
    false,
    true,
    true,
    (SELECT id FROM users WHERE email LIKE '%admin%' OR is_system_user = true LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM report_templates WHERE template_name = 'Issue Tracking Report' AND template_type = 'prebuilt'
);

-- =====================================================
-- Pre-built Analytics Dashboards
-- =====================================================

-- 1. Project Overview Dashboard
INSERT INTO analytics_dashboards (
    dashboard_name,
    dashboard_description,
    dashboard_category,
    dashboard_type,
    layout_config,
    widgets_config,
    auto_refresh_enabled,
    auto_refresh_interval_seconds,
    is_public,
    is_active,
    created_by
)
SELECT
    'Project Overview Dashboard',
    'High-level overview of all projects with key metrics and status',
    'project',
    'prebuilt',
    '{"columns": 12, "rows": 8}'::jsonb,
    '[
        {
            "id": "widget1",
            "type": "metric",
            "title": "Total Projects",
            "dataSource": "projects",
            "config": {"calculation": "count"}
        },
        {
            "id": "widget2",
            "type": "metric",
            "title": "Active Projects",
            "dataSource": "projects",
            "config": {"calculation": "count", "filter": {"status": "active"}}
        },
        {
            "id": "widget3",
            "type": "chart",
            "title": "Projects by Status",
            "dataSource": "projects",
            "config": {"chartType": "pie", "groupBy": "project_status"}
        }
    ]'::jsonb,
    true,
    300,
    true,
    true,
    (SELECT id FROM users WHERE email LIKE '%admin%' OR is_system_user = true LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM analytics_dashboards WHERE dashboard_name = 'Project Overview Dashboard' AND dashboard_type = 'prebuilt'
);

-- 2. Resource Analytics Dashboard
INSERT INTO analytics_dashboards (
    dashboard_name,
    dashboard_description,
    dashboard_category,
    dashboard_type,
    layout_config,
    widgets_config,
    auto_refresh_enabled,
    auto_refresh_interval_seconds,
    is_public,
    is_active,
    created_by
)
SELECT
    'Resource Analytics Dashboard',
    'Resource utilization, capacity, and allocation analytics',
    'resource',
    'prebuilt',
    '{"columns": 12, "rows": 8}'::jsonb,
    '[
        {
            "id": "widget1",
            "type": "metric",
            "title": "Total Resources",
            "dataSource": "resources",
            "config": {"calculation": "count"}
        },
        {
            "id": "widget2",
            "type": "metric",
            "title": "Available Resources",
            "dataSource": "resources",
            "config": {"calculation": "count", "filter": {"is_available": true}}
        },
        {
            "id": "widget3",
            "type": "chart",
            "title": "Resources by Type",
            "dataSource": "resources",
            "config": {"chartType": "bar", "xAxis": "resource_type"}
        }
    ]'::jsonb,
    true,
    300,
    true,
    true,
    (SELECT id FROM users WHERE email LIKE '%admin%' OR is_system_user = true LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM analytics_dashboards WHERE dashboard_name = 'Resource Analytics Dashboard' AND dashboard_type = 'prebuilt'
);

-- =====================================================
-- Pre-built KPI Definitions
-- =====================================================

-- 1. Project Completion Rate
INSERT INTO kpi_definitions (
    kpi_name,
    kpi_description,
    kpi_category,
    kpi_unit,
    calculation_type,
    data_source_type,
    data_source_name,
    target_value,
    target_type,
    threshold_warning,
    threshold_critical,
    display_format,
    decimal_places,
    is_active,
    created_by
)
SELECT
    'Project Completion Rate',
    'Percentage of projects completed on time',
    'project',
    'percentage',
    'custom',
    'function',
    'calculate_project_completion_rate',
    85.0,
    'fixed',
    75.0,
    60.0,
    'percentage',
    2,
    true,
    (SELECT id FROM users WHERE email LIKE '%admin%' OR is_system_user = true LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM kpi_definitions WHERE kpi_name = 'Project Completion Rate'
);

-- 2. Resource Utilization Rate
INSERT INTO kpi_definitions (
    kpi_name,
    kpi_description,
    kpi_category,
    kpi_unit,
    calculation_type,
    data_source_type,
    data_source_name,
    target_value,
    target_type,
    threshold_warning,
    threshold_critical,
    display_format,
    decimal_places,
    is_active,
    created_by
)
SELECT
    'Resource Utilization Rate',
    'Average resource utilization percentage',
    'resource',
    'percentage',
    'avg',
    'table',
    'resource_capacity',
    80.0,
    'fixed',
    90.0,
    95.0,
    'percentage',
    2,
    true,
    (SELECT id FROM users WHERE email LIKE '%admin%' OR is_system_user = true LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM kpi_definitions WHERE kpi_name = 'Resource Utilization Rate'
);

-- 3. Task Completion Rate
INSERT INTO kpi_definitions (
    kpi_name,
    kpi_description,
    kpi_category,
    kpi_unit,
    calculation_type,
    data_source_type,
    data_source_name,
    target_value,
    target_type,
    threshold_warning,
    threshold_critical,
    display_format,
    decimal_places,
    is_active,
    created_by
)
SELECT
    'Task Completion Rate',
    'Percentage of tasks completed on time',
    'task',
    'percentage',
    'custom',
    'function',
    'calculate_task_completion_rate',
    90.0,
    'fixed',
    80.0,
    70.0,
    'percentage',
    2,
    true,
    (SELECT id FROM users WHERE email LIKE '%admin%' OR is_system_user = true LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM kpi_definitions WHERE kpi_name = 'Task Completion Rate'
);

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE report_templates IS 'Includes pre-built templates: Project Status, Resource Utilization, Task Progress, Risk Summary, Issue Tracking';
COMMENT ON TABLE analytics_dashboards IS 'Includes pre-built dashboards: Project Overview, Resource Analytics';
COMMENT ON TABLE kpi_definitions IS 'Includes pre-built KPIs: Project Completion Rate, Resource Utilization Rate, Task Completion Rate';

