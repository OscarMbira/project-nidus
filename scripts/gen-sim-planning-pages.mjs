import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const pairs = [
  ['src/pages/scope/ScopeManagementPlan.jsx', 'src/pages/simulator/scope/ScopeManagementPlan.jsx'],
  ['src/pages/scope/ScopeStatement.jsx', 'src/pages/simulator/scope/ScopeStatement.jsx'],
  ['src/pages/scope/RequirementsRegister.jsx', 'src/pages/simulator/scope/RequirementsRegister.jsx'],
  ['src/pages/scope/RequirementDetail.jsx', 'src/pages/simulator/scope/RequirementDetail.jsx'],
  ['src/pages/scope/TraceabilityMatrix.jsx', 'src/pages/simulator/scope/TraceabilityMatrix.jsx'],
  ['src/pages/scope/WBSBuilder.jsx', 'src/pages/simulator/scope/WBSBuilder.jsx'],
  ['src/pages/schedule/ScheduleManagementPlan.jsx', 'src/pages/simulator/schedule/ScheduleManagementPlan.jsx'],
  ['src/pages/schedule/ActivityList.jsx', 'src/pages/simulator/schedule/ActivityList.jsx'],
  ['src/pages/schedule/ActivityDetail.jsx', 'src/pages/simulator/schedule/ActivityDetail.jsx'],
  ['src/pages/schedule/ActivitySequencing.jsx', 'src/pages/simulator/schedule/ActivitySequencing.jsx'],
  ['src/pages/schedule/GanttChart.jsx', 'src/pages/simulator/schedule/GanttChart.jsx'],
]

function transform(x) {
  let o = x
  o = o.replace(/from '\.\.\/\.\.\/hooks\/useProjectRole'/g, "from '../../../hooks/useSimPracticeOwner'")
  o = o.replace(/useProjectRole\(/g, 'useSimPracticeOwner(')
  o = o.replace(/\/platform\/projects\//g, '/simulator/practice-projects/')
  o = o.replace(/from '\.\.\/\.\.\/services\/scopeManagementPlanService'/g, "from '../../../services/sim/simPlanningService'")
  o = o.replace(/from '\.\.\/\.\.\/services\/scopeStatementService'/g, "from '../../../services/sim/simPlanningService'")
  o = o.replace(/from '\.\.\/\.\.\/services\/requirementsRegisterService'/g, "from '../../../services/sim/simPlanningService'")
  o = o.replace(/from '\.\.\/\.\.\/services\/requirementsTraceabilityService'/g, "from '../../../services/sim/simPlanningService'")
  o = o.replace(/from '\.\.\/\.\.\/services\/wbsNodeService'/g, "from '../../../services/sim/simPlanningService'")
  o = o.replace(/from '\.\.\/\.\.\/services\/scheduleManagementPlanService'/g, "from '../../../services/sim/simPlanningService'")
  o = o.replace(/from '\.\.\/\.\.\/services\/activityListService'/g, "from '../../../services/sim/simPlanningService'")
  o = o.replace(/from '\.\.\/\.\.\/services\/activityDependencyService'/g, "from '../../../services/sim/simPlanningService'")
  o = o.replace(
    /from '\.\.\/\.\.\/services\/supabase\/supabaseClient'/g,
    "from '../../../services/supabase/supabaseClient'"
  )
  o = o.replace(
    /from '\.\.\/\.\.\/components\//g,
    "from '../../../components/"
  )
  o = o.replace(
    /from '\.\.\/\.\.\/utils\//g,
    "from '../../../utils/"
  )
  o = o.replace(/getStakeholders/g, 'getPracticeStakeholders')
  o = o.replace(
    /from '\.\.\/\.\.\/services\/stakeholderService'/g,
    "from '../../../services/sim/practiceStakeholderService'"
  )

  o = o.replace(/getScopeManagementPlanByProject/g, 'simGetScopeManagementPlan')
  o = o.replace(/saveScopeManagementPlan\(/g, 'simSaveScopeManagementPlan(')
  o = o.replace(/getScopeStatementByProject/g, 'simGetScopeStatement')
  o = o.replace(/saveScopeStatement\(/g, 'simSaveScopeStatement(')
  o = o.replace(/listRequirements/g, 'simListRequirements')
  o = o.replace(/getRequirement\(/g, 'simGetRequirement(')
  o = o.replace(/saveRequirement\(/g, 'simSaveRequirement(')
  o = o.replace(/softDeleteRequirement\(/g, 'simSoftDeleteRequirement(')
  o = o.replace(/listTraceabilityForProject/g, 'simListTraceability')
  o = o.replace(/saveTraceabilityRow\(/g, 'simSaveTraceabilityRow(')
  o = o.replace(/softDeleteTraceabilityRow\(/g, 'simSoftDeleteTraceRow(')
  o = o.replace(/listWbsNodes/g, 'simListWbsNodes')
  o = o.replace(/saveWbsNode\(/g, 'simSaveWbsNode(')
  o = o.replace(/softDeleteWbsNode\(/g, 'simSoftDeleteWbsNode(')
  o = o.replace(/getScheduleManagementPlanByProject/g, 'simGetScheduleManagementPlan')
  o = o.replace(/saveScheduleManagementPlan\(/g, 'simSaveScheduleManagementPlan(')
  o = o.replace(/listActivities\(/g, 'simListActivities(')
  o = o.replace(/getActivity\(/g, 'simGetActivity(')
  o = o.replace(/saveActivity\(/g, 'simSaveActivity(')
  o = o.replace(/listDependencies\(/g, 'simListDependencies(')
  o = o.replace(/saveDependency\(/g, 'simSaveDependency(')
  o = o.replace(/softDeleteDependency\(/g, 'simSoftDeleteDependency(')

  o = o.replace(/platformDb/g, 'simDb')

  // sim service calls use practice_project_id — pass projectId as first arg (same variable name)
  o = o.replace(/simGetRequirement\(projectId,/g, 'simGetRequirement(projectId,')
  o = o.replace(/simGetActivity\(projectId,/g, 'simGetActivity(projectId,')

  return o
}

for (const [relSrc, relDst] of pairs) {
  const src = path.join(root, relSrc)
  const dst = path.join(root, relDst)
  const raw = fs.readFileSync(src, 'utf8')
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  fs.writeFileSync(dst, transform(raw))
}

console.log('Wrote', pairs.length, 'simulator planning pages.')
