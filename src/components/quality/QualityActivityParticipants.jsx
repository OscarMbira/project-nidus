/**
 * Quality Activity Participants Component
 * Manages roles and responsibilities for quality activities
 */

import { useState, useEffect } from 'react';
import { Users, UserPlus, X, Save } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

export default function QualityActivityParticipants({ 
  activityType, 
  activityId, 
  participants = [],
  onUpdate 
}) {
  const [users, setUsers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newParticipant, setNewParticipant] = useState({
    user_id: '',
    participant_role: '',
    responsibilities: '',
    attendance_status: 'invited'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_deleted', false)
        .order('full_name', { ascending: true });

      if (data) setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddParticipant = async () => {
    if (!newParticipant.user_id || !newParticipant.participant_role) {
      alert('Please select user and role');
      return;
    }

    try {
      const tableName = activityType === 'review' 
        ? 'quality_review_participants'
        : 'quality_inspection_participants';

      const { data: { user } } = await supabase.auth.getUser();
      const { data: userRecord } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      const insertData = {
        [`${activityType}_id`]: activityId,
        user_id: newParticipant.user_id,
        participant_role: newParticipant.participant_role,
        responsibilities: newParticipant.responsibilities || null,
        attendance_status: newParticipant.attendance_status,
        created_by: userRecord?.id
      };

      const { error } = await supabase
        .from(tableName)
        .insert(insertData);

      if (error) throw error;

      setNewParticipant({ user_id: '', participant_role: '', responsibilities: '', attendance_status: 'invited' });
      setShowAddForm(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error adding participant:', error);
      alert('Error adding participant: ' + error.message);
    }
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'chair': 'Chair',
      'presenter': 'Presenter',
      'reviewer': 'Reviewer',
      'inspector': 'Inspector',
      'observer': 'Observer',
      'administrator': 'Administrator',
      'auditor': 'Auditor',
      'subject_matter_expert': 'Subject Matter Expert'
    };
    return roleMap[role] || role;
  };

  const getAttendanceColor = (status) => {
    switch (status) {
      case 'attended':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'absent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Roles/Responsibilities
          </h3>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
        >
          <UserPlus className="h-4 w-4" />
          Add Participant
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                User *
              </label>
              <select
                value={newParticipant.user_id}
                onChange={(e) => setNewParticipant({ ...newParticipant, user_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select user...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role *
              </label>
              <select
                value={newParticipant.participant_role}
                onChange={(e) => setNewParticipant({ ...newParticipant, participant_role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select role...</option>
                <option value="chair">Chair</option>
                <option value="presenter">Presenter</option>
                {activityType === 'review' ? (
                  <>
                    <option value="reviewer">Reviewer</option>
                    <option value="administrator">Administrator</option>
                  </>
                ) : (
                  <>
                    <option value="inspector">Inspector</option>
                    <option value="auditor">Auditor</option>
                    <option value="subject_matter_expert">Subject Matter Expert</option>
                  </>
                )}
                <option value="observer">Observer</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Responsibilities
              </label>
              <textarea
                value={newParticipant.responsibilities}
                onChange={(e) => setNewParticipant({ ...newParticipant, responsibilities: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe responsibilities..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewParticipant({ user_id: '', participant_role: '', responsibilities: '', attendance_status: 'invited' });
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleAddParticipant}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>
      )}

      {participants.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No participants assigned yet
        </div>
      ) : (
        <div className="space-y-3">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {participant.user?.full_name || participant.user?.email || 'Unknown User'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  <span className="font-medium">{getRoleDisplayName(participant.participant_role)}</span>
                  {participant.responsibilities && (
                    <span className="ml-2">• {participant.responsibilities}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getAttendanceColor(participant.attendance_status)}`}>
                  {participant.attendance_status || 'invited'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
