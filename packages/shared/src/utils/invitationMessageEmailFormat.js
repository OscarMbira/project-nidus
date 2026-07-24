/**
 * Format invitation template bodies (markdown-lite) for HTML and plain-text email.
 */

export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function stripMarkdownBold(text) {
  return String(text ?? '').replace(/\*\*([^*]+)\*\*/g, '$1')
}

/**
 * Split text into plain / bold segments for React rendering.
 * @param {string} text
 * @returns {{ type: 'text' | 'bold', value: string }[]}
 */
export function splitMarkdownBoldParts(text) {
  const s = String(text ?? '')
  const parts = []
  const re = /\*\*([^*]+)\*\*/g
  let last = 0
  let match
  while ((match = re.exec(s)) !== null) {
    if (match.index > last) {
      parts.push({ type: 'text', value: s.slice(last, match.index) })
    }
    parts.push({ type: 'bold', value: match[1] })
    last = match.index + match[0].length
  }
  if (last < s.length) {
    parts.push({ type: 'text', value: s.slice(last) })
  }
  return parts.length ? parts : [{ type: 'text', value: s }]
}

/**
 * Insert paragraph breaks before expiry / sign-off when stored as one line.
 * @param {string} message
 */
export function normalizeInvitationMessageLineBreaks(message) {
  let s = String(message ?? '').trim()
  if (!s) return s
  s = s.replace(/\s+(Please accept within\b)/gi, '\n\n$1')
  s = s.replace(/\s+(Kind regards,?)/gi, '\n\n$1')
  return s
}

/**
 * Parse invitation message for in-app display (accept page, previews).
 * @param {string} message
 * @param {{ organisationName?: string, skipRedundantIntro?: boolean }} [options]
 */
export function prepareInvitationMessageForDisplay(message, options = {}) {
  const { organisationName = '', skipRedundantIntro = true } = options
  let normalized = String(message ?? '').trim()
  if (!normalized) {
    return { body: [], expiry: null, signOff: null }
  }
  if (organisationName) {
    normalized = normalizeInvitationMessageOrganisation(normalized, organisationName)
  }
  normalized = normalizeInvitationMessageLineBreaks(normalized)
  return parseInvitationMessageBlocks(normalized, { skipRedundantIntro })
}

