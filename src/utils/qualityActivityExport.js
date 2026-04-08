/**
 * Quality Activity Export Utilities
 * Provides export functionality for quality activities (PDF, CSV, Excel, Print)
 */

/**
 * Export quality activity to PDF matching template structure
 * @param {Object} activity - Quality activity data
 * @param {Array} participants - Activity participants
 * @param {Array} records - Quality records
 * @param {Array} actions - Action items
 * @param {string} filename - Output filename
 */
export async function exportActivityToPDF(activity, participants = [], records = [], actions = [], filename = null) {
  try {
    // Dynamic import to reduce bundle size
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ]);

    // Create temporary container matching PDF template
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '210mm'; // A4 width
    container.style.padding = '20mm';
    container.style.backgroundColor = 'white';
    container.style.color = 'black';
    container.style.fontFamily = 'Arial, sans-serif';
    container.className = 'quality-activity-export-pdf';

    // Build HTML content matching PDF template
    let html = generateActivityPDFHTML(activity, participants, records, actions);
    
    container.innerHTML = html;
    document.body.appendChild(container);

    // Convert to canvas then PDF
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Cleanup
    document.body.removeChild(container);

    // Save PDF
    const defaultFilename = `Quality-Activity-${activity.activity_identifier || activity.id}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename || defaultFilename);
  } catch (error) {
    console.error('Error exporting activity to PDF:', error);
    throw new Error('Error exporting PDF: ' + error.message);
  }
}

/**
 * Generate HTML for PDF export matching template structure
 */
function generateActivityPDFHTML(activity, participants, records, actions) {
  const formatDate = (date) => {
    if (!date) return '_________';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getResultText = (result) => {
    if (!result) return 'Pending';
    return result.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  let html = `
    <div style="color: black; font-family: Arial, sans-serif;">
      <!-- Header -->
      <div style="border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
        <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">QUALITY REGISTER</div>
        <div style="font-size: 14px; color: #666;">FORM [${activity.activity_identifier || 'N/A'}]</div>
      </div>

      <!-- Programme and Project -->
      ${(activity.programme_name || activity.project_name) ? `
      <div style="margin-bottom: 15px; font-size: 12px;">
        ${activity.programme_name ? `<div><strong>Programme Name:</strong> ${activity.programme_name}</div>` : ''}
        ${activity.project_name ? `<div><strong>Project Name:</strong> ${activity.project_name}</div>` : ''}
      </div>
      ` : ''}

      <!-- Quality Identifier -->
      <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
        <div style="font-weight: bold; margin-bottom: 5px; font-size: 12px;">Quality Identifier:</div>
        <div style="font-size: 16px; font-family: monospace; font-weight: bold;">${activity.activity_identifier || 'N/A'}</div>
        ${activity.is_reassessment ? '<div style="font-size: 10px; color: #666; margin-top: 5px;">(Reassessment)</div>' : ''}
      </div>

      <!-- Product Information -->
      <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 12px;">
          <div>
            <div style="font-weight: bold; margin-bottom: 5px;">Product Identifier:</div>
            <div>${activity.product_identifier || 'N/A'}</div>
          </div>
          <div>
            <div style="font-weight: bold; margin-bottom: 5px;">Product Title:</div>
            <div>${activity.product_title || 'N/A'}</div>
          </div>
        </div>
      </div>

      <!-- Quality Method -->
      <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
        <div style="font-weight: bold; margin-bottom: 5px; font-size: 12px;">Quality Method:</div>
        <div style="font-size: 14px; text-transform: capitalize;">${activity.quality_method || 'N/A'}</div>
      </div>

      <!-- Roles/Responsibilities -->
      <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
        <div style="font-weight: bold; margin-bottom: 10px; font-size: 12px;">Roles/Responsibilities:</div>
        ${participants.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th style="border: 1px solid #000; padding: 5px; text-align: left;">Role</th>
              <th style="border: 1px solid #000; padding: 5px; text-align: left;">Name</th>
              <th style="border: 1px solid #000; padding: 5px; text-align: left;">Responsibilities</th>
            </tr>
          </thead>
          <tbody>
            ${participants.map(p => `
              <tr>
                <td style="border: 1px solid #000; padding: 5px;">${p.participant_role || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 5px;">${p.user?.full_name || p.user?.email || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 5px;">${p.responsibilities || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : '<div style="font-size: 11px; color: #666;">No participants assigned</div>'}
      </div>

      <!-- Result -->
      <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
        <div style="font-weight: bold; margin-bottom: 5px; font-size: 12px;">Result:</div>
        <div style="font-size: 14px; font-weight: bold;">${getResultText(activity.result)}</div>
      </div>

      <!-- Quality Records -->
      <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
        <div style="font-weight: bold; margin-bottom: 10px; font-size: 12px;">Quality Records:</div>
        ${records.length > 0 ? `
        <ul style="margin: 0; padding-left: 20px; font-size: 11px;">
          ${records.map(r => `<li>${r.record_type}: ${r.record_title}${r.record_reference ? ` (${r.record_reference})` : ''}</li>`).join('')}
        </ul>
        ` : '<div style="font-size: 11px; color: #666;">No records linked</div>'}
      </div>

      <!-- Dates Table -->
      <div style="margin-bottom: 20px;">
        <div style="font-weight: bold; text-align: center; margin-bottom: 10px; font-size: 12px;">DATES</div>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: 11px;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th style="border: 1px solid #000; padding: 8px; text-align: left; font-weight: bold;"></th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">Planned</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">Forecast</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">Actual</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">Quality Activity</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: center;">${formatDate(activity.planned_date)}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: center;">${formatDate(activity.forecast_date)}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: center;">${formatDate(activity.actual_date)}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">Sign-Off</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: center;">${formatDate(activity.sign_off_planned_date)}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: center;">${formatDate(activity.sign_off_forecast_date)}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: center;">${formatDate(activity.sign_off_actual_date)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Action Items -->
      ${actions.length > 0 ? `
      <div style="border-top: 2px solid #000; padding-top: 15px; margin-top: 20px;">
        <div style="font-weight: bold; margin-bottom: 10px; font-size: 12px;">Action Items:</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #000;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th style="border: 1px solid #000; padding: 5px; text-align: left;">Description</th>
              <th style="border: 1px solid #000; padding: 5px; text-align: left;">Priority</th>
              <th style="border: 1px solid #000; padding: 5px; text-align: left;">Assigned To</th>
              <th style="border: 1px solid #000; padding: 5px; text-align: center;">Due Date</th>
              <th style="border: 1px solid #000; padding: 5px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${actions.map(a => `
              <tr>
                <td style="border: 1px solid #000; padding: 5px;">${a.action_description}</td>
                <td style="border: 1px solid #000; padding: 5px;">${a.priority || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 5px;">${a.assigned_to_user?.full_name || a.assigned_to_user?.email || 'Unassigned'}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${a.due_date ? formatDate(a.due_date) : '-'}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${a.status || 'open'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- Footer -->
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 9px; color: #666; text-align: center;">
        Generated on ${new Date().toLocaleString()}
      </div>
    </div>
  `;

  return html;
}

/**
 * Export quality activities to CSV
 * @param {Array} activities - Array of activity objects
 * @param {string} filename - Output filename
 */
export function exportActivitiesToCSV(activities, filename = null) {
  try {
    const csvRows = [];

    // Header row
    csvRows.push([
      'Activity ID',
      'Activity Type',
      'Product Title',
      'Product Identifier',
      'Quality Method',
      'Result',
      'Planned Date',
      'Forecast Date',
      'Actual Date',
      'Sign-Off Planned',
      'Sign-Off Forecast',
      'Sign-Off Actual',
      'Is Reassessment',
      'Project Name',
      'Programme Name',
      'Status'
    ]);

    // Data rows
    activities.forEach(activity => {
      csvRows.push([
        activity.activity_identifier || '',
        activity.activity_type || '',
        activity.product_title || '',
        activity.product_identifier || '',
        activity.quality_method || '',
        activity.result || '',
        activity.planned_date || '',
        activity.forecast_date || '',
        activity.actual_date || '',
        activity.sign_off_planned_date || '',
        activity.sign_off_forecast_date || '',
        activity.sign_off_actual_date || '',
        activity.is_reassessment ? 'Yes' : 'No',
        activity.project_name || '',
        activity.programme_name || '',
        activity.activity_status || ''
      ]);
    });

    // Convert to CSV string
    const csvContent = csvRows.map(row => {
      return row.map(field => {
        // Escape fields containing commas or quotes
        if (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field || '';
      }).join(',');
    }).join('\n');

    // Add BOM for Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename || `quality-activities-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw new Error('Error exporting CSV: ' + error.message);
  }
}

/**
 * Export quality activity summary report to CSV
 * @param {Array} activities - Array of activity objects
 * @param {Object} project - Project data
 * @param {string} filename - Output filename
 */
export function exportActivitySummaryToCSV(activities, project = null, filename = null) {
  try {
    const csvRows = [];

    // Title
    csvRows.push(['QUALITY ACTIVITIES SUMMARY REPORT']);
    csvRows.push([]);
    
    if (project) {
      csvRows.push(['Project:', project.project_name || '']);
      csvRows.push(['Project Code:', project.project_code || '']);
      csvRows.push([]);
    }

    csvRows.push(['Report Date:', new Date().toLocaleDateString()]);
    csvRows.push([]);

    // Summary Statistics
    const total = activities.length;
    const passed = activities.filter(a => a.result === 'passed').length;
    const failed = activities.filter(a => a.result === 'failed').length;
    const pending = activities.filter(a => !a.result || a.result === 'pending').length;
    const reassessments = activities.filter(a => a.is_reassessment).length;

    csvRows.push(['SUMMARY STATISTICS']);
    csvRows.push(['Total Activities:', total]);
    csvRows.push(['Passed:', passed]);
    csvRows.push(['Failed:', failed]);
    csvRows.push(['Pending:', pending]);
    csvRows.push(['Reassessments:', reassessments]);
    csvRows.push([]);

    // Activities by Type
    const reviews = activities.filter(a => a.activity_type === 'review').length;
    const inspections = activities.filter(a => a.activity_type === 'inspection').length;

    csvRows.push(['BY TYPE']);
    csvRows.push(['Reviews:', reviews]);
    csvRows.push(['Inspections:', inspections]);
    csvRows.push([]);

    // Detailed Activity List
    csvRows.push(['DETAILED ACTIVITY LIST']);
    csvRows.push([
      'Activity ID',
      'Type',
      'Product',
      'Method',
      'Result',
      'Planned Date',
      'Actual Date',
      'Status'
    ]);

    activities.forEach(activity => {
      csvRows.push([
        activity.activity_identifier || '',
        activity.activity_type || '',
        activity.product_title || '',
        activity.quality_method || '',
        activity.result || 'Pending',
        activity.planned_date || '',
        activity.actual_date || '',
        activity.activity_status || ''
      ]);
    });

    // Convert to CSV
    const csvContent = csvRows.map(row => {
      return row.map(field => {
        if (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field || '';
      }).join(',');
    }).join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename || `quality-activities-summary-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting summary to CSV:', error);
    throw new Error('Error exporting summary CSV: ' + error.message);
  }
}

/**
 * Generate printable HTML for quality activity
 * @param {Object} activity - Quality activity data
 * @param {Array} participants - Activity participants
 * @param {Array} records - Quality records
 * @param {Array} actions - Action items
 * @returns {string} HTML content
 */
export function generateActivityPrintableHTML(activity, participants = [], records = [], actions = []) {
  return generateActivityPDFHTML(activity, participants, records, actions);
}

/**
 * Print quality activity
 * @param {Object} activity - Quality activity data
 * @param {Array} participants - Activity participants
 * @param {Array} records - Quality records
 * @param {Array} actions - Action items
 */
export function printActivity(activity, participants = [], records = [], actions = []) {
  try {
    const printWindow = window.open('', '_blank');
    const html = generateActivityPrintableHTML(activity, participants, records, actions);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quality Activity - ${activity.activity_identifier || 'Export'}</title>
          <style>
            @media print {
              @page { margin: 1cm; }
              body { font-family: Arial, sans-serif; }
            }
            body {
              font-family: Arial, sans-serif;
              color: black;
              background: white;
            }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  } catch (error) {
    console.error('Error printing activity:', error);
    throw new Error('Error printing: ' + error.message);
  }
}

/**
 * Export activities summary report to PDF
 * @param {Array} activities - Array of activity objects
 * @param {Object} project - Project data
 * @param {Object} filters - Applied filters
 * @param {string} filename - Output filename
 */
export async function exportActivitiesSummaryToPDF(activities, project = null, filters = {}, filename = null) {
  try {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ]);

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '210mm';
    container.style.padding = '20mm';
    container.style.backgroundColor = 'white';
    container.style.color = 'black';
    container.style.fontFamily = 'Arial, sans-serif';

    const html = generateSummaryReportHTML(activities, project, filters);
    container.innerHTML = html;
    document.body.appendChild(container);

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    document.body.removeChild(container);

    const defaultFilename = `Quality-Activities-Summary-${project?.project_code || 'Report'}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename || defaultFilename);
  } catch (error) {
    console.error('Error exporting summary to PDF:', error);
    throw new Error('Error exporting summary PDF: ' + error.message);
  }
}

/**
 * Generate HTML for summary report
 */
function generateSummaryReportHTML(activities, project, filters) {
  const total = activities.length;
  const passed = activities.filter(a => a.result === 'passed').length;
  const failed = activities.filter(a => a.result === 'failed').length;
  const pending = activities.filter(a => !a.result || a.result === 'pending').length;
  const reviews = activities.filter(a => a.activity_type === 'review').length;
  const inspections = activities.filter(a => a.activity_type === 'inspection').length;

  let html = `
    <div style="color: black; font-family: Arial, sans-serif;">
      <h1 style="font-size: 24px; margin-bottom: 10px; border-bottom: 3px solid #000; padding-bottom: 10px;">
        Quality Activities Summary Report
      </h1>

      ${project ? `
      <div style="margin-bottom: 20px;">
        <p><strong>Project:</strong> ${project.project_name || ''}</p>
        ${project.project_code ? `<p><strong>Project Code:</strong> ${project.project_code}</p>` : ''}
      </div>
      ` : ''}

      <div style="margin-bottom: 20px;">
        <p><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>

      <h2 style="font-size: 18px; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 5px;">
        Summary Statistics
      </h2>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 1px solid #000;">
        <tr>
          <td style="border: 1px solid #000; padding: 10px; font-weight: bold; background-color: #f0f0f0;">Total Activities</td>
          <td style="border: 1px solid #000; padding: 10px;">${total}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 10px; font-weight: bold; background-color: #f0f0f0;">Passed</td>
          <td style="border: 1px solid #000; padding: 10px;">${passed}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 10px; font-weight: bold; background-color: #f0f0f0;">Failed</td>
          <td style="border: 1px solid #000; padding: 10px;">${failed}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 10px; font-weight: bold; background-color: #f0f0f0;">Pending</td>
          <td style="border: 1px solid #000; padding: 10px;">${pending}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 10px; font-weight: bold; background-color: #f0f0f0;">Reviews</td>
          <td style="border: 1px solid #000; padding: 10px;">${reviews}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 10px; font-weight: bold; background-color: #f0f0f0;">Inspections</td>
          <td style="border: 1px solid #000; padding: 10px;">${inspections}</td>
        </tr>
      </table>

      <h2 style="font-size: 18px; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 5px;">
        Activity List
      </h2>

      <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 10px;">
        <thead>
          <tr style="background-color: #f0f0f0;">
            <th style="border: 1px solid #000; padding: 8px; text-align: left;">Activity ID</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: left;">Type</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: left;">Product</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: left;">Method</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: center;">Result</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: center;">Planned Date</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: center;">Actual Date</th>
          </tr>
        </thead>
        <tbody>
          ${activities.map(activity => `
            <tr>
              <td style="border: 1px solid #000; padding: 8px;">${activity.activity_identifier || ''}</td>
              <td style="border: 1px solid #000; padding: 8px;">${activity.activity_type || ''}</td>
              <td style="border: 1px solid #000; padding: 8px;">${activity.product_title || ''}</td>
              <td style="border: 1px solid #000; padding: 8px;">${activity.quality_method || ''}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: center;">${activity.result || 'Pending'}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: center;">${activity.planned_date ? new Date(activity.planned_date).toLocaleDateString() : ''}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: center;">${activity.actual_date ? new Date(activity.actual_date).toLocaleDateString() : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 9px; color: #666; text-align: center;">
        Generated on ${new Date().toLocaleString()}
      </div>
    </div>
  `;

  return html;
}
