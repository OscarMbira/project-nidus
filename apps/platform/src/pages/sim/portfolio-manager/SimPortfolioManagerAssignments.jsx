import { useCallback } from 'react'
import ManagerAssignmentsWorkbench from '../../../components/pm/ManagerAssignmentsWorkbench'
import {
  getCurrentSimPublicUserId,
  simListProgrammesForPortfolioManager,
  simListProjectsForPortfolioManager,
  simAssignProgrammeManagerAsPortfolioManager,
  simAssignProjectManagerAsPortfolioManager,
  simRemoveProgrammeManagerAsPortfolioManager,
  simRemoveProjectManagerAsPortfolioManager,
} from '../../../services/sim/simManagerAssignmentService'

export default function SimPortfolioManagerAssignments() {
  const loadRowsByTab = useCallback(async () => {
    const userId = await getCurrentSimPublicUserId()
    const [programmes, projects] = await Promise.all([
      simListProgrammesForPortfolioManager(userId),
      simListProjectsForPortfolioManager(userId),
    ])
    return { programmes, projects }
  }, [])

  const onAssign = useCallback(async (type, id, userId) => {
    if (type === 'programme') await simAssignProgrammeManagerAsPortfolioManager(id, userId)
    else await simAssignProjectManagerAsPortfolioManager(id, userId)
  }, [])

  const onRemove = useCallback(async (type, id) => {
    if (type === 'programme') await simRemoveProgrammeManagerAsPortfolioManager(id)
    else await simRemoveProjectManagerAsPortfolioManager(id)
  }, [])

  return (
    <ManagerAssignmentsWorkbench
      title="Practice — People & Assignments"
      description="Assign programme and project managers for practice entities in portfolios you manage."
      backTo="/simulator/pm/dashboard"
      backLabel="Back to Simulator PM Dashboard"
      tabs={[
        ['programmes', 'Programmes'],
        ['projects', 'Projects'],
      ]}
      storageKeyPrefix="sim-portfolio-mgr-assignments"
      loadRowsByTab={loadRowsByTab}
      onAssign={onAssign}
      onRemove={onRemove}
    />
  )
}
