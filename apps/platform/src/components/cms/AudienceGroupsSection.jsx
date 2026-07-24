/**
 * Audience Groups Section Component
 * Target audience groups list management
 */

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { getAudienceGroups, addAudienceGroup, updateAudienceGroup, deleteAudienceGroup } from '../../services/cmsAudienceGroupsService'
import AudienceGroupCard from './AudienceGroupCard'
import AudienceGroupForm from './AudienceGroupForm'

export default function AudienceGroupsSection({ cmsId, readOnly = false }) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    group_name: '',
    group_type: '',
    group_description: '',
    stakeholder_category: '',
    communication_needs: '',
    frequency_preference: '',
    channel_preferences: [],
    key_messages: [],
    confidentiality_level: 'internal'
  })

  useEffect(() => {
    if (cmsId) {
      loadGroups()
    }
  }, [cmsId])

  const loadGroups = async () => {
    try {
      setLoading(true)
      const data = await getAudienceGroups(cmsId)
      setGroups(data || [])
    } catch (error) {
      console.error('Error loading audience groups:', error)
      alert('Error loading audience groups: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateAudienceGroup(editingId, formData)
      } else {
        await addAudienceGroup(cmsId, formData)
      }
      await loadGroups()
      setShowForm(false)
      setEditingId(null)
      resetForm()
    } catch (error) {
      console.error('Error saving audience group:', error)
      alert('Error saving audience group: ' + error.message)
    }
  }

  const handleEdit = (group) => {
    setFormData({
      group_name: group.group_name || '',
      group_type: group.group_type || '',
      group_description: group.group_description || '',
      stakeholder_category: group.stakeholder_category || '',
      communication_needs: group.communication_needs || '',
      frequency_preference: group.frequency_preference || '',
      channel_preferences: group.channel_preferences || [],
      key_messages: group.key_messages || [],
      confidentiality_level: group.confidentiality_level || 'internal'
    })
    setEditingId(group.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this audience group?')) return
    try {
      await deleteAudienceGroup(id)
      await loadGroups()
    } catch (error) {
      console.error('Error deleting audience group:', error)
      alert('Error deleting audience group: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      group_name: '',
      group_type: '',
      group_description: '',
      stakeholder_category: '',
      communication_needs: '',
      frequency_preference: '',
      channel_preferences: [],
      key_messages: [],
      confidentiality_level: 'internal'
    })
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    resetForm()
  }

  if (!cmsId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please save the CMS first before adding audience groups
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Target Audience Groups
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Define the target audience groups for communication
          </p>
        </div>
        {!readOnly && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Audience Group
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && !readOnly && (
        <AudienceGroupForm
          groupData={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEditing={!!editingId}
        />
      )}

      {/* Groups List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading audience groups...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p>No audience groups defined yet.</p>
          <p className="text-sm mt-1">Add at least one audience group to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <AudienceGroupCard
              key={group.id}
              group={group}
              onEdit={handleEdit}
              onDelete={handleDelete}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  )
}
