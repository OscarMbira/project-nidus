/**
 * Skill Form Component
 * Form for adding/editing skills
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { addSkill, updateSkill } from '../../services/ppdSkillsService'

export default function SkillForm({ ppdId, skill = null, mode = 'create', onSave, onCancel }) {
  const [formData, setFormData] = useState({
    skill_name: '',
    skill_description: '',
    skill_category: 'technical',
    proficiency_level: 'intermediate',
    required_for: '',
    resource_area: '',
    is_critical: false,
    display_order: 0
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (skill) {
      setFormData({
        skill_name: skill.skill_name || '',
        skill_description: skill.skill_description || '',
        skill_category: skill.skill_category || 'technical',
        proficiency_level: skill.proficiency_level || 'intermediate',
        required_for: skill.required_for || '',
        resource_area: skill.resource_area || '',
        is_critical: skill.is_critical || false,
        display_order: skill.display_order || 0
      })
    }
  }, [skill])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})

    // Validation
    if (!formData.skill_name.trim()) {
      setErrors({ skill_name: 'Skill name is required' })
      return
    }

    setSaving(true)
    try {
      let result
      if (mode === 'create') {
        result = await addSkill(ppdId, formData)
      } else {
        result = await updateSkill(skill.id, formData)
      }

      if (result.success) {
        if (onSave) {
          onSave(result.data)
        }
      } else {
        alert('Error saving skill: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving skill:', error)
      alert('Error saving skill: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {mode === 'create' ? 'Add Skill' : 'Edit Skill'}
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Skill Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="skill_name"
            value={formData.skill_name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter skill name"
          />
          {errors.skill_name && (
            <p className="mt-1 text-sm text-red-600">{errors.skill_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Skill Description
          </label>
          <textarea
            name="skill_description"
            value={formData.skill_description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Describe the skill..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Skill Category
            </label>
            <select
              name="skill_category"
              value={formData.skill_category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="technical">Technical</option>
              <option value="management">Management</option>
              <option value="domain">Domain</option>
              <option value="soft_skills">Soft Skills</option>
              <option value="certification">Certification</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Proficiency Level
            </label>
            <select
              name="proficiency_level"
              value={formData.proficiency_level}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="basic">Basic</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Required For
          </label>
          <input
            type="text"
            name="required_for"
            value={formData.required_for}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Which composition items need this skill"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Resource Area
          </label>
          <input
            type="text"
            name="resource_area"
            value={formData.resource_area}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Which area should provide this skill"
          />
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_critical"
              checked={formData.is_critical}
              onChange={handleChange}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Critical skill</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : mode === 'create' ? 'Add Skill' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
