import { useState } from 'react'
import { CheckCircle, X, Edit2, Trash2, Star, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react'

export default function OptionCard({ option, onEdit, onDelete, onSetRecommended, isEditing, onSave, onCancel, mode }) {
  const [formData, setFormData] = useState(option || {
    option_title: '',
    option_description: '',
    effect_on_business_case: '',
    effect_on_time_tolerance: '',
    effect_on_cost_tolerance: '',
    effect_on_scope_tolerance: '',
    effect_on_quality_tolerance: '',
    effect_on_benefits: '',
    revised_end_date: '',
    revised_budget: '',
    additional_time_required: '',
    additional_cost_required: '',
    associated_risks: '',
    risk_level: '',
    risk_mitigation: '',
    pros: [],
    cons: [],
    feasibility_rating: ''
  })
  const [newPro, setNewPro] = useState('')
  const [newCon, setNewCon] = useState('')

  const handleSave = () => {
    onSave(formData)
  }

  const handleAddPro = () => {
    if (newPro.trim()) {
      setFormData(prev => ({
        ...prev,
        pros: [...(prev.pros || []), newPro.trim()]
      }))
      setNewPro('')
    }
  }

  const handleRemovePro = (index) => {
    setFormData(prev => ({
      ...prev,
      pros: prev.pros.filter((_, i) => i !== index)
    }))
  }

  const handleAddCon = () => {
    if (newCon.trim()) {
      setFormData(prev => ({
        ...prev,
        cons: [...(prev.cons || []), newCon.trim()]
      }))
      setNewCon('')
    }
  }

  const handleRemoveCon = (index) => {
    setFormData(prev => ({
      ...prev,
      cons: prev.cons.filter((_, i) => i !== index)
    }))
  }

  if (isEditing) {
    return (
      <div className="border border-blue-300 dark:border-blue-700 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Option Title *
            </label>
            <input
              type="text"
              value={formData.option_title}
              onChange={(e) => setFormData(prev => ({ ...prev, option_title: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Option title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Option Description *
            </label>
            <textarea
              value={formData.option_description}
              onChange={(e) => setFormData(prev => ({ ...prev, option_description: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Describe this option..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Revised End Date
              </label>
              <input
                type="date"
                value={formData.revised_end_date || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, revised_end_date: e.target.value || null }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Revised Budget
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.revised_budget || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, revised_budget: e.target.value ? parseFloat(e.target.value) : null }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Effect on Business Case
            </label>
            <textarea
              value={formData.effect_on_business_case || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, effect_on_business_case: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="How this option affects the business case..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Associated Risks
            </label>
            <textarea
              value={formData.associated_risks || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, associated_risks: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Risks associated with this option..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Risk Level
              </label>
              <select
                value={formData.risk_level || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, risk_level: e.target.value || null }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select Risk Level</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Feasibility Rating
              </label>
              <select
                value={formData.feasibility_rating || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, feasibility_rating: e.target.value || null }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select Rating</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pros
              </label>
              <div className="space-y-2">
                {(formData.pros || []).map((pro, index) => (
                  <div key={index} className="flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 rounded p-2">
                    <span className="flex-1 text-sm">{pro}</span>
                    <button onClick={() => handleRemovePro(index)} className="text-red-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newPro}
                    onChange={(e) => setNewPro(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddPro()}
                    placeholder="Add pro..."
                    className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <button onClick={handleAddPro} className="px-3 py-2 bg-green-600 text-white rounded-lg">Add</button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cons
              </label>
              <div className="space-y-2">
                {(formData.cons || []).map((con, index) => (
                  <div key={index} className="flex items-center space-x-2 bg-red-50 dark:bg-red-900/20 rounded p-2">
                    <span className="flex-1 text-sm">{con}</span>
                    <button onClick={() => handleRemoveCon(index)} className="text-red-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newCon}
                    onChange={(e) => setNewCon(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCon()}
                    placeholder="Add con..."
                    className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <button onClick={handleAddCon} className="px-3 py-2 bg-red-600 text-white rounded-lg">Add</button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`border rounded-lg p-4 ${
      option.is_recommended 
        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Option {option.option_number}: {option.option_title}
            </h4>
            {option.is_recommended && (
              <span className="flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                <Star className="h-3 w-3" />
                <span>Recommended</span>
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{option.option_description}</p>
          
          {option.effect_on_business_case && (
            <div className="mb-2">
              <span className="text-xs font-medium text-gray-500">Business Case Impact:</span>
              <p className="text-sm text-gray-700 dark:text-gray-300">{option.effect_on_business_case}</p>
            </div>
          )}

          {option.risk_level && (
            <div className="flex items-center space-x-2 text-xs">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span>Risk Level: <span className="font-medium capitalize">{option.risk_level}</span></span>
            </div>
          )}
        </div>

        {mode !== 'view' && (
          <div className="flex items-center space-x-2 ml-4">
            {!option.is_recommended && (
              <button
                onClick={onSetRecommended}
                className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                title="Mark as recommended"
              >
                <CheckCircle className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onEdit}
              className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
              title="Edit"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
