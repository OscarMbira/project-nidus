/**
 * Unified Export Utilities
 * Excel (lists + record), Word, PowerPoint for list and record view pages.
 * Used by Platform and Simulator.
 * Excel: uses xlsx-js-style so we can set Wrap Text on cells with newlines (bullet lists).
 */

import * as XLSX from 'xlsx-js-style'
import pptxgen from 'pptxgenjs'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, ImageRun, AlignmentType, WidthType, ShadingType, BorderStyle } from 'docx'

const BRAND_FOOTER = 'Project Nidus'

/** True when a resolved attachment asset's mime type is an embeddable image (v863). */
function isEmbeddableImageAsset(asset) {
  return Boolean(asset?.url) && /^image\//.test(asset?.mime_type || '')
}

/** Caption under embedded images — empty/whitespace means show nothing under the image. */
function trimmedAttachmentCaption(asset) {
  return typeof asset?.caption === 'string' ? asset.caption.trim() : ''
}

/** True for the dedicated "signatures" field — renders as a card grid, not a single-column list. */
function isSignatureField(key) {
  return key === 'signatures'
}

/** Split a signed_at timestamp into separate date/time display strings for signature cards. */
function formatSignatureDateTime(isoString) {
  if (!isoString) return { date: '', time: '' }
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return { date: '', time: '' }
  return {
    date: d.toLocaleDateString(),
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
}

/** Signature card grid: fixed column count, wraps to further rows when there are many signatories. */
const SIGNATURE_CARD_COLS = 3

/**
 * Fetch an attachment image and its natural dimensions for embedding — shared by Word/PPT/PDF.
 * Returns null on any fetch/decode failure so callers can fall back to a text line.
 * @param {string} url - signed URL (v863 resolveAttachmentFieldsForExport)
 * @param {number} [maxWidthPt]
 * @param {number} [maxHeightPt]
 */
async function loadAttachmentImageForEmbed(url, maxWidthPt = 360, maxHeightPt = 360) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const dims = await new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(blob)
      const img = new window.Image()
      img.onload = () => {
        resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 })
        URL.revokeObjectURL(objectUrl)
      }
      img.onerror = () => {
        resolve(null)
        URL.revokeObjectURL(objectUrl)
      }
      img.src = objectUrl
    })
    if (!dims) return null
    const scale = Math.min(maxWidthPt / dims.width, maxHeightPt / dims.height, 1)
    const width = Math.max(1, Math.round(dims.width * scale))
    const height = Math.max(1, Math.round(dims.height * scale))
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    return { bytes, width, height, dataUrl }
  } catch {
    return null
  }
}

/**
 * Resolve branding values for use in exports.
 * @param {object|null|undefined} branding - from useBranding() or getBranding()
 * @returns {{ footerText: string, headerHex: string }}
 */
function resolveBranding(branding) {
  const footerText = branding?.app_display_name || BRAND_FOOTER
  // Strip leading '#' from hex for libraries that expect a bare 6-char hex
  const raw = branding?.primary_color || ''
  const headerHex = raw.replace('#', '') || PPT_LAYOUT.headerBg
  return { footerText, headerHex }
}

/** Full-width Word section banner using org primary colour (parity with PDF/PPT bars). */
function wordSectionBanner(titleText, headerHex) {
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: headerHex },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [
              new Paragraph({
                children: [new TextRun({ text: titleText, bold: true, color: 'FFFFFF', size: 22 })],
                spacing: { before: 60, after: 60 },
              }),
            ],
          }),
        ],
      }),
    ],
  })
}
const BULLET = '\u2022' // •
/** Excel in-cell line break (same as Alt+Enter) — one value per line in the cell. */
const EXCEL_LINE_BREAK = '\n'

/** Word: spacing in twips (20 twips = 1 pt) for professional hierarchy */
const WORD_SPACING = {
  titleAfter: 240,       // 12 pt after main title
  heading1Before: 180,   // 9 pt before section (adds separation)
  heading1After: 120,    // 6 pt after section title
  heading2After: 60,     // 3 pt after field label
  bodyAfter: 60,         // 3 pt after body/bullet
}

/** PowerPoint: layout (inches) for consistent, professional slides */
const PPT_LAYOUT = {
  marginX: 0.5,
  contentTop: 1.05,      // below header bar
  headerHeight: 0.85,
  titleFontSize: 18,
  labelFontSize: 11,
  bodyFontSize: 11,
  lineHeight: 0.22,      // single line
  bulletLineHeight: 0.2,
  gapAfterLabel: 0.08,
  gapAfterBulletBlock: 0.15,
  gapAfterSingleValue: 0.12,
  footerY: 5.15,
  footerFontSize: 9,
  headerBg: '1a365d',
  bodyColor: '2d3748',
  footerColor: '718096',
}

/**
 * Strip leading "N." or "N.M " from a title for consistent numbering.
 * @param {string} title - e.g. "5. Scope" or "Scope"
 * @returns {string} - e.g. "Scope"
 */
function stripLeadingNumber(title) {
  if (!title || typeof title !== 'string') return title || ''
  return title.replace(/^\d+(\.\d+)*\.?\s*/, '').trim() || title
}

/**
 * Build numbered section titles and flat fields with hierarchical labels (e.g. "5.1 In-Scope").
 * @param {Array<{title: string, fields: Array<{key: string, label: string}>}>} sections
 * @returns {{ sectionTitles: string[], flatNumberedFields: Array<{key: string, label: string}> }}
 */
function getNumberedSectionInfo(sections) {
  const sectionTitles = []
  const flatNumberedFields = []
  ;(sections || []).forEach((sec, sIdx) => {
    const sectionNum = sIdx + 1
    const cleanTitle = stripLeadingNumber(sec.title || '')
    sectionTitles.push(`${sectionNum}. ${cleanTitle}`)
    ;(sec.fields || []).forEach((f, fIdx) => {
      flatNumberedFields.push({
        key: f.key,
        label: `${sectionNum}.${fIdx + 1} ${f.label || f.key}`,
        ...(f.help ? { help: f.help } : {}),
        ...(f.example ? { example: f.example } : {}),
      })
    })
  })
  return { sectionTitles, flatNumberedFields }
}

/** True when a list item already starts with "1. ", "• ", "- ", etc. */
function itemHasOwnListMarker(item) {
  return /^(\d+[.)]\s+|[•●▪▫◦]\s+|[-*]\s+)/.test(String(item || '').trim())
}

function wordCount(item) {
  return String(item || '')
    .split(/\s+/)
    .filter(Boolean).length
}

/** Capitalize first letter unless the item already has a list marker. */
function capitalizeListItem(item) {
  const t = String(item || '').trim()
  if (!t || itemHasOwnListMarker(t)) return t
  // Keep all-caps / acronym tokens as-is (PV, EV, CPI)
  if (/^[A-Z0-9][A-Z0-9._/-]*$/.test(t)) return t
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Strip trailing "—" / "-" left over from bad splits or seed packing. */
function stripTrailingListSeparators(item) {
  return String(item || '')
    .replace(/\s*[—–-]+\s*$/u, '')
    .trim()
}

/** Strip leading "1. " / "• " markers so recovery can see the real first line. */
function stripLeadingListMarkers(item) {
  return String(item || '')
    .replace(/^(?:\d+[.)]\s+|[•●▪▫◦]\s+|[-*]\s+)/, '')
    .trim()
}

/** Imperative / lead-in phrases that are a main statement, not a bullet. */
const INTRO_STATEMENT_RE =
  /^(Define|Capture|Track|Provide|Establish|Identify|Describe|Authorise|Authorize|Outline|Document|Ensure)\b/i

/**
 * @typedef {{ intro: string|null, items: string[] }} MultiItemListResult
 * intro = main statement before bullets (not bulleted); items = bulleted lines.
 */

/**
 * Pull a main statement out of the first list line when present.
 * Handles "Intro:", "Intro: firstBullet", and prior bad splits where the intro was bulleted.
 * @param {string[]} lines
 * @returns {MultiItemListResult|null}
 */
function extractIntroFromLines(lines) {
  // Strip markers only for detection — keep "1. …" intact on real list items via asListResult
  const cleaned = (lines || [])
    .map((line) => stripTrailingListSeparators(stripLeadingListMarkers(line)))
    .filter(Boolean)
  if (cleaned.length < 2) return null

  // "Intro:" then bullets
  const introOnly = cleaned[0].match(/^(.+):\s*$/)
  if (introOnly) return asListResult(cleaned.slice(1), introOnly[1])

  // "Intro: firstBullet" then more bullets
  const introInline = cleaned[0].match(/^(.+):\s+(.+)$/)
  if (introInline) {
    const left = introInline[1].trim()
    const right = introInline[2].trim()
    // Prefer lead-in statements; also short "Label: value" pairs on the first line
    if (INTRO_STATEMENT_RE.test(left) || (wordCount(left) <= 8 && wordCount(right) <= 4 && right.length <= 40)) {
      return asListResult([right, ...cleaned.slice(1)], left)
    }
  }

  // Recover: "Define WBS elements" + short noun bullets (Description / Owner / …)
  const rest = cleaned.slice(1)
  const restAreShortLabels =
    rest.length >= 2 &&
    rest.every((l) => wordCount(l) <= 5 && l.length <= 60 && !/[.!?]\s/.test(l))
  if (INTRO_STATEMENT_RE.test(cleaned[0]) && restAreShortLabels) {
    return asListResult(rest, cleaned[0])
  }

  return null
}

