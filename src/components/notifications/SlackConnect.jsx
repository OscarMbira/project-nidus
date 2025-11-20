import { useState, useEffect } from 'react'
import { getSlackConnections, connectSlack, disconnectSlack } from '../../services/notificationIntegrationService'
import { supabase } from '../../services/supabaseClient'
import { CheckCircle, XCircle, Plug, MessageSquare, Trash2, Plus } from 'lucide-react'

export default function SlackConnect({ onConnected }) {
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    fetchConnections()
  }, [])

  const fetchConnections = async () => {
    try {
      setLoading(true)
      const result = await getSlackConnections()
      
      if (result.success) {
        setConnections(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching connections:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = () => {
    try {
      setConnecting(true)
      
      // Get Slack OAuth URL from environment or configuration
      const clientId = import.meta.env.VITE_SLACK_CLIENT_ID
      const redirectUri = `${window.location.origin}/integrations/slack/callback`
      const scopes = ['chat:write', 'channels:read', 'channels:history']
      
      const authUrl = `https://slack.com/oauth/v2/authorize?` +
        `client_id=${clientId}&` +
        `scope=${scopes.join(',')}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${Date.now()}`

      // Store callback info
      sessionStorage.setItem('slack_oauth_redirect', window.location.pathname)
      
      // Redirect to Slack OAuth
      window.location.href = authUrl
    } catch (error) {
      console.error('Error initiating Slack OAuth:', error)
      alert('Failed to connect to Slack')
      setConnecting(false)
    }
  }

  const handleDisconnect = async (connectionId) => {
    if (!confirm('Are you sure you want to disconnect this Slack workspace?')) return

    try {
      const result = await disconnectSlack(connectionId)
      
      if (result.success) {
        await fetchConnections()
        alert('Slack workspace disconnected successfully')
      } else {
        alert(result.message || 'Failed to disconnect')
      }
    } catch (error) {
      console.error('Error disconnecting:', error)
      alert('Failed to disconnect Slack workspace')
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
          <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
            <MessageSquare className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Slack Integration
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Connect Slack workspaces to receive notifications
            </p>
          </div>
        </div>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {connecting ? 'Connecting...' : 'Connect Slack'}
        </button>
      </div>

      {connections.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <p>No Slack workspaces connected</p>
          <p className="text-sm mt-2">Click "Connect Slack" to add a workspace</p>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  connection.is_active
                    ? 'bg-green-100 dark:bg-green-900/20'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <MessageSquare className={`h-5 w-5 ${
                    connection.is_active
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {connection.workspace_name}
                    </h3>
                    {connection.is_active ? (
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
                    Workspace ID: {connection.workspace_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDisconnect(connection.id)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="Disconnect"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

