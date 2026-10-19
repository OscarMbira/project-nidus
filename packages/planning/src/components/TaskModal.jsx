/**
 * v1265 — the task form as a large modal over the schedule view you were on (owner decision
 * 2026-10-12; rule 65 task-form exception). Opened by useTaskModal() (?task=…); the view behind
 * keeps its scroll position and collapsed rows. Closing (✕, Esc, Cancel) asks first when there
 * are unsaved changes; after a save the view behind reloads.
 */
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { TaskForm } from '../screens/schedule/TaskFormScreen.jsx'
import { useTaskModal } from '../hooks/useTaskModal.js'

export default function TaskModal({ onChanged }) {
  const { state, setMode, close } = useTaskModal()
  const closeRef = useRef(null)

  // Esc closes; the form's own Cancel handles the unsaved-changes question.
  useEffect(() => {
    if (!state) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current?.click()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [state])

  if (!state) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/50 p-2 sm:p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) closeRef.current?.click() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="task-modal-title"
        className="relative w-full max-w-5xl rounded-xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:p-6">
        <TaskForm
          key={`${state.taskKey || 'new'}:${state.mode}`}
          taskKey={state.taskKey}
          mode={state.mode}
          parentKey={state.parentKey}
          variant="modal"
          onClose={close}
          onModeChange={setMode}
          onSaved={(key) => { onChanged?.(); setMode('view', key) }}
          renderClose={(requestClose) => (
            <button ref={closeRef} type="button" onClick={requestClose} aria-label="Close" title="Close (Esc)"
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white">
              <X className="h-5 w-5" />
            </button>
          )}
        />
      </div>
    </div>
  )
}
