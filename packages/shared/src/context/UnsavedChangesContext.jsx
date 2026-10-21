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
import { aggregateDirtyState, evaluateLinkClickForGuard, getParentPath } from '../utils/unsavedChangesUtils.js'

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

  const releaseBypass = useCallback(() => {
    window.setTimeout(() => {
      bypassRef.current = false
    }, 400)
  }, [])

  // Keep React Router's history idx/key on the trap entry. A bare pushState
  // wipes them, and the next navigate() then stays on this page.
  const pushGuardEntry = useCallback(() => {
    const state = window.history.state && typeof window.history.state === 'object'
      ? window.history.state
      : {}
    window.history.pushState({ ...state, nidusUnsavedGuard: true }, '', window.location.href)
    historyTrapRef.current = true
  }, [])

  const runPendingAction = useCallback(() => {
    const action = pendingActionRef.current
    pendingActionRef.current = null
    const trap = historyTrapRef.current || Boolean(window.history.state?.nidusUnsavedGuard)
    historyTrapRef.current = false
    bypassRef.current = true

    const finish = (leave) => {
      // Leave on the next turn so this click cannot be undone by the guard's popstate.
      window.setTimeout(() => {
        leave()
        releaseBypass()
      }, 0)
    }

    if (!action) {
      releaseBypass()
      return
    }

    if (action.type === 'navigate') {
      finish(() => navigate(action.to))
      return
    }

    if (action.type === 'callback') {
      finish(() => action.fn?.())
      return
    }

    if (action.fallbackTo) {
      finish(() => navigate(action.fallbackTo))
      return
    }

    // This page is the first entry in the tab's history (opened in a new tab or from a pasted
    // link): history.go() below would silently do nothing, so go up one level instead.
    // React Router's history index is kept on the trap entry (pushGuardEntry).
    const pageIdx = window.history.state?.idx
    if (typeof pageIdx === 'number' && pageIdx < 1) {
      finish(() => navigate(getParentPath(window.location.pathname), { replace: true }))
      return
    }

    // Browser Back was cancelled by re-adding the same-URL trap entry.
    // Step back past that entry and this page.
    finish(() => window.history.go(trap ? -2 : -1))
  }, [navigate, releaseBypass])

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

  const confirmBack = useCallback((fallbackTo) => {
    if (!isDirty || bypassRef.current) {
      if (fallbackTo) navigate(fallbackTo)
      else navigate(-1)
      return
    }
    openConfirm({ type: 'back-page', fallbackTo })
  }, [isDirty, navigate, openConfirm])

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
      pushGuardEntry()
    }

    const onPopState = () => {
      if (bypassRef.current || !isDirty) return
      pushGuardEntry()
      openConfirm({ type: 'back' })
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [isDirty, openConfirm, pushGuardEntry])

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
      confirmBack,
    }),
    [isDirty, registerGuard, unregisterGuard, requestNavigation, confirmDiscard, confirmBack],
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
            <Button type="button" variant="secondary" onClick={handleKeepEditing}>
              Keep editing
            </Button>
            <Button type="button" variant="destructive" onClick={handleDiscard}>
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
  const { registerGuard, unregisterGuard, requestNavigation, confirmDiscard, confirmBack } = useUnsavedChangesContext()

  useEffect(() => {
    registerGuard(id, isDirty, message)
    return () => unregisterGuard(id)
  }, [id, isDirty, message, registerGuard, unregisterGuard])

  return { requestNavigation, confirmDiscard, confirmBack }
}
