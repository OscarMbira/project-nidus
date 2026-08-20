import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { RowActionButton } from '@nidus/ui'
import { archiveTemplate, duplicateTemplate, getTemplateById } from '../../services/industryTemplateService'
import IndustryPlanExportMenu from '../../components/industryPlan/IndustryPlanExportMenu'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

const TABS = ['phases', 'activities', 'deliverables', 'risks', 'milestones', 'roles']

export default function IndustryTemplateDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tpl, setTpl] = useState(null)
  const [tab, setTab] = useState('phases')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    getTemplateById(id).then(setTpl).catch((e) => toast.error(e.message))
  }, [id])

  useEffect(() => {
    if (tab !== 'audit' || !tpl) return
    let cancelled = false
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [
        tpl.created_by,
        tpl.updated_by,
      ])
      if (!cancelled) setAuditUserLabels(labels || {})
    })()
    return () => { cancelled = true }
  }, [tab, tpl])

  if (!tpl) return <p className="p-6 text-sm text-slate-500">Loading…</p>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link to="/pmo/industry-templates" className="text-sm text-blue-600">
        ← Templates
      </Link>
      <div className="mt-2 flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{tpl.industry_name}</h1>
          <p className="text-sm text-slate-500">{tpl.industry_code} · {tpl.status}</p>
        </div>
        <div className="flex gap-2">
          <RowActionButton
            variant="edit"
            label="Edit template"
            onClick={() => navigate(`/pmo/industry-templates/${id}/edit`)}
          />
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm"
            onClick={async () => {
              const c = await duplicateTemplate(id)
              navigate(`/pmo/industry-templates/${c.id}/edit`)
            }}
          >
            Duplicate
          </button>
          <IndustryPlanExportMenu data={tpl} />
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm text-red-600"
            onClick={async () => {
              await archiveTemplate(id)
              toast.success('Archived')
              navigate('/pmo/industry-templates')
            }}
          >
            Archive
          </button>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-600">{tpl.description}</p>

      <div className="mt-4">
        <DetailAuditTabList
          activeTab={tab}
          onChange={setTab}
          ariaLabel="Industry template sections"
          tabs={[
            ...TABS.map((t) => ({ value: t, label: `${t.charAt(0).toUpperCase()}${t.slice(1)} (${(tpl[t] || []).length})` })),
            { value: 'audit', label: 'Audit details' },
          ]}
        />
      </div>

      {tab === 'audit' && (
        <AuditDetailsPanel description="Who created or changed this industry template, and how it is classified.">
          <AuditCard title="Identity" description="How this template is labelled and tracked.">
            <AuditField label="Industry code" value={tpl.industry_code} />
            <AuditField label="Industry name" value={tpl.industry_name} />
            <AuditField label="Status" value={humanizeAuditToken(tpl.status)} />
          </AuditCard>
          <AuditCard title="Classification" description="Where this template sits.">
            <AuditField label="Typical duration" value={tpl.typical_duration} />
          </AuditCard>
          <AuditCard title="Record history" description="When this template was created and last changed.">
            <AuditField label="Created by" value={tpl.created_by ? auditUserLabels[tpl.created_by] || null : null} />
            <AuditTimestampPair dateLabel="Created at" value={tpl.created_at} />
            <AuditField label="Updated by" value={tpl.updated_by ? auditUserLabels[tpl.updated_by] || null : null} />
            <AuditTimestampPair dateLabel="Last updated" value={tpl.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}

      {tab !== 'audit' && (
      <ul className="mt-4 space-y-2 text-sm">
        {(tpl[tab] || []).map((item) => (
          <li key={item.id} className="rounded border px-3 py-2 dark:border-slate-700">
            {item.phase_name ||
              item.activity_name ||
              item.deliverable_name ||
              item.risk_title ||
              item.milestone_name ||
              item.role_title}
          </li>
        ))}
      </ul>
      )}
    </div>
  )
}
