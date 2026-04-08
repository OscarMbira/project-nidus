/**
 * Audience Group Form Component
 * Add/edit audience group form
 */

import { useState } from 'react'

export default function AudienceGroupForm({ groupData = {}, onChange, onCancel, onSubmit, isEditing = false }) {
  const [channelInput, setChannelInput] = useState('')
  const [messageInput, setMessageInput] = useState('')

  const handleChange = (field, value) => {
    if (onChange) {
      onChange({ ...groupData, [field]: value })
    }
  }

  const groupTypes = [
    { value: 'project_board', label: 'Project Board' },
    { value: 'project_team', label: 'Project Team' },
    { value: 'stakeholders', label: 'Stakeholders' },
    { value: 'customers', label: 'Customers' },
    { value: 'suppliers', label: 'Suppliers' },
    { value: 'regulators', label: 'Regulators' },
    { value: 'public', label: 'Public' },
    { value: 'other', label: 'Other' }
  ]

  const frequencyOptions = [
    { value: 'continuous', label: 'Continuous' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'bi_weekly', label: 'Bi-Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'stage_end', label: 'Stage End' },
    { value: 'on_demand', label: 'On Demand' }
  ]

  const confidentialityLevels = [
    { value: 'public', label: 'Public' },
    { value: 'internal', label: 'Internal' },
    { value: 'confidential', label: 'Confidential' },
    { value: 'restricted', label: 'Restricted' }
  ]

  const addChannel = () => {
    if (channelInput.trim()) {
      const current = groupData.channel_preferences || []
      if (!current.includes(channelInput.trim())) {
        handleChange('channel_preferences', [...current, channelInput.trim()])
        setChannelInput('')
      }
    }
  }

  const removeChannel = (channel) => {
    const current = groupData.channel_preferences || []
    handleChange('channel_preferences', current.filter(c => c !== channel))
  }

  const addMessage = () => {
    if (messageInput.trim()) {
      const current = groupData.key_messages || []
      handleChange('key_messages', [...current, messageInput.trim()])
      setMessageInput('')
    }
  }

  const removeMessage = (message) => {
    const current = groupData.key_messages || []
    handleChange('key_messages', current.filter(m => m !== message))
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (onSubmit) onSubmit()
      }}
      className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Group Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={groupData.group_name || ''}
            onChange={(e) => handleChange('group_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., Project Board, Team Members"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Group Type <span className="text-red-500">*</span>
          </label>
          <select
            value={groupData.group_type || ''}
            onChange={(e) => handleChange('group_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="">Select type...</option>
            {groupTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={groupData.group_description || ''}
          onChange={(e) => handleChange('group_description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Describe this audience group..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Communication Needs <span className="text-red-500">*</span>
        </label>
        <textarea
          value={groupData.communication_needs || ''}
          onChange={(e) => handleChange('communication_needs', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="What information does this group need?"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Frequency Preference
          </label>
          <select
            value={groupData.frequency_preference || ''}
            onChange={(e) => handleChange('frequency_preference', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select frequency...</option>
            {frequencyOptions.map((freq) => (
              <option key={freq.value} value={freq.value}>
                {freq.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Confidentiality Level
          </label>
          <select
            value={groupData.confidentiality_level || 'internal'}
            onChange={(e) => handleChange('confidentiality_level', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {confidentialityLevels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Channel Preferences
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={channelInput}
            onChange={(e) => setChannelInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addChannel()
              }
            }}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Type channel name and press Enter..."
          />
          <button
            type="button"
            onClick={addChannel}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Add
          </button>
        </div>
        {groupData.channel_preferences && groupData.channel_preferences.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {groupData.channel_preferences.map((channel, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-sm flex items-center gap-1"
              >
                {channel}
                <button
                  type="button"
                  onClick={() => removeChannel(channel)}
                  className="text-green-800 dark:text-green-200 hover:text-green-900"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Key Messages
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addMessage()
              }
            }}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Type key message and press Enter..."
          />
          <button
            type="button"
            onClick={addMessage}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Add
          </button>
        </div>
        {groupData.key_messages && groupData.key_messages.length > 0 && (
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
            {groupData.key_messages.map((message, index) => (
              <li key={index} className="flex items-center justify-between">
                <span>{message}</span>
                <button
                  type="button"
                  onClick={() => removeMessage(message)}
                  className="ml-2 text-red-600 hover:text-red-700"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Stakeholder Category (Optional)
        </label>
        <input
          type="text"
          value={groupData.stakeholder_category || ''}
          onChange={(e) => handleChange('stakeholder_category', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Link to stakeholder categories..."
        />
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          {isEditing ? 'Update' : 'Add'} Audience Group
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
