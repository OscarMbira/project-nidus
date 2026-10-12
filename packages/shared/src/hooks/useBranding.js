/**
 * v1240 — Branding context object and reader, shared by every app and by packages/ui.
 *
 * The provider (BrandingProvider: loads the organisation's branding and applies it to the DOM)
 * stays in each app (apps/{platform,simulator}/src/lib/BrandingContext.jsx) because it calls the app's
 * brandingService. Without a provider, useBranding() returns the default branding.
 */
import { createContext, useContext } from 'react'
import { getDefaultBranding } from '../utils/brandingDefaults.js'

export const BrandingContext = createContext(null)

export function useBranding() {
  const ctx = useContext(BrandingContext)
  if (!ctx) return { branding: getDefaultBranding(), isLoading: false, accountId: null, refreshBranding: () => {} }
  return ctx
}