/**
 * @param {string[]} items
 * @param {string|null} [intro]
 * @returns {MultiItemListResult|null}
 */
function asListResult(items, intro = null) {
  const cleaned = (items || []).map(stripTrailingListSeparators).filter(Boolean)
  const introClean = intro
    ? stripTrailingListSeparators(stripLeadingListMarkers(intro)).replace(/:\s*$/, '')
    : null
  const mapped = cleaned.map((item) => (itemHasOwnListMarker(item) ? item : capitalizeListItem(item)))
  if (introClean && mapped.length >= 1) return { intro: introClean, items: mapped }
  if (!introClean && mapped.length >= 2) {
    // Last chance: first item is a lead-in that was stored as a bullet
    const promoted = extractIntroFromLines(mapped)
    if (promoted?.intro) return promoted
    return { intro: null, items: mapped }
  }
  return null
}

/** Clean list items (no intro). */
function finalizeListItems(items) {
  return asListResult(items, null)
}

/** Persist list result as editable text: "Intro:\nitem\nitem" or "item\nitem". */
function formatMultiItemStorage(result) {
  if (!result?.items?.length) return ''
  if (result.intro) return `${result.intro}:\n${result.items.join('\n')}`
  return result.items.join('\n')
}

/**
 * "Intro: first — second — third" em/en-dash chains.
 * Intro (before ":") is the main statement; remainder are bullets.
 * Keeps 2-part "Title — long prose" as scalar (not a list).
 */
function splitEmDashSeparatedList(text) {
  const s = String(text || '')
    .trim()
    .replace(/[.。]+$/g, '')
  if (!s || !/[—–]/.test(s)) return null

  const parts = s
    .split(/\s*[—–]\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length < 2) return null

  // "Label — a, b, and c" is handled by splitDashPrefixedCommaList
  if (parts.some((p) => p.includes(','))) return null

  // "Define WBS elements: description — Owner — Acceptance criteria — Interfaces"
  const withIntro = extractIntroFromLines(parts)
  if (withIntro?.intro) return withIntro

  // Single "Label — prose" seed pattern → leave as one field value
  if (parts.length === 2) {
    if (parts.some((p) => p.length > 40 || wordCount(p) > 3)) return null
  }
  if (parts.some((p) => p.length > 100)) return null

  return asListResult(parts, null)
}

/**
 * Newline-separated values, including "Intro:\nbullet\nbullet" storage form
 * and recovery of a prior bad split where the intro was stored as the first bullet.
 */
function splitNewlineList(text) {
  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length < 2) return null

  const withIntro = extractIntroFromLines(lines)
  if (withIntro) return withIntro

  return asListResult(lines, null)
}

/** Split "a, b, and c" into trimmed items (strips leading and/or). */
function splitCommaSeparatedItems(text) {
  return String(text || '')
    .trim()
    .replace(/[.。]+$/g, '')
    .split(/\s*,\s*/)
    .map((part) => part.trim().replace(/^(and|or)\s+/i, '').replace(/[.。]+$/g, '').trim())
    .filter(Boolean)
}

/**
 * "Label — a, b, and c." → ["A", "B", "C"] (prefix dropped; field heading already names it).
 * Requires a dash separator and at least one comma so prose like "when and how" stays intact.
 * @returns {string[]|null}
 */
function splitDashPrefixedCommaList(text) {
  const s = String(text || '').trim()
  if (!s || !s.includes(',')) return null

  // Em dash / en dash, or spaced hyphen used as a separator (not hyphenated words).
  const m = s.match(/^(.+?)\s*[—–]\s+(.+)$/) || s.match(/^(.+?)\s+-\s+(.+)$/)
  if (!m) return null

  const right = m[2].trim()
  if (!right.includes(',')) return null

  const items = splitCommaSeparatedItems(right)
  if (items.length < 2) return null
  // Short phrase items only — reject long prose clauses accidentally comma-joined.
  if (items.some((item) => item.length > 60 || /[.!?]\s/.test(item))) return null

  return items.map(capitalizeListItem)
}

/**
 * Hierarchy / path lists: "Category → Type → Role / Asset → Named resource"
 * (jsPDF often renders → as "!" — splitting avoids that and shows one level per line).
 * Does not split on "/" so "Role / Asset" stays one item.
 * @returns {string[]|null}
 */
function splitArrowSeparatedList(text) {
  const s = String(text || '').trim().replace(/[.。]+$/g, '')
  if (!s) return null

  const arrowSplit = /\s*(?:→|⇒|⟶|⟹|➜|➝|➞|->|=>)\s*/
  let parts = null
  if (arrowSplit.test(s)) {
    parts = s.split(arrowSplit).map((p) => p.trim()).filter(Boolean)
  } else if ((s.match(/\s+>\s+/g) || []).length >= 2) {
    // Spaced ">" used as a hierarchy chain (need 2+ separators to avoid "A > B" comparisons)
    parts = s.split(/\s+>\s+/).map((p) => p.trim()).filter(Boolean)
  }

  if (!parts || parts.length < 2) return null
  if (parts.some((item) => item.length > 60 || /[.!?]\s/.test(item))) return null

  return parts.map(capitalizeListItem)
}

/**
 * Shared guard for short comma/semicolon list items (roles, codes, tags).
 * Rejects long prose clauses.
 */
function isShortListItemSet(items) {
  if (!items || items.length < 2) return false
  const allVeryShort = items.every((item) => item.length <= 12 && wordCount(item) <= 2)
  // Need 3+ items, or 2+ if every token is a short code/name (acronym lists).
  if (items.length < 3 && !allVeryShort) return false
  if (
    items.some(
      (item) =>
        item.length > 40 ||
        wordCount(item) > 8 ||
        /[.!?]/.test(item),
    )
  ) {
    return false
  }
  return true
}

/**
 * "In scope: core deliverables listed in the business case. Out of scope: unrelated BAU
 * changes." → one "Label: clause." line per labelled clause. Each detected label starts a
 * fresh line at the string's start or right after a sentence boundary, keeping its own
 * label + content together (unlike splitEmDashSeparatedList's single shared intro).
 * @returns {string[]|null}
 */
function splitLabelledClauseList(text) {
  const s = String(text || '').trim()
  if (!s) return null
  const labelRe = /(^|(?<=[.!?]\s))([A-Z][A-Za-z0-9 /&-]{1,30}:)/g
  const matches = [...s.matchAll(labelRe)]
  if (matches.length < 2) return null

  const parts = []
  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i].index
    const end = i + 1 < matches.length ? matches[i + 1].index : s.length
    const part = s.slice(start, end).trim()
    if (part) parts.push(part)
  }
  if (parts.length < 2 || parts.some((p) => p.length > 160)) return null
  return parts
}

/**
 * Plain "PV, EV, AC, CPI" / "meetings, portals, email, reports" → one item per line.
 * Conservative: only short tokens/phrases so sentence prose with commas is left alone.
 * @returns {string[]|null}
 */
function splitPlainCommaList(text) {
  const s = String(text || '').trim()
  if (!s || !s.includes(',')) return null
  // Don't steal dash-prefixed forms (handled separately with prefix drop).
  if (/\s*[—–]\s+/.test(s) || /\s+-\s+/.test(s)) return null

  const items = splitCommaSeparatedItems(s)
  if (!isShortListItemSet(items)) return null
  return items.map(capitalizeListItem)
}

/**
 * "Business Owner; Quality Lead; Project Manager" → one role/item per line.
 * Also "Level 1 - phases; Level 2 - …; Level 3+ - …" WBS/level guidance
 * (longer phrases allowed when every item is a Level N line).
 * @returns {string[]|null}
 */
function splitSemicolonList(text) {
  const s = String(text || '').trim()
  if (!s || !s.includes(';')) return null

  const items = s
    .replace(/[.。]+$/g, '')
    .split(/\s*;\s*/)
    .map((part) => part.trim().replace(/^(and|or)\s+/i, '').replace(/[.。]+$/g, '').trim())
    .filter(Boolean)

  if (items.length < 2) return null

  // WBS / hierarchy level guidance — allow longer descriptions per level
  // Supports "Level 1 - …", "Level 1 = …", "Level 3+: …"
  const levelLine = /^Level\s+\d+\+?\s*[-—–:=]/i
  if (items.every((item) => levelLine.test(item) && item.length <= 160)) {
    return finalizeListItems(items)
  }

  if (!isShortListItemSet(items)) return null
  return finalizeListItems(items)
}

/**
 * Split packed multi-item field text for view/export/form friendliness.
 * @returns {MultiItemListResult|null}
 */
