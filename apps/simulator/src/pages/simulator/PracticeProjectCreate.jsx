/**
 * Practice Project Create Page
 * Multi-step form for creating practice projects
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { simDb } from '../../services/supabase/supabaseClient'
import { createPracticeProject } from '../../services/sim/practiceProjectService'
import { replacePracticeProjectIndustries } from '../../services/sim/simProjectIndustryService'
import { getOrgIndustryOptions } from '../../services/organisationIndustryService'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'

import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
export default function PracticeProjectCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    project_name: '',
    project_description: '',
    project_type_id: '',
    status_id: '',
    planned_start_date: '',
    planned_end_date: '',
    budget_amount: '',
    budget_currency: 'USD',
    priority: 'medium'
  })
  const [projectTypes, setProjectTypes] = useState([])
  const [projectStatuses, setProjectStatuses] = useState([])
  const [formTab, setFormTab] = useState('details')
  // v1106 — multi-industry: tick several, one marked primary (mirrors Platform's project wizard).
  const [industryOptions, setIndustryOptions] = useState([])
  const [selectedIndustryIds, setSelectedIndustryIds] = useState([])
  const [primaryIndustryId, setPrimaryIndustryId] = useState(null)

  useEffect(() => {
    loadOptions()
  }, [])

  const loadOptions = async () => {
    try {
      const [typesResult, statusesResult] = await Promise.all([
        simDb.from('practice_project_types').select('*').eq('is_active', true).order('display_order'),
        simDb.from('practice_project_statuses').select('*').eq('is_active', true).order('display_order')
      ])
      if (typesResult.data) setProjectTypes(typesResult.data)
      if (statusesResult.data) setProjectStatuses(statusesResult.data)

      const accountId = await getCurrentUserAccountId()
      if (accountId) {
        const industriesRes = await getOrgIndustryOptions(accountId)
        if (industriesRes.success) setIndustryOptions(industriesRes.data)
      }
    } catch (error) {
      console.error('Error loading options:', error)
    }
  }

  const toggleIndustry = (industryCategoryId) => {
    setSelectedIndustryIds((prev) => {
      if (prev.includes(industryCategoryId)) {
        const next = prev.filter((id) => id !== industryCategoryId)
        if (primaryIndustryId === industryCategoryId) setPrimaryIndustryId(next[0] || null)
        return next
      }
      return [...prev, industryCategoryId]
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const result = await createPracticeProject(formData)
      if (result.success) {
        if (selectedIndustryIds.length > 0) {
          try {
            const { data: { user } } = await simDb.auth.getUser()
            const { data: userRow } = await simDb
              .from('users')
              .select('id')
              .eq('auth_user_id', user?.id)
              .maybeSingle()
            const picks = selectedIndustryIds.map((id) => ({
              industryCategoryId: id,
              isPrimary: id === primaryIndustryId,
            }))
            const industriesRes = await replacePracticeProjectIndustries(result.data.id, picks, userRow?.id || null)
            if (!industriesRes.success) console.error('Failed to save practice project industries:', industriesRes.error)
          } catch (err) {
            console.error('Failed to save practice project industries:', err)
          }
        }
        navigate(`/simulator/practice-projects/${result.data.id}`)
      } else {
        alert('Error creating project: ' + result.error)
      }
    } catch (error) {
      console.error('Error creating practice project:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Create Practice Project</h1>

      <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />

      {formTab === 'audit' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this project is saved.</p>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project Name *</label>
            <input
              type="text"
              required
              value={formData.project_name}
              onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.project_description}
              onChange={(e) => setFormData({ ...formData, project_description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project Type</label>
              <select
                value={formData.project_type_id}
                onChange={(e) => setFormData({ ...formData, project_type_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select type</option>
                {projectTypes.map((type, index) => (
                  <option key={type.id} value={type.id}>{type.type_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
              <select
                value={formData.status_id}
                onChange={(e) => setFormData({ ...formData, status_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select status</option>
                {projectStatuses.map((status, index) => (
                  <option key={status.id} value={status.id}>{status.status_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
              <input
                type="date"
                value={formData.planned_start_date}
                onChange={(e) => setFormData({ ...formData, planned_start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
              <input
                type="date"
                value={formData.planned_end_date}
                onChange={(e) => setFormData({ ...formData, planned_end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Industries</label>
            {industryOptions.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No industries configured for this organisation.</p>
            ) : (
              <div className="space-y-1.5 rounded-lg border border-gray-300 dark:border-gray-600 p-3">
                {industryOptions.map((opt) => {
                  const checked = selectedIndustryIds.includes(opt.value)
                  const isPrimary = checked && primaryIndustryId === opt.value
                  return (
                    <div key={opt.value} className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleIndustry(opt.value)}
                          className="h-4 w-4 rounded border-gray-300 dark:border-gray-500 text-blue-600"
                        />
                        {opt.label}
                      </label>
                      {checked && (
                        isPrimary ? (
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Primary</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPrimaryIndustryId(opt.value)}
                            className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
                          >
                            Set as primary
                          </button>
                        )
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/simulator/practice-projects')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
      )}
    </div>
  )
}
