/**
 * Exception report — print / PDF (browser print) / Word (HTML blob) export
 */

function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleDateString()
  } catch {
    return String(d)
  }
}

function generatePrintHTML(
  report,
  options = [],
  lessons = [],
  approvals = [],
  distribution = [],
  qualityChecks = []
) {
  const ref = escapeHtml(report.document_ref || 'N/A')
  const ver = escapeHtml(report.version_no || '1.0')
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Exception Report ${ref}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 900px; margin: 24px auto; color: #111; }
  h1 { font-size: 1.5rem; }
  h2 { font-size: 1.1rem; border-bottom: 1px solid #333; padding-bottom: 4px; margin-top: 1.5rem; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.9rem; }
  .block { margin: 12px 0; white-space: pre-wrap; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 8px; }
  th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
  .footer { margin-top: 2rem; text-align: center; font-size: 0.8rem; color: #666; }
</style></head><body>
  <h1>EXCEPTION REPORT</h1>
  <div class="meta">
    <div>
      <p><strong>Document Reference:</strong> ${ref}</p>
      <p><strong>Version:</strong> ${ver}</p>
      <p><strong>Report Date:</strong> ${report.report_date ? formatDate(report.report_date) : 'N/A'}</p>
    </div>
    <div>
      <p><strong>Status:</strong> ${escapeHtml((report.report_status || 'draft').toUpperCase())}</p>
      <p><strong>Urgency:</strong> ${escapeHtml((report.urgency || 'medium').toUpperCase())}</p>
    </div>
  </div>

  <h2>Section 2: Exception Overview</h2>
  <p><strong>Exception Title:</strong> ${escapeHtml(report.exception_title || 'N/A')}</p>
  ${report.exception_summary ? `<div class="block">${escapeHtml(report.exception_summary)}</div>` : ''}

  ${report.cause_description ? `<h2>Section 4: Cause Analysis</h2><div class="block">${escapeHtml(report.cause_description)}</div>` : ''}
  ${report.project_consequences ? `<h2>Section 5: Consequences</h2><div class="block">${escapeHtml(report.project_consequences)}</div>` : ''}

  ${options.length > 0 ? `
  <h2>Section 6: Options Analysis</h2>
  ${options.map((o) => `
    <div style="margin:12px 0;padding:12px;border:1px solid #333;">
      <h3>Option ${escapeHtml(o.option_number)}: ${escapeHtml(o.option_title)}${o.is_recommended ? ' (RECOMMENDED)' : ''}</h3>
      ${o.option_description ? `<div class="block">${escapeHtml(o.option_description)}</div>` : ''}
    </div>
  `).join('')}
  ` : ''}

  ${report.recommendation_summary ? `<h2>Section 7: Recommendation</h2><div class="block">${escapeHtml(report.recommendation_summary)}</div>` : ''}
  ${report.board_decision ? `<h2>Board Decision</h2><div class="block">${escapeHtml(report.board_decision)}</div>` : ''}

  ${lessons.length > 0 ? `
  <h2>Lessons</h2>
  <ul>${lessons.map((l) => `<li>${escapeHtml(l.lesson_text || l.description || JSON.stringify(l))}</li>`).join('')}</ul>
  ` : ''}

  ${approvals.length > 0 ? `
  <h2>Approvals</h2>
  <table><thead><tr><th>Role</th><th>Status</th><th>Date</th></tr></thead><tbody>
  ${approvals.map((a) => `<tr><td>${escapeHtml(a.approver_role || '')}</td><td>${escapeHtml(a.approval_status || '')}</td><td>${a.approval_date ? formatDate(a.approval_date) : ''}</td></tr>`).join('')}
  </tbody></table>
  ` : ''}

  ${distribution.length > 0 ? `
  <h2>Distribution</h2>
  <table><thead><tr><th>To</th><th>Method</th></tr></thead><tbody>
  ${distribution.map((d) => `<tr><td>${escapeHtml(d.distributed_to_name || d.recipient || '')}</td><td>${escapeHtml(d.distribution_method || '')}</td></tr>`).join('')}
  </tbody></table>
  ` : ''}

  ${qualityChecks.length > 0 ? `
  <h2>Quality checks</h2>
  <ul>${qualityChecks.map((q) => `<li>${escapeHtml(q.check_name || q.description || '')}</li>`).join('')}</ul>
  ` : ''}

  <div class="footer">
    <p>Exception Report: ${ref} | Version ${ver} | Generated ${formatDate(new Date())}</p>
  </div>
</body></html>`
}

export function exportToPDF(
  report,
  options = [],
  lessons = [],
  approvals = [],
  distribution = [],
  qualityChecks = []
) {
  const html = generatePrintHTML(report, options, lessons, approvals, distribution, qualityChecks)
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Please allow pop-ups to export PDF')
    return
  }
  printWindow.document.write(html)
  printWindow.document.close()
  setTimeout(() => {
    printWindow.print()
  }, 250)
}

export function exportToWord(
  report,
  options = [],
  lessons = [],
  approvals = [],
  distribution = [],
  qualityChecks = []
) {
  const html = generatePrintHTML(report, options, lessons, approvals, distribution, qualityChecks)
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const name = (report.document_ref || 'exception-report').replace(/[^\w.-]+/g, '_')
  link.href = url
  link.download = `${name}.doc`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default { generatePrintHTML, exportToPDF, exportToWord }
