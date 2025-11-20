import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { X, User, Calendar, FileText } from 'lucide-react';
import { addBoardMember, updateBoardMember } from '../../../services/directingProjectService';

export default function BoardMemberForm({ boardId, member, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    user_id: member?.user_id || '',
    role_on_board: member?.role_on_board || 'Senior_User',
    appointment_date: member?.appointment_date || new Date().toISOString().split('T')[0],
    responsibilities: member?.responsibilities || '',
    is_active: member?.is_active !== undefined ? member.is_active : true
  });

  const roleOptions = [
    { value: 'Executive', label: 'Executive', description: 'Overall business direction' },
    { value: 'Senior_User', label: 'Senior User', description: 'User interests and benefits' },
    { value: 'Senior_Supplier', label: 'Senior Supplier', description: 'Supplier resources and expertise' },
    { value: 'Project_Assurance', label: 'Project Assurance', description: 'Independent oversight' },
    { value: 'Change_Authority', label: 'Change Authority', description: 'Change control decisions' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.user_id) {
      alert('Please select a user');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const memberData = {
        board_id: boardId,
        user_id: formData.user_id,
        role_on_board: formData.role_on_board,
        appointment_date: formData.appointment_date,
        responsibilities: formData.responsibilities,
        is_active: formData.is_active
      };

      if (member) {
        // Update existing member
        memberData.updated_by = user.id;
        await updateBoardMember(member.id, memberData);
      } else {
        // Create new member
        memberData.created_by = user.id;
        await addBoardMember(memberData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving board member:', error);
      alert('Error saving board member: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {member ? 'Edit Board Member' : 'Add Board Member'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* User Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <User className="h-4 w-4" />
              User *
            </label>
            <select
              value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={!!member}
            >
              <option value="">Select a user...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Select the user to add as a board member
            </p>
          </div>

          {/* Role on Board */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <User className="h-4 w-4" />
              Role on Board *
            </label>
            <select
              value={formData.role_on_board}
              onChange={(e) => setFormData({ ...formData, role_on_board: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            {roleOptions.find(r => r.value === formData.role_on_board) && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {roleOptions.find(r => r.value === formData.role_on_board).description}
              </p>
            )}
          </div>

          {/* Appointment Date */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="h-4 w-4" />
              Appointment Date *
            </label>
            <input
              type="date"
              value={formData.appointment_date}
              onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          {/* Responsibilities */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="h-4 w-4" />
              Responsibilities
            </label>
            <textarea
              value={formData.responsibilities}
              onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Describe the member's key responsibilities on the board..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Optional: Detail the specific responsibilities for this board role
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active member
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Saving...' : member ? 'Update Member' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
