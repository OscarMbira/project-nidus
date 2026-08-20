/**
 * useSuccessModal — local per-page hook for the blocking success-confirmation modal
 * (CLAUDE.md rule 16, v861). Mirrors the Admin app's useConfirmAction() shape: call
 * showSuccess({...}) after a successful create/update/delete, render the returned
 * `modal` in your JSX. No global provider — same lightweight, per-page pattern as
 * Admin's precedent, simpler than the app-wide ToastContext.
 *
 * Navigation is never implicit: pass `onOk` only when this specific save should move
 * the user elsewhere (e.g. a terminal "Create" flow). Omit it for iterative multi-save
 * pages (e.g. a template builder) so OK just closes the modal and the user keeps working.
 */

import { useState, useCallback } from 'react'
import SuccessConfirmationModal from '@nidus/ui/SuccessConfirmationModal'

export function useSuccessModal() {
  const [state, setState] = useState(null)

  const showSuccess = useCallback(({ recordId, operation = 'updated', message, onOk, okLabel } = {}) => {
    setState({ recordId, operation, message, onOk, okLabel })
  }, [])

  const close = useCallback(() => setState(null), [])

  const handleOk = useCallback(() => {
    const onOk = state?.onOk
    close()
    onOk?.()
  }, [state, close])

  const modal = state ? (
    <SuccessConfirmationModal
      isOpen
      onClose={handleOk}
      operation={state.operation}
      recordId={state.recordId}
      message={state.message}
      okLabel={state.okLabel}
    />
  ) : null

  return { showSuccess, modal }
}

export default useSuccessModal
