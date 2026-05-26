import { useState, useEffect } from 'react';
import { Users, Clock, CheckCircle, XCircle, AlertTriangle, Calendar } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { fetchChangeRequests } from '../../services/changeManagementService';

export default function ChangeBoardDashboard({ projectId, boardId = null }) {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [boardMeetings, setBoardMeetings] = useState([]);
  const [boardMembers, setBoardMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    if (projectId || boardId) {
      fetchData();
    }
  }, [projectId, boardId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch change requests pending board review
      const filters = { project_id: projectId };
      if (boardId) filters.board_id = boardId;
      filters.status = 'pending-approval'; // or 'under-assessment'

      const requests = await fetchChangeRequests(filters);
      setPendingRequests(requests || []);

      // Fetch board meetings (if board table exists)
      if (boardId) {
        const { data: meetings } = await supabase
          .from('change_board_meetings')
          .select('*')
          .eq('change_board_id', boardId)
          .eq('is_deleted', false)
          .order('meeting_date', { ascending: false })
          .limit(5);

        if (meetings) setBoardMeetings(meetings);
      }

      // Fetch board members (if board members table exists)
      if (boardId) {
        const { data: members } = await supabase
          .from('change_board_members')
          .select(`
            *,
            user:user_id(id, email, full_name)
          `)
          .eq('change_board_id', boardId)
          .eq('is_deleted', false);

        if (members) setBoardMembers(members);
      }

      // Calculate stats
      const allRequests = await fetchChangeRequests({ project_id: projectId });
      if (allRequests) {
        setStats({
          pending: allRequests.filter(r => r.status === 'submitted' || r.status === 'pending-approval').length,
          underReview: allRequests.filter(r => r.status === 'under-assessment').length,
          approved: allRequests.filter(r => r.status === 'approved').length,
          rejected: allRequests.filter(r => r.status === 'rejected').length,
        });
      }
    } catch (error) {
      console.error('Error fetching change board data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Board Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Review</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {stats.pending}
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Under Review</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {stats.underReview}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats.approved}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Rejected</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {stats.rejected}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Board Members */}
      {boardMembers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Change Board Members
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {boardMembers.map((member, index) => (
              <div
                key={member.id}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >                <div className="font-medium text-gray-900 dark:text-white">
                  {member.user?.full_name || member.user?.email || 'Unknown'}
                </div>
                {member.role && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">
                    {member.role.replace('-', ' ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Change Requests */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          Pending Board Review ({pendingRequests.length})
        </h3>
        {pendingRequests.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No change requests pending board review
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.slice(0, 10).map((request, index) => (
              <div
                key={request.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {request.change_reference}: {request.change_title}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {request.change_description?.substring(0, 150)}
                      {request.change_description?.length > 150 ? '...' : ''}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {request.submitted_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Submitted: {new Date(request.submitted_date).toLocaleDateString()}
                        </div>
                      )}
                      {request.priority && (
                        <span className={`px-2 py-1 rounded capitalize ${
                          request.priority === 'critical' || request.priority === 'urgent'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            : request.priority === 'high'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {request.priority}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      request.status === 'pending-approval'
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>
                      {request.status?.replace('-', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Board Meetings */}
      {boardMeetings.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Upcoming Board Meetings
          </h3>
          <div className="space-y-3">
            {boardMeetings.map((meeting, index) => (
              <div
                key={meeting.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {meeting.meeting_title || 'Change Board Meeting'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {meeting.meeting_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(meeting.meeting_date).toLocaleDateString()}
                      {meeting.meeting_time && ` at ${meeting.meeting_time}`}
                    </div>
                  )}
                  {meeting.meeting_location && (
                    <div className="mt-1">{meeting.meeting_location}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

