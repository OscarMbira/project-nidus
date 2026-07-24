/**
 * Gantt Chart Export Utilities
 *
 * Provides functionality to export Gantt chart data to various formats:
 * - CSV (task list with dates)
 * - PNG (visual screenshot)
 * - PDF (visual document)
 * - Print (browser print dialog)
 */

/**
 * Export tasks to CSV format
 *
 * @param {Array} tasks - Array of tasks to export
 * @param {Array} dependencies - Array of dependencies (optional)
 * @param {string} projectName - Project name for filename
 * @returns {void} - Downloads CSV file
 */
export function exportToCSV(tasks, dependencies = [], projectName = 'project') {
  if (!tasks || tasks.length === 0) {
    alert('No tasks to export');
    return;
  }

  // Define CSV headers
  const headers = [
    'Task ID',
    'Task Name',
    'Start Date',
    'End Date',
    'Duration (Days)',
    'Progress (%)',
    'Is Milestone',
    'Is Critical Path',
    'Assigned To',
    'Dependencies',
    'Baseline Start',
    'Baseline End',
    'Variance (Days)'
  ];

  // Build CSV rows
  const rows = tasks.map(task => {
    const startDate = new Date(task.start || task.start_date);
    const endDate = new Date(task.end || task.due_date);
    const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    // Get dependencies for this task
    const taskDeps = dependencies
      .filter(dep => dep.target_task_id === task.id)
      .map(dep => dep.source_task_id)
      .join('; ');

    // Calculate variance if baseline exists
    let variance = '';
    if (task.baseline_start_date && task.baseline_end_date) {
      const baselineStart = new Date(task.baseline_start_date);
      const actualStart = startDate;
      const varianceDays = Math.floor((actualStart - baselineStart) / (1000 * 60 * 60 * 24));
      variance = varianceDays > 0 ? `+${varianceDays}` : `${varianceDays}`;
    }

    return [
      task.id,
      `"${(task.name || task.task_name || '').replace(/"/g, '""')}"`, // Escape quotes
      formatDate(startDate),
      formatDate(endDate),
      duration,
      task.progress || task.progress_percentage || 0,
      task.is_milestone ? 'Yes' : 'No',
      task.is_critical_path || task.custom_class === 'critical-path' ? 'Yes' : 'No',
      task.assigned_to || '',
      `"${taskDeps}"`,
      task.baseline_start_date ? formatDate(new Date(task.baseline_start_date)) : '',
      task.baseline_end_date ? formatDate(new Date(task.baseline_end_date)) : '',
      variance
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${sanitizeFilename(projectName)}_gantt_${formatDateForFilename(new Date())}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export Gantt chart to PNG image
 *
 * @param {HTMLElement} ganttElement - The Gantt chart DOM element
 * @param {string} projectName - Project name for filename
 * @returns {Promise<void>} - Downloads PNG file
 */
export async function exportToPNG(ganttElement, projectName = 'project') {
  if (!ganttElement) {
    alert('Gantt chart element not found');
    return;
  }

  try {
    // For now, we'll use a simple approach
    // In production, you'd use html2canvas library
    // npm install html2canvas

    // Check if html2canvas is available
    if (typeof window.html2canvas === 'undefined') {
      // Fallback: Show instructions to user
      alert(
        'PNG Export requires html2canvas library.\n\n' +
        'For now, you can:\n' +
        '1. Take a screenshot manually (Ctrl+Shift+S or Cmd+Shift+4)\n' +
        '2. Or use browser print and save as PDF\n\n' +
        'PNG export will be fully functional in the next update.'
      );
      return;
    }

    // If html2canvas is available, use it
    const canvas = await window.html2canvas(ganttElement, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher quality
      logging: false,
      useCORS: true
    });

    // Convert to blob and download
    canvas.toBlob((blob) => {
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `${sanitizeFilename(projectName)}_gantt_${formatDateForFilename(new Date())}.png`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    });

  } catch (error) {
    console.error('Error exporting to PNG:', error);
    alert('Failed to export PNG. Please try the print function instead.');
  }
}

/**
 * Export Gantt chart to PDF
 *
 * @param {HTMLElement} ganttElement - The Gantt chart DOM element
 * @param {string} projectName - Project name for filename
 * @param {Object} options - Export options
 * @returns {Promise<void>} - Downloads PDF file
 */
export async function exportToPDF(ganttElement, projectName = 'project', options = {}) {
  if (!ganttElement) {
    alert('Gantt chart element not found');
    return;
  }

  try {
    // For now, use browser print functionality
    // In production, you'd use jsPDF + html2canvas
    // npm install jspdf html2canvas

    // Check if jsPDF is available
    if (typeof window.jspdf === 'undefined') {
      // Fallback: Use browser print
      const printWindow = window.open('', '_blank');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${projectName} - Gantt Chart</title>
            <style>
              @media print {
                body { margin: 0; padding: 20px; }
                .no-print { display: none; }
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              }
              h1 {
                color: #1f2937;
                margin-bottom: 20px;
              }
              .gantt-container {
                width: 100%;
                overflow: visible;
              }
            </style>
          </head>
          <body>
            <h1>${projectName} - Gantt Chart</h1>
            <div class="gantt-container">
              ${ganttElement.innerHTML}
            </div>
            <p class="no-print" style="margin-top: 20px; text-align: center;">
              <button onclick="window.print()">Print / Save as PDF</button>
              <button onclick="window.close()">Close</button>
            </p>
          </body>
        </html>
      `);

      printWindow.document.close();

      // Auto-trigger print dialog after a delay
      setTimeout(() => {
        printWindow.print();
      }, 500);

      return;
    }

    // If jsPDF is available, use it for better quality
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Use html2canvas to capture the element
    const canvas = await window.html2canvas(ganttElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 280; // A4 landscape width - margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    pdf.save(`${sanitizeFilename(projectName)}_gantt_${formatDateForFilename(new Date())}.pdf`);

  } catch (error) {
    console.error('Error exporting to PDF:', error);
    alert('Failed to export PDF. Please try the print function instead.');
  }
}

/**
 * Open browser print dialog for Gantt chart
 *
 * @param {HTMLElement} ganttElement - The Gantt chart DOM element
 * @param {string} projectName - Project name
 */
export function printGanttChart(ganttElement, projectName = 'project') {
  if (!ganttElement) {
    alert('Gantt chart element not found');
    return;
  }

  // Create a print-friendly window
  const printWindow = window.open('', '_blank', 'width=1200,height=800');

  if (!printWindow) {
    alert('Please allow pop-ups to use the print function');
    return;
  }

  const now = new Date().toLocaleString();

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${projectName} - Gantt Chart</title>
        <style>
          @page {
            size: landscape;
            margin: 1cm;
          }

          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            .no-print {
              display: none !important;
            }
            .print-header {
              margin-bottom: 10px;
              padding-bottom: 10px;
              border-bottom: 2px solid #333;
            }
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            padding: 20px;
            background: white;
            color: #1f2937;
          }

          .print-header {
            margin-bottom: 20px;
          }

          .print-header h1 {
            margin: 0 0 5px 0;
            font-size: 24px;
            color: #1f2937;
          }

          .print-header p {
            margin: 0;
            color: #6b7280;
            font-size: 12px;
          }

          .gantt-container {
            width: 100%;
            overflow: visible;
          }

          /* Override Gantt styles for print */
          .gantt-container svg {
            max-width: 100%;
            height: auto;
          }

          .button-group {
            margin: 20px 0;
            text-align: center;
          }

          button {
            padding: 10px 20px;
            margin: 0 10px;
            font-size: 14px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            background: white;
            cursor: pointer;
            transition: all 0.2s;
          }

          button:hover {
            background: #f3f4f6;
            border-color: #9ca3af;
          }

          button.primary {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
          }

          button.primary:hover {
            background: #2563eb;
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>${projectName} - Gantt Chart</h1>
          <p>Generated: ${now}</p>
        </div>

        <div class="gantt-container">
          ${ganttElement.outerHTML}
        </div>

        <div class="button-group no-print">
          <button class="primary" onclick="window.print()">🖨️ Print / Save as PDF</button>
          <button onclick="window.close()">Close</button>
        </div>

        <script>
          // Auto-open print dialog after page loads
          window.onload = function() {
            setTimeout(function() {
              // Uncomment to auto-trigger print
              // window.print();
            }, 500);
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}

/**
 * Export dependency report to CSV
 *
 * @param {Array} dependencies - Array of dependencies
 * @param {Array} tasks - Array of tasks (for task names)
 * @param {string} projectName - Project name for filename
 */
export function exportDependenciesToCSV(dependencies, tasks, projectName = 'project') {
  if (!dependencies || dependencies.length === 0) {
    alert('No dependencies to export');
    return;
  }

  // Create a map of task IDs to names for lookup
  const taskMap = {};
  tasks.forEach(task => {
    taskMap[task.id] = task.name || task.task_name || task.id;
  });

  // Define CSV headers
  const headers = [
    'Dependency ID',
    'Predecessor Task',
    'Successor Task',
    'Dependency Type',
    'Lag (Days)',
    'Description'
  ];

  // Build CSV rows
  const rows = dependencies.map(dep => {
    return [
      dep.id,
      `"${(taskMap[dep.source_task_id] || dep.source_task_id).replace(/"/g, '""')}"`,
      `"${(taskMap[dep.target_task_id] || dep.target_task_id).replace(/"/g, '""')}"`,
      dep.dependency_type,
      dep.lag_days || 0,
      `"${(dep.description || '').replace(/"/g, '""')}"`
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${sanitizeFilename(projectName)}_dependencies_${formatDateForFilename(new Date())}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Helper: Format date to YYYY-MM-DD
 */
function formatDate(date) {
  if (!date || isNaN(date)) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper: Format date for filename (YYYYMMDD)
 */
function formatDateForFilename(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Helper: Sanitize filename
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-z0-9_\-]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

/**
 * Show export options dialog
 *
 * @param {Function} onExport - Callback with selected format
 */
export function showExportDialog(onExport) {
  const formats = [
    { value: 'csv', label: 'CSV (Task List)', icon: '📊' },
    { value: 'png', label: 'PNG (Image)', icon: '🖼️' },
    { value: 'pdf', label: 'PDF (Document)', icon: '📄' },
    { value: 'print', label: 'Print', icon: '🖨️' }
  ];

  // Simple confirmation with format selection
  const message = 'Choose export format:\n\n' +
    formats.map((f, i) => `${i + 1}. ${f.icon} ${f.label}`).join('\n') +
    '\n\nEnter number (1-4):';

  const choice = prompt(message);
  const index = parseInt(choice) - 1;

  if (index >= 0 && index < formats.length) {
    onExport(formats[index].value);
  }
}

export default {
  exportToCSV,
  exportToPNG,
  exportToPDF,
  printGanttChart,
  exportDependenciesToCSV,
  showExportDialog
};
