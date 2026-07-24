/**
 * Product Status Account Export Utilities
 * Export functions for Product Status Accounts
 */

/**
 * Export Product Status Account to PDF
 * @param {Object} psa - Product Status Account data
 * @param {Array} statusHistory - Status history
 * @param {Array} progressSnapshots - Progress snapshots
 * @param {Array} linkedIssues - Linked issues
 * @param {Array} milestones - Milestones
 * @param {Array} dependencies - Dependencies
 * @param {string} filename - Output filename
 */
export async function exportPSAToPDF(
  psa,
  statusHistory = [],
  progressSnapshots = [],
  linkedIssues = [],
  milestones = [],
  dependencies = [],
  filename = null
) {
  try {
    // Generate HTML content
    const htmlContent = generatePSAPDFHTML(psa, statusHistory, progressSnapshots, linkedIssues, milestones, dependencies)
    
    // Create print window
    const printWindow = window.open('', '_blank')
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print()
    }, 500)
    
    return { success: true }
  } catch (error) {
    console.error('Error exporting PSA to PDF:', error)
    throw new Error('Error exporting PDF: ' + error.message)
  }
}

/**
 * Export Product Status Account to Word
 * @param {Object} psa - Product Status Account data
 * @param {Array} statusHistory - Status history
 * @param {Array} progressSnapshots - Progress snapshots
 * @param {Array} linkedIssues - Linked issues
 * @param {Array} milestones - Milestones
 * @param {Array} dependencies - Dependencies
 * @param {string} filename - Output filename
 */
