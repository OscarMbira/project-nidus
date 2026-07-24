/**
 * PPD Export Utilities
 * Functions for exporting Project Product Description data
 */

/**
 * Export PPD to CSV
 */
export function exportPPDToCSV(ppd, compositionItems, criteria, filename = null) {
  const rows = []
  
  // Header
  rows.push(['Project Product Description Export'])
  rows.push(['Generated:', new Date().toLocaleString()])
  rows.push([])
  
  // PPD Basic Info
  rows.push(['PPD Reference', ppd.ppd_reference || ''])
  rows.push(['Product Title', ppd.product_title || ''])
  rows.push(['Version', ppd.version_number || ''])
  rows.push(['Status', ppd.status || ''])
  rows.push([])
  
  // Purpose
  rows.push(['Purpose'])
  rows.push([ppd.purpose || ''])
  rows.push([])
  
  // Composition
  rows.push(['Composition Items'])
  rows.push(['#', 'Product Name', 'Type', 'Description', 'Mandatory', 'Stage'])
  compositionItems.forEach(item => {
    rows.push([
      item.item_number || '',
      item.product_name || '',
      item.product_type || '',
      item.product_description || '',
      item.is_mandatory ? 'Yes' : 'No',
      item.planned_delivery_stage || ''
    ])
  })
  rows.push([])
  
  // Acceptance Criteria
  rows.push(['Acceptance Criteria'])
  rows.push(['Reference', 'Title', 'Category', 'Priority', 'Status', 'Description', 'Measurement Method', 'Target'])
  criteria.forEach(criterion => {
    rows.push([
      criterion.criteria_reference || '',
      criterion.criteria_title || '',
      criterion.criteria_category || '',
      criterion.priority || '',
      criterion.acceptance_status || 'pending',
      criterion.criteria_description || '',
      criterion.measurement_method || '',
      criterion.target_value || ''
    ])
  })
  
  // Convert to CSV
  const csvContent = rows.map(row => 
    row.map(cell => {
      const cellStr = String(cell || '')
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
        return '"' + cellStr.replace(/"/g, '""') + '"'
      }
      return cellStr
    }).join(',')
  ).join('\n')
  
  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename || `PPD-${ppd.ppd_reference || 'export'}-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export PPD to PDF using jsPDF and html2canvas
 */
export async function exportPPDToPDF(ppd, compositionItems, criteria, expectations, skills, responsibilities) {
  try {
    // Dynamic import to reduce bundle size
    const jsPDF = (await import('jspdf')).default
    const html2canvas = (await import('html2canvas')).default
    
    const doc = new jsPDF()
    let yPos = 20
    
    // Title
    doc.setFontSize(20)
    doc.text('Project Product Description', 20, yPos)
    yPos += 10
    
    // PPD Reference
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text(`Reference: ${ppd.ppd_reference || 'N/A'}`, 20, yPos)
    yPos += 8
    doc.setFont(undefined, 'normal')
    
    // Product Title
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('Product Title:', 20, yPos)
    doc.setFont(undefined, 'normal')
    doc.setFontSize(12)
    const titleLines = doc.splitTextToSize(ppd.product_title || 'N/A', 170)
    doc.text(titleLines, 20, yPos + 5)
    yPos += titleLines.length * 7 + 10
    
    // Purpose
    if (ppd.purpose) {
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('Purpose:', 20, yPos)
      doc.setFont(undefined, 'normal')
      doc.setFontSize(11)
      const purposeLines = doc.splitTextToSize(ppd.purpose, 170)
      doc.text(purposeLines, 20, yPos + 5)
      yPos += purposeLines.length * 5 + 10
      
      if (yPos > 270) {
        doc.addPage()
        yPos = 20
      }
    }
    
    // Composition Items
    if (compositionItems && compositionItems.length > 0) {
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('Composition Items:', 20, yPos)
      yPos += 8
      doc.setFont(undefined, 'normal')
      doc.setFontSize(10)
      
      compositionItems.forEach((item, index) => {
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
        
        doc.setFont(undefined, 'bold')
        doc.text(`${item.item_number}. ${item.product_name}`, 25, yPos)
        doc.setFont(undefined, 'normal')
        yPos += 6
        
        if (item.product_description) {
          const descLines = doc.splitTextToSize(item.product_description, 165)
          doc.text(descLines, 25, yPos)
          yPos += descLines.length * 5
        }
        
        doc.text(`Type: ${item.product_type || 'N/A'} | Mandatory: ${item.is_mandatory ? 'Yes' : 'No'}`, 25, yPos)
        yPos += 8
      })
      
      yPos += 5
    }
    
    // Acceptance Criteria
    if (criteria && criteria.length > 0) {
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }
      
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('Acceptance Criteria:', 20, yPos)
      yPos += 8
      doc.setFont(undefined, 'normal')
      doc.setFontSize(10)
      
      criteria.forEach((criterion) => {
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
        
        doc.setFont(undefined, 'bold')
        doc.text(`${criterion.criteria_reference}: ${criterion.criteria_title}`, 25, yPos)
        doc.setFont(undefined, 'normal')
        yPos += 6
        
        const descLines = doc.splitTextToSize(criterion.criteria_description || '', 165)
        doc.text(descLines, 25, yPos)
        yPos += descLines.length * 5 + 2
        
        doc.text(`Category: ${criterion.criteria_category || 'N/A'} | Priority: ${criterion.priority || 'N/A'} | Status: ${criterion.acceptance_status || 'pending'}`, 25, yPos)
        yPos += 6
        
        if (criterion.measurement_method) {
          doc.text(`Measurement: ${criterion.measurement_method}`, 25, yPos)
          yPos += 5
        }
        
        yPos += 5
      })
    }
    
    // Save
    doc.save(`PPD-${ppd.ppd_reference || 'export'}-${new Date().toISOString().split('T')[0]}.pdf`)
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    throw error
  }
}

/**
 * Generate printable HTML for PPD
 */
export function generatePPDPrintableHTML(ppd, compositionItems, criteria, expectations, skills, responsibilities) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Project Product Description - ${ppd.ppd_reference || ''}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          line-height: 1.6;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #333;
          border-bottom: 1px solid #ccc;
          padding-bottom: 5px;
          margin-bottom: 15px;
        }
        .field-label {
          font-weight: bold;
          margin-top: 10px;
        }
        .criteria-item {
          border-left: 3px solid #0066cc;
          padding-left: 10px;
          margin-bottom: 15px;
        }
        .composition-item {
          border-left: 3px solid #00cc66;
          padding-left: 10px;
          margin-bottom: 15px;
        }
        @media print {
          body { margin: 0; padding: 10px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Project Product Description</h1>
        <p><strong>Reference:</strong> ${ppd.ppd_reference || 'N/A'}</p>
        <p><strong>Version:</strong> ${ppd.version_number || '1.0'}</p>
        <p><strong>Status:</strong> ${ppd.status || 'draft'}</p>
      </div>
      
      <div class="section">
        <div class="section-title">Product Title</div>
        <p>${ppd.product_title || 'Not defined'}</p>
      </div>
      
      <div class="section">
        <div class="section-title">Purpose</div>
        <p>${(ppd.purpose || 'Not defined').replace(/\n/g, '<br>')}</p>
      </div>
      
      ${compositionItems && compositionItems.length > 0 ? `
      <div class="section">
        <div class="section-title">Composition Items</div>
        ${compositionItems.map(item => `
          <div class="composition-item">
            <strong>${item.item_number}. ${item.product_name}</strong>
            <p>${item.product_description || ''}</p>
            <small>Type: ${item.product_type || 'N/A'} | Mandatory: ${item.is_mandatory ? 'Yes' : 'No'}</small>
          </div>
        `).join('')}
      </div>
      ` : ''}
      
      ${criteria && criteria.length > 0 ? `
      <div class="section">
        <div class="section-title">Acceptance Criteria</div>
        ${criteria.map(criterion => `
          <div class="criteria-item">
            <strong>${criterion.criteria_reference}: ${criterion.criteria_title}</strong>
            <p>${criterion.criteria_description || ''}</p>
            <p><small>Category: ${criterion.criteria_category || 'N/A'} | Priority: ${criterion.priority || 'N/A'} | Status: ${criterion.acceptance_status || 'pending'}</small></p>
            ${criterion.measurement_method ? `<p><small>Measurement: ${criterion.measurement_method}</small></p>` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}
      
      ${ppd.customer_quality_expectations ? `
      <div class="section">
        <div class="section-title">Customer Quality Expectations</div>
        <p>${ppd.customer_quality_expectations.replace(/\n/g, '<br>')}</p>
      </div>
      ` : ''}
      
      ${ppd.acceptance_method ? `
      <div class="section">
        <div class="section-title">Acceptance Method</div>
        <p>${ppd.acceptance_method.replace(/\n/g, '<br>')}</p>
      </div>
      ` : ''}
      
      <div class="section">
        <div class="section-title">Ownership</div>
        <p><strong>Author:</strong> ${ppd.author?.full_name || ppd.author_name || 'Not assigned'}</p>
        <p><strong>Owner:</strong> ${ppd.owner?.full_name || ppd.owner_name || 'Not assigned'}</p>
        <p><strong>Client:</strong> ${ppd.client?.full_name || ppd.client_name || 'Not assigned'}</p>
      </div>
      
      <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
        <p>Generated on ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `
  
  return html
}

/**
 * Print PPD
 */
export function printPPD(ppd, compositionItems, criteria, expectations, skills, responsibilities) {
  const html = generatePPDPrintableHTML(ppd, compositionItems, criteria, expectations, skills, responsibilities)
  const printWindow = window.open('', '_blank')
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.print()
  }
}

/**
 * Export Acceptance Report to CSV
 */
export function exportAcceptanceReportToCSV(acceptanceStatus, criteria, filename = null) {
  const rows = []
  
  // Header
  rows.push(['Acceptance Test Report'])
  rows.push(['Generated:', new Date().toLocaleString()])
  rows.push([])
  
  // Summary
  rows.push(['Summary'])
  rows.push(['Total Criteria', acceptanceStatus.total_criteria || 0])
  rows.push(['Passed', acceptanceStatus.passed_criteria || 0])
  rows.push(['Failed', acceptanceStatus.failed_criteria || 0])
  rows.push(['Pending', acceptanceStatus.pending_criteria || 0])
  rows.push(['Acceptance Percentage', `${acceptanceStatus.acceptance_percentage?.toFixed(2) || 0}%`])
  rows.push(['Can Close Project', acceptanceStatus.can_close_project ? 'Yes' : 'No'])
  rows.push([])
  
  // Criteria Details
  rows.push(['Criteria Details'])
  rows.push(['Reference', 'Title', 'Priority', 'Status', 'Date', 'Notes'])
  criteria.forEach(criterion => {
    rows.push([
      criterion.criteria_reference || '',
      criterion.criteria_title || '',
      criterion.priority || '',
      criterion.acceptance_status || 'pending',
      criterion.acceptance_date || '',
      criterion.acceptance_notes || ''
    ])
  })
  
  // Convert to CSV
  const csvContent = rows.map(row => 
    row.map(cell => {
      const cellStr = String(cell || '')
      if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
        return '"' + cellStr.replace(/"/g, '""') + '"'
      }
      return cellStr
    }).join(',')
  ).join('\n')
  
  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename || `Acceptance-Report-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export default {
  exportPPDToCSV,
  exportPPDToPDF,
  generatePPDPrintableHTML,
  printPPD,
  exportAcceptanceReportToCSV
}
