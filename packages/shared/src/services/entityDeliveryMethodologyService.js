/**
 * Resolve delivery-level methodology by walking entity → programme → portfolio.
 * First non-null, non-hybrid track wins; null means “no delivery flag — use org default”.
 *
 * Platform: programmes.portfolio_id, programme_projects
 * Simulator: practice_programmes.practice_portfolio_id, practice_programme_projects
 */

import { normalizeProjectDeliveryTrack } from '@nidus/config/methodologyMenuUtils.js'

function isSpecificTrack(raw) {
  const t = normalizeProjectDeliveryTrack(raw)
  if (!t || t === 'hybrid') return null
  return t
}

/**
 * @param {object} db - platformDb or simDb
 * @param {{ entityType: string, entityId: string, schema?: 'public'|'sim' }} opts
 * @returns {Promise<string|null>} standards_based | structured | agile | null
 */
export async function resolveEntityDeliveryMethodology(db, { entityType, entityId, schema = 'public' } = {}) {
  if (!db || !entityType || !entityId) return null

  const isSim = schema === 'sim'
  const type = String(entityType).toLowerCase()

  if (type === 'portfolio' || type === 'practice_portfolio') {
    const table = isSim ? 'practice_portfolios' : 'portfolios'
    const { data } = await db
      .from(table)
      .select('delivery_methodology_track')
      .eq('id', entityId)
      .maybeSingle()
    return isSpecificTrack(data?.delivery_methodology_track)
  }

  if (type === 'programme' || type === 'practice_programme') {
    const table = isSim ? 'practice_programmes' : 'programmes'
    const portfolioCol = isSim ? 'practice_portfolio_id' : 'portfolio_id'
    const { data: prog } = await db
      .from(table)
      .select(`delivery_methodology_track, ${portfolioCol}`)
      .eq('id', entityId)
      .maybeSingle()
    const own = isSpecificTrack(prog?.delivery_methodology_track)
    if (own) return own
    const portfolioId = prog?.[portfolioCol]
    if (!portfolioId) return null
    return resolveEntityDeliveryMethodology(db, {
      entityType: isSim ? 'practice_portfolio' : 'portfolio',
      entityId: portfolioId,
      schema,
    })
  }

  if (type === 'project' || type === 'practice_project') {
    const projectTable = isSim ? 'practice_projects' : 'projects'
    const { data: project } = await db
      .from(projectTable)
      .select('delivery_methodology_track')
      .eq('id', entityId)
      .maybeSingle()
    const own = isSpecificTrack(project?.delivery_methodology_track)
    if (own) return own

    const linkTable = isSim ? 'practice_programme_projects' : 'programme_projects'
    const projectCol = isSim ? 'practice_project_id' : 'project_id'
    const programmeCol = isSim ? 'practice_programme_id' : 'programme_id'
    const { data: links } = await db
      .from(linkTable)
      .select(programmeCol)
      .eq(projectCol, entityId)
      .limit(1)
    const programmeId = links?.[0]?.[programmeCol]
    if (!programmeId) return null
    return resolveEntityDeliveryMethodology(db, {
      entityType: isSim ? 'practice_programme' : 'programme',
      entityId: programmeId,
      schema,
    })
  }

  return null
}
