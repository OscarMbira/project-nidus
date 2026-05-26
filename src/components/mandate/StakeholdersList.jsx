/**
 * StakeholdersList Component
 * Manages stakeholders (customers, users, interested parties) for a mandate
 * Works for both Platform and Simulator
 */

import { useState } from 'react'
import { Plus, Edit, Trash2, User, Users, Building2 } from 'lucide-react'

export default function StakeholdersList({ 
  mandateId, 
  stakeholders = [], 
  onAdd, 
  onUpdate, 
  onDelete,
  isPractice = false,
  readOnly = false 
}) {
  const [editingId, setEditingId] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    stakeholder_type: 'customer',
    stakeholder_name: '',
    stakeholder_organisation: '',
    stakeholder_role: '',
    contact_email: '',
    is_primary: false
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await onUpdate(editingId, formData)
        setEditingId(null)
      } else {
        await onAdd(mandateId, formData)
      }
      setFormData({
        stakeholder_type: 'customer',
        stakeholder_name: '',
        stakeholder_organisation: '',
        stakeholder_role: '',
        contact_email: '',
        is_primary: false
      })
      setShowAddForm(false)
    } catch (error) {
      console.error('Error saving stakeholder:', error)
      alert('Error saving stakeholder: ' + error.message)
    }
  }

  const handleEdit = (stakeholder) => {
    setEditingId(stakeholder.id)
    setFormData({
      stakeholder_type: stakeholder.stakeholder_type || 'customer',
      stakeholder_name: stakeholder.stakeholder_name || '',
      stakeholder_organisation: stakeholder.stakeholder_organisation || '',
      stakeholder_role: stakeholder.stakeholder_role || '',
      contact_email: stakeholder.contact_email || '',
      is_primary: stakeholder.is_primary || false
    })
    setShowAddForm(true)
  }

  const handleCancel = () => {
    setEditingId(null)
    setShowAddForm(false)
    setFormData({
      stakeholder_type: 'customer',
      stakeholder_name: '',
      stakeholder_organisation: '',
      stakeholder_role: '',
      contact_email: '',
      is_primary: false
    })
  }

  const getStakeholderIcon = (type) => {
    switch (type) {
      case 'customer':
        return <User className="w-4 h-4" />
      case 'user':
        return <Users className="w-4 h-4" />
      default:
        return <Building2 className="w-4 h-4" />
    }
  }

  const getStakeholderColor = (type) => {
    switch (type) {
      case 'customer':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      case 'user':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      default:
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
    }
  }

  const groupedStakeholders = {
    customer: stakeholders.filter(s => s.stakeholder_type === 'customer'),
    user: stakeholders.filter(s => s.stakeholder_type === 'user'),
    interested_party: stakeholders.filter(s => s.stakeholder_type === 'interested_party')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Stakeholders ({stakeholders.length})
        </h3>
        {!readOnly && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Stakeholder
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stakeholder Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.stakeholder_type}
                onChange={(e) => setFormData(prev => ({ ...prev, stakeholder_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              >
                <option value="customer">Customer</option>
                <option value="user">User</option>
                <option value="interested_party">Interested Party</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.stakeholder_name}
                onChange={(e) => setFormData(prev => ({ ...prev, stakeholder_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Organisation
                </label>
                <input
                  type="text"
                  value={formData.stakeholder_organisation}
                  onChange={(e) => setFormData(prev => ({ ...prev, stakeholder_organisation: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <input
                  type="text"
                  value={formData.stakeholder_role}
                  onChange={(e) => setFormData(prev => ({ ...prev, stakeholder_role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_primary}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_primary: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Primary Stakeholder</span>
              </label>
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingId ? 'Update' : 'Add'} Stakeholder
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {stakeholders.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No stakeholders added yet.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedStakeholders).map(([type, items]) => {
            if (items.length === 0) return null
            return (
              <div key={type}>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                  {type.replace('_', ' ')} ({items.length})
                </h4>
                <div className="space-y-2">
                  {items.map((stakeholder, index) => (
                    <div
                      key={stakeholder.id}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex justify-between items-start"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium flex items-center ${getStakeholderColor(stakeholder.stakeholder_type)}`}>
                            {getStakeholderIcon(stakeholder.stakeholder_type)}
                            <span className="ml-1 capitalize">{stakeholder.stakeholder_type.replace('_', ' ')}</span>
                          </span>
                          <h4 className="font-medium text-gray-900 dark:text-white">{stakeholder.stakeholder_name}</h4>
                          {stakeholder.is_primary && (
                            <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs rounded">
                              Primary
                            </span>
                          )}
                        </div>
                        {stakeholder.stakeholder_organisation && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {stakeholder.stakeholder_organisation}
                            {stakeholder.stakeholder_role && ` • ${stakeholder.stakeholder_role}`}
                          </p>
                        )}
                        {stakeholder.contact_email && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {stakeholder.contact_email}
                          </p>
                        )}
                      </div>
                      {!readOnly && (
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleEdit(stakeholder)}
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(stakeholder.id)}
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
