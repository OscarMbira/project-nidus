/**
 * Issue Register Export Utilities
 * Provides export functionality for issues (PDF, CSV, Excel)
 */

/**
 * Export issues to CSV format
 * @param {Array} issues - Array of issue objects
 * @param {string} filename - Output filename
 */
export function exportToCSV(issues, filename = 'issue_register.csv') {
  if (!issues || issues.length === 0) {
    alert('No issues to export')
    return
  }

  // Define CSV headers
  const headers = [
    'Issue ID',
    'Issue Identifier',
    'Type',
    'Title',
    'Status',
    'Priority',
    'Severity',
    'Raised By',
    'Raised Date',
    'Owner',
    'Cost Impact',
    'Schedule Impact (Days)',
    'Description'
  ]

  // Convert issues to CSV rows
  const rows = issues.map(issue => [
    issue.id || '',
    issue.issue_identifier || `ISS-${issue.issue_number || ''}`,
    issue.issue_type?.replace('_', ' ') || '',
    issue.issue_title || '',
    issue.status || '',
    issue.priority || '',
    issue.severity || '',
    issue.raised_by?.full_name || issue.raised_by_name || '',
    issue.date_raised || '',
    issue.owner?.full_name || issue.owner_name || '',
    issue.cost_impact || '',
    issue.schedule_impact_days || '',
    (issue.issue_description || '').replace(/"/g, '""').replace(/\n/g, ' ')
  ])

  // Combine headers and rows
  const csvContent = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export issues to Excel format (using CSV with .xlsx extension for simplicity)
 * For full Excel support, would need xlsx library
 * @param {Array} issues - Array of issue objects
 * @param {string} filename - Output filename
 */
export function exportToExcel(issues, filename = 'issue_register.xlsx') {
  // For now, export as CSV with .xlsx extension
  // Full Excel support would require xlsx library: import * as XLSX from 'xlsx'
  exportToCSV(issues, filename.replace('.xlsx', '.csv'))
  
  // TODO: Implement full Excel export with xlsx library
  // const worksheet = XLSX.utils.json_to_sheet(issues)
  // const workbook = XLSX.utils.book_new()
  // XLSX.utils.book_append_sheet(workbook, worksheet, 'Issues')
  // XLSX.writeFile(workbook, filename)
}

/**
 * Export issue to PDF format
 * @param {Object} issue - Issue object
 * @param {string} filename - Output filename
 */
export async function exportIssueToPDF(issue, filename = 'issue.pdf') {
  try {
    // Dynamic import of jsPDF and html2canvas
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ])

    // Create a temporary container for the issue content
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.width = '800px'
    container.style.padding = '20px'
    container.style.backgroundColor = 'white'
    container.style.color = 'black'
    
    container.innerHTML = generateIssueHTML(issue)
    document.body.appendChild(container)

    // Generate PDF
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgWidth = 210
    const pageHeight = 297
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight

    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    pdf.save(filename)
    
    // Cleanup
    document.body.removeChild(container)
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    alert('Error exporting to PDF. Please ensure jsPDF and html2canvas are installed.')
  }
}

/**
 * Export issue register to PDF
 * @param {Array} issues - Array of issue objects
 * @param {Object} register - Issue register object
 * @param {string} filename - Output filename
 */
export async function exportRegisterToPDF(issues, register, filename = 'issue_register.pdf') {
  try {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ])

    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.width = '800px'
    container.style.padding = '20px'
    container.style.backgroundColor = 'white'
    container.style.color = 'black'
    
    container.innerHTML = generateRegisterHTML(issues, register)
    document.body.appendChild(container)

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgWidth = 210
    const pageHeight = 297
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight

    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    pdf.save(filename)
    
    document.body.removeChild(container)
  } catch (error) {
    console.error('Error exporting register to PDF:', error)
    alert('Error exporting to PDF. Please ensure jsPDF and html2canvas are installed.')
  }
}

/**
 * Generate HTML for a single issue (for PDF export)
 */
