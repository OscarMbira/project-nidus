/**
 * SuccessConfirmationModal — blocking "OK to acknowledge" confirmation shown after a
 * successful create/update/delete (CLAUDE.md rule 16, v861). Built on the shared Modal —
 * single primary button, no overlay-click dismiss (this is meant to be actively
 * acknowledged, not glanced past), Escape still works as an equivalent-to-OK dismissal.
 *
 * Rendered via useSuccessModal() (packages/shared/src/hooks/useSuccessModal.js) — pages
 * don't import this directly, they call showSuccess({...}) and render the returned modal.
 */

import { useState } from 'react'
import { CheckCircle2, Trash2, Copy, Check } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

const OPERATION_CONFIG = {
  created: { icon: CheckCircle2, iconClass: 'text-green-600 dark:text-green-400', label: 'created' },
  updated: { icon: CheckCircle2, iconClass: 'text-green-600 dark:text-green-400', label: 'updated' },
  deleted: { icon: Trash2, iconClass: 'text-amber-600 dark:text-amber-400', label: 'deleted' },
}

export default function SuccessConfirmationModal({
  isOpen,
  onClose,
  operation = 'updated',
  recordId,
  message,
  okLabel = 'OK',
}) {
  const [copied, setCopied] = useState(false)
  const config = OPERATION_CONFIG[operation] || OPERATION_CONFIG.updated
  const Icon = config.icon

  const handleCopy = async () => {
    if (!recordId) return
    try {
      await navigator.clipboard.writeText(recordId)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (_) {
      // Clipboard unavailable (permissions/insecure context) — silently no-op, not critical path.
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={recordId ? `${recordId} ${config.label} successfully` : `Record ${config.label} successfully`}
      size="sm"
      showCloseButton={false}
      closeOnOverlayClick={false}
      closeOnEscape
      footer={
        <Button variant="success" onClick={onClose} className="w-full sm:w-auto" autoFocus>
          {okLabel}
        </Button>
      }
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-6 h-6 shrink-0 ${config.iconClass}`} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          {message && (
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{message}</p>
          )}
          {recordId && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{recordId}</span>
              {/*
                Copy-ID is a secondary convenience action, deliberately NOT a <button> and
                tabIndex=-1 so Modal's auto-focus (which targets the first `button`/`[href]`/
                `input`/etc. element) lands on the primary OK button instead of here.
              */}
              <span
                role="button"
                tabIndex={-1}
                onClick={handleCopy}
                className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                aria-label="Copy record ID"
                title="Copy record ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              </span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
