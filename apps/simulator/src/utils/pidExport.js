/**
 * PID Export Utilities
 * Functions for exporting Project Initiation Document data
 */

/**
 * Export PID to PDF
 */
export async function exportPIDToPDF(pid, objectives = [], interfaces = [], dependencies = [], teamMembers = [], tolerances = [], reportingArrangements = []) {
  // Create HTML content for PDF
  const htmlContent = generatePIDHTML(pid, objectives, interfaces, dependencies, teamMembers, tolerances, reportingArrangements)
  
  // Use browser print functionality
  const printWindow = window.open('', '_blank')
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Project Initiation Document - ${pid.pid_reference || pid.pid_title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1f2937; }
          h2 { color: #374151; margin-top: 24px; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f3f4f6; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.print()
}

/**
 * Export PID to Word
 */
export async function exportPIDToWord(pid, objectives = [], interfaces = [], dependencies = [], teamMembers = [], tolerances = [], reportingArrangements = []) {
  const htmlContent = generatePIDHTML(pid, objectives, interfaces, dependencies, teamMembers, tolerances, reportingArrangements)
  
  const blob = new Blob([htmlContent], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${pid.pid_reference || 'PID'}.doc`
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Export PID Summary to CSV
 */
export async function exportPIDSummaryToCSV(pid, objectives = []) {
  const rows = [
    ['PID Reference', pid.pid_reference || ''],
    ['PID Title', pid.pid_title || ''],
    ['Project', pid.project?.project_name || ''],
    ['Status', pid.status || 'draft'],
    ['Objectives Count', objectives.length.toString()],
    ['Objectives'],
    ['Reference', 'Title', 'Category', 'Priority']
  ]

  objectives.forEach(obj => {
    rows.push([
      obj.objective_reference || '',
      obj.objective_title || '',
      obj.objective_category || '',
      obj.priority || ''
    ])
  })

  const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${pid.pid_reference || 'PID'}_summary.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Export PID to Excel (CSV format)
 */
export async function exportPIDToExcel(pid, objectives = [], interfaces = [], dependencies = [], teamMembers = [], tolerances = [], reportingArrangements = []) {
  // For simplicity, export as CSV (can be enhanced with proper Excel library)
  await exportPIDSummaryToCSV(pid, objectives)
}

/**
 * Generate Print View
 */
export function generatePIDPrintView(pid, objectives = [], interfaces = [], dependencies = [], teamMembers = [], tolerances = [], reportingArrangements = []) {
  const htmlContent = generatePIDHTML(pid, objectives, interfaces, dependencies, teamMembers, tolerances, reportingArrangements)
  
  const printWindow = window.open('', '_blank')
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Project Initiation Document - ${pid.pid_reference || pid.pid_title}</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none; }
          }
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1f2937; }
          h2 { color: #374151; margin-top: 24px; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f3f4f6; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.print()
}

/**
 * Generate HTML content for PID
 */
function generatePIDHTML(pid, objectives, interfaces, dependencies, teamMembers, tolerances, reportingArrangements) {
  return `
    <h1>Project Initiation Document</h1>
    <p><strong>Reference:</strong> ${pid.pid_reference || 'Draft'}</p>
    <p><strong>Title:</strong> ${pid.pid_title || ''}</p>
    <p><strong>Project:</strong> ${pid.project?.project_name || ''}</p>
    <p><strong>Status:</strong> ${pid.status || 'draft'}</p>
    
    <h2>Project Definition</h2>
    <p>${pid.project_definition || 'Not defined'}</p>
    
    <h2>Project Scope</h2>
    <p>${pid.project_scope || 'Not defined'}</p>
    
    ${objectives.length > 0 ? `
      <h2>Project Objectives</h2>
      <table>
        <thead>
          <tr>
            <th>Reference</th>
            <th>Title</th>
            <th>Category</th>
            <th>Priority</th>
          </tr>
        </thead>
        <tbody>
          ${objectives.map(obj => `
            <tr>
              <td>${obj.objective_reference || ''}</td>
              <td>${obj.objective_title || ''}</td>
              <td>${obj.objective_category || ''}</td>
              <td>${obj.priority || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
    
    ${teamMembers.length > 0 ? `
      <h2>Team Structure</h2>
      <table>
        <thead>
          <tr>
            <th>Role</th>
            <th>Assigned To</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          ${teamMembers.map(member => `
            <tr>
              <td>${member.role_name || ''}</td>
              <td>${member.assigned_user?.full_name || member.assigned_user_name || 'Not assigned'}</td>
              <td>${member.role_type || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
  `
}
