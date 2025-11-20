import React, { useState, useEffect } from 'react';
import * as ganttService from '../../services/ganttService';

/**
 * Milestone Types with Icons and Colors
 */
const MILESTONE_TYPES = {
  project_start: {
    label: 'Project Start',
    icon: '🚀',
    color: 'green',
    bgColor: 'bg-green-100 dark:bg-green-900',
    textColor: 'text-green-800 dark:text-green-200',
    borderColor: 'border-green-300 dark:border-green-700'
  },
  project_end: {
    label: 'Project End',
    icon: '🏁',
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900',
    textColor: 'text-red-800 dark:text-red-200',
    borderColor: 'border-red-300 dark:border-red-700'
  },
  phase_gate: {
    label: 'Phase Gate',
    icon: '🚪',
    color: 'amber',
    bgColor: 'bg-amber-100 dark:bg-amber-900',
    textColor: 'text-amber-800 dark:text-amber-200',
    borderColor: 'border-amber-300 dark:border-amber-700'
  },
  deliverable: {
    label: 'Deliverable',
    icon: '📦',
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
    textColor: 'text-blue-800 dark:text-blue-200',
    borderColor: 'border-blue-300 dark:border-blue-700'
  },
  review: {
    label: 'Review',
    icon: '📋',
    color: 'purple',
    bgColor: 'bg-purple-100 dark:bg-purple-900',
    textColor: 'text-purple-800 dark:text-purple-200',
    borderColor: 'border-purple-300 dark:border-purple-700'
  },
  custom: {
    label: 'Custom',
    icon: '⭐',
    color: 'gray',
    bgColor: 'bg-gray-100 dark:bg-gray-900',
    textColor: 'text-gray-800 dark:text-gray-200',
    borderColor: 'border-gray-300 dark:border-gray-700'
  }
};

/**
 * MilestoneManager Component
 *
 * Manages project milestones with rich visualization
 *
 * @param {string} projectId - Project ID
 * @param {Array} tasks - All project tasks
 * @param {Function} onClose - Callback when manager is closed
 * @param {Function} onMilestoneChange - Callback when milestones change
 */
