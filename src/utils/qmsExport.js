/**
 * QMS Export Utilities
 * Functions for exporting Quality Management Strategy data
 */

/**
 * Export QMS to CSV
 * @param {Object} qms - QMS data
 * @param {Array} standards - Quality standards
 * @param {Array} methods - Quality methods
 * @param {Array} metrics - Quality metrics
 * @param {Array} roles - Quality roles
 * @param {Array} activities - Scheduled activities
 * @param {string} filename - Output filename
 */
export function exportQMSToCSV(qms, standards, methods, metrics, roles, activities, filename = null) {
  if (!qms) {
    alert('No QMS data to export')
    return
  }

  const csvRows = []
  
  // Header
  csvRows.push(['Quality Management Strategy', qms.qms_reference || qms.id])
  csvRows.push(['Project', qms.project?.project_name || 'N/A'])
  csvRows.push(['Status', qms.status || 'draft'])
  csvRows.push(['Version', qms.version_number || '1.0'])
  csvRows.push([])
  
  // Introduction Section
  csvRows.push(['INTRODUCTION'])
  csvRows.push(['Purpose', qms.purpose || ''])
  csvRows.push(['Objectives', qms.objectives || ''])
  csvRows.push(['Scope', qms.scope || ''])
  csvRows.push([])
  
  // Quality Procedures
  csvRows.push(['QUALITY PROCEDURES'])
  csvRows.push(['Quality Planning Approach', qms.quality_planning_approach || ''])
  csvRows.push(['Quality Control Approach', qms.quality_control_approach || ''])
  csvRows.push(['Quality Assurance Approach', qms.quality_assurance_approach || ''])
  if (qms.variance_from_corporate) {
    csvRows.push(['Variance from Corporate', qms.variance_from_corporate])
    csvRows.push(['Variance Justification', qms.variance_justification || ''])
  }
  csvRows.push([])
  
  // Standards
  if (standards && standards.length > 0) {
    csvRows.push(['QUALITY STANDARDS'])
    csvRows.push(['Code', 'Name', 'Type', 'Compliance Level', 'Version'])
    standards.forEach(std => {
      csvRows.push([
        std.standard_code || '',
        std.standard_name || '',
        std.standard_type || '',
        std.compliance_level || '',
        std.standard_version || ''
      ])
    })
    csvRows.push([])
  }
  
  // Methods
  if (methods && methods.length > 0) {
    csvRows.push(['QUALITY METHODS'])
    csvRows.push(['Name', 'Type', 'Mandatory', 'Description'])
    methods.forEach(method => {
      csvRows.push([
        method.method_name || '',
        method.method_type || '',
        method.is_mandatory ? 'Yes' : 'No',
        method.method_description || ''
      ])
    })
    csvRows.push([])
  }
  
  // Metrics
  if (metrics && metrics.length > 0) {
    csvRows.push(['QUALITY METRICS'])
    csvRows.push(['Name', 'Category', 'Target Value', 'Collection Frequency', 'Responsible Role'])
    metrics.forEach(metric => {
      csvRows.push([
        metric.metric_name || '',
        metric.metric_category || '',
        metric.target_value || '',
        metric.collection_frequency || '',
        metric.responsible_role || ''
      ])
    })
    csvRows.push([])
  }
  
  // Roles
  if (roles && roles.length > 0) {
    csvRows.push(['QUALITY ROLES & RESPONSIBILITIES'])
    csvRows.push(['Role Name', 'Type', 'Independence Level', 'Responsibilities'])
    roles.forEach(role => {
      csvRows.push([
        role.role_name || '',
        role.role_type || '',
        role.independence_level || '',
        role.responsibilities || ''
      ])
    })
    csvRows.push([])
  }
  
  // Activities
  if (activities && activities.length > 0) {
    csvRows.push(['SCHEDULED ACTIVITIES'])
    csvRows.push(['Activity Name', 'Type', 'Timing', 'Frequency', 'Participants'])
    activities.forEach(activity => {
      csvRows.push([
        activity.activity_name || '',
        activity.activity_type || '',
        activity.timing || '',
        activity.frequency || '',
        activity.participants || ''
      ])
    })
  }
  
  // Convert to CSV string
  const csvContent = csvRows.map(row => 
    row.map(cell => {
      const cellStr = String(cell || '')
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
        return `"${cellStr.replace(/"/g, '""')}"`
      }
      return cellStr
    }).join(',')
  ).join('\n')
  
  // Create download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename || `QMS-${qms.qms_reference || qms.id}-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export QMS to PDF
 * @param {Object} qms - QMS data
 * @param {Array} standards - Quality standards
 * @param {Array} methods - Quality methods
 * @param {Array} metrics - Quality metrics
 * @param {Array} roles - Quality roles
 * @param {Array} activities - Scheduled activities
 * @param {Array} tools - Tools and techniques
 * @param {Array} records - Quality records
 * @param {Array} reports - Quality reports
 * @param {string} filename - Output filename
 */
