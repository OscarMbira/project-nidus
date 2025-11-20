import { useState, useCallback } from 'react'

let toastIdCounter = 0

export function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    const id = ++toastIdCounter
    const newToast = {
      id,
      type: 'info',
      duration: 5000,
      ...toast
    }

    setToasts(prev => [...prev, newToast])

    // Auto-remove after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const success = useCallback((message, options = {}) => {
    return addToast({ type: 'success', message, ...options })
  }, [addToast])

  const error = useCallback((message, options = {}) => {
    return addToast({ type: 'error', message, duration: 7000, ...options })
  }, [addToast])

  const warning = useCallback((message, options = {}) => {
    return addToast({ type: 'warning', message, ...options })
  }, [addToast])

  const info = useCallback((message, options = {}) => {
    return addToast({ type: 'info', message, ...options })
  }, [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info
  }
}

