import { useState } from 'react';
import { Clock, Calendar, User, Mail } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

export default function ScheduleReportForm({ reportId, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    schedule_type: 'daily',
    schedule_time: '09:00',
    schedule_day: '',
    schedule_day_of_month: '',
    schedule_month: '',
    recipient_user_ids: [],
    recipient_emails: [],
    send_as: 'attachment',
    format: 'pdf',
    is_active: true,
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, email, full_name')
        .order('full_name', { ascending: true });

      if (data) setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const scheduleData = {
        report_definition_id: reportId,
        schedule_type: formData.schedule_type,
        schedule_time: formData.schedule_time,
        schedule_day: formData.schedule_day || null,
        schedule_day_of_month: formData.schedule_day_of_month || null,
        schedule_month: formData.schedule_month || null,
        recipient_user_ids: formData.recipient_user_ids,
        recipient_emails: formData.recipient_emails.filter(email => email.trim()),
        send_as: formData.send_as,
        format: formData.format,
        is_active: formData.is_active,
      };

      const { error } = await supabase
        .from('report_schedules')
        .insert({
          ...scheduleData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      if (onSave) onSave();
    } catch (error) {
      console.error('Error saving report schedule:', error);
      alert('Error saving schedule: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Schedule Report</h3>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Schedule Type *
            </label>
            <select
              name="schedule_type"
              value={formData.schedule_type}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="on-demand">On Demand</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Schedule Time *
            </label>
            <input
              type="time"
              name="schedule_time"
              value={formData.schedule_time}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {formData.schedule_type === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Day of Week *
              </label>
              <select
                name="schedule_day"
                value={formData.schedule_day}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select day...</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>
          )}

          {formData.schedule_type === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Day of Month *
              </label>
              <input
                type="number"
                name="schedule_day_of_month"
                value={formData.schedule_day_of_month}
                onChange={handleChange}
                min="1"
                max="31"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 1 for 1st of month"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Format *
            </label>
            <select
              name="format"
              value={formData.format}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Send As *
            </label>
            <select
              name="send_as"
              value={formData.send_as}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="attachment">Email Attachment</option>
              <option value="link">Email Link</option>
              <option value="portal">Portal Notification</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recipients (Users)
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
            {users.map(user => (
              <label key={user.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded">
                <input
                  type="checkbox"
                  checked={formData.recipient_user_ids.includes(user.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ ...formData, recipient_user_ids: [...formData.recipient_user_ids, user.id] });
                    } else {
                      setFormData({ ...formData, recipient_user_ids: formData.recipient_user_ids.filter(id => id !== user.id) });
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900 dark:text-white">
                  {user.full_name || user.email}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recipients (Email Addresses)
          </label>
          <textarea
            value={formData.recipient_emails.join('\n')}
            onChange={(e) => setFormData({
              ...formData,
              recipient_emails: e.target.value.split('\n').filter(email => email.trim())
            })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter email addresses (one per line)"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Enter one email address per line
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Active Schedule
          </label>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={loading || !formData.schedule_type || !formData.schedule_time}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

