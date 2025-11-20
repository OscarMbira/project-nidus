/**
 * PWA Utilities
 * Helper functions for Progressive Web App features
 */

/**
 * Register service worker
 */
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      })
      console.log('Service Worker registered:', registration)
      return registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return null
    }
  }
  return null
}

/**
 * Check if app is installed
 */
export function isAppInstalled() {
  // Check if running in standalone mode (installed PWA)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true
  }
  
  // Check if running in standalone mode on iOS
  if (window.navigator.standalone === true) {
    return true
  }
  
  return false
}

/**
 * Check if browser supports PWA installation
 */
export function canInstallPWA() {
  // Check for beforeinstallprompt event support
  return 'onbeforeinstallprompt' in window
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  return false
}

/**
 * Check notification permission
 */
export function hasNotificationPermission() {
  if ('Notification' in window) {
    return Notification.permission === 'granted'
  }
  return false
}

/**
 * Show notification
 */
export function showNotification(title, options = {}) {
  if (hasNotificationPermission()) {
    const notification = new Notification(title, {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      ...options
    })
    
    notification.onclick = () => {
      window.focus()
      notification.close()
      if (options.url) {
        window.location.href = options.url
      }
    }
    
    return notification
  }
  return null
}

/**
 * Check if device is mobile
 */
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * Check if device is iOS
 */
export function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

/**
 * Check if online
 */
export function isOnline() {
  return navigator.onLine
}

/**
 * Get network status
 */
export function getNetworkStatus() {
  if ('connection' in navigator) {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    }
  }
  return null
}

/**
 * Add to home screen instructions (for iOS)
 */
export function getIOSInstallInstructions() {
  return {
    safari: 'Tap the Share button, then "Add to Home Screen"',
    chrome: 'Tap the menu button, then "Add to Home Screen"',
    firefox: 'Tap the menu button, then "Install"'
  }
}

