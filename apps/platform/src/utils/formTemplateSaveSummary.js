/**
 * Build a user-facing summary of what changed when saving a form template schema.
 * Used by Form Template Builder success confirmation (rule 16).
 */

function fieldLabel(field) {
  const label = String(field?.label || '').trim()
  const key = String(field?.key || '').trim()
  if (label && key && label !== key) return `${label} (${key})`
  return label || key || 'field'
}

function sectionLabel(section) {
  const title = String(section?.title || '').trim()
  const key = String(section?.key || '').trim()
  if (title && key && title !== key) return `${title} (${key})`
  return title || key || 'section'
}

function fieldMap(sections = []) {
  const map = new Map()
  for (const section of sections || []) {
    const sk = String(section?.key || '').trim()
    for (const field of section?.fields || []) {
      const fk = String(field?.key || '').trim()
      if (!sk || !fk) continue
      map.set(`${sk}::${fk}`, { section, field })
    }
  }
  return map
}

function sectionMap(sections = []) {
  const map = new Map()
  for (const section of sections || []) {
    const sk = String(section?.key || '').trim()
    if (sk) map.set(sk, section)
  }
  return map
}

function optionsSignature(options) {
  return JSON.stringify(options || [])
}

function describeFieldEdits(before, after) {
  const parts = []
  if (String(before.label || '') !== String(after.label || '')) parts.push('label')
  if (String(before.type || '') !== String(after.type || '')) parts.push('type')
  if (Boolean(before.required) !== Boolean(after.required)) {
    parts.push(after.required ? 'marked required' : 'marked optional')
  }
  if (optionsSignature(before.options) !== optionsSignature(after.options)) parts.push('options')
  if (String(before.minLength ?? '') !== String(after.minLength ?? '')
    || String(before.maxLength ?? '') !== String(after.maxLength ?? '')) {
    parts.push('min/max length')
  }
  if (String(before.accept || '') !== String(after.accept || '')
    || Number(before.maxFiles) !== Number(after.maxFiles)) {
    parts.push('attachment settings')
  }
  return parts
}

function countFields(sections = []) {
  return (sections || []).reduce((n, s) => n + (s.fields || []).length, 0)
}

/**
 * @param {object|null} beforeForm — previous form state (from baseline snapshot)
 * @param {object} afterForm — form state being saved
 * @param {{ isCreate?: boolean, templateCode?: string, versionNumber?: number|string|null }} meta
 * @returns {string}
 */
