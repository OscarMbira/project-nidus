import { useState, useEffect } from 'react'
import { Link2, Plus, X, ExternalLink } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { getIssues } from '../../services/issueService'

export default function IssueLinksPanel({ issue, projectId }) {
  const [links, setLinks] = useState([])
  const [availableIssues, setAvailableIssues] = useState([])
  const [showAddLink, setShowAddLink] = useState(false)
  const [selectedIssueId, setSelectedIssueId] = useState('')
  const [linkType, setLinkType] = useState('related')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLinks()
    fetchAvailableIssues()
  }, [issue, projectId])

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('issue_links')
        .select(`
          *,
          linked_issue:issues!issue_links_linked_issue_id_fkey(
            id,
            issue_identifier,
            issue_title,
            issue_type,
            status
          )
        `)
        .eq('issue_id', issue.id)
        .eq('is_deleted', false)

      if (error) throw error
      setLinks(data || [])
    } catch (error) {
      console.error('Error fetching links:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableIssues = async () => {
    try {
      const issuesData = await getIssues(projectId)
      // Filter out current issue and already linked issues
      const linkedIds = links.map(l => l.linked_issue_id)
      setAvailableIssues((issuesData || []).filter(i => i.id !== issue.id && !linkedIds.includes(i.id)))
    } catch (error) {
      console.error('Error fetching available issues:', error)
    }
  }

  const handleAddLink = async () => {
    if (!selectedIssueId) return

    try {
      const { error } = await supabase
        .from('issue_links')
        .insert({
          issue_id: issue.id,
          linked_issue_id: selectedIssueId,
          link_type: linkType,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })

      if (error) throw error
      setShowAddLink(false)
      setSelectedIssueId('')
      fetchLinks()
    } catch (error) {
      console.error('Error adding link:', error)
      alert('Error adding link: ' + error.message)
    }
  }

  const handleRemoveLink = async (linkId) => {
    if (!confirm('Remove this link?')) return

    try {
      const { error } = await supabase
        .from('issue_links')
        .update({ is_deleted: true })
        .eq('id', linkId)

      if (error) throw error
      fetchLinks()
    } catch (error) {
      console.error('Error removing link:', error)
      alert('Error removing link: ' + error.message)
    }
  }

  const getLinkTypeLabel = (type) => {
    switch (type) {
      case 'blocks':
        return 'Blocks'
      case 'blocked_by':
        return 'Blocked By'
      case 'duplicate':
        return 'Duplicate'
      case 'related':
      default:
        return 'Related'
    }
  }

  const getLinkTypeColor = (type) => {
    switch (type) {
      case 'blocks':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'blocked_by':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'duplicate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'related':
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Related Issues ({links.length})
        </h3>
        <button
          onClick={() => setShowAddLink(!showAddLink)}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Link
        </button>
      </div>

      {showAddLink && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Link Type
              </label>
              <select
                value={linkType}
                onChange={(e) => setLinkType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="related">Related</option>
                <option value="blocks">Blocks</option>
                <option value="blocked_by">Blocked By</option>
                <option value="duplicate">Duplicate</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Issue
              </label>
              <select
                value={selectedIssueId}
                onChange={(e) => setSelectedIssueId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select an issue...</option>
                {availableIssues.map((iss) => (
                  <option key={iss.id} value={iss.id}>
                    {iss.issue_identifier || `Issue #${iss.issue_number}`} - {iss.issue_title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddLink(false)
                  setSelectedIssueId('')
                }}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLink}
                disabled={!selectedIssueId}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}

      {links.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Link2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No related issues</p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getLinkTypeColor(link.link_type)}`}>
                    {getLinkTypeLabel(link.link_type)}
                  </span>
                  {link.linked_issue && (
                    <>
                      <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                        {link.linked_issue.issue_identifier || `Issue #${link.linked_issue.issue_number}`}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">•</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {link.linked_issue.issue_type?.replace('_', ' ')}
                      </span>
                    </>
                  )}
                </div>
                {link.linked_issue && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {link.linked_issue.issue_title}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {link.linked_issue && (
                  <a
                    href={`/app/projects/${projectId}/issues/${link.linked_issue.id}`}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    title="View Issue"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <button
                  onClick={() => handleRemoveLink(link.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  title="Remove Link"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
