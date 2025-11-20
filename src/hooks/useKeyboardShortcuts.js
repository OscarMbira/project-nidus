/**
 * useKeyboardShortcuts Hook
 * Manages keyboard shortcuts for the application
 */

import { useEffect, useCallback } from 'react'

const shortcuts = new Map()
const shortcutsByKey = new Map()

/**
 * Register a keyboard shortcut
 * @param {string} key - Key combination (e.g., 'ctrl+k', 'alt+s', '/')
 * @param {function} handler - Handler function
 * @param {object} options - Options (preventDefault, stopPropagation, enabled)
 */
export function registerShortcut(key, handler, options = {}) {
  const {
    preventDefault = true,
    stopPropagation = false,
    enabled = true,
    description = ''
  } = options

  if (!enabled) {
    unregisterShortcut(key)
    return
  }

  shortcuts.set(key, {
    handler,
    preventDefault,
    stopPropagation,
    description
  })

  // Index by key for quick lookup
  const normalizedKey = normalizeKey(key)
  if (!shortcutsByKey.has(normalizedKey)) {
    shortcutsByKey.set(normalizedKey, [])
  }
  shortcutsByKey.get(normalizedKey).push(key)
}

/**
 * Unregister a keyboard shortcut
 */
export function unregisterShortcut(key) {
  shortcuts.delete(key)
  
  const normalizedKey = normalizeKey(key)
  if (shortcutsByKey.has(normalizedKey)) {
    const keys = shortcutsByKey.get(normalizedKey)
    const index = keys.indexOf(key)
    if (index > -1) {
      keys.splice(index, 1)
    }
    if (keys.length === 0) {
      shortcutsByKey.delete(normalizedKey)
    }
  }
}

/**
 * Normalize key combination for lookup
 */
function normalizeKey(key) {
  const parts = key.toLowerCase().split('+').map(s => s.trim())
  const normalized = []
  
  if (parts.includes('ctrl') || parts.includes('cmd')) {
    normalized.push('ctrl')
  }
  if (parts.includes('shift')) {
    normalized.push('shift')
  }
  if (parts.includes('alt')) {
    normalized.push('alt')
  }
  if (parts.includes('meta')) {
    normalized.push('meta')
  }
  
  // Get the actual key (last part)
  const actualKey = parts[parts.length - 1]
  normalized.push(actualKey)
  
  return normalized.join('+')
}

/**
 * Handle keyboard event
 */
function handleKeyDown(e) {
  // Ignore if typing in input/textarea/contenteditable
  if (
    e.target.tagName === 'INPUT' ||
    e.target.tagName === 'TEXTAREA' ||
    e.target.contentEditable === 'true'
  ) {
    // Allow some shortcuts even when typing (like Escape)
    if (e.key !== 'Escape' && e.key !== 'Enter' && e.key !== 'Tab') {
      return
    }
  }

  const key = buildKeyString(e)
  const normalizedKey = normalizeKey(key)

  // Find matching shortcuts
  const matchingKeys = shortcutsByKey.get(normalizedKey) || []
  
  for (const shortcutKey of matchingKeys) {
    const shortcut = shortcuts.get(shortcutKey)
    if (!shortcut) continue

    // Check if modifiers match
    const parts = shortcutKey.toLowerCase().split('+').map(s => s.trim())
    const needsCtrl = parts.includes('ctrl') || parts.includes('cmd')
    const needsShift = parts.includes('shift')
    const needsAlt = parts.includes('alt')
    const needsMeta = parts.includes('meta')

    const hasCtrl = e.ctrlKey || e.metaKey // Treat Cmd as Ctrl on Mac
    const hasShift = e.shiftKey
    const hasAlt = e.altKey
    const hasMeta = e.metaKey

    if (
      (needsCtrl === hasCtrl || (!needsCtrl && !hasCtrl)) &&
      (needsShift === hasShift) &&
      (needsAlt === hasAlt) &&
      (needsMeta === hasMeta)
    ) {
      if (shortcut.preventDefault) {
        e.preventDefault()
      }
      if (shortcut.stopPropagation) {
        e.stopPropagation()
      }
      shortcut.handler(e)
      break // Only handle first matching shortcut
    }
  }
}

/**
 * Build key string from event
 */
function buildKeyString(e) {
  const parts = []
  
  if (e.ctrlKey) parts.push('ctrl')
  if (e.shiftKey) parts.push('shift')
  if (e.altKey) parts.push('alt')
  if (e.metaKey) parts.push('meta')
  
  let key = e.key.toLowerCase()
  
  // Map special keys
  const keyMap = {
    ' ': 'space',
    'arrowup': 'up',
    'arrowdown': 'down',
    'arrowleft': 'left',
    'arrowright': 'right',
    'escape': 'escape',
    'enter': 'enter',
    'tab': 'tab',
    'delete': 'delete',
    'backspace': 'backspace'
  }
  
  key = keyMap[key] || key
  
  parts.push(key)
  
  return parts.join('+')
}

// Global keyboard event listener
let isListenerAttached = false

function attachListener() {
  if (!isListenerAttached) {
    document.addEventListener('keydown', handleKeyDown)
    isListenerAttached = true
  }
}

function detachListener() {
  if (isListenerAttached) {
    document.removeEventListener('keydown', handleKeyDown)
    isListenerAttached = false
  }
}

// Attach listener on first shortcut registration
if (shortcuts.size === 0) {
  attachListener()
}

/**
 * React hook for keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcutConfig = []) {
  useEffect(() => {
    // Register shortcuts from config
    shortcutConfig.forEach(({ key, handler, options }) => {
      registerShortcut(key, handler, options)
    })

    // Cleanup on unmount
    return () => {
      shortcutConfig.forEach(({ key }) => {
        unregisterShortcut(key)
      })
    }
  }, [shortcutConfig])

  // Return functions for manual registration
  return {
    registerShortcut: useCallback((key, handler, options) => {
      registerShortcut(key, handler, options)
      return () => unregisterShortcut(key)
    }, []),
    unregisterShortcut: useCallback(unregisterShortcut, [])
  }
}

/**
 * Get all registered shortcuts
 */
export function getRegisteredShortcuts() {
  const result = []
  shortcuts.forEach((config, key) => {
    result.push({
      key,
      description: config.description || ''
    })
  })
  return result
}

/**
 * Get shortcuts help text
 */
export function getShortcutsHelp() {
  const shortcuts = getRegisteredShortcuts()
  
  const grouped = {
    navigation: [],
    actions: [],
    general: []
  }

  shortcuts.forEach(({ key, description }) => {
    const lowerKey = key.toLowerCase()
    if (lowerKey.includes('arrow') || lowerKey.includes('escape') || lowerKey.includes('tab')) {
      grouped.navigation.push({ key, description })
    } else if (lowerKey.includes('ctrl') || lowerKey.includes('cmd')) {
      grouped.actions.push({ key, description })
    } else {
      grouped.general.push({ key, description })
    }
  })

  return grouped
}

