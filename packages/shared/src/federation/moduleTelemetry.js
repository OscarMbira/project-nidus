const STORAGE_KEY = 'nidus_module_load_telemetry'

/**
 * Log which module version loaded (persisted in sessionStorage for debugging).
 * @param {{ name: string, version?: string, source: 'remote' | 'fallback' }} entry
 */
export function logModuleLoad(entry) {
  try {
    const existing = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]')
    existing.push({ ...entry, loadedAt: new Date().toISOString() })
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(-50)))
  } catch {
    // ignore storage errors
  }
  if (import.meta.env.DEV) {
    console.info(`[module-telemetry] ${entry.name} v${entry.version || '?'} (${entry.source})`)
  }
}

export function getModuleLoadTelemetry() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}
