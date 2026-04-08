/**
 * Product Description Skills Section
 */

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { addSkill, deleteSkill } from '../../services/pdSkillsRequiredService'
import SkillForm from './SkillForm'
import SkillCard from './SkillCard'

export default function PDSkillsSection({ skills, setSkills, formData, onChange, pdId, mode }) {
  const [showForm, setShowForm] = useState(false)
  const [editingSkill, setEditingSkill] = useState(null)

  const handleAddSkill = async (skillData) => {
    if (!pdId) {
      alert('Please save the product description first before adding skills')
      return
    }

    try {
      const result = await addSkill(pdId, skillData)
      if (result.success) {
        setSkills([...skills, result.data])
        setShowForm(false)
      } else {
        alert('Error adding skill: ' + result.error)
      }
    } catch (error) {
      console.error('Error adding skill:', error)
      alert('Error adding skill: ' + error.message)
    }
  }

  const handleDeleteSkill = async (skillId) => {
    if (!confirm('Are you sure you want to delete this skill?')) return

    try {
      const result = await deleteSkill(skillId)
      if (result.success) {
        setSkills(skills.filter(s => s.id !== skillId))
      } else {
        alert('Error deleting skill: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting skill:', error)
      alert('Error deleting skill: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Development Skills Required</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Development Skills Required (Summary)
        </label>
        <textarea
          value={formData.development_skills_required || ''}
          onChange={(e) => onChange('development_skills_required', e.target.value)}
          disabled={mode === 'view'}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Skills needed to develop this product"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Resource Areas
        </label>
        <textarea
          value={formData.resource_areas || ''}
          onChange={(e) => onChange('resource_areas', e.target.value)}
          disabled={mode === 'view'}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Which areas should supply resources"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Detailed Skills</h3>
          {mode !== 'view' && pdId && (
            <button
              onClick={() => {
                setEditingSkill(null)
                setShowForm(true)
              }}
              className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Skill
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
            <SkillForm
              skill={editingSkill}
              onSubmit={handleAddSkill}
              onCancel={() => {
                setShowForm(false)
                setEditingSkill(null)
              }}
            />
          </div>
        )}

        {skills.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            No skills added yet. {mode !== 'view' && pdId && 'Click "Add Skill" to add one.'}
          </p>
        ) : (
          <div className="space-y-3">
            {skills.map(skill => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onDelete={mode !== 'view' ? () => handleDeleteSkill(skill.id) : null}
                onEdit={mode !== 'view' ? () => {
                  setEditingSkill(skill)
                  setShowForm(true)
                } : null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
