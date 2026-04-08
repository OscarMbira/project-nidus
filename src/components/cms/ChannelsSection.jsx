/**
 * Channels Section Component
 * Communication channels list management
 */

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { getChannels, addChannel, updateChannel, deleteChannel } from '../../services/cmsCommunicationChannelsService'
import ChannelCard from './ChannelCard'
import ChannelForm from './ChannelForm'

export default function ChannelsSection({ cmsId, readOnly = false }) {
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    channel_name: '',
    channel_type: '',
    channel_description: '',
    applicability: '',
    effectiveness_rating: null,
    accessibility_requirements: '',
    cost_estimate: null,
    is_preferred: false
  })

  useEffect(() => {
    if (cmsId) {
      loadChannels()
    }
  }, [cmsId])

  const loadChannels = async () => {
    try {
      setLoading(true)
      const data = await getChannels(cmsId)
      setChannels(data || [])
    } catch (error) {
      console.error('Error loading channels:', error)
      alert('Error loading channels: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateChannel(editingId, formData)
      } else {
        await addChannel(cmsId, formData)
      }
      await loadChannels()
      setShowForm(false)
      setEditingId(null)
      resetForm()
    } catch (error) {
      console.error('Error saving channel:', error)
      alert('Error saving channel: ' + error.message)
    }
  }

  const handleEdit = (channel) => {
    setFormData({
      channel_name: channel.channel_name || '',
      channel_type: channel.channel_type || '',
      channel_description: channel.channel_description || '',
      applicability: channel.applicability || '',
      effectiveness_rating: channel.effectiveness_rating || null,
      accessibility_requirements: channel.accessibility_requirements || '',
      cost_estimate: channel.cost_estimate || null,
      is_preferred: channel.is_preferred || false
    })
    setEditingId(channel.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this channel?')) return
    try {
      await deleteChannel(id)
      await loadChannels()
    } catch (error) {
      console.error('Error deleting channel:', error)
      alert('Error deleting channel: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      channel_name: '',
      channel_type: '',
      channel_description: '',
      applicability: '',
      effectiveness_rating: null,
      accessibility_requirements: '',
      cost_estimate: null,
      is_preferred: false
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
        Please save the CMS first before adding channels
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Communication Channels
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Define the communication channels available for this project
          </p>
        </div>
        {!readOnly && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Channel
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && !readOnly && (
        <ChannelForm
          channelData={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEditing={!!editingId}
        />
      )}

      {/* Channels List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading channels...</div>
      ) : channels.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p>No communication channels defined yet.</p>
          <p className="text-sm mt-1">Add at least one channel to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {channels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
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
