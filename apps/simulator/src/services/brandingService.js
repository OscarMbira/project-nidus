/**
 * Branding Service
 * Handles CRUD operations for organisation_branding and
 * asset uploads to the organisation-branding storage bucket.
 */
import { platformDb } from './supabaseClient'

const TABLE = 'organisation_branding'
const BUCKET = 'organisation-branding'

// ─────────────────────────────────────────────────────────────
// Default system branding (used as fallback when no DB record)
// ─────────────────────────────────────────────────────────────
export function getDefaultBranding() {
  return {
    app_display_name:   null,
    app_tagline:        null,
    primary_logo_url:   null,
    sidebar_logo_url:   null,
    favicon_url:        null,
    login_banner_url:   null,
    email_logo_url:     null,
    report_cover_url:   null,
    primary_color:      '#3B82F6',
    secondary_color:    '#1E40AF',
    accent_color:       '#F59E0B',
    header_bg_color:    '#1F2937',
    sidebar_bg_color:   '#111827',
    sidebar_active_color: '#3B82F6',
    sidebar_text_color: '#F9FAFB',
    button_color:       '#3B82F6',
    link_color:         '#60A5FA',
    font_family:        'inter',
    base_font_size:     'medium',  // small | medium | large | x-large (system-wide :root font-size)
  }
}

// ─────────────────────────────────────────────────────────────
// Fetch branding for an account (returns defaults if none set)
// ─────────────────────────────────────────────────────────────
export async function getBranding(accountId) {
  if (!accountId) return getDefaultBranding()

  const { data, error } = await platformDb
    .from(TABLE)
    .select('*')
    .eq('account_id', accountId)
    .eq('is_deleted', false)
    .maybeSingle()

  if (error) {
    console.error('[brandingService] getBranding error:', error)
    return getDefaultBranding()
  }

  if (!data) return getDefaultBranding()

  // Merge with defaults so any null column falls back to default value
  return { ...getDefaultBranding(), ...data }
}

// ─────────────────────────────────────────────────────────────
// Upsert branding record (create first time, update thereafter)
// ─────────────────────────────────────────────────────────────
export async function saveBranding(data, accountId) {
  if (!accountId) throw new Error('accountId is required')

  // Only send user-editable branding fields — never send DB-managed metadata
  const EDITABLE_FIELDS = [
    'app_display_name', 'app_tagline',
    'primary_logo_url', 'sidebar_logo_url', 'favicon_url',
    'login_banner_url', 'email_logo_url', 'report_cover_url',
    'primary_color', 'secondary_color', 'accent_color',
    'header_bg_color', 'sidebar_bg_color', 'sidebar_active_color',
    'sidebar_text_color', 'button_color', 'link_color',
    'font_family', 'base_font_size',
  ]

  const payload = { account_id: accountId }
  EDITABLE_FIELDS.forEach((key) => {
    if (!(key in data)) return
    let val = data[key] ?? null
    // Store null for empty identity fields so app falls back to original (e.g. "Project Nidus")
    if ((key === 'app_display_name' || key === 'app_tagline') && typeof val === 'string' && !val.trim()) val = null
    payload[key] = val
  })

  const { data: result, error } = await platformDb
    .from(TABLE)
    .upsert(payload, { onConflict: 'account_id' })
    .select()
    .single()

  if (error) throw error
  return result
}

// ─────────────────────────────────────────────────────────────
// Reset branding to system defaults
// ─────────────────────────────────────────────────────────────
export async function resetBranding(accountId) {
  if (!accountId) throw new Error('accountId is required')

  const defaults = getDefaultBranding()
  // Null out all image URLs and colour overrides
  const resetPayload = Object.fromEntries(
    Object.entries(defaults).map(([k, v]) => [k, v])
  )
  resetPayload.account_id = accountId
  resetPayload.is_deleted = false

  const { data, error } = await platformDb
    .from(TABLE)
    .upsert(resetPayload, { onConflict: 'account_id' })
    .select()
    .single()

  if (error) throw error
  return data
}

// ─────────────────────────────────────────────────────────────
// Upload a branding asset to Supabase Storage
// assetType: 'primary_logo' | 'sidebar_logo' | 'favicon' |
//            'login_banner' | 'email_logo' | 'report_cover'
// Returns the public URL of the uploaded file.
// ─────────────────────────────────────────────────────────────
export async function uploadBrandingAsset(file, accountId, assetType) {
  if (!file || !accountId || !assetType) throw new Error('file, accountId, and assetType are required')

  const ext = file.name.split('.').pop().toLowerCase()
  const path = `${accountId}/${assetType}.${ext}`

  // Remove old file at same path if it exists (upsert behaviour)
  await platformDb.storage.from(BUCKET).remove([path])

  const { error: uploadError } = await platformDb.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    })

  if (uploadError) throw uploadError

  const { data: urlData } = platformDb.storage.from(BUCKET).getPublicUrl(path)
  return urlData.publicUrl
}

