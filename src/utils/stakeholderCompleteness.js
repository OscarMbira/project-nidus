/**
 * Stakeholder record completeness scoring.
 * Scores 0–100 based on filled optional fields: expectations, requirements,
 * type, category, contact, identification source, project role, notes.
 */

const FIELDS = [
  (s) => (s.expectations && String(s.expectations).trim()) ? 1 : 0,
  (s) => (s.special_requirements && String(s.special_requirements).trim()) ? 1 : 0,
  (s) => (s.stakeholder_type && String(s.stakeholder_type).trim()) ? 1 : 0,
  (s) => (s.stakeholder_category && String(s.stakeholder_category).trim()) ? 1 : 0,
  (s) => {
    const e = s.email || (s.emails && (Array.isArray(s.emails) ? s.emails[0] : null))
    const p = s.phone || (s.phones && (Array.isArray(s.phones) ? s.phones[0] : null))
    const m = s.mobile || (s.mobiles && (Array.isArray(s.mobiles) ? s.mobiles[0] : null))
    return (e && String(e).trim()) || (p && String(p).trim()) || (m && String(m).trim()) ? 1 : 0
  },
  (s) => (s.identification_source && String(s.identification_source).trim()) ? 1 : 0,
  (s) => (s.project_role && String(s.project_role).trim()) ? 1 : 0,
  (s) => (s.notes && String(s.notes).trim()) ? 1 : 0,
]

/**
 * @param {object} stakeholder - Stakeholder record
 * @returns {number} 0–100 completeness percentage
 */
export function getCompletenessPercent(stakeholder) {
  if (!stakeholder) return 0
  const total = FIELDS.length
  const filled = FIELDS.reduce((sum, fn) => sum + fn(stakeholder), 0)
  return Math.round((filled / total) * 100)
}
