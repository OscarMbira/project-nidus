import { useEffect, useState } from 'react'
import { linkedRegisterKey } from '../utils/registerDocumentModel'
import { isCoreLinkedSource } from '../utils/coreLinkedSource'
import { loadCoreLinkedSource } from '../services/coreLinkedSourceService'

/**
 * Data for a record's "linked records" fields (v1332; core sources v1338): for each field,
 * { register, records } from the source local register for the record's project, or
 * { register, records, blocks } from a core table (e.g. core:requirements). All fields load together.
 * The app passes its own register services (they bind public vs sim).
 * @param {{ register: object|null, record: object|null, db: object,
 *   getRegisterDefinition: (key: string) => Promise<{data: object|null, error?: string}>,
 *   listRecords: (registerId: string, scope: object) => Promise<{data: object[], error?: string}> }} input
 * @returns {{ loading: boolean, error: string|null, data: Record<string, object> }}
 */
export function useLinkedRecordsData({ register, record, db, getRegisterDefinition, listRecords }) {
  const linkFields = (register?.fields || []).filter((f) => f.field_type === 'linked_records' && linkedRegisterKey(f))
  const key = record && linkFields.length ? `${register?.id}|${record.id}|${record.record_project_id}` : null
  const [state, setState] = useState({ forKey: null, error: null, data: {} })

  useEffect(() => {
    if (!key) return undefined
    let cancelled = false
    Promise.all(linkFields.map(async (f) => {
      const sourceKey = linkedRegisterKey(f)
      if (isCoreLinkedSource(sourceKey)) {
        const [data, error] = await loadCoreLinkedSource(db, f, record.record_project_id)
        return [f.field_key, data, error]
      }
      const source = await getRegisterDefinition(sourceKey)
      if (!source.data) return [f.field_key, { register: null, records: [] }, source.error]
      const records = await listRecords(source.data.id, { scopeLevel: 'project', scopeEntityId: record.record_project_id })
      return [f.field_key, { register: source.data, records: records.data || [] }, records.error]
    })).then((results) => {
      if (cancelled) return
      const firstError = results.map((r) => r[2]).find(Boolean) || null
      setState({ forKey: key, error: firstError, data: Object.fromEntries(results.map(([k, value]) => [k, value])) })
    })
    return () => { cancelled = true }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    loading: Boolean(key) && state.forKey !== key,
    error: state.forKey === key ? state.error : null,
    data: state.forKey === key ? state.data : {},
  }
}