const MilestoneManager = ({
  projectId,
  tasks = [],
  onClose,
  onMilestoneChange
}) => {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);

  // Fetch milestones on mount
  useEffect(() => {
    fetchMilestones();
  }, [projectId]);

  /**
   * Fetch milestones from database
   */
  const fetchMilestones = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await ganttService.fetchProjectMilestones(projectId);
      setMilestones(data);
    } catch (err) {
      console.error('Error fetching milestones:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle milestone create
   */
  const handleCreate = async (milestone) => {
    try {
      await ganttService.createProjectMilestone({
        ...milestone,
        project_id: projectId
      });

      // Refresh milestones
      await fetchMilestones();

      // Notify parent
      if (onMilestoneChange) {
        onMilestoneChange();
      }

      setShowAddForm(false);
    } catch (err) {
      console.error('Error creating milestone:', err);
      setError(err.message);
    }
  };

  /**
   * Handle milestone update
   */
  const handleUpdate = async (milestone) => {
    try {
      await ganttService.updateProjectMilestone(milestone.id, milestone);

      // Refresh milestones
      await fetchMilestones();

      // Notify parent
      if (onMilestoneChange) {
        onMilestoneChange();
      }

      setEditingMilestone(null);
    } catch (err) {
      console.error('Error updating milestone:', err);
      setError(err.message);
    }
  };

  /**
   * Handle milestone delete
   */
  const handleDelete = async (milestoneId) => {
    if (!window.confirm('Are you sure you want to delete this milestone?')) {
      return;
    }

    try {
      await ganttService.deleteProjectMilestone(milestoneId);

      // Refresh milestones
      await fetchMilestones();

      // Notify parent
      if (onMilestoneChange) {
        onMilestoneChange();
      }
    } catch (err) {
      console.error('Error deleting milestone:', err);
      setError(err.message);
    }
  };

  /**
   * Toggle milestone completion
   */
  const handleToggleComplete = async (milestone) => {
    try {
      await ganttService.updateProjectMilestone(milestone.id, {
        is_completed: !milestone.is_completed
      });

      // Refresh milestones
      await fetchMilestones();

      // Notify parent
      if (onMilestoneChange) {
        onMilestoneChange();
      }
    } catch (err) {
      console.error('Error toggling milestone:', err);
      setError(err.message);
    }
  };

  /**
   * Sort milestones by date
   */
  const sortedMilestones = [...milestones].sort((a, b) => {
    return new Date(a.milestone_date) - new Date(b.milestone_date);
  });

  // Group milestones by completion status
  const upcomingMilestones = sortedMilestones.filter(m => !m.is_completed && new Date(m.milestone_date) >= new Date());
  const pastDueMilestones = sortedMilestones.filter(m => !m.is_completed && new Date(m.milestone_date) < new Date());
  const completedMilestones = sortedMilestones.filter(m => m.is_completed);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 dark:from-amber-800 dark:to-amber-900 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>⭐</span>
                <span>Milestone Manager</span>
              </h2>
              <p className="text-amber-100 text-sm mt-1">
                Track key project milestones and deliverables
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-amber-200 transition-colors"
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
          {/* Add Milestone Button */}
          <div className="mb-6">
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setEditingMilestone(null);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 text-white rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Milestone
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Add/Edit Form */}
          {(showAddForm || editingMilestone) && (
            <MilestoneForm
              milestone={editingMilestone}
              tasks={tasks}
              onSave={editingMilestone ? handleUpdate : handleCreate}
              onCancel={() => {
                setShowAddForm(false);
                setEditingMilestone(null);
              }}
            />
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 dark:border-amber-400"></div>
            </div>
          ) : milestones.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <p className="text-lg font-medium">No milestones yet</p>
              <p className="text-sm mt-1">Add milestones to track key project dates and deliverables</p>
            </div>
          ) : (
            /* Milestones List */
            <div className="space-y-6">
              {/* Past Due Milestones */}
              {pastDueMilestones.length > 0 && (
                <MilestoneSection
                  title="⚠️ Past Due"
                  milestones={pastDueMilestones}
                  onEdit={setEditingMilestone}
                  onDelete={handleDelete}
                  onToggleComplete={handleToggleComplete}
                  sectionColor="red"
                />
              )}

              {/* Upcoming Milestones */}
              {upcomingMilestones.length > 0 && (
                <MilestoneSection
                  title="📅 Upcoming"
                  milestones={upcomingMilestones}
                  onEdit={setEditingMilestone}
                  onDelete={handleDelete}
                  onToggleComplete={handleToggleComplete}
                  sectionColor="blue"
                />
              )}

              {/* Completed Milestones */}
              {completedMilestones.length > 0 && (
                <MilestoneSection
                  title="✅ Completed"
                  milestones={completedMilestones}
                  onEdit={setEditingMilestone}
                  onDelete={handleDelete}
                  onToggleComplete={handleToggleComplete}
                  sectionColor="green"
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {milestones.length} milestone{milestones.length !== 1 ? 's' : ''} total
              {completedMilestones.length > 0 && ` • ${completedMilestones.length} completed`}
            </div>
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
 * Milestone Section Component
 * Groups milestones by status
 */
const MilestoneSection = ({ title, milestones, onEdit, onDelete, onToggleComplete, sectionColor }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
        {title} ({milestones.length})
      </h3>
      <div className="space-y-3">
        {milestones.map(milestone => (
          <MilestoneCard
            key={milestone.id}
            milestone={milestone}
            onEdit={() => onEdit(milestone)}
            onDelete={() => onDelete(milestone.id)}
            onToggleComplete={() => onToggleComplete(milestone)}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Milestone Card Component
 * Displays individual milestone with actions
 */
const MilestoneCard = ({ milestone, onEdit, onDelete, onToggleComplete }) => {
  const typeConfig = MILESTONE_TYPES[milestone.milestone_type] || MILESTONE_TYPES.custom;
  const milestoneDate = new Date(milestone.milestone_date);
  const isOverdue = !milestone.is_completed && milestoneDate < new Date();
  const daysUntil = Math.ceil((milestoneDate - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div className={`p-4 bg-white dark:bg-gray-700 border-l-4 ${typeConfig.borderColor} rounded-lg shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {/* Milestone Icon */}
            <span className="text-2xl">{typeConfig.icon}</span>

            {/* Milestone Name */}
            <div className="flex-1">
              <h4 className={`font-semibold text-gray-900 dark:text-white ${milestone.is_completed ? 'line-through opacity-60' : ''}`}>
                {milestone.milestone_name}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                {/* Type Badge */}
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeConfig.bgColor} ${typeConfig.textColor}`}>
                  {typeConfig.label}
                </span>

                {/* Date */}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {milestoneDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>

                {/* Days Until/Overdue */}
                {!milestone.is_completed && (
                  <span className={`text-xs font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {isOverdue ? `${Math.abs(daysUntil)} days overdue` : daysUntil === 0 ? 'Today!' : `${daysUntil} days`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {milestone.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-11">
              {milestone.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          {/* Complete Checkbox */}
          <button
            onClick={onToggleComplete}
            className={`p-2 rounded-lg transition-colors ${
              milestone.is_completed
                ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900'
            }`}
            aria-label={milestone.is_completed ? 'Mark as incomplete' : 'Mark as complete'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>

          {/* Edit */}
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-600 rounded-lg transition-colors"
            aria-label="Edit milestone"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          {/* Delete */}
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-gray-600 rounded-lg transition-colors"
            aria-label="Delete milestone"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Milestone Form Component
 * Form for creating/editing milestones
 */
const MilestoneForm = ({ milestone, tasks, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    milestone_name: milestone?.milestone_name || '',
    milestone_date: milestone?.milestone_date || '',
    milestone_type: milestone?.milestone_type || 'custom',
    task_id: milestone?.task_id || '',
    description: milestone?.description || '',
    is_completed: milestone?.is_completed || false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(milestone ? { ...milestone, ...formData } : formData);
  };

  const selectedType = MILESTONE_TYPES[formData.milestone_type] || MILESTONE_TYPES.custom;

  return (
    <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {milestone ? 'Edit Milestone' : 'Add New Milestone'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Milestone Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Milestone Name *
            </label>
            <input
              type="text"
              name="milestone_name"
              value={formData.milestone_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-600 text-gray-900 dark:text-white"
              placeholder="e.g., Project Kickoff, Phase 1 Complete, Final Delivery"
            />
          </div>

          {/* Milestone Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date *
            </label>
            <input
              type="date"
              name="milestone_date"
              value={formData.milestone_date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-600 text-gray-900 dark:text-white"
            />
          </div>

          {/* Milestone Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type *
            </label>
            <select
              name="milestone_type"
              value={formData.milestone_type}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-600 text-gray-900 dark:text-white"
            >
              {Object.entries(MILESTONE_TYPES).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.icon} {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Link to Task (Optional) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Link to Task (Optional)
            </label>
            <select
              name="task_id"
              value={formData.task_id}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-600 text-gray-900 dark:text-white"
            >
              <option value="">Not linked to a task</option>
              {tasks.map(task => (
                <option key={task.id} value={task.id}>
                  {task.task_name || task.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-600 text-gray-900 dark:text-white resize-none"
              placeholder="Additional details about this milestone..."
            />
          </div>
        </div>

        {/* Type Preview */}
        <div className={`p-3 rounded-lg ${selectedType.bgColor} ${selectedType.textColor} flex items-center gap-2`}>
          <span className="text-xl">{selectedType.icon}</span>
          <span className="text-sm font-medium">Preview: {selectedType.label} milestone</span>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 text-white rounded-lg transition-colors"
          >
            {milestone ? 'Save Changes' : 'Add Milestone'}
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

export default MilestoneManager;
