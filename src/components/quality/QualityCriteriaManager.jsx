import { useState, useEffect } from 'react';
import { Target, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { getQualityRegister } from '../../services/qualityManagementService';
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function QualityCriteriaManager({ projectId, qualityRegisterId = null }) {
  const [criteria, setCriteria] = useState([]);
  const [registerItems, setRegisterItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState(null);
  const [formData, setFormData] = useState({
    criterion_name: '',
    criterion_description: '',
    criterion_type: 'functional',
    measurement_method: 'pass-fail',
    acceptance_threshold: null,
    measurement_unit: '',
    is_mandatory: true,
    quality_register_id: qualityRegisterId || '',
    notes: '',
  });

  useEffect(() => {
    fetchRegisterItems();
    fetchCriteria();
  }, [projectId, qualityRegisterId]);

  const fetchRegisterItems = async () => {
    if (!projectId) return;
    
    try {
      const filters = { project_id: projectId };
      const items = await getQualityRegister(filters);
      setRegisterItems(items || []);
    } catch (error) {
      console.error('Error fetching register items:', error);
    }
  };

  const fetchCriteria = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('quality_criteria')
        .select(`
          *,
          quality_register:quality_register_id(id, product_name, product_reference)
        `)
        .eq('is_deleted', false);

      if (qualityRegisterId) {
        query = query.eq('quality_register_id', qualityRegisterId);
      } else if (projectId) {
        // Get criteria for all register items in this project
        const filters = { project_id: projectId };
        const items = await getQualityRegister(filters);
        if (items && items.length > 0) {
          const itemIds = items.map(item => item.id);
          query = query.in('quality_register_id', itemIds);
        } else {
          query = query.eq('quality_register_id', '00000000-0000-0000-0000-000000000000'); // No items
        }
      }

      query = query.order('criterion_name', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      setCriteria(data || []);
    } catch (error) {
      console.error('Error fetching quality criteria:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingCriterion) {
        const { error } = await supabase
          .from('quality_criteria')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCriterion.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('quality_criteria')
          .insert({
            ...formData,
            quality_register_id: formData.quality_register_id || null,
            project_id: projectId || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      setShowForm(false);
      setEditingCriterion(null);
      setFormData({
        criterion_name: '',
        criterion_description: '',
        criterion_type: 'functional',
        measurement_method: 'pass-fail',
        acceptance_threshold: null,
        measurement_unit: '',
        is_mandatory: true,
        quality_register_id: qualityRegisterId || '',
        notes: '',
      });
      fetchCriteria();
    } catch (error) {
      console.error('Error saving quality criterion:', error);
      alert('Error saving criterion: ' + error.message);
    }
  };

  const handleDelete = async (criterion) => {
    if (!window.confirm(`Are you sure you want to delete criterion "${criterion.criterion_name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('quality_criteria')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', criterion.id);

      if (error) throw error;
      fetchCriteria();
    } catch (error) {
      console.error('Error deleting criterion:', error);
      alert('Error deleting criterion: ' + error.message);
    }
  };

  const handleEdit = (criterion) => {
    setEditingCriterion(criterion);
    setFormData({
      criterion_name: criterion.criterion_name || '',
      criterion_description: criterion.criterion_description || '',
      criterion_type: criterion.criterion_type || 'functional',
      measurement_method: criterion.measurement_method || 'pass-fail',
      acceptance_threshold: criterion.acceptance_threshold || null,
      measurement_unit: criterion.measurement_unit || '',
      is_mandatory: criterion.is_mandatory !== undefined ? criterion.is_mandatory : true,
      quality_register_id: criterion.quality_register_id || qualityRegisterId || '',
      notes: criterion.notes || '',
    });
    setShowForm(true);
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          Quality Criteria
        </h3>
        <button
          onClick={() => {
            setEditingCriterion(null);
            setFormData({
              criterion_name: '',
              criterion_description: '',
              criterion_type: 'functional',
              measurement_method: 'pass-fail',
              acceptance_threshold: null,
              measurement_unit: '',
              is_mandatory: true,
              quality_register_id: qualityRegisterId || '',
              notes: '',
            });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Criterion
        </button>
      </div>

      {/* Criteria List */}
      {criteria.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Quality Criteria
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Add quality criteria to define acceptance standards
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add First Criterion
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Criterion
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Measurement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Threshold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Product/Deliverable
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {criteria.map((criterion, index) => (
                  <tr key={criterion.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {criterion.criterion_name}
                          {criterion.is_mandatory && (
                            <span className="ml-2 text-xs text-red-600 dark:text-red-400">*</span>
                          )}
                        </div>
                        {criterion.criterion_description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {criterion.criterion_description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white capitalize">
                        {criterion.criterion_type?.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white capitalize">
                        {criterion.measurement_method?.replace('-', ' ')}
                      </div>
                      {criterion.measurement_unit && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Unit: {criterion.measurement_unit}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {criterion.acceptance_threshold !== null && criterion.acceptance_threshold !== undefined ? (
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {criterion.acceptance_threshold} {criterion.measurement_unit || ''}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {criterion.quality_register ? (
                        <div className="text-sm text-gray-900 dark:text-white">
                          {criterion.quality_register.product_name}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">All Items</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(criterion)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(criterion)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingCriterion ? 'Edit Quality Criterion' : 'Add Quality Criterion'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingCriterion(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Criterion Name *
                  </label>
                  <input
                    type="text"
                    value={formData.criterion_name}
                    onChange={(e) => setFormData({ ...formData, criterion_name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Code Coverage >= 80%"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Criterion Type *
                  </label>
                  <select
                    value={formData.criterion_type}
                    onChange={(e) => setFormData({ ...formData, criterion_type: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="functional">Functional</option>
                    <option value="non-functional">Non-Functional</option>
                    <option value="performance">Performance</option>
                    <option value="security">Security</option>
                    <option value="usability">Usability</option>
                    <option value="compliance">Compliance</option>
                  </select>
                </div>

                {registerItems.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Product/Deliverable
                    </label>
                    <select
                      value={formData.quality_register_id}
                      onChange={(e) => setFormData({ ...formData, quality_register_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Items</option>
                      {registerItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.product_name} {item.product_reference ? `(${item.product_reference})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Measurement Method
                  </label>
                  <select
                    value={formData.measurement_method}
                    onChange={(e) => setFormData({ ...formData, measurement_method: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pass-fail">Pass/Fail</option>
                    <option value="numeric">Numeric</option>
                    <option value="percentage">Percentage</option>
                    <option value="rating">Rating</option>
                    <option value="checklist">Checklist</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Acceptance Threshold
                  </label>
                  <input
                    type="number"
                    value={formData.acceptance_threshold || ''}
                    onChange={(e) => setFormData({ ...formData, acceptance_threshold: e.target.value ? parseFloat(e.target.value) : null })}
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 80 for 80%"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Measurement Unit
                  </label>
                  <input
                    type="text"
                    value={formData.measurement_unit}
                    onChange={(e) => setFormData({ ...formData, measurement_unit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., %, points, score"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_mandatory}
                    onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mandatory Criterion
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.criterion_description}
                  onChange={(e) => setFormData({ ...formData, criterion_description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the quality criterion..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingCriterion(null);
                  }}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formData.criterion_name}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {editingCriterion ? 'Update Criterion' : 'Create Criterion'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