export function summarizeFormTemplateSaveChanges(beforeForm, afterForm, meta = {}) {
  const code = String(meta.templateCode || afterForm?.template_code || '').trim() || 'Template'
  const version = meta.versionNumber != null && meta.versionNumber !== ''
    ? ` (version ${meta.versionNumber})`
    : ''
  const afterSections = afterForm?.sections || []

  if (meta.isCreate || !beforeForm) {
    const sectionCount = afterSections.length
    const fieldCount = countFields(afterSections)
    return [
      `Created template ${code} successfully${version}.`,
      `• Added ${sectionCount} section${sectionCount === 1 ? '' : 's'} and ${fieldCount} field${fieldCount === 1 ? '' : 's'}.`,
    ].join('\n')
  }

  const lines = []
  const beforeSections = beforeForm.sections || []

  if (String(beforeForm.name || '') !== String(afterForm.name || '')) {
    lines.push(`• Updated template name to “${afterForm.name || '(blank)'}”.`)
  }
  if (String(beforeForm.process_group || '') !== String(afterForm.process_group || '')) {
    lines.push(`• Updated process group to “${afterForm.process_group || '(blank)'}”.`)
  }
  if (Boolean(beforeForm.is_active) !== Boolean(afterForm.is_active)) {
    lines.push(afterForm.is_active ? '• Activated the template.' : '• Deactivated the template.')
  }
  if (String(beforeForm.template_code || '') !== String(afterForm.template_code || '')) {
    lines.push(`• Updated template code to ${afterForm.template_code}.`)
  }

  const beforeSec = sectionMap(beforeSections)
  const afterSec = sectionMap(afterSections)

  for (const [key, section] of afterSec) {
    if (!beforeSec.has(key)) {
      lines.push(`• Added section “${sectionLabel(section)}”.`)
    } else if (String(beforeSec.get(key).title || '') !== String(section.title || '')) {
      lines.push(`• Renamed section to “${sectionLabel(section)}”.`)
    }
  }
  for (const [key, section] of beforeSec) {
    if (!afterSec.has(key)) {
      lines.push(`• Removed section “${sectionLabel(section)}”.`)
    }
  }

  const beforeKeys = beforeSections.map((s) => s.key).join('|')
  const afterKeys = afterSections.map((s) => s.key).join('|')
  if (
    beforeKeys !== afterKeys
    && beforeSec.size === afterSec.size
    && [...beforeSec.keys()].every((k) => afterSec.has(k))
  ) {
    lines.push('• Reordered sections.')
  }

  const beforeFields = fieldMap(beforeSections)
  const afterFields = fieldMap(afterSections)

  for (const [id, { field, section }] of afterFields) {
    if (!beforeFields.has(id)) {
      lines.push(`• Added field “${fieldLabel(field)}” in “${sectionLabel(section)}”.`)
      continue
    }
    const prev = beforeFields.get(id).field
    const edits = describeFieldEdits(prev, field)
    if (edits.length) {
      lines.push(`• Updated field “${fieldLabel(field)}” (${edits.join(', ')}).`)
    }
  }
  for (const [id, { field, section }] of beforeFields) {
    if (!afterFields.has(id)) {
      lines.push(`• Removed field “${fieldLabel(field)}” from “${sectionLabel(section)}”.`)
    }
  }

  // Field reorder within a section (same keys, different order)
  for (const afterSection of afterSections) {
    const sk = afterSection.key
    const beforeSection = beforeSec.get(sk)
    if (!beforeSection) continue
    const beforeOrder = (beforeSection.fields || []).map((f) => f.key).join('|')
    const afterOrder = (afterSection.fields || []).map((f) => f.key).join('|')
    if (
      beforeOrder !== afterOrder
      && new Set(beforeOrder.split('|').filter(Boolean)).size
        === new Set(afterOrder.split('|').filter(Boolean)).size
    ) {
      // Only report if no add/remove for this section already covered reorder noise
      const addedOrRemoved = [...afterFields.keys(), ...beforeFields.keys()].some((id) => {
        if (!id.startsWith(`${sk}::`)) return false
        return !beforeFields.has(id) || !afterFields.has(id)
      })
      if (!addedOrRemoved) {
        lines.push(`• Reordered fields in “${sectionLabel(afterSection)}”.`)
      }
    }
  }

  const MAX = 8
  let detailLines = lines
  if (lines.length > MAX) {
    const extra = lines.length - MAX
    detailLines = [...lines.slice(0, MAX), `• …and ${extra} more change${extra === 1 ? '' : 's'}.`]
  }

  if (detailLines.length === 0) {
    return `Template ${code} saved successfully${version}.\n• No schema changes detected (new version still recorded).`
  }

  return [`Template ${code} updated successfully${version}.`, ...detailLines].join('\n')
}

/**
 * Summarise org default-content / guidance save for the success modal.
 * Lists each field name on its own bullet line.
 */
export function summarizeFormTemplateDefaultsSave({
  templateCode,
  entries = [],
} = {}) {
  const code = String(templateCode || '').trim() || 'Template'
  const saved = entries.filter((e) => !e.clear)
  const cleared = entries.filter((e) => e.clear)
  const lines = [`Template ${code} default content saved successfully.`]

  const displayName = (entry) => {
    const label = String(entry?.label || '').trim()
    const key = String(entry?.fieldKey || '').trim()
    if (label && key && label !== key) return `${label} (${key})`
    return label || key || 'field'
  }

  const MAX_NAMES = 12
  const appendNamedList = (header, list) => {
    lines.push(header)
    const names = list.map(displayName)
    const shown = names.slice(0, MAX_NAMES)
    for (const name of shown) {
      lines.push(`• ${name}`)
    }
    if (names.length > MAX_NAMES) {
      const extra = names.length - MAX_NAMES
      lines.push(`• …and ${extra} more`)
    }
  }

  if (saved.length) {
    appendNamedList(
      `Updated sample/guidance text for ${saved.length} field${saved.length === 1 ? '' : 's'}:`,
      saved,
    )
  }
  if (cleared.length) {
    appendNamedList(
      `Cleared defaults for ${cleared.length} field${cleared.length === 1 ? '' : 's'}:`,
      cleared,
    )
  }
  if (!saved.length && !cleared.length) {
    lines.push('• No default-content changes were pending.')
  }
  return lines.join('\n')
}
