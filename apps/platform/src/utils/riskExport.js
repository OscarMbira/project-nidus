/**
 * Risk Register Export Utilities
 * Provides export functionality for Risk Register (PDF, CSV, Excel, Print)
 */

/**
 * Export Risk Register to PDF
 */
export async function exportRiskRegisterToPDF(register, risks, filename = null) {
  try {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ])

    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.width = '210mm'
    container.style.padding = '20mm'
    container.style.backgroundColor = 'white'
    container.style.fontFamily = 'Arial, sans-serif'
    container.className = 'risk-register-export-pdf'
    
    const html = generateRiskRegisterPDFHTML(register, risks)
    container.innerHTML = html
    document.body.appendChild(container)

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

    document.body.removeChild(container)

    const defaultFilename = `Risk-Register-${register.register_reference || register.id}-${new Date().toISOString().split('T')[0]}.pdf`
    pdf.save(filename || defaultFilename)
    
    return { success: true }
  } catch (error) {
    console.error('Error exporting Risk Register to PDF:', error)
    throw new Error('Error exporting PDF: ' + error.message)
  }
}

/**
 * Export Risk Register to CSV
 */
export function exportRiskRegisterToCSV(register, risks, filename = null) {
  try {
    const headers = [
      'Risk ID', 'Title', 'Type', 'Category', 'Status', 
      'Pre-Probability', 'Pre-Impact', 'Pre-Score', 'Pre-Level',
      'Post-Probability', 'Post-Impact', 'Post-Score', 'Post-Level',
      'Proximity', 'Response Category', 'Owner', 'Date Registered'
    ]

    const rows = risks.map(risk => [
      risk.risk_identifier || risk.id,
      risk.risk_title || '',
      risk.risk_type || '',
      risk.risk_category || '',
      risk.status_enum || risk.status || '',
      risk.pre_probability || '',
      risk.pre_impact || '',
      risk.pre_expected_value || '',
      risk.pre_risk_score || '',
      risk.post_probability || '',
      risk.post_impact || '',
      risk.post_expected_value || '',
      risk.post_risk_score || '',
      risk.proximity || '',
      risk.response_category || '',
      risk.risk_owner?.full_name || '',
      risk.date_registered || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || `Risk-Register-${register.register_reference || register.id}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    return { success: true }
  } catch (error) {
    console.error('Error exporting Risk Register to CSV:', error)
    throw new Error('Error exporting CSV: ' + error.message)
  }
}

/**
 * Generate HTML for PDF export
 */
function generateRiskRegisterPDFHTML(register, risks) {
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

  const getRiskLevelColor = (level) => {
    if (!level) return 'gray'
    if (level.includes('very_high') || level.includes('critical')) return 'red'
    if (level.includes('high')) return 'orange'
    if (level.includes('medium')) return 'yellow'
    return 'green'
  }

  return `
    <div style="color: black;">
      <h1 style="font-size: 24px; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 10px;">
        Risk Register
      </h1>
      <div style="margin-bottom: 20px;">
        <p><strong>Reference:</strong> ${register.register_reference || 'N/A'}</p>
        <p><strong>Version:</strong> ${register.version_number || '1.0'}</p>
        <p><strong>Project:</strong> ${register.project?.project_name || 'N/A'}</p>
        ${register.last_review_date ? `<p><strong>Last Review:</strong> ${formatDate(register.last_review_date)}</p>` : ''}
        ${register.next_review_date ? `<p><strong>Next Review:</strong> ${formatDate(register.next_review_date)}</p>` : ''}
      </div>

      ${register.risk_tolerance_statement ? `
      <div style="margin-bottom: 20px; padding: 10px; background-color: #f3f4f6; border-left: 4px solid #3b82f6;">
        <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">Risk Tolerance Statement</h3>
        <p style="text-align: justify;">${escapeHtml(register.risk_tolerance_statement)}</p>
      </div>
      ` : ''}

      <h2 style="font-size: 18px; margin-top: 30px; margin-bottom: 10px; border-bottom: 1px solid #000; padding-bottom: 5px;">
        Risks (${risks.length})
      </h2>

      ${risks.length === 0 ? `
        <p style="text-align: center; color: #666; padding: 20px;">No risks registered</p>
      ` : `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid #000; padding: 6px; text-align: left;">ID</th>
              <th style="border: 1px solid #000; padding: 6px; text-align: left;">Title</th>
              <th style="border: 1px solid #000; padding: 6px; text-align: center;">Type</th>
              <th style="border: 1px solid #000; padding: 6px; text-align: center;">Category</th>
              <th style="border: 1px solid #000; padding: 6px; text-align: center;">P</th>
              <th style="border: 1px solid #000; padding: 6px; text-align: center;">I</th>
              <th style="border: 1px solid #000; padding: 6px; text-align: center;">Score</th>
              <th style="border: 1px solid #000; padding: 6px; text-align: center;">Level</th>
              <th style="border: 1px solid #000; padding: 6px; text-align: center;">Status</th>
              <th style="border: 1px solid #000; padding: 6px; text-align: left;">Owner</th>
            </tr>
          </thead>
          <tbody>
            ${risks.map((risk, index) => {
              const levelColor = getRiskLevelColor(risk.pre_risk_score || '')
              return `
                <tr style="page-break-inside: avoid;">
                  <td style="border: 1px solid #000; padding: 6px;">${escapeHtml(risk.risk_identifier || `R${index + 1}`)}</td>
                  <td style="border: 1px solid #000; padding: 6px;">${escapeHtml(risk.risk_title || '')}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center; text-transform: capitalize;">${escapeHtml(risk.risk_type || '')}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center; text-transform: capitalize;">${escapeHtml(risk.risk_category || '')}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${risk.pre_probability || ''}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${risk.pre_impact || ''}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${risk.pre_expected_value || ''}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center; background-color: ${levelColor === 'red' ? '#fee2e2' : levelColor === 'orange' ? '#fed7aa' : levelColor === 'yellow' ? '#fef3c7' : '#dcfce7'};">
                    ${escapeHtml((risk.pre_risk_score || '').replace('_', ' ').toUpperCase())}
                  </td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center; text-transform: capitalize;">${escapeHtml(risk.status_enum || risk.status || '')}</td>
                  <td style="border: 1px solid #000; padding: 6px;">${escapeHtml(risk.risk_owner?.full_name || '')}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
      `}

      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #000; font-size: 10px; text-align: center; color: #666;">
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>Risk Register Reference: ${register.register_reference || 'N/A'}</p>
      </div>
    </div>
  `
}
