import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { trackClick, getStoredAffiliateCode, storeAffiliateCode } from '../services/affiliateService.js'

const CODE_PATTERN = /^[A-Za-z0-9]{4,20}$/

function normalizeCode(raw) {
  if (!raw) return null
  const code = String(raw).trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  return CODE_PATTERN.test(code) ? code : null
}

/**
 * Captures ?ref= from URL, persists to localStorage (30-day TTL), and records a click once per session.
 * @param {'platform'|'simulator'} targetSystem
 */
export function useAffiliateTracking(targetSystem) {
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const refParam = normalizeCode(searchParams.get('ref'))
    if (refParam) {
      storeAffiliateCode(refParam, targetSystem)
    }

    const code = refParam || getStoredAffiliateCode()?.code
    if (!code) return

    const sessionKey = `affiliate-click-recorded:${targetSystem}`
    if (sessionStorage.getItem(sessionKey)) return

    trackClick(code, targetSystem, document.referrer || null, window.location.pathname)
      .then(() => {
        sessionStorage.setItem(sessionKey, '1')
      })
      .catch(() => {
        // silently ignore tracking failures
      })
  }, [searchParams, targetSystem])
}

export { getStoredAffiliateCode }
