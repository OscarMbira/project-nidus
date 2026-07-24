import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { X, Save, Plus, Trash2, Award, Star } from 'lucide-react'

export default function ResourceSkills({ resourceId, onClose, onSave }) {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState(null)
  const [formData, setFormData] = useState({
    skill_name: '',
    skill_category: '',
    proficiency_level: 'intermediate',
    years_of_experience: '',
    certification: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (resourceId) {
      fetchSkills()
    }
  }, [resourceId])

  const fetchSkills = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('resource_skills')
        .select('*')
        .eq('resource_id', resourceId)
        .eq('is_deleted', false)
        .order('skill_name', { ascending: true })

      if (error) throw error
      setSkills(data || [])
    } catch (error) {
      console.error('Error fetching skills:', error)
      alert('Error loading skills: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setFormData({
      skill_name: '',
      skill_category: '',
      proficiency_level: 'intermediate',
      years_of_experience: '',
      certification: '',
      notes: '',
    })
    setSelectedSkill(null)
    setShowForm(true)
  }

  const handleEdit = (skill) => {
    setFormData({
      skill_name: skill.skill_name,
      skill_category: skill.skill_category || '',
      proficiency_level: skill.proficiency_level,
      years_of_experience: skill.years_of_experience || '',
      certification: skill.certification || '',
      notes: skill.notes || '',
    })
    setSelectedSkill(skill)
    setShowForm(true)
  }

  const handleChange = (e) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseInt(value) : '') : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const submitData = {
        resource_id: resourceId,
        skill_name: formData.skill_name,
        skill_category: formData.skill_category || null,
        proficiency_level: formData.proficiency_level,
        years_of_experience: formData.years_of_experience ? parseInt(formData.years_of_experience) : null,
        certification: formData.certification || null,
        notes: formData.notes || null,
        updated_by: user.id,
      }

      if (selectedSkill) {
        // Update
        const { error } = await supabase
          .from('resource_skills')
          .update(submitData)
          .eq('id', selectedSkill.id)

        if (error) throw error
      } else {
        // Create
        submitData.created_by = user.id
        const { error } = await supabase
          .from('resource_skills')
          .insert(submitData)

        if (error) throw error
      }

      setShowForm(false)
      setSelectedSkill(null)
      fetchSkills()
      if (onSave) onSave()
    } catch (error) {
      console.error('Error saving skill:', error)
      alert('Error saving skill: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (skill) => {
    if (!window.confirm(`Delete skill "${skill.skill_name}"?`)) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('resource_skills')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id
        })
        .eq('id', skill.id)

      if (error) throw error
      fetchSkills()
      if (onSave) onSave()
    } catch (error) {
      console.error('Error deleting skill:', error)
      alert('Error deleting skill: ' + error.message)
    }
  }

  const getProficiencyColor = (level) => {
    switch (level) {
      case 'expert': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'advanced': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'intermediate': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getProficiencyStars = (level) => {
    const levels = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 }
    return levels[level] || 0
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="h-6 w-6" />
            Resource Skills
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Skill
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading skills...</p>
              </div>
            </div>
          ) : skills.length === 0 ? (
            <div className="text-center py-12">
              <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No Skills yet</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">Add skills to track competencies</p>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 mx-auto"
              >
                <Plus className="h-4 w-4" />
                Add First Skill
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skills.map((skill, index) => (
                <div
                  key={skill.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {skill.skill_name}
                      </h3>
                      {skill.skill_category && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {skill.skill_category}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(skill)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(skill)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Proficiency:</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getProficiencyColor(skill.proficiency_level)}`}>
                        {skill.proficiency_level}
                      </span>
                      <div className="flex items-center gap-1">
                        {[...Array(4)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < getProficiencyStars(skill.proficiency_level)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {skill.years_of_experience && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Experience:</span> {skill.years_of_experience} years
                      </div>
                    )}

                    {skill.certification && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Certification:</span> {skill.certification}
                      </div>
                    )}

                    {skill.notes && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {skill.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Skill Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedSkill ? 'Edit Skill' : 'Add Skill'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setSelectedSkill(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Skill Name *
                  </label>
                  <input
                    type="text"
                    name="skill_name"
                    value={formData.skill_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g., JavaScript, Project Management"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    name="skill_category"
                    value={formData.skill_category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g., Technical, Soft Skills, Domain"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Proficiency Level *
                  </label>
                  <select
                    name="proficiency_level"
                    value={formData.proficiency_level}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    name="years_of_experience"
                    value={formData.years_of_experience}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Certification
                  </label>
                  <input
                    type="text"
                    name="certification"
                    value={formData.certification}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g., PMP, AWS Certified"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setSelectedSkill(null)
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

