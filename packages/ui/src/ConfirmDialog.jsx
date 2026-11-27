/**
 * v1359 — shared confirmation dialog (replaces window.confirm in new and amended screens).
 *
 *   const { confirm, dialog } = useConfirmDialog()
 *   if (!(await confirm({ title: 'Revoke this key?', message: '…', confirmLabel: 'Revoke', danger: true }))) return
 *   …
 *   return <>{…}{dialog}</>
 *
 * confirm() resolves true when the person confirms, false when they cancel or close it. Theme-aware (rule 28.1).
 */
import { useCallback, useRef, useState } from 'react'
import Modal from './Modal.jsx'

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onCancel }) {
  return (
    <Modal isOpen={open} onClose={onCancel} title={title} size="sm">
      <div className="space-y-4">
        {message && <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{message}</div>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded px-4 py-2 text-sm font-medium text-white ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function useConfirmDialog() {
  const [state, setState] = useState(null)
  const resolver = useRef(null)

  const settle = useCallback((value) => {
    resolver.current?.(value)
    resolver.current = null
    setState(null)
  }, [])

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolver.current?.(false)
    resolver.current = resolve
    setState(options || {})
  }), [])

  const dialog = (
    <ConfirmDialog
      open={Boolean(state)}
      {...(state || {})}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  )
  return { confirm, dialog }
}

export default ConfirmDialog
