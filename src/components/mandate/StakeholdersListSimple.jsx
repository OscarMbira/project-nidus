import { useState, useCallback, memo, useEffect } from 'react'
import { Plus, X, User, Users, Building2 } from 'lucide-react'
import { getActiveRoles } from '../../services/stakeholderRoleService'
import SearchableSelect from '../ui/SearchableSelect'

/**
 * StakeholdersListSimple Component
 * Simplified version for create form - manages stakeholders as JSON array
 * Stores items as array, converts to/from JSON for database storage
 */

function StakeholdersListSimple({ stakeholders = [], onChange, errors = {} }) {
  const [newStakeholder, setNewStakeholder] = useState({
    stakeholder_type: 'customer',
    stakeholder_name: '',
    stakeholder_organisation: '',
    stakeholder_role: '',
    contact_email: '',
    is_primary: false
  })
  const [showAddForm, setShowAddForm] = useState(false)
  const [roles, setRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(false)

  // Fetch stakeholder roles on mount
  useEffect(() => {
    const fetchRoles = async () => {
      setRolesLoading(true)
      try {
        const rolesData = await getActiveRoles()
        setRoles(rolesData)
      } catch (error) {
        console.error('Error fetching stakeholder roles:', error)
      } finally {
        setRolesLoading(false)
      }
    }
    fetchRoles()
  }, [])

  // Parse stakeholders from string (JSON) or array
  const parseStakeholders = useCallback((items) => {
    if (!items) return []
    if (Array.isArray(items)) return items
    try {
      const parsed = JSON.parse(items)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [])

  const stakeholdersArray = parseStakeholders(stakeholders)

  const handleAddStakeholder = useCallback(() => {
    if (!newStakeholder.stakeholder_name?.trim()) return

    const updated = [...stakeholdersArray, { ...newStakeholder, id: Date.now() }]
    onChange({ target: { name: 'stakeholders', value: JSON.stringify(updated) } })
    setNewStakeholder({
      stakeholder_type: 'customer',
      stakeholder_name: '',
      stakeholder_organisation: '',
      stakeholder_role: '',
      contact_email: '',
      is_primary: false
    })
    setShowAddForm(false)
  }, [newStakeholder, stakeholdersArray, onChange])

  const handleRemoveStakeholder = useCallback((index) => {
    const updated = stakeholdersArray.filter((_, i) => i !== index)
    onChange({ target: { name: 'stakeholders', value: updated.length > 0 ? JSON.stringify(updated) : '' } })
  }, [stakeholdersArray, onChange])

  const getStakeholderIcon = (type) => {
    switch (type) {
      case 'customer': return <User className="w-4 h-4" />
      case 'user': return <Users className="w-4 h-4" />
      default: return <Building2 className="w-4 h-4" />
    }
  }

  const getStakeholderColor = (type) => {
    switch (type) {
      case 'customer': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      case 'user': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      default: return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
    }
  }

  return (
    <div className="space-y-4">
      {/* Add New Stakeholder Button */}
      {!showAddForm && (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Stakeholder
        </button>
      )}

      {/* Add Stakeholder Form */}
      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stakeholder Type <span className="text-red-500">*</span>
            </label>
            <select
              value={newStakeholder.stakeholder_type}
              onChange={(e) => setNewStakeholder(prev => ({ ...prev, stakeholder_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
              value={newStakeholder.stakeholder_name}
              onChange={(e) => setNewStakeholder(prev => ({ ...prev, stakeholder_name: e.target.value }))}
              placeholder="Enter stakeholder name..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Organisation
              </label>
              <input
                type="text"
                value={newStakeholder.stakeholder_organisation}
                onChange={(e) => setNewStakeholder(prev => ({ ...prev, stakeholder_organisation: e.target.value }))}
                placeholder="Organisation name..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <SearchableSelect
                options={roles}
                value={newStakeholder.stakeholder_role}
                onChange={(value) => setNewStakeholder(prev => ({ ...prev, stakeholder_role: value }))}
                placeholder="Select or type role..."
                searchPlaceholder="Search roles..."
                allowCustom={true}
                loading={rolesLoading}
                className="w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contact Email
            </label>
            <input
              type="email"
              value={newStakeholder.contact_email}
              onChange={(e) => setNewStakeholder(prev => ({ ...prev, contact_email: e.target.value }))}
              placeholder="email@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={newStakeholder.is_primary}
                onChange={(e) => setNewStakeholder(prev => ({ ...prev, is_primary: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Primary Stakeholder</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddStakeholder}
              disabled={!newStakeholder.stakeholder_name?.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setNewStakeholder({
                  stakeholder_type: 'customer',
                  stakeholder_name: '',
                  stakeholder_organisation: '',
                  stakeholder_role: '',
                  contact_email: '',
                  is_primary: false
                })
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stakeholders List */}
      {stakeholdersArray.length > 0 ? (
        <div className="space-y-2">
          {stakeholdersArray.map((stakeholder, index) => (
            <StakeholderItem
              key={stakeholder.id || index}
              stakeholder={stakeholder}
              index={index}
              onRemove={handleRemoveStakeholder}
              getStakeholderIcon={getStakeholderIcon}
              getStakeholderColor={getStakeholderColor}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          No stakeholders added yet.
        </div>
      )}

      {/* Error Message */}
      {errors.stakeholders && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.stakeholders}</p>
      )}
    </div>
  )
}

// Memoized Stakeholder Item Component
const StakeholderItem = memo(function StakeholderItem({ stakeholder, index, onRemove, getStakeholderIcon, getStakeholderColor }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:opacity-90 transition-opacity">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          {getStakeholderIcon(stakeholder.stakeholder_type)}
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[24px]">
            {index + 1}.
          </span>
          <h4 className="flex-1 text-gray-900 dark:text-white font-medium">
            {stakeholder.stakeholder_name}
          </h4>
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStakeholderColor(stakeholder.stakeholder_type)}`}>
            {stakeholder.stakeholder_type?.replace('_', ' ') || 'customer'}
          </span>
          {stakeholder.is_primary && (
            <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs rounded">
              Primary
            </span>
          )}
        </div>
        <div className="ml-7 space-y-1">
          {stakeholder.stakeholder_organisation && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {stakeholder.stakeholder_organisation}
              {stakeholder.stakeholder_role && ` • ${stakeholder.stakeholder_role}`}
            </p>
          )}
          {stakeholder.contact_email && (
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {stakeholder.contact_email}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          title="Remove stakeholder"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
})

export default memo(StakeholdersListSimple)
