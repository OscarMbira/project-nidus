/**
 * Plan Distribution Section Component
 */

import { useState, useEffect } from 'react'
import { Plus, Mail, User } from 'lucide-react'
import { platformDb } from '../../services/supabase/supabaseClient'

export default function PlanDistributionSection({ planId, planType, projectId }) {
  const [distributions, setDistributions] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [formData, setFormData] = useState({
    recipient_id: null,
    recipient_name: '',
    recipient_title: '',
    date_of_issue: new Date().toISOString().split('T')[0],
    version_distributed: '1.0'
  })

  useEffect(() => {
    if (planId) {
      loadDistributions()
    }
    if (projectId) {
      loadTeamMembers()
    }
  }, [planId, projectId])

  const loadDistributions = async () => {
    try {
      const { data, error } = await platformDb
        .from('plan_distribution')
        .select(`
          *,
          recipient:recipient_id(id, full_name, email)
        `)
        .eq('plan_type', planType)
        .eq('plan_id', planId)
        .order('date_of_issue', { ascending: false })

      if (error) throw error
      setDistributions(data || [])
    } catch (error) {
      console.error('Error loading distributions:', error)
    }
  }

  const loadTeamMembers = async () => {
    try {
      const { data } = await platformDb
        .from('user_projects')
        .select(`
          user:users!user_projects_user_id_fkey(id, full_name, email)
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)
      setTeamMembers((data || []).map(m => m.user).filter(Boolean))
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }

  const handleAddDistribution = async () => {
    try {
      const { error } = await platformDb
        .from('plan_distribution')
        .insert({
          plan_type: planType,
          plan_id: planId,
          ...formData
        })

      if (error) throw error
      
      setShowAddForm(false)
      setFormData({
        recipient_id: null,
        recipient_name: '',
        recipient_title: '',
        date_of_issue: new Date().toISOString().split('T')[0],
        version_distributed: '1.0'
      })
      loadDistributions()
    } catch (error) {
      console.error('Error adding distribution:', error)
      alert('Error adding distribution: ' + error.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Distribution List
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Recipient
        </button>
      </div>

      {showAddForm && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recipient
              </label>
              <select
                value={formData.recipient_id || ''}
                onChange={(e) => {
                  const member = teamMembers.find(m => m.id === e.target.value)
                  setFormData({
                    ...formData,
                    recipient_id: e.target.value || null,
                    recipient_name: member?.full_name || '',
                    recipient_title: ''
                  })
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select team member</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date of Issue
                </label>
                <input
                  type="date"
                  value={formData.date_of_issue}
                  onChange={(e) => setFormData({ ...formData, date_of_issue: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Version Distributed
                </label>
                <input
                  type="text"
                  value={formData.version_distributed}
                  onChange={(e) => setFormData({ ...formData, version_distributed: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="1.0"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDistribution}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {distributions.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No distributions recorded yet
        </p>
      ) : (
        <div className="space-y-2">
          {distributions.map(dist => (
            <div
              key={dist.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center">
                <User className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {dist.recipient_name || dist.recipient?.full_name || 'Unknown'}
                  </p>
                  {dist.recipient_title && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {dist.recipient_title}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                <p>{new Date(dist.date_of_issue).toLocaleDateString()}</p>
                <p className="text-xs">v{dist.version_distributed}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
