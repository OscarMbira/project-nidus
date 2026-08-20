/**
 * Display / capture naming for project process documents (v849).
 * Source / org rows are often named "… Template" / "… (Master)" — project fill-in
 * surfaces must not present those as templates.
 */

/**
 * @param {string} name
 * @returns {string} cleaned label (may be empty if input was only suffixes)
 */
export function toProjectDocumentLabel(name) {
  let s = String(name || '').trim()
  let prev = ''
  while (s && s !== prev) {
    prev = s
    s = s
      .replace(/(\s*\(custom\))+$/gi, '')
      .replace(/\s*\(Master\)\s*$/i, '')
      .replace(/\s*\(Template\)\s*$/i, '')
      .replace(/\s+Templates?\s*$/i, '')
      .trim()
  }
  return s
}

/**
 * Append a single " (custom)" marker. Strips any existing trailing "(custom)" first so
 * org → project copy-down does not produce "Name (custom) (custom)".
 */
export function withCustomNameSuffix(name, fallback = 'Custom template') {
  const base = String(name || '')
    .replace(/(\s*\(custom\))+$/gi, '')
    .trim()
  return `${base || fallback} (custom)`
}

/**
 * True when the user is filling project-specific process-document data
 * (Project Documents register or a project-tier process_template copy).
 */
export function isProjectProcessDocumentFill(node, { isProjectDocumentsRoute = false } = {}) {
  if (!node || node.domain !== 'process_template') return false
  if (isProjectDocumentsRoute) return true
  return node.tier === 'project'
}
