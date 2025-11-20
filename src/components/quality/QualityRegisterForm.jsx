import { useState, useEffect } from 'react';
import { X, Save, FileText, Calendar, Target, CheckCircle } from 'lucide-react';
import { saveQualityRegisterItem } from '../../services/qualityManagementService';
import { supabase } from '../../services/supabaseClient';

export default function QualityRegisterForm({ item, projectId, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    product_reference: '',
    product_name: '',
    product_description: '',
    product_type: 'document',
    product_category: '',
    quality_method: 'review',
    quality_responsibilities: '',
    quality_owner_user_id: '',
    quality_criteria: '',
    acceptance_criteria: '',
    quality_standards: [],
    compliance_requirements: [],
    quality_tolerance_description: '',
    defect_tolerance: null,
    quality_review_planned_date: '',
    sign_off_required: true,
    sign_off_by_user_id: '',
    notes: '',
  });

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        product_reference: item.product_reference || '',
        product_name: item.product_name || '',
        product_description: item.product_description || '',
        product_type: item.product_type || 'document',
        product_category: item.product_category || '',
        quality_method: item.quality_method || 'review',
        quality_responsibilities: item.quality_responsibilities || '',
        quality_owner_user_id: item.quality_owner_user_id || '',
        quality_criteria: item.quality_criteria || '',
        acceptance_criteria: item.acceptance_criteria || '',
        quality_standards: item.quality_standards || [],
        compliance_requirements: item.compliance_requirements || [],
        quality_tolerance_description: item.quality_tolerance_description || '',
        defect_tolerance: item.defect_tolerance || null,
        quality_review_planned_date: item.quality_review_planned_date || '',
        sign_off_required: item.sign_off_required !== undefined ? item.sign_off_required : true,
        sign_off_by_user_id: item.sign_off_by_user_id || '',
        notes: item.notes || '',
      });
    }
    if (!item && projectId) {
      setFormData(prev => ({ ...prev, project_id: projectId }));
    }
    fetchLookupData();
  }, [item, projectId]);

  const fetchLookupData = async () => {
    try {
      const [projectsData, usersData] = await Promise.all([
        supabase
          .from('projects')
          .select('id, project_name, project_code')
          .eq('is_deleted', false)
          .order('project_name', { ascending: true }),
        supabase
          .from('users')
          .select('id, email, full_name')
          .order('full_name', { ascending: true }),
      ]);

      if (projectsData.data) setProjects(projectsData.data);
      if (usersData.data) setUsers(usersData.data);
    } catch (error) {
      console.error('Error fetching lookup data:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const submitData = {
        ...formData,
        project_id: projectId || formData.project_id,
        quality_owner_user_id: formData.quality_owner_user_id || null,
        sign_off_by_user_id: formData.sign_off_by_user_id || null,
        defect_tolerance: formData.defect_tolerance ? parseInt(formData.defect_tolerance) : null,
        quality_review_planned_date: formData.quality_review_planned_date || null,
        quality_standards: Array.isArray(formData.quality_standards) ? formData.quality_standards : [],
        compliance_requirements: Array.isArray(formData.compliance_requirements) ? formData.compliance_requirements : [],
      };

      await saveQualityRegisterItem(submitData, item?.id);
      onSave();
    } catch (error) {
      console.error('Error saving quality register item:', error);
      alert('Error saving item: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {item ? 'Edit Quality Register Item' : 'Add Quality Register Item'}
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
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Reference
                </label>
                <input
                  type="text"
                  name="product_reference"
                  value={formData.product_reference}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., DOC-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Project Charter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Type *
                </label>
                <select
                  name="product_type"
                  value={formData.product_type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="document">Document</option>
                  <option value="software">Software</option>
                  <option value="hardware">Hardware</option>
                  <option value="service">Service</option>
                  <option value="report">Report</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Category
                </label>
                <input
                  type="text"
                  name="product_category"
                  value={formData.product_category}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Planning"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  name="product_description"
                  value={formData.product_description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the product or deliverable..."
                />
              </div>
            </div>
          </div>

          {/* Quality Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Quality Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quality Method *
                </label>
                <select
                  name="quality_method"
                  value={formData.quality_method}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="review">Review</option>
                  <option value="inspection">Inspection</option>
                  <option value="testing">Testing</option>
                  <option value="approval">Approval</option>
                  <option value="audit">Audit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quality Owner
                </label>
                <select
                  name="quality_owner_user_id"
                  value={formData.quality_owner_user_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select owner...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quality Responsibilities
                </label>
                <textarea
                  name="quality_responsibilities"
                  value={formData.quality_responsibilities}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe quality responsibilities..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quality Criteria
                </label>
                <textarea
                  name="quality_criteria"
                  value={formData.quality_criteria}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Define quality criteria..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Acceptance Criteria
                </label>
                <textarea
                  name="acceptance_criteria"
                  value={formData.acceptance_criteria}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Define acceptance criteria..."
                />
              </div>
            </div>
          </div>

          {/* Schedule & Sign-off */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule & Sign-off
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Planned Review Date
                </label>
                <input
                  type="date"
                  name="quality_review_planned_date"
                  value={formData.quality_review_planned_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Defect Tolerance
                </label>
                <input
                  type="number"
                  name="defect_tolerance"
                  value={formData.defect_tolerance || ''}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Max acceptable defects"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="sign_off_required"
                  checked={formData.sign_off_required}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sign-off Required
                </label>
              </div>

              {formData.sign_off_required && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sign-off By
                  </label>
                  <select
                    name="sign_off_by_user_id"
                    value={formData.sign_off_by_user_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select user...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
              disabled={saving || !formData.product_name}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : item ? 'Update Item' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

