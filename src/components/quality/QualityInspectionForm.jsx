import { useState, useEffect } from 'react';
import { X, Save, Search, Calendar, User, Target, AlertTriangle, CheckCircle } from 'lucide-react';
import { saveQualityInspection } from '../../services/qualityManagementService';
import { supabase } from '../../services/supabaseClient';

export default function QualityInspectionForm({ inspection, projectId, qualityRegisterId, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    inspection_reference: '',
    inspection_title: '',
    inspection_type: 'formal-inspection',
    inspection_scope: '',
    inspection_date: '',
    forecast_date: '',
    inspector_user_id: '',
    inspection_location: '',
    inspection_method: 'checklist',
    defects_found_count: 0,
    critical_defects_count: 0,
    major_defects_count: 0,
    minor_defects_count: 0,
    inspection_result: 'passed',
    inspection_score: null,
    pass_threshold: 70.00,
    corrective_actions_required: false,
    follow_up_inspection_required: false,
    follow_up_inspection_date: '',
    sign_off_planned_date: '',
    sign_off_forecast_date: '',
    programme_id: '',
    qms_method_id: '',
    inspection_notes: '',
    inspection_findings: '',
  });

  const [projects, setProjects] = useState([]);
  const [qualityRegisterItems, setQualityRegisterItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [qmsMethods, setQmsMethods] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (inspection) {
      setFormData({
        inspection_reference: inspection.inspection_reference || '',
        inspection_title: inspection.inspection_title || '',
        inspection_type: inspection.inspection_type || 'formal-inspection',
        inspection_scope: inspection.inspection_scope || '',
        inspection_date: inspection.inspection_date || '',
        inspector_user_id: inspection.inspector_user_id || '',
        inspection_location: inspection.inspection_location || '',
        inspection_method: inspection.inspection_method || 'checklist',
        defects_found_count: inspection.defects_found_count || 0,
        critical_defects_count: inspection.critical_defects_count || 0,
        major_defects_count: inspection.major_defects_count || 0,
        minor_defects_count: inspection.minor_defects_count || 0,
        inspection_result: inspection.inspection_result || 'passed',
        inspection_score: inspection.inspection_score || null,
        pass_threshold: inspection.pass_threshold || 70.00,
        corrective_actions_required: inspection.corrective_actions_required || false,
        follow_up_inspection_required: inspection.follow_up_inspection_required || false,
        follow_up_inspection_date: inspection.follow_up_inspection_date || '',
        forecast_date: inspection.forecast_date || '',
        sign_off_planned_date: inspection.sign_off_planned_date || '',
        sign_off_forecast_date: inspection.sign_off_forecast_date || '',
        programme_id: inspection.programme_id || '',
        qms_method_id: inspection.qms_method_id || '',
        inspection_notes: inspection.inspection_notes || '',
        inspection_findings: inspection.inspection_findings || '',
      });
    }
    fetchLookupData();
  }, [inspection, projectId, qualityRegisterId]);

  const fetchLookupData = async () => {
    try {
      // Get QMS ID for the project if exists
      let qmsId = null;
      if (projectId) {
        const { data: qmsData } = await supabase
          .from('quality_management_strategies')
          .select('id')
          .eq('project_id', projectId)
          .eq('is_deleted', false)
          .single();
        qmsId = qmsData?.id;
      }

      const [projectsData, registerData, usersData, programmesData, qmsMethodsData] = await Promise.all([
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
        supabase
          .from('programmes')
          .select('id, programme_name, programme_code')
          .eq('is_deleted', false)
          .order('programme_name', { ascending: true }),
        qmsId
          ? supabase
              .from('qms_quality_methods')
              .select('id, method_name, method_code')
              .eq('qms_id', qmsId)
              .eq('is_active', true)
              .order('display_order', { ascending: true })
          : Promise.resolve({ data: [] }),
      ]);

      if (projectsData.data) setProjects(projectsData.data);
      if (registerData.data) setQualityRegisterItems(registerData.data);
      if (usersData.data) setUsers(usersData.data);
      if (programmesData.data) setProgrammes(programmesData.data);
      if (qmsMethodsData.data) setQmsMethods(qmsMethodsData.data);
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
        inspector_user_id: formData.inspector_user_id || null,
        inspection_date: formData.inspection_date || null,
        forecast_date: formData.forecast_date || null,
        sign_off_planned_date: formData.sign_off_planned_date || null,
        sign_off_forecast_date: formData.sign_off_forecast_date || null,
        programme_id: formData.programme_id || null,
        qms_method_id: formData.qms_method_id || null,
        defects_found_count: formData.defects_found_count ? parseInt(formData.defects_found_count) : 0,
        critical_defects_count: formData.critical_defects_count ? parseInt(formData.critical_defects_count) : 0,
        major_defects_count: formData.major_defects_count ? parseInt(formData.major_defects_count) : 0,
        minor_defects_count: formData.minor_defects_count ? parseInt(formData.minor_defects_count) : 0,
        inspection_score: formData.inspection_score ? parseFloat(formData.inspection_score) : null,
        pass_threshold: formData.pass_threshold ? parseFloat(formData.pass_threshold) : 70.00,
        follow_up_inspection_date: formData.follow_up_inspection_date || null,
      };

      await saveQualityInspection(submitData, inspection?.id);
      onSave();
    } catch (error) {
      console.error('Error saving quality inspection:', error);
      alert('Error saving inspection: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Search className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {inspection ? 'Edit Quality Inspection' : 'Create Quality Inspection'}
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
          {/* Inspection Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Inspection Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Inspection Reference
                </label>
                <input
                  type="text"
                  name="inspection_reference"
                  value={formData.inspection_reference}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., QI-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Inspection Title *
                </label>
                <input
                  type="text"
                  name="inspection_title"
                  value={formData.inspection_title}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Code Quality Inspection"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Inspection Type *
                </label>
                <select
                  name="inspection_type"
                  value={formData.inspection_type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="formal-inspection">Formal Inspection</option>
                  <option value="informal-inspection">Informal Inspection</option>
                  <option value="peer-inspection">Peer Inspection</option>
                  <option value="self-inspection">Self Inspection</option>
                  <option value="third-party-inspection">Third-Party Inspection</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Inspection Method
                </label>
                <select
                  name="inspection_method"
                  value={formData.inspection_method}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="checklist">Checklist</option>
                  <option value="sampling">Sampling</option>
                  <option value="full-inspection">Full Inspection</option>
                  <option value="automated-testing">Automated Testing</option>
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
                  Inspection Scope
                </label>
                <textarea
                  name="inspection_scope"
                  value={formData.inspection_scope}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the scope of the inspection..."
                />
              </div>
            </div>
          </div>

          {/* Inspection Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Inspection Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Inspection Date *
                </label>
                <input
                  type="date"
                  name="inspection_date"
                  value={formData.inspection_date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Forecast Date
                </label>
                <input
                  type="date"
                  name="forecast_date"
                  value={formData.forecast_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sign-Off Planned Date
                </label>
                <input
                  type="date"
                  name="sign_off_planned_date"
                  value={formData.sign_off_planned_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sign-Off Forecast Date
                </label>
                <input
                  type="date"
                  name="sign_off_forecast_date"
                  value={formData.sign_off_forecast_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Inspector *
                </label>
                <select
                  name="inspector_user_id"
                  value={formData.inspector_user_id}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select inspector...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  name="inspection_location"
                  value={formData.inspection_location}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Inspection location..."
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
            </div>
          </div>

          {/* Defects & Results */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Defects & Results
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Total Defects
                </label>
                <input
                  type="number"
                  name="defects_found_count"
                  value={formData.defects_found_count || ''}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Critical Defects
                </label>
                <input
                  type="number"
                  name="critical_defects_count"
                  value={formData.critical_defects_count || ''}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-red-300 dark:border-red-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Major Defects
                </label>
                <input
                  type="number"
                  name="major_defects_count"
                  value={formData.major_defects_count || ''}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Minor Defects
                </label>
                <input
                  type="number"
                  name="minor_defects_count"
                  value={formData.minor_defects_count || ''}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-yellow-300 dark:border-yellow-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Inspection Score (%)
                </label>
                <input
                  type="number"
                  name="inspection_score"
                  value={formData.inspection_score || ''}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Inspection Result *
                </label>
                <select
                  name="inspection_result"
                  value={formData.inspection_result}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="passed">Passed</option>
                  <option value="passed-with-conditions">Passed with Conditions</option>
                  <option value="failed">Failed</option>
                  <option value="deferred">Deferred</option>
                </select>
              </div>

              {programmes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Programme (Optional)
                  </label>
                  <select
                    name="programme_id"
                    value={formData.programme_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select programme...</option>
                    {programmes.map(prog => (
                      <option key={prog.id} value={prog.id}>
                        {prog.programme_name} {prog.programme_code ? `(${prog.programme_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {qmsMethods.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    QMS Quality Method (Optional)
                  </label>
                  <select
                    name="qms_method_id"
                    value={formData.qms_method_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select method...</option>
                    {qmsMethods.map(method => (
                      <option key={method.id} value={method.id}>
                        {method.method_name} {method.method_code ? `(${method.method_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Inspection Findings
              </label>
              <textarea
                name="inspection_findings"
                value={formData.inspection_findings}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Document inspection findings..."
              />
            </div>
          </div>

          {/* Follow-up Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Follow-up Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="corrective_actions_required"
                  checked={formData.corrective_actions_required}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Corrective Actions Required
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="follow_up_inspection_required"
                  checked={formData.follow_up_inspection_required}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Follow-up Inspection Required
                </label>
              </div>

              {formData.follow_up_inspection_required && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Follow-up Inspection Date
                  </label>
                  <input
                    type="date"
                    name="follow_up_inspection_date"
                    value={formData.follow_up_inspection_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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
                name="inspection_notes"
                value={formData.inspection_notes}
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
              disabled={saving || !formData.inspection_title || !formData.inspection_date}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : inspection ? 'Update Inspection' : 'Create Inspection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

