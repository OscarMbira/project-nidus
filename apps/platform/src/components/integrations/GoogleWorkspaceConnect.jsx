import { useState, useEffect } from 'react'
import { initiateGoogleWorkspaceOAuth, completeGoogleWorkspaceOAuth, getGoogleConnection, refreshGoogleToken } from '../../services/googleWorkspaceService'
import { supabase } from '../../services/supabaseClient'
import { CheckCircle, XCircle, RefreshCw, Plug, Save } from 'lucide-react'

export default function GoogleWorkspaceConnect({ onConnected }) {
  const [connection, setConnection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [services, setServices] = useState({
    gmail: false,
    calendar: false,
    drive: false
  })

  useEffect(() => {
    fetchConnection()
  }, [])

  const fetchConnection = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const result = await getGoogleConnection()
      if (result.success && result.data) {
        setConnection(result.data)
        if (result.data.connected_services) {
          setServices({
            gmail: result.data.connected_services.includes('gmail'),
            calendar: result.data.connected_services.includes('calendar'),
            drive: result.data.connected_services.includes('drive')
          })
        }
      }
    } catch (error) {
      console.error('Error fetching connection:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      setConnecting(true)
      const redirectUri = `${window.location.origin}/integrations/google/callback`
      const result = await initiateGoogleWorkspaceOAuth(redirectUri)

      if (result.success && result.authUrl) {
        // Store callback info in session storage
        sessionStorage.setItem('google_oauth_redirect', window.location.pathname)
        // Redirect to Google OAuth
        window.location.href = result.authUrl
      } else {
        alert(result.message || 'Failed to initiate OAuth flow')
      }
    } catch (error) {
      console.error('Error initiating OAuth:', error)
      alert('Failed to connect to Google Workspace')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Workspace?')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('google_connections')
        .update({
          is_active: false,
          updated_by: user.id
        })
        .eq('user_id', user.id)

      if (error) throw error
      setConnection(null)
      alert('Google Workspace disconnected successfully')
    } catch (error) {
      console.error('Error disconnecting:', error)
      alert('Failed to disconnect Google Workspace')
    }
  }

  const handleRefreshToken = async () => {
    try {
      setConnecting(true)
      const result = await refreshGoogleToken()
      
      if (result.success) {
        await fetchConnection()
        alert('Token refreshed successfully')
      } else {
        alert(result.message || 'Failed to refresh token')
      }
    } catch (error) {
      console.error('Error refreshing token:', error)
      alert('Failed to refresh token')
    } finally {
      setConnecting(false)
    }
  }

  const handleUpdateServices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const connectedServices = Object.keys(services).filter(key => services[key])
      
      const { error } = await supabase
        .from('google_connections')
        .update({
          connected_services: connectedServices,
          updated_by: user.id
        })
        .eq('user_id', user.id)

      if (error) throw error
      await fetchConnection()
      alert('Services updated successfully')
    } catch (error) {
      console.error('Error updating services:', error)
      alert('Failed to update services')
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
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <Plug className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Google Workspace Integration
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Connect with Gmail, Google Calendar, and Google Drive
            </p>
          </div>
        </div>
      </div>

      {!connection ? (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Connect your Google Workspace account to sync calendars and send emails
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            <Plug className="h-5 w-5" />
            {connecting ? 'Connecting...' : 'Connect Google Workspace'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Connected to Google Workspace
                  </p>
                  {connection.email && (
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      {connection.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRefreshToken}
                  disabled={connecting}
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <RefreshCw className={`h-4 w-4 ${connecting ? 'animate-spin' : ''}`} />
                  Refresh Token
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Connected Services
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Gmail
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Send emails via Gmail
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={services.gmail}
                  onChange={(e) => setServices({ ...services, gmail: e.target.checked })}
                  className="ml-3"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Google Calendar
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Sync tasks and milestones to Google Calendar
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={services.calendar}
                  onChange={(e) => setServices({ ...services, calendar: e.target.checked })}
                  className="ml-3"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Google Drive
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Upload and sync files to Google Drive
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={services.drive}
                  onChange={(e) => setServices({ ...services, drive: e.target.checked })}
                  className="ml-3"
                />
              </label>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={handleUpdateServices}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Services
              </button>
            </div>
          </div>

          {connection.token_expires_at && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Token expires: {new Date(connection.token_expires_at).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

