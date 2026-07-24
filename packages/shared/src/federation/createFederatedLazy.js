import { lazy } from 'react'

/**
 * Lazy-load a federated module route with bundled fallback when federation is off or fails.
 * @param {string} federationName e.g. 'planning_hub'
 * @param {() => Promise<{ default: React.ComponentType }>} fallbackFactory
 * @param {Record<string, string | undefined>} moduleConfig
 */
export function createFederatedLazy(federationName, fallbackFactory, moduleConfig) {
  return lazy(async () => {
    const federationEnabled = import.meta.env.VITE_FEDERATION_ENABLED === 'true'
    const remoteUrl = moduleConfig[federationName]

    if (!federationEnabled || !remoteUrl) {
      return fallbackFactory()
    }

    try {
      const mod = await import(/* @vite-ignore */ `${federationName}/routes`)
      return mod
    } catch (err) {
      console.warn(`[federation] ${federationName} remote failed, using bundled fallback`, err)
      return fallbackFactory()
    }
  })
}
