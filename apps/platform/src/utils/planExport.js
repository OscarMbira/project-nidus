/**
 * Plan Export Utilities
 * Export plans to PDF, Word, CSV formats
 */

/**
 * Export Project Plan to PDF
 * @param {Object} plan - Project Plan data
 * @returns {Promise<Blob>} PDF blob
 */
export async function exportProjectPlanToPDF(plan) {
  // This would integrate with a PDF library like jsPDF or pdfkit
  // For now, return a placeholder
  console.log('Exporting Project Plan to PDF:', plan)
  
  // TODO: Implement PDF generation
  // Example structure:
  // 1. Create PDF document
  // 2. Add header with plan reference
  // 3. Add all sections (Overview, Approach, Schedule, Budget, Resources, Risks, Quality)
  // 4. Add milestones table
  // 5. Add resources table
  // 6. Add approval signatures
  // 7. Return PDF blob
  
  return null
}

/**
 * Export Stage Plan to PDF
 * @param {Object} plan - Stage Plan data
 * @returns {Promise<Blob>} PDF blob
 */
export async function exportStagePlanToPDF(plan) {
  console.log('Exporting Stage Plan to PDF:', plan)
  
  // TODO: Implement PDF generation
  return null
}

/**
 * Export Plan to Word Document
 * @param {Object} plan - Plan data (Project or Stage)
 * @param {string} planType - 'project_plan' or 'stage_plan'
 * @returns {Promise<Blob>} Word document blob
 */
export async function exportPlanToWord(plan, planType) {
  console.log('Exporting Plan to Word:', plan, planType)
  
  // TODO: Implement Word document generation using docx library
  return null
}

/**
 * Export Plan Summary to CSV
 * @param {Object} plan - Plan data
 * @param {Array} milestones - Milestones array
 * @param {Array} resources - Resources array
 * @returns {string} CSV string
 */
export function exportPlanSummaryToCSV(plan, milestones = [], resources = []) {
  const rows = []
  
  // Plan header
  rows.push(['Plan Reference', plan.plan_reference || ''])
  rows.push(['Plan Title', plan.plan_title || ''])
  rows.push(['Version', plan.version_number || ''])
  rows.push(['Status', plan.status || ''])
  rows.push(['Start Date', plan.planned_start_date || ''])
  rows.push(['End Date', plan.planned_end_date || ''])
  rows.push([])
  
  // Milestones
  if (milestones.length > 0) {
    rows.push(['Milestones'])
    rows.push(['Name', 'Date', 'Type', 'Critical'])
    milestones.forEach(m => {
      rows.push([
        m.milestone_name || '',
        m.milestone_date || '',
        m.milestone_type || '',
        m.is_critical ? 'Yes' : 'No'
      ])
    })
    rows.push([])
  }
  
  // Resources
  if (resources.length > 0) {
    rows.push(['Resources'])
    rows.push(['Name', 'Type', 'Quantity', 'Unit', 'Cost per Unit', 'Total Cost'])
    resources.forEach(r => {
      rows.push([
        r.resource_name || '',
        r.resource_type || '',
        r.quantity_required || '',
        r.unit_of_measure || '',
        r.cost_per_unit || '',
        r.total_cost || ''
      ])
    })
  }
  
  // Convert to CSV string
  return rows.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n')
}

/**
 * Generate Plan Print View HTML
 * @param {Object} plan - Plan data
 * @param {string} planType - 'project_plan' or 'stage_plan'
 * @returns {string} HTML string
 */
export function generatePlanPrintView(plan, planType) {
  const isProjectPlan = planType === 'project_plan'
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${plan.plan_title || 'Plan'}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; page-break-inside: avoid; }
        .section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${plan.plan_title || 'Plan'}</h1>
        <p><strong>Reference:</strong> ${plan.plan_reference || ''}</p>
        <p><strong>Version:</strong> ${plan.version_number || '1.0'}</p>
        <p><strong>Status:</strong> ${plan.status || 'draft'}</p>
      </div>
      
      <div class="section">
        <div class="section-title">Overview</div>
        <p><strong>Purpose:</strong> ${plan.plan_purpose || ''}</p>
        <p><strong>Scope:</strong> ${plan.plan_scope || ''}</p>
        ${plan.plan_description ? `<p><strong>Description:</strong> ${plan.plan_description}</p>` : ''}
      </div>
      
      ${isProjectPlan ? `
        <div class="section">
          <div class="section-title">Planning Approach</div>
          ${plan.planning_approach ? `<p>${plan.planning_approach}</p>` : ''}
          ${plan.planning_assumptions ? `<p><strong>Assumptions:</strong> ${plan.planning_assumptions}</p>` : ''}
          ${plan.planning_constraints ? `<p><strong>Constraints:</strong> ${plan.planning_constraints}</p>` : ''}
        </div>
      ` : `
        <div class="section">
          <div class="section-title">Stage Information</div>
          <p><strong>Stage:</strong> ${plan.stage_name || ''} (Stage ${plan.stage_number || ''})</p>
          ${plan.stage_description ? `<p>${plan.stage_description}</p>` : ''}
          ${plan.stage_objectives ? `<p><strong>Objectives:</strong> ${plan.stage_objectives}</p>` : ''}
        </div>
      `}
      
      <div class="section">
        <div class="section-title">Schedule</div>
        <p><strong>Start Date:</strong> ${plan.planned_start_date || ''}</p>
        <p><strong>End Date:</strong> ${plan.planned_end_date || ''}</p>
        ${plan.project_duration_days || plan.stage_duration_days ? 
          `<p><strong>Duration:</strong> ${plan.project_duration_days || plan.stage_duration_days} days</p>` : ''}
      </div>
      
      <div class="section">
        <div class="section-title">Budget</div>
        <p><strong>Total Budget:</strong> ${plan.total_budget || plan.stage_budget || '0'} ${plan.budget_currency || 'USD'}</p>
        ${plan.contingency_amount ? 
          `<p><strong>Contingency:</strong> ${plan.contingency_amount} (${plan.contingency_percentage || 0}%)</p>` : ''}
      </div>
      
      <div class="section">
        <div class="section-title">Resources</div>
        ${plan.resource_summary || plan.resource_requirements || 'No resource summary provided'}
      </div>
      
      ${isProjectPlan ? `
        <div class="section">
          <div class="section-title">Risk Summary</div>
          ${plan.risk_summary || 'No risk summary provided'}
        </div>
        
        <div class="section">
          <div class="section-title">Quality Summary</div>
          ${plan.quality_summary || 'No quality summary provided'}
        </div>
      ` : `
        <div class="section">
          <div class="section-title">Products & Deliverables</div>
          ${plan.products_summary || 'No products summary provided'}
        </div>
      `}
    </body>
    </html>
  `
  
  return html
}
