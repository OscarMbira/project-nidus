/**
 * Lessons Report Export Utilities
 * Handles PDF and Word export functionality for Lessons Reports
 */

/**
 * Generate printable HTML content for Lessons Report
 */
export function generateLessonsReportPrintHTML(report, lessons = [], recommendations = [], approvals = [], distribution = [], appendices = []) {
  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Lessons Report: ${report.report_reference}</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; }
      .no-print { display: none; }
      .page-break { page-break-after: always; }
    }
    body {
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm;
    }
    .header {
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 18pt;
      font-weight: bold;
    }
    .header-info {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      font-size: 10pt;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 10px;
      border-bottom: 1px solid #000;
      padding-bottom: 5px;
    }
    .field {
      margin-bottom: 10px;
    }
    .field-label {
      font-weight: bold;
      margin-bottom: 3px;
    }
    .field-value {
      margin-left: 20px;
      white-space: pre-wrap;
    }
    .lesson {
      border: 1px solid #000;
      padding: 15px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .recommendation {
      border-left: 3px solid #000;
      padding-left: 15px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    .approval {
      border: 1px solid #ccc;
      padding: 10px;
      margin-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    th, td {
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    .footer {
      margin-top: 50px;
      padding-top: 10px;
      border-top: 1px solid #000;
      font-size: 9pt;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>LESSONS REPORT</h1>
    <div class="header-info">
      <div>
        <strong>Reference:</strong> ${report.report_reference}<br>
        <strong>Version:</strong> ${report.version_no || '1.0'}<br>
        <strong>Type:</strong> ${report.report_type?.toUpperCase() || 'PROJECT'} REPORT<br>
        <strong>Project:</strong> ${report.project?.project_name || 'N/A'}
      </div>
      <div>
        <strong>Author:</strong> ${report.author_name || report.author?.full_name || 'N/A'}<br>
        <strong>Prepared By:</strong> ${report.prepared_by_name || report.prepared_by?.full_name || 'N/A'}<br>
        <strong>Date:</strong> ${formatDate(report.report_date)}
      </div>
    </div>
  </div>

  ${report.executive_summary ? `
  <div class="section">
    <div class="section-title">Executive Summary</div>
    <div class="field-value">${report.executive_summary.replace(/\n/g, '<br>')}</div>
  </div>
  ` : ''}

  ${report.purpose ? `
  <div class="section">
    <div class="section-title">Purpose</div>
    <div class="field-value">${report.purpose.replace(/\n/g, '<br>')}</div>
  </div>
  ` : ''}

  ${(report.what_went_well_summary || report.what_did_not_go_well_summary) ? `
  <div class="section">
    <div class="section-title">Overall Review</div>
    ${report.what_went_well_summary ? `
    <div class="field">
      <div class="field-label">What Went Well:</div>
      <div class="field-value">${report.what_went_well_summary.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}
    ${report.what_did_not_go_well_summary ? `
    <div class="field">
      <div class="field-label">What Did Not Go Well:</div>
      <div class="field-value">${report.what_did_not_go_well_summary.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}
    ${report.surprises_unexpected_summary ? `
    <div class="field">
      <div class="field-label">Surprises / Unexpected Events:</div>
      <div class="field-value">${report.surprises_unexpected_summary.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}
  </div>
  ` : ''}

  ${(report.time_performance_review || report.cost_performance_review || report.quality_performance_review) ? `
  <div class="section">
    <div class="section-title">Review of Measures</div>
    ${report.time_performance_review ? `
    <div class="field">
      <div class="field-label">Time / Schedule Performance:</div>
      <div class="field-value">${report.time_performance_review.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}
    ${report.cost_performance_review ? `
    <div class="field">
      <div class="field-label">Cost / Budget Performance:</div>
      <div class="field-value">${report.cost_performance_review.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}
    ${report.quality_performance_review ? `
    <div class="field">
      <div class="field-label">Quality Performance:</div>
      <div class="field-value">${report.quality_performance_review.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}
    ${report.scope_performance_review ? `
    <div class="field">
      <div class="field-label">Scope Performance:</div>
      <div class="field-value">${report.scope_performance_review.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}
    ${report.risk_performance_review ? `
    <div class="field">
      <div class="field-label">Risk Management Performance:</div>
      <div class="field-value">${report.risk_performance_review.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}
    ${report.benefits_performance_review ? `
    <div class="field">
      <div class="field-label">Benefits Realization Performance:</div>
      <div class="field-value">${report.benefits_performance_review.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}
  </div>
  ` : ''}

  ${lessons.length > 0 ? `
  <div class="section">
    <div class="section-title">Significant Lessons</div>
    ${lessons.map((reportLesson, index) => {
      const lesson = reportLesson.lesson || reportLesson
      return `
      <div class="lesson">
        <div class="field-label">${lesson.lesson_reference || `Lesson ${index + 1}`}: ${lesson.lesson_title || lesson.title || 'Untitled'}</div>
        <div class="field-value">${(lesson.what_happened || lesson.event_description || '').replace(/\n/g, '<br>')}</div>
        ${lesson.recommendations ? `
        <div class="field">
          <div class="field-label">Recommendations:</div>
          <div class="field-value">${lesson.recommendations.replace(/\n/g, '<br>')}</div>
        </div>
        ` : ''}
      </div>
      `
    }).join('')}
  </div>
  ` : ''}

  ${recommendations.length > 0 ? `
  <div class="section">
    <div class="section-title">Recommendations</div>
    ${recommendations.map((rec, index) => `
    <div class="recommendation">
      <div class="field-label">${index + 1}. ${rec.recommendation_title}</div>
      <div class="field-value">${rec.recommendation_description.replace(/\n/g, '<br>')}</div>
      <div class="field" style="font-size: 10pt; margin-top: 5px;">
        <strong>Priority:</strong> ${rec.priority || 'N/A'} | 
        <strong>Responsible:</strong> ${rec.responsible_party?.full_name || rec.responsible_party_name || 'N/A'} | 
        <strong>Status:</strong> ${rec.implementation_status || 'N/A'}
      </div>
    </div>
    `).join('')}
  </div>
  ` : ''}

  ${approvals.length > 0 ? `
  <div class="section">
    <div class="section-title">Approval History</div>
    ${approvals.map((approval) => `
    <div class="approval">
      <strong>${approval.approver_name || approval.approver?.full_name || 'Unknown'}</strong> 
      (${approval.approver_role || 'N/A'}) - 
      <strong>${approval.approval_status.toUpperCase()}</strong>
      ${approval.approval_date ? ` - ${formatDate(approval.approval_date)}` : ''}
      ${approval.approval_comments ? `<br>Comments: ${approval.approval_comments}` : ''}
    </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="footer">
    <p>Lessons Report: ${report.report_reference} | Version ${report.version_no || '1.0'} | Generated ${formatDate(new Date())}</p>
  </div>
</body>
</html>
  `
}

/**
 * Export Lessons Report to PDF (using browser print)
 */
export function exportLessonsReportToPDF(report, lessons = [], recommendations = [], approvals = [], distribution = [], appendices = []) {
  const html = generateLessonsReportPrintHTML(report, lessons, recommendations, approvals, distribution, appendices)
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

/**
 * Export Lessons Report to Word (HTML format)
 */
export function exportLessonsReportToWord(report, lessons = [], recommendations = [], approvals = [], distribution = [], appendices = []) {
  const html = generateLessonsReportPrintHTML(report, lessons, recommendations, approvals, distribution, appendices)
  
  // Create Word document from HTML
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  
  link.href = url
  link.download = `Lessons_Report_${report.report_reference || 'Report'}_${new Date().toISOString().split('T')[0]}.doc`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default {
  generateLessonsReportPrintHTML,
  exportLessonsReportToPDF,
  exportLessonsReportToWord
}
