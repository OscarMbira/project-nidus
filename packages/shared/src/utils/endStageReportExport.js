/**
 * End Stage Report Export Utilities
 * Provides export functionality for end stage reports (PDF, Word, Print)
 */

/**
 * Generate print-ready HTML for end stage report
 */
function generatePrintHTML(
  report,
  productStatuses = [],
  riskReviews = [],
  issueReviews = [],
  followOnActions = [],
  approvals = [],
  distribution = []
) {
  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  let html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${report.report_title || 'End Stage Report'} - ${report.report_reference || ''}</title>
        <style>
          @page {
            margin: 2cm;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #000;
          }
          h1 {
            font-size: 24pt;
            margin-bottom: 10pt;
            border-bottom: 2pt solid #000;
            padding-bottom: 5pt;
          }
          h2 {
            font-size: 16pt;
            margin-top: 20pt;
            margin-bottom: 10pt;
            border-bottom: 1pt solid #666;
            padding-bottom: 3pt;
          }
          h3 {
            font-size: 14pt;
            margin-top: 15pt;
            margin-bottom: 8pt;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10pt 0;
          }
          th, td {
            border: 1pt solid #000;
            padding: 6pt;
            text-align: left;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .section {
            margin-bottom: 20pt;
          }
          .footer {
            margin-top: 30pt;
            padding-top: 10pt;
            border-top: 1pt solid #666;
            font-size: 9pt;
            color: #666;
          }
        </style>
      </head>
      <body>
        <h1>${report.report_title || 'End Stage Report'}</h1>
        
        <div class="section">
          <p><strong>Report Reference:</strong> ${report.report_reference || 'N/A'}</p>
          <p><strong>Version:</strong> ${report.version_no || '1.0'}</p>
          <p><strong>Report Date:</strong> ${formatDate(report.report_date)}</p>
          ${report.reporting_period_start && report.reporting_period_end ? `
            <p><strong>Reporting Period:</strong> ${formatDate(report.reporting_period_start)} - ${formatDate(report.reporting_period_end)}</p>
          ` : ''}
          <p><strong>Stage:</strong> ${report.stage_name || 'N/A'} (Stage ${report.stage_number || 'N/A'})</p>
          <p><strong>Status:</strong> ${report.approval_workflow_status || report.approval_status || 'draft'}</p>
        </div>

        ${report.stage_objectives_summary ? `
          <div class="section">
            <h2>Stage Objectives Summary</h2>
            <p>${report.stage_objectives_summary.replace(/\n/g, '<br>')}</p>
            <p><strong>Objectives Met:</strong> ${report.stage_objectives_met ? 'Yes' : 'No'}</p>
          </div>
        ` : ''}

        ${report.business_case_review_summary ? `
          <div class="section">
            <h2>Business Case Review</h2>
            <p>${report.business_case_review_summary.replace(/\n/g, '<br>')}</p>
            <p><strong>Business Case Still Valid:</strong> ${report.business_case_still_valid ? 'Yes' : 'No'}</p>
            ${report.benefits_realized_summary ? `
              <h3>Benefits Realized</h3>
              <p>${report.benefits_realized_summary.replace(/\n/g, '<br>')}</p>
            ` : ''}
          </div>
        ` : ''}

        ${productStatuses.length > 0 ? `
          <div class="section">
            <h2>Product/Deliverable Status</h2>
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Completion Status</th>
                  <th>Quality Status</th>
                  <th>Handover Status</th>
                </tr>
              </thead>
              <tbody>
                ${productStatuses.map(p => `
                  <tr>
                    <td>${p.product_name}</td>
                    <td>${p.completion_status}</td>
                    <td>${p.quality_status}</td>
                    <td>${p.handover_status || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${riskReviews.length > 0 ? `
          <div class="section">
            <h2>Risk Review</h2>
            <table>
              <thead>
                <tr>
                  <th>Risk Title</th>
                  <th>Status</th>
                  <th>Probability</th>
                  <th>Impact</th>
                </tr>
              </thead>
              <tbody>
                ${riskReviews.map(r => `
                  <tr>
                    <td>${r.risk_title}</td>
                    <td>${r.risk_status}</td>
                    <td>${r.current_probability || r.original_probability || 'N/A'}</td>
                    <td>${r.current_impact || r.original_impact || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${issueReviews.length > 0 ? `
          <div class="section">
            <h2>Issue Review</h2>
            <table>
              <thead>
                <tr>
                  <th>Issue Title</th>
                  <th>Status</th>
                  <th>Impact</th>
                </tr>
              </thead>
              <tbody>
                ${issueReviews.map(i => `
                  <tr>
                    <td>${i.issue_title}</td>
                    <td>${i.issue_status}</td>
                    <td>${i.issue_impact || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${report.lessons_learned ? `
          <div class="section">
            <h2>Lessons Learned</h2>
            <p>${report.lessons_learned.replace(/\n/g, '<br>')}</p>
          </div>
        ` : ''}

        ${report.next_stage_forecast ? `
          <div class="section">
            <h2>Forecast for Next Stage</h2>
            <p>${report.next_stage_forecast.replace(/\n/g, '<br>')}</p>
          </div>
        ` : ''}

        ${followOnActions.length > 0 ? `
          <div class="section">
            <h2>Follow-On Actions</h2>
            <table>
              <thead>
                <tr>
                  <th>Action Description</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${followOnActions.map(a => `
                  <tr>
                    <td>${a.action_description}</td>
                    <td>${a.action_type}</td>
                    <td>${a.priority}</td>
                    <td>${a.status}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${approvals.length > 0 ? `
          <div class="section">
            <h2>Approvals</h2>
            <table>
              <thead>
                <tr>
                  <th>Approver</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${approvals.map(a => `
                  <tr>
                    <td>${a.approver_name || 'N/A'}</td>
                    <td>${a.approver_role || 'N/A'}</td>
                    <td>${a.approval_status}</td>
                    <td>${formatDate(a.approval_date)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div class="footer">
          <p>Generated: ${new Date().toLocaleString()}</p>
          ${report.project ? `<p>Project: ${report.project.project_name} (${report.project.project_code})</p>` : ''}
        </div>
      </body>
    </html>
  `
  return html
}

/**
 * Export end stage report as PDF (using browser print)
 */
export function exportEndStageReportToPDF(
  report,
  productStatuses = [],
  riskReviews = [],
  issueReviews = [],
  followOnActions = [],
  approvals = [],
  distribution = []
) {
  const html = generatePrintHTML(report, productStatuses, riskReviews, issueReviews, followOnActions, approvals, distribution)
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
 * Export end stage report as Word document (using HTML format)
 */
export function exportEndStageReportToWord(
  report,
  productStatuses = [],
  riskReviews = [],
  issueReviews = [],
  followOnActions = [],
  approvals = [],
  distribution = []
) {
  const html = generatePrintHTML(report, productStatuses, riskReviews, issueReviews, followOnActions, approvals, distribution)
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${report.report_reference || 'end_stage_report'}_${new Date().toISOString().split('T')[0]}.doc`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generate print view HTML (for display in component)
 */
export function generateEndStageReportPrintView(
  report,
  productStatuses = [],
  riskReviews = [],
  issueReviews = [],
  followOnActions = [],
  approvals = [],
  distribution = []
) {
  return generatePrintHTML(report, productStatuses, riskReviews, issueReviews, followOnActions, approvals, distribution)
}
