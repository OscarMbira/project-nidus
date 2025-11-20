import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { format } from 'date-fns'
import { AlertCircle, CheckCircle, TrendingUp, TrendingDown, Plus, Settings } from 'lucide-react'

export default function ToleranceDashboard({ projectId, stageBoundaryId }) {
  const [tolerances, setTolerances] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTolerance, setNewTolerance] = useState({
    tolerance_type: 'time',
    tolerance_limit_value: '',
    tolerance_limit_unit: 'days',
    baseline_value: '',
    warning_threshold_percentage: 80,
    exception_threshold_percentage: 100,
    monitoring_frequency: 'weekly',
  })

  useEffect(() => {
    fetchTolerances()
  }, [projectId, stageBoundaryId])

  const fetchTolerances = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('stage_tolerances')
        .select('*')
        .eq('project_id', projectId)
        .eq(stageBoundaryId ? 'stage_boundary_id' : 'stage_boundary_id', stageBoundaryId || null)
        .eq('is_deleted', false)
        .order('tolerance_type', { ascending: true })

      if (error) throw error
      setTolerances(data || [])
    } catch (error) {
      console.error('Error fetching tolerances:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTolerance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('stage_tolerances')
        .insert({
          ...newTolerance,
          project_id: projectId,
          stage_boundary_id: stageBoundaryId || null,
          tolerance_limit_value: parseFloat(newTolerance.tolerance_limit_value),
          baseline_value: parseFloat(newTolerance.baseline_value) || 0,
          current_value: 0,
          variance: 0,
          status: 'within_tolerance',
          created_by: user.id,
          updated_by: user.id,
        })

      if (error) throw error

      setNewTolerance({
        tolerance_type: 'time',
        tolerance_limit_value: '',
        tolerance_limit_unit: 'days',
        baseline_value: '',
        warning_threshold_percentage: 80,
        exception_threshold_percentage: 100,
        monitoring_frequency: 'weekly',
      })
      setShowAddForm(false)
      fetchTolerances()
    } catch (error) {
      console.error('Error adding tolerance:', error)
      alert('Error adding tolerance: ' + error.message)
    }
  }

  const handleUpdateValue = async (toleranceId, newValue) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const tolerance = tolerances.find(t => t.id === toleranceId)
      if (!tolerance) return

      const currentValue = parseFloat(newValue) || 0
      const baselineValue = parseFloat(tolerance.baseline_value) || 0
      const limitValue = parseFloat(tolerance.tolerance_limit_value) || 0

      const variance = currentValue - baselineValue
      const variancePercentage = baselineValue > 0 ? (variance / baselineValue) * 100 : 0
      const usagePercentage = limitValue > 0 ? (Math.abs(variance) / limitValue) * 100 : 0

      let status = 'within_tolerance'
      if (usagePercentage >= tolerance.exception_threshold_percentage) {
        status = 'exceeded_tolerance'
      } else if (usagePercentage >= tolerance.warning_threshold_percentage) {
        status = 'approaching_tolerance'
      }

      const { error } = await supabase
        .from('stage_tolerances')
        .update({
          current_value: currentValue,
          variance: variance,
          variance_percentage: variancePercentage,
          status: status,
          status_date: new Date().toISOString().split('T')[0],
          last_checked_at: new Date().toISOString(),
          checked_by: user.id,
          updated_by: user.id,
        })
        .eq('id', toleranceId)

      if (error) throw error
      fetchTolerances()
    } catch (error) {
      console.error('Error updating tolerance:', error)
      alert('Error updating tolerance: ' + error.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'exceeded_tolerance':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700'
      case 'approaching_tolerance':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
      case 'exception':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-300 dark:border-orange-700'
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'exceeded_tolerance':
      case 'exception':
        return <AlertCircle className="h-5 w-5" />
      case 'approaching_tolerance':
        return <TrendingUp className="h-5 w-5" />
      default:
        return <CheckCircle className="h-5 w-5" />
    }
  }

  const toleranceTypes = {
    time: 'Time',
    cost: 'Cost',
    scope: 'Scope',
    quality: 'Quality',
    risk: 'Risk',
    benefits: 'Benefits',
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Stage Tolerances
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Tolerance
        </button>
      </div>

      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tolerance Type
              </label>
              <select
                value={newTolerance.tolerance_type}
                onChange={(e) => setNewTolerance({ ...newTolerance, tolerance_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                {Object.entries(toleranceTypes).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tolerance Limit
              </label>
              <input
                type="number"
                value={newTolerance.tolerance_limit_value}
                onChange={(e) => setNewTolerance({ ...newTolerance, tolerance_limit_value: e.target.value })}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Unit
              </label>
              <input
                type="text"
                value={newTolerance.tolerance_limit_unit}
                onChange={(e) => setNewTolerance({ ...newTolerance, tolerance_limit_unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="days, currency, %"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddTolerance}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Add
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

      {tolerances.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
          No tolerances defined yet. Add tolerances to monitor stage performance.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tolerances.map((tolerance) => {
            const usagePercentage = tolerance.tolerance_limit_value > 0
              ? (Math.abs(tolerance.variance || 0) / tolerance.tolerance_limit_value) * 100
              : 0

            return (
              <div
                key={tolerance.id}
                className={`bg-white dark:bg-gray-800 rounded-lg border-2 p-4 ${getStatusColor(tolerance.status)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {toleranceTypes[tolerance.tolerance_type] || tolerance.tolerance_type}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {tolerance.tolerance_limit_value} {tolerance.tolerance_limit_unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(tolerance.status)}
                    <span className="text-xs font-medium capitalize">
                      {tolerance.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Baseline:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {tolerance.baseline_value || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Current:</span>
                    <input
                      type="number"
                      value={tolerance.current_value || 0}
                      onChange={(e) => handleUpdateValue(tolerance.id, e.target.value)}
                      step="0.01"
                      className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Variance:</span>
                    <span className={`font-medium ${
                      (tolerance.variance || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                    }`}>
                      {tolerance.variance > 0 ? '+' : ''}{tolerance.variance?.toFixed(2) || 0}
                    </span>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Usage</span>
                    <span className="font-medium">{usagePercentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        usagePercentage >= tolerance.exception_threshold_percentage
                          ? 'bg-red-600'
                          : usagePercentage >= tolerance.warning_threshold_percentage
                          ? 'bg-yellow-500'
                          : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

