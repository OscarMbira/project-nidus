/**
 * Loads a core linked-records source (v1338 D3) in the shape the record page, the record exports and
 * the complete document use for "linked records" fields: { register, records, blocks }.
 * Pass platformDb (public.requirements_register, project_id) or simDb (sim.requirements_register,
 * practice_project_id).
 */
import { platformDb } from '@nidus/supabase'
import { buildCoreRequirementBlocks, coreLinkedSourceConfig, CORE_REQUIREMENTS_SOURCE } from '../utils/coreLinkedSource'
import { loadRequirementNfrAreas } from './requirementExtrasService'

/**
 * @param {object} db platformDb or simDb
 * @param {object} field the linked-records field (its first option names the core source)
 * @param {string|null} projectId the record's project (practice project in the Simulator)
 * @returns {Promise<[{ register: object, records: object[], blocks: object[] }, string|null]>} data and error message
 */
export async function loadCoreLinkedSource(db, field, projectId) {
  const config = coreLinkedSourceConfig(field)
  const register = { label: config?.label || 'Requirements register', register_key: config?.source || '', fields: [] }
  if (!config || config.source !== CORE_REQUIREMENTS_SOURCE) {
    return [{ register, records: [], blocks: [] }, config ? `Unknown linked source ${config.source}` : null]
  }
  if (!projectId) return [{ register, records: [], blocks: [] }, null]

  const projectColumn = db === platformDb ? 'project_id' : 'practice_project_id'
  let query = db.from('requirements_register').select('*').eq(projectColumn, projectId).eq('is_deleted', false)
  if (config.categories.length === 1) query = query.eq('category', config.categories[0])
  else if (config.categories.length > 1) query = query.in('category', config.categories)
  const [result, areas] = await Promise.all([
    query.order('requirement_code', { ascending: true }),
    config.groupBy ? loadRequirementNfrAreas() : Promise.resolve([]),
  ])
  if (result.error) return [{ register, records: [], blocks: [] }, result.error.message]
  const records = result.data || []
  return [{ register, records, blocks: buildCoreRequirementBlocks(records, config, { areas }) }, null]
}
