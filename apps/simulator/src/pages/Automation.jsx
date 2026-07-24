import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { Plus, Play, Pause, Settings, Trash2, Filter, Search, Zap } from 'lucide-react'
import { format } from 'date-fns'

export default function Automation() {
  const navigate = useNavigate()
  const [rules, setRules] = useState([])
  const [filteredRules, setFilteredRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, active, inactive
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchRules()
  }, [])

  useEffect(() => {
    filterRules()
  }, [rules, filter, searchQuery])

  const fetchRules = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRules(data || [])
    } catch (error) {
      console.error('Error fetching automation rules:', error)
      alert('Error loading automation rules: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const filterRules = () => {
    let filtered = [...rules]

    if (filter === 'active') {
      filtered = filtered.filter(r => r.is_active)
    } else if (filter === 'inactive') {
      filtered = filtered.filter(r => !r.is_active)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r =>
        (r.rule_name || '').toLowerCase().includes(query) ||
        (r.rule_description || '').toLowerCase().includes(query) ||
        (r.rule_category || '').toLowerCase().includes(query)
      )
    }

    setFilteredRules(filtered)
  }

  const handleToggleActive = async (rule) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('automation_rules')
        .update({
          is_active: !rule.is_active,
          updated_by: user.id,
        })
        .eq('id', rule.id)

      if (error) throw error
      fetchRules()
    } catch (error) {
      console.error('Error toggling rule:', error)
      alert('Error updating rule: ' + error.message)
    }
  }

  const handleDelete = async (rule) => {
    if (!window.confirm(`Delete automation rule "${rule.rule_name}"?`)) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('automation_rules')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id
        })
        .eq('id', rule.id)

      if (error) throw error
      fetchRules()
    } catch (error) {
      console.error('Error deleting rule:', error)
      alert('Error deleting rule: ' + error.message)
    }
  }

  const getCategoryColor = (category) => {
    const colors = {
      general: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      task: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      project: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      notification: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      integration: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    }
    return colors[category] || colors.general
  }

  const stats = {
    total: rules.length,
    active: rules.filter(r => r.is_active).length,
    executions: rules.reduce((sum, r) => sum + (r.execution_count || 0), 0),
    errors: rules.reduce((sum, r) => sum + (r.error_count || 0), 0),
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="h-8 w-8" />
              Automation Rules
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Create and manage workflow automation rules
            </p>
          </div>
          <button
            onClick={() => navigate('/automation/create')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Rule
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Rules</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Zap className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
            </div>
            <Play className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Executions</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.executions}</p>
            </div>
            <Zap className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Errors</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.errors}</p>
            </div>
            <Zap className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Rules</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading rules...</p>
            </div>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="text-center py-12">
            <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No Automation Rules</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">Create your first automation rule</p>
            <button
              onClick={() => navigate('/automation/create')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 mx-auto"
            >
              <Plus className="h-4 w-4" />
              Create Rule
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredRules.map((rule) => {
              const triggerConfig = rule.trigger_config || {}
              const actionConfig = rule.action_config || {}
              
              return (
                <div
                  key={rule.id}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {rule.rule_name}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getCategoryColor(rule.rule_category)}`}>
                          {rule.rule_category}
                        </span>
                        {rule.is_active ? (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 flex items-center gap-1">
                            <Play className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 flex items-center gap-1">
                            <Pause className="h-3 w-3" />
                            Inactive
                          </span>
                        )}
                      </div>
                      {rule.rule_description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {rule.rule_description}
                        </p>
                      )}
                      <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                        <span>
                          <strong>Trigger:</strong> {triggerConfig.type || 'N/A'}
                        </span>
                        <span>
                          <strong>Action:</strong> {actionConfig.type || 'N/A'}
                        </span>
                        <span>
                          <strong>Executions:</strong> {rule.execution_count || 0}
                        </span>
                        {rule.last_executed_at && (
                          <span>
                            Last run: {format(new Date(rule.last_executed_at), 'MMM d, yyyy HH:mm')}
                          </span>
                        )}
                        {rule.error_count > 0 && (
                          <span className="text-red-600 dark:text-red-400">
                            {rule.error_count} error(s)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => navigate(`/automation/${rule.id}/edit`)}
                        className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                        title="Edit"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(rule)}
                        className={`px-3 py-2 text-sm rounded-lg flex items-center gap-1 ${
                          rule.is_active
                            ? 'bg-orange-200 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-300 dark:hover:bg-orange-900/50'
                            : 'bg-green-200 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-300 dark:hover:bg-green-900/50'
                        }`}
                        title={rule.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {rule.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(rule)}
                        className="px-3 py-2 bg-red-200 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-lg hover:bg-red-300 dark:hover:bg-red-900/50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

