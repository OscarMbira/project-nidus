/**
 * RMS Export Utilities
 * Provides export functionality for Risk Management Strategy (PDF, Word, Print)
 */

/**
 * Export RMS to PDF
 * @param {Object} rms - RMS data
 * @param {Array} standards - Risk standards
 * @param {Array} methods - Identification methods
 * @param {Array} scales - Assessment scales
 * @param {Array} matrices - Risk matrices
 * @param {Array} strategies - Response strategies
 * @param {Array} tools - Tools and techniques
 * @param {Array} templates - Templates and forms
 * @param {Array} records - Records
 * @param {Array} reports - Reports
 * @param {Array} roles - Roles and responsibilities
 * @param {Array} activities - Scheduled activities
 * @param {string} filename - Output filename
 */
export async function exportRMSToPDF(
  rms,
  standards = [],
  methods = [],
  scales = [],
  matrices = [],
  strategies = [],
  tools = [],
  templates = [],
  records = [],
  reports = [],
  roles = [],
  activities = [],
  filename = null
) {
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
    container.className = 'rms-export-pdf'
    
    // Build HTML content
    let html = generateRMSPDFHTML(rms, standards, methods, scales, matrices, strategies, tools, templates, records, reports, roles, activities)
    
    container.innerHTML = html
    document.body.appendChild(container)

    // Convert to canvas then PDF
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
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

    // Cleanup
    document.body.removeChild(container)

    // Save PDF
    const defaultFilename = `RMS-${rms.rms_reference || rms.id}-${new Date().toISOString().split('T')[0]}.pdf`
    pdf.save(filename || defaultFilename)
    
    return { success: true }
  } catch (error) {
    console.error('Error exporting RMS to PDF:', error)
    throw new Error('Error exporting PDF: ' + error.message)
  }
}

/**
 * Export RMS to Word
 * @param {Object} rms - RMS data
 * @param {Array} standards - Risk standards
 * @param {Array} methods - Identification methods
 * @param {Array} scales - Assessment scales
 * @param {Array} matrices - Risk matrices
 * @param {Array} strategies - Response strategies
 * @param {Array} tools - Tools and techniques
 * @param {Array} templates - Templates and forms
 * @param {Array} records - Records
 * @param {Array} reports - Reports
 * @param {Array} roles - Roles and responsibilities
 * @param {Array} activities - Scheduled activities
 * @param {string} filename - Output filename
 */
