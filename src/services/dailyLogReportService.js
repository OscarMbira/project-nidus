/**
 * Daily Log Report Service
 * Provides reporting functionality for daily logs
 */

import { platformDb } from './supabase/supabaseClient';
import { getSummary } from './dailyLogService';
import { getOverdueEntries } from './dailyLogEntryService';

/**
 * Get summary statistics for a project's daily log
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Summary statistics
 */
export async function getSummaryStats(projectId) {
  return getSummary(projectId);
}

/**
 * Get overdue entries for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Overdue entries
 */
export async function getOverdueEntriesReport(projectId) {
  return getOverdueEntries(projectId);
}

/**
 * Get entries grouped by type
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Entries by type
 */
export async function getEntriesByType(projectId) {
  try {
    // Get log ID
    const { data: log, error: logError } = await platformDb
      .from('daily_logs')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (logError) {
      return { success: true, data: {} };
    }

    const { data, error } = await platformDb
      .from('daily_log_entries')
      .select('entry_type')
      .eq('daily_log_id', log.id)
      .eq('is_deleted', false);

    if (error) throw error;

    // Group by type
    const grouped = (data || []).reduce((acc, entry) => {
      acc[entry.entry_type] = (acc[entry.entry_type] || 0) + 1;
      return acc;
    }, {});

    return { success: true, data: grouped };
  } catch (error) {
    console.error('Error getting entries by type:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get entries grouped by person responsible
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Entries by person
 */
export async function getEntriesByPerson(projectId) {
  try {
    // Get log ID
    const { data: log, error: logError } = await platformDb
      .from('daily_logs')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (logError) {
      return { success: true, data: [] };
    }

    const { data, error } = await platformDb
      .from('daily_log_entries')
      .select(`
        person_responsible_id,
        person_responsible_name,
        person_responsible:person_responsible_id(id, full_name, email)
      `)
      .eq('daily_log_id', log.id)
      .eq('is_deleted', false)
      .not('person_responsible_id', 'is', null);

    if (error) throw error;

    // Group by person
    const grouped = (data || []).reduce((acc, entry) => {
      const personId = entry.person_responsible_id || 'external';
      const personName = entry.person_responsible?.full_name || entry.person_responsible_name || 'Unknown';

      if (!acc[personId]) {
        acc[personId] = {
          id: entry.person_responsible_id,
          name: personName,
          email: entry.person_responsible?.email || null,
          count: 0
        };
      }
      acc[personId].count++;
      return acc;
    }, {});

    return { success: true, data: Object.values(grouped) };
  } catch (error) {
    console.error('Error getting entries by person:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Export entries to CSV
 * @param {string} projectId - Project ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} CSV data
 */
export async function exportToCSV(projectId, filters = {}) {
  try {
    // Get log ID
    const { data: log, error: logError } = await platformDb
      .from('daily_logs')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (logError) {
      return { success: false, error: 'Daily log not found' };
    }

    // Get entries with filters
    const { data: entries, error: entriesError } = await platformDb
      .from('daily_log_entries')
      .select(`
        entry_number,
        entry_date,
        entry_type,
        description,
        person_responsible:person_responsible_id(full_name),
        person_responsible_name,
        target_date,
        status,
        priority,
        tags,
        results,
        created_at
      `)
      .eq('daily_log_id', log.id)
      .eq('is_deleted', false);

    if (entriesError) throw entriesError;

    // Apply filters
    let filtered = entries || [];
    if (filters.status) {
      filtered = filtered.filter(e => e.status === filters.status);
    }
    if (filters.entry_type) {
      filtered = filtered.filter(e => e.entry_type === filters.entry_type);
    }
    if (filters.start_date) {
      filtered = filtered.filter(e => e.entry_date >= filters.start_date);
    }
    if (filters.end_date) {
      filtered = filtered.filter(e => e.entry_date <= filters.end_date);
    }

    // Convert to CSV format
    const headers = ['Entry #', 'Date', 'Type', 'Description', 'Person Responsible', 'Target Date', 'Status', 'Priority', 'Tags', 'Results', 'Created'];
    const rows = filtered.map(entry => [
      entry.entry_number,
      entry.entry_date,
      entry.entry_type,
      entry.description?.replace(/"/g, '""') || '', // Escape quotes
      entry.person_responsible?.full_name || entry.person_responsible_name || '',
      entry.target_date || '',
      entry.status,
      entry.priority || '',
      (entry.tags || []).join('; '),
      entry.results?.replace(/"/g, '""') || '',
      entry.created_at
    ]);

    const csv = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return { success: true, data: csv };
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Export entries to PDF
 * @param {string} projectId - Project ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} PDF HTML for print
 */
export async function exportToPDF(projectId, filters = {}) {
  try {
    // Get log ID
    const { data: log, error: logError } = await platformDb
      .from('daily_logs')
      .select('id, log_reference, projects:project_id(project_name, project_code)')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (logError) {
      return { success: false, error: 'Daily log not found' };
    }

    // Get entries with filters
    const { data: entries, error: entriesError } = await platformDb
      .from('daily_log_entries')
      .select(`
        entry_number,
        entry_date,
        entry_type,
        description,
        person_responsible:person_responsible_id(full_name),
        person_responsible_name,
        target_date,
        status,
        priority,
        tags,
        results,
        created_at
      `)
      .eq('daily_log_id', log.id)
      .eq('is_deleted', false)
      .order('entry_date', { ascending: false })
      .order('entry_number', { ascending: false });

    if (entriesError) throw entriesError;

    // Apply filters
    let filtered = entries || [];
    if (filters.status) {
      filtered = filtered.filter(e => e.status === filters.status);
    }
    if (filters.entry_type) {
      filtered = filtered.filter(e => e.entry_type === filters.entry_type);
    }
    if (filters.start_date) {
      filtered = filtered.filter(e => e.entry_date >= filters.start_date);
    }
    if (filters.end_date) {
      filtered = filtered.filter(e => e.entry_date <= filters.end_date);
    }

    // Generate HTML for print
    const projectName = log.projects?.project_name || 'Project';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Log - ${projectName}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
              .no-print { display: none; }
              @page { size: A4; margin: 1cm; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 12px;
              line-height: 1.6;
            }
            h1 {
              color: #1f2937;
              margin-bottom: 10px;
              font-size: 24px;
            }
            .header {
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 2px solid #e5e7eb;
            }
            .meta {
              color: #6b7280;
              font-size: 11px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background-color: #f3f4f6;
              padding: 8px;
              text-align: left;
              border: 1px solid #d1d5db;
              font-weight: 600;
            }
            td {
              padding: 8px;
              border: 1px solid #d1d5db;
              vertical-align: top;
            }
            .entry-type {
              font-weight: 600;
              text-transform: capitalize;
            }
            .status {
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 10px;
              text-transform: capitalize;
            }
            .status-open { background-color: #e5e7eb; }
            .status-in_progress { background-color: #dbeafe; }
            .status-completed { background-color: #d1fae5; }
            .status-cancelled { background-color: #fee2e2; }
            .status-escalated { background-color: #fed7aa; }
            .description {
              max-width: 300px;
              word-wrap: break-word;
            }
            .footer {
              margin-top: 30px;
              padding-top: 10px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Daily Log: ${projectName}</h1>
            <div class="meta">
              Reference: ${log.log_reference} | 
              Generated: ${new Date().toLocaleString()} |
              Total Entries: ${filtered.length}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Person Responsible</th>
                <th>Target Date</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Results</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(entry => `
                <tr>
                  <td>${entry.entry_number}</td>
                  <td>${new Date(entry.entry_date).toLocaleDateString()}</td>
                  <td class="entry-type">${entry.entry_type}</td>
                  <td class="description">${(entry.description || '').replace(/"/g, '&quot;')}</td>
                  <td>${entry.person_responsible?.full_name || entry.person_responsible_name || '-'}</td>
                  <td>${entry.target_date ? new Date(entry.target_date).toLocaleDateString() : '-'}</td>
                  <td><span class="status status-${entry.status}">${entry.status}</span></td>
                  <td>${entry.priority || '-'}</td>
                  <td>${(entry.results || '').replace(/"/g, '&quot;') || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>This document was generated from the Daily Log system.</p>
            <p class="no-print">
              <button onclick="window.print()">Print / Save as PDF</button>
              <button onclick="window.close()">Close</button>
            </p>
          </div>
        </body>
      </html>
    `;

    return { success: true, data: html };
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    return { success: false, error: error.message };
  }
}