// ─────────────────────────────────────────────────────────────
// Delete a branding asset from Storage and clear the DB column
// ─────────────────────────────────────────────────────────────
export async function deleteBrandingAsset(accountId, assetType) {
  if (!accountId || !assetType) throw new Error('accountId and assetType are required')

  // Map assetType to the DB column name
  const columnMap = {
    primary_logo:  'primary_logo_url',
    sidebar_logo:  'sidebar_logo_url',
    favicon:       'favicon_url',
    login_banner:  'login_banner_url',
    email_logo:    'email_logo_url',
    report_cover:  'report_cover_url',
  }
  const column = columnMap[assetType]
  if (!column) throw new Error(`Unknown assetType: ${assetType}`)

  // List files for this asset type and remove them
  const { data: files } = await platformDb.storage
    .from(BUCKET)
    .list(accountId, { search: assetType })

  if (files && files.length > 0) {
    const paths = files.map((f) => `${accountId}/${f.name}`)
    await platformDb.storage.from(BUCKET).remove(paths)
  }

  // Clear the URL column in the DB
  const { error } = await platformDb
    .from(TABLE)
    .update({ [column]: null, updated_at: new Date().toISOString() })
    .eq('account_id', accountId)

  if (error) throw error
}

// ─────────────────────────────────────────────────────────────
// Fetch branding history for an account (for audit/revert)
// ─────────────────────────────────────────────────────────────
export async function getBrandingHistory(accountId, limit = 20) {
  if (!accountId) return []

  const { data, error } = await platformDb
    .from('organisation_branding_history')
    .select('*')
    .eq('account_id', accountId)
    .order('changed_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[brandingService] getBrandingHistory error:', error)
    return []
  }
  return data || []
}

// ─────────────────────────────────────────────────────────────
// Revert branding to a historical snapshot
// ─────────────────────────────────────────────────────────────
export async function revertBranding(accountId, historyRecord) {
  if (!accountId || !historyRecord) throw new Error('accountId and historyRecord are required')

  const snapshot = historyRecord.previous_values
  // Remove audit columns that should not be rewritten
  const { id, created_at, updated_at, created_by, ...revertData } = snapshot

  return saveBranding({ ...revertData, is_deleted: false }, accountId)
}

// ─────────────────────────────────────────────────────────────
// Validate hex colour string (e.g. #3B82F6)
// ─────────────────────────────────────────────────────────────
export function validateHexColor(value) {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

// ─────────────────────────────────────────────────────────────
// WCAG AA contrast ratio check (returns ratio; warn if < 4.5)
// Uses simplified luminance formula
// ─────────────────────────────────────────────────────────────
export function getContrastRatio(hex1, hex2) {
  const lum = (hex) => {
    const rgb = parseInt(hex.replace('#', ''), 16)
    const r = (rgb >> 16) & 0xff
    const g = (rgb >> 8) & 0xff
    const b = rgb & 0xff
    const toLinear = (c) => {
      const s = c / 255
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  }
  const l1 = lum(hex1)
  const l2 = lum(hex2)
  const lighter = Math.max(l1, l2)
  const darker  = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

// ─────────────────────────────────────────────────────────────
// Email branding helpers
// Used by registrationEmailService to inject corporate identity
// into system-generated HTML emails.
// ─────────────────────────────────────────────────────────────

/**
 * Build a branded HTML email header block.
 * Falls back to a neutral dark header if no branding is configured.
 * @param {object|null} branding - organisation_branding row (or null)
 * @param {string} title - email heading text (e.g. "Verify Your Organisation")
 * @returns {string} HTML string
 */
export function buildBrandedEmailHeader(branding, title) {
  const bgColor   = branding?.primary_color  || '#1F2937'
  const logoUrl   = branding?.email_logo_url || branding?.primary_logo_url || null
  const appName   = branding?.app_display_name || 'Project Nidus'

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${appName}" style="max-height:48px;max-width:200px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;" />`
    : `<span style="font-size:22px;font-weight:bold;color:#ffffff;display:block;margin-bottom:8px;">${appName}</span>`

  return `
    <div style="background:${bgColor};padding:28px 30px;text-align:center;border-radius:10px 10px 0 0;">
      ${logoHtml}
      <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:600;">${title}</h1>
    </div>`
}

/**
 * Build a branded HTML email footer block.
 * @param {object|null} branding - organisation_branding row (or null)
 * @returns {string} HTML string
 */
export function buildBrandedEmailFooter(branding) {
  const teamName = branding?.app_display_name || 'The Platform Team'
  return `
    <hr style="border:none;border-top:1px solid #ddd;margin:30px 0;" />
    <p style="font-size:12px;color:#666;">
      Best regards,<br/>
      ${teamName}
    </p>`
}
