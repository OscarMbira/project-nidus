/**
 * Chooser shown when a communication plan covers more than one stakeholder.
 * The user picks one person, then views, edits, or deletes that person's plan.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useCurrentProject } from '../../context/CurrentProjectContext'
import {
  deleteCommunicationPlan,
  getCommunicationPlans,
  getStakeholders,
  saveCommunicationPlan,
} from '../../services/stakeholderService'
import {
  audienceForPlan,
  groupsMatchingPerson,
  planAudienceGroups,
  stakeholderTypeBadgeClass,
} from '../../components/stakeholders/communicationPlanAudience'
import { communicationPlanChooserHref, communicationPlanHref, communicationPlanRecordKey } from '@nidus/shared/utils/communicationPlanRoute'

function formatPlanDate(value) {
  if (!value) return '—'
  const [year, month, day] = String(value).slice(0, 10).split('-')
  if (!year || !month || !day) return '—'
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString()
}

export default function CommunicationPlanAudiencePage() {
  const navigate = useNavigate()
  const { planId } = useParams()
  const location = useLocation()
  const { currentProjectId, loading: projectCtxLoading } = useCurrentProject()
  const projectId = location.state?.projectId || currentProjectId || ''
  const { showSuccess, modal: successModal } = useSuccessModal()
  const [plan, setPlan] = useState(null)
  const [stakeholders, setStakeholders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busyId, setBusyId] = useState('')

  const listTarget = {
    pathname: '/platform/stakeholders/communications',
    state: { projectId },
  }

  useEffect(() => {
    if (!planId) return undefined
    if (projectCtxLoading && !location.state?.projectId) return undefined
    let cancelled = false
    setLoading(true)
    setLoadError('')
    ;(async () => {
      try {
        const records = await getCommunicationPlans({ id: planId })
        const loaded = records?.[0] || null
        if (cancelled) return
        if (!loaded) {
          setLoadError('Communication plan was not found.')
          setPlan(null)
          return
        }
        setPlan(loaded)
        const planKey = communicationPlanRecordKey(loaded)
        if (planKey && planKey !== decodeURIComponent(planId || '')) {
          navigate(communicationPlanChooserHref(loaded), {
            replace: true,
            state: { projectId: loaded.project_id || projectId },
          })
        }
        const people = await getStakeholders({ project_id: loaded.project_id || projectId, limit: 500 })
        if (!cancelled) setStakeholders(people || [])
      } catch (e) {
        if (!cancelled) setLoadError(e?.message || 'Failed to load stakeholders')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [planId, projectId, projectCtxLoading, location.state?.projectId])

  const audience = audienceForPlan(plan, stakeholders)

  useEffect(() => {
    if (loading || !plan || audience.length > 1) return
    navigate(communicationPlanHref('edit', plan, audience[0]), {
      replace: true,
      state: { projectId: plan.project_id || projectId },
    })
  }, [loading, plan, audience.length, navigate, projectId])

  const openForm = (action, record, person) => {
    navigate(communicationPlanHref(action, record, person), { state: { projectId: plan?.project_id || projectId } })
  }

  const handleView = (person) => {
    openForm('view', plan, person)
  }

  const handleEdit = (person) => {
    openForm('edit', plan, person)
  }

  const handleDelete = async (person) => {
    if (!window.confirm(`Delete the communication plan for ${person.stakeholder_name}?`)) return
    setBusyId(person.id)
    setLoadError('')
    try {
      const groups = planAudienceGroups(plan)
      const mine = groupsMatchingPerson(person, groups)
      const others = groups.filter((group) => !mine.includes(group))
      if (!others.length) {
        await deleteCommunicationPlan(plan.id)
      } else {
        const remaining = {
          project_id: plan.project_id,
          target_stakeholder_groups: others,
        }
        if (Object.prototype.hasOwnProperty.call(plan, 'stakeholder_communication_requirements')) {
          remaining.stakeholder_communication_requirements = others.join('\n')
        }
        await saveCommunicationPlan(remaining, plan.id)
      }
      showSuccess({
        recordId: person.stakeholder_name,
        operation: 'deleted',
        message: 'Communication plan removed for this stakeholder.',
        onOk: () => navigate(listTarget),
      })
    } catch (e) {
      setLoadError(e?.message || 'Failed to delete this stakeholder’s plan')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate(listTarget)}
          className="inline-flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to communication plans
        </button>
      </div>

      <div className="w-full max-w-5xl bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Choose a stakeholder</h1>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
            {plan?.plan_name || 'This plan'} covers more than one stakeholder. Choose who this communication plan is for.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" aria-hidden />
          </div>
        ) : loadError ? (
          <p className="p-6 text-sm text-red-700 dark:text-red-300">{loadError}</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stakeholder</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Start</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">End</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {audience.map((person, index) => (
                <tr key={person.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{person.stakeholder_name}</td>
                  <td className="px-6 py-4 text-sm">
                    {person.stakeholder_type && (
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded capitalize ${stakeholderTypeBadgeClass(person.stakeholder_type)}`}>
                        {person.stakeholder_type}
                      </span>
                    )}
                    {person.is_decision_maker && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Decision Maker</div>
                    )}
                    {person.is_influencer && (
                      <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">Influencer</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-200">{formatPlanDate(plan?.plan_start_date)}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-200">{formatPlanDate(plan?.plan_end_date)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <RowActionButton variant="view" label="View plan" onClick={() => handleView(person)} disabled={busyId === person.id} />
                      <RowActionButton variant="edit" label="Edit plan" onClick={() => handleEdit(person)} disabled={busyId === person.id} />
                      <RowActionButton variant="delete" label="Delete plan" onClick={() => handleDelete(person)} disabled={busyId === person.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {successModal}
    </div>
  )
}
