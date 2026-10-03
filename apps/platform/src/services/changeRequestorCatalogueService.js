import { platformDb } from '@nidus/supabase'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function buildRequestorSelectOptions(values, currentValue) {
  const seen = new Set()
  const options = []
  for (const raw of values || []) {
    const label = String(raw || '').trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    options.push({ value: label, label })
  }
  options.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
  const current = String(currentValue || '').trim()
  if (current && !seen.has(current.toLowerCase())) {
    options.unshift({ value: current, label: current })
  }
  return options
}

function assertAccountId(accountId) {
  if (!UUID_RE.test(String(accountId || ''))) {
    throw new Error('This project is not linked to an organisation.')
  }
}

export async function listChangeRequestorOptions(accountId) {
  assertAccountId(accountId)
  const { data, error } = await platformDb
    .from('change_requestor_catalogue')
    .select('id, item_kind, item_name')
    .eq('account_id', accountId)
    .eq('is_deleted', false)
    .order('item_name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function addChangeRequestorOption(accountId, kind, name) {
  assertAccountId(accountId)
  const { data, error } = await platformDb.rpc('add_change_requestor_option', {
    p_account_id: accountId,
    p_kind: kind,
    p_name: name,
  })
  if (error) throw error
  const saved = typeof data === 'string' ? JSON.parse(data) : data
  const itemName = String(saved?.item_name || '').trim()
  if (!itemName) throw new Error('The option was not saved.')
  return itemName
}
