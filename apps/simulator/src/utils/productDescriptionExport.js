/**
 * Product Description Export Utilities
 * Export Product Descriptions to PDF, Word, CSV formats
 */

/**
 * Export Product Description to PDF
 * @param {Object} pd - Product Description data
 * @param {Array} compositionItems - Composition items
 * @param {Array} derivations - Derivations
 * @param {Array} acceptanceCriteria - Acceptance criteria
 * @param {Array} qualityExpectations - Quality expectations
 * @param {Array} skills - Skills required
 * @param {Array} responsibilities - Acceptance responsibilities
 * @param {Array} revisionHistory - Revision history
 * @param {Array} approvals - Approvals
 * @param {string} filename - Output filename
 */
export async function exportProductDescriptionToPDF(
  pd,
  compositionItems = [],
  derivations = [],
  acceptanceCriteria = [],
  qualityExpectations = [],
  skills = [],
  responsibilities = [],
  revisionHistory = [],
  approvals = [],
  filename = null
) {
  try {
    // Dynamically import jspdf and html2canvas
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ])

    // Generate HTML content
    const htmlContent = generatePDPDFHTML(
      pd,
      compositionItems,
      derivations,
      acceptanceCriteria,
      qualityExpectations,
      skills,
      responsibilities,
      revisionHistory,
      approvals
    )

    // Create temporary container
    const container = document.createElement('div')
    container.innerHTML = htmlContent
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.width = '210mm' // A4 width
    document.body.appendChild(container)

    // Convert to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false
    })

    // Remove container
    document.body.removeChild(container)

    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgData = canvas.toDataURL('image/png')
    const imgWidth = 210 // A4 width in mm
    const pageHeight = 297 // A4 height in mm
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

    // Save PDF
    const outputFilename = filename || `PD-${pd.pd_reference || pd.id}-${new Date().toISOString().split('T')[0]}.pdf`
    pdf.save(outputFilename)

    return { success: true }
  } catch (error) {
    console.error('Error exporting Product Description to PDF:', error)
    throw new Error('Error exporting PDF: ' + error.message)
  }
}

/**
 * Export Product Description to Word
 * @param {Object} pd - Product Description data
 * @param {Array} compositionItems - Composition items
 * @param {Array} derivations - Derivations
 * @param {Array} acceptanceCriteria - Acceptance criteria
 * @param {Array} qualityExpectations - Quality expectations
 * @param {Array} skills - Skills required
 * @param {Array} responsibilities - Acceptance responsibilities
 * @param {Array} revisionHistory - Revision history
 * @param {Array} approvals - Approvals
 * @param {string} filename - Output filename
 */
