/**
 * Stage Plan Overview Section
 */

import { useState, useEffect } from 'react'
import { platformDb } from '../../services/supabase/supabaseClient'

export default function StagePlanOverviewSection({ formData, onChange, errors, mode, projectId }) {
  const [stageBoundaries, setStageBoundaries] = useState([])
  const [projectPhases, setProjectPhases] = useState([])
  const [projectPlans, setProjectPlans] = useState([])
  const [teamMembers, setTeamMembers] = useState([])

  useEffect(() => {
    if (projectId) {
      loadRelatedData()
    }
  }, [projectId])

  const loadRelatedData = async () => {
    try {
      const { data: sbData } = await platformDb
        .from('stage_boundaries')
        .select('id, stage_name, stage_number')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
      setStageBoundaries(sbData || [])

      const { data: phasesData } = await platformDb
        .from('project_phases')
        .select('id, phase_name, phase_number')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
      setProjectPhases(phasesData || [])

      const { data: plansData } = await platformDb
        .from('project_plans')
        .select('id, plan_reference, plan_title')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
      setProjectPlans(plansData || [])

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
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Stage Plan Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Stage Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.stage_name || ''}
            onChange={(e) => onChange('stage_name', e.target.value)}
            disabled={mode === 'view'}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.stage_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Enter stage name"
          />
          {errors.stage_name && (
            <p className="mt-1 text-sm text-red-500">{errors.stage_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Stage Number
          </label>
          <input
            type="number"
            value={formData.stage_number || ''}
            onChange={(e) => onChange('stage_number', parseInt(e.target.value))}
            disabled={mode === 'view'}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="1"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Stage Description
          </label>
          <textarea
            value={formData.stage_description || ''}
            onChange={(e) => onChange('stage_description', e.target.value)}
            disabled={mode === 'view'}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter stage description"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Stage Objectives
          </label>
          <textarea
            value={formData.stage_objectives || ''}
            onChange={(e) => onChange('stage_objectives', e.target.value)}
            disabled={mode === 'view'}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter stage objectives"
          />
        </div>

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
            Link to Project Plan <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.project_plan_id || ''}
            onChange={(e) => onChange('project_plan_id', e.target.value || null)}
            disabled={mode === 'view'}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select project plan</option>
            {projectPlans.map(plan => (
              <option key={plan.id} value={plan.id}>
                {plan.plan_reference} - {plan.plan_title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Link to Stage Boundary
          </label>
          <select
            value={formData.stage_boundary_id || ''}
            onChange={(e) => onChange('stage_boundary_id', e.target.value || null)}
            disabled={mode === 'view'}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">None</option>
            {stageBoundaries.map(sb => (
              <option key={sb.id} value={sb.id}>
                Stage {sb.stage_number}: {sb.stage_name}
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
            Owner (Stage Manager)
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
