/**
 * BrandingSettings
 * PMO Admin page for configuring corporate branding.
 * Tabs: Identity | Logos & Images | Colour Palette | Typography
 * Right panel: Live preview (updates in real-time without saving).
 * Optimised: loading state, no-account handling with retry, memoized defaults, cancel-safe save/reset.
 */
import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Palette, Image, Type, User, Save, RotateCcw, Building2, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useBranding, applyBrandingToDOM } from '../../../context/BrandingContext'
import {
  saveBranding,
  resetBranding,
  getDefaultBranding,
} from '../../../services/brandingService'
import ColourPicker from '../../../components/branding/ColourPicker'
import LogoUpload from '../../../components/branding/LogoUpload'
import FontSelector from '../../../components/branding/FontSelector'
import BrandingPreview from '../../../components/branding/BrandingPreview'

const TABS = [
  { id: 'identity', label: 'Identity',        icon: User },
  { id: 'logos',    label: 'Logos & Images',  icon: Image },
  { id: 'colours',  label: 'Colour Palette',  icon: Palette },
  { id: 'typography', label: 'Typography',    icon: Type },
]

const COLOUR_FIELDS = [
  { key: 'primary_color',        label: 'Primary Colour',       description: 'Main highlight: buttons, active states', defaultVal: '#3B82F6', contrastAgainst: '#FFFFFF' },
  { key: 'secondary_color',      label: 'Secondary Colour',     description: 'Secondary actions and accents',           defaultVal: '#1E40AF', contrastAgainst: '#FFFFFF' },
  { key: 'accent_color',         label: 'Accent / Alert',       description: 'Warnings, badges, alerts',               defaultVal: '#F59E0B', contrastAgainst: '#FFFFFF' },
  { key: 'header_bg_color',      label: 'Header Background',    description: 'Top navigation bar background',          defaultVal: '#1F2937', contrastAgainst: '#FFFFFF' },
  { key: 'sidebar_bg_color',     label: 'Sidebar Background',   description: 'Left sidebar background colour',         defaultVal: '#111827', contrastAgainst: '#F9FAFB' },
  { key: 'sidebar_active_color', label: 'Sidebar Active Item',  description: 'Highlight for the active menu item',     defaultVal: '#3B82F6', contrastAgainst: '#FFFFFF' },
  { key: 'sidebar_text_color',   label: 'Sidebar Text',         description: 'Menu item text colour',                  defaultVal: '#F9FAFB', contrastAgainst: '#111827' },
  { key: 'button_color',         label: 'Button Colour',        description: 'Primary CTA button background',          defaultVal: '#3B82F6', contrastAgainst: '#FFFFFF' },
  { key: 'link_color',           label: 'Link Colour',          description: 'Hyperlink text colour',                  defaultVal: '#60A5FA', contrastAgainst: '#FFFFFF' },
]

const LOGO_SLOTS = [
  { assetType: 'primary_logo',  urlKey: 'primary_logo_url',  label: 'Header Logo',          description: 'Shown in the top navigation bar',     recommendedSize: '240×60px', maxSizeMB: 2 },
  { assetType: 'sidebar_logo',  urlKey: 'sidebar_logo_url',  label: 'Sidebar Logo',          description: 'Compact icon shown at top of sidebar', recommendedSize: '48×48px',  maxSizeMB: 1, accept: 'image/png,image/jpeg,image/webp' },
  { assetType: 'favicon',       urlKey: 'favicon_url',       label: 'Browser Favicon',       description: 'Icon shown in the browser tab',        recommendedSize: '32×32px',  maxSizeMB: 0.25, accept: 'image/png,image/x-icon,image/vnd.microsoft.icon' },
  { assetType: 'login_banner',  urlKey: 'login_banner_url',  label: 'Login / Landing Banner',description: 'Hero image on the login/landing page', recommendedSize: '1440×600px', maxSizeMB: 5 },
  { assetType: 'email_logo',    urlKey: 'email_logo_url',    label: 'Email Header Logo',     description: 'Used in system-generated emails',      recommendedSize: '200×50px', maxSizeMB: 1 },
  { assetType: 'report_cover',  urlKey: 'report_cover_url',  label: 'Report Cover Image',    description: 'Cover image for exported reports/PDFs', recommendedSize: 'A4 ratio', maxSizeMB: 5 },
]

