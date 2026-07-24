/**
 * Issue Report Export Utilities
 * Handles PDF and Word document export functionality
 */

/**
 * Generate printable HTML content for Issue Report
 */
export function generatePrintHTML(report, options = [], approvals = [], distribution = []) {
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Issue Report: ${report.report_reference}</title>
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
    <h1>ISSUE REPORT</h1>
    <div class="header-info">
      <div>
        <strong>Reference:</strong> ${report.report_reference}<br>
        <strong>Version:</strong> ${report.version_no}<br>
        <strong>Date:</strong> ${formatDate(report.report_date)}
      </div>
      <div>
        <strong>Status:</strong> ${report.report_status.toUpperCase()}<br>
        <strong>Project:</strong> ${report.project_id || 'N/A'}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">1. Document Information</div>
    <div class="field">
      <div class="field-label">Author:</div>
      <div class="field-value">${report.author?.full_name || report.author_name || 'N/A'}</div>
    </div>
    ${report.prepared_by ? `
    <div class="field">
      <div class="field-label">Prepared By:</div>
      <div class="field-value">${report.prepared_by?.full_name || report.prepared_by_name || 'N/A'}</div>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">2. Issue Summary</div>
    <div class="field">
      <div class="field-label">Issue Identifier:</div>
      <div class="field-value">${report.issue_identifier || 'N/A'}</div>
    </div>
    <div class="field">
      <div class="field-label">Issue Type:</div>
      <div class="field-value">${report.issue_type || 'N/A'}</div>
    </div>
    <div class="field">
      <div class="field-label">Issue Title:</div>
      <div class="field-value">${report.issue_title || 'N/A'}</div>
    </div>
    <div class="field">
      <div class="field-label">Issue Description:</div>
      <div class="field-value">${(report.issue_description || 'N/A').replace(/\n/g, '<br>')}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">3. Impact Analysis</div>
    ${report.impact_time ? `
    <div class="field">
      <div class="field-label">Time Impact:</div>
      <div class="field-value">${report.impact_time.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}
    ${report.impact_cost ? `
    <div class="field">
      <div class="field-label">Cost Impact:</div>
      <div class="field-value">${report.impact_cost.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}
    ${report.impact_quality ? `
    <div class="field">
      <div class="field-label">Quality Impact:</div>
      <div class="field-value">${report.impact_quality.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}
    ${report.impact_scope ? `
    <div class="field">
      <div class="field-label">Scope Impact:</div>
      <div class="field-value">${report.impact_scope.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}
    ${report.impact_benefits ? `
    <div class="field">
      <div class="field-label">Benefits Impact:</div>
      <div class="field-value">${report.impact_benefits.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}
    ${report.impact_risk ? `
    <div class="field">
      <div class="field-label">Risk Impact:</div>
      <div class="field-value">${report.impact_risk.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}
    ${(report.affects_stage_tolerances || report.affects_project_tolerances) && report.tolerance_impact_details ? `
    <div class="field">
      <div class="field-label">Tolerance Impact:</div>
      <div class="field-value">
        ${report.affects_stage_tolerances ? 'Affects Stage Tolerances<br>' : ''}
        ${report.affects_project_tolerances ? 'Affects Project Tolerances<br>' : ''}
        ${report.tolerance_impact_details.replace(/\n/g, '<br>')}
      </div>
    </div>
    ` : ''}
  </div>

  ${options.length > 0 ? `
  <div class="section">
    <div class="section-title">4. Options Analysis</div>
    ${options.map((option, index) => `
    <div style="margin-bottom: 20px; border: 1px solid #000; padding: 10px;">
      <strong>Option ${option.option_number}: ${option.option_title} ${option.is_recommended ? '(RECOMMENDED)' : ''}</strong>
      ${option.option_description ? `<p>${option.option_description.replace(/\n/g, '<br>')}</p>` : ''}
      ${option.pros ? `<p><strong>Advantages:</strong> ${option.pros.replace(/\n/g, '<br>')}</p>` : ''}
      ${option.cons ? `<p><strong>Disadvantages:</strong> ${option.cons.replace(/\n/g, '<br>')}</p>` : ''}
    </div>
    `).join('')}
    ${report.recommendation ? `
    <div class="field">
      <div class="field-label">Recommendation:</div>
      <div class="field-value">${report.recommendation.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}
    ${report.recommendation_rationale ? `
    <div class="field">
      <div class="field-label">Recommendation Rationale:</div>
      <div class="field-value">${report.recommendation_rationale.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}
  </div>
  ` : ''}

  ${report.decision_required || report.decision_made ? `
  <div class="section">
    <div class="section-title">5. Decision</div>
    ${report.decision_required ? `
    <div class="field">
      <div class="field-label">Decision Required:</div>
      <div class="field-value">Yes - ${report.decision_by || 'N/A'}</div>
    </div>
    ` : ''}
    ${report.decision_made ? `
    <div class="field">
      <div class="field-label">Decision Made:</div>
      <div class="field-value">${report.decision_made.replace(/\n/g, '<br>')}</div>
    </div>
    <div class="field">
      <div class="field-label">Decision Date:</div>
      <div class="field-value">${formatDate(report.decision_date)}</div>
    </div>
    <div class="field">
      <div class="field-label">Decision Made By:</div>
      <div class="field-value">${report.decision_made_by?.full_name || report.decision_made_by_name || 'N/A'}</div>
    </div>
    ${report.decision_conditions ? `
    <div class="field">
      <div class="field-label">Decision Conditions:</div>
      <div class="field-value">${report.decision_conditions.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}
    ` : ''}
  </div>
  ` : ''}

  ${report.report_status === 'closed' ? `
  <div class="section">
    <div class="section-title">6. Closure</div>
    <div class="field">
      <div class="field-label">Closure Date:</div>
      <div class="field-value">${formatDate(report.closure_date)}</div>
    </div>
    <div class="field">
      <div class="field-label">Closure Outcome:</div>
      <div class="field-value">${(report.closure_outcome || 'N/A').replace(/\n/g, '<br>')}</div>
    </div>
    ${report.lessons_captured && report.lessons_summary ? `
    <div class="field">
      <div class="field-label">Lessons Learned:</div>
      <div class="field-value">${report.lessons_summary.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}
  </div>
  ` : ''}

  ${approvals.length > 0 ? `
  <div class="section">
    <div class="section-title">Approval History</div>
    <table>
      <thead>
        <tr>
          <th>Approver</th>
          <th>Role</th>
          <th>Status</th>
          <th>Date</th>
          <th>Comments</th>
        </tr>
      </thead>
      <tbody>
        ${approvals.map(approval => `
        <tr>
          <td>${approval.approver_name || approval.approver?.full_name || 'N/A'}</td>
          <td>${approval.approver_role || 'N/A'}</td>
          <td>${approval.approval_status}</td>
          <td>${formatDate(approval.approval_date)}</td>
          <td>${approval.approval_comments || ''}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="footer">
    <p>Issue Report: ${report.report_reference} | Version ${report.version_no} | Generated ${formatDate(new Date())}</p>
  </div>
</body>
</html>
  `;
}

/**
 * Export report as PDF (using browser print)
 */
export function exportToPDF(report, options = [], approvals = [], distribution = []) {
  const html = generatePrintHTML(report, options, approvals, distribution);
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Please allow pop-ups to export PDF');
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for content to load, then print
  setTimeout(() => {
    printWindow.print();
    // Optionally close after printing
    // printWindow.close();
  }, 250);
}

/**
 * Export report as Word document (using HTML format)
 */
export function exportToWord(report, options = [], approvals = [], distribution = []) {
  const html = generatePrintHTML(report, options, approvals, distribution);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = `${report.report_reference}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy report to clipboard as formatted text
 */
export function copyToClipboard(report, options = []) {
  let text = `ISSUE REPORT: ${report.report_reference}\n`;
  text += `Version: ${report.version_no}\n`;
  text += `Date: ${new Date(report.report_date).toLocaleDateString()}\n\n`;
  text += `Issue: ${report.issue_title}\n`;
  text += `Description: ${report.issue_description}\n\n`;
  
  if (report.recommendation) {
    text += `Recommendation: ${report.recommendation}\n\n`;
  }
  
  if (options.length > 0) {
    text += `Options:\n`;
    options.forEach((opt, idx) => {
      text += `${idx + 1}. ${opt.option_title}${opt.is_recommended ? ' (RECOMMENDED)' : ''}\n`;
    });
  }

  navigator.clipboard.writeText(text).then(() => {
    alert('Report copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy:', err);
    alert('Failed to copy to clipboard');
  });
}

export default {
  generatePrintHTML,
  exportToPDF,
  exportToWord,
  copyToClipboard
};
