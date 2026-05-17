/**
 * Risk Links Panel Component
 * Display and manage risk interdependencies
 */

import { useState, useEffect } from 'react'
import { Link2, Plus, Trash2, ArrowRight, AlertTriangle, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { platformRiskPath } from '../../utils/projectRouteParam'
import { platformDb } from '../../services/supabase/supabaseClient'
import { getLinksByRisk, createLink, deleteLink } from '../../services/riskLinkService'
import { getRisksByProject } from '../../services/riskService'

export default function RiskLinksPanel({ riskId, projectId }) {
  const [links, setLinks] = useState([])
  const [availableRisks, setAvailableRisks] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [linkData, setLinkData] = useState({
    target_risk_id: '',
    link_type: 'related_to',
    link_description: ''
  })

  const navigate = useNavigate()

  useEffect(() => {
    if (riskId) {
      loadLinks()
      loadAvailableRisks()
    }
  }, [riskId, projectId])

  const loadLinks = async () => {
    try {
      setLoading(true)
      const result = await getLinksByRisk(riskId)
      if (result.success) {
        setLinks(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching risk links:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableRisks = async () => {
    try {
      const targetProjectId = projectId
      if (!targetProjectId) return
      
      const result = await getRisksByProject(targetProjectId)
      if (result.success && result.data) {
        // Filter out current risk
        const available = (result.data || []).filter(r => r.id !== riskId)
        setAvailableRisks(available)
      }
    } catch (error) {
      console.error('Error fetching available risks:', error)
    }
  }

  const handleCreateLink = async () => {
    if (!linkData.target_risk_id) {
      alert('Please select a risk to link')
      return
    }

    try {
      const result = await createLink(riskId, linkData.target_risk_id, linkData.link_type, linkData.link_description)
      if (result.success) {
        setLinkData({ target_risk_id: '', link_type: 'related_to', link_description: '' })
        setShowAddForm(false)
        loadLinks()
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error creating link:', error)
      alert('Error creating link: ' + error.message)
    }
  }

  const handleDeleteLink = async (linkId) => {
    if (!confirm('Are you sure you want to remove this link?')) return

    try {
      const result = await deleteLink(linkId)
      if (result.success) {
        loadLinks()
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting link:', error)
      alert('Error deleting link: ' + error.message)
    }
  }

  const handleRiskClick = (targetRiskId) => {
    if (projectId) {
      const hit = availableRisks.find((r) => r.id === targetRiskId)
      const rSeg = (hit?.risk_code && String(hit.risk_code).trim()) || targetRiskId
      navigate(platformRiskPath(projectId, rSeg))
    }
  }

  const linkTypeLabels = {
    causes: 'Causes',
    caused_by: 'Caused By',
    related_to: 'Related To',
    duplicate_of: 'Duplicate Of',
    supersedes: 'Supersedes'
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Loading risk links...
      </div>
    )
  }

  const incomingLinks = links.filter(l => l.target_risk_id === riskId)
  const outgoingLinks = links.filter(l => l.source_risk_id === riskId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Related Risks
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Link this risk to other risks to show interdependencies
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Add Link
        </button>
      </div>

      {/* Add Link Form */}
      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Link To Risk
            </label>
            <select
              value={linkData.target_risk_id}
              onChange={(e) => setLinkData({ ...linkData, target_risk_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select a risk...</option>
              {availableRisks.map(risk => (
                <option key={risk.id} value={risk.id}>
                  {risk.risk_identifier || risk.id} - {risk.risk_title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Link Type
            </label>
            <select
              value={linkData.link_type}
              onChange={(e) => setLinkData({ ...linkData, link_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="related_to">Related To</option>
              <option value="causes">Causes</option>
              <option value="caused_by">Caused By</option>
              <option value="duplicate_of">Duplicate Of</option>
              <option value="supersedes">Supersedes</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={linkData.link_description}
              onChange={(e) => setLinkData({ ...linkData, link_description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
              placeholder="Describe the relationship..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreateLink}
              disabled={!linkData.target_risk_id}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Link
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setLinkData({ target_risk_id: '', link_type: 'related_to', link_description: '' })
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Links Display */}
      {incomingLinks.length === 0 && outgoingLinks.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <Link2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">No risk links yet</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Add first link
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Outgoing Links (This risk links to others) */}
          {outgoingLinks.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                This Risk Links To ({outgoingLinks.length})
              </h4>
              <div className="space-y-2">
                {outgoingLinks.map((link) => {
                  const linkedRisk = link.target_risk
                  return (
                    <div
                      key={link.id}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Link2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                          {linkTypeLabels[link.link_type] || link.link_type}
                        </span>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {linkedRisk?.risk_type === 'threat' ? (
                            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0" />
                          )}
                          <span className="font-mono text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                            {linkedRisk?.risk_identifier || 'Unknown'}
                          </span>
                          <span
                            onClick={() => handleRiskClick(link.target_risk_id)}
                            className="text-sm font-medium text-gray-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {linkedRisk?.risk_title || 'Unknown Risk'}
                          </span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      </div>
                      {link.link_description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-7">
                          {link.link_description}
                        </p>
                      )}
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove link"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Incoming Links (Other risks link to this one) */}
          {incomingLinks.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Linked From ({incomingLinks.length})
              </h4>
              <div className="space-y-2">
                {incomingLinks.map((link) => {
                  const linkedRisk = link.source_risk
                  return (
                    <div
                      key={link.id}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                    >
                      <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0 rotate-180" />
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                        {linkTypeLabels[link.link_type] || link.link_type}
                      </span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {linkedRisk?.risk_type === 'threat' ? (
                          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0" />
                        )}
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {linkedRisk?.risk_identifier || 'Unknown'}
                        </span>
                        <span
                          onClick={() => handleRiskClick(link.source_risk_id)}
                          className="text-sm font-medium text-gray-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {linkedRisk?.risk_title || 'Unknown Risk'}
                        </span>
                      </div>
                      {link.link_description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {link.link_description}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
