/** Route key for one assessment: the stakeholder reference when it exists, otherwise the row id. */

export function assessmentRecordKey(record) {
  const person = record?.stakeholder || record?.practice_stakeholder
  const ref = String(person?.stakeholder_reference || record?.stakeholder_reference || '').trim()
  return ref || record?.id || ''
}

export function assessmentFormPath(basePath, action, record) {
  const base = String(basePath || '').replace(/\/$/, '')
  if (action === 'new') return `${base}/new`
  return `${base}/${action}/${encodeURIComponent(assessmentRecordKey(record))}`
}
