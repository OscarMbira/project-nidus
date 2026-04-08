/**
 * Lessons Report Distribution Section
 * Approval workflow and distribution list
 */

import { useState, useEffect } from 'react'
import { Users, Plus, Trash2, Send, CheckCircle, Mail } from 'lucide-react'
import { getDistributionList, addDistributionRecipient, removeDistributionRecipient, sendReportToDistribution } from '../../services/lessonsReportDistributionService'
import { getApprovals, addApprover, approveReport, rejectReport, deferReport } from '../../services/lessonsReportApprovalService'
import { platformDb } from '../../services/supabase/supabaseClient'

export default function LessonsReportDistributionSection({
  reportId,
  readOnly = false
}) {
  const [distributionList, setDistributionList] = useState([])
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddRecipient, setShowAddRecipient] = useState(false)
  const [showAddApprover, setShowAddApprover] = useState(false)
  const [users, setUsers] = useState([])
  const [recipientForm, setRecipientForm] = useState({
    recipient_id: null,
    recipient_name: '',
    recipient_email: '',
    recipient_title: '',
    recipient_role: '',
    distribution_method: 'system'
  })
  const [approverForm, setApproverForm] = useState({
    approver_id: null,
    approver_name: '',
    approver_title: '',
    approver_role: 'project-manager',
    version_approved: null
  })

  useEffect(() => {
    if (reportId && reportId !== 'new') {
      loadData()
      loadUsers()
    }
  }, [reportId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [distResult, approvalsResult] = await Promise.all([
        getDistributionList(reportId),
        getApprovals(reportId)
      ])

      if (distResult.success) {
        setDistributionList(distResult.data || [])
      }

      if (approvalsResult.success) {
        setApprovals(approvalsResult.data || [])
      }
    } catch (error) {
      console.error('Error loading distribution data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const { data } = await platformDb
        .from('users')
        .select('id, full_name, email')
        .eq('is_deleted', false)
        .order('full_name')

      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleAddRecipient = async () => {
    try {
      const result = await addDistributionRecipient(reportId, recipientForm)
      if (result.success) {
        await loadData()
        setShowAddRecipient(false)
        setRecipientForm({
          recipient_id: null,
          recipient_name: '',
          recipient_email: '',
          recipient_title: '',
          recipient_role: '',
          distribution_method: 'system'
        })
      } else {
        alert('Error adding recipient: ' + result.error)
      }
    } catch (error) {
      console.error('Error adding recipient:', error)
      alert('Error adding recipient: ' + error.message)
    }
  }

  const handleRemoveRecipient = async (id) => {
    if (!confirm('Remove this recipient?')) return

    try {
      const result = await removeDistributionRecipient(id)
      if (result.success) {
        await loadData()
      }
    } catch (error) {
      console.error('Error removing recipient:', error)
      alert('Error removing recipient: ' + error.message)
    }
  }

  const handleSendToDistribution = async () => {
    try {
      const result = await sendReportToDistribution(reportId)
      if (result.success) {
        alert(`Report sent to ${result.data.recipients_count} recipients`)
        await loadData()
      } else {
        alert('Error sending report: ' + result.error)
      }
    } catch (error) {
      console.error('Error sending report:', error)
      alert('Error sending report: ' + error.message)
    }
  }

  const handleAddApprover = async () => {
    try {
      const result = await addApprover(reportId, approverForm)
      if (result.success) {
        await loadData()
        setShowAddApprover(false)
        setApproverForm({
          approver_id: null,
          approver_name: '',
          approver_title: '',
          approver_role: 'project-manager',
          version_approved: null
        })
      } else {
        alert('Error adding approver: ' + result.error)
      }
    } catch (error) {
      console.error('Error adding approver:', error)
      alert('Error adding approver: ' + error.message)
    }
  }

  const handleApproval = async (approvalId, action, comments = '') => {
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('is_deleted', false)
        .single()

      if (!userRecord) throw new Error('User record not found')

      let result
      if (action === 'approve') {
        result = await approveReport(approvalId, userRecord.id, comments)
      } else if (action === 'reject') {
        result = await rejectReport(approvalId, userRecord.id, comments)
      } else if (action === 'defer') {
        result = await deferReport(approvalId, userRecord.id, comments)
      }

      if (result.success) {
        await loadData()
      }
    } catch (error) {
      console.error('Error processing approval:', error)
      alert('Error: ' + error.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-800'
      case 'rejected': return 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-800'
      case 'deferred': return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800'
      default: return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'rejected': return <Trash2 className="w-5 h-5 text-red-500" />
      case 'deferred': return <CheckCircle className="w-5 h-5 text-yellow-500" />
      default: return <CheckCircle className="w-5 h-5 text-gray-400" />
    }
  }

  if (reportId === 'new') {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>Save the report first to manage distribution and approval</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Distribution & Approval</h3>
      </div>

      {/* Approval Workflow */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white">Approval Workflow</h4>
          {!readOnly && (
            <button
              onClick={() => setShowAddApprover(true)}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Approver
            </button>
          )}
        </div>

        {approvals.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center text-gray-500 dark:text-gray-400">
            No approvers added yet
          </div>
        ) : (
          <div className="space-y-3">
            {approvals.map((approval) => (
              <div
                key={approval.id}
                className={`border rounded-lg p-4 ${getStatusColor(approval.approval_status)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(approval.approval_status)}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {approval.approver_name || approval.approver?.full_name || 'Unknown'}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        ({approval.approver_role || 'N/A'})
                      </span>
                    </div>
                    {approval.approval_comments && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                        {approval.approval_comments}
                      </p>
                    )}
                    {approval.approval_date && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {new Date(approval.approval_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {approval.approval_status === 'pending' && !readOnly && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const comments = prompt('Enter approval comments (optional):')
                          if (comments !== null) {
                            handleApproval(approval.id, 'approve', comments)
                          }
                        }}
                        className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const comments = prompt('Enter rejection comments:')
                          if (comments) {
                            handleApproval(approval.id, 'reject', comments)
                          }
                        }}
                        className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          const comments = prompt('Enter deferral comments:')
                          if (comments) {
                            handleApproval(approval.id, 'defer', comments)
                          }
                        }}
                        className="px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 text-white rounded"
                      >
                        Defer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Distribution List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white">Distribution List</h4>
          {!readOnly && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddRecipient(true)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Recipient
              </button>
              {distributionList.length > 0 && (
                <button
                  onClick={handleSendToDistribution}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Report
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8">Loading distribution list...</div>
        ) : distributionList.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
            No distribution recipients added yet
          </div>
        ) : (
          <div className="space-y-2">
            {distributionList.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {item.recipient_name || item.recipient?.full_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {item.recipient_email || item.recipient?.email} • {item.recipient_role}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Status: {item.distribution_status} • Version: {item.version_distributed}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {item.distribution_status === 'acknowledged' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {!readOnly && (
                    <button
                      onClick={() => handleRemoveRecipient(item.id)}
                      className="px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Recipient Modal */}
      {showAddRecipient && !readOnly && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add Distribution Recipient</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select User
                </label>
                <select
                  value={recipientForm.recipient_id || ''}
                  onChange={(e) => {
                    const user = users.find(u => u.id === e.target.value)
                    setRecipientForm({
                      ...recipientForm,
                      recipient_id: e.target.value || null,
                      recipient_name: user?.full_name || '',
                      recipient_email: user?.email || ''
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select user...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Or Enter Name
                </label>
                <input
                  type="text"
                  value={recipientForm.recipient_name}
                  onChange={(e) => setRecipientForm({ ...recipientForm, recipient_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Recipient name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={recipientForm.recipient_email}
                  onChange={(e) => setRecipientForm({ ...recipientForm, recipient_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="recipient@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Distribution Method
                </label>
                <select
                  value={recipientForm.distribution_method}
                  onChange={(e) => setRecipientForm({ ...recipientForm, distribution_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="system">System</option>
                  <option value="email">Email</option>
                  <option value="print">Print</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => setShowAddRecipient(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRecipient}
                disabled={!recipientForm.recipient_name}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                Add Recipient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Approver Modal */}
      {showAddApprover && !readOnly && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add Approver</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select User
                </label>
                <select
                  value={approverForm.approver_id || ''}
                  onChange={(e) => {
                    const user = users.find(u => u.id === e.target.value)
                    setApproverForm({
                      ...approverForm,
                      approver_id: e.target.value || null,
                      approver_name: user?.full_name || ''
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select user...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Or Enter Name
                </label>
                <input
                  type="text"
                  value={approverForm.approver_name}
                  onChange={(e) => setApproverForm({ ...approverForm, approver_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Approver name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Approver Role
                </label>
                <select
                  value={approverForm.approver_role}
                  onChange={(e) => setApproverForm({ ...approverForm, approver_role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="executive">Executive</option>
                  <option value="senior-user">Senior User</option>
                  <option value="senior-supplier">Senior Supplier</option>
                  <option value="project-manager">Project Manager</option>
                  <option value="pmo-admin">PMO Admin</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => setShowAddApprover(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddApprover}
                disabled={!approverForm.approver_name}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                Add Approver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
