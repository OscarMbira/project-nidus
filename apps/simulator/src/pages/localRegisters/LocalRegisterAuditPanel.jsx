/**
 * Local Register Engine — Audit details tab content (rule 63.1), shared by the detail page and
 * the create/edit form (v1297). Shows a placeholder until the record has been saved once.
 */
import { useState, useEffect } from 'react'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { supabase } from '../../services/supabaseClient'

export default function LocalRegisterAuditPanel({ register, record }) {
  const [userLabels, setUserLabels] = useState({})

  useEffect(() => {
    const userIds = [record?.owner_user_id, record?.created_by, record?.updated_by].filter(Boolean)
    if (userIds.length === 0) return undefined
    let cancelled = false
    supabase
      .from('users')
      .select('id, full_name')
      .in('id', userIds)
      .then(({ data: users }) => {
        if (!cancelled && users) setUserLabels(Object.fromEntries(users.map((u) => [u.id, u.full_name])))
      })
    return () => { cancelled = true }
  }, [record?.owner_user_id, record?.created_by, record?.updated_by])

  if (!record) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 text-sm text-gray-500 dark:text-gray-400">
        Audit details appear after this record is saved.
      </div>
    )
  }

  const statusLabel = (register?.status_workflow || []).find((s) => s.key === record.status)?.label || record.status

  return (
    <AuditDetailsPanel description="Who created or changed this record.">
      <AuditCard title="Identity">
        <AuditField label="Display ID" value={record.display_id || '—'} />
        <AuditField label="Register" value={register?.label} />
        <AuditField label="Status" value={statusLabel} />
      </AuditCard>
      <AuditCard title="Classification">
        <AuditField label="Scope" value={register?.scope_level} />
        <AuditField label="Owner" value={userLabels[record.owner_user_id] || '—'} />
      </AuditCard>
      <AuditCard title="Record history">
        <AuditField label="Created by" value={userLabels[record.created_by] || '—'} />
        <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
        <AuditField label="Updated by" value={userLabels[record.updated_by] || '—'} />
        <AuditTimestampPair dateLabel="Updated at" value={record.updated_at} />
      </AuditCard>
    </AuditDetailsPanel>
  )
}
