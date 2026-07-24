import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { Save, Plus, Trash2, X } from 'lucide-react'
import { getPriorityScales, getSeverityScales, updatePriorityScales, updateSeverityScales, getDefaultPriorityScales, getDefaultSeverityScales } from '../services/issueScaleService'

export default function IssueScaleConfig() {
  const [organisationId, setOrganisationId] = useState(null)
  const [priorityScales, setPriorityScales] = useState([])
  const [severityScales, setSeverityScales] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('priority') // 'priority' or 'severity'

  useEffect(() => {
    fetchOrganisationAndScales()
  }, [])

  const fetchOrganisationAndScales = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get user's organisation
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userData) throw new Error('User not found')

      const { data: account } = await supabase
        .from('accounts')
        .select('id')
        .eq('owner_user_id', userData.id)
        .eq('is_deleted', false)
        .single()

      if (!account) {
        // Try to get organisation from project membership
        const { data: projectMember } = await supabase
          .from('user_projects')
          .select('project:projects(account_id)')
          .eq('user_id', userData.id)
          .limit(1)
          .single()

        if (projectMember?.project?.account_id) {
          setOrganisationId(projectMember.project.account_id)
          await loadScales(projectMember.project.account_id)
        } else {
          // Use default scales
          setPriorityScales(getDefaultPriorityScales())
          setSeverityScales(getDefaultSeverityScales())
        }
      } else {
        setOrganisationId(account.id)
        await loadScales(account.id)
      }
    } catch (error) {
      console.error('Error fetching organisation:', error)
      // Use default scales
      setPriorityScales(getDefaultPriorityScales())
      setSeverityScales(getDefaultSeverityScales())
    } finally {
      setLoading(false)
    }
  }

  const loadScales = async (orgId) => {
    try {
      const [priority, severity] = await Promise.all([
        getPriorityScales(orgId),
        getSeverityScales(orgId)
      ])

      if (priority.length === 0) {
        setPriorityScales(getDefaultPriorityScales())
      } else {
        setPriorityScales(priority)
      }

      if (severity.length === 0) {
        setSeverityScales(getDefaultSeverityScales())
      } else {
        setSeverityScales(severity)
      }
    } catch (error) {
      console.error('Error loading scales:', error)
      // Use defaults
      setPriorityScales(getDefaultPriorityScales())
      setSeverityScales(getDefaultSeverityScales())
    }
  }

  const handleAddScale = (type) => {
    if (type === 'priority') {
      setPriorityScales([...priorityScales, {
        scale_value: '',
        scale_label: '',
        scale_order: priorityScales.length + 1,
        description: '',
        response_time: '',
        color_code: '#6B7280'
      }])
    } else {
      setSeverityScales([...severityScales, {
        scale_value: '',
        scale_label: '',
        scale_order: severityScales.length + 1,
        description: '',
        impact_description: '',
        color_code: '#6B7280'
      }])
    }
  }

  const handleRemoveScale = (type, index) => {
    if (type === 'priority') {
      setPriorityScales(priorityScales.filter((_, i) => i !== index))
    } else {
      setSeverityScales(severityScales.filter((_, i) => i !== index))
    }
  }

  const handleScaleChange = (type, index, field, value) => {
    if (type === 'priority') {
      const updated = [...priorityScales]
      updated[index] = { ...updated[index], [field]: value }
      setPriorityScales(updated)
    } else {
      const updated = [...severityScales]
      updated[index] = { ...updated[index], [field]: value }
      setSeverityScales(updated)
    }
  }

  const handleSave = async () => {
    if (!organisationId) {
      alert('Organisation not found. Please ensure you have an account.')
      return
    }

    try {
      setSaving(true)
      await Promise.all([
        updatePriorityScales(organisationId, priorityScales),
        updateSeverityScales(organisationId, severityScales)
      ])
      alert('Scales saved successfully!')
    } catch (error) {
      console.error('Error saving scales:', error)
      alert('Error saving scales: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Scale Configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Issue Scale Configuration
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure priority and severity scales for your organisation
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('priority')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'priority'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Priority Scales
            </button>
            <button
              onClick={() => setActiveTab('severity')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'severity'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Severity Scales
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'priority' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Priority Scales ({priorityScales.length})
                </h3>
                <button
                  onClick={() => handleAddScale('priority')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Scale
                </button>
              </div>

              {priorityScales.map((scale, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Value</label>
                      <input
                        type="text"
                        value={scale.scale_value}
                        onChange={(e) => handleScaleChange('priority', index, 'scale_value', e.target.value)}
                        placeholder="critical"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Label</label>
                      <input
                        type="text"
                        value={scale.scale_label}
                        onChange={(e) => handleScaleChange('priority', index, 'scale_label', e.target.value)}
                        placeholder="Critical"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Order</label>
                      <input
                        type="number"
                        value={scale.scale_order}
                        onChange={(e) => handleScaleChange('priority', index, 'scale_order', parseInt(e.target.value))}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Response Time</label>
                      <input
                        type="text"
                        value={scale.response_time || ''}
                        onChange={(e) => handleScaleChange('priority', index, 'response_time', e.target.value)}
                        placeholder="24 hours"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Color</label>
                      <input
                        type="color"
                        value={scale.color_code || '#6B7280'}
                        onChange={(e) => handleScaleChange('priority', index, 'color_code', e.target.value)}
                        className="w-full h-8 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => handleRemoveScale('priority', index)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Description</label>
                    <textarea
                      value={scale.description || ''}
                      onChange={(e) => handleScaleChange('priority', index, 'description', e.target.value)}
                      rows={2}
                      placeholder="Description of this priority level..."
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'severity' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Severity Scales ({severityScales.length})
                </h3>
                <button
                  onClick={() => handleAddScale('severity')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Scale
                </button>
              </div>

              {severityScales.map((scale, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Value</label>
                      <input
                        type="text"
                        value={scale.scale_value}
                        onChange={(e) => handleScaleChange('severity', index, 'scale_value', e.target.value)}
                        placeholder="critical"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Label</label>
                      <input
                        type="text"
                        value={scale.scale_label}
                        onChange={(e) => handleScaleChange('severity', index, 'scale_label', e.target.value)}
                        placeholder="Critical"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Order</label>
                      <input
                        type="number"
                        value={scale.scale_order}
                        onChange={(e) => handleScaleChange('severity', index, 'scale_order', parseInt(e.target.value))}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Color</label>
                      <input
                        type="color"
                        value={scale.color_code || '#6B7280'}
                        onChange={(e) => handleScaleChange('severity', index, 'color_code', e.target.value)}
                        className="w-full h-8 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => handleRemoveScale('severity', index)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Description</label>
                      <textarea
                        value={scale.description || ''}
                        onChange={(e) => handleScaleChange('severity', index, 'description', e.target.value)}
                        rows={2}
                        placeholder="Description..."
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Impact Description</label>
                      <textarea
                        value={scale.impact_description || ''}
                        onChange={(e) => handleScaleChange('severity', index, 'impact_description', e.target.value)}
                        rows={2}
                        placeholder="Impact description..."
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !organisationId}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Scales'}
        </button>
      </div>
    </div>
  )
}
