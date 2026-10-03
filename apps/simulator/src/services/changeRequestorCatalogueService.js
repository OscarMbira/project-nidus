import { simDb } from '@nidus/supabase'

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

export async function listChangeRequestorOptions() {
  const { data, error } = await simDb
    .from('practice_change_requestor_catalogue')
    .select('id, item_kind, item_name')
    .eq('is_deleted', false)
    .order('item_name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function addChangeRequestorOption(kind, name) {
  const { data, error } = await simDb.rpc('add_practice_change_requestor_option', {
    p_kind: kind,
    p_name: name,
  })
  if (error) throw error
  const saved = typeof data === 'string' ? JSON.parse(data) : data
  const itemName = String(saved?.item_name || '').trim()
  if (!itemName) throw new Error('The option was not saved.')
  return itemName
}
