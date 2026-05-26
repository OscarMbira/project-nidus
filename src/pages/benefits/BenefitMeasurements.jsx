import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { getBenefits, getBenefitMeasurements, saveBenefitMeasurement, deleteBenefitMeasurement } from '../../services/benefitsService';
import SortToolbar from '../../components/ui/SortToolbar';
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table';
import { useSortableTable } from '../../hooks/useSortableTable';
import { useViewMode } from '../../hooks/useViewMode';
import ViewToggle from '../../components/ui/ViewToggle';
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function BenefitMeasurements() {
  const navigate = useNavigate();
  const [measurementViewMode, setMeasurementViewMode] = useViewMode('benefit-measurements', 'grid');
  const [benefits, setBenefits] = useState([]);
  const [selectedBenefitId, setSelectedBenefitId] = useState('');
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState(null);
  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'measurement_date', direction: 'desc' },
    storageKey: 'nidus-benefit-measurements-sort',
  });
  const measureAccessors = useMemo(
    () => ({
      measurement_name: (m) => String(m.measurement_value ?? ''),
      measurement_status: (m) => m.measurement_type ?? '',
      due: (m) => m.measurement_date ?? '',
    }),
    []
  );
  const displayMeasurements = useMemo(
    () => sortedData(measurements, measureAccessors),
    [measurements, sortedData, measureAccessors]
  );

  const [formData, setFormData] = useState({
    benefit_id: '',
    measure_id: null,
    measurement_date: new Date().toISOString().split('T')[0],
    measurement_value: '',
    measurement_unit: '',
    measurement_period: 'monthly',
    measurement_type: 'actual',
    data_quality: 'good',
    notes: '',
  });

  useEffect(() => {
    fetchBenefits();
  }, []);

  useEffect(() => {
    if (selectedBenefitId) {
      fetchMeasurements();
    } else {
      setMeasurements([]);
    }
  }, [selectedBenefitId]);

  const fetchBenefits = async () => {
    try {
      const data = await getBenefits({ benefit_status: 'in_progress,planned,partially_realized' });
      setBenefits(data || []);
      if (data && data.length > 0 && !selectedBenefitId) {
        setSelectedBenefitId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching benefits:', error);
      alert('Error loading benefits: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeasurements = async () => {
    if (!selectedBenefitId) return;
    try {
      setLoading(true);
      const data = await getBenefitMeasurements(selectedBenefitId);
      setMeasurements(data || []);
    } catch (error) {
      console.error('Error fetching measurements:', error);
      alert('Error loading measurements: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeasurement = () => {
    const selectedBenefit = benefits.find(b => b.id === selectedBenefitId);
    setFormData({
      benefit_id: selectedBenefitId,
      measure_id: null,
      measurement_date: new Date().toISOString().split('T')[0],
      measurement_value: '',
      measurement_unit: selectedBenefit?.measurement_unit || '',
      measurement_period: 'monthly',
      measurement_type: 'actual',
      data_quality: 'good',
      notes: '',
    });
    setSelectedMeasurement(null);
    setShowForm(true);
  };

  const handleEditMeasurement = (measurement) => {
    setSelectedMeasurement(measurement);
    setFormData({
      benefit_id: measurement.benefit_id,
      measure_id: measurement.measure_id || null,
      measurement_date: measurement.measurement_date || new Date().toISOString().split('T')[0],
      measurement_value: measurement.measurement_value || '',
      measurement_unit: measurement.measurement_unit || '',
      measurement_period: measurement.measurement_period || 'monthly',
      measurement_type: measurement.measurement_type || 'actual',
      data_quality: measurement.data_quality || 'good',
      notes: measurement.notes || '',
    });
    setShowForm(true);
  };

  const handleDeleteMeasurement = async (measurement) => {
    if (!window.confirm(`Are you sure you want to delete this measurement?`)) {
      return;
    }

    try {
      await deleteBenefitMeasurement(measurement.id, measurement.benefit_id);
      fetchMeasurements();
    } catch (error) {
      console.error('Error deleting measurement:', error);
      alert('Error deleting measurement: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveBenefitMeasurement(selectedBenefitId, formData, selectedMeasurement?.id);
      setShowForm(false);
      setSelectedMeasurement(null);
      fetchMeasurements();
    } catch (error) {
      console.error('Error saving measurement:', error);
      alert('Error saving measurement: ' + error.message);
    }
  };

  const selectedBenefit = benefits.find(b => b.id === selectedBenefitId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/benefits')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              Benefit Measurements
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Track and record benefit measurements over time
            </p>
          </div>
          {selectedBenefitId && (
            <button
              onClick={handleCreateMeasurement}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Measurement
            </button>
          )}
        </div>
      </div>

      {/* Benefit Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Benefit
        </label>
        <select
          value={selectedBenefitId}
          onChange={(e) => setSelectedBenefitId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select a benefit...</option>
          {benefits.map(benefit => (
            <option key={benefit.id} value={benefit.id}>
              {benefit.benefit_name} {benefit.benefit_code ? `(${benefit.benefit_code})` : ''}
            </option>
          ))}
        </select>
        {selectedBenefit && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {selectedBenefit.benefit_name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Target: {selectedBenefit.target_value} {selectedBenefit.measurement_unit || ''}
            </div>
          </div>
        )}
      </div>

      {/* Measurements List */}
      {selectedBenefitId ? (
        loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : measurements.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Measurements Recorded
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Start tracking this benefit by recording your first measurement
            </p>
            <button
              onClick={handleCreateMeasurement}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Add First Measurement
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end mb-2">
              <ViewToggle value={measurementViewMode} onChange={setMeasurementViewMode} ariaLabel="Benefit measurements layout" />
            </div>
            <SortToolbar
              columns={[
                { key: 'measurement_name', label: 'Name / value' },
                { key: 'measurement_status', label: 'Status' },
                { key: 'due', label: 'Due date' },
              ]}
              getSortDirection={getSortDirectionForColumn}
              onSort={handleSort}
            />
            {measurementViewMode === 'list' ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                <TableRowNumberHeader className="!normal-case" />
                        <TableHeaderCell sortable={false} className="!normal-case">Date</TableHeaderCell>
                        <TableHeaderCell sortable={false} className="!normal-case">Type</TableHeaderCell>
                        <TableHeaderCell sortable={false} className="!normal-case">Value</TableHeaderCell>
                        <TableHeaderCell sortable={false} className="!normal-case">Notes</TableHeaderCell>
                        <TableHeaderCell sortable={false} className="!normal-case text-right">Actions</TableHeaderCell>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {displayMeasurements.map((measurement, index) => (
                        <tr key={measurement.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                          <td className="px-6 py-3 text-sm">{new Date(measurement.measurement_date).toLocaleDateString()}</td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-1 text-xs rounded ${
                              measurement.measurement_type === 'actual'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            }`}>{measurement.measurement_type}</span>
                          </td>
                          <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">
                            {measurement.measurement_value} {measurement.measurement_unit || ''}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">{measurement.notes || '—'}</td>
                          <td className="px-6 py-3 text-right">
                            <button type="button" onClick={() => handleEditMeasurement(measurement)} className="p-2 text-blue-600 mr-1" aria-label="Edit">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => handleDeleteMeasurement(measurement)} className="p-2 text-red-600" aria-label="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
            displayMeasurements.map((measurement, index) => (
              <div
                key={measurement.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {new Date(measurement.measurement_date).toLocaleDateString()}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        measurement.measurement_type === 'actual'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : measurement.measurement_type === 'forecast'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {measurement.measurement_type}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {measurement.measurement_value} {measurement.measurement_unit || ''}
                    </div>
                    {measurement.notes && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {measurement.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditMeasurement(measurement)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMeasurement(measurement)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
            )}
          </div>
        )
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Select a Benefit
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Please select a benefit from the dropdown above to view and record measurements
          </p>
        </div>
      )}

      {/* Measurement Form Modal */}
      {showForm && selectedBenefitId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedMeasurement ? 'Edit Measurement' : 'Add Measurement'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setSelectedMeasurement(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Measurement Date *
                </label>
                <input
                  type="date"
                  name="measurement_date"
                  value={formData.measurement_date}
                  onChange={(e) => setFormData({ ...formData, measurement_date: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Measurement Value *
                </label>
                <input
                  type="number"
                  name="measurement_value"
                  value={formData.measurement_value}
                  onChange={(e) => setFormData({ ...formData, measurement_value: e.target.value })}
                  required
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Measurement Type
                  </label>
                  <select
                    name="measurement_type"
                    value={formData.measurement_type}
                    onChange={(e) => setFormData({ ...formData, measurement_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="actual">Actual</option>
                    <option value="forecast">Forecast</option>
                    <option value="planned">Planned</option>
                    <option value="baseline">Baseline</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Data Quality
                  </label>
                  <select
                    name="data_quality"
                    value={formData.data_quality}
                    onChange={(e) => setFormData({ ...formData, data_quality: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes about this measurement..."
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedMeasurement(null);
                  }}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {selectedMeasurement ? 'Update Measurement' : 'Add Measurement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

