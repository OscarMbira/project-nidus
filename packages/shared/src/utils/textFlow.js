/**
 * Readable workflows in register documents (v1366).
 *
 * Text written as a chain — "New → Triaged → Assigned → Fixed → Closed (or Reopened). Daily triage …"
 * — is shown as numbered steps followed by the rest of the sentence, instead of one long line of
 * arrows. Recognised separators: → ⇒ ➔ ⟶ -> => (with or without spaces), plus › and » between
 * spaces. A chain needs at least three steps.
 *
 * pdfSafeText() also maps characters the built-in PDF fonts cannot draw (arrows, ≤ ≥ ≠, ticks …) to
 * readable equivalents, so they never print as garbage.
 */

const ARROW = /\s*(?:→|⇒|➔|⟶|->|=>)\s*|\s+[›»]\s+/

/**
 * @param {string} line
 * @returns {{ steps: string[], intro: string, rest: string } | null}  null when the line is not a chain
 */
export function splitFlowSteps(line) {
  const text = String(line ?? '').trim()
  const parts = text.split(ARROW).map((p) => p.trim())
  if (parts.length < 3 || parts.some((p) => !p)) return null
  // Text before the first step ("Workflow: New") and after the last ("Closed. Daily triage …").
  let intro = ''
  const first = parts[0].match(/^(.*[:.])\s+(\S.*)$/)
  if (first && first[2].length <= 40) {
    intro = first[1].trim()
    parts[0] = first[2].trim()
  }
  let rest = ''
  const last = parts[parts.length - 1].match(/^(.*?[.;])\s+(\S.*)$/)
  if (last) {
    parts[parts.length - 1] = last[1].replace(/[.;]$/, '').trim()
    rest = last[2].trim()
  } else {
    parts[parts.length - 1] = parts[parts.length - 1].replace(/[.;]$/, '').trim()
  }
  // Steps are short labels; a long "step" means the arrows were prose, not a workflow.
  if (parts.some((p) => p.length > 60)) return null
  return { steps: parts, intro, rest }
}

/**
 * Lines of text → blocks: { type: 'p', text } or { type: 'steps', items }.
 * @param {string[]} lines
 */
export function textBlocks(lines) {
  const blocks = []
  for (const line of lines || []) {
    const flow = splitFlowSteps(line)
    if (!flow) {
      blocks.push({ type: 'p', text: line })
      continue
    }
    if (flow.intro) blocks.push({ type: 'p', text: flow.intro })
    blocks.push({ type: 'steps', items: flow.steps })
    if (flow.rest) blocks.push({ type: 'p', text: flow.rest })
  }
  return blocks
}

/** Blocks → plain lines (steps numbered), for exports that only take text. */
export function blocksToLines(blocks) {
  return (blocks || []).flatMap((b) => (b.type === 'steps' ? b.items.map((s, i) => `${i + 1}. ${s}`) : [b.text]))
}

// Characters outside the built-in PDF font encoding (WinAnsi) → readable equivalents.
const PDF_REPLACEMENTS = [
  [/[→⇒➔⟶➜➝➞]/g, '>'],
  [/[←⇐]/g, '<'],
  [/[↔⇔]/g, '<>'],
  [/≤/g, '<='],
  [/≥/g, '>='],
  [/≠/g, '!='],
  [/≈/g, '~'],
  [/[✓✔☑]/g, 'Yes'],
  [/[✗✘☒]/g, 'No'],
  [/[\u2010\u2011\u2012]/g, '-'],
  [/\u2212/g, '-'],
  [/[\u00A0\u2007\u202F]/g, ' '],
]
// WinAnsi characters above Latin-1 that the PDF fonts can draw.
const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ')

/** Text safe for jsPDF's built-in fonts: known symbols mapped, anything else unsupported dropped. */
export function pdfSafeText(value) {
  let text = String(value ?? '')
  for (const [pattern, replacement] of PDF_REPLACEMENTS) text = text.replace(pattern, replacement)
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0)
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 255) || WIN_ANSI_EXTRA.has(ch)) out += ch
  }
  return out
}
