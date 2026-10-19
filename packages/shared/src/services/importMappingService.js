/**
 * v1272 Phase 2 — Import Mapper client (PRD D26, stories 32–34). Shared by Platform and Simulator.
 *   suggestMapping   → edge function import-mapper (only the headers and first 20 rows are sent)
 *   findSavedMapping / saveMapping → <schema>.import_column_mappings (SQL v1282), per organisation
 * `db` is the app's client (useAppConfig().db); AI status always lives in public (platformDb).
 */
import { headerSignature } from '../utils/importMapping.js'

const SAMPLE_ROWS = 20

export async function findSavedMapping(db, { accountId, target, headers }) {
  if (!accountId) return null
  const { data, error } = await db.from('import_column_mappings')
    .select('id, mapping, conversions, use_count')
    .eq('account_id', accountId).eq('target_template', target).eq('source_signature', headerSignature(headers))
    .maybeSingle()
  if (error) return null
  return data || null
}

export async function markMappingUsed(db, saved) {
  if (!saved?.id) return
  await db.from('import_column_mappings')
    .update({ use_count: (saved.use_count || 0) + 1, last_used_at: new Date().toISOString() })
    .eq('id', saved.id)
}

export async function saveMapping(db, { accountId, target, headers, mapping, conversions, userId }) {
  if (!accountId) throw new Error('Your organisation could not be found, so the mapping was not saved.')
  const row = {
    account_id: accountId,
    target_template: target,
    source_signature: headerSignature(headers),
    source_headers: headers.slice(0, 200),
    mapping,
    conversions: conversions || {},
    created_by: userId || null,
    updated_at: new Date().toISOString(),
    last_used_at: new Date().toISOString(),
  }
  const { data, error } = await db.from('import_column_mappings')
    .upsert(row, { onConflict: 'account_id,target_template,source_signature' })
    .select('id').single()
  if (error) throw error
  return data
}

/** Ask the Import Mapper for suggestions. Throws with the gate's message when AI is unavailable. */
export async function suggestMapping(platformDb, { app, templateLabel, dictionary, headers, rows }) {
  const { data, error } = await platformDb.functions.invoke('import-mapper', {
    body: { app, template_label: templateLabel, dictionary, headers, rows: (rows || []).slice(0, SAMPLE_ROWS) },
  })
  if (error) {
    let message = error.message
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
    } catch {
      /* keep the generic message */
    }
    throw new Error(message || 'Mapping suggestions are not available right now.')
  }
  return data
}
