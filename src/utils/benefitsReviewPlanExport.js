/**
 * Benefits Review Plan Export Utilities
 * Provides export functionality for Benefits Review Plans (PDF, Print)
 */

/**
 * Export Benefits Review Plan to PDF matching template structure
 * @param {Object} plan - Benefits Review Plan data
 * @param {Array} coverage - Benefits coverage data
 * @param {Array} resources - Resources data
 * @param {Array} reviews - Review schedule data
 * @param {Array} disBenefits - Dis-benefits data
 * @param {Array} revisions - Revision history
 * @param {Array} approvals - Approvals data
 * @param {Array} distribution - Distribution list
 * @param {string} filename - Output filename
 */
export async function exportBenefitsReviewPlanToPDF(
  plan,
  coverage = [],
  resources = [],
  reviews = [],
  disBenefits = [],
  revisions = [],
  approvals = [],
  distribution = [],
  filename = null
) {
  try {
    // Dynamic import to reduce bundle size
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ]);

    // Create temporary container matching PDF template
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '210mm'; // A4 width
    container.style.padding = '20mm';
    container.style.backgroundColor = 'white';
    container.style.color = 'black';
    container.style.fontFamily = 'Arial, sans-serif';
    container.className = 'benefits-review-plan-export-pdf';

    // Build HTML content matching PDF template
    let html = generateBenefitsReviewPlanPDFHTML(plan, coverage, resources, reviews, disBenefits, revisions, approvals, distribution);
    
    container.innerHTML = html;
    document.body.appendChild(container);

    // Convert to canvas then PDF
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Cleanup
    document.body.removeChild(container);

    // Save PDF
    const defaultFilename = `Benefits-Review-Plan-${plan.document_ref || plan.id}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename || defaultFilename);
  } catch (error) {
    console.error('Error exporting Benefits Review Plan to PDF:', error);
    throw new Error('Error exporting PDF: ' + error.message);
  }
}

/**
 * Generate HTML for PDF export matching template structure
 */
function generateBenefitsReviewPlanPDFHTML(plan, coverage, resources, reviews, disBenefits, revisions, approvals, distribution) {
  const formatDate = (date) => {
    if (!date) return '_________';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  let html = `
    <div style="color: black; font-family: Arial, sans-serif;">
      <!-- Header -->
      <div style="border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
        <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">BENEFITS REVIEW PLAN</div>
        <div style="font-size: 14px; color: #666;">${plan.document_ref ? `Document Ref: ${plan.document_ref}` : ''} | Version: ${plan.version_number || '1.0'}</div>
      </div>

      <!-- Document Metadata -->
      <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
        <tr>
          <td style="padding: 5px; font-weight: bold; width: 30%;">Project:</td>
          <td style="padding: 5px;">${plan.project?.project_name || plan.project?.project_code || 'N/A'}</td>
          <td style="padding: 5px; font-weight: bold; width: 30%;">Release:</td>
          <td style="padding: 5px;">${plan.release || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 5px; font-weight: bold;">Date:</td>
          <td style="padding: 5px;">${formatDate(plan.plan_date)}</td>
          <td style="padding: 5px; font-weight: bold;">Author:</td>
          <td style="padding: 5px;">${plan.author?.full_name || plan.author?.email || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 5px; font-weight: bold;">Owner:</td>
          <td style="padding: 5px;">${plan.owner?.full_name || plan.owner?.email || 'N/A'}</td>
          <td style="padding: 5px; font-weight: bold;">Client:</td>
          <td style="padding: 5px;">${plan.client || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 5px; font-weight: bold;">Document Ref:</td>
          <td style="padding: 5px;">${plan.document_ref || 'N/A'}</td>
          <td style="padding: 5px; font-weight: bold;">Version No:</td>
          <td style="padding: 5px;">${plan.version_number || '1.0'}</td>
        </tr>
      </table>

      <!-- 1. Benefits Review Plan History -->
      ${revisions.length > 0 || approvals.length > 0 || distribution.length > 0 ? `
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 5px;">
          1. Benefits Review Plan History
        </h2>

        ${revisions.length > 0 ? `
        <div style="margin-bottom: 15px;">
          <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">1.2 Revision History</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 11px;">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 5px; text-align: left;">Revision</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: left;">Date</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: left;">Revised By</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: left;">Summary of Changes</th>
              </tr>
            </thead>
            <tbody>
              ${revisions.map(r => `
                <tr>
                  <td style="border: 1px solid #000; padding: 5px;">${r.revision_number}</td>
                  <td style="border: 1px solid #000; padding: 5px;">${formatDate(r.revision_date)}</td>
                  <td style="border: 1px solid #000; padding: 5px;">${r.revised_by?.full_name || r.revised_by?.email || 'N/A'}</td>
                  <td style="border: 1px solid #000; padding: 5px;">${r.summary_of_changes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${approvals.length > 0 ? `
        <div style="margin-bottom: 15px;">
          <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">1.3 Approvals</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 11px;">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 5px; text-align: left;">Approver</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: center;">Status</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: left;">Version</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: left;">Date</th>
              </tr>
            </thead>
            <tbody>
              ${approvals.map(a => `
                <tr>
                  <td style="border: 1px solid #000; padding: 5px;">${a.approver?.full_name || a.approver_name || 'N/A'}</td>
                  <td style="border: 1px solid #000; padding: 5px; text-align: center;">${a.approval_status}</td>
                  <td style="border: 1px solid #000; padding: 5px;">${a.version_approved || '-'}</td>
                  <td style="border: 1px solid #000; padding: 5px;">${formatDate(a.approval_date)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${distribution.length > 0 ? `
        <div style="margin-bottom: 15px;">
          <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">1.4 Distribution</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 11px;">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 5px; text-align: left;">Recipient</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: left;">Method</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: left;">Version</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: center;">Acknowledged</th>
              </tr>
            </thead>
            <tbody>
              ${distribution.map(d => `
                <tr>
                  <td style="border: 1px solid #000; padding: 5px;">${d.recipient?.full_name || d.recipient_name || d.recipient_email || 'N/A'}</td>
                  <td style="border: 1px solid #000; padding: 5px; text-transform: capitalize;">${d.distribution_method || '-'}</td>
                  <td style="border: 1px solid #000; padding: 5px;">${d.version_issued || '-'}</td>
                  <td style="border: 1px solid #000; padding: 5px; text-align: center;">${d.acknowledged ? 'Yes' : 'No'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
      </div>
      ` : ''}

      <!-- 3. Scope -->
      ${plan.scope_description ? `
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px;">
          3. Scope
        </h2>
        <p style="text-align: justify; line-height: 1.6; margin-bottom: 10px;">${plan.scope_description.replace(/\n/g, '<br>')}</p>
        ${plan.benefits_coverage_notes ? `
        <div style="margin-top: 10px; padding: 10px; background-color: #f0f0f0;">
          <strong>Benefits Coverage Notes:</strong><br>
          ${plan.benefits_coverage_notes.replace(/\n/g, '<br>')}
        </div>
        ` : ''}
      </div>
      ` : ''}

      <!-- 4. Accountability -->
      ${plan.accountability_description ? `
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px;">
          4. Accountability
        </h2>
        <p style="text-align: justify; line-height: 1.6;">${plan.accountability_description.replace(/\n/g, '<br>')}</p>
      </div>
      ` : ''}

      <!-- 5. Benefits Measurement -->
      ${plan.measurement_approach ? `
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px;">
          5. Benefits Measurement
        </h2>
        <p style="text-align: justify; line-height: 1.6; margin-bottom: 10px;">${plan.measurement_approach.replace(/\n/g, '<br>')}</p>
        ${plan.measurement_timing_rationale ? `
        <div style="margin-top: 10px; padding: 10px; background-color: #f0f0f0;">
          <strong>Timing Rationale:</strong><br>
          ${plan.measurement_timing_rationale.replace(/\n/g, '<br>')}
        </div>
        ` : ''}
      </div>
      ` : ''}

      <!-- 6. Resources -->
      ${plan.resources_description || resources.length > 0 ? `
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px;">
          6. Resources
        </h2>
        ${plan.resources_description ? `
        <p style="text-align: justify; line-height: 1.6; margin-bottom: 10px;">${plan.resources_description.replace(/\n/g, '<br>')}</p>
        ` : ''}
        ${resources.length > 0 ? `
        <div style="margin-top: 15px;">
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 11px;">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 5px; text-align: left;">Resource</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: left;">Type</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: right;">Effort (hrs)</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: right;">Cost</th>
              </tr>
            </thead>
            <tbody>
              ${resources.map(r => `
                <tr>
                  <td style="border: 1px solid #000; padding: 5px;">${r.resource_name}</td>
                  <td style="border: 1px solid #000; padding: 5px; text-transform: capitalize;">${r.resource_type}</td>
                  <td style="border: 1px solid #000; padding: 5px; text-align: right;">${r.estimated_effort_hours || '-'}</td>
                  <td style="border: 1px solid #000; padding: 5px; text-align: right;">${r.estimated_cost ? `${r.cost_currency} ${parseFloat(r.estimated_cost).toLocaleString()}` : '-'}</td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold;">
                <td style="border: 1px solid #000; padding: 5px;" colspan="2">Total</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">
                  ${resources.reduce((sum, r) => sum + (parseFloat(r.estimated_effort_hours) || 0), 0).toFixed(1)} hrs
                </td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">
                  ${plan.review_cost_currency || 'USD'} ${resources.reduce((sum, r) => sum + (parseFloat(r.estimated_cost) || 0), 0).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : ''}
      </div>
      ` : ''}

      <!-- 7. Baseline Measures -->
      ${plan.baseline_measures_description ? `
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px;">
          7. Baseline Measures
        </h2>
        <p style="text-align: justify; line-height: 1.6; margin-bottom: 10px;">${plan.baseline_measures_description.replace(/\n/g, '<br>')}</p>
        <div style="margin-top: 10px; font-size: 12px;">
          <strong>Recording Date:</strong> ${formatDate(plan.baseline_recording_date)}<br>
          <strong>Source:</strong> ${plan.baseline_source || 'N/A'}
        </div>
      </div>
      ` : ''}

      <!-- 8. Performance Review -->
      ${plan.performance_review_approach ? `
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px;">
          8. Performance Review
        </h2>
        <p style="text-align: justify; line-height: 1.6; margin-bottom: 10px;">${plan.performance_review_approach.replace(/\n/g, '<br>')}</p>
        <div style="margin-top: 10px; font-size: 12px;">
          <strong>Frequency:</strong> ${plan.performance_review_frequency ? plan.performance_review_frequency.replace(/_/g, ' ') : 'N/A'}
        </div>
        ${plan.performance_review_criteria ? `
        <div style="margin-top: 10px; padding: 10px; background-color: #f0f0f0;">
          <strong>Review Criteria:</strong><br>
          ${plan.performance_review_criteria.replace(/\n/g, '<br>')}
        </div>
        ` : ''}
      </div>
      ` : ''}

      <!-- Benefits Coverage Summary -->
      ${coverage.length > 0 ? `
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px;">
          Benefits Coverage Summary
        </h2>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 11px;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th style="border: 1px solid #000; padding: 5px; text-align: left;">Benefit</th>
              <th style="border: 1px solid #000; padding: 5px; text-align: left;">Frequency</th>
              <th style="border: 1px solid #000; padding: 5px; text-align: left;">Accountable</th>
              <th style="border: 1px solid #000; padding: 5px; text-align: left;">Next Review</th>
            </tr>
          </thead>
          <tbody>
            ${coverage.map(c => `
              <tr>
                <td style="border: 1px solid #000; padding: 5px;">${c.benefit?.benefit_code || ''} - ${c.benefit?.benefit_name || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 5px; text-transform: capitalize;">${c.measurement_frequency || 'Not set'}</td>
                <td style="border: 1px solid #000; padding: 5px;">${c.accountable?.full_name || c.accountable?.email || 'Not assigned'}</td>
                <td style="border: 1px solid #000; padding: 5px;">${formatDate(c.next_review_date)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- Dis-benefits -->
      ${plan.dis_benefits_included && disBenefits.length > 0 ? `
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px;">
          Dis-benefits
        </h2>
        ${plan.dis_benefits_description ? `
        <p style="text-align: justify; line-height: 1.6; margin-bottom: 10px;">${plan.dis_benefits_description.replace(/\n/g, '<br>')}</p>
        ` : ''}
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 11px;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th style="border: 1px solid #000; padding: 5px; text-align: left;">Code</th>
              <th style="border: 1px solid #000; padding: 5px; text-align: left;">Dis-benefit</th>
              <th style="border: 1px solid #000; padding: 5px; text-align: center;">Severity</th>
              <th style="border: 1px solid #000; padding: 5px; text-align: center;">Mitigation Status</th>
            </tr>
          </thead>
          <tbody>
            ${disBenefits.map(d => `
              <tr>
                <td style="border: 1px solid #000; padding: 5px;">${d.dis_benefit_code}</td>
                <td style="border: 1px solid #000; padding: 5px;">${d.dis_benefit_name}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${d.impact_severity}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center; text-transform: capitalize;">${d.mitigation_status.replace(/_/g, ' ')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- Footer -->
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 9px; color: #666; text-align: center;">
        Generated on ${new Date().toLocaleString()}
      </div>
    </div>
  `;

  return html;
}

/**
 * Generate printable HTML for Benefits Review Plan
 */
export function generateBenefitsReviewPlanPrintableHTML(plan, coverage, resources, reviews, disBenefits, revisions, approvals, distribution) {
  return generateBenefitsReviewPlanPDFHTML(plan, coverage, resources, reviews, disBenefits, revisions, approvals, distribution);
}

/**
 * Print Benefits Review Plan
 */
export function printBenefitsReviewPlan(plan, coverage, resources, reviews, disBenefits, revisions, approvals, distribution) {
  try {
    const printWindow = window.open('', '_blank');
    const html = generateBenefitsReviewPlanPrintableHTML(plan, coverage, resources, reviews, disBenefits, revisions, approvals, distribution);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Benefits Review Plan - ${plan.document_ref || plan.id}</title>
          <style>
            @media print {
              @page { margin: 1cm; }
              body { font-family: Arial, sans-serif; }
            }
            body {
              font-family: Arial, sans-serif;
              color: black;
              background: white;
            }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  } catch (error) {
    console.error('Error printing Benefits Review Plan:', error);
    throw new Error('Error printing: ' + error.message);
  }
}
