/**
 * PID Interfaces Section Component
 * Displays and manages project interfaces within the PID
 */

import { useState } from 'react'
import { Plus, Link as LinkIcon, Edit2, Trash2 } from 'lucide-react'

export default function InterfacesSection({
  pidId,
  interfaces = [],
  onInterfacesChange,
  readOnly = false
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingInterface, setEditingInterface] = useState(null)
  const [formData, setFormData] = useState({
    interface_name: '',
    interface_type: '',
    external_entity: '',
    description: '',
    contact_person: '',
    frequency: ''
  })

  const handleAddClick = () => {
    setEditingInterface(null)
    setFormData({
      interface_name: '',
      interface_type: '',
      external_entity: '',
      description: '',
      contact_person: '',
      frequency: ''
    })
    setShowForm(true)
  }

  const handleEditClick = (iface) => {
    setEditingInterface(iface)
    setFormData({
      interface_name: iface.interface_name || '',
      interface_type: iface.interface_type || '',
      external_entity: iface.external_entity || '',
      description: iface.description || '',
      contact_person: iface.contact_person || '',
      frequency: iface.frequency || ''
    })
    setShowForm(true)
  }

  const handleSave = () => {
    if (editingInterface) {
      const updated = interfaces.map(i =>
        i.id === editingInterface.id ? { ...i, ...formData } : i
      )
      if (onInterfacesChange) onInterfacesChange(updated)
    } else {
      const newInterface = { ...formData, id: Date.now().toString() }
      if (onInterfacesChange) onInterfacesChange([...interfaces, newInterface])
    }
    setShowForm(false)
    setEditingInterface(null)
  }

  const handleDelete = (interfaceId) => {
    if (window.confirm('Are you sure you want to delete this interface?')) {
      const filtered = interfaces.filter(i => i.id !== interfaceId)
      if (onInterfacesChange) onInterfacesChange(filtered)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          Project Interfaces
        </h3>
        {!readOnly && (
          <button
            onClick={handleAddClick}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Interface
          </button>
        )}
      </div>

      {interfaces.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <LinkIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No interfaces defined yet</p>
          {!readOnly && (
            <button
              onClick={handleAddClick}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
            >
              Add First Interface
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {interfaces.map((iface) => (
            <div
              key={iface.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {iface.interface_name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {iface.interface_type} - {iface.external_entity}
                  </p>
                  {iface.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {iface.description}
                    </p>
                  )}
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditClick(iface)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(iface.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingInterface ? 'Edit Interface' : 'Add Interface'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Interface Name *
                </label>
                <input
                  type="text"
                  value={formData.interface_name}
                  onChange={(e) => setFormData({ ...formData, interface_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Interface Type
                </label>
                <select
                  value={formData.interface_type}
                  onChange={(e) => setFormData({ ...formData, interface_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select type...</option>
                  <option value="internal">Internal</option>
                  <option value="external">External</option>
                  <option value="supplier">Supplier</option>
                  <option value="customer">Customer</option>
                  <option value="regulatory">Regulatory</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  External Entity
                </label>
                <input
                  type="text"
                  value={formData.external_entity}
                  onChange={(e) => setFormData({ ...formData, external_entity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.interface_name}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
