import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { RowActionButton } from '@nidus/ui'
import {
  archiveTemplate, duplicateTemplate, getTemplateById,
  getTemplateGovernanceProfiles, saveTemplateGovernanceProfile, deleteTemplateGovernanceProfile,
} from '../../services/industryTemplateService'
import IndustryPlanExportMenu from '../../components/industryPlan/IndustryPlanExportMenu'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { getPmoConfigAccess, getProjectClassifications } from '../../services/projectClassificationService'
import { getApprovalChainTemplates } from '../../services/organisationApprovalChainService'

const TABS = ['phases', 'activities', 'deliverables', 'risks', 'milestones', 'roles']

/**
 * Governance tab (v982 Phase 2) — per-organisation required stage gates + optional required
 * approval chain for this template, one row per classification (or a NULL-classification
 * "default" row). Self-contained: does not touch the existing content tabs above.
 */
function TemplateGovernancePanel({ templateId }) {
  const { showSuccess, modal: successModal } = useSuccessModal()
  const [loading, setLoading] = useState(true)
  const [accountId, setAccountId] = useState(null)
  const [canManage, setCanManage] = useState(false)
  const [profiles, setProfiles] = useState([])
  const [classifications, setClassifications] = useState([])
  const [chains, setChains] = useState([])
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(undefined) // undefined = form closed, null = new
  const [form, setForm] = useState({ classification_id: '', required_stage_gate_names: '', required_approval_chain_template_id: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    const access = await getPmoConfigAccess()
    if (!access.success || !access.accountId) {
      setError(access.error || 'Could not resolve your organisation')
      setLoading(false)
      return
    }
    setAccountId(access.accountId)
    setCanManage(access.canManage)
    const [profRes, classRes, chainRes] = await Promise.all([
      getTemplateGovernanceProfiles(access.accountId, templateId).then((data) => ({ data })).catch((e) => ({ data: [], error: e.message })),
      getProjectClassifications(access.accountId),
      getApprovalChainTemplates(access.accountId),
    ])
    setProfiles(profRes.data || [])
    if (classRes.success) setClassifications(classRes.data)
    if (chainRes.success) setChains(chainRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [templateId]) // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = () => {
    setEditingId(null)
    setForm({ classification_id: '', required_stage_gate_names: '', required_approval_chain_template_id: '', notes: '' })
  }
  const openEdit = (p) => {
    setEditingId(p.id)
    setForm({
      classification_id: p.classification_id || '',
      required_stage_gate_names: (p.required_stage_gate_names || []).join(', '),
      required_approval_chain_template_id: p.required_approval_chain_template_id || '',
      notes: p.notes || '',
    })
  }
  const closeForm = () => setEditingId(undefined)

  const handleDelete = async (p) => {
    if (!window.confirm('Delete this governance profile? Projects already provisioned from it keep their existing stage gates.')) return
    await deleteTemplateGovernanceProfile(p.id)
    showSuccess({ recordId: p.classification_id ? 'override' : 'default', operation: 'deleted', message: 'Governance profile was deleted.' })
    load()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const gateNames = form.required_stage_gate_names.split(',').map((s) => s.trim()).filter(Boolean)
      const saved = await saveTemplateGovernanceProfile({
        id: editingId || undefined,
        account_id: accountId,
        template_id: templateId,
        classification_id: form.classification_id || null,
        required_stage_gate_names: gateNames,
        required_approval_chain_template_id: form.required_approval_chain_template_id || null,
        notes: form.notes || null,
      })
      showSuccess({ recordId: saved.classification_id ? 'override' : 'default', operation: editingId ? 'updated' : 'created', message: 'Governance profile saved.' })
      closeForm()
      load()
    } catch (err) {
      setError(err.message || 'Failed to save governance profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="mt-4 text-sm text-slate-500">Loading governance…</p>

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Declare the stage gates and approval chain your organisation requires for projects created
        from this template. A row with no classification is the default profile; a row scoped to a
        classification overrides the default for projects with that classification (v982 Phase 2).
      </p>
      {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">{error}</div>}

      {canManage && editingId === undefined && (
        <button type="button" onClick={openAdd} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          + Add governance profile
        </button>
      )}

      {editingId !== undefined && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Classification (blank = default for all)</label>
              <select value={form.classification_id} onChange={(e) => setForm((f) => ({ ...f, classification_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white">
                <option value="">Default (no classification)</option>
                {classifications.map((c) => <option key={c.id} value={c.id}>{c.classification_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Required approval chain (optional)</label>
              <select value={form.required_approval_chain_template_id} onChange={(e) => setForm((f) => ({ ...f, required_approval_chain_template_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white">
                <option value="">None</option>
                {chains.map((c) => <option key={c.id} value={c.id}>{c.chain_name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Required stage gate names (comma-separated)</label>
            <input type="text" value={form.required_stage_gate_names} onChange={(e) => setForm((f) => ({ ...f, required_stage_gate_names: e.target.value }))} placeholder="e.g. Initiation Gate, Design Gate, Go-Live Gate" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Each name becomes a stage gate review automatically provisioned when a project is created from this template with this classification.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save profile'}</button>
            <button type="button" onClick={closeForm} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300">Cancel</button>
          </div>
        </form>
      )}

      {profiles.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No governance profile defined yet for this template.</p>
      ) : (
        <div className="space-y-2">
          {profiles.map((p) => (
            <div key={p.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {p.classification_id ? classifications.find((c) => c.id === p.classification_id)?.classification_name || 'Classification override' : 'Default (all projects)'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Stage gates: {(p.required_stage_gate_names || []).length > 0 ? p.required_stage_gate_names.join(', ') : 'none'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Approval chain: {chains.find((c) => c.id === p.required_approval_chain_template_id)?.chain_name || 'none'}
                </div>
              </div>
              {canManage && (
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => openEdit(p)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Edit</button>
                  <button type="button" onClick={() => handleDelete(p)} className="text-xs text-red-600 dark:text-red-400 hover:underline">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {successModal}
    </div>
  )
}

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
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-blue-600">
        ← Templates
      </button>
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
            { value: 'governance', label: 'Governance' },
            { value: 'audit', label: 'Audit details' },
          ]}
        />
      </div>

      {tab === 'governance' && <TemplateGovernancePanel templateId={id} />}

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

      {tab !== 'audit' && tab !== 'governance' && (
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
