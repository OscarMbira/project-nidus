/**
 * Brief Word Export Service
 * Exports Project Brief to Word document format
 * Uses browser-based approach (can be enhanced with docx library)
 */

export async function exportBriefToWord(brief, project, mandate) {
  try {
    // Generate HTML content
    const htmlContent = generateWordHTML(brief, project, mandate)
    
    // Create blob
    const blob = new Blob([htmlContent], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    
    // Create download link
    const link = document.createElement('a')
    link.href = url
    link.download = `${brief.brief_reference || 'ProjectBrief'}_${new Date().toISOString().split('T')[0]}.doc`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    return { success: true }
  } catch (error) {
    console.error('Error exporting to Word:', error)
    throw error
  }
}

function generateWordHTML(brief, project, mandate) {
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

  return `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>Project Brief - ${brief.brief_reference || 'Draft'}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>90</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page {
    size: 8.5in 11in;
    margin: 1in;
  }
  body {
    font-family: 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.6;
    color: #000;
    margin: 0;
    padding: 0;
  }
  h1 {
    font-size: 24pt;
    font-weight: bold;
    margin-top: 24pt;
    margin-bottom: 12pt;
    color: #1f2937;
    page-break-after: avoid;
  }
  h2 {
    font-size: 18pt;
    font-weight: bold;
    margin-top: 18pt;
    margin-bottom: 9pt;
    color: #374151;
    border-bottom: 2pt solid #e5e7eb;
    padding-bottom: 6pt;
    page-break-after: avoid;
  }
  h3 {
    font-size: 14pt;
    font-weight: bold;
    margin-top: 14pt;
    margin-bottom: 7pt;
    color: #4b5563;
    page-break-after: avoid;
  }
  p {
    margin-bottom: 12pt;
    text-align: justify;
  }
  .header-info {
    margin-bottom: 24pt;
    padding-bottom: 12pt;
    border-bottom: 2pt solid #000;
  }
  .metadata {
    display: table;
    width: 100%;
    margin-bottom: 12pt;
  }
  .metadata-row {
    display: table-row;
  }
  .metadata-label {
    display: table-cell;
    font-weight: bold;
    width: 30%;
    padding-right: 12pt;
  }
  .metadata-value {
    display: table-cell;
  }
  .section {
    margin-bottom: 24pt;
    page-break-inside: avoid;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12pt 0;
  }
  th, td {
    border: 1pt solid #000;
    padding: 6pt;
    text-align: left;
  }
  th {
    background-color: #f3f4f6;
    font-weight: bold;
  }
  .footer {
    margin-top: 36pt;
    padding-top: 12pt;
    border-top: 1pt solid #000;
    font-size: 10pt;
    text-align: center;
    color: #6b7280;
  }
</style>
</head>
<body>
  <div class="header-info">
    <h1>PROJECT BRIEF</h1>
    <div class="metadata">
      <div class="metadata-row">
        <div class="metadata-label">Brief Reference:</div>
        <div class="metadata-value">${brief.brief_reference || 'N/A'}</div>
      </div>
      ${project ? `
      <div class="metadata-row">
        <div class="metadata-label">Project:</div>
        <div class="metadata-value">${project.project_name || 'N/A'} ${project.project_code ? `(${project.project_code})` : ''}</div>
      </div>
      ` : ''}
      <div class="metadata-row">
        <div class="metadata-label">Version:</div>
        <div class="metadata-value">${brief.version_number || '1.0'}</div>
      </div>
      <div class="metadata-row">
        <div class="metadata-label">Status:</div>
        <div class="metadata-value">${brief.document_status?.toUpperCase() || 'DRAFT'}</div>
      </div>
      <div class="metadata-row">
        <div class="metadata-label">Created:</div>
        <div class="metadata-value">${formatDate(brief.created_date)}</div>
      </div>
      ${brief.approved_date ? `
      <div class="metadata-row">
        <div class="metadata-label">Approved:</div>
        <div class="metadata-value">${formatDate(brief.approved_date)}</div>
      </div>
      ` : ''}
    </div>
  </div>

  ${brief.background ? `
  <div class="section">
    <h2>3. Project Definition</h2>
    <h3>Background</h3>
    <p>${escapeHtml(brief.background)}</p>
  </div>
  ` : ''}

  ${brief.project_objectives ? `
  <div class="section">
    <h3>Project Objectives</h3>
    <p>${escapeHtml(brief.project_objectives)}</p>
  </div>
  ` : ''}

  ${brief.desired_outcomes ? `
  <div class="section">
    <h3>Desired Outcomes</h3>
    <p>${escapeHtml(brief.desired_outcomes)}</p>
  </div>
  ` : ''}

  ${brief.project_scope || brief.scope_exclusions || brief.constraints || brief.assumptions ? `
  <div class="section">
    <h2>Project Scope</h2>
    ${brief.project_scope ? `
    <h3>In Scope</h3>
    <p>${escapeHtml(brief.project_scope)}</p>
    ` : ''}
    ${brief.scope_exclusions ? `
    <h3>Out of Scope</h3>
    <p>${escapeHtml(brief.scope_exclusions)}</p>
    ` : ''}
    ${brief.constraints ? `
    <h3>Constraints</h3>
    <p>${escapeHtml(brief.constraints)}</p>
    ` : ''}
    ${brief.assumptions ? `
    <h3>Assumptions</h3>
    <p>${escapeHtml(brief.assumptions)}</p>
    ` : ''}
  </div>
  ` : ''}

  ${brief.outline_business_case_summary ? `
  <div class="section">
    <h2>4. Outline Business Case</h2>
    <p>${escapeHtml(brief.outline_business_case_summary)}</p>
    ${brief.business_option_selected ? `
    <p><strong>Business Option Selected:</strong> ${brief.business_option_selected.replace('_', ' ')}</p>
    ` : ''}
  </div>
  ` : ''}

  ${brief.product_description ? `
  <div class="section">
    <h2>5. Project Product Description</h2>
    <p>${escapeHtml(brief.product_description)}</p>
    ${brief.customer_quality_expectations ? `
    <h3>Quality Expectations</h3>
    <p>${escapeHtml(brief.customer_quality_expectations)}</p>
    ` : ''}
  </div>
  ` : ''}

  ${brief.project_approach_description ? `
  <div class="section">
    <h2>6. Project Approach</h2>
    <p>${escapeHtml(brief.project_approach_description)}</p>
    <table>
      ${brief.solution_type ? `
      <tr>
        <th>Solution Type</th>
        <td>${brief.solution_type.replace('_', ' ')}</td>
      </tr>
      ` : ''}
      ${brief.delivery_approach ? `
      <tr>
        <th>Delivery Approach</th>
        <td>${brief.delivery_approach.replace('_', ' ')}</td>
      </tr>
      ` : ''}
      ${brief.development_approach ? `
      <tr>
        <th>Development Approach</th>
        <td>${brief.development_approach.replace('_', ' ')}</td>
      </tr>
      ` : ''}
    </table>
    ${brief.approach_justification ? `
    <h3>Justification</h3>
    <p>${escapeHtml(brief.approach_justification)}</p>
    ` : ''}
  </div>
  ` : ''}

  ${brief.team_structure_description ? `
  <div class="section">
    <h2>7. Team Structure</h2>
    <p>${escapeHtml(brief.team_structure_description)}</p>
  </div>
  ` : ''}

  <div class="section">
    <h2>Document Authorship</h2>
    <div class="metadata">
      <div class="metadata-row">
        <div class="metadata-label">Author:</div>
        <div class="metadata-value">${brief.author_name || brief.author?.full_name || 'N/A'}</div>
      </div>
      <div class="metadata-row">
        <div class="metadata-label">Owner:</div>
        <div class="metadata-value">${brief.owner_name || brief.owner?.full_name || 'N/A'}</div>
      </div>
      ${brief.client_name ? `
      <div class="metadata-row">
        <div class="metadata-label">Client:</div>
        <div class="metadata-value">${brief.client_name || brief.client?.full_name || 'N/A'}</div>
      </div>
      ` : ''}
    </div>
  </div>

  <div class="footer">
    <p>Generated on ${new Date().toLocaleString()}</p>
    <p>Project Brief Reference: ${brief.brief_reference || 'N/A'}</p>
  </div>
</body>
</html>`
}

function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML.replace(/\n/g, '<br>')
}
