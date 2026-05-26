/**
 * Patch draftQueueConfig.js with v629 process template entity types.
 * Run: node scripts/patch-draft-queue-v629.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const configPath = path.join(__dirname, '..', 'src', 'config', 'draftQueueConfig.js')

const SLUGS = [
  ['project_charter', 'Project Charter', '/pmo/process-templates/t/project-charter'],
  ['assumption_log', 'Assumption Log', '/pmo/process-templates/t/assumption-log'],
  ['project_management_plan', 'Project Management Plan', '/pmo/process-templates/t/project-management-plan'],
  ['requirements_management_plan', 'Requirements Management Plan', '/pmo/process-templates/t/requirements-management-plan'],
  ['requirements_documentation', 'Requirements Documentation', '/pmo/process-templates/t/requirements-documentation'],
  ['wbs_dictionary', 'WBS Dictionary', '/pmo/process-templates/t/wbs-dictionary'],
  ['activity_attributes', 'Activity Attributes', '/pmo/process-templates/t/activity-attributes'],
  ['activity_resource_requirements', 'Activity Resource Requirements', '/pmo/process-templates/t/activity-resource-requirements'],
  ['resource_breakdown_structure', 'Resource Breakdown Structure', '/pmo/process-templates/t/resource-breakdown-structure'],
  ['activity_duration_estimates', 'Activity Duration Estimates', '/pmo/process-templates/t/activity-duration-estimates'],
  ['cost_management_plan', 'Cost Management Plan', '/pmo/process-templates/t/cost-management-plan'],
  ['activity_cost_estimates', 'Activity Cost Estimates', '/pmo/process-templates/t/activity-cost-estimates'],
  ['cost_baseline', 'Cost Baseline', '/pmo/process-templates/t/cost-baseline'],
  ['resource_management_plan', 'Resource Management Plan', '/pmo/process-templates/t/resource-management-plan'],
  ['stakeholder_engagement_plan', 'Stakeholder Engagement Plan', '/pmo/process-templates/t/stakeholder-engagement-plan'],
  ['procurement_management_plan', 'Procurement Management Plan', '/pmo/process-templates/t/procurement-management-plan'],
  ['quality_checklists', 'Quality Checklist', '/pmo/process-templates/t/quality-checklists'],
  ['team_performance_assessment', 'Team Performance Assessment', '/pmo/process-templates/t/team-performance-assessment'],
  ['make_or_buy_decision', 'Make-or-Buy Decision', '/pmo/process-templates/t/make-or-buy-decision'],
  ['variance_analysis_report', 'Variance Analysis Report', '/pmo/process-templates/t/variance-analysis-report'],
  ['evm_status_report', 'EVM Status Report', '/pmo/process-templates/t/evm-status-report'],
  ['scope_acceptance_form', 'Scope Acceptance Form', '/pmo/process-templates/t/scope-acceptance-form'],
  ['project_closure_checklist', 'Project Closure Checklist', '/pmo/process-templates/t/project-closure-checklist'],
  ['contract_closure_document', 'Contract Closure Document', '/pmo/process-templates/t/contract-closure-document'],
]

function entry(key, label, basePath, sim = false) {
  const prefix = sim ? 'sim_' : ''
  const pmBase = basePath.replace('/pmo/', sim ? '/simulator/pmo/' : '/pm/')
  return `
  ${prefix}process_template_${key}: {
    label: '${label}',
    labelPlural: '${label}s',
    icon: FileText,
    createRoute: '${pmBase}/new',
    editRoute: (id) => \`${pmBase}/\${id}/edit\`,
    holdQueueRoute: '${pmBase.replace('/t/', '/t/')}drafts',
    titleField: 'title',
    requiredFields: ['title'],
    defaultExpiryDays: 14,
    menuParent: 'process_templates',
    roles: ${sim ? "['simulator_user']" : "['pmo_admin', 'project_manager', 'team_member']"}
  },`
}

let block = '\n  // v629 Process Templates\n'
for (const [key, label, path] of SLUGS) {
  block += entry(key, label, path, false)
}
for (const [key, label, path] of SLUGS) {
  block += entry(key, label, path, true)
}

let content = fs.readFileSync(configPath, 'utf8')
const marker = '  stakeholder_assessment_matrix: {'
if (content.includes('process_template_project_charter:')) {
  console.log('Already patched')
  process.exit(0)
}
const insertAfter = `    roles: ['pmo_admin', 'project_manager', 'team_member']
  }`
const idx = content.lastIndexOf(insertAfter)
if (idx === -1) throw new Error('Insert point not found')
content = content.slice(0, idx + insertAfter.length) + ',' + block + content.slice(idx + insertAfter.length)

// Patch SIMULATOR section before closing
const simMarker = '  practice_stakeholder_assessment_matrix: {'
const simEnd = `    roles: ['simulator_user']
  }
};`
const simIdx = content.lastIndexOf(simEnd)
if (simIdx === -1) throw new Error('Sim insert point not found')
// sim entries already included in block with sim_ prefix - only add to PLATFORM section
// Add sim-only block to SIMULATOR_ENTITY_TYPES
let simBlock = '\n  // v629 Process Templates (sim)\n'
for (const [key, label, path] of SLUGS) {
  const simPath = path.replace('/pmo/', '/simulator/pmo/')
  simBlock += entry(key, label, simPath, true).replace('sim_sim_', 'sim_')
}

content = content.slice(0, simIdx) + simBlock + content.slice(simIdx)

fs.writeFileSync(configPath, content, 'utf8')
console.log('Patched draftQueueConfig.js')