export async function exportPSAToWord(
  psa,
  statusHistory = [],
  progressSnapshots = [],
  linkedIssues = [],
  milestones = [],
  dependencies = [],
  filename = null
) {
  try {
    // Generate HTML content
    const htmlContent = generatePSAWordHTML(psa, statusHistory, progressSnapshots, linkedIssues, milestones, dependencies)
    
    // Create blob
    const blob = new Blob([htmlContent], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    
    // Create download link
    const link = document.createElement('a')
    link.href = url
    link.download = filename || `PSA-${psa.psa_reference || psa.id}-${new Date().toISOString().split('T')[0]}.doc`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    return { success: true }
  } catch (error) {
    console.error('Error exporting PSA to Word:', error)
    throw new Error('Error exporting Word: ' + error.message)
  }
}

/**
 * Export Product Status Account Summary to CSV
 * @param {Array} psas - Array of Product Status Accounts
 * @param {string} filename - Output filename
 */
export function exportPSASummaryToCSV(psas, filename = null) {
  try {
    if (!psas || psas.length === 0) {
      throw new Error('No Product Status Accounts to export')
    }

    // Define CSV headers
    const headers = [
      'PSA Reference',
      'Product Name',
      'Product Reference',
      'Product Type',
      'Current Status',
      'Progress %',
      'Progress Indicator',
      'Planned Start',
      'Actual Start',
      'Planned Completion',
      'Forecast Completion',
      'Actual Completion',
      'Schedule Variance (Days)',
      'Quality Status',
      'Acceptance Status',
      'Handover Status',
      'Has Issues',
      'Issue Count',
      'Has Blockers',
      'Blocker Count',
      'Assigned To',
      'Team Name',
      'Report Date'
    ]

    // Convert data to CSV rows
    const csvRows = [
      headers.join(','),
      ...psas.map(psa => [
        psa.psa_reference || '',
        `"${(psa.product_name || '').replace(/"/g, '""')}"`,
        psa.product_reference || '',
        psa.product_type || '',
        psa.current_status || '',
        psa.progress_percentage || 0,
        psa.progress_indicator || '',
        psa.planned_start_date || '',
        psa.actual_start_date || '',
        psa.planned_completion_date || '',
        psa.forecast_completion_date || '',
        psa.actual_completion_date || '',
        psa.schedule_variance_days || 0,
        psa.quality_status || '',
        psa.acceptance_status || '',
        psa.handover_status || '',
        psa.has_issues ? 'Yes' : 'No',
        psa.issue_count || 0,
        psa.has_blockers ? 'Yes' : 'No',
        psa.blocker_count || 0,
        psa.assigned_to?.full_name || '',
        psa.team_name || '',
        psa.report_date || ''
      ].join(','))
    ]

    const csvContent = csvRows.join('\n')
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || `PSA-Summary-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    return { success: true }
  } catch (error) {
    console.error('Error exporting PSA to CSV:', error)
    throw new Error('Error exporting CSV: ' + error.message)
  }
}

/**
 * Export Product Status Account to Excel (CSV format with .xlsx extension)
 * @param {Array} psas - Array of Product Status Accounts
 * @param {string} filename - Output filename
 */
export function exportPSAToExcel(psas, filename = null) {
  // For now, export as CSV (Excel can open CSV files)
  // In a full implementation, would use a library like xlsx
  return exportPSASummaryToCSV(psas, filename ? filename.replace('.xlsx', '.csv') : null)
}

/**
 * Generate HTML for PDF export
 */
function generatePSAPDFHTML(psa, statusHistory, progressSnapshots, linkedIssues, milestones, dependencies) {
  const formatDate = (date) => date ? new Date(date).toLocaleDateString() : 'N/A'
  const formatStatus = (status) => status ? status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Product Status Account - ${psa.psa_reference || 'PSA'}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      color: #333;
    }
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .header h1 {
      color: #2563eb;
      margin: 0;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .section-title {
      background-color: #f3f4f6;
      padding: 10px;
      font-weight: bold;
      border-left: 4px solid #2563eb;
      margin-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    table th, table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    table th {
      background-color: #f3f4f6;
      font-weight: bold;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
    .status-not_started { background-color: #e5e7eb; }
    .status-in_progress { background-color: #fef3c7; }
    .status-completed { background-color: #d1fae5; }
    .status-accepted { background-color: #d1fae5; }
    .status-on_hold { background-color: #fed7aa; }
    .status-cancelled { background-color: #fee2e2; }
    @media print {
      .no-print { display: none; }
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Product Status Account</h1>
    <p><strong>Reference:</strong> ${psa.psa_reference || 'N/A'}</p>
    <p><strong>Report Date:</strong> ${formatDate(psa.report_date)}</p>
  </div>

  <div class="section">
    <div class="section-title">Product Information</div>
    <table>
      <tr><th>Product Name</th><td>${psa.product_name || 'N/A'}</td></tr>
      <tr><th>Product Reference</th><td>${psa.product_reference || 'N/A'}</td></tr>
      <tr><th>Product Type</th><td>${formatStatus(psa.product_type)}</td></tr>
      <tr><th>Product Category</th><td>${psa.product_category || 'N/A'}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Current Status</div>
    <table>
      <tr><th>Status</th><td><span class="status-badge status-${psa.current_status}">${formatStatus(psa.current_status)}</span></td></tr>
      <tr><th>Status Date</th><td>${formatDate(psa.status_date)}</td></tr>
      <tr><th>Status Set By</th><td>${psa.status_set_by_user?.full_name || 'N/A'}</td></tr>
      <tr><th>Status Notes</th><td>${psa.status_notes || 'N/A'}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Progress</div>
    <table>
      <tr><th>Progress Percentage</th><td>${psa.progress_percentage || 0}%</td></tr>
      <tr><th>Progress Indicator</th><td>${formatStatus(psa.progress_indicator)}</td></tr>
      <tr><th>Last Progress Update</th><td>${formatDate(psa.last_progress_update)}</td></tr>
      <tr><th>Progress Notes</th><td>${psa.progress_notes || 'N/A'}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Schedule</div>
    <table>
      <tr><th>Planned Start Date</th><td>${formatDate(psa.planned_start_date)}</td></tr>
      <tr><th>Actual Start Date</th><td>${formatDate(psa.actual_start_date)}</td></tr>
      <tr><th>Planned Completion Date</th><td>${formatDate(psa.planned_completion_date)}</td></tr>
      <tr><th>Forecast Completion Date</th><td>${formatDate(psa.forecast_completion_date)}</td></tr>
      <tr><th>Actual Completion Date</th><td>${formatDate(psa.actual_completion_date)}</td></tr>
      <tr><th>Schedule Variance (Days)</th><td>${psa.schedule_variance_days !== null ? psa.schedule_variance_days : 'N/A'}</td></tr>
    </table>
  </div>

  ${psa.status_summary ? `
  <div class="section">
    <div class="section-title">Status Summary</div>
    <p>${psa.status_summary.replace(/\n/g, '<br>')}</p>
  </div>
  ` : ''}

  ${statusHistory.length > 0 ? `
  <div class="section">
    <div class="section-title">Status History</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Previous Status</th>
          <th>New Status</th>
          <th>Changed By</th>
          <th>Reason</th>
        </tr>
      </thead>
      <tbody>
        ${statusHistory.map(h => `
          <tr>
            <td>${formatDate(h.status_change_date)}</td>
            <td>${formatStatus(h.previous_status)}</td>
            <td>${formatStatus(h.new_status)}</td>
            <td>${h.status_changed_by_user?.full_name || 'N/A'}</td>
            <td>${h.status_change_reason || 'N/A'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${linkedIssues.length > 0 ? `
  <div class="section">
    <div class="section-title">Linked Issues & Blockers</div>
    <table>
      <thead>
        <tr>
          <th>Issue Type</th>
          <th>Issue Summary</th>
          <th>Linked Date</th>
          <th>Resolved</th>
          <th>Impact</th>
        </tr>
      </thead>
      <tbody>
        ${linkedIssues.map(issue => `
          <tr>
            <td>${formatStatus(issue.issue_type)}</td>
            <td>${issue.issue_summary || issue.issue?.issue_title || 'N/A'}</td>
            <td>${formatDate(issue.linked_date)}</td>
            <td>${issue.is_resolved ? 'Yes' : 'No'}</td>
            <td>${issue.impact_on_product || 'N/A'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${milestones.length > 0 ? `
  <div class="section">
    <div class="section-title">Milestones</div>
    <table>
      <thead>
        <tr>
          <th>Milestone Name</th>
          <th>Type</th>
          <th>Planned Date</th>
          <th>Actual Date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${milestones.map(m => `
          <tr>
            <td>${m.milestone_name}</td>
            <td>${formatStatus(m.milestone_type)}</td>
            <td>${formatDate(m.planned_date)}</td>
            <td>${formatDate(m.actual_date)}</td>
            <td>${formatStatus(m.milestone_status)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Quality & Acceptance</div>
    <table>
      <tr><th>Quality Status</th><td>${formatStatus(psa.quality_status)}</td></tr>
      <tr><th>Quality Review Date</th><td>${formatDate(psa.quality_review_date)}</td></tr>
      <tr><th>Quality Reviewer</th><td>${psa.quality_reviewer?.full_name || 'N/A'}</td></tr>
      <tr><th>Acceptance Status</th><td>${formatStatus(psa.acceptance_status)}</td></tr>
      <tr><th>Acceptance Date</th><td>${formatDate(psa.acceptance_date)}</td></tr>
      <tr><th>Accepted By</th><td>${psa.accepted_by?.full_name || 'N/A'}</td></tr>
      <tr><th>Handover Status</th><td>${formatStatus(psa.handover_status)}</td></tr>
      <tr><th>Handover Date</th><td>${formatDate(psa.handover_date)}</td></tr>
    </table>
  </div>

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
    <p>Generated on ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `
}

/**
 * Generate HTML for Word export
 */
function generatePSAWordHTML(psa, statusHistory, progressSnapshots, linkedIssues, milestones, dependencies) {
  // Similar to PDF but optimized for Word
  return generatePSAPDFHTML(psa, statusHistory, progressSnapshots, linkedIssues, milestones, dependencies)
}

/**
 * Generate printable view HTML
 */
export function generatePSAPrintView(psa, statusHistory, progressSnapshots, linkedIssues, milestones, dependencies) {
  return generatePSAPDFHTML(psa, statusHistory, progressSnapshots, linkedIssues, milestones, dependencies)
}
