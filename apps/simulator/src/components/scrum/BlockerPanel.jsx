import { useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import { AlertTriangle, X, CheckCircle, User, Calendar } from 'lucide-react'
import { format } from 'date-fns'

export default function BlockerPanel({ blockers, onUpdate }) {
  const [resolvingId, setResolvingId] = useState(null)
  const [resolutionNotes, setResolutionNotes] = useState('')

  const handleResolveBlocker = async (blockerId) => {
    if (!resolutionNotes.trim()) {
      alert('Please provide resolution notes')
      return
    }

    try {
      setResolvingId(blockerId)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('standup_blockers')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_notes: resolutionNotes,
          updated_by: user.id,
        })
        .eq('id', blockerId)

      if (error) throw error

      setResolutionNotes('')
      setResolvingId(null)
      onUpdate()
    } catch (error) {
      console.error('Error resolving blocker:', error)
      alert('Error resolving blocker: ' + error.message)
      setResolvingId(null)
    }
  }

  if (!blockers || blockers.length === 0) {
    return null
  }

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-300">
          Active Blockers ({blockers.length})
        </h3>
      </div>

      <div className="space-y-3">
        {blockers.map((blocker) => (
          <div
            key={blocker.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white mb-2">
                  {blocker.blocker_description}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  {blocker.user && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{blocker.user.full_name || blocker.user.email}</span>
                    </div>
                  )}
                  {blocker.created_at && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(blocker.created_at), 'MMM dd, yyyy')}</span>
                    </div>
                  )}
                  {blocker.blocker_priority && (
                    <span className={`px-2 py-1 rounded text-xs ${
                      blocker.blocker_priority === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                      blocker.blocker_priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                    }`}>
                      {blocker.blocker_priority}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {resolvingId === blocker.id ? (
              <div className="mt-3 space-y-2">
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Enter resolution notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolveBlocker(blocker.id)}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center gap-1"
                  >
                    <CheckCircle className="h-3 w-3" />
                    Mark Resolved
                  </button>
                  <button
                    onClick={() => {
                      setResolvingId(null)
                      setResolutionNotes('')
                    }}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setResolvingId(blocker.id)}
                className="mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center gap-1"
              >
                <CheckCircle className="h-3 w-3" />
                Resolve Blocker
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

