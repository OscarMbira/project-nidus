/** SEAM engagement levels (Process Guide 6). */
export const SEAM_LEVELS = ['unaware', 'resistant', 'neutral', 'supportive', 'leading']

export function prettySeamLevel(level) {
  switch (level) {
    case 'unaware':
      return 'Unaware'
    case 'resistant':
      return 'Resistant'
    case 'neutral':
      return 'Neutral'
    case 'supportive':
      return 'Supportive'
    case 'leading':
      return 'Leading'
    default:
      return level || '—'
  }
}

export function buildGapSummary(currentLevel, desiredLevel) {
  if (!currentLevel || !desiredLevel || currentLevel === desiredLevel) return 'Aligned'
  return `${prettySeamLevel(currentLevel)} → ${prettySeamLevel(desiredLevel)}`
}

/** Board column and target follow the assessment matrix for that stakeholder. */
export function applyAssessmentDecisionLevels(engagementRows, assessments) {
  const byKey = new Map()
  for (const row of assessments || []) {
    const stakeholderId = row?.stakeholder_id
    const projectId = row?.project_id
    if (!stakeholderId || !projectId || !row.current_level || !row.desired_level) continue
    byKey.set(`${projectId}:${stakeholderId}`, row)
  }
  return (engagementRows || []).map((row) => {
    const match = byKey.get(`${row?.project_id}:${row?.stakeholder_id}`)
    if (!match) return row
    return {
      ...row,
      engagement_level: match.current_level,
      target_engagement_level: match.desired_level,
    }
  })
}

/** Map legacy analysis attitudes to SEAM levels (read-only migration helper). */
export function mapAttitudeToSeamLevel(attitude) {
  if (!attitude) return 'unaware'
  const a = String(attitude).toLowerCase()
  if (a === 'champion') return 'leading'
  if (a === 'supporter') return 'supportive'
  if (a === 'neutral') return 'neutral'
  if (a === 'critic' || a === 'blocker') return 'resistant'
  return 'unaware'
}

export function mapAssessmentRowToSeamDisplay(rec) {
  const currentLevel = rec.current_level || 'neutral'
  const desiredLevel = rec.desired_level || 'neutral'
  const gap = rec.gap_summary || buildGapSummary(currentLevel, desiredLevel)
  const stakeholderId = rec.stakeholder_id || rec.practice_stakeholder_id
  const stakeholder = rec.stakeholder || rec.practice_stakeholder
  return {
    id: rec.id,
    stakeholder_id: stakeholderId,
    stakeholder_name: stakeholder?.stakeholder_name || rec.stakeholder_name || 'Unknown',
    stakeholder_reference: stakeholder?.stakeholder_reference || '',
    photo_path: stakeholder?.photo_path || rec.photo_path || null,
    user_id: stakeholder?.user_id || rec.user_id || null,
    account_id: stakeholder?.account_id || rec.account_id || null,
    assessment_date: rec.assessment_date,
    currentLevel,
    desiredLevel,
    gap,
    notes: rec.notes,
    raw: rec,
  }
}
