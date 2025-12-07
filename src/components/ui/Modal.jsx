import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { trapFocus, restoreFocus } from '../../utils/accessibilityUtils'
import Button from './Button'

function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md', // sm, md, lg, xl, full
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  ariaLabel,
  ariaLabelledBy,
  footer,
  className = ''
}) {
  const modalRef = useRef(null)
  const previousFocusRef = useRef(null)

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store previous focus
      previousFocusRef.current = document.activeElement
      
      // Focus first element in modal
      const modal = modalRef.current
      if (modal) {
        const firstFocusable = modal.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (firstFocusable) {
          firstFocusable.focus()
        }
        
        // Trap focus
        trapFocus(modal)
      }

      // Prevent body scroll
      document.body.style.overflow = 'hidden'
    } else {
      // Restore focus
      if (previousFocusRef.current) {
        restoreFocus(previousFocusRef.current)
      }
      
      // Restore body scroll
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
      if (previousFocusRef.current) {
        restoreFocus(previousFocusRef.current)
      }
    }
  }, [isOpen])

  // Screen reader announcement
  useEffect(() => {
    if (isOpen && title) {
      const announcement = document.createElement('div')
      announcement.setAttribute('role', 'status')
      announcement.setAttribute('aria-live', 'polite')
      announcement.setAttribute('aria-atomic', 'true')
      announcement.className = 'sr-only'
      announcement.textContent = `Modal opened: ${title}`
      document.body.appendChild(announcement)
      
      setTimeout(() => {
        document.body.removeChild(announcement)
      }, 1000)

      return () => {
        if (document.body.contains(announcement)) {
          document.body.removeChild(announcement)
        }
      }
    }
  }, [isOpen, title])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  }

  const titleId = ariaLabelledBy || `modal-title-${Math.random().toString(36).substr(2, 9)}`
  const labelId = ariaLabel ? undefined : titleId

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={labelId}
        onClick={(e) => {
          // Close if clicking outside modal content
          if (closeOnOverlayClick && e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
        <div
          ref={modalRef}
          className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${sizeClasses[size]} ${className} transform transition-all`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              {title && (
                <h2
                  id={titleId}
                  className="text-xl font-semibold text-gray-900 dark:text-white"
                >
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export { Modal }
export default Modal
