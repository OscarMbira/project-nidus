import { ENTITY_SCREEN_CODES } from './customFieldConstants'
import { fetchPublishedExportSnapshot } from '../api/customFieldValuesApi'
import { deserializeCustomFieldValue } from './mapCustomFieldValue'

/**
 * @returns {Promise<{ section: { title: string, fields: Array<{ key: string, label: string }> } | null, mergedRecord: Record<string, string> }>}
 */
export async function buildCustomFieldExportParts(platformDb, accountId, entityType, entityId, projectId, practiceProjectId) {
  const empty = { section: null, mergedRecord: {} }
  const proj = practiceProjectId ?? projectId
  if (!accountId || !proj || !entityId) return empty
  const screenCode = ENTITY_SCREEN_CODES[entityType]
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
    return { key, label: d.label }
  })
  return {
    section: { title: 'Additional Local Information', fields },
    mergedRecord,
  }
}
