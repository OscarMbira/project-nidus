/**
 * v1265 — the shared delete flow for schedule screens: confirm (with the summary-task warning),
 * delete the task and its sub-tasks, show the success modal (rule 16), reload.
 *   const { askDelete, dialog } = useTaskDelete(schedule, projectId)
 *   askDelete(task) … render {dialog}
 */
import { useState } from 'react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import DeleteTaskDialog from '../components/DeleteTaskDialog.jsx'
import { descendantsOf } from '../services/planOutline.js'
import { ScheduleConflictError } from '../services/scheduleData.js'

export function useTaskDelete(schedule, projectId) {
  const { showSuccess, modal } = useSuccessModal()
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)

  const askDelete = (task) => setPending({ task, descendants: descendantsOf(schedule.tasks, task.id) })

  const confirm = async () => {
    const { task, descendants } = pending
    setBusy(true)
    try {
      const { deleted } = await schedule.data.deleteTaskTree(projectId, task, descendants)
      setPending(null)
      showSuccess({
        recordId: task.task_code || task.id,
        operation: 'deleted',
        message: deleted > 1 ? `"${task.task_name}" and its ${deleted - 1} sub-task(s) were deleted.` : `"${task.task_name}" was deleted.`,
      })
      schedule.reload()
    } catch (err) {
      setPending(null)
      if (err instanceof ScheduleConflictError) schedule.setConflict(err.message)
      else window.alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  const dialog = (
    <>
      {pending && <DeleteTaskDialog task={pending.task} descendants={pending.descendants} busy={busy} onCancel={() => setPending(null)} onConfirm={confirm} />}
      {modal}
    </>
  )
  return { askDelete, dialog }
}
