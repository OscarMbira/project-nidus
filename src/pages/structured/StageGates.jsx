import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { supabase } from '../../services/supabaseClient'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Plus, 
  Send, 
  AlertCircle,
  ChevronRight,
  User,
  Calendar,
  CheckSquare
} from 'lucide-react'

export default function StageGates() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [stageBoundaries, setStageBoundaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedGate, setSelectedGate] = useState(null)
  const [newGate, setNewGate] = useState({
    stage_number: 1,
    stage_name: '',
    stage_description: '',
    gate_name: '',
    gate_type: 'stage_boundary',
    planned_date: ''
  })

  useEffect(() => {
    fetchData()
  }, [projectId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, project_name, project_code')
        .eq('id', projectId)
        .eq('is_deleted', false)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      // Fetch stage boundaries
      const { data: boundariesData, error: boundariesError } = await supabase
        .from('stage_boundaries')
        .select(`
          *,
          stage_approvals (*),
          stage_approval_checklists (*)
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('stage_number', { ascending: true })

      if (boundariesError && boundariesError.code !== '42P01') throw boundariesError
      setStageBoundaries(boundariesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGate = async (e) => {
    e.preventDefault()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('stage_boundaries')
        .insert({
          project_id: projectId,
          stage_number: newGate.stage_number,
          stage_name: newGate.stage_name,
          stage_description: newGate.stage_description,
          gate_name: newGate.gate_name,
          gate_type: newGate.gate_type,
          planned_date: newGate.planned_date || null,
          status: 'not_started',
          created_by: user.id
        })
        .select()
        .single()

      if (error) throw error

      // Create default approvals
      await createDefaultApprovals(data.id)

      setShowCreateForm(false)
      setNewGate({
        stage_number: stageBoundaries.length + 1,
        stage_name: '',
        stage_description: '',
        gate_name: '',
        gate_type: 'stage_boundary',
        planned_date: ''
      })
      fetchData()
    } catch (error) {
      console.error('Error creating stage gate:', error)
      alert('Error creating stage gate: ' + error.message)
    }
  }

  const createDefaultApprovals = async (stageBoundaryId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const approvals = [
        {
          stage_boundary_id: stageBoundaryId,
          project_id: projectId,
          approval_type: 'project_board',
          approval_role: 'Project Board',
          status: 'pending',
          priority: 'high',
          created_by: user.id
        }
      ]

      const { error } = await supabase
        .from('stage_approvals')
        .insert(approvals)

      if (error) throw error
    } catch (error) {
      console.error('Error creating default approvals:', error)
    }
  }

  const handleSubmitForApproval = async (gateId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('stage_boundaries')
        .update({
          status: 'submitted',
          submitted_date: new Date().toISOString().split('T')[0],
          updated_by: user.id
        })
        .eq('id', gateId)

      if (error) throw error

      // Update approvals to pending
      await supabase
        .from('stage_approvals')
        .update({ status: 'pending' })
        .eq('stage_boundary_id', gateId)
        .eq('status', 'not_required')

      fetchData()
    } catch (error) {
      console.error('Error submitting for approval:', error)
      alert('Error submitting for approval: ' + error.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'submitted':
      case 'under_review':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'deferred':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'in_preparation':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />
      case 'rejected':
        return <XCircle className="h-4 w-4" />
      case 'submitted':
      case 'under_review':
        return <Clock className="h-4 w-4" />
      case 'deferred':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading stage gates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/projects/' + projectId)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          ← Back to Project
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Stage Gates
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {project?.project_name} - Manage stage boundaries and approvals
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Create Stage Gate
          </button>
        </div>
      </div>

      {/* Stage Gates List */}
      <div className="space-y-4">
        {stageBoundaries.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No stage gates have been created yet
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Create First Stage Gate
            </button>
          </div>
        ) : (
          stageBoundaries.map((gate) => (
            <div
              key={gate.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                      Stage {gate.stage_number}
                    </span>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {gate.gate_name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(gate.status)}`}>
                      {getStatusIcon(gate.status)}
                      {gate.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    {gate.stage_name}
                  </p>
                  {gate.stage_description && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                      {gate.stage_description}
                    </p>
                  )}

                  {/* Approval Status */}
                  {gate.stage_approvals && gate.stage_approvals.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Approval Status:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {gate.stage_approvals.map((approval) => (
                          <span
                            key={approval.id}
                            className={`px-2 py-1 rounded text-xs ${
                              approval.status === 'approved'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : approval.status === 'rejected'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}
                          >
                            {approval.approval_role || approval.approval_type}: {approval.status}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                    {gate.planned_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Planned: {new Date(gate.planned_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {gate.submitted_date && (
                      <div className="flex items-center gap-1">
                        <Send className="h-4 w-4" />
                        <span>Submitted: {new Date(gate.submitted_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {gate.approved_date && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        <span>Approved: {new Date(gate.approved_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  {gate.status === 'not_started' || gate.status === 'in_preparation' ? (
                    <button
                      onClick={() => handleSubmitForApproval(gate.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Submit for Approval
                    </button>
                  ) : null}
                  <button
                    onClick={() => setSelectedGate(gate)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    View Details
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Gate Modal */}
      {showCreateForm && (
        <CreateGateModal
          projectId={projectId}
          newGate={newGate}
          setNewGate={setNewGate}
          onSubmit={handleCreateGate}
          onClose={() => setShowCreateForm(false)}
          nextStageNumber={stageBoundaries.length + 1}
        />
      )}

      {/* Gate Details Modal */}
      {selectedGate && (
        <GateDetailsModal
          gate={selectedGate}
          projectId={projectId}
          onClose={() => setSelectedGate(null)}
          onUpdate={fetchData}
        />
      )}
    </div>
  )
}

// Create Gate Modal Component
function CreateGateModal({ projectId, newGate, setNewGate, onSubmit, onClose, nextStageNumber }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Create Stage Gate
          </h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stage Number
              </label>
              <input
                type="number"
                value={newGate.stage_number || nextStageNumber}
                onChange={(e) => setNewGate({ ...newGate, stage_number: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gate Name *
              </label>
              <input
                type="text"
                value={newGate.gate_name}
                onChange={(e) => setNewGate({ ...newGate, gate_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., Initiation Gate, Stage 1 Gate"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stage Name *
              </label>
              <input
                type="text"
                value={newGate.stage_name}
                onChange={(e) => setNewGate({ ...newGate, stage_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., Initiation Stage, Development Stage"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stage Description
              </label>
              <textarea
                value={newGate.stage_description}
                onChange={(e) => setNewGate({ ...newGate, stage_description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows="3"
                placeholder="Describe the stage and its objectives"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gate Type
              </label>
              <select
                value={newGate.gate_type}
                onChange={(e) => setNewGate({ ...newGate, gate_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="stage_boundary">Stage Boundary</option>
                <option value="initiation">Initiation Gate</option>
                <option value="closure">Closure Gate</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Planned Date
              </label>
              <input
                type="date"
                value={newGate.planned_date}
                onChange={(e) => setNewGate({ ...newGate, planned_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Create Gate
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Gate Details Modal Component
function GateDetailsModal({ gate, projectId, onClose, onUpdate }) {
  const [approvals, setApprovals] = useState(gate.stage_approvals || [])
  const [checklists, setChecklists] = useState(gate.stage_approval_checklists || [])
  const [activeTab, setActiveTab] = useState('overview')
  const [decisionNotes, setDecisionNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  const handleApprove = async (approvalId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('stage_approvals')
        .update({
          status: 'approved',
          decision_date: new Date().toISOString(),
          decision_notes: decisionNotes,
          updated_by: user.id
        })
        .eq('id', approvalId)

      if (error) throw error

      // Check if all required approvals are approved
      await checkAllApprovalsComplete(gate.id)

      onUpdate()
      onClose()
    } catch (error) {
      console.error('Error approving:', error)
      alert('Error approving: ' + error.message)
    }
  }

  const handleReject = async (approvalId) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('stage_approvals')
        .update({
          status: 'rejected',
          decision_date: new Date().toISOString(),
          rejection_reason: rejectionReason,
          updated_by: user.id
        })
        .eq('id', approvalId)

      if (error) throw error

      // Update gate status to rejected
      await supabase
        .from('stage_boundaries')
        .update({
          status: 'rejected',
          rejected_date: new Date().toISOString().split('T')[0],
          rejection_reason: rejectionReason
        })
        .eq('id', gate.id)

      onUpdate()
      onClose()
    } catch (error) {
      console.error('Error rejecting:', error)
      alert('Error rejecting: ' + error.message)
    }
  }

  const checkAllApprovalsComplete = async (gateId) => {
    try {
      const { data: approvalsData, error } = await supabase
        .from('stage_approvals')
        .select('*')
        .eq('stage_boundary_id', gateId)
        .eq('is_deleted', false)

      if (error) throw error

      const requiredApprovals = approvalsData.filter(a => a.status !== 'not_required')
      const allApproved = requiredApprovals.every(a => a.status === 'approved')

      if (allApproved && requiredApprovals.length > 0) {
        const { data: { user } } = await supabase.auth.getUser()
        await supabase
          .from('stage_boundaries')
          .update({
            status: 'approved',
            approved_date: new Date().toISOString().split('T')[0],
            updated_by: user.id
          })
          .eq('id', gateId)
      }
    } catch (error) {
      console.error('Error checking approvals:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {gate.gate_name}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex gap-4">
              {['overview', 'approvals', 'checklist'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Stage Information
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  <strong>Stage:</strong> {gate.stage_name}
                </p>
                {gate.stage_description && (
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    {gate.stage_description}
                  </p>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Status
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Current Status: <strong>{gate.status}</strong>
                </p>
              </div>
            </div>
          )}

          {activeTab === 'approvals' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Approval Requests
              </h3>
              {approvals.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No approvals required</p>
              ) : (
                approvals.map((approval) => (
                  <div
                    key={approval.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {approval.approval_role || approval.approval_type}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Status: {approval.status}
                        </p>
                      </div>
                      {approval.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(approval.id)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(approval.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                    {approval.decision_notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {approval.decision_notes}
                      </p>
                    )}
                    {approval.status === 'pending' && (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={decisionNotes}
                          onChange={(e) => setDecisionNotes(e.target.value)}
                          placeholder="Decision notes (optional)"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          rows="2"
                        />
                        <input
                          type="text"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Rejection reason (if rejecting)"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Gate Checklist
              </h3>
              {checklists.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No checklist items defined</p>
              ) : (
                checklists.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <CheckSquare
                      className={`h-5 w-5 mt-0.5 ${
                        item.is_completed
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-400'
                      }`}
                    />
                    <div className="flex-1">
                      <p className={`font-medium ${
                        item.is_completed
                          ? 'text-gray-500 dark:text-gray-500 line-through'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {item.item_name}
                      </p>
                      {item.item_description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {item.item_description}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

