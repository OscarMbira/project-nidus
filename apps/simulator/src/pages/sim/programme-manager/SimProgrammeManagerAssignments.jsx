import { useCallback } from 'react'
import ManagerAssignmentsWorkbench from '../../../components/pm/ManagerAssignmentsWorkbench'
import {
  getCurrentSimPublicUserId,
  simListProjectsForProgrammeManager,
  simAssignProjectManagerAsProgrammeManager,
  simRemoveProjectManagerAsProgrammeManager,
} from '../../../services/sim/simManagerAssignmentService'

export default function SimProgrammeManagerAssignments() {
  const loadRowsByTab = useCallback(async () => {
    const userId = await getCurrentSimPublicUserId()
    const projects = await simListProjectsForProgrammeManager(userId)
    return { projects }
  }, [])

  const onAssign = useCallback(async (type, id, userId) => {
    if (type === 'project') await simAssignProjectManagerAsProgrammeManager(id, userId)
  }, [])

  const onRemove = useCallback(async (type, id) => {
    if (type === 'project') await simRemoveProjectManagerAsProgrammeManager(id)
  }, [])

  return (
    <ManagerAssignmentsWorkbench
      title="Practice — Assign Project Managers"
      description="Assign project managers for practice projects in programmes you manage."
      backTo="/simulator/pm/dashboard"
      backLabel="Back to Simulator PM Dashboard"
      tabs={[['projects', 'Projects']]}
      storageKeyPrefix="sim-programme-mgr-assignments"
      loadRowsByTab={loadRowsByTab}
      onAssign={onAssign}
      onRemove={onRemove}
    />
  )
}
