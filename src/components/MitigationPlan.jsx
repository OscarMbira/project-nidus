import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { format } from 'date-fns'
import { Plus, Save, X, CheckCircle, Clock, User, Calendar, DollarSign } from 'lucide-react'

export default function MitigationPlan({ riskId, projectId, onUpdate }) {
  const [mitigations, setMitigations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMitigation, setNewMitigation] = useState({
    mitigation_action: '',
    mitigation_description: '',
    mitigation_type: 'preventive',
    assigned_to_user_id: '',
    planned_start_date: '',
    planned_completion_date: '',
    estimated_cost: '',
  })
  const [teamMembers, setTeamMembers] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchMitigations()
    fetchTeamMembers()
  }, [riskId, projectId])

  const fetchMitigations = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('risk_mitigations')
        .select(`
          *,
          assigned_to:assigned_to_user_id (id, email, full_name)
        `)
        .eq('risk_id', riskId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMitigations(data || [])
    } catch (error) {
      console.error('Error fetching mitigations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          *,
          user:user_id (id, email, full_name)
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)

      if (error) throw error
      setTeamMembers(data || [])
    } catch (error) {
      console.error('Error fetching team members:', error)
    }
  }

  const handleAddMitigation = async () => {
    if (!newMitigation.mitigation_action.trim()) {
      alert('Please enter mitigation action')
      return
    }

    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('risk_mitigations')
        .insert({
          ...newMitigation,
          risk_id: riskId,
          assigned_to_user_id: newMitigation.assigned_to_user_id || null,
          planned_start_date: newMitigation.planned_start_date || null,
          planned_completion_date: newMitigation.planned_completion_date || null,
          estimated_cost: newMitigation.estimated_cost ? parseFloat(newMitigation.estimated_cost) : null,
          created_by: user.id,
          updated_by: user.id,
        })

      if (error) throw error

      setNewMitigation({
        mitigation_action: '',
        mitigation_description: '',
        mitigation_type: 'preventive',
        assigned_to_user_id: '',
        planned_start_date: '',
        planned_completion_date: '',
        estimated_cost: '',
      })
      setShowAddForm(false)
      fetchMitigations()
      onUpdate()
    } catch (error) {
      console.error('Error adding mitigation:', error)
      alert('Error adding mitigation: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateStatus = async (mitigationId, newStatus) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const updateData = {
        status: newStatus,
        updated_by: user.id,
      }

      if (newStatus === 'completed') {
        updateData.actual_completion_date = new Date().toISOString().split('T')[0]
      } else if (newStatus === 'in_progress') {
        updateData.actual_start_date = new Date().toISOString().split('T')[0]
      }

      const { error } = await supabase
        .from('risk_mitigations')
        .update(updateData)
        .eq('id', mitigationId)

      if (error) throw error
      fetchMitigations()
      onUpdate()
    } catch (error) {
      console.error('Error updating mitigation:', error)
      alert('Error updating mitigation: ' + error.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Mitigation Plans
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Mitigation
        </button>
      </div>

      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mitigation Action *
            </label>
            <input
              type="text"
              value={newMitigation.mitigation_action}
              onChange={(e) => setNewMitigation({ ...newMitigation, mitigation_action: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Enter mitigation action..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={newMitigation.mitigation_type}
                onChange={(e) => setNewMitigation({ ...newMitigation, mitigation_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="preventive">Preventive</option>
                <option value="contingency">Contingency</option>
                <option value="corrective">Corrective</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Assign To
              </label>
              <select
                value={newMitigation.assigned_to_user_id}
                onChange={(e) => setNewMitigation({ ...newMitigation, assigned_to_user_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.user?.full_name || member.user?.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Planned Start Date
              </label>
              <input
                type="date"
                value={newMitigation.planned_start_date}
                onChange={(e) => setNewMitigation({ ...newMitigation, planned_start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Planned Completion Date
              </label>
              <input
                type="date"
                value={newMitigation.planned_completion_date}
                onChange={(e) => setNewMitigation({ ...newMitigation, planned_completion_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={newMitigation.mitigation_description}
              onChange={(e) => setNewMitigation({ ...newMitigation, mitigation_description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddMitigation}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Add Mitigation'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mitigations.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
          No mitigation plans yet. Add mitigation actions to address this risk.
        </div>
      ) : (
        <div className="space-y-3">
          {mitigations.map((mitigation) => (
            <div
              key={mitigation.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {mitigation.mitigation_action}
                  </h4>
                  {mitigation.mitigation_description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {mitigation.mitigation_description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="capitalize">Type: {mitigation.mitigation_type}</span>
                    {mitigation.assigned_to && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{mitigation.assigned_to.full_name || mitigation.assigned_to.email}</span>
                      </div>
                    )}
                    {mitigation.planned_start_date && mitigation.planned_completion_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(mitigation.planned_start_date), 'MMM dd')} - {format(new Date(mitigation.planned_completion_date), 'MMM dd')}
                        </span>
                      </div>
                    )}
                    {mitigation.estimated_cost && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>{parseFloat(mitigation.estimated_cost).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  {mitigation.progress_percentage > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {mitigation.progress_percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${mitigation.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(mitigation.status)}`}>
                  {mitigation.status.replace('_', ' ')}
                </span>
              </div>
              {mitigation.status !== 'completed' && mitigation.status !== 'cancelled' && (
                <div className="flex gap-2 mt-3">
                  {mitigation.status === 'planned' && (
                    <button
                      onClick={() => handleUpdateStatus(mitigation.id, 'in_progress')}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                    >
                      Start
                    </button>
                  )}
                  {mitigation.status === 'in_progress' && (
                    <button
                      onClick={() => handleUpdateStatus(mitigation.id, 'completed')}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                    >
                      Complete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

