import { useState } from 'react'
import { TrendingUp, CheckCircle, XCircle, AlertCircle, Plus, X, Edit2, Target } from 'lucide-react'
import { addObjectiveReview, updateObjectiveReview, deleteObjectiveReview } from '../../../services/eprObjectivesReviewService'

const OBJECTIVE_AREAS = [
  { value: 'time', label: 'Time', icon: TrendingUp },
  { value: 'cost', label: 'Cost', icon: TrendingUp },
  { value: 'quality', label: 'Quality', icon: CheckCircle },
  { value: 'scope', label: 'Scope', icon: AlertCircle },
  { value: 'benefits', label: 'Benefits', icon: CheckCircle },
  { value: 'risk', label: 'Risk', icon: AlertCircle }
]

export default function EPRObjectivesReview({ reportId, objectivesReviews, onObjectivesReviewsChange, mode }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [newReview, setNewReview] = useState({
    objective_area: 'time',
    objective_description: '',
    original_target: '',
    tolerance_plus: null,
    tolerance_minus: null,
    actual_value: '',
    performance_rating: null,
    strategy_effectiveness: '',
    controls_effectiveness: '',
    notes: ''
  })

  const handleAdd = async () => {
    if (!newReview.objective_description.trim()) return

    try {
      const added = await addObjectiveReview(reportId, newReview)
      onObjectivesReviewsChange([...objectivesReviews, added])
      setNewReview({
        objective_area: 'time',
        objective_description: '',
        original_target: '',
        tolerance_plus: null,
        tolerance_minus: null,
        actual_value: '',
        performance_rating: null,
        strategy_effectiveness: '',
        controls_effectiveness: '',
        notes: ''
      })
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding objective review:', error)
      alert('Error adding objective review: ' + error.message)
    }
  }

  const handleUpdate = async (reviewId, updates) => {
    try {
      const updated = await updateObjectiveReview(reviewId, updates)
      onObjectivesReviewsChange(objectivesReviews.map(r => r.id === reviewId ? updated : r))
      setEditingId(null)
    } catch (error) {
      console.error('Error updating objective review:', error)
      alert('Error updating objective review: ' + error.message)
    }
  }

  const handleDelete = async (reviewId) => {
    if (!confirm('Delete this objective review?')) return

    try {
      await deleteObjectiveReview(reviewId)
      onObjectivesReviewsChange(objectivesReviews.filter(r => r.id !== reviewId))
    } catch (error) {
      console.error('Error deleting objective review:', error)
      alert('Error deleting objective review: ' + error.message)
    }
  }

  const getPerformanceIcon = (rating) => {
    switch (rating) {
      case 'exceeded':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'met':
        return <CheckCircle className="h-5 w-5 text-blue-500" />
      case 'partially_met':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'not_met':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return null
    }
  }

  const getPerformanceColor = (rating) => {
    switch (rating) {
      case 'exceeded':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'met':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      case 'partially_met':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'not_met':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  // Check which areas are covered
  const coveredAreas = new Set(objectivesReviews.map(r => r.objective_area))
  const missingAreas = OBJECTIVE_AREAS.filter(area => !coveredAreas.has(area.value))

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Objectives Review</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Review performance against objectives for time, cost, quality, scope, benefits, and risk. All 6 areas should be reviewed.
        </p>
      </div>

      {missingAreas.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
            Missing reviews for: {missingAreas.map(a => a.label).join(', ')}
          </p>
        </div>
      )}

      {objectivesReviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No objective reviews added yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {objectivesReviews.map((review) => {
            const areaConfig = OBJECTIVE_AREAS.find(a => a.value === review.objective_area)
            const Icon = areaConfig?.icon || TrendingUp

            return (
              <div
                key={review.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
              >
                {editingId === review.id ? (
                  <ObjectiveReviewEditForm
                    review={review}
                    onSave={(updates) => handleUpdate(review.id, updates)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="h-5 w-5 text-gray-400" />
                          <h4 className="font-semibold text-gray-900 dark:text-white capitalize">
                            {review.objective_area}
                          </h4>
                          {review.performance_rating && (
                            <>
                              {getPerformanceIcon(review.performance_rating)}
                              <span className={`px-2 py-1 text-xs rounded ${getPerformanceColor(review.performance_rating)}`}>
                                {review.performance_rating.replace('_', ' ')}
                              </span>
                            </>
                          )}
                          {review.within_tolerance ? (
                            <span className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                              Within Tolerance
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                              Outside Tolerance
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{review.objective_description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {review.original_target && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Target:</span>
                              <p className="font-medium">{review.original_target}</p>
                            </div>
                          )}
                          {review.actual_value && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Actual:</span>
                              <p className="font-medium">{review.actual_value}</p>
                            </div>
                          )}
                          {review.variance !== null && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Variance:</span>
                              <p className={`font-medium ${
                                review.variance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                {review.variance >= 0 ? '+' : ''}{review.variance}
                              </p>
                            </div>
                          )}
                          {review.tolerance_plus && review.tolerance_minus && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Tolerance:</span>
                              <p className="font-medium">±{review.tolerance_plus}</p>
                            </div>
                          )}
                        </div>
                        {review.strategy_effectiveness && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Strategy Effectiveness:</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{review.strategy_effectiveness}</p>
                          </div>
                        )}
                      </div>
                      {mode !== 'view' && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => setEditingId(review.id)}
                            className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(review.id)}
                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {mode !== 'view' && (
        <>
          {showAddForm ? (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Objective Area *
                  </label>
                  <select
                    value={newReview.objective_area}
                    onChange={(e) => setNewReview({ ...newReview, objective_area: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {OBJECTIVE_AREAS.filter(area => !coveredAreas.has(area.value)).map(area => (
                      <option key={area.value} value={area.value}>{area.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Objective Description *
                  </label>
                  <textarea
                    value={newReview.objective_description}
                    onChange={(e) => setNewReview({ ...newReview, objective_description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Describe the objective and performance..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Original Target
                    </label>
                    <input
                      type="text"
                      value={newReview.original_target}
                      onChange={(e) => setNewReview({ ...newReview, original_target: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Actual Value
                    </label>
                    <input
                      type="text"
                      value={newReview.actual_value}
                      onChange={(e) => setNewReview({ ...newReview, actual_value: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tolerance (+)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newReview.tolerance_plus || ''}
                      onChange={(e) => setNewReview({ ...newReview, tolerance_plus: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tolerance (-)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newReview.tolerance_minus || ''}
                      onChange={(e) => setNewReview({ ...newReview, tolerance_minus: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Performance Rating
                  </label>
                  <select
                    value={newReview.performance_rating || ''}
                    onChange={(e) => setNewReview({ ...newReview, performance_rating: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select rating...</option>
                    <option value="exceeded">Exceeded</option>
                    <option value="met">Met</option>
                    <option value="partially_met">Partially Met</option>
                    <option value="not_met">Not Met</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Strategy Effectiveness
                  </label>
                  <textarea
                    value={newReview.strategy_effectiveness}
                    onChange={(e) => setNewReview({ ...newReview, strategy_effectiveness: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="How effective was the strategy..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add Objective Review
            </button>
          )}
        </>
      )}
    </div>
  )
}

function ObjectiveReviewEditForm({ review, onSave, onCancel }) {
  const [formData, setFormData] = useState(review)

  return (
    <div className="space-y-3">
      <textarea
        value={formData.objective_description}
        onChange={(e) => setFormData({ ...formData, objective_description: e.target.value })}
        rows={2}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={formData.actual_value || ''}
          onChange={(e) => setFormData({ ...formData, actual_value: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder="Actual value"
        />
        <select
          value={formData.performance_rating || ''}
          onChange={(e) => setFormData({ ...formData, performance_rating: e.target.value || null })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="">Select rating...</option>
          <option value="exceeded">Exceeded</option>
          <option value="met">Met</option>
          <option value="partially_met">Partially Met</option>
          <option value="not_met">Not Met</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave(formData)}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
