import { useState } from 'react';
import { Users, Edit2, Trash2, UserPlus, Mail, Phone, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { removeBoardMember } from '../../../services/directingProjectService';

export default function BoardMemberList({ members, onEdit, onRefresh, onAdd }) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (memberId) => {
    if (!confirm('Are you sure you want to remove this board member?')) return;

    try {
      setDeletingId(memberId);
      await removeBoardMember(memberId);
      onRefresh();
    } catch (error) {
      console.error('Error removing board member:', error);
      alert('Error removing board member: ' + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'executive':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'senior_supplier':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'senior_user':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'project_assurance':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'change_authority':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (!members || members.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Users className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Board Members
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Add members to establish your project board
        </p>
        {onAdd && (
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add Board Member
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Board Members ({members.length})
        </h3>
        {onAdd && (
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add Member
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => (
          <div
            key={member.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {member.user?.full_name
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase() || '??'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {member.user?.full_name || 'Unknown User'}
                    </h4>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${getRoleBadgeColor(
                        member.role_on_board
                      )}`}
                    >
                      {member.role_on_board?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                {onEdit && (
                  <button
                    onClick={() => onEdit(member)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    title="Edit member"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(member.id)}
                  disabled={deletingId === member.id}
                  className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                  title="Remove member"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {member.user?.email && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{member.user.email}</span>
                </div>
              )}
              {member.user?.phone && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span>{member.user.phone}</span>
                </div>
              )}
              {member.appointment_date && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Appointed: {format(new Date(member.appointment_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 pt-2">
                {member.is_active ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded text-xs font-medium">
                    <CheckCircle className="h-3 w-3" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded text-xs font-medium">
                    <XCircle className="h-3 w-3" />
                    Inactive
                  </span>
                )}
              </div>
            </div>

            {member.responsibilities && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                  Responsibilities:
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  {member.responsibilities}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
