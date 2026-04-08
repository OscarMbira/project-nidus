/**
 * Lessons Report Service
 * Provides comprehensive Lessons Report CRUD functionality
 */

import { platformDb } from './supabase/supabaseClient';
import { getLessonsSummary } from './lessonService';
import { getActionsByLesson } from './lessonActionService';
import { exportToPDF, exportToCSV, exportToExcel, generateLessonsReport as generateReportData } from '../utils/lessonExport';

/**
 * Create a new Lessons Report
 * @param {string} projectId - Project ID
 * @param {Object} reportData - Report data
 * @returns {Promise<Object>} Created report
 */
export async function createLessonsReport(projectId, reportData) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user ID from users table
    const { data: userRecord, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userRecord) {
      return { success: false, error: 'User record not found' };
    }

    // Get lessons log for project
    const { data: lessonsLog, error: logError } = await platformDb
      .from('lessons_logs')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (logError || !lessonsLog) {
      return { success: false, error: 'Lessons log not found for project' };
    }

    // Check if report can be created
    const { data: canCreate, error: checkError } = await platformDb.rpc(
      'can_create_lessons_report',
      {
        p_project_id: projectId,
        p_stage_boundary_id: reportData.stage_boundary_id || null,
        p_report_type: reportData.report_type || 'project'
      }
    );

    if (checkError || !canCreate) {
      return { success: false, error: 'Cannot create lessons report - prerequisites not met' };
    }

    // Prepare report data
    const newReport = {
      project_id: projectId,
      lessons_log_id: lessonsLog.id,
      stage_boundary_id: reportData.stage_boundary_id || null,
      report_type: reportData.report_type || 'project',
      report_date: reportData.report_date || new Date().toISOString().split('T')[0],
      reporting_period_start: reportData.reporting_period_start || null,
      reporting_period_end: reportData.reporting_period_end || null,
      report_status: 'draft',
      author_id: reportData.author_id || userRecord.id,
      author_name: reportData.author_name || null,
      prepared_by_id: reportData.prepared_by_id || userRecord.id,
      prepared_by_name: reportData.prepared_by_name || null,
      purpose: reportData.purpose || null,
      context: reportData.context || null,
      scope: reportData.scope || null,
      executive_summary: reportData.executive_summary || null,
      created_by: userRecord.id
    };

    // Generate reference if not provided
    if (!reportData.report_reference) {
      const { data: ref, error: refError } = await platformDb.rpc(
        'generate_lessons_report_reference',
        {
          p_project_id: projectId,
          p_stage_boundary_id: reportData.stage_boundary_id || null,
          p_report_type: reportData.report_type || 'project'
        }
      );

      if (!refError && ref) {
        newReport.report_reference = ref;
      }
    } else {
      newReport.report_reference = reportData.report_reference;
    }

    // Create report
    const { data, error } = await platformDb
      .from('lessons_reports')
      .insert(newReport)
      .select()
      .single();

    if (error) throw error;

    // Auto-populate from log if requested
    if (reportData.auto_populate !== false) {
      await autoPopulateFromLog(
        data.id,
        lessonsLog.id,
        reportData.stage_boundary_id || null,
        reportData.reporting_period_start || null,
        reportData.reporting_period_end || null
      );
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error creating lessons report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Lessons Report by ID
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Report data
 */
export async function getLessonsReportById(reportId) {
  try {
    const { data, error } = await platformDb
      .from('lessons_reports')
      .select(`
        *,
        project:project_id(id, project_name, project_code),
        lessons_log:lessons_log_id(id, log_reference),
        stage_boundary:stage_boundary_id(id, stage_name, stage_number),
        author:author_id(id, full_name, email),
        prepared_by:prepared_by_id(id, full_name, email)
      `)
      .eq('id', reportId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching lessons report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Lessons Reports by Project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Reports list
 */
export async function getLessonsReportsByProject(projectId) {
  try {
    const { data, error } = await platformDb
      .from('lessons_reports')
      .select(`
        *,
        project:project_id(id, project_name, project_code),
        stage_boundary:stage_boundary_id(id, stage_name, stage_number),
        author:author_id(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('report_date', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching lessons reports:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Lessons Reports by Stage
 * @param {string} stageBoundaryId - Stage boundary ID
 * @returns {Promise<Object>} Reports list
 */
export async function getLessonsReportsByStage(stageBoundaryId) {
  try {
    const { data, error } = await platformDb
      .from('lessons_reports')
      .select(`
        *,
        project:project_id(id, project_name, project_code),
        stage_boundary:stage_boundary_id(id, stage_name, stage_number),
        author:author_id(id, full_name, email)
      `)
      .eq('stage_boundary_id', stageBoundaryId)
      .eq('is_deleted', false)
      .order('report_date', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching lessons reports by stage:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update Lessons Report
 * @param {string} reportId - Report ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated report
 */
export async function updateLessonsReport(reportId, updates) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user ID
    const { data: userRecord, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userRecord) {
      return { success: false, error: 'User record not found' };
    }

    // Update report
    const { data, error } = await platformDb
      .from('lessons_reports')
      .update({
        ...updates,
        updated_by: userRecord.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating lessons report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete Lessons Report (soft delete)
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteLessonsReport(reportId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user ID
    const { data: userRecord, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userRecord) {
      return { success: false, error: 'User record not found' };
    }

    // Soft delete
    const { error } = await platformDb
      .from('lessons_reports')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userRecord.id
      })
      .eq('id', reportId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting lessons report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate report reference
 * @param {string} projectId - Project ID
 * @param {string} stageBoundaryId - Stage boundary ID (optional)
 * @param {string} reportType - Report type
 * @returns {Promise<Object>} Reference string
 */
export async function generateReportReference(projectId, stageBoundaryId = null, reportType = 'project') {
  try {
    const { data, error } = await platformDb.rpc('generate_lessons_report_reference', {
      p_project_id: projectId,
      p_stage_boundary_id: stageBoundaryId,
      p_report_type: reportType
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error generating report reference:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate report completeness
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Validation results
 */
export async function validateReportCompleteness(reportId) {
  try {
    const { data, error } = await platformDb.rpc('validate_lessons_report_completeness', {
      p_report_id: reportId
    });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error validating report completeness:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Auto-populate report from Lessons Log
 * @param {string} reportId - Report ID
 * @param {string} lessonsLogId - Lessons Log ID
 * @param {string} stageBoundaryId - Stage boundary ID (optional)
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Promise<Object>} Result
 */
export async function autoPopulateFromLog(reportId, lessonsLogId, stageBoundaryId = null, startDate = null, endDate = null) {
  try {
    const { error } = await platformDb.rpc('auto_populate_lessons_report_from_log', {
      p_report_id: reportId,
      p_lessons_log_id: lessonsLogId,
      p_stage_boundary_id: stageBoundaryId,
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error auto-populating report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Submit report for approval
 * @param {string} reportId - Report ID
 * @param {string} submittedToId - User ID to submit to
 * @returns {Promise<Object>} Result
 */
export async function submitReport(reportId, submittedToId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user ID
    const { data: userRecord, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userRecord) {
      return { success: false, error: 'User record not found' };
    }

    // Validate completeness before submission
    const validationResult = await validateReportCompleteness(reportId);
    if (!validationResult.success) {
      return { success: false, error: 'Cannot validate completeness' };
    }

    const overallCompleteness = validationResult.data?.find(s => s.section_name === 'Overall');
    if (!overallCompleteness || !overallCompleteness.is_complete) {
      return { 
        success: false, 
        error: `Report is not complete (${overallCompleteness?.completeness_percentage || 0}%). Please complete all required sections.` 
      };
    }

    // Update report status
    const { data, error } = await platformDb
      .from('lessons_reports')
      .update({
        report_status: 'submitted',
        submitted_at: new Date().toISOString(),
        submitted_to_id: submittedToId,
        updated_by: userRecord.id
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error submitting report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Close report
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Result
 */
export async function closeReport(reportId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user ID
    const { data: userRecord, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userRecord) {
      return { success: false, error: 'User record not found' };
    }

    // Update report status
    const { data, error } = await platformDb
      .from('lessons_reports')
      .update({
        report_status: 'closed',
        updated_by: userRecord.id
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error closing report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get report statistics
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Statistics
 */
export async function getReportStatistics(projectId) {
  try {
    const { data, error } = await platformDb.rpc('get_lessons_report_statistics', {
      p_project_id: projectId
    });

    if (error) throw error;

    return { success: true, data: data?.[0] || null };
  } catch (error) {
    console.error('Error getting report statistics:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate lessons report data
 * @param {string} projectId - Project ID
 * @param {Object} options - Report options
 * @returns {Promise<Object>} Report data
 */
export async function generateLessonsReport(projectId, options = {}) {
  try {
    const { data: summary } = await getLessonsSummary(projectId);
    
    // Get lessons with filters
    const filters = {
      ...options.filters,
      orderBy: options.orderBy || 'lesson_date',
      ascending: options.ascending || false
    };

    const { data: lessons } = await platformDb
      .from('lessons_learned')
      .select(`
        *,
        created_by_user:created_by(id, full_name, email),
        actioned_by_user:actioned_by_id(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order(filters.orderBy, { ascending: filters.ascending });

    // Get actions summary
    const { data: allActions } = await platformDb
      .from('lesson_actions')
      .select(`
        *,
        lesson:lesson_id(id, lesson_title)
      `)
      .eq('lesson.project_id', projectId)
      .eq('is_deleted', false);

    const actionsByStatus = {
      pending: allActions?.filter(a => a.status === 'pending') || [],
      in_progress: allActions?.filter(a => a.status === 'in_progress') || [],
      completed: allActions?.filter(a => a.status === 'completed') || [],
      cancelled: allActions?.filter(a => a.status === 'cancelled') || []
    };

    return {
      success: true,
      data: {
        summary,
        lessons: lessons || [],
        actions: actionsByStatus,
        generated_at: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error generating lessons report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Export lessons to CSV
 * @param {string} projectId - Project ID
 * @param {Object} options - Export options
 * @returns {Promise<string>} CSV content
 */
export async function exportLessonsToCSV(projectId, options = {}) {
  try {
    const { data: lessons } = await platformDb
      .from('lessons_learned')
      .select(`
        *,
        created_by_user:created_by(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('lesson_date', { ascending: false });

    if (!lessons || lessons.length === 0) {
      return { success: true, data: 'No lessons found' };
    }

    // CSV headers
    const headers = [
      'Reference',
      'Title',
      'Date',
      'Category',
      'Type',
      'Status',
      'Priority',
      'Effect',
      'Created By',
      'Created At',
      'Recommendations'
    ];

    // CSV rows
    const rows = lessons.map(lesson => [
      lesson.lesson_reference || '',
      lesson.lesson_title || '',
      lesson.lesson_date || '',
      lesson.lesson_category || '',
      lesson.lesson_type || '',
      lesson.status || '',
      lesson.priority || '',
      lesson.effect_type || '',
      lesson.created_by_user?.full_name || '',
      lesson.created_at || '',
      (lesson.recommendations || '').replace(/"/g, '""') // Escape quotes
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return { success: true, data: csvContent };
  } catch (error) {
    console.error('Error exporting lessons to CSV:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Export lessons to PDF (via browser print)
 * @param {string} projectId - Project ID
 * @param {Object} options - Export options
 * @returns {Promise<Object>} HTML content for printing
 */
export async function exportLessonsToPDF(projectId, options = {}) {
  try {
    const { data: project } = await platformDb
      .from('projects')
      .select('project_name, project_code')
      .eq('id', projectId)
      .single();

    const { data: summary } = await getLessonsSummary(projectId);

    const { data: lessons } = await platformDb
      .from('lessons_learned')
      .select(`
        *,
        created_by_user:created_by(id, full_name, email),
        actioned_by_user:actioned_by_id(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('lesson_date', { ascending: false });

    // Get lessons log
    const { data: log } = await platformDb
      .from('lessons_logs')
      .select('*, project:project_id(id, project_name, project_code), author:author_id(id, full_name), owner:owner_id(id, full_name)')
      .eq('project_id', projectId)
      .single();

    const logData = log || { project, log_reference: `LL-${projectId.substring(0, 8)}`, version_number: '1.0' };
    
    const htmlContent = generateLessonsReportHTML(project, summary, lessons || []);
    // Also available via export utility: generateLessonsLogPrintHTML(logData, lessons || [], summary)

    return { success: true, data: htmlContent };
  } catch (error) {
    console.error('Error generating PDF export:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate HTML content for lessons report
 * @param {Object} project - Project data
 * @param {Object} summary - Summary statistics
 * @param {Array} lessons - Lessons array
 * @returns {string} HTML content
 */
function generateLessonsReportHTML(project, summary, lessons) {
  const date = new Date().toLocaleDateString();
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Lessons Log Report - ${project?.project_name || 'Project'}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      color: #333;
    }
    .header {
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-bottom: 30px;
    }
    .summary-item {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 5px;
    }
    .summary-item h3 {
      margin: 0 0 5px 0;
      font-size: 24px;
      color: #2563eb;
    }
    .summary-item p {
      margin: 0;
      font-size: 12px;
      color: #666;
    }
    .lesson {
      margin-bottom: 30px;
      page-break-inside: avoid;
      border: 1px solid #ddd;
      padding: 15px;
      border-radius: 5px;
    }
    .lesson-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
    }
    .lesson-title {
      font-size: 18px;
      font-weight: bold;
      color: #2563eb;
    }
    .lesson-meta {
      font-size: 12px;
      color: #666;
    }
    .lesson-section {
      margin-bottom: 15px;
    }
    .lesson-section h4 {
      margin: 0 0 5px 0;
      font-size: 14px;
      color: #333;
      text-transform: uppercase;
    }
    .lesson-section p {
      margin: 0;
      font-size: 12px;
      line-height: 1.6;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: bold;
    }
    .badge-positive { background: #d1fae5; color: #065f46; }
    .badge-negative { background: #fee2e2; color: #991b1b; }
    .badge-neutral { background: #e5e7eb; color: #374151; }
    @media print {
      body { margin: 0; }
      .lesson { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Lessons Log Report</h1>
    <p><strong>Project:</strong> ${project?.project_name || 'N/A'} (${project?.project_code || 'N/A'})</p>
    <p><strong>Generated:</strong> ${date}</p>
  </div>

  ${summary ? `
  <div class="summary">
    <div class="summary-item">
      <h3>${summary.total_lessons || 0}</h3>
      <p>Total Lessons</p>
    </div>
    <div class="summary-item">
      <h3>${summary.positive_lessons || 0}</h3>
      <p>Positive</p>
    </div>
    <div class="summary-item">
      <h3>${summary.negative_lessons || 0}</h3>
      <p>Negative</p>
    </div>
    <div class="summary-item">
      <h3>${summary.corporate_lessons || 0}</h3>
      <p>Corporate</p>
    </div>
    <div class="summary-item">
      <h3>${summary.actions_pending || 0}</h3>
      <p>Actions Pending</p>
    </div>
  </div>
  ` : ''}

  <div class="lessons">
    ${lessons.map(lesson => `
      <div class="lesson">
        <div class="lesson-header">
          <div>
            <div class="lesson-title">${lesson.lesson_title || 'Untitled Lesson'}</div>
            <div class="lesson-meta">
              ${lesson.lesson_reference || ''} | 
              ${lesson.lesson_date || ''} | 
              ${lesson.created_by_user?.full_name || 'Unknown'}
            </div>
          </div>
          <div>
            ${lesson.effect_type ? `<span class="badge badge-${lesson.effect_type}">${lesson.effect_type}</span>` : ''}
            ${lesson.status ? `<span class="badge">${lesson.status}</span>` : ''}
          </div>
        </div>
        
        ${lesson.what_happened ? `
        <div class="lesson-section">
          <h4>What Happened</h4>
          <p>${lesson.what_happened}</p>
        </div>
        ` : ''}
        
        ${lesson.why_it_happened ? `
        <div class="lesson-section">
          <h4>Why It Happened</h4>
          <p>${lesson.why_it_happened}</p>
        </div>
        ` : ''}
        
        ${lesson.lesson_learned ? `
        <div class="lesson-section">
          <h4>Lesson Learned</h4>
          <p>${lesson.lesson_learned}</p>
        </div>
        ` : ''}
        
        ${lesson.recommendations ? `
        <div class="lesson-section">
          <h4>Recommendations</h4>
          <p>${lesson.recommendations}</p>
        </div>
        ` : ''}
      </div>
    `).join('')}
  </div>
</body>
</html>
  `;
}
