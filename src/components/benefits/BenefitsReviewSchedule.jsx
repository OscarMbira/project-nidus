/**
 * Benefits Review Schedule Component
 * Manages scheduled reviews for benefits
 */

import { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, CheckCircle, Clock, AlertTriangle, User, MapPin, Video, FileText } from 'lucide-react';
import { getReviewSchedule, scheduleReview, updateReview, completeReview, getUpcomingReviews, getOverdueReviews } from '../../services/benefitsReviewPlanService';
import { platformDb } from '../../services/supabaseClient';
import { getBenefits } from '../../services/benefitsService';
import { XCircle } from 'lucide-react';
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function BenefitsReviewSchedule({ planId, projectId, onUpdate }) {
  const [reviews, setReviews] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [benefits, setBenefits] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'

  const [reviewData, setReviewData] = useState({
    benefit_id: '',
    review_name: '',
    review_description: '',
    review_type: 'benefit_review',
    planned_date: '',
    forecast_date: '',
    review_duration_hours: null,
    review_location: '',
    is_virtual: true,
    meeting_link: '',
    reviewer_user_id: '',
    attendees: [],
    notes: '',
  });

  const [completionData, setCompletionData] = useState({
    outcome_summary: '',
    findings: '',
    recommendations: '',
    action_items: '',
    review_report_url: '',
  });

  useEffect(() => {
    fetchSchedule();
    fetchUsers();
    if (projectId) fetchBenefits();
  }, [planId, projectId]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const [scheduleData, upcomingData, overdueData] = await Promise.all([
        getReviewSchedule(planId),
        projectId ? getUpcomingReviews(projectId, 30) : Promise.resolve([]),
        projectId ? getOverdueReviews(projectId) : Promise.resolve([]),
      ]);
      setReviews(scheduleData);
      setUpcoming(upcomingData);
      setOverdue(overdueData);
    } catch (error) {
      console.error('Error fetching review schedule:', error);
      alert('Error loading schedule: ' + error.message);
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

  const fetchBenefits = async () => {
    try {
      const data = await getBenefits({ project_id: projectId });
      setBenefits(data || []);
    } catch (error) {
      console.error('Error fetching benefits:', error);
    }
  };

  const handleScheduleReview = async (e) => {
    e.preventDefault();
    if (!reviewData.review_name || !reviewData.planned_date) {
      alert('Please enter review name and planned date');
      return;
    }

    setSaving(true);
    try {
      await scheduleReview(planId, reviewData);
      setShowAddDialog(false);
      resetForm();
      fetchSchedule();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error scheduling review:', error);
      alert('Error scheduling review: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteReview = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await completeReview(showCompleteDialog.id, completionData);
      setShowCompleteDialog(null);
      setCompletionData({
        outcome_summary: '',
        findings: '',
        recommendations: '',
        action_items: '',
        review_report_url: '',
      });
      fetchSchedule();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error completing review:', error);
      alert('Error completing review: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveReview = async (reviewId) => {
    if (!window.confirm('Remove this scheduled review?')) {
      return;
    }

    try {
      // TODO: Add delete function to service
      // For now, we'll use update to mark as cancelled
      await updateReview(reviewId, { status: 'cancelled' });
      fetchSchedule();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error removing review:', error);
      alert('Error removing review: ' + error.message);
    }
  };

  const resetForm = () => {
    setReviewData({
      benefit_id: '',
      review_name: '',
      review_description: '',
      review_type: 'benefit_review',
      planned_date: '',
      forecast_date: '',
      review_duration_hours: null,
      review_location: '',
      is_virtual: true,
      meeting_link: '',
      reviewer_user_id: '',
      attendees: [],
      notes: '',
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: Calendar, label: 'Scheduled' },
      in_progress: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: Clock, label: 'In Progress' },
      completed: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle, label: 'Completed' },
      cancelled: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: XCircle, label: 'Cancelled' },
      rescheduled: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', icon: Calendar, label: 'Rescheduled' },
    };

    const badge = badges[status] || badges.scheduled;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3" />
        {badge.label}
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
          <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Review Schedule
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          >
            {viewMode === 'list' ? 'Calendar View' : 'List View'}
          </button>
          <button
            onClick={() => {
              setShowAddDialog(true);
              resetForm();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Schedule Review
          </button>
        </div>
      </div>

      {/* Alerts */}
      {overdue.length > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <div className="font-medium text-red-900 dark:text-red-300 mb-1">
              {overdue.length} Overdue Review{overdue.length !== 1 ? 's' : ''}
            </div>
            <div className="text-sm text-red-700 dark:text-red-400">
              Please complete or reschedule overdue reviews
            </div>
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <div className="font-medium text-blue-900 dark:text-blue-300 mb-1">
              {upcoming.length} Upcoming Review{upcoming.length !== 1 ? 's' : ''} (Next 30 Days)
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-400">
              Reviews scheduled for the next month
            </div>
          </div>
        </div>
      )}

      {/* Add Review Dialog */}
      {showAddDialog && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Schedule Review</h4>
          <form onSubmit={handleScheduleReview} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Review Name *
                </label>
                <input
                  type="text"
                  value={reviewData.review_name}
                  onChange={(e) => setReviewData({ ...reviewData, review_name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Q1 2026 Benefits Review"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Review Type *
                </label>
                <select
                  value={reviewData.review_type}
                  onChange={(e) => setReviewData({ ...reviewData, review_type: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="benefit_review">Benefit Review</option>
                  <option value="baseline_review">Baseline Review</option>
                  <option value="performance_review">Performance Review</option>
                  <option value="final_review">Final Review</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Benefit (Optional - leave blank for all benefits)
                </label>
                <select
                  value={reviewData.benefit_id}
                  onChange={(e) => setReviewData({ ...reviewData, benefit_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Benefits</option>
                  {benefits.map(benefit => (
                    <option key={benefit.id} value={benefit.id}>
                      {benefit.benefit_code} - {benefit.benefit_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Planned Date *
                </label>
                <input
                  type="date"
                  value={reviewData.planned_date}
                  onChange={(e) => setReviewData({ ...reviewData, planned_date: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Forecast Date
                </label>
                <input
                  type="date"
                  value={reviewData.forecast_date}
                  onChange={(e) => setReviewData({ ...reviewData, forecast_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration (Hours)
                </label>
                <input
                  type="number"
                  value={reviewData.review_duration_hours || ''}
                  onChange={(e) => setReviewData({ ...reviewData, review_duration_hours: e.target.value ? parseFloat(e.target.value) : null })}
                  step="0.5"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reviewer
                </label>
                <select
                  value={reviewData.reviewer_user_id}
                  onChange={(e) => setReviewData({ ...reviewData, reviewer_user_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select reviewer...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={reviewData.is_virtual}
                  onChange={(e) => setReviewData({ ...reviewData, is_virtual: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300"
                />
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Virtual/Remote Review
                </label>
              </div>

              {reviewData.is_virtual && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Meeting Link
                  </label>
                  <input
                    type="text"
                    value={reviewData.meeting_link}
                    onChange={(e) => setReviewData({ ...reviewData, meeting_link: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="https://..."
                  />
                </div>
              )}

              {!reviewData.is_virtual && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Review Location
                  </label>
                  <input
                    type="text"
                    value={reviewData.review_location}
                    onChange={(e) => setReviewData({ ...reviewData, review_location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Office location..."
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Review Description
              </label>
              <textarea
                value={reviewData.review_description}
                onChange={(e) => setReviewData({ ...reviewData, review_description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddDialog(false);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Scheduling...' : 'Schedule Review'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Complete Review Dialog */}
      {showCompleteDialog && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Complete Review: {showCompleteDialog.review_name}
          </h4>
          <form onSubmit={handleCompleteReview} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Outcome Summary *
              </label>
              <textarea
                value={completionData.outcome_summary}
                onChange={(e) => setCompletionData({ ...completionData, outcome_summary: e.target.value })}
                required
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Findings
              </label>
              <textarea
                value={completionData.findings}
                onChange={(e) => setCompletionData({ ...completionData, findings: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recommendations
              </label>
              <textarea
                value={completionData.recommendations}
                onChange={(e) => setCompletionData({ ...completionData, recommendations: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Action Items
              </label>
              <textarea
                value={completionData.action_items}
                onChange={(e) => setCompletionData({ ...completionData, action_items: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Review Report URL
              </label>
              <input
                type="url"
                value={completionData.review_report_url}
                onChange={(e) => setCompletionData({ ...completionData, review_report_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="https://..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCompleteDialog(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Completing...' : 'Complete Review'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No reviews scheduled</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                <TableRowNumberHeader className="!normal-case" />
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Review Name
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Type
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Benefit
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Planned Date
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Reviewer
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Location
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review, index) => (
                  <tr key={review.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {review.review_name}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {review.review_type.replace(/_/g, ' ')}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {review.benefit?.benefit_name || review.benefit?.benefit_code || 'All Benefits'}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(review.planned_date)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {review.reviewer?.full_name || review.reviewer?.email || 'Not assigned'}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        {review.is_virtual ? (
                          <>
                            <Video className="h-4 w-4" />
                            {review.meeting_link ? (
                              <a href={review.meeting_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                Join
                              </a>
                            ) : (
                              <span>Virtual</span>
                            )}
                          </>
                        ) : (
                          <>
                            <MapPin className="h-4 w-4" />
                            {review.review_location || 'Not set'}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">
                      {getStatusBadge(review.status)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {review.status === 'scheduled' && (
                          <button
                            onClick={() => setShowCompleteDialog(review)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                            title="Complete"
                          >
                            Complete
                          </button>
                        )}
                        {review.status !== 'completed' && (
                          <button
                            onClick={() => handleRemoveReview(review.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                            title="Remove"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
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
