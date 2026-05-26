/**
 * Account Settings Page
 * View and edit account information for Platform
 */

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getAccountById, updateAccount, getAccountProjects, getAccountSubscription, isAccountOwner } from '../../services/accountService'
import { Briefcase, Users, CreditCard, Settings, Edit2, Save, X, Loader } from 'lucide-react'
import { useToast } from '../../hooks/useToast'

export default function AccountSettings() {
  const { accountId } = useParams()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [account, setAccount] = useState(null)
  const [projects, setProjects] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({})

  useEffect(() => {
    loadAccountData()
  }, [accountId])

  const loadAccountData = async () => {
    try {
      setLoading(true)

      // Validate accountId before making API calls
      if (!accountId || accountId === 'undefined' || accountId === 'null') {
        showToast('error', 'Invalid account ID')
        setLoading(false)
        return
      }

      // Load account
      const accountResult = await getAccountById(accountId)
      if (accountResult.success) {
        setAccount(accountResult.data)
        setFormData({
          accountName: accountResult.data.account_name,
          accountDisplayName: accountResult.data.account_display_name,
          companyName: accountResult.data.company_name,
          billingEmail: accountResult.data.billing_email,
          primaryEmail: accountResult.data.primary_email,
          primaryPhone: accountResult.data.primary_phone,
          addressLine1: accountResult.data.address_line1,
          addressLine2: accountResult.data.address_line2,
          city: accountResult.data.city,
          stateProvince: accountResult.data.state_province,
          postalCode: accountResult.data.postal_code,
          countryCode: accountResult.data.country_code,
        })
      }

      // Load projects
      const projectsResult = await getAccountProjects(accountId)
      if (projectsResult.success) {
        setProjects(projectsResult.data || [])
      }

      // Load subscription
      const subResult = await getAccountSubscription(accountId)
      if (subResult.success) {
        setSubscription(subResult.data)
      }

      // Check ownership
      const ownerResult = await isAccountOwner(accountId)
      if (ownerResult.success) {
        setIsOwner(ownerResult.isOwner)
      }
    } catch (error) {
      console.error('Error loading account data:', error)
      showToast('error', 'Failed to load account information')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      // Validate accountId before saving
      if (!accountId || accountId === 'undefined' || accountId === 'null') {
        showToast('error', 'Invalid account ID')
        return
      }

      setSaving(true)
      const result = await updateAccount(accountId, formData)
      if (result.success) {
        setAccount(result.data)
        setEditing(false)
        showToast('success', 'Account updated successfully')
      } else {
        showToast('error', result.error || 'Failed to update account')
      }
    } catch (error) {
      console.error('Error updating account:', error)
      showToast('error', 'Failed to update account')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!account) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600 dark:text-gray-400">Account not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {account.account_code} • {account.account_type}
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => (editing ? handleSave() : setEditing(true))}
            disabled={saving}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {editing ? (
              saving ? (
                <>
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )
            ) : (
              <>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </>
            )}
          </button>
        )}
      </div>

      {/* Account Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Briefcase className="h-5 w-5 mr-2" />
          Account Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Account Name
            </label>
            {editing ? (
              <input
                type="text"
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            ) : (
              <p className="text-gray-900 dark:text-white">{account.account_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Company Name
            </label>
            {editing ? (
              <input
                type="text"
                value={formData.companyName || ''}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            ) : (
              <p className="text-gray-900 dark:text-white">{account.company_name || '—'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Billing Email
            </label>
            {editing ? (
              <input
                type="email"
                value={formData.billingEmail || ''}
                onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            ) : (
              <p className="text-gray-900 dark:text-white">{account.billing_email || '—'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Account Type
            </label>
            <p className="text-gray-900 dark:text-white capitalize">{account.account_type}</p>
          </div>
        </div>
      </div>

      {/* Subscription */}
      {subscription && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Subscription
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Plan:</span>
              <span className="text-gray-900 dark:text-white font-medium capitalize">
                {subscription.plan_type}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span
                className={`font-medium ${
                  subscription.is_active
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {subscription.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Base Seats per Project:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {subscription.base_users_per_project || 30}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Projects */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Projects ({projects.length})
        </h2>
        {projects.length > 0 ? (
          <div className="space-y-2">
            {projects.map((project, index) => (
              <div
                key={project.project_id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{project.project_name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {project.member_count} members • {project.project_status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">No projects yet</p>
        )}
      </div>
    </div>
  )
}

