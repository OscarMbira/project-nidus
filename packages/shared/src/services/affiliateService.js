import { createClient } from '@supabase/supabase-js'

const STORAGE_KEY = 'nidus-affiliate-ref'
const CLICK_ID_KEY = 'nidus-affiliate-click-id'
const TTL_MS = 30 * 24 * 60 * 60 * 1000

let platformClient = null
let adminClient = null

function getPlatformClient() {
  if (platformClient) return platformClient
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  platformClient = createClient(url, key, { db: { schema: 'public' } })
  return platformClient
}

function getAdminClient() {
  if (adminClient) return adminClient
  const url = import.meta.env.VITE_ADMIN_SUPABASE_URL
  const key = import.meta.env.VITE_ADMIN_ANON_KEY
  if (!url || !key) return null
  adminClient = createClient(url, key, { db: { schema: 'admin' } })
  return adminClient
}

export function storeAffiliateCode(code, targetSystem) {
  if (!code) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    code,
    targetSystem,
    timestamp: Date.now(),
  }))
}

export function getStoredAffiliateCode() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.code || !parsed?.timestamp) return null
    if (Date.now() - parsed.timestamp > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function clearStoredAffiliate() {
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(CLICK_ID_KEY)
}

export async function trackClick(code, targetSystem, referralUrl, landingPath) {
  const db = getPlatformClient()
  if (!db) return null

  const sessionId = crypto.randomUUID?.() || String(Date.now())
  const { data, error } = await db.rpc('track_affiliate_click', {
    p_code: code,
    p_target_system: targetSystem,
    p_referral_url: referralUrl,
    p_landing_path: landingPath,
    p_session_id: sessionId,
  })

  if (error) throw error
  if (data) sessionStorage.setItem(CLICK_ID_KEY, data)
  return data
}

export async function recordSignupConversion(userId, targetSystem) {
  const stored = getStoredAffiliateCode()
  if (!stored?.code) return null

  const db = getPlatformClient()
  if (!db) return null

  const clickId = sessionStorage.getItem(CLICK_ID_KEY) || null
  const { data, error } = await db.rpc('record_affiliate_conversion', {
    p_affiliate_code: stored.code,
    p_click_id: clickId,
    p_user_id: userId,
    p_target_system: targetSystem,
    p_conversion_type: 'signup',
  })

  if (error) throw error
  clearStoredAffiliate()
  return data
}

export async function submitAffiliateApplication(data) {
  const db = getAdminClient()
  if (!db) {
    throw new Error('Affiliate applications are not configured. Missing VITE_ADMIN_SUPABASE_URL / VITE_ADMIN_ANON_KEY.')
  }

  const { data: result, error } = await db.rpc('apply_as_affiliate', {
    p_name: data.name,
    p_email: data.email,
    p_phone: data.phone || null,
    p_website: data.website || null,
    p_target_system: data.target_system || 'platform',
    p_notes: data.notes || null,
  })

  if (error) throw error
  return result
}
