import React, { useState, useEffect } from 'react';
import { DEPENDENCY_TYPES, validateDependency } from '../../utils/cpmCalculator';

/**
 * DependencyManager Component
 *
 * Manages task dependencies for the Gantt chart
 * Allows viewing, adding, editing, and deleting dependencies
 *
 * @param {string} taskId - ID of the task to manage dependencies for
 * @param {Array} tasks - All project tasks
 * @param {Array} dependencies - All task dependencies
 * @param {Function} onDependencyAdd - Callback when dependency is added
 * @param {Function} onDependencyUpdate - Callback when dependency is updated
 * @param {Function} onDependencyDelete - Callback when dependency is deleted
 * @param {Function} onClose - Callback when manager is closed
 */
const DependencyManager = ({
  taskId,
  tasks = [],
  dependencies = [],
  onDependencyAdd,
  onDependencyUpdate,
  onDependencyDelete,
  onClose
}) => {
  const [taskDependencies, setTaskDependencies] = useState([]);
  const [editingDependency, setEditingDependency] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Get current task
  const currentTask = tasks.find(t => t.id === taskId);

  // Filter dependencies for this task (both predecessors and successors)
  useEffect(() => {
    const predecessors = dependencies.filter(dep =>
      (dep.target_task_id || dep.targetTaskId) === taskId
    ).map(dep => ({
      ...dep,
      type: 'predecessor',
      relatedTaskId: dep.source_task_id || dep.sourceTaskId
    }));

    const successors = dependencies.filter(dep =>
      (dep.source_task_id || dep.sourceTaskId) === taskId
    ).map(dep => ({
      ...dep,
      type: 'successor',
      relatedTaskId: dep.target_task_id || dep.targetTaskId
    }));

    setTaskDependencies([...predecessors, ...successors]);
  }, [taskId, dependencies]);

  // Get task name by ID
  const getTaskName = (id) => {
    const task = tasks.find(t => t.id === id);
    return task ? (task.task_name || task.taskName || 'Unnamed Task') : 'Unknown Task';
  };

  // Get dependency type label
  const getDependencyTypeLabel = (type) => {
    switch (type) {
      case 'FS': return 'Finish-to-Start';
      case 'SS': return 'Start-to-Start';
      case 'FF': return 'Finish-to-Finish';
      case 'SF': return 'Start-to-Finish';
      default: return type;
    }
  };

  // Get dependency type color
  const getDependencyTypeColor = (type) => {
    switch (type) {
      case 'FS': return 'text-blue-600 dark:text-blue-400';
      case 'SS': return 'text-green-600 dark:text-green-400';
      case 'FF': return 'text-orange-600 dark:text-orange-400';
      case 'SF': return 'text-purple-600 dark:text-purple-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Handle delete dependency
  const handleDelete = (dependencyId) => {
    if (window.confirm('Are you sure you want to delete this dependency?')) {
      onDependencyDelete(dependencyId);
    }
  };

  // Handle edit dependency
  const handleEdit = (dependency) => {
    setEditingDependency(dependency);
    setShowAddForm(false);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingDependency(null);
  };

  // Handle save edit
  const handleSaveEdit = (updatedDependency) => {
    onDependencyUpdate(updatedDependency);
    setEditingDependency(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Manage Dependencies</h2>
              <p className="text-blue-100 text-sm mt-1">
                {currentTask?.task_name || currentTask?.taskName || 'Task'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add Dependency Button */}
          <div className="mb-6">
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setEditingDependency(null);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Dependency
            </button>
          </div>

          {/* Add/Edit Form */}
          {(showAddForm || editingDependency) && (
            <DependencyForm
              taskId={taskId}
              tasks={tasks}
              dependencies={dependencies}
              dependency={editingDependency}
              onSave={editingDependency ? handleSaveEdit : onDependencyAdd}
              onCancel={() => {
                setShowAddForm(false);
                setEditingDependency(null);
              }}
            />
          )}

          {/* Dependencies List */}
          {taskDependencies.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-lg font-medium">No dependencies yet</p>
              <p className="text-sm mt-1">Add dependencies to link this task with others</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Predecessors */}
              {taskDependencies.filter(d => d.type === 'predecessor').length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Predecessors ({taskDependencies.filter(d => d.type === 'predecessor').length})
                  </h3>
                  <div className="space-y-2">
                    {taskDependencies
                      .filter(d => d.type === 'predecessor')
                      .map((dep) => (
                        <DependencyCard
                          key={dep.id}
                          dependency={dep}
                          taskName={getTaskName(dep.relatedTaskId)}
                          typeLabel={getDependencyTypeLabel(dep.dependency_type || dep.dependencyType)}
                          typeColor={getDependencyTypeColor(dep.dependency_type || dep.dependencyType)}
                          onEdit={() => handleEdit(dep)}
                          onDelete={() => handleDelete(dep.id)}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Successors */}
              {taskDependencies.filter(d => d.type === 'successor').length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    Successors ({taskDependencies.filter(d => d.type === 'successor').length})
                  </h3>
                  <div className="space-y-2">
                    {taskDependencies
                      .filter(d => d.type === 'successor')
                      .map((dep) => (
                        <DependencyCard
                          key={dep.id}
                          dependency={dep}
                          taskName={getTaskName(dep.relatedTaskId)}
                          typeLabel={getDependencyTypeLabel(dep.dependency_type || dep.dependencyType)}
                          typeColor={getDependencyTypeColor(dep.dependency_type || dep.dependencyType)}
                          onEdit={() => handleEdit(dep)}
                          onDelete={() => handleDelete(dep.id)}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Dependency Card Component
 * Displays a single dependency with edit/delete actions
 */
const DependencyCard = ({ dependency, taskName, typeLabel, typeColor, onEdit, onDelete }) => {
  const lagDays = dependency.lag_days || dependency.lagDays || 0;

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:shadow-md transition-shadow">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <div className="font-medium text-gray-900 dark:text-white">
            {taskName}
          </div>
          <span className={`text-sm font-medium ${typeColor}`}>
            {typeLabel}
          </span>
          {lagDays !== 0 && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {lagDays > 0 ? `+${lagDays}` : lagDays} days
            </span>
          )}
        </div>
        {dependency.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {dependency.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-600 rounded-lg transition-colors"
          aria-label="Edit dependency"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-gray-600 rounded-lg transition-colors"
          aria-label="Delete dependency"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};

/**
 * Dependency Form Component
 * Form for adding or editing a dependency
 */
const DependencyForm = ({ taskId, tasks, dependencies, dependency, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    source_task_id: dependency?.source_task_id || dependency?.sourceTaskId || '',
    target_task_id: dependency?.target_task_id || dependency?.targetTaskId || taskId,
    dependency_type: dependency?.dependency_type || dependency?.dependencyType || 'FS',
    lag_days: dependency?.lag_days || dependency?.lagDays || 0,
    description: dependency?.description || ''
  });
  const [error, setError] = useState('');

  // Determine if this is predecessor or successor
  const isPredecessor = dependency?.type === 'predecessor' || !dependency;

  // Filter available tasks (exclude current task)
  const availableTasks = tasks.filter(t => t.id !== taskId);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'lag_days' ? parseInt(value) || 0 : value
    }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Build dependency object
    const newDependency = {
      ...formData,
      source_task_id: isPredecessor ? formData.source_task_id : taskId,
      target_task_id: isPredecessor ? taskId : formData.target_task_id
    };

    // Validate
    const validation = validateDependency(newDependency, dependencies);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    // Save
    if (dependency) {
      onSave({ ...dependency, ...newDependency });
    } else {
      onSave(newDependency);
    }
  };

  return (
    <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {dependency ? 'Edit Dependency' : 'Add New Dependency'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Task Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {isPredecessor ? 'Predecessor Task' : 'Successor Task'}
          </label>
          <select
            name={isPredecessor ? 'source_task_id' : 'target_task_id'}
            value={isPredecessor ? formData.source_task_id : formData.target_task_id}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-gray-900 dark:text-white"
          >
            <option value="">Select a task...</option>
            {availableTasks.map(task => (
              <option key={task.id} value={task.id}>
                {task.task_name || task.taskName || 'Unnamed Task'}
              </option>
            ))}
          </select>
        </div>

        {/* Dependency Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Dependency Type
          </label>
          <select
            name="dependency_type"
            value={formData.dependency_type}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-gray-900 dark:text-white"
          >
            <option value="FS">Finish-to-Start (FS)</option>
            <option value="SS">Start-to-Start (SS)</option>
            <option value="FF">Finish-to-Finish (FF)</option>
            <option value="SF">Start-to-Finish (SF)</option>
          </select>
        </div>

        {/* Lag Days */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Lag Days (use negative for lead time)
          </label>
          <input
            type="number"
            name="lag_days"
            value={formData.lag_days}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-gray-900 dark:text-white"
            placeholder="0"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description (Optional)
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="2"
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-gray-900 dark:text-white resize-none"
            placeholder="Optional notes about this dependency..."
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            {dependency ? 'Save Changes' : 'Add Dependency'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default DependencyManager;