export async function exportQMSToPDF(qms, standards, methods, metrics, roles, activities, tools, records, reports, filename = null) {
  try {
    // Dynamically import jspdf and html2canvas
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ])

    // Create temporary container for PDF content
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.width = '210mm' // A4 width
    container.style.padding = '20mm'
    container.style.backgroundColor = 'white'
    container.style.fontFamily = 'Arial, sans-serif'
    container.className = 'qms-export-pdf'
    
    // Build HTML content
    let html = `
      <div style="color: black;">
        <h1 style="font-size: 24px; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 10px;">
          Quality Management Strategy
        </h1>
        <div style="margin-bottom: 20px;">
          <p><strong>Reference:</strong> ${qms.qms_reference || qms.id}</p>
          <p><strong>Project:</strong> ${qms.project?.project_name || 'N/A'}</p>
          <p><strong>Status:</strong> ${qms.status || 'draft'}</p>
          <p><strong>Version:</strong> ${qms.version_number || '1.0'}</p>
          <p><strong>Date:</strong> ${qms.created_at ? new Date(qms.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</p>
        </div>
        
        <h2 style="font-size: 18px; margin-top: 30px; margin-bottom: 10px; border-bottom: 1px solid #000; padding-bottom: 5px;">
          1. Introduction
        </h2>
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; margin-top: 15px; margin-bottom: 5px;"><strong>Purpose</strong></h3>
          <p style="text-align: justify; line-height: 1.6;">${qms.purpose || 'Not defined'}</p>
          
          <h3 style="font-size: 14px; margin-top: 15px; margin-bottom: 5px;"><strong>Objectives</strong></h3>
          <p style="text-align: justify; line-height: 1.6;">${qms.objectives || 'Not defined'}</p>
          
          <h3 style="font-size: 14px; margin-top: 15px; margin-bottom: 5px;"><strong>Scope</strong></h3>
          <p style="text-align: justify; line-height: 1.6;">${qms.scope || 'Not defined'}</p>
        </div>
        
        <h2 style="font-size: 18px; margin-top: 30px; margin-bottom: 10px; border-bottom: 1px solid #000; padding-bottom: 5px;">
          2. Quality Procedures
        </h2>
        <div style="margin-bottom: 20px;">
          ${qms.quality_planning_approach ? `
            <h3 style="font-size: 14px; margin-top: 15px; margin-bottom: 5px;"><strong>Quality Planning Approach</strong></h3>
            <p style="text-align: justify; line-height: 1.6;">${qms.quality_planning_approach}</p>
          ` : ''}
          
          <h3 style="font-size: 14px; margin-top: 15px; margin-bottom: 5px;"><strong>Quality Control Approach</strong></h3>
          <p style="text-align: justify; line-height: 1.6;">${qms.quality_control_approach || 'Not defined'}</p>
          
          <h3 style="font-size: 14px; margin-top: 15px; margin-bottom: 5px;"><strong>Quality Assurance Approach</strong></h3>
          <p style="text-align: justify; line-height: 1.6;">${qms.quality_assurance_approach || 'Not defined'}</p>
        </div>
    `

    // Add standards section
    if (standards && standards.length > 0) {
      html += `
        <h2 style="font-size: 18px; margin-top: 30px; margin-bottom: 10px; border-bottom: 1px solid #000; padding-bottom: 5px;">
          3. Quality Standards
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Code</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Name</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Type</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Compliance</th>
            </tr>
          </thead>
          <tbody>
      `
      standards.forEach(std => {
        html += `
          <tr>
            <td style="border: 1px solid #000; padding: 8px;">${std.standard_code || ''}</td>
            <td style="border: 1px solid #000; padding: 8px;">${std.standard_name || ''}</td>
            <td style="border: 1px solid #000; padding: 8px;">${std.standard_type?.replace('_', ' ') || ''}</td>
            <td style="border: 1px solid #000; padding: 8px;">${std.compliance_level?.replace('_', ' ') || ''}</td>
          </tr>
        `
      })
      html += `
          </tbody>
        </table>
      `
    }

    // Add methods section
    if (methods && methods.length > 0) {
      html += `
        <h2 style="font-size: 18px; margin-top: 30px; margin-bottom: 10px; border-bottom: 1px solid #000; padding-bottom: 5px;">
          4. Quality Methods
        </h2>
      `
      methods.forEach((method, index) => {
        html += `
          <div style="margin-bottom: 15px;">
            <h3 style="font-size: 14px; margin-top: 10px; margin-bottom: 5px;">
              <strong>${index + 1}. ${method.method_name || ''}</strong>
              ${method.is_mandatory ? '<span style="color: red;">[Mandatory]</span>' : ''}
            </h3>
            <p style="margin-left: 20px; line-height: 1.6;"><strong>Type:</strong> ${method.method_type?.replace('_', ' ') || ''}</p>
            <p style="margin-left: 20px; line-height: 1.6; text-align: justify;">${method.method_description || ''}</p>
            ${method.when_to_use ? `<p style="margin-left: 20px; line-height: 1.6;"><strong>When to use:</strong> ${method.when_to_use}</p>` : ''}
          </div>
        `
      })
    }

    // Add roles section
    if (roles && roles.length > 0) {
      html += `
        <h2 style="font-size: 18px; margin-top: 30px; margin-bottom: 10px; border-bottom: 1px solid #000; padding-bottom: 5px;">
          5. Quality Roles & Responsibilities
        </h2>
      `
      roles.forEach(role => {
        html += `
          <div style="margin-bottom: 15px;">
            <h3 style="font-size: 14px; margin-top: 10px; margin-bottom: 5px;">
              <strong>${role.role_name || ''}</strong>
              <span style="font-weight: normal; color: #666;">[${role.independence_level?.replace('_', ' ') || ''}]</span>
            </h3>
            <p style="margin-left: 20px; line-height: 1.6; text-align: justify;"><strong>Responsibilities:</strong> ${role.responsibilities || ''}</p>
          </div>
        `
      })
    }

    html += `
        <div style="margin-top: 50px; padding-top: 20px; border-top: 2px solid #000;">
          <p style="font-size: 10px; color: #666;">Generated on ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `
    
    container.innerHTML = html
    document.body.appendChild(container)
    
    // Convert to canvas then PDF
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false
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
    
    // Cleanup
    document.body.removeChild(container)
    
    // Save PDF
    pdf.save(filename || `QMS-${qms.qms_reference || qms.id}-${new Date().toISOString().split('T')[0]}.pdf`)
  } catch (error) {
    console.error('Error exporting QMS to PDF:', error)
    alert('Error exporting PDF: ' + error.message)
  }
}