function splitMultiItemFieldText(text) {
  if (text == null) return null
  const s = String(text).replace(/\r\n/g, '\n').trim()
  if (!s) return null

  if (s.includes('\n')) {
    return splitNewlineList(s)
  }

  if (/^\d+[.)]\s+\S/.test(s)) {
    const parts = s.split(/\s+(?=\d+[.)]\s+\S)/).map((p) => p.trim()).filter(Boolean)
    if (parts.length >= 2 && parts.every((p) => /^\d+[.)]\s+\S/.test(p))) {
      return finalizeListItems(parts)
    }
  }

  if (/^[•●▪▫◦]\s+\S/.test(s)) {
    const parts = s.split(/\s+(?=[•●▪▫◦]\s+\S)/).map((p) => p.trim()).filter(Boolean)
    if (parts.length >= 2) return finalizeListItems(parts)
  }

  if (/^[-*]\s+\S/.test(s)) {
    const parts = s.split(/\s+(?=[-*]\s+\S)/).map((p) => p.trim()).filter(Boolean)
    if (parts.length >= 2 && parts.every((p) => /^[-*]\s+\S/.test(p))) {
      return finalizeListItems(parts)
    }
  }

  const arrowList = splitArrowSeparatedList(s)
  if (arrowList) return finalizeListItems(arrowList)

  // Em-dash chains before "Label — a, b, c" so "A — B — C" is not misread as prefix+rest
  const emDashList = splitEmDashSeparatedList(s)
  if (emDashList) return emDashList

  const dashComma = splitDashPrefixedCommaList(s)
  if (dashComma) return finalizeListItems(dashComma)

  const labelledClauses = splitLabelledClauseList(s)
  if (labelledClauses) return finalizeListItems(labelledClauses)

  const semicolonList = splitSemicolonList(s)
  if (semicolonList) return semicolonList

  const plainComma = splitPlainCommaList(s)
  if (plainComma) return finalizeListItems(plainComma)

  return null
}

/** One list line for Excel/PDF — keep existing 1./• markers; otherwise prefix a bullet. */
function formatListItemForExport(item, blankPlaceholder = '—') {
  const t = String(item ?? '').trim() || blankPlaceholder
  if (itemHasOwnListMarker(t)) return t
  return `${BULLET} ${t}`
}

/**
 * Normalize a field value to either a single text or a list of items (for multi-valued fields).
 * @returns {{ isList: true, intro?: string, items: string[] } | { isList: false, text: string }}
 */
function parseFieldValue(val) {
  if (val == null) return { isList: false, text: '' }
  if (Array.isArray(val)) {
    const items = val.map((v) => {
      if (v == null) return ''
      if (typeof v === 'object' && v !== null && typeof v.toISOString === 'function') return v.toISOString().split('T')[0]
      if (typeof v === 'object' && v !== null) return JSON.stringify(v)
      return String(v)
    })
    // Re-run through multi-item splitter so lead-in statements become intro, not bullets
    const joined = items.map(stripTrailingListSeparators).filter(Boolean).join('\n')
    const multi = splitMultiItemFieldText(joined)
    if (multi) return { isList: true, intro: multi.intro || '', items: multi.items }
    return { isList: true, intro: '', items }
  }
  if (typeof val === 'string' && val.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) {
        return parseFieldValue(parsed)
      }
    } catch (_) { /* ignore */ }
  }
  if (typeof val === 'string') {
    const multi = splitMultiItemFieldText(val)
    if (multi) return { isList: true, intro: multi.intro || '', items: multi.items }
    return { isList: false, text: val }
  }
  if (typeof val === 'object' && val !== null) {
    if (typeof val.toISOString === 'function') return { isList: false, text: val.toISOString().split('T')[0] }
    return { isList: false, text: String(val) }
  }
  return { isList: false, text: String(val) }
}

/** Intro (plain) + bulleted items as lines for PDF/Excel/cells. */
function formatParsedListDisplay(parsed, blankPlaceholder = '—') {
  if (!parsed?.isList) return parsed?.text || blankPlaceholder
  const lines = []
  if (parsed.intro) lines.push(parsed.intro)
  parsed.items.forEach((item) => {
    lines.push(formatListItemForExport(item, blankPlaceholder))
  })
  return lines.length ? lines.join('\n') : blankPlaceholder
}

/**
 * Format value for display in exports (avoid [object Object], handle null/undefined).
 * Multi-valued fields are returned as one item per line (Alt+Enter) for Excel cells.
 */
function formatCellValue(val) {
  const parsed = parseFieldValue(val)
  if (parsed.isList) {
    return formatParsedListDisplay(parsed, '').replace(/\n$/, '') || ''
  }
  return parsed.text
}

/** Format a record field for export, substituting blankPlaceholder when empty. */
function displayValue(val, blankPlaceholder = '—') {
  const formatted = formatCellValue(val)
  return formatted || blankPlaceholder
}

/** Optional offline guidance lines from field.help / field.example. */
function fieldGuidanceLines(field) {
  const lines = []
  const help = String(field?.help || '').trim()
  const example = String(field?.example || '').trim()
  if (help) lines.push(help)
  if (example) lines.push(`Example: ${example}`)
  return lines
}

/** Value cell text with optional guidance prefix (Excel/CSV/XML/JSON). */
function guidedCellValue(field, val, blankPlaceholder = '—') {
  const guidance = fieldGuidanceLines(field)
  const display = displayValue(val, blankPlaceholder)
  if (!guidance.length) return display
  return `${guidance.join('\n')}\n\n${display}`
}

/**
 * Set Wrap Text on any worksheet cell whose value is a string containing newlines.
 * So bulleted multi-values display one bullet per line in Excel.
 * @param {object} ws - worksheet from XLSX.utils.json_to_sheet or aoa_to_sheet
 */
function applyWrapTextForMultilineCells(ws) {
  if (!ws || !ws['!ref']) return
  const range = XLSX.utils.decode_range(ws['!ref'])
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const ref = XLSX.utils.encode_cell({ r: R, c: C })
      const cell = ws[ref]
      if (cell && cell.v != null && typeof cell.v === 'string' && cell.v.includes('\n')) {
        cell.s = { alignment: { wrapText: true } }
      }
    }
  }
}

/**
 * Export a list/table to Excel.
 * @param {Array<{key: string, label: string}>} columns - column definitions
 * @param {Array<Object>} rows - array of row objects (keyed by column.key)
 * @param {string} baseFilename - e.g. 'Mandates' (will get _YYYY-MM-DD.xlsx)
 */
export function exportToExcel(columns, rows, baseFilename, branding) {
  const filename = `${baseFilename}_${new Date().toISOString().split('T')[0]}.xlsx`
  const { headerHex } = resolveBranding(branding)
  const ws = XLSX.utils.json_to_sheet(rows.map(row => {
    const out = {}
    columns.forEach(({ key, label }) => {
      out[label || key] = formatCellValue(row[key])
    })
    return out
  }), { header: columns.map(c => c.label || c.key) })
  // Apply brand colour to header row
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let C = range.s.c; C <= range.e.c; C++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c: C })
    if (ws[ref]) {
      ws[ref].s = {
        fill: { fgColor: { rgb: headerHex.toUpperCase() } },
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { wrapText: true }
      }
    }
  }
  applyWrapTextForMultilineCells(ws)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  XLSX.writeFile(wb, filename)
}

/** Word/PPT field picker: default selection count (CLAUDE.md rule 38). */
const DEFAULT_LIST_EXPORT_FIELDS = 5
const MAX_LIST_EXPORT_FIELDS = 10

/**
 * Export a list/table to Word (table format). Use selected columns only (e.g. 5–10 fields).
 * @param {Array<{key: string, label: string}>} columns - column definitions (subset for Word, max 10)
 * @param {Array<Object>} rows - array of row objects
 * @param {string} baseFilename - e.g. 'Mandates'
 */
export async function exportListToWord(columns, rows, baseFilename, branding) {
  const filename = `${baseFilename}_${new Date().toISOString().split('T')[0]}.docx`
  const { footerText, headerHex } = resolveBranding(branding)
  const exportDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const headers = columns.map(c => c.label || c.key)
  const tableRows = [
    new TableRow({
      children: headers.map(h => new TableCell({
        children: [new Paragraph({ text: h, heading: HeadingLevel.HEADING_2, spacing: { after: 60 } })]
      })),
      tableHeader: true
    }),
    ...rows.map(row => new TableRow({
      children: columns.map(({ key }) => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: formatCellValue(row[key]) || '—' })],
          spacing: { after: 40 }
        })]
      }))
    }))
  ]
  const children = [
    new Paragraph({
      text: baseFilename.replace(/_/g, ' '),
      heading: HeadingLevel.TITLE,
      spacing: { after: WORD_SPACING.titleAfter }
    }),
    new Paragraph({
      text: `Exported: ${exportDate} · ${rows.length} record(s)`,
      style: 'normal',
      spacing: { after: 120 }
    }),
    new Paragraph({ text: '' }),
    new Table({ rows: tableRows, width: { size: 100, type: 'pct' } }),
    new Paragraph({ text: '' }),
    new Paragraph({
      children: [new TextRun({ text: footerText, size: 18, color: '666666' })],
      spacing: { before: 120 }
    })
  ]
  const doc = new Document({ sections: [{ properties: {}, children }] })
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export a list/table to PowerPoint (table on slide). Use selected columns only (e.g. 5–10 fields).
 * Splits across multiple slides if many rows (e.g. ~15 rows per slide).
 * @param {Array<{key: string, label: string}>} columns - column definitions (subset for Word, max 10)
 * @param {Array<Object>} rows - array of row objects
 * @param {string} baseFilename - e.g. 'Mandates'
 */
