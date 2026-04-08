import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { X, Save, User, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { recordDecision } from '../../services/issueDecisionService'

export default function DecisionForm({ issueId, issue, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    decision_type: 'approve',
    decision_maker_name: '',
    decision_maker_role: '',
    decision_rationale: '',
    conditions: '',
    review_date: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Get current user for default decision maker name
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', user.id)
            .single()
          
          if (userData) {
            setFormData(prev => ({
              ...prev,
              decision_maker_name: userData.full_name || userData.email || ''
            }))
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      }
    }
    fetchUser()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      await recordDecision(issueId, {
        ...formData,
        decision_date: new Date().toISOString().split('T')[0],
        review_date: formData.review_date || null
      })

      onSave()
    } catch (error) {
      console.error('Error recording decision:', error)
      alert('Error recording decision: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Record Decision
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Decision Type *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {['approve', 'reject', 'defer', 'escalate', 'accept_concession', 'request_more_info'].map((type) => (
                <label
                  key={type}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.decision_type === type
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="decision_type"
                    value={type}
                    checked={formData.decision_type === type}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {type.replace('_', ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Decision Maker Name *
              </label>
              <input
                type="text"
                name="decision_maker_name"
                value={formData.decision_maker_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Decision Maker Role
              </label>
              <input
                type="text"
                name="decision_maker_role"
                value={formData.decision_maker_role}
                onChange={handleChange}
                placeholder="e.g., Project Board, PM, Change Authority"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Decision Rationale *
            </label>
            <textarea
              name="decision_rationale"
              value={formData.decision_rationale}
              onChange={handleChange}
              rows={5}
              required
              placeholder="Explain the reasoning behind this decision..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Conditions (if any)
            </label>
            <textarea
              name="conditions"
              value={formData.conditions}
              onChange={handleChange}
              rows={3}
              placeholder="Any conditions attached to this decision..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {formData.decision_type === 'defer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Review Date
              </label>
              <input
                type="date"
                name="review_date"
                value={formData.review_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Recording...' : 'Record Decision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
