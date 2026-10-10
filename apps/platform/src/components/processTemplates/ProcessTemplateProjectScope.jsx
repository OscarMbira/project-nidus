/**
 * Process template scope — PMO master catalogue vs PM project workspace.
 */
import { useLocation } from 'react-router-dom'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { roleKeyFromPath, isSimRoleKey } from './processTemplatesRegistry'
import { canCreateMasterTemplate } from '../../services/processTemplatesService'
import PlanningProjectBar from '../planning/PlanningProjectBar'

export function useProcessTemplateScope(roleKeyProp) {
  const location = useLocation()
  const roleKey = roleKeyProp || roleKeyFromPath(location.pathname)
  const sim = isSimRoleKey(roleKey)
  const masterCatalog = canCreateMasterTemplate(roleKey)
  const { projectId, loading: projectLoading } = usePlatformProjectId()

  return {
    roleKey,
    sim,
    /** PMO / Sim PMO — organisation-wide master templates (no project). */
    masterCatalog,
    /** Resolved projects.id. ?projectId= may be a project code such as SEED334-PRJ-08. */
    projectId: projectId || '',
    projectLoading,
    /** PM / Sim PM — project needed only for workspace copies, not to view masters. */
    needsProjectForCopies: !masterCatalog,
  }
}

/**
 * PMO: info banner only. PM: optional project filter for workspace copies.
 */
export default function ProcessTemplateProjectScope({ roleKey, sim }) {
  const masterCatalog = canCreateMasterTemplate(roleKey)

  if (masterCatalog) {
    return (
      <p className="mb-4 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-slate-400">
        Organisation master templates — not linked to any project. PMs copy these into their project workspace.
      </p>
    )
  }

  return (
    <div className="mb-4 space-y-2">
      <p className="text-sm text-slate-400">
        Master templates are shown below. Select a project to include your workspace copies, or use Copy on a master.
      </p>
      <PlanningProjectBar isSim={sim} />
    </div>
  )
}
