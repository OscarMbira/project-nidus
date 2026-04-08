/**
 * PWA Utility Functions
 * Provides helpers for Progressive Web App installation and detection
 */

/**
 * Check if the app can be installed as a PWA
 * @returns {boolean}
 */
export function canInstallPWA() {
  // Check if the app is running in a browser that supports PWA installation
  return !isAppInstalled() && (
    'BeforeInstallPromptEvent' in window ||
    isIOSDevice()
  )
}

/**
 * Check if the app is already installed
 * @returns {boolean}
 */
export function isAppInstalled() {
  // Check if running in standalone mode (app is installed)
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  )
}

/**
 * Check if the device is iOS
 * @returns {boolean}
 */
export function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

/**
 * Check if the device is Android
 * @returns {boolean}
 */
export function isAndroidDevice() {
  return /Android/.test(navigator.userAgent)
}

/**
 * Get iOS-specific installation instructions
 * @returns {object}
 */
export function getIOSInstallInstructions() {
  return {
    safari: 'Tap the Share button and select "Add to Home Screen"',
    chrome: 'iOS requires Safari browser to install this app'
  }
}

/**
 * Get Android-specific installation instructions
 * @returns {object}
 */
export function getAndroidInstallInstructions() {
  return {
    chrome: 'Tap the menu button and select "Install app" or "Add to Home screen"',
    firefox: 'Tap the menu button and select "Install"',
    edge: 'Tap the menu button and select "Add to phone"'
  }
}

/**
 * Service worker registration is handled by `vite-plugin-pwa` (`injectRegister: 'auto'`).
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      return await navigator.serviceWorker.getRegistration()
    } catch {
      return null
    }
  }
  return null
}

/**
 * Unregister service worker
 * @returns {Promise<boolean>}
 */
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        const success = await registration.unregister()
        console.log('Service Worker unregistered:', success)
        return success
      }
    } catch (error) {
      console.error('Service Worker unregistration failed:', error)
    }
  }
  return false
}

/**
 * Check if service worker is registered
 * @returns {Promise<boolean>}
 */
export async function isServiceWorkerRegistered() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      return !!registration
    } catch (error) {
      console.error('Error checking service worker registration:', error)
    }
  }
  return false
}

/**
 * Request notification permission
 * @returns {Promise<NotificationPermission>}
 */
export async function requestNotificationPermission() {
  if ('Notification' in window) {
    try {
      const permission = await Notification.requestPermission()
      return permission
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return 'denied'
    }
  }
  return 'denied'
}

/**
 * Check if notifications are supported and permitted
 * @returns {boolean}
 */
export function canShowNotifications() {
  return 'Notification' in window && Notification.permission === 'granted'
}
