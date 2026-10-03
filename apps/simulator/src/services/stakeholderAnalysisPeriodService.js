import { platformDb } from '@nidus/supabase'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function periodSelectOptions(rows, currentValue) {
  const options = []
  const seen = new Set()
  for (const row of rows || []) {
    const name = String(row?.period_name || '').trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    options.push({ value: name, label: name })
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

export async function resolveAnalysisPeriodAccountId(projectId) {
  if (!projectId) {
    throw new Error('Choose a project first so periods can be loaded for the organisation.')
  }
  const { data, error } = await platformDb
    .from('projects')
    .select('account_id')
    .eq('id', projectId)
    .maybeSingle()
  if (error) throw error
  if (!data?.account_id) throw new Error('This project is not linked to an organisation.')
  return data.account_id
}

export async function listStakeholderAnalysisPeriods(accountId) {
  assertAccountId(accountId)
  const { data, error } = await platformDb
    .from('stakeholder_analysis_periods')
    .select('id, period_name, account_id, is_system')
    .eq('is_deleted', false)
    .or(`account_id.is.null,account_id.eq.${accountId}`)
    .order('period_name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function addStakeholderAnalysisPeriod(accountId, name) {
  assertAccountId(accountId)
  const { data, error } = await platformDb.rpc('add_stakeholder_analysis_period', {
    p_account_id: accountId,
    p_name: name,
  })
  if (error) throw error
  const saved = typeof data === 'string' ? JSON.parse(data) : data
  const periodName = String(saved?.period_name || '').trim()
  if (!periodName) throw new Error('The period was not saved.')
  return periodName
}
