/**
 * Active display languages (public.languages / sim.languages — schema-scoped,
 * mirrors the countries reference-table pattern). Read-only from the app;
 * management is System Admin/Superuser only, via direct DB access for now.
 *
 * @module utils/languages
 */

import { platformDb, simDb } from '@nidus/supabase'

function getDb(mode = 'platform') {
  return mode === 'sim' ? simDb : platformDb
}

/**
 * @param {'platform'|'sim'} [mode]
 * @returns {Promise<{success:boolean, data:Array<{code:string,name:string,native_name:string|null}>, message?:string}>}
 */
export async function getActiveLanguages(mode = 'platform') {
  const { data, error } = await getDb(mode)
    .from('languages')
    .select('code, name, native_name')
    .eq('is_active', true)
    .eq('is_deleted', false)
    .order('name')

  if (error) return { success: false, data: [], message: error.message }
  return { success: true, data: data || [] }
}

export default { getActiveLanguages }
