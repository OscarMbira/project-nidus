/**
 * Quality Activity Bulk Import Service
 * Handles CSV bulk import of quality activities
 */

import { supabase } from './supabaseClient';

/**
 * Parse CSV file and return array of objects
 * @param {string} csvContent - CSV file content
 * @returns {Array} Parsed data array
 */
export function parseQualityActivityCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  // Expected headers for quality activity import
  const expectedHeaders = [
    'Activity Type',
    'Review/Inspection Title',
    'Product Reference',
    'Quality Method',
    'Planned Date',
    'Forecast Date',
    'Project Code',
    'Programme Code',
    'Chair/Inspector Email',
    'Review Type',
    'Notes'
  ];

  // Validate headers
  const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
  }

  // Parse data rows
  const activities = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) {
      console.warn(`Row ${i + 1} has ${values.length} columns but header has ${headers.length}, skipping`);
      continue;
    }

    const rowData = {};
    headers.forEach((header, index) => {
      rowData[header.trim()] = values[index]?.trim() || '';
    });

    activities.push(rowData);
  }

  return activities;
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line) {
  const values = [];
  let currentValue = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentValue += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(currentValue);
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  // Add last value
  values.push(currentValue);

  return values;
}

/**
 * Validate activity data before import
 * @param {Object} activityData - Activity data object
 * @param {number} rowNumber - Row number for error reporting
 * @returns {Object} Validation result
 */
