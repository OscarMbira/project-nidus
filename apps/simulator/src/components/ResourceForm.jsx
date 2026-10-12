import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { getResourceCategories, createResourceCategory } from '../services/crossResourceService'
import { X, Save, User, DollarSign, Calendar } from 'lucide-react'
import SelectField from '@nidus/ui/SelectField'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'

import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
export default function ResourceForm({ resource, onSave, onCancel }) {
  const { showSuccess, modal: successModal } = useSuccessModal()
  const [formTab, setFormTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const [formData, setFormData] = useState({
    resource_name: '',
    resource_code: '',
    resource_type: 'human',
    resource_category: '',
    resource_description: '',
    default_capacity_hours_per_day: 8.0,
    default_capacity_days_per_week: 5,
    default_capacity_percentage: 100.0,
    hourly_rate: '',
    daily_rate: '',
    currency_code: 'USD',
    is_active: true,
    is_available: true,
    user_id: '',
    team_id: '',
  })
  const [users, setUsers] = useState([])
  const [teams, setTeams] = useState([])
  const [categories, setCategories] = useState([])
  const [currencies, setCurrencies] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (resource) {
      setFormData({
        resource_name: resource.resource_name || '',
        resource_code: resource.resource_code || '',
        resource_type: resource.resource_type || 'human',
        resource_category: resource.resource_category || '',
        resource_description: resource.resource_description || '',
        default_capacity_hours_per_day: resource.default_capacity_hours_per_day || 8.0,
        default_capacity_days_per_week: resource.default_capacity_days_per_week || 5,
        default_capacity_percentage: resource.default_capacity_percentage || 100.0,
        hourly_rate: resource.hourly_rate || '',
        daily_rate: resource.daily_rate || '',
        currency_code: resource.currency_code || 'USD',
        is_active: resource.is_active !== undefined ? resource.is_active : true,
        is_available: resource.is_available !== undefined ? resource.is_available : true,
        user_id: resource.user_id || '',
        team_id: resource.team_id || '',
      })
    }
    fetchLookupData()
  }, [resource])

  useEffect(() => {
    if (formTab === 'link' && formData.resource_type !== 'human') {
      setFormTab('details')
    }
  }, [formTab, formData.resource_type])

  useEffect(() => {
    if (formTab !== 'audit' || !resource) return
    ;(async () => {
      const labels = await resolveAuditUserLabels(supabase, [resource.created_by, resource.updated_by])
      setAuditUserLabels(labels)
    })()
  }, [formTab, resource])

  const fetchLookupData = async () => {
    try {
      // Fetch users
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('full_name', { ascending: true })
      if (usersData) setUsers(usersData)

      // Fetch teams
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, team_name')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('team_name', { ascending: true })
      if (teamsData) setTeams(teamsData)

      const categoriesData = await getResourceCategories()
      setCategories(categoriesData)

      // Fetch currencies
      const { data: currenciesData } = await supabase
        .from('currencies')
        .select('code, name')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('name', { ascending: true })
      if (currenciesData) setCurrencies(currenciesData)
    } catch (error) {
      console.error('Error fetching lookup data:', error)
    }
  }

  const handleCreateCategory = async (name) => {
    try {
      const created = await createResourceCategory(name)
      setCategories((prev) => [...prev, created].sort((a, b) => a.category_name.localeCompare(b.category_name)))
      setFormData((prev) => ({ ...prev, resource_category: created.category_name }))
    } catch (error) {
      console.error('Error creating resource category:', error)
      alert('Error creating category: ' + error.message)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const submitData = {
        ...formData,
        user_id: formData.user_id || null,
        team_id: formData.team_id || null,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        daily_rate: formData.daily_rate ? parseFloat(formData.daily_rate) : null,
        updated_by: user.id,
      }

      if (resource) {
        // Update
        const { error } = await supabase
          .from('resources')
          .update(submitData)
          .eq('id', resource.id)

        if (error) throw error

        showSuccess({
          recordId: resource.resource_code || resource.resource_name,
          operation: 'updated',
          message: `Resource "${formData.resource_name}" was updated successfully.`,
          onOk: onSave,
        })
      } else {
        // Create
        submitData.created_by = user.id
        const { data: created, error } = await supabase
          .from('resources')
          .insert(submitData)
          .select()
          .single()

        if (error) throw error

        showSuccess({
          recordId: created?.resource_code || formData.resource_name,
          operation: 'created',
          message: `Resource "${formData.resource_name}" was created successfully.`,
          onOk: () => onSave(created),
        })
      }
    } catch (error) {
      console.error('Error saving resource:', error)
      alert('Error saving resource: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {successModal}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {resource ? 'Edit Resource' : 'Create Resource'}
        </h2>
      </div>

      <div className="px-6 pt-4">
        <DetailAuditTabList
          activeTab={formTab}
          onChange={setFormTab}
          tabs={[
            { value: 'details', label: 'Details' },
            { value: 'capacity', label: 'Capacity' },
            { value: 'cost', label: 'Cost' },
            ...(formData.resource_type === 'human' ? [{ value: 'link', label: 'Link' }] : []),
            { value: 'audit', label: 'Audit details' },
          ]}
        />
      </div>

        {formTab === 'audit' ? (
          <div className="p-6">
            {!resource ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this resource is saved.</p>
            ) : (
              <AuditDetailsPanel description="Who created or changed this resource, and how it is classified.">
                <AuditCard title="Identity" description="How this resource is labelled and tracked.">
                  <AuditField label="Code" value={resource.resource_code} />
                  <AuditField label="Name" value={resource.resource_name} />
                </AuditCard>
                <AuditCard title="Classification" description="How this resource is categorised.">
                  <AuditField label="Type" value={humanizeAuditToken(resource.resource_type)} />
                  <AuditField label="Category" value={resource.resource_category} />
                </AuditCard>
                <AuditCard title="Record history" description="When this resource was created and last changed.">
                  <AuditField label="Created by" value={resource.created_by ? auditUserLabels[resource.created_by] || null : null} />
                  <AuditTimestampPair dateLabel="Created at" value={resource.created_at} />
                  <AuditField label="Updated by" value={resource.updated_by ? auditUserLabels[resource.updated_by] || null : null} />
                  <AuditTimestampPair dateLabel="Last updated" value={resource.updated_at} />
                </AuditCard>
              </AuditDetailsPanel>
            )}
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {formTab === 'details' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Resource Name *
                  </label>
                  <input
                    type="text"
                    name="resource_name"
                    value={formData.resource_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Resource Code
                  </label>
                  <input
                    type="text"
                    name="resource_code"
                    value={formData.resource_code}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g., RES-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Resource Type *
                  </label>
                  <select
                    name="resource_type"
                    value={formData.resource_type}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="human">Human</option>
                    <option value="equipment">Equipment</option>
                    <option value="facility">Facility</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Resource Category
                  </label>
                  <SelectField
                    options={categories.map((c) => ({ value: c.category_name, label: c.category_name }))}
                    value={formData.resource_category}
                    onChange={(value) => setFormData((prev) => ({ ...prev, resource_category: value }))}
                    placeholder="Select a category..."
                    searchPlaceholder="Search categories..."
                    forceSearchable
                    allowCustom
                    customValueActions={[{
                      key: 'create',
                      label: (term) => `+ Add "${term}" as a new category`,
                      onSelect: handleCreateCategory,
                    }]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  name="resource_description"
                  value={formData.resource_description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_available"
                    checked={formData.is_available}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Available
                  </label>
                </div>
              </div>
            </>
          )}

          {formTab === 'capacity' && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Capacity Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hours per Day
                  </label>
                  <input
                    type="number"
                    name="default_capacity_hours_per_day"
                    value={formData.default_capacity_hours_per_day}
                    onChange={handleChange}
                    min="0"
                    max="24"
                    step="0.5"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Days per Week
                  </label>
                  <input
                    type="number"
                    name="default_capacity_days_per_week"
                    value={formData.default_capacity_days_per_week}
                    onChange={handleChange}
                    min="0"
                    max="7"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Capacity Percentage (%)
                  </label>
                  <input
                    type="number"
                    name="default_capacity_percentage"
                    value={formData.default_capacity_percentage}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>
          )}

          {formTab === 'cost' && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cost Information (Optional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hourly Rate
                  </label>
                  <input
                    type="number"
                    name="hourly_rate"
                    value={formData.hourly_rate}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Daily Rate
                  </label>
                  <input
                    type="number"
                    name="daily_rate"
                    value={formData.daily_rate}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Currency
                  </label>
                  <SelectField
                    options={currencies.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))}
                    value={formData.currency_code}
                    onChange={(value) => setFormData((prev) => ({ ...prev, currency_code: value }))}
                    placeholder="Select a currency..."
                    searchPlaceholder="Search currencies..."
                    forceSearchable
                  />
                </div>
              </div>
            </div>
          )}

          {formTab === 'link' && formData.resource_type === 'human' && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Link to User/Team
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Link to User
                  </label>
                  <select
                    name="user_id"
                    value={formData.user_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">No User Link</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Link to Team
                  </label>
                  <select
                    name="team_id"
                    value={formData.team_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">No Team Link</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.team_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Resource'}
            </button>
          </div>
        </form>
        )}
    </div>
  )
}
