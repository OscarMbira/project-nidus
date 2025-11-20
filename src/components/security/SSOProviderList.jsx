import { useState } from 'react'
import { ShieldCheck, Edit, Trash2, Power, PowerOff } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'

export default function SSOProviderList({ providers, onEdit, onDelete, onRefresh }) {
  const [toggling, setToggling] = useState(null)

  const handleToggleActive = async (provider) => {
    try {
      setToggling(provider.id)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('sso_providers')
        .update({
          is_active: !provider.is_active,
          updated_by: user.id
        })
        .eq('id', provider.id)

      if (error) throw error
      onRefresh && onRefresh()
    } catch (error) {
      console.error('Error toggling provider:', error)
      alert('Failed to update provider')
    } finally {
      setToggling(null)
    }
  }

  if (providers.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8">
          <ShieldCheck className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No SSO providers configured
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        SSO Providers
      </h2>

      <div className="space-y-4">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg ${
                provider.is_active
                  ? 'bg-green-100 dark:bg-green-900/20'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <ShieldCheck className={`h-5 w-5 ${
                  provider.is_active
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {provider.provider_name}
                  </h3>
                  {provider.is_active ? (
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
                  {provider.provider_type.toUpperCase()} • {provider.auto_provision_users ? 'Auto-provision enabled' : 'Manual provisioning'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleActive(provider)}
                disabled={toggling === provider.id}
                className={`p-2 rounded transition-colors ${
                  provider.is_active
                    ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                    : 'text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                title={provider.is_active ? 'Disable' : 'Enable'}
              >
                {provider.is_active ? (
                  <Power className="h-5 w-5" />
                ) : (
                  <PowerOff className="h-5 w-5" />
                )}
              </button>
              {onEdit && (
                <button
                  onClick={() => onEdit(provider)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  title="Edit"
                >
                  <Edit className="h-5 w-5" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this SSO provider?')) {
                      onDelete(provider.id)
                    }
                  }}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

