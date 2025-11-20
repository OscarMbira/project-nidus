import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { Link } from 'react-router-dom'
import { ArrowRight, AlertTriangle, Plus, Trash2 } from 'lucide-react'

// Task Dependencies component
// Shows predecessors and successors for a given task and allows adding/removing dependencies
export default function TaskDependencies({ taskId, projectId }) {
  const [dependencies, setDependencies] = useState([])
  const [projectTasks, setProjectTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    direction: 'predecessor', // 'predecessor' = other task before this one; 'successor' = other task after this one
    other_task_id: '',
    dependency_type: 'finish_to_start',
    lag_days: 0,
  })

  useEffect(() => {
    fetchData()
  }, [taskId, projectId])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')

      // Fetch dependencies where current task is predecessor or successor
      const { data: depsData, error: depsError } = await supabase
        .from('task_dependencies')
        .select(`
          *,
          predecessor:predecessor_task_id (id, task_name, task_code),
          successor:successor_task_id (id, task_name, task_code)
        `)
        .or(`predecessor_task_id.eq.${taskId},successor_task_id.eq.${taskId}`)
        .eq('is_deleted', false)

      if (depsError && depsError.code !== '42P01') throw depsError

      // Fetch tasks for this project (for selection)
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, task_name, task_code')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('task_name', { ascending: true })

      if (tasksError && tasksError.code !== '42P01') throw tasksError

      setDependencies(depsData || [])
      setProjectTasks((tasksData || []).filter(t => t.id !== taskId))
    } catch (err) {
      console.error('Error fetching task dependencies:', err)
      setError(err.message || 'Failed to load task dependencies')
    } finally {
      setLoading(false)
    }
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'lag_days' ? parseInt(value || '0', 10) : value,
    }))
  }

  const handleAddDependency = async (e) => {
    e.preventDefault()
    if (!formData.other_task_id) {
      setError('Please select a related task')
      return
    }

    // Prevent self-reference (should already be filtered, but double check)
    if (formData.other_task_id === taskId) {
      setError('A task cannot depend on itself')
      return
    }

    try {
      setSaving(true)
      setError('')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const predecessorId =
        formData.direction === 'predecessor' ? formData.other_task_id : taskId
      const successorId =
        formData.direction === 'predecessor' ? taskId : formData.other_task_id

      const { error: insertError } = await supabase
        .from('task_dependencies')
        .insert({
          predecessor_task_id: predecessorId,
          successor_task_id: successorId,
          dependency_type: formData.dependency_type,
          lag_days: formData.lag_days || 0,
          created_by: user.id,
        })

      if (insertError) {
        // Handle unique and RLS issues nicely
        if (insertError.code === '23505') {
          throw new Error('This dependency already exists')
        }
        throw insertError
      }

      // Reset form and refresh data
      setFormData({
        direction: 'predecessor',
        other_task_id: '',
        dependency_type: 'finish_to_start',
        lag_days: 0,
      })
      setShowForm(false)
      await fetchData()
    } catch (err) {
      console.error('Error adding dependency:', err)
      setError(err.message || 'Failed to add dependency')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDependency = async (dependencyId) => {
    if (!window.confirm('Are you sure you want to remove this dependency?')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('task_dependencies')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
        })
        .eq('id', dependencyId)

      if (error) throw error

      setDependencies(prev => prev.filter(d => d.id !== dependencyId))
    } catch (err) {
      console.error('Error deleting dependency:', err)
      setError(err.message || 'Failed to delete dependency')
    }
  }

  const splitDependencies = () => {
    const predecessors = []
    const successors = []
    dependencies.forEach(dep => {
      if (dep.successor_task_id === taskId) {
        predecessors.push(dep)
      } else if (dep.predecessor_task_id === taskId) {
        successors.push(dep)
      }
    })
    return { predecessors, successors }
  }

  const { predecessors, successors } = splitDependencies()

  const renderDependencyType = (type) => {
    switch (type) {
      case 'finish_to_start': return 'Finish → Start (FS)'
      case 'start_to_start': return 'Start → Start (SS)'
      case 'finish_to_finish': return 'Finish → Finish (FF)'
      case 'start_to_finish': return 'Start → Finish (SF)'
      default: return type
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Task Dependencies
        </h3>
        <button
          type="button"
          onClick={() => setShowForm(prev => !prev)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Dependency
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAddDependency} className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Relationship
              </label>
              <select
                name="direction"
                value={formData.direction}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              >
                <option value="predecessor">Other task must finish/start before this task</option>
                <option value="successor">This task must finish/start before other task</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Related Task
              </label>
              <select
                name="other_task_id"
                value={formData.other_task_id}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              >
                <option value="">Select a task</option>
                {projectTasks.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.task_name} {t.task_code && `(${t.task_code})`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dependency Type
              </label>
              <select
                name="dependency_type"
                value={formData.dependency_type}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              >
                <option value="finish_to_start">Finish to Start (FS)</option>
                <option value="start_to_start">Start to Start (SS)</option>
                <option value="finish_to_finish">Finish to Finish (FF)</option>
                <option value="start_to_finish">Start to Finish (SF)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Lag / Lead (days)
              </label>
              <input
                type="number"
                name="lag_days"
                value={formData.lag_days}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Positive = lag (wait), negative = lead (overlap)
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setError('')
              }}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Dependency'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Predecessors (must be completed before this task)
          </h4>
          {predecessors.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No predecessors defined.
            </p>
          ) : (
            <ul className="space-y-2">
              {predecessors.map(dep => (
                <li
                  key={dep.id}
                  className="flex items-start justify-between gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <ArrowRight className="h-3 w-3 text-gray-400" />
                      {dep.predecessor ? (
                        <Link
                          to={`/tasks/${dep.predecessor.id}`}
                          className="font-medium text-gray-900 dark:text-white hover:underline truncate"
                        >
                          {dep.predecessor.task_name}
                          {dep.predecessor.task_code && ` (${dep.predecessor.task_code})`}
                        </Link>
                      ) : (
                        <span className="font-medium text-gray-900 dark:text-white">
                          Unknown Task
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {renderDependencyType(dep.dependency_type)}
                      {dep.lag_days !== 0 && ` • Lag/Lead: ${dep.lag_days} days`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDependency(dep.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex-shrink-0"
                    title="Remove dependency"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Successors (depend on this task)
          </h4>
          {successors.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No successors defined.
            </p>
          ) : (
            <ul className="space-y-2">
              {successors.map(dep => (
                <li
                  key={dep.id}
                  className="flex items-start justify-between gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <ArrowRight className="h-3 w-3 text-gray-400" />
                      {dep.successor ? (
                        <Link
                          to={`/tasks/${dep.successor.id}`}
                          className="font-medium text-gray-900 dark:text-white hover:underline truncate"
                        >
                          {dep.successor.task_name}
                          {dep.successor.task_code && ` (${dep.successor.task_code})`}
                        </Link>
                      ) : (
                        <span className="font-medium text-gray-900 dark:text-white">
                          Unknown Task
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {renderDependencyType(dep.dependency_type)}
                      {dep.lag_days !== 0 && ` • Lag/Lead: ${dep.lag_days} days`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDependency(dep.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex-shrink-0"
                    title="Remove dependency"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}