export function validateActivityData(activityData, rowNumber) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!activityData['Activity Type']) {
    errors.push(`Row ${rowNumber}: Activity Type is required`);
  } else if (!['review', 'inspection', 'Review', 'Inspection'].includes(activityData['Activity Type'])) {
    errors.push(`Row ${rowNumber}: Activity Type must be 'review' or 'inspection'`);
  }

  if (!activityData['Review/Inspection Title']) {
    errors.push(`Row ${rowNumber}: Review/Inspection Title is required`);
  }

  if (!activityData['Planned Date']) {
    errors.push(`Row ${rowNumber}: Planned Date is required`);
  } else {
    // Validate date format
    const date = new Date(activityData['Planned Date']);
    if (isNaN(date.getTime())) {
      errors.push(`Row ${rowNumber}: Planned Date must be a valid date (YYYY-MM-DD)`);
    }
  }

  // Validate project/programme lookup
  if (!activityData['Project Code'] && !activityData['Programme Code']) {
    warnings.push(`Row ${rowNumber}: Either Project Code or Programme Code is recommended`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Bulk import quality activities from CSV data
 * @param {Array} activitiesData - Array of parsed activity data
 * @param {Object} options - Import options
 * @returns {Promise<Object>} Import result
 */
export async function bulkImportActivities(activitiesData, options = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user ID from users table
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) {
      throw new Error('User record not found');
    }

    const results = {
      total: activitiesData.length,
      successful: 0,
      failed: 0,
      errors: [],
      imported: []
    };

    // Validate all rows first
    const validationResults = activitiesData.map((activityData, index) => {
      return validateActivityData(activityData, index + 2); // +2 for header row and 1-based indexing
    });

    const validationErrors = validationResults.flatMap((result, index) => {
      return result.errors.map(err => ({ row: index + 2, error: err }));
    });

    if (validationErrors.length > 0 && !options.skipValidation) {
      return {
        success: false,
        error: 'Validation failed',
        validationErrors,
        results
      };
    }

    // Fetch lookup data once
    const projectsMap = new Map();
    const programmesMap = new Map();
    const usersMap = new Map();
    const qualityRegisterMap = new Map();

    // Fetch projects and programmes
    const [projectsResult, programmesResult, usersResult] = await Promise.all([
      supabase
        .from('projects')
        .select('id, project_code')
        .eq('is_deleted', false),
      supabase
        .from('programmes')
        .select('id, programme_code')
        .eq('is_deleted', false),
      supabase
        .from('users')
        .select('id, email')
        .eq('is_deleted', false)
    ]);

    if (projectsResult.data) {
      projectsResult.data.forEach(p => projectsMap.set(p.project_code, p.id));
    }

    if (programmesResult.data) {
      programmesResult.data.forEach(p => programmesMap.set(p.programme_code, p.id));
    }

    if (usersResult.data) {
      usersResult.data.forEach(u => usersMap.set(u.email.toLowerCase(), u.id));
    }

    // Import each activity
    for (let i = 0; i < activitiesData.length; i++) {
      const activityData = activitiesData[i];
      
      try {
        const activityType = activityData['Activity Type']?.toLowerCase();
        
        // Resolve project/programme
        let projectId = null;
        let programmeId = null;

        if (activityData['Project Code']) {
          projectId = projectsMap.get(activityData['Project Code']);
          if (!projectId) {
            throw new Error(`Project not found: ${activityData['Project Code']}`);
          }
        }

        if (activityData['Programme Code']) {
          programmeId = programmesMap.get(activityData['Programme Code']);
          if (!programmeId) {
            throw new Error(`Programme not found: ${activityData['Programme Code']}`);
          }
        }

        if (!projectId && !programmeId) {
          throw new Error('Either Project Code or Programme Code must be valid');
        }

        // If programme but no project, we'd need to get a project from the programme
        // For now, require project
        if (!projectId) {
          throw new Error('Project Code is required for import');
        }

        // Resolve quality register if product reference provided
        let qualityRegisterId = null;
        if (activityData['Product Reference']) {
          const { data: register } = await supabase
            .from('quality_register')
            .select('id')
            .eq('project_id', projectId)
            .eq('product_reference', activityData['Product Reference'])
            .eq('is_deleted', false)
            .single();

          if (register) {
            qualityRegisterId = register.id;
          }
        }

        // Resolve chair/inspector
        let chairUserId = null;
        let inspectorUserId = null;
        if (activityData['Chair/Inspector Email']) {
          const userId = usersMap.get(activityData['Chair/Inspector Email'].toLowerCase());
          if (userId) {
            if (activityType === 'review') {
              chairUserId = userId;
            } else {
              inspectorUserId = userId;
            }
          }
        }

        // Prepare insert data
        const insertData = {
          project_id: projectId,
          programme_id: programmeId || null,
          quality_register_id: qualityRegisterId,
          planned_date: activityData['Planned Date'],
          forecast_date: activityData['Forecast Date'] || null,
          created_by: userRecord.id,
          updated_by: userRecord.id
        };

        if (activityType === 'review') {
          insertData.review_title = activityData['Review/Inspection Title'];
          insertData.review_type = activityData['Review Type'] || 'peer-review';
          insertData.chair_user_id = chairUserId;
          insertData.review_status = 'planned';
          if (activityData['Notes']) {
            insertData.notes = activityData['Notes'];
          }

          const { data, error } = await supabase
            .from('quality_reviews')
            .insert(insertData)
            .select()
            .single();

          if (error) throw error;
          results.imported.push({ type: 'review', id: data.id, identifier: data.activity_identifier });
        } else if (activityType === 'inspection') {
          insertData.inspection_title = activityData['Review/Inspection Title'];
          insertData.inspection_type = activityData['Quality Method'] || 'process';
          insertData.inspector_user_id = inspectorUserId;
          insertData.inspection_date = activityData['Planned Date'];
          if (activityData['Notes']) {
            insertData.notes = activityData['Notes'];
          }

          const { data, error } = await supabase
            .from('quality_inspections')
            .insert(insertData)
            .select()
            .single();

          if (error) throw error;
          results.imported.push({ type: 'inspection', id: data.id, identifier: data.activity_identifier });
        } else {
          throw new Error(`Invalid activity type: ${activityType}`);
        }

        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 2,
          error: error.message,
          data: activityData
        });
      }
    }

    return {
      success: results.failed === 0,
      results
    };
  } catch (error) {
    console.error('Error in bulk import:', error);
    return {
      success: false,
      error: error.message,
      results: { total: activitiesData.length, successful: 0, failed: activitiesData.length, errors: [], imported: [] }
    };
  }
}

/**
 * Generate CSV template for bulk import
 * @returns {string} CSV template content
 */
export function generateBulkImportTemplate() {
  const headers = [
    'Activity Type',
    'Review/Inspection Title',
    'Product Reference',
    'Quality Method',
    'Planned Date',
    'Forecast Date',
    'Project Code',
    'Programme Code',
    'Chair/Inspector Email',
    'Review Type',
    'Notes'
  ];

  const exampleRow = [
    'review',
    'Technical Design Review',
    'PPD-001',
    'Technical Review',
    '2026-02-01',
    '2026-02-01',
    'PROJ-001',
    '',
    'reviewer@example.com',
    'technical-review',
    'Review of system design document'
  ];

  const csvContent = [
    headers.join(','),
    exampleRow.map(field => `"${field}"`).join(',')
  ].join('\n');

  const BOM = '\uFEFF';
  return BOM + csvContent;
}

/**
 * Download CSV template
 */
export function downloadBulkImportTemplate() {
  const template = generateBulkImportTemplate();
  const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'quality-activities-import-template.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default {
  parseQualityActivityCSV,
  validateActivityData,
  bulkImportActivities,
  generateBulkImportTemplate,
  downloadBulkImportTemplate
};
