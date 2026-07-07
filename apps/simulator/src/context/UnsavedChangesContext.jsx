import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '@nidus/ui/Modal'
import Button from '@nidus/ui/Button'
import { aggregateDirtyState, evaluateLinkClickForGuard } from '../utils/unsavedChangesUtils.js'

const UnsavedChangesContext = createContext(null)

const DEFAULT_MESSAGE = 'You have unsaved changes. Discard them and leave this page?'

export function UnsavedChangesProvider({ children }) {
  const navigate = useNavigate()
  const [guards, setGuards] = useState(() => new Map())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const pendingActionRef = useRef(null)
  const bypassRef = useRef(false)
  const historyTrapRef = useRef(false)

  const { isDirty, message } = useMemo(
    () => aggregateDirtyState(guards.values()),
    [guards],
  )

  const registerGuard = useCallback((id, isDirtyFlag, guardMessage) => {
    setGuards((prev) => {
      const next = new Map(prev)
      next.set(id, { isDirty: !!isDirtyFlag, message: guardMessage || null })
      return next
    })
  }, [])

  const unregisterGuard = useCallback((id) => {
    setGuards((prev) => {
      if (!prev.has(id)) return prev
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const openConfirm = useCallback((action) => {
    pendingActionRef.current = action
    setConfirmOpen(true)
  }, [])

  const runPendingAction = useCallback(() => {
    const action = pendingActionRef.current
    pendingActionRef.current = null
    bypassRef.current = true
    try {
      if (!action) return
      if (action.type === 'navigate') {
        navigate(action.to)
      } else if (action.type === 'back') {
        window.history.back()
      } else if (action.type === 'callback') {
        action.fn?.()
      }
    } finally {
      window.setTimeout(() => {
        bypassRef.current = false
      }, 0)
    }
  }, [navigate])

  const requestNavigation = useCallback((to) => {
    if (!isDirty || bypassRef.current) {
      navigate(to)
      return
    }
    openConfirm({ type: 'navigate', to })
  }, [isDirty, navigate, openConfirm])

  const confirmDiscard = useCallback((onProceed) => {
    if (!isDirty || bypassRef.current) {
      onProceed?.()
      return
    }
    openConfirm({ type: 'callback', fn: onProceed })
  }, [isDirty, openConfirm])

  const handleKeepEditing = useCallback(() => {
    pendingActionRef.current = null
    setConfirmOpen(false)
  }, [])

  const handleDiscard = useCallback(() => {
    setConfirmOpen(false)
    runPendingAction()
  }, [runPendingAction])

  useEffect(() => {
    if (!isDirty) return undefined

    const onBeforeUnload = (event) => {
      if (bypassRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    if (!isDirty) {
      historyTrapRef.current = false
      return undefined
    }

    if (!historyTrapRef.current) {
      window.history.pushState({ nidusUnsavedGuard: true }, '', window.location.href)
      historyTrapRef.current = true
    }

    const onPopState = () => {
      if (bypassRef.current || !isDirty) return
      window.history.pushState({ nidusUnsavedGuard: true }, '', window.location.href)
      openConfirm({ type: 'back' })
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [isDirty, openConfirm])

  useEffect(() => {
    if (!isDirty) return undefined

    const onDocumentClick = (event) => {
      if (bypassRef.current) return
      const { intercept, targetPath } = evaluateLinkClickForGuard(event)
      if (!intercept || !targetPath) return
      event.preventDefault()
      event.stopPropagation()
      openConfirm({ type: 'navigate', to: targetPath })
    }

    document.addEventListener('click', onDocumentClick, true)
    return () => document.removeEventListener('click', onDocumentClick, true)
  }, [isDirty, openConfirm])

  const contextValue = useMemo(
    () => ({
      isDirty,
      registerGuard,
      unregisterGuard,
      requestNavigation,
      confirmDiscard,
    }),
    [isDirty, registerGuard, unregisterGuard, requestNavigation, confirmDiscard],
  )

  return (
    <UnsavedChangesContext.Provider value={contextValue}>
      {children}
      <Modal
        isOpen={confirmOpen}
        onClose={handleKeepEditing}
        title="Unsaved changes"
        size="sm"
        closeOnOverlayClick={false}
        footer={(
          <>
            <Button variant="secondary" onClick={handleKeepEditing}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={handleDiscard}>
              Discard changes
            </Button>
          </>
        )}
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {message || DEFAULT_MESSAGE}
        </p>
      </Modal>
    </UnsavedChangesContext.Provider>
  )
}

export function useUnsavedChangesContext() {
  const ctx = useContext(UnsavedChangesContext)
  if (!ctx) {
    throw new Error('useUnsavedChangesContext must be used within UnsavedChangesProvider')
  }
  return ctx
}

/**
 * Register a form/page dirty state with the global unsaved-changes guard.
 * @param {boolean} isDirty
 * @param {string} [message]
 */
export function useUnsavedChangesGuard(isDirty, message) {
  const id = useId()
  const { registerGuard, unregisterGuard, requestNavigation, confirmDiscard } = useUnsavedChangesContext()

  useEffect(() => {
    registerGuard(id, isDirty, message)
    return () => unregisterGuard(id)
  }, [id, isDirty, message, registerGuard, unregisterGuard])

  return { requestNavigation, confirmDiscard }
}