export function applyMarkdownBold(htmlEscaped) {
  return String(htmlEscaped).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

const INTRO_PATTERN = /^You have been invited to join\b/i
const EXPIRY_PATTERN = /Please accept within|invitation expires/i
const SIGNOFF_PATTERN = /^Kind regards,?/i
const GENERIC_ORG_LINE = /^(our organisation|your organisation)$/i

/**
 * Align sign-off / body placeholders with the real organisation name used in the email footer.
 */
export function normalizeInvitationMessageOrganisation(message, organisationName) {
  const org = String(organisationName ?? '').trim()
  if (!org || message == null) return message
  let s = String(message)
  s = s.replaceAll('{{organisation_name}}', org)
  s = s.replaceAll('{{sender_organisation}}', org)
  s = s.replace(/\bour organisation\b/gi, org)
  s = s.replace(/\byour organisation\b/gi, org)
  return s
}

/**
 * Remove the boilerplate first sentence when the email header already states the invite.
 */
export function stripRedundantInvitationIntro(block) {
  if (!block || !INTRO_PATTERN.test(block)) return block
  const match = block.match(/^You have been invited to join.+?\bas\s+(?:a\s+)?.+?\.\s*/is)
  if (match) {
    const remainder = block.slice(match[0].length).trim()
    return remainder || ''
  }
  return block
}

/**
 * @param {string} message
 * @param {{ skipRedundantIntro?: boolean }} [options]
 */
export function parseInvitationMessageBlocks(message, options = {}) {
  const { skipRedundantIntro = true } = options
  const trimmed = String(message ?? '').trim()
  if (!trimmed) {
    return { body: [], expiry: null, signOff: null }
  }

  const rawBlocks = trimmed.split(/\n\n+/).map((b) => b.trim()).filter(Boolean)
  const body = []
  let expiry = null
  let signOff = null

  for (let i = 0; i < rawBlocks.length; i++) {
    let block = rawBlocks[i]
    if (i === 0 && skipRedundantIntro) {
      block = stripRedundantInvitationIntro(block)
      if (!block) continue
    }
    if (SIGNOFF_PATTERN.test(block)) {
      signOff = block
    } else if (EXPIRY_PATTERN.test(block)) {
      expiry = block
    } else if (block) {
      body.push(block)
    }
  }

  return { body, expiry, signOff }
}

function renderSignOffHtml(signOffBlock, organisationName = '') {
  const lines = signOffBlock.split(/\n/).map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return ''

  const nameLine = lines[1] ? applyMarkdownBold(escapeHtml(stripMarkdownBold(lines[1]))) : ''
  let orgRaw = lines[2] ? stripMarkdownBold(lines[2]) : ''
  const orgResolved = String(organisationName ?? '').trim()
  if (orgResolved && (!orgRaw || GENERIC_ORG_LINE.test(orgRaw))) {
    orgRaw = orgResolved
  }
  const orgLine = orgRaw ? escapeHtml(orgRaw) : ''

  return `<div style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb;">
    <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Kind regards,</p>
    ${nameLine ? `<p style="margin:0;color:#111827;font-size:15px;line-height:1.5;">${nameLine}</p>` : ''}
    ${orgLine ? `<p style="margin:6px 0 0;color:#6b7280;font-size:14px;line-height:1.5;">${orgLine}</p>` : ''}
  </div>`
}

function renderParagraphHtml(text, { isLast = false } = {}) {
  const html = applyMarkdownBold(escapeHtml(text))
  const margin = isLast ? 'margin:0;' : 'margin:0 0 12px;'
  return `<p style="${margin}color:#374151;font-size:15px;line-height:1.65;">${html}</p>`
}

function renderExpiryHtml(text) {
  const html = applyMarkdownBold(escapeHtml(text))
  return `<div style="background:#eff6ff;border:1px solid #dbeafe;border-radius:6px;padding:14px 16px;margin:16px 0 0;">
    <p style="margin:0;color:#1e40af;font-size:14px;line-height:1.55;">${html}</p>
  </div>`
}

/**
 * @param {string} message
 * @param {{ skipRedundantIntro?: boolean }} [options]
 * @returns {string} HTML fragment (no outer wrapper)
 */
export function formatInvitationPersonalMessageHtml(message, options = {}) {
  const organisationName = options.organisationName ?? ''
  const normalized = organisationName
    ? normalizeInvitationMessageOrganisation(message, organisationName)
    : message
  const { body, expiry, signOff } = parseInvitationMessageBlocks(normalized, options)
  const parts = []

  body.forEach((block, idx) => {
    parts.push(renderParagraphHtml(block, { isLast: idx === body.length - 1 && !expiry && !signOff }))
  })

  if (expiry) {
    parts.push(renderExpiryHtml(expiry))
  }

  if (signOff) {
    parts.push(renderSignOffHtml(signOff, organisationName))
  }

  return parts.join('\n')
}

/**
 * @param {string} message
 * @param {{ skipRedundantIntro?: boolean }} [options]
 */
export function formatInvitationPersonalMessagePlain(message, options = {}) {
  const organisationName = options.organisationName ?? ''
  const normalized = organisationName
    ? normalizeInvitationMessageOrganisation(message, organisationName)
    : message
  const { body, expiry, signOff } = parseInvitationMessageBlocks(normalized, options)
  const lines = []
  body.forEach((block) => lines.push(stripMarkdownBold(block)))
  if (expiry) {
    if (lines.length) lines.push('')
    lines.push(stripMarkdownBold(expiry))
  }
  if (signOff) {
    if (lines.length) lines.push('')
    signOff.split(/\n/).forEach((l) => lines.push(stripMarkdownBold(l.trim())))
  }
  return lines.filter((l) => l !== '').join('\n\n')
}

/**
 * Full styled card wrapper for project invitation emails.
 */
export function wrapInvitationMessageCard(innerHtml) {
  if (!innerHtml?.trim()) return ''
  return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;margin:24px 0;">
    ${innerHtml}
  </div>`
}