function generateIssueHTML(issue) {
  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString()
  }

  return `
    <div style="font-family: Arial, sans-serif;">
      <h1 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
        Issue: ${issue.issue_identifier || `ISS-${issue.issue_number || ''}`}
      </h1>
      
      <div style="margin-top: 20px;">
        <h2 style="color: #374151; margin-top: 20px;">Basic Information</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold; width: 200px;">Title</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${issue.issue_title || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold;">Type</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${(issue.issue_type || '').replace('_', ' ')}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold;">Status</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${issue.status || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold;">Priority</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${issue.priority || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold;">Severity</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${issue.severity || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold;">Raised By</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${issue.raised_by?.full_name || issue.raised_by_name || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold;">Raised Date</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${formatDate(issue.date_raised)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold;">Owner</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${issue.owner?.full_name || issue.owner_name || 'Unassigned'}</td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 30px;">
        <h2 style="color: #374151; margin-top: 20px;">Description</h2>
        <div style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f9fafb; margin-top: 10px; white-space: pre-wrap;">
          ${issue.issue_description || 'No description provided'}
        </div>
      </div>

      ${issue.impact_description ? `
      <div style="margin-top: 30px;">
        <h2 style="color: #374151; margin-top: 20px;">Impact Analysis</h2>
        <div style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f9fafb; margin-top: 10px; white-space: pre-wrap;">
          ${issue.impact_description}
        </div>
        ${issue.cost_impact || issue.schedule_impact_days ? `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          ${issue.cost_impact ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold; width: 200px;">Cost Impact</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">$${parseFloat(issue.cost_impact).toLocaleString()}</td>
          </tr>
          ` : ''}
          ${issue.schedule_impact_days ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold;">Schedule Impact</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${issue.schedule_impact_days} days</td>
          </tr>
          ` : ''}
        </table>
        ` : ''}
      </div>
      ` : ''}

      ${issue.resolution_description ? `
      <div style="margin-top: 30px;">
        <h2 style="color: #374151; margin-top: 20px;">Resolution</h2>
        <div style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f0fdf4; margin-top: 10px; white-space: pre-wrap;">
          ${issue.resolution_description}
        </div>
        ${issue.resolution_date ? `
        <p style="margin-top: 10px; color: #6b7280;">Resolved: ${formatDate(issue.resolution_date)}</p>
        ` : ''}
      </div>
      ` : ''}
    </div>
  `
}

/**
 * Generate HTML for issue register (for PDF export)
 */
function generateRegisterHTML(issues, register) {
  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString()
  }

  const typeCounts = {
    request_for_change: issues.filter(i => i.issue_type === 'request_for_change').length,
    off_specification: issues.filter(i => i.issue_type === 'off_specification').length,
    problem_concern: issues.filter(i => i.issue_type === 'problem_concern').length
  }

  return `
    <div style="font-family: Arial, sans-serif;">
      <h1 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
        Issue Register: ${register.register_reference || 'N/A'}
      </h1>
      
      <div style="margin-top: 20px;">
        <h2 style="color: #374151;">Summary</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold;">Total Issues</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${issues.length}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold;">Request for Change</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${typeCounts.request_for_change}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold;">Off-Specification</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${typeCounts.off_specification}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold;">Problem/Concern</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${typeCounts.problem_concern}</td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 30px;">
        <h2 style="color: #374151;">Issues</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">ID</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Title</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Type</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Status</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Priority</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Severity</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Raised Date</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Owner</th>
            </tr>
          </thead>
          <tbody>
            ${issues.map(issue => `
              <tr>
                <td style="padding: 6px; border: 1px solid #e5e7eb;">${issue.issue_identifier || `ISS-${issue.issue_number || ''}`}</td>
                <td style="padding: 6px; border: 1px solid #e5e7eb;">${(issue.issue_title || '').substring(0, 50)}${(issue.issue_title || '').length > 50 ? '...' : ''}</td>
                <td style="padding: 6px; border: 1px solid #e5e7eb;">${(issue.issue_type || '').replace('_', ' ')}</td>
                <td style="padding: 6px; border: 1px solid #e5e7eb;">${issue.status || 'N/A'}</td>
                <td style="padding: 6px; border: 1px solid #e5e7eb;">${issue.priority || 'N/A'}</td>
                <td style="padding: 6px; border: 1px solid #e5e7eb;">${issue.severity || 'N/A'}</td>
                <td style="padding: 6px; border: 1px solid #e5e7eb;">${formatDate(issue.date_raised)}</td>
                <td style="padding: 6px; border: 1px solid #e5e7eb;">${issue.owner?.full_name || issue.owner_name || 'Unassigned'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `
}

/**
 * Generate printable HTML for an issue
 */
export function generatePrintableHTML(issue) {
  return generateIssueHTML(issue)
}

/**
 * Generate printable HTML for issue register
 */
export function generateRegisterPrintableHTML(issues, register) {
  return generateRegisterHTML(issues, register)
}
