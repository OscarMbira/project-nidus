import { useState, useEffect } from 'react';
import { X, Save, FileText, Calendar, Users, Target, CheckCircle } from 'lucide-react';
import { saveQualityReview } from '../../services/qualityManagementService';
import { supabase } from '../../services/supabaseClient';

export default function QualityReviewForm({ review, projectId, qualityRegisterId, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    review_reference: '',
    review_title: '',
    review_type: 'peer-review',
    review_scope: '',
    planned_date: '',
    planned_duration_minutes: 60,
    review_location: '',
    review_location_type: 'virtual',
    meeting_link: '',
    chair_user_id: '',
    secretary_user_id: '',
    pre_review_checklist: '',
    materials_distribution_date: '',
    preparation_required: true,
    preparation_time_minutes: null,
    review_criteria: '',
    pass_threshold: 70.00,
    notes: '',
  });

  const [projects, setProjects] = useState([]);
  const [qualityRegisterItems, setQualityRegisterItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (review) {
      setFormData({
        review_reference: review.review_reference || '',
        review_title: review.review_title || '',
        review_type: review.review_type || 'peer-review',
        review_scope: review.review_scope || '',
        planned_date: review.planned_date || '',
        planned_duration_minutes: review.planned_duration_minutes || 60,
        review_location: review.review_location || '',
        review_location_type: review.review_location_type || 'virtual',
        meeting_link: review.meeting_link || '',
        chair_user_id: review.chair_user_id || '',
        secretary_user_id: review.secretary_user_id || '',
        pre_review_checklist: review.pre_review_checklist || '',
        materials_distribution_date: review.materials_distribution_date || '',
        preparation_required: review.preparation_required !== undefined ? review.preparation_required : true,
        preparation_time_minutes: review.preparation_time_minutes || null,
        review_criteria: review.review_criteria || '',
        pass_threshold: review.pass_threshold || 70.00,
        notes: review.notes || '',
      });
    }
    fetchLookupData();
  }, [review, projectId, qualityRegisterId]);

  const fetchLookupData = async () => {
    try {
      const [projectsData, registerData, usersData] = await Promise.all([
        supabase
          .from('projects')
          .select('id, project_name, project_code')
          .eq('is_deleted', false)
          .order('project_name', { ascending: true }),
        projectId
          ? supabase
              .from('quality_register')
              .select('id, product_name, product_reference')
              .eq('project_id', projectId)
              .eq('is_deleted', false)
              .order('product_name', { ascending: true })
          : Promise.resolve({ data: [] }),
        supabase
          .from('users')
          .select('id, email, full_name')
          .order('full_name', { ascending: true }),
      ]);

      if (projectsData.data) setProjects(projectsData.data);
      if (registerData.data) setQualityRegisterItems(registerData.data);
      if (usersData.data) setUsers(usersData.data);
    } catch (error) {
      console.error('Error fetching lookup data:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value ? parseFloat(value) : null) : value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const submitData = {
        ...formData,
        project_id: projectId || formData.project_id,
        quality_register_id: qualityRegisterId || formData.quality_register_id || null,
        chair_user_id: formData.chair_user_id || null,
        secretary_user_id: formData.secretary_user_id || null,
        planned_date: formData.planned_date || null,
        materials_distribution_date: formData.materials_distribution_date || null,
        preparation_time_minutes: formData.preparation_time_minutes ? parseInt(formData.preparation_time_minutes) : null,
        planned_duration_minutes: formData.planned_duration_minutes ? parseInt(formData.planned_duration_minutes) : 60,
        pass_threshold: formData.pass_threshold ? parseFloat(formData.pass_threshold) : 70.00,
      };

      await saveQualityReview(submitData, review?.id);
      onSave();
    } catch (error) {
      console.error('Error saving quality review:', error);
      alert('Error saving review: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {review ? 'Edit Quality Review' : 'Create Quality Review'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Review Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Review Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Review Reference
                </label>
                <input
                  type="text"
                  name="review_reference"
                  value={formData.review_reference}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., QR-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Review Title *
                </label>
                <input
                  type="text"
                  name="review_title"
                  value={formData.review_title}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Design Document Review"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Review Type *
                </label>
                <select
                  name="review_type"
                  value={formData.review_type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="peer-review">Peer Review</option>
                  <option value="management-review">Management Review</option>
                  <option value="technical-review">Technical Review</option>
                  <option value="quality-audit">Quality Audit</option>
                  <option value="walk-through">Walk-through</option>
                </select>
              </div>

              {qualityRegisterItems.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quality Register Item
                  </label>
                  <select
                    name="quality_register_id"
                    value={qualityRegisterId || formData.quality_register_id || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, quality_register_id: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select item...</option>
                    {qualityRegisterItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.product_name} {item.product_reference ? `(${item.product_reference})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Review Scope
                </label>
                <textarea
                  name="review_scope"
                  value={formData.review_scope}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the scope of the review..."
                />
              </div>
            </div>
          </div>

          {/* Schedule & Location */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule & Location
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Planned Date
                </label>
                <input
                  type="date"
                  name="planned_date"
                  value={formData.planned_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  name="planned_duration_minutes"
                  value={formData.planned_duration_minutes || ''}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location Type
                </label>
                <select
                  name="review_location_type"
                  value={formData.review_location_type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="virtual">Virtual</option>
                  <option value="in-person">In-Person</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location/Meeting Link
                </label>
                <input
                  type="text"
                  name={formData.review_location_type === 'virtual' ? 'meeting_link' : 'review_location'}
                  value={formData.review_location_type === 'virtual' ? formData.meeting_link : formData.review_location}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    [formData.review_location_type === 'virtual' ? 'meeting_link' : 'review_location']: e.target.value
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={formData.review_location_type === 'virtual' ? 'Meeting URL...' : 'Location...'}
                />
              </div>
            </div>
          </div>

          {/* Review Team */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Review Team
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Review Chair
                </label>
                <select
                  name="chair_user_id"
                  value={formData.chair_user_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select chair...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Secretary
                </label>
                <select
                  name="secretary_user_id"
                  value={formData.secretary_user_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select secretary...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Review Criteria */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Review Criteria
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Review Criteria
                </label>
                <textarea
                  name="review_criteria"
                  value={formData.review_criteria}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Define review criteria..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pass Threshold (%)
                </label>
                <input
                  type="number"
                  name="pass_threshold"
                  value={formData.pass_threshold || ''}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Materials Distribution Date
                </label>
                <input
                  type="date"
                  name="materials_distribution_date"
                  value={formData.materials_distribution_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="preparation_required"
                  checked={formData.preparation_required}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Preparation Required
                </label>
              </div>

              {formData.preparation_required && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preparation Time (minutes)
                  </label>
                  <input
                    type="number"
                    name="preparation_time_minutes"
                    value={formData.preparation_time_minutes || ''}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pre-Review Checklist
                </label>
                <textarea
                  name="pre_review_checklist"
                  value={formData.pre_review_checklist}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="List pre-review checklist items..."
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Notes
            </h3>
            <div>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes..."
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.review_title}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : review ? 'Update Review' : 'Create Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

