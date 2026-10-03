import { platformDb } from './supabaseClient'

function uniqueLabels(values) {
  const seen = new Set()
  const labels = []
  for (const raw of values) {
    const label = String(raw || '').trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    labels.push(label)
  }
  labels.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  return labels.map((label) => ({ value: label, label }))
}

async function safeRows(query) {
  try {
    const { data, error } = await query
    if (error) return []
    return data || []
  } catch {
    return []
  }
}

export function suggestRoleCode(label) {
  const slug = String(label || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)
  return slug || 'role'
}

export async function loadStakeholderCatalogues(accountId) {
  if (!accountId) {
    return { titles: [], organisations: [], departments: [] }
  }

  const [stakeholders, contacts] = await Promise.all([
    safeRows(
      platformDb
        .from('stakeholders')
        .select('stakeholder_organization, stakeholder_department, project:project_id!inner(account_id)')
        .eq('project.account_id', accountId)
        .eq('is_deleted', false)
        .limit(1000)
    ),
    safeRows(
      platformDb
        .from('project_contacts')
        .select('organisation, project:project_id!inner(account_id)')
        .eq('project.account_id', accountId)
        .eq('is_deleted', false)
        .limit(1000)
    ),
  ])

  return {
    titles: [],
    organisations: uniqueLabels([
      ...stakeholders.map((row) => row.stakeholder_organization),
      ...contacts.map((row) => row.organisation),
    ]),
    departments: uniqueLabels(stakeholders.map((row) => row.stakeholder_department)),
  }
}

export async function addStakeholderTitle(label, roleCode) {
  const { data, error } = await platformDb.rpc('add_stakeholder_professional_role', {
    p_label: label,
    p_code: roleCode,
  })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return row?.role_label || label
}

export async function addStakeholderOrganisation(accountId, name) {
  const { data, error } = await platformDb.rpc('add_stakeholder_organisation', {
    p_account_id: accountId,
    p_name: name,
  })
  if (error) throw error
  return data || name
}

export async function addStakeholderDepartment(accountId, name) {
  const { data, error } = await platformDb.rpc('add_stakeholder_department', {
    p_account_id: accountId,
    p_name: name,
  })
  if (error) throw error
  return data || name
}
