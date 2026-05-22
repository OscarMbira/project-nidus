import { useCallback } from 'react'
import ManagerAssignmentsWorkbench from '../../components/pm/ManagerAssignmentsWorkbench'
import {
  getCurrentPlatformUserId,
  listProgrammesForPortfolioManager,
  listProjectsForPortfolioManager,
  assignProgrammeManager,
  assignProjectManager,
  removeProgrammeManager,
  removeProjectManager,
} from '../../services/managerAssignmentService'

export default function PortfolioManagerAssignments() {
  const loadRowsByTab = useCallback(async () => {
    const userId = await getCurrentPlatformUserId()
    const [programmes, projects] = await Promise.all([
      listProgrammesForPortfolioManager(userId),
      listProjectsForPortfolioManager(userId),
    ])
    return { programmes, projects }
  }, [])

  const onAssign = useCallback(async (type, id, userId) => {
    if (type === 'programme') await assignProgrammeManager(id, userId)
    else await assignProjectManager(id, userId)
  }, [])

  const onRemove = useCallback(async (type, id) => {
    if (type === 'programme') await removeProgrammeManager(id)
    else await removeProjectManager(id)
  }, [])

  return (
    <ManagerAssignmentsWorkbench
      title="People & Assignments"
      description="Assign programme and project managers within portfolios you manage — without opening entity edit forms."
      backTo="/pm/dashboard"
      backLabel="Back to PM Dashboard"
      tabs={[
        ['programmes', 'Programmes'],
        ['projects', 'Projects'],
      ]}
      storageKeyPrefix="portfolio-mgr-assignments"
      loadRowsByTab={loadRowsByTab}
      onAssign={onAssign}
      onRemove={onRemove}
    />
  )
}
