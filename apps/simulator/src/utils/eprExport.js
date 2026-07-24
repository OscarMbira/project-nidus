/**
 * End Project Report Export Utilities
 * Provides export functionality for end project reports (PDF, Word, Print)
 */

/**
 * Generate print-ready HTML for end project report
 */
function generatePrintHTML(
  report,
  businessCaseReviews = [],
  objectivesReviews = [],
  teamPerformance = [],
  qualityRecords = [],
  approvalRecords = [],
  offSpecifications = [],
  lessons = [],
  followOnActions = [],
  qualityStatus = null
) {
  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatCurrency = (value) => {
    if (!value) return 'N/A'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  }

  let html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${report.report_title || 'End Project Report'} - ${report.document_ref || ''}</title>
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
          .badge {
            display: inline-block;
            padding: 2pt 6pt;
            border-radius: 3pt;
            font-size: 9pt;
            font-weight: bold;
          }
          .badge-success { background-color: #d4edda; color: #155724; }
          .badge-warning { background-color: #fff3cd; color: #856404; }
          .badge-danger { background-color: #f8d7da; color: #721c24; }
        </style>
      </head>
      <body>
        <h1>${report.report_title || 'End Project Report'}</h1>
        
        <div class="section">
          <p><strong>Document Reference:</strong> ${report.document_ref || 'N/A'}</p>
          <p><strong>Version:</strong> ${report.version_no || '1.0'}</p>
          <p><strong>Report Date:</strong> ${formatDate(report.report_date)}</p>
          <p><strong>Date of This Revision:</strong> ${formatDate(report.date_of_this_revision)}</p>
          ${report.author ? `<p><strong>Author:</strong> ${report.author.full_name || report.author.email}</p>` : ''}
          ${report.owner ? `<p><strong>Owner:</strong> ${report.owner.full_name || report.owner.email}</p>` : ''}
          ${report.client ? `<p><strong>Client:</strong> ${report.client.full_name || report.client.email}</p>` : ''}
          <p><strong>Closure Type:</strong> ${report.closure_type || 'normal'}</p>
          <p><strong>Status:</strong> ${report.approval_status || 'draft'}</p>
        </div>

        ${report.executive_summary ? `
          <div class="section">
            <h2>Executive Summary</h2>
            <p>${report.executive_summary.replace(/\n/g, '<br>')}</p>
          </div>
        ` : ''}

        ${report.project_managers_report ? `
          <div class="section">
            <h2>Project Manager's Report</h2>
            <p>${report.project_managers_report.replace(/\n/g, '<br>')}</p>
          </div>
        ` : ''}

        ${report.abnormal_situations ? `
          <div class="section">
            <h2>Abnormal Situations</h2>
            <p><strong>Description:</strong></p>
            <p>${report.abnormal_situations.replace(/\n/g, '<br>')}</p>
            ${report.abnormal_situations_impact ? `
              <p><strong>Impact:</strong></p>
              <p>${report.abnormal_situations_impact.replace(/\n/g, '<br>')}</p>
            ` : ''}
          </div>
        ` : ''}

        ${businessCaseReviews.length > 0 ? `
          <div class="section">
            <h2>Business Case Review</h2>
            <table>
              <thead>
                <tr>
                  <th>Benefit Description</th>
                  <th>Type</th>
                  <th>Target Value</th>
                  <th>Actual Value</th>
                  <th>Variance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${businessCaseReviews.map(b => `
                  <tr>
                    <td>${b.benefit_description || 'N/A'}</td>
                    <td>${b.benefit_type || 'N/A'}</td>
                    <td>${b.original_target_value ? formatCurrency(b.original_target_value) : 'N/A'}</td>
                    <td>${b.actual_value ? formatCurrency(b.actual_value) : 'N/A'}</td>
                    <td>${b.variance_percentage ? `${b.variance_percentage.toFixed(1)}%` : 'N/A'}</td>
                    <td>${b.is_post_project ? 'Post-Project' : 'Achieved'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${objectivesReviews.length > 0 ? `
          <div class="section">
            <h2>Objectives Performance Review</h2>
            <table>
              <thead>
                <tr>
                  <th>Objective Area</th>
                  <th>Target</th>
                  <th>Actual</th>
                  <th>Within Tolerance</th>
                  <th>Performance Rating</th>
                </tr>
              </thead>
              <tbody>
                ${objectivesReviews.map(o => `
                  <tr>
                    <td>${o.objective_area || 'N/A'}</td>
                    <td>${o.original_target || 'N/A'}</td>
                    <td>${o.actual_value || 'N/A'}</td>
                    <td>${o.within_tolerance ? 'Yes' : 'No'}</td>
                    <td>${o.performance_rating || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${teamPerformance.length > 0 ? `
          <div class="section">
            <h2>Team Performance & Recognition</h2>
            ${teamPerformance.map(t => `
              <div style="margin-bottom: 15pt; padding-bottom: 10pt; border-bottom: 1pt solid #ddd;">
                <h3>${t.team_name || 'Team Member'}</h3>
                <p><strong>Role:</strong> ${t.role || 'N/A'}</p>
                <p><strong>Type:</strong> ${t.performance_type || 'N/A'}</p>
                <p>${t.performance_description || ''}</p>
                ${t.achievements && t.achievements.length > 0 ? `
                  <p><strong>Achievements:</strong></p>
                  <ul>
                    ${t.achievements.map(a => `<li>${a}</li>`).join('')}
                  </ul>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${qualityRecords.length > 0 ? `
          <div class="section">
            <h2>Quality Records</h2>
            <table>
              <thead>
                <tr>
                  <th>Activity Name</th>
                  <th>Type</th>
                  <th>Product</th>
                  <th>Planned Date</th>
                  <th>Actual Date</th>
                  <th>Status</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                ${qualityRecords.map(q => `
                  <tr>
                    <td>${q.activity_name || 'N/A'}</td>
                    <td>${q.activity_type || 'N/A'}</td>
                    <td>${q.product_name || 'N/A'}</td>
                    <td>${formatDate(q.planned_date)}</td>
                    <td>${formatDate(q.actual_date)}</td>
                    <td>${q.status || 'N/A'}</td>
                    <td>${q.result || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${approvalRecords.length > 0 ? `
          <div class="section">
            <h2>Product Approval Records</h2>
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Approval Status</th>
                  <th>Approver</th>
                  <th>Approval Date</th>
                  <th>Conditions</th>
                </tr>
              </thead>
              <tbody>
                ${approvalRecords.map(a => `
                  <tr>
                    <td>${a.product_name || 'N/A'}</td>
                    <td>${a.approval_status || 'N/A'}</td>
                    <td>${a.approver_name || 'N/A'}</td>
                    <td>${formatDate(a.approval_date)}</td>
                    <td>${a.conditions || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${offSpecifications.length > 0 ? `
          <div class="section">
            <h2>Off-Specifications</h2>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Product</th>
                  <th>Deviation Description</th>
                  <th>Concession Granted</th>
                  <th>Impact Assessment</th>
                </tr>
              </thead>
              <tbody>
                ${offSpecifications.map(o => `
                  <tr>
                    <td>${o.off_spec_type || 'N/A'}</td>
                    <td>${o.product_name || 'N/A'}</td>
                    <td>${o.deviation_description || 'N/A'}</td>
                    <td>${o.concession_granted ? 'Yes' : 'No'}</td>
                    <td>${o.impact_assessment || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${lessons.length > 0 ? `
          <div class="section">
            <h2>Lessons Learned</h2>
            ${lessons.map(l => `
              <div style="margin-bottom: 15pt; padding-bottom: 10pt; border-bottom: 1pt solid #ddd;">
                <h3>${l.title || 'Lesson'}</h3>
                <p><strong>Type:</strong> ${l.lesson_type || 'N/A'} | <strong>Category:</strong> ${l.category || 'N/A'} | <strong>Impact:</strong> ${l.impact || 'N/A'}</p>
                <p>${l.description || ''}</p>
                ${l.recommendation ? `<p><strong>Recommendation:</strong> ${l.recommendation}</p>` : ''}
                ${l.is_escalated_corporate ? `<p class="badge badge-success">Escalated to Corporate</p>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${followOnActions.length > 0 ? `
          <div class="section">
            <h2>Follow-On Actions</h2>
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Source Reference</th>
                  <th>Documentation Attached</th>
                  <th>Board Advice Requested</th>
                  <th>Recommended Recipient</th>
                </tr>
              </thead>
              <tbody>
                ${followOnActions.map(f => `
                  <tr>
                    <td>${f.source_type || 'N/A'}</td>
                    <td>${f.source_reference || 'N/A'}</td>
                    <td>${f.documentation_attached ? 'Yes' : 'No'}</td>
                    <td>${f.project_board_advice_requested ? 'Yes' : 'No'}</td>
                    <td>${f.recommended_recipient || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${qualityStatus ? `
          <div class="section">
            <h2>Quality Criteria Validation</h2>
            <p>
              <strong>Completion:</strong> ${qualityStatus.completion_percentage?.toFixed(0) || 0}% | 
              <strong> Passed:</strong> ${qualityStatus.passed || 0} | 
              <strong> Failed:</strong> ${qualityStatus.failed || 0} | 
              <strong> Needs Review:</strong> ${qualityStatus.needs_review || 0}
            </p>
            ${qualityStatus.can_close_project 
              ? '<p class="badge badge-success">✓ Project Can Be Closed</p>'
              : '<p class="badge badge-danger">✗ Cannot Close Project - Blocking Issues Present</p>'
            }
            ${qualityStatus.blocking_issues && qualityStatus.blocking_issues.length > 0 ? `
              <p><strong>Blocking Issues:</strong></p>
              <ul>
                ${qualityStatus.blocking_issues.map(issue => `<li>${issue}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        ` : ''}

        ${report.project_assurance_agreement !== null ? `
          <div class="section">
            <h2>Project Assurance Agreement</h2>
            <p><strong>Agreement:</strong> ${report.project_assurance_agreement ? 'Yes' : 'No'}</p>
            ${report.project_assurance_notes ? `
              <p><strong>Notes:</strong></p>
              <p>${report.project_assurance_notes.replace(/\n/g, '<br>')}</p>
            ` : ''}
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
 * Export end project report as PDF (using browser print)
 */
export function exportEndProjectReportToPDF(
  report,
  businessCaseReviews = [],
  objectivesReviews = [],
  teamPerformance = [],
  qualityRecords = [],
  approvalRecords = [],
  offSpecifications = [],
  lessons = [],
  followOnActions = [],
  qualityStatus = null
) {
  const html = generatePrintHTML(
    report,
    businessCaseReviews,
    objectivesReviews,
    teamPerformance,
    qualityRecords,
    approvalRecords,
    offSpecifications,
    lessons,
    followOnActions,
    qualityStatus
  )
  const printWindow = window.open('', '_blank')
  
  if (!printWindow) {
    alert('Please allow pop-ups to export PDF')
    return
  }

  printWindow.document.write(html)
  printWindow.document.close()
  
  // Wait for content to load, then print
  setTimeout(() => {
    printWindow.print()
  }, 250)
}

/**
 * Export end project report as Word document (using HTML format)
 */
export function exportEndProjectReportToWord(
  report,
  businessCaseReviews = [],
  objectivesReviews = [],
  teamPerformance = [],
  qualityRecords = [],
  approvalRecords = [],
  offSpecifications = [],
  lessons = [],
  followOnActions = [],
  qualityStatus = null
) {
  const html = generatePrintHTML(
    report,
    businessCaseReviews,
    objectivesReviews,
    teamPerformance,
    qualityRecords,
    approvalRecords,
    offSpecifications,
    lessons,
    followOnActions,
    qualityStatus
  )
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${report.document_ref || 'end_project_report'}_${new Date().toISOString().split('T')[0]}.doc`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generate print view HTML (for display in component)
 */
export function generateEndProjectReportPrintView(
  report,
  businessCaseReviews = [],
  objectivesReviews = [],
  teamPerformance = [],
  qualityRecords = [],
  approvalRecords = [],
  offSpecifications = [],
  lessons = [],
  followOnActions = [],
  qualityStatus = null
) {
  return generatePrintHTML(
    report,
    businessCaseReviews,
    objectivesReviews,
    teamPerformance,
    qualityRecords,
    approvalRecords,
    offSpecifications,
    lessons,
    followOnActions,
    qualityStatus
  )
}
