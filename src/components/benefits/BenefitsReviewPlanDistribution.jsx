/**
 * Benefits Review Plan Distribution Component
 * Manages distribution list for Benefits Review Plans
 */

import { useState, useEffect } from 'react';
import { Share2, Plus, User, Mail, CheckCircle, X } from 'lucide-react';
import { getDistributionList, addRecipient, removeRecipient, recordAcknowledgement } from '../../services/benefitsReviewPlanService';
import { platformDb, supabase } from '../../services/supabaseClient';

export default function BenefitsReviewPlanDistribution({ planId, onUpdate }) {
  const [distribution, setDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);

  const [newRecipient, setNewRecipient] = useState({
    recipient_user_id: '',
    recipient_name: '',
    recipient_title: '',
    recipient_email: '',
    distribution_method: 'portal',
  });

  useEffect(() => {
    fetchDistribution();
    fetchUsers();
  }, [planId]);

  const fetchDistribution = async () => {
    try {
      setLoading(true);
      const data = await getDistributionList(planId);
      setDistribution(data);
    } catch (error) {
      console.error('Error fetching distribution list:', error);
      alert('Error loading distribution list: ' + error.message);
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

  const handleAddRecipient = async (e) => {
    e.preventDefault();
    if (!newRecipient.recipient_user_id && !newRecipient.recipient_email) {
      alert('Please select a user or enter an email address');
      return;
    }

    setSaving(true);
    try {
      await addRecipient(planId, newRecipient);
      setShowAddForm(false);
      setNewRecipient({
        recipient_user_id: '',
        recipient_name: '',
        recipient_title: '',
        recipient_email: '',
        distribution_method: 'portal',
      });
      fetchDistribution();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error adding recipient:', error);
      alert('Error adding recipient: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRecipient = async (distributionId) => {
    if (!window.confirm('Remove this recipient from distribution list?')) {
      return;
    }

    try {
      await removeRecipient(distributionId);
      fetchDistribution();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error removing recipient:', error);
      alert('Error removing recipient: ' + error.message);
    }
  };

  const handleAcknowledge = async (distributionId) => {
    try {
      await recordAcknowledgement(distributionId);
      fetchDistribution();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error recording acknowledgement:', error);
      alert('Error recording acknowledgement: ' + error.message);
    }
  };

  const handleUserSelect = (userId) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setNewRecipient({
        ...newRecipient,
        recipient_user_id: userId,
        recipient_name: user.full_name || '',
        recipient_email: user.email || '',
      });
    }
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
          <Share2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            1.4 Distribution
          </h3>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Recipient
        </button>
      </div>

      {/* Add Recipient Form */}
      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <form onSubmit={handleAddRecipient} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select User (Optional)
              </label>
              <select
                value={newRecipient.recipient_user_id}
                onChange={(e) => handleUserSelect(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select user...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={newRecipient.recipient_name}
                  onChange={(e) => setNewRecipient({ ...newRecipient, recipient_name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={newRecipient.recipient_title}
                  onChange={(e) => setNewRecipient({ ...newRecipient, recipient_title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={newRecipient.recipient_email}
                  onChange={(e) => setNewRecipient({ ...newRecipient, recipient_email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Distribution Method
                </label>
                <select
                  value={newRecipient.distribution_method}
                  onChange={(e) => setNewRecipient({ ...newRecipient, distribution_method: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="email">Email</option>
                  <option value="portal">Portal</option>
                  <option value="print">Print</option>
                  <option value="meeting">Meeting</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Adding...' : 'Add Recipient'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Distribution List */}
      <div className="space-y-4">
        {distribution.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Share2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recipients in distribution list</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Recipient
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Method
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Version Issued
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Date of Issue
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Acknowledged
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {distribution.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {item.recipient?.full_name || item.recipient_name || item.recipient?.email || 'N/A'}
                      </div>
                      {item.recipient_title && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.recipient_title}</div>
                      )}
                      {item.recipient_email && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {item.recipient_email}
                        </div>
                      )}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {item.distribution_method || '-'}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {item.version_issued || '-'}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(item.date_of_issue)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">
                      {item.acknowledged ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          <CheckCircle className="h-3 w-3" />
                          {formatDate(item.acknowledged_date)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">Pending</span>
                      )}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {!item.acknowledged && (
                          <button
                            onClick={() => handleAcknowledge(item.id)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                            title="Acknowledge"
                          >
                            Acknowledge
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveRecipient(item.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                          title="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
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