export async function exportProductDescriptionToWord(
  pd,
  compositionItems = [],
  derivations = [],
  acceptanceCriteria = [],
  qualityExpectations = [],
  skills = [],
  responsibilities = [],
  revisionHistory = [],
  approvals = [],
  filename = null
) {
  try {
    // Generate HTML content
    const htmlContent = generatePDWordHTML(
      pd,
      compositionItems,
      derivations,
      acceptanceCriteria,
      qualityExpectations,
      skills,
      responsibilities,
      revisionHistory,
      approvals
    )
    
    // Create blob
    const blob = new Blob([htmlContent], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    
    // Create download link
    const link = document.createElement('a')
    link.href = url
    link.download = filename || `PD-${pd.pd_reference || pd.id}-${new Date().toISOString().split('T')[0]}.doc`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    return { success: true }
  } catch (error) {
    console.error('Error exporting Product Description to Word:', error)
    throw new Error('Error exporting Word: ' + error.message)
  }
}

/**
 * Export Product Description Summary to CSV
 * @param {Object} pd - Product Description data
 * @param {Array} acceptanceCriteria - Acceptance criteria
 * @param {Array} qualityExpectations - Quality expectations
 * @param {Array} skills - Skills required
 * @returns {string} CSV string
 */
export function exportProductDescriptionSummaryToCSV(
  pd,
  acceptanceCriteria = [],
  qualityExpectations = [],
  skills = []
) {
  const rows = []
  
  // Product Description header
  rows.push(['Product Description Reference', pd.pd_reference || ''])
  rows.push(['Product Title', pd.product_title || ''])
  rows.push(['Version', pd.version_number || ''])
  rows.push(['Status', pd.status || ''])
  rows.push(['Purpose', pd.purpose || ''])
  rows.push([])
  
  // Acceptance Criteria
  if (acceptanceCriteria.length > 0) {
    rows.push(['Acceptance Criteria'])
    rows.push(['Reference', 'Title', 'Category', 'Priority', 'Status', 'Measurable', 'Realistic', 'Provable'])
    acceptanceCriteria.forEach(c => {
      rows.push([
        c.criteria_reference || '',
        c.criteria_title || '',
        c.criteria_category || '',
        c.priority || '',
        c.acceptance_status || '',
        c.is_measurable ? 'Yes' : 'No',
        c.is_realistic ? 'Yes' : 'No',
        c.is_provable_in_project ? 'Yes' : 'No'
      ])
    })
    rows.push([])
  }
  
  // Quality Expectations
  if (qualityExpectations.length > 0) {
    rows.push(['Quality Expectations'])
    rows.push(['Category', 'Description', 'Priority', 'Source', 'Standard Reference'])
    qualityExpectations.forEach(e => {
      rows.push([
        e.expectation_category || '',
        e.expectation_description || '',
        e.priority || '',
        e.source || '',
        e.standard_reference || ''
      ])
    })
    rows.push([])
  }
  
  // Skills Required
  if (skills.length > 0) {
    rows.push(['Skills Required'])
    rows.push(['Skill Name', 'Category', 'Proficiency Level', 'Resource Area', 'Critical'])
    skills.forEach(s => {
      rows.push([
        s.skill_name || '',
        s.skill_category || '',
        s.proficiency_level || '',
        s.resource_area || '',
        s.is_critical ? 'Yes' : 'No'
      ])
    })
  }
  
  // Convert to CSV string
  return rows.map(row => 
    row.map(cell => {
      const cellStr = String(cell || '')
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`
      }
      return cellStr
    }).join(',')
  ).join('\n')
}

/**
 * Generate HTML for PDF export
 */
function generatePDPDFHTML(
  pd,
  compositionItems,
  derivations,
  acceptanceCriteria,
  qualityExpectations,
  skills,
  responsibilities,
  revisionHistory,
  approvals
) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #333;
          padding: 20mm;
          max-width: 170mm;
          margin: 0 auto;
        }
        h1 {
          color: #1e40af;
          border-bottom: 3px solid #1e40af;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        h2 {
          color: #1e40af;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 5px;
          margin-top: 25px;
          margin-bottom: 15px;
        }
        h3 {
          color: #374151;
          margin-top: 20px;
          margin-bottom: 10px;
        }
        .header-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 20px;
          font-size: 10pt;
        }
        .header-info div {
          padding: 5px;
        }
        .header-info strong {
          display: inline-block;
          width: 120px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 10pt;
        }
        table th {
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          padding: 8px;
          text-align: left;
          font-weight: bold;
        }
        table td {
          border: 1px solid #d1d5db;
          padding: 8px;
        }
        .status-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 9pt;
          font-weight: bold;
        }
        .status-draft { background-color: #e5e7eb; color: #374151; }
        .status-under_review { background-color: #fef3c7; color: #92400e; }
        .status-approved { background-color: #d1fae5; color: #065f46; }
        .status-superseded { background-color: #e5e7eb; color: #6b7280; }
        .section {
          margin-bottom: 25px;
        }
        .criteria-item {
          margin-bottom: 15px;
          padding: 10px;
          background-color: #f9fafb;
          border-left: 3px solid #3b82f6;
        }
        .approval-signature {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
        }
      </style>
    </head>
    <body>
      <h1>Product Description</h1>
      
      <div class="header-info">
        <div><strong>Reference:</strong> ${pd.pd_reference || 'N/A'}</div>
        <div><strong>Version:</strong> ${pd.version_number || '1.0'}</div>
        <div><strong>Status:</strong> <span class="status-badge status-${pd.status || 'draft'}">${(pd.status || 'draft').replace('_', ' ')}</span></div>
        <div><strong>Date:</strong> ${new Date(pd.created_at || Date.now()).toLocaleDateString()}</div>
        ${pd.product_deliverable ? `<div><strong>Product Deliverable:</strong> ${pd.product_deliverable.product_name || 'N/A'}</div>` : ''}
        ${pd.ppd_composition_item ? `<div><strong>PPD Composition Item:</strong> ${pd.ppd_composition_item.product_name || 'N/A'}</div>` : ''}
      </div>

      <div class="section">
        <h2>1. Product Introduction</h2>
        <h3>Product Title</h3>
        <p>${pd.product_title || 'Not specified'}</p>
        
        <h3>Purpose</h3>
        <p>${pd.purpose || 'Not specified'}</p>
        
        ${pd.composition ? `
          <h3>Composition</h3>
          <p>${pd.composition}</p>
        ` : ''}
        
        ${pd.derivation ? `
          <h3>Derivation</h3>
          <p>${pd.derivation}</p>
        ` : ''}
      </div>

      ${compositionItems.length > 0 ? `
        <div class="section">
          <h2>2. Product Composition</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Sub-Product Name</th>
                <th>Type</th>
                <th>Description</th>
                <th>Mandatory</th>
              </tr>
            </thead>
            <tbody>
              ${compositionItems.map((item, idx) => `
                <tr>
                  <td>${item.item_number || idx + 1}</td>
                  <td>${item.sub_product_name || ''}</td>
                  <td>${(item.sub_product_type || '').replace('_', ' ')}</td>
                  <td>${item.sub_product_description || ''}</td>
                  <td>${item.is_mandatory ? 'Yes' : 'No'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${derivations.length > 0 ? `
        <div class="section">
          <h2>3. Derivation</h2>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Title</th>
                <th>Reference</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              ${derivations.map(d => `
                <tr>
                  <td>${(d.derivation_type || '').replace('_', ' ')}</td>
                  <td>${d.derivation_title || ''}</td>
                  <td>${d.derivation_reference || ''}</td>
                  <td>${d.derivation_description || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${acceptanceCriteria.length > 0 ? `
        <div class="section">
          <h2>4. Acceptance Criteria</h2>
          ${acceptanceCriteria.map(c => `
            <div class="criteria-item">
              <h3>${c.criteria_reference || `#${c.criteria_number}`}: ${c.criteria_title || ''}</h3>
              <p><strong>Description:</strong> ${c.criteria_description || ''}</p>
              <p><strong>Category:</strong> ${(c.criteria_category || '').replace('_', ' ')} | 
                 <strong>Priority:</strong> ${(c.priority || '').replace('_', ' ')} | 
                 <strong>Status:</strong> ${(c.acceptance_status || 'pending').replace('_', ' ')}</p>
              ${c.target_value ? `<p><strong>Target:</strong> ${c.target_value} ${c.unit_of_measure || ''}</p>` : ''}
              ${c.measurement_method ? `<p><strong>Measurement Method:</strong> ${c.measurement_method}</p>` : ''}
              <p>
                <strong>Validation:</strong> 
                Measurable: ${c.is_measurable ? '✓' : '✗'} | 
                Realistic: ${c.is_realistic ? '✓' : '✗'} | 
                Provable: ${c.is_provable_in_project ? '✓' : '✗'}
              </p>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${pd.customer_quality_expectations || qualityExpectations.length > 0 ? `
        <div class="section">
          <h2>5. Quality Expectations</h2>
          ${pd.customer_quality_expectations ? `
            <h3>Customer Quality Expectations</h3>
            <p>${pd.customer_quality_expectations}</p>
          ` : ''}
          ${qualityExpectations.length > 0 ? `
            <h3>Detailed Quality Expectations</h3>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Priority</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                ${qualityExpectations.map(e => `
                  <tr>
                    <td>${(e.expectation_category || '').replace('_', ' ')}</td>
                    <td>${e.expectation_description || ''}</td>
                    <td>${e.priority || ''}</td>
                    <td>${e.source || ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
        </div>
      ` : ''}

      ${pd.development_skills_required || skills.length > 0 ? `
        <div class="section">
          <h2>6. Development Skills Required</h2>
          ${pd.development_skills_required ? `
            <h3>Skills Summary</h3>
            <p>${pd.development_skills_required}</p>
          ` : ''}
          ${pd.resource_areas ? `
            <h3>Resource Areas</h3>
            <p>${pd.resource_areas}</p>
          ` : ''}
          ${skills.length > 0 ? `
            <h3>Detailed Skills</h3>
            <table>
              <thead>
                <tr>
                  <th>Skill Name</th>
                  <th>Category</th>
                  <th>Proficiency Level</th>
                  <th>Resource Area</th>
                  <th>Critical</th>
                </tr>
              </thead>
              <tbody>
                ${skills.map(s => `
                  <tr>
                    <td>${s.skill_name || ''}</td>
                    <td>${(s.skill_category || '').replace('_', ' ')}</td>
                    <td>${s.proficiency_level || ''}</td>
                    <td>${s.resource_area || ''}</td>
                    <td>${s.is_critical ? 'Yes' : 'No'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
        </div>
      ` : ''}

      ${pd.acceptance_responsibilities || responsibilities.length > 0 ? `
        <div class="section">
          <h2>7. Acceptance Responsibilities</h2>
          ${pd.acceptance_responsibilities ? `
            <h3>Acceptance Responsibilities Summary</h3>
            <p>${pd.acceptance_responsibilities}</p>
          ` : ''}
          ${pd.acceptance_method ? `
            <h3>Acceptance Method</h3>
            <p>${pd.acceptance_method}</p>
          ` : ''}
          ${responsibilities.length > 0 ? `
            <h3>Detailed Responsibilities</h3>
            <table>
              <thead>
                <tr>
                  <th>Role Name</th>
                  <th>Type</th>
                  <th>Assigned To</th>
                  <th>Criteria Count</th>
                </tr>
              </thead>
              <tbody>
                ${responsibilities.map(r => `
                  <tr>
                    <td>${r.role_name || ''}</td>
                    <td>${(r.responsibility_type || '').replace('_', ' ')}</td>
                    <td>${r.assigned_to_name || r.assigned_to_user?.full_name || 'Not assigned'}</td>
                    <td>${r.acceptance_criteria_ids?.length || 0}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
        </div>
      ` : ''}

      ${approvals.length > 0 ? `
        <div class="section approval-signature">
          <h2>8. Approvals</h2>
          <table>
            <thead>
              <tr>
                <th>Approver</th>
                <th>Title</th>
                <th>Status</th>
                <th>Date</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>
              ${approvals.map(a => `
                <tr>
                  <td>${a.approver_name || ''}</td>
                  <td>${a.approver_title || ''}</td>
                  <td>${(a.approval_status || '').replace('_', ' ')}</td>
                  <td>${a.approval_date ? new Date(a.approval_date).toLocaleDateString() : ''}</td>
                  <td>${a.comments || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${revisionHistory.length > 0 ? `
        <div class="section">
          <h2>9. Revision History</h2>
          <table>
            <thead>
              <tr>
                <th>Revision Date</th>
                <th>Revised By</th>
                <th>Summary of Changes</th>
              </tr>
            </thead>
            <tbody>
              ${revisionHistory.map(r => `
                <tr>
                  <td>${new Date(r.revision_date).toLocaleDateString()}</td>
                  <td>${r.revised_by_user?.full_name || 'Unknown'}</td>
                  <td>${r.summary_of_changes || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    </body>
    </html>
  `
}

/**
 * Generate HTML for Word export
 */
function generatePDWordHTML(
  pd,
  compositionItems,
  derivations,
  acceptanceCriteria,
  qualityExpectations,
  skills,
  responsibilities,
  revisionHistory,
  approvals
) {
  // Similar to PDF but with Word-compatible HTML
  return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Product Description - ${pd.pd_reference || pd.id}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>90</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        body {
          font-family: Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #333;
          padding: 20mm;
          max-width: 170mm;
          margin: 0 auto;
        }
        h1 {
          color: #1e40af;
          border-bottom: 3px solid #1e40af;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        h2 {
          color: #1e40af;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 5px;
          margin-top: 25px;
          margin-bottom: 15px;
        }
        h3 {
          color: #374151;
          margin-top: 20px;
          margin-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 10pt;
        }
        table th {
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          padding: 8px;
          text-align: left;
          font-weight: bold;
        }
        table td {
          border: 1px solid #d1d5db;
          padding: 8px;
        }
      </style>
    </head>
    <body>
      ${generatePDPDFHTML(
        pd,
        compositionItems,
        derivations,
        acceptanceCriteria,
        qualityExpectations,
        skills,
        responsibilities,
        revisionHistory,
        approvals
      ).replace('<!DOCTYPE html>', '').replace('<html>', '').replace('</html>', '').replace('<head>', '').replace('</head>', '').replace('<body>', '').replace('</body>', '')}
    </body>
    </html>
  `
}

/**
 * Generate printable HTML view
 * @param {Object} pd - Product Description data
 * @param {Array} compositionItems - Composition items
 * @param {Array} derivations - Derivations
 * @param {Array} acceptanceCriteria - Acceptance criteria
 * @param {Array} qualityExpectations - Quality expectations
 * @param {Array} skills - Skills required
 * @param {Array} responsibilities - Acceptance responsibilities
 * @param {Array} revisionHistory - Revision history
 * @param {Array} approvals - Approvals
 * @returns {string} HTML string
 */
export function generateProductDescriptionPrintView(
  pd,
  compositionItems = [],
  derivations = [],
  acceptanceCriteria = [],
  qualityExpectations = [],
  skills = [],
  responsibilities = [],
  revisionHistory = [],
  approvals = []
) {
  return generatePDPDFHTML(
    pd,
    compositionItems,
    derivations,
    acceptanceCriteria,
    qualityExpectations,
    skills,
    responsibilities,
    revisionHistory,
    approvals
  )
}
