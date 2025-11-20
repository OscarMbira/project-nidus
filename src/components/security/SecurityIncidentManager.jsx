import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { AlertTriangle, Save, X, Calendar, User, FileText, CheckCircle } from 'lucide-react'

export default function SecurityIncidentManager({ incident, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    incident_type: '',
    severity: 'medium',
    title: '',
    description: '',
    status: 'detected',
    impact_assessment: '',
    remediation_steps: '',
    assigned_to: null
  })
  const [availableUsers, setAvailableUsers] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchUsers()
    if (incident) {
      setFormData({
        incident_type: incident.incident_type || '',
        severity: incident.severity || 'medium',
        title: incident.title || '',
        description: incident.description || '',
        status: incident.status || 'detected',
        impact_assessment: incident.impact_assessment || '',
        remediation_steps: incident.remediation_steps || '',
        assigned_to: incident.assigned_to || null
      })
    }
  }, [incident])

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('full_name')

      setAvailableUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const incidentData = {
        ...formData,
        updated_by: user.id
      }

      let result
      if (incident) {
        const { error } = await supabase
          .from('security_incidents')
          .update(incidentData)
          .eq('id', incident.id)

        if (error) throw error
        result = { success: true, data: { ...incident, ...incidentData } }
      } else {
        incidentData.reported_by = user.id
        incidentData.detected_at = new Date().toISOString()
        
        // Generate incident number
        const { count } = await supabase
          .from('security_incidents')
          .select('id', { count: 'exact', head: true })

        incidentData.incident_number = `INC-${String(count + 1).padStart(6, '0')}`

        const { data, error } = await supabase
          .from('security_incidents')
          .insert([incidentData])
          .select()
          .single()

        if (error) throw error
        result = { success: true, data }
      }

      onSave && onSave(result.data)
    } catch (error) {
      console.error('Error saving incident:', error)
      alert('Failed to save incident')
    } finally {
      setSaving(false)
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-red-600'
      case 'high':
        return 'bg-orange-600'
      case 'medium':
        return 'bg-yellow-600'
      case 'low':
        return 'bg-blue-600'
      default:
        return 'bg-gray-600'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {incident ? 'Edit Security Incident' : 'New Security Incident'}
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Incident Type
            </label>
            <input
              type="text"
              value={formData.incident_type}
              onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Data Breach, Unauthorized Access"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Severity
            </label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Brief description of the incident"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            rows="4"
            placeholder="Detailed description of the security incident..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="detected">Detected</option>
              <option value="investigating">Investigating</option>
              <option value="contained">Contained</option>
              <option value="remediated">Remediated</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assigned To
            </label>
            <select
              value={formData.assigned_to || ''}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value || null })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Unassigned</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Impact Assessment
          </label>
          <textarea
            value={formData.impact_assessment}
            onChange={(e) => setFormData({ ...formData, impact_assessment: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            rows="3"
            placeholder="Assess the impact of this incident..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Remediation Steps
          </label>
          <textarea
            value={formData.remediation_steps}
            onChange={(e) => setFormData({ ...formData, remediation_steps: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            rows="3"
            placeholder="Steps taken or planned to remediate this incident..."
          />
        </div>

        <div className="flex gap-2 pt-4">
          <button
            onClick={handleSave}
            disabled={saving || !formData.title || !formData.description}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Incident'}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

