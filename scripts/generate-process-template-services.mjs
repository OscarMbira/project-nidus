/**
 * Generate thin v629 process template service files.
 * Run: node scripts/generate-process-template-services.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const SERVICES = [
  ['projectCharterService.js', 'project-charter'],
  ['assumptionLogService.js', 'assumption-log'],
  ['projectManagementPlanService.js', 'project-management-plan'],
  ['requirementsManagementPlanService.js', 'requirements-management-plan'],
  ['requirementsDocumentationService.js', 'requirements-documentation'],
  ['wbsDictionaryService.js', 'wbs-dictionary'],
  ['activityAttributesService.js', 'activity-attributes'],
  ['activityResourceRequirementsService.js', 'activity-resource-requirements'],
  ['resourceBreakdownStructureService.js', 'resource-breakdown-structure'],
  ['activityDurationEstimatesService.js', 'activity-duration-estimates'],
  ['costManagementPlanService.js', 'cost-management-plan'],
  ['activityCostEstimatesService.js', 'activity-cost-estimates'],
  ['costBaselineService.js', 'cost-baseline'],
  ['resourceManagementPlanService.js', 'resource-management-plan'],
  ['stakeholderEngagementPlanService.js', 'stakeholder-engagement-plan'],
  ['procurementManagementPlanService.js', 'procurement-management-plan'],
  ['qualityChecklistService.js', 'quality-checklists'],
  ['teamPerformanceAssessmentService.js', 'team-performance-assessment'],
  ['makeOrBuyDecisionService.js', 'make-or-buy-decision'],
  ['varianceAnalysisReportService.js', 'variance-analysis-report'],
  ['evmStatusReportService.js', 'evm-status-report'],
  ['scopeAcceptanceFormService.js', 'scope-acceptance-form'],
  ['projectClosureChecklistService.js', 'project-closure-checklist'],
  ['contractClosureDocumentService.js', 'contract-closure-document'],
]

const platformTpl = (slug) => `import { getTemplateService } from './processTemplateCrudFactory'

const svc = getTemplateService('${slug}', { sim: false })

export const listByProject = svc.listByProject.bind(svc)
export const getById = svc.getById.bind(svc)
export const create = svc.create.bind(svc)
export const update = svc.update.bind(svc)
export const remove = svc.remove.bind(svc)
export const setOnHold = svc.setOnHold.bind(svc)
export const copyMaster = svc.copyMaster.bind(svc)
export default svc
`

const simTpl = (slug, filename) => `import { getTemplateService } from '../processTemplateCrudFactory'

const svc = getTemplateService('${slug}', { sim: true })

export const listByProject = svc.listByProject.bind(svc)
export const getById = svc.getById.bind(svc)
export const create = svc.create.bind(svc)
export const update = svc.update.bind(svc)
export const remove = svc.remove.bind(svc)
export const setOnHold = svc.setOnHold.bind(svc)
export const copyMaster = svc.copyMaster.bind(svc)
export default svc
`

for (const [filename, slug] of SERVICES) {
  fs.writeFileSync(path.join(root, 'src/services', filename), platformTpl(slug), 'utf8')
  const simName = 'sim' + filename.charAt(0).toUpperCase() + filename.slice(1).replace('Service', 'Service')
  const simFile = filename.replace('.js', '').replace(/^(\w)/, (m) => 'sim' + m.toUpperCase()) + '.js'
  // simProjectCharterService.js pattern
  const base = filename.replace('Service.js', '')
  const simFilename = `sim${base.charAt(0).toUpperCase()}${base.slice(1)}Service.js`
  fs.writeFileSync(path.join(root, 'src/services/sim', simFilename), simTpl(slug), 'utf8')
  console.log('created', filename, simFilename)
}

console.log('Done')