/**
 * Generate printable HTML for QMS
 * @param {Object} qms - QMS data
 * @param {Array} standards - Quality standards
 * @param {Array} methods - Quality methods
 * @param {Array} metrics - Quality metrics
 * @param {Array} roles - Quality roles
 * @param {Array} activities - Scheduled activities
 * @returns {string} HTML content
 */
export function generateQMSPrintableHTML(qms, standards, methods, metrics, roles, activities) {
  // This is a simplified version - can be enhanced
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Quality Management Strategy - ${qms.qms_reference || qms.id}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
        h1 { border-bottom: 3px solid #000; padding-bottom: 10px; }
        h2 { border-bottom: 1px solid #000; padding-bottom: 5px; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>Quality Management Strategy</h1>
      <p><strong>Reference:</strong> ${qms.qms_reference || qms.id}</p>
      <p><strong>Project:</strong> ${qms.project?.project_name || 'N/A'}</p>
      <p><strong>Status:</strong> ${qms.status || 'draft'}</p>
      <p><strong>Version:</strong> ${qms.version_number || '1.0'}</p>
      
      <h2>1. Introduction</h2>
      <h3>Purpose</h3>
      <p>${qms.purpose || 'Not defined'}</p>
      <h3>Objectives</h3>
      <p>${qms.objectives || 'Not defined'}</p>
      <h3>Scope</h3>
      <p>${qms.scope || 'Not defined'}</p>
      
      <h2>2. Quality Procedures</h2>
      <h3>Quality Control Approach</h3>
      <p>${qms.quality_control_approach || 'Not defined'}</p>
      <h3>Quality Assurance Approach</h3>
      <p>${qms.quality_assurance_approach || 'Not defined'}</p>
  `
  
  // Add sections for standards, methods, roles, etc.
  if (standards && standards.length > 0) {
    html += '<h2>3. Quality Standards</h2><table><tr><th>Code</th><th>Name</th><th>Type</th><th>Compliance</th></tr>'
    standards.forEach(std => {
      html += `<tr><td>${std.standard_code || ''}</td><td>${std.standard_name || ''}</td><td>${std.standard_type || ''}</td><td>${std.compliance_level || ''}</td></tr>`
    })
    html += '</table>'
  }
  
  html += `
    </body>
    </html>
  `
  
  return html
}

/**
 * Print QMS
 * @param {Object} qms - QMS data
 * @param {Array} standards - Quality standards
 * @param {Array} methods - Quality methods
 * @param {Array} metrics - Quality metrics
 * @param {Array} roles - Quality roles
 * @param {Array} activities - Scheduled activities
 */
export function printQMS(qms, standards, methods, metrics, roles, activities) {
  const html = generateQMSPrintableHTML(qms, standards, methods, metrics, roles, activities)
  const printWindow = window.open('', '_blank')
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 250)
}

export default {
  exportQMSToCSV,
  exportQMSToPDF,
  generateQMSPrintableHTML,
  printQMS
}
