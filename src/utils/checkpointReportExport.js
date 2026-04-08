/**
 * Checkpoint Report Export Utilities
 * Provides export functionality for checkpoint reports (PDF, Word, Print)
 */

/**
 * Generate print-ready HTML for checkpoint report
 */
function generatePrintHTML(report, products = [], qualityActivities = [], followUps = [], lessons = [], qualityStatus = null) {
  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  let html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${report.report_title || 'Checkpoint Report'} - ${report.document_ref || ''}</title>
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
        <h1>${report.report_title || 'Checkpoint Report'}</h1>
        
        <div class="section">
          <p><strong>Document Reference:</strong> ${report.document_ref || 'N/A'}</p>
          <p><strong>Version:</strong> ${report.version_no || '1.0'}</p>
          <p><strong>Checkpoint Date:</strong> ${formatDate(report.checkpoint_date)}</p>
          ${report.period_start_date && report.period_end_date ? `
            <p><strong>Reporting Period:</strong> ${formatDate(report.period_start_date)} - ${formatDate(report.period_end_date)}</p>
          ` : ''}
          ${report.author ? `<p><strong>Author:</strong> ${report.author.full_name || report.author.email}</p>` : ''}
          ${report.owner ? `<p><strong>Owner:</strong> ${report.owner.full_name || report.owner.email}</p>` : ''}
          <p><strong>Status:</strong> ${report.status || 'draft'}</p>
        </div>

        ${report.report_summary ? `
          <div class="section">
            <h2>Report Summary</h2>
            <p>${report.report_summary.replace(/\n/g, '<br>')}</p>
          </div>
        ` : ''}

        ${report.progress_summary ? `
          <div class="section">
            <h2>Progress Summary</h2>
            <p>${report.progress_summary.replace(/\n/g, '<br>')}</p>
          </div>
        ` : ''}

        ${products.length > 0 ? `
          <div class="section">
            <h2>Products & Deliverables</h2>
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Status</th>
                  <th>Quality Status</th>
                </tr>
              </thead>
              <tbody>
                ${products.map(p => `
                  <tr>
                    <td>${p.product_name}</td>
                    <td>${p.product_status.replace('_', ' ')}</td>
                    <td>${p.quality_status?.replace('_', ' ') || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${qualityActivities.length > 0 ? `
          <div class="section">
            <h2>Quality Activities</h2>
            <table>
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${qualityActivities.map(a => `
                  <tr>
                    <td>${a.activity_name}</td>
                    <td>${a.activity_type}</td>
                    <td>${a.status.replace('_', ' ')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${followUps.length > 0 ? `
          <div class="section">
            <h2>Follow-Up Items</h2>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Status</th>
                  <th>Resolution</th>
                </tr>
              </thead>
              <tbody>
                ${followUps.map(f => `
                  <tr>
                    <td>${f.follow_up_item}</td>
                    <td>${f.status.replace('_', ' ')}</td>
                    <td>${f.resolution || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${lessons.length > 0 ? `
          <div class="section">
            <h2>Lessons Identified</h2>
            ${lessons.map(l => `
              <div style="margin-bottom: 15pt; padding-bottom: 10pt; border-bottom: 1pt solid #ddd;">
                <h3>${l.lesson_title}</h3>
                <p>${l.lesson_description.replace(/\n/g, '<br>')}</p>
                ${l.recommendation ? `<p><strong>Recommendation:</strong> ${l.recommendation}</p>` : ''}
                <p style="font-size: 9pt; color: #666;">
                  Type: ${l.lesson_type} | Category: ${l.category} | Impact: ${l.impact}
                </p>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${(report.tolerance_time_status || report.tolerance_cost_status || report.tolerance_scope_status) ? `
          <div class="section">
            <h2>Tolerance Status</h2>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Actual</th>
                  <th>Forecast</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Time</td>
                  <td>${report.time_actual || 0} days</td>
                  <td>${report.time_forecast || 0} days</td>
                  <td>${report.tolerance_time_status || 'within'}</td>
                </tr>
                <tr>
                  <td>Cost</td>
                  <td>$${(report.cost_actual || 0).toLocaleString()}</td>
                  <td>$${(report.cost_forecast || 0).toLocaleString()}</td>
                  <td>${report.tolerance_cost_status || 'within'}</td>
                </tr>
                <tr>
                  <td>Scope</td>
                  <td>${(report.scope_actual_percentage || 0).toFixed(1)}%</td>
                  <td>${(report.scope_forecast_percentage || 0).toFixed(1)}%</td>
                  <td>${report.tolerance_scope_status || 'within'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ` : ''}

        ${report.issues_summary || report.risks_summary ? `
          <div class="section">
            <h2>Issues & Risks</h2>
            ${report.issues_summary ? `
              <h3>Issues Summary</h3>
              <p>${report.issues_summary.replace(/\n/g, '<br>')}</p>
            ` : ''}
            ${report.risks_summary ? `
              <h3>Risks Summary</h3>
              <p>${report.risks_summary.replace(/\n/g, '<br>')}</p>
            ` : ''}
          </div>
        ` : ''}

        ${qualityStatus ? `
          <div class="section">
            <h2>Quality Check Status</h2>
            <p>
              <strong>Completion:</strong> ${qualityStatus.completion_percentage?.toFixed(0) || 0}% | 
              <strong> Passed:</strong> ${qualityStatus.passed || 0} | 
              <strong> Failed:</strong> ${qualityStatus.failed || 0} | 
              <strong> Needs Review:</strong> ${qualityStatus.needs_review || 0}
            </p>
            ${qualityStatus.can_submit 
              ? '<p style="color: green; font-weight: bold;">✓ Ready to Submit</p>'
              : '<p style="color: red; font-weight: bold;">✗ Cannot Submit - Blocking Issues Present</p>'
            }
          </div>
        ` : ''}

        <div class="footer">
          <p>Generated: ${new Date().toLocaleString()}</p>
          ${report.work_package ? `<p>Work Package: ${report.work_package.work_package_name}</p>` : ''}
        </div>
      </body>
    </html>
  `
  return html
}

/**
 * Export checkpoint report as PDF (using browser print)
 */
export function exportCheckpointReportToPDF(report, products = [], qualityActivities = [], followUps = [], lessons = [], qualityStatus = null) {
  const html = generatePrintHTML(report, products, qualityActivities, followUps, lessons, qualityStatus)
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
 * Export checkpoint report as Word document (using HTML format)
 */
export function exportCheckpointReportToWord(report, products = [], qualityActivities = [], followUps = [], lessons = [], qualityStatus = null) {
  const html = generatePrintHTML(report, products, qualityActivities, followUps, lessons, qualityStatus)
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${report.document_ref || 'checkpoint_report'}_${new Date().toISOString().split('T')[0]}.doc`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
