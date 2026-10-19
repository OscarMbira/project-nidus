/**
 * v1265 — confirm deleting a task. A summary task is deleted with its whole branch, so the
 * dialog warns first, lists its sub-tasks and needs an extra tick before Delete is enabled
 * (owner request: avoid deleting sub-tasks by mistake).
 */
import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

const SHOW = 5

export default function DeleteTaskDialog({ task, descendants = [], busy = false, onCancel, onConfirm }) {
  const [understood, setUnderstood] = useState(false)
  const count = descendants.length
  const name = `${task.task_code ? `${task.task_code} · ` : ''}${task.task_name}`
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="delete-task-title" aria-describedby="delete-task-desc">
      <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <h2 id="delete-task-title" className="text-lg font-semibold text-gray-900 dark:text-white">Delete “{name}”?</h2>
        <div id="delete-task-desc" className="mt-2 space-y-3 text-sm text-gray-700 dark:text-gray-300">
          {count === 0 ? (
            <p>The task is removed from the plan. Links to and from it stop counting.</p>
          ) : (
            <>
              <p className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>This is a summary task. Deleting it also deletes its <strong>{count} sub-task{count === 1 ? '' : 's'}</strong>:</span>
              </p>
              <ul className="list-disc pl-5">
                {descendants.slice(0, SHOW).map((d) => <li key={d.id}>{d.task_code ? `${d.task_code} · ` : ''}{d.task_name}</li>)}
                {count > SHOW && <li>…and {count - SHOW} more</li>}
              </ul>
              <label className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
                Yes, delete the task and its {count} sub-task{count === 1 ? '' : 's'}
              </label>
            </>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={busy || (count > 0 && !understood)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm disabled:opacity-50">
            {busy ? 'Deleting…' : count ? `Delete ${count + 1} tasks` : 'Delete task'}
          </button>
        </div>
      </div>
    </div>
  )
}
