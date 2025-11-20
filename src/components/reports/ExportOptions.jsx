import { Download, FileText, FileSpreadsheet, FileJson, File } from 'lucide-react';
import { exportReport } from '../../services/reportBuilderService';

export default function ExportOptions({ reportId, reportDefinition, onExport, className = '' }) {
  const exportFormats = [
    { value: 'pdf', label: 'PDF', icon: FileText, description: 'Portable Document Format' },
    { value: 'excel', label: 'Excel', icon: FileSpreadsheet, description: 'Microsoft Excel (.xlsx)' },
    { value: 'csv', label: 'CSV', icon: File, description: 'Comma-separated values' },
    { value: 'json', label: 'JSON', icon: FileJson, description: 'JavaScript Object Notation' },
  ];

  const handleExport = async (format) => {
    try {
      if (!reportId && !reportDefinition) {
        alert('No report selected for export');
        return;
      }

      const exported = await exportReport(reportId || reportDefinition?.id, format);
      
      if (onExport) {
        onExport(exported);
      } else {
        // Default export handling - download file
        downloadExportedReport(exported, format);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Error exporting report: ' + error.message);
    }
  };

  const downloadExportedReport = (exported, format) => {
    const reportName = reportDefinition?.report_name || 'report';
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(exported.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportName}_${timestamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const csv = convertToCSV(exported.data);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportName}_${timestamp}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // PDF and Excel would require server-side processing or libraries
      alert(`${format.toUpperCase()} export requires server-side processing. Data is available in JSON format.`);
      handleExport('json');
    }
  };

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ];

    return csvRows.join('\n');
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Export Report
          </h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Choose a format to export your report
        </p>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        {exportFormats.map((format) => {
          const Icon = format.icon;
          return (
            <button
              key={format.value}
              onClick={() => handleExport(format.value)}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
            >
              <div className="flex items-start gap-3">
                <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {format.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {format.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

