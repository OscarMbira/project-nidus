/**
 * Parse / serialize team role ↔ required-skills associations.
 * Shape: [{ role, skills }] where skills is a newline-joined string (MultiLineList).
 */

export function parseRoleSkillsLinks(value) {
  if (value == null || value === '') return []
  if (Array.isArray(value)) {
    return value
      .map((row) => ({
        role: String(row?.role ?? row?.role_label ?? '').trim(),
        skills: normalizeSkillsText(row?.skills ?? row?.required_skills ?? ''),
      }))
      .filter((row) => row.role)
  }

  const raw = String(value).trim()
  if (!raw) return []

  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parseRoleSkillsLinks(parsed)
    } catch {
      /* fall through */
    }
  }

  // Legacy: newline roles with no skills
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((role) => ({ role, skills: '' }))
}

export function serializeRoleSkillsLinks(rows) {
  const cleaned = (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      role: String(row?.role ?? '').trim(),
      skills: normalizeSkillsText(row?.skills ?? ''),
    }))
    .filter((row) => row.role)
  if (!cleaned.length) return ''
  return JSON.stringify(cleaned)
}

export function normalizeSkillsText(value) {
  if (Array.isArray(value)) {
    return value.map((s) => String(s || '').trim()).filter(Boolean).join('\n')
  }
  return String(value || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n')
}

export function parseSkillsLines(skillsText) {
  return normalizeSkillsText(skillsText)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Enforce: every role must have ≥1 skill; every skill list must belong to a role. */
export function validateRoleSkillsLinks(rows) {
  const parsed = parseRoleSkillsLinks(rows)
  if (!parsed.length) {
    return { ok: true, rows: [], error: null }
  }
  for (const row of parsed) {
    if (!row.role) {
      return { ok: false, rows: parsed, error: 'Each entry must have a role name.' }
    }
    if (!parseSkillsLines(row.skills).length) {
      return {
        ok: false,
        rows: parsed,
        error: `Role "${row.role}" needs at least one required skill.`,
      }
    }
  }
  const roles = parsed.map((r) => r.role.toLowerCase())
  if (new Set(roles).size !== roles.length) {
    return { ok: false, rows: parsed, error: 'Role names must be unique.' }
  }
  return { ok: true, rows: parsed, error: null }
}
