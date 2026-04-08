/**
 * Reminder Setup Component
 * Set reminders for daily log entries
 */

import { useState, useEffect } from 'react';
import { Calendar, Bell, X } from 'lucide-react';
import { createReminder, getRemindersForEntry, deleteReminder } from '../../services/dailyLogReminderService';

export default function ReminderSetup({ entryId, targetDate }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderType, setReminderType] = useState('both');

  useEffect(() => {
    if (entryId) {
      fetchReminders();
    }
  }, [entryId]);

  useEffect(() => {
    // Pre-fill reminder date with target date if available
    if (targetDate && !reminderDate) {
      // Set reminder to 1 day before target date
      const target = new Date(targetDate);
      target.setDate(target.getDate() - 1);
      setReminderDate(target.toISOString().split('T')[0]);
    }
  }, [targetDate]);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const result = await getRemindersForEntry(entryId);
      if (result.success) {
        setReminders(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (!reminderDate) {
      alert('Please select a reminder date');
      return;
    }

    try {
      const result = await createReminder(entryId, reminderDate, reminderType);
      if (result.success) {
        setShowForm(false);
        setReminderDate('');
        setReminderType('both');
        fetchReminders();
      } else {
        alert('Error creating reminder: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating reminder:', error);
      alert('Error creating reminder: ' + error.message);
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;

    try {
      const result = await deleteReminder(reminderId);
      if (result.success) {
        fetchReminders();
      } else {
        alert('Error deleting reminder: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting reminder:', error);
      alert('Error deleting reminder: ' + error.message);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading reminders...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Reminders ({reminders.length})
        </h4>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showForm ? 'Cancel' : 'Add Reminder'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddReminder} className="bg-gray-50 rounded-lg p-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reminder Date</label>
            <input
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reminder Type</label>
            <select
              value={reminderType}
              onChange={(e) => setReminderType(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="email">Email</option>
              <option value="notification">Notification</option>
              <option value="both">Both</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Create Reminder
          </button>
        </form>
      )}

      {reminders.length > 0 && (
        <div className="space-y-2">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="flex items-center justify-between bg-gray-50 rounded p-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>{new Date(reminder.reminder_date).toLocaleDateString()}</span>
                <span className="text-gray-500">({reminder.reminder_type})</span>
                {reminder.reminder_sent && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">Sent</span>
                )}
              </div>
              <button
                onClick={() => handleDeleteReminder(reminder.id)}
                className="text-red-600 hover:text-red-800"
                title="Delete reminder"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {reminders.length === 0 && !showForm && (
        <p className="text-xs text-gray-500">No reminders set</p>
      )}
    </div>
  );
}
