import { useState, useEffect } from 'react'
import { Target, TrendingUp, TrendingDown, Plus, X, Edit2 } from 'lucide-react'
import { addBenefitReview, updateBenefitReview, deleteBenefitReview, getBenefitsComparison, linkToBusinessCase } from '../../../services/eprBusinessCaseReviewService'
import { getBusinessCaseForReview } from '../../../services/endProjectReportService'

export default function EPRBusinessCaseReview({ reportId, businessCaseReviews, onBusinessCaseReviewsChange, projectId, businessCaseId, mode }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [businessCase, setBusinessCase] = useState(null)
  const [variance, setVariance] = useState(null)
  const [newReview, setNewReview] = useState({
    benefit_description: '',
    benefit_type: 'achieved',
    original_target_value: null,
    actual_value: null,
    measurement_unit: '',
    realization_date: null,
    is_post_project: false,
    deviation_description: '',
    deviation_reason: '',
    owner_id: null
  })

  useEffect(() => {
    if (projectId && !businessCaseId) {
      loadBusinessCase()
    } else if (businessCaseId) {
      // Load specific business case
    }
  }, [projectId, businessCaseId])

  useEffect(() => {
    if (reportId) {
      loadVariance()
    }
  }, [reportId, businessCaseReviews])

  const loadBusinessCase = async () => {
    try {
      const bc = await getBusinessCaseForReview(projectId)
      setBusinessCase(bc)
    } catch (error) {
      console.error('Error loading business case:', error)
    }
  }

  const loadVariance = async () => {
    try {
      const { calculateBenefitsVariance } = await import('../../../services/endProjectReportService')
      const varData = await calculateBenefitsVariance(reportId)
      setVariance(varData)
    } catch (error) {
      console.error('Error loading variance:', error)
    }
  }

  const handleAdd = async () => {
    if (!newReview.benefit_description.trim()) return

    try {
      const added = await addBenefitReview(reportId, {
        ...newReview,
        business_case_id: businessCase?.business_case_id || businessCaseId || null
      })
      onBusinessCaseReviewsChange([...businessCaseReviews, added])
      setNewReview({
        benefit_description: '',
        benefit_type: 'achieved',
        original_target_value: null,
        actual_value: null,
        measurement_unit: '',
        realization_date: null,
        is_post_project: false,
        deviation_description: '',
        deviation_reason: '',
        owner_id: null
      })
      setShowAddForm(false)
      await loadVariance()
    } catch (error) {
      console.error('Error adding benefit review:', error)
      alert('Error adding benefit review: ' + error.message)
    }
  }

  const handleUpdate = async (reviewId, updates) => {
    try {
      const updated = await updateBenefitReview(reviewId, updates)
      onBusinessCaseReviewsChange(businessCaseReviews.map(r => r.id === reviewId ? updated : r))
      setEditingId(null)
      await loadVariance()
    } catch (error) {
      console.error('Error updating benefit review:', error)
      alert('Error updating benefit review: ' + error.message)
    }
  }

  const handleDelete = async (reviewId) => {
    if (!confirm('Delete this benefit review?')) return

    try {
      await deleteBenefitReview(reviewId)
      onBusinessCaseReviewsChange(businessCaseReviews.filter(r => r.id !== reviewId))
      await loadVariance()
    } catch (error) {
      console.error('Error deleting benefit review:', error)
      alert('Error deleting benefit review: ' + error.message)
    }
  }

  const getBenefitTypeColor = (type) => {
    switch (type) {
      case 'achieved':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'residual':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'expected_net':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      case 'not_achieved':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Business Case Review</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Compare achieved benefits against the approved Business Case. Track benefits achieved, residual benefits, and expected net benefits.
        </p>
      </div>

      {variance && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Benefits Variance Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Expected:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                ${(variance.total_expected || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Achieved:</span>
              <p className="font-medium text-green-600 dark:text-green-400">
                ${(variance.total_achieved || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Residual:</span>
              <p className="font-medium text-yellow-600 dark:text-yellow-400">
                ${(variance.total_residual || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Variance:</span>
              <p className={`font-medium ${
                (variance.variance || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                ${(variance.variance || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Variance %:</span>
              <p className={`font-medium ${
                (variance.variance_percentage || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {(variance.variance_percentage || 0).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {businessCaseReviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No benefit reviews added yet</p>
          {businessCase && (
            <p className="text-sm mt-2">
              Business Case found with {businessCase.benefits?.length || 0} benefit(s)
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {businessCaseReviews.map((review) => (
            <div
              key={review.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
            >
              {editingId === review.id ? (
                <BenefitReviewEditForm
                  review={review}
                  onSave={(updates) => handleUpdate(review.id, updates)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{review.benefit_description}</h4>
                        <span className={`px-2 py-1 text-xs rounded ${getBenefitTypeColor(review.benefit_type)}`}>
                          {review.benefit_type.replace('_', ' ')}
                        </span>
                        {review.is_post_project && (
                          <span className="px-2 py-1 text-xs rounded bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                            Post-Project
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                        {review.original_target_value !== null && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Target:</span>
                            <p className="font-medium">{review.original_target_value.toLocaleString()} {review.measurement_unit || ''}</p>
                          </div>
                        )}
                        {review.actual_value !== null && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Actual:</span>
                            <p className="font-medium">{review.actual_value.toLocaleString()} {review.measurement_unit || ''}</p>
                          </div>
                        )}
                        {review.variance !== null && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Variance:</span>
                            <p className={`font-medium ${
                              review.variance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {review.variance >= 0 ? '+' : ''}{review.variance.toLocaleString()} {review.measurement_unit || ''}
                            </p>
                          </div>
                        )}
                        {review.variance_percentage !== null && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Variance %:</span>
                            <p className={`font-medium ${
                              review.variance_percentage >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {review.variance_percentage >= 0 ? '+' : ''}{review.variance_percentage.toFixed(1)}%
                            </p>
                          </div>
                        )}
                      </div>
                      {review.deviation_description && (
                        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">Deviation:</p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">{review.deviation_description}</p>
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
          ))}
        </div>
      )}

      {mode !== 'view' && (
        <>
          {showAddForm ? (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
              <BenefitReviewAddForm
                newReview={newReview}
                setNewReview={setNewReview}
                onAdd={handleAdd}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add Benefit Review
            </button>
          )}
        </>
      )}
    </div>
  )
}

function BenefitReviewAddForm({ newReview, setNewReview, onAdd, onCancel }) {
  const [users, setUsers] = useState([])

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const { supabase } = await import('../../../services/supabaseClient')
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_deleted', false)
        .order('full_name')
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Benefit Description *
        </label>
        <textarea
          value={newReview.benefit_description}
          onChange={(e) => setNewReview({ ...newReview, benefit_description: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder="Describe the benefit..."
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Benefit Type *
          </label>
          <select
            value={newReview.benefit_type}
            onChange={(e) => setNewReview({ ...newReview, benefit_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="achieved">Achieved</option>
            <option value="residual">Residual</option>
            <option value="expected_net">Expected Net</option>
            <option value="not_achieved">Not Achieved</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Measurement Unit
          </label>
          <input
            type="text"
            value={newReview.measurement_unit}
            onChange={(e) => setNewReview({ ...newReview, measurement_unit: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="e.g., $, hours, %"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Original Target Value
          </label>
          <input
            type="number"
            step="0.01"
            value={newReview.original_target_value || ''}
            onChange={(e) => setNewReview({ ...newReview, original_target_value: e.target.value ? parseFloat(e.target.value) : null })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Actual Value
          </label>
          <input
            type="number"
            step="0.01"
            value={newReview.actual_value || ''}
            onChange={(e) => setNewReview({ ...newReview, actual_value: e.target.value ? parseFloat(e.target.value) : null })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={newReview.is_post_project}
          onChange={(e) => setNewReview({ ...newReview, is_post_project: e.target.checked })}
          className="rounded"
        />
        <label className="text-sm text-gray-700 dark:text-gray-300">
          Residual benefit to be realized post-project
        </label>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          Add
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function BenefitReviewEditForm({ review, onSave, onCancel }) {
  const [formData, setFormData] = useState(review)

  return (
    <div className="space-y-3">
      <textarea
        value={formData.benefit_description}
        onChange={(e) => setFormData({ ...formData, benefit_description: e.target.value })}
        rows={2}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={formData.benefit_type}
          onChange={(e) => setFormData({ ...formData, benefit_type: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="achieved">Achieved</option>
          <option value="residual">Residual</option>
          <option value="expected_net">Expected Net</option>
          <option value="not_achieved">Not Achieved</option>
        </select>
        <input
          type="number"
          step="0.01"
          value={formData.actual_value || ''}
          onChange={(e) => setFormData({ ...formData, actual_value: e.target.value ? parseFloat(e.target.value) : null })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder="Actual value"
        />
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
