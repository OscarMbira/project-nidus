import { useCallback } from 'react'
import ManagerAssignmentsWorkbench from '../../components/pm/ManagerAssignmentsWorkbench'
import {
  getCurrentPlatformUserId,
  listProjectsForProgrammeManager,
  assignProjectManager,
  removeProjectManager,
} from '../../services/managerAssignmentService'

export default function ProgrammeManagerAssignments() {
  const loadRowsByTab = useCallback(async () => {
    const userId = await getCurrentPlatformUserId()
    const projects = await listProjectsForProgrammeManager(userId)
    return { projects }
  }, [])

  const onAssign = useCallback(async (type, id, userId) => {
    if (type === 'project') await assignProjectManager(id, userId)
  }, [])

  const onRemove = useCallback(async (type, id) => {
    if (type === 'project') await removeProjectManager(id)
  }, [])

  return (
    <ManagerAssignmentsWorkbench
      title="Assign Project Managers"
      description="Assign or change project managers for projects in programmes you manage."
      backTo="/pm/dashboard"
      backLabel="Back to PM Dashboard"
      tabs={[['projects', 'Projects']]}
      storageKeyPrefix="programme-mgr-assignments"
      loadRowsByTab={loadRowsByTab}
      onAssign={onAssign}
      onRemove={onRemove}
    />
  )
}
