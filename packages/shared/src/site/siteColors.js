/**
 * v1264 — colour helpers for the configurable public headers (site_header_settings).
 * contrastRatio() matches public.site_color_contrast() in SQL/v1264 (WCAG 2.x, 2 decimals), so
 * the Admin editor can block a save the database would reject.
 */

const HEX = /^#[0-9a-f]{6}$/i

export const isHexColor = (v) => HEX.test(String(v || ''))

/** Minimum contrast for header text and the CTA label (WCAG AA, normal text). */
export const MIN_TEXT_CONTRAST = 4.5

/**
 * Built-in header colours used when a header has no settings row (or it could not be read):
 * today's dark header. Presentation chrome only (rule 25.1 allows it); no menus or copy here.
 */
export const DEFAULT_HEADER_COLORS = Object.freeze({
  bg_color: '#030712',
  text_color: '#D1D5DB',
  accent_color: '#2563EB',
  cta_text_color: '#FFFFFF',
})

function toRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex(rgb) {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio (1–21) rounded to 2 decimals; null for invalid input. */
export function contrastRatio(a, b) {
  if (!isHexColor(a) || !isHexColor(b)) return null
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
}

export const meetsAA = (fg, bg) => (contrastRatio(fg, bg) ?? 0) >= MIN_TEXT_CONTRAST

/** Blend colour a into b: weight 0 → b, 1 → a. */
export function mixColors(a, b, weight) {
  const ca = toRgb(a)
  const cb = toRgb(b)
  return toHex(ca.map((c, i) => c * weight + cb[i] * (1 - weight)))
}

/**
 * The header's full palette from its four configured colours (PRD D6). Hover, border, muted and
 * menu-panel tones are derived, not configured. Muted text falls back to the main text colour if
 * the blend would drop below AA.
 */
export function deriveHeaderPalette(settings) {
  const s = { ...DEFAULT_HEADER_COLORS }
  for (const k of Object.keys(DEFAULT_HEADER_COLORS)) if (isHexColor(settings?.[k])) s[k] = settings[k]
  const panel = mixColors(s.text_color, s.bg_color, 0.04)
  const muted = mixColors(s.text_color, s.bg_color, 0.72)
  return {
    bg: s.bg_color,
    text: s.text_color,
    strong: strongest(s.bg_color),
    muted: meetsAA(muted, panel) ? muted : s.text_color,
    hover: mixColors(s.text_color, s.bg_color, 0.1),
    border: mixColors(s.text_color, s.bg_color, 0.16),
    panel,
    accent: s.accent_color,
    ctaText: s.cta_text_color,
  }
}

/** Headings and the current link: white or black, whichever stands out more on the background. */
function strongest(bg) {
  return (contrastRatio('#FFFFFF', bg) ?? 0) >= (contrastRatio('#000000', bg) ?? 0) ? '#FFFFFF' : '#000000'
}

/** True when light text reads better than dark text on this background. */
export function isDarkColor(bg) {
  if (!isHexColor(bg)) return true
  return strongest(bg) === '#FFFFFF'
}

/** CSS custom properties for the header element (applied as an inline style; rule 72 cannot repaint them). */
export function headerCssVars(settings) {
  const p = deriveHeaderPalette(settings)
  return {
    '--nh-bg': p.bg,
    '--nh-text': p.text,
    '--nh-strong': p.strong,
    '--nh-muted': p.muted,
    '--nh-hover': p.hover,
    '--nh-border': p.border,
    '--nh-panel': p.panel,
    '--nh-accent': p.accent,
    '--nh-cta-text': p.ctaText,
  }
}