export function exportListToPPT(columns, rows, baseFilename, branding) {
  const filename = `${baseFilename}_${new Date().toISOString().split('T')[0]}.pptx`
  const { footerText, headerHex } = resolveBranding(branding)
  const pptx = new pptxgen()
  pptx.title = baseFilename.replace(/_/g, ' ')
  pptx.author = footerText
  const headers = columns.map(c => c.label || c.key)
  const ROWS_PER_SLIDE = 18
  const { marginX, headerHeight, footerY, footerFontSize, footerColor } = PPT_LAYOUT
  const w = 9
  const titleSlide = pptx.addSlide()
  titleSlide.addText(baseFilename.replace(/_/g, ' '), { x: marginX, y: 1, w, h: 1, fontSize: 24, bold: true, color: headerHex })
  titleSlide.addText(`List export · ${rows.length} record(s)`, { x: marginX, y: 2, w, h: 0.5, fontSize: 14, color: '4a5568' })
  titleSlide.addText(`Exported: ${new Date().toLocaleDateString()}`, { x: marginX, y: 2.6, w, h: 0.4, fontSize: 10, color: footerColor })
  titleSlide.addText(footerText, { x: marginX, y: 5, w, h: 0.3, fontSize: footerFontSize, color: footerColor })
  for (let start = 0; start < rows.length; start += ROWS_PER_SLIDE) {
    const chunk = rows.slice(start, start + ROWS_PER_SLIDE)
    const slide = pptx.addSlide()
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: headerHeight, fill: { color: headerHex } })
    slide.addText(`Records ${start + 1}–${start + chunk.length} of ${rows.length}`, { x: marginX, y: 0.15, w, h: 0.35, fontSize: 14, bold: true, color: 'FFFFFF' })
    const tableRows = [
      headers.map(h => ({ text: h, options: { bold: true, fill: headerHex, color: 'FFFFFF' } })),
      ...chunk.map(row => columns.map(({ key }) => ({ text: formatCellValue(row[key]) || '—' })))
    ]
    slide.addTable(tableRows, { x: marginX, y: 0.75, w, colW: Array(columns.length).fill(w / columns.length), fontSize: 10, color: PPT_LAYOUT.bodyColor })
    slide.addText(footerText, { x: marginX, y: footerY, w, h: 0.3, fontSize: footerFontSize, color: footerColor })
  }
  pptx.writeFile({ fileName: filename })
}

export { DEFAULT_LIST_EXPORT_FIELDS, MAX_LIST_EXPORT_FIELDS }

// Shared field-mapping helpers, exported for RecordPreviewModal's styled-HTML previews (v853)
// so preview rendering and file export never fork the section/field/list-vs-scalar logic.
export {
  getNumberedSectionInfo,
  parseFieldValue,
  splitMultiItemFieldText,
  formatMultiItemStorage,
  itemHasOwnListMarker,
  formatListItemForExport,
  formatParsedListDisplay,
  fieldGuidanceLines,
  guidedCellValue,
  resolveBranding,
  BULLET,
}

/**
 * Export a single record to Excel (one row: headers in row 1, values in row 2).
 * Accepts either sections (for numbered headers 1.1, 1.2, 2.1...) or flat fields.
 * @param {Array<{title: string, fields: Array<{key: string, label: string}>}>|Array<{key: string, label: string}>} sectionsOrFields
 * @param {Object} record - single record object
 * @param {string} baseFilename - e.g. 'Mandate_MAN-2026-001'
 */
export function exportRecordToExcel(sectionsOrFields, record, baseFilename, branding, blankPlaceholder = '—') {
  const filename = `${baseFilename}_${new Date().toISOString().split('T')[0]}.xlsx`
  const { headerHex } = resolveBranding(branding)
  const isSections = Array.isArray(sectionsOrFields) && sectionsOrFields.length > 0 && sectionsOrFields[0]?.fields != null
  const flatFields = isSections ? getNumberedSectionInfo(sectionsOrFields).flatNumberedFields : sectionsOrFields
  const headers = flatFields.map(f => f.label || f.key)
  const values = flatFields.map(f => guidedCellValue(f, record[f.key], blankPlaceholder))
  const ws = XLSX.utils.aoa_to_sheet([headers, values])
  // Apply brand colour to header row
  for (let C = 0; C < headers.length; C++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c: C })
    if (ws[ref]) {
      ws[ref].s = {
        fill: { fgColor: { rgb: headerHex.toUpperCase() } },
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { wrapText: true }
      }
    }
  }
  applyWrapTextForMultilineCells(ws)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Record')
  XLSX.writeFile(wb, filename)
}

/**
 * Export a single record to Word. Sections = Heading 1, each field = Heading 2 + value (or bullet list).
 * @param {Array<{title: string, fields: Array<{key: string, label: string}>}>} sections
 * @param {Object} record
 * @param {string} baseFilename
 */
