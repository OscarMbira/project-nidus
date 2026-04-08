/**
 * BrandingContext
 * Loads the organisation's branding from the DB and injects
 * CSS custom properties into document.documentElement so the
 * entire app can consume brand colours, fonts, and identity
 * at runtime without rebuilding Tailwind.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { platformDb } from '../services/supabaseClient'
import { getBranding, getDefaultBranding } from '../services/brandingService'

const BrandingContext = createContext(null)

// Font stacks keyed by the font_family DB value
const FONT_STACKS = {
  system:       '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  inter:        '"Inter", sans-serif',
  roboto:       '"Roboto", sans-serif',
  'open-sans':  '"Open Sans", sans-serif',
  lato:         '"Lato", sans-serif',
  poppins:      '"Poppins", sans-serif',
  nunito:       '"Nunito", sans-serif',
  'source-sans':'\"Source Sans 3\", sans-serif',
}

// Google Fonts import URLs (null = no external font needed)
const FONT_URLS = {
  system:       null,
  inter:        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  roboto:       'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  'open-sans':  'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap',
  lato:         'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap',
  poppins:      'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  nunito:       'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap',
  'source-sans':'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap',
}

// ─────────────────────────────────────────────────────────────
// Inject CSS custom properties into :root AND inject a
// <style> tag that maps brand values to every Tailwind blue/
// indigo class used across the app — so ALL components pick
// up the brand without requiring any per-component changes.
// ─────────────────────────────────────────────────────────────
function applyBrandingToDOM(branding) {
  const root = document.documentElement

  const set = (varName, value) => {
    if (value) root.style.setProperty(varName, value)
  }

  set('--brand-primary',        branding.primary_color)
  set('--brand-secondary',      branding.secondary_color)
  set('--brand-accent',         branding.accent_color)
  set('--brand-header-bg',      branding.header_bg_color)
  set('--brand-sidebar-bg',     branding.sidebar_bg_color)
  set('--brand-sidebar-active', branding.sidebar_active_color)
  set('--brand-sidebar-text',   branding.sidebar_text_color)
  set('--brand-button',         branding.button_color)
  set('--brand-link',           branding.link_color)

  // Font family
  const fontKey   = branding.font_family || 'inter'
  const fontStack = FONT_STACKS[fontKey] || FONT_STACKS.inter
  root.style.setProperty('--brand-font', fontStack)
  document.body.style.fontFamily = fontStack
  injectGoogleFont(fontKey)

  // System-wide base font size (:root so all rem units scale)
  const sizeMap = { small: '14px', medium: '16px', large: '18px', 'x-large': '20px' }
  const baseSize = sizeMap[branding.base_font_size] || sizeMap.medium
  root.style.setProperty('--brand-base-font-size', baseSize)
  root.style.fontSize = baseSize

  // Browser title: use custom name or fall back to original app name
  document.title = (branding.app_display_name && branding.app_display_name.trim()) ? branding.app_display_name.trim() : 'Project Nidus'

  // Favicon
  if (branding.favicon_url) {
    let link = document.querySelector("link[rel~='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = branding.favicon_url
  }

  // PWA theme-color meta
  if (branding.primary_color) {
    let meta = document.querySelector("meta[name='theme-color']")
    if (meta) meta.setAttribute('content', branding.primary_color)
  }

  // ── Global Tailwind class overrides ──────────────────────────
  // Tailwind utility classes are compiled at build time, so they
  // cannot reference runtime CSS variables directly. We inject a
  // <style> tag that remaps every blue/indigo Tailwind class used
  // across the app to the brand colours set above.
  injectBrandOverrides(branding)
}

/**
 * Inject (or replace) a <style id="nidus-brand-overrides"> tag
 * that overrides Tailwind blue/indigo classes with brand values.
 * Using !important ensures it wins over compiled Tailwind styles.
 */
