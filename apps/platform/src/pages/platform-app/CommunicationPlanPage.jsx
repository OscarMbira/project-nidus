/**
 * Communication Plans Page – Platform (Engage): Plans + Log tabs.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, List, Plus } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import { getCommunicationPlans, getStakeholders, deleteCommunicationPlan, saveCommunicationPlan } from '../../services/stakeholderService'
import { audienceForPlan, duplicatePlanKey, unionPlanGroups } from '../../components/stakeholders/communicationPlanAudience'
import { communicationPlanChooserHref, communicationPlanHref } from '@nidus/shared/utils/communicationPlanRoute'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import CommunicationLog from '../../components/stakeholders/CommunicationLog'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { useCurrentProject } from '../../context/CurrentProjectContext'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'

function formatPlanDate(value) {
  if (!value) return '—'
  const [year, month, day] = String(value).slice(0, 10).split('-')
  if (!year || !month || !day) return '—'
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString()
}

async function collapseCopiedPlans(rows) {
  const buckets = new Map()
  for (const plan of rows) {
    const key = duplicatePlanKey(plan)
    const bucket = buckets.get(key) || []
    bucket.push(plan)
    buckets.set(key, bucket)
  }
  const kept = []
  for (const bucket of buckets.values()) {
    if (bucket.length < 2) {
      kept.push(bucket[0])
      continue
    }
    const ordered = [...bucket].sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
    const keeper = ordered[0]
    const groups = unionPlanGroups(ordered)
    const current = unionPlanGroups([keeper])
    const changed = groups.length !== current.length || groups.some((group, index) => group !== current[index])
    if (changed) {
      const patch = {
        project_id: keeper.project_id,
        target_stakeholder_groups: groups,
      }
      if (Object.prototype.hasOwnProperty.call(keeper, 'stakeholder_communication_requirements')) {
        patch.stakeholder_communication_requirements = groups.join('\n')
      }
      await saveCommunicationPlan(patch, keeper.id)
      keeper.target_stakeholder_groups = groups
      if (patch.stakeholder_communication_requirements != null) {
        keeper.stakeholder_communication_requirements = patch.stakeholder_communication_requirements
      }
    }
    await Promise.all(ordered.slice(1).map((copy) => deleteCommunicationPlan(copy.id)))
    kept.push(keeper)
  }
  return kept
}

function sortPlans(rows) {
  return [...rows].sort((a, b) => {
    const byStart = String(a.plan_start_date || '').localeCompare(String(b.plan_start_date || ''))
    if (byStart) return byStart
    return String(a.plan_name || '').localeCompare(String(b.plan_name || ''), undefined, { sensitivity: 'base' })
  })
}

export default function CommunicationPlanPage() {
  const navigate = useNavigate()
  const { projects: assignedProjects, currentProjectId, loading: projectCtxLoading } = useCurrentProject()
  const [projectId, setProjectId] = useState('')
  const projects = assignedProjects.map((p) => ({
    id: p.projectId,
    project_name: p.projectName,
    project_code: p.projectCode,
  }))
  const [plans, setPlans] = useState([])
  const [stakeholders, setStakeholders] = useState([])
  const [tab, setTab] = useState('plans')
  const [deletingId, setDeletingId] = useState('')
  const [listError, setListError] = useState('')
  const { showSuccess, modal: successModal } = useSuccessModal()

  useEffect(() => {
    if (projectCtxLoading || projectId || !currentProjectId) return
    setProjectId(currentProjectId)
  }, [projectCtxLoading, currentProjectId, projectId])

  useEffect(() => {
    if (projectId) loadPlans()
    else setPlans([])
  }, [projectId])

  const loadPlans = async () => {
    if (!projectId) return
    try {
      const [data, people] = await Promise.all([
        getCommunicationPlans({ project_id: projectId }),
        getStakeholders({ project_id: projectId, limit: 500 }),
      ])
      const rows = await collapseCopiedPlans(data || [])
      setPlans(sortPlans(rows))
      setStakeholders(people || [])
    } catch (e) {
      console.error(e)
    }
  }

  const openPlan = (plan, action) => {
    const people = audienceForPlan(plan, stakeholders)
    if (people.length > 1) {
      navigate(communicationPlanChooserHref(plan), { state: { projectId } })
      return
    }
    if (action === 'delete') {
      handleDelete(plan)
      return
    }
    navigate(communicationPlanHref(action, plan, people[0]), { state: { projectId } })
  }

  const handleDelete = async (plan) => {
    if (!window.confirm(`Delete communication plan "${plan.plan_name || 'this plan'}"?`)) return
    setDeletingId(plan.id)
    setListError('')
    try {
      await deleteCommunicationPlan(plan.id)
      setPlans((prev) => prev.filter((row) => row.id !== plan.id))
      showSuccess({
        recordId: plan.plan_reference || plan.plan_name || 'Communication plan',
        operation: 'deleted',
        message: 'Communication plan deleted.',
      })
    } catch (e) {
      setListError(e?.message || 'Failed to delete communication plan')
    } finally {
      setDeletingId('')
    }
  }

  const exportColumns = [
    { key: 'plan_name', label: 'Plan' },
    { key: 'plan_status', label: 'Status' },
    { key: 'plan_start_date', label: 'Start' },
    { key: 'plan_end_date', label: 'End' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="h-8 w-8 text-indigo-500" />
            Communication Plans
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Plan and log stakeholder communications</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTab('plans')} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${tab === 'plans' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}><FileText className="h-4 w-4" /> Plans</button>
          <button onClick={() => setTab('log')} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${tab === 'log' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}><List className="h-4 w-4" /> Log</button>
          {tab === 'plans' && (
            <>
              <ExportListMenu columns={exportColumns} data={plans.map(p => ({ plan_name: p.plan_name, plan_status: p.plan_status, plan_start_date: p.plan_start_date, plan_end_date: p.plan_end_date }))} baseFilename="Communication-Plans" disabled={!plans.length} />
              <button onClick={() => navigate('/platform/stakeholders/communications/new', { state: { projectId } })} disabled={!projectId} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"><Plus className="h-5 w-5" /> Add Plan</button>
            </>
          )}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project</label>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
          <option value="">Select project</option>
          {projects.map(p => (<option key={p.id} value={p.id}>{p.project_name} {p.project_code ? `(${p.project_code})` : ''}</option>))}
        </select>
      </div>

      {listError && (
        <p className="mb-4 text-sm text-red-700 dark:text-red-300">{listError}</p>
      )}

      {!projectId ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500">Select a project.</div>
      ) : tab === 'plans' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Start</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">End</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {plans.map((p, index) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{p.plan_name}</td>
                  <td className="px-6 py-4 text-sm">{p.plan_status}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-200">{formatPlanDate(p.plan_start_date)}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-200">{formatPlanDate(p.plan_end_date)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <RowActionButton
                        variant="view"
                        label="View plan"
                        onClick={() => openPlan(p, 'view')}
                      />
                      <RowActionButton
                        variant="edit"
                        label="Edit plan"
                        onClick={() => openPlan(p, 'edit')}
                      />
                      <RowActionButton
                        variant="delete"
                        label="Delete plan"
                        onClick={() => openPlan(p, 'delete')}
                        disabled={deletingId === p.id}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {plans.length === 0 && <div className="p-8 text-center text-gray-500">No plans. Add one above.</div>}
        </div>
      ) : (
        <CommunicationLog projectId={projectId} />
      )}
      {successModal}
    </div>
  )
}
