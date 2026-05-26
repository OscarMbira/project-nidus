import { useState, useEffect } from 'react'
import { ArrowRight, Plus, X, Link as LinkIcon } from 'lucide-react'
import { linkFollowOnAction, unlinkFollowOnAction, getOpenItemsForFollowOn } from '../../../services/eprFollowOnService'
import { fetchFollowOnActions } from '../../../services/closingProjectService'

export default function EPRFollowOnActions({ reportId, followOnActions, onFollowOnActionsChange, projectId, mode }) {
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [openItems, setOpenItems] = useState(null)
  const [availableActions, setAvailableActions] = useState([])
  const [newLink, setNewLink] = useState({
    follow_on_action_id: '',
    source_type: 'recommendation',
    source_reference: '',
    documentation_attached: false,
    documentation_urls: [],
    project_board_advice_requested: false,
    recommended_recipient: ''
  })

  useEffect(() => {
    if (projectId) {
      loadOpenItems()
      loadAvailableActions()
    }
  }, [projectId])

  const loadOpenItems = async () => {
    try {
      const items = await getOpenItemsForFollowOn(projectId)
      setOpenItems(items)
    } catch (error) {
      console.error('Error loading open items:', error)
    }
  }

  const loadAvailableActions = async () => {
    try {
      const actions = await fetchFollowOnActions(projectId)
      // Filter out already linked actions
      const linkedIds = new Set(followOnActions.map(foa => foa.follow_on_action_id))
      setAvailableActions(actions.filter(a => !linkedIds.has(a.id)))
    } catch (error) {
      console.error('Error loading available actions:', error)
    }
  }

  const handleLink = async () => {
    if (!newLink.follow_on_action_id) return

    try {
      const linked = await linkFollowOnAction(reportId, newLink)
      onFollowOnActionsChange([...followOnActions, linked])
      setNewLink({
        follow_on_action_id: '',
        source_type: 'recommendation',
        source_reference: '',
        documentation_attached: false,
        documentation_urls: [],
        project_board_advice_requested: false,
        recommended_recipient: ''
      })
      setShowLinkForm(false)
      await loadAvailableActions()
    } catch (error) {
      console.error('Error linking follow-on action:', error)
      alert('Error linking follow-on action: ' + error.message)
    }
  }

  const handleUnlink = async (linkId) => {
    if (!confirm('Unlink this follow-on action?')) return

    try {
      await unlinkFollowOnAction(linkId)
      onFollowOnActionsChange(followOnActions.filter(foa => foa.id !== linkId))
      await loadAvailableActions()
    } catch (error) {
      console.error('Error unlinking follow-on action:', error)
      alert('Error unlinking follow-on action: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Follow-On Actions</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Link follow-on actions from open issues, risks, or recommendations. All open issues and risks should be addressed.
        </p>
      </div>

      {openItems && openItems.total_open > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">Open Items Requiring Follow-On Actions</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-yellow-800 dark:text-yellow-200">Open Issues:</span>
              <p className="font-medium text-yellow-900 dark:text-yellow-100">{openItems.open_issues?.length || 0}</p>
            </div>
            <div>
              <span className="text-yellow-800 dark:text-yellow-200">Open Risks:</span>
              <p className="font-medium text-yellow-900 dark:text-yellow-100">{openItems.open_risks?.length || 0}</p>
            </div>
          </div>
        </div>
      )}

      {followOnActions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <ArrowRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No follow-on actions linked yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {followOnActions.map((link, index) => (
            <div
              key={link.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon className="h-5 w-5 text-gray-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {link.follow_on_action?.action_title || 'Follow-On Action'}
                    </h4>
                    {link.source_type && (
                      <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {link.source_type.replace('_', ' ')}
                      </span>
                    )}
                    {link.documentation_attached && (
                      <span className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                        Documented
                      </span>
                    )}
                    {link.project_board_advice_requested && (
                      <span className="px-2 py-1 text-xs rounded bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                        Board Advice Requested
                      </span>
                    )}
                  </div>
                  {link.follow_on_action?.action_description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {link.follow_on_action.action_description}
                    </p>
                  )}
                  {link.recommended_recipient && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Recommended Recipient:</strong> {link.recommended_recipient}
                    </p>
                  )}
                </div>
                {mode !== 'view' && (
                  <button
                    onClick={() => handleUnlink(link.id)}
                    className="ml-4 p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {mode !== 'view' && (
        <>
          {showLinkForm ? (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Follow-On Action *
                  </label>
                  <select
                    value={newLink.follow_on_action_id}
                    onChange={(e) => setNewLink({ ...newLink, follow_on_action_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select follow-on action...</option>
                    {availableActions.map(action => (
                      <option key={action.id} value={action.id}>
                        {action.action_title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Source Type
                  </label>
                  <select
                    value={newLink.source_type}
                    onChange={(e) => setNewLink({ ...newLink, source_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="open_issue">Open Issue</option>
                    <option value="open_risk">Open Risk</option>
                    <option value="unfinished_work">Unfinished Work</option>
                    <option value="recommendation">Recommendation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newLink.documentation_attached}
                    onChange={(e) => setNewLink({ ...newLink, documentation_attached: e.target.checked })}
                    className="rounded"
                  />
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Documentation attached
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newLink.project_board_advice_requested}
                    onChange={(e) => setNewLink({ ...newLink, project_board_advice_requested: e.target.checked })}
                    className="rounded"
                  />
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Project Board advice requested
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleLink}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Link Action
                  </button>
                  <button
                    onClick={() => setShowLinkForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setShowLinkForm(true)
                loadAvailableActions()
              }}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Link Follow-On Action
            </button>
          )}
        </>
      )}
    </div>
  )
}
