import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js';
import { ArrowLeft, TrendingUp, Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { getBenefits, getBenefitMeasurements, deleteBenefitMeasurement } from '../../services/benefitsService';
import SortToolbar from '@nidus/ui/SortToolbar';
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table';
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable';
import { useViewMode } from '@nidus/shared/hooks/useViewMode';
import ViewToggle from '@nidus/ui/ViewToggle';
import RowNumberBadge from '@nidus/ui/RowNumberBadge';
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import SelectField from '../../components/ui/SelectField'

const MEASUREMENTS_BASE = '/platform/benefits/measurements'

export default function BenefitMeasurements() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { projectId, loading: projectLoading } = usePlatformProjectId();
  const hasProjectQuery = Boolean(searchParams.get('projectId'));
  const [measurementViewMode, setMeasurementViewMode] = useViewMode('benefit-measurements', 'grid');
  const [benefits, setBenefits] = useState([]);
  const [selectedBenefitId, setSelectedBenefitId] = useState('');
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (hasProjectQuery && projectLoading) return;
    fetchBenefits();
  }, [projectId, projectLoading, hasProjectQuery]);

  useEffect(() => {
    if (selectedBenefitId) {
      fetchMeasurements();
    } else {
      setMeasurements([]);
    }
  }, [selectedBenefitId]);

  const fetchBenefits = async () => {
    try {
      const data = await getBenefits(projectId ? { project_id: projectId } : {});
      const rows = [...(data || [])].sort((a, b) =>
        String(a.benefit_name || '').localeCompare(String(b.benefit_name || ''), undefined, { sensitivity: 'base' })
      );
      setBenefits(rows);
      if (rows.length > 0) {
        setSelectedBenefitId((current) => current || rows[0].id);
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

  const openMeasurementForm = (measurementId) => {
    const params = new URLSearchParams();
    const projectKey = searchParams.get('projectId');
    if (projectKey) params.set('projectId', projectKey);
    if (selectedBenefitId) params.set('benefitId', selectedBenefitId);
    const query = params.toString();
    const suffix = measurementId ? `/${measurementId}/edit` : '/create';
    navigate(`${MEASUREMENTS_BASE}${suffix}${query ? `?${query}` : ''}`);
  };

  const handleCreateMeasurement = () => {
    openMeasurementForm();
  };

  const handleEditMeasurement = (measurement) => {
    openMeasurementForm(measurement.id);
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

  const selectedBenefit = benefits.find(b => b.id === selectedBenefitId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
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
        <SelectField
          id="benefit-measurement-benefit"
          aria-label="Select Benefit"
          value={selectedBenefitId}
          onChange={(value) => setSelectedBenefitId(value || '')}
          placeholder="Select a benefit..."
          searchPlaceholder="Search benefits..."
          options={benefits.map((benefit) => ({
            value: benefit.id,
            label: `${benefit.benefit_name}${benefit.benefit_code ? ` (${benefit.benefit_code})` : ''}`,
          }))}
        />
        {selectedBenefit && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {selectedBenefit.benefit_name}
            </div>
            <div className="text-xs text-gray-700 dark:text-gray-200 mt-1">
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
                          <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">{measurement.notes || 'â€”'}</td>
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

    </div>
  );
}

