/**
 * Risk Register Export Utilities
 * Provides export functionality for Risk Register (PDF, CSV, Excel, Print)
 */

import { addCanvasImagePages } from './pdfCanvasPagination.js'

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
    // Tighter padding so header + legend + ~11-row table fits one A4 page
    container.style.padding = '10mm 12mm'
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
    addCanvasImagePages(pdf, imgData, { imgWidth, imgHeight, pageHeight })

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

  // Supabase embed uses `projects:project_id(...)` → `register.projects`; some callers still pass `project`.
  const project = register.projects || register.project || {}
  const projectCode = escapeHtml(project.project_code || register.project_code || 'N/A')
  const projectName = escapeHtml(project.project_name || register.project_name || 'N/A')
  const generatedAt = new Date().toLocaleString()

  return `
    <div style="color: black;">
      <h1 style="font-size: 18px; margin: 0 0 8px 0; border-bottom: 2px solid #000; padding-bottom: 6px;">
        Risk Register
      </h1>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 10px;">
        <div style="flex: 1; min-width: 0; font-size: 11px; line-height: 1.35;">
          <p style="margin: 0 0 2px 0;"><strong>Reference:</strong> ${escapeHtml(register.register_reference || 'N/A')}</p>
          <p style="margin: 0 0 2px 0;"><strong>Version:</strong> ${escapeHtml(register.version_number || '1.0')}</p>
          <p style="margin: 0 0 2px 0;"><strong>Project Code:</strong> ${projectCode}</p>
          <p style="margin: 0 0 2px 0;"><strong>Project Name:</strong> ${projectName}</p>
          ${register.last_review_date ? `<p style="margin: 0 0 2px 0;"><strong>Last Review:</strong> ${formatDate(register.last_review_date)}</p>` : ''}
          ${register.next_review_date ? `<p style="margin: 0 0 2px 0;"><strong>Next Review:</strong> ${formatDate(register.next_review_date)}</p>` : ''}
        </div>
        <div style="flex: 0 0 240px;">
          <div style="border: 1px solid #111; border-radius: 4px; padding: 6px 8px; background-color: #fffbeb; font-size: 9px; line-height: 1.35;">
            <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid #d1d5db; padding-bottom: 3px;">Legend</div>
            <p style="margin: 0 0 4px 0;"><strong>P</strong> — Probability (1–5): 1=Very Low … 5=Very High</p>
            <p style="margin: 0 0 4px 0;"><strong>I</strong> — Impact (1–5): 1=Very Low … 5=Very High</p>
            <p style="margin: 0;"><strong>Score</strong> — P × I (range 1–25)</p>
          </div>
          <p style="margin: 4px 0 0 0; font-size: 9px; color: #374151;">
            <strong>Generated:</strong> ${escapeHtml(generatedAt)}
          </p>
        </div>
      </div>

      ${register.risk_tolerance_statement ? `
      <div style="margin-bottom: 8px; padding: 6px 8px; background-color: #f3f4f6; border-left: 3px solid #3b82f6;">
        <h3 style="font-size: 11px; font-weight: bold; margin: 0 0 3px 0;">Risk Tolerance Statement</h3>
        <p style="margin: 0; font-size: 10px; text-align: justify;">${escapeHtml(register.risk_tolerance_statement)}</p>
      </div>
      ` : ''}

      <h2 style="font-size: 14px; margin: 8px 0 4px 0; border-bottom: 1px solid #000; padding-bottom: 3px;">
        Risks (${risks.length})
      </h2>

      ${risks.length === 0 ? `
        <p style="text-align: center; color: #666; padding: 12px; font-size: 11px;">No risks registered</p>
      ` : `
        <table style="width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 9px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid #000; padding: 3px 4px; text-align: center; width: 28px;">#</th>
              <th style="border: 1px solid #000; padding: 3px 4px; text-align: left;">ID</th>
              <th style="border: 1px solid #000; padding: 3px 4px; text-align: left;">Title</th>
              <th style="border: 1px solid #000; padding: 3px 4px; text-align: center;">Type</th>
              <th style="border: 1px solid #000; padding: 3px 4px; text-align: center;">Category</th>
              <th style="border: 1px solid #000; padding: 3px 4px; text-align: center;">P</th>
              <th style="border: 1px solid #000; padding: 3px 4px; text-align: center;">I</th>
              <th style="border: 1px solid #000; padding: 3px 4px; text-align: center;">Score</th>
              <th style="border: 1px solid #000; padding: 3px 4px; text-align: center;">Level</th>
              <th style="border: 1px solid #000; padding: 3px 4px; text-align: center;">Status</th>
              <th style="border: 1px solid #000; padding: 3px 4px; text-align: left;">Owner</th>
            </tr>
          </thead>
          <tbody>
            ${risks.map((risk, index) => {
              const levelColor = getRiskLevelColor(risk.pre_risk_score || '')
              return `
                <tr style="page-break-inside: avoid;">
                  <td style="border: 1px solid #000; padding: 3px 4px; text-align: center; font-weight: 600;">${index + 1}</td>
                  <td style="border: 1px solid #000; padding: 3px 4px;">${escapeHtml(risk.risk_identifier || `R${index + 1}`)}</td>
                  <td style="border: 1px solid #000; padding: 3px 4px;">${escapeHtml(risk.risk_title || '')}</td>
                  <td style="border: 1px solid #000; padding: 3px 4px; text-align: center; text-transform: capitalize;">${escapeHtml(risk.risk_type || '')}</td>
                  <td style="border: 1px solid #000; padding: 3px 4px; text-align: center; text-transform: capitalize;">${escapeHtml(risk.risk_category || '')}</td>
                  <td style="border: 1px solid #000; padding: 3px 4px; text-align: center;">${risk.pre_probability || ''}</td>
                  <td style="border: 1px solid #000; padding: 3px 4px; text-align: center;">${risk.pre_impact || ''}</td>
                  <td style="border: 1px solid #000; padding: 3px 4px; text-align: center;">${risk.pre_expected_value || ''}</td>
                  <td style="border: 1px solid #000; padding: 3px 4px; text-align: center; background-color: ${levelColor === 'red' ? '#fee2e2' : levelColor === 'orange' ? '#fed7aa' : levelColor === 'yellow' ? '#fef3c7' : '#dcfce7'};">
                    ${escapeHtml((risk.pre_risk_score || '').replace('_', ' ').toUpperCase())}
                  </td>
                  <td style="border: 1px solid #000; padding: 3px 4px; text-align: center; text-transform: capitalize;">${escapeHtml(risk.status_enum || risk.status || '')}</td>
                  <td style="border: 1px solid #000; padding: 3px 4px;">${escapeHtml(risk.risk_owner?.full_name || '')}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
      `}
    </div>
  `
}
