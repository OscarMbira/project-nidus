/**
 * Project Plan Overview Section
 */

import { useState, useEffect } from 'react'
import { platformDb } from '../../services/supabase/supabaseClient'

export default function ProjectPlanOverviewSection({ formData, onChange, errors, mode, projectId }) {
  const [pids, setPids] = useState([])
  const [businessCases, setBusinessCases] = useState([])
  const [ppds, setPpds] = useState([])
  const [teamMembers, setTeamMembers] = useState([])

  useEffect(() => {
    if (projectId) {
      loadRelatedData()
    }
  }, [projectId])

  const loadRelatedData = async () => {
    try {
      // Load PIDs
      const { data: pidsData } = await platformDb
        .from('project_initiation_documents')
        .select('id, pid_reference, pid_title')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
      setPids(pidsData || [])

      // Load Business Cases
      const { data: bcData } = await platformDb
        .from('business_cases')
        .select('id, bc_reference, business_case_title')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
      setBusinessCases(bcData || [])

      // Load PPDs
      const { data: ppdData } = await platformDb
        .from('project_product_descriptions')
        .select('id, ppd_reference, product_title')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
      setPpds(ppdData || [])

      // Load team members
      const { data: membersData } = await platformDb
        .from('user_projects')
        .select(`
          user:users!user_projects_user_id_fkey(id, full_name, email)
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)
      setTeamMembers((membersData || []).map(m => m.user).filter(Boolean))
    } catch (error) {
      console.error('Error loading related data:', error)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Plan Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Plan Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.plan_title || ''}
            onChange={(e) => onChange('plan_title', e.target.value)}
            disabled={mode === 'view'}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.plan_title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Enter plan title"
          />
          {errors.plan_title && (
            <p className="mt-1 text-sm text-red-500">{errors.plan_title}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Plan Description
          </label>
          <textarea
            value={formData.plan_description || ''}
            onChange={(e) => onChange('plan_description', e.target.value)}
            disabled={mode === 'view'}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter plan description"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Plan Purpose <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.plan_purpose || ''}
            onChange={(e) => onChange('plan_purpose', e.target.value)}
            disabled={mode === 'view'}
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.plan_purpose ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Enter plan purpose (minimum 50 characters)"
          />
          {errors.plan_purpose && (
            <p className="mt-1 text-sm text-red-500">{errors.plan_purpose}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Plan Scope <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.plan_scope || ''}
            onChange={(e) => onChange('plan_scope', e.target.value)}
            disabled={mode === 'view'}
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.plan_scope ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Enter plan scope (minimum 50 characters)"
          />
          {errors.plan_scope && (
            <p className="mt-1 text-sm text-red-500">{errors.plan_scope}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Link to PID
          </label>
          <select
            value={formData.pid_id || ''}
            onChange={(e) => onChange('pid_id', e.target.value || null)}
            disabled={mode === 'view'}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">None</option>
            {pids.map(pid => (
              <option key={pid.id} value={pid.id}>
                {pid.pid_reference} - {pid.pid_title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Link to Business Case
          </label>
          <select
            value={formData.business_case_id || ''}
            onChange={(e) => onChange('business_case_id', e.target.value || null)}
            disabled={mode === 'view'}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">None</option>
            {businessCases.map(bc => (
              <option key={bc.id} value={bc.id}>
                {bc.bc_reference} - {bc.business_case_title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Link to PPD
          </label>
          <select
            value={formData.project_product_description_id || ''}
            onChange={(e) => onChange('project_product_description_id', e.target.value || null)}
            disabled={mode === 'view'}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">None</option>
            {ppds.map(ppd => (
              <option key={ppd.id} value={ppd.id}>
                {ppd.ppd_reference} - {ppd.product_title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Author
          </label>
          <select
            value={formData.author_id || ''}
            onChange={(e) => onChange('author_id', e.target.value || null)}
            disabled={mode === 'view'}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select author</option>
            {teamMembers.map(member => (
              <option key={member.id} value={member.id}>
                {member.full_name} ({member.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Owner (Project Manager)
          </label>
          <select
            value={formData.owner_id || ''}
            onChange={(e) => onChange('owner_id', e.target.value || null)}
            disabled={mode === 'view'}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select owner</option>
            {teamMembers.map(member => (
              <option key={member.id} value={member.id}>
                {member.full_name} ({member.email})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
