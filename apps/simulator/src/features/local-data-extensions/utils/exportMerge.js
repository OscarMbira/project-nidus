import { ENTITY_SCREEN_CODES } from './customFieldConstants'
import { fetchPublishedExportSnapshot } from '../api/customFieldValuesApi'
import { deserializeCustomFieldValue } from './mapCustomFieldValue'

/**
 * @param {object} platformDb
 * @param {string} accountId
 * @param {string} entityType
 * @param {string} entityId
 * @param {string} [projectId]
 * @param {string} [practiceProjectId]
 * @param {{ screenCode?: string, sectionTitle?: string }} [options]
 * @returns {Promise<{ section: { title: string, fields: Array<{ key: string, label: string, fact?: boolean }> } | null, mergedRecord: Record<string, string> }>}
 */
export async function buildCustomFieldExportParts(
  platformDb,
  accountId,
  entityType,
  entityId,
  projectId,
  practiceProjectId,
  options = {},
) {
  const empty = { section: null, mergedRecord: {} }
  const proj = practiceProjectId ?? projectId
  if (!accountId || !proj || !entityId) return empty
  const screenCode = options.screenCode || ENTITY_SCREEN_CODES[entityType]
  if (!screenCode) return empty
  const { definitions, valuesByFieldId } = await fetchPublishedExportSnapshot(platformDb, {
    accountId,
    projectId,
    practiceProjectId,
    entityType,
    entityId,
    screenCode,
  })
  if (!definitions?.length) return empty
  const mergedRecord = {}
  const fields = definitions.map((d) => {
    const raw = valuesByFieldId[d.id]
    const val = deserializeCustomFieldValue(d.field_type, raw)
    let text = ''
    if (val == null) text = ''
    else if (Array.isArray(val)) text = val.join(', ')
    else if (typeof val === 'object') text = JSON.stringify(val)
    else text = String(val)
    const key = `lde_${d.field_code}`
    mergedRecord[key] = text
    return { key, label: d.label, fact: true }
  })
  return {
    section: { title: options.sectionTitle || 'Custom Fields', fields },
    mergedRecord,
  }
}
