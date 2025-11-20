import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { ShieldCheck, Save, X } from 'lucide-react'

export default function MFAPolicyManager() {
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingPolicy, setEditingPolicy] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    policy_name: '',
    enforce_for_roles: [],
    enforce_for_users: [],
    required_methods: [],
    grace_period_days: 30,
    is_active: true
  })
  const [availableRoles, setAvailableRoles] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])

  useEffect(() => {
    fetchPolicies()
    fetchRoles()
    fetchUsers()
  }, [])

  const fetchPolicies = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('mfa_policies')
        .select('*, roles:enforce_for_roles (id, role_name, role_code), users:enforce_for_users (id, email, full_name)')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPolicies(data || [])
    } catch (error) {
      console.error('Error fetching MFA policies:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const { data } = await supabase
        .from('roles')
        .select('id, role_name, role_code')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('role_name')

      setAvailableRoles(data || [])
    } catch (error) {
      console.error('Error fetching roles:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('full_name')

      setAvailableUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const policyData = {
        ...formData,
        updated_by: user.id
      }

      let result
      if (editingPolicy) {
        const { error } = await supabase
          .from('mfa_policies')
          .update(policyData)
          .eq('id', editingPolicy.id)

        if (error) throw error
      } else {
        policyData.created_by = user.id
        const { error } = await supabase
          .from('mfa_policies')
          .insert([policyData])

        if (error) throw error
      }

      await fetchPolicies()
      setShowForm(false)
      setEditingPolicy(null)
      setFormData({
        policy_name: '',
        enforce_for_roles: [],
        enforce_for_users: [],
        required_methods: [],
        grace_period_days: 30,
        is_active: true
      })
    } catch (error) {
      console.error('Error saving policy:', error)
      alert('Failed to save policy')
    }
  }

  const handleEdit = (policy) => {
    setEditingPolicy(policy)
    setFormData({
      policy_name: policy.policy_name,
      enforce_for_roles: policy.enforce_for_roles || [],
      enforce_for_users: policy.enforce_for_users || [],
      required_methods: policy.required_methods || [],
      grace_period_days: policy.grace_period_days || 30,
      is_active: policy.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (policyId) => {
    if (!confirm('Are you sure you want to delete this policy?')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('mfa_policies')
        .update({ is_deleted: true, deleted_by: user.id, deleted_at: new Date().toISOString() })
        .eq('id', policyId)

      if (error) throw error
      await fetchPolicies()
    } catch (error) {
      console.error('Error deleting policy:', error)
      alert('Failed to delete policy')
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          MFA Policies
        </h2>
        <button
          onClick={() => {
            setEditingPolicy(null)
            setFormData({
              policy_name: '',
              enforce_for_roles: [],
              enforce_for_users: [],
              required_methods: [],
              grace_period_days: 30,
              is_active: true
            })
            setShowForm(true)
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <ShieldCheck className="h-4 w-4" />
          New Policy
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingPolicy ? 'Edit Policy' : 'New Policy'}
            </h3>
            <button
              onClick={() => {
                setShowForm(false)
                setEditingPolicy(null)
              }}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Policy Name
              </label>
              <input
                type="text"
                value={formData.policy_name}
                onChange={(e) => setFormData({ ...formData, policy_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Admin MFA Enforcement"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enforce for Roles
              </label>
              <select
                multiple
                value={formData.enforce_for_roles}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  setFormData({ ...formData, enforce_for_roles: selected })
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                size="5"
              >
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.role_name} ({role.role_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Required Methods
              </label>
              <div className="space-y-2">
                {['totp', 'sms', 'email', 'webauthn'].map((method) => (
                  <label key={method} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.required_methods.includes(method)}
                      onChange={(e) => {
                        const methods = e.target.checked
                          ? [...formData.required_methods, method]
                          : formData.required_methods.filter(m => m !== method)
                        setFormData({ ...formData, required_methods: methods })
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {method.toUpperCase()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Grace Period (days)
              </label>
              <input
                type="number"
                value={formData.grace_period_days}
                onChange={(e) => setFormData({ ...formData, grace_period_days: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                min="0"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Active
              </label>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Policy
              </button>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingPolicy(null)
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {policies.length === 0 ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            No MFA policies configured
          </div>
        ) : (
          policies.map((policy) => (
            <div
              key={policy.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {policy.policy_name}
                  </h3>
                  {policy.is_active ? (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-xs font-medium rounded">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-medium rounded">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Required methods: {policy.required_methods?.join(', ') || 'None'} • Grace period: {policy.grace_period_days} days
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(policy)}
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(policy.id)}
                  className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

