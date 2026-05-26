/**
 * Benefits Review Plan Approvals Component
 * Manages approval workflow for Benefits Review Plans
 */

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Plus, User, MessageSquare } from 'lucide-react';
import { getApprovals, requestApproval, recordApproval, getMyPendingApprovals } from '../../services/benefitsReviewPlanService';
import { platformDb } from '../../services/supabaseClient';
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function BenefitsReviewPlanApprovals({ planId, planStatus, onUpdate }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedApprovers, setSelectedApprovers] = useState([]);

  useEffect(() => {
    fetchApprovals();
    fetchUsers();
  }, [planId]);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const data = await getApprovals(planId);
      setApprovals(data);
    } catch (error) {
      console.error('Error fetching approvals:', error);
      alert('Error loading approvals: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await platformDb
        .from('users')
        .select('id, email, full_name')
        .eq('is_deleted', false)
        .order('full_name', { ascending: true });

      if (data) setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleRequestApproval = async () => {
    if (selectedApprovers.length === 0) {
      alert('Please select at least one approver');
      return;
    }

    setSaving(true);
    try {
      await requestApproval(planId, selectedApprovers);
      setShowRequestForm(false);
      setSelectedApprovers([]);
      fetchApprovals();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error requesting approval:', error);
      alert('Error requesting approval: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApprovalDecision = async (approvalId, status, comments = '') => {
    try {
      await recordApproval(approvalId, status, comments);
      fetchApprovals();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error recording approval:', error);
      alert('Error recording approval: ' + error.message);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: Clock, label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle, label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: XCircle, label: 'Rejected' },
      requested_changes: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', icon: MessageSquare, label: 'Changes Requested' },
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3" />
        {badge.label}
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            1.3 Approvals
          </h3>
        </div>
        {planStatus === 'draft' && (
          <button
            onClick={() => setShowRequestForm(!showRequestForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Request Approval
          </button>
        )}
      </div>

      {/* Request Approval Form */}
      {showRequestForm && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Approvers *
              </label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 max-h-60 overflow-y-auto bg-white dark:bg-gray-700">
                {users.map((user) => (
                  <label key={user.id} className="flex items-center gap-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedApprovers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedApprovers([...selectedApprovers, user.id]);
                        } else {
                          setSelectedApprovers(selectedApprovers.filter(id => id !== user.id));
                        }
                      }}
                      className="w-5 h-5 text-blue-600 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {user.full_name || user.email}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRequestForm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestApproval}
                disabled={saving || selectedApprovers.length === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Requesting...' : 'Request Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approvals List */}
      <div className="space-y-4">
        {approvals.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No approvals yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                <TableRowNumberHeader className="!normal-case" />
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Approver
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Version
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Approval Date
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Comments
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((approval, index) => (
                  <tr key={approval.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {approval.approver?.full_name || approval.approver_name || approval.approver?.email || 'N/A'}
                      </div>
                      {approval.approver_title && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{approval.approver_title}</div>
                      )}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
                      {getStatusBadge(approval.approval_status)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {approval.version_approved || '-'}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(approval.approval_date)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {approval.comments || '-'}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">
                      {approval.approval_status === 'pending' && (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              const comments = prompt('Enter approval comments (optional):');
                              handleApprovalDecision(approval.id, 'approved', comments || '');
                            }}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                            title="Approve"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              const comments = prompt('Enter rejection reason (required):') || '';
                              if (comments) {
                                handleApprovalDecision(approval.id, 'rejected', comments);
                              }
                            }}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                            title="Reject"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