function injectBrandOverrides(branding) {
  const btn     = branding.button_color        || branding.primary_color || '#3B82F6'
  const primary = branding.primary_color       || '#3B82F6'
  const link    = branding.link_color          || '#60A5FA'
  const secondary = branding.secondary_color   || '#1E40AF'

  // Produce a slightly darker shade for hover states (10% opacity overlay)
  // by appending a low-alpha version of the same colour
  const css = `
/* ── Nidus brand overrides – auto-generated by BrandingContext ── */

/* ---------- Backgrounds: buttons & primary fills ---------- */
.bg-blue-600,
.bg-blue-700 { background-color: ${btn} !important; }

.hover\\:bg-blue-600:hover,
.hover\\:bg-blue-700:hover { background-color: ${btn} !important; filter: brightness(0.92); }

.bg-purple-600,
.bg-purple-700,
.bg-purple-500 { background-color: ${btn} !important; }

.hover\\:bg-purple-600:hover,
.hover\\:bg-purple-700:hover { background-color: ${btn} !important; filter: brightness(0.92); }

.bg-violet-600,
.bg-violet-700 { background-color: ${btn} !important; }
.hover\\:bg-violet-600:hover,
.hover\\:bg-violet-700:hover { background-color: ${btn} !important; filter: brightness(0.92); }

.bg-blue-500 { background-color: ${primary} !important; }
.hover\\:bg-blue-500:hover { background-color: ${primary} !important; filter: brightness(0.92); }

/* Indigo variants used in some components */
.bg-indigo-600,
.bg-indigo-700 { background-color: ${btn} !important; }
.hover\\:bg-indigo-600:hover,
.hover\\:bg-indigo-700:hover { background-color: ${btn} !important; filter: brightness(0.92); }

/* ---------- Text colours ---------- */
.text-blue-600,
.text-blue-700,
.text-blue-300 { color: ${primary} !important; }
.text-blue-500 { color: ${primary} !important; }
.text-blue-400 { color: ${link} !important; }
.text-indigo-600 { color: ${primary} !important; }
.text-purple-400,
.text-purple-300,
.text-purple-200,
.text-purple-100 { color: ${primary} !important; }
.text-purple-600,
.text-purple-700,
.text-purple-800 { color: ${primary} !important; }
.text-violet-400,
.text-violet-600 { color: ${primary} !important; }

/* ---------- Border colours ---------- */
.border-blue-500,
.border-blue-600 { border-color: ${primary} !important; }
.border-indigo-500,
.border-indigo-600 { border-color: ${primary} !important; }
.border-purple-400,
.border-purple-500 { border-color: ${primary} !important; }
.border-purple-200,
.border-purple-300,
.border-purple-700,
.border-purple-800 { border-color: ${primary} !important; }
.border-indigo-200,
.border-indigo-800 { border-color: ${primary} !important; }

/* ---------- Focus rings (form inputs, buttons) ---------- */
.focus\\:ring-blue-500:focus,
.focus\\:ring-blue-600:focus { --tw-ring-color: ${primary} !important; }
.focus\\:ring-purple-500:focus { --tw-ring-color: ${primary} !important; }
.focus\\:ring-indigo-500:focus { --tw-ring-color: ${primary} !important; }
.focus\\:border-blue-500:focus,
.focus\\:border-blue-300:focus { border-color: ${primary} !important; }
.focus-within\\:ring-blue-500:focus-within { --tw-ring-color: ${primary} !important; }

/* ---------- Active tab indicator (border-b-2 border-blue-500) ---------- */
.border-b-2.border-blue-500 { border-bottom-color: ${primary} !important; }

/* ---------- Light tinted backgrounds (badges, info panels) ---------- */
.bg-blue-50  { background-color: ${primary}18 !important; }
.bg-blue-100 { background-color: ${primary}28 !important; }
.bg-blue-900\\/30 { background-color: ${primary}4D !important; }
.bg-blue-900\\/40 { background-color: ${primary}66 !important; }
.dark .bg-blue-900\\/20 { background-color: ${primary}33 !important; }
.bg-purple-50 { background-color: ${primary}18 !important; }
.bg-purple-100 { background-color: ${primary}28 !important; }
.bg-purple-900\\/20 { background-color: ${primary}33 !important; }
.bg-purple-900\\/30 { background-color: ${primary}4D !important; }
.bg-purple-900\\/40 { background-color: ${primary}66 !important; }
.bg-indigo-50 { background-color: ${primary}18 !important; }
.bg-indigo-100 { background-color: ${primary}28 !important; }
.dark .bg-indigo-900\\/20 { background-color: ${primary}33 !important; }
.dark .bg-indigo-900\\/30 { background-color: ${primary}4D !important; }

/* ---------- Secondary colour ---------- */
.bg-blue-800,
.bg-blue-900 { background-color: ${secondary} !important; }
.text-blue-800,
.text-blue-900 { color: ${secondary} !important; }

/* ---------- React Calendar active tile ---------- */
.react-calendar__tile--active { background: ${btn} !important; }
.react-calendar__tile--active:enabled:hover,
.react-calendar__tile--active:enabled:focus { background: ${btn} !important; filter: brightness(0.92); }

/* ---------- Skip-to-content link ---------- */
.skip-to-content { background: ${btn} !important; }
`

  let el = document.getElementById('nidus-brand-overrides')
  if (!el) {
    el = document.createElement('style')
    el.id = 'nidus-brand-overrides'
    document.head.appendChild(el)
  }
  el.textContent = css
}

