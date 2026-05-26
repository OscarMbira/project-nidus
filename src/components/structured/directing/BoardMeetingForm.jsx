import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { X, Calendar, Clock, MapPin, FileText, Users } from 'lucide-react';
import { createBoardMeeting, updateBoardMeeting, fetchBoardMembers } from '../../../services/directingProjectService';

import { getDisplayRowNumber } from '../../../utils/tableRowNumberUtils'
export default function BoardMeetingForm({ boardId, meeting, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [boardMembers, setBoardMembers] = useState([]);
  const [formData, setFormData] = useState({
    meeting_title: meeting?.meeting_title || '',
    meeting_date: meeting?.meeting_date || new Date().toISOString().split('T')[0],
    start_time: meeting?.start_time || '09:00',
    end_time: meeting?.end_time || '10:00',
    location: meeting?.location || '',
    meeting_type: meeting?.meeting_type || 'Regular',
    meeting_status: meeting?.meeting_status || 'Scheduled',
    meeting_purpose: meeting?.meeting_purpose || '',
    agenda_items: meeting?.agenda_items || '',
    minutes: meeting?.minutes || '',
    action_items: meeting?.action_items || ''
  });

  const meetingTypes = [
    { value: 'Regular', label: 'Regular', description: 'Scheduled board meeting' },
    { value: 'Ad_Hoc', label: 'Ad Hoc', description: 'Unscheduled special meeting' },
    { value: 'Emergency', label: 'Emergency', description: 'Urgent decision required' }
  ];

  const meetingStatuses = [
    { value: 'Scheduled', label: 'Scheduled' },
    { value: 'In_Progress', label: 'In Progress' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled', label: 'Cancelled' }
  ];

  useEffect(() => {
    loadBoardMembers();
  }, [boardId]);

  const loadBoardMembers = async () => {
    try {
      const data = await fetchBoardMembers(boardId);
      setBoardMembers(data || []);
    } catch (error) {
      console.error('Error loading board members:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.meeting_title.trim()) {
      alert('Please enter a meeting title');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const meetingData = {
        board_id: boardId,
        meeting_title: formData.meeting_title,
        meeting_date: formData.meeting_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        location: formData.location,
        meeting_type: formData.meeting_type,
        meeting_status: formData.meeting_status,
        meeting_purpose: formData.meeting_purpose,
        agenda_items: formData.agenda_items,
        minutes: formData.minutes,
        action_items: formData.action_items
      };

      if (meeting) {
        // Update existing meeting
        meetingData.updated_by = user.id;
        await updateBoardMeeting(meeting.id, meetingData);
      } else {
        // Create new meeting
        meetingData.created_by = user.id;
        await createBoardMeeting(meetingData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving board meeting:', error);
      alert('Error saving board meeting: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {meeting ? 'Edit Board Meeting' : 'Schedule Board Meeting'}
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
          {/* Meeting Title */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="h-4 w-4" />
              Meeting Title *
            </label>
            <input
              type="text"
              value={formData.meeting_title}
              onChange={(e) => setFormData({ ...formData, meeting_title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Q1 Project Board Review"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Meeting Type */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileText className="h-4 w-4" />
                Meeting Type *
              </label>
              <select
                value={formData.meeting_type}
                onChange={(e) => setFormData({ ...formData, meeting_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                {meetingTypes.map((type, index) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {meetingTypes.find(t => t.value === formData.meeting_type) && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {meetingTypes.find(t => t.value === formData.meeting_type).description}
                </p>
              )}
            </div>

            {/* Meeting Status */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="h-4 w-4" />
                Status *
              </label>
              <select
                value={formData.meeting_status}
                onChange={(e) => setFormData({ ...formData, meeting_status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                {meetingStatuses.map((status, index) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Meeting Date */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4" />
                Meeting Date *
              </label>
              <input
                type="date"
                value={formData.meeting_date}
                onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            {/* Start Time */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="h-4 w-4" />
                Start Time *
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            {/* End Time */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="h-4 w-4" />
                End Time *
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MapPin className="h-4 w-4" />
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Conference Room A or https://zoom.us/..."
            />
          </div>

          {/* Meeting Purpose */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="h-4 w-4" />
              Meeting Purpose
            </label>
            <textarea
              value={formData.meeting_purpose}
              onChange={(e) => setFormData({ ...formData, meeting_purpose: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Brief description of the meeting's purpose..."
            />
          </div>

          {/* Agenda Items */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="h-4 w-4" />
              Agenda Items
            </label>
            <textarea
              value={formData.agenda_items}
              onChange={(e) => setFormData({ ...formData, agenda_items: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
              placeholder="1. Review project status&#10;2. Approve budget changes&#10;3. Discuss risks and issues&#10;4. Any other business"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              List agenda items (one per line or numbered)
            </p>
          </div>

          {meeting && (
            <>
              {/* Minutes */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FileText className="h-4 w-4" />
                  Meeting Minutes
                </label>
                <textarea
                  value={formData.minutes}
                  onChange={(e) => setFormData({ ...formData, minutes: e.target.value })}
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Record key discussion points and decisions..."
                />
              </div>

              {/* Action Items */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FileText className="h-4 w-4" />
                  Action Items
                </label>
                <textarea
                  value={formData.action_items}
                  onChange={(e) => setFormData({ ...formData, action_items: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                  placeholder="[ ] Action 1 - Owner: John - Due: 2025-02-15&#10;[ ] Action 2 - Owner: Jane - Due: 2025-02-20"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Record action items with owners and due dates
                </p>
              </div>
            </>
          )}

          {/* Info Note */}
          {boardMembers.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-300">
                    Board Members ({boardMembers.length})
                  </p>
                  <p className="text-blue-700 dark:text-blue-400 mt-1">
                    Attendance can be recorded after the meeting is created
                  </p>
                </div>
              </div>
            </div>
          )}

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
              {loading ? 'Saving...' : meeting ? 'Update Meeting' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
