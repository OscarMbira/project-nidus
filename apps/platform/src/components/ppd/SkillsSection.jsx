/**
 * PPD Skills Section Component
 * Displays and manages development skills required
 */

import { useState, useEffect } from 'react'
import { Plus, Users } from 'lucide-react'
import { getSkills, deleteSkill } from '../../services/ppdSkillsService'
import SkillCard from './SkillCard'
import SkillForm from './SkillForm'

export default function SkillsSection({ ppdId, mode = 'view', formData, onChange }) {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState(null)

  useEffect(() => {
    if (ppdId) {
      loadSkills()
    }
  }, [ppdId])

  const loadSkills = async () => {
    try {
      setLoading(true)
      const result = await getSkills(ppdId)
      if (result.success) {
        setSkills(result.data || [])
      }
    } catch (error) {
      console.error('Error loading skills:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setSelectedSkill(null)
    setShowForm(true)
  }

  const handleEdit = (skill) => {
    setSelectedSkill(skill)
    setShowForm(true)
  }

  const handleDelete = async (skillId) => {
    if (!confirm('Are you sure you want to delete this skill?')) {
      return
    }

    try {
      const result = await deleteSkill(skillId)
      if (result.success) {
        await loadSkills()
      } else {
        alert('Error deleting skill: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting skill:', error)
      alert('Error deleting skill: ' + error.message)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedSkill(null)
    loadSkills()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading skills...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Development Skills Required (Text Field) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Development Skills Required
        </label>
        {mode === 'view' ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData?.development_skills_required || 'Not defined'}
          </p>
        ) : (
          <textarea
            value={formData?.development_skills_required || ''}
            onChange={(e) => onChange && onChange('development_skills_required', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Describe the development skills required..."
          />
        )}
      </div>

      {/* Resource Areas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Resource Areas
        </label>
        {mode === 'view' ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData?.resource_areas || 'Not defined'}
          </p>
        ) : (
          <textarea
            value={formData?.resource_areas || ''}
            onChange={(e) => onChange && onChange('resource_areas', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Which areas should supply resources..."
          />
        )}
      </div>

      {/* Detailed Skills */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detailed Skills</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Specific development skills required categorized by type
            </p>
          </div>
          {mode !== 'view' && (
            <button
              onClick={handleAdd}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Skill
            </button>
          )}
        </div>

        {showForm && (
          <SkillForm
            ppdId={ppdId}
            skill={selectedSkill}
            mode={selectedSkill ? 'edit' : 'create'}
            onSave={handleFormClose}
            onCancel={() => {
              setShowForm(false)
              setSelectedSkill(null)
            }}
          />
        )}

        {skills.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Users className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Skills Added
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Add specific development skills required categorized by type
            </p>
            {mode !== 'view' && (
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add First Skill
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {skills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                mode={mode}
                onEdit={mode !== 'view' ? () => handleEdit(skill) : null}
                onDelete={mode !== 'view' ? () => handleDelete(skill.id) : null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