// Inject a Google Fonts <link> tag (idempotent – won't add duplicates)
function injectGoogleFont(fontKey) {
  const url = FONT_URLS[fontKey]
  if (!url) return
  const existingId = `gfont-${fontKey}`
  if (document.getElementById(existingId)) return
  const link = document.createElement('link')
  link.id   = existingId
  link.rel  = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
}

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────
export function BrandingProvider({ children }) {
  const [branding, setBranding]   = useState(getDefaultBranding())
  const [isLoading, setIsLoading] = useState(true)
  const [accountId, setAccountId] = useState(null)

  // Step 1: get current user's accountId (same resolution as fundingSourceService: owner → project owner → project member)
  useEffect(() => {
    async function loadAccount() {
      try {
        const { data: { user } } = await platformDb.auth.getUser()
        if (!user) { setIsLoading(false); return }

        // Resolve internal users.id from auth_user_id
        const { data: userRow } = await platformDb
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle()

        if (!userRow?.id) { setIsLoading(false); return }

        // 1) Account where user is owner
        const { data: accountRow, error: accountError } = await platformDb
          .from('accounts')
          .select('id')
          .eq('owner_user_id', userRow.id)
          .eq('is_deleted', false)
          .maybeSingle()
        if (!accountError && accountRow?.id) {
          setAccountId(accountRow.id)
          return
        }

        // 2) Any project owned by user → use that project's account_id
        const { data: projAsOwner } = await platformDb
          .from('projects')
          .select('account_id')
          .eq('owner_user_id', userRow.id)
          .not('account_id', 'is', null)
          .eq('is_deleted', false)
          .limit(1)
          .maybeSingle()
        if (projAsOwner?.account_id) {
          setAccountId(projAsOwner.account_id)
          return
        }

        // 3) Any project where user is member (user_projects) → use that project's account_id
        const { data: memberRows } = await platformDb
          .from('user_projects')
          .select('project_id')
          .eq('user_id', userRow.id)
          .eq('is_deleted', false)
          .limit(5)
        if (memberRows?.length) {
          const projectIds = memberRows.map((r) => r.project_id)
          const { data: proj } = await platformDb
            .from('projects')
            .select('account_id')
            .in('id', projectIds)
            .not('account_id', 'is', null)
            .eq('is_deleted', false)
            .limit(1)
            .maybeSingle()
          if (proj?.account_id) {
            setAccountId(proj.account_id)
            return
          }
        }

        setAccountId(null)
      } catch (err) {
        console.error('[BrandingContext] loadAccount error:', err)
        setAccountId(null)
      } finally {
        setIsLoading(false)
      }
    }
    loadAccount()
  }, [])

  // Step 2: once we have accountId, fetch branding
  const loadBranding = useCallback(async () => {
    if (!accountId) { setIsLoading(false); return }
    try {
      setIsLoading(true)
      const data = await getBranding(accountId)
      setBranding(data)
      applyBrandingToDOM(data)
    } catch (err) {
      console.error('[BrandingContext] loadBranding error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    loadBranding()
  }, [loadBranding])

  // Apply defaults to DOM on first mount so CSS variables + overrides
  // are set before the DB branding record is fetched (prevents flash)
  useEffect(() => {
    applyBrandingToDOM(getDefaultBranding())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const refreshBranding = useCallback(() => loadBranding(), [loadBranding])

  return (
    <BrandingContext.Provider value={{ branding, isLoading, accountId, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  )
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────
export function useBranding() {
  const ctx = useContext(BrandingContext)
  // Graceful fallback: if used outside provider, return defaults
  if (!ctx) return { branding: getDefaultBranding(), isLoading: false, accountId: null, refreshBranding: () => {} }
  return ctx
}

// Export applyBrandingToDOM for use in BrandingSettings preview
export { applyBrandingToDOM }
