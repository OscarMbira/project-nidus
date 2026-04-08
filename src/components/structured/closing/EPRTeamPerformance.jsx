import { useState, useEffect } from 'react'
import { Users, Award, Plus, X, Edit2 } from 'lucide-react'
import { addTeamRecognition, updateTeamRecognition, deleteTeamRecognition } from '../../../services/eprTeamPerformanceService'
import { supabase } from '../../../services/supabaseClient'

export default function EPRTeamPerformance({ reportId, teamPerformance, onTeamPerformanceChange, mode }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [users, setUsers] = useState([])
  const [newRecognition, setNewRecognition] = useState({
    team_member_id: null,
    team_name: '',
    role: '',
    performance_type: 'recognition',
    performance_description: '',
    achievements: [],
    recognition_category: null,
    is_highlighted: false,
    notes: ''
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_deleted', false)
        .order('full_name')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleAdd = async () => {
    if (!newRecognition.performance_description.trim()) return

    try {
      const added = await addTeamRecognition(reportId, newRecognition)
      onTeamPerformanceChange([...teamPerformance, added])
      setNewRecognition({
        team_member_id: null,
        team_name: '',
        role: '',
        performance_type: 'recognition',
        performance_description: '',
        achievements: [],
        recognition_category: null,
        is_highlighted: false,
        notes: ''
      })
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding team recognition:', error)
      alert('Error adding team recognition: ' + error.message)
    }
  }

  const handleUpdate = async (recognitionId, updates) => {
    try {
      const updated = await updateTeamRecognition(recognitionId, updates)
      onTeamPerformanceChange(teamPerformance.map(r => r.id === recognitionId ? updated : r))
      setEditingId(null)
    } catch (error) {
      console.error('Error updating team recognition:', error)
      alert('Error updating team recognition: ' + error.message)
    }
  }

  const handleDelete = async (recognitionId) => {
    if (!confirm('Delete this team recognition?')) return

    try {
      await deleteTeamRecognition(recognitionId)
      onTeamPerformanceChange(teamPerformance.filter(r => r.id !== recognitionId))
    } catch (error) {
      console.error('Error deleting team recognition:', error)
      alert('Error deleting team recognition: ' + error.message)
    }
  }

  const getPerformanceTypeColor = (type) => {
    switch (type) {
      case 'recognition':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
      case 'achievement':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'improvement':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      case 'observation':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Team Performance & Recognition</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Recognize individual team members and teams for their contributions, achievements, and performance during the project.
        </p>
      </div>

      {teamPerformance.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No team recognition added yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {teamPerformance.map((recognition) => (
            <div
              key={recognition.id}
              className={`border rounded-lg p-4 ${
                recognition.is_highlighted
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              {editingId === recognition.id ? (
                <TeamRecognitionEditForm
                  recognition={recognition}
                  users={users}
                  onSave={(updates) => handleUpdate(recognition.id, updates)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="h-5 w-5 text-yellow-500" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {recognition.team_member ? recognition.team_member.full_name : recognition.team_name || 'Team Recognition'}
                        </h4>
                        {recognition.role && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">({recognition.role})</span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded ${getPerformanceTypeColor(recognition.performance_type)}`}>
                          {recognition.performance_type}
                        </span>
                        {recognition.recognition_category && (
                          <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            {recognition.recognition_category}
                          </span>
                        )}
                        {recognition.is_highlighted && (
                          <span className="px-2 py-1 text-xs rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                            Highlighted
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{recognition.performance_description}</p>
                      {recognition.achievements && recognition.achievements.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Achievements:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                            {recognition.achievements.map((achievement, idx) => (
                              <li key={idx}>{achievement}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    {mode !== 'view' && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => setEditingId(recognition.id)}
                          className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(recognition.id)}
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
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Team Member
                    </label>
                    <select
                      value={newRecognition.team_member_id || ''}
                      onChange={(e) => setNewRecognition({ ...newRecognition, team_member_id: e.target.value || null })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Select team member...</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.full_name || user.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Or Team Name
                    </label>
                    <input
                      type="text"
                      value={newRecognition.team_name}
                      onChange={(e) => setNewRecognition({ ...newRecognition, team_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Team name (if not individual)"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Performance Description *
                  </label>
                  <textarea
                    value={newRecognition.performance_description}
                    onChange={(e) => setNewRecognition({ ...newRecognition, performance_description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Describe the recognition or performance..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Performance Type *
                    </label>
                    <select
                      value={newRecognition.performance_type}
                      onChange={(e) => setNewRecognition({ ...newRecognition, performance_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="recognition">Recognition</option>
                      <option value="achievement">Achievement</option>
                      <option value="improvement">Improvement</option>
                      <option value="observation">Observation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Recognition Category
                    </label>
                    <select
                      value={newRecognition.recognition_category || ''}
                      onChange={(e) => setNewRecognition({ ...newRecognition, recognition_category: e.target.value || null })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Select category...</option>
                      <option value="leadership">Leadership</option>
                      <option value="technical">Technical</option>
                      <option value="collaboration">Collaboration</option>
                      <option value="innovation">Innovation</option>
                      <option value="delivery">Delivery</option>
                      <option value="quality">Quality</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newRecognition.is_highlighted}
                    onChange={(e) => setNewRecognition({ ...newRecognition, is_highlighted: e.target.checked })}
                    className="rounded"
                  />
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Highlight this recognition
                  </label>
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
              Add Team Recognition
            </button>
          )}
        </>
      )}
    </div>
  )
}

function TeamRecognitionEditForm({ recognition, users, onSave, onCancel }) {
  const [formData, setFormData] = useState(recognition)

  return (
    <div className="space-y-3">
      <textarea
        value={formData.performance_description}
        onChange={(e) => setFormData({ ...formData, performance_description: e.target.value })}
        rows={2}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      />
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