export async function exportRecordToWord(sections, record, baseFilename, branding, blankPlaceholder = '—', attachmentAssets = {}) {
  const filename = `${baseFilename}_${new Date().toISOString().split('T')[0]}.docx`
  const { footerText, headerHex } = resolveBranding(branding)
  const children = []
  const exportDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  // Title and subtitle with clear spacing
  children.push(new Paragraph({
    text: baseFilename.replace(/_/g, ' '),
    heading: HeadingLevel.TITLE,
    spacing: { after: WORD_SPACING.titleAfter }
  }))
  children.push(new Paragraph({
    text: `Exported: ${exportDate}`,
    style: 'normal',
    spacing: { after: 120 }
  }))
  children.push(new Paragraph({ text: '' }))

  const { sectionTitles, flatNumberedFields } = getNumberedSectionInfo(sections)
  let flatIdx = 0
  for (const [sIdx, { title, fields }] of sections.entries()) {
    if (!title || !fields?.length) continue
    children.push(new Paragraph({ text: '', spacing: { before: WORD_SPACING.heading1Before } }))
    children.push(wordSectionBanner(sectionTitles[sIdx], headerHex))
    children.push(new Paragraph({ text: '', spacing: { after: WORD_SPACING.heading1After } }))
    for (const field of fields) {
      const { key, label } = field
      const numberedLabel = flatNumberedFields[flatIdx]?.label ?? (label || key)
      flatIdx += 1
      children.push(new Paragraph({
        text: numberedLabel,
        heading: HeadingLevel.HEADING_2,
        spacing: { after: WORD_SPACING.heading2After }
      }))
      fieldGuidanceLines(field).forEach((line) => {
        children.push(new Paragraph({
          children: [new TextRun({ text: line, italics: true, size: 18, color: '666666' })],
          spacing: { after: 40 }
        }))
      })

      const fieldAssets = attachmentAssets[key]
      if (Array.isArray(fieldAssets)) {
        // Attachment field (v863) — embed images inline; non-image files as filename + link line.
        if (fieldAssets.length === 0) {
          children.push(new Paragraph({
            children: [new TextRun({ text: blankPlaceholder })],
            spacing: { after: WORD_SPACING.bodyAfter }
          }))
        } else if (isSignatureField(key)) {
          // Signature card grid (v895) — a fixed-column table, one card per signatory:
          // reduced-size signature image, then Role/Name/Date/Time labels.
          const tableRows = []
          for (let rowStart = 0; rowStart < fieldAssets.length; rowStart += SIGNATURE_CARD_COLS) {
            const rowAssets = fieldAssets.slice(rowStart, rowStart + SIGNATURE_CARD_COLS)
            const cells = []
            for (let c = 0; c < SIGNATURE_CARD_COLS; c += 1) {
              const asset = rowAssets[c]
              if (!asset) {
                cells.push(new TableCell({ children: [new Paragraph({ text: '' })] }))
                continue
              }
              const cellChildren = []
              if (isEmbeddableImageAsset(asset)) {
                const loaded = await loadAttachmentImageForEmbed(asset.url, 130, 90)
                if (loaded) {
                  cellChildren.push(new Paragraph({
                    children: [new ImageRun({ data: loaded.bytes, transformation: { width: loaded.width, height: loaded.height } })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 80 },
                  }))
                }
              }
              const { date, time } = formatSignatureDateTime(asset.signed_at)
              cellChildren.push(new Paragraph({ children: [new TextRun({ text: `Role: ${asset.role_label || '—'}`, bold: true, size: 16 })], alignment: AlignmentType.CENTER, spacing: { after: 20 } }))
              cellChildren.push(new Paragraph({ children: [new TextRun({ text: `Name: ${asset.signer_label || 'Unknown'}`, size: 16 })], alignment: AlignmentType.CENTER, spacing: { after: 20 } }))
              cellChildren.push(new Paragraph({ children: [new TextRun({ text: `Date: ${date || '—'}`, size: 16 })], alignment: AlignmentType.CENTER, spacing: { after: 20 } }))
              cellChildren.push(new Paragraph({ children: [new TextRun({ text: `Time: ${time || '—'}`, size: 16 })], alignment: AlignmentType.CENTER }))
              cells.push(new TableCell({
                children: cellChildren,
                width: { size: Math.floor(100 / SIGNATURE_CARD_COLS), type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
              }))
            }
            tableRows.push(new TableRow({ children: cells }))
          }
          children.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }))
          children.push(new Paragraph({ text: '', spacing: { after: WORD_SPACING.bodyAfter } }))
        } else {
          for (const asset of fieldAssets) {
            if (isEmbeddableImageAsset(asset)) {
              const loaded = await loadAttachmentImageForEmbed(asset.url, 400, 320)
              if (loaded) {
                children.push(new Paragraph({
                  children: [new ImageRun({
                    data: loaded.bytes,
                    transformation: { width: loaded.width, height: loaded.height },
                    outline: { type: 'solidFill', solidFillType: 'rgb', value: 'D0D0D0', width: 4 },
                  })],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 160 }
                }))
              }
              const caption = trimmedAttachmentCaption(asset)
              if (caption) {
                children.push(new Paragraph({
                  children: [new TextRun({ text: caption, italics: true, size: 16, color: '888888' })],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: WORD_SPACING.bodyAfter }
                }))
              }
            } else {
              // Non-image: keep a filename line so the file remains identifiable.
              children.push(new Paragraph({
                children: [new TextRun({ text: asset.file_name || 'Attachment', italics: true, size: 16, color: '888888' })],
                alignment: AlignmentType.CENTER,
                spacing: { after: WORD_SPACING.bodyAfter }
              }))
            }
          }
        }
        continue
      }

      const parsed = parseFieldValue(record[key])
      if (parsed.isList) {
        if (parsed.intro) {
          children.push(new Paragraph({
            children: [new TextRun({ text: parsed.intro })],
            spacing: { after: parsed.items.length ? 60 : WORD_SPACING.bodyAfter },
          }))
        }
        if (parsed.items.length === 0 && !parsed.intro) {
          children.push(new Paragraph({
            children: [new TextRun({ text: blankPlaceholder })],
            spacing: { after: WORD_SPACING.bodyAfter }
          }))
        } else {
          parsed.items.forEach((item, i) => {
            const text = item || blankPlaceholder
            children.push(new Paragraph({
              text,
              // Keep "1. …" / "• …" as plain lines — don't double-wrap with Word bullets
              ...(itemHasOwnListMarker(text) ? {} : { bullet: { level: 0 } }),
              spacing: { after: i < parsed.items.length - 1 ? 60 : WORD_SPACING.bodyAfter }
            }))
          })
        }
      } else {
        children.push(new Paragraph({
          children: [new TextRun({ text: parsed.text || blankPlaceholder })],
          spacing: { after: WORD_SPACING.bodyAfter }
        }))
      }
    }
    children.push(new Paragraph({ text: '' }))
  }

  // Footer
  children.push(new Paragraph({ text: '' }))
  children.push(new Paragraph({
    children: [new TextRun({ text: footerText, size: 18, color: headerHex || '666666' })],
    spacing: { before: 120 }
  }))

  const doc = new Document({
    sections: [{ properties: {}, children }]
  })
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export a single record to PowerPoint. One slide per section; title bar + key-value body.
 * @param {Array<{title: string, fields: Array<{key: string, label: string}>}>} sections
 * @param {Object} record - used for first slide title/ref if present
 * @param {string} baseFilename
 */
export async function exportRecordToPPT(sections, record, baseFilename, branding, blankPlaceholder = '—', attachmentAssets = {}) {
  const filename = `${baseFilename}_${new Date().toISOString().split('T')[0]}.pptx`
  const { footerText, headerHex } = resolveBranding(branding)
  const pptx = new pptxgen()
  pptx.title = baseFilename.replace(/_/g, ' ')
  pptx.author = footerText

  const ref = record?.mandate_reference || record?.document_ref || record?.reference_number || record?.id || ''
  const title = record?.mandate_title || record?.report_title || record?.name || record?.title || baseFilename

  const { marginX, headerHeight, bodyColor, footerColor, footerY, footerFontSize } = PPT_LAYOUT
  const w = 9

  // Title slide — clean hierarchy
  const titleSlide = pptx.addSlide()
  titleSlide.addText(title, { x: marginX, y: 1, w, h: 1, fontSize: 24, bold: true, color: headerHex })
  if (ref) titleSlide.addText(ref, { x: marginX, y: 2, w, h: 0.5, fontSize: 14, color: '4a5568' })
  titleSlide.addText(`Exported: ${new Date().toLocaleDateString()}`, { x: marginX, y: 2.6, w, h: 0.4, fontSize: 10, color: footerColor })
  titleSlide.addText(footerText, { x: marginX, y: 5, w, h: 0.3, fontSize: footerFontSize, color: footerColor })

  const { sectionTitles, flatNumberedFields } = getNumberedSectionInfo(sections)
  let flatLabelIdx = 0
  const { contentTop, titleFontSize, labelFontSize, lineHeight, bulletLineHeight, gapAfterLabel, gapAfterBulletBlock, gapAfterSingleValue } = PPT_LAYOUT

  // Content slides — consistent header bar, spacing, and footer
  for (const [sIdx, { title: sectionTitle, fields }] of sections.entries()) {
    if (!sectionTitle || !fields?.length) continue
    const slide = pptx.addSlide()
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: headerHeight, fill: { color: headerHex } })
    slide.addText(sectionTitles[sIdx], {
      x: marginX, y: 0.2, w, h: 0.5,
      fontSize: titleFontSize, bold: true, color: 'FFFFFF'
    })
    let y = contentTop
    for (const field of fields) {
      const { key, label } = field
      const numberedLabel = flatNumberedFields[flatLabelIdx]?.label ?? `${label || key}`
      flatLabelIdx += 1
      const labelText = `${numberedLabel}:`
      slide.addText(labelText, { x: marginX, y, w, h: lineHeight, fontSize: labelFontSize, bold: true, color: bodyColor })
      y += lineHeight + gapAfterLabel
      fieldGuidanceLines(field).forEach((line) => {
        const gh = Math.min(lineHeight * Math.ceil(line.length / 70), 1.2)
        slide.addText(line, { x: marginX, y, w, h: gh, fontSize: 9, italic: true, color: footerColor })
        y += gh + gapAfterLabel
      })

      const fieldAssets = attachmentAssets[key]
      if (Array.isArray(fieldAssets)) {
        // Attachment field (v863) — embed images inline; non-image files as filename + caption text.
        if (fieldAssets.length === 0) {
          slide.addText(blankPlaceholder, { x: marginX, y, w, h: lineHeight, fontSize: labelFontSize, color: bodyColor })
          y += lineHeight + gapAfterSingleValue
        } else if (isSignatureField(key)) {
          // Signature card grid (v895) — one card per signatory: reduced-size signature
          // image, then Role/Name/Date/Time labels, wrapping to further rows as needed.
          const CARD_GAP = 0.15
          const CARD_PAD = 0.1
          const CARD_IMG_W = 1.3
          const CARD_IMG_H = 0.85
          const CARD_LINE_H = 0.16
          const cardWidth = (w - CARD_GAP * (SIGNATURE_CARD_COLS - 1)) / SIGNATURE_CARD_COLS
          const cardHeight = CARD_PAD * 2 + CARD_IMG_H + 0.1 + CARD_LINE_H * 4
          for (let rowStart = 0; rowStart < fieldAssets.length; rowStart += SIGNATURE_CARD_COLS) {
            const rowAssets = fieldAssets.slice(rowStart, rowStart + SIGNATURE_CARD_COLS)
            for (let i = 0; i < rowAssets.length; i += 1) {
              const asset = rowAssets[i]
              const cardX = marginX + i * (cardWidth + CARD_GAP)
              slide.addShape(pptx.ShapeType.rect, {
                x: cardX, y, w: cardWidth, h: cardHeight,
                line: { color: 'D0D0D0', width: 1 }, fill: { color: 'FFFFFF' },
              })
              if (isEmbeddableImageAsset(asset)) {
                const loaded = await loadAttachmentImageForEmbed(asset.url, CARD_IMG_W, CARD_IMG_H)
                if (loaded) {
                  const imgX = cardX + (cardWidth - loaded.width) / 2
                  const imgY = y + CARD_PAD + (CARD_IMG_H - loaded.height) / 2
                  slide.addImage({ data: loaded.dataUrl, x: imgX, y: imgY, w: loaded.width, h: loaded.height })
                }
              }
              const { date, time } = formatSignatureDateTime(asset.signed_at)
              let cy = y + CARD_PAD + CARD_IMG_H + 0.1
              slide.addText(`Role: ${asset.role_label || '—'}`, { x: cardX + CARD_PAD, y: cy, w: cardWidth - CARD_PAD * 2, h: CARD_LINE_H, fontSize: 8, bold: true, color: bodyColor })
              cy += CARD_LINE_H
              slide.addText(`Name: ${asset.signer_label || 'Unknown'}`, { x: cardX + CARD_PAD, y: cy, w: cardWidth - CARD_PAD * 2, h: CARD_LINE_H, fontSize: 8, color: bodyColor })
              cy += CARD_LINE_H
              slide.addText(`Date: ${date || '—'}`, { x: cardX + CARD_PAD, y: cy, w: cardWidth - CARD_PAD * 2, h: CARD_LINE_H, fontSize: 8, color: bodyColor })
              cy += CARD_LINE_H
              slide.addText(`Time: ${time || '—'}`, { x: cardX + CARD_PAD, y: cy, w: cardWidth - CARD_PAD * 2, h: CARD_LINE_H, fontSize: 8, color: bodyColor })
            }
            y += cardHeight + CARD_GAP
          }
        } else {
          for (const asset of fieldAssets) {
            if (isEmbeddableImageAsset(asset)) {
              const loaded = await loadAttachmentImageForEmbed(asset.url, 3.4, 2.6)
              if (loaded) {
                const imgX = marginX + (w - loaded.width) / 2
                slide.addImage({
                  data: loaded.dataUrl, x: imgX, y, w: loaded.width, h: loaded.height,
                  line: { color: 'D0D0D0', width: 1 },
                })
                y += loaded.height + gapAfterLabel + 0.15
              }
              const caption = trimmedAttachmentCaption(asset)
              if (caption) {
                slide.addText(caption, { x: marginX, y, w, h: lineHeight, fontSize: 9, italic: true, color: footerColor, align: 'center' })
                y += lineHeight + gapAfterLabel
              }
            } else {
              slide.addText(asset.file_name || 'Attachment', { x: marginX, y, w, h: lineHeight, fontSize: 9, italic: true, color: footerColor, align: 'center' })
              y += lineHeight + gapAfterLabel
            }
          }
        }
        continue
      }

      const parsed = parseFieldValue(record[key])
      if (parsed.isList) {
        if (parsed.intro) {
          slide.addText(parsed.intro, { x: marginX, y, w, h: lineHeight, fontSize: labelFontSize, color: bodyColor })
          y += lineHeight + gapAfterLabel
        }
        if (parsed.items.length === 0 && !parsed.intro) {
          slide.addText(blankPlaceholder, { x: marginX, y, w, h: lineHeight, fontSize: labelFontSize, color: bodyColor })
          y += lineHeight + gapAfterSingleValue
        } else if (parsed.items.length > 0) {
          const bulletRuns = parsed.items.map((item, i) => {
            const text = item || blankPlaceholder
            return {
              text,
              options: {
                bullet: !itemHasOwnListMarker(text),
                breakLine: i < parsed.items.length - 1,
              },
            }
          })
          const blockH = Math.min(bulletLineHeight * parsed.items.length, 3.5)
          slide.addText(bulletRuns, { x: marginX, y, w, h: blockH, fontSize: labelFontSize, color: bodyColor })
          y += blockH + gapAfterBulletBlock
        }
      } else {
        const value = parsed.text || blankPlaceholder
        const lines = value.length > 80 ? value.match(/.{1,80}(\s|$)/g) || [value] : [value]
        const h = lineHeight * lines.length
        slide.addText(lines.join('\n'), { x: marginX, y, w, h, fontSize: labelFontSize, color: bodyColor })
        y += h + gapAfterSingleValue
      }
    }
    slide.addText(footerText, { x: marginX, y: footerY, w, h: 0.3, fontSize: footerFontSize, color: footerColor })
  }

  pptx.writeFile({ fileName: filename })
}