export async function exportRMSToWord(
  rms,
  standards = [],
  methods = [],
  scales = [],
  matrices = [],
  strategies = [],
  tools = [],
  templates = [],
  records = [],
  reports = [],
  roles = [],
  activities = [],
  filename = null
) {
  try {
    // Generate HTML content
    const htmlContent = generateRMSWordHTML(rms, standards, methods, scales, matrices, strategies, tools, templates, records, reports, roles, activities)
    
    // Create blob
    const blob = new Blob([htmlContent], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    
    // Create download link
    const link = document.createElement('a')
    link.href = url
    link.download = filename || `RMS-${rms.rms_reference || rms.id}-${new Date().toISOString().split('T')[0]}.doc`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    return { success: true }
  } catch (error) {
    console.error('Error exporting RMS to Word:', error)
    throw new Error('Error exporting Word: ' + error.message)
  }
}

/**
 * Generate HTML for PDF export
 */
function generateRMSPDFHTML(rms, standards, methods, scales, matrices, strategies, tools, templates, records, reports, roles, activities) {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  const escapeHtml = (text) => {
    if (!text) return ''
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }
    return String(text).replace(/[&<>"']/g, m => map[m])
  }

  return `
    <div style="color: black;">
      <h1 style="font-size: 24px; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 10px;">
        Risk Management Strategy
      </h1>
      <div style="margin-bottom: 20px;">
        <p><strong>Reference:</strong> ${rms.rms_reference || 'N/A'}</p>
        <p><strong>Version:</strong> ${rms.version_number || '1.0'}</p>
        <p><strong>Status:</strong> ${(rms.status || 'draft').replace('_', ' ').toUpperCase()}</p>
        <p><strong>Project:</strong> ${rms.project?.project_name || rms.project_name || 'N/A'} (${rms.project?.project_code || rms.project_code || 'N/A'})</p>
        ${rms.author ? `<p><strong>Author:</strong> ${rms.author.full_name || rms.author_name || 'N/A'}</p>` : ''}
        ${rms.owner ? `<p><strong>Owner:</strong> ${rms.owner.full_name || rms.owner_name || 'N/A'}</p>` : ''}
        ${rms.approved_date ? `<p><strong>Approved Date:</strong> ${formatDate(rms.approved_date)}</p>` : ''}
        ${rms.approved_by_user ? `<p><strong>Approved By:</strong> ${rms.approved_by_user.full_name || 'N/A'}</p>` : ''}
      </div>

      ${rms.purpose ? `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Purpose</h2>
        <p style="text-align: justify;">${escapeHtml(rms.purpose)}</p>
      </div>
      ` : ''}

      ${rms.objectives ? `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Objectives</h2>
        <p style="text-align: justify; white-space: pre-wrap;">${escapeHtml(rms.objectives)}</p>
      </div>
      ` : ''}

      ${rms.scope ? `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Scope</h2>
        <p style="text-align: justify; white-space: pre-wrap;">${escapeHtml(rms.scope)}</p>
      </div>
      ` : ''}

      ${rms.strategy_responsibility ? `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Strategy Responsibility</h2>
        <p style="text-align: justify; white-space: pre-wrap;">${escapeHtml(rms.strategy_responsibility)}</p>
      </div>
      ` : ''}

      ${rms.risk_identification_approach ? `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Risk Identification Approach</h2>
        <p style="text-align: justify; white-space: pre-wrap;">${escapeHtml(rms.risk_identification_approach)}</p>
      </div>
      ` : ''}

      ${rms.risk_assessment_approach ? `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Risk Assessment Approach</h2>
        <p style="text-align: justify; white-space: pre-wrap;">${escapeHtml(rms.risk_assessment_approach)}</p>
      </div>
      ` : ''}

      ${rms.risk_response_approach ? `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Risk Response Approach</h2>
        <p style="text-align: justify; white-space: pre-wrap;">${escapeHtml(rms.risk_response_approach)}</p>
      </div>
      ` : ''}

      ${rms.risk_monitoring_approach ? `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Risk Monitoring Approach</h2>
        <p style="text-align: justify; white-space: pre-wrap;">${escapeHtml(rms.risk_monitoring_approach)}</p>
      </div>
      ` : ''}

      ${standards.length > 0 ? `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Risk Standards (${standards.length})</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Code</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Name</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Type</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Compliance Level</th>
            </tr>
          </thead>
          <tbody>
            ${standards.map(standard => `
              <tr>
                <td style="border: 1px solid #000; padding: 8px;">${escapeHtml(standard.standard_code || 'N/A')}</td>
                <td style="border: 1px solid #000; padding: 8px;">${escapeHtml(standard.standard_name || 'N/A')}</td>
                <td style="border: 1px solid #000; padding: 8px;">${escapeHtml(standard.standard_type || 'N/A')}</td>
                <td style="border: 1px solid #000; padding: 8px;">${escapeHtml(standard.compliance_level || 'N/A')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${methods.length > 0 ? `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Risk Identification Methods (${methods.length})</h2>
        ${methods.map((method, index) => `
          <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ccc;">
            <h3 style="font-size: 14px; margin-bottom: 5px;">${index + 1}. ${escapeHtml(method.method_name || 'N/A')}</h3>
            <p style="font-size: 12px; margin: 5px 0;"><strong>Type:</strong> ${escapeHtml(method.method_type || 'N/A')}</p>
            <p style="font-size: 12px; margin: 5px 0; text-align: justify;">${escapeHtml(method.method_description || '')}</p>
            ${method.frequency ? `<p style="font-size: 12px; margin: 5px 0;"><strong>Frequency:</strong> ${escapeHtml(method.frequency)}</p>` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${scales.length > 0 ? `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Assessment Scales (${scales.length})</h2>
        ${scales.map((scale, index) => `
          <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ccc;">
            <h3 style="font-size: 14px; margin-bottom: 5px;">${index + 1}. ${escapeHtml(scale.scale_name || 'N/A')} (${escapeHtml(scale.scale_type || 'N/A')})</h3>
            ${scale.scale_description ? `<p style="font-size: 12px; margin: 5px 0; text-align: justify;">${escapeHtml(scale.scale_description)}</p>` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${matrices.length > 0 ? `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Risk Matrix (${matrices.length})</h2>
        ${matrices.map((matrix, index) => `
          <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ccc;">
            <h3 style="font-size: 14px; margin-bottom: 5px;">${index + 1}. ${escapeHtml(matrix.matrix_name || 'N/A')}</h3>
            ${matrix.matrix_description ? `<p style="font-size: 12px; margin: 5px 0; text-align: justify;">${escapeHtml(matrix.matrix_description)}</p>` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${strategies.length > 0 ? `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Response Strategies (${strategies.length})</h2>
        ${strategies.map((strategy, index) => `
          <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ccc;">
            <h3 style="font-size: 14px; margin-bottom: 5px;">${index + 1}. ${escapeHtml(strategy.strategy_name || 'N/A')} (${escapeHtml(strategy.strategy_type || 'N/A')})</h3>
            <p style="font-size: 12px; margin: 5px 0; text-align: justify;">${escapeHtml(strategy.strategy_description || '')}</p>
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${roles.length > 0 ? `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Roles and Responsibilities (${roles.length})</h2>
        ${roles.map((role, index) => `
          <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ccc;">
            <h3 style="font-size: 14px; margin-bottom: 5px;">${index + 1}. ${escapeHtml(role.role_name || 'N/A')}</h3>
            <p style="font-size: 12px; margin: 5px 0; text-align: justify;">${escapeHtml(role.role_description || '')}</p>
            ${role.independence_level ? `<p style="font-size: 12px; margin: 5px 0;"><strong>Independence Level:</strong> ${escapeHtml(role.independence_level)}</p>` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${activities.length > 0 ? `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Scheduled Activities (${activities.length})</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Activity</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Type</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Frequency</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Responsible Role</th>
            </tr>
          </thead>
          <tbody>
            ${activities.map(activity => `
              <tr>
                <td style="border: 1px solid #000; padding: 8px;">${escapeHtml(activity.activity_name || 'N/A')}</td>
                <td style="border: 1px solid #000; padding: 8px;">${escapeHtml(activity.activity_type || 'N/A')}</td>
                <td style="border: 1px solid #000; padding: 8px;">${escapeHtml(activity.frequency || 'N/A')}</td>
                <td style="border: 1px solid #000; padding: 8px;">${escapeHtml(activity.responsible_role || 'N/A')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #000; font-size: 10px; text-align: center; color: #666;">
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>Risk Management Strategy Reference: ${rms.rms_reference || 'N/A'}</p>
      </div>
    </div>
  `
}

/**
 * Generate HTML for Word export
 */
function generateRMSWordHTML(rms, standards, methods, scales, matrices, strategies, tools, templates, records, reports, roles, activities) {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  const escapeHtml = (text) => {
    if (!text) return ''
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }
    return String(text).replace(/[&<>"']/g, m => map[m])
  }

  // Use similar structure as PDF but with Word-specific HTML
  return `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>Risk Management Strategy - ${rms.rms_reference || 'Draft'}</title>
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
  @page {
    size: 8.5in 11in;
    margin: 1in;
  }
  body {
    font-family: 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.6;
    color: #000;
    margin: 0;
    padding: 0;
  }
  h1 {
    font-size: 24pt;
    font-weight: bold;
    margin-top: 24pt;
    margin-bottom: 12pt;
    color: #1f2937;
    page-break-after: avoid;
  }
  h2 {
    font-size: 18pt;
    font-weight: bold;
    margin-top: 18pt;
    margin-bottom: 9pt;
    color: #374151;
    border-bottom: 2pt solid #e5e7eb;
    padding-bottom: 6pt;
    page-break-after: avoid;
  }
  h3 {
    font-size: 14pt;
    font-weight: bold;
    margin-top: 14pt;
    margin-bottom: 7pt;
    color: #4b5563;
    page-break-after: avoid;
  }
  p {
    margin-bottom: 12pt;
    text-align: justify;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12pt 0;
  }
  th, td {
    border: 1pt solid #000;
    padding: 6pt;
    text-align: left;
  }
  th {
    background-color: #f3f4f6;
    font-weight: bold;
  }
  .footer {
    margin-top: 36pt;
    padding-top: 12pt;
    border-top: 1pt solid #000;
    font-size: 10pt;
    text-align: center;
    color: #6b7280;
  }
</style>
</head>
<body>
  ${generateRMSPDFHTML(rms, standards, methods, scales, matrices, strategies, tools, templates, records, reports, roles, activities)}
</body>
</html>`
}
