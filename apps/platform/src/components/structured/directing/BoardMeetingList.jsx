import { useState } from 'react';
import { Calendar, Edit2, Trash2, CalendarPlus, MapPin, Clock, Users, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { deleteBoardMeeting } from '../../../services/directingProjectService';

export default function BoardMeetingList({ meetings, onEdit, onRefresh, onAdd, onViewDetails }) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (meetingId) => {
    if (!confirm('Are you sure you want to delete this board meeting?')) return;

    try {
      setDeletingId(meetingId);
      await deleteBoardMeeting(meetingId);
      onRefresh();
    } catch (error) {
      console.error('Error deleting board meeting:', error);
      alert('Error deleting board meeting: ' + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getMeetingTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'regular':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'ad_hoc':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'emergency':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'scheduled':
        return <Calendar className="h-4 w-4" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (!meetings || meetings.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Calendar className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Board Meetings
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Schedule your first board meeting to start governance activities
        </p>
        {onAdd && (
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2"
          >
            <CalendarPlus className="h-4 w-4" />
            Schedule Meeting
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Board Meetings ({meetings.length})
        </h3>
        {onAdd && (
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2"
          >
            <CalendarPlus className="h-4 w-4" />
            Schedule Meeting
          </button>
        )}
      </div>

      <div className="space-y-4">
        {meetings.map((meeting, index) => (
          <div
            key={meeting.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {meeting.meeting_title || 'Board Meeting'}
                  </h4>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getStatusColor(
                      meeting.meeting_status
                    )}`}
                  >
                    {getStatusIcon(meeting.meeting_status)}
                    {meeting.meeting_status?.replace('_', ' ')}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getMeetingTypeColor(
                      meeting.meeting_type
                    )}`}
                  >
                    {meeting.meeting_type?.replace('_', ' ')}
                  </span>
                </div>
                {meeting.meeting_purpose && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {meeting.meeting_purpose}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {onViewDetails && (
                  <button
                    onClick={() => onViewDetails(meeting)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
                  >
                    View Details
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => onEdit(meeting)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    title="Edit meeting"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(meeting.id)}
                  disabled={deletingId === meeting.id}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                  title="Delete meeting"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              {meeting.meeting_date && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>{format(new Date(meeting.meeting_date), 'MMM dd, yyyy')}</span>
                </div>
              )}
              {meeting.start_time && meeting.end_time && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {meeting.start_time} - {meeting.end_time}
                  </span>
                </div>
              )}
              {meeting.location && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{meeting.location}</span>
                </div>
              )}
              {meeting.attendees && meeting.attendees.length > 0 && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span>{meeting.attendees.length} attendees</span>
                </div>
              )}
            </div>

            {meeting.agenda_items && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">Agenda</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line">
                  {typeof meeting.agenda_items === 'string'
                    ? meeting.agenda_items
                    : JSON.stringify(meeting.agenda_items, null, 2)}
                </p>
              </div>
            )}

            {meeting.decisions && meeting.decisions.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {meeting.decisions.length} decision{meeting.decisions.length !== 1 ? 's' : ''} made
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
