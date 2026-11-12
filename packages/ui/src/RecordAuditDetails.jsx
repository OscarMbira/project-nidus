/**
 * Standard Audit details body for a single record (CLAUDE.md rule 63 / 63.1, v1340).
 * Three fixed cards — Identity, Classification, Record history — with "created by / last changed by"
 * resolved to people's names. Shows the placeholder until the record has been saved once.
 *
 * @param {{
 *   db: object,                                   // Supabase client used to resolve user names
 *   record: object|null,                          // the saved row (needs id; created_at/updated_at/created_by/updated_by when present)
 *   noun?: string,                                // e.g. 'contact' → "Audit details appear after this contact is saved."
 *   identity?: { label: string, value: any }[],
 *   classification?: { label: string, value: any }[],
 *   description?: string,
 * }} props
 */
import { useEffect, useState } from 'react'
import { resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import AuditDetailsPanel from './AuditDetailsPanel.jsx'
import AuditCard from './AuditCard.jsx'
import AuditField from './AuditField.jsx'
import AuditTimestampPair from './AuditTimestampPair.jsx'

const show = (v) => (v === null || v === undefined || v === '' ? '—' : String(v))

export default function RecordAuditDetails({ db, record, noun = 'record', identity = [], classification = [], description }) {
  const [labels, setLabels] = useState({})
  const createdBy = record?.created_by || null
  const updatedBy = record?.updated_by || null

  useEffect(() => {
    let cancelled = false
    if (!db || (!createdBy && !updatedBy)) { setLabels({}); return undefined }
    resolveAuditUserLabels(db, [createdBy, updatedBy]).then((map) => { if (!cancelled) setLabels(map || {}) })
    return () => { cancelled = true }
  }, [db, createdBy, updatedBy])

  if (!record?.id) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this {noun} is saved.</p>
  }

  return (
    <AuditDetailsPanel description={description}>
      <AuditCard title="Identity" description={`How this ${noun} is identified.`}>
        {identity.map((f) => <AuditField key={f.label} label={f.label} value={show(f.value)} />)}
      </AuditCard>
      <AuditCard title="Classification" description={`How this ${noun} is classified.`}>
        {classification.length
          ? classification.map((f) => <AuditField key={f.label} label={f.label} value={show(f.value)} />)
          : <AuditField label="Classification" value="—" />}
      </AuditCard>
      <AuditCard title="Record history" description={`When this ${noun} was created and last changed, and by whom.`}>
        <AuditField label="Created by" value={show(labels[createdBy] || (createdBy ? 'Unknown user' : null))} />
        <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
        <AuditField label="Last changed by" value={show(labels[updatedBy] || (updatedBy ? 'Unknown user' : null))} />
        <AuditTimestampPair dateLabel="Last updated" value={record.updated_at} />
      </AuditCard>
    </AuditDetailsPanel>
  )
}
