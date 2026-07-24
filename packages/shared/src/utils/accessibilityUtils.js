/**
 * Accessibility Utilities
 * Helper functions for accessibility features (WCAG 2.1 AA compliance)
 */

/**
 * Trap focus within an element (for modals)
 */
export function trapFocus(element) {
  if (!element) return null

  const focusableElements = element.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )

  const firstFocusable = focusableElements[0]
  const lastFocusable = focusableElements[focusableElements.length - 1]

  const handleTabKey = (e) => {
    if (e.key !== 'Tab') return

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        e.preventDefault()
        lastFocusable?.focus()
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        e.preventDefault()
        firstFocusable?.focus()
      }
    }
  }

  element.addEventListener('keydown', handleTabKey)

  // Focus first element
  firstFocusable?.focus()

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleTabKey)
  }
}

/**
 * Restore focus to previous element
 */
let previousFocus = null

export function saveFocus() {
  previousFocus = document.activeElement
}

export function restoreFocus() {
  if (previousFocus && previousFocus.focus) {
    previousFocus.focus()
    previousFocus = null
  }
}

/**
 * Skip to main content link
 */
export function skipToContent() {
  const mainContent = document.getElementById('main-content') || document.querySelector('main')
  if (mainContent) {
    mainContent.focus()
    mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

/**
 * Manage focus order for complex components
 */
export function manageFocusOrder(container, order = 'vertical') {
  if (!container) return null

  const focusableElements = Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  )

  // Set tabindex based on order
  focusableElements.forEach((element, index) => {
    element.setAttribute('tabindex', index + 1)
  })

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    const currentIndex = focusableElements.indexOf(document.activeElement)
    let nextIndex = -1

    if (order === 'vertical') {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1
      }
    } else if (order === 'horizontal') {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1
      }
    }

    if (nextIndex >= 0) {
      focusableElements[nextIndex]?.focus()
    }
  }

  container.addEventListener('keydown', handleKeyDown)

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown)
    focusableElements.forEach(element => {
      element.removeAttribute('tabindex')
    })
  }
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(message, priority = 'polite') {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message

  document.body.appendChild(announcement)

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/**
 * Check if color contrast meets WCAG AA standards
 * @param {string} color1 - First color (hex)
 * @param {string} color2 - Second color (hex)
 * @param {string} size - Text size ('large' or 'normal')
 * @returns {boolean} - True if contrast meets WCAG AA
 */
export function checkColorContrast(color1, color2, size = 'normal') {
  const getLuminance = (hex) => {
    const rgb = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
    if (!rgb) return 0

    const r = parseInt(rgb[1], 16) / 255
    const g = parseInt(rgb[2], 16) / 255
    const b = parseInt(rgb[3], 16) / 255

    const [rLinear, gLinear, bLinear] = [r, g, b].map(val => {
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
    })

    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear
  }

  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)

  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  const contrast = (lighter + 0.05) / (darker + 0.05)

  // WCAG AA: 4.5:1 for normal text, 3:1 for large text
  const requiredContrast = size === 'large' ? 3 : 4.5

  return contrast >= requiredContrast
}

/**
 * Generate accessible ID for form labels
 */
let idCounter = 0
export function generateAccessibleId(prefix = 'accessible-id') {
  return `${prefix}-${++idCounter}`
}

/**
 * Get focusable elements in container
 */
export function getFocusableElements(container) {
  if (!container) return []

  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  )
}

/**
 * Focus first focusable element in container
 */
export function focusFirstElement(container) {
  const focusableElements = getFocusableElements(container)
  if (focusableElements.length > 0) {
    focusableElements[0].focus()
  }
}

/**
 * Focus last focusable element in container
 */
export function focusLastElement(container) {
  const focusableElements = getFocusableElements(container)
  if (focusableElements.length > 0) {
    focusableElements[focusableElements.length - 1].focus()
  }
}

