import { supabase } from './supabaseClient';

/**
 * Report Builder Service
 * Handles custom report creation, templates, scheduling, and export
 */

/**
 * Get report definition by ID
 */
export async function getReportDefinition(reportId) {
  const { data, error } = await supabase
    .from('report_definitions')
    .select(`
      *,
      category:report_categories(id, category_name, category_description),
      created_by_user:users!created_by(id, email, full_name),
      template:report_templates(id, template_name, template_description)
    `)
    .eq('id', reportId)
    .eq('is_deleted', false)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get report definitions with filters
 */
export async function getReportDefinitions(filters = {}) {
  let query = supabase
    .from('report_definitions')
    .select(`
      *,
      category:report_categories(id, category_name, category_description),
      created_by_user:users!created_by(id, email, full_name)
    `)
    .eq('is_deleted', false);

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id);
  }
  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  if (filters.report_type) {
    query = query.eq('report_type', filters.report_type);
  }
  if (filters.is_scheduled !== undefined) {
    // Check if report has schedules
    query = filters.is_scheduled 
      ? query.not('id', 'in', `(SELECT report_definition_id FROM report_schedules WHERE is_deleted = false)`)
      : query;
  }
  if (filters.search) {
    query = query.or(`report_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Save report definition
 */
export async function saveReportDefinition(reportData, reportId = null) {
  if (reportId) {
    const { data, error } = await supabase
      .from('report_definitions')
      .update({
        ...reportData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('report_definitions')
      .insert({
        ...reportData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Delete report definition
 */
export async function deleteReportDefinition(reportId) {
  const { data, error } = await supabase
    .from('report_definitions')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get report templates
 */
export async function getReportTemplates(filters = {}) {
  let query = supabase
    .from('report_templates')
    .select(`
      *,
      category:report_categories(id, category_name)
    `)
    .eq('is_deleted', false);

  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  if (filters.template_type) {
    query = query.eq('template_type', filters.template_type);
  }
  if (filters.is_system_template !== undefined) {
    query = query.eq('is_system_template', filters.is_system_template);
  }
  if (filters.search) {
    query = query.or(`template_name.ilike.%${filters.search}%,template_description.ilike.%${filters.search}%`);
  }

  query = query.order('template_name', { ascending: true });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get report template by ID
 */
export async function getReportTemplate(templateId) {
  const { data, error } = await supabase
    .from('report_templates')
    .select(`
      *,
      category:report_categories(id, category_name)
    `)
    .eq('id', templateId)
    .eq('is_deleted', false)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get report schedules
 */
export async function getReportSchedules(filters = {}) {
  let query = supabase
    .from('report_schedules')
    .select(`
      *,
      report:report_definitions(id, report_name, report_type),
      recipient_user:recipient_user_id(id, email, full_name)
    `)
    .eq('is_deleted', false);

  if (filters.report_definition_id) {
    query = query.eq('report_definition_id', filters.report_definition_id);
  }
  if (filters.recipient_user_id) {
    query = query.eq('recipient_user_id', filters.recipient_user_id);
  }
  if (filters.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }

  query = query.order('schedule_time', { ascending: true });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Save report schedule
 */
export async function saveReportSchedule(scheduleData, scheduleId = null) {
  if (scheduleId) {
    const { data, error } = await supabase
      .from('report_schedules')
      .update({
        ...scheduleData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('report_schedules')
      .insert({
        ...scheduleData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Delete report schedule
 */
export async function deleteReportSchedule(scheduleId) {
  const { data, error } = await supabase
    .from('report_schedules')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get report categories
 */
export async function getReportCategories() {
  const { data, error } = await supabase
    .from('report_categories')
    .select('*')
    .eq('is_deleted', false)
    .eq('is_active', true)
    .order('category_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Generate report data (runs the report query)
 */
export async function generateReportData(reportDefinition) {
  try {
    // If report has a SQL query, execute it
    if (reportDefinition.query_sql) {
      // Note: This requires RPC function or direct query execution
      // For security, use RPC functions that validate queries
      const { data, error } = await supabase.rpc('execute_report_query', {
        query_text: reportDefinition.query_sql,
        parameters: reportDefinition.query_parameters || {}
      });

      if (error) throw error;
      return data || [];
    }

    // If report has data source configuration, fetch based on that
    if (reportDefinition.data_source) {
      return await fetchDataSourceData(reportDefinition);
    }

    return [];
  } catch (error) {
    console.error('Error generating report data:', error);
    throw error;
  }
}

/**
 * Fetch data from configured data source
 */
async function fetchDataSourceData(reportDefinition) {
  // This is a placeholder - implement based on data_source configuration
  // Could query different tables based on data_source field
  const { data, error } = await supabase
    .from(reportDefinition.data_source)
    .select('*')
    .limit(1000);

  if (error) throw error;
  return data || [];
}

/**
 * Export report to different formats
 */
export async function exportReport(reportId, format = 'pdf', options = {}) {
  try {
    const report = await getReportDefinition(reportId);
    const reportData = await generateReportData(report);

    // Format conversion would happen here
    // For now, return data in requested format structure
    switch (format.toLowerCase()) {
      case 'pdf':
        return {
          format: 'pdf',
          data: reportData,
          report: report,
          // PDF generation would be done client-side or via server function
        };
      case 'excel':
      case 'xlsx':
        return {
          format: 'xlsx',
          data: reportData,
          report: report,
        };
      case 'csv':
        return {
          format: 'csv',
          data: reportData,
          report: report,
        };
      case 'json':
        return {
          format: 'json',
          data: reportData,
          report: report,
        };
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    throw error;
  }
}

/**
 * Get available data sources for report builder
 */
export async function getAvailableDataSources() {
  // Return list of available tables/data sources
  return [
    { id: 'projects', name: 'Projects', description: 'Project data' },
    { id: 'tasks', name: 'Tasks', description: 'Task data' },
    { id: 'resources', name: 'Resources', description: 'Resource data' },
    { id: 'risks', name: 'Risks', description: 'Risk register' },
    { id: 'issues', name: 'Issues', description: 'Issue log' },
    { id: 'change_requests', name: 'Change Requests', description: 'Change management' },
    { id: 'quality_register', name: 'Quality Register', description: 'Quality data' },
    { id: 'stakeholders', name: 'Stakeholders', description: 'Stakeholder data' },
  ];
}

/**
 * Get available fields for a data source
 */
export async function getDataSourceFields(dataSource) {
  // This would typically query the database schema
  // For now, return common fields based on data source
  const fieldMaps = {
    projects: [
      { name: 'id', type: 'uuid', label: 'ID' },
      { name: 'project_name', type: 'text', label: 'Project Name' },
      { name: 'project_code', type: 'text', label: 'Project Code' },
      { name: 'project_status', type: 'text', label: 'Status' },
      { name: 'start_date', type: 'date', label: 'Start Date' },
      { name: 'end_date', type: 'date', label: 'End Date' },
      { name: 'budget', type: 'decimal', label: 'Budget' },
    ],
    tasks: [
      { name: 'id', type: 'uuid', label: 'ID' },
      { name: 'task_name', type: 'text', label: 'Task Name' },
      { name: 'task_status', type: 'text', label: 'Status' },
      { name: 'start_date', type: 'date', label: 'Start Date' },
      { name: 'end_date', type: 'date', label: 'End Date' },
      { name: 'progress_percentage', type: 'decimal', label: 'Progress %' },
    ],
  };

  return fieldMaps[dataSource] || [];
}

/**
 * Preview report
 */
export async function previewReport(reportDefinition) {
  const data = await generateReportData(reportDefinition);
  return {
    report: reportDefinition,
    data: data,
    rowCount: data.length,
    generatedAt: new Date().toISOString(),
  };
}