// --- List exports: CSV, XML, JSON, Print ---

/**
 * Escape a value for CSV (wrap in quotes if contains comma, newline, or quote).
 */
function csvEscape(val) {
  const s = val == null ? '' : String(val)
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * Export a list/table to CSV.
 * @param {Array<{key: string, label: string}>} columns
 * @param {Array<Object>} rows
 * @param {string} baseFilename
 */
export function exportListToCSV(columns, rows, baseFilename) {
  const filename = `${baseFilename}_${new Date().toISOString().split('T')[0]}.csv`
  const headers = columns.map(c => c.label || c.key)
  const headerLine = headers.map(h => csvEscape(h)).join(',')
  const dataLines = rows.map(row =>
    columns.map(({ key }) => csvEscape(formatCellValue(row[key]))).join(',')
  )
  const csv = [headerLine, ...dataLines].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export a list/table to XML (simple root with row elements, each with child elements per column).
 * @param {Array<{key: string, label: string}>} columns
 * @param {Array<Object>} rows
 * @param {string} baseFilename
 */
export function exportListToXML(columns, rows, baseFilename) {
  const filename = `${baseFilename}_${new Date().toISOString().split('T')[0]}.xml`
  const rootName = baseFilename.replace(/[^a-zA-Z0-9]/g, '_') || 'Export'
  const escapeXml = (s) => {
    if (s == null) return ''
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
  const tag = (name) => name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'field'
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += `<${rootName} exported="${new Date().toISOString()}" count="${rows.length}">\n`
  rows.forEach((row, i) => {
    xml += `  <row index="${i + 1}">\n`
    columns.forEach(({ key, label }) => {
      const elName = tag(label || key)
      xml += `    <${elName}>${escapeXml(formatCellValue(row[key]))}</${elName}>\n`
    })
    xml += '  </row>\n'
  })
  xml += `</${rootName}>`
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export a list/table to JSON (array of objects with column labels as keys).
 * @param {Array<{key: string, label: string}>} columns
 * @param {Array<Object>} rows
 * @param {string} baseFilename
 */
export function exportListToJSON(columns, rows, baseFilename) {
  const filename = `${baseFilename}_${new Date().toISOString().split('T')[0]}.json`
  const data = rows.map(row => {
    const obj = {}
    columns.forEach(({ key, label }) => {
      obj[label || key] = formatCellValue(row[key])
    })
    return obj
  })
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function printHtml(html, title) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  w.onload = () => { w.print(); w.close() }
}

/**
 * Export a list/table to Print (opens printable table in new window).
 * @param {Array<{key: string, label: string}>} columns
 * @param {Array<Object>} rows
 * @param {string} baseFilename
 */
export function exportListToPrint(columns, rows, baseFilename, branding) {
  const { footerText } = resolveBranding(branding)
  const title = baseFilename.replace(/_/g, ' ')
  const headers = columns.map(c => c.label || c.key)
  const thead = headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')
  const trs = rows.map(row =>
    '<tr>' + columns.map(({ key }) => `<td>${escapeHtml(formatCellValue(row[key]))}</td>`).join('') + '</tr>'
  ).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:sans-serif;padding:16px;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #ccc;padding:8px;text-align:left;} th{background:#333;color:#fff;}</style></head>
<body><h1>${escapeHtml(title)}</h1><p>Exported: ${new Date().toLocaleString()} · ${rows.length} record(s)</p>
<table><thead><tr>${thead}</tr></thead><tbody>${trs}</tbody></table>
<p style="margin-top:24px;color:#666;">${footerText}</p></body></html>`
  printHtml(html, title)
}

// --- Record exports: CSV, XML, JSON, Print ---

/**
 * Export a single record to CSV (one data row after header row).
 * @param {Array<{title: string, fields: Array<{key: string, label: string}>}>|Array<{key: string, label: string}>} sectionsOrFields
 * @param {Object} record
 * @param {string} baseFilename
 */
export function exportRecordToCSV(sectionsOrFields, record, baseFilename, blankPlaceholder = '—') {
  const filename = `${baseFilename}_${new Date().toISOString().split('T')[0]}.csv`
  const isSections = Array.isArray(sectionsOrFields) && sectionsOrFields.length > 0 && sectionsOrFields[0]?.fields != null
  const flatFields = isSections ? getNumberedSectionInfo(sectionsOrFields).flatNumberedFields : sectionsOrFields
  const headers = flatFields.map(f => f.label || f.key)
  const values = flatFields.map(f => csvEscape(guidedCellValue(f, record[f.key], blankPlaceholder)))
  const csv = [headers.map(h => csvEscape(h)).join(','), values.join(',')].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export a single record to XML (flat key-value elements under one record element).
 * @param {Array<{title: string, fields: Array<{key: string, label: string}>}>|Array<{key: string, label: string}>} sectionsOrFields
 * @param {Object} record
 * @param {string} baseFilename
 */
export function exportRecordToXML(sectionsOrFields, record, baseFilename, blankPlaceholder = '—') {
  const filename = `${baseFilename}_${new Date().toISOString().split('T')[0]}.xml`
  const isSections = Array.isArray(sectionsOrFields) && sectionsOrFields.length > 0 && sectionsOrFields[0]?.fields != null
  const flatFields = isSections ? getNumberedSectionInfo(sectionsOrFields).flatNumberedFields : sectionsOrFields
  const rootName = baseFilename.replace(/[^a-zA-Z0-9]/g, '_') || 'Record'
  const escapeXml = (s) => {
    if (s == null) return ''
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
  const tag = (name) => name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'field'
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += `<${rootName} exported="${new Date().toISOString()}">\n`
  flatFields.forEach((field) => {
    const { key, label } = field
    const elName = tag(label || key)
    const guidance = fieldGuidanceLines(field)
    const guidanceAttr = guidance.length
      ? ` guidance="${escapeXml(guidance.join(' | '))}"`
      : ''
    xml += `  <${elName}${guidanceAttr}>${escapeXml(guidedCellValue(field, record[key], blankPlaceholder))}</${elName}>\n`
  })
  xml += `</${rootName}>`
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export a single record to JSON (object with field labels as keys).
 * @param {Array<{title: string, fields: Array<{key: string, label: string}>}>|Array<{key: string, label: string}>} sectionsOrFields
 * @param {Object} record
 * @param {string} baseFilename
 */
export function exportRecordToJSON(sectionsOrFields, record, baseFilename, blankPlaceholder = '—') {
  const filename = `${baseFilename}_${new Date().toISOString().split('T')[0]}.json`
  const isSections = Array.isArray(sectionsOrFields) && sectionsOrFields.length > 0 && sectionsOrFields[0]?.fields != null
  const flatFields = isSections ? getNumberedSectionInfo(sectionsOrFields).flatNumberedFields : sectionsOrFields
  const obj = {}
  flatFields.forEach((field) => {
    const { key, label } = field
    const entry = { value: guidedCellValue(field, record[key], blankPlaceholder) }
    const guidance = fieldGuidanceLines(field)
    if (guidance.length) entry.guidance = guidance
    obj[label || key] = entry
  })
  const json = JSON.stringify(obj, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export a single record to Print (opens printable key-value document in new window).
 * @param {Array<{title: string, fields: Array<{key: string, label: string}>}>|Array<{key: string, label: string}>} sectionsOrFields
 * @param {Object} record
 * @param {string} baseFilename
 */
export function exportRecordToPrint(sectionsOrFields, record, baseFilename, branding, blankPlaceholder = '—', attachmentAssets = {}) {
  const { footerText, headerHex } = resolveBranding(branding)
  const headerCss = `#${headerHex}`
  const title = baseFilename.replace(/_/g, ' ')
  const isSections = Array.isArray(sectionsOrFields) && sectionsOrFields.length > 0 && sectionsOrFields[0]?.fields != null
  const { sectionTitles, flatNumberedFields } = isSections ? getNumberedSectionInfo(sectionsOrFields) : { sectionTitles: [], flatNumberedFields: sectionsOrFields || [] }

  // Attachment field (v863) — <img> tags render inline when the print window loads (no pre-fetch
  // needed, unlike Word/PPT/PDF which must embed binary bytes); non-image files show as a link.
  const attachmentCellHtml = (key) => {
    const assets = attachmentAssets[key]
    if (!Array.isArray(assets)) return null
    if (assets.length === 0) return escapeHtml(blankPlaceholder)
    if (isSignatureField(key)) {
      // Signature card grid (v895) — one card per signatory: reduced-size signature
      // image, then Role/Name/Date/Time labels, wrapping to further rows as needed.
      const cards = assets.map((asset) => {
        const { date, time } = formatSignatureDateTime(asset.signed_at)
        const imgHtml = isEmbeddableImageAsset(asset)
          ? `<img src="${asset.url}" alt="${escapeHtml(asset.role_label || 'Signature')}" style="max-width:140px;max-height:90px;object-fit:contain;display:block;margin:0 auto 10px;" />`
          : ''
        return `<div style="width:180px;border:1px solid #d0d0d0;border-radius:4px;padding:10px;text-align:center;">
          ${imgHtml}
          <div style="font-size:11px;"><strong>Role:</strong> ${escapeHtml(asset.role_label || '—')}</div>
          <div style="font-size:11px;"><strong>Name:</strong> ${escapeHtml(asset.signer_label || 'Unknown')}</div>
          <div style="font-size:11px;"><strong>Date:</strong> ${escapeHtml(date || '—')}</div>
          <div style="font-size:11px;"><strong>Time:</strong> ${escapeHtml(time || '—')}</div>
        </div>`
      }).join('')
      return `<div style="display:flex;flex-wrap:wrap;gap:14px;">${cards}</div>`
    }
    return assets.map((asset) => {
      if (isEmbeddableImageAsset(asset)) {
        const caption = trimmedAttachmentCaption(asset)
        const captionHtml = caption
          ? `<div style="font-size:11px;font-style:italic;color:#888;margin-top:10px;text-align:center;">${escapeHtml(caption)}</div>`
          : ''
        return `<div style="margin-bottom:16px;"><img src="${asset.url}" alt="${escapeHtml(caption || asset.file_name)}" style="max-width:420px;max-height:340px;object-fit:contain;display:block;border:1px solid #d0d0d0;border-radius:4px;padding:2px;" />${captionHtml}</div>`
      }
      return `<div style="margin-bottom:8px;">${asset.url ? `<a href="${asset.url}">${escapeHtml(asset.file_name)}</a>` : escapeHtml(asset.file_name)}</div>`
    }).join('')
  }

  let body = ''
  if (isSections && sectionTitles.length) {
    let flatIdx = 0
    sectionsOrFields.forEach((sec, sIdx) => {
      body += `<h2 style="background:${headerCss};color:#fff;padding:8px 10px;margin:16px 0 8px;font-size:14px;">${escapeHtml(sectionTitles[sIdx])}</h2><table style="margin-bottom:16px;">`
      ;(sec.fields || []).forEach((field) => {
        const { key, label } = field
        const l = flatNumberedFields[flatIdx]?.label ?? (label || key)
        flatIdx += 1
        const guidanceHtml = fieldGuidanceLines(field)
          .map((line) => `<div style="font-size:12px;font-style:italic;color:#666;margin-top:2px;">${escapeHtml(line)}</div>`)
          .join('')
        const valueHtml = attachmentCellHtml(key) ?? escapeHtml(displayValue(record[key], blankPlaceholder))
        body += `<tr><td style="font-weight:bold;padding:4px 8px;vertical-align:top;">${escapeHtml(l)}${guidanceHtml}</td><td style="padding:4px 8px;">${valueHtml}</td></tr>`
      })
      body += '</table>'
    })
  } else {
    body = '<table>'
    flatNumberedFields.forEach((field) => {
      const { key, label } = field
      const guidanceHtml = fieldGuidanceLines(field)
        .map((line) => `<div style="font-size:12px;font-style:italic;color:#666;margin-top:2px;">${escapeHtml(line)}</div>`)
        .join('')
      const valueHtml = attachmentCellHtml(key) ?? escapeHtml(displayValue(record[key], blankPlaceholder))
      body += `<tr><td style="font-weight:bold;padding:4px 8px;vertical-align:top;">${escapeHtml(label || key)}${guidanceHtml}</td><td style="padding:4px 8px;">${valueHtml}</td></tr>`
    })
    body += '</table>'
  }
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:sans-serif;padding:16px;} table{border-collapse:collapse;} td{border:1px solid #ccc;} h2{margin-top:16px;}</style></head>
<body><h1>${escapeHtml(title)}</h1><p>Exported: ${new Date().toLocaleString()}</p>${body}
<p style="margin-top:24px;color:#666;">${escapeHtml(footerText)}</p></body></html>`
  printHtml(html, title)
}

/**
 * Build the jsPDF document for a single record (multi-section key/value pages), unsaved.
 * Shared by exportRecordToPDF (downloads it) and generateRecordPdfBlob (previews it).
 * @param {Array<{title: string, fields: Array<{key: string, label: string, help?: string, example?: string}>}>} sections
 * @param {Object} record
 * @param {string} title - document title (shown at the top of page 1)
 * @param {object|null} [branding]
 * @param {string} [blankPlaceholder]
 * @returns {Promise<import('jspdf').jsPDF>}
 */
async function _buildRecordPdfDocument(sections, record, title, branding, blankPlaceholder = '—', attachmentAssets = {}) {
  const { jsPDF } = await import('jspdf')
  const { footerText, headerHex } = resolveBranding(branding)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 40
  const maxWidth = pageWidth - marginX * 2
  let y = 40

  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - 40) {
      doc.addPage()
      y = 40
    }
  }

  doc.setFontSize(14)
  doc.text(title, marginX, y)
  y += 18
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Exported: ${new Date().toLocaleString()}`, marginX, y)
  doc.setTextColor(0)
  y += 24

  const { sectionTitles, flatNumberedFields } = getNumberedSectionInfo(sections || [])
  let flatIdx = 0
  const fillHex = (headerHex || '1a365d').replace('#', '')
  const r = parseInt(fillHex.slice(0, 2), 16) || 26
  const g = parseInt(fillHex.slice(2, 4), 16) || 54
  const b = parseInt(fillHex.slice(4, 6), 16) || 93

  for (const [sIdx, { title: sectionTitle, fields }] of (sections || []).entries()) {
    if (!sectionTitle || !fields?.length) continue
    ensureSpace(28)
    doc.setFillColor(r, g, b)
    doc.rect(marginX, y - 12, maxWidth, 20, 'F')
    doc.setTextColor(255)
    doc.setFontSize(11)
    doc.text(sectionTitles[sIdx], marginX + 6, y)
    doc.setTextColor(0)
    y += 22

    for (const field of fields) {
      const { key, label } = field
      const numberedLabel = flatNumberedFields[flatIdx]?.label ?? (label || key)
      flatIdx += 1

      ensureSpace(20)
      doc.setFont(undefined, 'bold')
      doc.setFontSize(9)
      const labelLines = doc.splitTextToSize(numberedLabel, maxWidth)
      doc.text(labelLines, marginX, y)
      y += labelLines.length * 12 + 2
      doc.setFont(undefined, 'normal')

      const fieldAssets = attachmentAssets[key]
      if (Array.isArray(fieldAssets)) {
        // Attachment field (v863) — embed images inline; non-image files as filename + caption text.
        if (fieldAssets.length === 0) {
          ensureSpace(14)
          doc.text(blankPlaceholder, marginX, y)
          y += 14
        } else if (isSignatureField(key)) {
          // Signature card grid (v895) — one card per signatory: reduced-size signature
          // image, then Role/Name/Date/Time labels, wrapping to further rows as needed.
          const CARD_GAP = 12
          const CARD_PAD = 8
          const CARD_IMG_W = 90
          const CARD_IMG_H = 60
          const CARD_LINE_H = 11
          const cardWidth = (maxWidth - CARD_GAP * (SIGNATURE_CARD_COLS - 1)) / SIGNATURE_CARD_COLS
          const cardHeight = CARD_PAD * 2 + CARD_IMG_H + 6 + CARD_LINE_H * 4
          const fitCardText = (text, maxTextWidth) => {
            let t = text
            while (t.length > 3 && doc.getTextWidth(t) > maxTextWidth) t = t.slice(0, -2)
            return t.length < text.length ? `${t.slice(0, -1)}…` : t
          }
          for (let rowStart = 0; rowStart < fieldAssets.length; rowStart += SIGNATURE_CARD_COLS) {
            const rowAssets = fieldAssets.slice(rowStart, rowStart + SIGNATURE_CARD_COLS)
            const loadedRow = await Promise.all(rowAssets.map((asset) => (
              isEmbeddableImageAsset(asset) ? loadAttachmentImageForEmbed(asset.url, CARD_IMG_W, CARD_IMG_H) : null
            )))
            ensureSpace(cardHeight + CARD_GAP)
            rowAssets.forEach((asset, i) => {
              const cardX = marginX + i * (cardWidth + CARD_GAP)
              const cardY = y
              doc.setDrawColor(210)
              doc.setLineWidth(0.75)
              doc.rect(cardX, cardY, cardWidth, cardHeight)
              doc.setDrawColor(0)
              const loaded = loadedRow[i]
              if (loaded) {
                const imgX = cardX + (cardWidth - loaded.width) / 2
                const imgY = cardY + CARD_PAD + (CARD_IMG_H - loaded.height) / 2
                doc.addImage(loaded.dataUrl, imgX, imgY, loaded.width, loaded.height)
              }
              const textX = cardX + CARD_PAD
              const textMaxWidth = cardWidth - CARD_PAD * 2
              let cy = cardY + CARD_PAD + CARD_IMG_H + 10
              doc.setFontSize(8)
              doc.setFont(undefined, 'bold')
              doc.text(fitCardText(`Role: ${asset.role_label || '—'}`, textMaxWidth), textX, cy)
              cy += CARD_LINE_H
              doc.setFont(undefined, 'normal')
              doc.text(fitCardText(`Name: ${asset.signer_label || 'Unknown'}`, textMaxWidth), textX, cy)
              cy += CARD_LINE_H
              const { date, time } = formatSignatureDateTime(asset.signed_at)
              doc.text(`Date: ${date || '—'}`, textX, cy)
              cy += CARD_LINE_H
              doc.text(`Time: ${time || '—'}`, textX, cy)
            })
            doc.setFontSize(9)
            doc.setTextColor(0)
            y += cardHeight + CARD_GAP
          }
        } else {
          const FIGURE_MAX_WIDTH = 360
          const FIGURE_MAX_HEIGHT = 280
          for (const asset of fieldAssets) {
            if (isEmbeddableImageAsset(asset)) {
              const loaded = await loadAttachmentImageForEmbed(asset.url, FIGURE_MAX_WIDTH, FIGURE_MAX_HEIGHT)
              if (loaded) {
                ensureSpace(loaded.height + 30)
                const imgX = marginX + (maxWidth - loaded.width) / 2
                doc.setDrawColor(210)
                doc.setLineWidth(0.75)
                doc.rect(imgX, y, loaded.width, loaded.height)
                doc.addImage(loaded.dataUrl, imgX, y, loaded.width, loaded.height)
                doc.setDrawColor(0)
                y += loaded.height + 16
              }
              const caption = trimmedAttachmentCaption(asset)
              if (caption) {
                doc.setFont(undefined, 'italic')
                doc.setFontSize(8)
                doc.setTextColor(120)
                const captionLines = doc.splitTextToSize(caption, maxWidth)
                ensureSpace(captionLines.length * 11 + 14)
                doc.text(captionLines, marginX + maxWidth / 2, y, { align: 'center' })
                y += captionLines.length * 11 + 14
                doc.setFont(undefined, 'normal')
                doc.setFontSize(9)
                doc.setTextColor(0)
              }
            } else {
              const fileLine = asset.file_name || 'Attachment'
              doc.setFont(undefined, 'italic')
              doc.setFontSize(8)
              doc.setTextColor(120)
              const fileLines = doc.splitTextToSize(fileLine, maxWidth)
              ensureSpace(fileLines.length * 11 + 14)
              doc.text(fileLines, marginX + maxWidth / 2, y, { align: 'center' })
              y += fileLines.length * 11 + 14
              doc.setFont(undefined, 'normal')
              doc.setFontSize(9)
              doc.setTextColor(0)
            }
          }
        }
        y += 4
        continue
      }

      const parsed = parseFieldValue(record[key])
      let value
      if (parsed.isList) {
        value = formatParsedListDisplay(parsed, blankPlaceholder)
      } else {
        value = parsed.text || blankPlaceholder
      }
      const guidance = fieldGuidanceLines(field)
      if (guidance.length) value = `${guidance.join('\n')}\n\n${value}`

      const valueLines = doc.splitTextToSize(value, maxWidth)
      ensureSpace(valueLines.length * 12 + 10)
      doc.text(valueLines, marginX, y)
      y += valueLines.length * 12 + 10
    }
    y += 8
  }

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(100)
    doc.text(footerText, marginX, pageHeight - 24)
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginX, pageHeight - 24, { align: 'right' })
  }
  return doc
}

/**
 * Export a single record to PDF (multi-section key/value pages).
 * @param {Array<{title: string, fields: Array<{key: string, label: string, help?: string, example?: string}>}>} sections
 * @param {Object} record
 * @param {string} baseFilename
 * @param {object|null} [branding]
 * @param {string} [blankPlaceholder]
 */
export async function exportRecordToPDF(sections, record, baseFilename, branding, blankPlaceholder = '—', attachmentAssets = {}) {
  const title = baseFilename.replace(/_/g, ' ')
  const filename = `${baseFilename}_${new Date().toISOString().split('T')[0]}.pdf`
  const doc = await _buildRecordPdfDocument(sections, record, title, branding, blankPlaceholder, attachmentAssets)
  doc.save(filename)
}

/**
 * Generate the same PDF rendition as exportRecordToPDF, as a Blob — for in-app preview
 * (RecordPreviewModal) instead of triggering a download. v853.
 * @param {Array<{title: string, fields: Array<{key: string, label: string}>}>} sections
 * @param {Object} record
 * @param {string} baseFilename - used only for the on-page title, no file is saved
 * @param {object|null} [branding]
 * @param {string} [blankPlaceholder]
 * @returns {Promise<Blob>}
 */
export async function generateRecordPdfBlob(sections, record, baseFilename, branding, blankPlaceholder = '—', attachmentAssets = {}) {
  const title = baseFilename.replace(/_/g, ' ')
  const doc = await _buildRecordPdfDocument(sections, record, title, branding, blankPlaceholder, attachmentAssets)
  return doc.output('blob')
}
