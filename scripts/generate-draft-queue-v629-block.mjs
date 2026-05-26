/**
 * Generate draft queue entries for v629 — prints JS block to stdout.
 * Run: node scripts/generate-draft-queue-v629-block.mjs >> (manual paste)
 */
const slugs = [
  ['project_charter', 'Project Charter', 'project-charter'],
  ['assumption_log', 'Assumption Log', 'assumption-log'],
  ['project_management_plan', 'Project Management Plan', 'project-management-plan'],
  ['requirements_management_plan', 'Requirements Management Plan', 'requirements-management-plan'],
  ['requirements_documentation', 'Requirements Documentation', 'requirements-documentation'],
  ['wbs_dictionary', 'WBS Dictionary', 'wbs-dictionary'],
  ['activity_attributes', 'Activity Attributes', 'activity-attributes'],
  ['activity_resource_requirements', 'Activity Resource Requirements', 'activity-resource-requirements'],
  ['resource_breakdown_structure', 'Resource Breakdown Structure', 'resource-breakdown-structure'],
  ['activity_duration_estimates', 'Activity Duration Estimates', 'activity-duration-estimates'],
  ['cost_management_plan', 'Cost Management Plan', 'cost-management-plan'],
  ['activity_cost_estimates', 'Activity Cost Estimates', 'activity-cost-estimates'],
  ['cost_baseline', 'Cost Baseline', 'cost-baseline'],
  ['resource_management_plan', 'Resource Management Plan', 'resource-management-plan'],
  ['stakeholder_engagement_plan', 'Stakeholder Engagement Plan', 'stakeholder-engagement-plan'],
  ['procurement_management_plan', 'Procurement Management Plan', 'procurement-management-plan'],
  ['quality_checklists', 'Quality Checklist', 'quality-checklists'],
  ['team_performance_assessment', 'Team Performance Assessment', 'team-performance-assessment'],
  ['make_or_buy_decision', 'Make-or-Buy Decision', 'make-or-buy-decision'],
  ['variance_analysis_report', 'Variance Analysis Report', 'variance-analysis-report'],
  ['evm_status_report', 'EVM Status Report', 'evm-status-report'],
  ['scope_acceptance_form', 'Scope Acceptance Form', 'scope-acceptance-form'],
  ['project_closure_checklist', 'Project Closure Checklist', 'project-closure-checklist'],
  ['contract_closure_document', 'Contract Closure Document', 'contract-closure-document'],
]

function block(sim) {
  const pm = sim ? '/simulator/pm' : '/pm'
  const roles = sim ? "['simulator_user']" : "['pmo_admin', 'project_manager', 'team_member']"
  return slugs
    .map(([k, l, s]) => {
      const key = `${sim ? 'sim_' : ''}process_template_${k}`
      const base = `${pm}/process-templates/t/${s}`
      return `  ${key}: {
    label: '${l}',
    labelPlural: '${l}s',
    icon: FileText,
    createRoute: '${base}/new',
    editRoute: (id) => \`${base}/\${id}/edit\`,
    holdQueueRoute: '${pm}/process-templates',
    titleField: 'title',
    requiredFields: ['title'],
    defaultExpiryDays: 14,
    menuParent: 'process_templates',
    roles: ${roles}
  }`
    })
    .join(',\n')
}

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const configPath = path.join(__dirname, '..', 'src', 'config', 'draftQueueConfig.js')
let content = fs.readFileSync(configPath, 'utf8')

if (content.includes('process_template_project_charter:')) {
  console.log('Already present')
  process.exit(0)
}

const platformBlock = ',\n\n  // v629 Process Templates (Platform)\n' + block(false)
const simBlock = ',\n\n  // v629 Process Templates (Simulator)\n' + block(true)

content = content.replace(
  /(\s+roles: \['pmo_admin', 'project_manager', 'team_member'\]\s+\})\s+\};/,
  `$1${platformBlock}\n};`
)

content = content.replace(
  /(\s+roles: \['simulator_user'\]\s+\})\s+\};\s+\/\/ =+/,
  `$1${simBlock}\n};\n\n// =`
)

fs.writeFileSync(configPath, content, 'utf8')
console.log('Patched', configPath)
