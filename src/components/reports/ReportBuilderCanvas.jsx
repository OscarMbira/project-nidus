import { useState, useEffect } from 'react';
import { Layout, Plus, Trash2, Move } from 'lucide-react';
import DataSourceSelector from './DataSourceSelector';
import FieldPicker from './FieldPicker';
import FilterBuilder from './FilterBuilder';
import ChartTypeSelector from './ChartTypeSelector';
import ReportPreview from './ReportPreview';

export default function ReportBuilderCanvas({ reportDefinition, onUpdate, className = '' }) {
  const [selectedDataSource, setSelectedDataSource] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [filters, setFilters] = useState([]);
  const [chartType, setChartType] = useState('table');
  const [reportName, setReportName] = useState(reportDefinition?.report_name || '');
  const [reportDescription, setReportDescription] = useState(reportDefinition?.description || '');

  useEffect(() => {
    if (reportDefinition) {
      setReportName(reportDefinition.report_name || '');
      setReportDescription(reportDefinition.description || '');
      setChartType(reportDefinition.chart_type || 'table');
      // Load saved configuration
      if (reportDefinition.data_source) {
        setSelectedDataSource({ id: reportDefinition.data_source });
      }
      if (reportDefinition.selected_fields) {
        setSelectedFields(reportDefinition.selected_fields);
      }
      if (reportDefinition.filters) {
        setFilters(reportDefinition.filters);
      }
    }
  }, [reportDefinition]);

  useEffect(() => {
    if (onUpdate) {
      onUpdate({
        report_name: reportName,
        description: reportDescription,
        data_source: selectedDataSource?.id || null,
        selected_fields: selectedFields,
        filters: filters,
        chart_type: chartType,
      });
    }
  }, [reportName, reportDescription, selectedDataSource, selectedFields, filters, chartType, onUpdate]);

  const handleFieldChange = (fields) => {
    setSelectedFields(fields);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Report Basic Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layout className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Report Configuration</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Report Name *
            </label>
            <input
              type="text"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter report name..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe the report..."
            />
          </div>
        </div>
      </div>

      {/* Step 1: Data Source Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Step 1: Select Data Source</h3>
        <DataSourceSelector
          selectedDataSource={selectedDataSource}
          onSelect={setSelectedDataSource}
        />
      </div>

      {/* Step 2: Field Selection */}
      {selectedDataSource && (
        <FieldPicker
          dataSource={selectedDataSource}
          selectedFields={selectedFields}
          onFieldsChange={handleFieldChange}
        />
      )}

      {/* Step 3: Filters */}
      {selectedFields.length > 0 && (
        <FilterBuilder
          fields={selectedFields}
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      )}

      {/* Step 4: Visualization Type */}
      {selectedFields.length > 0 && (
        <ChartTypeSelector
          selectedType={chartType}
          onSelect={setChartType}
        />
      )}

      {/* Step 5: Preview */}
      {selectedDataSource && selectedFields.length > 0 && (
        <ReportPreview
          reportDefinition={{
            ...reportDefinition,
            report_name: reportName,
            description: reportDescription,
            data_source: selectedDataSource.id,
            selected_fields: selectedFields,
            filters: filters,
            chart_type: chartType,
          }}
          onRefresh={() => {
            // Trigger preview refresh
          }}
        />
      )}
    </div>
  );
}