export default function BrandingSettings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'identity'
  const [activeTab, setActiveTab] = useState(initialTab)

  const { branding: savedBranding, accountId, refreshBranding, isLoading } = useBranding()
  const defaults = useMemo(() => getDefaultBranding(), [])

  // Local form state (mirrors branding, but changes don't apply until Save)
  const [form, setForm]     = useState(() => ({ ...getDefaultBranding() }))
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError]   = useState(null)
  const saveTimeoutRef = useRef(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  // Sync tab from URL when it changes (e.g. back/forward)
  useEffect(() => {
    const tab = searchParams.get('tab') || 'identity'
    setActiveTab(tab)
  }, [searchParams])

  // Initialise form from saved branding once loaded
  useEffect(() => {
    if (savedBranding) setForm({ ...savedBranding })
  }, [savedBranding])

  // Sync tab to URL query param
  const switchTab = (tabId) => {
    setActiveTab(tabId)
    setSearchParams({ tab: tabId })
  }

  // Update a single form field and immediately preview
  const handleChange = (key, val) => {
    const updated = { ...form, [key]: val }
    setForm(updated)
    applyBrandingToDOM(updated) // live preview
  }

  const SAVE_TIMEOUT_MS = 20000

  const handleSave = async () => {
    if (!accountId) { setError('Unable to determine your account. Please refresh.'); return }
    setSaving(true)
    setError(null)
    // Normalise empty identity fields to null so app falls back to original (e.g. "Project Nidus")
    const toSave = {
      ...form,
      app_display_name: (form.app_display_name || '').trim() || null,
      app_tagline: (form.app_tagline || '').trim() || null,
    }
    try {
      const savePromise = saveBranding(toSave, accountId)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Save timed out. Please check your connection and try again.')), SAVE_TIMEOUT_MS)
      )
      await Promise.race([savePromise, timeoutPromise])
      if (!isMountedRef.current) return
      setSaveSuccess(true)
      refreshBranding()
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        saveTimeoutRef.current = null
        if (isMountedRef.current) setSaveSuccess(false)
      }, 2500)
    } catch (err) {
      if (isMountedRef.current) setError(err?.message || 'Save failed')
    } finally {
      if (isMountedRef.current) setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!window.confirm('Reset all branding to system defaults? This cannot be undone.')) return
    if (!accountId) return
    setResetting(true)
    setError(null)
    try {
      await resetBranding(accountId)
      if (!isMountedRef.current) return
      setForm({ ...defaults })
      applyBrandingToDOM(defaults)
      refreshBranding()
    } catch (err) {
      if (isMountedRef.current) setError(err?.message || 'Reset failed')
    } finally {
      if (isMountedRef.current) setResetting(false)
    }
  }

  // Loading: wait for context to resolve accountId and branding
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto mb-3" aria-hidden />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading branding settings…</p>
        </div>
      </div>
    )
  }

  // No account: user may not have an organisation/account yet
  if (!accountId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No organisation account</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Branding is tied to your organisation account. You may need to complete organisation setup first, or your role may not have access.
          </p>
          <button
            type="button"
            onClick={() => refreshBranding()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-500" />
            Branding &amp; Identity
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure your organisation's visual identity across the platform.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting || saving}
            aria-label={resetting ? 'Resetting branding' : 'Reset to defaults'}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {resetting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RotateCcw className="h-4 w-4" />}
            Reset to Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || resetting}
            aria-label={saving ? 'Saving' : saveSuccess ? 'Saved' : 'Save changes'}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: form.primary_color || '#3B82F6' }}
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Saving…</>
            ) : saveSuccess ? (
              <><CheckCircle className="h-4 w-4" />Saved!</>
            ) : (
              <><Save className="h-4 w-4" />Save Changes</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-start justify-between gap-2">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="shrink-0 text-red-600 dark:text-red-400 hover:underline" aria-label="Dismiss error">Dismiss</button>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left: Tabs + Form */}
        <div className="flex-1 min-w-0">
          {/* Tab navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex gap-6 overflow-x-auto">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => switchTab(id)}
                  className={`flex items-center gap-2 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* ── Identity Tab ── */}
          {activeTab === 'identity' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  App Display Name
                  <span className="ml-2 text-xs text-gray-400">({(form.app_display_name || '').length}/100)</span>
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={form.app_display_name || ''}
                  onChange={(e) => handleChange('app_display_name', e.target.value)}
                  placeholder="e.g. Acme PMO Portal"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Shown in the browser tab and header. Leave blank to use "Project Nidus".</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tagline
                  <span className="ml-2 text-xs text-gray-400">({(form.app_tagline || '').length}/200)</span>
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={form.app_tagline || ''}
                  onChange={(e) => handleChange('app_tagline', e.target.value)}
                  placeholder="e.g. Project Management Office"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Subtitle shown beneath the logo in the header.</p>
              </div>
            </div>
          )}

          {/* ── Logos & Images Tab ── */}
          {activeTab === 'logos' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {LOGO_SLOTS.map((slot) => (
                <LogoUpload
                  key={slot.assetType}
                  {...slot}
                  currentUrl={form[slot.urlKey]}
                  accountId={accountId}
                  onUploaded={(url) => handleChange(slot.urlKey, url)}
                  onDeleted={() => handleChange(slot.urlKey, null)}
                />
              ))}
            </div>
          )}

          {/* ── Colour Palette Tab ── */}
          {activeTab === 'colours' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Click the colour swatch or enter a hex value. Changes are previewed live on the right.
                A warning is shown if the colour combination fails WCAG AA contrast (4.5:1 ratio).
              </p>
              {COLOUR_FIELDS.map((field) => (
                <ColourPicker
                  key={field.key}
                  label={field.label}
                  description={field.description}
                  value={form[field.key]}
                  defaultValue={field.defaultVal}
                  contrastAgainst={field.contrastAgainst}
                  onChange={(hex) => handleChange(field.key, hex)}
                />
              ))}
            </div>
          )}

          {/* ── Typography Tab ── */}
          {activeTab === 'typography' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
              <FontSelector
                value={form.font_family || 'inter'}
                onChange={(font) => handleChange('font_family', font)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Base font size
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  System-wide base font size. All text that uses rem units will scale with this setting.
                </p>
                <select
                  value={form.base_font_size || 'medium'}
                  onChange={(e) => handleChange('base_font_size', e.target.value)}
                  className="w-full max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="small">Small (14px)</option>
                  <option value="medium">Medium (16px)</option>
                  <option value="large">Large (18px)</option>
                  <option value="x-large">Extra large (20px)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Preview */}
        <div className="xl:w-72 flex-shrink-0">
          <div className="sticky top-24">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Live Preview
            </p>
            <BrandingPreview branding={form} />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
              Preview updates in real-time. Click Save to apply.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
