/**
 * Highlight Report Export Utilities
 * PDF, Word, and print-ready HTML for Highlight Reports
 */

function formatDate(date) {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function escapeHtml(text) {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>')
}

export function generateHighlightReportPrintHTML(report, products = [], risks = [], issues = [], tolerances = []) {
  const t = report || {}
  return `
<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(t.report_title || 'Highlight Report')} - ${escapeHtml(t.report_reference || '')}</title>
  <style>
    @page { margin: 2cm; }
    body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #000; }
    h1 { font-size: 24pt; margin-bottom: 10pt; border-bottom: 2pt solid #000; padding-bottom: 5pt; }
    h2 { font-size: 16pt; margin-top: 20pt; margin-bottom: 10pt; border-bottom: 1pt solid #666; padding-bottom: 3pt; }
    h3 { font-size: 14pt; margin-top: 15pt; margin-bottom: 8pt; }
    table { width: 100%; border-collapse: collapse; margin: 10pt 0; }
    th, td { border: 1pt solid #000; padding: 6pt; text-align: left; }
    th { background-color: #f0f0f0; font-weight: bold; }
    .section { margin-bottom: 20pt; }
    .footer { margin-top: 30pt; padding-top: 10pt; border-top: 1pt solid #666; font-size: 9pt; color: #666; }
  </style>
</head>
<body>
  <h1>${escapeHtml(t.report_title || 'Highlight Report')}</h1>
  <div class="section">
    <p><strong>Reference:</strong> ${escapeHtml(t.report_reference || 'N/A')}</p>
    <p><strong>Version:</strong> ${escapeHtml(t.version_no || '1.0')}</p>
    <p><strong>Report Date:</strong> ${formatDate(t.report_date)}</p>
    ${t.reporting_period_start && t.reporting_period_end ? `
      <p><strong>Reporting Period:</strong> ${formatDate(t.reporting_period_start)} – ${formatDate(t.reporting_period_end)}</p>
    ` : ''}
    ${t.prepared_by ? `<p><strong>Prepared by:</strong> ${escapeHtml(t.prepared_by.full_name || t.prepared_by.email)}</p>` : ''}
    <p><strong>Status:</strong> ${escapeHtml(t.approval_workflow_status || t.stage_status || t.status || 'draft')}</p>
  </div>

  ${t.executive_summary ? `
  <div class="section">
    <h2>Executive Summary</h2>
    <p>${escapeHtml(t.executive_summary)}</p>
  </div>
  ` : ''}

  ${t.overall_status_summary ? `
  <div class="section">
    <h2>Overall Status</h2>
    <p>${escapeHtml(t.overall_status_summary)}</p>
  </div>
  ` : ''}

  ${(t.progress_summary || t.completed_this_period || t.planned_next_period) ? `
  <div class="section">
    <h2>Progress</h2>
    ${t.progress_summary ? `<p>${escapeHtml(t.progress_summary)}</p>` : ''}
    ${t.completed_this_period ? `<h3>Completed This Period</h3><p>${escapeHtml(t.completed_this_period)}</p>` : ''}
    ${t.planned_next_period ? `<h3>Planned Next Period</h3><p>${escapeHtml(t.planned_next_period)}</p>` : ''}
  </div>
  ` : ''}

  ${products.length > 0 ? `
  <div class="section">
    <h2>Products / Deliverables</h2>
    <table>
      <thead>
        <tr><th>Product</th><th>Period</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${products.map(p => `
          <tr>
            <td>${escapeHtml(p.product_name || '')}</td>
            <td>${escapeHtml((p.period_type || '').replace(/_/g, ' '))}</td>
            <td>${escapeHtml((p.completion_status || '').replace(/-/g, ' '))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${(t.risks_summary || risks.length > 0) ? `
  <div class="section">
    <h2>Risks</h2>
    ${t.risks_summary ? `<p>${escapeHtml(t.risks_summary)}</p>` : ''}
    ${risks.length > 0 ? `
      <ul>${risks.map(r => `<li>${escapeHtml(r.risk_title || r.risk_description || '')}</li>`).join('')}</ul>
    ` : ''}
  </div>
  ` : ''}

  ${(t.issues_summary || issues.length > 0) ? `
  <div class="section">
    <h2>Issues</h2>
    ${t.issues_summary ? `<p>${escapeHtml(t.issues_summary)}</p>` : ''}
    ${issues.length > 0 ? `
      <ul>${issues.map(i => `<li>${escapeHtml(i.issue_title || i.issue_description || '')}</li>`).join('')}</ul>
    ` : ''}
  </div>
  ` : ''}

  ${(t.decisions_required || t.recommendations) ? `
  <div class="section">
    <h2>Decisions &amp; Recommendations</h2>
    ${t.decisions_required ? `<h3>Decisions Required</h3><p>${escapeHtml(t.decisions_required)}</p>` : ''}
    ${t.recommendations ? `<h3>Recommendations</h3><p>${escapeHtml(t.recommendations)}</p>` : ''}
  </div>
  ` : ''}

  ${tolerances.length > 0 ? `
  <div class="section">
    <h2>Tolerance Status</h2>
    <table>
      <thead>
        <tr><th>Type</th><th>Current</th><th>Baseline</th><th>Variance %</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${tolerances.map(tol => `
          <tr>
            <td>${escapeHtml(tol.tolerance_type || '')}</td>
            <td>${tol.current_value != null ? Number(tol.current_value) : '—'}</td>
            <td>${tol.baseline_value != null ? Number(tol.baseline_value) : '—'}</td>
            <td>${tol.variance_percentage != null ? `${Number(tol.variance_percentage).toFixed(1)}%` : '—'}</td>
            <td>${escapeHtml(tol.status || '')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="footer">
    <p>Generated: ${formatDate(new Date())}</p>
  </div>
</body>
</html>
`
}

export function exportHighlightReportToPDF(report, products = [], risks = [], issues = [], tolerances = []) {
  const html = generateHighlightReportPrintHTML(report, products, risks, issues, tolerances)
  const win = window.open('', '_blank')
  if (!win) {
    alert('Please allow pop-ups to export PDF')
    return
  }
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.print(), 250)
}

export function exportHighlightReportToWord(report, products = [], risks = [], issues = [], tolerances = []) {
  const html = generateHighlightReportPrintHTML(report, products, risks, issues, tolerances)
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${report.report_reference || 'highlight_report'}_${new Date().toISOString().split('T')[0]}.doc`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
