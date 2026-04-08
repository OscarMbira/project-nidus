/**
 * Skill Form Component
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'

const SKILL_CATEGORIES = [
  { value: 'technical', label: 'Technical' },
  { value: 'management', label: 'Management' },
  { value: 'domain', label: 'Domain' },
  { value: 'soft_skills', label: 'Soft Skills' },
  { value: 'certification', label: 'Certification' },
  { value: 'other', label: 'Other' }
]

const PROFICIENCY_LEVELS = [
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' }
]

export default function SkillForm({ skill, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    skill_name: '',
    skill_description: '',
    skill_category: 'technical',
    proficiency_level: 'intermediate',
    required_for: '',
    resource_area: '',
    is_critical: false
  })

  useEffect(() => {
    if (skill) {
      setFormData({
        skill_name: skill.skill_name || '',
        skill_description: skill.skill_description || '',
        skill_category: skill.skill_category || 'technical',
        proficiency_level: skill.proficiency_level || 'intermediate',
        required_for: skill.required_for || '',
        resource_area: skill.resource_area || '',
        is_critical: skill.is_critical || false
      })
    }
  }, [skill])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.skill_name) {
      alert('Skill name is required')
      return
    }
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Skill Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.skill_name}
            onChange={(e) => setFormData({ ...formData, skill_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter skill name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Category
          </label>
          <select
            value={formData.skill_category}
            onChange={(e) => setFormData({ ...formData, skill_category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {SKILL_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Proficiency Level
          </label>
          <select
            value={formData.proficiency_level}
            onChange={(e) => setFormData({ ...formData, proficiency_level: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {PROFICIENCY_LEVELS.map(level => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.skill_description}
            onChange={(e) => setFormData({ ...formData, skill_description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter skill description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Required For
          </label>
          <textarea
            value={formData.required_for}
            onChange={(e) => setFormData({ ...formData, required_for: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Which parts of product need this skill"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Resource Area
          </label>
          <input
            type="text"
            value={formData.resource_area}
            onChange={(e) => setFormData({ ...formData, resource_area: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Which area should provide this"
          />
        </div>

        <div className="md:col-span-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_critical}
              onChange={(e) => setFormData({ ...formData, is_critical: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Critical Skill
            </span>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <X className="w-4 h-4 inline mr-2" />
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Save className="w-4 h-4 inline mr-2" />
          {skill ? 'Update' : 'Add'} Skill
        </button>
      </div>
    </form>
  )
}
